import { CONDITIONS_GENERALES, ACCEPTANCE_TEXT } from '../../data/legalTerms'

// Bas de page légal identique sur tous les devis imprimés/affichés : conditions
// générales, acceptation du client et bloc de signature — transcrits des
// modèles de contrat papier de l'entreprise (voir src/data/legalTerms.js).
export default function QuoteLegalFooter({ companyName, signatoryName }) {
  const signatory = [signatoryName, companyName].filter(Boolean).join(' — ')

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-3">
      <p className="font-semibold text-slate-600 text-sm">Conditions générales</p>
      <ol className="space-y-2 list-decimal list-inside marker:text-slate-400">
        {CONDITIONS_GENERALES.map((c, i) => (
          <li key={i}>
            {c.text}
            {c.subItems && (
              <ul className="list-none pl-5 mt-1 space-y-1 text-slate-400">
                {c.subItems.map((s, j) => <li key={j}>{s}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <div className="pt-6">
        <div className="w-64 border-t border-slate-300 pt-1">Par : _____________________________</div>
        {signatory && <p className="mt-1 text-slate-400">{signatory}</p>}
      </div>

      <p className="pt-4 text-slate-600">{ACCEPTANCE_TEXT}</p>

      <div className="grid sm:grid-cols-2 gap-8 pt-6">
        <div className="border-t border-slate-300 pt-1">Signature du client</div>
        <div className="border-t border-slate-300 pt-1">Date</div>
      </div>
    </div>
  )
}
