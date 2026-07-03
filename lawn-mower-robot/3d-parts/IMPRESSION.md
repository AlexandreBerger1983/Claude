# Guide d'impression 3D - Johnny-Mow

## STL prêts à imprimer

Les fichiers compilés sont dans le dossier `stl/` — ils peuvent être envoyés
directement au slicer (Cura, PrusaSlicer, Bambu Studio…) sans passer par OpenSCAD.

Pour modifier les dimensions (diamètre moteur, taille de maillon…) : éditer
`params.scad`, puis recompiler avec **OpenSCAD** (gratuit : https://openscad.org)
→ ouvrir le `.scad` → F6 → Exporter en STL.

---

## Liste des pièces à imprimer

| Fichier | Qté | Matériau | Remplissage | Périmètres | Supports | ~Temps |
|---------|-----|----------|-------------|------------|----------|--------|
| `stl/chassis_base.stl` | 1 | PETG | 40% | 4 | Non | ~8h |
| `stl/track_link.stl` | 75 | TPU 95A | 80% | 4 | Non | ~20min/pièce |
| `stl/track_pin.stl` | 150 | PETG | 100% | 3 | Non | ~5min/pièce |
| `stl/wheel_sprocket.stl` | 2 | PETG | 50% | 4 | Non | ~2h |
| `stl/idler_wheel.stl` | 2 | PETG | 40% | 4 | Non | ~1h30 |
| `stl/motor_mount.stl` | 4 | PETG | 60% | 4 | Non | ~1h |
| `stl/blade_guard.stl` | 1 | PETG/ABS | 60% | **6** | Non | ~3h |

> Les goupilles imprimées (`track_pin.stl`) fonctionnent, mais pour une chenille
> qui dure : couper des tiges d'acier ø4mm à 44mm (voir quincaillerie).

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
