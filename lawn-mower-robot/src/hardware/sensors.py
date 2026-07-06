"""Capteurs ultrasons HC-SR04 et bouton d'urgence."""
import time
import threading
from typing import Callable

try:
    import RPi.GPIO as GPIO
    _GPIO_AVAILABLE = True
except ImportError:
    _GPIO_AVAILABLE = False

from src.utils import logger

DIRECTIONS = ("front", "rear", "left", "right")


class UltrasonicSensor:
    """Capteur HC-SR04 individuel."""

    def __init__(self, trigger: int, echo: int):
        self._trigger = trigger
        self._echo = echo
        if _GPIO_AVAILABLE:
            GPIO.setup(trigger, GPIO.OUT)
            GPIO.setup(echo, GPIO.IN)
            GPIO.output(trigger, False)

    def measure(self) -> float:
        """Retourne la distance en cm, ou float('inf') en cas d'erreur."""
        if not _GPIO_AVAILABLE:
            return 999.0

        GPIO.output(self._trigger, True)
        time.sleep(0.00001)
        GPIO.output(self._trigger, False)

        timeout = time.time() + 0.04
        start = time.time()
        while GPIO.input(self._echo) == 0:
            start = time.time()
            if start > timeout:
                return float("inf")

        stop = time.time()
        timeout = time.time() + 0.04
        while GPIO.input(self._echo) == 1:
            stop = time.time()
            if stop > timeout:
                return float("inf")

        elapsed = stop - start
        distance = elapsed * 34300 / 2
        return round(distance, 1)


class SensorArray:
    """Ensemble de 4 capteurs ultrasons + bouton d'arrêt d'urgence."""

    def __init__(self, config: dict, emergency_callback: Callable | None = None):
        self._cfg = config
        self._emergency_callback = emergency_callback
        self._sensors: dict[str, UltrasonicSensor] = {}
        self._distances: dict[str, float] = {d: 999.0 for d in DIRECTIONS}
        self._running = False
        self._thread: threading.Thread | None = None

        self._obstacle_dist = config.get("obstacle_distance", 40)
        self._blade_stop_dist = config.get("blade_stop_distance", 30)
        self._emergency_pin = config.get("emergency_button")
        self._bumper_pins = config.get("bumper", [])   # micro-switches pare-chocs

        if _GPIO_AVAILABLE:
            GPIO.setmode(GPIO.BCM)
            for direction in DIRECTIONS:
                cfg = config["ultrasonic"].get(direction, {})
                if cfg:
                    self._sensors[direction] = UltrasonicSensor(cfg["trigger"], cfg["echo"])

            if self._emergency_pin:
                GPIO.setup(self._emergency_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
                GPIO.add_event_detect(
                    self._emergency_pin,
                    GPIO.FALLING,
                    callback=self._on_emergency,
                    bouncetime=300,
                )

            for pin in self._bumper_pins:
                GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        logger.info("Capteurs initialisés")

    def bumper_pressed(self) -> bool:
        """Vrai si un micro-switch de pare-chocs est enfoncé (contact = 0)."""
        if not _GPIO_AVAILABLE or not self._bumper_pins:
            return False
        return any(GPIO.input(pin) == 0 for pin in self._bumper_pins)

    def _on_emergency(self, channel):
        logger.warning("BOUTON D'URGENCE PRESSÉ")
        if self._emergency_callback:
            self._emergency_callback()

    def start_polling(self, interval: float = 0.1):
        self._running = True
        self._thread = threading.Thread(target=self._poll_loop, args=(interval,), daemon=True)
        self._thread.start()

    def _poll_loop(self, interval: float):
        while self._running:
            for direction, sensor in self._sensors.items():
                self._distances[direction] = sensor.measure()
            time.sleep(interval)

    def stop_polling(self):
        self._running = False

    def get_distances(self) -> dict[str, float]:
        return dict(self._distances)

    def obstacle_ahead(self) -> bool:
        return self._distances["front"] < self._obstacle_dist

    def obstacle_anywhere(self) -> bool:
        return any(d < self._obstacle_dist for d in self._distances.values())

    def blade_should_stop(self) -> bool:
        return any(d < self._blade_stop_dist for d in self._distances.values())

    def cleanup(self):
        self.stop_polling()
