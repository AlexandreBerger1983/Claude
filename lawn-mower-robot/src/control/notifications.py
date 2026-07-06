"""
Notifications à distance : alerte l'opérateur des événements importants
(tâche terminée, robot coincé, batterie faible, danger, erreur).

Canaux supportés :
  - "email"   : SMTP (Gmail, etc.)
  - "webhook" : POST JSON (Discord, Slack, Telegram via bot, domotique…)
  - "sms"     : via passerelle email→SMS de l'opérateur mobile (souvent gratuit)

Les événements sont limités en fréquence (anti-spam) par type.
"""
import json
import smtplib
import threading
import time
import urllib.request
from email.mime.text import MIMEText
from enum import Enum

from src.utils import logger


class EventLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Notifier:
    def __init__(self, config: dict):
        cfg = config or {}
        self._enabled = cfg.get("enabled", False)
        self._channels = cfg.get("channels", [])
        self._email = cfg.get("email", {})
        self._webhook = cfg.get("webhook", {})
        self._min_level = EventLevel(cfg.get("min_level", "info"))
        self._cooldown = cfg.get("cooldown_seconds", 60)
        self._last_sent: dict[str, float] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------

    def _should_send(self, key: str, level: EventLevel, now: float) -> bool:
        """Décision d'envoi : activé, niveau suffisant, hors cooldown.
        Met à jour l'horodatage si l'envoi est autorisé (logique testable)."""
        if not self._enabled:
            return False
        if self._level_rank(level) < self._level_rank(self._min_level):
            return False
        with self._lock:
            last = self._last_sent.get(key)   # None = jamais envoyé
            if last is not None and now - last < self._cooldown:
                return False
            self._last_sent[key] = now
        return True

    def notify(self, title: str, message: str,
               level: EventLevel = EventLevel.INFO, key: str | None = None):
        """Envoie une notification. `key` sert au throttling par type d'événement."""
        throttle_key = key or title
        if not self._should_send(throttle_key, level, time.time()):
            return
        # Envoi non bloquant
        threading.Thread(
            target=self._dispatch, args=(title, message, level), daemon=True
        ).start()

    def _dispatch(self, title: str, message: str, level: EventLevel):
        for channel in self._channels:
            try:
                if channel == "email":
                    self._send_email(title, message, level)
                elif channel == "sms":
                    self._send_email(title, message, level, sms=True)
                elif channel == "webhook":
                    self._send_webhook(title, message, level)
            except Exception as e:
                logger.error(f"Échec notification {channel} : {e}")

    # ------------------------------------------------------------------

    def _send_email(self, title: str, message: str, level: EventLevel, sms: bool = False):
        e = self._email
        to = e.get("sms_to") if sms else e.get("to")
        if not to:
            return
        body = message if sms else f"[{level.value.upper()}] {title}\n\n{message}"
        msg = MIMEText(body)
        msg["Subject"] = "" if sms else f"Johnny-Mow : {title}"
        msg["From"] = e.get("from", e.get("username", ""))
        msg["To"] = to

        with smtplib.SMTP(e["smtp_host"], e.get("smtp_port", 587)) as server:
            server.starttls()
            server.login(e["username"], e["password"])
            server.send_message(msg)
        logger.info(f"Notification {'SMS' if sms else 'email'} envoyée : {title}")

    def _send_webhook(self, title: str, message: str, level: EventLevel):
        url = self._webhook.get("url")
        if not url:
            return
        # Format générique (compatible Discord/Slack via "content"/"text")
        payload = {
            "content": f"**{title}** [{level.value}]\n{message}",
            "text": f"*{title}* [{level.value}]\n{message}",
            "title": title,
            "message": message,
            "level": level.value,
        }
        data = json.dumps(payload).encode()
        req = urllib.request.Request(url, data=data,
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
        logger.info(f"Notification webhook envoyée : {title}")

    @staticmethod
    def _level_rank(level: EventLevel) -> int:
        return {"info": 0, "warning": 1, "critical": 2}[level.value]
