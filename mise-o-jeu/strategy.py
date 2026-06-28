"""
Stratégie de filtrage et de calcul des mises.

Critères d'entrée:
  1. La cote (odds) est INFÉRIEURE à MAX_ODDS (par défaut 1.02).
  2. L'événement se termine en MOINS de MAX_EVENT_HOURS (par défaut 24h).

Montant de la mise: BET_FRACTION × solde total (par défaut 50%).
"""

import logging
from datetime import datetime, timedelta, timezone

import config

logger = logging.getLogger(__name__)


def filter_eligible_bets(bets: list[dict], balance: float) -> list[dict]:
    """
    Filtre les paris éligibles selon les critères de la stratégie.
    Chaque dict retourné inclut 'bet_amount' calculé.
    """
    now = datetime.now(tz=timezone.utc)
    deadline = now + timedelta(hours=config.MAX_EVENT_HOURS)
    bet_amount = round(balance * config.BET_FRACTION, 2)

    eligible = []
    for bet in bets:
        odds: float = bet.get("odds", 99.0)
        event_start: datetime | None = bet.get("event_start")

        # Critère 1 : cote strictement inférieure au seuil
        if odds >= config.MAX_ODDS:
            continue

        # Critère 2 : l'événement commence dans les prochaines MAX_EVENT_HOURS
        if event_start is None or event_start > deadline:
            continue

        # L'événement ne doit pas déjà être commencé
        if event_start <= now:
            logger.debug("Événement déjà commencé, ignoré: %s", bet["description"])
            continue

        enriched = {**bet, "bet_amount": bet_amount}
        eligible.append(enriched)
        logger.info(
            "Pari éligible — cote: %.4f | début: %s | montant: $%.2f | %s",
            odds,
            event_start.strftime("%Y-%m-%d %H:%M UTC"),
            bet_amount,
            bet["description"][:60],
        )

    logger.info("%d pari(s) éligible(s) sur %d analysé(s).", len(eligible), len(bets))
    return eligible


def summarize(bets: list[dict]) -> str:
    if not bets:
        return "Aucun pari éligible trouvé."
    lines = [f"  • {b['description'][:60]} | cote {b['odds']:.4f} | mise ${b['bet_amount']:.2f}" for b in bets]
    return "\n".join(["Paris éligibles:"] + lines)
