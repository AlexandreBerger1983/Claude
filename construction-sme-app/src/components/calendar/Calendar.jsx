import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Clock, ChevronRight as Arrow, X, MapPin, Phone, Mail, User } from 'lucide-react'
import { useData } from '../../store/DataContext'
import { formatDate, statusColor } from '../../utils/formatters'
import clsx from 'clsx'

const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const projectColors = ['bg-brand-500', 'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500']

export default function Calendar() {
  const { data } = useData()
  const navigate = useNavigate()
  const projects = data.projects
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  const prev = () => { setSelectedDay(null); if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { setSelectedDay(null); if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const activeProjectsList = projects.filter(p => p.status !== 'Terminé')

  // couleur stable par projet (selon sa position dans la liste des actifs)
  const colorOf = (projectId) => {
    const idx = activeProjectsList.findIndex(p => p.id === projectId)
    return projectColors[(idx >= 0 ? idx : 0) % projectColors.length]
  }

  // lien Google Maps pour une adresse de chantier
  const mapsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  // coordonnées du responsable (courriel / téléphone) depuis le module Employés
  const managerOf = (p) => data.employees.find(e => e.name === p.manager)

  const getProjectsForDay = (day) => {
    const date = new Date(year, month, day)
    return activeProjectsList.filter(p => {
      if (!p.startDate || !p.endDate) return false
      const start = new Date(p.startDate)
      const end = new Date(p.endDate)
      return date >= start && date <= end
    })
  }

  // toutes les tâches avec leur projet d'origine
  const allTasks = projects.flatMap(p =>
    (p.tasks || []).map(t => ({ ...t, projectId: p.id, projectName: p.name, projectCode: p.code }))
  )
  const tasksForDay = (day) => {
    const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`
    return allTasks.filter(t => t.due === dateStr)
  }
  const monthTasks = allTasks
    .filter(t => (t.due || '').startsWith(monthKey))
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''))

  const cells = Array.from({ length: firstDay }).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )

  const today = new Date()
  const isToday = (day) => day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate()

  const TaskIcon = ({ status }) =>
    status === 'Terminé' ? <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
      : status === 'En cours' ? <Clock size={13} className="text-blue-500 flex-shrink-0" />
      : <Circle size={13} className="text-slate-300 flex-shrink-0" />

  const selectedProjects = selectedDay ? getProjectsForDay(selectedDay) : []
  const selectedTasks = selectedDay ? tasksForDay(selectedDay) : []

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="section-title">Calendrier</h2>
          <p className="text-sm text-slate-500 mt-0.5">Cliquez sur un jour, un projet ou une échéance pour voir le détail</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="btn-secondary p-2"><ChevronLeft size={16} /></button>
          <span className="text-base font-semibold text-slate-700 w-36 text-center">{MONTH_NAMES_FR[month]} {year}</span>
          <button onClick={next} className="btn-secondary p-2"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Grille du calendrier */}
        <div className="card xl:col-span-2">
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES_FR.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              const dayProjects = day ? getProjectsForDay(day) : []
              const dayTasks = day ? tasksForDay(day) : []
              return (
                <button
                  key={i}
                  disabled={!day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={clsx(
                    'min-h-[80px] rounded-xl p-1.5 text-xs transition-colors text-left align-top',
                    day ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default',
                    isToday(day) ? 'bg-brand-50 border border-brand-200' :
                    selectedDay === day && day ? 'bg-blue-50 border border-blue-300' : 'border border-transparent'
                  )}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className={clsx('inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1',
                          isToday(day) ? 'bg-brand-500 text-white' : 'text-slate-600'
                        )}>
                          {day}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-red-400" title={`${dayTasks.length} échéance(s)`} />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayProjects.slice(0, 2).map(p => (
                          <span
                            key={p.id}
                            role="link"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); navigate(`/projets/${p.id}`) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/projets/${p.id}`) } }}
                            title={`${p.name} — voir le projet`}
                            className={clsx('block text-[10px] text-white rounded px-1 py-0.5 truncate hover:opacity-80 hover:ring-2 hover:ring-white/60 transition-all cursor-pointer', colorOf(p.id))}
                          >
                            {p.code}
                          </span>
                        ))}
                        {dayProjects.length > 2 && (
                          <span className="block text-[10px] text-slate-400">+{dayProjects.length - 2} autres</span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          {/* Détail du jour sélectionné */}
          {selectedDay && (
            <div className="mt-4 p-4 bg-blue-50/60 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-slate-800 text-sm">
                  📅 {selectedDay} {MONTH_NAMES_FR[month].toLowerCase()} {year}
                </p>
                <button onClick={() => setSelectedDay(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={15} /></button>
              </div>

              {selectedProjects.length === 0 && selectedTasks.length === 0 && (
                <p className="text-sm text-slate-400">Aucun projet ni échéance ce jour-là.</p>
              )}

              {selectedProjects.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chantiers actifs ce jour</p>
                  {selectedProjects.map(p => {
                    const mgr = managerOf(p)
                    return (
                      <div key={p.id} className="bg-white rounded-lg px-3 py-2.5 border border-slate-100 hover:border-brand-200 hover:shadow-sm transition-all">
                        <Link to={`/projets/${p.id}`} className="flex items-center gap-2.5 group">
                          <span className={clsx('w-2.5 h-2.5 rounded-sm flex-shrink-0', colorOf(p.id))} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-700 group-hover:text-brand-600 truncate">{p.name}</p>
                            <p className="text-xs text-slate-400">{p.code} · {p.client} · {p.progress}%</p>
                          </div>
                          <span className={clsx('badge flex-shrink-0', statusColor[p.status])}>{p.status}</span>
                          <Arrow size={14} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0" />
                        </Link>
                        <div className="mt-1.5 ml-5 space-y-0.5">
                          {p.address && (
                            <a href={mapsUrl(p.address)} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                              title="Ouvrir dans Google Maps">
                              <MapPin size={11} className="flex-shrink-0" /> {p.address}
                            </a>
                          )}
                          {p.manager && (
                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                              <span className="flex items-center gap-1"><User size={11} /> {p.manager}</span>
                              {mgr?.phone && (
                                <a href={`tel:${mgr.phone}`} className="flex items-center gap-1 text-brand-600 hover:underline">
                                  <Phone size={11} /> {mgr.phone}
                                </a>
                              )}
                              {mgr?.email && (
                                <a href={`mailto:${mgr.email}`} className="flex items-center gap-1 text-brand-600 hover:underline">
                                  <Mail size={11} /> {mgr.email}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedTasks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Échéances ce jour</p>
                  {selectedTasks.map(t => (
                    <Link key={t.id} to={`/projets/${t.projectId}`}
                      className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 hover:shadow-sm border border-slate-100 hover:border-brand-200 transition-all group">
                      <TaskIcon status={t.status} />
                      <div className="min-w-0 flex-1">
                        <p className={clsx('text-sm font-medium truncate', t.status === 'Terminé' ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-brand-600')}>{t.title}</p>
                        <p className="text-xs text-slate-400">{t.assignee} · {t.projectCode}</p>
                      </div>
                      <span className={clsx('badge flex-shrink-0', statusColor[t.priority])}>{t.priority}</span>
                      <Arrow size={14} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Projets actifs</h3>
            <div className="space-y-3">
              {activeProjectsList.length === 0 && <p className="text-xs text-slate-400">Aucun projet actif</p>}
              {activeProjectsList.map(p => (
                <Link key={p.id} to={`/projets/${p.id}`}
                  className="block p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={clsx('w-2.5 h-2.5 rounded-sm flex-shrink-0', colorOf(p.id))} />
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-brand-600 truncate flex-1">{p.name}</p>
                    <Arrow size={13} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(p.startDate)} → {formatDate(p.endDate)}</p>
                  {p.address && (
                    <span
                      role="link" tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(mapsUrl(p.address), '_blank', 'noopener') }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); window.open(mapsUrl(p.address), '_blank', 'noopener') } }}
                      className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
                      title="Ouvrir dans Google Maps"
                    >
                      <MapPin size={11} className="flex-shrink-0" /> <span className="truncate">{p.address}</span>
                    </span>
                  )}
                  <div className="mt-2 progress-bar">
                    <div className={clsx('progress-fill', colorOf(p.id))} style={{ width: `${p.progress}%` }} />
                  </div>
                  {(() => {
                    const mgr = managerOf(p)
                    return (
                      <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                        <p>{p.progress}%{p.manager ? ` · ${p.manager}` : ''}</p>
                        {(mgr?.phone || mgr?.email) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {mgr?.phone && (
                              <span
                                role="link" tabIndex={0}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${mgr.phone}` }}
                                className="flex items-center gap-1 text-brand-600 hover:underline cursor-pointer"
                              >
                                <Phone size={10} /> {mgr.phone}
                              </span>
                            )}
                            {mgr?.email && (
                              <span
                                role="link" tabIndex={0}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `mailto:${mgr.email}` }}
                                className="flex items-center gap-1 text-brand-600 hover:underline cursor-pointer truncate"
                              >
                                <Mail size={10} /> {mgr.email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Échéances — {MONTH_NAMES_FR[month]} {year}</h3>
            <div className="space-y-1.5">
              {monthTasks.length === 0 && (
                <p className="text-xs text-slate-400">Aucune échéance ce mois-ci</p>
              )}
              {monthTasks.map(t => (
                <Link key={`${t.projectId}-${t.id}`} to={`/projets/${t.projectId}`}
                  className="flex items-start gap-2 text-xs border-b border-slate-100 pb-2 last:border-0 hover:bg-slate-50 rounded-lg px-1.5 py-1.5 -mx-1.5 transition-colors group">
                  <TaskIcon status={t.status} />
                  <div className="min-w-0 flex-1">
                    <p className={clsx('font-medium', t.status === 'Terminé' ? 'text-slate-400 line-through' : 'text-slate-700 group-hover:text-brand-600')}>{t.title}</p>
                    <p className="text-slate-400">{t.assignee} · {formatDate(t.due)}</p>
                    <p className="text-slate-400 truncate">{t.projectName}</p>
                  </div>
                  <Arrow size={13} className="text-slate-300 group-hover:text-brand-400 flex-shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
