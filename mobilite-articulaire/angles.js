// Géométrie et définitions des tests de mobilité.
// Module pur (aucune dépendance DOM) : utilisé par app.js et par smoke.mjs.

// Indices des repères MediaPipe Pose (33 points).
export const LM = {
  nez: 0,
  epauleG: 11, epauleD: 12,
  coudeG: 13, coudeD: 14,
  poignetG: 15, poignetD: 16,
  hancheG: 23, hancheD: 24,
  genouG: 25, genouD: 26,
  chevilleG: 27, chevilleD: 28,
  talonG: 29, talonD: 30,
  orteilG: 31, orteilD: 32,
};

// Repères regroupés par côté du corps.
export const COTES = {
  gauche: { epaule: 11, coude: 13, poignet: 15, hanche: 23, genou: 25, cheville: 27, talon: 29, orteil: 31 },
  droite: { epaule: 12, coude: 14, poignet: 16, hanche: 24, genou: 26, cheville: 28, talon: 30, orteil: 32 },
};

// Angle intérieur (en degrés) au point b, formé par les segments b→a et b→c.
export function angleDeg(a, b, c) {
  if (!a || !b || !c) return null;
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const m = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (!m) return null;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / m));
  return (Math.acos(cos) * 180) / Math.PI;
}

// Inclinaison (en degrés) du segment `bas`→`haut` par rapport à la verticale.
// 0° = segment vertical. L'axe y de l'image pointe vers le bas.
export function inclinaisonVerticale(bas, haut) {
  if (!bas || !haut) return null;
  const dx = haut.x - bas.x;
  const dy = haut.y - bas.y;
  return (Math.atan2(Math.abs(dx), -dy) * 180) / Math.PI;
}

