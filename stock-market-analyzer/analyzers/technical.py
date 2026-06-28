import pandas as pd
import numpy as np
try:
    import talib
    _HAS_TALIB = True
except ImportError:
    _HAS_TALIB = False

from dataclasses import dataclass, field
from config import RSI_OVERSOLD, RSI_OVERBOUGHT


@dataclass
class TechnicalSignals:
    ticker: str
    rsi: float = 0.0
    macd: float = 0.0
    macd_signal: float = 0.0
    macd_hist: float = 0.0
    bb_upper: float = 0.0
    bb_middle: float = 0.0
    bb_lower: float = 0.0
    bb_pct: float = 0.5
    sma_20: float = 0.0
    sma_50: float = 0.0
    sma_200: float = 0.0
    ema_12: float = 0.0
    ema_26: float = 0.0
    atr: float = 0.0
    volume_ratio: float = 1.0
    price: float = 0.0
    price_change_pct: float = 0.0
    trend: str = "NEUTRE"
    signals: list[str] = field(default_factory=list)
    score: float = 0.0
    adx: float = 0.0
    stoch_k: float = 50.0
    stoch_d: float = 50.0
    obv_trend: str = "NEUTRE"


def _ema(series: np.ndarray, period: int) -> np.ndarray:
    k = 2 / (period + 1)
    ema = np.full_like(series, np.nan)
    start = period - 1
    ema[start] = np.mean(series[:period])
    for i in range(start + 1, len(series)):
        ema[i] = series[i] * k + ema[i - 1] * (1 - k)
    return ema


def _rsi(close: np.ndarray, period: int = 14) -> np.ndarray:
    delta = np.diff(close)
    gain = np.where(delta > 0, delta, 0.0)
    loss = np.where(delta < 0, -delta, 0.0)
    avg_gain = np.full(len(close), np.nan)
    avg_loss = np.full(len(close), np.nan)
    avg_gain[period] = np.mean(gain[:period])
    avg_loss[period] = np.mean(loss[:period])
    for i in range(period + 1, len(close)):
        avg_gain[i] = (avg_gain[i-1] * (period - 1) + gain[i-1]) / period
        avg_loss[i] = (avg_loss[i-1] * (period - 1) + loss[i-1]) / period
    rs = np.where(avg_loss != 0, avg_gain / avg_loss, 100.0)
    rsi = 100 - 100 / (1 + rs)
    return rsi


