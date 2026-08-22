"""
Planificateur de tâches récurrentes pour opération autonome à distance.

Déclenche automatiquement :
  - la tonte (jours/heure configurés)
  - la sortie des poubelles (jour de collecte, à une heure) et leur rentrée

La logique « une tâche est-elle due maintenant ? » est isolée dans
`task_due` pour être testable sans attendre le temps réel.
"""
import threading
import time
from datetime import datetime, time as dtime

from src.utils import logger

# Jours de la semaine (0 = lundi, comme datetime.weekday())
WEEKDAYS = {
    "lun": 0, "mar": 1, "mer": 2, "jeu": 3, "ven": 4, "sam": 5, "dim": 6,
    "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
}


def parse_hhmm(s: str) -> dtime:
    h, m = s.split(":")
    return dtime(int(h), int(m))


def task_due(now: datetime, days: list[str], at: str,
             last_run: datetime | None, rain: bool = False,
             skip_if_rain: bool = False) -> bool:
    """
    Retourne True si la tâche doit se déclencher à l'instant `now`.
    - `days`  : liste de jours ("lun", "mar"…)
    - `at`    : heure "HH:MM"
    - `last_run` : dernier déclenchement (évite les doublons dans la journée)
    - `rain` / `skip_if_rain` : reporte la tâche s'il pleut
    """
    target_days = {WEEKDAYS[d.lower()[:3]] for d in days if d.lower()[:3] in WEEKDAYS}
    if now.weekday() not in target_days:
        return False

    target = parse_hhmm(at)
    # Fenêtre de déclenchement : à l'heure prévue ou juste après
    if (now.hour, now.minute) < (target.hour, target.minute):
        return False

    # Déjà exécutée aujourd'hui ?
    if last_run and last_run.date() == now.date():
        return False

    if skip_if_rain and rain:
        return False

    return True


class Scheduler:
    def __init__(self, config: dict, actions: dict, rain_fn=None):
        """
        `actions` : dict {nom_tâche: callable} déclenché quand la tâche est due.
        `rain_fn` : callable optionnel retournant True s'il pleut.
        """
        cfg = config or {}
        self._enabled = cfg.get("enabled", False)
        self._check_interval = cfg.get("check_interval", 60)
        self._tasks = cfg.get("tasks", {})
        self._actions = actions
        self._rain_fn = rain_fn
        self._last_run: dict[str, datetime] = {}
        self._running = False
        self._thread: threading.Thread | None = None

    def start(self):
        if not self._enabled:
            logger.info("Planificateur désactivé (scheduler.enabled: false)")
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        active = [n for n, t in self._tasks.items() if t.get("enabled", True)]
        logger.info(f"Planificateur actif - tâches : {', '.join(active) or 'aucune'}")

    def _loop(self):
        while self._running:
            self._check_all(datetime.now())
            time.sleep(self._check_interval)

    def _check_all(self, now: datetime):
        rain = bool(self._rain_fn()) if self._rain_fn else False
        for name, task in self._tasks.items():
            if not task.get("enabled", True):
                continue
            if name not in self._actions:
                continue
            due = task_due(
                now,
                days=task.get("days", []),
                at=task.get("at", "00:00"),
                last_run=self._last_run.get(name),
                rain=rain,
                skip_if_rain=task.get("skip_if_rain", False),
            )
            if due:
                self._last_run[name] = now
                logger.info(f"Planificateur : déclenchement de '{name}'")
                try:
                    self._actions[name]()
                except Exception as e:
                    logger.error(f"Tâche planifiée '{name}' en erreur : {e}")

    @property
    def status(self) -> dict:
        return {
            "enabled": self._enabled,
            "tasks": {
                n: {
                    "enabled": t.get("enabled", True),
                    "days": t.get("days", []),
                    "at": t.get("at"),
                    "last_run": self._last_run[n].isoformat() if n in self._last_run else None,
                }
                for n, t in self._tasks.items()
            },
        }

    def stop(self):
        self._running = False
