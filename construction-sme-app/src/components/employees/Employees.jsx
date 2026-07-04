import { useState } from 'react'
import { Plus, Search, Phone, Mail, Award, Trash2, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
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
  const { data, add, update, remove } = useData()
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('Tous')
  const [modal, setModal] = useState(null) // null | 'new' | employé

  const employees = data.employees
  const timesheets = data.timesheets

  // Liaison heures ↔ taux horaire : les heures viennent des feuilles de
  // temps, le coût = heures × taux horaire de l'employé.
  const hoursFor = (emp) => timesheets
    .filter(t => t.employeeId === emp.id)
    .reduce((s, t) => s + (t.hours || 0), 0)
  const costFor = (emp) => hoursFor(emp) * (emp.hourlyRate || 0)

  const filtered = employees.filter(e =>
    (statusF === 'Tous' || e.status === statusF) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || (e.role || '').toLowerCase().includes(search.toLowerCase()))
  )

  const totalHours = employees.reduce((s, e) => s + hoursFor(e), 0)
  const totalCost = employees.reduce((s, e) => s + costFor(e), 0)

  const handleSubmit = (values) => {
    const certs = typeof values.certifications === 'string'
      ? values.certifications.split(',').map(c => c.trim()).filter(Boolean)
      : values.certifications
    const avatar = values.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    if (modal === 'new') {
      add('employees', { ...values, certifications: certs, avatar })
    } else {
      update('employees', modal.id, { ...values, certifications: certs, avatar })
    }
  }

  const handleDelete = (emp) => {
    const nEntries = timesheets.filter(t => t.employeeId === emp.id).length
    const msg = nEntries > 0
      ? `Supprimer ${emp.name} ? Ses ${nEntries} entrée(s) de feuilles de temps resteront dans l'historique. Cette action est définitive.`
      : `Supprimer ${emp.name} ? Cette action est définitive.`
    if (window.confirm(msg)) remove('employees', emp.id)
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Équipe</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {employees.filter(e => e.status === 'Actif').length} employés actifs · {totalHours}h saisies · {formatCurrency(totalCost, true)} de main-d'œuvre
          </p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={16} /> Ajouter employé</button>
      </div>

      {/* Summary — calculé depuis les feuilles de temps */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Heures saisies (feuilles de temps)</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalHours}h</p>
          <Link to="/feuilles-de-temps" className="text-xs text-brand-500 hover:underline">Voir les feuilles de temps →</Link>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Coût main-d'œuvre (hrs × taux)</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalCost, true)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Taux horaire moyen</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {employees.length ? formatCurrency(Math.round(employees.reduce((s, e) => s + (e.hourlyRate || 0), 0) / employees.length)) : '—'} /h
          </p>
          <Link to="/paie" className="text-xs text-brand-500 hover:underline">Voir Paie & Heures →</Link>
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
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Heures saisies</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Coût M.O.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Certifications</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(e => {
              const hrs = hoursFor(e)
              const cost = costFor(e)
              return (
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
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-700">
                    {e.hourlyRate > 0 ? formatCurrency(e.hourlyRate) : <span className="text-amber-500 text-xs font-medium">à définir</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <Clock size={12} className="text-slate-300" /> {hrs}h
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                    {cost > 0 ? formatCurrency(cost) : '—'}
                  </td>
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
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setModal(e)} className="btn-ghost py-1 px-2 text-xs">Modifier</button>
                      <button
                        onClick={() => handleDelete(e)}
                        className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                        aria-label={`Supprimer ${e.name}`}
                        title="Supprimer cet employé"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Aucun employé trouvé</div>
        )}
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
