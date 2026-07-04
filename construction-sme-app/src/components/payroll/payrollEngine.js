// Moteur de calcul du module Paie & Heures — reproduit à l'identique les
// formules du classeur Excel fourni (feuille par employé, colonnes D à AB),
// utilisées dans l'industrie de la construction régie par la CCQ au Québec :
// heures Commercial (temps simple / demi / double) et banque d'heures pour
// les trois catégories Résidentiel (Lourd réglementé, Léger réglementé,
// Non-réglementé).
//
// Une semaine ne peut être calculée qu'en connaissant le solde de banque
// (L, R, X) de la semaine précédente — les calculs doivent donc toujours
// être faits en séquence, du 1er janvier vers le 31 décembre.

// Calcule une semaine (colonnes D à AB) à partir des heures travaillées
// saisies (D, I, O, U), des heures à travailler cette semaine-là (AD),
// et du solde de banque reporté de la semaine précédente.
export function computeWeek({ D, I, O, U, AD }, prevBank) {
  D = Number(D) || 0
  I = Number(I) || 0
  O = Number(O) || 0
  U = Number(U) || 0
  AD = Number(AD) || 0
  const { L: Lprev, R: Rprev, X: Xprev } = prevBank

  // ─── COMMERCIAL (pas de banque — payé directement) ───
  const E = Math.min(D, AD)                                          // Payé T. Simple
  const F = D >= AD + 0.01 ? (D >= AD + 1 ? 1 : D - Math.floor(D)) : 0 // Payé T. et demi
  const G = D >= 41 ? D - 41 : 0                                      // Payé T. Double

  // ─── RÉSIDENTIEL LOURD RÉGLEMENTÉ ───
  const J = (E + I) >= AD ? (E + I) - AD : 0                          // Mis en banque

  let K // Pris en banque
  if (I === 0 && D === 0 && Lprev === 0) K = 0
  else if ((D + I) >= AD) K = 0
  else if (Lprev > (AD - (D + I))) K = AD - (D + I)
  else K = Lprev

  const L = Math.max(0, Lprev + J - K)                                // Solde en banque
  const M = I + K - J                                                 // Total Payé

  // ─── RÉSIDENTIEL LÉGER RÉGLEMENTÉ ───
  let P // Mis en banque
  if ((D + I) > AD) P = O
  else if ((D + I + O + K) > AD) P = (D + I + O + K) - AD
  else P = 0

  let Q // Pris en banque
  if ((E + M + O) >= AD) Q = 0
  else if (K > Lprev) Q = 0
  else Q = Math.min(AD - (E + M + O), Rprev)

  const R = (Lprev < K) ? (P + Rprev - Q - (K - Lprev)) : (P + Rprev - Q) // Solde en banque
  const S = O + Q - P                                                 // Total Payé

  // ─── RÉSIDENTIEL NON-RÉGLEMENTÉ ───
  const V = (D + M + S + U) >= AD ? (D + M + S + U) - AD : 0           // Mis en banque

  let W // Pris en banque
  if (U >= AD) W = 0
  else if (Xprev < (AD - U)) W = Xprev
  else W = AD - U

  const X = Xprev + V - W                                             // Solde en banque
  const Y = U - V + W                                                 // Total Payé

  // ─── TOTAUX DE LA SEMAINE ───
  const Z = Y + M + S + E   // Total payé — temps simple
  const AA = F              // Total payé — temps et demi
  const AB = G              // Total payé — temps double

  return { D, E, F, G, I, J, K, L, M, O, P, Q, R, S, U, V, W, X, Y, Z, AA, AB, AD }
}

// Calcule les 52 semaines d'une année pour un employé, en partant du solde
// de banque reporté de l'année précédente (opening = { L, R, X }).
export function computeYear(weeklyInputs, opening) {
  let bank = { L: opening?.L ?? 0, R: opening?.R ?? 0, X: opening?.X ?? 0 }
  const results = []
  for (const wk of weeklyInputs) {
    const res = computeWeek(wk, bank)
    bank = { L: res.L, R: res.R, X: res.X }
    results.push({ date: wk.date, ...res })
  }
  return results
}

// Totaux annuels + répartition en % par catégorie (reproduit les lignes
// "HRES TOTALES PAR CATÉGORIE" / "% PAR CATÉGORIE" / "HEURES TOTALES
// TRAVAILLÉES" du classeur).
export function yearTotals(weeks) {
  const sum = (key) => weeks.reduce((s, w) => s + (w[key] || 0), 0)
  const commercial = sum('E') + sum('F') + sum('G')
  const lourd = sum('I') + sum('J') + sum('K')
  const leger = sum('O') + sum('P') + sum('Q')
  const nonReglem = sum('U') + sum('V') + sum('W')
  const zTotal = sum('Z')
  const aaTotal = sum('AA')
  const abTotal = sum('AB')
  const denom = sum('K') + sum('Q') + sum('W') + zTotal + abTotal
  return {
    D: sum('D'), E: sum('E'), G: sum('G'),
    I: sum('I'), J: sum('J'), K: sum('K'), M: sum('M'),
    O: sum('O'), P: sum('P'), Q: sum('Q'), S: sum('S'),
    U: sum('U'), V: sum('V'), W: sum('W'), Y: sum('Y'),
    Z: zTotal, AA: aaTotal, AB: abTotal,
    pctCommercial: denom ? sum('E') / denom : 0,
    pctLourd: sum('I') + sum('J') + sum('K'),
    pctLeger: sum('O') + sum('P') + sum('Q'),
    pctNonReglem: sum('U') + sum('V') + sum('W'),
    heuresTravaillees: sum('D') + sum('I') + sum('O') + sum('U'),
  }
}

// Génère les dates de fin de semaine (samedis) pour une année donnée,
// en partant du premier samedi de l'année (comme dans le classeur fourni,
// où la semaine 1 de 2027 se termine le samedi 2 janvier 2027).
export function generateWeekDates(year, count = 52) {
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const day = jan1.getUTCDay() // 0 = dimanche … 6 = samedi
  const offsetToSaturday = (6 - day + 7) % 7
  const firstSaturday = new Date(jan1)
  firstSaturday.setUTCDate(jan1.getUTCDate() + offsetToSaturday)

  const dates = []
  for (let i = 0; i < count; i++) {
    const d = new Date(firstSaturday)
    d.setUTCDate(firstSaturday.getUTCDate() + i * 7)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export const emptyWeekInput = (AD = 40) => ({ D: 0, I: 0, O: 0, U: 0, AD })
