# Batterie & retour à la base (Bloc 3) - Johnny-Mow

Pour tourner sans que personne ne rebranche le robot au chalet : surveillance
de la charge et retour automatique à la station de recharge.

---

## Capteur de charge — INA219

Petit module I2C (~5 $) qui mesure la tension et le courant du pack.

### Câblage
| INA219 | Raccordement |
|--------|-------------|
| VCC | 3.3V du Pi |
| GND | GND |
| SDA | GPIO2 (pin 3) |
| SCL | GPIO3 (pin 5) |
| Vin+ | borne + batterie |
| Vin− | vers le reste du circuit (mesure en série) |

Partage le bus I2C avec le PCA9685 et le MPU6050 (adresses distinctes).
Si l'INA219 est en 0x40 comme le PCA9685, ponter A0 pour le passer en **0x41**
et ajuster `i2c_address` dans la config.

### Configuration (`robot.yaml`)
```yaml
battery:
  enabled: true
  cells: 3                 # pack LiPo 3S (ou 4)
  return_threshold: 25     # % → retour à la base
  shutdown_threshold: 12   # % → arrêt d'urgence
  dock: {lat: 45.5019, lon: -73.5675}   # position GPS de la station
```

---

## Comportement

| Niveau | Action |
|--------|--------|
| > 25 % | Fonctionnement normal |
| ≤ 25 % | **Retour à la base** : arrête la tonte, navigue vers `dock` (GPS) |
| ≤ 12 % | **Arrêt d'urgence** : coupe tout pour protéger la batterie |

Une hystérésis réarme les alertes une fois le pack rechargé (> 35 %), pour
éviter les déclenchements répétés autour du seuil.

L'interface affiche le niveau (🔋 / 🪫 / 🔌 en charge) et une notification est
envoyée à l'opérateur en cas de batterie faible/critique.

---

## Station de recharge

Le retour **navigue jusqu'aux coordonnées GPS de la base** (précision RTK
~2 cm). L'accostage final sur les contacts de charge demande un guidage de
précision supplémentaire, non fourni par le code seul :

- **Option simple** : plots de guidage en entonnoir + contacts larges à
  ressort ; la précision RTK suffit souvent à s'y engager.
- **Option robuste** : balise infrarouge sur la base + capteur IR à l'avant du
  robot pour l'alignement final (à ajouter selon ta station).

> Estimer l'état de charge par la tension reste approximatif (la tension varie
> sous charge). Pour un suivi précis, un moniteur de coulombs dédié serait plus
> fiable — mais l'INA219 suffit largement pour déclencher un retour à temps.
