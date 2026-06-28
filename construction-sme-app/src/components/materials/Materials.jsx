import { useState } from 'react'
import { Plus, Search, AlertTriangle, Package } from 'lucide-react'
import { materials } from '../../data/mockData'
import { formatCurrency } from '../../utils/formatters'
import clsx from 'clsx'

const categories = ['Tous', 'Cloisons', 'Ossature', 'Isolation', 'Électricité', 'Plafond', 'Plancher', 'Peinture', 'Fixation', 'Béton', 'Plomberie']

export default function Materials() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Tous')
  const [showLowOnly, setShowLowOnly] = useState(false)

  const filtered = materials.filter(m =>
    (cat === 'Tous' || m.category === cat) &&
    (!showLowOnly || m.stock <= m.minStock) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.supplier.toLowerCase().includes(search.toLowerCase()))
  )

  const lowStock = materials.filter(m => m.minStock > 0 && m.stock <= m.minStock)
  const totalValue = materials.reduce((s, m) => s + m.stock * m.unitCost, 0)

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Matériaux & Inventaire</h2>
          <p className="text-sm text-slate-500 mt-0.5">Valeur inventaire: {formatCurrency(totalValue, true)} · {lowStock.length} article(s) sous le seuil</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Ajouter article</button>
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
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Article</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Catégorie</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fournisseur</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Emplacement</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Coût unit.</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stock</th>
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
                  <td className="px-4 py-3.5 text-right">
                    <span className={clsx('font-bold text-sm', isLow ? 'text-amber-600' : 'text-slate-800')}>{m.stock}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-slate-500">{m.minStock || '—'}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{formatCurrency(m.stock * m.unitCost)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1">
                      <button className="btn-ghost py-1 px-2 text-xs">+</button>
                      <button className="btn-ghost py-1 px-2 text-xs">−</button>
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
