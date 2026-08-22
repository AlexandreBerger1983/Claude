"""
Téléopération par webcam - le robot imite les mouvements de l'opérateur.

Le navigateur de l'opérateur détecte la posture (MediaPipe Pose) et envoie
les points-clés (landmarks) normalisés. Ce module les traduit en angles de
servos pour les bras et la tête, avec lissage temps réel pour protéger la
mécanique.

Repère image : x vers la droite, y vers le BAS, valeurs normalisées 0..1.
"""
import math
from src.utils import logger

# Indices dans la liste d'angles d'un bras [épaule, coude, poignet, pince]
SHOULDER, ELBOW, WRIST, GRIPPER = 0, 1, 2, 3


# ---------------------------------------------------------------------------
# Fonctions géométriques pures (testables sans matériel)
# ---------------------------------------------------------------------------

def _vec(a: tuple, b: tuple) -> tuple:
    return (b[0] - a[0], b[1] - a[1])


def angle_between(u: tuple, v: tuple) -> float:
    """Angle en degrés entre deux vecteurs 2D (0..180)."""
    du = math.hypot(u[0], u[1])
    dv = math.hypot(v[0], v[1])
    if du == 0 or dv == 0:
        return 0.0
    cos = (u[0] * v[0] + u[1] * v[1]) / (du * dv)
    cos = max(-1.0, min(1.0, cos))
    return math.degrees(math.acos(cos))


def shoulder_elevation(shoulder: tuple, elbow: tuple, hip: tuple) -> float:
    """
    Élévation du bras : angle entre le bras (épaule→coude) et le torse
    (épaule→hanche). Bras le long du corps ≈ 0°, bras à l'horizontale ≈ 90°,
    bras levé ≈ 180°.
    """
    upper_arm = _vec(shoulder, elbow)
    torso = _vec(shoulder, hip)
    return angle_between(upper_arm, torso)


def elbow_flexion(shoulder: tuple, elbow: tuple, wrist: tuple) -> float:
    """
    Flexion du coude : angle au niveau du coude. Bras tendu ≈ 180°,
    coude complètement plié ≈ 20-30°.
    """
    fore = _vec(elbow, wrist)
    upper = _vec(elbow, shoulder)
    return angle_between(fore, upper)


def head_pan(nose: tuple, left_ear: tuple, right_ear: tuple) -> float:
    """Rotation horizontale de la tête, normalisée -1 (gauche) .. +1 (droite)."""
    mid_x = (left_ear[0] + right_ear[0]) / 2
    ear_dist = math.hypot(left_ear[0] - right_ear[0], left_ear[1] - right_ear[1])
    if ear_dist < 1e-6:
        return 0.0
    ratio = (nose[0] - mid_x) / ear_dist
    return max(-1.0, min(1.0, ratio * 2.0))


def head_tilt(nose: tuple, left_ear: tuple, right_ear: tuple) -> float:
    """Inclinaison verticale de la tête, normalisée -1 (bas) .. +1 (haut)."""
    mid_y = (left_ear[1] + right_ear[1]) / 2
    ear_dist = math.hypot(left_ear[0] - right_ear[0], left_ear[1] - right_ear[1])
    if ear_dist < 1e-6:
        return 0.0
    # y augmente vers le bas → on inverse pour que "nez plus haut" = +1
    ratio = (mid_y - nose[1]) / ear_dist
    return max(-1.0, min(1.0, ratio * 2.0))


def compute_arm_angles(landmarks: dict, side: str) -> tuple | None:
    """
    Calcule (épaule, coude) pour un bras à partir des landmarks.
    Retourne None si un point requis manque.
    """
    keys = [f"{side}_shoulder", f"{side}_elbow", f"{side}_wrist", f"{side}_hip"]
    if not all(k in landmarks for k in keys):
        return None
    sh = landmarks[f"{side}_shoulder"]
    el = landmarks[f"{side}_elbow"]
    wr = landmarks[f"{side}_wrist"]
    hp = landmarks[f"{side}_hip"]
    return shoulder_elevation(sh, el, hp), elbow_flexion(sh, el, wr)


def compute_head_angles(landmarks: dict) -> tuple | None:
    """Calcule (pan_norm, tilt_norm) à partir des landmarks du visage."""
    keys = ["nose", "left_ear", "right_ear"]
    if not all(k in landmarks for k in keys):
        return None
    nose = landmarks["nose"]
    le = landmarks["left_ear"]
    re = landmarks["right_ear"]
    return head_pan(nose, le, re), head_tilt(nose, le, re)


