"""
Mise O Jeu — Bot de paris 100% autonome
========================================
Boucle infinie avec reconnexion automatique, vérification des résultats
et rapport continu. Aucune intervention humaine requise après démarrage.

Usage:
  python main.py                      # démarrage autonome (navigateur caché)
  python main.py --headless false     # avec navigateur visible
  python main.py --report             # rapport des gains uniquement
  python main.py --report --sim       # rapport simulation uniquement
  python main.py --report --real      # rapport vrais paris uniquement
  python main.py --result 3 --won     # marquer pari #3 comme gagné
  python main.py --result 3 --lost    # marquer pari #3 comme perdu
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

CHECK_INTERVAL = 5 * 60        # 5 min entre vérifications de paris
RESULT_CHECK_INTERVAL = 30 * 60  # 30 min entre vérifications des résultats
MAX_ERRORS = 5                  # erreurs consécutives avant pause longue
LONG_PAUSE = 15 * 60           # pause longue en cas d'erreurs répétées


def get_balance(scraper: MiseOJeuScraper) -> float:
    balance = scraper.get_balance()
    if balance is None:
        balance = config.FALLBACK_BALANCE
        if balance <= 0:
            raise RuntimeError("Solde illisible et FALLBACK_BALANCE non défini.")
        logger.warning("Solde illisible — utilisation du solde de secours: $%.2f", balance)
    return balance


def run_bet_cycle(scraper: MiseOJeuScraper) -> bool:
    """Un cycle: lire le solde → chercher les paris → miser si ≥ MIN_BETS."""
    balance = get_balance(scraper)
    if balance <= 0:
        logger.warning("Solde nul. Pas de mise possible.")
        return False

    logger.info("Solde: $%.2f", balance)
    bets = scraper.fetch_available_bets()
    eligible = filter_eligible_bets(bets, balance)
    logger.info(summarize(eligible))

    if len(eligible) < config.MIN_BETS_TO_PLACE:
        logger.info(
            "%d/%d paris éligibles — minimum non atteint. Prochain contrôle dans %d min.",
            len(eligible), config.MIN_BETS_TO_PLACE, CHECK_INTERVAL // 60,
        )
        return False

    logger.info("%d paris éligibles. Placement en cours…", len(eligible))
    total_stake = total_return = 0.0
    for bet in eligible:
        success = scraper.place_bet(bet["id"], bet["bet_amount"])
        if success:
            tracker.record_bet(bet, bet["bet_amount"], dry_run=config.DRY_RUN)
            total_stake += bet["bet_amount"]
            total_return += bet["bet_amount"] * bet["odds"]
        logger.info(
            "  [%s] %s | cote %.3f | $%.2f",
            "OK" if success else "ECHEC",
            bet["description"][:55], bet["odds"], bet["bet_amount"],
        )

    mode = "SIMULATION" if config.DRY_RUN else "RÉEL"
    logger.info(
        "[%s] Misé: $%.2f | Retour potentiel: $%.2f | Gain potentiel: $%.2f",
        mode, total_stake, total_return, total_return - total_stake,
    )
    return True


def run_result_check(scraper: MiseOJeuScraper):
    """Vérifie les paris réglés sur le site et met à jour le tracker."""
    logger.info("Vérification automatique des résultats…")
    settled = scraper.fetch_settled_bets()
    if not settled:
        return

    updated = tracker.auto_update_from_history(settled)
    if updated:
        logger.info("%d résultat(s) mis à jour automatiquement.", updated)
        tracker.print_report()


def run_autonomous(headless: bool = True):
    """
    Boucle principale autonome.
    - Reconnexion automatique si session expirée
    - Récupération sur erreur avec backoff exponentiel
    - Vérification des résultats toutes les 30 min
    """
    scraper = MiseOJeuScraper()
    consecutive_errors = 0
    last_result_check = 0.0

    logger.info("Démarrage du bot autonome.")
    scraper.start(headless=headless)

    try:
        if not scraper.login():
            logger.error("Connexion initiale impossible. Vérifiez vos identifiants dans .env")
            return

        while True:
            try:
                # Vérifier la session avant chaque cycle
                if not scraper.ensure_logged_in():
                    logger.error("Reconnexion échouée. Pause de %d min.", LONG_PAUSE // 60)
                    time.sleep(LONG_PAUSE)
                    continue

                # Vérification des résultats toutes les 30 min
                now = time.time()
                if now - last_result_check >= RESULT_CHECK_INTERVAL:
                    run_result_check(scraper)
                    last_result_check = time.time()

                # Cycle de paris
                run_bet_cycle(scraper)
                consecutive_errors = 0

            except KeyboardInterrupt:
                raise

            except RuntimeError as exc:
                logger.error("Erreur fatale: %s", exc)
                break

            except Exception as exc:
                consecutive_errors += 1
                wait = min(LONG_PAUSE, 60 * (2 ** consecutive_errors))
                logger.error(
                    "Erreur #%d: %s — pause de %ds avant de réessayer.",
                    consecutive_errors, exc, wait,
                )
                if consecutive_errors >= MAX_ERRORS:
                    logger.error(
                        "%d erreurs consécutives. Pause longue de %d min.",
                        MAX_ERRORS, LONG_PAUSE // 60,
                    )
                    time.sleep(LONG_PAUSE)
                    consecutive_errors = 0
                else:
                    time.sleep(wait)
                continue

            time.sleep(CHECK_INTERVAL)

    except KeyboardInterrupt:
        logger.info("Arrêt demandé.")
    finally:
        scraper.stop()
        logger.info("=== Rapport final ===")
        tracker.print_report()


def main():
    parser = argparse.ArgumentParser(description="Bot de paris Mise O Jeu — 100% autonome")
    parser.add_argument("--headless", default="true", choices=["true", "false"],
                        help="Cacher le navigateur (défaut: true)")
    parser.add_argument("--report", action="store_true", help="Afficher le rapport et quitter")
    parser.add_argument("--sim", action="store_true", help="Rapport simulation seulement")
    parser.add_argument("--real", action="store_true", help="Rapport vrais paris seulement")
    parser.add_argument("--result", type=int, metavar="INDEX",
                        help="Index du pari dont on veut enregistrer le résultat")
    parser.add_argument("--won", action="store_true")
    parser.add_argument("--lost", action="store_true")
    args = parser.parse_args()

    if args.report:
        dry_run_filter = True if args.sim else (False if args.real else None)
        tracker.print_report(dry_run_only=dry_run_filter)
        return

    if args.result is not None:
        if not args.won and not args.lost:
            print("Précisez --won ou --lost.")
            return
        tracker.mark_result(args.result, won=args.won)
        tracker.print_report()
        return

    headless = args.headless.lower() == "true"

    if config.DRY_RUN:
        logger.info("=== MODE SIMULATION (DRY_RUN=true) ===")
    else:
        logger.info("=== MODE RÉEL — Les paris seront placés ===")

    logger.info(
        "Config: MAX_ODDS=%.3f | MAX_EVENT_HOURS=%dh | BET_FRACTION=%.0f%% | MIN_BETS=%d",
        config.MAX_ODDS, config.MAX_EVENT_HOURS, config.BET_FRACTION * 100, config.MIN_BETS_TO_PLACE,
    )
    logger.info("Vérification toutes les %d min | Résultats toutes les %d min.",
                CHECK_INTERVAL // 60, RESULT_CHECK_INTERVAL // 60)

    run_autonomous(headless=headless)


if __name__ == "__main__":
    main()
