// Tests du moteur de calcul des soumissions, vérifiés contre les formules du
// gabarit Excel (feuille « Calcul des coûts »).
import { lineAmount, tradeBreakdown, costSummary, quoteTotals, tradeForQuestion, ADMIN_PROFIT_PCT } from './quoteCosting.js'

let ok = 0, fail = 0
const eq = (label, got, want) => {
  const pass = Math.abs(got - want) < 0.011 || got === want
  if (pass) { ok++; console.log(`OK   ${label} = ${got}`) }
  else { fail++; console.log(`ÉCHEC ${label} : obtenu ${got}, attendu ${want}`) }
}

// ─── Formule de ligne : MAX(qté × coût, montant minimum) ─────────────────────
eq('ligne sans plancher (4 × 90)', lineAmount({ qty: 4, unitLabor: 90 }), 360)
// Excel ligne 29 : « Enlever les armoires », Montant Minimum = 220
eq('plancher inactif (360 > 220)', lineAmount({ qty: 4, unitLabor: 90, min: 220 }), 360)
eq('plancher actif (90 < 220)', lineAmount({ qty: 1, unitLabor: 90, min: 220 }), 220)
eq('matériaux + M.O. combinés', lineAmount({ qty: 100, unitMat: 0.75, unitLabor: 1.5 }), 225)

// ─── Classement par corps de métier (suffixe d'identifiant) ──────────────────
const t = (id, want) => {
  const got = tradeForQuestion(id)
  if (got === want) { ok++; console.log(`OK   ${id} → ${got}`) }
  else { fail++; console.log(`ÉCHEC ${id} : obtenu ${got}, attendu ${want}`) }
}
t('sdb-joints', 'joints')
t('cui-peinture', 'peinture')
t('sdb-ceramique-plancher', 'ceramique')
t('sdb-dosseret', 'ceramique')
t('sdb-plinthes-ceramique', 'ceramique')
t('sdb-autre-plancher', 'couvrePlancher')
t('sdb-verre-avec-porte', 'verreDouche')
t('sdb-enl-toilette', 'plomberie')
t('sdb-depl-lavabo', 'plomberie')
t('cui-inst-evier', 'plomberie')
t('gen-prises-deplacer', 'electricite')
t('gen-elec-allocation', 'electricite')
t('gen-chauffage-ajout', 'electricite')
t('gen-gestion', 'gestion')
t('gen-autres', 'autres')
t('sdb-gypse-neuf', null) // → ventilation Menuiserie / Matériel

// ─── Ventilation : une ligne générique se scinde M.O. / matériaux ────────────
const gypse = { questionId: 'sdb-gypse-neuf', qty: 100, unitMat: 0.75, unitLabor: 1.5 }
const b = tradeBreakdown([gypse])
eq('gypse → Menuiserie (100 × 1,50)', b.menuiserie, 150)
eq('gypse → Matériel (100 × 0,75)', b.materiel, 75)

// Une ligne d'un corps de métier explicite y va en entier
const b2 = tradeBreakdown([{ questionId: 'sdb-joints', qty: 214, unitLabor: 1.1, unitMat: 0.15 }])
eq('joints → corps de métier entier', b2.joints, 267.5)
eq('joints ne pollue pas Menuiserie', b2.menuiserie, 0)

// ─── Résumé complet et contrôle « BON / ERREUR » ─────────────────────────────
const items = [
  gypse,                                                            // 225
  { questionId: 'sdb-joints', qty: 100, unitLabor: 1.1 },           // 110
  { questionId: 'sdb-enl-toilette', qty: 1, unitLabor: 95 },        //  95
  { questionId: 'sdb-armoires-enl', qty: 1, unitLabor: 90, min: 220 }, // 220 (plancher)
]
const s = costSummary(items)
eq('total des lignes', s.totalLignes, 650)
eq('total avant profit', s.totalAvantProfit, 650)
if (s.coherent) { ok++; console.log('OK   contrôle de cohérence = BON') }
else { fail++; console.log('ÉCHEC contrôle de cohérence : ERREUR') }
eq('Admin et Profit 20 %', s.adminProfit, 130)
eq('total avec profit', s.totalAvecProfit, 780)
eq('taux Admin et Profit du gabarit', ADMIN_PROFIT_PCT, 20)

// ─── Totaux client : taxes appliquées sur le total AVEC profit ───────────────
const q = quoteTotals(items)
eq('sous-total des travaux', q.sousTotal, 780)
eq('TPS 5 %', q.tps, 39)
eq('TVQ 9,975 %', q.tvq, 77.81)
eq('total toutes taxes', q.total, 896.81)

console.log(`\n${ok} réussis, ${fail} échoués`)
if (fail > 0) process.exit(1)
console.log('✅ Le moteur de soumission reproduit les formules du gabarit Excel')
