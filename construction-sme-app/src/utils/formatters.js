export const formatCurrency = (amount, compact = false) => {
  if (compact && Math.abs(amount) >= 1_000_000)
    return `${(amount / 1_000_000).toFixed(1)} M$`
  if (compact && Math.abs(amount) >= 1_000)
    return `${(amount / 1_000).toFixed(0)} k$`
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })
}

export const daysUntil = (dateStr) => {
  const now = new Date('2026-06-28')
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - now) / (1000 * 60 * 60 * 24))
}

export const statusColor = {
  // Projects
  'En cours':           'bg-blue-100 text-blue-700',
  'Planification':      'bg-purple-100 text-purple-700',
  'Soumission acceptée':'bg-teal-100 text-teal-700',
  'Terminé':            'bg-slate-100 text-slate-600',
  'En pause':           'bg-yellow-100 text-yellow-700',
  // Invoices / quotes
  'Payée':              'bg-emerald-100 text-emerald-700',
  'En attente':         'bg-amber-100 text-amber-700',
  'En retard':          'bg-red-100 text-red-700',
  'Envoyée':            'bg-blue-100 text-blue-700',
  'Acceptée':           'bg-emerald-100 text-emerald-700',
  'Refusée':            'bg-red-100 text-red-700',
  'Brouillon':          'bg-slate-100 text-slate-600',
  // Employees
  'Actif':              'bg-emerald-100 text-emerald-700',
  'Congé':              'bg-amber-100 text-amber-700',
  'Inactif':            'bg-slate-100 text-slate-600',
  // Subcontractors
  'Approuvé':           'bg-emerald-100 text-emerald-700',
  'Vérifier assurance': 'bg-red-100 text-red-700',
  // Tasks
  'Terminé':            'bg-emerald-100 text-emerald-700',
  'À faire':            'bg-slate-100 text-slate-600',
  // Priority
  'Haute':              'bg-red-100 text-red-700',
  'Normale':            'bg-blue-100 text-blue-700',
  'Basse':              'bg-slate-100 text-slate-600',
}

export const progressColor = (pct) => {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-blue-500'
  if (pct >= 25) return 'bg-amber-500'
  return 'bg-slate-400'
}

export const budgetHealthColor = (spent, total) => {
  const ratio = spent / total
  if (ratio > 0.95) return 'text-red-600'
  if (ratio > 0.80) return 'text-amber-600'
  return 'text-emerald-600'
}
