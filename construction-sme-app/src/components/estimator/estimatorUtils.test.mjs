// Tests de la base de mesure « toute la pièce » / « pieds linéaires ».
// Le point à garantir : changer d'unité d'affichage ne doit JAMAIS changer le
// total d'une ligne — seul un changement de base le fait.
import {
  applyMeasureBasis, basisUnit, lineTotal, qtyFactor, autoQtyForItem,
  BASE_PIECE, BASE_LINEAIRE, M2_PAR_PI2, M_PAR_PI,
} from './estimatorUtils.js'
import { CATALOG } from '../../data/estimatorCatalog.js'

let ok = 0, fail = 0
const eq = (label, got, want, tol = 0.02) => {
  const pass = Math.abs(got - want) <= tol
  if (pass) { ok++; console.log(`OK   ${label} = ${got}`) }
  else { fail++; console.log(`ÉCHEC ${label} : obtenu ${got}, attendu ${want}`) }
}
const same = (label, got, want) => {
  if (got === want) { ok++; console.log(`OK   ${label} = ${got}`) }
  else { fail++; console.log(`ÉCHEC ${label} : obtenu ${got}, attendu ${want}`) }
}

// Pièce de 10 pi × 12 pi, plafond 8 pi → en mètres
const roomCalc = { floorArea: 11.15, ceilArea: 11.15, wallArea: 32.8, perimeter: 13.41 }

// ─── Libellés d'unité ────────────────────────────────────────────────────────
same('unité surface en pieds', basisUnit(BASE_PIECE, 'pi').label, 'pi²')
same('unité linéaire en pieds', basisUnit(BASE_LINEAIRE, 'pi').label, 'pi lin.')
same('unité surface en mètres', basisUnit(BASE_PIECE, 'm').label, 'm²')
same('unité linéaire en mètres', basisUnit(BASE_LINEAIRE, 'm').label, 'm lin.')

// ─── Toute la pièce, en pieds ────────────────────────────────────────────────
const piece = applyMeasureBasis({
  base: BASE_PIECE, roomCalc, unit: 'pi', naturalKey: 'floorArea', matM: 38, laborM: 14,
})
eq('surface convertie en pi²', piece.qty, 11.15 * M2_PAR_PI2)
same('unité affichée', piece.unit, 'pi²')

// Le total doit égaler le calcul métrique d'origine : 11,15 m² × 52 $/m²
eq('total identique au calcul métrique', lineTotal(piece), 11.15 * 52, 0.1)

// ─── Le même travail affiché en mètres donne le MÊME total ───────────────────
const pieceM = applyMeasureBasis({
  base: BASE_PIECE, roomCalc, unit: 'm', naturalKey: 'floorArea', matM: 38, laborM: 14,
})
eq('total en mètres', lineTotal(pieceM), 11.15 * 52, 0.1)
eq('changer d’unité ne change pas le total', lineTotal(piece), lineTotal(pieceM), 0.1)

// ─── Pieds linéaires ─────────────────────────────────────────────────────────
const lin = applyMeasureBasis({
  base: BASE_LINEAIRE, roomCalc, unit: 'pi', matM: 12, laborM: 8,
})
eq('périmètre converti en pi lin.', lin.qty, 13.41 * M_PAR_PI)
same('unité affichée', lin.unit, 'pi lin.')
eq('total linéaire identique au métrique', lineTotal(lin), 13.41 * 20, 0.1)

// ─── « Toute la pièce » respecte la nature du travail ────────────────────────
const murs = applyMeasureBasis({
  base: BASE_PIECE, roomCalc, unit: 'pi', naturalKey: 'wallArea', matM: 10, laborM: 10,
})
eq('peinture murs mesurée sur les murs', murs.qty, 32.8 * M2_PAR_PI2)
eq('total sur la surface des murs', lineTotal(murs), 32.8 * 20, 0.1)

// ─── Changer de base change bien le total (c’est le but) ─────────────────────
if (Math.abs(lineTotal(piece) - lineTotal(lin)) > 1) {
  ok++; console.log('OK   changer de base change le total, comme attendu')
} else {
  fail++; console.log('ÉCHEC changer de base devrait changer le total')
}

// ─── Pièce sans dimensions : pas de plantage ─────────────────────────────────
const vide = applyMeasureBasis({ base: BASE_PIECE, roomCalc: {}, unit: 'pi', matM: 5, laborM: 5 })
eq('pièce sans dimensions → quantité nulle', vide.qty, 0)
eq('pièce sans dimensions → total nul', lineTotal(vide), 0)

// ─── Part de couverture des revêtements muraux ───────────────────────────────
// Salle de bain 2,4 m × 2,1 m × 2,44 m → 21,96 m² de murs.
const sdb = { floorArea: 5.04, ceilArea: 5.04, wallArea: 21.96, perimeter: 9 }
const article = (id) => CATALOG.find(c => c.id === id)

eq('facteur sans part de couverture', qtyFactor({ wasteFactor: 1.1 }), 1.1)
eq('facteur avec part de couverture', qtyFactor({ wasteFactor: 1.1, coverage: 0.5 }), 0.55)
eq('article sans réglage → facteur 1', qtyFactor({}), 1)

const douche = autoQtyForItem(article('carrelage-douche'), sdb)
const mursCeram = autoQtyForItem(article('carrelage-mur-sdb'), sdb)
const dosseret = autoQtyForItem(article('carrelage-dosseret'), sdb)
console.log(`Douche ${douche} m² · Murs ${mursCeram} m² · Dosseret ${dosseret} m²`)

// Une douche d'alcôve tient entre 4 et 12 m² : elle ne peut pas valoir tous
// les murs de la pièce (le défaut avant correction).
if (douche > 4 && douche < 12) { ok++; console.log('OK   douche dimensionnée en alcôve, pas en pièce entière') }
else { fail++; console.log(`ÉCHEC douche irréaliste : ${douche} m²`) }

if (dosseret > 0.5 && dosseret < 4) { ok++; console.log('OK   dosseret dimensionné en bande de comptoir') }
else { fail++; console.log(`ÉCHEC dosseret irréaliste : ${dosseret} m²`) }

// Le mur en céramique, lui, couvre bien toute la pièce (perte à la coupe incluse)
eq('mur en céramique = tous les murs + perte', mursCeram, 21.96 * 1.12, 0.15)

// Les trois ensemble doivent rester en deçà du double des murs : sans part de
// couverture ils en faisaient plus du triple.
if (douche + mursCeram + dosseret < 21.96 * 2) { ok++; console.log('OK   les trois articles ne triplent plus les murs') }
else { fail++; console.log('ÉCHEC le cumul des trois revêtements dépasse le double des murs') }

// Les trois se chiffrent bien en superficie
for (const id of ['carrelage-douche', 'carrelage-mur-sdb', 'carrelage-dosseret']) {
  const a = article(id)
  same(`${a.label} mesuré en superficie`, a.autoQty, 'wallArea')
  same(`${a.label} en m² (converti en pi² à l’affichage)`, a.unit, 'm²')
}

console.log(`\n${ok} réussis, ${fail} échoués`)
if (fail > 0) process.exit(1)
console.log('✅ Base de mesure « toute la pièce » / « pieds linéaires » correcte')
