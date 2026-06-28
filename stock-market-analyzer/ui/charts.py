import plotext as plt
import pandas as pd
import numpy as np


def plot_price_chart(ticker: str, df: pd.DataFrame, width: int = 80, height: int = 20) -> None:
    if df is None or df.empty:
        return

    close = df["Close"].squeeze().tolist()
    dates = [str(d)[:10] for d in df.index.tolist()]
    n = len(close)

    # Subsample for display
    step = max(1, n // width)
    close_s = close[::step]
    dates_s = dates[::step]

    plt.clf()
    plt.theme("dark")
    plt.plot_size(width, height)
    plt.title(f"Prix — {ticker}")
    plt.xlabel("Date")
    plt.ylabel("Prix ($)")

    color = "green" if close[-1] >= close[0] else "red"
    plt.plot(close_s, color=color, label=ticker)

    # SMA 20
    sma20_full = pd.Series(close).rolling(20).mean().tolist()
    sma20 = sma20_full[::step]
    plt.plot(sma20, color="yellow", label="SMA20")

    plt.show()


def plot_rsi(ticker: str, rsi_series: list[float], width: int = 80, height: int = 10) -> None:
    plt.clf()
    plt.theme("dark")
    plt.plot_size(width, height)
    plt.title(f"RSI(14) — {ticker}")
    plt.ylim(0, 100)

    step = max(1, len(rsi_series) // width)
    rsi_s = rsi_series[::step]

    plt.plot(rsi_s, color="cyan", label="RSI")
    plt.hline(70, color="red")
    plt.hline(30, color="green")
    plt.show()


def plot_volume(ticker: str, df: pd.DataFrame, width: int = 80, height: int = 10) -> None:
    if df is None or "Volume" not in df.columns:
        return
    volume = df["Volume"].squeeze().tolist()
    step = max(1, len(volume) // width)
    vol_s = volume[::step]

    plt.clf()
    plt.theme("dark")
    plt.plot_size(width, height)
    plt.title(f"Volume — {ticker}")
    plt.bar(vol_s, color="blue")
    plt.show()
