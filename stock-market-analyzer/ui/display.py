from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.columns import Columns
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich import box
from analyzers.technical import TechnicalSignals
from analyzers.fundamental import FundamentalData, format_market_cap
from analyzers.momentum import MomentumData
from strategies.screener import ScreenerResult

console = Console()


def score_color(score: float) -> str:
    if score >= 50:  return "bold green"
    if score >= 20:  return "green"
    if score >= -20: return "yellow"
    if score >= -50: return "red"
    return "bold red"


def pct_color(v: float) -> str:
    if v > 5:    return "bold green"
    if v > 0:    return "green"
    if v > -5:   return "red"
    return "bold red"


def verdict_style(v: str) -> str:
    styles = {
        "FORT ACHAT":  "bold green on dark_green",
        "ACHAT":       "green",
        "SURVEILLER":  "bold yellow",
        "NEUTRE":      "white",
        "ALLÉGER":     "red",
        "VENDRE":      "bold red on dark_red",
    }
    return styles.get(v, "white")


def print_header():
    console.print(Panel(
        "[bold cyan]STOCK MARKET ANALYZER[/bold cyan]\n"
        "[dim]Analyse technique · Fondamentale · IA · Screener[/dim]",
        box=box.DOUBLE_EDGE,
        style="cyan",
        expand=False,
    ))


def print_technical(tech: TechnicalSignals):
    t = Table(title=f"[bold]Analyse Technique — {tech.ticker}[/bold]", box=box.ROUNDED, expand=True)
    t.add_column("Indicateur", style="bold cyan", width=20)
    t.add_column("Valeur", width=14)
    t.add_column("Signal", width=30)

    rsi_sig = ("🔴 Suracheté", "red") if tech.rsi > 70 else ("🟢 Survendu", "green") if tech.rsi < 30 else ("⚪ Neutre", "white")
    t.add_row("RSI(14)", f"{tech.rsi:.1f}", f"[{rsi_sig[1]}]{rsi_sig[0]}[/{rsi_sig[1]}]")

    macd_sig = "🟢 Bullish" if tech.macd_hist > 0 else "🔴 Bearish"
    t.add_row("MACD", f"{tech.macd:.3f}", macd_sig)
    t.add_row("MACD Signal", f"{tech.macd_signal:.3f}", f"Hist: {tech.macd_hist:.3f}")

    bb_sig = "⬆ Sur-bande" if tech.bb_pct > 0.9 else "⬇ Sous-bande" if tech.bb_pct < 0.1 else "↔ Dans les bandes"
    t.add_row("BB %", f"{tech.bb_pct:.0%}", bb_sig)
    t.add_row("BB Haut/Bas", f"{tech.bb_upper:.2f}/{tech.bb_lower:.2f}", "")

    t.add_row("SMA 20/50/200", f"{tech.sma_20:.2f}/{tech.sma_50:.2f}/{tech.sma_200:.2f}", "")
    t.add_row("ADX", f"{tech.adx:.1f}", "Forte tendance" if tech.adx > 25 else "Tendance faible")

    stoch_sig = "🟢 Survente" if tech.stoch_k < 20 else "🔴 Surachat" if tech.stoch_k > 80 else "Neutre"
    t.add_row("Stoch K/D", f"{tech.stoch_k:.1f}/{tech.stoch_d:.1f}", stoch_sig)

    t.add_row("OBV Tendance", tech.obv_trend, "")
    t.add_row("Volume Ratio", f"{tech.volume_ratio:.2f}x", "Volume élevé" if tech.volume_ratio > 1.5 else "")
    t.add_row("ATR(14)", f"${tech.atr:.2f}", f"±{tech.atr/tech.price*100:.1f}%")

    score_str = f"[{score_color(tech.score)}]{tech.score:+.0f}[/{score_color(tech.score)}]"
    trend_color = "green" if "HAUSSIER" in tech.trend else "red" if "BAISSIER" in tech.trend else "yellow"
    t.add_row("[bold]SCORE TECH[/bold]", score_str, f"[{trend_color}]{tech.trend}[/{trend_color}]")

    console.print(t)

    if tech.signals:
        console.print("[bold]Signaux:[/bold] " + " | ".join(f"[yellow]{s}[/yellow]" for s in tech.signals))


