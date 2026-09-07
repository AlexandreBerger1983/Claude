// État de la base de données, affiché en haut des écrans.
//
// Sans lui, un enregistrement refusé passerait inaperçu : l'écran montrerait
// la modification, la base ne l'aurait pas. C'est le pire des cas — croire que
// c'est enregistré alors que non.
import { Loader2, CloudOff, RefreshCw, X } from 'lucide-react'
import { useData } from '../../store/DataContext'

export default function EtatDonnees() {
  const { surSupabase, chargement, erreur, effacerErreur, enregistrementEnCours, recharger } = useData()

  if (!surSupabase) return null

  if (erreur) {
    return (
      <div className="no-print mb-4 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
        <CloudOff size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800">Modification non enregistrée</p>
          <p className="text-sm text-red-700 mt-0.5 break-words">{erreur}</p>
          <p className="text-xs text-red-600/80 mt-1.5">
            Ce qui s'affiche à l'écran n'est peut-être pas ce que contient la base.
            Rechargez pour voir l'état réel.
          </p>
        </div>
        <button
          onClick={recharger}
          className="btn-secondary text-xs flex-shrink-0 border-red-200 text-red-700 hover:bg-red-100"
        >
          <RefreshCw size={13} /> Recharger
        </button>
        <button
          onClick={effacerErreur}
          title="Masquer"
          className="p-1 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-100 flex-shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    )
  }

  if (chargement) {
    return (
      <div className="no-print mb-4 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <Loader2 size={15} className="animate-spin text-slate-400 flex-shrink-0" />
        <p className="text-sm text-slate-500">Chargement des données…</p>
      </div>
    )
  }

  if (enregistrementEnCours) {
    return (
      <div className="no-print mb-4 flex items-center gap-2.5 px-3.5 py-2 bg-brand-50 border border-brand-100 rounded-xl">
        <Loader2 size={14} className="animate-spin text-brand-500 flex-shrink-0" />
        <p className="text-xs text-brand-700">Enregistrement…</p>
      </div>
    )
  }

  return null
}
