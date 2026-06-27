"""Tests unitaires pour le contrôleur de moteurs (mode simulation)."""
import sys
import types

# Simuler RPi.GPIO pour les tests hors Raspberry Pi
gpio_mock = types.ModuleType("RPi")
gpio_mock.GPIO = types.ModuleType("RPi.GPIO")
gpio_mock.GPIO.BCM = 11
gpio_mock.GPIO.OUT = 0
gpio_mock.GPIO.IN = 1
gpio_mock.GPIO.HIGH = 1
gpio_mock.GPIO.LOW = 0
gpio_mock.GPIO.PUD_UP = 22
gpio_mock.GPIO.FALLING = 1

gpio_mock.GPIO.setmode = lambda *a, **kw: None
gpio_mock.GPIO.setwarnings = lambda *a, **kw: None
gpio_mock.GPIO.setup = lambda *a, **kw: None
gpio_mock.GPIO.output = lambda *a, **kw: None
gpio_mock.GPIO.input = lambda pin: 0
gpio_mock.GPIO.add_event_detect = lambda *a, **kw: None

class FakePWM:
    def start(self, v): pass
    def ChangeDutyCycle(self, v): pass
    def stop(self): pass

gpio_mock.GPIO.PWM = lambda pin, freq: FakePWM()
sys.modules["RPi"] = gpio_mock
sys.modules["RPi.GPIO"] = gpio_mock.GPIO

from src.hardware.motors import MotorController

CFG = {
    "left":  {"in1": 17, "in2": 27, "pwm": 18},
    "right": {"in1": 22, "in2": 23, "pwm": 24},
    "max_speed": 80,
    "ramp_time": 0.0,
}


def test_init():
    mc = MotorController(CFG)
    assert mc.speeds == {"left": 0, "right": 0}


def test_move_forward():
    mc = MotorController(CFG)
    mc.move(50, 0)
    s = mc.speeds
    assert s["left"] == s["right"]
    assert s["left"] > 0


def test_move_turn():
    mc = MotorController(CFG)
    mc.move(0, 50)
    s = mc.speeds
    assert s["left"] != s["right"]


def test_stop():
    mc = MotorController(CFG)
    mc.move(80, 0)
    mc.stop()
    assert mc.speeds == {"left": 0, "right": 0}


def test_speed_clamped():
    mc = MotorController(CFG)
    mc.move(200, 0)
    s = mc.speeds
    assert abs(s["left"]) <= 80
    assert abs(s["right"]) <= 80
