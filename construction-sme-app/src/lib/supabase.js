// Connexion à la base de données Supabase.
//
// L'adresse et la clé publique sont fournies au moment de la construction du
// site, par les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir
// supabase/README.md). Tant qu'elles sont absentes, `supabase` vaut null et
// l'application continue de fonctionner sur le stockage local : la mise en
// place de la base ne peut donc pas casser l'application existante.
//
// La clé « anon » est volontairement publique — elle se retrouve dans le code
// du site. Ce n'est pas elle qui protège les données : la protection vient
// entièrement des règles d'accès définies dans supabase/schema.sql.

import { createClient } from '@supabase/supabase-js'

// `import.meta.env` est fourni par Vite au moment de la construction. Il est
// absent quand ce module est chargé hors du navigateur (tests en ligne de
// commande) : on ne veut pas que ça plante, seulement qu'il n'y ait pas de base.
const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL?.trim()
const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabaseConfigure = Boolean(url && anonKey)

export const supabase = supabaseConfigure
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // La session est conservée pour ne pas redemander le mot de passe à
        // chaque ouverture, ce qui compte sur un chantier.
        storageKey: 'cp-session',
      },
    })
  : null

// Rôle du compte connecté, lu dans la table des profils.
// Renvoie 'bureau', 'chantier', ou null si personne n'est connecté.
export async function roleActuel() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('role, nom, employee_id')
    .eq('id', user.id)
    .single()
  if (error) return null
  return data
}

// Un compte chantier ne doit jamais voir prix, marges, factures ni paie.
// Cette fonction centralise la question pour que les écrans n'aient pas
// chacun leur propre version de la règle.
export function peutVoirFinances(profil) {
  return profil?.role === 'bureau'
}
