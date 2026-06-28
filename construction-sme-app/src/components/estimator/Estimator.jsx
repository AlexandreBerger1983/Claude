import { useState, useMemo, useCallback } from 'react'
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Search, CheckCircle,
  Ruler, Package, DollarSign, FileText, Home, Settings2, Copy,
  AlertTriangle, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { clients } from '../../data/mockData'
import { CATALOG, CATEGORIES, DEFAULT_SETTINGS, ROOM_PRESETS } from '../../data/estimatorCatalog'
import { formatCurrency } from '../../utils/formatters'
import clsx from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const newRoom = (id) => ({
  id, name: '', length: '', width: '', height: 2.7,
})

const computeRoom = (r) => {
  const l = parseFloat(r.length) || 0
  const w = parseFloat(r.width) || 0
  const h = parseFloat(r.height) || 2.7
  return {
    floorArea: +(l * w).toFixed(2),
    ceilArea:  +(l * w).toFixed(2),
    wallArea:  +(2 * (l + w) * h).toFixed(2),
    perimeter: +(2 * (l + w)).toFixed(2),
  }
}

const autoQtyForItem = (catalogItem, roomCalc) => {
  if (!catalogItem.autoQty || !roomCalc) return ''
  const val = roomCalc[catalogItem.autoQty] ?? 0
  return +(val * (catalogItem.wasteFactor ?? 1)).toFixed(2)
}

const lineTotal = (item) => {
  const q = parseFloat(item.qty) || 0
  const mat = parseFloat(item.unitMat) || 0
  const lab = parseFloat(item.unitLabor) || 0
  return +(q * (mat + lab)).toFixed(2)
}

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'Client & Projet',  icon: Home },
  { id: 1, label: 'Pièces / Zones',   icon: Ruler },
  { id: 2, label: 'Travaux',          icon: Package },
  { id: 3, label: 'Paramètres',       icon: Settings2 },
  { id: 4, label: 'Résumé & Devis',   icon: FileText },
]

