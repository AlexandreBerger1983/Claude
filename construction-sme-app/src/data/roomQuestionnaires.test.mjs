// Tests du questionnaire détaillé, d'après les feuilles manuscrites fournies :
// choix « Toute la pièce » / « En partie » sur toutes les quantités mesurées,
// onglets Plafond / Plancher / Peinture / Ventilation, types de gypse et de
// membrane, et absence de double comptage du plancher.
import {
  questionnaireForRoom, roomMeasures, defaultRates,
  GYPSE_TYPES, PLAFOND_TYPES, MEMBRANE_TYPES,
} from './roomQuestionnaires.js'
import { tradeForQuestion } from './quoteCosting.js'

let ok = 0, fail = 0
const eq = (label, got, want, tol = 0.5) => {
  if (Math.abs(got - want) <= tol) { ok++; console.log(`OK   ${label} = ${got}`) }
  else { fail++; console.log(`ÉCHEC ${label} : obtenu ${got}, attendu ${want}`) }
}
const vrai = (label, cond) => {
  if (cond) { ok++; console.log(`OK   ${label}`) }
  else { fail++; console.log(`ÉCHEC ${label}`) }
}

// Salle de bain de 8 pi × 7 pi, plafond 8 pi (dimensions saisies en pieds)
const sdb = { name: 'Salle de bain', baseName: 'Salle de bain', length: 8, width: 7, height: 8 }
const M = roomMeasures(sdb, 'pi')
console.log('Mesures :', M)

// ─── Mesures de la pièce ─────────────────────────────────────────────────────
eq('plancher', M.planchPc, 56, 1)
eq('plafond', M.plafondPc, 56, 1)
eq('murs (2 × (8+7) × 8)', M.mursPc, 240, 2)
eq('périmètre (2 × (8+7))', M.perimetrePl, 30, 1)
eq('hauteur sous plafond', M.hauteurPi, 8, 0.1)

const Q = questionnaireForRoom(sdb, defaultRates(), 'pi')
const toutes = Q.sections.flatMap(s => s.questions)
const trouve = (id) => toutes.find(q => q.id === id)
const titres = Q.sections.map(s => s.title)
console.log('Onglets :', titres.join(' · '))

// ─── Les onglets demandés existent ───────────────────────────────────────────
for (const t of ['Plafond', 'Plancher', 'Peinture', 'Ventilation', 'Ossature & Structure'])
  vrai(`onglet « ${t} » présent`, titres.includes(t))

// ─── « Toute la pièce » proposé partout où c'est mesurable ───────────────────
const champsMesures = toutes.flatMap(q => q.inputs.filter(i => i.measure).map(i => ({ q: q.id, i })))
vrai(`quantités mesurées sur la pièce : ${champsMesures.length} champs`, champsMesures.length >= 15)
vrai('chaque champ mesuré propose la mesure réelle de la pièce',
  champsMesures.every(c => c.i.roomQty > 0))
vrai('un champ « toute la pièce » démarre sur la mesure de la pièce',
  champsMesures.filter(c => c.i.modeDefaut !== 'partie').every(c => c.i.default === c.i.roomQty))
// Douche, dosseret et murs de bain ne couvrent jamais la pièce entière : le
// choix reste offert, mais la valeur de départ est la superficie du travail.
const partiels = champsMesures.filter(c => c.i.modeDefaut === 'partie')
vrai(`travaux partiels par défaut : ${partiels.map(c => c.q).join(', ')}`, partiels.length >= 3)
vrai('un travail partiel ne démarre pas sur toute la pièce',
  partiels.every(c => c.i.default !== c.i.roomQty))
vrai('un travail partiel offre quand même « toute la pièce »',
  partiels.every(c => c.i.roomQty > 0))
vrai('unités correctes (pc pour les surfaces, pl pour le périmètre)',
  champsMesures.every(c => c.i.unit === (c.i.measure === 'perimetrePl' ? 'pl' : 'pc')))

// Chaque onglet chiffré doit offrir au moins une quantité mesurée sur la pièce
for (const s of Q.sections) {
  const chiffre = s.questions.some(q => q.inputs.some(i => i.type === 'number'))
  const mesure = s.questions.some(q => q.inputs.some(i => i.measure))
  if (!chiffre || ['Travaux généraux', 'Ventilation', 'Comptoir', 'Électricité'].includes(s.title)) continue
  vrai(`onglet « ${s.title} » offre le choix toute la pièce / en partie`, mesure)
}

// ─── Démolition : cloison intérieure en pieds linéaires ──────────────────────
const cloison = trouve('sdb-cloison-demolir')
vrai('cloison intérieure à démolir présente', !!cloison)
vrai('cloison mesurée en pieds linéaires', cloison.inputs[0].unit === 'pl')
eq('cloison — toute la pièce = périmètre', cloison.inputs[0].roomQty, M.perimetrePl, 1)

