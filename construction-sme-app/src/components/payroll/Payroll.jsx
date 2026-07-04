import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Calendar, Users, ListChecks, BadgeCheck, ChevronLeft, ChevronRight,
  Plus, Trash2, AlertTriangle, Info, Landmark,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocalStorage, readStorage, writeStorage } from '../../hooks/useLocalStorage'
import { useData } from '../../store/DataContext'
import { PAYROLL_KEY, PAYROLL_IMPORT_FLAG, migratePayroll, ensureYear } from './payrollStore'
import { computeYear, yearTotals } from './payrollEngine'
import { PAYROLL_EMPLOYEES_SEED } from '../../data/payrollCatalog'
import { formatDate, formatCurrency } from '../../utils/formatters'
import clsx from 'clsx'

const fmtH = (v) => {
  const n = Number(v) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

// Salaire estimé d'une semaine : heures simples × taux, temps et demi ×1,5,
// temps double ×2 — le lien direct entre les heures et le taux horaire du
// module Employés.
const weekPay = (r, rate) => (r ? ((r.Z || 0) + 1.5 * (r.AA || 0) + 2 * (r.AB || 0)) * (rate || 0) : 0)

const TABS = [
  { id: 'saisie', label: 'Saisie hebdomadaire', icon: Calendar },
  { id: 'resume', label: 'Résumé de la semaine', icon: ListChecks },
  { id: 'fiche', label: 'Fiche annuelle', icon: Users },
  { id: 'banque', label: "Banque d'heures", icon: Landmark },
  { id: 'licences', label: 'Licences', icon: BadgeCheck },
]

// ─── Onglet : Saisie hebdomadaire ─────────────────────────────────────────────
function TabSaisie({ employees, payroll, setPayroll, year, weekIndex, setWeekIndex }) {
  const yearData = payroll.years[year]

  const updateEntry = (empId, field, value) => {
    setPayroll(p => {
      const yd = p.years[year]
      const entries = { ...yd.entries }
      const empEntries = [...(entries[empId] || [])]
      empEntries[weekIndex] = { ...empEntries[weekIndex], [field]: value === '' ? '' : parseFloat(value) || 0 }
      entries[empId] = empEntries
      return { ...p, years: { ...p.years, [year]: { ...yd, entries } } }
    })
  }

  const computeUpTo = (emp) => {
    const empEntries = payroll.years[year].entries[emp.id] || []
    const upTo = empEntries.slice(0, weekIndex + 1).map((w, i) => ({ ...w, date: yearData.weekDates[i] }))
    const opening = payroll.config[emp.id]?.opening ?? { L: 0, R: 0, X: 0 }
    const results = computeYear(upTo, opening)
    return results[results.length - 1]
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de semaine */}
      <div className="card flex items-center gap-3 py-3.5">
        <button
          onClick={() => setWeekIndex(Math.max(0, weekIndex - 1))}
          disabled={weekIndex === 0}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-500"
        >
          <ChevronLeft size={18} />
        </button>
        <select
          value={weekIndex}
          onChange={e => setWeekIndex(Number(e.target.value))}
          className="input flex-1 font-semibold text-center"
        >
          {yearData.weekDates.map((d, i) => (
            <option key={d} value={i}>Semaine {i + 1} — se terminant le {formatDate(d)}</option>
          ))}
        </select>
        <button
          onClick={() => setWeekIndex(Math.min(yearData.weekDates.length - 1, weekIndex + 1))}
          disabled={weekIndex === yearData.weekDates.length - 1}
          className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Entrez les heures <strong>travaillées</strong> par catégorie. Temps supplémentaire, banque d'heures et
          <strong> salaire estimé</strong> (heures × taux horaire du module Employés, ×1,5 et ×2 pour le temps
          supplémentaire) se calculent automatiquement.
        </p>
      </div>

      {/* Table de saisie */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase sticky left-0 bg-slate-50">Employé</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Commercial</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Résid. Lourd</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Résid. Léger</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Non-Réglem.</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Hrs à travailler</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total payé</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Salaire estimé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => {
              const entry = payroll.years[year].entries[emp.id]?.[weekIndex] ?? { D: 0, I: 0, O: 0, U: 0, AD: 40 }
              const result = computeUpTo(emp)
              const totalPaye = (result?.Z ?? 0) + (result?.AA ?? 0) + (result?.AB ?? 0)
              const pay = weekPay(result, emp.hourlyRate)
              return (
                <tr key={emp.id} className="table-row-hover">
                  <td className="px-4 py-2.5 sticky left-0 bg-white whitespace-nowrap">
                    <p className="font-medium text-slate-700">{emp.name}</p>
                    <p className="text-[10px] text-slate-400">{formatCurrency(emp.hourlyRate)} /h</p>
                  </td>
                  {['D', 'I', 'O', 'U'].map(field => (
                    <td key={field} className="px-2 py-2">
                      <input
                        type="number" min="0" step="0.5" inputMode="decimal"
                        value={entry[field]}
                        onChange={e => updateEntry(emp.id, field, e.target.value)}
                        onFocus={e => e.target.select()}
                        className="input py-1.5 text-center text-sm w-20 mx-auto"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <input
                      type="number" min="0" step="0.5" inputMode="decimal"
                      value={entry.AD}
                      onChange={e => updateEntry(emp.id, 'AD', e.target.value)}
                      onFocus={e => e.target.select()}
                      className="input py-1.5 text-center text-sm w-20 mx-auto"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-800">{fmtH(totalPaye)} h</td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                    {emp.hourlyRate > 0 ? formatCurrency(pay) : <span className="text-slate-300 font-normal text-xs">taux à définir</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Le taux horaire de chaque employé se modifie dans le module <Link to="/employes" className="text-brand-500 underline">Employés</Link>.
      </p>
    </div>
  )
}

// ─── Onglet : Résumé de la semaine ────────────────────────────────────────────
function TabResume({ employees, payroll, year, weekIndex }) {
  const yearData = payroll.years[year]

  const rows = employees.map(emp => {
    const empEntries = yearData.entries[emp.id] || []
    const upTo = empEntries.slice(0, weekIndex + 1).map((w, i) => ({ ...w, date: yearData.weekDates[i] }))
    const opening = payroll.config[emp.id]?.opening ?? { L: 0, R: 0, X: 0 }
    const results = computeYear(upTo, opening)
    const r = results[results.length - 1]
    const total = (r?.E ?? 0) + (r?.F ?? 0) + (r?.G ?? 0) + (r?.M ?? 0) + (r?.S ?? 0) + (r?.Y ?? 0)
    return {
      name: emp.name,
      rate: emp.hourlyRate,
      commSimple: r?.E ?? 0,
      commDemi: r?.F ?? 0,
      commDouble: r?.G ?? 0,
      lourd: r?.M ?? 0,
      leger: r?.S ?? 0,
      nonReglem: r?.Y ?? 0,
      total,
      pay: weekPay(r, emp.hourlyRate),
    }
  })

  const grand = rows.reduce((acc, r) => ({
    commSimple: acc.commSimple + r.commSimple,
    commDemi: acc.commDemi + r.commDemi,
    commDouble: acc.commDouble + r.commDouble,
    lourd: acc.lourd + r.lourd,
    leger: acc.leger + r.leger,
    nonReglem: acc.nonReglem + r.nonReglem,
    total: acc.total + r.total,
    pay: acc.pay + r.pay,
  }), { commSimple: 0, commDemi: 0, commDouble: 0, lourd: 0, leger: 0, nonReglem: 0, total: 0, pay: 0 })

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Semaine finissant le</p>
          <p className="text-lg font-bold text-slate-800">{formatDate(yearData.weekDates[weekIndex])}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Masse salariale de la semaine</p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrency(grand.pay)}</p>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employé</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Comm. simple</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Comm. demi</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Comm. double</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Résid. Lourd</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Résid. Léger</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Non-Règlem</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total hrs</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Salaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.name} className="table-row-hover">
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <p className="font-medium text-slate-700">{r.name}</p>
                  <p className="text-[10px] text-slate-400">{formatCurrency(r.rate)} /h</p>
                </td>
                <td className="px-3 py-2.5 text-right">{fmtH(r.commSimple)}</td>
                <td className="px-3 py-2.5 text-right">{fmtH(r.commDemi)}</td>
                <td className="px-3 py-2.5 text-right">{fmtH(r.commDouble)}</td>
                <td className="px-3 py-2.5 text-right">{fmtH(r.lourd)}</td>
                <td className="px-3 py-2.5 text-right">{fmtH(r.leger)}</td>
                <td className="px-3 py-2.5 text-right">{fmtH(r.nonReglem)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-800">{fmtH(r.total)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{r.rate > 0 ? formatCurrency(r.pay) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td className="px-4 py-3 text-slate-700">Total</td>
              <td className="px-3 py-3 text-right">{fmtH(grand.commSimple)}</td>
              <td className="px-3 py-3 text-right">{fmtH(grand.commDemi)}</td>
              <td className="px-3 py-3 text-right">{fmtH(grand.commDouble)}</td>
              <td className="px-3 py-3 text-right">{fmtH(grand.lourd)}</td>
              <td className="px-3 py-3 text-right">{fmtH(grand.leger)}</td>
              <td className="px-3 py-3 text-right">{fmtH(grand.nonReglem)}</td>
              <td className="px-4 py-3 text-right text-brand-600">{fmtH(grand.total)}</td>
              <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(grand.pay)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Onglet : Fiche annuelle ──────────────────────────────────────────────────
function TabFiche({ employees, payroll, year }) {
  const [empId, setEmpId] = useState(employees[0]?.id)
  const yearData = payroll.years[year]
  const emp = employees.find(e => e.id === empId) ?? employees[0]

  const weekly = useMemo(() => {
    if (!emp) return []
    const empEntries = yearData.entries[emp.id] || []
    const inputs = empEntries.map((w, i) => ({ ...w, date: yearData.weekDates[i] }))
    const opening = payroll.config[emp.id]?.opening ?? { L: 0, R: 0, X: 0 }
    return computeYear(inputs, opening)
  }, [emp, yearData, payroll.config])

  const totals = useMemo(() => yearTotals(weekly), [weekly])
  const annualPay = weekly.reduce((s, w) => s + weekPay(w, emp?.hourlyRate), 0)

  if (!emp) return <p className="text-slate-400 text-sm">Aucun employé actif. Ajoutez-en un dans le module Employés.</p>

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3">
        <label className="label mb-0 flex-shrink-0">Employé</label>
        <select value={emp.id} onChange={e => setEmpId(Number(e.target.value))} className="input flex-1">
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Totaux annuels */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card text-center py-3">
          <p className="text-xs text-slate-400 uppercase">Heures travaillées</p>
          <p className="text-xl font-bold text-slate-800">{fmtH(totals.heuresTravaillees)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-slate-400 uppercase">Temps et demi</p>
          <p className="text-xl font-bold text-amber-600">{fmtH(totals.AA)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-slate-400 uppercase">Temps double</p>
          <p className="text-xl font-bold text-red-600">{fmtH(totals.AB)}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-slate-400 uppercase">Banque (L / R / X)</p>
          <p className="text-sm font-bold text-slate-800">
            {fmtH(weekly[weekly.length - 1]?.L)} / {fmtH(weekly[weekly.length - 1]?.R)} / {fmtH(weekly[weekly.length - 1]?.X)}
          </p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-slate-400 uppercase">Salaire annuel estimé</p>
          <p className="text-xl font-bold text-emerald-700">{emp.hourlyRate > 0 ? formatCurrency(annualPay, true) : '—'}</p>
          <p className="text-[10px] text-slate-400">{formatCurrency(emp.hourlyRate)} /h</p>
        </div>
      </div>

      {/* Table annuelle complète */}
      <div className="card p-0 overflow-auto max-h-[600px]">
        <table className="w-full text-xs min-w-[1150px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th rowSpan={2} className="text-left px-3 py-2 font-semibold text-slate-500 uppercase align-bottom sticky left-0 bg-slate-50">Semaine</th>
              <th colSpan={4} className="text-center px-2 py-1.5 font-semibold text-slate-500 uppercase border-l border-slate-200">Commercial</th>
              <th colSpan={5} className="text-center px-2 py-1.5 font-semibold text-slate-500 uppercase border-l border-slate-200">Résid. Lourd Règlem.</th>
              <th colSpan={5} className="text-center px-2 py-1.5 font-semibold text-slate-500 uppercase border-l border-slate-200">Résid. Léger Règlem.</th>
              <th colSpan={5} className="text-center px-2 py-1.5 font-semibold text-slate-500 uppercase border-l border-slate-200">Résid. Non-Règlem.</th>
              <th colSpan={3} className="text-center px-2 py-1.5 font-semibold text-slate-500 uppercase border-l border-slate-200">Total payé</th>
              <th rowSpan={2} className="text-right px-3 py-2 font-semibold text-slate-500 uppercase align-bottom border-l border-slate-200">Salaire</th>
            </tr>
            <tr>
              <th className="px-2 py-1 border-l border-slate-200">Trav.</th>
              <th className="px-2 py-1">T.Simple</th>
              <th className="px-2 py-1">T.Demi</th>
              <th className="px-2 py-1">T.Double</th>
              <th className="px-2 py-1 border-l border-slate-200">Trav.</th>
              <th className="px-2 py-1">Banque+</th>
              <th className="px-2 py-1">Banque−</th>
              <th className="px-2 py-1">Solde</th>
              <th className="px-2 py-1">Payé</th>
              <th className="px-2 py-1 border-l border-slate-200">Trav.</th>
              <th className="px-2 py-1">Banque+</th>
              <th className="px-2 py-1">Banque−</th>
              <th className="px-2 py-1">Solde</th>
              <th className="px-2 py-1">Payé</th>
              <th className="px-2 py-1 border-l border-slate-200">Trav.</th>
              <th className="px-2 py-1">Banque+</th>
              <th className="px-2 py-1">Banque−</th>
              <th className="px-2 py-1">Solde</th>
              <th className="px-2 py-1">Payé</th>
              <th className="px-2 py-1 border-l border-slate-200">Simple</th>
              <th className="px-2 py-1">1.5×</th>
              <th className="px-2 py-1">2×</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {weekly.map((w, i) => (
              <tr key={w.date} className="hover:bg-slate-50/70">
                <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap sticky left-0 bg-white">S{i + 1} · {formatDate(w.date)}</td>
                <td className="px-2 py-1.5 text-center border-l border-slate-100">{fmtH(w.D)}</td>
                <td className="px-2 py-1.5 text-center">{fmtH(w.E)}</td>
                <td className="px-2 py-1.5 text-center">{fmtH(w.F)}</td>
                <td className="px-2 py-1.5 text-center">{fmtH(w.G)}</td>
                <td className="px-2 py-1.5 text-center border-l border-slate-100">{fmtH(w.I)}</td>
                <td className="px-2 py-1.5 text-center text-emerald-600">{fmtH(w.J)}</td>
                <td className="px-2 py-1.5 text-center text-amber-600">{fmtH(w.K)}</td>
                <td className="px-2 py-1.5 text-center font-semibold">{fmtH(w.L)}</td>
                <td className="px-2 py-1.5 text-center">{fmtH(w.M)}</td>
                <td className="px-2 py-1.5 text-center border-l border-slate-100">{fmtH(w.O)}</td>
                <td className="px-2 py-1.5 text-center text-emerald-600">{fmtH(w.P)}</td>
                <td className="px-2 py-1.5 text-center text-amber-600">{fmtH(w.Q)}</td>
                <td className="px-2 py-1.5 text-center font-semibold">{fmtH(w.R)}</td>
                <td className="px-2 py-1.5 text-center">{fmtH(w.S)}</td>
                <td className="px-2 py-1.5 text-center border-l border-slate-100">{fmtH(w.U)}</td>
                <td className="px-2 py-1.5 text-center text-emerald-600">{fmtH(w.V)}</td>
                <td className="px-2 py-1.5 text-center text-amber-600">{fmtH(w.W)}</td>
                <td className="px-2 py-1.5 text-center font-semibold">{fmtH(w.X)}</td>
                <td className="px-2 py-1.5 text-center">{fmtH(w.Y)}</td>
                <td className="px-2 py-1.5 text-center border-l border-slate-100 font-semibold">{fmtH(w.Z)}</td>
                <td className="px-2 py-1.5 text-center">{fmtH(w.AA)}</td>
                <td className="px-2 py-1.5 text-center">{fmtH(w.AB)}</td>
                <td className="px-3 py-1.5 text-right border-l border-slate-100 font-semibold text-emerald-700">
                  {emp.hourlyRate > 0 && weekPay(w, emp.hourlyRate) > 0 ? formatCurrency(weekPay(w, emp.hourlyRate)) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Banque+ = heures mises en banque · Banque− = heures retirées · Solde = cumulatif. Salaire = (hrs simples + 1,5 × hrs demi + 2 × hrs doubles) × taux horaire.
      </p>
    </div>
  )
}

// ─── Onglet : Banque d'heures (solde reporté) ─────────────────────────────────
function TabBanque({ employees, payroll, setPayroll }) {
  const updateOpening = (empId, key, value) =>
    setPayroll(p => ({
      ...p,
      config: {
        ...p.config,
        [empId]: {
          ...(p.config[empId] ?? {}),
          opening: { L: 0, R: 0, X: 0, ...(p.config[empId]?.opening ?? {}), [key]: parseFloat(value) || 0 },
        },
      },
    }))

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Le <strong>solde reporté</strong> correspond aux heures déjà en banque avant la première année saisie ici
          (colonne « Reportées de l'année précédente » de votre ancien fichier Excel). La liste des employés — noms,
          taux horaires, embauches et départs — se gère dans le module{' '}
          <Link to="/employes" className="underline font-semibold">Employés</Link>.
        </p>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employé</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Taux horaire</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Banque Lourd (h)</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Banque Léger (h)</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">Banque Non-Règlem (h)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map(emp => {
              const opening = payroll.config[emp.id]?.opening ?? { L: 0, R: 0, X: 0 }
              return (
                <tr key={emp.id} className="table-row-hover">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{emp.name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(emp.hourlyRate)} /h</td>
                  {['L', 'R', 'X'].map(k => (
                    <td key={k} className="px-3 py-2.5">
                      <input
                        type="number" step="0.5"
                        value={opening[k] ?? 0}
                        onChange={e => updateOpening(emp.id, k, e.target.value)}
                        onFocus={e => e.target.select()}
                        className="input py-1 text-center text-sm w-24 mx-auto"
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Onglet : Licences ────────────────────────────────────────────────────────
function TabLicences({ payroll, setPayroll }) {
  const today = new Date()

  const daysLeft = (dateStr) => {
    if (!dateStr) return 0
    const d = new Date(dateStr + 'T00:00:00')
    return Math.round((d - today) / (1000 * 60 * 60 * 24))
  }

  const update = (id, field, value) =>
    setPayroll(p => ({ ...p, licenses: p.licenses.map(l => l.id === id ? { ...l, [field]: value } : l) }))

  const addLicense = () =>
    setPayroll(p => ({ ...p, licenses: [...p.licenses, { id: Date.now(), name: '', licenseType: 'Certificat de compétence (CCQ)', renewalDate: '' }] }))

  const removeLicense = (id) =>
    setPayroll(p => ({ ...p, licenses: p.licenses.filter(l => l.id !== id) }))

  const sorted = [...payroll.licenses].sort((a, b) => daysLeft(a.renewalDate) - daysLeft(b.renewalDate))
  const expiredCount = sorted.filter(l => daysLeft(l.renewalDate) < 0).length
  const soonCount = sorted.filter(l => { const d = daysLeft(l.renewalDate); return d >= 0 && d <= 90 }).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center py-3">
          <p className="text-xs text-slate-400 uppercase">Licences expirées</p>
          <p className={clsx('text-2xl font-bold', expiredCount ? 'text-red-600' : 'text-emerald-600')}>{expiredCount}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-xs text-slate-400 uppercase">À renouveler (90 j)</p>
          <p className={clsx('text-2xl font-bold', soonCount ? 'text-amber-600' : 'text-emerald-600')}>{soonCount}</p>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nom</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type de licence</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date renouvellement</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Temps restant</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map(l => {
              const d = daysLeft(l.renewalDate)
              const expired = d < 0
              const soon = d >= 0 && d <= 90
              return (
                <tr key={l.id} className={clsx('table-row-hover', expired && 'bg-red-50/40', soon && 'bg-amber-50/40')}>
                  <td className="px-4 py-2.5">
                    <input value={l.name} onChange={e => update(l.id, 'name', e.target.value)}
                      className="font-medium text-slate-700 bg-transparent border-0 outline-none w-full hover:bg-slate-100 rounded px-1 py-0.5 -ml-1" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input value={l.licenseType} onChange={e => update(l.id, 'licenseType', e.target.value)}
                      className="text-slate-600 bg-transparent border-0 outline-none w-full hover:bg-slate-100 rounded px-1 py-0.5 -ml-1 text-sm" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="date" value={l.renewalDate} onChange={e => update(l.id, 'renewalDate', e.target.value)}
                      className="input py-1 text-sm w-40" />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={clsx('badge', expired ? 'bg-red-100 text-red-700' : soon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                      {expired ? <><AlertTriangle size={11} className="mr-1" /> Expirée ({Math.abs(d)} j)</> : `${d} j`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => removeLicense(l.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="p-3">
          <button onClick={addLicense} className="btn-ghost text-xs"><Plus size={14} /> Ajouter une licence</button>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function Payroll() {
  const { data, bulkAdd } = useData()
  const [raw, setRaw] = useLocalStorage(PAYROLL_KEY, null)
  const [tab, setTab] = useState('saisie')
  const [year, setYear] = useState(new Date().getFullYear())
  const [weekIndex, setWeekIndex] = useState(0)
  const didImport = useRef(false)

  // Import unique : les employés du classeur Excel fourni deviennent des
  // employés du module Employés (source unique pour toute l'application).
  useEffect(() => {
    if (didImport.current || readStorage(PAYROLL_IMPORT_FLAG, false)) return
    didImport.current = true
    const missing = PAYROLL_EMPLOYEES_SEED.filter(se =>
      !data.employees.some(e => e.name.trim().toLowerCase() === se.name.trim().toLowerCase())
    )
    if (missing.length > 0) {
      bulkAdd('employees', missing.map(m => ({
        name: m.name,
        role: 'Employé de chantier',
        email: '', phone: '',
        hourlyRate: 0,
        status: 'Actif',
        startDate: '',
        hrsThisWeek: 0, hrsThisMonth: 0,
        certifications: [],
        avatar: m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      })))
    }
    writeStorage(PAYROLL_IMPORT_FLAG, true)
  }, [data.employees, bulkAdd])

  const employees = useMemo(
    () => data.employees.filter(e => e.status === 'Actif'),
    [data.employees]
  )

  const payroll = useMemo(() => {
    let p = migratePayroll(raw, data.employees)
    p = ensureYear(p, year, employees)
    return p
  }, [raw, data.employees, employees, year])

  const setPayroll = (updater) => {
    setRaw(prev => {
      let base = migratePayroll(prev, data.employees)
      base = ensureYear(base, year, employees)
      return typeof updater === 'function' ? updater(base) : updater
    })
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h2 className="section-title">Paie & Heures (CCQ)</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {employees.length} employés actifs (module Employés) · heures travaillées, payées et en banque
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Année</label>
          <input
            type="number" value={year}
            onChange={e => { setYear(parseInt(e.target.value) || year); setWeekIndex(0) }}
            className="input w-24 text-center font-semibold"
          />
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
              tab === t.id ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            )}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'saisie' && <TabSaisie employees={employees} payroll={payroll} setPayroll={setPayroll} year={year} weekIndex={weekIndex} setWeekIndex={setWeekIndex} />}
      {tab === 'resume' && <TabResume employees={employees} payroll={payroll} year={year} weekIndex={weekIndex} />}
      {tab === 'fiche' && <TabFiche employees={employees} payroll={payroll} year={year} />}
      {tab === 'banque' && <TabBanque employees={employees} payroll={payroll} setPayroll={setPayroll} />}
      {tab === 'licences' && <TabLicences payroll={payroll} setPayroll={setPayroll} />}
    </div>
  )
}
