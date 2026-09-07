// Session et rôle du compte connecté.
//
// Deux modes, décidés par la présence des clés Supabase au moment de la
// construction du site :
//
//   • base configurée  — l'application demande une connexion, puis lit le rôle
//                        du compte dans la table des profils ;
//   • base absente     — aucune connexion demandée, l'application tourne sur le
//                        stockage du navigateur comme avant. Une base mal
//                        configurée ne peut donc pas rendre l'outil inutilisable.

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, supabaseConfigure } from '../lib/supabase'

const AuthContext = createContext(null)

// Messages de Supabase traduits. Les autres sont affichés tels quels plutôt
// que remplacés par un « une erreur est survenue » qui n'aide personne.
const messageErreur = (erreur) => {
  const brut = erreur?.message ?? ''
  if (/invalid login credentials/i.test(brut)) return 'Courriel ou mot de passe incorrect.'
  if (/email not confirmed/i.test(brut))
    return "Ce compte n'est pas confirmé. Dans Supabase : Authentication → Users → le compte → Confirm email."
  if (/failed to fetch|network/i.test(brut))
    return "Impossible de joindre la base de données. Vérifiez votre connexion internet, puis l'adresse du projet."
  if (/rate limit|too many/i.test(brut)) return 'Trop de tentatives. Patientez une minute avant de réessayer.'
  return brut || 'La connexion a échoué.'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profil, setProfil] = useState(null)
  // On ne montre rien tant qu'on ne sait pas si quelqu'un est déjà connecté :
  // sinon l'écran de connexion apparaîtrait une fraction de seconde à chaque
  // ouverture, alors que la session est conservée.
  const [chargement, setChargement] = useState(supabaseConfigure)
  const [erreurProfil, setErreurProfil] = useState(null)

  useEffect(() => {
    if (!supabase) return
    let vivant = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vivant) return
      setSession(data?.session ?? null)
      if (!data?.session) setChargement(false)
    })

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, s) => {
      if (!vivant) return
      setSession(s)
      if (!s) { setProfil(null); setChargement(false) }
    })

    return () => { vivant = false; abonnement?.subscription?.unsubscribe() }
  }, [])

  // Le rôle vient de la base, jamais du navigateur : c'est lui qui décide de
  // ce qui s'affiche, et la base applique la même règle de son côté.
  useEffect(() => {
    if (!supabase || !session) return
    let vivant = true
    setChargement(true)
    supabase
      .from('profiles')
      .select('id, nom, role, employee_id')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!vivant) return
        if (error) {
          setErreurProfil(
            "Le compte est connecté mais son profil est introuvable. Vérifiez que schema.sql a bien été exécuté dans Supabase.",
          )
          setProfil(null)
        } else {
          setErreurProfil(null)
          setProfil(data)
        }
        setChargement(false)
      })
    return () => { vivant = false }
  }, [session])

  const connexion = useCallback(async (courriel, motDePasse) => {
    if (!supabase) return { erreur: "La base de données n'est pas configurée." }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(courriel || '').trim(),
      password: motDePasse || '',
    })
    if (error) return { erreur: messageErreur(error) }
    // Réponse sans erreur mais sans session : sans ce garde-fou, l'écran
    // resterait bloqué sur « Connexion… » sans jamais rien dire.
    if (!data?.session) return { erreur: "La connexion n'a pas abouti. Réessayez dans un instant." }
    return {}
  }, [])

  const deconnexion = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfil(null)
  }, [])

  const valeur = {
    configure: supabaseConfigure,
    session,
    profil,
    chargement,
    erreurProfil,
    courriel: session?.user?.email ?? null,
    connecte: Boolean(session),
    connexion,
    deconnexion,
  }

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider')
  return ctx
}
