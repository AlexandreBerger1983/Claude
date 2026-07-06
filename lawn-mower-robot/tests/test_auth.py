"""Tests de la logique d'authentification et anti-force-brute."""
from src.web.auth import LoginThrottle, Credentials


# --- Credentials ---

def test_credentials_verify_ok():
    c = Credentials(username="admin", password="secret123")
    assert c.verify("admin", "secret123")

def test_credentials_wrong_password():
    c = Credentials(username="admin", password="secret123")
    assert not c.verify("admin", "mauvais")

def test_credentials_wrong_user():
    c = Credentials(username="admin", password="secret123")
    assert not c.verify("root", "secret123")

def test_credentials_empty():
    c = Credentials(username="admin", password="secret123")
    assert not c.verify("", "")

def test_credentials_from_config_hash():
    from werkzeug.security import generate_password_hash
    h = generate_password_hash("motdepasse")
    c = Credentials.from_config({"auth": {"username": "bob", "password_hash": h}})
    assert c.verify("bob", "motdepasse")
    assert not c.verify("bob", "autre")


# --- LoginThrottle ---

def test_throttle_not_locked_initially():
    t = LoginThrottle(max_attempts=3, lockout_seconds=100)
    assert not t.is_locked("1.2.3.4", now=0)

def test_throttle_locks_after_max_attempts():
    t = LoginThrottle(max_attempts=3, lockout_seconds=100)
    for i in range(3):
        t.record_failure("1.2.3.4", now=i)
    assert t.is_locked("1.2.3.4", now=3)

def test_throttle_below_max_not_locked():
    t = LoginThrottle(max_attempts=3, lockout_seconds=100)
    t.record_failure("1.2.3.4", now=0)
    t.record_failure("1.2.3.4", now=1)
    assert not t.is_locked("1.2.3.4", now=2)

def test_throttle_unlocks_after_timeout():
    t = LoginThrottle(max_attempts=3, lockout_seconds=100)
    for i in range(3):
        t.record_failure("1.2.3.4", now=i)
    assert t.is_locked("1.2.3.4", now=50)
    assert not t.is_locked("1.2.3.4", now=200)

def test_throttle_success_resets():
    t = LoginThrottle(max_attempts=3, lockout_seconds=100)
    t.record_failure("1.2.3.4", now=0)
    t.record_failure("1.2.3.4", now=1)
    t.record_success("1.2.3.4")
    t.record_failure("1.2.3.4", now=2)
    assert not t.is_locked("1.2.3.4", now=3)

def test_throttle_isolates_ips():
    t = LoginThrottle(max_attempts=2, lockout_seconds=100)
    t.record_failure("1.1.1.1", now=0)
    t.record_failure("1.1.1.1", now=1)
    assert t.is_locked("1.1.1.1", now=2)
    assert not t.is_locked("2.2.2.2", now=2)

def test_throttle_old_failures_expire():
    # Des échecs trop anciens ne comptent plus dans la fenêtre
    t = LoginThrottle(max_attempts=3, lockout_seconds=100)
    t.record_failure("1.2.3.4", now=0)
    t.record_failure("1.2.3.4", now=1)
    # 200s plus tard, les 2 premiers sont hors fenêtre → pas de verrou
    t.record_failure("1.2.3.4", now=200)
    assert not t.is_locked("1.2.3.4", now=201)
