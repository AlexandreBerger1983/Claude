import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Trash2, ChevronRight, Clock } from 'lucide-react'
import { useLocalStorage, readStorage, writeStorage } from '../../hooks/useLocalStorage'
import { DRAFT_KEY, SAVED_KEY } from './estimatorUtils'
import { formatCurrency } from '../../utils/formatters'

// Accueil de l'estimateur : reprendre un brouillon, voir les devis
// enregistrés, ou en commencer un nouveau. Tout est en gros boutons.
export default function EstimatorHome() {
  const navigate = useNavigate()
  const [saved, setSaved] = useLocalStorage(SAVED_KEY, [])
  const draft = readStorage(DRAFT_KEY, null)
  const hasDraft = draft && (draft.client?.name || draft.client?.clientId || draft.rooms?.length > 0)

  const startNew = () => {
    writeStorage(DRAFT_KEY, null)
    navigate('/estimateur/nouveau')
  }

  const deleteSaved = (id) => {
    if (window.confirm('Supprimer ce devis ? Cette action est définitive.')) {
      setSaved(prev => prev.filter(q => q.id !== id))
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Grand bouton principal */}
      <button
        onClick={startNew}
        className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-2xl p-6 shadow-md transition-colors flex items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Plus size={30} strokeWidth={2.5} />
        </div>
        <div className="text-left">
          <p className="text-lg font-bold">Nouveau devis</p>
          <p className="text-sm text-white/80">Commencer une estimation chez un client</p>
        </div>
        <ChevronRight size={24} className="ml-auto opacity-60" />
      </button>

      {/* Brouillon en cours */}
      {hasDraft && (
        <button
          onClick={() => navigate('/estimateur/nouveau')}
          className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-center gap-4 hover:bg-amber-100 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center flex-shrink-0">
            <Clock size={24} className="text-amber-700" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-bold text-amber-800">Devis en cours — reprendre où vous étiez</p>
            <p className="text-sm text-amber-700 truncate">
              {draft.client?.name || 'Client à définir'}
              {draft.rooms?.length > 0 && ` · ${draft.rooms.length} pièce${draft.rooms.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <ChevronRight size={22} className="ml-auto text-amber-500 flex-shrink-0" />
        </button>
      )}

      {/* Devis enregistrés */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3 px-1">
          Mes devis enregistrés {saved.length > 0 && <span className="text-slate-400 font-normal">({saved.length})</span>}
        </h3>

        {saved.length === 0 ? (
          <div className="card border-2 border-dashed border-slate-200 text-center py-10 text-slate-400">
            <FileText size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun devis enregistré pour l'instant</p>
            <p className="text-xs mt-1">Vos devis terminés apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...saved].reverse().map(q => (
              <div key={q.id} className="card flex items-center gap-4 py-4">
                <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-brand-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">{q.clientName}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {q.number} · {q.projectType || 'Travaux'} · {new Date(q.savedAt).toLocaleDateString('fr-CA')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-brand-600">{formatCurrency(q.total)}</p>
                  <p className="text-[10px] text-slate-400">taxes incluses</p>
                </div>
                <button
                  onClick={() => deleteSaved(q.id)}
                  className="p-2 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label="Supprimer"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aide */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800 leading-relaxed">
        <p className="font-semibold mb-1">💡 Comment ça marche ?</p>
        <p>
          En 4 étapes simples : <strong>1)</strong> le client, <strong>2)</strong> les pièces et leurs mesures,{' '}
          <strong>3)</strong> les travaux à faire, <strong>4)</strong> le devis avec le prix final.
          Tout se sauvegarde automatiquement — vous pouvez fermer et reprendre plus tard sans rien perdre.
        </p>
      </div>
    </div>
  )
}
