"""Tests de la logique de téléopération (mapping pose → angles servos)."""
import math

from src.control.teleop import (
    angle_between,
    shoulder_elevation,
    elbow_flexion,
    head_pan,
    head_tilt,
    compute_arm_angles,
    compute_head_angles,
    TeleopController,
)


# --- Géométrie de base ---

def test_angle_between_perpendicular():
    assert abs(angle_between((1, 0), (0, 1)) - 90) < 0.01

def test_angle_between_opposite():
    assert abs(angle_between((1, 0), (-1, 0)) - 180) < 0.01

def test_angle_between_zero_vector():
    assert angle_between((0, 0), (1, 0)) == 0.0


# --- Épaule ---
# Repère image : y vers le bas.

def test_shoulder_arm_down():
    # Épaule en haut, coude et hanche en dessous → bras le long du corps ≈ 0°
    shoulder = (0.5, 0.3)
    elbow    = (0.5, 0.5)
    hip      = (0.5, 0.8)
    assert shoulder_elevation(shoulder, elbow, hip) < 15

def test_shoulder_arm_horizontal():
    # Bras tendu à l'horizontale : coude à droite, hanche en bas → ≈ 90°
    shoulder = (0.5, 0.3)
    elbow    = (0.8, 0.3)
    hip      = (0.5, 0.8)
    assert abs(shoulder_elevation(shoulder, elbow, hip) - 90) < 15

def test_shoulder_arm_up():
    # Bras levé : coude au-dessus de l'épaule, hanche en bas → ≈ 180°
    shoulder = (0.5, 0.5)
    elbow    = (0.5, 0.2)
    hip      = (0.5, 0.9)
    assert shoulder_elevation(shoulder, elbow, hip) > 165


# --- Coude ---

def test_elbow_straight():
    # Épaule, coude, poignet alignés → bras tendu ≈ 180°
    shoulder = (0.5, 0.2)
    elbow    = (0.5, 0.5)
    wrist    = (0.5, 0.8)
    assert elbow_flexion(shoulder, elbow, wrist) > 165

def test_elbow_bent_90():
    # Avant-bras à angle droit
    shoulder = (0.5, 0.2)
    elbow    = (0.5, 0.5)
    wrist    = (0.8, 0.5)
    assert abs(elbow_flexion(shoulder, elbow, wrist) - 90) < 15


# --- Tête ---

def test_head_pan_center():
    # Nez centré entre les oreilles → pan ≈ 0
    assert abs(head_pan((0.5, 0.4), (0.4, 0.4), (0.6, 0.4))) < 0.2

def test_head_pan_right():
    # Nez décalé vers la droite → pan positif
    assert head_pan((0.58, 0.4), (0.4, 0.4), (0.6, 0.4)) > 0.2

def test_head_tilt_up():
    # Nez au-dessus de la ligne des oreilles (y plus petit) → tilt positif
    assert head_tilt((0.5, 0.3), (0.4, 0.4), (0.6, 0.4)) > 0.2


# --- compute_* avec landmarks partiels ---

def test_compute_arm_missing_returns_none():
    assert compute_arm_angles({"left_shoulder": (0, 0)}, "left") is None

def test_compute_head_missing_returns_none():
    assert compute_head_angles({"nose": (0, 0)}) is None

def test_compute_arm_complete():
    lms = {
        "left_shoulder": (0.5, 0.3),
        "left_elbow": (0.8, 0.3),
        "left_wrist": (0.9, 0.3),
        "left_hip": (0.5, 0.8),
    }
    result = compute_arm_angles(lms, "left")
    assert result is not None
    assert len(result) == 2


# --- Contrôleur : lissage et sécurité ---

class _FakeArm:
    def __init__(self):
        self.angles = [90, 45, 90, 0]
        self.last = None
    def set_raw(self, angles):
        self.last = list(angles)

class _FakeArms:
    def __init__(self):
        self.left = _FakeArm()
        self.right = _FakeArm()

class _FakeHead:
    def __init__(self):
        self.angles = [90, 90]
        self.last = None
    def set_normalized(self, p, t):
        self.last = (p, t)


def test_teleop_inactive_does_nothing():
    arms, head = _FakeArms(), _FakeHead()
    tc = TeleopController(arms, head, {})
    tc.update({"left_shoulder": (0.5, 0.3), "left_elbow": (0.8, 0.3),
               "left_wrist": (0.9, 0.3), "left_hip": (0.5, 0.8)})
    assert arms.left.last is None  # rien envoyé tant que non actif

def test_teleop_max_step_limits_movement():
    arms, head = _FakeArms(), _FakeHead()
    tc = TeleopController(arms, head, {"smoothing": 1.0, "max_step_deg": 10})
    tc.start()
    # Cible qui exigerait un grand déplacement d'épaule
    lms = {"left_shoulder": (0.5, 0.5), "left_elbow": (0.5, 0.2),
           "left_wrist": (0.5, 0.1), "left_hip": (0.5, 0.9)}
    tc.update(lms)
    # L'épaule ne peut pas bouger de plus de 10° en un seul pas
    assert abs(arms.left.last[0] - 90) <= 10.001

def test_teleop_head_updates():
    arms, head = _FakeArms(), _FakeHead()
    tc = TeleopController(arms, head, {})
    tc.start()
    tc.update({"nose": (0.58, 0.4), "left_ear": (0.4, 0.4), "right_ear": (0.6, 0.4)})
    assert head.last is not None
