from dataclasses import dataclass, field
from data.fetcher import fetch_info


@dataclass
class FundamentalData:
    ticker: str
    name: str = ""
    sector: str = ""
    industry: str = ""
    market_cap: float = 0.0
    pe_ratio: float = 0.0
    forward_pe: float = 0.0
    peg_ratio: float = 0.0
    pb_ratio: float = 0.0
    ps_ratio: float = 0.0
    ev_ebitda: float = 0.0
    roe: float = 0.0
    roa: float = 0.0
    profit_margin: float = 0.0
    revenue_growth: float = 0.0
    earnings_growth: float = 0.0
    debt_to_equity: float = 0.0
    current_ratio: float = 0.0
    quick_ratio: float = 0.0
    dividend_yield: float = 0.0
    payout_ratio: float = 0.0
    free_cash_flow: float = 0.0
    beta: float = 1.0
    analyst_target: float = 0.0
    analyst_rating: str = ""
    recommendation: str = ""
    upside_potential: float = 0.0
    score: float = 0.0
    signals: list[str] = field(default_factory=list)


def compute_fundamental(ticker: str) -> FundamentalData:
    info = fetch_info(ticker)
    fd = FundamentalData(ticker=ticker)

    fd.name         = info.get("longName", ticker)
    fd.sector       = info.get("sector", "N/A")
    fd.industry     = info.get("industry", "N/A")
    fd.market_cap   = info.get("marketCap", 0) or 0
    fd.pe_ratio     = info.get("trailingPE", 0) or 0
    fd.forward_pe   = info.get("forwardPE", 0) or 0
    fd.peg_ratio    = info.get("pegRatio", 0) or 0
    fd.pb_ratio     = info.get("priceToBook", 0) or 0
    fd.ps_ratio     = info.get("priceToSalesTrailing12Months", 0) or 0
    fd.ev_ebitda    = info.get("enterpriseToEbitda", 0) or 0
    fd.roe          = info.get("returnOnEquity", 0) or 0
    fd.roa          = info.get("returnOnAssets", 0) or 0
    fd.profit_margin   = info.get("profitMargins", 0) or 0
    fd.revenue_growth  = info.get("revenueGrowth", 0) or 0
    fd.earnings_growth = info.get("earningsGrowth", 0) or 0
    fd.debt_to_equity  = info.get("debtToEquity", 0) or 0
    fd.current_ratio   = info.get("currentRatio", 0) or 0
    fd.quick_ratio     = info.get("quickRatio", 0) or 0
    fd.dividend_yield  = info.get("dividendYield", 0) or 0
    fd.payout_ratio    = info.get("payoutRatio", 0) or 0
    fd.free_cash_flow  = info.get("freeCashflow", 0) or 0
    fd.beta            = info.get("beta", 1.0) or 1.0

    current_price      = info.get("currentPrice") or info.get("regularMarketPrice") or 0
    fd.analyst_target  = info.get("targetMeanPrice", 0) or 0
    fd.analyst_rating  = info.get("recommendationKey", "") or ""
    fd.recommendation  = info.get("recommendationMean", 0) or 0

    if fd.analyst_target and current_price:
        fd.upside_potential = (fd.analyst_target - current_price) / current_price * 100

    score = 0.0
    signals = []

    # Valuation scoring
    if 0 < fd.pe_ratio < 15:
        signals.append(f"P/E attractif ({fd.pe_ratio:.1f}) → sous-évalué")
        score += 20
    elif 15 <= fd.pe_ratio < 25:
        score += 10
    elif fd.pe_ratio > 40:
        signals.append(f"P/E élevé ({fd.pe_ratio:.1f}) → valorisation tendue")
        score -= 15

    if 0 < fd.peg_ratio < 1:
        signals.append(f"PEG < 1 ({fd.peg_ratio:.2f}) → croissance sous-évaluée")
        score += 18
    elif 1 <= fd.peg_ratio < 2:
        score += 8
    elif fd.peg_ratio > 3:
        score -= 12

    # Profitability
    if fd.roe > 0.20:
        signals.append(f"ROE élevé ({fd.roe*100:.1f}%) → entreprise très rentable")
        score += 15
    elif fd.roe > 0.10:
        score += 8

    if fd.profit_margin > 0.20:
        signals.append(f"Marge nette excellente ({fd.profit_margin*100:.1f}%)")
        score += 12
    elif fd.profit_margin > 0.10:
        score += 6

    # Growth
    if fd.revenue_growth > 0.20:
        signals.append(f"Croissance revenus forte ({fd.revenue_growth*100:.1f}%)")
        score += 15
    elif fd.revenue_growth > 0.05:
        score += 8
    elif fd.revenue_growth < 0:
        signals.append(f"Revenus en baisse ({fd.revenue_growth*100:.1f}%)")
        score -= 10

    if fd.earnings_growth > 0.20:
        score += 10
    elif fd.earnings_growth < 0:
        score -= 10

    # Financial health
    if fd.debt_to_equity > 0:
        if fd.debt_to_equity < 0.5:
            score += 10
        elif fd.debt_to_equity > 2.0:
            signals.append(f"Dette/capitaux élevé ({fd.debt_to_equity:.1f}) → risque financier")
            score -= 12

    if fd.current_ratio > 1.5:
        score += 8
    elif fd.current_ratio < 1.0:
        signals.append("Liquidité faible → risque court terme")
        score -= 10

    # Free cash flow
    if fd.free_cash_flow > 0:
        score += 8

    # Analyst consensus
    if fd.upside_potential > 20:
        signals.append(f"Potentiel haussier analystes: +{fd.upside_potential:.1f}%")
        score += 12
    elif fd.upside_potential < -10:
        signals.append(f"Objectif analystes sous le prix actuel: {fd.upside_potential:.1f}%")
        score -= 10

    if fd.analyst_rating in ("strong_buy", "buy"):
        score += 8
    elif fd.analyst_rating in ("sell", "strong_sell"):
        score -= 8

    fd.signals = signals
    fd.score = max(-100.0, min(100.0, score))
    return fd


def format_market_cap(mc: float) -> str:
    if mc >= 1e12:
        return f"${mc/1e12:.2f}T"
    elif mc >= 1e9:
        return f"${mc/1e9:.2f}B"
    elif mc >= 1e6:
        return f"${mc/1e6:.2f}M"
    return f"${mc:.0f}"
