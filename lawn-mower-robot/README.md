# Robot Tondeuse / Poubelles - Style Johnny 5

Robot autonome et télécommandé basé sur Raspberry Pi, inspiré de Johnny 5.
Il tond la pelouse et sort les poubelles grâce à ses deux bras robotiques.

## Fonctionnalités

- **Tonte automatique** : zigzag avec détection des bords, ou tonte GPS RTK dans une zone délimitée
- **Gestion des poubelles** : deux bras articulés + trajet automatique cabanon ↔ bord de rue (GPS)
- **Contrôle à distance sécurisé** : interface web (authentification), accessible via VPN
- **Imitation par webcam** : le robot reproduit les mouvements de bras, mains et tête de l'opérateur (MediaPipe)
- **Vision embarquée** : caméra montée sur la tête mobile (suit le regard)
- **Modes de fonctionnement** :
  - Manuel : joystick virtuel / clavier
  - Auto-tonte : zigzag ou couverture GPS
  - Téléopération : imitation posture
  - Autonome : tâches planifiées (tonte hebdo, poubelles)
- **Sécurité sans surveillance** : détection personne/animal (coupe la lame), anti-soulèvement (IMU), pare-chocs
- **Autonomie** : surveillance batterie + retour automatique à la base de recharge
- **Supervision** : notifications courriel/SMS/webhook, capteur de pluie

## Documentation

| Sujet | Fichier |
|-------|---------|
| Câblage GPIO | [docs/wiring.md](docs/wiring.md) |
| Assemblage mécanique | [docs/assembly.md](docs/assembly.md) |
| Impression 3D | [3d-parts/IMPRESSION.md](3d-parts/IMPRESSION.md) |
| Caméra Wyze | [docs/camera_wyze.md](docs/camera_wyze.md) |
| Accès distant & VPN | [docs/remote_access.md](docs/remote_access.md) |
| Sécurité sans surveillance | [docs/safety.md](docs/safety.md) |
| Automatisation & notifications | [docs/automation.md](docs/automation.md) |
| Batterie & retour base | [docs/battery.md](docs/battery.md) |
| **Mise en service (checklist A→Z)** | [docs/mise_en_service.md](docs/mise_en_service.md) |

## Architecture matérielle

```
Raspberry Pi 4 (cerveau central)
├── HAT moteurs (L298N ou TB6612FNG)
│   ├── Moteur gauche (roue)
│   └── Moteur droit (roue)
├── Contrôleur servos PCA9685 (I2C)
│   ├── Bras gauche : épaule, coude, poignet, pince (4 servos)
│   └── Bras droit  : épaule, coude, poignet, pince (4 servos)
├── ESC moteur lame (tonte)
├── Capteurs ultrasons HC-SR04 (avant, arrière, gauche, droite)
├── Caméra Raspberry Pi (streaming vidéo)
├── Module GPS (optionnel, pour cartographie)
└── Wi-Fi intégré (serveur web de contrôle)
```

## Installation

```bash
# Cloner le dépôt
git clone <repo>
cd lawn-mower-robot

# Installer les dépendances
pip install -r requirements.txt

# Configurer
cp config/robot.example.yaml config/robot.yaml
# Éditer config/robot.yaml selon votre câblage

# Lancer le serveur de contrôle
python src/main.py
```

## Accès à l'interface web

Ouvrir `http://<ip-raspberry>:5000` depuis votre réseau local.

## Structure du projet

```
lawn-mower-robot/
├── src/
│   ├── main.py              # Point d'entrée
│   ├── hardware/
│   │   ├── motors.py        # Contrôle des moteurs de déplacement
│   │   ├── blade.py         # Contrôle de la lame de tonte
│   │   ├── arms.py          # Contrôle des bras robotiques
│   │   └── sensors.py       # Capteurs ultrasons + GPS
│   ├── control/
│   │   ├── robot.py         # Contrôleur principal du robot
│   │   ├── mowing.py        # Algorithme de tonte automatique
│   │   └── trash.py         # Séquences pour les poubelles
│   ├── web/
│   │   ├── server.py        # Serveur Flask + WebSocket
│   │   └── static/          # Interface web (HTML/CSS/JS)
│   └── utils/
│       ├── config.py        # Chargement configuration
│       └── logger.py        # Journalisation
├── config/
│   ├── robot.example.yaml   # Exemple de configuration
│   └── mowing_zones.yaml    # Zones de tonte
├── tests/
├── scripts/
│   ├── install.sh           # Script d'installation Raspberry Pi
│   └── systemd/             # Service systemd pour démarrage auto
└── docs/
    ├── wiring.md            # Schéma de câblage
    └── assembly.md          # Guide d'assemblage
```

## Sécurité

- **Watchdog** : arrêt automatique si connexion perdue > 3 secondes
- **Bouton d'arrêt d'urgence** physique (GPIO)
- **Vitesse limitée** en mode manuel télécommandé
- **Zone de sécurité** : la lame s'arrête si obstacle < 30 cm
