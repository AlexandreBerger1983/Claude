"""
Interface GPS RTK - u-blox ZED-F9P via UART/USB.
Précision centimétrique en mode RTK Fix.
Supporte les corrections NTRIP (internet) ou base station locale.
"""
import math
import threading
import time
import socket
import base64
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable

try:
    import serial
    import pynmea2
    _SERIAL_AVAILABLE = True
except ImportError:
    _SERIAL_AVAILABLE = False

from src.utils import logger


class RTKStatus(Enum):
    NO_FIX      = 0   # Pas de signal
    GPS_FIX     = 1   # GPS standard (~3m)
    DGPS_FIX    = 2   # GPS différentiel (~1m)
    RTK_FLOAT   = 5   # RTK flottant (~30cm)
    RTK_FIX     = 4   # RTK fixe (~2cm) ← idéal pour la tonte


@dataclass
class GPSPosition:
    lat: float = 0.0        # latitude degrés décimaux
    lon: float = 0.0        # longitude degrés décimaux
    alt: float = 0.0        # altitude mètres
    heading: float = 0.0    # cap en degrés (0=Nord)
    speed: float = 0.0      # vitesse m/s
    status: RTKStatus = RTKStatus.NO_FIX
    hdop: float = 99.0      # précision horizontale (< 1.5 = bon)
    satellites: int = 0
    timestamp: float = field(default_factory=time.time)

    @property
    def is_rtk_fix(self) -> bool:
        return self.status == RTKStatus.RTK_FIX

    @property
    def is_usable(self) -> bool:
        return self.status in (RTKStatus.RTK_FLOAT, RTKStatus.RTK_FIX)


class NTRIPClient:
    """Client NTRIP pour corrections RTK via internet (gratuit au Canada via NRCAN)."""

    def __init__(self, host: str, port: int, mountpoint: str,
                 user: str = "anonymous", password: str = ""):
        self._host = host
        self._port = port
        self._mountpoint = mountpoint
        self._auth = base64.b64encode(f"{user}:{password}".encode()).decode()
        self._sock: socket.socket | None = None
        self._running = False
        self._thread: threading.Thread | None = None
        self._rtcm_callback: Callable | None = None

    def connect(self, rtcm_callback: Callable):
        self._rtcm_callback = rtcm_callback
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info(f"NTRIP connexion vers {self._host}:{self._port}/{self._mountpoint}")

    def _run(self):
        while self._running:
            try:
                self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self._sock.connect((self._host, self._port))
                request = (
                    f"GET /{self._mountpoint} HTTP/1.0\r\n"
                    f"User-Agent: Johnny-Mow/1.0\r\n"
                    f"Authorization: Basic {self._auth}\r\n"
                    f"\r\n"
                )
                self._sock.send(request.encode())
                response = self._sock.recv(1024).decode(errors="ignore")
                if "200 OK" not in response and "ICY 200 OK" not in response:
                    logger.error(f"NTRIP refusé : {response[:100]}")
                    time.sleep(10)
                    continue
                logger.info("NTRIP connecté - corrections RTK reçues")
                while self._running:
                    data = self._sock.recv(4096)
                    if not data:
                        break
                    if self._rtcm_callback:
                        self._rtcm_callback(data)
            except Exception as e:
                logger.warning(f"NTRIP déconnecté : {e} - reconnexion dans 5s")
                time.sleep(5)

    def disconnect(self):
        self._running = False
        if self._sock:
            self._sock.close()


