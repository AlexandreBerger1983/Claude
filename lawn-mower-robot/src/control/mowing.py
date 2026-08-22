"""Algorithme de tonte automatique en bandes parallèles (lawn stripes)."""
import time
import threading
from enum import Enum, auto

from src.utils import logger


class MowingState(Enum):
    IDLE = auto()
    FORWARD = auto()
    TURNING = auto()
    DONE = auto()
    ABORTED = auto()


class MowingController:
    """
    Algorithme simple en boustrophédon (zigzag) :
    avance en ligne droite, détecte un bord (obstacle), tourne de 180°, repart.
    """

    def __init__(self, robot, config: dict):
        self._robot = robot
        self._cfg = config
        self._state = MowingState.IDLE
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._strip_count = 0

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._strip_count = 0
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info("Tonte automatique démarrée")

    def stop(self):
        self._stop_event.set()
        self._robot.blade.stop()
        self._robot.motors.stop()
        self._state = MowingState.ABORTED
        logger.info("Tonte automatique arrêtée")

    def _run(self):
        robot = self._robot
        cfg = self._cfg
        fwd_speed = cfg.get("forward_speed", 60)
        turn_speed = cfg.get("turn_speed", 40)

        robot.blade_start()
        time.sleep(2)  # laisser la lame atteindre sa vitesse

        while not self._stop_event.is_set():
            # --- Avancer jusqu'à l'obstacle ---
            self._state = MowingState.FORWARD
            robot.motors.move(fwd_speed, 0)

            while not self._stop_event.is_set():
                if robot.sensors.obstacle_ahead():
                    break
                # Sécurité lame
                if robot.sensors.blade_should_stop():
                    robot.blade.stop()
                else:
                    if not robot.blade.is_running:
                        robot.blade.start()
                time.sleep(0.05)

            if self._stop_event.is_set():
                break

            # --- Tourner de 180° ---
            self._state = MowingState.TURNING
            robot.motors.stop()
            time.sleep(0.2)

            direction = 1 if self._strip_count % 2 == 0 else -1
            robot.motors.move(0, turn_speed * direction)
            time.sleep(self._estimate_turn_time(180, turn_speed))
            robot.motors.stop()

            # Avancer d'une largeur de bande
            robot.motors.move(fwd_speed, 0)
            time.sleep(self._estimate_strip_advance_time(cfg.get("strip_width", 30)))
            robot.motors.stop()

            # Tourner dans la direction principale
            robot.motors.move(0, -turn_speed * direction)
            time.sleep(self._estimate_turn_time(90, turn_speed))
            robot.motors.stop()

            self._strip_count += 1
            logger.info(f"Bande {self._strip_count} terminée")

        robot.motors.stop()
        robot.blade.stop()
        self._state = MowingState.DONE
        logger.info(f"Tonte terminée - {self._strip_count} bandes")

    @staticmethod
    def _estimate_turn_time(degrees: float, speed_pct: float) -> float:
        """Durée approximative pour tourner de `degrees` à `speed_pct`%."""
        # Calibrer selon la base du robot réel
        full_rotation_time = 2.5  # secondes pour 360° à 100%
        return (degrees / 360) * full_rotation_time * (100 / max(speed_pct, 1))

    @staticmethod
    def _estimate_strip_advance_time(width_cm: float) -> float:
        """Durée pour avancer d'une largeur de bande."""
        # Calibrer selon la vitesse réelle du robot
        speed_cm_per_sec = 20
        return width_cm / speed_cm_per_sec

    @property
    def state(self) -> str:
        return self._state.name

    @property
    def strip_count(self) -> int:
        return self._strip_count
