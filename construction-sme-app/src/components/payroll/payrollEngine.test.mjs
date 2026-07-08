// Vérifie que payrollEngine.js reproduit fidèlement les formules du
// classeur Excel fourni. Exécuter avec : node payrollEngine.test.mjs
import { computeWeek, computeYear, generateWeekDates } from './payrollEngine.js'

let failures = 0
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) < eps
const check = (label, actual, expected) => {
  if (!approx(actual, expected)) {
    console.error(`FAIL ${label}: attendu ${expected}, obtenu ${actual}`)
    failures++
  } else {
    console.log(`OK   ${label} = ${actual}`)
  }
}

// Cas 1 : toutes les valeurs à zéro (comme le classeur 2027 vierge)
{
  const r = computeWeek({ D: 0, I: 0, O: 0, U: 0, AD: 40 }, { L: 0, R: 0, X: 0 })
  check('semaine vide — E', r.E, 0)
  check('semaine vide — Z', r.Z, 0)
  check('semaine vide — L', r.L, 0)
}

// Cas 2 : Commercial 45h — 40 temps simple, 1h temps et demi, 4h temps double
{
  const r = computeWeek({ D: 45, I: 0, O: 0, U: 0, AD: 40 }, { L: 0, R: 0, X: 0 })
  check('Commercial 45h — E (simple)', r.E, 40)
  check('Commercial 45h — F (demi)', r.F, 1)
  check('Commercial 45h — G (double)', r.G, 4)
}

// Cas 3 : Résidentiel Lourd 45h travaillées — 5h mises en banque, 40 payées
{
  const r = computeWeek({ D: 0, I: 45, O: 0, U: 0, AD: 40 }, { L: 0, R: 0, X: 0 })
  check('Résid. Lourd 45h — J (mis en banque)', r.J, 5)
  check('Résid. Lourd 45h — M (total payé)', r.M, 40)
  check('Résid. Lourd 45h — L (solde)', r.L, 5)
}

// Cas 4 : semaine suivante, 35h travaillées avec 5h en banque — doit combler à 40h
{
  const r = computeWeek({ D: 0, I: 35, O: 0, U: 0, AD: 40 }, { L: 5, R: 0, X: 0 })
  check('Résid. Lourd 35h + banque 5h — K (pris)', r.K, 5)
  check('Résid. Lourd 35h + banque 5h — M (total payé)', r.M, 40)
  check('Résid. Lourd 35h + banque 5h — L (solde)', r.L, 0)
}

// Cas 5 : Résidentiel Non-Réglementé — pas de plafond à zéro sur le solde (contrairement à Lourd)
{
  const r1 = computeWeek({ D: 0, I: 0, O: 0, U: 45, AD: 40 }, { L: 0, R: 0, X: 0 })
  check('Non-Règlem 45h — V (mis en banque)', r1.V, 5)
  check('Non-Règlem 45h — X (solde)', r1.X, 5)
  const r2 = computeWeek({ D: 0, I: 0, O: 0, U: 30, AD: 40 }, { L: 0, R: 0, X: r1.X })
  check('Non-Règlem 30h + banque 5h — W (pris)', r2.W, 5)
  check('Non-Règlem 30h + banque 5h — Y (total payé)', r2.Y, 35)
}

// Cas 6 : Résidentiel Léger — jamais testé jusqu'ici, banque + retrait
{
  // Semaine A : 45h Léger travaillées, rien d'autre → banque 5h, payé 40h
  const rA = computeWeek({ D: 0, I: 0, O: 45, U: 0, AD: 40 }, { L: 0, R: 0, X: 0 })
  check('Résid. Léger 45h — P (mis en banque)', rA.P, 5)
  check('Résid. Léger 45h — S (total payé)', rA.S, 40)
  check('Résid. Léger 45h — R (solde)', rA.R, 5)

  // Semaine B : 30h Léger, banque de 5h → complète à 35h (banque insuffisante pour 40)
  const rB = computeWeek({ D: 0, I: 0, O: 30, U: 0, AD: 40 }, { L: 0, R: rA.R, X: 0 })
  check('Résid. Léger 30h + banque 5h — Q (pris)', rB.Q, 5)
  check('Résid. Léger 30h + banque 5h — S (total payé)', rB.S, 35)
  check('Résid. Léger 30h + banque 5h — R (solde)', rB.R, 0)
}

// Cas 7 : vérification manuelle d'un enchaînement de 4 semaines, un seul
// employé, une seule catégorie à la fois (usage réel typique), calculée à
// la main puis comparée à l'engin — couvre l'effet cumulatif du solde de
// banque Lourd sur plusieurs semaines consécutives.
{
  const AD = 40
  // S1: 44h Lourd → banque +4, payé 40, solde 4
  // S2: 36h Lourd, solde 4 → K=min(besoin 4, solde 4)=4, payé 40, solde 0
  // S3: 38h Lourd, solde 0 → K=0 (rien en banque), payé 38 (pas 40 : pas assez travaillé ni de banque)
  // S4: 50h Lourd → banque +10, payé 40, solde 10
  const inputs = [
    { date: '2027-01-02', D: 0, I: 44, O: 0, U: 0, AD },
    { date: '2027-01-09', D: 0, I: 36, O: 0, U: 0, AD },
    { date: '2027-01-16', D: 0, I: 38, O: 0, U: 0, AD },
    { date: '2027-01-23', D: 0, I: 50, O: 0, U: 0, AD },
  ]
  const results = computeYear(inputs, { L: 0, R: 0, X: 0 })
  check('4 semaines Lourd — S1 solde', results[0].L, 4)
  check('4 semaines Lourd — S1 payé', results[0].M, 40)
  check('4 semaines Lourd — S2 pris', results[1].K, 4)
  check('4 semaines Lourd — S2 payé', results[1].M, 40)
  check('4 semaines Lourd — S2 solde', results[1].L, 0)
  check('4 semaines Lourd — S3 pris', results[2].K, 0)
  check('4 semaines Lourd — S3 payé (pas de banque, 38h travaillées)', results[2].M, 38)
  check('4 semaines Lourd — S4 banque +10', results[3].J, 10)
  check('4 semaines Lourd — S4 payé', results[3].M, 40)
  check('4 semaines Lourd — S4 solde final', results[3].L, 10)

  // Total annuel : 44+36+38+50 = 168h travaillées sur ces 4 semaines
  const totals = { D: 0, I: 44 + 36 + 38 + 50, O: 0, U: 0 }
  const sumI = inputs.reduce((s, w) => s + w.I, 0)
  check('4 semaines Lourd — total I travaillé', sumI, 168)
}

// Cas 8 : enchaînement de 52 semaines réalistes ne doit jamais planter
{
  const dates = generateWeekDates(2027)
  check('generateWeekDates — 52 semaines', dates.length, 52)
  check('generateWeekDates — 1ère semaine = 2027-01-02', dates[0] === '2027-01-02' ? 1 : 0, 1)
  const inputs = dates.map((date, i) => ({
    date, AD: 40,
    D: i % 3 === 0 ? 45 : 38,
    I: i % 5 === 0 ? 42 : 20,
    O: i % 7 === 0 ? 10 : 0,
    U: 0,
  }))
  const results = computeYear(inputs, { L: 0, R: 0, X: 0 })
  check('52 semaines calculées', results.length, 52)
  const last = results[results.length - 1]
  console.log('Soldes finaux — L:', last.L, 'R:', last.R, 'X:', last.X)
}

if (failures > 0) {
  console.error(`\n${failures} test(s) échoué(s)`)
  process.exit(1)
}
console.log('\n✅ Tous les tests du moteur de paie passent')
