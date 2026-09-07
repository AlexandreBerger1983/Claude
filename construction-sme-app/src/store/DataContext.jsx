import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
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
import { supabase, supabaseConfigure } from '../lib/supabase'
import { chargerTout, enregistrer, supprimer, collectionsVides } from './donneesSupabase'

// Magasin de données central de l'application.
//
// Deux sources possibles, décidées par la configuration de la base :
//
//   • Supabase configuré — les données viennent de la base et y retournent à
//     chaque modification. Elles sont partagées par toute l'entreprise, et les
//     règles d'accès décident de ce que chaque rôle peut lire et écrire.
//   • Supabase absent    — le navigateur, comme avant, garni au premier
//     lancement des données d'exemple.
//
// L'interface exposée est identique dans les deux cas : les écrans ne savent
// pas d'où viennent les données.

export const STORE_KEY = 'cp-donnees-v1'

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

const lireLocal = () => {
  try {
    const stored = window.localStorage.getItem(STORE_KEY)
    if (stored) return { ...seed(), ...JSON.parse(stored) }
  } catch { /* stockage indisponible */ }
  return seed()
}

export function DataProvider({ children }) {
  // En mode Supabase on part de collections VIDES, jamais des données
  // d'exemple : elles seraient écrites dans la base de l'entreprise à la
  // première modification.
  const [data, setData] = useState(() => (supabaseConfigure ? collectionsVides() : lireLocal()))
  const [chargement, setChargement] = useState(supabaseConfigure)
  const [erreur, setErreur] = useState(null)
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(0)

  // Copie synchrone de l'état. React peut rejouer une fonction de mise à jour
  // d'état (mode strict, rendus concurrents) : y calculer l'objet à envoyer à
  // la base l'enverrait deux fois. On applique donc les changements ici, une
  // seule fois, et `setData` ne fait que refléter le résultat.
  const dataRef = useRef(data)
  const appliquer = useCallback((transformation) => {
    const suivant = transformation(dataRef.current)
    dataRef.current = suivant
    setData(suivant)
    return suivant
  }, [])

  // ─── Chargement initial depuis la base ─────────────────────────────────────
  const recharger = useCallback(async () => {
    if (!supabase) return
    setChargement(true)
    const { donnees, erreurs } = await chargerTout()
    dataRef.current = donnees
    setData(donnees)
    // Les tables interdites au rôle ne remontent rien : ce n'est pas une
    // erreur à afficher, c'est le fonctionnement prévu. On ne signale que
    // les vraies pannes.
    const vraies = erreurs.filter(e => !/row-level security|permission denied/i.test(e))
    setErreur(vraies.length ? `Chargement partiel — ${vraies.join(' · ')}` : null)
    setChargement(false)
  }, [])

  useEffect(() => { if (supabaseConfigure) recharger() }, [recharger])

  // ─── Persistance locale (mode navigateur uniquement) ───────────────────────
  useEffect(() => {
    if (supabaseConfigure) return
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(data))
    } catch { /* stockage plein — on continue sans persistance */ }
  }, [data])

  // compteur pour garantir des identifiants uniques même lors d'ajouts
  // multiples dans la même milliseconde
  const seq = useRef(0)
  const nextId = () => Date.now() * 100 + (seq.current++ % 100)

  // Écriture dans la base, en arrière-plan. L'écran a déjà été mis à jour :
  // en cas d'échec on le dit clairement plutôt que de laisser croire que
  // c'est enregistré.
  const pousser = useCallback(async (travail) => {
    if (!supabaseConfigure) return
    setEnregistrementEnCours(n => n + 1)
    try {
      const { erreur: e } = await travail()
      if (e) setErreur(e)
    } catch (ex) {
      setErreur(`Enregistrement impossible : ${ex?.message ?? ex}`)
    } finally {
      setEnregistrementEnCours(n => Math.max(0, n - 1))
    }
  }, [])

  const add = (collection, item) => {
    const record = { id: nextId(), ...item }
    appliquer(d => ({ ...d, [collection]: [...(d[collection] ?? []), record] }))
    pousser(() => enregistrer(collection, record))
    return record
  }

  const bulkAdd = (collection, items) => {
    const records = items.map(it => ({ id: nextId(), ...it }))
    appliquer(d => ({ ...d, [collection]: [...(d[collection] ?? []), ...records] }))
    if (records.length) pousser(() => enregistrer(collection, records))
    return records
  }

  const update = (collection, id, patch) => {
    const cible = (dataRef.current[collection] ?? []).find(it => it.id === id)
    if (!cible) return
    const modifie = { ...cible, ...patch }
    appliquer(d => ({
      ...d,
      [collection]: d[collection].map(it => (it.id === id ? modifie : it)),
    }))
    pousser(() => enregistrer(collection, modifie))
  }

  const remove = (collection, id) => {
    appliquer(d => ({ ...d, [collection]: (d[collection] ?? []).filter(it => it.id !== id) }))
    pousser(() => supprimer(collection, id))
  }

  // Remettre les données d'exemple n'a de sens que sur le stockage du
  // navigateur : sur une base partagée, ce serait écraser le travail de toute
  // l'entreprise par des exemples.
  const resetToSeed = () => {
    if (supabaseConfigure) {
      setErreur("Les données de démonstration ne peuvent pas être remises quand la base de données est branchée.")
      return
    }
    appliquer(() => seed())
  }

  const valeur = {
    data,
    add, bulkAdd, update, remove, resetToSeed,
    // état de la source de données, pour les écrans qui veulent l'afficher
    surSupabase: supabaseConfigure,
    chargement,
    erreur,
    effacerErreur: () => setErreur(null),
    enregistrementEnCours: enregistrementEnCours > 0,
    recharger,
  }

  return <DataContext.Provider value={valeur}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData doit être utilisé dans <DataProvider>')
  return ctx
}
