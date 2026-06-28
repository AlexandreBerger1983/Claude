import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Bell, Search } from 'lucide-react'
import { alerts } from '../../data/mockData'
import clsx from 'clsx'

const pageTitles = {
  '/': 'Tableau de bord',
  '/projets': 'Projets',
  '/estimateur': 'Estimateur sur le terrain',
  '/soumissions': 'Soumissions',
  '/facturation': 'Facturation',
  '/clients': 'Clients',
  '/employes': 'Employés',
  '/feuilles-de-temps': 'Feuilles de temps',
  '/materiaux': 'Matériaux & Inventaire',
  '/sous-traitants': 'Sous-traitants',
  '/calendrier': 'Calendrier',
  '/documents': 'Documents',
  '/rapports': 'Rapports',
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const { pathname } = useLocation()

  const title = Object.entries(pageTitles).find(([k]) => pathname === k || (k !== '/' && pathname.startsWith(k)))?.[1] ?? 'ConstructPro'
  const urgentCount = alerts.filter(a => a.type === 'danger' || a.type === 'warning').length

  return (
    <div className="min-h-screen flex bg-slate-100">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={clsx('flex-1 flex flex-col min-w-0 transition-all duration-300', collapsed ? 'ml-16' : 'ml-60')}>
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-20">
          <h1 className="text-base font-semibold text-slate-800 flex-shrink-0">{title}</h1>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un projet, client, facture..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-100 rounded-lg text-sm border border-transparent focus:outline-none focus:border-brand-400 focus:bg-white transition placeholder-slate-400"
              />
            </div>
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
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
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

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
