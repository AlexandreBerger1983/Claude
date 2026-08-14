"""
Facturation Outlook — Application Streamlit
============================================
Importe les événements depuis un fichier ICS Outlook (ou URL de calendrier)
et génère des factures PDF professionnelles.

Aucune configuration Azure AD requise.
"""

import io
import json
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
from models import Client, CompanyInfo, Invoice, InvoiceRecord, TimeEntry


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


# En-tête de version du format d'importation natif Sage 50 Canada (enregistrements Clients).
# Repris tel quel d'un export réel Sage 50 ; « 33101 » = version du fichier Sage 50.
_SAGE50_CUSTOMERS_HEADER = "33101,3,Customers"


def sage50_customers_export(clients: List[Client], header: str = _SAGE50_CUSTOMERS_HEADER) -> bytes:
    """
    Génère un fichier d'importation natif Sage 50 Canada pour les enregistrements Clients.

    Format (validé sur un export réel Sage 50) :
      - ligne 1 : en-tête de version (ex. « 33101,3,Customers ») — DOIT correspondre
        à la version de Sage 50 installée, sinon « numéro de version non valide »
      - ligne 2 : vide
      - lignes suivantes : 15 champs positionnels entre guillemets + virgule finale
        1 Nom, 2 Contact, 3 Adresse 1, 4 Adresse 2, 5 Ville, 6 Province,
        7 Code postal, 8 Pays, 9 Tél. 1, 10 Tél. 2, 11 Téléc., 12 Courriel,
        13 Site web, 14 Devise, 15 Modalités
    Encodage Windows (CP1252), fins de ligne CRLF.
    """
    def q(v: str) -> str:
        return '"' + (v or "").replace('"', '""') + '"'

    lines = [header.strip(), ""]
    for c in clients:
        fields = [
            c.name,          # 1  Nom du client
            c.name,          # 2  Contact (= nom, comme dans l'export Sage 50)
            c.address,       # 3  Adresse ligne 1
            "",              # 4  Adresse ligne 2
            c.city,          # 5  Ville
            "",              # 6  Province
            c.postal_code,   # 7  Code postal
            c.country,       # 8  Pays
            "",              # 9  Téléphone 1
            "",              # 10 Téléphone 2
            "",              # 11 Télécopieur
            c.email,         # 12 Courriel
            "",              # 13 Site web
            "CAD",           # 14 Devise
            "Courant",       # 15 Modalités de paiement
        ]
        lines.append(",".join(q(f) for f in fields) + ",")
    return ("\r\n".join(lines) + "\r\n").encode("cp1252", errors="replace")


