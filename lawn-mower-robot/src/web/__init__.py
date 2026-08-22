# Import paresseux : évite de charger Flask/serveur quand on n'utilise
# qu'un sous-module (ex. src.web.auth dans les tests).
__all__ = ["app", "socketio", "run"]


def __getattr__(name):
    if name in __all__:
        from . import server
        return getattr(server, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
