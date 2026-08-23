import { useState } from 'react'
import { ShieldAlert, Download, X } from 'lucide-react'
import {
  doitRappeler, joursDepuisSauvegarde, jamaisSauvegarde,
  exportBackup, reporterRappel, RAPPEL_JOURS,
} from '../../utils/backup'

// Bandeau rappelant de sauvegarder les données une fois par mois.
//
// Un navigateur ne peut pas écrire un fichier sur le disque de lui-même : la
// sauvegarde restera toujours un geste volontaire. Ce rappel est donc la seule
// façon d'éviter qu'elle soit oubliée pendant des mois.
export default function BackupReminder() {
  const [visible, setVisible] = useState(() => doitRappeler())
  const [erreur, setErreur] = useState(null)

  if (!visible) return null

  const jours = joursDepuisSauvegarde()
  const jamais = jamaisSauvegarde()

  const sauvegarder = () => {
    try {
      exportBackup()
      setVisible(false)
    } catch (e) {
      setErreur(e?.message || 'erreur inconnue')
    }
  }

  const plusTard = () => {
    reporterRappel(7)
    setVisible(false)
  }

  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 no-print">
      <div className="flex items-start gap-3">
        <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-900">
            {jamais
              ? 'Vos données ne sont pas encore sauvegardées'
              : `Dernière sauvegarde il y a ${jours} jours`}
          </p>
          <p className="text-sm text-amber-800 mt-0.5">
            Vos données sont enregistrées uniquement dans ce navigateur. Téléchargez une copie
            au moins une fois par mois et conservez-la ailleurs (OneDrive, clé USB).
          </p>
          {erreur && (
            <p className="text-sm text-red-700 mt-1">La sauvegarde a échoué : {erreur}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={sauvegarder} className="btn-primary py-2">
              <Download size={15} /> Sauvegarder maintenant
            </button>
            <button onClick={plusTard} className="btn-secondary py-2">
              Me le rappeler dans 7 jours
            </button>
          </div>
        </div>
        <button
          onClick={plusTard}
          className="p-1 text-amber-400 hover:text-amber-700 flex-shrink-0"
          aria-label={`Masquer le rappel de sauvegarde pendant 7 jours (rappel automatique tous les ${RAPPEL_JOURS} jours)`}
          title="Masquer pendant 7 jours"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
