"""Contrôleur principal du robot - orchestre tous les sous-systèmes."""
import threading
import time
from enum import Enum, auto

from src.hardware import MotorController, BladeController, DualArmController, SensorArray
from src.hardware.head import HeadController
from src.hardware.imu import IMUSensor
from src.hardware.battery import BatteryMonitor
from src.control.teleop import TeleopController
from src.control.safety import SafetyMonitor
from src.control.notifications import Notifier, EventLevel
from src.utils import get_config, logger


class RobotMode(Enum):
    IDLE = auto()
    MANUAL = auto()
    MOWING = auto()
    TRASH = auto()
    TELEOP = auto()
    EMERGENCY = auto()


class Robot:
    def __init__(self):
        cfg = get_config()
        self._mode = RobotMode.IDLE
        self._lock = threading.Lock()

        self.motors = MotorController(cfg["motors"])
        self.blade = BladeController(cfg["blade"])
        self.arms = DualArmController(cfg["arms"])
        self.head = HeadController(cfg["arms"].get("head", {}), self.arms.pca)
        self.teleop = TeleopController(self.arms, self.head, cfg.get("teleop", {}))
        self.sensors = SensorArray(cfg["sensors"], emergency_callback=self.emergency_stop)
        self.imu = IMUSensor(cfg.get("imu", {}))
        self.notifier = Notifier(cfg.get("notifications", {}))
        self.battery = BatteryMonitor(cfg.get("battery", {}))
        # Batterie critique → arrêt d'urgence (le retour base est câblé côté serveur)
        self.battery.set_callbacks(on_critical=self._on_battery_critical)

        # Moniteur de sécurité : coupe la lame si personne/animal/inclinaison/collision
        self.safety = SafetyMonitor(
            cfg.get("safety", {}),
            tilt_fn=self.imu.is_tilted,
            bumper_fn=self.sensors.bumper_pressed,
            on_hazard=self._on_hazard,
            on_clear=self._on_hazard_clear,
        )

        self._watchdog_timeout = cfg["web"].get("watchdog_timeout", 3.0)
        self._last_command_time = time.time()
        self._watchdog_thread = threading.Thread(target=self._watchdog, daemon=True)

        self.sensors.start_polling(interval=0.1)
        self.safety.start()
        self._watchdog_thread.start()
        logger.info("Robot initialisé - mode IDLE")

    # ------------------------------------------------------------------
    # Sécurité (déclenchée par le moniteur)
    # ------------------------------------------------------------------

    def _on_hazard(self, hazards: list):
        """Danger détecté : coupe la lame et stoppe les moteurs immédiatement."""
        self.blade.stop()
        # Pendant une tonte automatique, on stoppe aussi le déplacement
        if self._mode in (RobotMode.MOWING, RobotMode.MANUAL):
            self.motors.stop()
        logger.critical(f"Sécurité : lame coupée ({', '.join(hazards)})")
        self.notifier.notify(
            "Sécurité déclenchée",
            f"Lame coupée automatiquement : {', '.join(hazards)}.",
            level=EventLevel.CRITICAL, key="safety_hazard",
        )

    def _on_hazard_clear(self):
        logger.info("Sécurité : plus de danger (la lame reste coupée jusqu'à relance)")

    def _on_battery_critical(self):
        self.emergency_stop()
        self.notifier.notify(
            "Batterie critique",
            "Niveau critique : arrêt d'urgence du robot.",
            level=EventLevel.CRITICAL, key="battery_critical",
        )

    # ------------------------------------------------------------------
    # Watchdog
    # ------------------------------------------------------------------

    def _watchdog(self):
        """Arrête le robot si aucune commande reçue depuis trop longtemps en mode MANUEL."""
        while True:
            time.sleep(0.5)
            if self._mode == RobotMode.MANUAL:
                elapsed = time.time() - self._last_command_time
                if elapsed > self._watchdog_timeout:
                    logger.warning(f"Watchdog : pas de commande depuis {elapsed:.1f}s - arrêt")
                    self.stop()

    def _touch_watchdog(self):
        self._last_command_time = time.time()

    # ------------------------------------------------------------------
    # Contrôle manuel
    # ------------------------------------------------------------------

    def manual_move(self, linear: float, angular: float):
        with self._lock:
            if self._mode == RobotMode.EMERGENCY:
                return
            self._mode = RobotMode.MANUAL
            self._touch_watchdog()

            if self.sensors.obstacle_ahead() and linear > 0:
                logger.debug("Obstacle devant - mouvement avant bloqué")
                self.motors.stop()
                return

            self.motors.move(linear, angular)

    def stop(self):
        with self._lock:
            self.motors.stop()
            self.blade.stop()
            if self._mode not in (RobotMode.EMERGENCY,):
                self._mode = RobotMode.IDLE
            logger.info("Robot arrêté")

    # ------------------------------------------------------------------
    # Bras
    # ------------------------------------------------------------------

    def arm_command(self, command: str):
        with self._lock:
            if self._mode == RobotMode.EMERGENCY:
                return
            logger.info(f"Commande bras : {command}")
            if command == "home":
                self.arms.both_home()
            elif command == "pickup":
                self._mode = RobotMode.TRASH
                self.arms.pickup_trash_can()
                self._mode = RobotMode.IDLE
            elif command == "release":
                self._mode = RobotMode.TRASH
                self.arms.release_trash_can()
                self._mode = RobotMode.IDLE
            elif command == "left_reach":
                self.arms.left.reach()
            elif command == "right_reach":
                self.arms.right.reach()

    # ------------------------------------------------------------------
    # Téléopération (imitation par webcam)
    # ------------------------------------------------------------------

    def teleop_start(self):
        with self._lock:
            if self._mode == RobotMode.EMERGENCY:
                return
            self._mode = RobotMode.TELEOP
            self.teleop.start()

    def teleop_stop(self):
        with self._lock:
            self.teleop.stop()
            if self._mode == RobotMode.TELEOP:
                self._mode = RobotMode.IDLE
            self.arms.both_home()
            self.head.home()

    def teleop_pose(self, landmarks: dict):
        # Pas de verrou : appelé à haute fréquence, la téléop gère son propre état
        if self._mode == RobotMode.TELEOP:
            self.teleop.update(landmarks)

    def head_move(self, pan_norm: float, tilt_norm: float):
        with self._lock:
            if self._mode == RobotMode.EMERGENCY:
                return
            self.head.set_normalized(pan_norm, tilt_norm)

    # ------------------------------------------------------------------
    # Lame
    # ------------------------------------------------------------------

    def blade_start(self):
        with self._lock:
            if self._mode == RobotMode.EMERGENCY:
                return
            if self.safety.hazard_active:
                logger.warning(f"Danger actif ({self.safety.status['hazards']}) - démarrage lame refusé")
                return
            if not self.sensors.blade_should_stop():
                self.blade.start()
            else:
                logger.warning("Obstacle trop proche - démarrage lame refusé")

    def blade_stop(self):
        self.blade.stop()

    # ------------------------------------------------------------------
    # Urgence
    # ------------------------------------------------------------------

    def emergency_stop(self):
        with self._lock:
            self._mode = RobotMode.EMERGENCY
            self.motors.stop()
            self.blade.stop()
            logger.critical("ARRÊT D'URGENCE ACTIVÉ")

    def reset_emergency(self):
        with self._lock:
            if self._mode == RobotMode.EMERGENCY:
                self._mode = RobotMode.IDLE
                logger.info("Arrêt d'urgence réinitialisé")

    # ------------------------------------------------------------------
    # État
    # ------------------------------------------------------------------

    @property
    def status(self) -> dict:
        distances = self.sensors.get_distances()
        return {
            "mode": self._mode.name,
            "motor_speeds": self.motors.speeds,
            "blade_running": self.blade.is_running,
            "arms": self.arms.status,
            "head": self.head.angles,
            "teleop_active": self.teleop.active,
            "distances": distances,
            "obstacle_ahead": self.sensors.obstacle_ahead(),
            "safety": self.safety.status,
            "imu": self.imu.angles,
            "battery": self.battery.status,
        }

    # ------------------------------------------------------------------
    # Nettoyage
    # ------------------------------------------------------------------

    def cleanup(self):
        self.stop()
        self.teleop.stop()
        self.safety.stop()
        self.battery.stop()
        self.imu.cleanup()
        self.sensors.cleanup()
        self.head.cleanup()
        self.arms.cleanup()
        self.motors.cleanup()
        self.blade.cleanup()
        logger.info("Robot arrêté proprement")
