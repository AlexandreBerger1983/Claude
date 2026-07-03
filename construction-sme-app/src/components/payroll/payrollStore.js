import { PAYROLL_EMPLOYEES_SEED, LICENSE_SEED } from '../../data/payrollCatalog'
import { generateWeekDates, emptyWeekInput } from './payrollEngine'

export const PAYROLL_KEY = 'cp-paie-donnees'

export const defaultPayrollData = () => ({
  employees: PAYROLL_EMPLOYEES_SEED,
  licenses: LICENSE_SEED,
  years: {},
})

// S'assure que l'année demandée existe dans le magasin de données (dates de
// semaine + entrées vides pour chaque employé actif), sans écraser les
// données déjà saisies.
export const ensureYear = (data, year) => {
  if (data.years[year]) return data
  const weekDates = generateWeekDates(year)
  const entries = {}
  for (const emp of data.employees) {
    entries[emp.id] = weekDates.map(() => emptyWeekInput(40))
  }
  return {
    ...data,
    years: { ...data.years, [year]: { weekDates, entries } },
  }
}

// S'assure que chaque employé actif a bien un tableau d'entrées pour
// l'année donnée (utile après l'ajout d'un nouvel employé).
export const ensureEmployeeEntries = (data, year) => {
  const yearData = data.years[year]
  if (!yearData) return data
  const entries = { ...yearData.entries }
  let changed = false
  for (const emp of data.employees) {
    if (!entries[emp.id]) {
      entries[emp.id] = yearData.weekDates.map(() => emptyWeekInput(40))
      changed = true
    }
  }
  if (!changed) return data
  return { ...data, years: { ...data.years, [year]: { ...yearData, entries } } }
}