// ─── Ossature et structure : nouvelle cloison ────────────────────────────────
const ossature = trouve('sdb-cloison-neuve')
vrai('nouvelle cloison (ossature et structure) présente', !!ossature)
vrai('nouvelle cloison mesurée en pieds linéaires', ossature.inputs[0].unit === 'pl')

// ─── Gypse : 1/2", parfait 1 côté / 2 côtés, Novotech ────────────────────────
const gypse = trouve('sdb-gypse-neuf')
const optionsGypse = gypse.inputs.find(i => i.name === 'type').options
console.log('Gypse :', optionsGypse.join(' / '))
vrai('gypse 1/2" par défaut', optionsGypse[0].startsWith('1/2"'))
for (const attendu of ['1/2" parfait 1 côté', '1/2" parfait 2 côtés', 'Parfait Novotech'])
  vrai(`gypse « ${attendu} » proposé`, optionsGypse.includes(attendu))
vrai('gypse mesuré avec choix de la pièce', !!gypse.inputs.find(i => i.measure))

// Le fini « parfait » coûte plus cher en matériel que le régulier
const R = defaultRates()
const prix = (type) => {
  const l = gypse.lines({ type, pc: 100 })[0]
  return l.qty * (l.unitMat + l.unitLabor)
}
vrai('gypse parfait 2 côtés plus cher que le régulier', prix('1/2" parfait 2 côtés') > prix('1/2" régulier'))
vrai('Novotech le plus cher des finis parfaits', prix('Parfait Novotech') > prix('1/2" parfait 1 côté'))

// ─── Plafond : finition + 2e proposition, mesuré en pi² ──────────────────────
const plafond = trouve('sdb-plafond')
const plafond2 = trouve('sdb-plafond-prop2')
vrai('plafond présent', !!plafond)
vrai('2e proposition de plafond présente', !!plafond2)
eq('plafond — toute la pièce = superficie du plafond', plafond.inputs.find(i => i.measure).roomQty, M.plafondPc, 1)
vrai('4 finitions de plafond proposées', PLAFOND_TYPES.length === 4)
// Le gypse tiré entraîne une ligne de tirage de joints séparée
const lignesPlafond = plafond.lines({ type: 'Gypse tiré et peint', pc: 56 })
vrai('plafond en gypse tiré → ligne de joints séparée',
  lignesPlafond.length === 2 && lignesPlafond[1].trade === 'joints')
vrai('plafond en bois → une seule ligne', plafond.lines({ type: 'Bois', pc: 56 }).length === 1)
vrai('plafond sans superficie → aucune ligne', plafond.lines({ type: 'Bois', pc: 0 }).length === 0)

// ─── Plancher : céramique, formats, membranes, flottant, ingénieur ───────────
const ceram = trouve('sdb-plancher-ceramique')
const formats = ceram.inputs.find(i => i.name === 'format').options
const poses = ceram.inputs.find(i => i.name === 'pose').options
console.log('Formats :', formats.join(' / '), '· Poses :', poses.join(' / '))
for (const f of ['24x24', '24x48']) vrai(`format ${f} proposé`, formats.includes(f))
vrai('pose « Sur fret » proposée', poses.includes('Sur fret'))
const prix2424 = ceram.lines({ format: '24x24', pose: 'Droite', posePc: 100 })[0]
const prix2448 = ceram.lines({ format: '24x48', pose: 'Droite', posePc: 100 })[0]
vrai('le grand format 24x48 coûte plus cher à poser', prix2448.unitLabor > prix2424.unitLabor)
eq('supplément grand format', prix2448.unitLabor - prix2424.unitLabor, R.ceramGrandFormatSupp, 0.01)

const membrane = trouve('sdb-membrane-plancher')
const optionsMembrane = membrane.inputs.find(i => i.name === 'type').options
console.log('Membranes :', optionsMembrane.join(' / '))
vrai('membrane Ditra-Heat proposée', optionsMembrane.some(o => o.includes('Ditra-Heat')))
vrai('membrane « nécessaire » proposée', optionsMembrane.some(o => o.includes('nécessaire')))
vrai('option « Aucune » proposée', optionsMembrane.includes('Aucune'))
vrai('« Aucune » ne génère aucune ligne', membrane.lines({ type: 'Aucune', pc: 56 }).length === 0)
vrai('Ditra-Heat génère une ligne', membrane.lines({ type: MEMBRANE_TYPES[0].label, pc: 56 }).length === 1)

const flottant = trouve('sdb-plancher-flottant')
const typesFlottant = flottant.inputs.find(i => i.name === 'type').options
vrai('vinyle clic proposé', typesFlottant.includes('Vinyle clic'))
vrai('bois franc 3/4" proposé', typesFlottant.includes('Bois franc 3/4"'))

