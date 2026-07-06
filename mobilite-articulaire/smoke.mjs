// Test de fumée : vérifie la géométrie et la classification des tests
// avec des squelettes synthétiques. Lancer avec : node smoke.mjs
import {
  COTES, TESTS, angleDeg, inclinaisonVerticale, mediane, classer,
} from './angles.js';

let echecs = 0;
function verifier(nom, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${nom}`);
  } else {
    echecs++;
    console.error(`  ✗ ${nom} ${detail}`);
  }
}
function proche(a, b, tolerance = 2) {
  return a != null && Math.abs(a - b) <= tolerance;
}

// Squelette synthétique : 33 repères par défaut hors champ, on place ceux utiles.
// Coordonnées « pixels » : x vers la droite, y vers le bas.
function squelette(points) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 1 }));
  for (const [i, [x, y]] of Object.entries(points)) lm[i] = { x, y, visibility: 1 };
  return lm;
}
const G = COTES.gauche;
const test = (id) => TESTS.find((t) => t.id === id);

console.log('Géométrie de base');
verifier('angle droit = 90°', proche(angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }), 90));
verifier('segment aligné = 180°', proche(angleDeg({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }), 180));
verifier('segment replié = 0°', proche(angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }), 0));
verifier('points confondus → null', angleDeg({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }) === null);
verifier('inclinaison verticale = 0°', proche(inclinaisonVerticale({ x: 0, y: 100 }, { x: 0, y: 0 }), 0));
verifier('inclinaison à 45°', proche(inclinaisonVerticale({ x: 0, y: 100 }, { x: 100, y: 0 }), 45));
verifier('médiane impaire', mediane([3, 1, 2]) === 2);
verifier('médiane paire', mediane([1, 2, 3, 4]) === 2.5);

console.log('\nFlexion de l’épaule (profil, bras au zénith)');
{
  // Hanche sous l'épaule, coude au-dessus de l'épaule : bras dans le prolongement du tronc.
  const lm = squelette({ [G.hanche]: [100, 300], [G.epaule]: [100, 150], [G.coude]: [100, 20] });
  const v = test('epaule-flexion').calc(lm, G);
  verifier('bras au zénith ≈ 180°', proche(v, 180), `(mesuré ${v})`);
  verifier('classé « normale »', classer(test('epaule-flexion'), v) === 'normale');
}
{
  // Bras seulement à l'horizontale : 90° → lacune.
  const lm = squelette({ [G.hanche]: [100, 300], [G.epaule]: [100, 150], [G.coude]: [220, 150] });
  const v = test('epaule-flexion').calc(lm, G);
  verifier('bras horizontal ≈ 90°', proche(v, 90), `(mesuré ${v})`);
  verifier('classé « lacune »', classer(test('epaule-flexion'), v) === 'lacune');
}

console.log('\nFlexion du coude');
{
  // Coude complètement plié : poignet revenu près de l'épaule.
  const lm = squelette({ [G.epaule]: [100, 100], [G.coude]: [100, 220], [G.poignet]: [100, 110] });
  const v = test('coude-flexion').calc(lm, G);
  verifier('coude plié ≈ 180° − angle ≈ 180°… plafonné par la norme', v > 150, `(mesuré ${v})`);
  verifier('classé « normale »', classer(test('coude-flexion'), v) === 'normale');
}
{
  // Bras tendu : angle intérieur 180° → flexion 0° → lacune.
  const lm = squelette({ [G.epaule]: [100, 100], [G.coude]: [100, 220], [G.poignet]: [100, 340] });
  const v = test('coude-flexion').calc(lm, G);
  verifier('bras tendu ≈ 0° de flexion', proche(v, 0), `(mesuré ${v})`);
  verifier('classé « lacune »', classer(test('coude-flexion'), v) === 'lacune');
}

console.log('\nSquat profond (genou)');
{
  // Genou très fléchi : hanche revenue près de la cheville (angle intérieur ≈ 45°).
  const lm = squelette({ [G.hanche]: [180, 220], [G.genou]: [100, 200], [G.cheville]: [120, 300] });
  const t = test('squat-profond');
  const v = t.calc(lm, G);
  verifier('flexion > 100°', v > t.seuils.ok, `(mesuré ${v})`);
  verifier('classé « normale »', classer(t, v) === 'normale');
}
{
  // Quart de squat : angle intérieur ≈ 120° → flexion ≈ 60°.
  const lm = squelette({ [G.hanche]: [187, 150], [G.genou]: [100, 200], [G.cheville]: [100, 300] });
  const t = test('squat-profond');
  const v = t.calc(lm, G);
  verifier('flexion ≈ 60°', proche(v, 60, 5), `(mesuré ${v})`);
  verifier('classé « lacune »', classer(t, v) === 'lacune');
}

console.log('\nDorsiflexion de la cheville (inclinaison du tibia)');
{
  const t = test('cheville-dorsiflexion');
  // Tibia incliné de 40° vers l'avant.
  const lm = squelette({ [G.cheville]: [100, 300], [G.genou]: [100 + Math.tan((40 * Math.PI) / 180) * 150, 150] });
  const v = t.calc(lm, G);
  verifier('inclinaison ≈ 40°', proche(v, 40), `(mesuré ${v})`);
  verifier('classé « normale »', classer(t, v) === 'normale');
  // Tibia quasi vertical : 5° → lacune.
  const lm2 = squelette({ [G.cheville]: [100, 300], [G.genou]: [113, 150] });
  const v2 = t.calc(lm2, G);
  verifier('tibia vertical → lacune', classer(t, v2) === 'lacune', `(mesuré ${v2})`);
}

console.log('\nCohérence des définitions de tests');
for (const t of TESTS) {
  verifier(
    `${t.id} : seuils cohérents (limite < ok ≤ norme)`,
    t.seuils.limite < t.seuils.ok && t.seuils.ok <= t.norme
  );
  verifier(`${t.id} : exercices proposés`, Array.isArray(t.exercices) && t.exercices.length >= 2);
  const lmVide = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 1 }));
  verifier(`${t.id} : points confondus → pas de plantage`, (() => {
    try { t.calc(lmVide, G); return true; } catch { return false; }
  })());
}

console.log(echecs === 0 ? '\nTous les tests passent.' : `\n${echecs} test(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
