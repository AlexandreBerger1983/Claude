# Stock Market Analyzer

Application d'analyse boursière en terminal avec analyse technique, fondamentale et recommandations IA (Claude).

## Fonctionnalités

- **Analyse technique** : RSI, MACD, Bandes de Bollinger, SMA/EMA, ADX, Stochastique, OBV, ATR
- **Analyse fondamentale** : P/E, PEG, ROE, marges, croissance, dette, flux de trésorerie libre
- **Analyse momentum** : performances sur 1W/1M/3M/6M/1Y, hauts/bas 52 semaines
- **Recommandations IA** : analyse Claude avec recommandations court/moyen/long terme + opportunités short
- **Screener** : scan de watchlists entières pour identifier les meilleures opportunités
- **Vente à découvert** : identification des meilleurs candidats short

## Installation

```bash
cd stock-market-analyzer
pip install -r requirements.txt
```

Créer un fichier `.env` avec votre clé API Claude (optionnel mais recommandé) :
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Utilisation

### Menu interactif
```bash
python main.py
```

### Analyser un titre
```bash
python main.py --analyze AAPL
python main.py --analyze AAPL MSFT NVDA --mode medium
python main.py --analyze TSLA --mode long
```

### Screener
```bash
python main.py --screen                        # S&P500 Top 20
python main.py --screen --list TECH            # Secteur Tech
python main.py --screen --list FINANCE --mode medium
```

### Opportunités short
```bash
python main.py --shorts
python main.py --shorts --list SP500_TOP
```

### Comparaison
```bash
python main.py --compare AAPL MSFT GOOGL NVDA
```

### Options
```
--mode short|medium|long    Horizon d'investissement (défaut: short)
--list <WATCHLIST>          Liste à scanner (SP500_TOP, TECH, ENERGY, FINANCE, HEALTHCARE, ETF)
--no-ai                     Désactiver l'analyse IA
```

## Mode démo (sans accès réseau)

```bash
DEMO_MODE=1 python main.py --analyze AAPL
```

## Watchlists disponibles

| Nom | Contenu |
|-----|---------|
| SP500_TOP | Top 20 S&P500 par capitalisation |
| TECH | Grandes tech (AAPL, MSFT, NVDA, GOOGL...) |
| ENERGY | Secteur énergie (XOM, CVX, COP...) |
| FINANCE | Secteur financier (JPM, BAC, GS...) |
| HEALTHCARE | Santé (UNH, JNJ, LLY, ABBV...) |
| ETF | ETFs majeurs (SPY, QQQ, GLD, TLT...) |

## Scoring

Le score combiné va de -100 (très baissier) à +100 (très haussier) :

| Score | Verdict |
|-------|---------|
| ≥ 60  | FORT ACHAT |
| ≥ 35  | ACHAT |
| ≥ 10  | SURVEILLER |
| ≥ -15 | NEUTRE |
| ≥ -40 | ALLÉGER |
| < -40 | VENDRE |

**Pondération** : Technique 40% · Fondamentale 35% · Momentum 25%

## Architecture

```
stock-market-analyzer/
├── main.py                  # Point d'entrée CLI
├── config.py                # Configuration, watchlists, seuils
├── requirements.txt
├── analyzers/
│   ├── technical.py         # RSI, MACD, BB, SMA, ADX, Stochastique
│   ├── fundamental.py       # P/E, ROE, croissance, dette
│   ├── momentum.py          # Performances historiques
│   └── ai_advisor.py        # Intégration Claude API
├── data/
│   ├── fetcher.py           # yfinance + fallback démo
│   └── demo_data.py         # Données simulées (mode offline)
├── strategies/
│   └── screener.py          # Screener multi-titres, détection short
└── ui/
    ├── display.py           # Tableaux Rich, panels, progression
    └── charts.py            # Graphiques terminal (plotext)
```