# --- Main / pince ------------------------------------------------------------
# Seuils du ratio (longueur doigt / paume) : main fermée .. main ouverte.
HAND_RATIO_CLOSED = 1.2
HAND_RATIO_OPEN = 2.4


def hand_openness(wrist: tuple, palm: tuple, tips: list) -> float:
    """
    Degré d'ouverture de la main, normalisé 0 (poing fermé) .. 1 (main ouverte).
    `palm` = articulation du majeur (MCP), `tips` = bouts des 4 doigts.
    Compare la distance moyenne poignet→bout de doigt à la longueur de la paume.
    """
    scale = math.hypot(wrist[0] - palm[0], wrist[1] - palm[1])
    if scale < 1e-6 or not tips:
        return 0.0
    avg_tip = sum(math.hypot(wrist[0] - t[0], wrist[1] - t[1]) for t in tips) / len(tips)
    ratio = avg_tip / scale
    norm = (ratio - HAND_RATIO_CLOSED) / (HAND_RATIO_OPEN - HAND_RATIO_CLOSED)
    return max(0.0, min(1.0, norm))


def compute_grip(landmarks: dict, side: str) -> float | None:
    """Ouverture de la main d'un côté (0..1) à partir des landmarks de main.
    Retourne None si la main n'est pas détectée."""
    wrist_key = f"{side}_hand_wrist"
    palm_key = f"{side}_hand_mcp"
    tip_keys = [f"{side}_hand_tip{i}" for i in range(4)]
    if wrist_key not in landmarks or palm_key not in landmarks:
        return None
    tips = [landmarks[k] for k in tip_keys if k in landmarks]
    if not tips:
        return None
    return hand_openness(landmarks[wrist_key], landmarks[palm_key], tips)


# ---------------------------------------------------------------------------
# Contrôleur de téléopération
# ---------------------------------------------------------------------------

class TeleopController:
    """
    Applique les poses reçues aux bras et à la tête, avec :
    - lissage exponentiel (filtre passe-bas)
    - limite de pas par mise à jour (protège les servos)
    """

    def __init__(self, arms, head, config: dict | None = None):
        cfg = config or {}
        self._arms = arms
        self._head = head
        self._alpha = cfg.get("smoothing", 0.4)        # 0=figé, 1=aucun lissage
        self._max_step = cfg.get("max_step_deg", 20)   # ° max par update
        # Pince : angle servo main ouverte / main fermée
        self._grip_open = cfg.get("gripper_open", 0)
        self._grip_closed = cfg.get("gripper_closed", 70)
        self._active = False

        # État lissé courant (copie des positions repos des bras)
        self._arm_state = {
            "left": list(arms.left.angles),
            "right": list(arms.right.angles),
        }
        self._head_state = list(head.angles) if head else [90, 90]

    def start(self):
        self._active = True
        logger.info("Téléopération activée - le robot suit vos mouvements")

    def stop(self):
        self._active = False
        logger.info("Téléopération désactivée")

    @property
    def active(self) -> bool:
        return self._active

    def _smooth(self, current: float, target: float) -> float:
        """Filtre passe-bas + limite de pas."""
        delta = self._alpha * (target - current)
        delta = max(-self._max_step, min(self._max_step, delta))
        return current + delta

    def update(self, landmarks: dict):
        """Reçoit un dict de landmarks {nom: [x, y]} et actualise le robot."""
        if not self._active:
            return

        # --- Bras + pinces ---
        for side in ("left", "right"):
            state = self._arm_state[side]
            changed = False

            arm = compute_arm_angles(landmarks, side)
            if arm is not None:
                shoulder_target, elbow_target = arm
                state[SHOULDER] = self._smooth(state[SHOULDER], shoulder_target)
                state[ELBOW] = self._smooth(state[ELBOW], elbow_target)
                changed = True

            # Pince pilotée par l'ouverture de la main (main ouverte → pince ouverte)
            grip = compute_grip(landmarks, side)
            if grip is not None:
                gripper_target = self._grip_open + (1 - grip) * (self._grip_closed - self._grip_open)
                state[GRIPPER] = self._smooth(state[GRIPPER], gripper_target)
                changed = True

            # poignet conserve sa valeur (non piloté)
            if changed:
                getattr(self._arms, side).set_raw(state)

        # --- Tête ---
        if self._head:
            head_result = compute_head_angles(landmarks)
            if head_result is not None:
                pan_norm, tilt_norm = head_result
                self._head.set_normalized(pan_norm, tilt_norm)
                self._head_state = list(self._head.angles)

    @property
    def status(self) -> dict:
        return {
            "active": self._active,
            "arms": {k: [round(a, 1) for a in v] for k, v in self._arm_state.items()},
            "head": [round(a, 1) for a in self._head_state],
        }