def _invoice_record_to_integration_dict(rec) -> dict:
    """Représentation structurée d'une facture pour un script d'intégration local
    (SDK Sage 50 ou automatisation d'interface). Indépendant de la version de Sage 50."""
    client = rec.client or {}
    company = rec.company or {}
    lignes = []
    rate = 0.0
    try:
        rate = float(client.get("hourly_rate", 0) or 0)
    except (TypeError, ValueError):
        rate = 0.0
    for e in rec.entries:
        heures = float(e.get("hours", 0) or 0)
        lignes.append({
            "date": (e.get("date", "") or "")[:10],
            "description": e.get("description", ""),
            "heures": round(heures, 2),
            "taux": round(rate, 2),
            "montant": round(heures * rate, 2),
        })
    return {
        "numero_facture": rec.invoice_number,
        "date_facture": rec.issue_date,
        "date_echeance": rec.due_date,
        "statut": rec.display_status,
        "client": {
            "nom": rec.client_name,
            "adresse": client.get("address", ""),
            "ville": client.get("city", ""),
            "code_postal": client.get("postal_code", ""),
            "pays": client.get("country", ""),
            "courriel": client.get("email", ""),
            "numero_tps": client.get("tps_number", ""),
            "numero_tvq": client.get("tvq_number", ""),
        },
        "lignes": lignes,
        "sous_total": round(rec.subtotal, 2),
        "tps": round(rec.tps, 2),
        "tvq": round(rec.tvq, 2),
        "total": round(rec.total, 2),
        "heures_totales": round(rec.hours, 2),
        "devise": company.get("currency", "CAD"),
        "notes": rec.notes,
        "emetteur": {
            "nom": company.get("name", ""),
            "neq": company.get("neq", ""),
            "numero_tps": company.get("tps_number", ""),
            "numero_tvq": company.get("tvq_number", ""),
        },
    }


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
            "dashboard": "📊 Tableau de bord",
            "calendar":  "📅 Calendrier",
            "clients":   "👥 Clients",
            "invoice":   "📄 Facturation",
            "history":   "🧾 Factures",
            "settings":  "⚙️ Paramètres",
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
                # Forcer la reconstruction du tableau (même si les UID se répètent)
                st.session_state.pop("entries_df", None)

                # Anti-double facturation : décocher les événements déjà facturés
                billed = get_config().get_billed_event_ids()
                already = [e for e in filtered if e.event_id in billed]
                st.session_state.selected_ids = {
                    e.event_id for e in filtered if e.event_id not in billed
                }
                st.success(f"{len(filtered)} événement(s) importé(s) sur {len(raw_entries)} total")
                if already:
                    st.warning(
                        f"⚠️ {len(already)} événement(s) déjà présents sur une facture émise "
                        "ont été décochés automatiquement (voir colonne « Déjà facturé »)."
                    )
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
    billed_ids = get_config().get_billed_event_ids()
    known_names = sorted(
        {c.name for c in get_config().get_clients()} |
        {e.client_name for e in entries if e.client_name}
    )
    client_options = known_names if known_names else None
    ids = [e.event_id for e in entries]

    def build_entries_df() -> pd.DataFrame:
        return pd.DataFrame([
            {
                "✓": (e.event_id in st.session_state.selected_ids),
                "Date": e.date.strftime("%Y-%m-%d"),
                "Début": e.date.strftime("%H:%M"),
                "Client": e.client_name,
                "Description": e.description,
                "Heures": float(e.hours),
                "Déjà facturé": "⚠️ Oui" if e.event_id in billed_ids else "",
            }
            for e in entries
        ])

    def refresh_entries_df():
        # Reconstruit le tableau depuis `entries` et change la clé du widget
        # pour qu'il réinitialise son état (utilisé à l'import et après une
        # action groupée : Tout sélectionner / désélectionner / Appliquer).
        st.session_state["entries_df"] = build_entries_df()
        st.session_state["entries_df_ids"] = ids
        st.session_state["editor_rev"] = st.session_state.get("editor_rev", 0) + 1

    # (Re)construire uniquement quand l'ensemble des événements change (nouvel import)
    if (st.session_state.get("entries_df") is None
            or st.session_state.get("entries_df_ids") != ids):
        refresh_entries_df()

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
            refresh_entries_df()
            st.rerun()
    with col_none:
        if st.button("Tout désélectionner"):
            st.session_state.selected_ids = set()
            refresh_entries_df()
            st.rerun()

    # ── Assignation rapide du client aux lignes sélectionnées ────────
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
                    if e.event_id in st.session_state.selected_ids:
                        e.client_name = q_name
                st.session_state.time_entries = entries
                refresh_entries_df()
                st.rerun()

    edited = st.data_editor(
        st.session_state["entries_df"],
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
            "Déjà facturé": st.column_config.TextColumn("Déjà facturé", width=100),
        },
        disabled=["Déjà facturé"],
        num_rows="fixed",
        key=f"entries_editor_{st.session_state['editor_rev']}",
    )

    # Synchroniser les modifications directes (cases, client, heures) vers
    # `entries` / `selected_ids` — SANS reconstruire le tableau (clé inchangée),
    # ce qui évite que les cases décochées se recochent.
    if edited is not None:
        edited_r = edited.reset_index(drop=True)
        new_sel = set()
        for i in range(min(len(entries), len(edited_r))):
            row = edited_r.iloc[i]
            entries[i].client_name = str(row["Client"])
            entries[i].description = str(row["Description"])
            entries[i].hours = float(row["Heures"])
            if bool(row["✓"]):
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

    # ── Export vers Sage 50 (format natif d'importation) ──────────────
    with st.expander("📤 Exporter les clients vers Sage 50 Canada", expanded=False):
        st.markdown(
            """
            <div class="step-box">
            Crée un fichier au <b>format d'importation natif de Sage 50</b>
            (avec la ligne de version que Sage 50 exige).<br/>
            Dans Sage 50 : <b>Fichier → Importer/Exporter → Importer des enregistrements
            → Clients</b>, puis choisissez ce fichier.
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.warning(
            "⚠️ **Erreur « numéro de version non valide » ?** La 1ʳᵉ ligne du fichier doit "
            "correspondre **exactement** à VOTRE version de Sage 50. Pour trouver la bonne :\n\n"
            "1. Dans Sage 50 : **Fichier → Importer/Exporter → Exporter des enregistrements → "
            "Clients** (exportez ne serait-ce qu'un client)\n"
            "2. Ouvrez le fichier obtenu avec le **Bloc-notes**\n"
            "3. Copiez **la toute première ligne** (ex. `33101,3,Customers`) et collez-la ci-dessous."
        )
        sage_header = st.text_input(
            "Ligne de version Sage 50 (1ʳᵉ ligne du fichier)",
            value=_SAGE50_CUSTOMERS_HEADER,
            key="sage_cust_header",
            help="Reprenez la 1ʳᵉ ligne d'un fichier exporté par VOTRE Sage 50.",
        )
        if clients:
            st.download_button(
                f"⬇️ Exporter {len(clients)} client(s) au format Sage 50 (.txt)",
                data=sage50_customers_export(clients, header=sage_header),
                file_name=f"Clients_Sage50_{date.today().isoformat()}.txt",
                mime="text/plain",
                key="dl_sage50_clients",
            )
            st.caption(
                "Champs exportés : nom, contact, adresse, ville, code postal, pays, "
                "courriel, devise (CAD), modalités (Courant)."
            )
        else:
            st.info("Ajoutez au moins un client avant d'exporter.")

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

    # ── Options d'export Sage 50 (Temps et facturation) ─────────────
    with st.expander("⚙️ Options d'export Sage 50 (temps facturable à un client)", expanded=False):
        st.markdown(
            """
            <div class="step-box">
            Ajout de temps <b>facturable</b> rattaché à un client (module
            <i>Temps et facturation</i> de Sage 50 Canada).<br/>
            Colonnes : <i>Type, Date, Employé, Client, Activité, Heures, Taux, Montant,
            Description, Facturable</i>.
            </div>
            """,
            unsafe_allow_html=True,
        )
        se1, se2 = st.columns(2)
        with se1:
            sage_employee = st.text_input(
                "Employé / consultant (colonne « Employé »)",
                value=company.name,
                key="sage_emp",
                help="Nom exact tel qu'enregistré dans Sage 50.",
            )
        with se2:
            sage_activity = st.text_input(
                "Activité (colonne « Activité »)",
                value="SERV",
                key="sage_act",
                help="Code/nom de l'activité de service dans Sage 50 (ex. SERV, CONSULT).",
            )

        sf1, sf2 = st.columns(2)
        with sf1:
            sage_datefmt = st.selectbox(
                "Format de date",
                ["AAAA-MM-JJ", "MM-JJ-AAAA", "JJ-MM-AAAA",
                 "AAAA/MM/JJ", "MM/JJ/AAAA", "JJ/MM/AAAA"],
                key="sage_datefmt",
                help="Doit correspondre au format de date de votre Sage 50.",
            )
        with sf2:
            sage_decimal = st.selectbox(
                "Décimales",
                ["Virgule (3,50) — Windows français", "Point (3.50)"],
                key="sage_dec",
                help="La plupart des Sage 50 en français attendent la virgule.",
            )

    fmt_map = {
        "AAAA-MM-JJ": "%Y-%m-%d", "MM-JJ-AAAA": "%m-%d-%Y", "JJ-MM-AAAA": "%d-%m-%Y",
        "AAAA/MM/JJ": "%Y/%m/%d", "MM/JJ/AAAA": "%m/%d/%Y", "JJ/MM/AAAA": "%d/%m/%Y",
    }
    csv_date_fmt = fmt_map[sage_datefmt]
    csv_dec = "," if sage_decimal.startswith("Virgule") else "."

    # Colonnes du temps facturable (module Temps et facturation Sage 50)
    SAGE_COLS = ["Type", "Date", "Employé", "Client", "Activité",
                 "Heures", "Taux", "Montant", "Description", "Facturable"]

    def _num(v: float) -> str:
        return f"{v:.2f}".replace(".", csv_dec)

    def sage_csv_bytes(client_entries: Dict[str, List[TimeEntry]]) -> bytes:
        rows = []
        for c_name, c_list in client_entries.items():
            c_cl = config.get_client_by_name(c_name)
            for e in sorted(c_list, key=lambda x: x.date):
                montant = round(e.hours * c_cl.hourly_rate, 2)
                rows.append({
                    "Type":        "TEMPS",
                    "Date":        e.date.strftime(csv_date_fmt),
                    "Employé":     sage_employee,
                    "Client":      c_name,
                    "Activité":    sage_activity,
                    "Heures":      _num(e.hours),
                    "Taux":        _num(c_cl.hourly_rate),
                    "Montant":     _num(montant),
                    "Description": e.description or "",
                    "Facturable":  "Oui",
                })
        df = pd.DataFrame(rows, columns=SAGE_COLS)
        # Encodage Windows (CP1252) ; séparateur virgule, valeurs contenant une
        # virgule (ex. « 3,50 ») automatiquement citées.
        return df.to_csv(index=False).encode("cp1252", errors="replace")

    st.markdown("---")
    st.markdown('<div class="section-hdr">Générer les factures</div>', unsafe_allow_html=True)

    gen = InvoiceGenerator()
    logo = config.get_logo()

    def record_invoice(invoice: Invoice):
        config.add_invoice(InvoiceRecord(
            invoice_number=invoice.invoice_number,
            client_name=invoice.client.name,
            issue_date=invoice.issue_date.date().isoformat(),
            due_date=invoice.due_date.date().isoformat(),
            subtotal=round(invoice.subtotal, 2),
            tps=round(invoice.tps_amount, 2),
            tvq=round(invoice.tvq_amount, 2),
            total=round(invoice.total, 2),
            hours=round(invoice.total_hours, 2),
            notes=invoice.notes,
            event_ids=[e.event_id for e in invoice.entries],
            entries=[
                {"date": e.date.isoformat(), "description": e.description,
                 "hours": e.hours, "event_id": e.event_id}
                for e in invoice.entries
            ],
            client=invoice.client.to_dict(),
            company=invoice.company.to_dict(),
        ))

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
                    inv_no = config.next_invoice_number(company, year=inv_date.year)
                    issue_dt = datetime.combine(inv_date, datetime.min.time())
                    invoice = Invoice(
                        invoice_number=inv_no, client=cl, company=company,
                        entries=sorted(clist, key=lambda x: x.date),
                        issue_date=issue_dt,
                        due_date=issue_dt + timedelta(days=int(due_days)),
                        notes=notes,
                    )
                    with st.spinner("Génération PDF…"):
                        pdf = gen.generate_pdf(invoice, logo=logo)
                    record_invoice(invoice)
                    st.session_state[f"generated_{cname}"] = {
                        "pdf": pdf,
                        "inv_no": inv_no,
                    }

        if f"generated_{cname}" in st.session_state:
            gen_data = st.session_state[f"generated_{cname}"]
            inv_no = gen_data["inv_no"]
            fname = f"Facture_{inv_no}_{cname.replace(' ', '_')}.pdf"
            dl_pdf, dl_csv = st.columns(2)
            with dl_pdf:
                st.download_button(
                    f"⬇️ PDF — {fname}", data=gen_data["pdf"], file_name=fname,
                    mime="application/pdf", key=f"dl_{cname}",
                    use_container_width=True,
                )
            with dl_csv:
                csv_fname = f"Sage50_Temps_{inv_no}_{cname.replace(' ', '_')}.csv"
                st.download_button(
                    f"⬇️ CSV Sage 50 — {csv_fname}",
                    data=sage_csv_bytes({cname: clist}),
                    file_name=csv_fname,
                    mime="text/csv",
                    key=f"dl_csv_{cname}",
                    use_container_width=True,
                )

    if len(by_client) > 1:
        st.markdown("---")
        if st.button("📦 Générer toutes les factures (ZIP)", type="secondary"):
            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for cname, clist in by_client.items():
                    cl = config.get_client_by_name(cname)
                    if cl.hourly_rate == 0:
                        continue
                    inv_no = config.next_invoice_number(company, year=inv_date.year)
                    issue_dt = datetime.combine(inv_date, datetime.min.time())
                    invoice = Invoice(
                        invoice_number=inv_no, client=cl, company=company,
                        entries=sorted(clist, key=lambda x: x.date),
                        issue_date=issue_dt,
                        due_date=issue_dt + timedelta(days=int(due_days)),
                        notes=notes,
                    )
                    pdf = gen.generate_pdf(invoice, logo=logo)
                    record_invoice(invoice)
                    zf.writestr(f"Facture_{inv_no}_{cname.replace(' ', '_')}.pdf", pdf)
            zip_buf.seek(0)
            st.download_button(
                "⬇️ Télécharger le ZIP", data=zip_buf.getvalue(),
                file_name=f"Factures_{inv_date.strftime('%Y%m')}.zip",
                mime="application/zip", key="dl_zip",
            )

    # ── Export Sage 50 global (tous les clients) ─────────────────────
    st.markdown("---")
    st.download_button(
        "📤 CSV Sage 50 — tous les clients",
        data=sage_csv_bytes(by_client),
        file_name=f"Sage50_Temps_{inv_date.strftime('%Y%m')}.csv",
        mime="text/csv",
        key="dl_sage50_all",
    )


# ──────────────────────────────────────────────────────────────────────────────
# Page: Factures (historique)
# ──────────────────────────────────────────────────────────────────────────────


def page_history():
    st.markdown('<div class="main-title">🧾 Factures émises</div>', unsafe_allow_html=True)
    config = get_config()
    records = config.get_invoices()

    if not records:
        st.info("Aucune facture émise pour l'instant. Générez-en une dans **Facturation**.")
        return

    # Tri : plus récentes en premier
    records_sorted = sorted(records, key=lambda r: (r.issue_date, r.invoice_number), reverse=True)

    pending = [r for r in records if r.display_status == "En attente"]
    overdue = [r for r in records if r.display_status == "En retard"]
    paid    = [r for r in records if r.status == "Payée"]

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Factures émises", len(records))
    m2.metric("En attente", f"{sum(r.total for r in pending):,.2f} $")
    m3.metric("En retard", f"{sum(r.total for r in overdue):,.2f} $",
              delta=f"{len(overdue)} facture(s)" if overdue else None,
              delta_color="inverse")
    m4.metric("Payées", f"{sum(r.total for r in paid):,.2f} $")

    status_filter = st.radio(
        "Filtrer",
        ["Toutes", "En attente", "En retard", "Payée"],
        horizontal=True,
        label_visibility="collapsed",
    )
    if status_filter != "Toutes":
        records_sorted = [r for r in records_sorted if r.display_status == status_filter]

    # ── Export JSON pour intégration Sage 50 (SDK / script local) ────
    with st.expander("🔌 Exporter les factures (JSON) pour intégration Sage 50", expanded=False):
        st.markdown(
            """
            <div class="step-box">
            Export structuré destiné à un <b>script local Windows</b> qui crée les factures
            dans Sage 50 (via le SDK ou l'automatisation d'interface). Contient tout ce
            qu'il faut : client, adresse, n°, dates, lignes détaillées, sous-total,
            TPS, TVQ, total et numéros de taxe.
            </div>
            """,
            unsafe_allow_html=True,
        )
        payload = [_invoice_record_to_integration_dict(r) for r in records_sorted]
        st.download_button(
            f"⬇️ Exporter {len(payload)} facture(s) en JSON",
            data=json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
            file_name=f"Factures_integration_{date.today().isoformat()}.json",
            mime="application/json",
            key="dl_invoices_json",
        )
        st.caption("Respecte le filtre de statut ci-dessus.")

    gen = InvoiceGenerator()
    logo = config.get_logo()
    badge = {"Payée": "✅", "En attente": "🕓", "En retard": "🔴"}

    for rec in records_sorted:
        title = (f"{badge[rec.display_status]} **{rec.invoice_number}** — {rec.client_name} — "
                 f"{rec.total:,.2f} $ — émise le {rec.issue_date}")
        with st.expander(title):
            d1, d2, d3, d4 = st.columns(4)
            d1.markdown(f"**Sous-total** : {rec.subtotal:,.2f} $")
            d2.markdown(f"**TPS** : {rec.tps:,.2f} $")
            d3.markdown(f"**TVQ** : {rec.tvq:,.2f} $")
            d4.markdown(f"**Heures** : {rec.hours:.2f} h")
            st.caption(f"Échéance : {rec.due_date}")

            if rec.entries:
                st.dataframe(
                    pd.DataFrame([
                        {"Date": e["date"][:10], "Description": e.get("description", ""),
                         "Heures": e.get("hours", 0)}
                        for e in rec.entries
                    ]),
                    use_container_width=True, hide_index=True,
                )

            a1, a2 = st.columns(2)
            with a1:
                new_status = st.selectbox(
                    "Statut",
                    ["En attente", "Payée"],
                    index=0 if rec.status != "Payée" else 1,
                    key=f"status_{rec.invoice_number}",
                )
                if new_status != rec.status:
                    for r in records:
                        if r.invoice_number == rec.invoice_number:
                            r.status = new_status
                    config.save_invoices(records)
                    st.rerun()
            with a2:
                st.markdown("<div style='margin-top:1.65rem'></div>", unsafe_allow_html=True)
                try:
                    pdf = gen.generate_pdf(rec.to_invoice(), logo=logo)
                    st.download_button(
                        "⬇️ Re-télécharger le PDF",
                        data=pdf,
                        file_name=f"Facture_{rec.invoice_number}_{rec.client_name.replace(' ', '_')}.pdf",
                        mime="application/pdf",
                        key=f"redl_{rec.invoice_number}",
                        use_container_width=True,
                    )
                except Exception as exc:
                    st.error(f"Impossible de régénérer le PDF : {exc}")

    st.markdown("---")
    with st.expander("🗑️ Supprimer une facture de l'historique"):
        st.caption(
            "Retire la facture de l'historique et libère ses événements "
            "pour une nouvelle facturation. Ne supprime pas le PDF déjà téléchargé."
        )
        nums = [r.invoice_number for r in records_sorted]
        if nums:
            to_del = st.selectbox("Facture", nums, key="del_invoice_sel")
            if st.button("Supprimer définitivement", type="secondary", key="del_invoice_btn"):
                config.save_invoices([r for r in records if r.invoice_number != to_del])
                st.success(f"Facture {to_del} supprimée de l'historique.")
                st.rerun()


# ──────────────────────────────────────────────────────────────────────────────
# Page: Tableau de bord
# ──────────────────────────────────────────────────────────────────────────────


def page_dashboard():
    st.markdown('<div class="main-title">📊 Tableau de bord</div>', unsafe_allow_html=True)
    config = get_config()
    records = config.get_invoices()

    if not records:
        st.info(
            "Le tableau de bord se remplit à mesure que vous émettez des factures. "
            "Commencez par importer un calendrier puis générez une facture."
        )
        return

    df = pd.DataFrame([{
        "Numéro":  r.invoice_number,
        "Client":  r.client_name,
        "Date":    pd.to_datetime(r.issue_date),
        "Heures":  r.hours,
        "Sous-total": r.subtotal,
        "TPS":     r.tps,
        "TVQ":     r.tvq,
        "Total":   r.total,
        "Statut":  r.display_status,
    } for r in records])

    years = sorted(df["Date"].dt.year.unique(), reverse=True)
    year = st.selectbox("Année", years, index=0)
    dfy = df[df["Date"].dt.year == year].copy()

    m1, m2, m3, m4 = st.columns(4)
    m1.metric(f"Revenus {year}", f"{dfy['Sous-total'].sum():,.2f} $")
    m2.metric("Heures facturées", f"{dfy['Heures'].sum():,.1f} h")
    m3.metric("TPS facturée", f"{dfy['TPS'].sum():,.2f} $")
    m4.metric("TVQ facturée", f"{dfy['TVQ'].sum():,.2f} $")
    st.caption(
        "Montants basés sur les factures émises (payées ou non). "
        "TPS/TVQ facturées = à remettre selon votre méthode de déclaration."
    )

    import altair as alt

    # ── Revenus par mois (barres, une seule teinte) ──────────────────
    st.markdown('<div class="section-hdr">Revenus par mois</div>', unsafe_allow_html=True)
    monthly = (
        dfy.assign(Mois=dfy["Date"].dt.strftime("%Y-%m"))
        .groupby("Mois", as_index=False)
        .agg({"Sous-total": "sum", "Heures": "sum"})
    )
    chart_m = (
        alt.Chart(monthly)
        .mark_bar(color="#2e7bcf", cornerRadiusTopLeft=4, cornerRadiusTopRight=4, size=28)
        .encode(
            x=alt.X("Mois:O", title=None, axis=alt.Axis(labelAngle=0)),
            y=alt.Y("Sous-total:Q", title="Revenus ($)"),
            tooltip=[
                alt.Tooltip("Mois:O", title="Mois"),
                alt.Tooltip("Sous-total:Q", title="Revenus ($)", format=",.2f"),
                alt.Tooltip("Heures:Q", title="Heures", format=".1f"),
            ],
        )
        .properties(height=260)
    )
    st.altair_chart(chart_m, use_container_width=True)

    # ── Revenus par client (barres horizontales) ─────────────────────
    st.markdown('<div class="section-hdr">Revenus par client</div>', unsafe_allow_html=True)
    by_cl = (
        dfy.groupby("Client", as_index=False)
        .agg({"Sous-total": "sum", "Heures": "sum"})
        .sort_values("Sous-total", ascending=False)
    )
    chart_c = (
        alt.Chart(by_cl)
        .mark_bar(color="#2e7bcf", cornerRadiusTopRight=4, cornerRadiusBottomRight=4, size=22)
        .encode(
            y=alt.Y("Client:N", sort="-x", title=None),
            x=alt.X("Sous-total:Q", title="Revenus ($)"),
            tooltip=[
                alt.Tooltip("Client:N"),
                alt.Tooltip("Sous-total:Q", title="Revenus ($)", format=",.2f"),
                alt.Tooltip("Heures:Q", title="Heures", format=".1f"),
            ],
        )
        .properties(height=max(120, 40 * len(by_cl)))
    )
    st.altair_chart(chart_c, use_container_width=True)

    # ── Détail ────────────────────────────────────────────────────────
    st.markdown('<div class="section-hdr">Détail des factures</div>', unsafe_allow_html=True)
    st.dataframe(
        dfy.sort_values("Date", ascending=False).assign(
            Date=dfy["Date"].dt.strftime("%Y-%m-%d")
        ),
        use_container_width=True,
        hide_index=True,
        column_config={
            "Sous-total": st.column_config.NumberColumn(format="%.2f $"),
            "TPS":        st.column_config.NumberColumn(format="%.2f $"),
            "TVQ":        st.column_config.NumberColumn(format="%.2f $"),
            "Total":      st.column_config.NumberColumn(format="%.2f $"),
        },
    )


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

    # ── Logo d'entreprise ─────────────────────────────────────────────
    st.markdown('<div class="section-hdr">Logo d\'entreprise</div>', unsafe_allow_html=True)
    logo = config.get_logo()
    lg1, lg2 = st.columns([2, 1])
    with lg1:
        logo_file = st.file_uploader(
            "Logo (PNG ou JPG) — affiché en haut à gauche de la facture",
            type=["png", "jpg", "jpeg"],
            key="logo_upload",
        )
        if logo_file is not None:
            data = logo_file.read()
            if len(data) > 2_000_000:
                st.error("Fichier trop lourd (max 2 Mo).")
            else:
                config.save_logo(data)
                st.success("Logo enregistré !")
                st.rerun()
    with lg2:
        if logo:
            st.image(logo, caption="Logo actuel", width=180)
            if st.button("🗑️ Retirer le logo"):
                config.save_logo(None)
                st.rerun()
        else:
            st.caption("Aucun logo configuré.")

    # ── Sauvegarde / restauration ─────────────────────────────────────
    st.markdown('<div class="section-hdr">Sauvegarde de la configuration</div>', unsafe_allow_html=True)
    st.caption(
        "La configuration (entreprise, clients, historique des factures, logo) est stockée "
        "dans un fichier local. Sur Streamlit Cloud, ce fichier est effacé à chaque "
        "redéploiement — exportez une sauvegarde régulièrement."
    )
    bk1, bk2 = st.columns(2)
    with bk1:
        st.download_button(
            "⬇️ Exporter la configuration",
            data=config.export_json().encode("utf-8"),
            file_name=f"facturation_sauvegarde_{date.today().isoformat()}.json",
            mime="application/json",
            use_container_width=True,
        )
    with bk2:
        backup_file = st.file_uploader(
            "Restaurer une sauvegarde (.json)",
            type=["json"],
            key="backup_upload",
            label_visibility="collapsed",
        )
        if backup_file is not None:
            try:
                config.import_json(backup_file.read().decode("utf-8"))
                st.success("Configuration restaurée !")
                st.rerun()
            except Exception as exc:
                st.error(f"Restauration impossible : {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────


def main():
    sidebar()
    dispatch = {
        "dashboard": page_dashboard,
        "calendar":  page_calendar,
        "clients":   page_clients,
        "invoice":   page_invoice,
        "history":   page_history,
        "settings":  page_settings,
    }
    dispatch.get(st.session_state.page, page_calendar)()


if __name__ == "__main__":
    main()
