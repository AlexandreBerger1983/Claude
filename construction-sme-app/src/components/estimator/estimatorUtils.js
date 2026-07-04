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

export const lineTotal = (item) => {
  const q = parseFloat(item.qty) || 0
  const mat = parseFloat(item.unitMat) || 0
  const lab = parseFloat(item.unitLabor) || 0
  return +(q * (mat + lab)).toFixed(2)
}

// Calcul complet du devis à partir des items et des paramètres
export const computeTotals = (items, settings) => {
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0)
  const matTotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitMat) || 0), 0)
  const laborTotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitLabor) || 0), 0)
  const overhead = +(subtotal * settings.overheadPct / 100).toFixed(2)
  const profit = +((subtotal + overhead) * settings.profitPct / 100).toFixed(2)
  const contingency = +((subtotal + overhead + profit) * settings.contingencyPct / 100).toFixed(2)
  const pretax = +(subtotal + overhead + profit + contingency).toFixed(2)
  const tps = +(pretax * settings.tpsPct / 100).toFixed(2)
  const tvq = +(pretax * settings.tvqPct / 100).toFixed(2)
  const total = +(pretax + tps + tvq).toFixed(2)
  return { subtotal, matTotal, laborTotal, overhead, profit, contingency, pretax, tps, tvq, total }
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
    overheadPct: 12, profitPct: 15, contingencyPct: 5,
    tpsPct: 5, tvqPct: 9.975,
  },
})

export const nextQuoteNumber = (saved) => {
  const year = new Date().getFullYear()
  const count = saved.filter(q => q.number?.includes(String(year))).length
  return `DEV-${year}-${String(count + 1).padStart(3, '0')}`
}
