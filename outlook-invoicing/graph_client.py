import msal
import requests
from datetime import datetime
from typing import List, Optional, Dict, Any

from models import TimeEntry

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
SCOPES = ["User.Read", "Calendars.Read"]


class GraphClient:
    def __init__(self, client_id: str, tenant_id: str = "common"):
        self.client_id = client_id
        self.tenant_id = tenant_id
        self.access_token: Optional[str] = None
        self._msal_app = msal.PublicClientApplication(
            client_id=client_id,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
        )

    def initiate_device_flow(self) -> dict:
        flow = self._msal_app.initiate_device_flow(scopes=SCOPES)
        if "user_code" not in flow:
            raise ValueError(f"Impossible d'initier le flux: {flow.get('error_description', flow)}")
        return flow

    def try_acquire_token(self, flow: dict) -> dict:
        """
        Tente une acquisition de token unique sans attente (polling direct sur l'endpoint).
        Retourne le résultat brut: contient 'access_token' si succès,
        ou 'error' = 'authorization_pending' si l'utilisateur n'a pas encore validé.
        """
        token_url = (
            f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        )
        data = {
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "device_code": flow["device_code"],
            "client_id": self.client_id,
        }
        resp = requests.post(token_url, data=data, timeout=10)
        return resp.json()

    def set_token(self, access_token: str):
        self.access_token = access_token

    def get_user_profile(self) -> Dict[str, Any]:
        resp = requests.get(f"{GRAPH_BASE}/me", headers=self._headers(), timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_calendar_events(
        self,
        start_date: datetime,
        end_date: datetime,
        category_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        start_str = start_date.strftime("%Y-%m-%dT00:00:00")
        end_str = end_date.strftime("%Y-%m-%dT23:59:59")

        params = {
            "startDateTime": start_str,
            "endDateTime": end_str,
            "$select": "id,subject,start,end,bodyPreview,categories",
            "$orderby": "start/dateTime asc",
            "$top": "500",
        }

        resp = requests.get(
            f"{GRAPH_BASE}/me/calendarView",
            headers=self._headers(),
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        events = resp.json().get("value", [])

        if category_filter:
            filter_lower = category_filter.strip().lower()
            events = [
                e for e in events
                if filter_lower in [c.lower() for c in e.get("categories", [])]
            ]

        return events

    def parse_events_from_title(self, events: List[Dict[str, Any]]) -> List[TimeEntry]:
        """
        Convention titre: [NomClient] Description de la prestation
        Ex: [Acme Corp] Réunion de projet
        """
        entries = []
        for event in events:
            subject = event.get("subject", "").strip()
            client_name = ""
            description = subject

            if subject.startswith("[") and "]" in subject:
                end_bracket = subject.index("]")
                client_name = subject[1:end_bracket].strip()
                desc_part = subject[end_bracket + 1:].strip().lstrip("-").strip()
                description = desc_part or event.get("bodyPreview", "")[:200]
            else:
                description = subject
                if event.get("categories"):
                    client_name = event["categories"][0]

            entry = self._make_entry(event, client_name, description)
            if entry:
                entries.append(entry)
        return entries

    def parse_events_from_categories(self, events: List[Dict[str, Any]]) -> List[TimeEntry]:
        """
        La première catégorie Outlook = nom du client.
        """
        entries = []
        for event in events:
            categories = event.get("categories", [])
            client_name = categories[0] if categories else ""
            description = event.get("subject", "").strip()
            entry = self._make_entry(event, client_name, description)
            if entry:
                entries.append(entry)
        return entries

    def parse_events_default_client(
        self, events: List[Dict[str, Any]], default_client: str
    ) -> List[TimeEntry]:
        entries = []
        for event in events:
            description = event.get("subject", "").strip()
            entry = self._make_entry(event, default_client, description)
            if entry:
                entries.append(entry)
        return entries

    def _make_entry(
        self, event: dict, client_name: str, description: str
    ) -> Optional[TimeEntry]:
        try:
            start_dt = self._parse_dt(event["start"]["dateTime"])
            end_dt = self._parse_dt(event["end"]["dateTime"])
            hours = (end_dt - start_dt).total_seconds() / 3600

            # Ignorer les événements toute-journée (>= 20h)
            if hours >= 20 or hours <= 0:
                return None

            return TimeEntry(
                date=start_dt,
                description=description or event.get("subject", ""),
                hours=round(hours, 2),
                client_name=client_name,
                event_id=event.get("id", ""),
            )
        except (KeyError, ValueError):
            return None

    def _headers(self) -> dict:
        if not self.access_token:
            raise ValueError("Non authentifié")
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _parse_dt(dt_str: str) -> datetime:
        dt_str = dt_str.rstrip("Z")
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
            try:
                return datetime.strptime(dt_str, fmt)
            except ValueError:
                continue
        raise ValueError(f"Impossible de parser la date: {dt_str}")
