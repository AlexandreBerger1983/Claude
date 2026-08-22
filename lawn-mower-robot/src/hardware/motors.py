"""Contrôle des moteurs de déplacement différentiel."""
import time

try:
    import RPi.GPIO as GPIO
    _GPIO_AVAILABLE = True
except ImportError:
    _GPIO_AVAILABLE = False

from src.utils import logger


class MotorController:
    """Contrôle deux moteurs DC en pont H pour le déplacement différentiel."""

    def __init__(self, config: dict):
        self._cfg = config
        self._left_speed = 0
        self._right_speed = 0
        self._pwm_left = None
        self._pwm_right = None

        if _GPIO_AVAILABLE:
            self._setup_gpio()
        else:
            logger.warning("RPi.GPIO non disponible - mode simulation")

    def _setup_gpio(self):
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        lc = self._cfg["left"]
        rc = self._cfg["right"]
        for pin in [lc["in1"], lc["in2"], lc["pwm"], rc["in1"], rc["in2"], rc["pwm"]]:
            GPIO.setup(pin, GPIO.OUT)

        self._pwm_left = GPIO.PWM(lc["pwm"], 1000)
        self._pwm_right = GPIO.PWM(rc["pwm"], 1000)
        self._pwm_left.start(0)
        self._pwm_right.start(0)
        logger.info("Moteurs initialisés")

    def _set_motor(self, side: str, speed: float) -> float:
        """Commande un moteur. speed : -100 à +100 (négatif = arrière).
        Retourne la vitesse effective après clamping."""
        cfg = self._cfg[side]
        in1, in2 = cfg["in1"], cfg["in2"]
        pwm = self._pwm_left if side == "left" else self._pwm_right
        max_spd = self._cfg.get("max_speed", 100)
        speed = max(-max_spd, min(max_spd, speed))

        if _GPIO_AVAILABLE and pwm:
            if speed > 0:
                GPIO.output(in1, GPIO.HIGH)
                GPIO.output(in2, GPIO.LOW)
            elif speed < 0:
                GPIO.output(in1, GPIO.LOW)
                GPIO.output(in2, GPIO.HIGH)
            else:
                GPIO.output(in1, GPIO.LOW)
                GPIO.output(in2, GPIO.LOW)
            pwm.ChangeDutyCycle(abs(speed))
        else:
            logger.debug(f"[SIM] moteur {side} speed={speed:.0f}%")
        return speed

    def move(self, linear: float, angular: float):
        """
        Contrôle en mode différentiel.
        linear  : -100 (arrière) à +100 (avant)
        angular : -100 (gauche)  à +100 (droite)
        """
        left = linear - angular
        right = linear + angular
        scale = max(abs(left), abs(right), 100) / 100
        self._left_speed = self._set_motor("left", left / scale)
        self._right_speed = self._set_motor("right", right / scale)

    def stop(self):
        self._left_speed = self._set_motor("left", 0)
        self._right_speed = self._set_motor("right", 0)

    def cleanup(self):
        self.stop()
        if _GPIO_AVAILABLE:
            if self._pwm_left:
                self._pwm_left.stop()
            if self._pwm_right:
                self._pwm_right.stop()

    @property
    def speeds(self) -> dict:
        return {"left": self._left_speed, "right": self._right_speed}
