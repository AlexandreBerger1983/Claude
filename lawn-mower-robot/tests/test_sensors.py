"""Tests unitaires pour SensorArray en mode simulation."""
import sys
import types

# Mock RPi.GPIO
gpio_mock = types.ModuleType("RPi")
gpio_mock.GPIO = types.ModuleType("RPi.GPIO")
gpio_mock.GPIO.BCM = 11
gpio_mock.GPIO.OUT = 0
gpio_mock.GPIO.IN = 1
gpio_mock.GPIO.PUD_UP = 22
gpio_mock.GPIO.FALLING = 1
gpio_mock.GPIO.setmode = lambda *a, **kw: None
gpio_mock.GPIO.setup = lambda *a, **kw: None
gpio_mock.GPIO.output = lambda *a, **kw: None
gpio_mock.GPIO.input = lambda pin: 0
gpio_mock.GPIO.add_event_detect = lambda *a, **kw: None
sys.modules["RPi"] = gpio_mock
sys.modules["RPi.GPIO"] = gpio_mock.GPIO

from src.hardware.sensors import SensorArray

CFG = {
    "ultrasonic": {
        "front": {"trigger": 5, "echo": 6},
        "rear":  {"trigger": 13, "echo": 19},
        "left":  {"trigger": 26, "echo": 20},
        "right": {"trigger": 21, "echo": 16},
    },
    "obstacle_distance": 40,
    "blade_stop_distance": 30,
    "emergency_button": 4,
}


def test_init():
    sa = SensorArray(CFG)
    d = sa.get_distances()
    assert set(d.keys()) == {"front", "rear", "left", "right"}


def test_no_obstacle_by_default():
    sa = SensorArray(CFG)
    assert not sa.obstacle_ahead()
    assert not sa.blade_should_stop()


def test_obstacle_detection():
    sa = SensorArray(CFG)
    sa._distances["front"] = 20
    assert sa.obstacle_ahead()
    assert sa.blade_should_stop()


def test_obstacle_not_blocking_rear():
    sa = SensorArray(CFG)
    sa._distances["rear"] = 20
    assert not sa.obstacle_ahead()
    assert sa.obstacle_anywhere()
