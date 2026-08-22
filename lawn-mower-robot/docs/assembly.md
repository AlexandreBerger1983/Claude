# Guide d'assemblage - Johnny-Mow

## Châssis

Le robot utilise une base différentielle à 2 roues motrices + roulette folle :

```
         ┌─────────────────────┐
  Bras G ─┤  [Cam] [RasPi]     ├─ Bras D
         │   [PCA9685]         │
  ━━━━━━━┤   [L298N]  [ESC]   ├━━━━━━━
  Roue G  │   [Batterie]        │  Roue D
  ━━━━━━━┴─────────────────────┴━━━━━━━
                 ● roulette
                 ↓ lame (dessous)
```

## Bras robotiques

Chaque bras comporte 4 degrés de liberté :

```
Épaule (rotation horizontale)
  └─ Coude (élévation)
       └─ Poignet (orientation)
            └─ Pince (ouverture/fermeture)
```

**Servos recommandés :**
- Épaule/Coude : MG996R (15 kg·cm, métal)
- Poignet : SG5010 (5 kg·cm)
- Pince : SG90 ou MG90S

## Lame de tonte

- Moteur brushless 2212 1000KV
- ESC 30A
- Lame en acier trempé, diamètre 20 cm
- Montée sous le châssis avec garde-corps de sécurité

**SÉCURITÉ** : la lame est protégée par un capot bas ne laissant passer que l'herbe.

## Assemblage étape par étape

1. Fixer les motoréducteurs sur le châssis
2. Monter la lame et le moteur brushless sous le châssis
3. Installer le Raspberry Pi et le PCA9685 sur le pont supérieur
4. Monter les capteurs ultrasons aux 4 coins
5. Assembler les bras et les fixer de part et d'autre
6. Câbler selon le schéma `wiring.md`
7. Connecter la batterie et vérifier les tensions
8. Calibrer les ESC avant le premier démarrage

## Calibration des ESC

```bash
# Mettre l'ESC en mode calibration :
# 1. Mettre les gaz à fond (max_pulse dans robot.yaml)
# 2. Brancher l'alimentation - l'ESC bipe
# 3. Mettre les gaz à zéro (min_pulse) - l'ESC confirme
# 4. Prêt à l'emploi
```

## Calibration des virages (mowing.py)

Mesurer le temps réel pour un tour complet à 100% de vitesse et ajuster
`full_rotation_time` dans `MowingController._estimate_turn_time()`.
