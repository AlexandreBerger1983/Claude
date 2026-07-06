"""Contrôle de la tête du robot (nuque pan/tilt) - style Johnny 5.
Deux servos sur le même PCA9685 que les bras."""

try:
    from adafruit_motor import servo as adafruit_servo
    _PCA_AVAILABLE = True
except ImportError:
    _PCA_AVAILABLE = False

from src.utils import logger

PAN, TILT = 0, 1


class HeadController:
    """Tête à 2 degrés de liberté : rotation horizontale (pan) et verticale (tilt)."""

    def __init__(self, config: dict, pca=None):
        self._cfg = config or {}
        self._pca = pca
        self._servos: list = []

        self._pan_range = self._cfg.get("pan_range", [40, 140])
        self._tilt_range = self._cfg.get("tilt_range", [65, 115])
        self._home = self._cfg.get("home", [90, 90])
        self._current = list(self._home)

        if _PCA_AVAILABLE and pca and self._cfg:
            for joint in ("pan", "tilt"):
                ch = self._cfg.get(joint)
                if ch is not None:
                    s = adafruit_servo.Servo(pca.channels[ch], min_pulse=500, max_pulse=2500)
                    self._servos.append(s)
            self.home()
            logger.info("Tête initialisée")
        else:
            logger.warning("Tête : mode simulation")

    def home(self):
        self.set(self._home[PAN], self._home[TILT])

    def set(self, pan: float, tilt: float):
        """Positionne la tête (angles servo en degrés), avec clamping de sécurité."""
        pan = max(self._pan_range[0], min(self._pan_range[1], pan))
        tilt = max(self._tilt_range[0], min(self._tilt_range[1], tilt))
        if self._servos:
            self._servos[PAN].angle = pan
            if len(self._servos) > 1:
                self._servos[TILT].angle = tilt
        self._current = [pan, tilt]

    def set_normalized(self, pan_norm: float, tilt_norm: float):
        """Positionne la tête à partir de valeurs normalisées -1..+1
        (utile pour la téléopération). -1 = gauche/bas, +1 = droite/haut."""
        pan = self._map(pan_norm, self._pan_range)
        # tilt inversé : lever la tête (norm +1) = angle plus petit selon montage
        tilt = self._map(tilt_norm, self._tilt_range)
        self.set(pan, tilt)

    @staticmethod
    def _map(norm: float, rng: list) -> float:
        norm = max(-1.0, min(1.0, norm))
        mid = (rng[0] + rng[1]) / 2
        half = (rng[1] - rng[0]) / 2
        return mid + norm * half

    @property
    def angles(self) -> list[float]:
        return list(self._current)

    def cleanup(self):
        self.home()
