"""
Flux caméra pour l'interface web.

Sources supportées :
  - "wyze_rtsp" : lit un flux RTSP (caméra Wyze avec firmware RTSP, ou
                  docker-wyze-bridge) et le relaie en MJPEG vers le navigateur.
  - "picamera"  : caméra officielle Raspberry Pi (picamera2).
  - "sim"       : aucune caméra (mode développement).

La caméra est montée physiquement sur la tête pan/tilt du robot : elle suit
donc les mouvements de tête pilotés par la téléopération, sans code
supplémentaire. Ce module ne gère que l'acquisition et la diffusion de l'image.
"""
import time
import threading

try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

from src.utils import logger


class CameraStream:
    def __init__(self, config: dict):
        self._cfg = config or {}
        self._enabled = self._cfg.get("enabled", False)
        self._source = self._cfg.get("source", "sim")
        self._rtsp_url = self._cfg.get("rtsp_url", "")
        self._quality = int(self._cfg.get("stream_quality", 75))
        self._reconnect_delay = float(self._cfg.get("reconnect_delay", 3.0))

        self._frame: bytes | None = None
        self._lock = threading.Lock()
        self._running = False
        self._connected = False
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------

    def start(self):
        if not self._enabled:
            logger.info("Caméra désactivée (camera.enabled: false)")
            return
        if self._source == "wyze_rtsp" and not self._rtsp_url:
            logger.error("Caméra Wyze : rtsp_url manquant dans la config")
            return
        self._running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        logger.info(f"Caméra démarrée - source={self._source}")

    def _capture_loop(self):
        while self._running:
            if self._source == "wyze_rtsp":
                self._capture_rtsp()
            elif self._source == "picamera":
                self._capture_picamera()
                return
            else:
                time.sleep(1)  # sim : rien à faire

            if self._running:
                logger.warning(f"Reconnexion caméra dans {self._reconnect_delay}s")
                self._connected = False
                time.sleep(self._reconnect_delay)

    def _capture_rtsp(self):
        if not _CV2_AVAILABLE:
            logger.error("OpenCV (cv2) requis pour le flux RTSP - pip install opencv-python-headless")
            self._running = False
            return

        logger.info(f"Connexion RTSP : {self._rtsp_url}")
        cap = cv2.VideoCapture(self._rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # réduit la latence
        if not cap.isOpened():
            logger.error("Impossible d'ouvrir le flux RTSP Wyze")
            cap.release()
            return

        self._connected = True
        logger.info("Flux Wyze connecté")
        params = [cv2.IMWRITE_JPEG_QUALITY, self._quality]
        while self._running:
            ok, frame = cap.read()
            if not ok:
                logger.warning("Trame RTSP perdue")
                break
            ok, jpg = cv2.imencode(".jpg", frame, params)
            if ok:
                with self._lock:
                    self._frame = jpg.tobytes()
        cap.release()

    def _capture_picamera(self):
        try:
            from picamera2 import Picamera2
        except ImportError:
            logger.error("picamera2 non disponible")
            self._running = False
            return
        if not _CV2_AVAILABLE:
            logger.error("cv2 requis pour l'encodage JPEG")
            self._running = False
            return

        picam = Picamera2()
        res = self._cfg.get("resolution", [640, 480])
        picam.configure(picam.create_video_configuration(main={"size": tuple(res)}))
        picam.start()
        self._connected = True
        logger.info("Caméra Raspberry Pi connectée")
        params = [cv2.IMWRITE_JPEG_QUALITY, self._quality]
        while self._running:
            frame = picam.capture_array()
            ok, jpg = cv2.imencode(".jpg", frame, params)
            if ok:
                with self._lock:
                    self._frame = jpg.tobytes()
            time.sleep(1 / self._cfg.get("framerate", 15))
        picam.stop()

    # ------------------------------------------------------------------

    def get_frame(self) -> bytes | None:
        with self._lock:
            return self._frame

    def mjpeg_generator(self):
        """Générateur multipart MJPEG pour une balise <img>."""
        boundary = b"--frame\r\n"
        while True:
            frame = self.get_frame()
            if frame:
                yield boundary + b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
            time.sleep(0.04)  # ~25 fps max

    @property
    def is_connected(self) -> bool:
        return self._connected

    def stop(self):
        self._running = False
