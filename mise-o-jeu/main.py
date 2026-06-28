"""
Mise O Jeu — Bot de paris automatisé
=====================================
Lance une vérification périodique des paris disponibles sur miseojeu.com.
Place automatiquement un pari de 50 % du solde sur tout pari dont:
  - la cote est < MAX_ODDS (défaut: 1.02)
  - l'événement commence dans moins de MAX_EVENT_HOURS (défaut: 24 h)

Usage:
  python main.py            # démarre la boucle planifiée
  python main.py --once     # une seule vérification puis quitte
  python main.py --headless false   # ouvre le navigateur (debug)
"""

import argparse
import logging
import sys
import time

import schedule

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


def run_once(headless: bool = True):
    """Effectue un cycle complet: connexion → analyse → mise(s)."""
    scraper = MiseOJeuScraper()
    try:
        scraper.start(headless=headless)

        if not scraper.login():
            logger.error("Impossible de se connecter. Cycle annulé.")
            return

        balance = scraper.get_balance()
        if balance is None:
            balance = config.FALLBACK_BALANCE
            if balance <= 0:
                logger.error("Solde illisible et FALLBACK_BALANCE non défini. Cycle annulé.")
                return
            logger.warning("Solde illisible — utilisation du solde de secours: $%.2f", balance)
        elif balance <= 0:
            logger.warning("Solde nul. Cycle annulé.")
            return

        logger.info("Solde disponible: $%.2f", balance)
        bets = scraper.fetch_available_bets()
        eligible = filter_eligible_bets(bets, balance)

        logger.info(summarize(eligible))

        for bet in eligible:
            success = scraper.place_bet(bet["id"], bet["bet_amount"])
            status = "placé" if success else "ÉCHEC"
            logger.info(
                "Pari %s: %s | cote %.4f | $%.2f",
                status, bet["description"][:60], bet["odds"], bet["bet_amount"],
            )

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

    if args.once:
        run_once(headless=headless)
        return

    # Boucle planifiée
    logger.info("Vérification toutes les %d minutes.", config.CHECK_INTERVAL_MINUTES)
    schedule.every(config.CHECK_INTERVAL_MINUTES).minutes.do(run_once, headless=headless)

    # Premier cycle immédiat
    run_once(headless=headless)

    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
