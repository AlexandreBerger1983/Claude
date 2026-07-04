import { formatCurrency, daysUntil } from './formatters'
import { readStorage } from '../hooks/useLocalStorage'
import { PAYROLL_KEY } from '../components/payroll/payrollStore'

// Alertes calculées en direct à partir des vraies données de l'application.
// Chaque alerte a une destination (to) pour naviguer vers le détail au clic.
export function computeAlerts(data) {
  const alerts = []

  // Factures en retard (statut explicite OU échéance dépassée et impayée)
  for (const inv of data.invoices) {
    const late = inv.status === 'En retard' || (inv.status !== 'Payée' && daysUntil(inv.dueDate) < 0)
    if (late) {
      alerts.push({
        id: `inv-${inv.id}`,
        type: 'danger',
        message: `${inv.number} (${formatCurrency(inv.total)}) — en retard de ${Math.abs(daysUntil(inv.dueDate))} jour(s) — ${inv.client}`,
        to: '/facturation',
      })
    }
  }

  // Soumissions qui expirent dans 7 jours ou moins
  for (const q of data.quotes) {
    if ((q.status === 'Envoyée' || q.status === 'En attente') && q.validUntil) {
      const d = daysUntil(q.validUntil)
      if (d >= 0 && d <= 7) {
        alerts.push({
          id: `quote-${q.id}`,
          type: 'warning',
          message: `Soumission ${q.number} expire dans ${d} jour(s) — relancer ${q.client}`,
          to: '/soumissions',
        })
      }
    }
  }

  // Stock sous le minimum
  const lowStock = data.materials.filter(m => m.minStock > 0 && m.stock <= m.minStock)
  if (lowStock.length > 0) {
    alerts.push({
      id: 'stock',
      type: 'info',
      message: `${lowStock.length} article(s) sous le stock minimum — ${lowStock.slice(0, 2).map(m => m.name).join(', ')}${lowStock.length > 2 ? '…' : ''}`,
      to: '/materiaux',
    })
  }

  // Assurances de sous-traitants expirées ou à moins de 90 jours
  for (const s of data.subcontractors) {
    if (!s.insurance) continue
    const d = daysUntil(s.insurance)
    if (d < 0) {
      alerts.push({
        id: `sub-${s.id}`,
        type: 'danger',
        message: `Assurance de ${s.name} EXPIRÉE depuis ${Math.abs(d)} jour(s)`,
        to: '/sous-traitants',
      })
    } else if (d <= 90) {
      alerts.push({
        id: `sub-${s.id}`,
        type: 'warning',
        message: `Assurance de ${s.name} expire dans ${d} jour(s) — demander le renouvellement`,
        to: '/sous-traitants',
      })
    }
  }

  // Licences / certificats de compétence expirés (module Paie)
  const payroll = readStorage(PAYROLL_KEY, null)
  const licenses = payroll?.licenses ?? []
  const expired = licenses.filter(l => l.renewalDate && daysUntil(l.renewalDate) < 0)
  if (expired.length > 0) {
    alerts.push({
      id: 'licences',
      type: 'warning',
      message: `${expired.length} licence(s) / certificat(s) de compétence expirés — voir l'onglet Licences`,
      to: '/paie',
    })
  }

  // Feuilles de temps en attente d'approbation
  const pending = data.timesheets.filter(t => !t.approved).length
  if (pending > 0) {
    alerts.push({
      id: 'timesheets',
      type: 'info',
      message: `${pending} feuille(s) de temps en attente d'approbation`,
      to: '/feuilles-de-temps',
    })
  }

  return alerts
}
