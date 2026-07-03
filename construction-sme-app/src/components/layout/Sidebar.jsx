import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, FileText, Receipt, Users, HardHat,
  Clock, Package, Wrench, BarChart3, Calendar, FolderOpen,
  ChevronRight, Building2, Bell, Settings, Calculator, Wallet,
} from 'lucide-react'
import { alerts } from '../../data/mockData'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS } from '../../data/settingsDefaults'
import clsx from 'clsx'

const nav = [
  { label: 'Tableau de bord', to: '/', icon: LayoutDashboard },
  { label: 'Projets', to: '/projets', icon: FolderKanban },
  { label: '✦ Estimateur', to: '/estimateur', icon: Calculator, highlight: true },
  { label: 'Soumissions', to: '/soumissions', icon: FileText },
  { label: 'Facturation', to: '/facturation', icon: Receipt },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Employés', to: '/employes', icon: HardHat },
  { label: 'Feuilles de temps', to: '/feuilles-de-temps', icon: Clock },
  { label: 'Paie & Heures', to: '/paie', icon: Wallet },
  { label: 'Matériaux', to: '/materiaux', icon: Package },
  { label: 'Sous-traitants', to: '/sous-traitants', icon: Wrench },
  { label: 'Calendrier', to: '/calendrier', icon: Calendar },
  { label: 'Documents', to: '/documents', icon: FolderOpen },
  { label: 'Rapports', to: '/rapports', icon: BarChart3 },
]

const urgentAlerts = alerts.filter(a => a.type === 'danger' || a.type === 'warning').length

export default function Sidebar({ collapsed, setCollapsed }) {
  const [settings] = useLocalStorage(SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS)
  const companyName = settings.companyName || 'ConstructPro'
  const ownerName = settings.ownerName || 'Propriétaire'
  const initials = (settings.ownerName || 'AB').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className={clsx(
      'fixed top-0 left-0 h-full bg-slate-900 flex flex-col transition-all duration-300 z-30 border-r border-white/5',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {settings.logoDataUrl ? (
            <img src={settings.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <Building2 size={18} className="text-white" />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-white font-bold text-sm leading-tight truncate">{companyName}</div>
            <div className="text-slate-500 text-xs">Gestion PME</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-500 hover:text-white transition-colors"
        >
          <ChevronRight size={14} className={clsx('transition-transform', collapsed ? '' : 'rotate-180')} />
        </button>
      </div>

      {/* Alerts badge */}
      {!collapsed && urgentAlerts > 0 && (
        <div className="mx-3 mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <Bell size={13} className="text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-xs">{urgentAlerts} alerte{urgentAlerts > 1 ? 's' : ''} urgente{urgentAlerts > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(({ label, to, icon: Icon, highlight }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'sidebar-link',
              isActive && 'active',
              highlight && !collapsed && 'bg-brand-500/10 border border-brand-500/20 text-brand-300 hover:text-brand-100 hover:bg-brand-500/20'
            )}
            title={collapsed ? label.replace('✦ ', '') : undefined}
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-2 space-y-0.5">
        <NavLink
          to="/parametres"
          className={({ isActive }) => clsx('sidebar-link w-full', isActive && 'active')}
          title={collapsed ? 'Paramètres' : undefined}
        >
          <Settings size={17} />
          {!collapsed && <span>Paramètres</span>}
        </NavLink>
        <div className={clsx('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-brand-500/30 flex items-center justify-center text-brand-300 text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-white text-xs font-medium truncate">{ownerName}</div>
              <div className="text-slate-500 text-xs truncate">Propriétaire</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
