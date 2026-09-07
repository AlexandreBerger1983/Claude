// Tests de la correspondance entre les objets de l'application et les tables
// Supabase. Une erreur ici perdrait des données sans que rien ne le signale.
import {
  COLLECTIONS, collectionsVides, definitionDe, versLigne, versObjet,
  chargerTout, enregistrer, supprimer, messageEcriture,
} from './donneesSupabase.js'

let ok = 0, fail = 0
const vrai = (label, cond) => {
  if (cond) { ok++; console.log(`OK   ${label}`) }
  else { fail++; console.log(`ÉCHEC ${label}`) }
}
const egal = (label, got, want) =>
  vrai(`${label} = ${JSON.stringify(got)}`, JSON.stringify(got) === JSON.stringify(want))

// ─── Les neuf collections sont décrites ──────────────────────────────────────
egal('neuf collections', COLLECTIONS.length, 9)
vrai('chaque collection a une table et des colonnes',
  COLLECTIONS.every(c => c.cle && c.table && typeof c.colonnes === 'function'))
vrai('les collections vides sont bien vides',
  Object.values(collectionsVides()).every(v => Array.isArray(v) && v.length === 0))
egal('une collection inconnue n’a pas de définition', definitionDe('inexistant'), null)

// ─── Aller-retour objet ↔ ligne ──────────────────────────────────────────────
const client = { id: 12, name: 'Gestion Tremblay', email: 'jean@exemple.com', ca: 48000, status: 'Actif' }
const ligne = versLigne('clients', client)
egal('identifiant sorti du jsonb', ligne.id, 12)
egal('nom sorti du jsonb pour les tris', ligne.nom, 'Gestion Tremblay')
egal('l’objet complet est conservé', ligne.donnees, client)
egal('aller-retour sans perte', versObjet(ligne), client)

// Le champ le plus sensible : un montant ne doit pas se transformer en chaîne
vrai('les nombres restent des nombres', typeof versObjet(ligne).ca === 'number')

// ─── Colonnes propres à chaque table ─────────────────────────────────────────
const projet = versLigne('projects', { id: 3, name: 'Cuisine Nadeau', status: 'En cours', budgetTotal: 42000 })
egal('projet : nom', projet.nom, 'Cuisine Nadeau')
egal('projet : statut', projet.statut, 'En cours')

const feuille = versLigne('timesheets', { id: 7, employeeId: 4, date: '2026-08-20', hours: 8 })
egal('feuille de temps : employé', feuille.employee_id, 4)
egal('feuille de temps : date', feuille.date_travail, '2026-08-20')

const soumission = versLigne('quotes', { id: 9, number: 'SOU-2026-014', total: 12500 })
egal('soumission : numéro', soumission.numero, 'SOU-2026-014')

const facture = versLigne('invoices', { id: 10, number: 'FAC-2026-003', total: 8200 })
egal('facture : numéro', facture.numero, 'FAC-2026-003')

// ─── Valeurs manquantes ou abîmées ───────────────────────────────────────────
// Une colonne `date` de Postgres refuse une chaîne vide : elle doit devenir
// null, sinon toute la feuille de temps serait rejetée.
egal('date vide → null', versLigne('timesheets', { id: 1, date: '' }).date_travail, null)
egal('date absente → null', versLigne('timesheets', { id: 1 }).date_travail, null)
egal('date invalide → null', versLigne('timesheets', { id: 1, date: 'bientôt' }).date_travail, null)
egal('date avec heure → jour seul', versLigne('timesheets', { id: 1, date: '2026-08-20T14:30:00Z' }).date_travail, '2026-08-20')
egal('employé absent → null', versLigne('timesheets', { id: 1 }).employee_id, null)
egal('nom absent → null', versLigne('clients', { id: 1 }).nom, null)
egal('nom vide → null', versLigne('clients', { id: 1, name: '' }).nom, null)

// Un enregistrement sans identifiant ne doit jamais partir en silence
let leve = false
try { versLigne('clients', { name: 'Sans identifiant' }) } catch { leve = true }
vrai('un enregistrement sans identifiant est refusé', leve)
leve = false
try { versLigne('collection-inconnue', { id: 1 }) } catch { leve = true }
vrai('une collection inconnue est refusée', leve)