def compute_technical(ticker: str, df: pd.DataFrame) -> TechnicalSignals:
    sig = TechnicalSignals(ticker=ticker)
    if df is None or len(df) < 30:
        return sig

    close  = df["Close"].squeeze().values.astype(float)
    high   = df["High"].squeeze().values.astype(float)
    low    = df["Low"].squeeze().values.astype(float)
    volume = df["Volume"].squeeze().values.astype(float)

    sig.price = float(close[-1])
    sig.price_change_pct = float((close[-1] - close[-2]) / close[-2] * 100) if len(close) > 1 else 0.0

    if _HAS_TALIB:
        sig.rsi  = float(talib.RSI(close, timeperiod=14)[-1])
        macd, macd_sig, macd_hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
        sig.macd        = float(macd[-1])
        sig.macd_signal = float(macd_sig[-1])
        sig.macd_hist   = float(macd_hist[-1])
        bb_up, bb_mid, bb_lo = talib.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2)
        sig.bb_upper  = float(bb_up[-1])
        sig.bb_middle = float(bb_mid[-1])
        sig.bb_lower  = float(bb_lo[-1])
        sig.sma_20  = float(talib.SMA(close, timeperiod=20)[-1])
        sig.sma_50  = float(talib.SMA(close, timeperiod=50)[-1]) if len(close) >= 50 else sig.price
        sig.sma_200 = float(talib.SMA(close, timeperiod=200)[-1]) if len(close) >= 200 else sig.price
        sig.ema_12  = float(talib.EMA(close, timeperiod=12)[-1])
        sig.ema_26  = float(talib.EMA(close, timeperiod=26)[-1])
        sig.atr     = float(talib.ATR(high, low, close, timeperiod=14)[-1])
        sig.adx     = float(talib.ADX(high, low, close, timeperiod=14)[-1])
        stoch_k, stoch_d = talib.STOCH(high, low, close)
        sig.stoch_k = float(stoch_k[-1])
        sig.stoch_d = float(stoch_d[-1])
        obv = talib.OBV(close, volume)
        obv_slope = float(obv[-1] - obv[-5]) if len(obv) >= 5 else 0.0
    else:
        # Pure-numpy fallback
        rsi_arr = _rsi(close)
        sig.rsi = float(rsi_arr[-1]) if not np.isnan(rsi_arr[-1]) else 50.0

        ema12 = _ema(close, 12)
        ema26 = _ema(close, 26)
        macd_line = ema12 - ema26
        macd_sig_line = _ema(macd_line[~np.isnan(macd_line)], 9)
        sig.macd        = float(macd_line[-1])
        sig.macd_signal = float(macd_sig_line[-1])
        sig.macd_hist   = sig.macd - sig.macd_signal

        sma20 = np.mean(close[-20:])
        std20 = np.std(close[-20:])
        sig.bb_upper  = sma20 + 2 * std20
        sig.bb_middle = sma20
        sig.bb_lower  = sma20 - 2 * std20
        sig.sma_20    = sma20
        sig.sma_50    = float(np.mean(close[-50:]))  if len(close) >= 50  else sig.price
        sig.sma_200   = float(np.mean(close[-200:])) if len(close) >= 200 else sig.price
        sig.ema_12    = float(ema12[-1])
        sig.ema_26    = float(ema26[-1])

        tr = np.maximum(high[1:] - low[1:], np.maximum(np.abs(high[1:] - close[:-1]), np.abs(low[1:] - close[:-1])))
        sig.atr = float(np.mean(tr[-14:]))
        sig.adx = 20.0
        sig.stoch_k = 50.0
        sig.stoch_d = 50.0

        obv = np.cumsum(np.where(np.diff(close) > 0, volume[1:], np.where(np.diff(close) < 0, -volume[1:], 0)))
        obv_slope = float(obv[-1] - obv[-5]) if len(obv) >= 5 else 0.0

    band_width = sig.bb_upper - sig.bb_lower
    sig.bb_pct = float((sig.price - sig.bb_lower) / band_width) if band_width > 0 else 0.5
    sig.obv_trend = "HAUSSIER" if obv_slope > 0 else "BAISSIER"

    avg_vol = float(np.mean(volume[-20:])) if len(volume) >= 20 else float(np.mean(volume))
    sig.volume_ratio = float(volume[-1]) / avg_vol if avg_vol > 0 else 1.0

    # Trend
    above_sma50  = sig.price > sig.sma_50
    above_sma200 = sig.price > sig.sma_200
    golden_cross = sig.sma_50 > sig.sma_200
    death_cross  = sig.sma_50 < sig.sma_200

    if above_sma50 and above_sma200 and golden_cross:
        sig.trend = "HAUSSIER FORT"
    elif above_sma50 and golden_cross:
        sig.trend = "HAUSSIER"
    elif death_cross and not above_sma50:
        sig.trend = "BAISSIER FORT"
    elif not above_sma50:
        sig.trend = "BAISSIER"
    else:
        sig.trend = "NEUTRE"

    # Scoring
    score = 0.0
    signals = []

    if sig.rsi < RSI_OVERSOLD:
        signals.append(f"RSI survendu ({sig.rsi:.1f}) → opportunité achat")
        score += 20
    elif sig.rsi > RSI_OVERBOUGHT:
        signals.append(f"RSI suracheté ({sig.rsi:.1f}) → risque correction")
        score -= 20
    elif sig.rsi > 50:
        score += 8
    else:
        score -= 8

    if sig.macd > sig.macd_signal and sig.macd_hist > 0:
        signals.append("MACD bullish crossover")
        score += 15
    elif sig.macd < sig.macd_signal and sig.macd_hist < 0:
        signals.append("MACD bearish crossover")
        score -= 15

    if sig.bb_pct < 0.05:
        signals.append("Prix sous bande inférieure BB → rebond possible")
        score += 12
    elif sig.bb_pct > 0.95:
        signals.append("Prix sur bande supérieure BB → résistance")
        score -= 12

    score += 10 if sig.price > sig.sma_200 else -10

    if golden_cross:
        signals.append("Golden Cross (SMA50 > SMA200)")
        score += 15
    elif death_cross:
        signals.append("Death Cross (SMA50 < SMA200)")
        score -= 15

    score += 8 if sig.ema_12 > sig.ema_26 else -8

    if sig.volume_ratio > 1.5:
        signals.append(f"Volume élevé (×{sig.volume_ratio:.1f}x)")
        score += 5 if score > 0 else -5

    if sig.stoch_k < 20 and sig.stoch_d < 20:
        signals.append("Stochastique en survente")
        score += 8
    elif sig.stoch_k > 80 and sig.stoch_d > 80:
        signals.append("Stochastique en surachat")
        score -= 8

    if sig.adx > 25:
        score *= 1.15

    sig.signals = signals
    sig.score = max(-100.0, min(100.0, score))
    return sig
