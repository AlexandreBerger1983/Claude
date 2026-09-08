import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Trash2, ChevronRight, Clock, Pencil, Home, Hammer } from 'lucide-react'
import { useLocalStorage, readStorage, writeStorage } from '../../hooks/useLocalStorage'
import { DRAFT_KEY, SAVED_KEY, draftFromQuote } from './estimatorUtils'
import { NEUF_DRAFT_KEY, brouillonDepuisDevisNeuf } from './NeufWizard'
import { formatCurrency } from '../../utils/formatters'

// Accueil de l'estimateur : reprendre un brouillon, voir les devis
// enregistrés, ou en commencer un nouveau. Tout est en gros boutons.
export default function EstimatorHome() {
  const navigate = useNavigate()
  const [saved, setSaved] = useLocalStorage(SAVED_KEY, [])
  const draft = readStorage(DRAFT_KEY, null)
  const hasDraft = draft && (draft.client?.name || draft.client?.clientId || draft.rooms?.length > 0)
  const draftNeuf = readStorage(NEUF_DRAFT_KEY, null)
  const hasDraftNeuf = draftNeuf && (draftNeuf.client?.name || draftNeuf.client?.clientId
    || Object.keys(draftNeuf.selection ?? {}).length > 0)

  const startNew = () => {
    writeStorage(DRAFT_KEY, null)
    navigate('/estimateur/nouveau')
  }

  const startNeuf = () => {
    writeStorage(NEUF_DRAFT_KEY, null)
    navigate('/estimateur/neuf')
  }

  // Rouvrir un devis enregistré. Un brouillon en cours serait écrasé : on
  // prévient plutôt que de le faire disparaître sans rien dire.
  //
  // Rénovation et maison neuve ne se chiffrent pas de la même façon : chaque
  // devis rouvre dans le module qui l'a produit.
  const modifier = (q) => {
    const neuf = q.type === 'neuf'
    if ((neuf ? hasDraftNeuf : hasDraft) && !window.confirm(
      'Un devis est en cours de saisie et sera abandonné si vous ouvrez celui-ci.\n\nContinuer ?'
    )) return
    if (neuf) {
      writeStorage(NEUF_DRAFT_KEY, brouillonDepuisDevisNeuf(q))
      navigate('/estimateur/neuf')
    } else {
      writeStorage(DRAFT_KEY, draftFromQuote(q))
      navigate('/estimateur/nouveau')
    }
  }

  const deleteSaved = (id) => {
    if (window.confirm('Supprimer ce devis ? Cette action est définitive.')) {
      setSaved(prev => prev.filter(q => q.id !== id))
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Les deux façons de chiffrer : elles n'ont ni la même structure ni la
          même marge, chacune a donc son module. */}
      <button
        onClick={startNew}
        className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-2xl p-6 shadow-md transition-colors flex items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Plus size={30} strokeWidth={2.5} />
        </div>
        <div className="text-left">
          <p className="text-lg font-bold">Nouveau devis</p>
          <p className="text-sm text-white/80">Rénovation — pièce par pièce, avec mesures</p>
        </div>
        <ChevronRight size={24} className="ml-auto opacity-60" />
      </button>

      <button
        onClick={startNeuf}
        className="w-full bg-slate-800 hover:bg-slate-900 active:bg-black text-white rounded-2xl p-6 shadow-md transition-colors flex items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <Home size={28} strokeWidth={2.2} />
        </div>
        <div className="text-left">
          <p className="text-lg font-bold">Nouvelle maison neuve</p>
          <p className="text-sm text-white/70">Construction neuve — par divisions de travaux</p>
        </div>
        <ChevronRight size={24} className="ml-auto opacity-60" />
      </button>

      {/* Brouillon de maison neuve en cours */}
      {hasDraftNeuf && (
        <button
          onClick={() => navigate('/estimateur/neuf')}
          className="w-full bg-slate-100 border-2 border-slate-300 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-200 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-300 flex items-center justify-center flex-shrink-0">
            <Hammer size={22} className="text-slate-700" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-bold text-slate-800">
              {draftNeuf.modifieId
                ? `Maison neuve en modification — ${draftNeuf.numero ?? 'devis existant'}`
                : 'Maison neuve en cours — reprendre où vous étiez'}
            </p>
            <p className="text-sm text-slate-600 truncate">
              {draftNeuf.client?.name || 'Client à définir'}
              {Object.keys(draftNeuf.selection ?? {}).length > 0
                && ` · ${Object.keys(draftNeuf.selection).length} ligne${Object.keys(draftNeuf.selection).length > 1 ? 's' : ''}`}
            </p>
          </div>
          <ChevronRight size={22} className="ml-auto text-slate-400 flex-shrink-0" />
        </button>
      )}

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
            <p className="font-bold text-amber-800">
              {draft.modifieId
                ? `Modification en cours — ${draft.numero ?? 'devis existant'}`
                : 'Devis en cours — reprendre où vous étiez'}
            </p>
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
              <div
                key={q.id}
                onClick={() => modifier(q)}
                className="card flex items-center gap-4 py-4 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-brand-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate flex items-center gap-2">
                    {q.clientName}
                    {q.type === 'neuf' && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex-shrink-0">
                        Maison neuve
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {q.number} · {q.projectType || 'Travaux'} ·{' '}
                    {q.modifieLe
                      ? `modifié le ${new Date(q.modifieLe).toLocaleDateString('fr-CA')}`
                      : new Date(q.savedAt).toLocaleDateString('fr-CA')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-brand-600">{formatCurrency(q.total)}</p>
                  <p className="text-[10px] text-slate-400">taxes incluses</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => modifier(q)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                  >
                    <Pencil size={14} /> Modifier
                  </button>
                  <button
                    onClick={() => deleteSaved(q.id)}
                    className="p-2 text-slate-300 hover:text-red-400 transition-colors"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aide */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800 leading-relaxed">
        <p className="font-semibold mb-1">💡 Comment ça marche ?</p>
        <p className="mb-2">
          <strong>Rénovation</strong> — en 4 étapes : <strong>1)</strong> le client, <strong>2)</strong> les pièces
          et leurs mesures, <strong>3)</strong> les travaux à faire, <strong>4)</strong> le devis avec le prix final.
        </p>
        <p className="mb-2">
          <strong>Maison neuve</strong> — en 3 étapes : le client, puis les divisions de travaux
          (béton, structure, toiture, plomberie…) où l'on ajoute ses lignes avec quantités et heures,
          et enfin le devis. Chaque ligne peut être marquée « exclue » : elle figure au devis sans être
          facturée, pour que le client voie ce qui n'est pas compris.
        </p>
        <p>
          Tout se sauvegarde automatiquement — vous pouvez fermer et reprendre plus tard sans rien perdre.
        </p>
      </div>
    </div>
  )
}
