import { createContext, useContext, useEffect, useState } from 'react'
import {
  clients as seedClients,
  projects as seedProjects,
  quotes as seedQuotes,
  invoices as seedInvoices,
  employees as seedEmployees,
  timesheets as seedTimesheets,
  materials as seedMaterials,
  subcontractors as seedSubcontractors,
  documents as seedDocuments,
} from '../data/mockData'

// Magasin de données central de l'application, persisté dans le navigateur.
// Au premier lancement il est rempli avec les données d'exemple ; ensuite,
// toutes les modifications (ajouts, éditions, changements de statut…)
// survivent au rechargement de la page.

const STORE_KEY = 'cp-donnees-v1'

const seed = () => ({
  clients: seedClients,
  projects: seedProjects,
  quotes: seedQuotes,
  invoices: seedInvoices,
  employees: seedEmployees,
  timesheets: seedTimesheets,
  materials: seedMaterials,
  subcontractors: seedSubcontractors,
  documents: seedDocuments,
})

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [data, setData] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // complète les collections manquantes si le seed a évolué
        return { ...seed(), ...parsed }
      }
    } catch { /* stockage indisponible */ }
    return seed()
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(data))
    } catch { /* stockage plein — on continue sans persistance */ }
  }, [data])

  const add = (collection, item) => {
    const id = Date.now()
    const record = { id, ...item }
    setData(d => ({ ...d, [collection]: [...d[collection], record] }))
    return record
  }

  const update = (collection, id, patch) =>
    setData(d => ({
      ...d,
      [collection]: d[collection].map(it => it.id === id ? { ...it, ...patch } : it),
    }))

  const remove = (collection, id) =>
    setData(d => ({ ...d, [collection]: d[collection].filter(it => it.id !== id) }))

  const resetToSeed = () => setData(seed())

  return (
    <DataContext.Provider value={{ data, add, update, remove, resetToSeed }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData doit être utilisé dans <DataProvider>')
  return ctx
}
