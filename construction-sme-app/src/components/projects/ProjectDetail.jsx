import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, User, Calendar, DollarSign, CheckCircle, Circle, Clock } from 'lucide-react'
import { projects } from '../../data/mockData'
import { formatCurrency, formatDate, statusColor, progressColor, budgetHealthColor } from '../../utils/formatters'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

export default function ProjectDetail() {
  const { id } = useParams()
  const project = projects.find(p => p.id === Number(id))
  if (!project) return <div className="text-slate-500 p-8">Projet introuvable</div>

  const budgetPct = Math.round((project.budgetSpent / project.budgetTotal) * 100)
  const budgetRemaining = project.budgetTotal - project.budgetSpent

  const tasksByStatus = {
    'À faire': project.tasks.filter(t => t.status === 'À faire'),
    'En cours': project.tasks.filter(t => t.status === 'En cours'),
    'Terminé': project.tasks.filter(t => t.status === 'Terminé'),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/projets" className="btn-ghost mb-3 -ml-1">
          <ArrowLeft size={16} /> Retour aux projets
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{project.code}</span>
              <span className={clsx('badge', statusColor[project.status])}>{project.status}</span>
              <span className="badge bg-slate-100 text-slate-600">{project.type}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{project.name}</h2>
            <p className="text-slate-500 text-sm mt-1">{project.description}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button className="btn-secondary">Modifier</button>
            <button className="btn-primary">Créer facture</button>
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-start gap-3 py-3.5">
          <User size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Responsable</p>
            <p className="text-sm font-semibold text-slate-800">{project.manager}</p>
          </div>
        </div>
        <div className="card flex items-start gap-3 py-3.5">
          <MapPin size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Adresse du chantier</p>
            <p className="text-sm font-semibold text-slate-800 leading-snug">{project.address}</p>
          </div>
        </div>
        <div className="card flex items-start gap-3 py-3.5">
          <Calendar size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Période</p>
            <p className="text-sm font-semibold text-slate-800">{formatDate(project.startDate)}</p>
            <p className="text-xs text-slate-400">au {formatDate(project.endDate)}</p>
          </div>
        </div>
        <div className="card flex items-start gap-3 py-3.5">
          <User size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Client</p>
            <p className="text-sm font-semibold text-slate-800">{project.client}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Budget & Finances</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Budget total</span>
              <span className="font-semibold">{formatCurrency(project.budgetTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Dépensé</span>
              <span className={clsx('font-semibold', budgetHealthColor(project.budgetSpent, project.budgetTotal))}>{formatCurrency(project.budgetSpent)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Restant</span>
              <span className="font-semibold text-blue-600">{formatCurrency(budgetRemaining)}</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Budget engagé</span>
                <span className="font-medium">{budgetPct}%</span>
              </div>
              <div className="progress-bar">
                <div className={clsx('progress-fill', budgetPct > 90 ? 'bg-red-500' : budgetPct > 75 ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Avancement global</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="60" cy="60" r="48" fill="none" stroke="#f97316" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 48 * project.progress / 100} ${2 * Math.PI * 48}`}
                  strokeLinecap="round" className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{project.progress}%</span>
                <span className="text-xs text-slate-400">complété</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick tasks */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm">Tâches ({project.tasks.length})</h3>
          <div className="space-y-2">
            {project.tasks.map(task => (
              <div key={task.id} className="flex items-start gap-2 text-xs">
                {task.status === 'Terminé'
                  ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  : task.status === 'En cours'
                  ? <Clock size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  : <Circle size={14} className="text-slate-300 flex-shrink-0 mt-0.5" />
                }
                <div className="min-w-0">
                  <p className={clsx('font-medium', task.status === 'Terminé' ? 'text-slate-400 line-through' : 'text-slate-700')}>{task.title}</p>
                  <p className="text-slate-400">{task.assignee} · {formatDate(task.due)}</p>
                </div>
                <span className={clsx('badge ml-auto flex-shrink-0', statusColor[task.priority])}>{task.priority}</span>
              </div>
            ))}
            {project.tasks.length === 0 && <p className="text-slate-400 text-xs">Aucune tâche</p>}
          </div>
        </div>
      </div>

      {/* Phases */}
      {project.phases.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Phases du projet</h3>
          <div className="space-y-3">
            {project.phases.map((phase, i) => {
              const phasePct = Math.round((phase.spent / phase.budget) * 100) || 0
              return (
                <div key={i} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0',
                        phase.status === 'Terminé' ? 'bg-emerald-500' :
                        phase.status === 'En cours' ? 'bg-blue-500' : 'bg-slate-300'
                      )}>
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{phase.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={clsx('badge', statusColor[phase.status])}>{phase.status}</span>
                      <span className="text-xs text-slate-500 font-medium">{phase.progress}%</span>
                    </div>
                  </div>
                  <div className="ml-8 space-y-1">
                    <div className="progress-bar">
                      <div className={clsx('progress-fill', progressColor(phase.progress))} style={{ width: `${phase.progress}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Budget: {formatCurrency(phase.budget)}</span>
                      <span>Dépensé: {formatCurrency(phase.spent)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
