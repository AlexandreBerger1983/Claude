import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react'
import { projects } from '../../data/mockData'
import { formatDate, statusColor } from '../../utils/formatters'
import clsx from 'clsx'

const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const projectColors = ['bg-brand-500', 'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500']

export default function Calendar() {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(5) // 0-indexed = June

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const getProjectsForDay = (day) => {
    const date = new Date(year, month, day)
    return projects.filter(p => {
      const start = new Date(p.startDate)
      const end = new Date(p.endDate)
      return date >= start && date <= end && p.status !== 'Terminé'
    })
  }

  const cells = Array.from({ length: firstDay }).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )

  const today = new Date('2026-06-28')
  const isToday = (day) => day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate()

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Calendrier</h2>
          <p className="text-sm text-slate-500 mt-0.5">Vue des projets actifs sur la période</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="btn-secondary p-2"><ChevronLeft size={16} /></button>
          <span className="text-base font-semibold text-slate-700 w-36 text-center">{MONTH_NAMES_FR[month]} {year}</span>
          <button onClick={next} className="btn-secondary p-2"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="card xl:col-span-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES_FR.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const dayProjects = day ? getProjectsForDay(day) : []
              return (
                <div
                  key={i}
                  className={clsx(
                    'min-h-[80px] rounded-xl p-1.5 text-xs transition-colors',
                    day ? 'hover:bg-slate-50 cursor-pointer' : '',
                    isToday(day) ? 'bg-brand-50 border border-brand-200' : 'border border-transparent'
                  )}
                >
                  {day && (
                    <>
                      <span className={clsx('inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1',
                        isToday(day) ? 'bg-brand-500 text-white' : 'text-slate-600'
                      )}>
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {dayProjects.slice(0, 2).map((p, pi) => (
                          <div key={p.id} className={clsx('text-[10px] text-white rounded px-1 py-0.5 truncate', projectColors[pi % projectColors.length])}>
                            {p.code}
                          </div>
                        ))}
                        {dayProjects.length > 2 && (
                          <div className="text-[10px] text-slate-400">+{dayProjects.length - 2} autres</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar — Active project timelines */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Projets actifs</h3>
            <div className="space-y-3">
              {projects.filter(p => p.status !== 'Terminé').map((p, pi) => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={clsx('w-2.5 h-2.5 rounded-sm flex-shrink-0', projectColors[pi % projectColors.length])} />
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(p.startDate)} → {formatDate(p.endDate)}</p>
                  <div className="mt-2 progress-bar">
                    <div className={clsx('progress-fill', projectColors[pi % projectColors.length])} style={{ width: `${p.progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{p.progress}% · {p.manager}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Échéances ce mois</h3>
            <div className="space-y-2">
              {projects.flatMap(p => p.tasks).filter(t => t.status !== 'Terminé' && t.due?.startsWith('2026-07')).map(t => (
                <div key={t.id} className="flex items-start gap-2 text-xs border-b border-slate-100 pb-2 last:border-0">
                  <CalIcon size={12} className="text-brand-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700">{t.title}</p>
                    <p className="text-slate-400">{t.assignee} · {formatDate(t.due)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