const ingenieur = trouve('sdb-plancher-ingenieur')
const posesIng = ingenieur.inputs.find(i => i.name === 'pose').options
for (const p of ['Double encollage', 'Collé', 'Cloué']) vrai(`plancher ingénieur — ${p}`, posesIng.includes(p))
vrai('le double encollage coûte plus cher que le cloué',
  ingenieur.lines({ pose: 'Double encollage', pc: 100 })[0].unitLabor >
  ingenieur.lines({ pose: 'Cloué', pc: 100 })[0].unitLabor)

vrai('tapis mur à mur présent', !!trouve('sdb-plancher-tapis'))
vrai('béton poli présent', !!trouve('sdb-plancher-beton-poli'))
vrai('préparation du sous-plancher (auto-nivelant) présente', !!trouve('sdb-sous-plancher'))

// ─── Pas de double comptage du plancher ──────────────────────────────────────
for (const ancien of ['sdb-ceramique-plancher', 'sdb-autre-plancher', 'sdb-ditra'])
  vrai(`ancienne question « ${ancien} » retirée (pas de double comptage)`, !trouve(ancien))

// ─── Peinture : murs / plafond / boiseries et portes ─────────────────────────
const pMurs = trouve('sdb-peinture-murs')
const pPlafond = trouve('sdb-peinture-plafond')
const pBois = trouve('sdb-peinture-boiseries')
vrai('peinture des murs présente', !!pMurs)
vrai('peinture du plafond présente', !!pPlafond)
vrai('peinture des boiseries et portes présente', !!pBois)
vrai('murs en partie : mesurés en pieds linéaires', pMurs.inputs[0].unit === 'pl')
// 30 pi lin. × 8 pi de hauteur = 240 pi² de murs
eq('peinture murs : pi. lin. × hauteur = superficie',
  pMurs.lines({ pl: M.perimetrePl })[0].qty, M.perimetrePl * M.hauteurPi, 1)
vrai('peinture des portes chiffrée à part',
  pBois.lines({ pl: 0, portes: 3 }).some(l => l.description.includes('portes')))
vrai('ancienne question peinture globale retirée', !trouve('sdb-peinture'))

// ─── Ventilation : ajout et trappe ───────────────────────────────────────────
vrai('ajout d’un ventilateur présent', !!trouve('sdb-ventilateur-ajout'))
vrai('trappe de ventilation à déplacer présente', !!trouve('sdb-trappe-ventilation'))

// ─── Corps de métier des nouvelles questions ─────────────────────────────────
const metier = (id, want) => {
  const got = tradeForQuestion(id)
  if (got === want) { ok++; console.log(`OK   ${id} → ${got}`) }
  else { fail++; console.log(`ÉCHEC ${id} : obtenu ${got}, attendu ${want}`) }
}
metier('sdb-peinture-murs', 'peinture')
metier('sdb-peinture-plafond', 'peinture')
metier('sdb-peinture-boiseries', 'peinture')
metier('sdb-plancher-ceramique', 'ceramique')
metier('sdb-membrane-plancher', 'ceramique')
metier('sdb-sous-plancher', 'ceramique')
metier('sdb-plancher-flottant', 'couvrePlancher')
metier('sdb-plancher-ingenieur', 'couvrePlancher')
metier('sdb-plancher-tapis', 'couvrePlancher')
metier('sdb-plancher-beton-poli', 'couvrePlancher')
metier('sdb-cloison-neuve', null)      // → Menuiserie / Matériel
metier('sdb-trappe-ventilation', null) // → Menuiserie / Matériel

// ─── Cuisine et pièce standard reçoivent les mêmes onglets ───────────────────
for (const piece of [
  { name: 'Cuisine', baseName: 'Cuisine', length: 15, width: 12, height: 8 },
  { name: 'Chambre', baseName: 'Chambre', length: 12, width: 10, height: 8 },
]) {
  const q = questionnaireForRoom(piece, defaultRates(), 'pi')
  const t = q.sections.map(s => s.title)
  for (const attendu of ['Plafond', 'Plancher', 'Peinture'])
    vrai(`${piece.name} : onglet « ${attendu} »`, t.includes(attendu))
}

// ─── Pièce sans dimensions : pas de plantage, pas de « toute la pièce » ──────
const vide = questionnaireForRoom({ name: 'Autre' }, defaultRates(), 'pi')
const champsVides = vide.sections.flatMap(s => s.questions).flatMap(q => q.inputs).filter(i => i.measure)
vrai('pièce sans dimensions : aucun bouton « toute la pièce » trompeur',
  champsVides.every(i => i.roomQty === null))
vrai('pièce sans dimensions : valeurs par défaut conservées',
  champsVides.every(i => typeof i.default === 'number'))

console.log(`\n${ok} réussis, ${fail} échoués`)
if (fail > 0) process.exit(1)
console.log('✅ Questionnaire conforme aux feuilles manuscrites')
