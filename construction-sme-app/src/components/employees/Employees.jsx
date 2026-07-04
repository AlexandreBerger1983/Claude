import { useState } from 'react'
import { Plus, Search, Phone, Mail, Award } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatCurrency, statusColor } from '../../utils/formatters'
import FormModal from '../ui/FormModal'
import clsx from 'clsx'

const employeeFields = [
  { name: 'name', label: 'Nom complet', required: true, colSpan: 2, placeholder: 'ex: Jean Tremblay' },
  { name: 'role', label: 'Rôle / Métier', required: true, placeholder: 'ex: Charpentier-menuisier' },
  { name: 'hourlyRate', label: 'Taux horaire ($/h)', type: 'number', step: '0.5', default: 30 },
  { name: 'email', label: 'Courriel', type: 'email', placeholder: 'ex: j.tremblay@entreprise.ca' },
  { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: 'ex: 514-555-1234' },
  { name: 'startDate', label: "Date d'embauche", type: 'date' },
  { name: 'status', label: 'Statut', type: 'select', options: ['Actif', 'Congé', 'Inactif'], default: 'Actif' },
  { name: 'certifications', label: 'Certifications (séparées par des virgules)', colSpan: 2, placeholder: 'ex: ASP Construction, Compagnon menuiserie' },
]

export default function Employees() {
  const { data, add, update } = useData()
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('Tous')
  const [modal, setModal] = useState(null) // null | 'new' | employé

  const employees = data.employees
  const filtered = employees.filter(e =>
    (statusF === 'Tous' || e.status === statusF) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()))
  )

  const totalHoursMonth = employees.reduce((s, e) => s + (e.hrsThisMonth || 0), 0)
  const totalPayroll = employees.reduce((s, e) => s + (e.hrsThisMonth || 0) * e.hourlyRate, 0)

  const handleSubmit = (values) => {
    const certs = typeof values.certifications === 'string'
      ? values.certifications.split(',').map(c => c.trim()).filter(Boolean)
      : values.certifications
    const avatar = values.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    if (modal === 'new') {
      add('employees', { ...values, certifications: certs, avatar, hrsThisWeek: 0, hrsThisMonth: 0 })
    } else {
      update('employees', modal.id, { ...values, certifications: certs, avatar })
    }
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Équipe</h2>
          <p className="text-sm text-slate-500 mt-0.5">{employees.filter(e => e.status === 'Actif').length} employés actifs · {totalHoursMonth}h ce mois · ~{formatCurrency(totalPayroll, true)} masse salariale</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={16} /> Ajouter employé</button>
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
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {employees.length ? formatCurrency(Math.round(employees.reduce((s, e) => s + e.hourlyRate, 0) / employees.length)) : '—'} /h
          </p>
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
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[950px]">
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
              <th className="px-4 py-3"></th>
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
                      <p className="text-xs text-slate-400">{e.startDate ? `Depuis ${String(e.startDate).slice(0, 4)}` : ''}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{e.role}</td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5 text-xs text-slate-500">
                    {e.email && <a href={`mailto:${e.email}`} className="flex items-center gap-1 hover:text-brand-600"><Mail size={11} />{e.email}</a>}
                    {e.phone && <a href={`tel:${e.phone}`} className="flex items-center gap-1 hover:text-brand-600"><Phone size={11} />{e.phone}</a>}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{formatCurrency(e.hourlyRate)}</td>
                <td className="px-4 py-3.5 text-right">
                  <span className={clsx('font-semibold', (e.hrsThisWeek || 0) > 40 ? 'text-amber-600' : 'text-slate-700')}>{e.hrsThisWeek || 0}h</span>
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{e.hrsThisMonth || 0}h</td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {(e.certifications || []).map(c => (
                      <span key={c} className="badge bg-blue-50 text-blue-600 text-[10px] flex items-center gap-1">
                        <Award size={9} /> {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={clsx('badge', statusColor[e.status])}>{e.status}</span>
                </td>
                <td className="px-4 py-3.5">
                  <button onClick={() => setModal(e)} className="btn-ghost py-1 px-2 text-xs">Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <FormModal
          title={modal === 'new' ? 'Ajouter un employé' : `Modifier — ${modal.name}`}
          fields={employeeFields}
          initialValues={modal === 'new' ? {} : { ...modal, certifications: (modal.certifications || []).join(', ') }}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