// ─── Step 0: Client & Project Info ───────────────────────────────────────────
function StepClient({ data, onChange }) {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-4">Informations du projet</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Client *</label>
            <select value={data.clientId} onChange={e => onChange('clientId', e.target.value)} className="input">
              <option value="">— Sélectionner un client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="nouveau">+ Nouveau client…</option>
            </select>
          </div>
          <div>
            <label className="label">Type de travaux *</label>
            <select value={data.projectType} onChange={e => onChange('projectType', e.target.value)} className="input">
              <option value="">— Sélectionner —</option>
              {['Rénovation résidentielle', 'Rénovation commerciale', 'Rénovation institutionnelle',
                'Construction neuve résidentielle', 'Construction commerciale', 'Agrandissement',
                'Toiture', 'Sous-sol', 'Cuisine', 'Salle de bain', 'Autre'].map(t =>
                <option key={t}>{t}</option>
              )}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Titre de la soumission *</label>
            <input value={data.title} onChange={e => onChange('title', e.target.value)}
              placeholder="ex: Rénovation cuisine et salle de bain principale" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adresse du chantier</label>
            <input value={data.address} onChange={e => onChange('address', e.target.value)}
              placeholder="ex: 455 rue des Érables, Laval, QC H7L 1Z2" className="input" />
          </div>
          <div>
            <label className="label">Début prévu</label>
            <input type="date" value={data.startDate} onChange={e => onChange('startDate', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Durée estimée</label>
            <select value={data.duration} onChange={e => onChange('duration', e.target.value)} className="input">
              <option value="">— Durée —</option>
              {['1-2 jours', '3-5 jours', '1-2 semaines', '3-4 semaines', '1-2 mois', '3-6 mois', '6 mois +'].map(d =>
                <option key={d}>{d}</option>
              )}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes pour l'estimateur (observations sur le terrain)</label>
            <textarea value={data.notes} onChange={e => onChange('notes', e.target.value)}
              rows={3} placeholder="Accès difficile, amiante à vérifier, fenêtres hors plomb, état des fondations…"
              className="input resize-none" />
          </div>
        </div>
      </div>

      {data.clientId && data.clientId !== 'nouveau' && (() => {
        const c = clients.find(cl => cl.id === Number(data.clientId))
        if (!c) return null
        return (
          <div className="p-4 bg-brand-50 border border-brand-200 rounded-xl text-sm">
            <p className="font-semibold text-brand-700 mb-1">{c.name}</p>
            <p className="text-slate-600">{c.contact} · {c.phone}</p>
            <p className="text-slate-500">{c.address}</p>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Step 1: Rooms ────────────────────────────────────────────────────────────
function StepRooms({ rooms, setRooms }) {
  const [openPresetId, setOpenPresetId] = useState(null)

  const addRoom = () => setRooms(r => [...r, newRoom(Date.now())])

  const updateRoom = (id, field, value) =>
    setRooms(r => r.map(rm => rm.id === id ? { ...rm, [field]: value } : rm))

  const removeRoom = (id) => setRooms(r => r.filter(rm => rm.id !== id))

  const applyPreset = (roomId, preset) => {
    updateRoom(roomId, 'name', preset.label === 'Personnalisé' ? '' : preset.label)
    updateRoom(roomId, 'length', preset.length || '')
    updateRoom(roomId, 'width', preset.width || '')
    updateRoom(roomId, 'height', preset.height)
    setOpenPresetId(null)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Pièces & Zones à estimer</h3>
          <p className="text-xs text-slate-500 mt-0.5">Ajoutez chaque espace à évaluer — les surfaces sont calculées automatiquement</p>
        </div>
        <button onClick={addRoom} className="btn-primary">
          <Plus size={16} /> Ajouter une zone
        </button>
      </div>

      {rooms.length === 0 && (
        <div className="card border-2 border-dashed border-slate-200 text-center py-10 text-slate-400">
          <Ruler size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucune zone ajoutée</p>
          <p className="text-xs mt-1">Cliquez « Ajouter une zone » pour commencer</p>
        </div>
      )}

      <div className="space-y-3">
        {rooms.map((room, idx) => {
          const calc = computeRoom(room)
          const isValid = room.length && room.width
          return (
            <div key={room.id} className={clsx('card border-2 transition-colors', isValid ? 'border-slate-200' : 'border-dashed border-slate-200')}>
              <div className="flex items-start gap-3">
                {/* Number badge */}
                <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                <div className="flex-1 space-y-3">
                  {/* Name + preset */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label">Nom de la zone</label>
                      <input value={room.name} onChange={e => updateRoom(room.id, 'name', e.target.value)}
                        placeholder="ex: Cuisine, Bureau principal, Salle de bain #2…" className="input" />
                    </div>
                    <div className="relative">
                      <label className="label">Modèle rapide</label>
                      <button onClick={() => setOpenPresetId(openPresetId === room.id ? null : room.id)}
                        className="input text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap text-slate-500">
                        Sélectionner <ChevronDown size={13} />
                      </button>
                      {openPresetId === room.id && (
                        <div className="absolute top-full left-0 z-20 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto">
                          {ROOM_PRESETS.map(p => (
                            <button key={p.label} onClick={() => applyPreset(room.id, p)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100 last:border-0">
                              {p.label}
                              {p.length > 0 && <span className="text-slate-400 ml-1">({p.length}×{p.width} m)</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Longueur (m)</label>
                      <input type="number" step="0.1" min="0" value={room.length}
                        onChange={e => updateRoom(room.id, 'length', e.target.value)}
                        placeholder="ex: 4.5" className="input" />
                    </div>
                    <div>
                      <label className="label">Largeur (m)</label>
                      <input type="number" step="0.1" min="0" value={room.width}
                        onChange={e => updateRoom(room.id, 'width', e.target.value)}
                        placeholder="ex: 3.2" className="input" />
                    </div>
                    <div>
                      <label className="label">Hauteur (m)</label>
                      <input type="number" step="0.05" min="0" value={room.height}
                        onChange={e => updateRoom(room.id, 'height', e.target.value)}
                        placeholder="ex: 2.7" className="input" />
                    </div>
                  </div>

                  {/* Calculated surfaces */}
                  {isValid && (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Plancher', value: `${calc.floorArea} m²`, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Murs', value: `${calc.wallArea} m²`, color: 'bg-violet-50 text-violet-700' },
                        { label: 'Plafond', value: `${calc.ceilArea} m²`, color: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Périmètre', value: `${calc.perimeter} m`, color: 'bg-amber-50 text-amber-700' },
                      ].map(s => (
                        <div key={s.label} className={clsx('rounded-lg px-3 py-2 text-center', s.color)}>
                          <p className="text-xs font-bold">{s.value}</p>
                          <p className="text-[10px] opacity-70 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => removeRoom(room.id)} className="text-slate-300 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {rooms.length > 0 && (
        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex gap-4">
          <span>Total plancher: <strong className="text-slate-700">{rooms.reduce((s, r) => s + computeRoom(r).floorArea, 0).toFixed(1)} m²</strong></span>
          <span>Total murs: <strong className="text-slate-700">{rooms.reduce((s, r) => s + computeRoom(r).wallArea, 0).toFixed(1)} m²</strong></span>
          <span>Zones: <strong className="text-slate-700">{rooms.length}</strong></span>
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Work Items ───────────────────────────────────────────────────────
function StepItems({ rooms, items, setItems }) {
  const [catFilter, setCatFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState({})

  const toggleCat = (cat) => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }))

  const visibleCatalog = CATALOG.filter(c =>
    (catFilter === 'Tous' || c.category === catFilter) &&
    c.label.toLowerCase().includes(search.toLowerCase())
  )

  const addItem = (catalogItem, roomId = '') => {
    const room = rooms.find(r => r.id === Number(roomId))
    const calc = room ? computeRoom(room) : null
    const aqty = autoQtyForItem(catalogItem, calc)
    setItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      catalogId: catalogItem.id,
      description: catalogItem.label,
      roomId: roomId || (rooms[0]?.id ?? ''),
      unit: catalogItem.unit,
      qty: aqty !== '' ? String(aqty) : '1',
      unitMat: String(catalogItem.unitMat),
      unitLabor: String(catalogItem.unitLabor),
      note: catalogItem.note,
    }])
  }

  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))

  const removeItem = (id) => setItems(prev => prev.filter(it => it.id !== id))

  const recalcQty = (item) => {
    const catItem = CATALOG.find(c => c.id === item.catalogId)
    if (!catItem?.autoQty) return
    const room = rooms.find(r => r.id === Number(item.roomId))
    if (!room) return
    const calc = computeRoom(room)
    const aqty = autoQtyForItem(catItem, calc)
    if (aqty !== '') updateItem(item.id, 'qty', String(aqty))
  }

  const groupedByRoom = useMemo(() => {
    const map = {}
    for (const item of items) {
      const rk = item.roomId || 'general'
      if (!map[rk]) map[rk] = []
      map[rk].push(item)
    }
    return map
  }, [items])

  const totalItems = items.reduce((s, it) => s + lineTotal(it), 0)

  return (
    <div className="flex gap-6">
      {/* Left: catalog */}
      <div className="w-72 flex-shrink-0 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Catalogue de travaux</h3>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un travail…" className="input pl-8 text-xs py-1.5" />
          </div>
          <div className="flex flex-wrap gap-1">
            {['Tous', ...CATEGORIES].map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={clsx('px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                  catFilter === c ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
          {visibleCatalog.map(item => {
            const unitTotal = item.unitMat + item.unitLabor
            return (
              <div key={item.id}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/40 transition-all cursor-pointer group"
                onClick={() => addItem(item)}>
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-medium text-slate-700 group-hover:text-brand-700 leading-tight">{item.label}</p>
                  <Plus size={13} className="text-brand-400 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400">{item.unit}</span>
                  <span className="text-[10px] font-semibold text-brand-600">{formatCurrency(unitTotal)}</span>
                  {item.autoQty && (
                    <span className="text-[10px] bg-blue-50 text-blue-500 px-1 rounded">auto-qté</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: selected items */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Travaux sélectionnés</h3>
          {items.length > 0 && (
            <div className="text-sm font-bold text-brand-600">
              Total matériaux + M.O.: {formatCurrency(totalItems)}
            </div>
          )}
        </div>

        {items.length === 0 && (
          <div className="card border-2 border-dashed border-slate-200 text-center py-10 text-slate-400">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun travail sélectionné</p>
            <p className="text-xs mt-1">Cliquez sur un élément du catalogue à gauche pour l'ajouter</p>
          </div>
        )}

        {/* Items grouped by room */}
        {Object.entries(groupedByRoom).map(([roomId, roomItems]) => {
          const room = rooms.find(r => r.id === Number(roomId))
          const roomTotal = roomItems.reduce((s, it) => s + lineTotal(it), 0)
          const isOpen = expandedCats[roomId] !== false
          return (
            <div key={roomId} className="card p-0 overflow-hidden">
              <button
                onClick={() => toggleCat(roomId)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Home size={14} className="text-brand-500" />
                  <span className="text-sm font-semibold text-slate-700">{room?.name || 'Zone générale'}</span>
                  <span className="badge bg-brand-100 text-brand-700 text-[10px]">{roomItems.length} travaux</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">{formatCurrency(roomTotal)}</span>
                  {isOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-100">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_100px_80px_70px_70px_70px_24px] gap-2 px-4 py-1.5 bg-slate-50/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    <span>Description</span>
                    <span>Zone</span>
                    <span>Qté / Unité</span>
                    <span>Mat. /u.</span>
                    <span>M.O. /u.</span>
                    <span>Total</span>
                    <span></span>
                  </div>

                  {roomItems.map(item => {
                    const total = lineTotal(item)
                    const catItem = CATALOG.find(c => c.id === item.catalogId)
                    return (
                      <div key={item.id} className="grid grid-cols-[1fr_100px_80px_70px_70px_70px_24px] gap-2 items-center px-4 py-2.5 hover:bg-slate-50/50 group">
                        <div className="min-w-0">
                          <input value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                            className="text-xs font-medium text-slate-700 bg-transparent border-0 outline-none w-full hover:bg-slate-100 rounded px-1 py-0.5 -ml-1" />
                          {item.note && <p className="text-[10px] text-slate-400 mt-0.5 px-1">{item.note}</p>}
                        </div>
                        <div>
                          <select value={item.roomId}
                            onChange={e => { updateItem(item.id, 'roomId', e.target.value); recalcQty({ ...item, roomId: e.target.value }) }}
                            className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white w-full text-slate-600 outline-none">
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name || `Zone ${r.id}`}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" step="0.01" value={item.qty}
                            onChange={e => updateItem(item.id, 'qty', e.target.value)}
                            className="input py-1 text-xs w-14 text-right" />
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.unit}</span>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="text-[10px] text-slate-400 mr-0.5">$</span>
                            <input type="number" min="0" step="0.5" value={item.unitMat}
                              onChange={e => updateItem(item.id, 'unitMat', e.target.value)}
                              className="input py-1 text-xs w-16 text-right" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="text-[10px] text-slate-400 mr-0.5">$</span>
                            <input type="number" min="0" step="0.5" value={item.unitLabor}
                              onChange={e => updateItem(item.id, 'unitLabor', e.target.value)}
                              className="input py-1 text-xs w-16 text-right" />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-800">{formatCurrency(total)}</span>
                        </div>
                        <button onClick={() => removeItem(item.id)}
                          className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}

                  {/* Add custom line */}
                  <div className="px-4 py-2">
                    <button
                      onClick={() => setItems(prev => [...prev, {
                        id: Date.now(), catalogId: null, description: '', roomId: String(Number(roomId)),
                        unit: 'forfait', qty: '1', unitMat: '0', unitLabor: '0', note: '',
                      }])}
                      className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1 transition-colors"
                    >
                      <Plus size={13} /> Ajouter une ligne personnalisée
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 3: Settings ─────────────────────────────────────────────────────────
function StepSettings({ settings, setSettings }) {
  const s = settings

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Paramètres de la soumission</h3>
        <p className="text-xs text-slate-500">Ces paramètres s'appliquent au total de tous les travaux</p>
      </div>

      <div className="card space-y-5">
        <h4 className="text-sm font-semibold text-slate-700">Majorations</h4>

        {[
          { key: 'overheadPct', label: 'Frais généraux (%)', desc: 'Loyer bureau, véhicules, admin, assurances, RBQ', min: 0, max: 40 },
          { key: 'profitPct', label: 'Marge bénéficiaire (%)', desc: 'Profit net de l\'entreprise', min: 0, max: 50 },
          { key: 'contingencyPct', label: 'Contingences (%)', desc: 'Imprévus, travaux cachés, variations de prix', min: 0, max: 30 },
        ].map(f => (
          <div key={f.key}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <label className="text-sm font-medium text-slate-700">{f.label}</label>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={f.min} max={f.max} step="0.5"
                  value={s[f.key]} onChange={e => setSettings(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="input w-20 text-right text-sm font-semibold" />
                <span className="text-slate-500 text-sm w-4">%</span>
              </div>
            </div>
            <input type="range" min={f.min} max={f.max} step="0.5"
              value={s[f.key]} onChange={e => setSettings(p => ({ ...p, [f.key]: parseFloat(e.target.value) }))}
              className="w-full accent-brand-500" />
          </div>
        ))}
      </div>

      <div className="card space-y-4">
        <h4 className="text-sm font-semibold text-slate-700">Taxes (Québec)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">TPS (%)</label>
            <input type="number" value={s.tpsPct} onChange={e => setSettings(p => ({ ...p, tpsPct: parseFloat(e.target.value) || 0 }))} className="input" />
          </div>
          <div>
            <label className="label">TVQ (%)</label>
            <input type="number" value={s.tvqPct} onChange={e => setSettings(p => ({ ...p, tvqPct: parseFloat(e.target.value) || 0 }))} className="input" />
          </div>
        </div>
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Info size={12} />
          Taux en vigueur au Québec (2026) : TPS 5% + TVQ 9,975%
        </p>
      </div>

      <div className="card space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">Options de la soumission</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={s.showMaterialDetail ?? true}
              onChange={e => setSettings(p => ({ ...p, showMaterialDetail: e.target.checked }))}
              className="rounded accent-brand-500 w-4 h-4" />
            <span className="text-sm text-slate-600">Afficher le détail matériaux vs M.O.</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={s.showRooms ?? true}
              onChange={e => setSettings(p => ({ ...p, showRooms: e.target.checked }))}
              className="rounded accent-brand-500 w-4 h-4" />
            <span className="text-sm text-slate-600">Grouper les items par pièce</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={s.showUnitPrices ?? false}
              onChange={e => setSettings(p => ({ ...p, showUnitPrices: e.target.checked }))}
              className="rounded accent-brand-500 w-4 h-4" />
            <span className="text-sm text-slate-600">Afficher les prix unitaires au client</span>
          </label>
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Summary ──────────────────────────────────────────────────────────
function StepSummary({ project, rooms, items, settings }) {
  const client = clients.find(c => c.id === Number(project.clientId))

  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0)
  const overhead = +(subtotal * settings.overheadPct / 100).toFixed(2)
  const profitBase = subtotal + overhead
  const profit = +(profitBase * settings.profitPct / 100).toFixed(2)
  const contingencyBase = subtotal + overhead + profit
  const contingency = +(contingencyBase * settings.contingencyPct / 100).toFixed(2)
  const pretax = +(subtotal + overhead + profit + contingency).toFixed(2)
  const tps = +(pretax * settings.tpsPct / 100).toFixed(2)
  const tvq = +(pretax * settings.tvqPct / 100).toFixed(2)
  const total = +(pretax + tps + tvq).toFixed(2)

  const byRoom = rooms.map(r => ({
    room: r,
    items: items.filter(it => it.roomId == r.id),
    total: items.filter(it => it.roomId == r.id).reduce((s, it) => s + lineTotal(it), 0),
  }))

  const matTotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitMat) || 0), 0)
  const laborTotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitLabor) || 0), 0)

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">Résumé de la soumission</h3>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs"><Copy size={14} /> Copier lien</button>
          <button className="btn-secondary text-xs">Imprimer PDF</button>
          <button className="btn-primary text-xs">Enregistrer soumission</button>
        </div>
      </div>

      <div className="card">
        {/* Header */}
        <div className="flex justify-between mb-6 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">CP</div>
              <div>
                <div className="font-bold text-slate-800">ConstructPro Inc.</div>
                <div className="text-xs text-slate-400">RBQ: 8001-2345-67 · NEQ: 1187654321</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
              <p>123 rue Industrielle, Montréal (QC) H2X 1Z9</p>
              <p>514-555-0100 · info@constructpro.ca</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-brand-500">SOUMISSION</div>
            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
              <p>No: <strong className="text-slate-700">SOM-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 900) + 100)}</strong></p>
              <p>Date: <strong className="text-slate-700">{new Date().toLocaleDateString('fr-CA')}</strong></p>
              <p>Valide: <strong className="text-slate-700">30 jours</strong></p>
            </div>
          </div>
        </div>

        {/* Client & Project */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Présenté à</p>
            <p className="font-semibold text-slate-800">{client?.name ?? '—'}</p>
            <p className="text-sm text-slate-600">{client?.contact}</p>
            <p className="text-xs text-slate-400 mt-1">{project.address || client?.address}</p>
          </div>
          <div className="p-3 bg-brand-50 rounded-xl">
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-1.5">Objet des travaux</p>
            <p className="font-semibold text-slate-800">{project.title || '—'}</p>
            <p className="text-sm text-slate-600">{project.projectType}</p>
            {project.duration && <p className="text-xs text-slate-500 mt-1">Durée estimée: {project.duration}</p>}
          </div>
        </div>

        {/* Items by room */}
        {byRoom.filter(r => r.items.length > 0).map(({ room, items: roomItems, total: roomTotal }) => (
          <div key={room.id} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2">{room.name || 'Zone générale'}</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left py-1.5 font-medium">Description</th>
                  <th className="text-right py-1.5 font-medium">Qté</th>
                  <th className="text-center py-1.5 font-medium">Unité</th>
                  {settings.showMaterialDetail && <>
                    <th className="text-right py-1.5 font-medium">Mat./u.</th>
                    <th className="text-right py-1.5 font-medium">M.O./u.</th>
                  </>}
                  {settings.showUnitPrices && <th className="text-right py-1.5 font-medium">Prix/u.</th>}
                  <th className="text-right py-1.5 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {roomItems.map(item => {
                  const q = parseFloat(item.qty) || 0
                  const mat = parseFloat(item.unitMat) || 0
                  const lab = parseFloat(item.unitLabor) || 0
                  return (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-2 text-slate-700 text-xs">{item.description}</td>
                      <td className="py-2 text-right text-xs text-slate-600">{q.toLocaleString('fr-CA')}</td>
                      <td className="py-2 text-center text-xs text-slate-400">{item.unit}</td>
                      {settings.showMaterialDetail && <>
                        <td className="py-2 text-right text-xs text-slate-500">{formatCurrency(mat)}</td>
                        <td className="py-2 text-right text-xs text-slate-500">{formatCurrency(lab)}</td>
                      </>}
                      {settings.showUnitPrices && <td className="py-2 text-right text-xs text-slate-600">{formatCurrency(mat + lab)}</td>}
                      <td className="py-2 text-right text-xs font-semibold text-slate-800">{formatCurrency(lineTotal(item))}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={settings.showMaterialDetail ? 5 : (settings.showUnitPrices ? 4 : 3)} className="py-2 px-1 text-xs font-semibold text-slate-500">
                    Sous-total {room.name}
                  </td>
                  <td className="py-2 text-right text-sm font-bold text-slate-700">{formatCurrency(roomTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {/* Totals breakdown */}
        <div className="mt-6 pt-4 border-t-2 border-slate-200">
          <div className="flex gap-6 mb-6">
            <div className="flex-1 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 mb-2 font-medium">Répartition des coûts</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Matériaux</span>
                  <span className="font-medium">{formatCurrency(matTotal)} ({Math.round(matTotal / subtotal * 100)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.round(matTotal / subtotal * 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Main-d'œuvre</span>
                  <span className="font-medium">{formatCurrency(laborTotal)} ({Math.round(laborTotal / subtotal * 100)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.round(laborTotal / subtotal * 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="w-64 space-y-1.5">
              {[
                { label: 'Sous-total travaux', val: subtotal },
                { label: `Frais généraux (${settings.overheadPct}%)`, val: overhead },
                { label: `Marge bénéficiaire (${settings.profitPct}%)`, val: profit },
                { label: `Contingences (${settings.contingencyPct}%)`, val: contingency },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-medium text-slate-700">{formatCurrency(r.val)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-1.5">
                <span>Avant taxes</span>
                <span>{formatCurrency(pretax)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">TPS (5%)</span>
                <span className="text-slate-500">{formatCurrency(tps)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">TVQ (9,975%)</span>
                <span className="text-slate-500">{formatCurrency(tvq)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t-2 border-slate-200 pt-2 mt-1">
                <span>TOTAL TTC</span>
                <span className="text-brand-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 mb-4">
              <p className="font-semibold mb-1">Notes de terrain</p>
              <p>{project.notes}</p>
            </div>
          )}

          <div className="text-xs text-slate-400 space-y-0.5">
            <p>• Soumission valide 30 jours. Prix en CAD, taxes en sus selon les taux indiqués.</p>
            <p>• Termes de paiement: 30% à l'acceptation · 40% mi-chantier · 30% à la livraison.</p>
            <p>• Les travaux supplémentaires hors de la portée définie feront l'objet d'un avenant.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Estimator ───────────────────────────────────────────────────────────
export default function Estimator() {
  const [step, setStep] = useState(0)

  const [project, setProject] = useState({
    clientId: '', projectType: '', title: '', address: '', startDate: '', duration: '', notes: '',
  })
  const [rooms, setRooms] = useState([newRoom(1)])
  const [items, setItems] = useState([])
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, showMaterialDetail: true, showRooms: true, showUnitPrices: false })

  const updateProject = useCallback((field, value) => setProject(p => ({ ...p, [field]: value })), [])

  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0)
  const overhead = subtotal * settings.overheadPct / 100
  const profit = (subtotal + overhead) * settings.profitPct / 100
  const contingency = (subtotal + overhead + profit) * settings.contingencyPct / 100
  const pretax = subtotal + overhead + profit + contingency
  const total = pretax * (1 + settings.tpsPct / 100 + settings.tvqPct / 100)

  const canNext = [
    project.clientId && project.projectType && project.title,
    rooms.length > 0 && rooms.every(r => r.length && r.width),
    items.length > 0,
    true,
    true,
  ]

  const validRooms = rooms.filter(r => r.length && r.width)

  return (
    <div className="flex flex-col min-h-0">
      {/* Progress header */}
      <div className="card mb-5 p-4">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const isActive = step === i
            const isDone = step > i
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => isDone && setStep(i)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive ? 'bg-brand-500 text-white shadow-sm' :
                    isDone ? 'bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200' :
                    'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  {isDone ? <CheckCircle size={15} /> : <Icon size={15} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />}
              </div>
            )
          })}

          {/* Live total */}
          {total > 0 && (
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-xs text-slate-400">Total estimé TTC</p>
              <p className="text-lg font-bold text-brand-600">{formatCurrency(total)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1">
        {step === 0 && <StepClient data={project} onChange={updateProject} />}
        {step === 1 && <StepRooms rooms={rooms} setRooms={setRooms} />}
        {step === 2 && <StepItems rooms={validRooms.length > 0 ? validRooms : rooms} items={items} setItems={setItems} />}
        {step === 3 && <StepSettings settings={settings} setSettings={setSettings} />}
        {step === 4 && <StepSummary project={project} rooms={rooms} items={items} settings={settings} />}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between pt-5 border-t border-slate-200">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className={clsx('btn-secondary', step === 0 && 'opacity-40 cursor-not-allowed')}
        >
          <ChevronLeft size={16} /> Précédent
        </button>

        <div className="flex items-center gap-2">
          {items.length > 0 && step < 4 && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Package size={13} /> {items.length} travaux · {formatCurrency(subtotal)} (avant majorations)
            </div>
          )}
        </div>

        {step < 4 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext[step]}
            className={clsx('btn-primary', !canNext[step] && 'opacity-40 cursor-not-allowed')}
          >
            Suivant <ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn-primary">
            <FileText size={16} /> Enregistrer & Envoyer
          </button>
        )}
      </div>
    </div>
  )
}
