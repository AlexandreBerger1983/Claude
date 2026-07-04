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

// Cas 6 : enchaînement de 52 semaines réalistes ne doit jamais planter
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
