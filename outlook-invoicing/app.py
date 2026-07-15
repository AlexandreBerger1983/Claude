"""
Facturation Outlook — Application Streamlit
============================================
Importe les événements depuis un fichier ICS Outlook (ou URL de calendrier)
et génère des factures PDF professionnelles.

Aucune configuration Azure AD requise.
"""

import io
import unicodedata
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

import pandas as pd
import streamlit as st

from config_manager import ConfigManager
from ics_parser import fetch_ics_url, parse_ics_bytes
from invoice_generator import InvoiceGenerator
from models import Client, CompanyInfo, Invoice, TimeEntry


# ──────────────────────────────────────────────────────────────────────────────
# Sage 50 CSV helpers
# ──────────────────────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower().strip())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


_SAGE50_FIELDS = {
    "name":        ["nom du client", "customer name", "client name", "nom", "name", "client"],
    "address":     ["adresse de facturation ligne 1", "adresse 1", "bill-to address 1",
                    "address 1", "adresse", "address"],
    "city":        ["ville", "city"],
    "province":    ["province", "province/state", "etat", "state"],
    "postal_code": ["code postal", "postal/zip code", "code postale", "postal code", "zip"],
    "country":     ["pays", "country"],
    "email":       ["courriel", "adresse electronique", "email", "e-mail"],
    "phone":       ["telephone 1", "telephone", "phone 1", "phone", "tel"],
    "tps_number":  ["numero tps", "no tps", "tps number", "gst number", "numero gst"],
    "tvq_number":  ["numero tvq", "no tvq", "tvq number", "qst number", "numero qst"],
}


def parse_sage50_csv(df: pd.DataFrame):
    """
    Retourne (clients: list[dict], col_map: dict[field, col_name | None]).
    """
    norm_cols = {_norm(c): c for c in df.columns}

    def find(field):
        for candidate in _SAGE50_FIELDS[field]:
            key = _norm(candidate)
            if key in norm_cols:
                return norm_cols[key]
        for norm_col, orig_col in norm_cols.items():
            for candidate in _SAGE50_FIELDS[field]:
                if _norm(candidate) in norm_col:
                    return orig_col
        return None

    col_map = {f: find(f) for f in _SAGE50_FIELDS}

    def cell(row, field) -> str:
        col = col_map.get(field)
        if not col:
            return ""
        v = str(row.get(col, "")).strip()
        return "" if v in ("nan", "NaN", "None", "-") else v

    clients = []
    for _, row in df.iterrows():
        name = cell(row, "name")
        if not name:
            continue
        clients.append({
            "name":        name,
            "address":     cell(row, "address"),
            "city":        cell(row, "city"),
            "postal_code": cell(row, "postal_code"),
            "country":     cell(row, "country") or "Canada",
            "email":       cell(row, "email"),
            "tps_number":  cell(row, "tps_number"),
            "tvq_number":  cell(row, "tvq_number"),
        })
    return clients, col_map

