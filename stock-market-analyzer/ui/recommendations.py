from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box
from dataclasses import dataclass, field

console = Console()


@dataclass
class Recommendation:
    ticker: str
    name: str
    price: float
    verdict: str             # ACHETER / ÉVITER / SURVEILLER
    confidence: int          # 0-100%
    horizon: str             # Court / Moyen / Long terme
    entry_low: float
    entry_high: float
    stop_loss: float
    target: float
    risk_level: str          # Faible / Modéré / Élevé
    expected_gain: float
    max_loss: float
    reasons: list[str]
    is_short: bool = False


def compute_confidence(tech_score: float, fund_score: float, mom_score: float, combined: float) -> int:
    """Converts scores into a 0-100% confidence level."""
    # Count how many of the 3 pillars are positive
    positive_pillars = sum(1 for s in [tech_score, fund_score, mom_score] if s > 10)
    all_strong = sum(1 for s in [tech_score, fund_score, mom_score] if s > 30)

    base = max(0.0, min(100.0, (combined + 100) / 2))

    # Bonus when multiple pillars agree
    if positive_pillars == 3:
        base = min(100, base + 10)
    elif positive_pillars == 0:
        base = max(0, base - 10)

    if all_strong >= 2:
        base = min(100, base + 8)

    return int(round(base))


def build_recommendation(
    ticker: str,
    name: str,
    price: float,
    tech_score: float,
    fund_score: float,
    mom_score: float,
    combined: float,
    rsi: float,
    atr: float,
    bb_lower: float,
    bb_upper: float,
    sma_20: float,
    target_analyst: float,
    tech_signals: list[str],
    fund_signals: list[str],
    mom_signals: list[str],
    mode: str = "short",
    is_short_candidate: bool = False,
) -> Recommendation:
    confidence = compute_confidence(tech_score, fund_score, mom_score, combined)

    # Verdict
    if combined >= 50:
        verdict = "ACHETER"
    elif combined >= 25:
        verdict = "SURVEILLER"
    elif combined <= -30:
        verdict = "ÉVITER / SHORT"
    else:
        verdict = "NEUTRE"

    # Risk level based on ATR% and beta-like volatility
    atr_pct = (atr / price * 100) if price > 0 else 2.0
    if atr_pct < 1.5:
        risk_level = "Faible"
    elif atr_pct < 3.0:
        risk_level = "Modéré"
    else:
        risk_level = "Élevé"

    # Entry zone: around SMA20 or current price if already pulled back
    entry_low  = max(bb_lower, price * 0.98)
    entry_high = min(price * 1.01, sma_20 * 1.005)
    if entry_low > entry_high:
        entry_low  = price * 0.98
        entry_high = price * 1.005

    # Stop-loss: 1.5× ATR below entry
    stop_loss = entry_low - (atr * 1.5)

    # Target: analyst target or technical projection
    if target_analyst and target_analyst > price * 1.03:
        target = target_analyst
    else:
        # Use BB upper + momentum extension
        target = bb_upper * 1.02 if combined > 20 else price * 1.08

    expected_gain = (target - price) / price * 100
    max_loss      = (price - stop_loss) / price * 100

    # Gather top reasons (max 4, plain French)
    all_signals = tech_signals + fund_signals + mom_signals
    reasons = all_signals[:4] if all_signals else ["Score combiné positif sur les 3 piliers"]

    horizon_map = {"short": "Court terme (1-4 sem)", "medium": "Moyen terme (1-6 mois)", "long": "Long terme (1-5 ans)"}

    return Recommendation(
        ticker=ticker,
        name=name,
        price=price,
        verdict=verdict,
        confidence=confidence,
        horizon=horizon_map.get(mode, "Court terme"),
        entry_low=entry_low,
        entry_high=entry_high,
        stop_loss=stop_loss,
        target=target,
        risk_level=risk_level,
        expected_gain=expected_gain,
        max_loss=max_loss,
        reasons=reasons,
        is_short=is_short_candidate,
    )


def confidence_bar(pct: int, width: int = 20) -> str:
    filled = int(pct / 100 * width)
    bar = "█" * filled + "░" * (width - filled)
    if pct >= 70:   color = "green"
    elif pct >= 50: color = "yellow"
    else:           color = "red"
    return f"[{color}]{bar}[/{color}] [{color}]{pct}%[/{color}]"


def verdict_panel_color(verdict: str) -> str:
    if "ACHETER" in verdict:  return "green"
    if "ÉVITER" in verdict:   return "red"
    if "SURVEILLER" in verdict: return "yellow"
    return "white"


