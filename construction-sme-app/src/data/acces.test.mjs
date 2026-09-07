// Tests des règles d'accès par rôle. Ces règles ne font pas la sécurité — la
// base la fait — mais une erreur ici ouvrirait un menu vers un écran vide, ou
// cacherait au bureau un écran dont il a besoin.
import {
  BUREAU, CHANTIER, ECRANS_BUREAU, ECRANS_CHANTIER,
  estBureau, estChantier, peutVoirFinances, sectionDe, peutOuvrir,
  filtrerNavigation, ecranParDefaut,
} from './acces.js'

let ok = 0, fail = 0
const vrai = (label, cond) => {
  if (cond) { ok++; console.log(`OK   ${label}`) }
  else { fail++; console.log(`ÉCHEC ${label}`) }
}
const egal = (label, got, want) => vrai(`${label} = ${JSON.stringify(got)}`, got === want)

const bureau = { role: BUREAU, nom: 'Bureau' }
const chantier = { role: CHANTIER, nom: 'Chantier', employee_id: 3 }
const local = null // base non configurée : aucune connexion, aucune restriction

// ─── Reconnaissance des rôles ────────────────────────────────────────────────
vrai('bureau reconnu', estBureau(bureau) && !estChantier(bureau))
vrai('chantier reconnu', estChantier(chantier) && !estBureau(chantier))
vrai('mode local : ni bureau ni chantier', !estBureau(local) && !estChantier(local))

// ─── Finances ────────────────────────────────────────────────────────────────
vrai('le bureau voit les finances', peutVoirFinances(bureau))
vrai('le chantier ne voit pas les finances', !peutVoirFinances(chantier))
vrai('en mode local, les finances restent visibles', peutVoirFinances(local))
// Un rôle inconnu (donnée abîmée) ne doit pas ouvrir les finances par défaut…
vrai('un rôle inconnu n’est pas traité comme le chantier', peutVoirFinances({ role: 'inconnu' }))

// ─── Découpage des adresses ──────────────────────────────────────────────────
egal('racine', sectionDe('/'), '/')
egal('projet précis', sectionDe('/projets/12'), '/projets')
egal('soumission précise', sectionDe('/soumissions/abc-123'), '/soumissions')
egal('paramètres avec onglet', sectionDe('/parametres?onglet=prix'), '/parametres')
egal('adresse vide', sectionDe(''), '/')
egal('adresse absente', sectionDe(undefined), '/')

// ─── Écrans réservés au bureau ───────────────────────────────────────────────
for (const ecran of ECRANS_BUREAU) {
  vrai(`bureau : ${ecran} ouvert`, peutOuvrir(bureau, ecran))
  vrai(`chantier : ${ecran} fermé`, !peutOuvrir(chantier, ecran))
  vrai(`mode local : ${ecran} ouvert`, peutOuvrir(local, ecran))
}

// Une adresse précise sous un écran fermé reste fermée
vrai('chantier : une soumission précise reste fermée', !peutOuvrir(chantier, '/soumissions/abc-123'))
vrai('chantier : un onglet de paramètres reste fermé', !peutOuvrir(chantier, '/parametres?onglet=tarifs'))

// ─── Écrans ouverts au chantier ──────────────────────────────────────────────
for (const ecran of ECRANS_CHANTIER) {
  vrai(`chantier : ${ecran} ouvert`, peutOuvrir(chantier, ecran))
  vrai(`bureau : ${ecran} ouvert aussi`, peutOuvrir(bureau, ecran))
}
vrai('chantier : un projet précis reste ouvert', peutOuvrir(chantier, '/projets/12'))

// Les deux listes ne se recoupent jamais
vrai('aucun écran n’est à la fois réservé et ouvert',
  ECRANS_BUREAU.every(e => !ECRANS_CHANTIER.includes(e)))

// ─── Filtrage des menus ──────────────────────────────────────────────────────
const menu = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/projets', label: 'Projets' },
  { to: '/estimateur', label: 'Devis' },
  { to: '/soumissions', label: 'Soumissions' },
  { to: '/facturation', label: 'Factures' },
  { to: '/feuilles-de-temps', label: 'Feuilles de temps' },
  { to: '/paie', label: 'Paie' },
]
const menuChantier = filtrerNavigation(chantier, menu).map(e => e.to)
console.log('Menu chantier :', menuChantier.join(' · '))
egal('le chantier garde 2 entrées', menuChantier.length, 2)
vrai('le chantier n’a pas de lien vers le tableau de bord', !menuChantier.includes('/'))
vrai('le chantier garde ses feuilles de temps', menuChantier.includes('/feuilles-de-temps'))
vrai('le chantier n’a pas de lien vers la paie', !menuChantier.includes('/paie'))
vrai('le chantier n’a pas de lien vers la facturation', !menuChantier.includes('/facturation'))
vrai('le chantier n’a pas de lien vers les soumissions', !menuChantier.includes('/soumissions'))
egal('le bureau garde tout', filtrerNavigation(bureau, menu).length, menu.length)
egal('le mode local garde tout', filtrerNavigation(local, menu).length, menu.length)
vrai('un menu vide ne plante pas', filtrerNavigation(chantier, []).length === 0)
vrai('un menu absent ne plante pas', filtrerNavigation(chantier).length === 0)

// ─── Écran de repli ──────────────────────────────────────────────────────────
egal('le chantier atterrit sur ses feuilles de temps', ecranParDefaut(chantier), '/feuilles-de-temps')
egal('le bureau atterrit sur le tableau de bord', ecranParDefaut(bureau), '/')
vrai('le chantier n’accède pas au tableau de bord', !peutOuvrir(chantier, '/'))
egal('le mode local atterrit sur le tableau de bord', ecranParDefaut(local), '/')
// Le repli doit lui-même être un écran autorisé, sinon on boucle
vrai('le repli du chantier est un écran ouvert', peutOuvrir(chantier, ecranParDefaut(chantier)))
vrai('le repli du bureau est un écran ouvert', peutOuvrir(bureau, ecranParDefaut(bureau)))

console.log(`\n${ok} réussis, ${fail} échoués`)
if (fail > 0) process.exit(1)
console.log('✅ Règles d’accès par rôle correctes')
