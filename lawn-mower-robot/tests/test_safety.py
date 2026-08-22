"""Tests de la logique de sécurité (détection de dangers + moniteur)."""
import time

from src.control.safety import evaluate_hazards, SafetyMonitor


# --- evaluate_hazards ---

def test_no_hazard():
    assert evaluate_hazards(False, False, False) == []

def test_person_hazard():
    assert "person" in evaluate_hazards(True, False, False)

def test_tilt_hazard():
    assert "tilt" in evaluate_hazards(False, True, False)

def test_bumper_hazard():
    assert "bumper" in evaluate_hazards(False, False, True)

def test_multiple_hazards():
    h = evaluate_hazards(True, True, True)
    assert set(h) == {"person", "tilt", "bumper"}


# --- SafetyMonitor : déclenchement des callbacks ---

def _make_monitor(tilt=False, bumper=False):
    events = {"hazard": [], "clear": 0}
    m = SafetyMonitor(
        {"enabled": True, "poll_interval": 0.05, "person_hold_time": 0.3},
        tilt_fn=lambda: tilt,
        bumper_fn=lambda: bumper,
        on_hazard=lambda h: events["hazard"].append(h),
        on_clear=lambda: events.__setitem__("clear", events["clear"] + 1),
    )
    return m, events


def test_monitor_triggers_on_tilt():
    m, events = _make_monitor(tilt=True)
    m._check()  # appel direct (pas de thread)
    assert events["hazard"] and "tilt" in events["hazard"][0]
    assert m.hazard_active

def test_monitor_safe_by_default():
    m, events = _make_monitor()
    m._check()
    assert not events["hazard"]
    assert not m.hazard_active

def test_monitor_person_hold():
    m, events = _make_monitor()
    m.set_person_detected(True)
    m._check()
    assert m.hazard_active                 # personne détectée → danger
    # Après expiration du hold, plus de danger
    m._person_last_seen = time.time() - 10
    m._check()
    assert not m.hazard_active
    assert events["clear"] == 1            # callback de retour à la normale

def test_monitor_only_fires_once_per_transition():
    m, events = _make_monitor(tilt=True)
    m._check()
    m._check()  # danger toujours actif : pas de nouveau déclenchement
    assert len(events["hazard"]) == 1

def test_monitor_disabled_does_not_start():
    m = SafetyMonitor(
        {"enabled": False},
        tilt_fn=lambda: True, bumper_fn=lambda: False,
        on_hazard=lambda h: None,
    )
    m.start()  # ne doit rien lancer
    assert not m.hazard_active

def test_monitor_survives_faulty_source():
    # Une source qui lève une exception ne doit pas planter le moniteur
    def boom():
        raise RuntimeError("capteur HS")
    m = SafetyMonitor(
        {"enabled": True}, tilt_fn=boom, bumper_fn=lambda: False,
        on_hazard=lambda h: None,
    )
    m._check()  # ne doit pas lever
    assert not m.hazard_active
