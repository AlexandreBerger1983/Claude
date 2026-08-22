import clsx from 'clsx'

// Reproduit la feuille « Formulaire soumission » du gabarit Excel : chaque
// travail possible de la pièce est énuméré et marqué « Inclus » ou
// « Non-applicable », pour que le client voie aussi ce qui n'est PAS compris
// dans le prix. Le gabarit s'appuie sur la formule :
//   =SI(Relevé!Jxx = 1 ; "Inclus" ; "Non-applicable")
export default function WorkChecklist({ rooms }) {
  const withList = rooms.filter(r => (r.checklist?.length ?? 0) > 0)
  if (withList.length === 0) return null

  return (
    <div className="mt-6 pt-5 border-t border-slate-200">
      <h4 className="font-bold text-slate-800 mb-1">Description des travaux</h4>
      <p className="text-xs text-slate-500 mb-4">
        Chaque travail est indiqué « Inclus » ou « Non-applicable ». Seuls les travaux marqués « Inclus » font partie du prix soumis.
      </p>

      {withList.map(room => {
        const sections = [...new Set(room.checklist.map(c => c.section))]
        return (
          <div key={room.id} className="mb-5">
            <p className="font-semibold text-slate-700 text-sm mb-2">
              {room.emoji} {room.name}
            </p>
            {sections.map(section => (
              <div key={section} className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{section}</p>
                <table className="w-full text-sm">
                  <tbody>
                    {room.checklist.filter(c => c.section === section).map(c => (
                      <tr key={c.id} className="border-b border-slate-50">
                        <td className="py-1.5 pr-3 text-slate-700">{c.label}</td>
                        <td className="py-1.5 text-right whitespace-nowrap w-32">
                          <span className={clsx(
                            'text-xs font-semibold',
                            c.included ? 'text-emerald-600' : 'text-slate-400',
                          )}>
                            {c.included ? 'Inclus' : 'Non-applicable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )
      })}

      <p className="text-xs text-slate-500 italic">
        Note sur la céramique : la pose et la colle sont incluses. Le client fournit la céramique et le coulis.
      </p>
    </div>
  )
}
