# Bot de paris — Mise O Jeu

Automatise des paris sur [miseojeu.com](https://www.miseojeu.com) selon une stratégie à faible risque.

## Stratégie

| Critère | Valeur par défaut |
|---------|------------------|
| Cote maximale (`MAX_ODDS`) | `1.02` (gain ≤ 2 %) |
| Durée maximale de l'événement | `24 h` |
| Fraction du solde misée | `50 %` |

Un pari est sélectionné si et seulement si :
1. Sa cote décimale est **strictement inférieure à 1.02** (quasi-certitude).
2. L'événement **commence dans les prochaines 24 heures**.

Le montant de chaque mise est **50 % du solde disponible** au moment de la vérification.

## Installation

```bash
cd mise-o-jeu
pip install -r requirements.txt
playwright install chromium
cp .env.example .env
# Éditez .env avec vos identifiants Mise O Jeu
```

## Configuration (`.env`)

```
MOJ_USERNAME=votre_identifiant
MOJ_PASSWORD=votre_mot_de_passe

MAX_ODDS=1.02
MAX_EVENT_HOURS=24
BET_FRACTION=0.50
CHECK_INTERVAL_MINUTES=15
DRY_RUN=true          # Passez à false pour placer de vrais paris
```

## Utilisation

```bash
# Simulation (DRY_RUN=true par défaut) — aucun vrai pari
python main.py --once

# Boucle automatique toutes les 15 minutes
python main.py

# Avec navigateur visible pour le débogage
python main.py --headless false --once
```

## Avertissement

Les jeux de hasard comportent des risques. Ce bot est fourni à titre éducatif.
Jouez de façon responsable — [Mise O Jeu — Aide](https://www.miseojeu.com/fr/aide).
