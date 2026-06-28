import os
import pandas as pd
from typing import Optional

_DEMO_MODE = os.getenv("DEMO_MODE", "").lower() in ("1", "true", "yes")

if not _DEMO_MODE:
    try:
        import yfinance as yf
        _HAS_YFINANCE = True
    except ImportError:
        _HAS_YFINANCE = False
else:
    _HAS_YFINANCE = False


def _use_demo() -> bool:
    return _DEMO_MODE or not _HAS_YFINANCE


def fetch_history(ticker: str, period: str = "1y", interval: str = "1d") -> Optional[pd.DataFrame]:
    if _use_demo():
        from data.demo_data import get_demo_history
        return get_demo_history(ticker, period, interval)
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period, interval=interval)
        if df is None or df.empty:
            from data.demo_data import get_demo_history
            return get_demo_history(ticker, period, interval)
        df.index = pd.to_datetime(df.index)
        return df
    except Exception:
        from data.demo_data import get_demo_history
        return get_demo_history(ticker, period, interval)


def fetch_info(ticker: str) -> dict:
    if _use_demo():
        from data.demo_data import get_demo_info
        return get_demo_info(ticker)
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        if not info or "currentPrice" not in info:
            from data.demo_data import get_demo_info
            return get_demo_info(ticker)
        return info
    except Exception:
        from data.demo_data import get_demo_info
        return get_demo_info(ticker)


def fetch_multiple(tickers: list[str], period: str = "1y", interval: str = "1d") -> dict[str, pd.DataFrame]:
    return {t: df for t in tickers if (df := fetch_history(t, period, interval)) is not None}


def get_current_price(ticker: str) -> Optional[float]:
    info = fetch_info(ticker)
    return info.get("currentPrice") or info.get("regularMarketPrice")


def is_demo_mode() -> bool:
    return _use_demo()
