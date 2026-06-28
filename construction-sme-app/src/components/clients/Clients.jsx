import { useState } from 'react'
import { Plus, Search, Phone, Mail, Building2, TrendingUp } from 'lucide-react'
import { clients } from '../../data/mockData'
import { formatCurrency, statusColor } from '../../utils/formatters'
import clsx from 'clsx'

const types = ['Tous', 'Entreprise', 'Municipalité', 'Copropriété', 'Institution']

export default function Clients() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('Tous')
  const [statusF, setStatusF] = useState('Tous')

  const filtered = clients.filter(c =>
    (type === 'Tous' || c.type === type) &&
    (statusF === 'Tous' || c.status === statusF) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.toLowerCase().includes(search.toLowerCase()))
  )

  const totalCA = clients.reduce((s, c) => s + c.ca, 0)

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Clients</h2>
          <p className="text-sm text-slate-500 mt-0.5">{clients.length} clients — {formatCurrency(totalCA, true)} de CA généré</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Nouveau client</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input pl-8" />
        </div>
        {types.map(t => (
          <button key={t} onClick={() => setType(t)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', type === t ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {t}
          </button>
        ))}
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="input w-auto text-xs">
          <option>Tous</option><option>Actif</option><option>Inactif</option>
        </select>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="card hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-600 text-sm flex-shrink-0">
                  {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-tight group-hover:text-brand-600 transition-colors">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{c.type}</span>
                    <span className={clsx('badge text-[10px]', statusColor[c.status])}>{c.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 size={12} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{c.contact}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={12} className="text-slate-400 flex-shrink-0" />
                <span>{c.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail size={12} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
            </div>

            {c.notes && (
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 italic leading-relaxed">{c.notes}</p>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <TrendingUp size={13} />
                <span className="text-xs font-semibold">{formatCurrency(c.ca, true)}</span>
                <span className="text-xs text-slate-400">CA total</span>
              </div>
              <div className="flex gap-1.5">
                <button className="btn-ghost py-1 px-2 text-xs">Modifier</button>
                <button className="btn-ghost py-1 px-2 text-xs text-brand-600">Voir projets</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm card">Aucun client trouvé</div>
      )}
    </div>
  )
}
