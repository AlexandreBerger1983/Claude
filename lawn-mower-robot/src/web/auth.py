"""
Authentification et protection anti-force-brute pour l'interface web.

La logique est isolée ici pour être testable sans démarrer le serveur.
"""
import time
import secrets
from functools import wraps

from werkzeug.security import generate_password_hash, check_password_hash

from src.utils import logger


class LoginThrottle:
    """Verrou anti-force-brute : bloque une IP après trop d'échecs."""

    def __init__(self, max_attempts: int = 5, lockout_seconds: float = 300):
        self._max = max_attempts
        self._lockout = lockout_seconds
        self._failures: dict[str, list] = {}   # ip -> [timestamps]
        self._locked_until: dict[str, float] = {}

    def is_locked(self, ip: str, now: float | None = None) -> bool:
        now = now if now is not None else time.time()
        until = self._locked_until.get(ip, 0)
        return now < until

    def seconds_remaining(self, ip: str, now: float | None = None) -> int:
        now = now if now is not None else time.time()
        return max(0, int(self._locked_until.get(ip, 0) - now))

    def record_failure(self, ip: str, now: float | None = None):
        now = now if now is not None else time.time()
        window = now - self._lockout
        fails = [t for t in self._failures.get(ip, []) if t > window]
        fails.append(now)
        self._failures[ip] = fails
        if len(fails) >= self._max:
            self._locked_until[ip] = now + self._lockout
            logger.warning(f"IP {ip} verrouillée après {len(fails)} échecs de connexion")

    def record_success(self, ip: str):
        self._failures.pop(ip, None)
        self._locked_until.pop(ip, None)


class Credentials:
    """Identifiants attendus, chargés depuis la config (mot de passe haché en mémoire)."""

    def __init__(self, username: str, password: str = "", password_hash: str = ""):
        self.username = username
        # Priorité au hash fourni ; sinon on hache le mot de passe en clair au démarrage
        self._hash = password_hash or generate_password_hash(password or secrets.token_hex(16))

    def verify(self, username: str, password: str) -> bool:
        # Comparaison de l'utilisateur ET du mot de passe (temps constant pour le hash)
        user_ok = secrets.compare_digest(username or "", self.username)
        pass_ok = check_password_hash(self._hash, password or "")
        return user_ok and pass_ok

    @classmethod
    def from_config(cls, web_cfg: dict) -> "Credentials":
        auth = web_cfg.get("auth", {})
        return cls(
            username=auth.get("username", "admin"),
            password=auth.get("password", ""),
            password_hash=auth.get("password_hash", ""),
        )


def login_required(session, redirect_fn):
    """Fabrique un décorateur qui exige une session authentifiée.

    `session` et `redirect_fn` sont injectés pour éviter d'importer flask ici
    (garde ce module testable de façon isolée)."""
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            if not session.get("authenticated"):
                return redirect_fn()
            return view(*args, **kwargs)
        return wrapper
    return decorator
