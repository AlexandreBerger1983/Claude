// Devis de CONSTRUCTION NEUVE.
//
// Rien à voir avec la rénovation, qui se découpe par pièce et par travail :
// une maison neuve se chiffre par division normalisée (01 Exigences
// générales, 04 Béton, 06 Structure…), chaque ligne portant séparément ses
// matériaux et ses heures, et chaque ligne pouvant être marquée « Exclus »
// pour figurer au devis sans être facturée.
//
// Le module reprend le modèle de l'entreprise à la ligne près ; le moteur de
// calcul (neufCosting.js) est vérifié contre une soumission réelle.
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ChevronDown, X, UserRound, Building2, ReceiptText,
  Plus, Trash2, Check, Ban, PartyPopper, Printer, Save, Search, Percent,
} from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../../store/DataContext'
import { useLocalStorage, readStorage, writeStorage } from '../../hooks/useLocalStorage'
import { formatCurrency } from '../../utils/formatters'
import { SAVED_KEY, nextQuoteNumber } from './estimatorUtils'
import { QUOTE_VALIDITY_DAYS } from '../../data/legalTerms'
import QuoteLegalFooter from '../quotes/QuoteLegalFooter'
import AvisNouveauClient from './AvisNouveauClient'
import { assurerClient } from '../../data/clientsAuto'
import {
  DIVISIONS_NEUF, TAUX_HORAIRE_NEUF, TYPES_LIGNE, INCLUS, EXCLUS, cleGabarit,
} from '../../data/neufStructure'
import {
  montantLigne, totauxDivision, resumeNeuf, exclusionsDe,
  divisionsDepuisSelection, valeursInitiales,
  CONTINGENCE_PCT, PROFIT_PCT, TPS_PCT, TVQ_PCT,
} from '../../data/neufCosting'

export const NEUF_DRAFT_KEY = 'cp-devis-neuf-brouillon'

const ETAPES = [
  { label: 'Le client', icon: UserRound },
  { label: 'Les divisions', icon: Building2 },
  { label: 'Le devis', icon: ReceiptText },
]

export const brouillonNeufVide = () => ({
  type: 'neuf',
  createdAt: new Date().toISOString(),
  step: 0,
  client: { mode: '', clientId: '', name: '', phone: '', address: '' },
  projet: '',
  notes: '',
  selection: {},
  perso: {},
  taux: {
    contingencePct: CONTINGENCE_PCT,
    profitPct: PROFIT_PCT,
    tpsPct: TPS_PCT,
    tvqPct: TVQ_PCT,
  },
})

// Rouvrir un devis de maison neuve enregistré, pour le modifier.
export const brouillonDepuisDevisNeuf = (devis) => {
  const vide = brouillonNeufVide()
  if (!devis) return vide
  return {
    ...vide,
    createdAt: devis.savedAt ?? vide.createdAt,
    step: 2,
    client: {
      ...vide.client,
      mode: devis.clientId ? 'existing' : 'new',
      clientId: devis.clientId ?? '',
      name: devis.clientName ?? '',
      phone: devis.clientPhone ?? '',
      address: devis.address ?? '',
    },
    projet: devis.projectType ?? '',
    notes: devis.notes ?? '',
    selection: devis.selection ?? {},
    perso: devis.perso ?? {},
    taux: { ...vide.taux, ...(devis.taux ?? {}) },
    modifieId: devis.id,
    numero: devis.number ?? null,
  }
}

const nombre = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }

