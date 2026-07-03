import { useState } from 'react'
import { Building2, Save, Check, Upload, X } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import clsx from 'clsx'

export default function Settings() {
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const [saved, setSaved] = useState(false)

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
          <h2 className="section-title">Paramètres de l'entreprise</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ces informations apparaissent sur vos devis, soumissions et factures</p>
        </div>
        <button onClick={handleSave} className={clsx('btn-primary', saved && 'bg-emerald-500 hover:bg-emerald-500')}>
          {saved ? <><Check size={16} /> Enregistré</> : <><Save size={16} /> Enregistrer</>}
        </button>
      </div>

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
    </div>
  )
}
