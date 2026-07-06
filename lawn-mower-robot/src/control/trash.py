"""
Sortie et rentrée automatiques des poubelles.

Séquence « sortir » : saisir le bac au cabanon → naviguer jusqu'au bord de
rue (GPS) → déposer le bac → revenir. « Rentrer » : l'inverse.

Si la navigation GPS n'est pas disponible, seules les séquences de bras sont
exécutées (l'opérateur pilote alors le déplacement à distance).
"""
from src.control.notifications import EventLevel
from src.utils import logger


class TrashController:
    def __init__(self, robot, gps_nav, config: dict, notifier=None):
        cfg = config or {}
        self._robot = robot
        self._nav = gps_nav          # GPSMowingController ou None
        self._notifier = notifier
        self._curb = cfg.get("curb")     # {"lat":..., "lon":...} bord de rue
        self._shed = cfg.get("shed")     # {"lat":..., "lon":...} rangement
        self._busy = False

    def _goto(self, point: dict | None) -> bool:
        if not point or not self._nav:
            return False
        return self._nav.navigate_to(point["lat"], point["lon"])

    def take_out(self):
        """Sort la poubelle : cabanon → bord de rue."""
        if self._busy:
            logger.warning("Poubelles : séquence déjà en cours")
            return
        self._busy = True
        try:
            logger.info("Poubelles : sortie en cours")
            self._robot.arms.pickup_trash_can()
            reached = self._goto(self._curb)
            self._robot.arms.release_trash_can()
            if self._nav:
                self._goto(self._shed)
            self._notify("Poubelles sorties",
                         "Le bac a été déposé au bord de rue." if reached
                         else "Séquence de bras exécutée (sans navigation GPS).")
            logger.info("Poubelles : sortie terminée")
        except Exception as e:
            self._notify("Erreur poubelles", f"Échec de la sortie : {e}",
                         level=EventLevel.CRITICAL)
            logger.error(f"Poubelles (sortie) : {e}")
        finally:
            self._busy = False

    def bring_in(self):
        """Rentre la poubelle : bord de rue → cabanon."""
        if self._busy:
            logger.warning("Poubelles : séquence déjà en cours")
            return
        self._busy = True
        try:
            logger.info("Poubelles : rentrée en cours")
            self._goto(self._curb)
            self._robot.arms.pickup_trash_can()
            self._goto(self._shed)
            self._robot.arms.release_trash_can()
            self._notify("Poubelles rentrées", "Le bac a été ramené au cabanon.")
            logger.info("Poubelles : rentrée terminée")
        except Exception as e:
            self._notify("Erreur poubelles", f"Échec de la rentrée : {e}",
                         level=EventLevel.CRITICAL)
            logger.error(f"Poubelles (rentrée) : {e}")
        finally:
            self._busy = False

    def _notify(self, title, message, level=EventLevel.INFO):
        if self._notifier:
            self._notifier.notify(title, message, level=level, key=title)

    @property
    def busy(self) -> bool:
        return self._busy
