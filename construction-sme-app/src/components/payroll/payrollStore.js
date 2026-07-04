import { LICENSE_SEED } from '../../data/payrollCatalog'
import { generateWeekDates, emptyWeekInput } from './payrollEngine'

export const PAYROLL_KEY = 'cp-paie-donnees'
export const PAYROLL_IMPORT_FLAG = 'cp-paie-import-fait'

// Version 2 du magasin de paie : la liste des employés vient du module
// Employés (magasin central de l'application). La paie ne conserve que :
// - config[employeId] = { opening: {L,R,X} } — banque reportée de l'année préc.
// - years[année] = { weekDates, entries: { employeId: [52 semaines] } }
// - licenses = suivi des certificats de compétence

export const emptyPayroll = () => ({
  version: 2,
  config: {},
  licenses: LICENSE_SEED,
  years: {},
})

// Migre l'ancien format (v1, roster interne à la paie) vers la v2 en
// faisant correspondre les employés par nom avec le magasin central.
// Les heures déjà saisies sont conservées si le nom correspond.
export const migratePayroll = (raw, storeEmployees) => {
  if (!raw) return emptyPayroll()
  if (raw.version === 2) return raw

  const byName = {}
  for (const e of storeEmployees) byName[e.name.trim().toLowerCase()] = e.id

  const map = {}
  for (const old of raw.employees ?? []) {
    const nid = byName[(old.name || '').trim().toLowerCase()]
    if (nid !== undefined) map[old.id] = nid
  }

  const config = {}
  for (const old of raw.employees ?? []) {
    const nid = map[old.id]
    if (nid !== undefined) config[nid] = { opening: old.opening ?? { L: 0, R: 0, X: 0 } }
  }

  const years = {}
  for (const [y, yd] of Object.entries(raw.years ?? {})) {
    const entries = {}
    for (const [oldId, arr] of Object.entries(yd.entries ?? {})) {
      const nid = map[oldId]
      if (nid !== undefined) entries[nid] = arr
    }
    years[y] = { weekDates: yd.weekDates, entries }
  }

  return { version: 2, config, licenses: raw.licenses ?? LICENSE_SEED, years }
}

// Garantit que l'année existe et que chaque employé actif a ses 52 semaines.
export const ensureYear = (p, year, employees) => {
  const existing = p.years[year]
  const weekDates = existing?.weekDates ?? generateWeekDates(year)
  const entries = { ...(existing?.entries ?? {}) }
  let changed = !existing
  for (const emp of employees) {
    if (!entries[emp.id]) {
      entries[emp.id] = weekDates.map(() => emptyWeekInput(40))
      changed = true
    }
  }
  if (!changed) return p
  return { ...p, years: { ...p.years, [year]: { weekDates, entries } } }
}
