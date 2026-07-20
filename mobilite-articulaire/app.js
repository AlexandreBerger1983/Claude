import {
  COTES, TESTS, ARTICULATIONS_LIBRES, NIVEAUX,
  classer, mediane,
} from './angles.js';

const VERSION_MEDIAPIPE = '0.10.14';
// Source de la bibliothèque MediaPipe : CDN par défaut, remplaçable par un
// chemin local via `?mediapipe=vendor/tasks-vision` (voir README, usage hors-ligne).
const parametres = new URLSearchParams(location.search);
const cheminLocalMediapipe = parametres.get('mediapipe');
const BASE_MEDIAPIPE = cheminLocalMediapipe
  ? new URL(cheminLocalMediapipe, location.href).href.replace(/\/$/, '')
  : `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION_MEDIAPIPE}`;
const cheminLocalModele = parametres.get('modele');
const URL_MODELE = cheminLocalModele
  ? new URL(cheminLocalModele, location.href).href
  : 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const CLE_STOCKAGE = 'mobilite-resultats-v1';
const VISIBILITE_MIN = 0.5;
const DUREE_PREPARATION = 5; // secondes
const DUREE_ENREGISTREMENT = 15; // secondes

// Segments du squelette à tracer (paires d'indices de repères).
const SEGMENTS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [27, 31], [28, 30], [28, 32],
];

// --- Éléments du DOM -------------------------------------------------------
const video = document.getElementById('video');
const canevas = document.getElementById('canevas');
const ctx = canevas.getContext('2d');
const messageCamera = document.getElementById('message-camera');
const btnCamera = document.getElementById('btn-camera');
const etatChargement = document.getElementById('etat-chargement');
const barreCamera = document.getElementById('barre-camera');
const chkMiroir = document.getElementById('chk-miroir');
const btnChangerCamera = document.getElementById('btn-changer-camera');
const indicateurPose = document.getElementById('indicateur-pose');

const panneaux = {
  libre: document.getElementById('panneau-libre'),
  tests: document.getElementById('panneau-tests'),
  bilan: document.getElementById('panneau-bilan'),
};
const zoneCamera = document.getElementById('zone-camera');

const selTest = document.getElementById('sel-test');
const choixCote = document.getElementById('choix-cote');
const txtPosition = document.getElementById('txt-position');
const txtConsigne = document.getElementById('txt-consigne');
const txtNorme = document.getElementById('txt-norme');
const btnDemarrer = document.getElementById('btn-demarrer');
const carteMesure = document.getElementById('carte-mesure');
const phaseTest = document.getElementById('phase-test');
const valCourante = document.getElementById('val-courante');
const valMax = document.getElementById('val-max');
const progresTest = document.getElementById('progres-test');
const btnArreter = document.getElementById('btn-arreter');
const carteResultat = document.getElementById('carte-resultat');

const listeBilan = document.getElementById('liste-bilan');
const btnEffacer = document.getElementById('btn-effacer');
const carteRecommandations = document.getElementById('carte-recommandations');

// --- État ------------------------------------------------------------------
let landmarker = null;
let fluxCamera = null;
let faceAvant = true; // caméra frontale
let mode = 'libre'; // libre | tests | bilan
let dernierTempsVideo = -1;
let derniersReperes = null; // repères en pixels du dernier cadre

const etatTest = {
  phase: 'repos', // repos | preparation | enregistrement | fini
  test: TESTS[0],
  cote: 'auto',
  debutPhase: 0,
  tampon: [], // dernières mesures pour lissage médian
  maximum: null,
  coteMaximum: null,
};

// --- Navigation entre les onglets -------------------------------------------
document.querySelectorAll('.onglet').forEach((btn) => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    document.querySelectorAll('.onglet').forEach((b) => b.classList.toggle('actif', b === btn));
    for (const [nom, panneau] of Object.entries(panneaux)) panneau.hidden = nom !== mode;
    zoneCamera.hidden = mode === 'bilan';
    if (mode === 'bilan') afficherBilan();
    if (mode !== 'tests' && etatTest.phase !== 'repos') annulerTest();
  });
});

