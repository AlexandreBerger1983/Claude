// Correspondance entre les objets de l'application et les tables Supabase.
//
// Chaque table conserve l'objet complet dans une colonne jsonb `donnees`, plus
// quelques colonnes sorties du jsonb pour les tris et les règles d'accès. La
// forme des objets ne change donc pas : les écrans continuent de lire
// `client.name` ou `projet.status` sans savoir d'où ils viennent.

import { supabase } from '../lib/supabase.js'

const texte = (v) => (v === undefined || v === null || v === '' ? null : String(v))
const entier = (v) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}
// Les colonnes `date` de Postgres refusent une chaîne vide ou mal formée : on
// n'y met une valeur que si elle ressemble vraiment à une date.
const dateOuNull = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v ?? '')) ? String(v).slice(0, 10) : null)

// Les neuf collections de l'application, avec leur table et les colonnes
// extraites de l'objet. `colonnes` ne sert qu'aux index et aux règles d'accès —
// la vérité reste dans `donnees`.
export const COLLECTIONS = [
  { cle: 'clients',        table: 'clients',        colonnes: (o) => ({ nom: texte(o.name) }) },
  { cle: 'projects',       table: 'projects',       colonnes: (o) => ({ nom: texte(o.name), statut: texte(o.status) }) },
  { cle: 'employees',      table: 'employees',      colonnes: (o) => ({ nom: texte(o.name) }) },
  { cle: 'timesheets',     table: 'timesheets',     colonnes: (o) => ({ employee_id: entier(o.employeeId), date_travail: dateOuNull(o.date) }) },
  { cle: 'materials',      table: 'materials',      colonnes: (o) => ({ nom: texte(o.name) }) },
  { cle: 'subcontractors', table: 'subcontractors', colonnes: (o) => ({ nom: texte(o.name) }) },
  { cle: 'documents',      table: 'documents',      colonnes: (o) => ({ nom: texte(o.name) }) },
  { cle: 'quotes',         table: 'quotes',         colonnes: (o) => ({ numero: texte(o.number) }) },
  { cle: 'invoices',       table: 'invoices',       colonnes: (o) => ({ numero: texte(o.number) }) },
]

export const collectionsVides = () =>
  Object.fromEntries(COLLECTIONS.map(c => [c.cle, []]))

export const definitionDe = (cle) => COLLECTIONS.find(c => c.cle === cle) ?? null

// Objet de l'application → ligne de la table.
export function versLigne(cle, objet) {
  const def = definitionDe(cle)
  if (!def) throw new Error(`Collection inconnue : ${cle}`)
  const id = entier(objet?.id)
  if (id === null) throw new Error(`Enregistrement sans identifiant dans ${cle}`)
  return { id, ...def.colonnes(objet ?? {}), donnees: objet }
}

// Ligne de la table → objet de l'application. L'identifiant de la ligne fait
// foi : c'est lui la clé primaire, pas celui recopié dans le jsonb.
export function versObjet(ligne) {
  return { ...(ligne?.donnees ?? {}), id: ligne?.id }
}

// ─── Lecture ─────────────────────────────────────────────────────────────────
// Une collection interdite au rôle connecté ne renvoie rien : la base applique
// ses règles, l'application n'a donc pas à savoir quoi demander. Une erreur sur
// une table n'empêche pas les autres de se charger.
export async function chargerTout(client = supabase) {
  if (!client) return { donnees: collectionsVides(), erreurs: [] }
  const erreurs = []
  const donnees = collectionsVides()

  const resultats = await Promise.all(
    COLLECTIONS.map(async (c) => {
      const { data, error } = await client.from(c.table).select('id, donnees').order('id')
      return { cle: c.cle, table: c.table, data, error }
    }),
  )

  for (const r of resultats) {
    if (r.error) {
      erreurs.push(`${r.table} : ${r.error.message}`)
      continue
    }
    // Une réponse qui n'est pas une liste — panne côté serveur, mandataire
    // qui s'interpose — ne doit pas faire tomber toute l'application.
    if (!Array.isArray(r.data)) {
      if (r.data != null) erreurs.push(`${r.table} : réponse inattendue de la base`)
      continue
    }
    donnees[r.cle] = r.data.map(versObjet)
  }
  return { donnees, erreurs }
}

// ─── Écriture ────────────────────────────────────────────────────────────────
export async function enregistrer(cle, objets, client = supabase) {
  if (!client) return {}
  const lignes = (Array.isArray(objets) ? objets : [objets]).map(o => versLigne(cle, o))
  if (lignes.length === 0) return {}
  const { error } = await client.from(definitionDe(cle).table).upsert(lignes)
  return error ? { erreur: messageEcriture(cle, error) } : {}
}

export async function supprimer(cle, id, client = supabase) {
  if (!client) return {}
  const { error } = await client.from(definitionDe(cle).table).delete().eq('id', entier(id))
  return error ? { erreur: messageEcriture(cle, error) } : {}
}

// ─── Remplir et vider la base ────────────────────────────────────────────────
// Sert à préparer une démonstration, puis à faire le ménage après. Les deux
// opérations touchent la base partagée : l'application les entoure de
// confirmations, ce module se contente de les exécuter.

export async function remplirAvec(donnees, client = supabase) {
  if (!client) return { erreur: "La base de données n'est pas configurée." }
  for (const c of COLLECTIONS) {
    const objets = donnees?.[c.cle] ?? []
    if (objets.length === 0) continue
    const { erreur } = await enregistrer(c.cle, objets, client)
    if (erreur) return { erreur }
  }
  return {}
}

export async function viderTout(client = supabase) {
  if (!client) return { erreur: "La base de données n'est pas configurée." }
  for (const c of COLLECTIONS) {
    // PostgREST refuse une suppression sans filtre, par sécurité : on en
    // fournit un qui englobe toutes les lignes.
    const { error } = await client.from(c.table).delete().gte('id', 0)
    if (error) return { erreur: messageEcriture(c.cle, error) }
  }
  return {}
}

// Vrai quand aucune collection ne contient rien : c'est la seule situation où
// charger des exemples ne risque d'écraser le travail de personne.
export const baseEstVide = (donnees) =>
  COLLECTIONS.every(c => (donnees?.[c.cle]?.length ?? 0) === 0)

// Les refus de la base sont traduits : « new row violates row-level security »
// veut dire que le rôle du compte n'a pas le droit d'écrire ici, ce qui n'a
// rien d'un incident technique.
export function messageEcriture(cle, erreur) {
  const brut = erreur?.message ?? ''
  if (/row-level security|permission denied/i.test(brut))
    return `Votre compte n'a pas le droit de modifier « ${cle} ».`
  if (/failed to fetch|network/i.test(brut))
    return 'Enregistrement impossible : la base de données est injoignable. Vérifiez votre connexion.'
  if (/duplicate key/i.test(brut))
    return `Un enregistrement portant le même identifiant existe déjà dans « ${cle} ».`
  return `Enregistrement impossible dans « ${cle} » : ${brut}`
}
