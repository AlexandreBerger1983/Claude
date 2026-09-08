import { useState } from 'react'
import { Plus, Search, FileText, Send, CheckCircle, XCircle, Clock, Eye, Trash2 } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters'
import QuoteDetail from './QuoteDetail'
import clsx from 'clsx'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'

const StatusIcon = ({ s }) => {
  if (s === 'Acceptée') return <CheckCircle size={14} className="text-emerald-500" />
  if (s === 'Refusée') return <XCircle size={14} className="text-red-500" />
  if (s === 'Envoyée') return <Send size={14} className="text-blue-500" />
  if (s === 'En attente') return <Clock size={14} className="text-amber-500" />
  return <FileText size={14} className="text-slate-400" />
}

function QuoteList() {
  const { data, remove } = useData()
  const navigate = useNavigate()
  const quotes = data.quotes
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')

  const handleDelete = (q) => {
    const msg = q.status === 'Acceptée'
      ? `Supprimer la soumission « ${q.number} » ?\n\nAttention : cette soumission a été ACCEPTÉE par le client.\n\nCette action est définitive.`
      : `Supprimer la soumission « ${q.number} — ${q.title} » ? Cette action est définitive.`
    if (window.confirm(msg)) remove('quotes', q.id)
  }

  const statuses = ['Tous', 'Brouillon', 'Envoyée', 'En attente', 'Acceptée', 'Refusée']
  const filtered = quotes.filter(q =>
    (statusFilter === 'Tous' || q.status === statusFilter) &&
    (q.title.toLowerCase().includes(search.toLowerCase()) || q.client.toLowerCase().includes(search.toLowerCase()) || q.number.toLowerCase().includes(search.toLowerCase()))
  )

  const totalAccepted = quotes.filter(q => q.status === 'Acceptée').reduce((s, q) => s + q.total, 0)
  const totalPending = quotes.filter(q => q.status === 'Envoyée' || q.status === 'En attente').reduce((s, q) => s + q.total, 0)

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Soumissions</h2>
          <p className="text-sm text-slate-500 mt-0.5">Créez et suivez vos soumissions client</p>
        </div>
        <button onClick={() => navigate('/estimateur/nouveau')} className="btn-primary"><Plus size={16} /> Nouvelle soumission</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAccepted, true)}</p>
          <p className="text-xs text-slate-500 mt-1">Soumissions acceptées</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending, true)}</p>
          <p className="text-xs text-slate-500 mt-1">En cours d'évaluation</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-brand-600">
            {Math.round(quotes.filter(q => q.status === 'Acceptée').length / quotes.filter(q => q.status !== 'Brouillon').length * 100)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Taux de conversion</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input pl-8" />
        </div>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', statusFilter === s ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {s}
          </button>
        ))}
      </div>

      {/* Table — huit colonnes ne tiennent pas sur un téléphone. Sans
          défilement horizontal, la colonne d'actions était simplement rognée
          et le bouton de suppression devenait inatteignable. */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[52rem]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">No / Titre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estimateur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valide jusqu'au</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total TTC</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(q => (
              // Toute la ligne ouvre la soumission : cliquer sur la ligne est le
              // geste attendu, alors que le lien « Voir » seul passe inaperçu.
              <tr
                key={q.id}
                onClick={() => navigate(`/soumissions/${q.id}`)}
                className="table-row-hover cursor-pointer"
              >
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-800">{q.number}</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">{q.title}</p>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{q.client}</td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{q.estimator}</td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{formatDate(q.date)}</td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{formatDate(q.validUntil)}</td>
                <td className="px-4 py-3.5 text-right font-bold text-slate-800">{formatCurrency(q.total)}</td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <StatusIcon s={q.status} />
                    <span className={clsx('badge', statusColor[q.status])}>{q.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Link to={`/soumissions/${q.id}`} className="btn-ghost py-1 px-2 text-xs">
                      <Eye size={13} /> Voir
                    </Link>
                    <button
                      onClick={() => handleDelete(q)}
                      className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                      aria-label={`Supprimer ${q.number}`}
                      title="Supprimer cette soumission"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Quotes() {
  return (
    <Routes>
      <Route index element={<QuoteList />} />
      <Route path=":id" element={<QuoteDetail />} />
    </Routes>
  )
}
