import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from analyzers.technical import TechnicalSignals
from analyzers.fundamental import FundamentalData
from analyzers.momentum import MomentumData


def build_analysis_prompt(
    ticker: str,
    tech: TechnicalSignals,
    fund: FundamentalData,
    mom: MomentumData,
    combined_score: float,
) -> str:
    return f"""Tu es un analyste financier senior expert en analyse boursière. Analyse les données suivantes et fournis des recommandations d'investissement précises en français.

TICKER: {ticker} — {fund.name}
Secteur: {fund.sector} | Industrie: {fund.industry}
Capitalisation: {fund.market_cap/1e9:.2f}B$ | Bêta: {fund.beta:.2f}

═══ ANALYSE TECHNIQUE (score: {tech.score:.0f}/100) ═══
Prix actuel: ${tech.price:.2f} (variation jour: {tech.price_change_pct:+.2f}%)
Tendance: {tech.trend}
RSI(14): {tech.rsi:.1f} | MACD: {tech.macd:.3f} | Signal MACD: {tech.macd_signal:.3f}
BB: bas={tech.bb_lower:.2f} / mid={tech.bb_middle:.2f} / haut={tech.bb_upper:.2f} (position: {tech.bb_pct:.0%})
SMA20: {tech.sma_20:.2f} | SMA50: {tech.sma_50:.2f} | SMA200: {tech.sma_200:.2f}
ADX: {tech.adx:.1f} | Stoch K/D: {tech.stoch_k:.1f}/{tech.stoch_d:.1f}
Volume ratio: {tech.volume_ratio:.2f}x | OBV: {tech.obv_trend}
ATR(14): {tech.atr:.2f}
Signaux techniques: {'; '.join(tech.signals) if tech.signals else 'Aucun signal fort'}

═══ ANALYSE FONDAMENTALE (score: {fund.score:.0f}/100) ═══
P/E: {fund.pe_ratio:.1f} | P/E forward: {fund.forward_pe:.1f} | PEG: {fund.peg_ratio:.2f}
P/B: {fund.pb_ratio:.2f} | P/S: {fund.ps_ratio:.2f} | EV/EBITDA: {fund.ev_ebitda:.1f}
ROE: {fund.roe*100:.1f}% | ROA: {fund.roa*100:.1f}% | Marge nette: {fund.profit_margin*100:.1f}%
Croissance revenus: {fund.revenue_growth*100:.1f}% | Croissance bénéfices: {fund.earnings_growth*100:.1f}%
Dette/CP: {fund.debt_to_equity:.2f} | Ratio courant: {fund.current_ratio:.2f}
Dividende: {fund.dividend_yield*100:.2f}% | FCF: {fund.free_cash_flow/1e9:.2f}B$
Objectif analystes: ${fund.analyst_target:.2f} ({fund.upside_potential:+.1f}%) | Consensus: {fund.analyst_rating}
Signaux fondamentaux: {'; '.join(fund.signals) if fund.signals else 'Aucun signal fort'}

═══ MOMENTUM (score: {mom.score:.0f}/100) ═══
Performances: 1W={mom.return_1w:+.1f}% | 1M={mom.return_1m:+.1f}% | 3M={mom.return_3m:+.1f}% | 6M={mom.return_6m:+.1f}% | 1Y={mom.return_1y:+.1f}%
52W: haut=${mom.high_52w:.2f} ({mom.pct_from_high:+.1f}%) | bas=${mom.low_52w:.2f} ({mom.pct_from_low:+.1f}%)
Volume: {mom.vol_trend}

SCORE COMBINÉ: {combined_score:.0f}/100

════════════════════════════════════════

Fournis une analyse structurée avec:

1. **VERDICT GLOBAL** (1 ligne: ACHETER/VENDRE/NEUTRE/SURVEILLER + niveau de conviction 1-5 étoiles)

2. **COURT TERME (1-4 semaines)**
   - Recommandation: ACHAT/VENTE/NEUTRE
   - Points d'entrée suggérés et stop-loss
   - Objectif de prix
   - Catalyseurs à surveiller

3. **MOYEN TERME (1-6 mois)**
   - Recommandation: ACHAT/RENFORCER/ALLÉGER/VENTE
   - Thèse d'investissement
   - Risques principaux
   - Objectif de prix

4. **LONG TERME (1-5 ans)**
   - Recommandation: ACCUMULER/CONSERVER/ÉVITER
   - Analyse des fondamentaux et positionnement concurrentiel
   - Risques structurels
   - Potentiel de rendement estimé

5. **OPPORTUNITÉ DE VENTE À DÉCOUVERT** (si pertinent)
   - L'action est-elle une bonne candidate pour un short?
   - Raisons techniques et/ou fondamentales
   - Niveaux d'entrée short et stop-loss

6. **RÉSUMÉ EN 3 POINTS CLÉS**

Sois précis, actionnable et utilise les données fournies. Mentionne les niveaux de prix spécifiques."""


