// Barrière d'entrée de l'application.
//
//   • base non configurée → on laisse passer, l'application tourne en local ;
//   • personne de connecté → écran de connexion ;
//   • profil introuvable  → message clair plutôt qu'un écran vide.
import { Loader2, AlertTriangle, LogOut } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import Login from './Login'

export default function Garde({ children }) {
  const { configure, connecte, chargement, profil, erreurProfil, deconnexion } = useAuth()

  if (!configure) return children

  if (chargement) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 size={26} className="animate-spin text-brand-500" />
        <p className="text-sm text-slate-400">Ouverture de votre session…</p>
      </div>
    )
  }

  if (!connecte) return <Login />

  // Connecté, mais aucun profil : le script schema.sql n'a pas été exécuté, ou
  // le compte a été créé avant lui. On le dit, au lieu d'afficher une
  // application vide dont personne ne comprendrait le silence.
  if (!profil) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="card max-w-md space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-800">Profil introuvable</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                {erreurProfil ?? "Ce compte n'a pas de profil dans la base de données."}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            À vérifier dans Supabase : que le contenu de <code>schema.sql</code> a bien
            été exécuté, et que le compte apparaît dans la table <code>profiles</code>.
          </p>
          <button onClick={deconnexion} className="btn-secondary w-full justify-center">
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  return children
}
