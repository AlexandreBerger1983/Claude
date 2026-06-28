#!/usr/bin/env python3
"""
Stock Market Analyzer — Analyse technique, fondamentale & IA
Usage:
  python main.py                          # Menu interactif
  python main.py --top                    # TOP 5 achats + shorts du moment
  python main.py --top --list TECH        # TOP 5 sur le secteur tech
  python main.py --analyze AAPL           # Analyse complète d'un titre
  python main.py --analyze AAPL MSFT NVDA # Analyse multiple
  python main.py --screen                 # Screener S&P500 Top 20
  python main.py --screen --list TECH     # Screener sur une liste spécifique
  python main.py --screen --mode medium   # Mode court/medium/long
  python main.py --shorts                 # Meilleures opportunités short
"""
import sys
import os
import argparse
import time

sys.path.insert(0, os.path.dirname(__file__))

from rich.console import Console
from rich.prompt import Prompt, IntPrompt
from rich.panel import Panel
from rich.table import Table
from rich import box
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

from config import TIMEFRAMES, WATCHLISTS, WEIGHTS
from data.fetcher import fetch_history
from analyzers.technical import compute_technical
from analyzers.fundamental import compute_fundamental, format_market_cap
from analyzers.momentum import compute_momentum
from analyzers.ai_advisor import get_ai_analysis
from strategies.screener import screen_tickers, score_to_verdict
from ui.display import (
    console, print_header, print_technical, print_fundamental,
    print_momentum, print_ai_analysis, print_screener_table,
    print_shorts_table,
)
from ui.recommendations import (
    build_recommendation, print_top_recommendations,
    print_shorts_recommendations, print_summary_table,
)

try:
    from ui.charts import plot_price_chart, plot_rsi
    CHARTS_AVAILABLE = True
except ImportError:
    CHARTS_AVAILABLE = False


# ─────────────────────────────────────────
# Core: full analysis of a single ticker
# ─────────────────────────────────────────

def analyze_ticker(ticker: str, mode: str = "short", show_chart: bool = True, use_ai: bool = True):
    ticker = ticker.upper().strip()
    tf = TIMEFRAMES[mode]

    console.print(f"\n[bold cyan]Analyse de [white]{ticker}[/white] — {tf['label']}[/bold cyan]")

    with Progress(SpinnerColumn(), TextColumn("{task.description}"), transient=True) as p:
        t1 = p.add_task("Récupération des données...", total=None)

        df      = fetch_history(ticker, period=tf["period"], interval=tf["interval"])
        df_1y   = fetch_history(ticker, period="1y", interval="1d")

        p.update(t1, description="Analyse technique...")
        tech = compute_technical(ticker, df)

        p.update(t1, description="Analyse fondamentale...")
        fund = compute_fundamental(ticker)

        p.update(t1, description="Calcul du momentum...")
        mom = compute_momentum(ticker, df_1y if df_1y is not None else df)

    if df is None:
        console.print(f"[red]Impossible de récupérer les données pour {ticker}[/red]")
        return

    combined = (
        tech.score * WEIGHTS["technical"]
        + fund.score * WEIGHTS["fundamental"]
        + mom.score  * WEIGHTS["momentum"]
    )

    # Summary panel
    verdict = score_to_verdict(combined)
    sc_color = "green" if combined >= 20 else "red" if combined <= -20 else "yellow"
    price_change_color = "green" if tech.price_change_pct >= 0 else "red"

    summary = (
        f"[bold white]{ticker}[/bold white]  {fund.name[:40]}\n"
        f"Prix: [bold]${tech.price:.2f}[/bold]  "
        f"([{price_change_color}]{tech.price_change_pct:+.2f}%[/{price_change_color}])\n"
        f"Secteur: {fund.sector}  |  Cap: {format_market_cap(fund.market_cap)}\n\n"
        f"Score: Tech [bold]{tech.score:+.0f}[/bold]  Fond [bold]{fund.score:+.0f}[/bold]  "
        f"Mom [bold]{mom.score:+.0f}[/bold]  →  "
        f"[{sc_color}]COMBINÉ: {combined:+.1f}[/{sc_color}]\n"
        f"Verdict: [{sc_color}][bold]{verdict}[/bold][/{sc_color}]"
    )
    console.print(Panel(summary, box=box.ROUNDED, style="dim"))

    # Charts
    if show_chart and CHARTS_AVAILABLE and df is not None:
        try:
            plot_price_chart(ticker, df)
        except Exception:
            pass

    # Detailed tables
    console.print()
    print_technical(tech)
    console.print()
    print_fundamental(fund)
    console.print()
    print_momentum(mom)

    # AI analysis
    if use_ai:
        console.print()
        with Progress(SpinnerColumn(), TextColumn("[cyan]Génération de l'analyse IA..."), transient=True) as p:
            p.add_task("", total=None)
            analysis = get_ai_analysis(ticker, tech, fund, mom, combined)
        print_ai_analysis(analysis, ticker)


