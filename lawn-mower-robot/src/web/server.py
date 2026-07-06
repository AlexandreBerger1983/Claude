"""Serveur Flask + Socket.IO pour le contrôle à distance du robot."""
import threading
import time
import secrets
from functools import wraps

from flask import (
    Flask, render_template, jsonify, Response,
    session, request, redirect, url_for,
)
from flask_socketio import SocketIO, emit, disconnect

from src.control import Robot, MowingController
from src.control.mowing_gps import GPSMowingController
from src.hardware.gps_rtk import GPSRTKModule
from src.hardware.camera_stream import CameraStream
from src.web.auth import Credentials, LoginThrottle
from src.utils import get_config, logger

app = Flask(__name__, template_folder="templates", static_folder="static")

# --- Sécurité : clé de session, cookies, identifiants ---
_web_cfg = get_config().get("web", {})
_secret = _web_cfg.get("secret_key", "")
if not _secret or _secret == "change-me-in-production":
    _secret = secrets.token_hex(32)
    logger.warning("web.secret_key non défini/défaut - clé aléatoire générée "
                   "(les sessions ne survivront pas à un redémarrage)")
app.secret_key = _secret
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=_web_cfg.get("session_lifetime", 86400),
)

_credentials = Credentials.from_config(_web_cfg)
_throttle = LoginThrottle(
    max_attempts=_web_cfg.get("max_login_attempts", 5),
    lockout_seconds=_web_cfg.get("lockout_seconds", 300),
)

# CORS restreint aux origines autorisées (ou * si non configuré)
_allowed_origins = _web_cfg.get("allowed_origins", "*")
socketio = SocketIO(app, cors_allowed_origins=_allowed_origins, async_mode="gevent")


def login_required(view):
    """Protège une route HTTP : redirige vers /login si non authentifié."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not session.get("authenticated"):
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapper


def _client_ip() -> str:
    # Derrière un reverse-proxy/VPN, X-Forwarded-For peut porter l'IP réelle
    fwd = request.headers.get("X-Forwarded-For", "")
    return fwd.split(",")[0].strip() if fwd else (request.remote_addr or "?")

_robot: Robot | None = None
_mowing: MowingController | None = None
_gps: GPSRTKModule | None = None
_mowing_gps: GPSMowingController | None = None
_camera: CameraStream | None = None
_detector = None
_scheduler = None
_trash = None


def init_robot():
    global _robot, _mowing, _gps, _mowing_gps, _camera
    cfg = get_config()
    _robot = Robot()
    _mowing = MowingController(_robot, cfg["mowing"])

    _camera = CameraStream(cfg.get("camera", {}))
    _camera.start()

    # Détection personne/animal sur le flux caméra → coupe la lame
    safety_cfg = cfg.get("safety", {})
    if safety_cfg.get("person_detection", {}).get("enabled"):
        from src.hardware.vision_safety import PersonAnimalDetector
        global _detector
        _detector = PersonAnimalDetector(
            safety_cfg["person_detection"], _camera, _robot.safety
        )
        _detector.start()

    if cfg.get("gps", {}).get("enabled"):
        _gps = GPSRTKModule(cfg["gps"])
        _gps.start()
        _mowing_gps = GPSMowingController(_robot, _gps)
        logger.info("GPS RTK activé")
    else:
        logger.info("GPS RTK désactivé (config gps.enabled: false)")

    _init_automation(cfg)


def _init_automation(cfg: dict):
    """Planificateur (tonte/poubelles) + contrôleur poubelles (Bloc 4)."""
    global _scheduler, _trash
    from src.control.trash import TrashController
    from src.control.scheduler import Scheduler

    _trash = TrashController(
        _robot, _mowing_gps, cfg.get("trash", {}), notifier=_robot.notifier
    )

    def _action_mow():
        _robot.notifier.notify("Tonte planifiée", "Démarrage de la tonte.", key="mow")
        if _mowing_gps:
            _mowing_gps.start()
        elif _mowing:
            _mowing.start()

    actions = {
        "mow": _action_mow,
        "trash_out": _trash.take_out,
        "trash_in": _trash.bring_in,
    }
    _scheduler = Scheduler(
        cfg.get("scheduler", {}),
        actions=actions,
        rain_fn=_robot.sensors.rain_detected,
    )
    _scheduler.start()


def _status_broadcast():
    """Envoie l'état du robot à tous les clients toutes les 200 ms."""
    while True:
        if _robot:
            status = _robot.status
            if _gps:
                pos = _gps.position
                status["gps"] = {
                    "lat": pos.lat, "lon": pos.lon, "alt": pos.alt,
                    "status": pos.status.name, "hdop": pos.hdop,
                    "satellites": pos.satellites, "heading": pos.heading,
                }
            if _mowing_gps:
                status["gps_mowing"] = _mowing_gps.progress
            if _camera:
                status["camera_connected"] = _camera.is_connected
            socketio.emit("status", status)
        time.sleep(0.2)


# ------------------------------------------------------------------
# Authentification
# ------------------------------------------------------------------

