from dataclasses import dataclass
from config import TIMEFRAMES, WEIGHTS
from data.fetcher import fetch_history, fetch_info
from analyzers.technical import compute_technical, TechnicalSignals
from analyzers.fundamental import compute_fundamental, FundamentalData
from analyzers.momentum import compute_momentum, MomentumData


@dataclass
class ScreenerResult:
    ticker: str
    name: str
    price: float
    combined_score: float
    tech_score: float
    fund_score: float
    mom_score: float
    trend: str
    rsi: float
    pe: float
    return_1m: float
    return_1y: float
    upside: float
    verdict: str
    is_short_candidate: bool
    short_reason: str


def score_to_verdict(score: float) -> str:
    if score >= 60:   return "FORT ACHAT"
    if score >= 35:   return "ACHAT"
    if score >= 10:   return "SURVEILLER"
    if score >= -15:  return "NEUTRE"
    if score >= -40:  return "ALLÉGER"
    return "VENDRE"


def is_short_candidate(tech: TechnicalSignals, mom: MomentumData, fund: FundamentalData) -> tuple[bool, str]:
    reasons = []

    if tech.rsi > 70:
        reasons.append(f"RSI suracheté {tech.rsi:.0f}")
    if tech.bb_pct > 0.90:
        reasons.append("Au-dessus BB supérieure")
    if mom.return_1m > 15:
        reasons.append(f"Surperformance {mom.return_1m:+.0f}% (1M)")
    if fund.pe_ratio > 50 and fund.pe_ratio > 0:
        reasons.append(f"P/E excessif {fund.pe_ratio:.0f}")
    if tech.macd < tech.macd_signal and tech.macd_hist < 0:
        reasons.append("MACD bearish")
    if mom.pct_from_high > -3:
        reasons.append("Au plus haut 52W (résistance)")
    if fund.debt_to_equity > 2 and fund.revenue_growth < 0:
        reasons.append("Forte dette + revenus en baisse")

    # Need at least 2 reasons for a valid short candidate
    if len(reasons) >= 2:
        return True, " | ".join(reasons[:3])
    return False, ""


def screen_tickers(
    tickers: list[str],
    mode: str = "short",
    include_shorts: bool = True,
    top_n: int = 10,
    progress_callback=None,
) -> tuple[list[ScreenerResult], list[ScreenerResult]]:
    tf = TIMEFRAMES[mode]
    longs = []
    shorts = []
    total = len(tickers)

    for i, ticker in enumerate(tickers):
        if progress_callback:
            progress_callback(i, total, ticker)

        df = fetch_history(ticker, period=tf["period"], interval=tf["interval"])
        if df is None or len(df) < 20:
            continue

        # For fundamental data we use daily history regardless of mode
        df_daily = fetch_history(ticker, period="1y", interval="1d") if mode != "short" else df

        tech = compute_technical(ticker, df)
        fund = compute_fundamental(ticker)
        mom  = compute_momentum(ticker, df_daily if df_daily is not None else df)

        combined = (
            tech.score * WEIGHTS["technical"]
            + fund.score * WEIGHTS["fundamental"]
            + mom.score  * WEIGHTS["momentum"]
        )

        short_flag, short_reason = is_short_candidate(tech, mom, fund) if include_shorts else (False, "")

        result = ScreenerResult(
            ticker=ticker,
            name=fund.name[:30] if fund.name else ticker,
            price=tech.price,
            combined_score=combined,
            tech_score=tech.score,
            fund_score=fund.score,
            mom_score=mom.score,
            trend=tech.trend,
            rsi=tech.rsi,
            pe=fund.pe_ratio,
            return_1m=mom.return_1m,
            return_1y=mom.return_1y,
            upside=fund.upside_potential,
            verdict=score_to_verdict(combined),
            is_short_candidate=short_flag,
            short_reason=short_reason,
        )

        longs.append(result)
        if short_flag:
            shorts.append(result)

    longs.sort(key=lambda x: x.combined_score, reverse=True)
    shorts.sort(key=lambda x: x.combined_score)  # worst score = best short

    return longs[:top_n], shorts[:top_n]
