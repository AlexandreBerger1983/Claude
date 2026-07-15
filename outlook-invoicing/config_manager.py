import base64
import json
import os
from datetime import datetime
from typing import List, Optional, Set

from models import CompanyInfo, Client, InvoiceRecord

# Chemin relatif au répertoire du script (compatible Streamlit Cloud)
_HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(_HERE, "invoice_config.json")


class ConfigManager:
    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self._data = self._load()

    def _load(self) -> dict:
        if os.path.exists(self.config_path):
            with open(self.config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"company": {}, "clients": [], "azure": {}}

    def _save(self):
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)

    # --- Company ---

    def get_company(self) -> CompanyInfo:
        return CompanyInfo.from_dict(self._data.get("company", {}))

    def save_company(self, company: CompanyInfo):
        self._data["company"] = company.to_dict()
        self._save()

    def next_invoice_number(self, company: CompanyInfo, year: Optional[int] = None) -> str:
        """Numéro au format PREFIX-AAAA-NNN, compteur distinct par année."""
        year = year or datetime.now().year
        counters = self._data.setdefault("invoice_counters", {})
        key = str(year)
        if key not in counters:
            # Migration : reprendre l'ancien compteur global la première fois
            counters[key] = int(company.invoice_counter or 1)
        n = counters[key]
        counters[key] = n + 1
        self._save()
        return f"{company.invoice_prefix}-{year}-{n:03d}"

    # --- Clients ---

    def get_clients(self) -> List[Client]:
        return [Client.from_dict(c) for c in self._data.get("clients", [])]

    def save_clients(self, clients: List[Client]):
        self._data["clients"] = [c.to_dict() for c in clients]
        self._save()

    def get_client_by_name(self, name: str) -> Client:
        """Retourne le client correspondant ou un client vide avec ce nom."""
        name_lower = name.strip().lower()
        for client in self.get_clients():
            if client.name.strip().lower() == name_lower:
                return client
        return Client(name=name)

    # --- Historique des factures ---

    def get_invoices(self) -> List[InvoiceRecord]:
        return [InvoiceRecord.from_dict(r) for r in self._data.get("invoices", [])]

    def save_invoices(self, invoices: List[InvoiceRecord]):
        self._data["invoices"] = [r.to_dict() for r in invoices]
        self._save()

    def add_invoice(self, record: InvoiceRecord):
        self._data.setdefault("invoices", []).append(record.to_dict())
        self._save()

    def get_billed_event_ids(self) -> Set[str]:
        """UID des événements déjà présents sur une facture émise."""
        billed: Set[str] = set()
        for r in self._data.get("invoices", []):
            billed.update(r.get("event_ids", []))
        return billed

    # --- Logo ---

    def get_logo(self) -> Optional[bytes]:
        b64 = self._data.get("logo", "")
        if not b64:
            return None
        try:
            return base64.b64decode(b64)
        except Exception:
            return None

    def save_logo(self, data: Optional[bytes]):
        if data:
            self._data["logo"] = base64.b64encode(data).decode("ascii")
        else:
            self._data.pop("logo", None)
        self._save()

    # --- Sauvegarde / restauration ---

    def export_json(self) -> str:
        return json.dumps(self._data, indent=2, ensure_ascii=False)

    def import_json(self, raw: str):
        data = json.loads(raw)
        if not isinstance(data, dict) or "company" not in data:
            raise ValueError("Ce fichier n'est pas une sauvegarde de configuration valide "
                             "(clé 'company' manquante).")
        self._data = data
        self._save()

    # --- Azure config ---

    def get_azure_config(self) -> dict:
        # Priorité : st.secrets (Streamlit Cloud) > invoice_config.json > vide
        try:
            import streamlit as st
            secrets_azure = st.secrets.get("azure", {})
            if secrets_azure.get("client_id"):
                return {
                    "client_id": secrets_azure["client_id"],
                    "tenant_id": secrets_azure.get("tenant_id", "common"),
                }
        except Exception:
            pass
        return self._data.get("azure", {})

    def save_azure_config(self, client_id: str, tenant_id: str = "common"):
        self._data["azure"] = {"client_id": client_id, "tenant_id": tenant_id}
        self._save()
