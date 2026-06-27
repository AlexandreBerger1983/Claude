"""Serveur Flask + Socket.IO pour le contrôle à distance du robot."""
import threading
import time

from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit

from src.control import Robot, MowingController
from src.utils import get_config, logger

app = Flask(__name__, template_folder="templates", static_folder="static")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent")

_robot: Robot | None = None
_mowing: MowingController | None = None


def init_robot():
    global _robot, _mowing
    _robot = Robot()
    _mowing = MowingController(_robot, get_config()["mowing"])


def _status_broadcast():
    """Envoie l'état du robot à tous les clients toutes les 200 ms."""
    while True:
        if _robot:
            socketio.emit("status", _robot.status)
        time.sleep(0.2)


# ------------------------------------------------------------------
# Routes HTTP
# ------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    if not _robot:
        return jsonify({"error": "Robot non initialisé"}), 503
    return jsonify(_robot.status)


# ------------------------------------------------------------------
# Événements Socket.IO
# ------------------------------------------------------------------

@socketio.on("connect")
def on_connect():
    logger.info(f"Client connecté")
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


@socketio.on("mow_start")
def on_mow_start():
    if _mowing:
        _mowing.start()
    emit("mow_state", {"state": _mowing.state if _mowing else "UNKNOWN"})


@socketio.on("mow_stop")
def on_mow_stop():
    if _mowing:
        _mowing.stop()


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
