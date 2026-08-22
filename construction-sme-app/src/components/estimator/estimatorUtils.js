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
