import requests
from datetime import datetime
from typing import List, Optional, Dict, Any

from models import TimeEntry

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class GraphClient:
    def __init__(self, access_token: str):
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
        params = {
            "startDateTime": start_date.strftime("%Y-%m-%dT00:00:00"),
            "endDateTime": end_date.strftime("%Y-%m-%dT23:59:59"),
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
        """Convention: [NomClient] Description de la prestation"""
        entries = []
        for event in events:
            subject = event.get("subject", "").strip()
            client_name, description = "", subject

            if subject.startswith("[") and "]" in subject:
                end_bracket = subject.index("]")
                client_name = subject[1:end_bracket].strip()
                description = subject[end_bracket + 1:].strip().lstrip("-").strip()
                if not description:
                    description = event.get("bodyPreview", "")[:200]
            elif event.get("categories"):
                client_name = event["categories"][0]

            entry = self._make_entry(event, client_name, description)
            if entry:
                entries.append(entry)
        return entries

    def parse_events_from_categories(self, events: List[Dict[str, Any]]) -> List[TimeEntry]:
        """Première catégorie Outlook = nom du client."""
        entries = []
        for event in events:
            client_name = (event.get("categories") or [""])[0]
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
