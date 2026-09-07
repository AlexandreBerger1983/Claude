import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, Save, Check, Upload, X, RotateCcw, ClipboardList, Download, Hammer, Database } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import { RATE_DEFS, RATE_GROUPS, RATES_KEY, defaultRates } from '../../data/roomQuestionnaires'
import {
  CATALOG, CATEGORIES, CATEGORY_META, CATALOG_PRICES_KEY, CATALOG_PRICE_FIELDS, catalogDefaultPrice,
} from '../../data/estimatorCatalog'
import { useData } from '../../store/DataContext'
import { formatCurrency } from '../../utils/formatters'
import { exportBackup, parseBackup, restoreBackup, backupSize } from '../../utils/backup'
import clsx from 'clsx'

// ─── Onglet : Tarifs du questionnaire de soumission ───────────────────────────
function TarifsTab() {
  const [overrides, setOverrides] = useLocalStorage(RATES_KEY, {})
  const defaults = defaultRates()

  const valueOf = (key) => overrides[key] ?? defaults[key]
  const setRate = (key, value) => {
    const num = parseFloat(value)
    setOverrides(o => {
      const n = { ...o }
      if (value === '' || Number.isNaN(num) || num === defaults[key]) delete n[key]
      else n[key] = num
      return n
    })
  }
  const changedCount = Object.keys(overrides).length

  const resetAll = () => {
    if (window.confirm('Remettre tous les tarifs du questionnaire à leurs valeurs par défaut ?')) {
      setOverrides({})
    }
  }

  return (
    <div className="space-y-5">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800 leading-relaxed">
        <p className="font-semibold mb-1">💡 À quoi servent ces tarifs ?</p>
        <p>
          Ce sont les prix utilisés par le <strong>questionnaire détaillé</strong> de l'estimateur
          (formulaires salle de bain, cuisine et pièce standard). Modifiez-les ici une seule fois et
          toutes vos prochaines soumissions les utiliseront. Les valeurs modifiées sont surlignées.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {changedCount > 0 ? `${changedCount} tarif(s) personnalisé(s)` : 'Tous les tarifs sont aux valeurs par défaut'}
        </p>
        {changedCount > 0 && (
          <button onClick={resetAll} className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50">
            <RotateCcw size={13} /> Tout remettre par défaut
          </button>
        )}
      </div>

      {RATE_GROUPS.map(group => (
        <div key={group} className="card p-0 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-sm uppercase tracking-wide">
            {group}
          </div>
          <div className="divide-y divide-slate-50">
            {RATE_DEFS.filter(r => r.group === group).map(r => {
              const changed = overrides[r.key] !== undefined
              return (
                <div key={r.key} className={clsx('flex items-center gap-3 px-4 py-2', changed && 'bg-amber-50/60')}>
                  <p className="text-sm text-slate-700 flex-1 min-w-0">{r.label}</p>
                  {changed && (
                    <button
                      onClick={() => setRate(r.key, '')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 underline flex-shrink-0"
                      title={`Valeur par défaut : ${formatCurrency(r.def)}`}
                    >
                      défaut {formatCurrency(r.def)}
                    </button>
                  )}
                  <input
                    type="number" min="0" step="0.05" inputMode="decimal"
                    value={valueOf(r.key)}
                    onChange={e => setRate(r.key, e.target.value)}
                    onFocus={e => e.target.select()}
                    className={clsx('input w-24 py-1 text-sm text-right flex-shrink-0', changed && 'border-amber-300 font-bold')}
                  />
                  <span className="text-xs text-slate-400 w-14 flex-shrink-0">{r.unit}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Onglet : Prix du devis rapide ────────────────────────────────────────────
// Même principe que les tarifs du questionnaire : on ne conserve que les prix
// réellement modifiés, pour pouvoir revenir article par article au prix livré.
function PrixCatalogueTab() {
  const [overrides, setOverrides] = useLocalStorage(CATALOG_PRICES_KEY, {})
  const [recherche, setRecherche] = useState('')

  const valueOf = (id, field) => overrides[id]?.[field] ?? catalogDefaultPrice(id, field)
  const estModifie = (id, field) => overrides[id]?.[field] !== undefined

  const setPrix = (id, field, value) => {
    const num = parseFloat(value)
    setOverrides(o => {
      const article = { ...(o[id] ?? {}) }
      if (value === '' || Number.isNaN(num) || num < 0 || num === catalogDefaultPrice(id, field)) delete article[field]
      else article[field] = num
      const n = { ...o }
      if (Object.keys(article).length === 0) delete n[id]
      else n[id] = article
      return n
    })
  }

  const changedCount = Object.values(overrides).reduce((s, a) => s + Object.keys(a).length, 0)

  const resetAll = () => {
    if (window.confirm('Remettre tous les prix du devis rapide à leurs valeurs par défaut ?')) setOverrides({})
  }

  const terme = recherche.trim().toLowerCase()
  const correspond = (item) =>
    !terme || item.label.toLowerCase().includes(terme) || item.category.toLowerCase().includes(terme)

  return (
    <div className="space-y-5">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800 leading-relaxed">
        <p className="font-semibold mb-1">💡 À quoi servent ces prix ?</p>
        <p>
          Ce sont les prix des travaux proposés à l'étape 3 du <strong>devis rapide</strong>.
          Modifiez-les ici une seule fois et tous vos prochains devis les utiliseront. Les valeurs
          modifiées sont surlignées. Les prix sont au <strong>mètre</strong> (m², m linéaire) ou à
          l'unité ; l'application les convertit en pieds carrés à l'affichage.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          {changedCount > 0 ? `${changedCount} prix personnalisé(s)` : 'Tous les prix sont aux valeurs par défaut'}
        </p>
        <div className="flex items-center gap-2">
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher un travail…"
            className="input py-1.5 text-sm w-52"
          />
          {changedCount > 0 && (
            <button onClick={resetAll} className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50">
              <RotateCcw size={13} /> Tout remettre par défaut
            </button>
          )}
        </div>
      </div>

      {CATEGORIES.map(cat => {
        const items = CATALOG.filter(c => c.category === cat && correspond(c))
        if (items.length === 0) return null
        const meta = CATEGORY_META[cat] ?? { emoji: '🔧' }
        return (
          <div key={cat} className="card p-0 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
              <span>{meta.emoji}</span> {cat}
            </div>
            <div className="divide-y divide-slate-50">
              {items.map(item => (
                <div key={item.id} className="px-4 py-2.5">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-sm text-slate-700">{item.label}</p>
                      <p className="text-[11px] text-slate-400">par {item.unit}</p>
                    </div>
                    {CATALOG_PRICE_FIELDS.map(f => {
                      const changed = estModifie(item.id, f.key)
                      return (
                        <div key={f.key} className="flex items-center gap-1.5 flex-shrink-0">
                          <label className="text-[11px] text-slate-400 w-20 text-right">{f.label}</label>
                          <input
                            type="number" min="0" step="0.5" inputMode="decimal"
                            value={valueOf(item.id, f.key)}
                            onChange={e => setPrix(item.id, f.key, e.target.value)}
                            onFocus={e => e.target.select()}
                            className={clsx('input w-24 py-1 text-sm text-right', changed && 'border-amber-300 bg-amber-50/60 font-bold')}
                          />
                          <span className="text-xs text-slate-400 w-4">$</span>
                        </div>
                      )
                    })}
                  </div>
                  {CATALOG_PRICE_FIELDS.some(f => estModifie(item.id, f.key)) && (
                    <div className="flex items-center gap-3 mt-1.5 pl-1">
                      {CATALOG_PRICE_FIELDS.filter(f => estModifie(item.id, f.key)).map(f => (
                        <button
                          key={f.key}
                          onClick={() => setPrix(item.id, f.key, '')}
                          className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                        >
                          {f.label} — défaut {formatCurrency(catalogDefaultPrice(item.id, f.key))}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Settings() {
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const { resetToSeed, data, surSupabase, estVide, chargerDemonstration, viderLaBase } = useData()
  const [demoMsg, setDemoMsg] = useState(null)
  const [demoEnCours, setDemoEnCours] = useState(false)
  const [saved, setSaved] = useState(false)
  const [backupMsg, setBackupMsg] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const ongletDemande = searchParams.get('onglet')
  const tab = ['tarifs', 'prix'].includes(ongletDemande) ? ongletDemande : 'entreprise'
  const setTab = (t) => setSearchParams(t === 'entreprise' ? {} : { onglet: t })

  const handleReset = () => {
    if (window.confirm('Remettre les données de démonstration ? Vos clients, projets, factures et autres données saisies seront remplacés par les exemples de départ. Cette action est irréversible.')) {
      resetToSeed()
    }
  }

  const handleBackup = () => {
    try {
      const n = exportBackup(surSupabase ? data : null)
      setBackupMsg({ type: 'ok', text: `Sauvegarde téléchargée (${n} ensemble(s) de données). Conservez ce fichier en lieu sûr.` })
    } catch (e) {
      setBackupMsg({ type: 'error', text: `La sauvegarde a échoué : ${e.message}` })
    }
  }

  // La restauration écrase tout : on valide le fichier AVANT de toucher au
  // stockage, puis on demande confirmation, puis on recharge la page pour que
  // toute l'application reparte des données restaurées.
  const handleRestore = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de re-sélectionner le même fichier
    if (!file) return
    setBackupMsg(null)
    // Restaurer écrit dans le navigateur. Avec la base branchée, l'application
    // lit ses données dans Supabase : le fichier n'y arriverait pas, et on
    // croirait avoir restauré. Mieux vaut le dire que le laisser croire.
    if (surSupabase) {
      setBackupMsg({
        type: 'error',
        text: "La base de données est branchée : la restauration d'un fichier n'est pas possible depuis ici. "
            + "Elle écrirait dans ce navigateur, pas dans la base partagée. Écrivez-moi pour restaurer une sauvegarde dans la base.",
      })
      return
    }
    try {
      const sauvegarde = parseBackup(await file.text())
      const quand = sauvegarde.creeLe
        ? new Date(sauvegarde.creeLe).toLocaleString('fr-CA')
        : 'date inconnue'
      const ok = window.confirm(
        `Restaurer la sauvegarde du ${quand} ?\n\n` +
        `Elle contient ${sauvegarde.cles.length} ensemble(s) de données.\n\n` +
        `TOUTES les données actuelles de ce navigateur seront remplacées. ` +
        `Cette action est irréversible : sauvegardez d'abord si vous avez un doute.`
      )
      if (!ok) return
      restoreBackup(sauvegarde)
      window.location.reload()
    } catch (err) {
      setBackupMsg({ type: 'error', text: `Restauration impossible : ${err.message}` })
    }
  }

  // Charger les exemples dans la base : utile pour montrer l'application
  // remplie. Possible seulement sur une base vide.
  const handleDemo = async () => {
    setDemoMsg(null); setDemoEnCours(true)
    const { erreur } = await chargerDemonstration()
    setDemoEnCours(false)
    setDemoMsg(erreur
      ? { type: 'error', text: erreur }
      : { type: 'ok', text: 'Données de démonstration chargées. Pensez à vider la base après votre présentation.' })
  }

  // Vider la base efface le travail de toute l'entreprise : on demande d'écrire
  // le mot, une case à cocher se clique trop facilement.
  const handleVider = async () => {
    const reponse = window.prompt(
      'Cette action efface TOUTES les données de la base : clients, projets, soumissions, factures, feuilles de temps.\n\n'
      + 'Elle est irréversible et touche tout le monde, pas seulement ce navigateur.\n\n'
      + 'Écrivez EFFACER pour confirmer.',
    )
    if (reponse !== 'EFFACER') {
      if (reponse !== null) setDemoMsg({ type: 'error', text: 'Suppression annulée : le mot ne correspond pas.' })
      return
    }
    setDemoMsg(null); setDemoEnCours(true)
    const { erreur } = await viderLaBase()
    setDemoEnCours(false)
    setDemoMsg(erreur ? { type: 'error', text: erreur } : { type: 'ok', text: 'La base est vide.' })
  }

  const update = (field, value) => setSettings(s => ({ ...s, [field]: value }))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => update('logoDataUrl', reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="page-header">
        <div>
          <h2 className="section-title">Paramètres</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {tab === 'tarifs' ? 'Prix par défaut du questionnaire de soumission'
              : tab === 'prix' ? 'Prix par défaut des travaux du devis rapide'
              : 'Ces informations apparaissent sur vos devis, soumissions et factures'}
          </p>
        </div>
        {tab === 'entreprise' && (
          <button onClick={handleSave} className={clsx('btn-primary', saved && 'bg-emerald-500 hover:bg-emerald-500')}>
            {saved ? <><Check size={16} /> Enregistré</> : <><Save size={16} /> Enregistrer</>}
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setTab('entreprise')}
          className={clsx('flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'entreprise' ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
        >
          <Building2 size={15} /> Entreprise
        </button>
        <button
          onClick={() => setTab('tarifs')}
          className={clsx('flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'tarifs' ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
        >
          <ClipboardList size={15} /> Tarifs du questionnaire
        </button>
        <button
          onClick={() => setTab('prix')}
          className={clsx('flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
            tab === 'prix' ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50')}
        >
          <Hammer size={15} /> Prix du devis rapide
        </button>
      </div>

      {tab === 'tarifs' && <TarifsTab />}
      {tab === 'prix' && <PrixCatalogueTab />}

      {tab === 'entreprise' && (<>

      {/* Identité de l'entreprise */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} className="text-brand-500" />
          <h3 className="font-semibold text-slate-800">Identité de l'entreprise</h3>
        </div>

        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <label className="label">Logo</label>
            <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 hover:border-brand-300 transition-colors cursor-pointer group">
              {settings.logoDataUrl ? (
                <img src={settings.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Upload size={20} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
              )}
              <input type="file" accept="image/*" onChange={handleLogo} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            {settings.logoDataUrl && (
              <button onClick={() => update('logoDataUrl', '')} className="text-xs text-red-500 mt-1 flex items-center gap-0.5">
                <X size={11} /> Retirer
              </button>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nom de l'entreprise *</label>
              <input
                value={settings.companyName}
                onChange={e => update('companyName', e.target.value)}
                placeholder="ex: Claude Gariépy et Fils Inc."
                className="input font-semibold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Sous-titre <span className="font-normal text-slate-400">(imprimé sous le nom sur les soumissions)</span></label>
              <input
                value={settings.subtitle ?? ''}
                onChange={e => update('subtitle', e.target.value)}
                placeholder="ex: Entrepreneur Général"
                className="input"
              />
            </div>
            <div>
              <label className="label">Nom du propriétaire</label>
              <input
                value={settings.ownerName}
                onChange={e => update('ownerName', e.target.value)}
                placeholder="ex: Alexandre Berger"
                className="input"
              />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                value={settings.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="ex: 514-555-0100"
                inputMode="tel"
                className="input"
              />
            </div>
            <div>
              <label className="label">Télécopieur</label>
              <input
                value={settings.fax ?? ''}
                onChange={e => update('fax', e.target.value)}
                placeholder="ex: 418 822-4547"
                inputMode="tel"
                className="input"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label">Adresse</label>
          <input
            value={settings.address}
            onChange={e => update('address', e.target.value)}
            placeholder="ex: 123 rue Industrielle, Montréal, QC H2X 1Z9"
            className="input"
          />
        </div>

        <div>
          <label className="label">Courriel</label>
          <input
            type="email"
            value={settings.email}
            onChange={e => update('email', e.target.value)}
            placeholder="ex: info@entreprise.ca"
            className="input"
          />
        </div>
      </div>

      {/* Numéros officiels */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-800">Numéros officiels</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Licence RBQ</label>
            <input
              value={settings.rbq}
              onChange={e => update('rbq', e.target.value)}
              placeholder="ex: 8001-2345-67"
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label">NEQ</label>
            <input
              value={settings.neq}
              onChange={e => update('neq', e.target.value)}
              placeholder="ex: 1187654321"
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label">No d'inscription TPS</label>
            <input
              value={settings.tpsNumber}
              onChange={e => update('tpsNumber', e.target.value)}
              placeholder="ex: 123456789 RT0001"
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label">No d'inscription TVQ</label>
            <input
              value={settings.tvqNumber}
              onChange={e => update('tvqNumber', e.target.value)}
              placeholder="ex: 1234567890 TQ0001"
              className="input font-mono"
            />
          </div>
        </div>
      </div>

      {/* Taxes */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-800">Taux de taxes par défaut</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">TPS (%)</label>
            <input
              type="number" step="0.001"
              value={settings.tpsPct}
              onChange={e => update('tpsPct', parseFloat(e.target.value) || 0)}
              className="input"
            />
          </div>
          <div>
            <label className="label">TVQ (%)</label>
            <input
              type="number" step="0.001"
              value={settings.tvqPct}
              onChange={e => update('tvqPct', parseFloat(e.target.value) || 0)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Objectif annuel */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-800">Objectif de chiffre d'affaires annuel</h3>
        <p className="text-xs text-slate-500">
          Utilisé par le tableau de bord pour afficher votre progression (montant facturé vs objectif).
        </p>
        <div className="flex items-center gap-2 max-w-xs">
          <input
            type="number" step="10000" min="0"
            value={settings.revenueTarget || ''}
            onChange={e => update('revenueTarget', parseFloat(e.target.value) || 0)}
            placeholder="ex: 1500000"
            className="input"
          />
          <span className="text-slate-500 text-sm flex-shrink-0">$ / an</span>
        </div>
      </div>

      {/* Sauvegarde et restauration */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-1">Sauvegarde de vos données</h3>
        <p className="text-xs text-slate-500 mb-3">
          Vos données sont enregistrées <strong>uniquement dans ce navigateur</strong>. Elles disparaîtraient si
          vous vidiez les données de navigation, et ne suivent pas d'un appareil à l'autre. Téléchargez
          régulièrement une sauvegarde et conservez-la en lieu sûr (OneDrive, clé USB…).
        </p>

        <div className="flex flex-wrap gap-2">
          <button onClick={handleBackup} className="btn-primary">
            <Download size={15} /> Sauvegarder mes données
          </button>
          <label className="btn-secondary cursor-pointer">
            <Upload size={15} /> Restaurer une sauvegarde
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleRestore}
            />
          </label>
        </div>

        {backupMsg && (
          <p className={clsx(
            'mt-3 text-sm',
            backupMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600',
          )}>
            {backupMsg.text}
          </p>
        )}

        <p className="mt-3 text-xs text-slate-400">
          Taille actuelle des données : {(backupSize() / 1024).toFixed(1)} Ko.
          La restauration remplace l'intégralité des données de ce navigateur.
        </p>
      </div>

      {/* Zone données */}
      <div className="card border-red-100">
        <h3 className="font-semibold text-slate-800 mb-1">Données de l'application</h3>
        {surSupabase ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Vos données sont dans la base en ligne, partagées par toute l'entreprise
              et par tous vos appareils.
            </p>

            {estVide ? (
              <>
                <p className="text-xs text-slate-500">
                  La base est vide. Pour <strong>présenter l'application</strong>, vous pouvez y charger
                  un jeu d'exemples : 6 clients, 5 projets, 5 soumissions, 6 factures,
                  7 employés, 10 matériaux et leurs feuilles de temps.
                </p>
                <button onClick={handleDemo} disabled={demoEnCours} className="btn-secondary disabled:opacity-60">
                  <Database size={15} /> {demoEnCours ? 'Chargement…' : 'Charger des données de démonstration'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  La base contient des données. Le bouton ci-dessous les efface toutes —
                  utile après une présentation, pour repartir propre avant les vraies
                  données de l'entreprise.
                </p>
                <button
                  onClick={handleVider}
                  disabled={demoEnCours}
                  className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-60"
                >
                  <RotateCcw size={15} /> {demoEnCours ? 'Suppression…' : 'Vider complètement la base'}
                </button>
              </>
            )}

            {demoMsg && (
              <p className={clsx('text-sm', demoMsg.type === 'ok' ? 'text-emerald-700' : 'text-red-700')}>
                {demoMsg.text}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-3">
              Toutes vos données (clients, projets, factures, devis, paie…) sont enregistrées dans ce navigateur.
              Ce bouton efface tout et remet les exemples de départ.
            </p>
            <button onClick={handleReset} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
              <RotateCcw size={15} /> Réinitialiser les données de démonstration
            </button>
          </>
        )}
      </div>

      {/* Aperçu */}
      <div className="card bg-slate-50">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Aperçu sur vos documents</p>
        <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center gap-3">
          {settings.logoDataUrl ? (
            <img src={settings.logoDataUrl} alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(settings.companyName || 'CP').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-slate-800">{settings.companyName || 'Nom de votre entreprise'}</p>
            <p className="text-xs text-slate-400">
              {[settings.rbq && `RBQ ${settings.rbq}`, settings.neq && `NEQ ${settings.neq}`].filter(Boolean).join(' · ') || 'RBQ · NEQ'}
            </p>
            <p className="text-xs text-slate-500">
              {[settings.address, settings.phone].filter(Boolean).join(' · ') || 'Adresse · Téléphone'}
            </p>
          </div>
        </div>
      </div>
      </>)}
    </div>
  )
}
