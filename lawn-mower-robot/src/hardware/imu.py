"""
Capteur d'inclinaison / soulèvement - accéléromètre MPU6050 (I2C).

Détecte si le robot est incliné anormalement, soulevé ou renversé →
signal de sécurité pour couper la lame immédiatement.
"""
import math

try:
    from smbus2 import SMBus
    _I2C_AVAILABLE = True
except ImportError:
    _I2C_AVAILABLE = False

from src.utils import logger

# Registres MPU6050
_PWR_MGMT_1 = 0x6B
_ACCEL_XOUT_H = 0x3B


class IMUSensor:
    def __init__(self, config: dict):
        self._cfg = config or {}
        self._addr = self._cfg.get("i2c_address", 0x68)
        self._bus_num = self._cfg.get("i2c_bus", 1)
        self._tilt_threshold = self._cfg.get("tilt_threshold", 35)  # degrés
        self._bus = None
        self._pitch = 0.0
        self._roll = 0.0

        if _I2C_AVAILABLE and self._cfg.get("enabled", False):
            try:
                self._bus = SMBus(self._bus_num)
                self._bus.write_byte_data(self._addr, _PWR_MGMT_1, 0)  # réveil
                logger.info("IMU MPU6050 initialisé")
            except Exception as e:
                logger.error(f"IMU : échec d'initialisation ({e})")
                self._bus = None
        else:
            logger.warning("IMU : mode simulation (à plat)")

    def _read_word(self, reg: int) -> int:
        hi = self._bus.read_byte_data(self._addr, reg)
        lo = self._bus.read_byte_data(self._addr, reg + 1)
        val = (hi << 8) + lo
        return val - 65536 if val >= 0x8000 else val

    def read(self) -> tuple[float, float]:
        """Retourne (pitch, roll) en degrés. (0, 0) = à plat."""
        if not self._bus:
            return (0.0, 0.0)
        try:
            ax = self._read_word(_ACCEL_XOUT_H) / 16384.0
            ay = self._read_word(_ACCEL_XOUT_H + 2) / 16384.0
            az = self._read_word(_ACCEL_XOUT_H + 4) / 16384.0
            self._pitch = math.degrees(math.atan2(ax, math.sqrt(ay * ay + az * az)))
            self._roll = math.degrees(math.atan2(ay, math.sqrt(ax * ax + az * az)))
        except Exception as e:
            logger.debug(f"IMU lecture échouée : {e}")
        return (self._pitch, self._roll)

    def is_tilted(self) -> bool:
        """Vrai si l'inclinaison dépasse le seuil (robot soulevé/renversé)."""
        pitch, roll = self.read()
        return abs(pitch) > self._tilt_threshold or abs(roll) > self._tilt_threshold

    @property
    def angles(self) -> dict:
        return {"pitch": round(self._pitch, 1), "roll": round(self._roll, 1)}

    def cleanup(self):
        if self._bus:
            self._bus.close()
