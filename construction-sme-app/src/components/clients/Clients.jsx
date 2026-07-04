import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Phone, Mail, Building2, TrendingUp, Clock, Trash2 } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatCurrency, statusColor } from '../../utils/formatters'
import FormModal from '../ui/FormModal'
import clsx from 'clsx'

const types = ['Tous', 'Entreprise', 'Municipalité', 'Copropriété', 'Institution', 'Particulier']

const clientFields = [
  { name: 'name', label: 'Nom du client', required: true, placeholder: 'ex: Constructions Untel Inc.', colSpan: 2 },
  { name: 'contact', label: 'Personne contact', placeholder: 'ex: Jean Tremblay' },
  { name: 'type', label: 'Type', type: 'select', options: ['Entreprise', 'Municipalité', 'Copropriété', 'Institution', 'Particulier'], default: 'Entreprise' },
  { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: 'ex: 514-555-1234' },
  { name: 'email', label: 'Courriel', type: 'email', placeholder: 'ex: info@client.ca' },
  { name: 'address', label: 'Adresse', colSpan: 2, placeholder: 'ex: 123 rue Principale, Montréal, QC' },
  { name: 'neq', label: 'NEQ (facultatif)', placeholder: 'ex: 1234567890' },
  { name: 'status', label: 'Statut', type: 'select', options: ['Actif', 'Inactif'], default: 'Actif' },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes internes sur ce client…' },
]

export default function Clients() {
  const { data, add, update, remove } = useData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('Tous')
  const [statusF, setStatusF] = useState('Tous')
  const [modal, setModal] = useState(null) // null | 'new' | client à modifier

  const clients = data.clients

  // Liaison heures ↔ client : les heures des feuilles de temps saisies sur
  // les projets de ce client, valorisées au taux horaire de chaque employé.
  const laborForClient = (client) => {
    const projectIds = new Set(data.projects.filter(p => p.client === client.name).map(p => p.id))
    const projectCodes = new Set(data.projects.filter(p => p.client === client.name).map(p => p.code))
    let hours = 0, cost = 0
    for (const t of data.timesheets) {
      if (projectIds.has(t.projectId) || projectCodes.has(t.project)) {
        const emp = data.employees.find(e => e.id === t.employeeId)
        hours += t.hours || 0
        cost += (t.hours || 0) * (emp?.hourlyRate || 0)
      }
    }
    return { hours, cost }
  }

  const filtered = clients.filter(c =>
    (type === 'Tous' || c.type === type) &&
    (statusF === 'Tous' || c.status === statusF) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || (c.contact || '').toLowerCase().includes(search.toLowerCase()))
  )

  const totalCA = clients.reduce((s, c) => s + (c.ca || 0), 0)

  const handleSubmit = (values) => {
    if (modal === 'new') {
      add('clients', { ...values, ca: 0, since: new Date().toISOString().slice(0, 10) })
    } else {
      update('clients', modal.id, values)
    }
  }

  const handleDelete = (client) => {
    const nProjects = data.projects.filter(p => p.client === client.name).length
    const nInvoices = data.invoices.filter(i => i.client === client.name).length
    const nQuotes = data.quotes.filter(q => q.client === client.name).length
    const linked = [
      nProjects > 0 && `${nProjects} projet(s)`,
      nInvoices > 0 && `${nInvoices} facture(s)`,
      nQuotes > 0 && `${nQuotes} soumission(s)`,
    ].filter(Boolean)
    const msg = linked.length > 0
      ? `Supprimer « ${client.name} » ?\n\nAttention : ce client a ${linked.join(', ')}. Ces documents resteront dans l'historique mais ne seront plus rattachés à une fiche client.\n\nCette action est définitive.`
      : `Supprimer « ${client.name} » ? Cette action est définitive.`
    if (window.confirm(msg)) remove('clients', client.id)
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Clients</h2>
          <p className="text-sm text-slate-500 mt-0.5">{clients.length} clients — {formatCurrency(totalCA, true)} de CA généré</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={16} /> Nouveau client</button>
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
          <div key={c.id} className="card hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-600 text-sm flex-shrink-0">
                  {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-tight">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{c.type}</span>
                    <span className={clsx('badge text-[10px]', statusColor[c.status])}>{c.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              {c.contact && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 size={12} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{c.contact}</span>
                </div>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-600">
                  <Phone size={12} className="text-slate-400 flex-shrink-0" />
                  <span>{c.phone}</span>
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-600">
                  <Mail size={12} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                </a>
              )}
            </div>

            {c.notes && (
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 italic leading-relaxed">{c.notes}</p>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <TrendingUp size={13} />
                  <span className="text-xs font-semibold">{formatCurrency(c.ca || 0, true)}</span>
                  <span className="text-xs text-slate-400">CA total</span>
                </div>
                {(() => {
                  const { hours, cost } = laborForClient(c)
                  return hours > 0 ? (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock size={12} className="text-slate-400" />
                      <span className="text-xs">{hours}h travaillées · <span className="font-semibold text-slate-600">{formatCurrency(cost, true)}</span> M.O.</span>
                    </div>
                  ) : null
                })()}
              </div>
              <div className="flex gap-1 items-center">
                <button onClick={() => setModal(c)} className="btn-ghost py-1 px-2 text-xs">Modifier</button>
                <button
                  onClick={() => navigate(`/projets?client=${encodeURIComponent(c.name)}`)}
                  className="btn-ghost py-1 px-2 text-xs text-brand-600"
                >
                  Voir projets
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                  aria-label={`Supprimer ${c.name}`}
                  title="Supprimer ce client"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm card">Aucun client trouvé</div>
      )}

      {modal && (
        <FormModal
          title={modal === 'new' ? 'Nouveau client' : `Modifier — ${modal.name}`}
          fields={clientFields}
          initialValues={modal === 'new' ? {} : modal}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
