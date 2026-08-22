"""
Détection de personnes et d'animaux sur le flux caméra (sécurité).

Utilise MediaPipe Object Detection (modèle EfficientDet-Lite). À chaque
détection d'une classe surveillée (personne, chat, chien) avec une confiance
suffisante, notifie le moniteur de sécurité qui coupe la lame.

Le détecteur tourne à basse fréquence (quelques images/s) car l'inférence est
coûteuse. Optionnel : si MediaPipe/OpenCV manquent, il se désactive proprement
et la sécurité repose alors sur l'IMU et le pare-chocs.
"""
import threading
import time

try:
    import cv2
    import numpy as np
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    _MP_AVAILABLE = True
except ImportError:
    _MP_AVAILABLE = False

from src.utils import logger

MODEL_PATH = "models/efficientdet_lite0.tflite"


class PersonAnimalDetector:
    def __init__(self, config: dict, camera, safety_monitor):
        cfg = config or {}
        self._cfg = cfg
        self._camera = camera
        self._safety = safety_monitor
        self._enabled = cfg.get("enabled", True)
        self._min_conf = cfg.get("min_confidence", 0.5)
        self._classes = set(cfg.get("classes", ["person", "cat", "dog"]))
        self._fps = cfg.get("fps", 4)
        self._model_path = cfg.get("model_path", MODEL_PATH)
        self._running = False
        self._thread: threading.Thread | None = None
        self._detector = None

    def start(self):
        if not self._enabled:
            logger.info("Détection personne/animal désactivée")
            return
        if not (_CV2_AVAILABLE and _MP_AVAILABLE):
            logger.warning(
                "Détection personne/animal indisponible (mediapipe/opencv manquant) - "
                "la sécurité repose sur l'IMU et le pare-chocs"
            )
            return
        try:
            base = mp_python.BaseOptions(model_asset_path=self._model_path)
            options = mp_vision.ObjectDetectorOptions(
                base_options=base,
                score_threshold=self._min_conf,
                running_mode=mp_vision.RunningMode.IMAGE,
            )
            self._detector = mp_vision.ObjectDetector.create_from_options(options)
        except Exception as e:
            logger.error(f"Détecteur vision : échec de chargement du modèle ({e})")
            return

        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info(f"Détection personne/animal active ({', '.join(self._classes)})")

    def _loop(self):
        period = 1.0 / max(self._fps, 1)
        while self._running:
            start = time.time()
            self._detect_once()
            elapsed = time.time() - start
            time.sleep(max(0, period - elapsed))

    def _detect_once(self):
        jpeg = self._camera.get_frame() if self._camera else None
        if not jpeg:
            return
        try:
            arr = np.frombuffer(jpeg, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is None:
                return
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = self._detector.detect(mp_image)
            detected = self._result_has_target(result)
            self._safety.set_person_detected(detected)
        except Exception as e:
            logger.debug(f"Détection échouée : {e}")

    def _result_has_target(self, result) -> bool:
        for det in getattr(result, "detections", []):
            for cat in det.categories:
                if cat.category_name in self._classes and cat.score >= self._min_conf:
                    return True
        return False

    def stop(self):
        self._running = False
