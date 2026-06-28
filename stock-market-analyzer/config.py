import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Timeframes for analysis
TIMEFRAMES = {
    "short":  {"period": "3mo",  "interval": "1d",  "label": "Court terme  (1-4 sem)"},
    "medium": {"period": "1y",   "interval": "1wk", "label": "Moyen terme (1-6 mois)"},
    "long":   {"period": "5y",   "interval": "1mo", "label": "Long terme  (1-5 ans)"},
}

# Technical indicator thresholds
RSI_OVERSOLD   = 30
RSI_OVERBOUGHT = 70
RSI_NEUTRAL_LOW  = 40
RSI_NEUTRAL_HIGH = 60

# Scoring weights
WEIGHTS = {
    "technical":   0.40,
    "fundamental": 0.35,
    "momentum":    0.25,
}

# Top watchlists
WATCHLISTS = {
    "SP500_TOP": [
        "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "BRK-B", "LLY",
        "AVGO", "TSLA", "JPM", "UNH", "V", "XOM", "MA", "JNJ", "PG",
        "HD", "MRK", "COST",
    ],
    "TECH": [
        "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "AMD",
        "INTC", "CRM", "ORCL", "ADBE", "QCOM", "AVGO", "NOW",
    ],
    "ENERGY": [
        "XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "PXD",
    ],
    "FINANCE": [
        "JPM", "BAC", "WFC", "GS", "MS", "BLK", "C", "AXP", "USB", "TFC",
    ],
    "HEALTHCARE": [
        "UNH", "JNJ", "LLY", "ABBV", "MRK", "TMO", "ABT", "PFE", "DHR", "BMY",
    ],
    "ETF": [
        "SPY", "QQQ", "IWM", "DIA", "GLD", "TLT", "VTI", "ARKK", "SOXL", "TQQQ",
    ],
}

CLAUDE_MODEL = "claude-sonnet-4-6"
