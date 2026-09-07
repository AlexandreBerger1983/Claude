// Écran de connexion. Affiché seulement quand la base de données est
// configurée : sans elle, l'application s'ouvre directement, sur le stockage
// du navigateur.
import { useState } from 'react'
import { HardHat, LogIn, AlertTriangle, Loader2 } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import { useAuth } from '../../store/AuthContext'

export default function Login() {
  const { connexion } = useAuth()
  const [settings] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const [courriel, setCourriel] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)

  const nomEntreprise = settings.companyName || 'ConstructPro'

  const envoyer = async (e) => {
    e.preventDefault()
    if (enCours) return
    setErreur(null)
    setEnCours(true)
    const { erreur: e2 } = await connexion(courriel, motDePasse)
    if (e2) { setErreur(e2); setEnCours(false) }
    // En cas de succès, la session change et l'application s'affiche :
    // inutile de relâcher le bouton, l'écran disparaît.
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          {settings.logoDataUrl ? (
            <img src={settings.logoDataUrl} alt="" className="h-14 w-auto mb-3 object-contain" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center mb-3">
              <HardHat size={28} className="text-white" />
            </div>
          )}
          <h1 className="text-xl font-extrabold text-slate-800">{nomEntreprise}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Connectez-vous pour continuer</p>
        </div>

        <form onSubmit={envoyer} className="card space-y-4">
          <div>
            <label htmlFor="courriel" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Courriel
            </label>
            <input
              id="courriel"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={courriel}
              onChange={e => setCourriel(e.target.value)}
              className="input w-full"
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label htmlFor="mot-de-passe" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Mot de passe
            </label>
            <input
              id="mot-de-passe"
              type="password"
              autoComplete="current-password"
              required
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              className="input w-full"
              placeholder="••••••••"
            />
          </div>

          {erreur && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <p>{erreur}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={enCours}
            className="btn-primary w-full justify-center disabled:opacity-60"
          >
            {enCours ? <><Loader2 size={16} className="animate-spin" /> Connexion…</> : <><LogIn size={16} /> Se connecter</>}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-5 leading-relaxed">
          Mot de passe oublié ? Demandez au bureau de le réinitialiser
          dans Supabase, section Authentication.
        </p>
      </div>
    </div>
  )
}
