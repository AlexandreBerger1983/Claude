import { useState } from 'react'
import { Plus, Search, Download, Send, CheckCircle, AlertTriangle } from 'lucide-react'
import { invoices } from '../../data/mockData'
import { formatCurrency, formatDate, statusColor, daysUntil } from '../../utils/formatters'
import clsx from 'clsx'

const statuses = ['Tous', 'Envoyée', 'En attente', 'Payée', 'En retard']

export default function Invoices() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')

  const filtered = invoices.filter(inv =>
    (statusFilter === 'Tous' || inv.status === statusFilter) &&
    (inv.number.toLowerCase().includes(search.toLowerCase()) || inv.client.toLowerCase().includes(search.toLowerCase()))
  )

  const totalPayee = invoices.filter(i => i.status === 'Payée').reduce((s, i) => s + i.total, 0)
  const totalAttente = invoices.filter(i => i.status !== 'Payée').reduce((s, i) => s + i.total, 0)
  const totalRetard = invoices.filter(i => i.status === 'En retard').reduce((s, i) => s + i.total, 0)

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Facturation</h2>
          <p className="text-sm text-slate-500 mt-0.5">Suivi des factures et des encaissements</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Nouvelle facture</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Reçu (période)</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPayee, true)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.filter(i => i.status === 'Payée').length} facture(s)</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">À recevoir</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalAttente, true)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.filter(i => i.status !== 'Payée').length} facture(s)</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">En retard</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRetard, true)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.filter(i => i.status === 'En retard').length} facture(s) — action requise</p>
        </div>
      </div>

      {/* Alert for overdue */}
      {totalRetard > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            <strong>{formatCurrency(totalRetard)}</strong> en souffrance — relancez immédiatement les clients concernés.
          </p>
        </div>
      )}

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

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Facture</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Projet</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Échéance</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total TTC</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(inv => {
              const days = daysUntil(inv.dueDate)
              const isLate = inv.status === 'En retard'
              return (
                <tr key={inv.id} className={clsx('table-row-hover', isLate && 'bg-red-50/30')}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{inv.number}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Émise {formatDate(inv.date)}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 max-w-[140px]">
                    <p className="truncate">{inv.client}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{inv.project}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{inv.type}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-slate-600">{formatDate(inv.dueDate)}</p>
                    {inv.status !== 'Payée' && (
                      <p className={clsx('text-xs font-medium', isLate ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-slate-400')}>
                        {isLate ? `${Math.abs(days)} j. de retard` : days === 0 ? "Aujourd'hui" : `Dans ${days} j.`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="font-bold text-slate-800">{formatCurrency(inv.total)}</p>
                    {inv.status === 'Payée' && <p className="text-xs text-emerald-600">Payée</p>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={clsx('badge', statusColor[inv.status])}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      <button className="btn-ghost py-1 px-2 text-xs"><Download size={12} /></button>
                      {inv.status !== 'Payée' && (
                        <button className="btn-ghost py-1 px-2 text-xs"><Send size={12} /></button>
                      )}
                      {inv.status === 'En attente' || inv.status === 'En retard' ? (
                        <button className="btn-ghost py-1 px-2 text-xs text-emerald-600"><CheckCircle size={12} /></button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
