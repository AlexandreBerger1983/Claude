import pandas as pd
import numpy as np
from dataclasses import dataclass, field


@dataclass
class MomentumData:
    ticker: str
    return_1w: float = 0.0
    return_1m: float = 0.0
    return_3m: float = 0.0
    return_6m: float = 0.0
    return_1y: float = 0.0
    return_ytd: float = 0.0
    high_52w: float = 0.0
    low_52w: float = 0.0
    pct_from_high: float = 0.0
    pct_from_low: float = 0.0
    avg_vol_20d: float = 0.0
    vol_trend: str = "STABLE"
    score: float = 0.0
    signals: list[str] = field(default_factory=list)


def compute_momentum(ticker: str, df: pd.DataFrame) -> MomentumData:
    mom = MomentumData(ticker=ticker)
    if df is None or len(df) < 10:
        return mom

    close = df["Close"].squeeze()
    volume = df["Volume"].squeeze() if "Volume" in df.columns else None

    current = float(close.iloc[-1])

    def ret(n_days: int) -> float:
        if len(close) > n_days:
            return (current - float(close.iloc[-n_days])) / float(close.iloc[-n_days]) * 100
        return 0.0

    mom.return_1w  = ret(5)
    mom.return_1m  = ret(21)
    mom.return_3m  = ret(63)
    mom.return_6m  = ret(126)
    mom.return_1y  = ret(252)

    # 52-week high/low
    last_252 = close.iloc[-252:] if len(close) >= 252 else close
    mom.high_52w = float(last_252.max())
    mom.low_52w  = float(last_252.min())
    mom.pct_from_high = (current - mom.high_52w) / mom.high_52w * 100
    mom.pct_from_low  = (current - mom.low_52w)  / mom.low_52w  * 100

    # Volume trend
    if volume is not None and len(volume) >= 40:
        recent_vol = float(volume.iloc[-10:].mean())
        prior_vol  = float(volume.iloc[-40:-10].mean())
        mom.avg_vol_20d = float(volume.iloc[-20:].mean())
        if recent_vol > prior_vol * 1.3:
            mom.vol_trend = "EN HAUSSE"
        elif recent_vol < prior_vol * 0.7:
            mom.vol_trend = "EN BAISSE"

    # Scoring
    score = 0.0
    signals = []

    if mom.return_1m > 10:
        signals.append(f"Momentum mensuel fort: +{mom.return_1m:.1f}%")
        score += 20
    elif mom.return_1m > 5:
        score += 12
    elif mom.return_1m < -10:
        signals.append(f"Pression vendeuse mensuelle: {mom.return_1m:.1f}%")
        score -= 20
    elif mom.return_1m < -5:
        score -= 12

    if mom.return_3m > 20:
        score += 15
    elif mom.return_3m > 10:
        score += 8
    elif mom.return_3m < -20:
        score -= 15

    if mom.return_1y > 30:
        signals.append(f"Performance 1 an exceptionnelle: +{mom.return_1y:.1f}%")
        score += 12
    elif mom.return_1y > 10:
        score += 6
    elif mom.return_1y < -20:
        score -= 12

    # Near 52-week high = strength
    if mom.pct_from_high > -5:
        signals.append("Proche du plus haut 52 semaines → momentum haussier")
        score += 15
    elif mom.pct_from_high < -30:
        signals.append(f"Très éloigné du plus haut ({mom.pct_from_high:.1f}%) → faiblesse")
        score -= 10

    # Far from 52-week low = recovering or strong
    if mom.pct_from_low > 50:
        score += 8
    elif mom.pct_from_low < 10:
        signals.append("Proche du plus bas 52 semaines → zone de support")
        score += 5  # could be a reversal opportunity

    if mom.vol_trend == "EN HAUSSE":
        score += 5

    mom.score = max(-100.0, min(100.0, score))
    mom.signals = signals
    return mom
