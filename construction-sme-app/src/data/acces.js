// Ce que chaque rôle a le droit de voir, en un seul endroit.
//
// La vraie protection est dans la base de données (voir supabase/schema.sql) :
// un compte chantier qui interrogerait directement les tables de prix ou de
// paie ne recevrait rien, même en bricolant l'application dans son navigateur.
// Ce fichier ne fait donc pas la sécurité — il évite d'afficher des écrans
// vides et des menus qui ne mènent nulle part.
//
// Tant que la base n'est pas configurée, l'application fonctionne sans
// connexion, sur le stockage du navigateur : tout est visible, comme avant.

export const BUREAU = 'bureau'
export const CHANTIER = 'chantier'

// Écrans réservés au bureau : ils montrent des prix, des marges, des factures
// ou de la paie.
export const ECRANS_BUREAU = [
  // Le tableau de bord est bâti autour du chiffre d'affaires, des marges et
  // de l'objectif annuel : il reste au bureau. Un compte chantier atterrit
  // directement sur ses feuilles de temps, qui sont son travail quotidien.
  '/',
  '/estimateur',
  '/soumissions',
  '/facturation',
  '/clients',
  '/materiaux',
  '/sous-traitants',
  '/paie',
  '/rapports',
  '/parametres',
]

// Écrans ouverts au chantier. Les projets y sont visibles sans les montants,
// et les feuilles de temps limitées aux siennes — c'est la base qui applique
// ces deux restrictions.
export const ECRANS_CHANTIER = [
  '/projets',
  '/calendrier',
  '/employes',
  '/feuilles-de-temps',
  '/documents',
]

// Le rôle du profil connecté. `null` quand la base n'est pas configurée :
// l'application est alors en mode local, sans connexion ni restriction.
export const roleDe = (profil) => profil?.role ?? null

export const estBureau = (profil) => roleDe(profil) === BUREAU
export const estChantier = (profil) => roleDe(profil) === CHANTIER

// Un compte chantier ne doit jamais voir prix, marges, factures ni paie.
export const peutVoirFinances = (profil) => !estChantier(profil)

// Normalise « /projets/12 » en « /projets » pour comparer aux listes ci-dessus.
export const sectionDe = (chemin) => {
  if (!chemin || chemin === '/') return '/'
  const premier = String(chemin).split('?')[0].split('#')[0].split('/').filter(Boolean)[0]
  return premier ? `/${premier}` : '/'
}

// Droit d'ouvrir un écran. Sans profil — mode local — tout est ouvert.
export const peutOuvrir = (profil, chemin) => {
  if (!estChantier(profil)) return true
  return !ECRANS_BUREAU.includes(sectionDe(chemin))
}

// Filtre une liste d'entrées de menu ({ to, label, … }) selon le rôle.
export const filtrerNavigation = (profil, entrees = []) =>
  entrees.filter(e => peutOuvrir(profil, e.to))

// Écran d'accueil du rôle : le tableau de bord reste la porte d'entrée des
// deux, mais un compte chantier renvoyé d'un écran interdit atterrit sur ses
// feuilles de temps, qui sont son travail quotidien.
export const ecranParDefaut = (profil) => (estChantier(profil) ? '/feuilles-de-temps' : '/')
