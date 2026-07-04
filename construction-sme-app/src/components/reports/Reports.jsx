import { Download, TrendingUp, TrendingDown, DollarSign, Clock, Users, FolderKanban } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { revenueByMonth, kpis } from '../../data/mockData'
import { useData } from '../../store/DataContext'
import { formatCurrency } from '../../utils/formatters'
import { downloadCsv } from '../../utils/csv'

const marginData = revenueByMonth.filter(m => m.revenus > 0).map(m => ({
  mois: m.mois,
  'Marge %': m.revenus > 0 ? Math.round((m.marge / m.revenus) * 100) : 0,
}))

const STATUS_FILLS = {
  'En cours': '#3b82f6',
  'Planification': '#8b5cf6',
  'Soumission acceptée': '#10b981',
  'Terminé': '#94a3b8',
  'En pause': '#f59e0b',
}

export default function Reports() {
  const { data } = useData()
  const projects = data.projects

  const budgetData = projects.slice(0, 6).map(p => ({
    name: p.code,
    Budget: p.budgetTotal,
    Dépensé: p.budgetSpent,
  }))

  const statusCounts = {}
  for (const p of projects) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  const projectStatusData = Object.entries(statusCounts).map(([name, value]) => ({
    name, value, fill: STATUS_FILLS[name] ?? '#94a3b8',
  }))

  const exportRevenueCsv = () =>
    downloadCsv('revenus-mensuels.csv',
      ['Mois', 'Revenus', 'Dépenses', 'Marge'],
      revenueByMonth.map(m => [m.mois, m.revenus, m.depenses, m.marge]))

  const exportProjectsCsv = () =>
    downloadCsv('etat-des-projets.csv',
      ['Code', 'Projet', 'Client', 'Statut', 'Avancement %', 'Budget', 'Dépensé'],
      projects.map(p => [p.code, p.name, p.client, p.status, p.progress, p.budgetTotal, p.budgetSpent]))

  const exportPayrollCsv = () =>
    downloadCsv('masse-salariale.csv',
      ['Employé', 'Rôle', 'Taux horaire', 'Heures ce mois', 'Coût estimé'],
      data.employees.map(e => [e.name, e.role, e.hourlyRate, e.hrsThisMonth || 0, ((e.hrsThisMonth || 0) * e.hourlyRate).toFixed(2)]))

  const exportOverdueCsv = () =>
    downloadCsv('factures-en-souffrance.csv',
      ['Facture', 'Client', 'Projet', 'Échéance', 'Total'],
      data.invoices.filter(i => i.status === 'En retard').map(i => [i.number, i.client, i.project, i.dueDate, i.total]))

  return (
    <div id="devis" className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="section-title">Rapports & Analytiques</h2>
          <p className="text-sm text-slate-500 mt-0.5">Exercice en cours · Données à jour</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary no-print"><Download size={15} /> Exporter rapport PDF</button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'CA YTD', value: formatCurrency(kpis.chiffreAffairesAnnuel, true), sub: `Obj. ${formatCurrency(kpis.chiffreAffairesObjectif, true)}`, icon: DollarSign, color: 'text-brand-600 bg-brand-50', trend: '+12.4%' },
          { label: 'Marge nette moy.', value: `${kpis.margeNettePercent}%`, sub: 'Trend: hausse', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', trend: '+2.1 pts' },
          { label: 'Heures facturées', value: `${kpis.heuresCeeMois}h`, sub: 'Ce mois', icon: Clock, color: 'text-blue-600 bg-blue-50', trend: '+8%' },
          { label: 'Taux conversion', value: `${kpis.tauxConversionSoumissions}%`, sub: 'Soumissions → contrats', icon: FolderKanban, color: 'text-violet-600 bg-violet-50', trend: '+5 pts' },
        ].map((kpi, i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-slate-400">{kpi.sub}</span>
              <span className="text-xs font-semibold text-emerald-600">{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Revenus mensuels</h3>
          <button onClick={exportRevenueCsv} className="btn-ghost text-xs no-print"><Download size={13} /> CSV</button>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={revenueByMonth} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
            <Tooltip formatter={(v, name) => [formatCurrency(v), name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenus" name="Revenus" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="depenses" name="Dépenses" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="marge" name="Marge brute" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Margin trend */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Évolution marge nette (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={marginData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 50]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, 'Marge']} />
              <Line type="monotone" dataKey="Marge %" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Budget vs actual */}
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Budget vs Réel — Projets actifs</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={budgetData} layout="vertical" margin={{ top: 5, right: 20, bottom: 0, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
              <Tooltip formatter={(v, name) => [formatCurrency(v), name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Budget" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Dépensé" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project status + top summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Statut des projets</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={projectStatusData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {projectStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card xl:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4">Performance projets (Budget engagé)</h3>
          <div className="space-y-3">
            {projects.map(p => {
              const pct = Math.round((p.budgetSpent / p.budgetTotal) * 100)
              const overBudget = pct > 100
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]">{p.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {overBudget && <TrendingUp size={12} className="text-red-500" />}
                      <span className={overBudget ? 'text-red-600 font-bold' : 'text-slate-500'}>{pct}%</span>
                      <span className="text-slate-400">{formatCurrency(p.budgetSpent, true)} / {formatCurrency(p.budgetTotal, true)}</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-brand-400'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Downloadable reports */}
      <div className="card no-print">
        <h3 className="font-semibold text-slate-700 mb-4">Rapports disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { title: 'Rapport financier mensuel', sub: 'Revenus / dépenses · CSV', color: 'bg-brand-50 text-brand-600 border-brand-200', action: exportRevenueCsv },
            { title: 'État des projets', sub: 'Tous les projets · CSV', color: 'bg-blue-50 text-blue-600 border-blue-200', action: exportProjectsCsv },
            { title: 'Masse salariale', sub: 'Par employé · CSV', color: 'bg-violet-50 text-violet-600 border-violet-200', action: exportPayrollCsv },
            { title: 'Factures en souffrance', sub: 'En retard seulement · CSV', color: 'bg-red-50 text-red-600 border-red-200', action: exportOverdueCsv },
          ].map((r, i) => (
            <button key={i} onClick={r.action} className={`flex items-start gap-3 p-3 rounded-xl border text-left hover:shadow-sm transition-shadow ${r.color}`}>
              <Download size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs opacity-70 mt-0.5">{r.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
