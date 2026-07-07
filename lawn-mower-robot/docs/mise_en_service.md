# Mise en service - Johnny-Mow (checklist de A à Z)

Procédure complète, du carton de pièces au premier fonctionnement autonome à
distance. Cocher chaque étape avant de passer à la suivante.

> ⚠️ **Ne jamais monter la lame tant que les phases 1 à 6 ne sont pas validées.**
> Faire tous les premiers tests **lame retirée**.

---

## Phase 0 — Achats et impression

- [ ] Composants commandés (voir `docs/` liste d'achats, ~935 $ CAD)
- [ ] GPS RTK : SparkFun ZED-F9P + antenne L1/L2
- [ ] Caméra Wyze Cam v3 (déjà possédée)
- [ ] Pièces 3D imprimées (voir `3d-parts/IMPRESSION.md`) :
  - [ ] Châssis, 2 roues motrices, 2-4 roues folles, 4 supports moteur
  - [ ] ~75 maillons de chenille + goupilles (ou tiges acier ø4 mm)
  - [ ] Jupe de lame, support caméra tête
- [ ] Vérifier la taille du plateau d'impression pour le châssis (350 × 300 mm)

---

## Phase 1 — Assemblage mécanique

- [ ] Châssis monté, motoréducteurs fixés (voir `docs/assembly.md`)
- [ ] Chenilles assemblées et tension vérifiée sur roues/pignons
- [ ] Bras gauche et droit assemblés (4 servos chacun)
- [ ] Tête pan/tilt montée, support caméra fixé sur le servo tilt
- [ ] Jupe de lame installée sous le châssis (**sans la lame pour l'instant**)
- [ ] Pare-chocs avant avec micro-switches
- [ ] Batterie et régulateurs fixés, câblage selon `docs/wiring.md`

---

## Phase 2 — Vérifications électriques (AVANT de brancher le Pi)

- [ ] Tensions mesurées au multimètre : 5 V (Pi), 6 V (servos), 12 V (moteurs)
- [ ] Aucune inversion de polarité
- [ ] Diviseurs de tension en place sur les ECHO des HC-SR04 (5 V → 3.3 V)
- [ ] Bouton d'arrêt d'urgence câblé et testé à l'ohmmètre

---

## Phase 3 — Système Raspberry Pi

- [ ] Raspberry Pi OS installé (64-bit recommandé)
- [ ] I2C et caméra activés (`sudo raspi-config`)
- [ ] Projet cloné, `bash scripts/install.sh` exécuté
- [ ] `i2cdetect -y 1` montre : `0x40` (PCA9685), `0x68` (MPU6050), `0x41` (INA219)
- [ ] `cp config/robot.example.yaml config/robot.yaml`

---

## Phase 4 — Configuration logicielle

- [ ] **Sécurité** : générer et renseigner dans `robot.yaml` :
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"          # secret_key
  python -c "from werkzeug.security import generate_password_hash as g; print(g('MON_MDP'))"
  ```
- [ ] Vérifier/adapter tous les GPIO de `robot.yaml` au câblage réel
- [ ] Désactiver temporairement lame et déplacements pour les tests (rester prudent)

---

## Phase 5 — Tests des sous-systèmes (lame retirée)

- [ ] Lancer : `python -m src.main`, ouvrir `http://<ip-pi>:5000`
- [ ] Page de connexion s'affiche, login fonctionne
- [ ] **Moteurs** : joystick → roues tournent dans le bon sens (corriger IN1/IN2 sinon)
- [ ] **Capteurs** : distances ultrasons plausibles, obstacle détecté
- [ ] **Bras** : séquences saisir/poser/repos correctes (ajuster angles home/reach)
- [ ] **Tête** : pan/tilt répondent, butées OK
- [ ] **Caméra** : flux visible (voir `docs/camera_wyze.md` pour l'URL RTSP)
- [ ] **IMU** : incliner le robot → statut « tilt », lame refusée
- [ ] **Pare-chocs** : presser → danger « bumper »
- [ ] **Batterie** : niveau affiché cohérent avec la tension réelle

---

## Phase 6 — Sécurité (CRITIQUE, toujours lame retirée)

- [ ] `pip install mediapipe` + modèle téléchargé (voir `docs/safety.md`)
- [ ] Se placer devant la caméra → statut « person » et lame refusée
- [ ] Tester un animal / une silhouette d'enfant si possible
- [ ] Vérifier le temps de réaction (< 1 s attendu)
- [ ] Arrêt d'urgence web ET physique testés

---

## Phase 7 — Première tonte (lame montée, sous surveillance)

- [ ] Monter la lame, calibrer l'ESC (voir `docs/assembly.md`)
- [ ] Zone GPS tracée sur `/zone`, fix RTK obtenu (badge « RTK Fix » vert)
- [ ] Première tonte lancée **avec toi à côté, doigt sur l'arrêt d'urgence**
- [ ] Vérifier : le robot reste dans la zone, contourne les obstacles, la lame
      coupe bien à l'approche d'un obstacle/personne
- [ ] Calibrer les temps de virage si nécessaire (`mowing.py`)

---

## Phase 8 — Poubelles

- [ ] Relever les coordonnées GPS `curb` (bord de rue) et `shed` (cabanon) via `/zone`
- [ ] Tester « Sortir » puis « Rentrer » manuellement, sous surveillance
- [ ] Ajuster les angles de préhension des bras au bac réel

---

## Phase 9 — Accès distant

- [ ] Tailscale installé sur le Pi et sur ton téléphone (voir `docs/remote_access.md`)
- [ ] Accès testé depuis l'extérieur du réseau : `http://robot.tail-xxxx.ts.net:5000`
- [ ] (Option) HTTPS activé via `tailscale serve`
- [ ] Si Wi-Fi faible au chalet : clé 4G/LTE testée

---

## Phase 10 — Automatisation & notifications

- [ ] Notifications configurées et testées (courriel/SMS reçu)
- [ ] Horaires du planificateur réglés (tonte, poubelles)
- [ ] Base de recharge installée, retour à la base testé
- [ ] Service systemd actif : `sudo systemctl enable --now johnny-mow`
- [ ] Redémarrer le Pi et vérifier que tout repart seul

---

## Phase 11 — Avant de laisser sans surveillance

- [ ] Boîtier étanche (pluie), passages de câbles protégés
- [ ] Plusieurs cycles complets observés sans incident
- [ ] Plan de secours si le robot se coince (accès physique, personne sur place)
- [ ] **Vérifier les obligations d'assurance/responsabilité** pour un robot à
      lame en opération autonome dans un lieu loué à des tiers

---

## Support

En cas de souci, consulter la doc du sous-système concerné dans `docs/`, et
les logs : `journalctl -u johnny-mow -f` ou `logs/robot.log`.
