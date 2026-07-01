"""
Mise O Jeu — Bot de paris automatisé
=====================================
Se connecte une fois, puis vérifie les paris toutes les 5 minutes
sans fermer le navigateur. Le navigateur reste ouvert entre les cycles.

Usage:
  python main.py                      # boucle continue (navigateur caché)
  python main.py --headless false     # boucle avec navigateur visible
  python main.py --once               # un seul cycle puis quitte
  python main.py --report             # affiche le rapport sans lancer le bot
  python main.py --report --sim       # rapport simulation uniquement
  python main.py --report --real      # rapport vrais paris uniquement
  python main.py --result 3 --won     # marquer le pari #3 comme gagné
  python main.py --result 3 --lost    # marquer le pari #3 comme perdu
"""

import argparse
import logging
import sys
import time

import config
import tracker
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

RETRY_INTERVAL_SECONDS = 5 * 60


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
    Vérifie les paris et place les mises si au moins MIN_BETS_TO_PLACE
    paris éligibles sont trouvés. Retourne True si des paris ont été placés.
    """
    balance = get_balance(scraper)
    if balance <= 0:
        logger.warning("Solde nul ($%.2f). Pas de mise possible.", balance)
        return False

    logger.info("Solde disponible: $%.2f", balance)
    bets = scraper.fetch_available_bets()
    eligible = filter_eligible_bets(bets, balance)
    logger.info(summarize(eligible))

    if len(eligible) < config.MIN_BETS_TO_PLACE:
        logger.info(
            "%d pari(s) éligible(s) trouvé(s) — minimum requis: %d. On attend.",
            len(eligible), config.MIN_BETS_TO_PLACE,
        )
        return False

    logger.info(
        "%d paris éligibles trouvés (>= %d). Placement en cours…",
        len(eligible), config.MIN_BETS_TO_PLACE,
    )

    placed = False
    for bet in eligible:
        success = scraper.place_bet(bet["id"], bet["bet_amount"])
        status = "placé" if success else "ÉCHEC"
        logger.info(
            "Pari %s: %s | cote %.4f | $%.2f",
            status, bet["description"][:60], bet["odds"], bet["bet_amount"],
        )
        if success:
            tracker.record_bet(bet, bet["bet_amount"], dry_run=config.DRY_RUN)
            placed = True

    if placed:
        # Afficher un mini-rapport après chaque série de mises
        _print_session_summary(eligible)

    return placed


def _print_session_summary(eligible: list[dict]) -> None:
    total_stake = sum(b["bet_amount"] for b in eligible)
    total_potential = sum(b["bet_amount"] * b["odds"] for b in eligible)
    total_profit = total_potential - total_stake
    mode = "SIMULATION" if config.DRY_RUN else "RÉEL"
    logger.info(
        "[%s] Résumé session — Misé: $%.2f | Retour potentiel: $%.2f | Gain potentiel: $%.2f",
        mode, total_stake, total_potential, total_profit,
    )


def run_session(headless: bool = True, once: bool = False):
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
        # Rapport automatique à la fin de chaque session
        logger.info("=== Rapport de fin de session ===")
        tracker.print_report()


def main():
    parser = argparse.ArgumentParser(description="Bot de paris Mise O Jeu")
    parser.add_argument("--once", action="store_true", help="Un seul cycle puis quitte")
    parser.add_argument("--headless", default="true", choices=["true", "false"])
    parser.add_argument("--report", action="store_true", help="Afficher le rapport et quitter")
    parser.add_argument("--sim", action="store_true", help="Rapport simulation seulement")
    parser.add_argument("--real", action="store_true", help="Rapport vrais paris seulement")
    parser.add_argument("--result", type=int, metavar="INDEX",
                        help="Numéro du pari dont on veut enregistrer le résultat")
    parser.add_argument("--won", action="store_true", help="Marquer le pari comme gagné")
    parser.add_argument("--lost", action="store_true", help="Marquer le pari comme perdu")
    args = parser.parse_args()

    # Mode rapport uniquement
    if args.report:
        dry_run_filter = True if args.sim else (False if args.real else None)
        tracker.print_report(dry_run_only=dry_run_filter)
        return

    # Mode enregistrement de résultat
    if args.result is not None:
        if not args.won and not args.lost:
            print("Précisez --won ou --lost.")
            return
        tracker.mark_result(args.result, won=args.won)
        tracker.print_report()
        return

    headless = args.headless.lower() == "true"

    if config.DRY_RUN:
        logger.info("=== MODE SIMULATION (DRY_RUN=true) — aucun vrai pari ne sera placé ===")

    logger.info(
        "Configuration: MAX_ODDS=%.4f | MAX_EVENT_HOURS=%dh | BET_FRACTION=%.0f%% | MIN_BETS=%d",
        config.MAX_ODDS, config.MAX_EVENT_HOURS, config.BET_FRACTION * 100, config.MIN_BETS_TO_PLACE,
    )

    run_session(headless=headless, once=args.once)


if __name__ == "__main__":
    main()