@app.route("/login", methods=["GET", "POST"])
def login():
    ip = _client_ip()
    if request.method == "POST":
        if _throttle.is_locked(ip):
            wait = _throttle.seconds_remaining(ip)
            return render_template("login.html",
                                   error=f"Trop de tentatives. Réessayez dans {wait}s."), 429
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if _credentials.verify(username, password):
            _throttle.record_success(ip)
            session.clear()
            session["authenticated"] = True
            session["user"] = username
            session.permanent = True
            logger.info(f"Connexion réussie ({username}) depuis {ip}")
            return redirect(url_for("index"))
        _throttle.record_failure(ip)
        logger.warning(f"Échec de connexion depuis {ip}")
        return render_template("login.html", error="Identifiants invalides."), 401
    return render_template("login.html", error=None)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ------------------------------------------------------------------
# Routes HTTP (protégées)
# ------------------------------------------------------------------

@app.route("/")
@login_required
def index():
    return render_template("index.html")


@app.route("/zone")
@login_required
def zone_editor():
    return render_template("zone_editor.html")


@app.route("/teleop")
@login_required
def teleop():
    return render_template("teleop.html")


@app.route("/stream")
@login_required
def stream():
    """Flux vidéo MJPEG (caméra Wyze RTSP ou Raspberry Pi) montée sur la tête."""
    if not _camera:
        return "", 503
    return Response(
        _camera.mjpeg_generator(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.route("/api/status")
@login_required
def api_status():
    if not _robot:
        return jsonify({"error": "Robot non initialisé"}), 503
    return jsonify(_robot.status)


# ------------------------------------------------------------------
# Événements Socket.IO
# ------------------------------------------------------------------

@socketio.on("connect")
def on_connect():
    # Rejette toute connexion WebSocket sans session authentifiée
    if not session.get("authenticated"):
        logger.warning("Connexion WebSocket refusée (non authentifiée)")
        return False
    logger.info(f"Client connecté ({session.get('user', '?')})")
    if _robot:
        emit("status", _robot.status)


@socketio.on("disconnect")
def on_disconnect():
    logger.info("Client déconnecté")


@socketio.on("move")
def on_move(data):
    if not _robot:
        return
    linear = float(data.get("linear", 0))
    angular = float(data.get("angular", 0))
    _robot.manual_move(linear, angular)


@socketio.on("stop")
def on_stop():
    if _robot:
        _robot.stop()


@socketio.on("blade")
def on_blade(data):
    if not _robot:
        return
    if data.get("action") == "start":
        _robot.blade_start()
    else:
        _robot.blade_stop()


@socketio.on("arm")
def on_arm(data):
    if not _robot:
        return
    command = data.get("command", "home")
    _robot.arm_command(command)


# ------------------------------------------------------------------
# Téléopération (imitation par webcam)
# ------------------------------------------------------------------

@socketio.on("teleop_start")
def on_teleop_start():
    if _robot:
        _robot.teleop_start()
        emit("teleop_state", {"active": True})


@socketio.on("teleop_stop")
def on_teleop_stop():
    if _robot:
        _robot.teleop_stop()
        emit("teleop_state", {"active": False})


@socketio.on("teleop_pose")
def on_teleop_pose(data):
    """Reçoit les landmarks de posture depuis le navigateur de l'opérateur."""
    if _robot:
        _robot.teleop_pose(data.get("landmarks", {}))


@socketio.on("head")
def on_head(data):
    if _robot:
        _robot.head_move(float(data.get("pan", 0)), float(data.get("tilt", 0)))


# ------------------------------------------------------------------
# Poubelles (déclenchement manuel à distance)
# ------------------------------------------------------------------

@socketio.on("trash_out")
def on_trash_out():
    if _trash:
        socketio.start_background_task(_trash.take_out)


@socketio.on("trash_in")
def on_trash_in():
    if _trash:
        socketio.start_background_task(_trash.bring_in)


@socketio.on("mow_start")
def on_mow_start():
    if _mowing:
        _mowing.start()
    emit("mow_state", {"state": _mowing.state if _mowing else "UNKNOWN"})


@socketio.on("mow_stop")
def on_mow_stop():
    if _mowing:
        _mowing.stop()


@socketio.on("mow_gps_start")
def on_mow_gps_start():
    if not _mowing_gps:
        emit("error", {"msg": "GPS RTK non activé dans la configuration"})
        return
    ok = _mowing_gps.start()
    emit("mow_gps_state", {"state": _mowing_gps.state, "started": ok})


@socketio.on("mow_gps_stop")
def on_mow_gps_stop():
    if _mowing_gps:
        _mowing_gps.stop()


@socketio.on("get_gps")
def on_get_gps():
    if _gps:
        pos = _gps.position
        emit("gps_position", {"lat": pos.lat, "lon": pos.lon, "status": pos.status.name})
    else:
        emit("gps_position", {"lat": None, "lon": None, "status": "DISABLED"})


@socketio.on("save_zone")
def on_save_zone(data):
    if _mowing_gps:
        _mowing_gps.save_zone(data.get("boundary", []))
        emit("zone_saved", {})
    else:
        emit("error", {"msg": "GPS non disponible"})


@socketio.on("emergency_stop")
def on_emergency_stop():
    if _robot:
        _robot.emergency_stop()
    emit("status", _robot.status if _robot else {})


@socketio.on("reset_emergency")
def on_reset_emergency():
    if _robot:
        _robot.reset_emergency()


def run(host: str = "0.0.0.0", port: int = 5000):
    init_robot()
    broadcast_thread = threading.Thread(target=_status_broadcast, daemon=True)
    broadcast_thread.start()
    logger.info(f"Serveur démarré sur http://{host}:{port}")
    socketio.run(app, host=host, port=port)
