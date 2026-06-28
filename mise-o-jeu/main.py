"""
Mise O Jeu — Bot de paris automatisé
=====================================
Se connecte une fois, puis vérifie les paris toutes les 5 minutes
sans fermer le navigateur. Le navigateur reste ouvert entre les cycles.

Usage:
  python main.py                    # boucle continue (navigateur caché)
  python main.py --headless false   # boucle avec navigateur visible
  python main.py --once             # un seul cycle puis quitte
"""

import argparse
import logging
import sys
import time

import config
from scraper import MiseOJeuScraper
from strategy import filter_eligible_bets, summarize

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("mise_o_jeu.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

RETRY_INTERVAL_SECONDS = 5 * 60  # 5 minutes entre chaque vérification


def get_balance(scraper: MiseOJeuScraper) -> float:
    balance = scraper.get_balance()
    if balance is None:
        balance = config.FALLBACK_BALANCE
        if balance <= 0:
            raise RuntimeError("Solde illisible et FALLBACK_BALANCE non défini.")
        logger.warning("Solde illisible — utilisation du solde de secours: $%.2f", balance)
    return balance


def check_and_bet(scraper: MiseOJeuScraper) -> bool:
    """
    Vérifie les paris et place une mise si éligible.
    Retourne True si au moins un pari a été traité.
    """
    balance = get_balance(scraper)
    if balance <= 0:
        logger.warning("Solde nul ($%.2f). Pas de mise possible.", balance)
        return False

    logger.info("Solde disponible: $%.2f", balance)
    bets = scraper.fetch_available_bets()
    eligible = filter_eligible_bets(bets, balance)
    logger.info(summarize(eligible))

    if not eligible:
        return False

    for bet in eligible:
        success = scraper.place_bet(bet["id"], bet["bet_amount"])
        status = "placé" if success else "ÉCHEC"
        logger.info(
            "Pari %s: %s | cote %.4f | $%.2f",
            status, bet["description"][:60], bet["odds"], bet["bet_amount"],
        )
    return True


def run_session(headless: bool = True, once: bool = False):
    """
    Ouvre le navigateur, se connecte, puis tourne en boucle.
    Si aucun pari éligible: attend 5 min et revérifie (navigateur reste ouvert).
    """
    scraper = MiseOJeuScraper()
    try:
        scraper.start(headless=headless)

        if not scraper.login():
            logger.error("Impossible de se connecter. Arrêt.")
            return

        while True:
            try:
                check_and_bet(scraper)
            except RuntimeError as exc:
                logger.error("%s", exc)
                break
            except Exception as exc:
                logger.error("Erreur inattendue: %s", exc)

            if once:
                break

            logger.info(
                "Prochain contrôle dans %d minutes. Navigateur maintenu ouvert…",
                RETRY_INTERVAL_SECONDS // 60,
            )
            time.sleep(RETRY_INTERVAL_SECONDS)

    except KeyboardInterrupt:
        logger.info("Arrêt demandé par l'utilisateur.")
    finally:
        scraper.stop()


def main():
    parser = argparse.ArgumentParser(description="Bot de paris Mise O Jeu")
    parser.add_argument("--once", action="store_true", help="Un seul cycle puis quitte")
    parser.add_argument("--headless", default="true", choices=["true", "false"],
                        help="Mode sans fenêtre (défaut: true)")
    args = parser.parse_args()

    headless = args.headless.lower() == "true"

    if config.DRY_RUN:
        logger.info("=== MODE SIMULATION (DRY_RUN=true) — aucun vrai pari ne sera placé ===")

    logger.info(
        "Configuration: MAX_ODDS=%.4f | MAX_EVENT_HOURS=%dh | BET_FRACTION=%.0f%%",
        config.MAX_ODDS, config.MAX_EVENT_HOURS, config.BET_FRACTION * 100,
    )

    run_session(headless=headless, once=args.once)


if __name__ == "__main__":
    main()
