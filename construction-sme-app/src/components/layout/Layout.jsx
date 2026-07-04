import { useState, useMemo } from 'react'
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Bell, Search, LayoutDashboard, Calculator, FolderKanban, Receipt, Menu, X, Users, FileText } from 'lucide-react'
import { alerts } from '../../data/mockData'
import { useData } from '../../store/DataContext'
import clsx from 'clsx'

// Recherche globale : clients, projets, soumissions, factures
function GlobalSearch() {
  const { data } = useData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const out = []
    for (const c of data.clients) {
      if (c.name.toLowerCase().includes(q) || (c.contact || '').toLowerCase().includes(q))
        out.push({ icon: Users, label: c.name, sub: 'Client', to: `/clients` })
    }
    for (const p of data.projects) {
      if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.client.toLowerCase().includes(q))
        out.push({ icon: FolderKanban, label: p.name, sub: `Projet · ${p.code}`, to: `/projets/${p.id}` })
    }
    for (const s of data.quotes) {
      if (s.title.toLowerCase().includes(q) || s.number.toLowerCase().includes(q))
        out.push({ icon: FileText, label: s.title, sub: `Soumission · ${s.number}`, to: `/soumissions/${s.id}` })
    }
    for (const i of data.invoices) {
      if (i.number.toLowerCase().includes(q) || i.client.toLowerCase().includes(q))
        out.push({ icon: Receipt, label: `${i.number} — ${i.client}`, sub: `Facture · ${i.status}`, to: `/facturation` })
    }
    return out.slice(0, 8)
  }, [query, data])

  const go = (to) => {
    setQuery('')
    setFocused(false)
    navigate(to)
  }

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Rechercher un projet, client, facture..."
        className="w-full pl-9 pr-4 py-1.5 bg-slate-100 rounded-lg text-sm border border-transparent focus:outline-none focus:border-brand-400 focus:bg-white transition placeholder-slate-400"
      />
      {focused && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">Aucun résultat pour « {query} »</p>
          ) : results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => go(r.to)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <r.icon size={15} className="text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{r.label}</p>
                <p className="text-xs text-slate-400">{r.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const pageTitles = {
  '/': 'Tableau de bord',
  '/projets': 'Projets',
  '/estimateur': 'Devis rapide',
  '/soumissions': 'Soumissions',
  '/facturation': 'Facturation',
  '/clients': 'Clients',
  '/employes': 'Employés',
  '/feuilles-de-temps': 'Feuilles de temps',
  '/paie': 'Paie & Heures',
  '/materiaux': 'Matériaux & Inventaire',
  '/sous-traitants': 'Sous-traitants',
  '/calendrier': 'Calendrier',
  '/documents': 'Documents',
  '/rapports': 'Rapports',
  '/parametres': 'Paramètres',
}

const mobileNav = [
  { label: 'Accueil', to: '/', icon: LayoutDashboard },
  { label: 'Devis', to: '/estimateur', icon: Calculator },
  { label: 'Projets', to: '/projets', icon: FolderKanban },
  { label: 'Factures', to: '/facturation', icon: Receipt },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { pathname } = useLocation()

  const title = Object.entries(pageTitles).find(([k]) => pathname === k || (k !== '/' && pathname.startsWith(k)))?.[1] ?? 'ConstructPro'
  const urgentCount = alerts.filter(a => a.type === 'danger' || a.type === 'warning').length

  // Dans l'assistant de devis, on masque la barre mobile du bas pour laisser
  // toute la place à la barre Continuer/Retour de l'assistant.
  const inWizard = pathname.startsWith('/estimateur/nouveau')

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar bureau seulement */}
      <div className="hidden lg:block no-print">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Menu mobile plein écran */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64">
            <Sidebar collapsed={false} setCollapsed={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300 ml-0', collapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        {/* Barre du haut */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-20 no-print">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>

          <h1 className="text-base font-semibold text-slate-800 flex-shrink-0">{title}</h1>

          <div className="flex-1 max-w-md hidden md:block">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 ml-auto relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Bell size={18} />
              {urgentCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {urgentCount}
                </span>
              )}
            </button>

            {showAlerts && (
              <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-700">Alertes</div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {alerts.map(a => (
                    <div key={a.id} className="px-4 py-3 flex gap-3 items-start">
                      <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                        a.type === 'danger' ? 'bg-red-500' :
                        a.type === 'warning' ? 'bg-amber-500' :
                        a.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                      )} />
                      <p className="text-xs text-slate-600 leading-relaxed">{a.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              AB
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className={clsx('flex-1 p-4 lg:p-6 overflow-auto', !inWizard && 'pb-24 lg:pb-6')}>
          <Outlet />
        </main>
      </div>

      {/* Barre de navigation mobile (bas d'écran) */}
      {!inWizard && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-40 no-print pb-[env(safe-area-inset-bottom)]">
          {mobileNav.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-brand-600' : 'text-slate-400'
              )}
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
