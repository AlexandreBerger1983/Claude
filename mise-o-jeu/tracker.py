"""
Suivi des paris placés (simulés et réels).
Enregistre chaque mise dans bets_history.json et génère des rapports.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

HISTORY_FILE = Path("bets_history.json")


def _load() -> list[dict]:
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def _save(records: list[dict]) -> None:
    HISTORY_FILE.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")


def record_bet(bet: dict, amount: float, dry_run: bool) -> None:
    """Enregistre un pari placé (ou simulé) dans l'historique."""
    records = _load()
    records.append({
        "ts": datetime.now(tz=timezone.utc).isoformat(),
        "dry_run": dry_run,
        "description": bet.get("description", "")[:100],
        "odds": bet.get("odds", 0.0),
        "is_live": bet.get("is_live", False),
        "stake": round(amount, 2),
        "expected_return": round(amount * bet.get("odds", 1.0), 2),
        "expected_profit": round(amount * (bet.get("odds", 1.0) - 1.0), 2),
        # result: None = en attente, True = gagné, False = perdu
        "result": None,
        "actual_profit": None,
    })
    _save(records)
    logger.debug("Pari enregistré dans %s.", HISTORY_FILE)


def print_report(dry_run_only: Optional[bool] = None) -> None:
    """
    Affiche un rapport de tous les paris enregistrés.
    dry_run_only=True  → seulement les simulations
    dry_run_only=False → seulement les vrais paris
    dry_run_only=None  → tous
    """
    records = _load()
    if dry_run_only is not None:
        records = [r for r in records if r["dry_run"] == dry_run_only]

    if not records:
        print("\n  Aucun pari enregistré.")
        return

    total_stake = sum(r["stake"] for r in records)
    total_expected_profit = sum(r["expected_profit"] for r in records)
    total_expected_return = sum(r["expected_return"] for r in records)

    resolved = [r for r in records if r["result"] is not None]
    won = [r for r in resolved if r["result"] is True]
    lost = [r for r in resolved if r["result"] is False]
    actual_profit = sum(r.get("actual_profit") or 0 for r in resolved)

    sep = "─" * 70
    label = "SIMULATION" if dry_run_only else ("VRAIS PARIS" if dry_run_only is False else "TOUS LES PARIS")

    print(f"\n{'═'*70}")
    print(f"  RAPPORT — {label}")
    print(f"{'═'*70}")
    print(f"  Nombre de paris     : {len(records)}")
    print(f"  Misé au total       : ${total_stake:.2f}")
    print(f"  Retour potentiel    : ${total_expected_return:.2f}")
    print(f"  Gain potentiel      : ${total_expected_profit:.2f}")
    print(sep)
    if resolved:
        print(f"  Résultats connus    : {len(resolved)} paris")
        print(f"    Gagnés            : {len(won)}")
        print(f"    Perdus            : {len(lost)}")
        print(f"    Profit réel       : ${actual_profit:.2f}")
    else:
        print("  Résultats           : aucun résultat enregistré (utilisez --update-result)")
    print(f"{'═'*70}")

    print(f"\n  Détail des {min(len(records), 20)} derniers paris:")
    print(f"  {'Date':19} {'Type':4} {'Mise':>7} {'Cote':>6} {'G.Pot':>7} {'Résultat'}")
    print(f"  {sep}")
    for r in records[-20:]:
        ts = r["ts"][:16].replace("T", " ")
        mode = "SIM" if r["dry_run"] else "RÉEL"
        result_str = {True: "✓ Gagné", False: "✗ Perdu", None: "En attente"}[r["result"]]
        print(f"  {ts}  {mode:4}  ${r['stake']:>6.2f}  {r['odds']:>5.3f}  ${r['expected_profit']:>6.2f}  {result_str}")

    print()


def auto_update_from_history(settled: list[dict]) -> int:
    """
    Met à jour automatiquement les paris en attente à partir des résultats
    récupérés sur le site. Retourne le nombre de paris mis à jour.
    """
    records = _load()
    pending = [r for r in records if r["result"] is None]
    if not pending:
        return 0

    updated = 0
    for record in pending:
        for settled_bet in settled:
            # Correspondance par mots-clés communs dans la description
            rec_words = set(record["description"].lower().split())
            hist_words = set(settled_bet["description"].lower().split())
            common = rec_words & hist_words
            if len(common) >= 3:
                record["result"] = settled_bet["result"]
                profit = settled_bet.get("profit")
                record["actual_profit"] = profit if profit is not None else (
                    record["expected_profit"] if settled_bet["result"] else -record["stake"]
                )
                updated += 1
                break

    if updated:
        _save(records)
    return updated


def mark_result(index: int, won: bool, actual_profit: Optional[float] = None) -> None:
    """Marque le résultat d'un pari par son index (0 = premier)."""
    records = _load()
    if index < 0 or index >= len(records):
        print(f"Index {index} invalide (0–{len(records)-1}).")
        return
    records[index]["result"] = won
    if actual_profit is not None:
        records[index]["actual_profit"] = actual_profit
    elif won:
        records[index]["actual_profit"] = records[index]["expected_profit"]
    else:
        records[index]["actual_profit"] = -records[index]["stake"]
    _save(records)
    print(f"Pari #{index} marqué comme {'gagné' if won else 'perdu'}.")
