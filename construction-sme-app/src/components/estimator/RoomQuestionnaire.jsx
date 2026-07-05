import { useState, useMemo } from 'react'
import { X, ClipboardList, ChevronDown } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import clsx from 'clsx'

// Questionnaire d'estimation détaillé pour une pièce — reproduit le
// formulaire papier : chaque travail possible est une question Oui/Non ;
// répondre Oui déplie les champs (temps, coûts, superficie…) et chaque
// Oui génère les lignes du devis correspondantes.
export default function RoomQuestionnaire({ room, questionnaire, onSubmit, onClose }) {
  // réponses : { [questionId]: { yes: bool, values: {...} } }
  const [answers, setAnswers] = useState({})
  const [openSections, setOpenSections] = useState(() => ({ [questionnaire.sections[0]?.title]: true }))

  const defaultsFor = (question) => {
    const v = {}
    for (const inp of question.inputs) v[inp.name] = inp.default ?? (inp.type === 'select' ? (inp.options?.[0] ?? '') : inp.type === 'number' ? 0 : '')
    return v
  }

  const setYes = (question, yes) =>
    setAnswers(a => ({
      ...a,
      [question.id]: { yes, values: a[question.id]?.values ?? defaultsFor(question) },
    }))

  const setValue = (question, name, value) =>
    setAnswers(a => ({
      ...a,
      [question.id]: {
        yes: a[question.id]?.yes ?? true,
        values: { ...(a[question.id]?.values ?? defaultsFor(question)), [name]: value },
      },
    }))

  // Lignes générées + notes d'information, recalculées en direct
  const { lines, notes, total } = useMemo(() => {
    const lines = []
    const notes = []
    for (const section of questionnaire.sections) {
      for (const question of section.questions) {
        const ans = answers[question.id]
        if (question.infoOnly) {
          const val = ans?.values?.val
          if (val && String(val).trim()) notes.push(`${question.label} : ${val}`)
          continue
        }
        if (!ans?.yes) continue
        const values = ans.values ?? defaultsFor(question)
        const parsed = {}
        for (const inp of question.inputs) {
          parsed[inp.name] = inp.type === 'number' ? (parseFloat(values[inp.name]) || 0) : values[inp.name]
        }
        for (const line of question.lines(parsed)) {
          if ((line.qty || 0) > 0 && ((line.unitMat || 0) > 0 || (line.unitLabor || 0) > 0)) lines.push(line)
        }
      }
    }
    const total = lines.reduce((s, l) => s + l.qty * ((l.unitMat || 0) + (l.unitLabor || 0)), 0)
    return { lines, notes, total }
  }, [answers, questionnaire])

  const yesCount = Object.values(answers).filter(a => a.yes).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={20} className="text-brand-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-800">Questionnaire — {questionnaire.title}</h3>
            <p className="text-xs text-slate-400 truncate">{room?.emoji} {room?.name} · répondez Oui aux travaux à faire, les prix se calculent tout seuls</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {questionnaire.sections.map(section => {
            const isOpen = openSections[section.title]
            const sectionYes = section.questions.filter(qu => answers[qu.id]?.yes).length
            return (
              <div key={section.title}>
                <button
                  onClick={() => setOpenSections(o => ({ ...o, [section.title]: !o[section.title] }))}
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50/70 hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="font-bold text-slate-700 text-sm uppercase tracking-wide flex-1">{section.title}</span>
                  {sectionYes > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full px-2.5 py-0.5">{sectionYes} oui</span>
                  )}
                  <ChevronDown size={17} className={clsx('text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="divide-y divide-slate-50">
                    {section.questions.map(question => {
                      const ans = answers[question.id]
                      const isYes = ans?.yes === true
                      const isNo = ans?.yes === false
                      const values = ans?.values ?? defaultsFor(question)

                      // question d'information : pas de Oui/Non, juste un champ
                      if (question.infoOnly) {
                        const inp = question.inputs[0]
                        return (
                          <div key={question.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                            <p className="text-sm text-slate-700 flex-1 min-w-[200px]">{question.label}</p>
                            {inp.type === 'select' ? (
                              <select value={values.val ?? ''} onChange={e => setValue(question, 'val', e.target.value)} className="input w-44 py-1.5 text-sm">
                                <option value="">—</option>
                                {inp.options.map(o => <option key={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input value={values.val ?? ''} onChange={e => setValue(question, 'val', e.target.value)} className="input w-44 py-1.5 text-sm" />
                            )}
                          </div>
                        )
                      }

                      return (
                        <div key={question.id} className={clsx('px-5 py-3', isYes && 'bg-emerald-50/40')}>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-slate-700 flex-1">{question.label}</p>
                            <div className="flex rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                              <button
                                onClick={() => setYes(question, true)}
                                className={clsx('px-3.5 py-1.5 text-xs font-bold transition-colors',
                                  isYes ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 hover:bg-emerald-50')}
                              >
                                Oui
                              </button>
                              <button
                                onClick={() => setYes(question, false)}
                                className={clsx('px-3.5 py-1.5 text-xs font-bold transition-colors border-l border-slate-200',
                                  isNo ? 'bg-slate-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-100')}
                              >
                                Non
                              </button>
                            </div>
                          </div>

                          {/* Champs dépliés quand Oui */}
                          {isYes && question.inputs.length > 0 && (
                            <div className="mt-2.5 ml-2 pl-3 border-l-2 border-emerald-200 space-y-2">
                              {question.inputs.map(inp => (
                                <div key={inp.name} className="flex items-center gap-2 flex-wrap">
                                  <label className="text-xs text-slate-500 flex-1 min-w-[160px]">{inp.label}</label>
                                  {inp.type === 'select' ? (
                                    <select
                                      value={values[inp.name] ?? ''}
                                      onChange={e => setValue(question, inp.name, e.target.value)}
                                      className="input w-40 py-1 text-sm"
                                    >
                                      {inp.options.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                  ) : inp.type === 'number' ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number" min="0" step="0.5" inputMode="decimal"
                                        value={values[inp.name] ?? 0}
                                        onChange={e => setValue(question, inp.name, e.target.value)}
                                        onFocus={e => e.target.select()}
                                        className="input w-24 py-1 text-sm text-right"
                                      />
                                      <span className="text-xs text-slate-400 w-9">{inp.unit}</span>
                                    </div>
                                  ) : (
                                    <input
                                      value={values[inp.name] ?? ''}
                                      onChange={e => setValue(question, inp.name, e.target.value)}
                                      className="input w-40 py-1 text-sm"
                                    />
                                  )}
                                </div>
                              ))}
                              {/* prix estimé de la question */}
                              {(() => {
                                const parsed = {}
                                for (const inp of question.inputs) parsed[inp.name] = inp.type === 'number' ? (parseFloat(values[inp.name]) || 0) : values[inp.name]
                                const qLines = question.lines(parsed)
                                const qTotal = qLines.reduce((s, l) => s + l.qty * ((l.unitMat || 0) + (l.unitLabor || 0)), 0)
                                return qTotal > 0 ? (
                                  <p className="text-xs font-bold text-emerald-700">≈ {formatCurrency(qTotal)}</p>
                                ) : null
                              })()}
                            </div>
                          )}
                          {isYes && question.inputs.length === 0 && (() => {
                            const qLines = question.lines({})
                            const qTotal = qLines.reduce((s, l) => s + l.qty * ((l.unitMat || 0) + (l.unitLabor || 0)), 0)
                            return qTotal > 0 ? (
                              <p className="mt-1.5 ml-2 pl-3 border-l-2 border-emerald-200 text-xs font-bold text-emerald-700">≈ {formatCurrency(qTotal)}</p>
                            ) : null
                          })()}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pied : total + ajout */}
        <div className="border-t border-slate-200 p-4 flex items-center gap-3 flex-shrink-0 bg-white rounded-b-2xl">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{yesCount} travaux « Oui » · {lines.length} ligne(s) au devis</p>
            <p className="text-xl font-extrabold text-brand-600">{formatCurrency(total)}</p>
          </div>
          <button onClick={onClose} className="btn-secondary flex-shrink-0">Annuler</button>
          <button
            onClick={() => { onSubmit(lines, notes); onClose() }}
            disabled={lines.length === 0}
            className={clsx('btn-primary flex-shrink-0', lines.length === 0 && 'opacity-40 cursor-not-allowed')}
          >
            Ajouter au devis
          </button>
        </div>
      </div>
    </div>
  )
}