def print_fundamental(fund: FundamentalData):
    t = Table(title=f"[bold]Analyse Fondamentale — {fund.ticker}[/bold]", box=box.ROUNDED, expand=True)
    t.add_column("Métrique", style="bold cyan", width=22)
    t.add_column("Valeur", width=14)
    t.add_column("Évaluation", width=28)

    t.add_row("Entreprise", fund.name[:35], f"{fund.sector}")
    t.add_row("Cap. boursière", format_market_cap(fund.market_cap), f"Beta: {fund.beta:.2f}")
    t.add_row("P/E (trailing)", f"{fund.pe_ratio:.1f}" if fund.pe_ratio else "N/A",
              "[green]Attractif[/green]" if 0 < fund.pe_ratio < 15 else
              "[yellow]Modéré[/yellow]" if fund.pe_ratio < 25 else
              "[red]Élevé[/red]" if fund.pe_ratio > 0 else "")
    t.add_row("P/E (forward)", f"{fund.forward_pe:.1f}" if fund.forward_pe else "N/A", "")
    t.add_row("PEG Ratio", f"{fund.peg_ratio:.2f}" if fund.peg_ratio else "N/A",
              "[green]< 1 = croissance sous-évaluée[/green]" if 0 < fund.peg_ratio < 1 else "")
    t.add_row("P/B", f"{fund.pb_ratio:.2f}" if fund.pb_ratio else "N/A", "")
    t.add_row("EV/EBITDA", f"{fund.ev_ebitda:.1f}" if fund.ev_ebitda else "N/A", "")
    t.add_row("ROE", f"{fund.roe*100:.1f}%" if fund.roe else "N/A",
              "[green]Excellent[/green]" if fund.roe > 0.20 else "")
    t.add_row("Marge nette", f"{fund.profit_margin*100:.1f}%" if fund.profit_margin else "N/A", "")
    t.add_row("Croiss. revenus", f"{fund.revenue_growth*100:.1f}%" if fund.revenue_growth else "N/A",
              f"[{pct_color(fund.revenue_growth*100)}]{'↑' if fund.revenue_growth > 0 else '↓'}[/{pct_color(fund.revenue_growth*100)}]")
    t.add_row("Croiss. bénéfices", f"{fund.earnings_growth*100:.1f}%" if fund.earnings_growth else "N/A", "")
    t.add_row("Dette/CP", f"{fund.debt_to_equity:.2f}" if fund.debt_to_equity else "N/A",
              "[red]Élevé[/red]" if fund.debt_to_equity > 2 else "")
    t.add_row("Ratio courant", f"{fund.current_ratio:.2f}" if fund.current_ratio else "N/A",
              "[green]Sain[/green]" if fund.current_ratio > 1.5 else
              "[red]Faible[/red]" if fund.current_ratio < 1 else "")
    t.add_row("Dividende", f"{fund.dividend_yield*100:.2f}%" if fund.dividend_yield else "N/A", "")
    t.add_row("FCF", f"{fund.free_cash_flow/1e9:.2f}B$" if fund.free_cash_flow else "N/A", "")

    upside_color = "green" if fund.upside_potential > 0 else "red"
    t.add_row("Objectif analystes",
              f"${fund.analyst_target:.2f}" if fund.analyst_target else "N/A",
              f"[{upside_color}]{fund.upside_potential:+.1f}%[/{upside_color}] | {fund.analyst_rating}")

    score_str = f"[{score_color(fund.score)}]{fund.score:+.0f}[/{score_color(fund.score)}]"
    t.add_row("[bold]SCORE FOND.[/bold]", score_str, "")

    console.print(t)

    if fund.signals:
        console.print("[bold]Signaux:[/bold] " + " | ".join(f"[yellow]{s}[/yellow]" for s in fund.signals))


def print_momentum(mom: MomentumData):
    t = Table(title=f"[bold]Momentum — {mom.ticker}[/bold]", box=box.ROUNDED, expand=True)
    t.add_column("Période", style="bold cyan", width=18)
    t.add_column("Performance", width=14)

    def styled_pct(v: float) -> str:
        arrow = "↑" if v > 0 else "↓"
        return f"[{pct_color(v)}]{arrow} {v:+.2f}%[/{pct_color(v)}]"

    t.add_row("1 Semaine", styled_pct(mom.return_1w))
    t.add_row("1 Mois",    styled_pct(mom.return_1m))
    t.add_row("3 Mois",    styled_pct(mom.return_3m))
    t.add_row("6 Mois",    styled_pct(mom.return_6m))
    t.add_row("1 An",      styled_pct(mom.return_1y))
    t.add_row("", "")
    t.add_row("52W Haut", f"${mom.high_52w:.2f}", )
    t.add_row("  vs haut", styled_pct(mom.pct_from_high))
    t.add_row("52W Bas",   f"${mom.low_52w:.2f}")
    t.add_row("  vs bas",  styled_pct(mom.pct_from_low))
    t.add_row("Volume",    mom.vol_trend)
    score_str = f"[{score_color(mom.score)}]{mom.score:+.0f}[/{score_color(mom.score)}]"
    t.add_row("[bold]SCORE MOM.[/bold]", score_str)

    console.print(t)


