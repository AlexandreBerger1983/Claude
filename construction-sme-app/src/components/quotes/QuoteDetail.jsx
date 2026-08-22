import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer, Send, CheckCircle, Pencil, Save, X, Plus, Trash2, FileSpreadsheet, FileText } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters'
import { useLocalStorage, readStorage } from '../../hooks/useLocalStorage'
import { SAVED_KEY } from '../estimator/estimatorUtils'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import QuoteLegalFooter from './QuoteLegalFooter'
import clsx from 'clsx'

// Totaux calculés à partir des lignes (ou du sous-total manuel si aucune ligne)
const computeTotals = (items, manualSubtotal) => {
  const subtotal = items.length > 0
    ? items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0), 0)
    : (parseFloat(manualSubtotal) || 0)
  const tps = +(subtotal * 0.05).toFixed(2)
  const tvq = +(subtotal * 0.09975).toFixed(2)
  return { subtotal: +subtotal.toFixed(2), tps, tvq, total: +(subtotal + tps + tvq).toFixed(2) }
}

export default function QuoteDetail() {
  const { id } = useParams()
  const { data, update } = useData()
  const quote = data.quotes.find(q => q.id === Number(id))
  const [settings] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const [form, setForm] = useState(null) // copie de travail en mode édition
  const [exporting, setExporting] = useState(null)
  const [exportError, setExportError] = useState(null)

  if (!quote) return <div className="text-slate-500 p-8">Soumission introuvable</div>

  const editing = form !== null

  const startEdit = () => setForm({
    title: quote.title,
    client: quote.client,
    date: quote.date || '',
    validUntil: quote.validUntil || '',
    estimator: quote.estimator || '',
    manualSubtotal: quote.items.length === 0 ? String(quote.subtotal || 0) : '',
    items: quote.items.map(it => ({ ...it, qty: String(it.qty), unitPrice: String(it.unitPrice) })),
  })

  const cancelEdit = () => setForm(null)

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const setItem = (itemId, field, value) =>
    setForm(f => ({ ...f, items: f.items.map(it => it.id === itemId ? { ...it, [field]: value } : it) }))
  const removeItem = (itemId) =>
    setForm(f => ({ ...f, items: f.items.filter(it => it.id !== itemId) }))
  const addItem = () =>
    setForm(f => ({
      ...f,
      items: [...f.items, { id: Date.now(), description: '', unit: 'unité', qty: '1', unitPrice: '0' }],
    }))

  const saveEdit = () => {
    const cleanItems = form.items
      .filter(it => it.description.trim())
      .map(it => {
        const qty = parseFloat(it.qty) || 0
        const unitPrice = parseFloat(it.unitPrice) || 0
        return { ...it, qty, unitPrice, total: +(qty * unitPrice).toFixed(2) }
      })
    const totals = computeTotals(cleanItems, form.manualSubtotal)
    const clientObj = data.clients.find(c => c.name === form.client)
    update('quotes', quote.id, {
      title: form.title,
      client: form.client,
      clientId: clientObj?.id ?? quote.clientId,
      date: form.date,
      validUntil: form.validUntil,
      estimator: form.estimator,
      items: cleanItems,
      ...totals,
    })
    setForm(null)
  }

  // Données d'export. Le devis d'origine de l'estimateur (s'il existe encore)
  // porte les corps de métier, les prix planchers et la liste des travaux
  // « Inclus / Non-applicable » ; la soumission enregistrée, elle, ne contient
  // que des prix finaux, marge comprise.
  //
  // On repart donc du devis d'origine quand il concorde encore avec la
  // soumission. S'il a divergé (soumission modifiée depuis), on exporte les
  // lignes de la soumission avec une marge de 0 % : sans cela, les 20 % du
  // gabarit seraient appliqués une seconde fois et le fichier n'afficherait
  // pas le même total que l'écran.
  const buildExportData = () => {
    const origine = readStorage(SAVED_KEY, []).find(d => d.number === quote.number)
    let items, adminProfitPct, rooms
    const pretaxOrigine = origine
      ? origine.items.reduce((s, it) =>
          s + (parseFloat(it.qty) || 0) * ((parseFloat(it.unitMat) || 0) + (parseFloat(it.unitLabor) || 0)), 0)
        * (1 + (origine.settings?.adminProfitPct ?? 20) / 100)
      : null

    if (origine && Math.abs(pretaxOrigine - quote.subtotal) < 1) {
      items = origine.items
      adminProfitPct = origine.settings?.adminProfitPct ?? 20
      rooms = origine.rooms
    } else {
      items = quote.items.map(it => ({
        description: it.description,
        qty: it.qty,
        unit: it.unit,
        unitMat: it.unitPrice,
        unitLabor: 0,
        min: 0,
        trade: null,
      }))
      adminProfitPct = 0
      rooms = origine?.rooms ?? []
    }

    return {
      company: settings,
      client: { name: quote.client, address: '', phone: '' },
      title: quote.title,
      number: quote.number,
      date: formatDate(quote.date),
      rooms,
      items,
      laborRate: 0,
      adminProfitPct,
      tpsPct: settings.tpsPct ?? 5,
      tvqPct: settings.tvqPct ?? 9.975,
      sousTotal: quote.subtotal,
      tps: quote.tps,
      tvq: quote.tvq,
      total: quote.total,
    }
  }

  const runExport = async (kind) => {
    setExporting(kind)
    setExportError(null)
    try {
      const mod = await import('../../utils/exportSoumission')
      await (kind === 'excel' ? mod.exportExcel : mod.exportWord)(buildExportData())
    } catch (e) {
      setExportError(e?.message || 'erreur inconnue')
    } finally {
      setExporting(null)
    }
  }

  // valeurs affichées : la copie de travail en édition, sinon la soumission
  const view = editing ? form : quote
  const liveTotals = editing
    ? computeTotals(form.items.filter(it => it.description.trim() || form.items.length === 0), form.manualSubtotal)
    : { subtotal: quote.subtotal, tps: quote.tps, tvq: quote.tvq, total: quote.total }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="no-print">
        <Link to="/soumissions" className="btn-ghost mb-3 -ml-1">
          <ArrowLeft size={16} /> Retour aux soumissions
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">{quote.number}</h2>
            <span className={clsx('badge', statusColor[quote.status])}>{quote.status}</span>
            {editing && <span className="badge bg-blue-100 text-blue-700">✏️ En cours de modification</span>}
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={cancelEdit} className="btn-secondary"><X size={15} /> Annuler</button>
                <button onClick={saveEdit} className="btn-primary bg-emerald-500 hover:bg-emerald-600">
                  <Save size={15} /> Enregistrer les modifications
                </button>
              </>
            ) : (
              <>
                <button onClick={startEdit} className="btn-secondary"><Pencil size={15} /> Modifier</button>
                <button onClick={() => window.print()} className="btn-secondary"><Printer size={15} /> Imprimer</button>
                <button onClick={() => runExport('excel')} disabled={exporting !== null} className="btn-secondary disabled:opacity-50">
                  <FileSpreadsheet size={15} /> {exporting === 'excel' ? 'Préparation…' : 'Excel'}
                </button>
                <button onClick={() => runExport('word')} disabled={exporting !== null} className="btn-secondary disabled:opacity-50">
                  <FileText size={15} /> {exporting === 'word' ? 'Préparation…' : 'Word'}
                </button>
                {quote.status !== 'Envoyée' && quote.status !== 'Acceptée' && (
                  <button onClick={() => update('quotes', quote.id, { status: 'Envoyée' })} className="btn-secondary">
                    <Send size={15} /> Marquer envoyée
                  </button>
                )}
                {quote.status !== 'Acceptée' && (
                  <button onClick={() => update('quotes', quote.id, { status: 'Acceptée' })} className="btn-primary">
                    <CheckCircle size={15} /> Marquer acceptée
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {exportError && (
          <p className="mt-2 text-sm text-red-600">
            L'export n'a pas fonctionné : {exportError}. Réessayez, ou utilisez « Imprimer ».
          </p>
        )}
      </div>

      <div id="devis" className={clsx('card', editing && 'ring-2 ring-blue-300')}>
        {/* En-tête entreprise */}
        <div className="flex justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                {settings.logoDataUrl
                  ? <img src={settings.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
                  : (settings.companyName || 'CP').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-slate-800">{settings.companyName || 'Votre entreprise'}</div>
                {settings.neq && <div className="text-xs text-slate-400">NEQ: {settings.neq}</div>}
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5">
              {settings.address && <p>{settings.address}</p>}
              {(settings.phone || settings.email) && <p>{[settings.phone && `Tél: ${settings.phone}`, settings.email].filter(Boolean).join(' · ')}</p>}
              {settings.rbq && <p>RBQ: {settings.rbq}</p>}
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-2xl font-bold text-brand-500 mb-3">SOUMISSION</h3>
            <div className="text-xs text-slate-500 space-y-1">
              <p><span className="font-medium text-slate-700">No:</span> {quote.number}</p>
              {editing ? (
                <>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="font-medium text-slate-700">Date:</span>
                    <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className="input py-0.5 px-1.5 text-xs w-32" />
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="font-medium text-slate-700">Valide jusqu'au:</span>
                    <input type="date" value={form.validUntil} onChange={e => setField('validUntil', e.target.value)} className="input py-0.5 px-1.5 text-xs w-32" />
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="font-medium text-slate-700">Estimateur:</span>
                    <input value={form.estimator} onChange={e => setField('estimator', e.target.value)} className="input py-0.5 px-1.5 text-xs w-32" />
                  </div>
                </>
              ) : (
                <>
                  <p><span className="font-medium text-slate-700">Date:</span> {formatDate(quote.date)}</p>
                  <p><span className="font-medium text-slate-700">Valide jusqu'au:</span> {formatDate(quote.validUntil)}</p>
                  {quote.estimator && <p><span className="font-medium text-slate-700">Estimateur:</span> {quote.estimator}</p>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Client + titre */}
        <div className="mb-8 p-4 bg-slate-50 rounded-xl">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Présentée à</p>
          {editing ? (
            <div className="space-y-2">
              <select value={form.client} onChange={e => setField('client', e.target.value)} className="input font-semibold">
                {!data.clients.some(c => c.name === form.client) && <option value={form.client}>{form.client}</option>}
                {data.clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="Titre de la soumission"
                className="input"
              />
            </div>
          ) : (
            <>
              <p className="font-semibold text-slate-800">{quote.client}</p>
              <p className="text-sm font-medium text-slate-600 mt-1">{quote.title}</p>
            </>
          )}
        </div>

        {/* Lignes de détail */}
        {(view.items.length > 0 || editing) && (
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="text-center pb-2 text-xs font-semibold text-slate-500 uppercase">Unité</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Qté</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Prix unit.</th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  {editing && <th className="pb-2 w-8"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {view.items.map((item, i) => {
                  const lineTotal = editing
                    ? (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)
                    : item.total
                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 text-slate-400 text-xs">{i + 1}</td>
                      <td className="py-2.5 text-slate-700">
                        {editing ? (
                          <input
                            value={item.description}
                            onChange={e => setItem(item.id, 'description', e.target.value)}
                            placeholder="Description du travail"
                            className="input py-1 text-sm w-full"
                          />
                        ) : item.description}
                      </td>
                      <td className="py-2.5 text-center text-slate-500 text-xs">
                        {editing ? (
                          <input
                            value={item.unit}
                            onChange={e => setItem(item.id, 'unit', e.target.value)}
                            className="input py-1 text-xs w-20 text-center"
                          />
                        ) : item.unit}
                      </td>
                      <td className="py-2.5 text-right text-slate-600">
                        {editing ? (
                          <input
                            type="number" min="0" step="0.1" inputMode="decimal"
                            value={item.qty}
                            onChange={e => setItem(item.id, 'qty', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="input py-1 text-sm w-20 text-right"
                          />
                        ) : Number(item.qty).toLocaleString('fr-CA')}
                      </td>
                      <td className="py-2.5 text-right text-slate-600">
                        {editing ? (
                          <input
                            type="number" min="0" step="0.01" inputMode="decimal"
                            value={item.unitPrice}
                            onChange={e => setItem(item.id, 'unitPrice', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="input py-1 text-sm w-24 text-right"
                          />
                        ) : formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-800">{formatCurrency(lineTotal)}</td>
                      {editing && (
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                            aria-label="Retirer cette ligne"
                            title="Retirer cette ligne"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {editing && (
              <button onClick={addItem} className="mt-3 text-sm text-brand-500 hover:text-brand-700 flex items-center gap-1.5 transition-colors">
                <Plus size={15} /> Ajouter une ligne
              </button>
            )}
          </div>
        )}

        {view.items.length === 0 && !editing && (
          <div className="mb-6 p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
            Aucune ligne de détail — cliquez « Modifier » pour en ajouter
          </div>
        )}

        {/* Sous-total manuel quand aucune ligne */}
        {editing && form.items.length === 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <label className="label">Sous-total manuel (avant taxes) — utilisé tant qu'aucune ligne n'est ajoutée</label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="number" min="0" step="100"
                value={form.manualSubtotal}
                onChange={e => setField('manualSubtotal', e.target.value)}
                className="input"
              />
              <span className="text-slate-500 text-sm">$</span>
            </div>
          </div>
        )}

        {/* Totaux — recalculés en direct en mode édition */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Sous-total</span>
              <span className="font-medium">{formatCurrency(liveTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">TPS (5%)</span>
              <span className="font-medium">{formatCurrency(liveTotals.tps)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">TVQ (9,975%)</span>
              <span className="font-medium">{formatCurrency(liveTotals.tvq)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-2">
              <span>TOTAL</span>
              <span className="text-brand-600">{formatCurrency(liveTotals.total)}</span>
            </div>
          </div>
        </div>

        <QuoteLegalFooter companyName={settings.companyName} signatoryName={settings.ownerName} />
      </div>

      {/* Barre d'enregistrement flottante en mode édition */}
      {editing && (
        <div className="sticky bottom-4 flex justify-center no-print">
          <div className="bg-white shadow-xl border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-4">
            <p className="text-sm text-slate-600">
              Nouveau total : <span className="font-bold text-brand-600">{formatCurrency(liveTotals.total)}</span>
            </p>
            <button onClick={cancelEdit} className="btn-secondary text-sm py-2">Annuler</button>
            <button onClick={saveEdit} className="btn-primary bg-emerald-500 hover:bg-emerald-600 text-sm py-2">
              <Save size={15} /> Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