// L'identifiant de la ligne fait foi, même si le jsonb en contient un autre
egal('l’identifiant de la ligne prime',
  versObjet({ id: 99, donnees: { id: 1, name: 'X' } }).id, 99)
egal('une ligne sans jsonb ne plante pas', versObjet({ id: 5 }), { id: 5 })

// ─── Lecture : un faux client Supabase ───────────────────────────────────────
const faireClient = (reponses) => ({
  from(table) {
    return {
      select() { return this },
      order() { return Promise.resolve(reponses[table] ?? { data: [], error: null }) },
      upsert(lignes) { this._upsert = lignes; return Promise.resolve(reponses._upsert ?? { error: null }) },
      delete() { return { eq: () => Promise.resolve(reponses._delete ?? { error: null }) } },
    }
  },
})

const lecture = await chargerTout(faireClient({
  clients: { data: [{ id: 1, donnees: { id: 1, name: 'Alpha' } }], error: null },
  projects: { data: [], error: null },
}))
egal('client chargé', lecture.donnees.clients, [{ id: 1, name: 'Alpha' }])
egal('aucune erreur', lecture.erreurs, [])
vrai('les neuf collections sont présentes même vides',
  Object.keys(lecture.donnees).length === 9)

// Une table refusée par les règles d'accès ne casse pas le reste
const partiel = await chargerTout(faireClient({
  clients: { data: [{ id: 1, donnees: { id: 1, name: 'Alpha' } }], error: null },
  payroll: { data: null, error: { message: 'permission denied for table payroll' } },
  quotes: { data: null, error: { message: 'permission denied for table quotes' } },
}))
egal('les clients sont quand même chargés', partiel.donnees.clients.length, 1)
egal('les soumissions refusées restent vides', partiel.donnees.quotes, [])
vrai('le refus est rapporté pour analyse', partiel.erreurs.some(e => /quotes/.test(e)))

// Une réponse qui n'est pas une liste ne doit pas faire tomber l'application
const bizarre = await chargerTout(faireClient({
  clients: { data: { message: 'gateway timeout' }, error: null },
  projects: { data: [{ id: 2, donnees: { id: 2, name: 'Beta' } }], error: null },
}))
egal('réponse inattendue → collection vide', bizarre.donnees.clients, [])
egal('les autres collections se chargent quand même', bizarre.donnees.projects.length, 1)
vrai('la réponse inattendue est rapportée', bizarre.erreurs.some(e => /inattendue/.test(e)))

// Sans client Supabase, rien ne plante
const sansClient = await chargerTout(null)
egal('sans base : collections vides', sansClient.donnees.clients, [])
egal('sans base : aucune erreur', sansClient.erreurs, [])

// ─── Écriture ────────────────────────────────────────────────────────────────
egal('écriture réussie', await enregistrer('clients', client, faireClient({})), {})
egal('écriture multiple réussie',
  await enregistrer('clients', [client, { ...client, id: 13 }], faireClient({})), {})
egal('écriture d’une liste vide : rien à faire', await enregistrer('clients', [], faireClient({})), {})
egal('suppression réussie', await supprimer('clients', 12, faireClient({})), {})
egal('sans base : écriture ignorée', await enregistrer('clients', client, null), {})

const refus = await enregistrer('quotes', { id: 1, number: 'A' },
  faireClient({ _upsert: { error: { message: 'new row violates row-level security policy' } } }))
vrai('un refus des règles d’accès est traduit', /n'a pas le droit/.test(refus.erreur))

// ─── Messages d'erreur ───────────────────────────────────────────────────────
vrai('règles d’accès', /n'a pas le droit/.test(messageEcriture('quotes', { message: 'permission denied' })))
vrai('réseau', /injoignable/.test(messageEcriture('clients', { message: 'Failed to fetch' })))
vrai('doublon', /existe déjà/.test(messageEcriture('clients', { message: 'duplicate key value' })))
vrai('erreur inconnue conservée telle quelle',
  /quelque chose d'inattendu/.test(messageEcriture('clients', { message: "quelque chose d'inattendu" })))

console.log(`\n${ok} réussis, ${fail} échoués`)
if (fail > 0) process.exit(1)
console.log('✅ Correspondance application ↔ Supabase correcte')