def print_ai_analysis(analysis: str, ticker: str):
    console.print(Panel(
        analysis,
        title=f"[bold cyan]Analyse IA — {ticker}[/bold cyan]",
        box=box.DOUBLE,
        expand=True,
        style="dim",
    ))


def print_screener_table(results: list[ScreenerResult], title: str):
    t = Table(title=f"[bold]{title}[/bold]", box=box.SIMPLE_HEAVY, expand=True)
    t.add_column("Ticker",    style="bold cyan",  min_width=6,  no_wrap=True)
    t.add_column("Nom",                           ratio=2)
    t.add_column("Prix",                          min_width=8,  no_wrap=True)
    t.add_column("Score",                         min_width=5,  no_wrap=True)
    t.add_column("Tech",                          min_width=4,  no_wrap=True)
    t.add_column("Fund",                          min_width=4,  no_wrap=True)
    t.add_column("Mom",                           min_width=4,  no_wrap=True)
    t.add_column("Tendance",                      min_width=13, no_wrap=True)
    t.add_column("RSI",                           min_width=4,  no_wrap=True)
    t.add_column("1M %",                          min_width=7,  no_wrap=True)
    t.add_column("1Y %",                          min_width=7,  no_wrap=True)
    t.add_column("Upside",                        min_width=7,  no_wrap=True)
    t.add_column("Verdict",                       min_width=10, no_wrap=True)

    for r in results:
        sc = score_color(r.combined_score)
        trend_col = "green" if "HAUSSIER" in r.trend else "red" if "BAISSIER" in r.trend else "yellow"
        t.add_row(
            r.ticker,
            r.name,
            f"${r.price:.2f}",
            f"[{sc}]{r.combined_score:+.0f}[/{sc}]",
            f"[{score_color(r.tech_score)}]{r.tech_score:+.0f}[/{score_color(r.tech_score)}]",
            f"[{score_color(r.fund_score)}]{r.fund_score:+.0f}[/{score_color(r.fund_score)}]",
            f"[{score_color(r.mom_score)}]{r.mom_score:+.0f}[/{score_color(r.mom_score)}]",
            f"[{trend_col}]{r.trend}[/{trend_col}]",
            f"{r.rsi:.0f}",
            f"[{pct_color(r.return_1m)}]{r.return_1m:+.1f}%[/{pct_color(r.return_1m)}]",
            f"[{pct_color(r.return_1y)}]{r.return_1y:+.1f}%[/{pct_color(r.return_1y)}]",
            f"[{pct_color(r.upside)}]{r.upside:+.1f}%[/{pct_color(r.upside)}]",
            f"[{verdict_style(r.verdict)}]{r.verdict}[/{verdict_style(r.verdict)}]",
        )

    console.print(t)


def print_shorts_table(shorts: list[ScreenerResult]):
    t = Table(title="[bold red]Meilleures Opportunités de Vente à Découvert (Short)[/bold red]",
              box=box.SIMPLE_HEAVY, expand=True)
    t.add_column("Ticker",        style="bold red", min_width=6,  no_wrap=True)
    t.add_column("Nom",                             ratio=1)
    t.add_column("Prix",                            min_width=8,  no_wrap=True)
    t.add_column("Score",                           min_width=5,  no_wrap=True)
    t.add_column("RSI",                             min_width=4,  no_wrap=True)
    t.add_column("1M %",                            min_width=7,  no_wrap=True)
    t.add_column("P/E",                             min_width=5,  no_wrap=True)
    t.add_column("Raisons Short",                   ratio=3)

    for r in shorts:
        t.add_row(
            r.ticker,
            r.name,
            f"${r.price:.2f}",
            f"[{score_color(r.combined_score)}]{r.combined_score:+.0f}[/{score_color(r.combined_score)}]",
            f"[red]{r.rsi:.0f}[/red]" if r.rsi > 70 else f"{r.rsi:.0f}",
            f"[{pct_color(r.return_1m)}]{r.return_1m:+.1f}%[/{pct_color(r.return_1m)}]",
            f"{r.pe:.0f}" if r.pe else "N/A",
            f"[yellow]{r.short_reason}[/yellow]",
        )

    console.print(t)


def make_progress() -> Progress:
    return Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.description}[/bold cyan]"),
        BarColumn(),
        TaskProgressColumn(),
        transient=True,
    )
