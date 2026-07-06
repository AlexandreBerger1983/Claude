# Mobilité articulaire

Application web qui mesure en direct les **angles entre les articulations du
corps** avec la caméra (détection de pose MediaPipe) et qui identifie les
**mouvements en lacune de mobilité** grâce à des tests guidés comparés aux
amplitudes de référence.

Tout est calculé **dans le navigateur** : aucune image n'est envoyée sur un
serveur.

## Démarrer

L'accès à la caméra exige un contexte sécurisé (HTTPS ou `localhost`), il faut
donc servir les fichiers plutôt qu'ouvrir `index.html` directement :

```bash
cd mobilite-articulaire
python3 -m http.server 8080
# ou : npx serve
```

Puis ouvrir <http://localhost:8080> (Chrome, Edge, Safari ou Firefox récents),
autoriser la caméra, et se placer **en entier** dans le champ, dans une pièce
bien éclairée. Au premier lancement, la bibliothèque de détection (~10 Mo) est
téléchargée depuis un CDN, puis mise en cache.

## Les trois modes

### 1. Analyse libre
Le squelette est superposé à l'image et l'angle de chaque articulation
(épaules, coudes, hanches, genoux, chevilles) s'affiche en direct, des deux
côtés. Les mesures sont faites en 2D : orientez le **plan du mouvement face à
la caméra** (de profil pour hanches/genoux, de face pour l'abduction d'épaule).

### 2. Tests de mobilité guidés
Huit tests avec consignes, position à adopter et côté (gauche / droite / auto) :

| Test | Référence | Normal dès | Lacune sous |
|---|---|---|---|
| Flexion de l'épaule | 180° | 160° | 135° |
| Abduction de l'épaule | 180° | 160° | 135° |
| Flexion du coude | 150° | 135° | 115° |
| Flexion de la hanche | 120° | 105° | 85° |
| Flexion du genou | 135° | 120° | 100° |
| Squat profond (genou) | 120° | 100° | 80° |
| Dorsiflexion de la cheville (inclinaison du tibia) | 35° | 30° | 20° |
| Flexion avant du tronc | 110° | 90° | 65° |

Déroulement : 5 s pour se mettre en position, puis 15 s d'enregistrement
pendant lesquelles l'application retient le **maximum d'amplitude** atteint
(mesures lissées par médiane pour éliminer les à-coups de détection). Le
résultat est classé : ✓ mobilité normale, ⚠ légère limitation, ✖ lacune de
mobilité — avec des exercices suggérés en cas de limitation.

### 3. Bilan
Dernier résultat et record par test et par côté, conservés sur l'appareil
(`localStorage`), avec jauge comparant la mesure à l'amplitude de référence et
récapitulatif des **mouvements à travailler**.

## Usage hors-ligne (optionnel)

Par défaut la bibliothèque et le modèle sont chargés depuis Internet. Pour un
poste sans accès CDN :

```bash
cd mobilite-articulaire
npm install @mediapipe/tasks-vision@0.10.14
mkdir -p vendor && cp -r node_modules/@mediapipe/tasks-vision vendor/tasks-vision
curl -o vendor/pose_landmarker_lite.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
```

Puis ouvrir :
`index.html?mediapipe=vendor/tasks-vision&modele=vendor/pose_landmarker_lite.task`

## Tests

```bash
node smoke.mjs
```

Vérifie la géométrie (angles, inclinaison, médiane), les métriques de chaque
test sur des squelettes synthétiques et la cohérence des seuils.

## Limites et avertissement

- Mesures **2D** : un mouvement hors du plan de la caméra est sous-estimé ;
  respectez la position indiquée pour chaque test.
- Les amplitudes de référence sont **indicatives** (ordres de grandeur de la
  goniométrie clinique) ; elles varient selon l'âge et la morphologie.
- Outil d'auto-évaluation : il ne remplace pas un bilan par un professionnel
  de santé. En cas de douleur, interrompez le mouvement.