# ─────────────────────────────────────────
# Screener
# ─────────────────────────────────────────

def run_screener(list_name: str = "SP500_TOP", mode: str = "short", include_shorts: bool = True):
    tickers = WATCHLISTS.get(list_name.upper(), WATCHLISTS["SP500_TOP"])
    tf_label = TIMEFRAMES[mode]["label"]

    console.print(f"\n[bold cyan]Screener — {list_name} | {tf_label}[/bold cyan]")
    console.print(f"[dim]Analyse de {len(tickers)} titres...[/dim]\n")

    scanned = [0]
    total = len(tickers)

    with Progress(
        SpinnerColumn(),
        TextColumn("[cyan]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        transient=True,
    ) as prog:
        task = prog.add_task(f"Scan 0/{total}", total=total)

        def cb(i, tot, ticker):
            scanned[0] = i
            prog.update(task, completed=i, description=f"Scan {ticker} ({i}/{tot})")

        longs, shorts = screen_tickers(tickers, mode=mode, include_shorts=include_shorts, top_n=15, progress_callback=cb)

    console.print(f"\n[green]✓ Scan terminé — {total} titres analysés[/green]\n")

    print_screener_table(longs, f"Top Opportunités — {list_name} | {tf_label}")

    if include_shorts and shorts:
        console.print()
        print_shorts_table(shorts)


# ─────────────────────────────────────────
# Dedicated shorts screener
# ─────────────────────────────────────────

def run_shorts_screener(list_name: str = "SP500_TOP"):
    tickers = WATCHLISTS.get(list_name.upper(), WATCHLISTS["SP500_TOP"])

    console.print(f"\n[bold red]Screener Short — {list_name}[/bold red]")
    console.print("[dim]Recherche des meilleures opportunités de vente à découvert...[/dim]\n")

    with Progress(
        SpinnerColumn(), TextColumn("[cyan]{task.description}"),
        BarColumn(), TaskProgressColumn(), transient=True,
    ) as prog:
        task = prog.add_task("Scan...", total=len(tickers))

        def cb(i, tot, ticker):
            prog.update(task, completed=i, description=f"Analyse {ticker} ({i}/{tot})")

        _, shorts = screen_tickers(tickers, mode="short", include_shorts=True, top_n=10, progress_callback=cb)

    if not shorts:
        console.print("[yellow]Aucun candidat short identifié dans cette liste.[/yellow]")
        return

    print_shorts_table(shorts)

    # Detailed AI analysis for top short
    if shorts:
        best = shorts[0]
        console.print(f"\n[bold red]Analyse détaillée du meilleur short: {best.ticker}[/bold red]")
        analyze_ticker(best.ticker, mode="short", show_chart=False, use_ai=True)


# ─────────────────────────────────────────
# Interactive menu
# ─────────────────────────────────────────

def interactive_menu():
    print_header()

    while True:
        console.print(Panel(
            "[bold green][1] TOP 5 — Quoi acheter maintenant (recommandé)[/bold green]\n"
            "[2] Analyser un titre en détail\n"
            "[3] Screener — Tableau complet\n"
            "[4] Meilleures opportunités short\n"
            "[5] Comparer plusieurs titres\n"
            "[6] Choisir une watchlist\n"
            "[Q] Quitter",
            title="[bold cyan]MENU PRINCIPAL[/bold cyan]",
            box=box.ROUNDED,
            expand=False,
        ))

        choice = Prompt.ask("[bold cyan]Choix[/bold cyan]", choices=["1","2","3","4","5","6","q","Q"], default="1")

        if choice in ("q", "Q"):
            console.print("[dim]À bientôt![/dim]")
            break

        elif choice == "1":
            list_name = _choose_watchlist()
            mode = Prompt.ask("Horizon", choices=["short","medium","long"], default="short")
            run_top_picks(list_name=list_name, mode=mode)

        elif choice == "2":
            ticker_input = Prompt.ask("[bold]Ticker(s) (ex: AAPL ou AAPL,MSFT,NVDA)[/bold]")
            tickers = [t.strip().upper() for t in ticker_input.replace(" ", ",").split(",") if t.strip()]
            mode = Prompt.ask("[bold]Horizon[/bold]", choices=["short", "medium", "long"], default="short")
            use_ai = Prompt.ask("[bold]Analyse IA?[/bold]", choices=["o","n"], default="o") == "o"
            for t in tickers:
                analyze_ticker(t, mode=mode, use_ai=use_ai)
                if len(tickers) > 1:
                    console.print("\n" + "─" * 80 + "\n")

        elif choice == "3":
            list_name = _choose_watchlist()
            mode = Prompt.ask("Horizon", choices=["short","medium","long"], default="short")
            run_screener(list_name=list_name, mode=mode, include_shorts=False)

        elif choice == "4":
            list_name = _choose_watchlist()
            run_shorts_screener(list_name=list_name)

        elif choice == "5":
            ticker_input = Prompt.ask("[bold]Titres à comparer (ex: AAPL,MSFT,GOOGL)[/bold]")
            tickers = [t.strip().upper() for t in ticker_input.replace(" ", ",").split(",") if t.strip()]
            mode = Prompt.ask("Horizon", choices=["short","medium","long"], default="short")
            compare_tickers(tickers, mode)

        elif choice == "6":
            list_name = _choose_watchlist()
            mode = Prompt.ask("Horizon", choices=["short","medium","long"], default="short")
            run_screener(list_name=list_name, mode=mode)

        console.print()


def _choose_watchlist() -> str:
    t = Table(box=box.SIMPLE)
    t.add_column("N°", width=4)
    t.add_column("Liste", width=16)
    t.add_column("Contenu", width=50)
    lists = list(WATCHLISTS.keys())
    for i, (name, tickers) in enumerate(WATCHLISTS.items(), 1):
        t.add_row(str(i), name, ", ".join(tickers[:6]) + "...")
    console.print(t)

    idx = IntPrompt.ask("Choisir la liste (N°)", default=1)
    return lists[max(0, min(idx - 1, len(lists) - 1))]


def compare_tickers(tickers: list[str], mode: str = "short"):
    tf = TIMEFRAMES[mode]
    rows = []

    with Progress(SpinnerColumn(), TextColumn("{task.description}"), transient=True) as p:
        task = p.add_task("Analyse comparative...", total=len(tickers))

        for ticker in tickers:
            p.update(task, description=f"Analyse {ticker}...")
            df    = fetch_history(ticker, period=tf["period"], interval=tf["interval"])
            df_1y = fetch_history(ticker, period="1y", interval="1d")

            tech  = compute_technical(ticker, df) if df is not None else None
            fund  = compute_fundamental(ticker)
            mom   = compute_momentum(ticker, df_1y if df_1y is not None else df) if df is not None else None

            if tech and mom:
                combined = (
                    tech.score * WEIGHTS["technical"]
                    + fund.score * WEIGHTS["fundamental"]
                    + mom.score  * WEIGHTS["momentum"]
                )
                rows.append((ticker, tech, fund, mom, combined))

            p.advance(task)

    if not rows:
        console.print("[red]Aucune donnée disponible.[/red]")
        return

    rows.sort(key=lambda x: x[4], reverse=True)

    t = Table(
        title=f"[bold]Comparaison — {tf['label']}[/bold]",
        box=box.ROUNDED, expand=True,
    )
    t.add_column("Ticker",   style="bold cyan", width=8)
    t.add_column("Nom",      width=25)
    t.add_column("Prix",     width=10)
    t.add_column("Score",    width=8)
    t.add_column("Tendance", width=16)
    t.add_column("RSI",      width=6)
    t.add_column("1M%",      width=8)
    t.add_column("P/E",      width=8)
    t.add_column("Upside",   width=8)
    t.add_column("Verdict",  width=12)

    for ticker, tech, fund, mom, combined in rows:
        from ui.display import score_color, pct_color, verdict_style
        sc = score_color(combined)
        verdict = score_to_verdict(combined)
        trend_col = "green" if "HAUSSIER" in tech.trend else "red" if "BAISSIER" in tech.trend else "yellow"
        t.add_row(
            ticker,
            fund.name[:22] if fund.name else ticker,
            f"${tech.price:.2f}",
            f"[{sc}]{combined:+.1f}[/{sc}]",
            f"[{trend_col}]{tech.trend}[/{trend_col}]",
            f"{tech.rsi:.0f}",
            f"[{pct_color(mom.return_1m)}]{mom.return_1m:+.1f}%[/{pct_color(mom.return_1m)}]",
            f"{fund.pe_ratio:.1f}" if fund.pe_ratio else "N/A",
            f"[{pct_color(fund.upside_potential)}]{fund.upside_potential:+.1f}%[/{pct_color(fund.upside_potential)}]",
            f"[{verdict_style(verdict)}]{verdict}[/{verdict_style(verdict)}]",
        )

    console.print(t)

    # AI summary for top pick
    best = rows[0]
    console.print(f"\n[bold green]Meilleur choix: {best[0]}[/bold green]")
    with Progress(SpinnerColumn(), TextColumn("[cyan]Analyse IA du meilleur titre..."), transient=True) as p:
        p.add_task("", total=None)
        analysis = get_ai_analysis(best[0], best[1], best[2], best[3], best[4])
    print_ai_analysis(analysis, best[0])


# ─────────────────────────────────────────
# TOP PICKS — the clear "what to buy now"
# ─────────────────────────────────────────

def run_top_picks(list_name: str = "SP500_TOP", mode: str = "short", top_n: int = 5):
    tickers = WATCHLISTS.get(list_name.upper(), WATCHLISTS["SP500_TOP"])
    tf = TIMEFRAMES[mode]

    console.print(f"\n[bold cyan]Scan de {len(tickers)} titres — {list_name} | {tf['label']}[/bold cyan]")

    with Progress(
        SpinnerColumn(), TextColumn("[cyan]{task.description}"),
        BarColumn(), TaskProgressColumn(), transient=True,
    ) as prog:
        task = prog.add_task("Analyse en cours...", total=len(tickers))

        all_data = []
        for ticker in tickers:
            prog.update(task, advance=1, description=f"Analyse {ticker}...")
            df    = fetch_history(ticker, period=tf["period"], interval=tf["interval"])
            df_1y = fetch_history(ticker, period="1y", interval="1d")
            if df is None:
                continue
            tech = compute_technical(ticker, df)
            fund = compute_fundamental(ticker)
            mom  = compute_momentum(ticker, df_1y if df_1y is not None else df)
            combined = (
                tech.score * WEIGHTS["technical"]
                + fund.score * WEIGHTS["fundamental"]
                + mom.score  * WEIGHTS["momentum"]
            )
            all_data.append((ticker, tech, fund, mom, combined))

    # Sort by combined score
    all_data.sort(key=lambda x: x[4], reverse=True)

    # Build long recommendations (top N)
    long_recs = []
    for ticker, tech, fund, mom, combined in all_data[:top_n]:
        rec = build_recommendation(
            ticker=ticker,
            name=fund.name or ticker,
            price=tech.price,
            tech_score=tech.score,
            fund_score=fund.score,
            mom_score=mom.score,
            combined=combined,
            rsi=tech.rsi,
            atr=tech.atr,
            bb_lower=tech.bb_lower,
            bb_upper=tech.bb_upper,
            sma_20=tech.sma_20,
            target_analyst=fund.analyst_target,
            tech_signals=tech.signals,
            fund_signals=fund.signals,
            mom_signals=mom.signals,
            mode=mode,
        )
        long_recs.append(rec)

    # Build short recommendations (bottom N by score)
    short_candidates = [d for d in all_data if d[4] < 0][:3]
    short_recs = []
    for ticker, tech, fund, mom, combined in short_candidates:
        from strategies.screener import is_short_candidate
        flag, reason = is_short_candidate(tech, mom, fund)
        if flag:
            rec = build_recommendation(
                ticker=ticker,
                name=fund.name or ticker,
                price=tech.price,
                tech_score=tech.score,
                fund_score=fund.score,
                mom_score=mom.score,
                combined=combined,
                rsi=tech.rsi,
                atr=tech.atr,
                bb_lower=tech.bb_lower,
                bb_upper=tech.bb_upper,
                sma_20=tech.sma_20,
                target_analyst=fund.analyst_target,
                tech_signals=[reason],
                fund_signals=fund.signals,
                mom_signals=mom.signals,
                mode=mode,
                is_short_candidate=True,
            )
            short_recs.append(rec)

    print_top_recommendations(long_recs, title=f"TOP {top_n} ACHATS — {list_name} | {tf['label']}")
    print_summary_table(long_recs)

    if short_recs:
        print_shorts_recommendations(short_recs)


# ─────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Stock Market Analyzer — Analyse boursière intelligente",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--top",     "-t", action="store_true",
                        help="TOP 5 achats du moment + shorts (vue claire et actionnable)")
    parser.add_argument("--analyze", "-a", nargs="+", metavar="TICKER",
                        help="Analyser un ou plusieurs titres")
    parser.add_argument("--screen",  "-s", action="store_true",
                        help="Lancer le screener (tableau détaillé)")
    parser.add_argument("--shorts",  action="store_true",
                        help="Screener pour opportunités short")
    parser.add_argument("--compare", "-c", nargs="+", metavar="TICKER",
                        help="Comparer plusieurs titres")
    parser.add_argument("--mode", "-m", choices=["short","medium","long"], default="short",
                        help="Horizon d'investissement (défaut: short)")
    parser.add_argument("--list", "-l", default="SP500_TOP",
                        choices=list(WATCHLISTS.keys()),
                        help="Watchlist pour le screener")
    parser.add_argument("--no-ai", action="store_true",
                        help="Désactiver l'analyse IA")

    args = parser.parse_args()

    print_header()

    if args.top:
        run_top_picks(list_name=args.list, mode=args.mode)
    elif args.analyze:
        for ticker in args.analyze:
            analyze_ticker(ticker, mode=args.mode, use_ai=not args.no_ai)
    elif args.screen:
        run_screener(list_name=args.list, mode=args.mode)
    elif args.shorts:
        run_shorts_screener(list_name=args.list)
    elif args.compare:
        compare_tickers(args.compare, mode=args.mode)
    else:
        interactive_menu()


if __name__ == "__main__":
    main()
