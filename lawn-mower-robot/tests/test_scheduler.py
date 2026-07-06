"""Tests du planificateur et des notifications."""
from datetime import datetime

from src.control.scheduler import task_due, parse_hhmm, Scheduler
from src.control.notifications import Notifier, EventLevel


# --- parse_hhmm ---

def test_parse_hhmm():
    t = parse_hhmm("14:30")
    assert t.hour == 14 and t.minute == 30


# --- task_due ---
# 2026-07-07 est un mardi.

MARDI_10H = datetime(2026, 7, 7, 10, 0)
MARDI_9H = datetime(2026, 7, 7, 9, 0)
MERCREDI_10H = datetime(2026, 7, 8, 10, 0)

def test_due_right_day_and_time():
    assert task_due(MARDI_10H, ["mar"], "10:00", last_run=None)

def test_not_due_before_time():
    assert not task_due(MARDI_9H, ["mar"], "10:00", last_run=None)

def test_not_due_wrong_day():
    assert not task_due(MERCREDI_10H, ["mar"], "10:00", last_run=None)

def test_not_due_if_already_ran_today():
    earlier = datetime(2026, 7, 7, 10, 1)
    assert not task_due(datetime(2026, 7, 7, 10, 5), ["mar"], "10:00", last_run=earlier)

def test_due_after_time_window():
    # même après l'heure prévue, tant que pas encore exécuté
    assert task_due(datetime(2026, 7, 7, 10, 30), ["mar"], "10:00", last_run=None)

def test_skip_if_rain():
    assert not task_due(MARDI_10H, ["mar"], "10:00", last_run=None,
                        rain=True, skip_if_rain=True)

def test_rain_ignored_if_not_configured():
    assert task_due(MARDI_10H, ["mar"], "10:00", last_run=None,
                    rain=True, skip_if_rain=False)

def test_multiple_days():
    # tâche lun+ven ne se déclenche pas un mardi
    assert not task_due(MARDI_10H, ["lun", "ven"], "10:00", last_run=None)


# --- Scheduler : déclenchement des actions ---

def test_scheduler_triggers_action():
    calls = []
    sched = Scheduler(
        {"enabled": True, "tasks": {"mow": {"days": ["mar"], "at": "10:00"}}},
        actions={"mow": lambda: calls.append("mow")},
    )
    sched._check_all(MARDI_10H)
    assert calls == ["mow"]

def test_scheduler_no_double_run():
    calls = []
    sched = Scheduler(
        {"enabled": True, "tasks": {"mow": {"days": ["mar"], "at": "10:00"}}},
        actions={"mow": lambda: calls.append("mow")},
    )
    sched._check_all(MARDI_10H)
    sched._check_all(datetime(2026, 7, 7, 10, 30))  # même jour
    assert calls == ["mow"]

def test_scheduler_disabled_task_skipped():
    calls = []
    sched = Scheduler(
        {"enabled": True, "tasks": {"mow": {"enabled": False, "days": ["mar"], "at": "10:00"}}},
        actions={"mow": lambda: calls.append("mow")},
    )
    sched._check_all(MARDI_10H)
    assert calls == []


# --- Notifier : gating niveau + anti-spam ---

def test_notifier_disabled():
    n = Notifier({"enabled": False, "channels": []})
    assert not n._should_send("k", EventLevel.INFO, now=0)

def test_notifier_level_gating():
    n = Notifier({"enabled": True, "min_level": "critical", "channels": []})
    assert not n._should_send("k", EventLevel.INFO, now=0)
    assert n._should_send("k", EventLevel.CRITICAL, now=0)

def test_notifier_cooldown():
    n = Notifier({"enabled": True, "cooldown_seconds": 60, "channels": []})
    assert n._should_send("k", EventLevel.INFO, now=0)
    assert not n._should_send("k", EventLevel.INFO, now=30)   # dans le cooldown
    assert n._should_send("k", EventLevel.INFO, now=100)      # après cooldown

def test_notifier_cooldown_per_key():
    n = Notifier({"enabled": True, "cooldown_seconds": 60, "channels": []})
    assert n._should_send("a", EventLevel.INFO, now=0)
    assert n._should_send("b", EventLevel.INFO, now=0)   # clé différente, pas bloquée
