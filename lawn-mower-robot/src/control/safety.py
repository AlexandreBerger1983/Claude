"""
Moniteur de sécurité pour opération sans surveillance.

Surveille en continu plusieurs sources de danger et déclenche la coupure
immédiate de la lame (et l'arrêt des moteurs) dès qu'un danger apparaît :
  - personne ou animal détecté par la caméra (proximité de la lame)
  - robot incliné / soulevé / renversé (IMU)
  - pare-chocs enfoncé (collision)

La logique de décision est isolée dans `evaluate_hazards` pour être testable.
"""
import time
import threading
from typing import Callable

from src.utils import logger


def evaluate_hazards(person_detected: bool, tilted: bool, bumper_hit: bool) -> list[str]:
    """Retourne la liste des dangers actifs (vide = sûr)."""
    hazards = []
    if person_detected:
        hazards.append("person")
    if tilted:
        hazards.append("tilt")
    if bumper_hit:
        hazards.append("bumper")
    return hazards


class SafetyMonitor:
    """
    Boucle de surveillance. Appelle `on_hazard(hazards)` à l'apparition d'un
    danger et `on_clear()` quand tout redevient sûr.

    Les sources matérielles sont injectées via des callables pour garder ce
    module indépendant du matériel (et testable).
    """

    def __init__(
        self,
        config: dict,
        tilt_fn: Callable[[], bool],
        bumper_fn: Callable[[], bool],
        on_hazard: Callable[[list], None],
        on_clear: Callable[[], None] | None = None,
    ):
        cfg = config or {}
        self._enabled = cfg.get("enabled", True)
        self._interval = cfg.get("poll_interval", 0.2)
        self._person_hold = cfg.get("person_hold_time", 3.0)

        self._tilt_fn = tilt_fn
        self._bumper_fn = bumper_fn
        self._on_hazard = on_hazard
        self._on_clear = on_clear

        self._person_last_seen = 0.0
        self._active_hazards: list[str] = []
        self._running = False
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Détection de personne (alimentée par le détecteur caméra)
    # ------------------------------------------------------------------

    def set_person_detected(self, detected: bool):
        """Appelé par le détecteur vidéo. La détection est maintenue
        `person_hold_time` secondes après la dernière observation."""
        if detected:
            self._person_last_seen = time.time()

    def _person_present(self, now: float) -> bool:
        return (now - self._person_last_seen) < self._person_hold

    # ------------------------------------------------------------------
    # Boucle de surveillance
    # ------------------------------------------------------------------

    def start(self):
        if not self._enabled:
            logger.warning("Moniteur de sécurité DÉSACTIVÉ (safety.enabled: false)")
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info("Moniteur de sécurité actif")

    def _loop(self):
        while self._running:
            self._check()
            time.sleep(self._interval)

    def _check(self):
        now = time.time()
        hazards = evaluate_hazards(
            person_detected=self._person_present(now),
            tilted=self._safe_call(self._tilt_fn),
            bumper_hit=self._safe_call(self._bumper_fn),
        )
        with self._lock:
            was_safe = not self._active_hazards
            self._active_hazards = hazards

        if hazards and was_safe:
            logger.critical(f"DANGER détecté : {', '.join(hazards)} - coupure lame")
            self._on_hazard(hazards)
        elif not hazards and not was_safe:
            logger.info("Zone redevenue sûre")
            if self._on_clear:
                self._on_clear()

    @staticmethod
    def _safe_call(fn) -> bool:
        try:
            return bool(fn())
        except Exception as e:
            logger.debug(f"Source de sécurité en erreur : {e}")
            return False

    # ------------------------------------------------------------------

    @property
    def hazard_active(self) -> bool:
        with self._lock:
            return bool(self._active_hazards)

    @property
    def status(self) -> dict:
        with self._lock:
            return {
                "enabled": self._enabled,
                "hazards": list(self._active_hazards),
                "safe": not self._active_hazards,
            }

    def stop(self):
        self._running = False
