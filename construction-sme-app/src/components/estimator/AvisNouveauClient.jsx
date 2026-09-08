import { UserPlus, Link2 } from 'lucide-react'
import { trouverClientParNom } from '../../data/clientsAuto'

// Dit à l'utilisateur ce qui va arriver au nom qu'il tape : un client de plus
// dans sa liste, ou le rattachement à celui qu'il a déjà. Sans ce message, la
// création se ferait dans son dos — et un nom déjà connu donnerait
// l'impression d'un doublon.
export default function AvisNouveauClient({ clients, saisie }) {
  const nom = String(saisie?.name ?? '').trim()
  if (!nom) return null

  const existant = trouverClientParNom(clients, nom)

  if (existant) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <Link2 size={17} className="flex-shrink-0 mt-0.5" />
        <p>
          <strong>{existant.name}</strong> est déjà dans vos clients — le devis y sera rattaché,
          sans créer de doublon.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
      <UserPlus size={17} className="flex-shrink-0 mt-0.5" />
      <p>
        <strong>{nom}</strong> sera ajouté à vos clients à l'enregistrement du devis, avec le
        téléphone et l'adresse saisis ici.
      </p>
    </div>
  )
}
