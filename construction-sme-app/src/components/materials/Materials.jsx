import { useState } from 'react'
import { Plus, Minus, Search, AlertTriangle, Package } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatCurrency } from '../../utils/formatters'
import FormModal from '../ui/FormModal'
import clsx from 'clsx'

const categories = ['Tous', 'Cloisons', 'Ossature', 'Isolation', 'Électricité', 'Plafond', 'Plancher', 'Peinture', 'Fixation', 'Béton', 'Plomberie', 'Autre']

const materialFields = [
  { name: 'name', label: "Nom de l'article", required: true, colSpan: 2, placeholder: 'ex: Panneau de gypse 5/8" (4x8)' },
  { name: 'category', label: 'Catégorie', type: 'select', options: categories.slice(1), default: 'Autre' },
  { name: 'unit', label: 'Unité', placeholder: 'ex: feuille, boîte, m²', default: 'unité' },
  { name: 'stock', label: 'Quantité en stock', type: 'number', default: 0 },
  { name: 'minStock', label: 'Stock minimum (alerte)', type: 'number', default: 0 },
  { name: 'unitCost', label: 'Coût unitaire ($)', type: 'number', step: '0.01', default: 0 },
  { name: 'supplier', label: 'Fournisseur', placeholder: 'ex: BMR Pro' },
  { name: 'location', label: 'Emplacement', placeholder: 'ex: Entrepôt A, Camion 2', default: 'Entrepôt' },
]

export default function Materials() {
  const { data, add, update } = useData()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Tous')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [modal, setModal] = useState(null) // null | 'new' | article

  const materials = data.materials
  const filtered = materials.filter(m =>
    (cat === 'Tous' || m.category === cat) &&
    (!showLowOnly || (m.minStock > 0 && m.stock <= m.minStock)) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || (m.supplier || '').toLowerCase().includes(search.toLowerCase()))
  )

  const lowStock = materials.filter(m => m.minStock > 0 && m.stock <= m.minStock)
  const totalValue = materials.reduce((s, m) => s + m.stock * m.unitCost, 0)

  const adjustStock = (m, delta) => update('materials', m.id, { stock: Math.max(0, m.stock + delta) })

  const handleSubmit = (values) => {
    if (modal === 'new') add('materials', values)
    else update('materials', modal.id, values)
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Matériaux & Inventaire</h2>
          <p className="text-sm text-slate-500 mt-0.5">Valeur inventaire: {formatCurrency(totalValue, true)} · {lowStock.length} article(s) sous le seuil</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={16} /> Ajouter article</button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-700">Articles sous le stock minimum</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(m => (
              <div key={m.id} className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs">
                <Package size={11} className="text-amber-500" />
                <span className="font-medium text-slate-700">{m.name}</span>
                <span className="text-amber-600 font-bold">{m.stock} {m.unit}</span>
                <span className="text-slate-400">(min. {m.minStock})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Articles en stock</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{materials.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Valeur totale</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalValue, true)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase font-medium">Sous le seuil</p>
          <p className={clsx('text-2xl font-bold mt-1', lowStock.length > 0 ? 'text-amber-600' : 'text-emerald-600')}>{lowStock.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher article, fournisseur..." className="input pl-8" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showLowOnly} onChange={e => setShowLowOnly(e.target.checked)} className="rounded" />
            Stock faible seulement
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-colors', cat === c ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[950px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Article</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Emplacement</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Coût unit.</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Min.</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valeur</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(m => {
              const isLow = m.minStock > 0 && m.stock <= m.minStock
              return (
                <tr key={m.id} className={clsx('table-row-hover', isLow && 'bg-amber-50/30')}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{m.name}</p>
                        <p className="text-xs text-slate-400">par {m.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="badge bg-slate-100 text-slate-600">{m.category}</span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">{m.supplier}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{m.location}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-700">{formatCurrency(m.unitCost)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => adjustStock(m, -1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                        aria-label="Retirer 1"
                      >
                        <Minus size={12} />
                      </button>
                      <span className={clsx('font-bold text-sm w-10 text-center', isLow ? 'text-amber-600' : 'text-slate-800')}>{m.stock}</span>
                      <button
                        onClick={() => adjustStock(m, 1)}
                        className="w-6 h-6 rounded-md bg-brand-50 hover:bg-brand-100 flex items-center justify-center text-brand-600"
                        aria-label="Ajouter 1"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-slate-500">{m.minStock || '—'}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{formatCurrency(m.stock * m.unitCost)}</td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => setModal(m)} className="btn-ghost py-1 px-2 text-xs">Modifier</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Aucun article trouvé</div>
        )}
      </div>

      {modal && (
        <FormModal
          title={modal === 'new' ? 'Ajouter un article' : `Modifier — ${modal.name}`}
          fields={materialFields}
          initialValues={modal === 'new' ? {} : modal}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
