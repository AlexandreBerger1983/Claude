# Sécurité sans surveillance (Bloc 2) - Johnny-Mow

Pour un chalet locatif avec des inconnus, des enfants et des animaux près
d'une lame en rotation, plusieurs sécurités **coupent automatiquement la lame** :

| Danger | Capteur | Réaction |
|--------|---------|----------|
| Personne / animal à proximité | Caméra + IA | Coupe lame + stoppe déplacement |
| Robot soulevé / renversé | IMU (MPU6050) | Coupe lame |
| Collision | Micro-switches pare-chocs | Coupe lame + stoppe |

Quand un danger est levé, **la lame reste coupée** jusqu'à une relance manuelle
volontaire — jamais de redémarrage automatique près d'une personne.

---

## 1. Détection personne/animal (caméra)

Utilise MediaPipe Object Detection (modèle EfficientDet-Lite, COCO).

### Installation
```bash
pip install mediapipe
mkdir -p models
wget -O models/efficientdet_lite0.tflite \
  https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite
```

### Configuration (`robot.yaml`)
```yaml
safety:
  person_detection:
    enabled: true
    min_confidence: 0.5
    classes: ["person", "cat", "dog"]
    fps: 4
    model_path: "models/efficientdet_lite0.tflite"
```

> Si `mediapipe` n'est pas installé, la détection se désactive proprement et
> la sécurité repose alors sur l'IMU + le pare-chocs. **Tester le modèle sur
> le Raspberry Pi** avant toute opération réelle (la performance dépend du Pi).

---

## 2. Capteur d'inclinaison / soulèvement (MPU6050)

Petit accéléromètre I2C (~5 $). Détecte si le robot est soulevé, penché ou
renversé.

### Câblage
| MPU6050 | Raspberry Pi |
|---------|-------------|
| VCC | 3.3V |
| GND | GND |
| SDA | GPIO2 (pin 3) |
| SCL | GPIO3 (pin 5) |

Partage le bus I2C avec le PCA9685 (adresses différentes : 0x68 vs 0x40).

### Configuration
```yaml
imu:
  enabled: true
  tilt_threshold: 35    # degrés avant coupure
```

Vérifier la détection : `i2cdetect -y 1` doit montrer `0x68`.

---

## 3. Pare-chocs de collision

Micro-switches (type fin de course) montés sur un pare-chocs souple à l'avant.
Câblés entre un GPIO et la masse (pull-up interne).

```yaml
sensors:
  bumper: [12, 7]   # GPIO des switches (contact = masse)
```

---

## Comportement et priorités

1. Le **moniteur de sécurité** tourne en tâche de fond en permanence (même à
   l'arrêt), indépendamment de l'interface web.
2. À la moindre détection → `blade.stop()` immédiat, et en tonte auto le
   déplacement s'arrête aussi.
3. Le démarrage de la lame est **refusé** tant qu'un danger est actif.
4. L'interface affiche un bandeau orange précisant le danger en cours.

> ⚠️ Ces sécurités logicielles **complètent** mais ne remplacent pas les
> sécurités physiques : garde de lame (`blade_guard`), bouton d'arrêt d'urgence
> matériel, et une lame qui s'arrête mécaniquement vite. Pour un usage locatif,
> vérifier aussi les obligations d'assurance/responsabilité.
