import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Trash2, Check, Printer, Save,
  UserRound, Ruler, Hammer, ReceiptText, ChevronDown, Home, X,
  SlidersHorizontal, PartyPopper, Pencil, Package, Search,
} from 'lucide-react'
import FormModal from '../ui/FormModal'
import { useData } from '../../store/DataContext'
import { CATALOG, CATEGORIES, CATEGORY_META, ROOM_PRESETS, PROJECT_TYPE_CHIPS } from '../../data/estimatorCatalog'
import { formatCurrency } from '../../utils/formatters'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import {
  DRAFT_KEY, SAVED_KEY, emptyDraft, computeRoom, autoQtyForItem,
  lineTotal, computeTotals, nextQuoteNumber, fromMeters,
} from './estimatorUtils'
import Stepper from './Stepper'
import clsx from 'clsx'

const STEPS = [
  { label: 'Le client', icon: UserRound },
  { label: 'Les pièces', icon: Ruler },
  { label: 'Les travaux', icon: Hammer },
  { label: 'Le devis', icon: ReceiptText },
]

// ─── Étape 1 : Le client ──────────────────────────────────────────────────────
function StepClient({ draft, update }) {
  const { data } = useData()
  const clients = data.clients
  const c = draft.client

  const pickExisting = (client) => {
    update('client', {
      mode: 'existing', clientId: client.id,
      name: client.name, phone: client.phone, address: client.address,
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-800">Pour qui est ce devis ?</p>
        <p className="text-sm text-slate-500 mt-1">Choisissez un client existant ou entrez un nouveau nom</p>
      </div>

      {/* Choix du mode */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => update('client', { ...c, mode: 'new', clientId: '' })}
          className={clsx(
            'p-5 rounded-2xl border-2 text-center transition-all',
            c.mode === 'new'
              ? 'border-brand-500 bg-brand-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          )}
        >
          <div className="text-3xl mb-2">🆕</div>
          <p className="font-bold text-slate-800">Nouveau client</p>
          <p className="text-xs text-slate-500 mt-1">Je tape son nom</p>
        </button>
        <button
          onClick={() => update('client', { ...c, mode: 'existing' })}
          className={clsx(
            'p-5 rounded-2xl border-2 text-center transition-all',
            c.mode === 'existing'
              ? 'border-brand-500 bg-brand-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          )}
        >
          <div className="text-3xl mb-2">📇</div>
          <p className="font-bold text-slate-800">Client existant</p>
          <p className="text-xs text-slate-500 mt-1">Je le choisis dans ma liste</p>
        </button>
      </div>

      {/* Nouveau client : formulaire simple */}
      {c.mode === 'new' && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom du client *</label>
            <input
              value={c.name}
              onChange={e => update('client', { ...c, name: e.target.value })}
              placeholder="ex: Jean Tremblay"
              className="input text-base py-3"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Téléphone <span className="font-normal text-slate-400">(facultatif)</span></label>
            <input
              value={c.phone}
              onChange={e => update('client', { ...c, phone: e.target.value })}
              placeholder="ex: 514-555-1234"
              inputMode="tel"
              className="input text-base py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Adresse des travaux <span className="font-normal text-slate-400">(facultatif)</span></label>
            <input
              value={c.address}
              onChange={e => update('client', { ...c, address: e.target.value })}
              placeholder="ex: 455 rue des Érables, Laval"
              className="input text-base py-3"
            />
          </div>
        </div>
      )}

      {/* Client existant : liste tactile */}
      {c.mode === 'existing' && (
        <div className="space-y-2">
          {clients.filter(cl => cl.status === 'Actif').map(cl => (
            <button
              key={cl.id}
              onClick={() => pickExisting(cl)}
              className={clsx(
                'w-full card flex items-center gap-3 py-4 text-left transition-all',
                c.clientId === cl.id ? 'border-2 border-brand-500 bg-brand-50/50' : 'hover:border-slate-300'
              )}
            >
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                c.clientId === cl.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
              )}>
                {c.clientId === cl.id ? <Check size={20} /> : cl.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{cl.name}</p>
                <p className="text-xs text-slate-500 truncate">{cl.contact} · {cl.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Type de travaux */}
      {(c.name || c.clientId) && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3 text-center">Quel genre de travaux ?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PROJECT_TYPE_CHIPS.map(t => (
              <button
                key={t.label}
                onClick={() => update('projectType', t.label)}
                className={clsx(
                  'flex items-center gap-2.5 px-4 py-3.5 rounded-xl border-2 text-sm font-semibold transition-all',
                  draft.projectType === t.label
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Étape 2 : Les pièces ─────────────────────────────────────────────────────
function StepRooms({ draft, update }) {
  const { rooms, unit } = draft
  const [showPresets, setShowPresets] = useState(rooms.length === 0)

  const dimStep = unit === 'pi' ? 0.5 : 0.1

  const addRoomFromPreset = (preset) => {
    const conv = (m) => +(fromMeters(m, unit)).toFixed(1)
    const count = rooms.filter(r => r.baseName === preset.label).length
    update('rooms', [...rooms, {
      id: Date.now(),
      baseName: preset.label,
      name: count > 0 ? `${preset.label} ${count + 1}` : preset.label,
      emoji: preset.emoji,
      length: String(conv(preset.length)),
      width: String(conv(preset.width)),
      height: String(conv(preset.height)),
    }])
    setShowPresets(false)
  }

  const updateRoom = (id, field, value) =>
    update('rooms', rooms.map(r => r.id === id ? { ...r, [field]: value } : r))

  const removeRoom = (id) => {
    update('rooms', rooms.filter(r => r.id !== id))
    // retirer aussi les travaux liés à cette pièce
    update('items', draft.items.filter(it => it.roomId !== id))
  }

  const toggleUnit = () => {
    const newUnit = unit === 'pi' ? 'm' : 'pi'
    const factor = unit === 'pi' ? 0.3048 : 1 / 0.3048
    update('unit', newUnit)
    update('rooms', rooms.map(r => ({
      ...r,
      length: r.length ? String(+((parseFloat(r.length) || 0) * factor).toFixed(1)) : '',
      width:  r.width  ? String(+((parseFloat(r.width)  || 0) * factor).toFixed(1)) : '',
      height: r.height ? String(+((parseFloat(r.height) || 0) * factor).toFixed(1)) : '',
    })))
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-800">Quelles pièces sont à rénover ?</p>
        <p className="text-sm text-slate-500 mt-1">Touchez une pièce pour l'ajouter, puis ajustez les mesures avec les boutons − et +</p>
      </div>

      {/* Choix des unités */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border-2 border-slate-200 overflow-hidden">
          {['pi', 'm'].map(u => (
            <button
              key={u}
              onClick={() => unit !== u && toggleUnit()}
              className={clsx(
                'px-5 py-2 text-sm font-bold transition-colors',
                unit === u ? 'bg-brand-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
              )}
            >
              {u === 'pi' ? 'Pieds (pi)' : 'Mètres (m)'}
            </button>
          ))}
        </div>
      </div>

      {/* Pièces ajoutées */}
      {rooms.map(room => {
        const calc = computeRoom(room, unit)
        const floorDisplay = unit === 'pi'
          ? `${Math.round(calc.floorArea * 10.764)} pi²`
          : `${calc.floorArea.toFixed(1)} m²`
        return (
          <div key={room.id} className="card border-2 border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{room.emoji}</span>
              <input
                value={room.name}
                onChange={e => updateRoom(room.id, 'name', e.target.value)}
                className="font-bold text-slate-800 text-lg bg-transparent outline-none flex-1 min-w-0 rounded-lg px-2 py-1 hover:bg-slate-50 focus:bg-slate-50"
              />
              <button
                onClick={() => removeRoom(room.id)}
                className="p-2.5 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                aria-label="Retirer cette pièce"
              >
                <Trash2 size={19} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { field: 'length', label: 'Longueur' },
                { field: 'width', label: 'Largeur' },
                { field: 'height', label: 'Hauteur du plafond' },
              ].map(d => (
                <div key={d.field}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 text-center uppercase tracking-wide">{d.label}</label>
                  <Stepper
                    value={room[d.field]}
                    onChange={v => updateRoom(room.id, d.field, v)}
                    step={dimStep}
                    suffix={unit}
                    big
                  />
                </div>
              ))}
            </div>

            {calc.floorArea > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl py-2.5">
                <span>📐</span>
                <span>Surface de plancher : <strong className="text-slate-700">{floorDisplay}</strong></span>
              </div>
            )}
          </div>
        )
      })}

      {/* Ajouter une pièce */}
      {showPresets || rooms.length === 0 ? (
        <div>
          {rooms.length > 0 && (
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-semibold text-slate-700">Ajouter une autre pièce :</p>
              <button onClick={() => setShowPresets(false)} className="text-slate-400 p-1"><X size={18} /></button>
            </div>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {ROOM_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => addRoomFromPreset(p)}
                className="flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 active:bg-brand-100 transition-all"
              >
                <span className="text-3xl">{p.emoji}</span>
                <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowPresets(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-semibold hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/40 transition-all"
        >
          ➕ Ajouter une autre pièce
        </button>
      )}
    </div>
  )
}

// ─── Étape 3 : Les travaux ────────────────────────────────────────────────────
function StepWorks({ draft, update }) {
  const { rooms, items, unit } = draft
  const { data } = useData()
  const [activeRoomId, setActiveRoomId] = useState(rooms[0]?.id ?? null)
  const [openCategory, setOpenCategory] = useState(null)
  const [editItem, setEditItem] = useState(null)      // item en cours de modification
  const [showCustom, setShowCustom] = useState(false) // formulaire ligne personnalisée
  const [showInventory, setShowInventory] = useState(false)
  const [invSearch, setInvSearch] = useState('')

  useEffect(() => {
    if (!rooms.find(r => r.id === activeRoomId) && rooms.length > 0) {
      setActiveRoomId(rooms[0].id)
    }
  }, [rooms, activeRoomId])

  const activeRoom = rooms.find(r => r.id === activeRoomId)
  const roomCalc = activeRoom ? computeRoom(activeRoom, unit) : null
  const roomItems = items.filter(it => it.roomId === activeRoomId)

  const itemInRoom = (catalogId) => roomItems.find(it => it.catalogId === catalogId)

  const toggleWork = (catalogItem) => {
    const existing = itemInRoom(catalogItem.id)
    if (existing) {
      update('items', items.filter(it => it.id !== existing.id))
      return
    }
    const aqty = autoQtyForItem(catalogItem, roomCalc)
    update('items', [...items, {
      id: Date.now() + Math.random(),
      catalogId: catalogItem.id,
      description: catalogItem.label,
      roomId: activeRoomId,
      unit: catalogItem.unit,
      qty: aqty !== null && aqty > 0 ? String(aqty) : '1',
      unitMat: String(catalogItem.unitMat),
      unitLabor: String(catalogItem.unitLabor),
    }])
  }

  const updateItemQty = (id, qty) =>
    update('items', items.map(it => it.id === id ? { ...it, qty } : it))

  const removeItem = (id) => update('items', items.filter(it => it.id !== id))

  // Ligne personnalisée : quantité manuelle OU calculée depuis une base de
  // mesure de la pièce (linéaire, murs, plancher, plafond)
  const addCustomLine = (values) => {
    const { qty, unit: newUnit } = applyBasis(values, activeRoomId)
    update('items', [...items, {
      id: Date.now() + Math.random(),
      catalogId: null,
      description: values.description,
      roomId: activeRoomId,
      unit: newUnit,
      qty,
      unitMat: String(values.unitMat || 0),
      unitLabor: String(values.unitLabor || 0),
    }])
  }

  // Article pris dans l'inventaire du module Matériaux
  const addFromInventory = (material) => {
    update('items', [...items, {
      id: Date.now() + Math.random(),
      catalogId: null,
      description: material.name,
      roomId: activeRoomId,
      unit: material.unit,
      qty: '1',
      unitMat: String(material.unitCost),
      unitLabor: '0',
    }])
  }

  // Bases de mesure disponibles : la quantité est recalculée depuis les
  // dimensions de la pièce selon la base choisie (linéaire, murs, plancher…)
  const MEASURE_BASIS = {
    'Mesure linéaire (périmètre de la pièce)': { key: 'perimeter', unit: 'm lin.' },
    'Surface des murs (m²)': { key: 'wallArea', unit: 'm²' },
    'Surface du plancher (m²)': { key: 'floorArea', unit: 'm²' },
    'Surface du plafond (m²)': { key: 'ceilArea', unit: 'm²' },
  }
  const basisOptions = ['Quantité manuelle (je la tape moi-même)', ...Object.keys(MEASURE_BASIS)]

  // Applique la base de mesure choisie : recalcule la quantité depuis les
  // dimensions de la pièce de l'item, sinon garde la quantité saisie
  const applyBasis = (values, roomId) => {
    const basis = MEASURE_BASIS[values.basis]
    if (!basis) return { qty: String(values.qty || 1), unit: values.unit || 'unité' }
    const room = rooms.find(r => r.id === roomId)
    if (!room) return { qty: String(values.qty || 1), unit: basis.unit }
    const calc = computeRoom(room, unit)
    return { qty: String(+(calc[basis.key] || 0).toFixed(1)), unit: basis.unit }
  }

  // Modification complète d'un item (description, qté, unité, prix, mesure)
  const saveEdit = (values) => {
    const { qty, unit: newUnit } = applyBasis(values, editItem.roomId)
    update('items', items.map(it => it.id === editItem.id ? {
      ...it,
      description: values.description,
      unit: MEASURE_BASIS[values.basis] ? newUnit : (values.unit || it.unit),
      qty,
      unitMat: String(values.unitMat),
      unitLabor: String(values.unitLabor),
    } : it))
  }

  const editFields = [
    { name: 'description', label: 'Description', required: true, colSpan: 2 },
    { name: 'basis', label: 'Base de mesure', type: 'select', options: basisOptions, colSpan: 2, default: 'Quantité manuelle (je la tape moi-même)' },
    { name: 'qty', label: 'Quantité (si manuelle)', type: 'number', step: '0.1', required: true },
    { name: 'unit', label: 'Unité (si manuelle)', placeholder: 'ex: m², unité, hre, forfait' },
    { name: 'unitMat', label: 'Prix matériaux ($ / unité)', type: 'number', step: '0.01' },
    { name: 'unitLabor', label: "Prix main-d'œuvre ($ / unité)", type: 'number', step: '0.01' },
  ]

  const filteredInventory = data.materials.filter(m =>
    m.name.toLowerCase().includes(invSearch.toLowerCase()) ||
    (m.category || '').toLowerCase().includes(invSearch.toLowerCase())
  )

  // Prix estimé pour un élément du catalogue dans la pièce active
  const previewPrice = (catalogItem) => {
    const aqty = autoQtyForItem(catalogItem, roomCalc)
    const q = aqty !== null && aqty > 0 ? aqty : 1
    return q * (catalogItem.unitMat + catalogItem.unitLabor)
  }

  const roomTotal = (roomId) =>
    items.filter(it => it.roomId === roomId).reduce((s, it) => s + lineTotal(it), 0)

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-800">Quels travaux faut-il faire ?</p>
        <p className="text-sm text-slate-500 mt-1">
          Touchez les travaux du catalogue (prix calculé selon les mesures), ajoutez une <strong>ligne personnalisée</strong> à votre prix,
          ou piochez dans <strong>votre inventaire</strong>. Le crayon ✏️ permet de tout modifier.
        </p>
      </div>

      {/* Onglets pièces */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {rooms.map(r => {
          const count = items.filter(it => it.roomId === r.id).length
          return (
            <button
              key={r.id}
              onClick={() => { setActiveRoomId(r.id); setOpenCategory(null) }}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0',
                activeRoomId === r.id
                  ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600'
              )}
            >
              <span className="text-lg">{r.emoji}</span>
              {r.name}
              {count > 0 && (
                <span className={clsx(
                  'text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center',
                  activeRoomId === r.id ? 'bg-white text-brand-600' : 'bg-brand-100 text-brand-600'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Travaux déjà choisis pour cette pièce */}
      {roomItems.length > 0 && (
        <div className="card bg-emerald-50/50 border-2 border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-slate-800 text-sm">
              ✅ Travaux choisis — {activeRoom?.name}
            </p>
            <p className="font-bold text-emerald-700">{formatCurrency(roomTotal(activeRoomId))}</p>
          </div>
          <div className="space-y-2.5">
            {roomItems.map(it => (
              <div key={it.id} className="bg-white rounded-xl p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-medium text-slate-700">{it.description}</p>
                  <p className="text-[10px] text-slate-400">
                    {formatCurrency(parseFloat(it.unitMat) || 0)} mat. + {formatCurrency(parseFloat(it.unitLabor) || 0)} M.O. / {it.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-36">
                    <Stepper
                      value={it.qty}
                      onChange={v => updateItemQty(it.id, v)}
                      step={1}
                      suffix={it.unit}
                    />
                  </div>
                  <p className="text-sm font-bold text-slate-800 w-20 text-right">{formatCurrency(lineTotal(it))}</p>
                  <button
                    onClick={() => setEditItem(it)}
                    className="p-2 text-slate-300 hover:text-brand-500 transition-colors"
                    aria-label="Modifier"
                    title="Modifier description, quantité et prix"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="p-2 text-slate-300 hover:text-red-400 transition-colors"
                    aria-label="Retirer"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ajouts manuels : sans passer par la superficie de la pièce */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowCustom(true)}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-slate-300 font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/40 transition-all text-sm"
        >
          <Pencil size={17} /> Ligne personnalisée
        </button>
        <button
          onClick={() => { setShowInventory(true); setInvSearch('') }}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-slate-300 font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/40 transition-all text-sm"
        >
          <Package size={17} /> De mon inventaire
        </button>
      </div>

      {/* Catégories de travaux */}
      <div className="space-y-2.5">
        {CATEGORIES.map(cat => {
          const meta = CATEGORY_META[cat] ?? { emoji: '🔧', desc: '' }
          const catItems = CATALOG.filter(c => c.category === cat)
          const selectedCount = roomItems.filter(it => catItems.some(c => c.id === it.catalogId)).length
          const isOpen = openCategory === cat
          return (
            <div key={cat} className={clsx('rounded-2xl border-2 overflow-hidden transition-colors', isOpen ? 'border-brand-300 bg-white' : 'border-slate-200 bg-white')}>
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">{meta.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800">{cat}</p>
                  <p className="text-xs text-slate-400 truncate">{meta.desc}</p>
                </div>
                {selectedCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full px-2.5 py-1 flex-shrink-0">
                    {selectedCount} choisi{selectedCount > 1 ? 's' : ''}
                  </span>
                )}
                <ChevronDown size={20} className={clsx('text-slate-400 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {catItems.map(ci => {
                    const selected = !!itemInRoom(ci.id)
                    const price = previewPrice(ci)
                    return (
                      <button
                        key={ci.id}
                        onClick={() => toggleWork(ci)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors',
                          selected ? 'bg-emerald-50' : 'hover:bg-slate-50 active:bg-slate-100'
                        )}
                      >
                        <div className={clsx(
                          'w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                        )}>
                          {selected && <Check size={16} className="text-white" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={clsx('text-sm font-medium leading-snug', selected ? 'text-emerald-800' : 'text-slate-700')}>
                            {ci.label}
                          </p>
                          {ci.note && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{ci.note}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={clsx('text-sm font-bold', selected ? 'text-emerald-700' : 'text-slate-700')}>
                            ≈ {formatCurrency(price)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {ci.autoQty ? 'pour cette pièce' : `par ${ci.unit}`}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modale : modifier un item */}
      {editItem && (
        <FormModal
          title="Modifier ce travail"
          fields={editFields}
          initialValues={{
            description: editItem.description,
            qty: editItem.qty,
            unit: editItem.unit,
            unitMat: editItem.unitMat,
            unitLabor: editItem.unitLabor,
          }}
          onSubmit={saveEdit}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Modale : ligne personnalisée */}
      {showCustom && (
        <FormModal
          title={`Ligne personnalisée — ${activeRoom?.name ?? ''}`}
          fields={[
            { name: 'description', label: 'Description du travail ou matériau', required: true, colSpan: 2, placeholder: 'ex: Location nacelle 26 pi — 3 jours' },
            { name: 'basis', label: 'Base de mesure', type: 'select', options: basisOptions, colSpan: 2, default: 'Quantité manuelle (je la tape moi-même)' },
            { name: 'qty', label: 'Quantité (si manuelle)', type: 'number', step: '0.1', default: 1, required: true },
            { name: 'unit', label: 'Unité (si manuelle)', placeholder: 'ex: unité, hre, jour, forfait', default: 'unité' },
            { name: 'unitMat', label: 'Prix matériaux ($ / unité)', type: 'number', step: '0.01', default: 0 },
            { name: 'unitLabor', label: "Prix main-d'œuvre ($ / unité)", type: 'number', step: '0.01', default: 0 },
          ]}
          onSubmit={addCustomLine}
          onClose={() => setShowCustom(false)}
          submitLabel="Ajouter au devis"
        />
      )}

      {/* Modale : choisir dans l'inventaire */}
      {showInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowInventory(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Mes matériaux en inventaire</h3>
              <button onClick={() => setShowInventory(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={invSearch}
                  onChange={e => setInvSearch(e.target.value)}
                  placeholder="Rechercher un article…"
                  className="input pl-8"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {filteredInventory.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Aucun article trouvé</p>
              )}
              {filteredInventory.map(m => (
                <button
                  key={m.id}
                  onClick={() => { addFromInventory(m); setShowInventory(false) }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-brand-50 transition-colors"
                >
                  <Package size={16} className="text-slate-300 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.category} · {m.stock} {m.unit} en stock</p>
                  </div>
                  <p className="text-sm font-bold text-slate-700 flex-shrink-0">{formatCurrency(m.unitCost)} <span className="text-[10px] font-normal text-slate-400">/ {m.unit}</span></p>
                </button>
              ))}
            </div>
            <p className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
              L'article s'ajoute avec 1 unité au coût de votre inventaire — ajustez ensuite la quantité et la main-d'œuvre avec le crayon.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Étape 4 : Le devis ───────────────────────────────────────────────────────
function StepQuote({ draft, update, onSave }) {
  const { rooms, items, settings, client, unit } = draft
  const [showAdjust, setShowAdjust] = useState(false)
  const [companySettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const totals = computeTotals(items, settings)

  const byRoom = rooms
    .map(r => ({
      room: r,
      items: items.filter(it => it.roomId === r.id),
    }))
    .filter(g => g.items.length > 0)

  const today = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-5">
      {/* Total en gros */}
      <div className="bg-brand-500 text-white rounded-2xl p-6 text-center shadow-md no-print">
        <p className="text-sm font-medium text-white/80">Prix total du devis, taxes incluses</p>
        <p className="text-4xl font-extrabold mt-1">{formatCurrency(totals.total)}</p>
        <p className="text-xs text-white/70 mt-2">
          Travaux {formatCurrency(totals.subtotal)} + frais et marge {formatCurrency(totals.overhead + totals.profit + totals.contingency)} + taxes {formatCurrency(totals.tps + totals.tvq)}
        </p>
      </div>

      {/* Boutons d'action */}
      <div className="grid grid-cols-2 gap-3 no-print">
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2.5 py-4 rounded-2xl border-2 border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <Printer size={20} /> Imprimer / PDF
        </button>
        <button
          onClick={onSave}
          className="flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-emerald-500 font-bold text-white hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save size={20} /> Enregistrer le devis
        </button>
      </div>

      {/* Ajustements optionnels */}
      <div className="card p-0 overflow-hidden no-print">
        <button
          onClick={() => setShowAdjust(!showAdjust)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
        >
          <SlidersHorizontal size={18} className="text-slate-400" />
          <div className="flex-1">
            <p className="font-semibold text-slate-700 text-sm">Ajuster ma marge et mes frais <span className="text-slate-400 font-normal">(facultatif)</span></p>
            <p className="text-xs text-slate-400">Frais généraux {settings.overheadPct}% · Profit {settings.profitPct}% · Imprévus {settings.contingencyPct}%</p>
          </div>
          <ChevronDown size={18} className={clsx('text-slate-400 transition-transform', showAdjust && 'rotate-180')} />
        </button>
        {showAdjust && (
          <div className="border-t border-slate-100 p-4 space-y-5">
            {[
              { key: 'overheadPct', label: 'Frais généraux', desc: 'Camion, bureau, assurances, licence RBQ…', max: 30 },
              { key: 'profitPct', label: 'Mon profit', desc: 'Ce que l\'entreprise garde sur ce contrat', max: 40 },
              { key: 'contingencyPct', label: 'Coussin pour imprévus', desc: 'Surprises derrière les murs, hausse des prix…', max: 25 },
            ].map(f => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{f.label}</p>
                    <p className="text-xs text-slate-400">{f.desc}</p>
                  </div>
                  <span className="text-lg font-bold text-brand-600 w-14 text-right">{settings[f.key]}%</span>
                </div>
                <input
                  type="range" min={0} max={f.max} step={1}
                  value={settings[f.key]}
                  onChange={e => update('settings', { ...settings, [f.key]: parseFloat(e.target.value) })}
                  className="w-full accent-brand-500 h-2"
                />
              </div>
            ))}
            <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-100">
              Les taxes TPS (5%) et TVQ (9,975%) du Québec sont ajoutées automatiquement.
            </p>
          </div>
        )}
      </div>

      {/* ─── Le devis imprimable ─── */}
      <div id="devis" className="card">
        <div className="flex flex-wrap justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                {companySettings.logoDataUrl
                  ? <img src={companySettings.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
                  : (companySettings.companyName || 'CP').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-800">{companySettings.companyName || 'Votre entreprise'}</p>
                <p className="text-xs text-slate-400">
                  {[companySettings.rbq && `RBQ ${companySettings.rbq}`, companySettings.neq && `NEQ ${companySettings.neq}`].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {[companySettings.address, companySettings.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-brand-500">DEVIS</p>
            <p className="text-xs text-slate-500 mt-1">Fait le {today}</p>
            <p className="text-xs text-slate-500">Valide 30 jours</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-slate-50 rounded-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Préparé pour</p>
          <p className="font-bold text-slate-800 text-lg">{client.name || '—'}</p>
          {client.phone && <p className="text-sm text-slate-600">{client.phone}</p>}
          {client.address && <p className="text-sm text-slate-500">{client.address}</p>}
          {draft.projectType && <p className="text-sm font-medium text-brand-600 mt-1.5">Travaux : {draft.projectType}</p>}
        </div>

        {byRoom.map(({ room, items: roomItems }) => {
          const calc = computeRoom(room, unit)
          const dims = `${room.length} × ${room.width} ${unit}, plafond ${room.height} ${unit}`
          return (
            <div key={room.id} className="mb-5">
              <div className="flex items-center justify-between mb-2 bg-brand-50 rounded-lg px-3 py-2">
                <p className="font-bold text-slate-800">
                  {room.emoji} {room.name}
                  <span className="font-normal text-xs text-slate-400 ml-2">({dims})</span>
                </p>
                <p className="font-bold text-slate-700">
                  {formatCurrency(roomItems.reduce((s, it) => s + lineTotal(it), 0))}
                </p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {roomItems.map(it => (
                    <tr key={it.id} className="border-b border-slate-50">
                      <td className="py-2 text-slate-700 text-sm">{it.description}</td>
                      <td className="py-2 text-right text-xs text-slate-400 whitespace-nowrap px-3">
                        {parseFloat(it.qty).toLocaleString('fr-CA')} {it.unit}
                      </td>
                      <td className="py-2 text-right font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(lineTotal(it))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {/* Totaux */}
        <div className="flex justify-end mt-6">
          <div className="w-full sm:w-80 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Travaux (matériaux + main-d'œuvre)</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Frais généraux, marge et imprévus</span>
              <span className="font-medium">{formatCurrency(totals.overhead + totals.profit + totals.contingency)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-1.5">
              <span>Avant taxes</span>
              <span>{formatCurrency(totals.pretax)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>TPS (5 %)</span>
              <span>{formatCurrency(totals.tps)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>TVQ (9,975 %)</span>
              <span>{formatCurrency(totals.tvq)}</span>
            </div>
            <div className="flex justify-between text-xl font-extrabold border-t-2 border-slate-300 pt-2 mt-1">
              <span>TOTAL</span>
              <span className="text-brand-600">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>

        {draft.notes && (
          <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <p className="font-semibold">Notes</p>
            <p>{draft.notes}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
          <p>• Prix en dollars canadiens. Devis valide 30 jours.</p>
          <p>• Paiement : 30 % à l'acceptation, 40 % à la mi-chantier, 30 % à la fin des travaux.</p>
          <p>• Tout travail imprévu (découvert en cours de chantier) sera discuté avec vous avant d'être fait.</p>
          <div className="grid grid-cols-2 gap-8 pt-8">
            <div className="border-t border-slate-300 pt-1 text-slate-500">Signature du client</div>
            <div className="border-t border-slate-300 pt-1 text-slate-500">Signature de l'entrepreneur</div>
          </div>
        </div>
      </div>

      {/* Note champ libre */}
      <div className="card no-print">
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Ajouter une note au devis <span className="font-normal text-slate-400">(facultatif)</span>
        </label>
        <textarea
          value={draft.notes}
          onChange={e => update('notes', e.target.value)}
          rows={2}
          placeholder="ex: Le client fournit lui-même la peinture. Travaux possibles à partir de septembre."
          className="input resize-none text-base"
        />
      </div>
    </div>
  )
}

// ─── Assistant principal ──────────────────────────────────────────────────────
export default function EstimatorWizard() {
  const navigate = useNavigate()
  const { data, add } = useData()
  const [draft, setDraft] = useLocalStorage(DRAFT_KEY, null)
  const [saved, setSaved] = useLocalStorage(SAVED_KEY, [])
  const [justSaved, setJustSaved] = useState(false)

  // initialiser le brouillon s'il n'existe pas
  useEffect(() => {
    if (!draft) setDraft(emptyDraft())
  }, [draft, setDraft])

  const update = (field, value) => setDraft(d => ({ ...d, [field]: value }))
  const step = draft?.step ?? 0
  const setStep = (s) => update('step', s)

  const totals = useMemo(
    () => draft ? computeTotals(draft.items, draft.settings) : null,
    [draft]
  )

  if (!draft) return null

  // Validation de chaque étape, avec message d'aide plutôt que blocage muet
  const stepReady = [
    Boolean(draft.client.name || draft.client.clientId),
    draft.rooms.length > 0 && draft.rooms.every(r => parseFloat(r.length) > 0 && parseFloat(r.width) > 0),
    draft.items.length > 0,
    true,
  ]
  const stepHint = [
    'Choisissez ou entrez un client pour continuer',
    'Ajoutez au moins une pièce avec ses mesures',
    'Touchez au moins un travail à faire',
    '',
  ]

  const handleSave = () => {
    const quote = {
      id: Date.now(),
      number: nextQuoteNumber(saved),
      clientName: draft.client.name,
      clientPhone: draft.client.phone,
      address: draft.client.address,
      projectType: draft.projectType,
      notes: draft.notes,
      unit: draft.unit,
      rooms: draft.rooms,
      items: draft.items,
      settings: draft.settings,
      total: totals.total,
      savedAt: new Date().toISOString(),
    }
    setSaved(prev => [...prev, quote])

    // Le devis apparaît aussi dans le module Soumissions, pour un suivi
    // centralisé (statut Brouillon jusqu'à envoi/acceptation).
    const clientObj = data.clients.find(cl => cl.id === Number(draft.client.clientId))
    add('quotes', {
      number: quote.number,
      title: draft.projectType ? `${draft.projectType} — ${draft.client.name}` : `Devis — ${draft.client.name}`,
      clientId: clientObj?.id ?? null,
      client: draft.client.name,
      date: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: 'Brouillon',
      subtotal: totals.pretax,
      tps: totals.tps,
      tvq: totals.tvq,
      total: totals.total,
      estimator: '',
      items: [],
    })

    setDraft(null)
    setJustSaved(true)
    setTimeout(() => navigate('/estimateur'), 1600)
  }

  if (justSaved) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <PartyPopper size={36} className="text-emerald-600" />
        </div>
        <p className="text-xl font-bold text-slate-800">Devis enregistré !</p>
        <p className="text-sm text-slate-500 mt-2">Vous le retrouverez dans « Mes devis enregistrés ».</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Barre de progression */}
      <div className="mb-6 no-print">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/estimateur')}
            className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            <X size={16} /> Quitter
          </button>
          <p className="text-sm font-semibold text-slate-500">
            Étape {step + 1} sur {STEPS.length} — <span className="text-slate-800">{STEPS[step].label}</span>
          </p>
          <span className="w-14" />
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              className={clsx(
                'h-2.5 rounded-full flex-1 transition-all',
                i < step ? 'bg-emerald-400 cursor-pointer' : i === step ? 'bg-brand-500' : 'bg-slate-200'
              )}
              aria-label={s.label}
            />
          ))}
        </div>
      </div>

      {/* Contenu de l'étape */}
      {step === 0 && <StepClient draft={draft} update={update} />}
      {step === 1 && <StepRooms draft={draft} update={update} />}
      {step === 2 && <StepWorks draft={draft} update={update} />}
      {step === 3 && <StepQuote draft={draft} update={update} onSave={handleSave} />}

      {/* Barre de navigation fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 z-40 no-print lg:pl-64">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
            >
              <ChevronLeft size={19} /> Retour
            </button>
          )}

          {totals && totals.total > 0 && step < 3 && (
            <div className="text-center flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total en cours</p>
              <p className="font-extrabold text-brand-600 text-lg leading-tight">{formatCurrency(totals.total)}</p>
            </div>
          )}
          {(!totals || totals.total === 0 || step === 3) && <div className="flex-1" />}

          {step < 3 ? (
            <button
              onClick={() => stepReady[step] && setStep(step + 1)}
              disabled={!stepReady[step]}
              className={clsx(
                'flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-xl font-bold text-white transition-colors flex-shrink-0',
                stepReady[step]
                  ? 'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 shadow-sm'
                  : 'bg-slate-300 cursor-not-allowed'
              )}
            >
              Continuer <ChevronRight size={19} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm flex-shrink-0"
            >
              <Save size={18} /> Enregistrer
            </button>
          )}
        </div>
        {!stepReady[step] && stepHint[step] && (
          <p className="text-center text-xs text-slate-400 mt-1.5">{stepHint[step]}</p>
        )}
      </div>
    </div>
  )
}