export function mediane(valeurs) {
  const v = [...valeurs].sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Angles affichés en mode « analyse libre », pour chaque côté.
// `points` : [a, b, c] — l'angle est mesuré en b.
export const ARTICULATIONS_LIBRES = [
  { nom: 'Épaule', points: (S) => [S.hanche, S.epaule, S.coude] },
  { nom: 'Coude', points: (S) => [S.epaule, S.coude, S.poignet] },
  { nom: 'Hanche', points: (S) => [S.epaule, S.hanche, S.genou] },
  { nom: 'Genou', points: (S) => [S.hanche, S.genou, S.cheville] },
  { nom: 'Cheville', points: (S) => [S.genou, S.cheville, S.orteil] },
];

// Tests guidés de mobilité.
// `norme` : amplitude de référence (valeurs goniométriques indicatives, type AAOS).
// `seuils.ok` : au-dessus → mobilité normale ; `seuils.limite` : au-dessus →
// légère limitation ; en dessous → lacune de mobilité.
// `calc(lm, S)` : métrique en degrés (plus haut = plus mobile), à partir des
// repères en pixels `lm` et des indices du côté `S`.
export const TESTS = [
  {
    id: 'epaule-flexion',
    nom: 'Flexion de l’épaule',
    position: 'De profil, côté testé face à la caméra',
    consigne:
      'Debout, bras le long du corps. Montez lentement le bras tendu devant vous, le plus haut possible vers le plafond, sans cambrer le dos.',
    norme: 180,
    seuils: { ok: 160, limite: 135 },
    reperes: (S) => [S.hanche, S.epaule, S.coude],
    calc: (lm, S) => angleDeg(lm[S.hanche], lm[S.epaule], lm[S.coude]),
    exercices: [
      'Étirement dans le cadre de porte (pectoraux)',
      'Mobilisation de l’épaule avec un bâton, allongé sur le dos',
      'Étirement du grand dorsal, bras en appui sur une table',
    ],
  },
  {
    id: 'epaule-abduction',
    nom: 'Abduction de l’épaule',
    position: 'Face à la caméra',
    consigne:
      'Debout face à la caméra, bras le long du corps. Montez lentement le bras tendu sur le côté, jusqu’au-dessus de la tête si possible.',
    norme: 180,
    seuils: { ok: 160, limite: 135 },
    reperes: (S) => [S.hanche, S.epaule, S.coude],
    calc: (lm, S) => angleDeg(lm[S.hanche], lm[S.epaule], lm[S.coude]),
    exercices: [
      'Glissés du bras contre un mur (« wall slides »)',
      'Étirement de la capsule postérieure (bras croisé devant la poitrine)',
      'Renforcement de la coiffe des rotateurs avec élastique léger',
    ],
  },
  {
    id: 'coude-flexion',
    nom: 'Flexion du coude',
    position: 'De profil ou de face, bras bien visible',
    consigne:
      'Bras le long du corps, paume vers l’avant. Pliez le coude au maximum, comme pour toucher l’épaule avec la main.',
    norme: 150,
    seuils: { ok: 135, limite: 115 },
    reperes: (S) => [S.epaule, S.coude, S.poignet],
    calc: (lm, S) => {
      const a = angleDeg(lm[S.epaule], lm[S.coude], lm[S.poignet]);
      return a == null ? null : 180 - a;
    },
    exercices: [
      'Flexions-extensions douces et répétées du coude',
      'Étirement des triceps, coude au-dessus de la tête',
      'Auto-massage de l’avant-bras et du biceps',
    ],
  },
  {
    id: 'hanche-flexion',
    nom: 'Flexion de la hanche',
    position: 'De profil, côté testé face à la caméra',
    consigne:
      'Debout, tenez-vous à un support si besoin. Montez un genou vers la poitrine, le plus haut possible, sans arrondir le dos.',
    norme: 120,
    seuils: { ok: 105, limite: 85 },
    reperes: (S) => [S.epaule, S.hanche, S.genou],
    calc: (lm, S) => {
      const a = angleDeg(lm[S.epaule], lm[S.hanche], lm[S.genou]);
      return a == null ? null : 180 - a;
    },
    exercices: [
      'Genou-poitrine allongé sur le dos, 30 s par côté',
      'Étirement des fessiers en position « 4 » assis',
      'Mobilité de hanche en position 90/90 au sol',
    ],
  },
  {
    id: 'genou-flexion',
    nom: 'Flexion du genou',
    position: 'De profil, côté testé face à la caméra',
    consigne:
      'Debout, tenez-vous à un support. Amenez le talon vers la fesse, cuisse verticale, le plus loin possible.',
    norme: 135,
    seuils: { ok: 120, limite: 100 },
    reperes: (S) => [S.hanche, S.genou, S.cheville],
    calc: (lm, S) => {
      const a = angleDeg(lm[S.hanche], lm[S.genou], lm[S.cheville]);
      return a == null ? null : 180 - a;
    },
    exercices: [
      'Étirement du quadriceps debout (talon-fesse tenu à la main)',
      'Glissés de talon assis ou allongé',
      'Auto-massage du quadriceps au rouleau',
    ],
  },
  {
    id: 'squat-profond',
    nom: 'Squat profond',
    position: 'De profil',
    consigne:
      'Pieds largeur d’épaules, bras devant vous. Descendez en squat le plus bas possible, talons au sol, puis remontez. Répétez 2 ou 3 fois pendant l’enregistrement.',
    norme: 120,
    seuils: { ok: 100, limite: 80 },
    reperes: (S) => [S.hanche, S.genou, S.cheville],
    calc: (lm, S) => {
      const a = angleDeg(lm[S.hanche], lm[S.genou], lm[S.cheville]);
      return a == null ? null : 180 - a;
    },
    exercices: [
      'Squat assisté en tenant un support (poteau, porte)',
      'Squat profond maintenu 20–30 s avec appui, talons au sol',
      'Travailler aussi la dorsiflexion de cheville et la flexion de hanche',
    ],
  },
  {
    id: 'cheville-dorsiflexion',
    nom: 'Dorsiflexion de la cheville',
    position: 'De profil, côté testé face à la caméra',
    consigne:
      'En fente face à un mur, pied testé devant. Avancez le genou au-dessus des orteils, le plus loin possible, sans décoller le talon.',
    norme: 35,
    seuils: { ok: 30, limite: 20 },
    reperes: (S) => [S.cheville, S.genou],
    calc: (lm, S) => inclinaisonVerticale(lm[S.cheville], lm[S.genou]),
    exercices: [
      'Exercice du genou au mur (« knee to wall »), 10 répétitions',
      'Étirement du mollet au mur, jambe arrière tendue puis fléchie',
      'Auto-massage du mollet et du tendon d’Achille',
    ],
  },
  {
    id: 'flexion-avant',
    nom: 'Flexion avant du tronc',
    position: 'De profil',
    consigne:
      'Debout, jambes tendues. Penchez-vous lentement vers l’avant pour toucher vos orteils, sans plier les genoux.',
    norme: 110,
    seuils: { ok: 90, limite: 65 },
    reperes: (S) => [S.epaule, S.hanche, S.genou],
    calc: (lm, S) => {
      const a = angleDeg(lm[S.epaule], lm[S.hanche], lm[S.genou]);
      return a == null ? null : 180 - a;
    },
    exercices: [
      'Étirement des ischio-jambiers, talon posé sur une marche',
      'Flexion avant assise, dos long, 30 s',
      'Mobilité du dos : dos rond / dos creux à quatre pattes',
    ],
  },
];

export const NIVEAUX = {
  normale: { libelle: 'Mobilité normale', icone: '✓' },
  limitee: { libelle: 'Légère limitation', icone: '⚠' },
  lacune: { libelle: 'Lacune de mobilité', icone: '✖' },
};

// Classe une valeur mesurée pour un test donné.
export function classer(test, valeur) {
  if (valeur == null) return null;
  if (valeur >= test.seuils.ok) return 'normale';
  if (valeur >= test.seuils.limite) return 'limitee';
  return 'lacune';
}