// ─── Étape 1 : le client et le projet ────────────────────────────────────────
function EtapeClient({ draft, update }) {
  const { data } = useData()
  const c = draft.client

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-800">Pour qui est cette maison ?</p>
        <p className="text-sm text-slate-500 mt-1">Un client existant, ou un nouveau nom</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => update('client', { ...c, mode: 'new', clientId: '' })}
          className={clsx('p-5 rounded-2xl border-2 text-center transition-all',
            c.mode === 'new' ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300')}
        >
          <div className="text-3xl mb-2">🆕</div>
          <p className="font-bold text-slate-800">Nouveau client</p>
        </button>
        <button
          onClick={() => update('client', { ...c, mode: 'existing' })}
          className={clsx('p-5 rounded-2xl border-2 text-center transition-all',
            c.mode === 'existing' ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300')}
        >
          <div className="text-3xl mb-2">📇</div>
          <p className="font-bold text-slate-800">Client existant</p>
        </button>
      </div>

      {c.mode === 'new' && (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom du client *</label>
            <input value={c.name} onChange={e => update('client', { ...c, name: e.target.value })}
              placeholder="ex: Félix et Tania" className="input text-base py-3" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Téléphone <span className="font-normal text-slate-400">(facultatif)</span></label>
            <input value={c.phone} onChange={e => update('client', { ...c, phone: e.target.value })}
              placeholder="ex: 514-555-1234" inputMode="tel" className="input text-base py-3" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Adresse du chantier <span className="font-normal text-slate-400">(facultatif)</span></label>
            <input value={c.address} onChange={e => update('client', { ...c, address: e.target.value })}
              placeholder="ex: 455 rue des Érables, Laval" className="input text-base py-3" />
          </div>
          <AvisNouveauClient clients={data.clients} saisie={c} />
        </div>
      )}

      {c.mode === 'existing' && (
        <div className="space-y-2">
          {data.clients.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">Aucun client enregistré pour l'instant.</p>
          )}
          {data.clients.map(cl => (
            <button key={cl.id}
              onClick={() => update('client', {
                mode: 'existing', clientId: cl.id, name: cl.name, phone: cl.phone, address: cl.address,
              })}
              className={clsx('w-full card flex items-center gap-3 py-4 text-left transition-colors',
                String(c.clientId) === String(cl.id) ? 'border-brand-500 bg-brand-50' : 'hover:border-brand-300')}
            >
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <UserRound size={19} className="text-brand-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{cl.name}</p>
                <p className="text-xs text-slate-500 truncate">{cl.address || cl.phone}</p>
              </div>
              {String(c.clientId) === String(cl.id) && <Check size={20} className="ml-auto text-brand-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description du projet</label>
          <input value={draft.projet} onChange={e => update('projet', e.target.value)}
            placeholder="ex: Construction unifamiliale — 2 étages" className="input text-base py-3" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes internes <span className="font-normal text-slate-400">(facultatif)</span></label>
          <textarea value={draft.notes} onChange={e => update('notes', e.target.value)} rows={3}
            placeholder="Particularités du terrain, échéancier, conditions…" className="input text-base py-3" />
        </div>
      </div>
    </div>
  )
}

// ─── Une ligne du catalogue ──────────────────────────────────────────────────
function LigneGabarit({ gabarit, cle, valeurs, onChoisir, onChanger, onRetirer }) {
  const choisie = Boolean(valeurs)
  const meta = TYPES_LIGNE[gabarit.type] ?? TYPES_LIGNE.mixte
  const exclue = valeurs?.statut === EXCLUS
  const m = choisie
    ? montantLigne({ ...gabarit, ...valeurs, tauxHoraire: TAUX_HORAIRE_NEUF })
    : null

  if (!choisie) {
    return (
      <button
        onClick={() => onChoisir(cle, valeursInitiales(gabarit))}
        aria-label={`Ajouter ${gabarit.libelle}`}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40 transition-colors text-left"
      >
        <Plus size={16} className="text-brand-500 flex-shrink-0" />
        <span className="text-sm text-slate-700 min-w-0 flex-1">{gabarit.libelle}</span>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {gabarit.prixU > 0 ? `${formatCurrency(gabarit.prixU)} / ${gabarit.unite}` : gabarit.unite}
        </span>
      </button>
    )
  }

  return (
    <div className={clsx('rounded-xl border-2 p-3 space-y-3',
      exclue ? 'border-amber-300 bg-amber-50' : 'border-brand-200 bg-brand-50/40')}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={clsx('text-sm font-semibold', exclue ? 'text-amber-800 line-through' : 'text-slate-800')}>
            {gabarit.libelle}
          </p>
          <p className="text-[11px] text-slate-500">{meta.label}</p>
        </div>
        <button
          onClick={() => onChanger(cle, { statut: exclue ? INCLUS : EXCLUS })}
          aria-label={exclue ? `Inclure ${gabarit.libelle}` : `Exclure ${gabarit.libelle}`}
          className={clsx('px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 flex-shrink-0 transition-colors',
            exclue ? 'bg-amber-200 text-amber-900 hover:bg-amber-300' : 'bg-white text-slate-500 border border-slate-200 hover:text-amber-700 hover:border-amber-300')}
        >
          <Ban size={13} /> {exclue ? 'Exclu' : 'Exclure'}
        </button>
        <button onClick={() => onRetirer(cle)} aria-label={`Retirer ${gabarit.libelle}`}
          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[11px] font-semibold text-slate-500 mb-1">Quantité ({gabarit.unite})</span>
          <input type="number" inputMode="decimal" value={valeurs.qte ?? ''} step="0.01"
            aria-label={`Quantité — ${gabarit.libelle}`}
            onChange={e => onChanger(cle, { qte: e.target.value })}
            onFocus={e => e.target.select()}
            className="input py-2 text-sm text-center font-semibold" />
        </label>
        {meta.materiel && (
          <label className="block">
            <span className="block text-[11px] font-semibold text-slate-500 mb-1">Prix unitaire</span>
            <input type="number" inputMode="decimal" value={valeurs.prixU ?? ''} step="0.01"
              aria-label={`Prix unitaire — ${gabarit.libelle}`}
              onChange={e => onChanger(cle, { prixU: e.target.value })}
              onFocus={e => e.target.select()}
              className="input py-2 text-sm text-center font-semibold" />
          </label>
        )}
        <label className="block">
          <span className="block text-[11px] font-semibold text-slate-500 mb-1">Heures</span>
          <input type="number" inputMode="decimal" value={valeurs.heures ?? ''} step="0.25" placeholder="0"
            aria-label={`Heures — ${gabarit.libelle}`}
            onChange={e => onChanger(cle, { heures: e.target.value })}
            onFocus={e => e.target.select()}
            className="input py-2 text-sm text-center font-semibold" />
        </label>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {m.materiel > 0 && <>Matériaux {formatCurrency(m.materiel)}</>}
          {m.materiel > 0 && m.mo > 0 && ' · '}
          {m.mo > 0 && <>M.-O. {m.heures} h × {TAUX_HORAIRE_NEUF} $ = {formatCurrency(m.mo)}</>}
        </span>
        <span className={clsx('font-extrabold', exclue ? 'text-amber-700' : 'text-brand-700')}>
          {exclue ? 'Exclu — 0 $' : formatCurrency(m.total)}
        </span>
      </div>
    </div>
  )
}

// ─── Étape 2 : les divisions ─────────────────────────────────────────────────
function EtapeDivisions({ draft, update }) {
  const [ouverte, setOuverte] = useState(null)
  const [recherche, setRecherche] = useState('')

  const selection = draft.selection
  const perso = draft.perso

  const choisir = (cle, valeurs) => update('selection', { ...selection, [cle]: valeurs })
  const changer = (cle, champs) =>
    update('selection', { ...selection, [cle]: { ...selection[cle], ...champs } })
  const retirer = (cle) => {
    const suivant = { ...selection }
    delete suivant[cle]
    update('selection', suivant)
  }

  const ajouterPerso = (codeSection) => {
    const libelle = window.prompt('Description de la ligne à ajouter :')
    if (!libelle?.trim()) return
    update('perso', {
      ...perso,
      [codeSection]: [
        ...(perso[codeSection] ?? []),
        { id: `p${Date.now()}`, libelle: libelle.trim(), unite: 'unité', type: 'mixte', qte: '1', prixU: '0', heures: '', statut: INCLUS },
      ],
    })
  }
  const changerPerso = (codeSection, id, champs) =>
    update('perso', {
      ...perso,
      [codeSection]: (perso[codeSection] ?? []).map(l => (l.id === id ? { ...l, ...champs } : l)),
    })
  const retirerPerso = (codeSection, id) =>
    update('perso', { ...perso, [codeSection]: (perso[codeSection] ?? []).filter(l => l.id !== id) })

  const filtre = recherche.trim().toLowerCase()
  const correspond = (texte) => !filtre || texte.toLowerCase().includes(filtre)

  const divisionsChiffrees = useMemo(
    () => divisionsDepuisSelection(selection, perso), [selection, perso])
  const totalDivision = (code) => {
    const d = divisionsChiffrees.find(x => x.code === code)
    return d ? totauxDivision(d).total : 0
  }
  const nbLignesDivision = (code) => {
    const d = divisionsChiffrees.find(x => x.code === code)
    return d ? d.sections.reduce((n, s) => n + s.lignes.length, 0) : 0
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-800">Quels travaux comprend la maison ?</p>
        <p className="text-sm text-slate-500 mt-1">
          Ouvrez une division, ajoutez ses lignes, ajustez quantités et heures
        </p>
      </div>

      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Chercher une ligne (ex: béton, gypse, fenêtre…)"
          aria-label="Chercher une ligne"
          className="input pl-10 py-3 text-base" />
      </div>

      {DIVISIONS_NEUF.map(division => {
        const sectionsVisibles = division.sections
          .map(section => ({
            ...section,
            lignes: section.lignes
              .map((gabarit, i) => ({ gabarit, cle: cleGabarit(section.code, i) }))
              .filter(({ gabarit, cle }) => correspond(gabarit.libelle) || selection[cle]),
          }))
          .filter(section => section.lignes.length > 0 || correspond(section.titre) || (perso[section.code] ?? []).length > 0)
        if (filtre && sectionsVisibles.length === 0 && !correspond(division.titre)) return null

        const total = totalDivision(division.code)
        const nb = nbLignesDivision(division.code)
        const estOuverte = ouverte === division.code || (filtre.length > 1)

        return (
          <div key={division.code} className="card p-0 overflow-hidden">
            <button
              onClick={() => setOuverte(estOuverte && ouverte === division.code ? null : division.code)}
              aria-label={`Division ${division.code} ${division.titre}`}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm',
                nb > 0 ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500')}>
                {division.code}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">{division.titre}</p>
                <p className="text-xs text-slate-500">
                  {nb > 0 ? `${nb} ligne${nb > 1 ? 's' : ''} · ${formatCurrency(total)}` : `${division.sections.length} sous-sections`}
                </p>
              </div>
              <ChevronDown size={20} className={clsx('text-slate-400 flex-shrink-0 transition-transform', estOuverte && 'rotate-180')} />
            </button>

            {estOuverte && (
              <div className="border-t border-slate-100 p-3 space-y-5 bg-slate-50/60">
                {sectionsVisibles.map(section => (
                  <div key={section.code} className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                      {section.code} — {section.titre}
                    </p>
                    {section.lignes.map(({ gabarit, cle }) => (
                      <LigneGabarit key={cle} gabarit={gabarit} cle={cle} valeurs={selection[cle]}
                        onChoisir={choisir} onChanger={changer} onRetirer={retirer} />
                    ))}

                    {(perso[section.code] ?? []).map(ligne => {
                      const m = montantLigne({ ...ligne, tauxHoraire: TAUX_HORAIRE_NEUF })
                      return (
                        <div key={ligne.id} className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800">{ligne.libelle}</p>
                              <p className="text-[11px] text-emerald-700">Ligne ajoutée à la main</p>
                            </div>
                            <button onClick={() => retirerPerso(section.code, ligne.id)}
                              aria-label={`Retirer ${ligne.libelle}`}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input type="number" inputMode="decimal" value={ligne.qte} step="0.01"
                              aria-label={`Quantité — ${ligne.libelle}`}
                              onChange={e => changerPerso(section.code, ligne.id, { qte: e.target.value })}
                              className="input py-2 text-sm text-center font-semibold" />
                            <input type="number" inputMode="decimal" value={ligne.prixU} step="0.01"
                              aria-label={`Prix unitaire — ${ligne.libelle}`}
                              onChange={e => changerPerso(section.code, ligne.id, { prixU: e.target.value })}
                              className="input py-2 text-sm text-center font-semibold" />
                            <input type="number" inputMode="decimal" value={ligne.heures} step="0.25" placeholder="h"
                              aria-label={`Heures — ${ligne.libelle}`}
                              onChange={e => changerPerso(section.code, ligne.id, { heures: e.target.value })}
                              className="input py-2 text-sm text-center font-semibold" />
                          </div>
                          <p className="text-right text-xs font-extrabold text-emerald-700">{formatCurrency(m.total)}</p>
                        </div>
                      )
                    })}

                    <button onClick={() => ajouterPerso(section.code)}
                      className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                      + Ligne personnalisée dans {section.code}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Étape 3 : le devis ──────────────────────────────────────────────────────
function EtapeDevis({ draft, update, resume, divisions, exclusions, onSave }) {
  const [reglages, setReglages] = useState(false)
  const t = draft.taux

  return (
    <div className="space-y-5">
      <div className="text-center no-print">
        <p className="text-lg font-bold text-slate-800">Le devis</p>
        <p className="text-sm text-slate-500 mt-1">
          {resume.nbLignes} ligne{resume.nbLignes > 1 ? 's' : ''} · {resume.heures} h de main-d'œuvre
        </p>
      </div>

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Soumission — construction neuve</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{draft.client.name || 'Client'}</p>
            {draft.projet && <p className="text-sm text-slate-500">{draft.projet}</p>}
            {draft.client.address && <p className="text-sm text-slate-500">{draft.client.address}</p>}
          </div>
          <p className="text-xs text-slate-400 flex-shrink-0">{new Date().toLocaleDateString('fr-CA')}</p>
        </div>
      </div>

      {/* Détail par division */}
      {divisions.map(division => {
        const td = totauxDivision(division)
        return (
          <div key={division.code} className="card">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="font-bold text-slate-800">{division.code} — {division.titre}</p>
              <p className="font-extrabold text-slate-800 flex-shrink-0">{formatCurrency(td.total)}</p>
            </div>
            <div className="space-y-1">
              {division.sections.flatMap(section => section.lignes.map(ligne => {
                const m = montantLigne(ligne)
                const exclue = ligne.statut === EXCLUS
                return (
                  <div key={ligne.cle ?? ligne.id} className="flex items-baseline justify-between gap-3 text-sm py-1 border-b border-slate-50 last:border-0">
                    <span className={clsx('min-w-0', exclue ? 'text-amber-700' : 'text-slate-600')}>
                      {exclue && <span className="font-bold">EXCLU — </span>}
                      {ligne.libelle}
                      {nombre(ligne.qte) > 0 && !exclue && (
                        <span className="text-slate-400"> · {nombre(ligne.qte)} {ligne.unite}</span>
                      )}
                    </span>
                    <span className={clsx('flex-shrink-0 font-semibold', exclue ? 'text-amber-700' : 'text-slate-700')}>
                      {exclue ? '—' : formatCurrency(m.total)}
                    </span>
                  </div>
                )
              }))}
            </div>
          </div>
        )
      })}

      {divisions.length === 0 && (
        <div className="card border-2 border-dashed border-slate-200 text-center py-10 text-slate-400">
          <p className="text-sm font-medium">Aucune ligne choisie</p>
          <p className="text-xs mt-1">Revenez à l'étape des divisions pour composer le devis</p>
        </div>
      )}

      {/* Réglages des taux */}
      <button onClick={() => setReglages(v => !v)}
        className="w-full flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors no-print px-1">
        <Percent size={15} /> Contingence, profits et taxes
        <ChevronDown size={16} className={clsx('transition-transform', reglages && 'rotate-180')} />
      </button>
      {reglages && (
        <div className="card grid grid-cols-2 gap-3 no-print">
          {[
            ['contingencePct', 'Contingence %'],
            ['profitPct', 'Profits et admin. %'],
            ['tpsPct', 'TPS %'],
            ['tvqPct', 'TVQ %'],
          ].map(([cle, label]) => (
            <label key={cle} className="block">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">{label}</span>
              <input type="number" inputMode="decimal" step="0.001" value={t[cle]} aria-label={label}
                onChange={e => update('taux', { ...t, [cle]: nombre(e.target.value) })}
                className="input py-2 text-sm text-center font-semibold" />
            </label>
          ))}
          <p className="col-span-2 text-[11px] text-slate-500 leading-relaxed">
            Les profits se calculent sur le montant brut <strong>plus</strong> la contingence, comme dans
            le modèle de l'entreprise.
          </p>
        </div>
      )}

      {/* Totaux */}
      <div className="card space-y-1.5">
        <Ligne label="Coût matériaux et sous-traitance" valeur={resume.coutMateriel} />
        <Ligne label={`Coût main-d'œuvre (${resume.heures} h × ${TAUX_HORAIRE_NEUF} $)`} valeur={resume.coutMO} />
        <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-800">
          <span>MONTANT BRUT DES TRAVAUX</span><span>{formatCurrency(resume.brut)}</span>
        </div>
        <Ligne label={`Contingence (${resume.contingencePct} %)`} valeur={resume.contingence} />
        <Ligne label={`Profits et administration (${resume.profitPct} %)`} valeur={resume.profit} />
        <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-800">
          <span>Sous-total</span><span>{formatCurrency(resume.sousTotal)}</span>
        </div>
        <Ligne label={`TPS (${resume.tpsPct} %)`} valeur={resume.tps} />
        <Ligne label={`TVQ (${resume.tvqPct} %)`} valeur={resume.tvq} />
        <div className="flex justify-between pt-3 mt-1 border-t-2 border-slate-800 text-lg">
          <span className="font-extrabold text-slate-800">TOTAL</span>
          <span className="font-extrabold text-brand-600">{formatCurrency(resume.total)}</span>
        </div>
      </div>

      {/* Exclusions */}
      {exclusions.length > 0 && (
        <div className="card border-2 border-amber-200 bg-amber-50">
          <p className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <Ban size={17} /> Non compris dans cette soumission ({exclusions.length})
          </p>
          <ul className="space-y-1 text-sm text-amber-800">
            {exclusions.map((e, i) => (
              <li key={i}>• {e.libelle} <span className="text-amber-600 text-xs">({e.division})</span></li>
            ))}
          </ul>
        </div>
      )}

      <QuoteLegalFooter />

      <div className="grid grid-cols-2 gap-3 no-print">
        <button onClick={() => window.print()}
          className="flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          <Printer size={18} /> Imprimer
        </button>
        <button onClick={onSave} disabled={resume.nbLignes === 0}
          className={clsx('flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-colors',
            resume.nbLignes === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-600')}>
          <Save size={18} /> Enregistrer
        </button>
      </div>
    </div>
  )
}

const Ligne = ({ label, valeur }) => (
  <div className="flex justify-between text-sm text-slate-600">
    <span>{label}</span><span className="font-semibold">{formatCurrency(valeur)}</span>
  </div>
)

// ─── Le module ───────────────────────────────────────────────────────────────
export default function NeufWizard() {
  const navigate = useNavigate()
  const { data, add, update: majDonnees } = useData()
  const [saved, setSaved] = useLocalStorage(SAVED_KEY, [])
  const [draft, setDraft] = useState(() => readStorage(NEUF_DRAFT_KEY, null) ?? brouillonNeufVide())
  const [step, setStep] = useState(() => draft.step ?? 0)
  const [enregistre, setEnregistre] = useState(null)

  useEffect(() => { writeStorage(NEUF_DRAFT_KEY, { ...draft, step }) }, [draft, step])

  const update = (champ, valeur) => setDraft(d => ({ ...d, [champ]: valeur }))

  const divisions = useMemo(
    () => divisionsDepuisSelection(draft.selection, draft.perso), [draft.selection, draft.perso])
  const resume = useMemo(() => resumeNeuf(divisions, draft.taux), [divisions, draft.taux])
  const exclusions = useMemo(() => exclusionsDe(divisions), [divisions])

  const etapePrete = [
    Boolean(draft.client.name || draft.client.clientId),
    resume.nbLignes > 0,
    true,
  ]

  const enregistrer = () => {
    const enModification = Boolean(draft.modifieId)
    const ancien = enModification ? saved.find(q => q.id === draft.modifieId) : null
    // Comme pour la rénovation : un nom nouveau devient un client de la fiche
    // Clients, un nom déjà connu s'y rattache sans doublon.
    const { client: clientObj } = assurerClient({
      clients: data.clients, saisie: draft.client, add, update: majDonnees,
    })

    const devis = {
      id: enModification ? draft.modifieId : Date.now(),
      number: draft.numero ?? ancien?.number ?? nextQuoteNumber(saved),
      type: 'neuf',
      clientName: draft.client.name,
      clientPhone: draft.client.phone,
      clientId: clientObj?.id ?? null,
      address: draft.client.address,
      projectType: draft.projet || 'Construction neuve',
      notes: draft.notes,
      selection: draft.selection,
      perso: draft.perso,
      taux: draft.taux,
      resume,
      total: resume.total,
      savedAt: ancien?.savedAt ?? new Date().toISOString(),
      ...(enModification ? { modifieLe: new Date().toISOString() } : {}),
    }

    setSaved(prev => enModification ? prev.map(q => (q.id === devis.id ? devis : q)) : [...prev, devis])

    // Lignes de détail de la soumission : une par ligne du devis, division
    // comprise, puis la contingence et les profits en lignes séparées. Les
    // exclusions figurent à 0 $ — le client doit voir ce qui n'est PAS compris.
    const lignes = divisions.flatMap(division =>
      division.sections.flatMap(section => section.lignes.map(ligne => {
        const m = montantLigne(ligne)
        const exclue = ligne.statut === EXCLUS
        const q = exclue ? 1 : (nombre(ligne.qte) > 0 ? nombre(ligne.qte) : 1)
        return {
          id: `${devis.id}-${ligne.cle ?? ligne.id}`,
          description: `${division.code} ${division.titre} — ${exclue ? 'EXCLU : ' : ''}${ligne.libelle}`,
          unit: exclue ? 'exclu' : (ligne.unite || 'unité'),
          qty: q,
          unitPrice: exclue ? 0 : +(m.total / q).toFixed(4),
        }
      })))

    if (lignes.length > 0) {
      lignes.push({
        id: `contingence-${devis.id}`,
        description: `Contingence (${resume.contingencePct} %)`,
        unit: 'forfait', qty: 1, unitPrice: resume.contingence,
      })
      // La ligne de profits absorbe les arrondis des prix unitaires : la somme
      // des lignes fait exactement le sous-total avant taxes.
      const somme = lignes.reduce((s, l) => s + l.qty * l.unitPrice, 0)
      lignes.push({
        id: `profit-${devis.id}`,
        description: `Profits et administration (${resume.profitPct} %)`,
        unit: 'forfait', qty: 1, unitPrice: +(resume.sousTotal - somme).toFixed(2),
      })
    }

    const champsSoumission = {
      number: devis.number,
      title: `${devis.projectType} — ${draft.client.name}`,
      clientId: clientObj?.id ?? null,
      client: draft.client.name,
      validUntil: new Date(Date.now() + QUOTE_VALIDITY_DAYS * 86400000).toISOString().slice(0, 10),
      subtotal: resume.sousTotal,
      tps: resume.tps,
      tvq: resume.tvq,
      total: resume.total,
      items: lignes,
    }
    const existante = data.quotes.find(q => q.number === devis.number)
    if (enModification && existante) majDonnees('quotes', existante.id, champsSoumission)
    else add('quotes', { ...champsSoumission, date: new Date().toISOString().slice(0, 10), status: 'Brouillon', estimator: '' })

    writeStorage(NEUF_DRAFT_KEY, null)
    setEnregistre(enModification ? 'modifie' : 'cree')
    setTimeout(() => navigate('/estimateur'), 1600)
  }

  if (enregistre) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <PartyPopper size={36} className="text-emerald-600" />
        </div>
        <p className="text-xl font-bold text-slate-800">
          {enregistre === 'modifie' ? 'Devis mis à jour !' : 'Devis enregistré !'}
        </p>
        <p className="text-sm text-slate-500 mt-2">Vous le retrouverez dans « Mes devis enregistrés ».</p>
      </div>
    )
  }

  const Icone = ETAPES[step].icon

  return (
    <div className="max-w-3xl mx-auto pb-32">
      <div className="mb-5 no-print">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/estimateur')}
            className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
            <X size={16} /> Quitter
          </button>
          <p className="text-sm font-semibold text-slate-500">
            Étape {step + 1} sur {ETAPES.length} — <span className="text-slate-800">{ETAPES[step].label}</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          {ETAPES.map((e, i) => (
            <button key={e.label} onClick={() => i <= step && setStep(i)} aria-label={e.label}
              className={clsx('h-2 rounded-full flex-1 transition-colors',
                i <= step ? 'bg-brand-500' : 'bg-slate-200')} />
          ))}
        </div>
        {draft.modifieId && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 font-semibold">
            Modification du devis {draft.numero ?? ''} — construction neuve
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-slate-700">
          <Icone size={19} className="text-brand-500" />
          <span className="font-bold">Maison neuve</span>
        </div>
      </div>

      {step === 0 && <EtapeClient draft={draft} update={update} />}
      {step === 1 && <EtapeDivisions draft={draft} update={update} />}
      {step === 2 && (
        <EtapeDevis draft={draft} update={update} resume={resume}
          divisions={divisions} exclusions={exclusions} onSave={enregistrer} />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3 z-40 no-print lg:pl-64">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl border-2 border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0">
              <ChevronLeft size={19} /> Retour
            </button>
          )}
          {resume.total > 0 && step < 2 ? (
            <div className="text-center flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total en cours</p>
              <p className="font-extrabold text-brand-600 text-lg leading-tight">{formatCurrency(resume.total)}</p>
            </div>
          ) : <div className="flex-1" />}
          {step < 2 && (
            <button onClick={() => etapePrete[step] && setStep(step + 1)} disabled={!etapePrete[step]}
              className={clsx('flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-xl font-bold text-white transition-colors flex-shrink-0',
                etapePrete[step] ? 'bg-brand-500 hover:bg-brand-600' : 'bg-slate-300 cursor-not-allowed')}>
              Continuer <ChevronRight size={19} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
