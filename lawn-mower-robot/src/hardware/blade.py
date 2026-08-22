"""Contrôle de la lame de tonte via un ESC (Electronic Speed Controller)."""
import time

try:
    import RPi.GPIO as GPIO
    _GPIO_AVAILABLE = True
except ImportError:
    _GPIO_AVAILABLE = False

from src.utils import logger


class BladeController:
    """Commande l'ESC de la lame par signal PWM."""

    def __init__(self, config: dict):
        self._pin = config["pin"]
        self._min_pulse = config.get("min_pulse", 1000)
        self._max_pulse = config.get("max_pulse", 2000)
        self._startup_speed = config.get("startup_speed", 60)
        self._full_speed = config.get("full_speed", 85)
        self._running = False
        self._pwm = None

        if _GPIO_AVAILABLE:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self._pin, GPIO.OUT)
            # ESC attend du 50 Hz
            self._pwm = GPIO.PWM(self._pin, 50)
            self._pwm.start(self._speed_to_duty(0))
            logger.info("Contrôleur lame initialisé")
        else:
            logger.warning("Lame : mode simulation")

    def _speed_to_duty(self, speed_pct: float) -> float:
        """Convertit un % (0-100) en duty cycle pour ESC à 50 Hz."""
        pulse_us = self._min_pulse + (self._max_pulse - self._min_pulse) * speed_pct / 100
        return pulse_us / 20000 * 100  # période 50 Hz = 20 ms

    def start(self):
        if self._running:
            return
        logger.info("Démarrage lame...")
        self._set_speed(self._startup_speed)
        time.sleep(1.5)
        self._set_speed(self._full_speed)
        self._running = True
        logger.info(f"Lame en marche à {self._full_speed}%")

    def stop(self):
        if not self._running:
            return
        self._set_speed(0)
        self._running = False
        logger.info("Lame arrêtée")

    def _set_speed(self, speed_pct: float):
        if _GPIO_AVAILABLE and self._pwm:
            self._pwm.ChangeDutyCycle(self._speed_to_duty(speed_pct))
        else:
            logger.debug(f"[SIM] lame speed={speed_pct:.0f}%")

    def cleanup(self):
        self.stop()
        if _GPIO_AVAILABLE and self._pwm:
            self._pwm.stop()

    @property
    def is_running(self) -> bool:
        return self._running
