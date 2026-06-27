# Schéma de câblage - Johnny-Mow

## Raspberry Pi 4 - Broches GPIO (numérotation BCM)

### Moteurs de déplacement (Pont H L298N ou TB6612FNG)

| Composant      | GPIO BCM | Pin physique |
|---------------|----------|-------------|
| Moteur G IN1  | 17       | 11          |
| Moteur G IN2  | 27       | 13          |
| Moteur G PWM  | 18       | 12          |
| Moteur D IN1  | 22       | 15          |
| Moteur D IN2  | 23       | 16          |
| Moteur D PWM  | 24       | 18          |

### Lame de tonte (ESC)

| Composant        | GPIO BCM | Pin physique |
|-----------------|----------|-------------|
| Signal ESC lame | 25       | 22          |

### Capteurs ultrasons HC-SR04

| Capteur       | TRIG GPIO | ECHO GPIO |
|--------------|-----------|-----------|
| Avant (Front)| 5         | 6         |
| Arrière (Rear)| 13       | 19        |
| Gauche (Left)| 26        | 20        |
| Droite (Right)| 21       | 16        |

> **ATTENTION** : les pins ECHO du HC-SR04 fonctionnent en 5V.
> Utiliser un diviseur de tension (1kΩ + 2kΩ) ou un level-shifter pour protéger le Pi.

### Bouton d'arrêt d'urgence

| Composant            | GPIO BCM | Pin physique |
|--------------------|----------|-------------|
| Bouton d'urgence   | 4        | 7           |
| GND                | GND      | 6 ou 9 ou 14|

Câbler le bouton entre GPIO4 et GND (résistance pull-up interne activée).

### Servomoteurs - Contrôleur PCA9685 (I2C)

Le PCA9685 se connecte via I2C :

| PCA9685 | Raspberry Pi      |
|---------|------------------|
| VCC     | 3.3V (pin 1)     |
| GND     | GND (pin 6)      |
| SDA     | GPIO2 (pin 3)    |
| SCL     | GPIO3 (pin 5)    |
| V+      | 6V alimentation servos |

**Attribution des canaux PCA9685 :**

| Canal | Servo                    |
|-------|--------------------------|
| 0     | Bras gauche - épaule     |
| 1     | Bras gauche - coude      |
| 2     | Bras gauche - poignet    |
| 3     | Bras gauche - pince      |
| 4     | Bras droit - épaule      |
| 5     | Bras droit - coude       |
| 6     | Bras droit - poignet     |
| 7     | Bras droit - pince       |

## Alimentation

```
Batterie LiPo 3S (11.1V) ou 4S (14.8V)
    │
    ├─── Régulateur 5V 3A ──── Raspberry Pi
    ├─── Régulateur 6V 5A ──── Servomoteurs (via PCA9685 V+)
    ├─── L298N / TB6612     ── Moteurs de roues (12V direct)
    └─── ESC               ── Moteur de lame (12V direct)
```

## Vérification I2C

```bash
i2cdetect -y 1
# Doit afficher 0x40 (PCA9685)
```
