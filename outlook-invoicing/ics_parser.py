"""
Parseur de fichiers ICS (iCalendar) — format standard Outlook / Google Calendar.
Aucune authentification requise.
"""

from datetime import date, datetime, timezone
from typing import List, Optional

import requests
from icalendar import Calendar

from models import TimeEntry


def parse_ics_bytes(data: bytes, category_filter: str = "") -> List[TimeEntry]:
    """Parse un fichier ICS et retourne les TimeEntry correspondants."""
    try:
        cal = Calendar.from_ical(data)
    except Exception as exc:
        raise ValueError(f"Fichier ICS invalide : {exc}")

    entries = []
    filter_lower = category_filter.strip().lower()

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        entry = _parse_vevent(component, filter_lower)
        if entry:
            entries.append(entry)

    return sorted(entries, key=lambda e: e.date)


def fetch_ics_url(url: str) -> bytes:
    """Télécharge un calendrier ICS depuis une URL."""
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.content
    except Exception as exc:
        raise ValueError(f"Impossible de télécharger l'URL : {exc}")


def _parse_vevent(component, category_filter: str) -> Optional[TimeEntry]:
    try:
        summary = str(component.get("SUMMARY", "")).strip()
        dtstart_prop = component.get("DTSTART")
        dtend_prop = component.get("DTEND")

        if not dtstart_prop or not dtend_prop:
            return None

        dtstart = dtstart_prop.dt
        dtend = dtend_prop.dt

        # Ignorer les événements toute-journée (type date, pas datetime)
        if isinstance(dtstart, date) and not isinstance(dtstart, datetime):
            return None

        # Normaliser en datetime naive (enlever timezone)
        if hasattr(dtstart, "tzinfo") and dtstart.tzinfo:
            dtstart = dtstart.astimezone(tz=None).replace(tzinfo=None)
        if hasattr(dtend, "tzinfo") and dtend.tzinfo:
            dtend = dtend.astimezone(tz=None).replace(tzinfo=None)

        hours = (dtend - dtstart).total_seconds() / 3600
        if hours <= 0 or hours >= 20:
            return None

        # Filtre par catégorie
        cats_raw = component.get("CATEGORIES")
        categories = _extract_categories(cats_raw)
        if category_filter and category_filter not in [c.lower() for c in categories]:
            return None

        # Lecture du nom client depuis le titre [Client] Description
        client_name, description = _parse_title(summary)

        # Fallback sur la description du corps si pas de description dans le titre
        if not description:
            body = str(component.get("DESCRIPTION", "")).strip()
            description = body[:200] if body else summary

        uid = str(component.get("UID", f"{summary}_{dtstart.isoformat()}"))

        return TimeEntry(
            date=dtstart,
            description=description,
            hours=round(hours, 2),
            client_name=client_name,
            event_id=uid,
        )
    except Exception:
        return None


def _parse_title(summary: str):
    """Retourne (client_name, description) depuis un titre de type '[Client] Desc'."""
    if summary.startswith("[") and "]" in summary:
        end = summary.index("]")
        client = summary[1:end].strip()
        desc = summary[end + 1:].strip().lstrip("-").strip()
        return client, desc
    return "", summary


def _extract_categories(cats_raw) -> List[str]:
    if not cats_raw:
        return []
    # icalendar peut retourner vTypes ou une liste
    if hasattr(cats_raw, "cats"):
        return [str(c) for c in cats_raw.cats]
    if isinstance(cats_raw, (list, tuple)):
        result = []
        for item in cats_raw:
            result.extend(_extract_categories(item))
        return result
    return [str(cats_raw)]
