# Caméra Wyze sur la tête - Johnny-Mow

La caméra est montée sur la tête pan/tilt du robot (support 3D
`head_camera_mount.stl`). Elle suit donc les mouvements de tête pilotés par
la téléopération : **aucun code de coordination supplémentaire n'est requis**,
il suffit d'amener le flux vidéo dans l'interface.

## ⚠️ Réalité des caméras Wyze

Les caméras Wyze sont verrouillées sur le cloud Wyze. Pour obtenir un flux
vidéo local (RTSP) utilisable par le robot, il faut l'une des deux méthodes
ci-dessous. Le moteur pan/tilt interne de la Wyze Cam Pan v3 **n'est pas
utilisé** — c'est la tête du robot qui bouge la caméra.

---

## Méthode 1 — Firmware RTSP officiel Wyze (le plus simple)

Wyze fournit un firmware spécial « RTSP » pour la Cam v3.

1. Télécharger le firmware RTSP sur : https://support.wyze.com/hc/en-us/articles/360026245231
2. Le copier sur une carte microSD (fichier `demo.bin`), l'insérer, flasher
3. Dans l'app Wyze : activer RTSP et définir identifiant + mot de passe
4. L'URL obtenue ressemble à :

```
rtsp://utilisateur:motdepasse@192.168.1.50/live
```

5. La copier dans `config/robot.yaml` :

```yaml
camera:
  source: "wyze_rtsp"
  rtsp_url: "rtsp://utilisateur:motdepasse@192.168.1.50/live"
```

> Limite : Wyze a cessé de mettre à jour ce firmware. Il fonctionne mais
> reste figé sur une ancienne version. Idéal pour un projet DIY.

---

## Méthode 2 — docker-wyze-bridge (plus robuste, firmware d'origine conservé)

Republie le flux Wyze en RTSP depuis le Raspberry Pi, sans modifier la caméra.

1. Installer Docker sur le Pi :
   ```bash
   curl -sSL https://get.docker.com | sh
   ```
2. Récupérer une clé API Wyze sur : https://developer-api-console.wyze.com/
3. Lancer le bridge :
   ```bash
   docker run -d --name wyze-bridge -p 8554:8554 \
     -e WYZE_EMAIL="votre@email.com" \
     -e WYZE_PASSWORD="motdepasse" \
     -e API_ID="votre-api-id" \
     -e API_KEY="votre-api-key" \
     mrlt8/wyze-bridge
   ```
4. L'URL RTSP devient (nom = nom de la caméra en minuscules, tirets) :
   ```
   rtsp://127.0.0.1:8554/nom-de-la-camera
   ```
5. Dans `config/robot.yaml` :
   ```yaml
   camera:
     source: "wyze_rtsp"
     rtsp_url: "rtsp://127.0.0.1:8554/nom-de-la-camera"
   ```

---

## Vérifier le flux

```bash
# Depuis le Raspberry Pi, tester avec ffmpeg :
ffplay rtsp://...    # doit afficher l'image

# Puis lancer le robot et ouvrir l'interface :
python -m src.main
# La vidéo apparaît sur http://IP_DU_PI:5000 (et sur /teleop)
```

---

## Latence

| Méthode | Latence typique |
|---------|-----------------|
| Firmware RTSP officiel | 0,5 – 1,5 s |
| docker-wyze-bridge     | 1 – 2 s |

Pour réduire la latence : baisser `stream_quality` (ex. 50) et vérifier la
qualité du Wi-Fi. Cette latence convient pour « regarder autour » ; pour des
réactions très rapides en téléop, une caméra Pi filaire (`source: "picamera"`)
est plus réactive (< 200 ms).

---

## Montage mécanique

- Imprimer `stl/head_camera_mount.stl` (mesurer d'abord la caméra et ajuster
  `cam_W`, `cam_H`, `cam_D` dans `params.scad`)
- Fixer le berceau sur le palonnier du servo **tilt** de la tête
- Maintenir la caméra avec une sangle/serre-câble via les fentes latérales
- Faire passer le câble d'alimentation USB de la caméra le long de la nuque

La caméra étant sur la tête, elle regarde là où « regarde » le robot — et
comme la tête suit ta propre tête en téléopération, tu vois ce que le robot
voit, dans la direction où tu tournes la tête.