def print_top_recommendations(recs: list[Recommendation], title: str = "TOP OPPORTUNITÉS"):
    console.print()
    console.print(Panel(
        f"[bold]{title}[/bold]\n[dim]Classées par niveau de confiance — données en temps réel[/dim]",
        style="cyan", box=box.DOUBLE_EDGE, expand=False,
    ))

    for i, r in enumerate(recs, 1):
        vc = verdict_panel_color(r.verdict)
        risk_color = "green" if r.risk_level == "Faible" else "yellow" if r.risk_level == "Modéré" else "red"

        gain_str = f"[green]+{r.expected_gain:.1f}%[/green]" if r.expected_gain > 0 else f"[red]{r.expected_gain:.1f}%[/red]"

        reasons_str = "\n".join(f"  • {s}" for s in r.reasons)

        body = (
            f"[bold {vc}]{r.verdict}[/bold {vc}]   Confiance: {confidence_bar(r.confidence)}\n"
            f"Risque: [{risk_color}]{r.risk_level}[/{risk_color}]   Horizon: [cyan]{r.horizon}[/cyan]\n\n"
            f"[bold]Prix actuel :[/bold] ${r.price:.2f}\n"
            f"[bold]Zone d'entrée:[/bold] ${r.entry_low:.2f} → ${r.entry_high:.2f}\n"
            f"[bold]Stop-loss    :[/bold] [red]${r.stop_loss:.2f}[/red]   (perte max: [red]-{r.max_loss:.1f}%[/red])\n"
            f"[bold]Objectif     :[/bold] [green]${r.target:.2f}[/green]   (gain visé: {gain_str})\n\n"
            f"[bold]Pourquoi ?[/bold]\n{reasons_str}"
        )

        console.print(Panel(
            body,
            title=f"[bold]#{i} — {r.ticker}  {r.name[:35]}[/bold]",
            border_style=vc,
            box=box.ROUNDED,
            expand=True,
        ))
    console.print()


def print_shorts_recommendations(recs: list[Recommendation]):
    console.print()
    console.print(Panel(
        "[bold red]MEILLEURES VENTES À DÉCOUVERT (SHORT)[/bold red]\n"
        "[dim]Titres susceptibles de baisser — vendre pour profiter de la baisse[/dim]",
        style="red", box=box.DOUBLE_EDGE, expand=False,
    ))

    for i, r in enumerate(recs, 1):
        short_gain = -r.expected_gain  # inverted for short
        body = (
            f"[bold red]SHORT — Vendre à découvert[/bold red]   Confiance: {confidence_bar(r.confidence)}\n\n"
            f"[bold]Prix actuel    :[/bold] ${r.price:.2f}\n"
            f"[bold]Entrée short   :[/bold] ${r.entry_high:.2f} (vendre ici ou en dessous)\n"
            f"[bold]Stop-loss      :[/bold] [red]${r.entry_high * 1.05:.2f}[/red]   (+5% au-dessus de l'entrée)\n"
            f"[bold]Objectif       :[/bold] [green]${r.stop_loss:.2f}[/green]   (gain visé: [green]+{short_gain:.1f}%[/green])\n\n"
            f"[bold]Pourquoi shorter ?[/bold]\n"
            + "\n".join(f"  • {s}" for s in r.reasons)
        )

        console.print(Panel(
            body,
            title=f"[bold red]#{i} — {r.ticker}  {r.name[:35]}[/bold red]",
            border_style="red",
            box=box.ROUNDED,
            expand=True,
        ))
    console.print()


def print_summary_table(recs: list[Recommendation]):
    """Compact summary table for quick overview."""
    t = Table(title="[bold]Résumé — Toutes les recommandations[/bold]",
              box=box.SIMPLE_HEAVY, expand=True)
    t.add_column("Rang",       min_width=4,  no_wrap=True)
    t.add_column("Ticker",     min_width=6,  no_wrap=True, style="bold cyan")
    t.add_column("Verdict",    min_width=12, no_wrap=True)
    t.add_column("Confiance",  min_width=8,  no_wrap=True)
    t.add_column("Prix",       min_width=8,  no_wrap=True)
    t.add_column("Entrée",     min_width=16, no_wrap=True)
    t.add_column("Stop",       min_width=8,  no_wrap=True)
    t.add_column("Objectif",   min_width=8,  no_wrap=True)
    t.add_column("Gain visé",  min_width=8,  no_wrap=True)
    t.add_column("Risque",     min_width=8,  no_wrap=True)

    for i, r in enumerate(recs, 1):
        vc = verdict_panel_color(r.verdict)
        rc = "green" if r.risk_level == "Faible" else "yellow" if r.risk_level == "Modéré" else "red"
        gc = "green" if r.expected_gain > 0 else "red"
        conf_color = "green" if r.confidence >= 70 else "yellow" if r.confidence >= 50 else "red"

        t.add_row(
            f"#{i}",
            r.ticker,
            f"[{vc}]{r.verdict}[/{vc}]",
            f"[{conf_color}]{r.confidence}%[/{conf_color}]",
            f"${r.price:.2f}",
            f"${r.entry_low:.2f}–${r.entry_high:.2f}",
            f"[red]${r.stop_loss:.2f}[/red]",
            f"[green]${r.target:.2f}[/green]",
            f"[{gc}]{r.expected_gain:+.1f}%[/{gc}]",
            f"[{rc}]{r.risk_level}[/{rc}]",
        )

    console.print(t)