def get_ai_analysis(
    ticker: str,
    tech: TechnicalSignals,
    fund: FundamentalData,
    mom: MomentumData,
    combined_score: float,
) -> str:
    if not ANTHROPIC_API_KEY:
        return _fallback_analysis(ticker, tech, fund, mom, combined_score)

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    prompt = build_analysis_prompt(ticker, tech, fund, mom, combined_score)

    try:
        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as e:
        return f"[Erreur API Claude: {e}]\n\n" + _fallback_analysis(ticker, tech, fund, mom, combined_score)


def _fallback_analysis(
    ticker: str,
    tech: TechnicalSignals,
    fund: FundamentalData,
    mom: MomentumData,
    combined_score: float,
) -> str:
    if combined_score >= 60:
        verdict = "ACHETER ★★★★"
        short_rec = "ACHAT — momentum haussier confirmé"
        long_rec = "ACCUMULER — fondamentaux solides"
    elif combined_score >= 30:
        verdict = "SURVEILLER ★★★"
        short_rec = "NEUTRE — attendre confirmation"
        long_rec = "CONSERVER — potentiel intéressant"
    elif combined_score >= -10:
        verdict = "NEUTRE ★★"
        short_rec = "NEUTRE — pas de signal clair"
        long_rec = "CONSERVER en attendant clarification"
    elif combined_score >= -40:
        verdict = "ALLÉGER ★★"
        short_rec = "ALLÉGER — signaux baissiers"
        long_rec = "RÉDUIRE la position"
    else:
        verdict = "VENDRE ★"
        short_rec = "VENTE — tendance baissière forte"
        long_rec = "ÉVITER — détérioration fondamentale"

    short_candidate = tech.rsi > 65 and mom.return_1m > 10 and tech.bb_pct > 0.85
    short_text = "Candidat short potentiel" if short_candidate else "Pas de signal short clair"

    return f"""**VERDICT GLOBAL**: {verdict}

**COURT TERME**: {short_rec}
- Support: ${tech.bb_lower:.2f} | Résistance: ${tech.bb_upper:.2f}
- Stop-loss suggéré: ${tech.price * 0.95:.2f} (-5%)

**MOYEN TERME**: Score momentum {mom.return_3m:+.1f}% sur 3 mois
- Objectif analystes: ${fund.analyst_target:.2f} ({fund.upside_potential:+.1f}%)

**LONG TERME**: {long_rec}
- Croissance revenus: {fund.revenue_growth*100:.1f}% | ROE: {fund.roe*100:.1f}%

**SHORT**: {short_text}
- RSI: {tech.rsi:.1f} | Position BB: {tech.bb_pct:.0%} | Momentum 1M: {mom.return_1m:+.1f}%

**3 POINTS CLÉS**:
1. Score technique: {tech.score:.0f}/100 — Tendance: {tech.trend}
2. Score fondamental: {fund.score:.0f}/100 — P/E: {fund.pe_ratio:.1f}
3. Score momentum: {mom.score:.0f}/100 — Perf 1 an: {mom.return_1y:+.1f}%"""
