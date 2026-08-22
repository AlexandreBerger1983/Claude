#!/usr/bin/env bash
# Script d'installation du robot tondeuse sur Raspberry Pi OS
set -euo pipefail

echo "=== Installation Johnny-Mow ==="

# Mise à jour système
sudo apt-get update -y
sudo apt-get install -y \
  python3-pip python3-venv python3-dev \
  python3-picamera2 libcamera-dev \
  i2c-tools libi2c-dev \
  git

# Activer I2C et la caméra
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_camera 0

# Répertoire du projet
PROJECT_DIR="$HOME/lawn-mower-robot"
if [ ! -d "$PROJECT_DIR" ]; then
  echo "ERREUR : projet non trouvé dans $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

# Environnement virtuel
python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# Configuration initiale
if [ ! -f config/robot.yaml ]; then
  cp config/robot.example.yaml config/robot.yaml
  echo "INFO : config/robot.yaml créé - veuillez adapter le câblage GPIO"
fi

# Service systemd
sudo cp scripts/systemd/johnny-mow.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable johnny-mow.service

echo ""
echo "=== Installation terminée ==="
echo "Vérifier le câblage dans config/robot.yaml"
echo "Puis démarrer avec : sudo systemctl start johnny-mow"
echo "Interface web : http://$(hostname -I | awk '{print $1}'):5000"
