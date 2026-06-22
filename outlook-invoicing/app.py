"""
Facturation Outlook — Application principale Streamlit
=======================================================
Lit les événements du calendrier Outlook via Microsoft Graph API
et génère des factures PDF professionnelles.
"""

import io
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

import pandas as pd
import streamlit as st

from config_manager import ConfigManager
from graph_client import GraphClient
from invoice_generator import InvoiceGenerator
from models import Client, CompanyInfo, Invoice, TimeEntry

# ──────────────────────────────────────────────────────────────────────────────
# Configuration de la page
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
    [data-testid="stSidebar"] { min-width: 240px; max-width: 260px; }
    .main-title  { font-size:1.8rem; font-weight:700; color:#1a3a5c; margin-bottom:.25rem; }
    .section-hdr { font-size:1.05rem; font-weight:600; color:#2e7bcf;
                   border-bottom:2px solid #2e7bcf; padding-bottom:.2rem;
                   margin:1rem 0 .6rem; }
    .metric-card { background:#f0f4f8; border-left:4px solid #2e7bcf;
                   padding:.8rem 1rem; border-radius:4px; margin:.4rem 0; }
    .info-box    { background:#e8f4fd; border:1px solid #2e7bcf;
                   border-radius:6px; padding:1rem; margin:.5rem 0; }
    .warn-box    { background:#fff8e1; border:1px solid #ffc107;
                   border-radius:6px; padding:1rem; margin:.5rem 0; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ──────────────────────────────────────────────────────────────────────────────
# Session state
# ──────────────────────────────────────────────────────────────────────────────

DEFAULTS = {
    "page": "calendar",
    "authenticated": False,
    "access_token": None,
    "user_profile": None,
    "graph_client": None,
    "device_flow": None,
    "time_entries": [],
    "selected_ids": set(),
}

for _k, _v in DEFAULTS.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v


@st.cache_resource
def get_config() -> ConfigManager:
    return ConfigManager()


# ──────────────────────────────────────────────────────────────────────────────
# Sidebar
# ──────────────────────────────────────────────────────────────────────────────


def sidebar():
    config = get_config()
    company = config.get_company()

    with st.sidebar:
        st.markdown(f"### {company.name or 'Facturation Outlook'}")
        st.markdown("---")

        if st.session_state.authenticated:
            user = st.session_state.user_profile or {}
            st.success(f"✓ {user.get('displayName', 'Connecté')}")
            if st.button("Déconnexion", use_container_width=True):
                for k in ("authenticated", "access_token", "user_profile",
                          "graph_client", "device_flow"):
                    st.session_state[k] = DEFAULTS[k]
                st.rerun()
        else:
            st.warning("Non connecté à Outlook")

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
                f"{len(selected)}/{len(entries)} événements sélectionnés\n"
                f"{sum(e.hours for e in selected):.1f} h"
            )


# ──────────────────────────────────────────────────────────────────────────────
# Page: Authentification (affiché en overlay si non connecté)
# ──────────────────────────────────────────────────────────────────────────────


def page_auth():
    config = get_config()
    azure = config.get_azure_config()

    st.markdown('<div class="main-title">🔐 Connexion à Microsoft Outlook</div>', unsafe_allow_html=True)

    if not azure.get("client_id"):
        st.error(
            "**Configuration Azure manquante.**  \n"
            "Allez dans **⚙️ Paramètres** pour renseigner votre Client ID Azure AD."
        )
        if st.button("Aller aux Paramètres"):
            st.session_state.page = "settings"
            st.rerun()
        return

    client_id = azure["client_id"]
    tenant_id = azure.get("tenant_id", "common")

    st.markdown(
        """
        <div class="info-box">
        <b>Comment ça marche ?</b><br/>
        Cliquez sur <b>Démarrer</b>, copiez le code affiché, puis rendez-vous sur
        <a href="https://microsoft.com/devicelogin" target="_blank">microsoft.com/devicelogin</a>
        pour vous connecter avec votre compte Microsoft / Office 365.
        </div>
        """,
        unsafe_allow_html=True,
    )

    flow = st.session_state.device_flow

    if flow is None:
        if st.button("🔑 Démarrer l'authentification", type="primary"):
            try:
                graph = GraphClient(client_id=client_id, tenant_id=tenant_id)
                flow = graph.initiate_device_flow()
                st.session_state.device_flow = flow
                st.session_state.graph_client = graph
                st.rerun()
            except Exception as exc:
                st.error(f"Erreur : {exc}")
        return

    # Afficher le code
    user_code = flow.get("user_code", "")
    verify_uri = flow.get("verification_uri", "https://microsoft.com/devicelogin")

    st.markdown(
        f"""
        <div class="warn-box">
        <b>Étapes :</b>
        <ol>
          <li>Allez sur <a href="{verify_uri}" target="_blank"><b>{verify_uri}</b></a></li>
          <li>Entrez le code :<br/>
              <span style="font-size:2rem;font-family:monospace;font-weight:bold;
                           letter-spacing:6px;color:#1a3a5c">{user_code}</span>
          </li>
          <li>Connectez-vous avec votre compte Microsoft</li>
          <li>Revenez ici et cliquez sur <b>Vérifier la connexion</b></li>
        </ol>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col_check, col_cancel = st.columns([1, 1])

    with col_check:
        if st.button("✅ Vérifier la connexion", type="primary", use_container_width=True):
            graph: GraphClient = st.session_state.graph_client
            with st.spinner("Vérification en cours…"):
                result = graph.try_acquire_token(flow)

            if "access_token" in result:
                graph.set_token(result["access_token"])
                try:
                    profile = graph.get_user_profile()
                except Exception:
                    profile = {"displayName": "Utilisateur"}

                st.session_state.authenticated = True
                st.session_state.access_token = result["access_token"]
                st.session_state.user_profile = profile
                st.session_state.device_flow = None
                st.session_state.page = "calendar"
                st.success("Connexion réussie !")
                st.rerun()

            elif result.get("error") == "authorization_pending":
                st.warning(
                    "Authentification en attente. Avez-vous validé le code sur le site Microsoft ?"
                )
            elif result.get("error") == "expired_token":
                st.error("Le code a expiré. Recommencez.")
                st.session_state.device_flow = None
            else:
                st.error(f"Erreur : {result.get('error_description', result.get('error', 'Inconnue'))}")

    with col_cancel:
        if st.button("Annuler", use_container_width=True):
            st.session_state.device_flow = None
            st.rerun()


# ──────────────────────────────────────────────────────────────────────────────
# Page: Calendrier
# ──────────────────────────────────────────────────────────────────────────────


def page_calendar():
    st.markdown('<div class="main-title">📅 Calendrier Outlook</div>', unsafe_allow_html=True)

    if not st.session_state.authenticated:
        page_auth()
        return

    # ── Filtres ──────────────────────────────────────────────────────
    config = get_config()
    col1, col2, col3, col4 = st.columns([2, 2, 2, 2])

    with col1:
        start_date = st.date_input(
            "Début",
            value=date.today().replace(day=1),
            key="cal_start",
        )
    with col2:
        end_date = st.date_input("Fin", value=date.today(), key="cal_end")
    with col3:
        cat_filter = st.text_input(
            "Catégorie Outlook (filtre)",
            value="Facturable",
            help="Laisser vide pour récupérer tous les événements",
        )
    with col4:
        parse_mode = st.selectbox(
            "Lecture du nom client",
            [
                "Depuis le titre — [Client] Description",
                "Depuis la catégorie Outlook",
                "Client par défaut",
            ],
        )

    default_client_name = ""
    if "Client par défaut" in parse_mode:
        clients = config.get_clients()
        if clients:
            default_client_name = st.selectbox(
                "Client par défaut", [c.name for c in clients]
            )
        else:
            default_client_name = st.text_input("Nom du client par défaut")

    if st.button("🔄 Charger les événements", type="primary"):
        graph: GraphClient = st.session_state.graph_client
        graph.set_token(st.session_state.access_token)

        with st.spinner("Récupération depuis Outlook…"):
            try:
                start_dt = datetime.combine(start_date, datetime.min.time())
                end_dt = datetime.combine(end_date, datetime.max.time())
                cat = cat_filter.strip() or None
                raw = graph.get_calendar_events(start_dt, end_dt, cat)

                if "Depuis le titre" in parse_mode:
                    entries = graph.parse_events_from_title(raw)
                elif "catégorie" in parse_mode:
                    entries = graph.parse_events_from_categories(raw)
                else:
                    entries = graph.parse_events_default_client(raw, default_client_name)

                st.session_state.time_entries = entries
                # Tout sélectionné par défaut
                st.session_state.selected_ids = {e.event_id for e in entries}
                st.success(f"{len(entries)} événement(s) chargé(s)")
            except Exception as exc:
                st.error(f"Erreur : {exc}")

    entries: List[TimeEntry] = st.session_state.time_entries

    if not entries:
        st.markdown(
            """
            <div class="info-box">
            <b>Convention de nommage recommandée :</b><br/>
            Créez vos événements Outlook avec le format :<br/>
            <code>[NomClient] Description de la prestation</code><br/><br/>
            Exemple : <code>[Acme Corp] Développement API REST</code><br/>
            → Client : <b>Acme Corp</b> | Description : <i>Développement API REST</i><br/><br/>
            Vous pouvez aussi utiliser les <b>catégories Outlook</b> (ex : "Facturable") pour filtrer,
            et la <b>catégorie du client</b> pour nommer le client.
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    # ── Métriques rapides ─────────────────────────────────────────────
    sel_ids = st.session_state.selected_ids
    selected = [e for e in entries if e.event_id in sel_ids]

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total événements", len(entries))
    m2.metric("Sélectionnés", len(selected))
    m3.metric("Heures totales", f"{sum(e.hours for e in selected):.1f} h")
    m4.metric("Clients", len(set(e.client_name for e in selected)))

    # ── Tableau éditable ──────────────────────────────────────────────
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

    df_data = [
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
    ]

    df = pd.DataFrame(df_data)
    display_df = df.drop("_id", axis=1)

    edited = st.data_editor(
        display_df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "✓": st.column_config.CheckboxColumn("✓", width=40),
            "Date": st.column_config.TextColumn("Date", width=100),
            "Début": st.column_config.TextColumn("Début", width=60),
            "Client": st.column_config.TextColumn("Client", width=160),
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
                n_country = st.text_input("Pays", value="France")
                n_rate = st.number_input("Taux horaire (€/h)", min_value=0.0, step=5.0)
                n_vat = st.text_input("Numéro TVA")

            if st.form_submit_button("Ajouter", type="primary"):
                if n_name.strip():
                    clients.append(
                        Client(
                            name=n_name.strip(),
                            email=n_email,
                            address=n_addr,
                            postal_code=n_postal,
                            city=n_city,
                            country=n_country,
                            hourly_rate=n_rate,
                            vat_number=n_vat,
                        )
                    )
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
        with st.expander(f"**{cl.name}** — {cl.hourly_rate:.0f} €/h"):
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
                        "Taux horaire (€/h)", value=float(cl.hourly_rate),
                        min_value=0.0, step=5.0, key=f"cl_rate_{i}"
                    )
                    vat = st.text_input("Numéro TVA", value=cl.vat_number, key=f"cl_vat_{i}")

                col_s, col_d = st.columns(2)
                with col_s:
                    if st.form_submit_button("💾 Enregistrer", type="primary"):
                        clients[i] = Client(
                            name=name, email=email, address=addr,
                            postal_code=postal, city=city, country=country,
                            hourly_rate=rate, vat_number=vat,
                        )
                        config.save_clients(clients)
                        st.success("Enregistré !")
                        st.rerun()
                with col_d:
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

    # ── Résumé par client ─────────────────────────────────────────────
    st.markdown('<div class="section-hdr">Résumé par client</div>', unsafe_allow_html=True)

    col_count = min(len(by_client), 4)
    cols = st.columns(col_count)
    for idx, (cname, clist) in enumerate(by_client.items()):
        cl = config.get_client_by_name(cname)
        total_h = sum(e.hours for e in clist)
        total_m = total_h * cl.hourly_rate
        sym = company.currency_symbol or "€"
        with cols[idx % col_count]:
            st.markdown(
                f'<div class="metric-card">'
                f"<b>{cname}</b><br/>"
                f"{total_h:.1f} h × {cl.hourly_rate:.0f} {sym}/h<br/>"
                f'<span style="font-size:1.1rem;font-weight:700">{total_m:.2f} {sym}</span>'
                f"</div>",
                unsafe_allow_html=True,
            )

    st.markdown("---")

    # ── Options ───────────────────────────────────────────────────────
    st.markdown('<div class="section-hdr">Options</div>', unsafe_allow_html=True)

    oc1, oc2, oc3 = st.columns([2, 2, 3])
    with oc1:
        inv_date = st.date_input("Date de facture", value=date.today())
    with oc2:
        due_days = st.number_input(
            "Délai (jours)", value=int(company.payment_terms_days), min_value=0
        )
    with oc3:
        notes = st.text_area("Notes / conditions (optionnel)", height=68)

    st.markdown("---")

    # ── Génération individuelle ───────────────────────────────────────
    st.markdown('<div class="section-hdr">Générer les factures</div>', unsafe_allow_html=True)

    gen = InvoiceGenerator()
    sym = company.currency_symbol or "€"

    for cname, clist in by_client.items():
        cl = config.get_client_by_name(cname)
        total_h = sum(e.hours for e in clist)
        total_m = total_h * cl.hourly_rate

        row_l, row_r = st.columns([4, 1])
        with row_l:
            st.markdown(
                f"**{cname}** — {len(clist)} prestation(s) — "
                f"{total_h:.1f} h — {total_m:.2f} {sym}"
            )
        with row_r:
            if st.button("📄 PDF", key=f"gen_{cname}", type="primary", use_container_width=True):
                if cl.hourly_rate == 0:
                    st.warning(
                        f"Taux horaire à 0 pour « {cname} ». "
                        "Configurez-le dans **Clients**."
                    )
                else:
                    inv_no = config.next_invoice_number(company)
                    issue_dt = datetime.combine(inv_date, datetime.min.time())
                    due_dt = issue_dt + timedelta(days=int(due_days))
                    invoice = Invoice(
                        invoice_number=inv_no,
                        client=cl,
                        company=company,
                        entries=sorted(clist, key=lambda x: x.date),
                        issue_date=issue_dt,
                        due_date=due_dt,
                        notes=notes,
                    )
                    with st.spinner("Génération PDF…"):
                        pdf = gen.generate_pdf(invoice)

                    fname = f"Facture_{inv_no}_{cname.replace(' ', '_')}.pdf"
                    st.download_button(
                        f"⬇️ Télécharger {fname}",
                        data=pdf,
                        file_name=fname,
                        mime="application/pdf",
                        key=f"dl_{cname}",
                    )
                    st.success(f"Facture {inv_no} prête !")

    # ── Tout en ZIP ───────────────────────────────────────────────────
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
                    due_dt = issue_dt + timedelta(days=int(due_days))
                    invoice = Invoice(
                        invoice_number=inv_no,
                        client=cl,
                        company=company,
                        entries=sorted(clist, key=lambda x: x.date),
                        issue_date=issue_dt,
                        due_date=due_dt,
                        notes=notes,
                    )
                    pdf = gen.generate_pdf(invoice)
                    fname = f"Facture_{inv_no}_{cname.replace(' ', '_')}.pdf"
                    zf.writestr(fname, pdf)

            zip_buf.seek(0)
            st.download_button(
                "⬇️ Télécharger le ZIP",
                data=zip_buf.getvalue(),
                file_name=f"Factures_{inv_date.strftime('%Y%m')}.zip",
                mime="application/zip",
                key="dl_zip_all",
            )


# ──────────────────────────────────────────────────────────────────────────────
# Page: Paramètres
# ──────────────────────────────────────────────────────────────────────────────


def page_settings():
    st.markdown('<div class="main-title">⚙️ Paramètres</div>', unsafe_allow_html=True)
    config = get_config()

    tab_co, tab_az = st.tabs(["🏢 Entreprise", "☁️ Azure AD"])

    # ── Entreprise ──────────────────────────────────────────────────
    with tab_co:
        company = config.get_company()

        with st.form("company_form"):
            c1, c2 = st.columns(2)
            with c1:
                name = st.text_input("Nom de l'entreprise *", value=company.name)
                address = st.text_input("Adresse", value=company.address)
                postal = st.text_input("Code postal", value=company.postal_code)
                city = st.text_input("Ville", value=company.city)
                country = st.text_input("Pays", value=company.country)
            with c2:
                email = st.text_input("Email", value=company.email)
                phone = st.text_input("Téléphone", value=company.phone)
                vat = st.text_input("Numéro TVA", value=company.vat_number)
                siret = st.text_input("SIRET", value=company.siret)
                currencies = ["EUR", "USD", "GBP", "CHF"]
                cur_idx = currencies.index(company.currency) if company.currency in currencies else 0
                currency = st.selectbox("Devise", currencies, index=cur_idx)

            st.markdown("**Facturation**")
            b1, b2, b3 = st.columns(3)
            with b1:
                tax_rate = st.number_input(
                    "TVA (%)", value=float(company.tax_rate), min_value=0.0, max_value=100.0, step=0.5
                )
            with b2:
                pay_terms = st.number_input(
                    "Délai paiement (j)", value=int(company.payment_terms_days), min_value=0
                )
            with b3:
                prefix = st.text_input("Préfixe facture", value=company.invoice_prefix)

            st.markdown("**Coordonnées bancaires**")
            bi1, bi2 = st.columns(2)
            with bi1:
                iban = st.text_input("IBAN", value=company.bank_iban)
            with bi2:
                bic = st.text_input("BIC / SWIFT", value=company.bank_bic)

            if st.form_submit_button("💾 Enregistrer", type="primary"):
                sym_map = {"EUR": "€", "USD": "$", "GBP": "£", "CHF": "CHF"}
                updated = CompanyInfo(
                    name=name, address=address, postal_code=postal,
                    city=city, country=country, email=email, phone=phone,
                    vat_number=vat, siret=siret,
                    currency=currency, currency_symbol=sym_map.get(currency, "€"),
                    tax_rate=tax_rate, payment_terms_days=pay_terms,
                    invoice_prefix=prefix, invoice_counter=company.invoice_counter,
                    bank_iban=iban, bank_bic=bic,
                )
                config.save_company(updated)
                st.success("Paramètres enregistrés !")
                st.rerun()

    # ── Azure AD ────────────────────────────────────────────────────
    with tab_az:
        azure = config.get_azure_config()

        st.info(
            "Pour se connecter à Outlook, vous devez enregistrer une application Azure AD "
            "avec la permission **Calendars.Read** (déléguée)."
        )

        with st.expander("📖 Guide d'enregistrement Azure AD"):
            st.markdown(
                """
1. Connectez-vous sur [portal.azure.com](https://portal.azure.com)
2. Allez dans **Azure Active Directory → Inscriptions d'applications → Nouvelle inscription**
3. Nom : `Facturation Outlook`
4. Comptes pris en charge : *Comptes dans n'importe quel annuaire org. et comptes Microsoft personnels*
5. **Authentification** → Ajouter une plateforme → **Mobile et bureau** :
   - URI de redirection : `https://login.microsoftonline.com/common/oauth2/nativeclient`
6. **Autorisations API** → Ajouter :
   - Microsoft Graph → Délégué → `User.Read`
   - Microsoft Graph → Délégué → `Calendars.Read`
7. Accordez le consentement administrateur
8. Copiez l'**ID d'application (client)** et collez-le ci-dessous
                """
            )

        with st.form("azure_form"):
            client_id = st.text_input(
                "Client ID (ID d'application Azure AD)",
                value=azure.get("client_id", ""),
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            )
            tenant_id = st.text_input(
                "Tenant ID (optionnel)",
                value=azure.get("tenant_id", "common"),
                help="Laissez 'common' pour supporter les comptes pro et personnels.",
            )

            if st.form_submit_button("💾 Enregistrer", type="primary"):
                if client_id.strip():
                    config.save_azure_config(
                        client_id=client_id.strip(),
                        tenant_id=tenant_id.strip() or "common",
                    )
                    st.success("Configuration Azure enregistrée !")
                else:
                    st.error("Le Client ID est obligatoire.")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────


def main():
    sidebar()

    page = st.session_state.page
    dispatch = {
        "calendar": page_calendar,
        "clients":  page_clients,
        "invoice":  page_invoice,
        "settings": page_settings,
    }
    dispatch.get(page, page_calendar)()


if __name__ == "__main__":
    main()
