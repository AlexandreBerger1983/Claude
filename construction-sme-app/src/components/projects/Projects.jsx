import { useState } from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import { Plus, Search, Filter, ChevronDown } from 'lucide-react'
import { projects } from '../../data/mockData'
import { formatCurrency, formatDate, statusColor, progressColor } from '../../utils/formatters'
import ProjectDetail from './ProjectDetail'
import clsx from 'clsx'

const types = ['Tous', 'Commercial', 'Résidentiel', 'Municipal', 'Institutionnel', 'Industriel']
const statuses = ['Tous', 'En cours', 'Planification', 'Soumission acceptée', 'Terminé']

function ProjectList() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('Tous')
  const [status, setStatus] = useState('Tous')
  const [view, setView] = useState('table')

  const filtered = projects.filter(p =>
    (type === 'Tous' || p.type === type) &&
    (status === 'Tous' || p.status === status) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">{filtered.length} projet{filtered.length !== 1 ? 's' : ''}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gérez tous vos chantiers en un seul endroit</p>
        </div>
        <button className="btn-primary">
          <Plus size={16} /> Nouveau projet
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input pl-8" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setType(t)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', type === t ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {t}
            </button>
          ))}
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input w-auto text-xs">
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Projet</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avancement</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Budget</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fin prévue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => {
              const pct = Math.round((p.budgetSpent / p.budgetTotal) * 100)
              return (
                <tr key={p.id} className="table-row-hover">
                  <td className="px-5 py-3.5">
                    <Link to={`/projets/${p.id}`} className="group">
                      <p className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.code} · {p.manager}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-sm">{p.client}</td>
                  <td className="px-4 py-3.5">
                    <span className="badge bg-slate-100 text-slate-600">{p.type}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={clsx('badge', statusColor[p.status])}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 w-28">
                      <div className="flex-1 progress-bar">
                        <div className={clsx('progress-fill', progressColor(p.progress))} style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-600 w-8">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="font-semibold text-slate-800">{formatCurrency(p.budgetTotal, true)}</p>
                    <p className={clsx('text-xs', pct > 90 ? 'text-red-500' : pct > 75 ? 'text-amber-500' : 'text-slate-400')}>
                      {pct}% engagé
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{formatDate(p.endDate)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Aucun projet trouvé</div>
        )}
      </div>
    </div>
  )
}

export default function Projects() {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route path=":id" element={<ProjectDetail />} />
    </Routes>
  )
}