// --- Caméra et modèle --------------------------------------------------------
btnCamera.addEventListener('click', demarrerCamera);
btnChangerCamera.addEventListener('click', () => {
  faceAvant = !faceAvant;
  chkMiroir.checked = faceAvant;
  demarrerCamera();
});

async function demarrerCamera() {
  btnCamera.disabled = true;
  etatChargement.hidden = false;
  try {
    if (!landmarker) {
      etatChargement.textContent = 'Chargement du modèle de détection…';
      const vision = await import(`${BASE_MEDIAPIPE}/vision_bundle.mjs`);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${BASE_MEDIAPIPE}/wasm`);
      const options = (delegate) => ({
        baseOptions: { modelAssetPath: URL_MODELE, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      });
      // GPU d'abord ; repli sur le CPU si le délégué GPU échoue
      // (certaines versions de Safari iOS / navigateurs anciens).
      try {
        landmarker = await vision.PoseLandmarker.createFromOptions(fileset, options('GPU'));
      } catch (errGpu) {
        console.warn('Délégué GPU indisponible, repli sur le CPU.', errGpu);
        landmarker = await vision.PoseLandmarker.createFromOptions(fileset, options('CPU'));
      }
    }
    etatChargement.textContent = 'Ouverture de la caméra…';
    if (fluxCamera) fluxCamera.getTracks().forEach((t) => t.stop());
    fluxCamera = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: faceAvant ? 'user' : 'environment', width: { ideal: 1280 } },
      audio: false,
    });
    video.srcObject = fluxCamera;
    await video.play();
    canevas.width = video.videoWidth || 1280;
    canevas.height = video.videoHeight || 720;
    messageCamera.hidden = true;
    barreCamera.hidden = false;
    requestAnimationFrame(boucle);
  } catch (err) {
    etatChargement.hidden = true;
    btnCamera.disabled = false;
    alert(
      'Impossible de démarrer la caméra ou de charger le modèle.\n' +
      'Vérifiez l’autorisation de la caméra et votre connexion Internet (premier chargement).\n\n' +
      err.message
    );
  }
}

// --- Boucle principale -------------------------------------------------------
function boucle() {
  if (!fluxCamera) return;
  if (video.readyState >= 2 && video.currentTime !== dernierTempsVideo) {
    dernierTempsVideo = video.currentTime;
    const resultat = landmarker.detectForVideo(video, performance.now());
    derniersReperes = extrairePixels(resultat);
    dessiner();
    if (etatTest.phase !== 'repos') avancerTest();
  }
  requestAnimationFrame(boucle);
}

// Convertit les repères normalisés en pixels ; null si personne détectée.
function extrairePixels(resultat) {
  const lms = resultat && resultat.landmarks && resultat.landmarks[0];
  if (!lms) return null;
  return lms.map((p) => ({
    x: p.x * canevas.width,
    y: p.y * canevas.height,
    visibility: p.visibility ?? 1,
  }));
}

// --- Dessin ------------------------------------------------------------------
function dessiner() {
  const w = canevas.width, h = canevas.height;
  const miroir = chkMiroir.checked;
  const mx = (x) => (miroir ? w - x : x);

  ctx.save();
  if (miroir) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  const lm = derniersReperes;
  indicateurPose.textContent = lm ? 'Personne détectée' : 'Aucune personne détectée';
  indicateurPose.classList.toggle('ok', !!lm);
  if (!lm) return;

  // Squelette
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(57, 135, 229, 0.9)';
  for (const [a, b] of SEGMENTS) {
    if (lm[a].visibility < VISIBILITE_MIN || lm[b].visibility < VISIBILITE_MIN) continue;
    ctx.beginPath();
    ctx.moveTo(mx(lm[a].x), lm[a].y);
    ctx.lineTo(mx(lm[b].x), lm[b].y);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  for (const [a, b] of SEGMENTS) {
    for (const i of [a, b]) {
      if (lm[i].visibility < VISIBILITE_MIN) continue;
      ctx.beginPath();
      ctx.arc(mx(lm[i].x), lm[i].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (mode === 'libre') dessinerAnglesLibres(lm, mx);
}

function dessinerAnglesLibres(lm, mx) {
  for (const cote of ['gauche', 'droite']) {
    const S = COTES[cote];
    for (const art of ARTICULATIONS_LIBRES) {
      const [a, b, c] = art.points(S);
      if ([a, b, c].some((i) => lm[i].visibility < VISIBILITE_MIN)) continue;
      const angle = anglePixels(lm[a], lm[b], lm[c]);
      if (angle == null) continue;
      etiquette(mx(lm[b].x), lm[b].y, `${Math.round(angle)}°`);
    }
  }
}

function anglePixels(a, b, c) {
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (!m) return null;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / m));
  return (Math.acos(cos) * 180) / Math.PI;
}

function etiquette(x, y, texte) {
  ctx.font = '600 15px system-ui, sans-serif';
  const larg = ctx.measureText(texte).width + 12;
  ctx.fillStyle = 'rgba(13, 13, 13, 0.75)';
  ctx.beginPath();
  ctx.roundRect(x + 8, y - 22, larg, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(texte, x + 14, y - 6);
}

// --- Tests guidés -------------------------------------------------------------
for (const test of TESTS) {
  const opt = document.createElement('option');
  opt.value = test.id;
  opt.textContent = test.nom;
  selTest.appendChild(opt);
}

function testCourant() {
  return TESTS.find((t) => t.id === selTest.value) || TESTS[0];
}

function afficherConsigne() {
  const t = testCourant();
  txtPosition.textContent = `Position : ${t.position.toLowerCase()}`;
  txtConsigne.textContent = t.consigne;
  txtNorme.textContent =
    `Référence : ${t.norme}° — normal à partir de ${t.seuils.ok}°, ` +
    `lacune de mobilité sous ${t.seuils.limite}°.`;
}
selTest.addEventListener('change', () => { annulerTest(); afficherConsigne(); });
afficherConsigne();

choixCote.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cote]');
  if (!btn) return;
  etatTest.cote = btn.dataset.cote;
  choixCote.querySelectorAll('.btn-choix').forEach((b) => b.classList.toggle('actif', b === btn));
});

btnDemarrer.addEventListener('click', () => {
  if (!fluxCamera) {
    alert('Activez d’abord la caméra.');
    return;
  }
  etatTest.test = testCourant();
  etatTest.phase = 'preparation';
  etatTest.debutPhase = performance.now();
  etatTest.tampon = [];
  etatTest.maximum = null;
  etatTest.coteMaximum = null;
  carteMesure.hidden = false;
  carteResultat.hidden = true;
  btnArreter.hidden = true;
  btnDemarrer.disabled = true;
  valCourante.textContent = '—';
  valMax.textContent = '—';
});

btnArreter.addEventListener('click', terminerTest);

function annulerTest() {
  etatTest.phase = 'repos';
  carteMesure.hidden = true;
  btnDemarrer.disabled = false;
}

function avancerTest() {
  const maintenant = performance.now();
  const ecoule = (maintenant - etatTest.debutPhase) / 1000;

  if (etatTest.phase === 'preparation') {
    const restant = Math.ceil(DUREE_PREPARATION - ecoule);
    phaseTest.textContent = `Mettez-vous en position… ${restant}`;
    progresTest.style.width = `${(ecoule / DUREE_PREPARATION) * 100}%`;
    if (ecoule >= DUREE_PREPARATION) {
      etatTest.phase = 'enregistrement';
      etatTest.debutPhase = maintenant;
      btnArreter.hidden = false;
    }
    return;
  }

  if (etatTest.phase === 'enregistrement') {
    const restant = Math.ceil(DUREE_ENREGISTREMENT - ecoule);
    phaseTest.textContent = `Enregistrement — allez au maximum de votre amplitude (${restant} s)`;
    progresTest.style.width = `${(ecoule / DUREE_ENREGISTREMENT) * 100}%`;
    mesurerCadre();
    if (ecoule >= DUREE_ENREGISTREMENT) terminerTest();
  }
}

// Mesure le cadre courant : choix du côté, lissage médian, mise à jour du max.
function mesurerCadre() {
  const lm = derniersReperes;
  if (!lm) return;
  const t = etatTest.test;

  const cotes = etatTest.cote === 'auto' ? ['gauche', 'droite'] : [etatTest.cote];
  let meilleur = null;
  for (const cote of cotes) {
    const S = COTES[cote];
    const reperes = t.reperes(S);
    const vis = reperes.reduce((s, i) => s + lm[i].visibility, 0) / reperes.length;
    if (vis < VISIBILITE_MIN) continue;
    if (!meilleur || vis > meilleur.vis) meilleur = { cote, vis };
  }
  if (!meilleur) return;

  const valeur = t.calc(lm, COTES[meilleur.cote]);
  if (valeur == null) return;

  etatTest.tampon.push(valeur);
  if (etatTest.tampon.length > 5) etatTest.tampon.shift();
  const lissee = mediane(etatTest.tampon);

  valCourante.textContent = `${Math.round(lissee)}°`;
  if (etatTest.maximum == null || lissee > etatTest.maximum) {
    etatTest.maximum = lissee;
    etatTest.coteMaximum = meilleur.cote;
    valMax.textContent = `${Math.round(lissee)}°`;
  }
}

function libelleCote(cote) {
  return cote === 'droite' ? 'droit' : 'gauche';
}

function terminerTest() {
  const { test, maximum, coteMaximum } = etatTest;
  annulerTest();
  if (maximum == null) {
    carteResultat.hidden = false;
    carteResultat.innerHTML =
      '<h2>Mesure impossible</h2><p>Les articulations concernées n’étaient pas assez visibles. ' +
      'Reculez pour être en entier dans l’image, éclairez la pièce et réessayez.</p>';
    return;
  }
  const valeur = Math.round(maximum);
  enregistrerResultat(test.id, coteMaximum, valeur);
  carteResultat.hidden = false;
  carteResultat.innerHTML = `
    <h2>Résultat — ${test.nom} (côté ${libelleCote(coteMaximum)})</h2>
    <div class="resultat-grande-valeur">${valeur}°</div>
    ${jaugeHtml(test, valeur)}
    ${blocRecommandation(test, valeur)}
  `;
}

function blocRecommandation(test, valeur) {
  const niveau = classer(test, valeur);
  if (niveau === 'normale') {
    return '<p>Belle amplitude ! Refaites le test de temps en temps pour suivre votre mobilité.</p>';
  }
  const items = test.exercices.map((e) => `<li>${e}</li>`).join('');
  return `
    <p>Ce mouvement présente une amplitude réduite. Pistes de travail (sans douleur) :</p>
    <ul class="liste-exercices">${items}</ul>
  `;
}

// --- Stockage local ------------------------------------------------------------
function chargerResultats() {
  try {
    return JSON.parse(localStorage.getItem(CLE_STOCKAGE)) || {};
  } catch {
    return {};
  }
}

function enregistrerResultat(idTest, cote, valeur) {
  const resultats = chargerResultats();
  resultats[idTest] = resultats[idTest] || {};
  const precedent = resultats[idTest][cote];
  resultats[idTest][cote] = {
    valeur,
    date: new Date().toISOString(),
    record: Math.max(valeur, precedent ? precedent.record : valeur),
  };
  localStorage.setItem(CLE_STOCKAGE, JSON.stringify(resultats));
}

btnEffacer.addEventListener('click', () => {
  if (confirm('Effacer tous les résultats enregistrés sur cet appareil ?')) {
    localStorage.removeItem(CLE_STOCKAGE);
    afficherBilan();
  }
});

// --- Bilan ----------------------------------------------------------------------
function jaugeHtml(test, valeur) {
  const niveau = classer(test, valeur);
  const info = NIVEAUX[niveau];
  const couleurs = {
    normale: 'var(--statut-bon)',
    limitee: 'var(--statut-attention)',
    lacune: 'var(--statut-critique)',
  };
  const pct = Math.min(100, (valeur / test.norme) * 100);
  const posSeuil = Math.min(100, (test.seuils.ok / test.norme) * 100);
  return `
    <span class="pastille-statut ${niveau}">${info.icone} ${info.libelle}</span>
    <div class="jauge">
      <div class="remplissage" style="width:${pct}%; background:${couleurs[niveau]}"></div>
      <div class="repere-seuil" style="left:${posSeuil}%" title="Seuil normal : ${test.seuils.ok}°"></div>
    </div>
    <div class="legende-jauge">
      <span>${valeur}° mesurés</span>
      <span>référence ${test.norme}°</span>
    </div>
  `;
}

function afficherBilan() {
  const resultats = chargerResultats();
  const lignes = [];
  const aTravailler = [];

  for (const test of TESTS) {
    const parCote = resultats[test.id];
    if (!parCote) continue;
    for (const cote of ['gauche', 'droite']) {
      const r = parCote[cote];
      if (!r) continue;
      const date = new Date(r.date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
      lignes.push(`
        <div class="ligne-bilan">
          <div class="entete-bilan">
            <span class="nom-test">${test.nom}</span>
            <span class="cote-test">côté ${libelleCote(cote)}</span>
            <span class="date-test">${date} · record ${r.record}°</span>
          </div>
          ${jaugeHtml(test, r.valeur)}
        </div>
      `);
      if (classer(test, r.valeur) !== 'normale') aTravailler.push({ test, cote, valeur: r.valeur });
    }
  }

  if (lignes.length === 0) {
    listeBilan.innerHTML =
      '<p class="vide-bilan">Aucun résultat pour l’instant. Passez par l’onglet ' +
      '« Tests de mobilité » pour évaluer vos amplitudes.</p>';
    btnEffacer.hidden = true;
    carteRecommandations.hidden = true;
    return;
  }

  listeBilan.innerHTML = lignes.join('');
  btnEffacer.hidden = false;

  if (aTravailler.length === 0) {
    carteRecommandations.hidden = false;
    carteRecommandations.innerHTML =
      '<h2>Recommandations</h2><p>Toutes les amplitudes mesurées sont dans les normes. ' +
      'Continuez à bouger régulièrement !</p>';
    return;
  }

  const blocs = aTravailler.map(({ test, cote, valeur }) => {
    const niveau = classer(test, valeur);
    const info = NIVEAUX[niveau];
    const items = test.exercices.map((e) => `<li>${e}</li>`).join('');
    return `
      <div class="ligne-bilan">
        <div class="entete-bilan">
          <span class="nom-test">${test.nom} — côté ${libelleCote(cote)}</span>
          <span class="pastille-statut ${niveau}">${info.icone} ${info.libelle}</span>
        </div>
        <ul class="liste-exercices">${items}</ul>
      </div>
    `;
  });
  carteRecommandations.hidden = false;
  carteRecommandations.innerHTML =
    '<h2>Mouvements à travailler</h2>' + blocs.join('') +
    '<p class="texte-secondaire">Progressez sans douleur ; consultez un professionnel ' +
    'si une limitation persiste ou s’accompagne de douleurs.</p>';
}
