"""
Algorithme de tonte autonome guidé par GPS RTK.
La zone de tonte est définie par un polygone GPS enregistré via l'interface web.
Le robot tond en bandes parallèles et reste strictement dans la zone définie.
"""
import math
import time
import threading
import json
from pathlib import Path
from enum import Enum, auto

from src.hardware.gps_rtk import GPSPosition, RTKStatus, distance_m, bearing_to, point_in_polygon
from src.utils import logger, get_config

ZONES_FILE = Path(__file__).parent.parent.parent / "config" / "mowing_zones.json"


class GPSMowingState(Enum):
    IDLE          = auto()
    WAITING_RTK   = auto()   # Attente du fix RTK
    NAVIGATING    = auto()   # Navigation vers prochain point
    MOWING        = auto()   # Tonte en cours
    TURNING       = auto()   # Demi-tour en fin de bande
    RETURNING     = auto()   # Retour au point de départ
    DONE          = auto()
    ABORTED       = auto()


class GPSMowingController:
    """Tonte autonome guidée par GPS RTK avec délimitation polygonale."""

    # Tolérances de navigation
    WAYPOINT_TOLERANCE = 0.3   # mètres - distance pour valider un waypoint
    HEADING_TOLERANCE  = 8.0   # degrés - tolérance de cap
    BOUNDARY_MARGIN    = 0.5   # mètres - marge de sécurité à la bordure

    def __init__(self, robot, gps_module):
        self._robot = robot
        self._gps = gps_module
        self._state = GPSMowingState.IDLE
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._waypoints: list[tuple[float, float]] = []
        self._current_wp = 0
        self._zone: list[tuple[float, float]] = []
        self._strip_count = 0
        self._cfg = get_config().get("mowing", {})

        self._load_zone()

    def _load_zone(self):
        if ZONES_FILE.exists():
            with open(ZONES_FILE) as f:
                data = json.load(f)
                self._zone = [(p["lat"], p["lon"]) for p in data.get("boundary", [])]
            logger.info(f"Zone de tonte chargée : {len(self._zone)} points")
        else:
            logger.warning("Aucune zone de tonte définie - utiliser l'interface web pour tracer la zone")

    def save_zone(self, points: list[dict]):
        """Sauvegarde la zone définie depuis l'interface web."""
        ZONES_FILE.parent.mkdir(exist_ok=True)
        with open(ZONES_FILE, "w") as f:
            json.dump({"boundary": points}, f, indent=2)
        self._zone = [(p["lat"], p["lon"]) for p in points]
        logger.info(f"Zone de tonte sauvegardée : {len(self._zone)} points")

    def _generate_waypoints(self) -> list[tuple[float, float]]:
        """Génère une grille de waypoints en bandes parallèles dans la zone."""
        if len(self._zone) < 3:
            return []

        strip_m = self._cfg.get("strip_width", 30) / 100  # cm → m en degrés
        # Largeur en degrés de latitude (~111 km par degré)
        strip_lat = strip_m / 111000

        lats = [p[0] for p in self._zone]
        lons = [p[1] for p in self._zone]
        lat_min, lat_max = min(lats), max(lats)
        lon_min, lon_max = min(lons), max(lons)

        waypoints = []
        lat = lat_min + strip_lat / 2
        band = 0

        while lat < lat_max:
            # Trouver les bornes de longitude pour cette bande
            pts_in_band = []
            test_lons = [lon_min + (lon_max - lon_min) * i / 100 for i in range(101)]
            for tlon in test_lons:
                if point_in_polygon(lat, tlon, self._zone):
                    pts_in_band.append(tlon)

            if pts_in_band:
                lon_start = min(pts_in_band) + self.BOUNDARY_MARGIN / 111000
                lon_end   = max(pts_in_band) - self.BOUNDARY_MARGIN / 111000
                # Alterner gauche-droite
                if band % 2 == 0:
                    waypoints.append((lat, lon_start))
                    waypoints.append((lat, lon_end))
                else:
                    waypoints.append((lat, lon_end))
                    waypoints.append((lat, lon_start))

            lat += strip_lat
            band += 1

        logger.info(f"Trajectoire générée : {len(waypoints)} waypoints, {band} bandes")
        return waypoints

    def start(self):
        if not self._zone:
            logger.error("Impossible de démarrer : aucune zone de tonte définie")
            return False
        if self._thread and self._thread.is_alive():
            return False

        self._stop_event.clear()
        self._waypoints = self._generate_waypoints()
        if not self._waypoints:
            logger.error("Impossible de générer la trajectoire")
            return False

        self._current_wp = 0
        self._strip_count = 0
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info("Tonte GPS RTK démarrée")
        return True

    def stop(self):
        self._stop_event.set()
        self._robot.motors.stop()
        self._robot.blade.stop()
        self._state = GPSMowingState.ABORTED
        logger.info("Tonte GPS arrêtée")

    def _run(self):
        # 1. Attendre un fix RTK
        self._state = GPSMowingState.WAITING_RTK
        logger.info("Attente du fix GPS RTK...")
        timeout = time.time() + 120
        while not self._stop_event.is_set():
            pos = self._gps.position
            if pos.is_usable:
                logger.info(f"Fix GPS : {pos.status.name} (HDOP={pos.hdop:.1f})")
                break
            if time.time() > timeout:
                logger.error("Timeout fix GPS - tonte annulée")
                self._state = GPSMowingState.ABORTED
                return
            time.sleep(1)

        # 2. Démarrer la lame
        self._robot.blade_start()
        time.sleep(2)

        # 3. Naviguer vers chaque waypoint
        self._state = GPSMowingState.MOWING
        while self._current_wp < len(self._waypoints) and not self._stop_event.is_set():
            target = self._waypoints[self._current_wp]
            logger.info(f"Waypoint {self._current_wp+1}/{len(self._waypoints)} → {target}")
            success = self._navigate_to(target)
            if success:
                self._current_wp += 1
                if self._current_wp % 2 == 0:
                    self._strip_count += 1
                    logger.info(f"Bande {self._strip_count} terminée")
            else:
                logger.warning(f"Waypoint {self._current_wp} non atteint - abandon")
                break

        # 4. Retour au point de départ
        if self._waypoints and not self._stop_event.is_set():
            self._state = GPSMowingState.RETURNING
            self._navigate_to(self._waypoints[0])

        self._robot.motors.stop()
        self._robot.blade.stop()
        self._state = GPSMowingState.DONE
        logger.info(f"Tonte GPS terminée - {self._strip_count} bandes")

    def _navigate_to(self, target: tuple[float, float], timeout: float = 120) -> bool:
        """Navigue vers un waypoint GPS. Retourne True si atteint."""
        deadline = time.time() + timeout
        fwd_speed = self._cfg.get("forward_speed", 50)
        turn_speed = self._cfg.get("turn_speed", 35)

        while not self._stop_event.is_set() and time.time() < deadline:
            pos = self._gps.position

            # Sécurité : sortie de zone
            if not point_in_polygon(pos.lat, pos.lon, self._zone):
                logger.warning("Robot hors zone ! Arrêt immédiat.")
                self._robot.motors.stop()
                time.sleep(0.5)
                return False

            dist = distance_m(pos.lat, pos.lon, target[0], target[1])
            if dist < self.WAYPOINT_TOLERANCE:
                self._robot.motors.stop()
                return True

            target_bearing = bearing_to(pos.lat, pos.lon, target[0], target[1])
            heading_error = (target_bearing - pos.heading + 180) % 360 - 180

            # Correction de cap proportionnelle
            angular = max(-turn_speed, min(turn_speed, heading_error * 0.6))
            linear = fwd_speed * max(0.3, 1 - abs(heading_error) / 90)

            # Obstacle devant : arrêt
            if self._robot.sensors.obstacle_ahead():
                self._robot.motors.stop()
                time.sleep(0.3)
                continue

            self._robot.motors.move(linear, angular)
            time.sleep(0.1)

        self._robot.motors.stop()
        return False

    @property
    def state(self) -> str:
        return self._state.name

    @property
    def progress(self) -> dict:
        total = len(self._waypoints)
        pos = self._gps.position
        return {
            "state": self._state.name,
            "waypoint": self._current_wp,
            "total_waypoints": total,
            "strips_done": self._strip_count,
            "progress_pct": round(self._current_wp / total * 100) if total else 0,
            "gps_status": pos.status.name,
            "gps_lat": pos.lat,
            "gps_lon": pos.lon,
            "gps_hdop": pos.hdop,
            "gps_satellites": pos.satellites,
        }
