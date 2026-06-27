import json
import os
from typing import List

from models import CompanyInfo, Client

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

    def next_invoice_number(self, company: CompanyInfo) -> str:
        number = f"{company.invoice_prefix}{company.invoice_counter:04d}"
        company.invoice_counter += 1
        self.save_company(company)
        return number

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
