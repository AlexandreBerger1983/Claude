import { useState } from 'react'
import { Plus, Search, Phone, Mail, Award, Clock } from 'lucide-react'
import { employees } from '../../data/mockData'
import { formatCurrency, statusColor } from '../../utils/formatters'
import clsx from 'clsx'

export default function Employees() {
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('Tous')

  const filtered = employees.filter(e =>
    (statusF === 'Tous' || e.status === statusF) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()))
  )

  const totalHoursMonth = employees.reduce((s, e) => s + e.hrsThisMonth, 0)
  const totalPayroll = employees.reduce((s, e) => s + e.hrsThisMonth * e.hourlyRate, 0)

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Équipe</h2>
          <p className="text-sm text-slate-500 mt-0.5">{employees.filter(e => e.status === 'Actif').length} employés actifs · {totalHoursMonth}h ce mois · ~{formatCurrency(totalPayroll, true)} masse salariale</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Ajouter employé</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Heures ce mois</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalHoursMonth}h</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Masse salariale estimée</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalPayroll, true)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Taux horaire moyen</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(Math.round(employees.reduce((s, e) => s + e.hourlyRate, 0) / employees.length))} /h</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input pl-8" />
        </div>
        {['Tous', 'Actif', 'Congé', 'Inactif'].map(s => (
          <button key={s} onClick={() => setStatusF(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', statusF === s ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Employé</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Rôle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Taux /h</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Hrs semaine</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Hrs mois</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Certifications</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(e => (
              <tr key={e.id} className="table-row-hover">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                      {e.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{e.name}</p>
                      <p className="text-xs text-slate-400">Depuis {e.startDate.slice(0, 4)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{e.role}</td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1"><Mail size={11} />{e.email}</div>
                    <div className="flex items-center gap-1"><Phone size={11} />{e.phone}</div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{formatCurrency(e.hourlyRate)}</td>
                <td className="px-4 py-3.5 text-right">
                  <span className={clsx('font-semibold', e.hrsThisWeek > 40 ? 'text-amber-600' : 'text-slate-700')}>{e.hrsThisWeek}h</span>
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{e.hrsThisMonth}h</td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {e.certifications.map(c => (
                      <span key={c} className="badge bg-blue-50 text-blue-600 text-[10px] flex items-center gap-1">
                        <Award size={9} /> {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={clsx('badge', statusColor[e.status])}>{e.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
