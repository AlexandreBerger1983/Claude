# Guide d'impression 3D - Johnny-Mow

## Logiciel requis
Télécharger **OpenSCAD** (gratuit) : https://openscad.org
Ouvrir chaque `.scad` → F6 pour compiler → Exporter en STL

---

## Liste des pièces à imprimer

| Fichier | Qté | Matériau | Remplissage | Périmètres | Supports | ~Temps |
|---------|-----|----------|-------------|------------|----------|--------|
| `chassis_base.scad` | 1 | PETG | 40% | 4 | Non | ~8h |
| `track_link.scad` | 75 | TPU 95A | 80% | 4 | Non | ~20min/pièce |
| `wheel_sprocket.scad` | 2 | PETG | 50% | 4 | Non | ~2h |
| `idler_wheel.scad` | 2 | PETG | 40% | 4 | Non | ~1h30 |
| `motor_mount.scad` | 4 | PETG | 60% | 4 | Non | ~1h |
| `blade_guard.scad` | 1 | PETG/ABS | 60% | **6** | Non | ~3h |

> TPU pour les maillons = amortissement + adhérence sur herbe.
> Si pas de TPU, utiliser PETG rigide (mais moins silencieux).

---

## Paramètres communs

- **Température** PETG : 235°C buse / 80°C plateau
- **Température** TPU : 220°C buse / 40°C plateau (vitesse réduite 25mm/s)
- **Hauteur de couche** : 0.2mm
- **Refroidissement** : 50% pour PETG, 0% pour ABS

---

## Ajustements des paramètres

Modifier `params.scad` pour adapter aux dimensions réelles de vos moteurs et roulements avant de compiler les STL :

```
motor_D  = 37;  // mesurer le diamètre de votre moteur
wheel_bore = 6.2;  // diamètre axe + 0.2mm de jeu
idler_bore = 8.2;  // pour roulement 608 standard
```

---

## Quincaillerie nécessaire

| Pièce | Quantité |
|-------|----------|
| Vis M3 × 10mm (fixation supports moteur) | 16 |
| Vis M3 × 6mm (bride jupe lame) | 6 |
| Vis M3 × 20mm (serrage moteur) | 4 |
| Vis M2.5 × 6mm (Raspberry Pi) | 4 |
| Roulement 608 (8×22×7) | 4 |
| Fil acier ø4mm (goupilles chenille) | 1m |
| Écrous M3 | 20 |
| Rondelles M3 | 20 |

---

## Ordre d'assemblage

1. Imprimer et assembler les **maillons de chenille** d'abord (test fit)
2. Imprimer les **roues** et vérifier l'engagement chenille
3. Imprimer le **châssis** en dernier (après avoir confirmé que les roues s'y adaptent)
4. Fixer les **supports moteur** avant de monter les rails
5. Monter la **jupe de lame** sous le châssis
