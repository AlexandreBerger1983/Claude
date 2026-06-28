import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, FolderKanban, FileText,
  AlertTriangle, CheckCircle, Clock, Users, ArrowRight, Package,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { kpis, revenueByMonth, projectTypeData, projects, invoices, alerts, timesheets } from '../../data/mockData'
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters'
import clsx from 'clsx'

const StatCard = ({ label, value, sub, icon: Icon, iconColor, trend, trendLabel }) => (
  <div className="card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconColor)}>
        <Icon size={20} className="opacity-80" />
      </div>
    </div>
    {trend !== undefined && (
      <div className={clsx('flex items-center gap-1 mt-3 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
        {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {trend >= 0 ? '+' : ''}{trend}% {trendLabel}
      </div>
    )}
  </div>
)

const AlertItem = ({ alert }) => {
  const colors = { danger: 'bg-red-50 border-red-200 text-red-700', warning: 'bg-amber-50 border-amber-200 text-amber-700', info: 'bg-blue-50 border-blue-200 text-blue-700', success: 'bg-emerald-50 border-emerald-200 text-emerald-700' }
  return (
    <div className={clsx('rounded-lg border px-3 py-2.5 text-xs leading-relaxed', colors[alert.type])}>
      {alert.message}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs shadow-xl">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}: {formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const caProgress = Math.round((kpis.chiffreAffairesAnnuel / kpis.chiffreAffairesObjectif) * 100)
  const activeProjects = projects.filter(p => p.status === 'En cours')
  const pendingInvoices = invoices.filter(i => i.status !== 'Payée')
  const lateTInvoices = invoices.filter(i => i.status === 'En retard')

  return (
    <div className="space-y-6">
      {/* Alerts row */}
      {alerts.filter(a => a.type === 'danger').length > 0 && (
        <div className="space-y-2">
          {alerts.filter(a => a.type === 'danger').map(a => <AlertItem key={a.id} alert={a} />)}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Chiffre d'affaires YTD"
          value={formatCurrency(kpis.chiffreAffairesAnnuel, true)}
          sub={`Objectif: ${formatCurrency(kpis.chiffreAffairesObjectif, true)} (${caProgress}%)`}
          icon={DollarSign}
          iconColor="bg-brand-100 text-brand-600"
          trend={12.4}
          trendLabel="vs. an dernier"
        />
        <StatCard
          label="Marge nette"
          value={`${kpis.margeNettePercent}%`}
          sub="Moyenne 6 derniers mois"
          icon={TrendingUp}
          iconColor="bg-emerald-100 text-emerald-600"
          trend={2.1}
          trendLabel="vs. an dernier"
        />
        <StatCard
          label="Projets actifs"
          value={kpis.projectsActifs}
          sub={`${kpis.soumissionsEnCours} soumissions en cours`}
          icon={FolderKanban}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Factures à recevoir"
          value={formatCurrency(kpis.facturesEnAttente, true)}
          sub={lateTInvoices.length > 0 ? `⚠ ${formatCurrency(kpis.facturesEnRetard, true)} en retard` : 'Aucun retard'}
          icon={FileText}
          iconColor={lateTInvoices.length ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}
        />
      </div>

      {/* Second KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card flex flex-col">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Objectif CA annuel</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-xl font-bold text-slate-800">{caProgress}%</span>
            <span className="text-slate-400 text-sm pb-0.5">atteint</span>
          </div>
          <div className="progress-bar mt-3">
            <div className="progress-fill bg-brand-500" style={{ width: `${caProgress}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{formatCurrency(kpis.chiffreAffairesObjectif - kpis.chiffreAffairesAnnuel, true)} restant</p>
        </div>
        <StatCard
          label="Taux conv. soumissions"
          value={`${kpis.tauxConversionSoumissions}%`}
          sub="6 derniers mois"
          icon={CheckCircle}
          iconColor="bg-teal-100 text-teal-600"
          trend={5}
          trendLabel="vs. 6 mois préc."
        />
        <StatCard
          label="Heures ce mois"
          value={kpis.heuresCeeMois.toLocaleString('fr-CA')}
          sub={`${kpis.nbEmployes} employés actifs`}
          icon={Clock}
          iconColor="bg-violet-100 text-violet-600"
        />
        <StatCard
          label="Satisfaction client"
          value={`${kpis.satisfactionClient} / 5`}
          sub={`${kpis.nbSousTraitants} sous-traitants actifs`}
          icon={Users}
          iconColor="bg-rose-100 text-rose-600"
          trend={0.3}
          trendLabel="vs. an dernier"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Revenus vs Dépenses 2026</h2>
            <span className="text-xs text-slate-400">6 derniers mois</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueByMonth} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="revenus" name="Revenus" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              <Area type="monotone" dataKey="depenses" name="Dépenses" stroke="#3b82f6" strokeWidth={2} fill="url(#depGrad)" dot={false} />
              <Area type="monotone" dataKey="marge" name="Marge" stroke="#10b981" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Project type pie */}
        <div className="card">
          <h2 className="section-title mb-4">Répartition par type</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={projectTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                {projectTypeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {projectTypeData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="font-semibold text-slate-700">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects + Invoices */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Active projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Projets actifs</h2>
            <Link to="/projets" className="btn-ghost text-xs">
              Tous les projets <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {activeProjects.map(p => {
              const over = p.budgetSpent > p.budgetTotal
              const pct = Math.round((p.budgetSpent / p.budgetTotal) * 100)
              return (
                <Link to={`/projets/${p.id}`} key={p.id} className="block group">
                  <div className="p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.client} · {p.manager}</p>
                      </div>
                      <span className={clsx('badge flex-shrink-0', statusColor[p.status])}>{p.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 progress-bar">
                        <div
                          className={clsx('progress-fill', p.progress >= 75 ? 'bg-emerald-500' : p.progress >= 40 ? 'bg-blue-500' : 'bg-brand-400')}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 flex-shrink-0">{p.progress}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
                      <span>Budget: {formatCurrency(p.budgetSpent, true)} / {formatCurrency(p.budgetTotal, true)}</span>
                      <span className={clsx('font-medium', over ? 'text-red-600' : pct > 80 ? 'text-amber-600' : 'text-slate-500')}>
                        {pct}% engagé
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Pending invoices */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Factures à recevoir</h2>
            <Link to="/facturation" className="btn-ghost text-xs">
              Toutes <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Facture</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Client</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-slate-500">Montant</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingInvoices.map(inv => (
                  <tr key={inv.id} className="table-row-hover">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-700 text-xs">{inv.number}</p>
                      <p className="text-slate-400 text-xs">Éch. {formatDate(inv.dueDate)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[130px] truncate">{inv.client}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-xs text-slate-800">{formatCurrency(inv.total)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={clsx('badge', statusColor[inv.status])}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alerts + timesheets */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="section-title mb-3">Alertes & notifications</h2>
          <div className="space-y-2">
            {alerts.map(a => <AlertItem key={a.id} alert={a} />)}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Feuilles de temps récentes</h2>
            <Link to="/feuilles-de-temps" className="btn-ghost text-xs">
              Tout voir <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {timesheets.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {t.employee.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{t.employee}</p>
                    <p className="text-xs text-slate-400 truncate">{t.project}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{t.hours}h</span>
                  <span className={clsx('badge text-[10px]', t.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                    {t.approved ? 'Approuvé' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
