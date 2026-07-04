import { Link } from 'react-router-dom'
import {
  TrendingUp, DollarSign, FolderKanban, FileText, CheckCircle, Clock,
  ArrowRight, Package, HardHat, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useData } from '../../store/DataContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import { computeAlerts } from '../../utils/alerts'
import { formatCurrency, formatDate, statusColor } from '../../utils/formatters'
import clsx from 'clsx'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

const TYPE_COLORS = {
  'Commercial': '#f97316',
  'Résidentiel': '#3b82f6',
  'Municipal': '#8b5cf6',
  'Institutionnel': '#10b981',
  'Industriel': '#f59e0b',
}

// Carte de statistique cliquable — mène au module qui contient le détail
const StatCard = ({ label, value, sub, icon: Icon, iconColor, to }) => (
  <Link to={to} className="card group hover:shadow-md hover:border-brand-200 transition-all cursor-pointer">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1 group-hover:text-brand-600 transition-colors">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconColor)}>
        <Icon size={20} className="opacity-80" />
      </div>
    </div>
    <div className="flex items-center gap-1 mt-3 text-xs font-medium text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
      Voir le détail <ChevronRight size={12} />
    </div>
  </Link>
)

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
  const { data } = useData()
  const [settings] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const { projects, invoices, timesheets, quotes, clients, employees, materials } = data

  const now = new Date()
  const yearNow = String(now.getFullYear())
  const monthNow = now.toISOString().slice(0, 7) // AAAA-MM

  // ─── KPI calculés des vraies données ───
  const rateOf = (empId) => employees.find(e => e.id === empId)?.hourlyRate || 0

  const invoicesYear = invoices.filter(i => (i.date || '').startsWith(yearNow))
  const caFacture = invoicesYear.reduce((s, i) => s + i.total, 0)
  const caEncaisse = invoicesYear.filter(i => i.status === 'Payée').reduce((s, i) => s + i.total, 0)
  const aRecevoir = invoices.filter(i => i.status !== 'Payée').reduce((s, i) => s + i.total, 0)
  const enRetard = invoices.filter(i => i.status === 'En retard').reduce((s, i) => s + i.total, 0)

  const laborHoursYear = timesheets.filter(t => (t.date || '').startsWith(yearNow))
  const laborCostYear = laborHoursYear.reduce((s, t) => s + (t.hours || 0) * rateOf(t.employeeId), 0)
  const hoursThisMonth = timesheets.filter(t => (t.date || '').startsWith(monthNow)).reduce((s, t) => s + (t.hours || 0), 0)

  const activeProjects = projects.filter(p => p.status === 'En cours')
  const quotesPending = quotes.filter(q => q.status === 'Envoyée' || q.status === 'En attente')
  const quotesDecided = quotes.filter(q => q.status !== 'Brouillon')
  const conversionRate = quotesDecided.length
    ? Math.round(quotes.filter(q => q.status === 'Acceptée').length / quotesDecided.length * 100)
    : null

  const inventoryValue = materials.reduce((s, m) => s + m.stock * m.unitCost, 0)
  const lowStockCount = materials.filter(m => m.minStock > 0 && m.stock <= m.minStock).length

  const target = settings.revenueTarget || 0
  const caProgress = target > 0 ? Math.round((caFacture / target) * 100) : null

  // ─── Graphique mensuel : facturé / encaissé / coût M.O. (année en cours) ───
  const monthly = MONTHS_FR.map(m => ({ mois: m, 'Facturé': 0, 'Encaissé': 0, 'Coût M.O.': 0 }))
  for (const inv of invoicesYear) {
    const mIdx = parseInt(inv.date.slice(5, 7), 10) - 1
    if (mIdx >= 0 && mIdx < 12) {
      monthly[mIdx]['Facturé'] += inv.total
      if (inv.status === 'Payée') monthly[mIdx]['Encaissé'] += inv.total
    }
  }
  for (const t of laborHoursYear) {
    const mIdx = parseInt(t.date.slice(5, 7), 10) - 1
    if (mIdx >= 0 && mIdx < 12) monthly[mIdx]['Coût M.O.'] += (t.hours || 0) * rateOf(t.employeeId)
  }
  const lastMonthWithData = Math.max(now.getMonth(), 5)
  const chartData = monthly.slice(0, lastMonthWithData + 1)

  // ─── Répartition par type (budgets des projets réels) ───
  const byType = {}
  for (const p of projects) byType[p.type] = (byType[p.type] || 0) + (p.budgetTotal || 0)
  const totalBudget = Object.values(byType).reduce((s, v) => s + v, 0)
  const typeData = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value: totalBudget ? Math.round(value / totalBudget * 100) : 0,
      montant: value,
      fill: TYPE_COLORS[name] ?? '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value)

  // ─── Alertes réelles ───
  const alerts = computeAlerts(data)
  const pendingInvoices = invoices.filter(i => i.status !== 'Payée')

  return (
    <div className="space-y-6">
      {/* Bandeau : ces chiffres sont les vôtres */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Chiffres calculés en direct de vos factures, projets, heures et soumissions — cliquez sur une carte pour le détail</span>
        <span>{formatDate(now.toISOString().slice(0, 10))}</span>
      </div>

      {/* Alertes urgentes (cliquables) */}
      {alerts.filter(a => a.type === 'danger').map(a => (
        <Link key={a.id} to={a.to} className="block rounded-lg border px-3 py-2.5 text-xs leading-relaxed bg-red-50 border-red-200 text-red-700 hover:bg-red-100 transition-colors">
          {a.message} →
        </Link>
      ))}

      {/* KPI — tous cliquables */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={`Facturé en ${yearNow}`}
          value={formatCurrency(caFacture, true)}
          sub={`dont ${formatCurrency(caEncaisse, true)} encaissé`}
          icon={DollarSign}
          iconColor="bg-brand-100 text-brand-600"
          to="/facturation"
        />
        <StatCard
          label="Coût main-d'œuvre"
          value={formatCurrency(laborCostYear, true)}
          sub={`${laborHoursYear.reduce((s, t) => s + t.hours, 0)}h saisies en ${yearNow}`}
          icon={HardHat}
          iconColor="bg-violet-100 text-violet-600"
          to="/feuilles-de-temps"
        />
        <StatCard
          label="Projets actifs"
          value={activeProjects.length}
          sub={`${quotesPending.length} soumission(s) en attente de réponse`}
          icon={FolderKanban}
          iconColor="bg-blue-100 text-blue-600"
          to="/projets"
        />
        <StatCard
          label="Factures à recevoir"
          value={formatCurrency(aRecevoir, true)}
          sub={enRetard > 0 ? `⚠ ${formatCurrency(enRetard, true)} en retard` : 'Aucun retard'}
          icon={FileText}
          iconColor={enRetard > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}
          to="/facturation"
        />
      </div>

      {/* Deuxième rangée */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Link to="/parametres" className="card group hover:shadow-md hover:border-brand-200 transition-all flex flex-col">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Objectif CA annuel</p>
          {target > 0 ? (
            <>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-xl font-bold text-slate-800">{caProgress}%</span>
                <span className="text-slate-400 text-sm pb-0.5">atteint</span>
              </div>
              <div className="progress-bar mt-3">
                <div className="progress-fill bg-brand-500" style={{ width: `${Math.min(caProgress, 100)}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{formatCurrency(Math.max(target - caFacture, 0), true)} restant sur {formatCurrency(target, true)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-2">
              Définissez votre objectif annuel dans <span className="text-brand-500 font-medium group-hover:underline">Paramètres →</span>
            </p>
          )}
        </Link>
        <StatCard
          label="Taux conv. soumissions"
          value={conversionRate !== null ? `${conversionRate}%` : '—'}
          sub={`${quotes.filter(q => q.status === 'Acceptée').length} acceptée(s) sur ${quotesDecided.length}`}
          icon={CheckCircle}
          iconColor="bg-teal-100 text-teal-600"
          to="/soumissions"
        />
        <StatCard
          label="Heures ce mois"
          value={`${hoursThisMonth}h`}
          sub={`${employees.filter(e => e.status === 'Actif').length} employés actifs`}
          icon={Clock}
          iconColor="bg-violet-100 text-violet-600"
          to="/feuilles-de-temps"
        />
        <StatCard
          label="Valeur inventaire"
          value={formatCurrency(inventoryValue, true)}
          sub={lowStockCount > 0 ? `⚠ ${lowStockCount} article(s) sous le seuil` : `${materials.length} articles en stock`}
          icon={Package}
          iconColor={lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}
          to="/materiaux"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Facturé vs Encaissé vs Coût M.O. — {yearNow}</h2>
            <Link to="/rapports" className="text-xs text-brand-500 hover:underline">Rapports détaillés →</Link>
          </div>
          {caFacture === 0 && laborCostYear === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
              Aucune facture ni heure saisie en {yearNow} pour l'instant — les courbes apparaîtront ici.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="factGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="encGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="Facturé" stroke="#f97316" strokeWidth={2} fill="url(#factGrad)" dot={false} />
                <Area type="monotone" dataKey="Encaissé" stroke="#10b981" strokeWidth={2} fill="url(#encGrad)" dot={false} />
                <Area type="monotone" dataKey="Coût M.O." stroke="#8b5cf6" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Répartition par type (budgets réels des projets) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Projets par type</h2>
            <Link to="/projets" className="text-xs text-brand-500 hover:underline">Voir →</Link>
          </div>
          {typeData.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Aucun projet avec budget</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {typeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v, n, e) => [`${v}% (${formatCurrency(e.payload.montant, true)})`, e.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {typeData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700">{d.value}% · {formatCurrency(d.montant, true)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Projets + Factures */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Projets actifs</h2>
            <Link to="/projets" className="btn-ghost text-xs">
              Tous les projets <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {activeProjects.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">Aucun projet en cours</p>}
            {activeProjects.map(p => {
              const pct = p.budgetTotal ? Math.round((p.budgetSpent / p.budgetTotal) * 100) : 0
              return (
                <Link to={`/projets/${p.id}`} key={p.id} className="block group">
                  <div className="p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800 group-hover:text-brand-600 transition-colors">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.client}{p.manager ? ` · ${p.manager}` : ''}</p>
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
                      <span className={clsx('font-medium', pct > 90 ? 'text-red-600' : pct > 80 ? 'text-amber-600' : 'text-slate-500')}>
                        {pct}% engagé
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

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
                {pendingInvoices.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-6 text-sm text-slate-400">Toutes les factures sont payées 🎉</td></tr>
                )}
                {pendingInvoices.map(inv => (
                  <tr key={inv.id} className="table-row-hover">
                    <td className="px-3 py-2.5">
                      <Link to="/facturation" className="hover:text-brand-600">
                        <p className="font-medium text-slate-700 text-xs">{inv.number}</p>
                        <p className="text-slate-400 text-xs">Éch. {formatDate(inv.dueDate)}</p>
                      </Link>
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

      {/* Alertes + feuilles de temps */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="section-title mb-3">Alertes & notifications</h2>
          <div className="space-y-2">
            {alerts.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">Aucune alerte — tout est en ordre 👍</p>}
            {alerts.map(a => {
              const colors = {
                danger: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
                warning: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
                info: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
                success: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
              }
              return (
                <Link key={a.id} to={a.to} className={clsx('block rounded-lg border px-3 py-2.5 text-xs leading-relaxed transition-colors', colors[a.type])}>
                  {a.message} →
                </Link>
              )
            })}
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
            {timesheets.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">Aucune entrée de temps</p>}
            {[...timesheets].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5).map(t => (
              <Link to="/feuilles-de-temps" key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded px-1 -mx-1 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {t.employee.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{t.employee}</p>
                    <p className="text-xs text-slate-400 truncate">{t.project} · {formatDate(t.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{t.hours}h</span>
                  <span className={clsx('badge text-[10px]', t.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                    {t.approved ? 'Approuvé' : 'En attente'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
