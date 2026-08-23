// Utilitaires partagés du module Estimateur.
// Les dimensions des pièces sont saisies en pieds ou en mètres (au choix de
// l'utilisateur) mais toujours converties en mètres pour le calcul des
// quantités, car les prix du catalogue sont au m².

export const FT_TO_M = 0.3048

export const toMeters = (value, unit) => {
  const v = parseFloat(value) || 0
  return unit === 'pi' ? v * FT_TO_M : v
}

export const fromMeters = (meters, unit) => {
  return unit === 'pi' ? meters / FT_TO_M : meters
}

// Surfaces d'une pièce, en unités métriques (m², m)
export const computeRoom = (room, unit) => {
  const l = toMeters(room.length, unit)
  const w = toMeters(room.width, unit)
  const h = toMeters(room.height, unit)
  return {
    floorArea: +(l * w).toFixed(2),
    ceilArea:  +(l * w).toFixed(2),
    wallArea:  +(2 * (l + w) * h).toFixed(2),
    perimeter: +(2 * (l + w)).toFixed(2),
  }
}

// ─── Base de mesure : toute la pièce, ou pieds linéaires ─────────────────────
// Les dimensions sont saisies en pieds mais le catalogue est chiffré au mètre.
// Ces fonctions expriment la quantité dans l'unité de l'utilisateur ET
// convertissent le prix unitaire d'autant, pour que le total reste
// rigoureusement identique au calcul métrique. Changer d'unité d'affichage ne
// doit jamais changer un prix ; seul un changement de base le fait.
export const M2_PAR_PI2 = 10.7639
export const M_PAR_PI = 3.28084

export const BASE_PIECE = 'piece'
export const BASE_LINEAIRE = 'lineaire'

// Facteur métrique → unité de l'utilisateur, et libellé de l'unité.
export const basisUnit = (base, unit) => {
  const lineaire = base === BASE_LINEAIRE
  if (unit === 'pi') {
    return lineaire
      ? { facteur: M_PAR_PI, label: 'pi lin.' }
      : { facteur: M2_PAR_PI2, label: 'pi²' }
  }
  return lineaire ? { facteur: 1, label: 'm lin.' } : { facteur: 1, label: 'm²' }
}

// Quantité et prix unitaires d'une ligne selon la base choisie.
// `naturalKey` est la surface propre au travail (plancher, murs, plafond) :
// « toute la pièce » respecte donc la nature du travail — un plancher se
// mesure au plancher, une peinture de murs aux murs.
export const applyMeasureBasis = ({ base, roomCalc, unit, naturalKey = 'floorArea', matM, laborM, waste = 1 }) => {
  const { facteur, label } = basisUnit(base, unit)
  // Le facteur de perte du catalogue ne s'applique qu'aux surfaces : on ne
  // commande pas 10 % de longueur en trop sur un périmètre mesuré.
  const brut = base === BASE_LINEAIRE
    ? (roomCalc.perimeter ?? 0)
    : (roomCalc[naturalKey] ?? roomCalc.floorArea ?? 0) * waste
  const metrique = brut
  return {
    // Deux décimales : arrondir au dixième fausse sensiblement le total sur
    // les petites valeurs métriques (11,15 m² arrondi à 11,2 → 2,60 $ d'écart).
    qty: +(metrique * facteur).toFixed(2),
    unit: label,
    unitMat: +((matM || 0) / facteur).toFixed(4),
    unitLabor: +((laborM || 0) / facteur).toFixed(4),
  }
}

export const autoQtyForItem = (catalogItem, roomCalc) => {
  if (!catalogItem?.autoQty || !roomCalc) return null
  const val = roomCalc[catalogItem.autoQty] ?? 0
  return +(val * (catalogItem.wasteFactor ?? 1)).toFixed(1)
}

// Montant d'une ligne. Reprend la formule du gabarit Excel :
//   MAX(quantité × coût unitaire ; montant minimum)
// Le montant minimum est un prix plancher (colonne « Montant Minimum » de la
// feuille « Calcul des coûts ») : il s'applique dès que la ligne est incluse.
export const lineTotal = (item) => {
  const q = parseFloat(item.qty) || 0
  const mat = parseFloat(item.unitMat) || 0
  const lab = parseFloat(item.unitLabor) || 0
  const min = parseFloat(item.min) || 0
  return +Math.max(q * (mat + lab), min).toFixed(2)
}

// Taux « Admin et Profit » du gabarit Excel (feuille Calcul des coûts, D17).
export const DEFAULT_ADMIN_PROFIT_PCT = 20

// Marge appliquée au devis. Le gabarit Excel n'utilise qu'un seul taux
// (« Admin et Profit »), et non trois pourcentages composés : c'est donc lui
// qui fait foi. Les anciens brouillons enregistrés avec frais généraux /
// profit / imprévus restent lisibles — leurs trois taux sont additionnés pour
// retrouver une marge équivalente.
export const adminProfitPctOf = (settings = {}) => {
  if (settings.adminProfitPct != null) return settings.adminProfitPct
  const legacy = (settings.overheadPct ?? 0) + (settings.profitPct ?? 0) + (settings.contingencyPct ?? 0)
  return legacy > 0 ? legacy : DEFAULT_ADMIN_PROFIT_PCT
}

// Calcul complet du devis à partir des items et des paramètres
export const computeTotals = (items, settings) => {
  const subtotal = +items.reduce((s, it) => s + lineTotal(it), 0).toFixed(2)
  const matTotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitMat) || 0), 0)
  const laborTotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitLabor) || 0), 0)
  const adminProfitPct = adminProfitPctOf(settings)
  const adminProfit = +(subtotal * adminProfitPct / 100).toFixed(2)
  const pretax = +(subtotal + adminProfit).toFixed(2)
  const tps = +(pretax * settings.tpsPct / 100).toFixed(2)
  const tvq = +(pretax * settings.tvqPct / 100).toFixed(2)
  const total = +(pretax + tps + tvq).toFixed(2)
  return { subtotal, matTotal, laborTotal, adminProfitPct, adminProfit, pretax, tps, tvq, total }
}

// ─── Persistance des devis (localStorage) ─────────────────────────────────────
export const DRAFT_KEY = 'cp-devis-brouillon'
export const SAVED_KEY = 'cp-devis-enregistres'

export const emptyDraft = () => ({
  createdAt: new Date().toISOString(),
  step: 0,
  unit: 'pi',
  client: { mode: '', clientId: '', name: '', phone: '', address: '' },
  projectType: '',
  notes: '',
  rooms: [],
  items: [],
  settings: {
    adminProfitPct: DEFAULT_ADMIN_PROFIT_PCT,
    tpsPct: 5, tvqPct: 9.975,
  },
})

export const nextQuoteNumber = (saved) => {
  const year = new Date().getFullYear()
  const count = saved.filter(q => q.number?.includes(String(year))).length
  return `DEV-${year}-${String(count + 1).padStart(3, '0')}`
}
