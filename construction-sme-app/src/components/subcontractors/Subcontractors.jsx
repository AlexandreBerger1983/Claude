import { useState } from 'react'
import { Plus, Search, Star, AlertTriangle, Shield, Phone, Mail, Trash2 } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatDate, statusColor } from '../../utils/formatters'
import FormModal from '../ui/FormModal'
import clsx from 'clsx'

const subFields = [
  { name: 'name', label: "Nom de l'entreprise", required: true, colSpan: 2, placeholder: 'ex: Électricité Pro Inc.' },
  { name: 'contact', label: 'Personne contact', placeholder: 'ex: Daniel Fortier' },
  { name: 'trade', label: 'Métier / Spécialité', required: true, placeholder: 'ex: Électricité' },
  { name: 'phone', label: 'Téléphone', type: 'tel' },
  { name: 'email', label: 'Courriel', type: 'email' },
  { name: 'rbq', label: 'Licence RBQ', placeholder: 'ex: RBQ-1234-5678' },
  { name: 'insurance', label: "Expiration de l'assurance", type: 'date' },
  { name: 'rating', label: 'Cote (1 à 5)', type: 'number', step: '0.1', default: 4 },
  { name: 'status', label: 'Statut', type: 'select', options: ['Approuvé', 'Vérifier assurance', 'En évaluation'], default: 'Approuvé' },
]

export default function Subcontractors() {
  const { data, add, update, remove } = useData()
  const [search, setSearch] = useState('')
  const [tradeF, setTradeF] = useState('Tous')
  const [modal, setModal] = useState(null) // null | 'new' | sous-traitant

  const subcontractors = data.subcontractors
  const trades = ['Tous', ...new Set(subcontractors.map(s => s.trade))]
  const filtered = subcontractors.filter(s =>
    (tradeF === 'Tous' || s.trade === tradeF) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || (s.contact || '').toLowerCase().includes(search.toLowerCase()))
  )

  const needsAttention = subcontractors.filter(s => s.status !== 'Approuvé')

  const handleSubmit = (values) => {
    if (modal === 'new') add('subcontractors', { ...values, activeProjects: 0 })
    else update('subcontractors', modal.id, values)
  }

  const handleDelete = (s) => {
    const msg = s.activeProjects > 0
      ? `Supprimer « ${s.name} » ?\n\nAttention : ce sous-traitant est actif sur ${s.activeProjects} chantier(s).\n\nCette action est définitive.`
      : `Supprimer « ${s.name} » ? Cette action est définitive.`
    if (window.confirm(msg)) remove('subcontractors', s.id)
  }

  const relanceMailto = (s) =>
    `mailto:${s.email}?subject=${encodeURIComponent('Renouvellement de votre preuve d\'assurance')}&body=${encodeURIComponent(`Bonjour ${s.contact},\n\nVotre preuve d'assurance expire le ${formatDate(s.insurance)}. Merci de nous transmettre le certificat renouvelé afin de maintenir votre statut de sous-traitant approuvé.\n\nMerci !`)}`

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Sous-traitants</h2>
          <p className="text-sm text-slate-500 mt-0.5">{subcontractors.length} sous-traitants · {needsAttention.length} nécessite une action</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={16} /> Ajouter sous-traitant</button>
      </div>

      {/* Alerts */}
      {needsAttention.map(s => (
        <div key={s.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{s.name}</strong> — {s.status} (assurance expire {formatDate(s.insurance)})
          </p>
          <a href={relanceMailto(s)} className="btn-secondary ml-auto text-xs py-1">Relancer</a>
        </div>
      ))}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="input pl-8" />
        </div>
        {trades.map(t => (
          <button key={t} onClick={() => setTradeF(t)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', tradeF === t ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {t}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => {
          const isOk = s.status === 'Approuvé'
          const insExpiry = new Date(s.insurance)
          const today = new Date()
          const daysToExpiry = Math.round((insExpiry - today) / (1000 * 60 * 60 * 24))
          const insWarning = daysToExpiry < 90

          return (
            <div key={s.id} className={clsx('card hover:shadow-md transition-shadow', !isOk && 'border-red-200 bg-red-50/20')}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.trade}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={clsx('badge', statusColor[s.status] ?? 'bg-slate-100 text-slate-600')}>{s.status}</span>
                  {s.activeProjects > 0 && (
                    <span className="badge bg-blue-100 text-blue-700 text-[10px]">{s.activeProjects} chantier{s.activeProjects > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs mb-3">
                {(s.contact || s.phone) && (
                  <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-600">
                    <Phone size={11} className="text-slate-400 flex-shrink-0" />
                    <span>{[s.contact, s.phone].filter(Boolean).join(' · ')}</span>
                  </a>
                )}
                {s.email && (
                  <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-600">
                    <Mail size={11} className="text-slate-400 flex-shrink-0" />
                    <span>{s.email}</span>
                  </a>
                )}
                <div className="flex items-center gap-2">
                  <Shield size={11} className="text-slate-400 flex-shrink-0" />
                  <span className={clsx('font-medium', insWarning ? 'text-red-600' : 'text-slate-600')}>
                    Assurance: {formatDate(s.insurance)}
                    {insWarning && daysToExpiry >= 0 && <span className="ml-1">({daysToExpiry} j)</span>}
                    {daysToExpiry < 0 && <span className="ml-1 text-red-700 font-bold">EXPIRÉE</span>}
                  </span>
                </div>
                {s.rbq && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-xs">RBQ:</span>
                    <span className="font-mono text-xs">{s.rbq}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={13} className={i <= Math.round(s.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
                  ))}
                  <span className="text-xs font-semibold text-slate-600 ml-1">{s.rating}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <button onClick={() => setModal(s)} className="btn-ghost py-1 px-2 text-xs">Modifier</button>
                  <a href={`mailto:${s.email}`} className="btn-ghost py-1 px-2 text-xs text-brand-600">Contacter</a>
                  <button
                    onClick={() => handleDelete(s)}
                    className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                    aria-label={`Supprimer ${s.name}`}
                    title="Supprimer ce sous-traitant"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <FormModal
          title={modal === 'new' ? 'Ajouter un sous-traitant' : `Modifier — ${modal.name}`}
          fields={subFields}
          initialValues={modal === 'new' ? {} : modal}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
