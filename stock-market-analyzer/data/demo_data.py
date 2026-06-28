"""
Demo data generator for testing without network access.
In production, data comes from yfinance (Yahoo Finance).
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def generate_price_series(
    n: int = 252,
    start_price: float = 100.0,
    trend: float = 0.0003,
    volatility: float = 0.015,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    returns = rng.normal(trend, volatility, n)
    prices = start_price * np.exp(np.cumsum(returns))

    high   = prices * (1 + np.abs(rng.normal(0, 0.005, n)))
    low    = prices * (1 - np.abs(rng.normal(0, 0.005, n)))
    open_  = np.roll(prices, 1)
    open_[0] = start_price
    volume = rng.integers(5_000_000, 50_000_000, n).astype(float)

    dates = [datetime.today() - timedelta(days=n - i - 1) for i in range(n)]
    df = pd.DataFrame({
        "Open":   open_,
        "High":   high,
        "Low":    low,
        "Close":  prices,
        "Volume": volume,
    }, index=pd.DatetimeIndex(dates))
    return df


# Demo configs: (start_price, trend, volatility, seed)
DEMO_STOCKS = {
    "AAPL":  (185.0, 0.0004, 0.013, 1),
    "MSFT":  (420.0, 0.0005, 0.012, 2),
    "NVDA":  (900.0, 0.0008, 0.025, 3),
    "GOOGL": (175.0, 0.0003, 0.014, 4),
    "META":  (520.0, 0.0006, 0.016, 5),
    "AMZN":  (195.0, 0.0004, 0.015, 6),
    "TSLA":  (250.0, 0.0001, 0.030, 7),
    "AMD":   (165.0, 0.0005, 0.022, 8),
    "JPM":   (210.0, 0.0003, 0.011, 9),
    "SPY":   (550.0, 0.0003, 0.009, 10),
    "QQQ":   (470.0, 0.0004, 0.011, 11),
    "INTC":  (22.0, -0.0003, 0.018, 12),
    "BA":    (175.0, -0.0001, 0.020, 13),
    "XOM":   (115.0, 0.0002, 0.012, 14),
    "BRK-B": (455.0, 0.0003, 0.008, 15),
    "V":     (290.0, 0.0003, 0.010, 16),
    "LLY":   (890.0, 0.0006, 0.014, 17),
    "UNH":   (550.0, 0.0002, 0.012, 18),
    "AVGO":  (200.0, 0.0005, 0.018, 19),
    "COST":  (920.0, 0.0004, 0.010, 20),
}

DEMO_FUNDAMENTALS = {
    "AAPL":  {"longName": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics",
               "marketCap": 2.9e12, "trailingPE": 32.5, "forwardPE": 28.0, "pegRatio": 2.1,
               "priceToBook": 48.0, "returnOnEquity": 1.60, "profitMargins": 0.265,
               "revenueGrowth": 0.04, "earningsGrowth": 0.08, "debtToEquity": 1.5,
               "currentRatio": 0.9, "dividendYield": 0.005, "freeCashflow": 105e9,
               "beta": 1.2, "targetMeanPrice": 210.0, "recommendationKey": "buy"},
    "MSFT":  {"longName": "Microsoft Corp", "sector": "Technology", "industry": "Software",
               "marketCap": 3.1e12, "trailingPE": 37.0, "forwardPE": 32.0, "pegRatio": 1.8,
               "priceToBook": 14.0, "returnOnEquity": 0.38, "profitMargins": 0.355,
               "revenueGrowth": 0.16, "earningsGrowth": 0.22, "debtToEquity": 0.4,
               "currentRatio": 1.8, "dividendYield": 0.007, "freeCashflow": 70e9,
               "beta": 0.9, "targetMeanPrice": 470.0, "recommendationKey": "strong_buy"},
    "NVDA":  {"longName": "NVIDIA Corp", "sector": "Technology", "industry": "Semiconductors",
               "marketCap": 2.2e12, "trailingPE": 62.0, "forwardPE": 42.0, "pegRatio": 1.2,
               "priceToBook": 35.0, "returnOnEquity": 0.55, "profitMargins": 0.49,
               "revenueGrowth": 0.94, "earningsGrowth": 1.68, "debtToEquity": 0.3,
               "currentRatio": 4.2, "dividendYield": 0.001, "freeCashflow": 60e9,
               "beta": 1.7, "targetMeanPrice": 1100.0, "recommendationKey": "strong_buy"},
    "INTC":  {"longName": "Intel Corp", "sector": "Technology", "industry": "Semiconductors",
               "marketCap": 95e9, "trailingPE": 0.0, "forwardPE": 22.0, "pegRatio": 0.0,
               "priceToBook": 1.1, "returnOnEquity": -0.05, "profitMargins": -0.02,
               "revenueGrowth": -0.02, "earningsGrowth": -0.80, "debtToEquity": 0.7,
               "currentRatio": 1.5, "dividendYield": 0.02, "freeCashflow": -5e9,
               "beta": 1.1, "targetMeanPrice": 25.0, "recommendationKey": "hold"},
    "TSLA":  {"longName": "Tesla Inc", "sector": "Consumer Cyclical", "industry": "Auto Manufacturers",
               "marketCap": 800e9, "trailingPE": 55.0, "forwardPE": 80.0, "pegRatio": 3.5,
               "priceToBook": 12.0, "returnOnEquity": 0.15, "profitMargins": 0.08,
               "revenueGrowth": -0.09, "earningsGrowth": -0.55, "debtToEquity": 0.2,
               "currentRatio": 1.8, "dividendYield": 0.0, "freeCashflow": 2e9,
               "beta": 2.3, "targetMeanPrice": 220.0, "recommendationKey": "hold"},
}


def get_demo_history(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    ticker = ticker.upper()
    cfg = DEMO_STOCKS.get(ticker, (100.0, 0.0002, 0.015, hash(ticker) % 100))
    start, trend, vol, seed = cfg[0], cfg[1], cfg[2], cfg[3]

    period_days = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 63, "6mo": 126,
                   "1y": 252, "2y": 504, "5y": 1260, "10y": 2520}
    n = period_days.get(period, 252)

    if interval in ("1wk",):
        n = n // 5
        vol *= np.sqrt(5)
    elif interval in ("1mo",):
        n = n // 21
        vol *= np.sqrt(21)

    df = generate_price_series(n=max(n, 30), start_price=start, trend=trend, volatility=vol, seed=seed)
    return df


def get_demo_info(ticker: str) -> dict:
    ticker = ticker.upper()
    base = DEMO_FUNDAMENTALS.get(ticker, {})
    cfg = DEMO_STOCKS.get(ticker, (100.0, 0.0002, 0.015, 42))
    current_price = cfg[0] * (1 + np.random.default_rng(cfg[3]).normal(0.10, 0.05))
    if base:
        info = dict(base)
        info["currentPrice"] = current_price
        info["regularMarketPrice"] = current_price
        info["targetMeanPrice"] = info.get("targetMeanPrice", current_price * 1.15)
        return info
    return {
        "longName": ticker, "sector": "N/A", "industry": "N/A",
        "marketCap": 50e9, "trailingPE": 20.0, "forwardPE": 18.0,
        "pegRatio": 1.5, "priceToBook": 3.0, "returnOnEquity": 0.15,
        "profitMargins": 0.12, "revenueGrowth": 0.08, "earningsGrowth": 0.10,
        "debtToEquity": 0.5, "currentRatio": 1.5, "dividendYield": 0.01,
        "freeCashflow": 2e9, "beta": 1.1, "targetMeanPrice": current_price * 1.12,
        "recommendationKey": "buy", "currentPrice": current_price,
        "regularMarketPrice": current_price,
    }
