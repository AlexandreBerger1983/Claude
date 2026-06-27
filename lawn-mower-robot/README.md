# Robot Tondeuse / Poubelles - Style Johnny 5

Robot autonome et télécommandé basé sur Raspberry Pi, inspiré de Johnny 5.
Il tond la pelouse et sort les poubelles grâce à ses deux bras robotiques.

## Fonctionnalités

- **Tonte automatique** : déplacement en zigzag avec détection des bords (capteurs ultrasons)
- **Gestion des poubelles** : deux bras articulés avec pinces pour saisir et déplacer les poubelles
- **Contrôle à distance** : interface web responsive accessible depuis smartphone ou PC
- **Modes de fonctionnement** :
  - Manuel : joystick virtuel via l'interface web
  - Auto-tonte : algorithme de couverture de zone
  - Tâche bras : séquences programmées pour les poubelles
- **Sécurité** : arrêt d'urgence, détection d'obstacles, watchdog de connexion

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
