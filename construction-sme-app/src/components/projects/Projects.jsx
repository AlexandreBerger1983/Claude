import { useState } from 'react'
import { Link, Routes, Route, useSearchParams } from 'react-router-dom'
import { Plus, Search, X, Trash2 } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatCurrency, formatDate, statusColor, progressColor } from '../../utils/formatters'
import ProjectDetail from './ProjectDetail'
import FormModal from '../ui/FormModal'
import clsx from 'clsx'

const types = ['Tous', 'Commercial', 'Résidentiel', 'Municipal', 'Institutionnel', 'Industriel']
const statuses = ['Tous', 'En cours', 'Planification', 'Soumission acceptée', 'Terminé', 'En pause']

function ProjectList() {
  const { data, add, remove } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const clientFilter = searchParams.get('client') || ''

  const [search, setSearch] = useState('')
  const [type, setType] = useState('Tous')
  const [status, setStatus] = useState('Tous')
  const [showNew, setShowNew] = useState(false)

  const projects = data.projects
  const filtered = projects.filter(p =>
    (!clientFilter || p.client === clientFilter) &&
    (type === 'Tous' || p.type === type) &&
    (status === 'Tous' || p.status === status) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  )

  const projectFields = [
    { name: 'name', label: 'Nom du projet', required: true, colSpan: 2, placeholder: 'ex: Rénovation cuisine — Résidence Tremblay' },
    { name: 'client', label: 'Client', type: 'select', required: true, options: ['', ...data.clients.map(c => c.name)] },
    { name: 'type', label: 'Type', type: 'select', options: ['Commercial', 'Résidentiel', 'Municipal', 'Institutionnel', 'Industriel'], default: 'Résidentiel' },
    { name: 'manager', label: 'Responsable', type: 'select', options: ['', ...data.employees.filter(e => e.status === 'Actif').map(e => e.name)] },
    { name: 'status', label: 'Statut', type: 'select', options: ['Planification', 'En cours', 'Soumission acceptée', 'En pause', 'Terminé'], default: 'Planification' },
    { name: 'startDate', label: 'Date de début', type: 'date' },
    { name: 'endDate', label: 'Fin prévue', type: 'date' },
    { name: 'budgetTotal', label: 'Budget total ($)', type: 'number', step: '1000', default: 0 },
    { name: 'address', label: 'Adresse du chantier', colSpan: 2, placeholder: 'ex: 456 rue des Pins, Laval, QC' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description des travaux…' },
  ]

  const handleDelete = (p) => {
    const nInvoices = data.invoices.filter(i => i.projectId === p.id || i.project === p.code).length
    const nHours = data.timesheets.filter(t => t.projectId === p.id || t.project === p.code).length
    const linked = [
      nInvoices > 0 && `${nInvoices} facture(s)`,
      nHours > 0 && `${nHours} entrée(s) d'heures`,
    ].filter(Boolean)
    const msg = linked.length > 0
      ? `Supprimer le projet « ${p.name} » (${p.code}) ?\n\nAttention : ce projet a ${linked.join(' et ')}. Ces documents resteront dans l'historique.\n\nCette action est définitive.`
      : `Supprimer le projet « ${p.name} » (${p.code}) ? Cette action est définitive.`
    if (window.confirm(msg)) remove('projects', p.id)
  }

  const handleCreate = (values) => {
    const year = new Date().getFullYear()
    const count = projects.filter(p => p.code?.includes(String(year))).length
    const clientObj = data.clients.find(c => c.name === values.client)
    add('projects', {
      ...values,
      code: `PRJ-${year}-${String(count + 1).padStart(3, '0')}`,
      clientId: clientObj?.id ?? null,
      budgetSpent: 0,
      progress: 0,
      phases: [],
      tasks: [],
    })
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">{filtered.length} projet{filtered.length !== 1 ? 's' : ''}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gérez tous vos chantiers en un seul endroit</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> Nouveau projet
        </button>
      </div>

      {/* Filtre client actif (venant de la page Clients) */}
      {clientFilter && (
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5 text-sm text-brand-700">
          <span>Projets du client : <strong>{clientFilter}</strong></span>
          <button onClick={() => setSearchParams({})} className="ml-auto p-1 rounded hover:bg-brand-100">
            <X size={14} />
          </button>
        </div>
      )}

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
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Projet</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avancement</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Budget</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fin prévue</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => {
              const pct = p.budgetTotal ? Math.round((p.budgetSpent / p.budgetTotal) * 100) : 0
              return (
                <tr key={p.id} className="table-row-hover">
                  <td className="px-5 py-3.5">
                    <Link to={`/projets/${p.id}`} className="group">
                      <p className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.code}{p.manager ? ` · ${p.manager}` : ''}</p>
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
                  <td className="px-3 py-3.5">
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                      aria-label={`Supprimer ${p.name}`}
                      title="Supprimer ce projet"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Aucun projet trouvé</div>
        )}
      </div>

      {showNew && (
        <FormModal
          title="Nouveau projet"
          fields={projectFields}
          onSubmit={handleCreate}
          onClose={() => setShowNew(false)}
          submitLabel="Créer le projet"
        />
      )}
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
