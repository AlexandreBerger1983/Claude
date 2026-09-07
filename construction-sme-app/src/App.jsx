import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './store/AuthContext'
import { peutOuvrir, ecranParDefaut } from './data/acces'
import Layout from './components/layout/Layout'
import Dashboard from './components/dashboard/Dashboard'
import Projects from './components/projects/Projects'
import Quotes from './components/quotes/Quotes'
import Invoices from './components/invoices/Invoices'
import Clients from './components/clients/Clients'
import Employees from './components/employees/Employees'
import Timesheets from './components/timesheets/Timesheets'
import Materials from './components/materials/Materials'
import Subcontractors from './components/subcontractors/Subcontractors'
import Calendar from './components/calendar/Calendar'
import Documents from './components/documents/Documents'
import Reports from './components/reports/Reports'
import Estimator from './components/estimator/Estimator'
import Payroll from './components/payroll/Payroll'
import Settings from './components/settings/Settings'

// Un compte chantier renvoyé vers son écran s'il ouvre une adresse réservée au
// bureau — en tapant l'adresse à la main, ou par un vieux favori. La base
// refuserait de toute façon les données ; ceci évite juste un écran vide.
function EcranAutorise({ children }) {
  const { profil } = useAuth()
  const { pathname } = useLocation()
  if (!peutOuvrir(profil, pathname)) return <Navigate to={ecranParDefaut(profil)} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EcranAutorise><Layout /></EcranAutorise>}>
        <Route index element={<Dashboard />} />
        <Route path="projets/*" element={<Projects />} />
        <Route path="estimateur/*" element={<Estimator />} />
        <Route path="soumissions/*" element={<Quotes />} />
        <Route path="facturation" element={<Invoices />} />
        <Route path="clients" element={<Clients />} />
        <Route path="employes" element={<Employees />} />
        <Route path="feuilles-de-temps" element={<Timesheets />} />
        <Route path="paie" element={<Payroll />} />
        <Route path="materiaux" element={<Materials />} />
        <Route path="sous-traitants" element={<Subcontractors />} />
        <Route path="calendrier" element={<Calendar />} />
        <Route path="documents" element={<Documents />} />
        <Route path="rapports" element={<Reports />} />
        <Route path="parametres" element={<Settings />} />
      </Route>
    </Routes>
  )
}
