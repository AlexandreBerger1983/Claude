"""Tests de la surveillance batterie et des seuils de retour/arrêt."""
from src.hardware.battery import voltage_to_percent, BatteryMonitor


# --- voltage_to_percent ---

def test_full_3s():
    assert voltage_to_percent(12.6, cells=3) == 100.0   # 4.2V/cellule

def test_empty_3s():
    assert voltage_to_percent(9.9, cells=3) < 0.01      # 3.3V/cellule ≈ 0%

def test_mid_3s():
    pct = voltage_to_percent(11.25, cells=3)            # 3.75V/cellule ≈ 50%
    assert 45 < pct < 55

def test_clamped_over():
    assert voltage_to_percent(20, cells=3) == 100.0

def test_clamped_under():
    assert voltage_to_percent(5, cells=3) == 0.0

def test_4s_pack():
    assert voltage_to_percent(16.8, cells=4) == 100.0

def test_zero_cells_safe():
    assert voltage_to_percent(12, cells=0) == 0.0


# --- Seuils : retour base / arrêt ---

def _monitor():
    events = {"low": 0, "critical": 0}
    m = BatteryMonitor({"enabled": True, "return_threshold": 25, "shutdown_threshold": 12})
    m.set_callbacks(
        on_low=lambda: events.__setitem__("low", events["low"] + 1),
        on_critical=lambda: events.__setitem__("critical", events["critical"] + 1),
    )
    return m, events


def test_low_triggers_return():
    m, events = _monitor()
    m._percent = 20
    m._check_thresholds()
    assert events["low"] == 1 and events["critical"] == 0

def test_critical_triggers_shutdown():
    m, events = _monitor()
    m._percent = 10
    m._check_thresholds()
    assert events["critical"] == 1

def test_normal_no_trigger():
    m, events = _monitor()
    m._percent = 80
    m._check_thresholds()
    assert events["low"] == 0 and events["critical"] == 0

def test_low_fires_once():
    m, events = _monitor()
    m._percent = 20
    m._check_thresholds()
    m._check_thresholds()
    assert events["low"] == 1   # pas de spam tant que pas rechargé

def test_hysteresis_rearms_after_recharge():
    m, events = _monitor()
    m._percent = 20
    m._check_thresholds()          # low fired
    m._percent = 90                # rechargé
    m._check_thresholds()          # réarme
    m._percent = 20
    m._check_thresholds()          # re-déclenche
    assert events["low"] == 2

def test_status_fields():
    m = BatteryMonitor({"enabled": True})
    m._voltage = 11.4
    m._percent = 60.0
    st = m.status
    assert st["percent"] == 60 and st["voltage"] == 11.4 and "charging" in st
