"""Contrôle des deux bras robotiques via servos PCA9685 (I2C)."""
import time
from typing import Literal

try:
    from adafruit_pca9685 import PCA9685
    from adafruit_motor import servo as adafruit_servo
    import board
    import busio
    _PCA_AVAILABLE = True
except ImportError:
    _PCA_AVAILABLE = False

from src.utils import logger


Side = Literal["left", "right"]

# Indices dans la liste [shoulder, elbow, wrist, gripper]
SHOULDER, ELBOW, WRIST, GRIPPER = 0, 1, 2, 3


class ArmController:
    """Contrôle un bras robotique à 4 degrés de liberté."""

    def __init__(self, side: Side, config: dict, pca=None):
        self._side = side
        self._cfg = config
        self._pca = pca
        self._servos: list = []
        self._current_angles: list[float] = list(config["home"])

        if _PCA_AVAILABLE and pca:
            channels = [config[joint] for joint in ("shoulder", "elbow", "wrist", "gripper")]
            for ch in channels:
                s = adafruit_servo.Servo(pca.channels[ch], min_pulse=500, max_pulse=2500)
                self._servos.append(s)
            self._go_to(self._cfg["home"])
            logger.info(f"Bras {side} initialisé")
        else:
            logger.warning(f"Bras {side} : mode simulation")

    def _go_to(self, angles: list[float], speed_delay: float = 0.02):
        """Déplace tous les servos vers les angles cibles de façon fluide."""
        steps = 20
        starts = list(self._current_angles)
        for i in range(1, steps + 1):
            for j, (s, e) in enumerate(zip(starts, angles)):
                angle = s + (e - s) * i / steps
                if self._servos:
                    self._servos[j].angle = angle
                self._current_angles[j] = angle
            time.sleep(speed_delay)

    def home(self):
        logger.debug(f"Bras {self._side} -> position repos")
        self._go_to(self._cfg["home"])

    def reach(self):
        logger.debug(f"Bras {self._side} -> position saisie")
        self._go_to(self._cfg["reach"])

    def grasp(self):
        logger.debug(f"Bras {self._side} -> fermeture pince")
        self._go_to(self._cfg["grasp"])

    def lift(self):
        logger.debug(f"Bras {self._side} -> position levée")
        self._go_to(self._cfg["lift"])

    def release(self):
        angles = list(self._current_angles)
        angles[GRIPPER] = self._cfg["home"][GRIPPER]
        self._go_to(angles)
        logger.debug(f"Bras {self._side} -> pince ouverte")

    def set_angles(self, angles: list[float]):
        self._go_to(angles)

    @property
    def angles(self) -> list[float]:
        return list(self._current_angles)


class DualArmController:
    """Gère les deux bras et les séquences coordonnées."""

    def __init__(self, config: dict):
        self._cfg = config
        self._pca = None

        if _PCA_AVAILABLE:
            i2c = busio.I2C(board.SCL, board.SDA)
            self._pca = PCA9685(i2c, address=config.get("i2c_address", 0x40))
            self._pca.frequency = config.get("pwm_frequency", 50)

        self.left = ArmController("left", config["left"], self._pca)
        self.right = ArmController("right", config["right"], self._pca)

    def both_home(self):
        self.left.home()
        self.right.home()

    def pickup_trash_can(self):
        """Séquence coordonnée pour saisir une poubelle."""
        logger.info("Séquence saisie poubelle - départ")
        self.left.reach()
        self.right.reach()
        time.sleep(0.3)
        self.left.grasp()
        self.right.grasp()
        time.sleep(0.5)
        self.left.lift()
        self.right.lift()
        logger.info("Séquence saisie poubelle - terminée")

    def release_trash_can(self):
        """Séquence coordonnée pour poser la poubelle."""
        logger.info("Séquence dépose poubelle - départ")
        self.left.reach()
        self.right.reach()
        time.sleep(0.3)
        self.left.release()
        self.right.release()
        time.sleep(0.3)
        self.both_home()
        logger.info("Séquence dépose poubelle - terminée")

    def cleanup(self):
        self.both_home()
        if _PCA_AVAILABLE and self._pca:
            self._pca.deinit()

    @property
    def status(self) -> dict:
        return {
            "left": self.left.angles,
            "right": self.right.angles,
        }