class GPSRTKModule:
    """Interface avec le module u-blox ZED-F9P."""

    def __init__(self, config: dict):
        self._cfg = config
        self._port = config.get("port", "/dev/ttyUSB0")
        self._baud = config.get("baud", 115200)
        self._position = GPSPosition()
        self._lock = threading.Lock()
        self._running = False
        self._serial = None
        self._thread: threading.Thread | None = None
        self._ntrip: NTRIPClient | None = None
        self._position_callbacks: list[Callable] = []

        ntrip_cfg = config.get("ntrip", {})
        if ntrip_cfg.get("enabled"):
            self._ntrip = NTRIPClient(
                host=ntrip_cfg["host"],
                port=ntrip_cfg.get("port", 2101),
                mountpoint=ntrip_cfg["mountpoint"],
                user=ntrip_cfg.get("user", "anonymous"),
                password=ntrip_cfg.get("password", ""),
            )

    def start(self):
        if not _SERIAL_AVAILABLE:
            logger.warning("GPS RTK : mode simulation (pyserial/pynmea2 non installé)")
            self._simulate()
            return

        try:
            self._serial = serial.Serial(self._port, self._baud, timeout=1)
            self._running = True
            self._thread = threading.Thread(target=self._read_loop, daemon=True)
            self._thread.start()

            if self._ntrip:
                self._ntrip.connect(self._send_rtcm_to_gps)

            logger.info(f"GPS RTK démarré sur {self._port} @ {self._baud} baud")
        except serial.SerialException as e:
            logger.error(f"GPS RTK impossible d'ouvrir {self._port} : {e}")

    def _read_loop(self):
        buffer = ""
        while self._running:
            try:
                line = self._serial.readline().decode("ascii", errors="ignore").strip()
                if not line.startswith("$"):
                    continue
                self._parse_nmea(line)
            except Exception as e:
                logger.debug(f"GPS parse error : {e}")

    def _parse_nmea(self, sentence: str):
        try:
            msg = pynmea2.parse(sentence)
        except pynmea2.ParseError:
            return

        with self._lock:
            pos = self._position

            if isinstance(msg, pynmea2.GGA):
                if msg.latitude and msg.longitude:
                    pos.lat = msg.latitude
                    pos.lon = msg.longitude
                    pos.alt = float(msg.altitude or 0)
                    pos.satellites = int(msg.num_sats or 0)
                    pos.hdop = float(msg.horizontal_dil or 99)
                    quality_map = {
                        0: RTKStatus.NO_FIX,
                        1: RTKStatus.GPS_FIX,
                        2: RTKStatus.DGPS_FIX,
                        4: RTKStatus.RTK_FIX,
                        5: RTKStatus.RTK_FLOAT,
                    }
                    pos.status = quality_map.get(int(msg.gps_qual or 0), RTKStatus.NO_FIX)
                    pos.timestamp = time.time()

            elif isinstance(msg, pynmea2.RMC):
                if msg.spd_over_grnd is not None:
                    pos.speed = float(msg.spd_over_grnd) * 0.514444  # noeuds → m/s
                if msg.true_course:
                    pos.heading = float(msg.true_course)

        for cb in self._position_callbacks:
            cb(self.position)

    def _send_rtcm_to_gps(self, rtcm_data: bytes):
        if self._serial and self._serial.is_open:
            self._serial.write(rtcm_data)

    def _simulate(self):
        """Simulation GPS pour tests sans matériel."""
        def _sim_loop():
            lat, lon = 45.5017, -73.5673  # Montréal
            i = 0
            while True:
                with self._lock:
                    self._position = GPSPosition(
                        lat=lat + i * 0.000001,
                        lon=lon + i * 0.000001,
                        alt=30.0,
                        heading=(i * 5) % 360,
                        speed=0.3,
                        status=RTKStatus.RTK_FIX,
                        hdop=0.8,
                        satellites=12,
                    )
                i += 1
                time.sleep(0.2)
        threading.Thread(target=_sim_loop, daemon=True).start()

    def add_position_callback(self, cb: Callable):
        self._position_callbacks.append(cb)

    @property
    def position(self) -> GPSPosition:
        with self._lock:
            return GPSPosition(
                lat=self._position.lat,
                lon=self._position.lon,
                alt=self._position.alt,
                heading=self._position.heading,
                speed=self._position.speed,
                status=self._position.status,
                hdop=self._position.hdop,
                satellites=self._position.satellites,
                timestamp=self._position.timestamp,
            )

    def stop(self):
        self._running = False
        if self._ntrip:
            self._ntrip.disconnect()
        if self._serial and self._serial.is_open:
            self._serial.close()


# ---------------------------------------------------------------------------
# Utilitaires géographiques
# ---------------------------------------------------------------------------

EARTH_R = 6371000  # mètres

def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance Haversine entre deux points GPS en mètres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return 2 * EARTH_R * math.asin(math.sqrt(a))

def bearing_to(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Cap en degrés (0=Nord) de (lat1,lon1) vers (lat2,lon2)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlam = math.radians(lon2 - lon1)
    x = math.sin(dlam) * math.cos(phi2)
    y = math.cos(phi1)*math.sin(phi2) - math.sin(phi1)*math.cos(phi2)*math.cos(dlam)
    return (math.degrees(math.atan2(x, y)) + 360) % 360

def point_in_polygon(lat: float, lon: float, polygon: list[tuple]) -> bool:
    """Ray-casting : vérifie si un point est dans le polygone de la pelouse."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > lon) != (yj > lon)) and (lat < (xj - xi)*(lon - yi)/(yj - yi) + xi):
            inside = not inside
        j = i
    return inside
