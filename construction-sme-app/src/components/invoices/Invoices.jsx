import { useState } from 'react'
import { Plus, Search, Printer, Send, CheckCircle, AlertTriangle, X, Trash2 } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import { formatCurrency, formatDate, statusColor, daysUntil } from '../../utils/formatters'
import FormModal from '../ui/FormModal'
import clsx from 'clsx'

const statuses = ['Tous', 'Envoyée', 'En attente', 'Payée', 'En retard']

// Vue imprimable d'une facture (réutilise la règle @media print sur #devis)
function InvoicePrintModal({ invoice, company, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 no-print" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 no-print">
          <h3 className="font-bold text-slate-800">Facture {invoice.number}</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-primary text-xs"><Printer size={14} /> Imprimer / PDF</button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
          </div>
        </div>

        <div id="devis" className="p-6">
          <div className="flex justify-between mb-6 pb-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                  {company.logoDataUrl
                    ? <img src={company.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
                    : (company.companyName || 'CP').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{company.companyName || 'Votre entreprise'}</p>
                  <p className="text-xs text-slate-400">
                    {[company.rbq && `RBQ ${company.rbq}`, company.neq && `NEQ ${company.neq}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">{[company.address, company.phone].filter(Boolean).join(' · ')}</p>
              {(company.tpsNumber || company.tvqNumber) && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {[company.tpsNumber && `TPS: ${company.tpsNumber}`, company.tvqNumber && `TVQ: ${company.tvqNumber}`].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-brand-500">FACTURE</p>
              <p className="text-xs text-slate-500 mt-1">No {invoice.number}</p>
              <p className="text-xs text-slate-500">Émise le {formatDate(invoice.date)}</p>
              <p className="text-xs text-slate-500">Échéance : {formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Facturé à</p>
            <p className="font-bold text-slate-800">{invoice.client}</p>
            <p className="text-sm text-slate-500">Projet : {invoice.project} · {invoice.type}</p>
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sous-total</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">TPS (5 %)</span>
                <span className="font-medium">{formatCurrency(invoice.tps)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">TVQ (9,975 %)</span>
                <span className="font-medium">{formatCurrency(invoice.tvq)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t-2 border-slate-300 pt-2">
                <span>TOTAL</span>
                <span className="text-brand-600">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400">
            <p>Paiement dû dans les 30 jours. Merci de faire affaire avec nous.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Invoices() {
  const { data, add, update, remove } = useData()
  const [company] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [showNew, setShowNew] = useState(false)
  const [printInvoice, setPrintInvoice] = useState(null)

  const invoices = data.invoices
  const filtered = invoices.filter(inv =>
    (statusFilter === 'Tous' || inv.status === statusFilter) &&
    (inv.number.toLowerCase().includes(search.toLowerCase()) || inv.client.toLowerCase().includes(search.toLowerCase()))
  )

  const totalPayee = invoices.filter(i => i.status === 'Payée').reduce((s, i) => s + i.total, 0)
  const totalAttente = invoices.filter(i => i.status !== 'Payée').reduce((s, i) => s + i.total, 0)
  const totalRetard = invoices.filter(i => i.status === 'En retard').reduce((s, i) => s + i.total, 0)

  const invoiceFields = [
    { name: 'client', label: 'Client', type: 'select', required: true, options: ['', ...data.clients.map(c => c.name)] },
    { name: 'project', label: 'Projet (code)', type: 'select', options: ['', ...data.projects.map(p => p.code)] },
    { name: 'type', label: 'Type', type: 'select', options: ['Acompte (10%)', 'Acompte (20%)', 'Avancement (20%)', 'Avancement (25%)', 'Avancement (40%)', 'Solde final', 'Autre'], default: 'Avancement (20%)' },
    { name: 'subtotal', label: 'Montant avant taxes ($)', type: 'number', required: true, step: '100' },
    { name: 'dueInDays', label: 'Échéance (jours)', type: 'number', default: 30 },
  ]

  const createInvoice = (values) => {
    const year = new Date().getFullYear()
    const count = invoices.filter(i => i.number?.includes(String(year))).length
    const subtotal = values.subtotal
    const tps = +(subtotal * 0.05).toFixed(2)
    const tvq = +(subtotal * 0.09975).toFixed(2)
    const today = new Date()
    const due = new Date(today)
    due.setDate(due.getDate() + (values.dueInDays || 30))
    const clientObj = data.clients.find(c => c.name === values.client)
    const projectObj = data.projects.find(p => p.code === values.project)
    add('invoices', {
      number: `FAC-${year}-${String(count + 100)}`,
      projectId: projectObj?.id ?? null,
      project: values.project || '—',
      clientId: clientObj?.id ?? null,
      client: values.client,
      date: today.toISOString().slice(0, 10),
      dueDate: due.toISOString().slice(0, 10),
      status: 'En attente',
      subtotal, tps, tvq,
      total: +(subtotal + tps + tvq).toFixed(2),
      paid: 0,
      type: values.type,
    })
  }

  const markPaid = (inv) => update('invoices', inv.id, { status: 'Payée', paid: inv.total })
  const markSent = (inv) => update('invoices', inv.id, { status: 'Envoyée' })

  const handleDelete = (inv) => {
    const msg = inv.status === 'Payée'
      ? `Supprimer la facture « ${inv.number} » ?\n\nAttention : cette facture a été PAYÉE (${formatCurrency(inv.total)}). La supprimer faussera vos totaux d'encaissements.\n\nCette action est définitive.`
      : `Supprimer la facture « ${inv.number} — ${inv.client} » (${formatCurrency(inv.total)}) ? Cette action est définitive.`
    if (window.confirm(msg)) remove('invoices', inv.id)
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Facturation</h2>
          <p className="text-sm text-slate-500 mt-0.5">Suivi des factures et des encaissements</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={16} /> Nouvelle facture</button>
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
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Facture</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Projet</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Échéance</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total TTC</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
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
                      <button onClick={() => setPrintInvoice(inv)} title="Imprimer / PDF" className="btn-ghost py-1 px-2 text-xs">
                        <Printer size={13} />
                      </button>
                      {(inv.status === 'En attente' || inv.status === 'Brouillon') && (
                        <button onClick={() => markSent(inv)} title="Marquer envoyée" className="btn-ghost py-1 px-2 text-xs text-blue-600">
                          <Send size={13} />
                        </button>
                      )}
                      {inv.status !== 'Payée' && (
                        <button onClick={() => markPaid(inv)} title="Marquer payée" className="btn-ghost py-1 px-2 text-xs text-emerald-600">
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(inv)}
                        title="Supprimer cette facture"
                        aria-label={`Supprimer ${inv.number}`}
                        className="p-1.5 text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Aucune facture trouvée</div>
        )}
      </div>

      {showNew && (
        <FormModal
          title="Nouvelle facture"
          fields={invoiceFields}
          onSubmit={createInvoice}
          onClose={() => setShowNew(false)}
          submitLabel="Créer la facture"
        />
      )}

      {printInvoice && (
        <InvoicePrintModal invoice={printInvoice} company={company} onClose={() => setPrintInvoice(null)} />
      )}
    </div>
  )
}