# ──────────────────────────────────────────────────────────────────────────────
# Config page
# ──────────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Facturation Outlook",
    page_icon="📋",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    [data-testid="stSidebar"] { min-width: 250px; max-width: 270px; }
    .main-title  { font-size:1.8rem; font-weight:700; color:#1a3a5c; margin-bottom:.25rem; }
    .section-hdr { font-size:1.05rem; font-weight:600; color:#2e7bcf;
                   border-bottom:2px solid #2e7bcf; padding-bottom:.2rem;
                   margin:1rem 0 .6rem; }
    .metric-card { background:#f0f4f8; border-left:4px solid #2e7bcf;
                   padding:.8rem 1rem; border-radius:4px; margin:.4rem 0; }
    .info-box    { background:#e8f4fd; border:1px solid #2e7bcf;
                   border-radius:6px; padding:1rem; margin:.5rem 0; }
    .step-box    { background:#f0f4f8; border-radius:8px; padding:1rem 1.2rem; margin:.5rem 0; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ──────────────────────────────────────────────────────────────────────────────
# Session state
# ──────────────────────────────────────────────────────────────────────────────

_DEFAULTS = {
    "page": "calendar",
    "time_entries": [],
    "selected_ids": set(),
}
for _k, _v in _DEFAULTS.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v

# ConfigManager dans session_state (pas dans le cache Streamlit)
# → ne sera jamais vidé accidentellement par CTRL-C / "Clear cache"
if "_config" not in st.session_state:
    st.session_state["_config"] = ConfigManager()


def get_config() -> ConfigManager:
    return st.session_state["_config"]


# ──────────────────────────────────────────────────────────────────────────────
# Sidebar
# ──────────────────────────────────────────────────────────────────────────────


def sidebar():
    config = get_config()
    company = config.get_company()

    with st.sidebar:
        st.markdown(f"### {company.name or 'Facturation Outlook'}")
        st.markdown("---")

        nav = {
            "calendar": "📅 Calendrier",
            "clients":  "👥 Clients",
            "invoice":  "📄 Facturation",
            "settings": "⚙️ Paramètres",
        }
        for key, label in nav.items():
            kind = "primary" if st.session_state.page == key else "secondary"
            if st.button(label, use_container_width=True, type=kind, key=f"nav_{key}"):
                st.session_state.page = key
                st.rerun()

        st.markdown("---")
        entries = st.session_state.time_entries
        if entries:
            selected = [e for e in entries if e.event_id in st.session_state.selected_ids]
            st.caption(
                f"{len(selected)}/{len(entries)} événements · "
                f"{sum(e.hours for e in selected):.1f} h"
            )


# ──────────────────────────────────────────────────────────────────────────────
# Page: Calendrier
# ──────────────────────────────────────────────────────────────────────────────


def page_calendar():
    st.markdown('<div class="main-title">📅 Import Calendrier</div>', unsafe_allow_html=True)

    # ── Guide d'export ────────────────────────────────────────────────
    with st.expander("ℹ️ Comment exporter mon calendrier ?", expanded=False):
        tab_apple, tab_desktop, tab_web, tab_google = st.tabs([
            "Apple Calendar (Mac/iCloud)",
            "Outlook Desktop (Windows)",
            "Outlook Web / Microsoft 365",
            "Google Calendar",
        ])

        with tab_apple:
            st.markdown(
                """
                <div class="step-box">
                <b>Apple Calendar — Mac (fichier .ics) :</b>
                <ol>
                <li>Ouvrez l'app <b>Calendrier</b> sur votre Mac</li>
                <li>Dans la barre latérale, cliquez droit sur votre calendrier → <b>Exporter…</b></li>
                <li>Choisissez un emplacement et enregistrez le <code>.ics</code></li>
                <li>Importez le fichier ci-dessous</li>
                </ol>
                </div>

                <div class="step-box" style="margin-top:.5rem">
                <b>iCloud Calendar — URL ICS (synchronisation automatique) :</b>
                <ol>
                <li>Allez sur <b>icloud.com</b> → Calendrier</li>
                <li>Cliquez sur l'icône de partage 📡 à côté de votre calendrier</li>
                <li>Activez <b>Calendrier public</b></li>
                <li>Copiez le lien et collez-le dans le champ URL ci-dessous</li>
                </ol>
                </div>
                """,
                unsafe_allow_html=True,
            )

        with tab_desktop:
            st.markdown(
                """
                <div class="step-box">
                <b>Outlook Desktop (Windows) :</b>
                <ol>
                <li>Ouvrez Outlook</li>
                <li>Cliquez sur <b>Fichier → Enregistrer le calendrier</b></li>
                <li>Choisissez la <b>plage de dates</b> (ex : ce mois)</li>
                <li>Enregistrez en <code>.ics</code></li>
                <li>Importez le fichier ci-dessous</li>
                </ol>
                </div>
                """,
                unsafe_allow_html=True,
            )

        with tab_web:
            st.markdown(
                """
                <div class="step-box">
                <b>Outlook Web / Microsoft 365 :</b>
                <ol>
                <li>⚙️ Paramètres → <b>Afficher tous les paramètres</b></li>
                <li>Calendrier → <b>Calendriers partagés</b></li>
                <li>Section <i>"Publier un calendrier"</i> → sélectionnez votre calendrier → <b>Publier</b></li>
                <li>Copiez le lien <b>ICS</b> et collez-le dans le champ URL ci-dessous</li>
                </ol>
                </div>
                """,
                unsafe_allow_html=True,
            )

        with tab_google:
            st.markdown(
                """
                <div class="step-box">
                <b>Google Calendar :</b>
                <ol>
                <li>⚙️ Paramètres → votre calendrier → <b>Intégrer le calendrier</b></li>
                <li>Copiez l'<b>URL au format iCal</b> et collez-la ci-dessous</li>
                </ol>
                </div>
                """,
                unsafe_allow_html=True,
            )

    st.markdown('<div class="section-hdr">Source du calendrier</div>', unsafe_allow_html=True)

    source = st.radio(
        "Source",
        ["📁 Fichier ICS (upload)", "🔗 URL de calendrier (ICS)"],
        horizontal=True,
        label_visibility="collapsed",
    )

    ics_data: bytes = b""

    if source == "📁 Fichier ICS (upload)":
        uploaded = st.file_uploader(
            "Glissez votre fichier .ics ici",
            type=["ics"],
            help="Exporté depuis Outlook, Google Calendar, Apple Calendar…",
        )
        if uploaded:
            ics_data = uploaded.read()
            st.success(f"Fichier chargé : {uploaded.name} ({len(ics_data):,} octets)")
    else:
        ics_url = st.text_input(
            "URL du calendrier ICS",
            placeholder="https://outlook.live.com/owa/calendar/…/calendar.ics",
        )
        if ics_url and st.button("⬇️ Télécharger", type="secondary"):
            with st.spinner("Téléchargement…"):
                try:
                    ics_data = fetch_ics_url(ics_url)
                    st.session_state["ics_url_data"] = ics_data
                    st.success(f"Calendrier téléchargé ({len(ics_data):,} octets)")
                except Exception as exc:
                    st.error(f"Erreur : {exc}")
        elif "ics_url_data" in st.session_state:
            ics_data = st.session_state["ics_url_data"]

    if not ics_data:
        return

    # ── Options de filtrage ───────────────────────────────────────────
    st.markdown('<div class="section-hdr">Filtres</div>', unsafe_allow_html=True)

    col1, col2, col3, col4 = st.columns([2, 2, 2, 2])
    with col1:
        start_date = st.date_input("Début", value=date.today().replace(day=1))
    with col2:
        end_date = st.date_input("Fin", value=date.today())
    with col3:
        cat_filter = st.text_input(
            "Catégorie (filtre)",
            value="",
            help="Laisser vide pour tout importer. Ex: 'Facturable'",
        )
    with col4:
        parse_mode = st.selectbox(
            "Lecture du client",
            [
                "Depuis le titre — [Client] Description",
                "Depuis la catégorie ICS",
                "Client par défaut",
            ],
        )

    default_client = ""
    if "Client par défaut" in parse_mode:
        saved_clients = get_config().get_clients()
        c_names = [c.name for c in saved_clients]
        options = c_names + ["✏️ Nom personnalisé..."] if c_names else []
        if options:
            sel = st.selectbox("Client", options, key="def_client_sel")
            if sel == "✏️ Nom personnalisé...":
                default_client = st.text_input("Nom du client", key="def_client_custom")
            else:
                default_client = sel
        else:
            default_client = st.text_input("Nom du client")

    if st.button("📥 Importer les événements", type="primary"):
        with st.spinner("Analyse du calendrier…"):
            try:
                raw_entries = parse_ics_bytes(ics_data, category_filter=cat_filter)

                # Filtre de dates
                start_dt = datetime.combine(start_date, datetime.min.time())
                end_dt = datetime.combine(end_date, datetime.max.time())
                filtered = [
                    e for e in raw_entries
                    if start_dt <= e.date <= end_dt
                ]

                # Lecture du client
                if "catégorie" in parse_mode:
                    # client_name déjà rempli depuis la catégorie dans le parseur
                    # On utilise la catégorie comme client_name si vide
                    from icalendar import Calendar as ICS
                    cal = ICS.from_ical(ics_data)
                    uid_to_cat: dict = {}
                    for comp in cal.walk():
                        if comp.name == "VEVENT":
                            uid = str(comp.get("UID", ""))
                            cats = comp.get("CATEGORIES")
                            if cats:
                                from ics_parser import _extract_categories
                                uid_to_cat[uid] = (_extract_categories(cats) or [""])[0]
                    for e in filtered:
                        if e.event_id in uid_to_cat:
                            e.client_name = uid_to_cat[e.event_id]
                elif "Client par défaut" in parse_mode:
                    for e in filtered:
                        e.client_name = default_client

                st.session_state.time_entries = filtered
                st.session_state.selected_ids = {e.event_id for e in filtered}
                st.success(f"{len(filtered)} événement(s) importé(s) sur {len(raw_entries)} total")
            except Exception as exc:
                st.error(f"Erreur d'import : {exc}")

    entries: List[TimeEntry] = st.session_state.time_entries
    if not entries:
        st.markdown(
            """
            <div class="info-box">
            <b>Convention de nommage recommandée dans Outlook :</b><br/>
            Nommez vos événements avec le format :<br/>
            <code>[NomClient] Description de la prestation</code><br/><br/>
            Exemple : <code>[Acme Corp] Développement API REST</code><br/>
            → Client : <b>Acme Corp</b> &nbsp;|&nbsp; Description : <i>Développement API REST</i>
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    # ── Tableau ───────────────────────────────────────────────────────
    sel_ids = st.session_state.selected_ids
    selected = [e for e in entries if e.event_id in sel_ids]

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total événements", len(entries))
    m2.metric("Sélectionnés", len(selected))
    m3.metric("Heures", f"{sum(e.hours for e in selected):.1f} h")
    m4.metric("Clients", len(set(e.client_name for e in selected)))

    st.markdown('<div class="section-hdr">Événements</div>', unsafe_allow_html=True)

    col_all, col_none = st.columns([1, 1])
    with col_all:
        if st.button("Tout sélectionner"):
            st.session_state.selected_ids = {e.event_id for e in entries}
            st.rerun()
    with col_none:
        if st.button("Tout désélectionner"):
            st.session_state.selected_ids = set()
            st.rerun()

    # ── Assignation rapide du client aux lignes sélectionnées ────────
    known_names = sorted(
        {c.name for c in get_config().get_clients()} |
        {e.client_name for e in entries if e.client_name}
    )
    qa, qb, qc = st.columns([3, 2, 1])
    with qa:
        q_options = known_names + ["✏️ Nom personnalisé..."]
        q_sel = st.selectbox(
            "Assigner le client aux lignes ✓",
            q_options,
            key="quick_client_sel",
            label_visibility="visible",
        )
    with qb:
        if q_sel == "✏️ Nom personnalisé...":
            q_name = st.text_input(
                "Nom personnalisé", key="quick_client_custom", label_visibility="visible"
            )
        else:
            q_name = q_sel
            st.empty()
    with qc:
        st.markdown("<div style='margin-top:1.65rem'></div>", unsafe_allow_html=True)
        if st.button("Appliquer", key="apply_client", use_container_width=True):
            if q_name:
                for e in entries:
                    if e.event_id in sel_ids:
                        e.client_name = q_name
                st.session_state.time_entries = entries
                st.rerun()

    client_options = known_names if known_names else None
    edited = st.data_editor(
        pd.DataFrame([
            {
                "✓": (e.event_id in sel_ids),
                "Date": e.date.strftime("%Y-%m-%d"),
                "Début": e.date.strftime("%H:%M"),
                "Client": e.client_name,
                "Description": e.description,
                "Heures": e.hours,
                "_id": e.event_id,
            }
            for e in entries
        ]).drop("_id", axis=1),
        use_container_width=True,
        hide_index=True,
        column_config={
            "✓": st.column_config.CheckboxColumn("✓", width=40),
            "Date": st.column_config.TextColumn("Date", width=100),
            "Début": st.column_config.TextColumn("Début", width=60),
            "Client": (
                st.column_config.SelectboxColumn("Client", options=client_options, width=160)
                if client_options else
                st.column_config.TextColumn("Client", width=160)
            ),
            "Description": st.column_config.TextColumn("Description"),
            "Heures": st.column_config.NumberColumn(
                "Heures", min_value=0.0, max_value=24.0, step=0.25, width=80
            ),
        },
        num_rows="fixed",
        key="entries_editor",
    )

    if edited is not None:
        new_sel = set()
        for i, row in edited.iterrows():
            if i < len(entries):
                entries[i].client_name = str(row["Client"])
                entries[i].description = str(row["Description"])
                entries[i].hours = float(row["Heures"])
                if row["✓"]:
                    new_sel.add(entries[i].event_id)
        st.session_state.time_entries = entries
        st.session_state.selected_ids = new_sel

    st.markdown("---")
    if st.button("📄 Générer les factures →", type="primary"):
        st.session_state.page = "invoice"
        st.rerun()


# ──────────────────────────────────────────────────────────────────────────────
# Page: Clients
# ──────────────────────────────────────────────────────────────────────────────


def page_clients():
    st.markdown('<div class="main-title">👥 Gestion des Clients</div>', unsafe_allow_html=True)
    config = get_config()
    clients = config.get_clients()

    # ── Import Sage 50 ────────────────────────────────────────────────
    with st.expander("📥 Importer depuis Sage 50 Canada (CSV)", expanded=False):
        st.markdown(
            """
            <div class="step-box">
            <b>Exporter la liste des clients depuis Sage 50 :</b>
            <ol>
            <li>Menu <b>Rapports</b> → <b>Clients et ventes</b> → <b>Liste des clients</b></li>
            <li>Cliquez sur <b>Imprimer</b> (ou Fichier → Enregistrer sous)</li>
            <li>Choisissez le format <b>CSV</b> ou <b>Excel (.xlsx)</b></li>
            <li>Glissez le fichier ci-dessous</li>
            </ol>
            </div>
            """,
            unsafe_allow_html=True,
        )
        sage_file = st.file_uploader(
            "Fichier CSV / Excel Sage 50",
            type=["csv", "xlsx", "xls"],
            key="sage50_upload",
        )
        if sage_file:
            try:
                if sage_file.name.endswith((".xlsx", ".xls")):
                    df_sage = pd.read_excel(sage_file, dtype=str)
                else:
                    for enc in ("utf-8-sig", "latin-1", "cp1252"):
                        try:
                            sage_file.seek(0)
                            df_sage = pd.read_csv(sage_file, dtype=str, encoding=enc)
                            break
                        except Exception:
                            continue

                imported, col_map = parse_sage50_csv(df_sage)

                if not imported:
                    st.error("Aucun client trouvé dans ce fichier. Vérifiez que c'est bien "
                             "la liste des clients Sage 50.")
                else:
                    st.success(f"{len(imported)} client(s) détecté(s) dans le fichier.")

                    # Colonne non détectée
                    missing = [f for f, c in col_map.items()
                               if c is None and f in ("name", "city", "address")]
                    if missing:
                        st.warning(f"Colonnes non trouvées automatiquement : {', '.join(missing)}. "
                                   "Vérifiez que le fichier est bien un export Sage 50.")

                    s1, s2 = st.columns(2)
                    with s1:
                        default_rate = st.number_input(
                            "Taux horaire par défaut ($/h)", min_value=0.0, step=5.0,
                            value=0.0, key="sage_rate",
                            help="Appliqué aux nouveaux clients — modifiable ensuite individuellement.",
                        )
                    with s2:
                        merge_mode = st.radio(
                            "Si le client existe déjà",
                            ["Ignorer (conserver l'existant)", "Mettre à jour l'adresse et l'email"],
                            key="sage_merge",
                        )

                    st.dataframe(
                        pd.DataFrame(imported)[["name", "city", "email"]].rename(
                            columns={"name": "Nom", "city": "Ville", "email": "Email"}
                        ),
                        use_container_width=True,
                        hide_index=True,
                    )

                    if st.button("✅ Importer ces clients", type="primary", key="sage_import_btn"):
                        existing_names = {c.name.lower(): i for i, c in enumerate(clients)}
                        added = updated = skipped = 0
                        for row in imported:
                            key_low = row["name"].lower()
                            if key_low in existing_names:
                                if "Mettre à jour" in merge_mode:
                                    idx = existing_names[key_low]
                                    cl = clients[idx]
                                    clients[idx] = Client(
                                        name=cl.name,
                                        email=row["email"] or cl.email,
                                        address=row["address"] or cl.address,
                                        city=row["city"] or cl.city,
                                        postal_code=row["postal_code"] or cl.postal_code,
                                        country=row["country"] or cl.country,
                                        hourly_rate=cl.hourly_rate,
                                        tps_number=row["tps_number"] or cl.tps_number,
                                        tvq_number=row["tvq_number"] or cl.tvq_number,
                                    )
                                    updated += 1
                                else:
                                    skipped += 1
                            else:
                                clients.append(Client(
                                    name=row["name"],
                                    email=row["email"],
                                    address=row["address"],
                                    city=row["city"],
                                    postal_code=row["postal_code"],
                                    country=row["country"],
                                    hourly_rate=default_rate,
                                    tps_number=row["tps_number"],
                                    tvq_number=row["tvq_number"],
                                ))
                                added += 1
                        config.save_clients(clients)
                        parts = []
                        if added:
                            parts.append(f"{added} ajouté(s)")
                        if updated:
                            parts.append(f"{updated} mis à jour")
                        if skipped:
                            parts.append(f"{skipped} ignoré(s) (doublon)")
                        st.success("Import terminé : " + ", ".join(parts) + ".")
                        st.rerun()

            except Exception as exc:
                st.error(f"Erreur de lecture du fichier : {exc}")

    with st.expander("➕ Ajouter un client", expanded=len(clients) == 0):
        with st.form("new_client"):
            c1, c2 = st.columns(2)
            with c1:
                n_name = st.text_input("Nom *")
                n_email = st.text_input("Email")
                n_addr = st.text_input("Adresse")
                n_postal = st.text_input("Code postal")
            with c2:
                n_city = st.text_input("Ville")
                n_country = st.text_input("Pays", value="Canada")
                n_rate = st.number_input("Taux horaire ($/h)", min_value=0.0, step=5.0)
                n_tps = st.text_input("N° TPS client (si applicable)")
                n_tvq = st.text_input("N° TVQ client (si applicable)")

            if st.form_submit_button("Ajouter", type="primary"):
                if n_name.strip():
                    clients.append(Client(
                        name=n_name.strip(), email=n_email, address=n_addr,
                        postal_code=n_postal, city=n_city, country=n_country,
                        hourly_rate=n_rate, tps_number=n_tps, tvq_number=n_tvq,
                    ))
                    config.save_clients(clients)
                    st.success(f"Client « {n_name} » ajouté.")
                    st.rerun()
                else:
                    st.error("Le nom est obligatoire.")

    if not clients:
        st.info("Aucun client pour l'instant.")
        return

    st.markdown(
        f'<div class="section-hdr">Clients ({len(clients)})</div>',
        unsafe_allow_html=True,
    )

    for i, cl in enumerate(clients):
        with st.expander(f"**{cl.name}** — {cl.hourly_rate:.0f} $/h"):
            with st.form(f"edit_client_{i}"):
                c1, c2 = st.columns(2)
                with c1:
                    name = st.text_input("Nom", value=cl.name, key=f"cl_name_{i}")
                    email = st.text_input("Email", value=cl.email, key=f"cl_email_{i}")
                    addr = st.text_input("Adresse", value=cl.address, key=f"cl_addr_{i}")
                    postal = st.text_input("Code postal", value=cl.postal_code, key=f"cl_postal_{i}")
                with c2:
                    city = st.text_input("Ville", value=cl.city, key=f"cl_city_{i}")
                    country = st.text_input("Pays", value=cl.country, key=f"cl_cntry_{i}")
                    rate = st.number_input(
                        "Taux ($/h)", value=float(cl.hourly_rate),
                        min_value=0.0, step=5.0, key=f"cl_rate_{i}",
                    )
                    tps = st.text_input("N° TPS client", value=cl.tps_number, key=f"cl_tps_{i}")
                    tvq = st.text_input("N° TVQ client", value=cl.tvq_number, key=f"cl_tvq_{i}")

                cs, cd = st.columns(2)
                with cs:
                    if st.form_submit_button("💾 Enregistrer", type="primary"):
                        clients[i] = Client(
                            name=name, email=email, address=addr, postal_code=postal,
                            city=city, country=country, hourly_rate=rate,
                            tps_number=tps, tvq_number=tvq,
                        )
                        config.save_clients(clients)
                        st.success("Enregistré !")
                        st.rerun()
                with cd:
                    if st.form_submit_button("🗑️ Supprimer"):
                        clients.pop(i)
                        config.save_clients(clients)
                        st.rerun()


# ──────────────────────────────────────────────────────────────────────────────
# Page: Facturation
# ──────────────────────────────────────────────────────────────────────────────


def page_invoice():
    st.markdown('<div class="main-title">📄 Génération des Factures</div>', unsafe_allow_html=True)

    config = get_config()
    company = config.get_company()
    entries = st.session_state.time_entries
    sel_ids = st.session_state.selected_ids

    if not entries:
        st.warning("Aucun événement chargé. Allez dans **Calendrier** pour en importer.")
        if st.button("← Calendrier"):
            st.session_state.page = "calendar"
            st.rerun()
        return

    billable = [e for e in entries if e.event_id in sel_ids]
    if not billable:
        st.warning("Aucun événement sélectionné.")
        return

    by_client: Dict[str, List[TimeEntry]] = defaultdict(list)
    for e in billable:
        by_client[e.client_name].append(e)

    sym = company.currency_symbol or "€"

    st.markdown('<div class="section-hdr">Résumé par client</div>', unsafe_allow_html=True)
    cols = st.columns(min(len(by_client), 4))
    for idx, (cname, clist) in enumerate(by_client.items()):
        cl = config.get_client_by_name(cname)
        total_h = sum(e.hours for e in clist)
        total_m = total_h * cl.hourly_rate
        with cols[idx % 4]:
            st.markdown(
                f'<div class="metric-card"><b>{cname}</b><br/>'
                f"{total_h:.1f} h × {cl.hourly_rate:.0f} {sym}/h<br/>"
                f'<span style="font-size:1.1rem;font-weight:700">{total_m:.2f} {sym}</span></div>',
                unsafe_allow_html=True,
            )

    st.markdown("---")
    st.markdown('<div class="section-hdr">Options</div>', unsafe_allow_html=True)

    oc1, oc2, oc3 = st.columns([2, 2, 3])
    with oc1:
        inv_date = st.date_input("Date de facture", value=date.today())
    with oc2:
        due_days = st.number_input("Délai (jours)", value=int(company.payment_terms_days), min_value=0)
    with oc3:
        notes = st.text_area("Notes / conditions", height=68)

    st.markdown("---")
    st.markdown('<div class="section-hdr">Générer les factures</div>', unsafe_allow_html=True)

    gen = InvoiceGenerator()

    for cname, clist in by_client.items():
        cl = config.get_client_by_name(cname)
        total_h = sum(e.hours for e in clist)
        total_m = total_h * cl.hourly_rate

        row_l, row_r = st.columns([4, 1])
        with row_l:
            st.markdown(f"**{cname}** — {len(clist)} prestation(s) — {total_h:.1f} h — {total_m:.2f} {sym}")
        with row_r:
            if st.button("📄 PDF", key=f"gen_{cname}", type="primary", use_container_width=True):
                if cl.hourly_rate == 0:
                    st.warning(f"Taux horaire à 0 pour « {cname} ». Configurez-le dans **Clients**.")
                else:
                    inv_no = config.next_invoice_number(company)
                    issue_dt = datetime.combine(inv_date, datetime.min.time())
                    invoice = Invoice(
                        invoice_number=inv_no, client=cl, company=company,
                        entries=sorted(clist, key=lambda x: x.date),
                        issue_date=issue_dt,
                        due_date=issue_dt + timedelta(days=int(due_days)),
                        notes=notes,
                    )
                    with st.spinner("Génération PDF…"):
                        pdf = gen.generate_pdf(invoice)
                    fname = f"Facture_{inv_no}_{cname.replace(' ', '_')}.pdf"
                    st.download_button(
                        f"⬇️ Télécharger {fname}", data=pdf, file_name=fname,
                        mime="application/pdf", key=f"dl_{cname}",
                    )
                    st.success(f"Facture {inv_no} prête !")

    if len(by_client) > 1:
        st.markdown("---")
        if st.button("📦 Générer toutes les factures (ZIP)", type="secondary"):
            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for cname, clist in by_client.items():
                    cl = config.get_client_by_name(cname)
                    if cl.hourly_rate == 0:
                        continue
                    inv_no = config.next_invoice_number(company)
                    issue_dt = datetime.combine(inv_date, datetime.min.time())
                    invoice = Invoice(
                        invoice_number=inv_no, client=cl, company=company,
                        entries=sorted(clist, key=lambda x: x.date),
                        issue_date=issue_dt,
                        due_date=issue_dt + timedelta(days=int(due_days)),
                        notes=notes,
                    )
                    pdf = gen.generate_pdf(invoice)
                    zf.writestr(f"Facture_{inv_no}_{cname.replace(' ', '_')}.pdf", pdf)
            zip_buf.seek(0)
            st.download_button(
                "⬇️ Télécharger le ZIP", data=zip_buf.getvalue(),
                file_name=f"Factures_{inv_date.strftime('%Y%m')}.zip",
                mime="application/zip", key="dl_zip",
            )

    # ── Export Sage 50 — Fiches de temps ─────────────────────────────
    st.markdown("---")
    with st.expander("📤 Exporter les fiches de temps vers Sage 50", expanded=False):
        st.markdown(
            """
            <div class="step-box">
            Génère un CSV importable dans Sage 50 Canada :<br/>
            <b>Fichier → Importer/Exporter → Importer des activités de temps</b><br/>
            Lors de l'import, Sage 50 vous permettra de faire correspondre les colonnes.
            </div>
            """,
            unsafe_allow_html=True,
        )
        se1, se2 = st.columns(2)
        with se1:
            sage_employee = st.text_input(
                "Nom de l'employé / consultant",
                value=company.name,
                key="sage_emp",
                help="Doit correspondre exactement au nom dans Sage 50.",
            )
        with se2:
            sage_activity = st.text_input(
                "Code d'activité Sage 50",
                value="SERV",
                key="sage_act",
                help="Code de l'activité de temps dans Sage 50 (ex: SERV, CONSULT, DEVEL).",
            )

        sf1, sf2 = st.columns(2)
        with sf1:
            sage_sep = st.selectbox(
                "Séparateur de colonnes",
                ["Point-virgule (;) — Windows français", "Virgule (,) — standard"],
                key="sage_sep",
                help="Si Sage 50 met toutes les données dans une seule colonne au mapping, "
                     "changez de séparateur.",
            )
        with sf2:
            sage_datefmt = st.selectbox(
                "Format de date",
                ["AAAA-MM-JJ", "JJ/MM/AAAA", "MM/JJ/AAAA"],
                key="sage_datefmt",
                help="Doit correspondre au format de date configuré dans Sage 50 "
                     "(Configuration → Paramètres → Dates).",
            )

        use_semicolon = sage_sep.startswith("Point-virgule")
        sep = ";" if use_semicolon else ","
        # Avec le point-virgule (locale française), les décimales utilisent la virgule
        dec = "," if use_semicolon else "."
        fmt_map = {"AAAA-MM-JJ": "%Y-%m-%d", "JJ/MM/AAAA": "%d/%m/%Y", "MM/JJ/AAAA": "%m/%d/%Y"}
        date_fmt = fmt_map[sage_datefmt]

        def _num(v: float) -> str:
            return f"{v:.2f}".replace(".", dec)

        if st.button("⬇️ Télécharger CSV Sage 50", key="sage_export_btn"):
            rows = []
            for cname, clist in by_client.items():
                cl = config.get_client_by_name(cname)
                for e in sorted(clist, key=lambda x: x.date):
                    montant = round(e.hours * cl.hourly_rate, 2)
                    rows.append({
                        "Date":        e.date.strftime(date_fmt),
                        "Employé":     sage_employee,
                        "Client":      cname,
                        "Activité":    sage_activity,
                        "Heures":      _num(e.hours),
                        "Taux":        _num(cl.hourly_rate),
                        "Montant":     _num(montant),
                        "Description": e.description or "",
                        "Facturable":  "Oui",
                    })
            if rows:
                df_export = pd.DataFrame(rows)
                csv_bytes = df_export.to_csv(index=False, sep=sep).encode("utf-8-sig")
                fname = f"Sage50_Temps_{inv_date.strftime('%Y%m')}.csv"
                st.download_button(
                    f"⬇️ {fname}",
                    data=csv_bytes,
                    file_name=fname,
                    mime="text/csv",
                    key="dl_sage50",
                )
                st.dataframe(df_export, use_container_width=True, hide_index=True)
            else:
                st.warning("Aucune entrée à exporter.")


# ──────────────────────────────────────────────────────────────────────────────
# Page: Paramètres
# ──────────────────────────────────────────────────────────────────────────────


def page_settings():
    st.markdown('<div class="main-title">⚙️ Paramètres</div>', unsafe_allow_html=True)
    config = get_config()
    company = config.get_company()

    with st.form("company_form"):
        c1, c2 = st.columns(2)
        with c1:
            name = st.text_input("Nom de l'entreprise *", value=company.name)
            address = st.text_input("Adresse", value=company.address)
            postal = st.text_input("Code postal", value=company.postal_code)
            city = st.text_input("Ville", value=company.city)
            province = st.text_input("Province", value=company.province)
        with c2:
            country = st.text_input("Pays", value=company.country)
            email = st.text_input("Email", value=company.email)
            phone = st.text_input("Téléphone", value=company.phone)
            neq = st.text_input("NEQ (Numéro d'entreprise du Québec)", value=company.neq)
            currencies = ["CAD", "USD"]
            cur_idx = currencies.index(company.currency) if company.currency in currencies else 0
            currency = st.selectbox("Devise", currencies, index=cur_idx)

        st.markdown("**Numéros fiscaux**")
        f1, f2 = st.columns(2)
        with f1:
            tps_number = st.text_input(
                "N° TPS (fédéral)", value=company.tps_number,
                placeholder="Ex: 123456789 RT0001",
            )
        with f2:
            tvq_number = st.text_input(
                "N° TVQ (provincial)", value=company.tvq_number,
                placeholder="Ex: 1234567890 TQ0001",
            )

        st.markdown("**Taxes et facturation**")
        b1, b2, b3, b4 = st.columns(4)
        with b1:
            tps_rate = st.number_input(
                "TPS (%)", value=float(company.tps_rate), min_value=0.0, max_value=100.0, step=0.5
            )
        with b2:
            tvq_rate = st.number_input(
                "TVQ (%)", value=float(company.tvq_rate), min_value=0.0, max_value=100.0,
                step=0.001, format="%.3f",
            )
        with b3:
            pay_terms = st.number_input(
                "Délai paiement (j)", value=int(company.payment_terms_days), min_value=0
            )
        with b4:
            prefix = st.text_input("Préfixe facture", value=company.invoice_prefix)

        st.markdown("**Coordonnées bancaires**")
        bank_info = st.text_area(
            "Informations bancaires",
            value=company.bank_info,
            height=80,
            placeholder="Ex: Banque Nationale du Canada — Transit: 12345 — Compte: 1234567",
        )

        if st.form_submit_button("💾 Enregistrer", type="primary"):
            config.save_company(CompanyInfo(
                name=name, address=address, postal_code=postal,
                city=city, province=province, country=country,
                email=email, phone=phone,
                neq=neq, tps_number=tps_number, tvq_number=tvq_number,
                currency=currency, currency_symbol="$",
                tps_rate=tps_rate, tvq_rate=tvq_rate,
                payment_terms_days=pay_terms,
                invoice_prefix=prefix, invoice_counter=company.invoice_counter,
                bank_info=bank_info,
            ))
            st.success("Paramètres enregistrés !")
            st.rerun()


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────


def main():
    sidebar()
    dispatch = {
        "calendar": page_calendar,
        "clients":  page_clients,
        "invoice":  page_invoice,
        "settings": page_settings,
    }
    dispatch.get(st.session_state.page, page_calendar)()


if __name__ == "__main__":
    main()
