import { useState } from 'react'
import { Plus, CheckCircle, Clock, Search, Download } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatDate, formatCurrency } from '../../utils/formatters'
import { downloadCsv } from '../../utils/csv'
import FormModal from '../ui/FormModal'
import clsx from 'clsx'

export default function Timesheets() {
  const { data, add, update } = useData()
  const [search, setSearch] = useState('')
  const [empFilter, setEmpFilter] = useState('Tous')
  const [approvedFilter, setApprovedFilter] = useState('Tous')
  const [showNew, setShowNew] = useState(false)

  const timesheets = data.timesheets
  const employees = data.employees

  const filtered = timesheets.filter(t =>
    (empFilter === 'Tous' || t.employee === empFilter) &&
    (approvedFilter === 'Tous' || (approvedFilter === 'Approuvées' ? t.approved : !t.approved)) &&
    (t.employee.toLowerCase().includes(search.toLowerCase()) || t.project.toLowerCase().includes(search.toLowerCase()))
  )

  const totalHours = filtered.reduce((s, t) => s + t.hours, 0)
  const pending = timesheets.filter(t => !t.approved).length
  const employeeNames = ['Tous', ...new Set(timesheets.map(t => t.employee))]

  const byEmployee = employees.map(e => ({
    ...e,
    totalHours: timesheets.filter(t => t.employeeId === e.id).reduce((s, t) => s + t.hours, 0),
  }))

  const entryFields = [
    { name: 'employee', label: 'Employé', type: 'select', required: true, options: ['', ...employees.filter(e => e.status === 'Actif').map(e => e.name)] },
    { name: 'project', label: 'Projet', type: 'select', required: true, options: ['', ...data.projects.map(p => p.code)] },
    { name: 'date', label: 'Date', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    { name: 'hours', label: 'Heures', type: 'number', required: true, step: '0.5', default: 8 },
    { name: 'type', label: 'Type', type: 'select', options: ['Régulier', 'Heures supp.'], default: 'Régulier' },
    { name: 'description', label: 'Description du travail', type: 'textarea', placeholder: 'ex: Pose de gypse au 2e étage' },
  ]

  const handleCreate = (values) => {
    const emp = employees.find(e => e.name === values.employee)
    const proj = data.projects.find(p => p.code === values.project)
    add('timesheets', {
      ...values,
      employeeId: emp?.id ?? null,
      projectId: proj?.id ?? null,
      approved: false,
    })
  }

  const approve = (t) => update('timesheets', t.id, { approved: true })
  const approveAll = () => {
    for (const t of timesheets.filter(t => !t.approved)) update('timesheets', t.id, { approved: true })
  }

  const exportCsv = () => {
    downloadCsv(
      `feuilles-de-temps-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Employé', 'Projet', 'Description', 'Type', 'Heures', 'Taux', 'Coût', 'Statut'],
      filtered.map(t => {
        const emp = employees.find(e => e.id === t.employeeId)
        return [
          t.date, t.employee, t.project, t.description, t.type,
          String(t.hours).replace('.', ','),
          emp ? String(emp.hourlyRate).replace('.', ',') : '',
          emp ? String((t.hours * emp.hourlyRate).toFixed(2)).replace('.', ',') : '',
          t.approved ? 'Approuvé' : 'En attente',
        ]
      })
    )
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Feuilles de temps</h2>
          <p className="text-sm text-slate-500 mt-0.5">{pending} entrée(s) en attente d'approbation</p>
        </div>
        <div className="flex gap-2">
          {pending > 0 && (
            <button onClick={approveAll} className="btn-secondary text-emerald-600"><CheckCircle size={15} /> Tout approuver</button>
          )}
          <button onClick={exportCsv} className="btn-secondary"><Download size={15} /> Exporter CSV</button>
          <button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={16} /> Nouvelle entrée</button>
        </div>
      </div>

      {/* Summary by employee */}
      <div className="card">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Récapitulatif hebdomadaire</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byEmployee.filter(e => e.totalHours > 0).map(e => (
            <div key={e.id} className="p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                  {e.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{e.name}</p>
                  <p className="text-xs text-slate-400">{e.role}</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className={clsx('text-lg font-bold', e.totalHours > 40 ? 'text-amber-600' : 'text-slate-800')}>{e.totalHours}h</span>
                <span className="text-xs text-emerald-600 font-medium">{formatCurrency(e.totalHours * e.hourlyRate, true)}</span>
              </div>
              {e.totalHours > 40 && <p className="text-[10px] text-amber-600 mt-0.5">+{e.totalHours - 40}h supp.</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input pl-8" />
        </div>
        <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} className="input w-auto text-xs">
          {employeeNames.map(n => <option key={n}>{n}</option>)}
        </select>
        {['Tous', 'Approuvées', 'En attente'].map(s => (
          <button key={s} onClick={() => setApprovedFilter(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', approvedFilter === s ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {s}
          </button>
        ))}
        <div className="ml-auto text-sm font-medium text-slate-700">
          Total: <span className="font-bold">{totalHours}h</span>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employé</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Projet</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Heures</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(t => {
              const emp = employees.find(e => e.id === t.employeeId)
              return (
                <tr key={t.id} className={clsx('table-row-hover', !t.approved && 'bg-amber-50/20')}>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{formatDate(t.date)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {emp?.avatar ?? '—'}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{t.employee}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{t.project}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[200px] truncate">{t.description}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={clsx('badge text-xs', t.type === 'Heures supp.' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                    {t.hours}h
                    {emp && <p className="text-xs font-normal text-slate-400">{formatCurrency(t.hours * emp.hourlyRate)}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {t.approved
                        ? <><CheckCircle size={13} className="text-emerald-500" /><span className="badge bg-emerald-100 text-emerald-700 text-xs">Approuvé</span></>
                        : <><Clock size={13} className="text-amber-500" /><span className="badge bg-amber-100 text-amber-700 text-xs">En attente</span></>
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {!t.approved && (
                      <button onClick={() => approve(t)} className="btn-ghost text-xs text-emerald-600 py-1 px-2">Approuver</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Aucune entrée trouvée</div>
        )}
      </div>

      {showNew && (
        <FormModal
          title="Nouvelle entrée de temps"
          fields={entryFields}
          onSubmit={handleCreate}
          onClose={() => setShowNew(false)}
          submitLabel="Ajouter"
        />
      )}
    </div>
  )
}
