"""
Surveillance de la batterie via capteur INA219 (tension/courant, I2C).

Estime l'état de charge à partir de la tension aux bornes d'un pack LiPo,
et fournit des seuils pour déclencher le retour à la base ou l'arrêt.
"""
import threading
import time

try:
    from ina219 import INA219
    _INA_AVAILABLE = True
except ImportError:
    _INA_AVAILABLE = False

from src.utils import logger


def voltage_to_percent(voltage: float, cells: int,
                        v_full: float = 4.2, v_empty: float = 3.3) -> float:
    """Estime le % de charge d'un pack LiPo à `cells` éléments (approximation linéaire).
    Retourne 0-100."""
    if cells <= 0:
        return 0.0
    per_cell = voltage / cells
    pct = (per_cell - v_empty) / (v_full - v_empty) * 100
    return max(0.0, min(100.0, pct))


class BatteryMonitor:
    def __init__(self, config: dict):
        cfg = config or {}
        self._enabled = cfg.get("enabled", False)
        self._cells = cfg.get("cells", 3)               # pack 3S par défaut
        self._shunt_ohms = cfg.get("shunt_ohms", 0.1)
        self._addr = cfg.get("i2c_address", 0x40)
        self._return_pct = cfg.get("return_threshold", 25)   # % → retour base
        self._shutdown_pct = cfg.get("shutdown_threshold", 12)  # % → arrêt
        self._interval = cfg.get("poll_interval", 30)

        self._voltage = 0.0
        self._current = 0.0
        self._percent = 100.0
        self._ina = None
        self._running = False
        self._thread: threading.Thread | None = None
        self._on_low = None
        self._on_critical = None
        self._low_fired = False
        self._critical_fired = False

        if _INA_AVAILABLE and self._enabled:
            try:
                self._ina = INA219(self._shunt_ohms, address=self._addr)
                self._ina.configure()
                logger.info("Capteur batterie INA219 initialisé")
            except Exception as e:
                logger.error(f"Batterie : échec init INA219 ({e})")
                self._ina = None
        else:
            logger.warning("Batterie : mode simulation")

    def set_callbacks(self, on_low=None, on_critical=None):
        """`on_low` : retour à la base ; `on_critical` : arrêt d'urgence."""
        self._on_low = on_low
        self._on_critical = on_critical

    def start(self):
        if not self._enabled:
            logger.info("Surveillance batterie désactivée")
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self):
        while self._running:
            self._read()
            self._check_thresholds()
            time.sleep(self._interval)

    def _read(self):
        if self._ina:
            try:
                self._voltage = self._ina.voltage()
                self._current = self._ina.current() / 1000.0  # mA → A
            except Exception as e:
                logger.debug(f"Batterie lecture échouée : {e}")
                return
        else:
            self._voltage = self._cells * 3.9  # sim : ~mi-charge
        self._percent = voltage_to_percent(self._voltage, self._cells)

    def _check_thresholds(self):
        if self._percent <= self._shutdown_pct and not self._critical_fired:
            self._critical_fired = True
            logger.critical(f"Batterie critique ({self._percent:.0f}%) - arrêt")
            if self._on_critical:
                self._on_critical()
        elif self._percent <= self._return_pct and not self._low_fired:
            self._low_fired = True
            logger.warning(f"Batterie faible ({self._percent:.0f}%) - retour à la base")
            if self._on_low:
                self._on_low()
        elif self._percent > self._return_pct + 10:
            # Hystérésis : réarme les alertes une fois bien rechargé
            self._low_fired = False
            self._critical_fired = False

    @property
    def status(self) -> dict:
        return {
            "enabled": self._enabled,
            "voltage": round(self._voltage, 2),
            "current": round(self._current, 2),
            "percent": round(self._percent),
            "charging": self._current < -0.05,   # courant négatif = charge
        }

    def stop(self):
        self._running = False
