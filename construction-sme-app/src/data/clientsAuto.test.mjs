// Tests de la création automatique d'un client à partir d'un devis.
import {
  normaliserNom, memeNom, trouverClientParNom, ficheDepuisDevis,
  complementsPourClient, resoudreClient, assurerClient,
} from './clientsAuto.js'

let ok = 0, fail = 0
const vrai = (label, cond) => {
  if (cond) { ok++; console.log(`OK   ${label}`) }
  else { fail++; console.log(`ÉCHEC ${label}`) }
}
const eq = (label, got, want) => vrai(`${label} = ${JSON.stringify(got)}`, got === want)

// Magasin de données factice : il enregistre ce qu'on lui demande de faire.
const magasin = (clients = []) => {
  const etat = clients.map(c => ({ ...c }))
  const journal = []
  let prochainId = Math.max(0, ...etat.map(c => c.id)) + 1
  return {
    etat, journal,
    add: (collection, item) => {
      const record = { id: prochainId++, ...item }
      etat.push(record)
      journal.push({ op: 'add', collection, record })
      return record
    },
    update: (collection, id, patch) => {
      const cible = etat.find(c => c.id === id)
      Object.assign(cible, patch)
      journal.push({ op: 'update', collection, id, patch })
    },
  }
}

const clients = [
  { id: 1, name: 'Immobilier Trépanier Inc.', phone: '514-555-0182', address: '1200 boul. René-Lévesque O.', email: 'marc@trepanier.ca', contact: 'Marc Trépanier' },
  { id: 2, name: 'Jean Tremblay', phone: '', address: '', email: '', contact: '' },
]

// ─── Comparaison de noms ────────────────────────────────────────────────────
vrai('la casse ne distingue pas deux clients', memeNom('Jean Tremblay', 'jean tremblay'))
vrai('les accents non plus', memeNom('Trépanier', 'Trepanier'))
vrai('les espaces en trop non plus', memeNom('  Jean   Tremblay ', 'Jean Tremblay'))
vrai('deux noms différents restent différents', !memeNom('Jean Tremblay', 'Jean Tremblay Fils'))
eq('un nom vide se normalise en chaîne vide', normaliserNom('   '), '')
eq('un nom absent ne plante pas', normaliserNom(undefined), '')
vrai('rechercher un nom vide ne trouve rien', trouverClientParNom(clients, '  ') === null)
vrai('rechercher dans une liste vide ne plante pas', trouverClientParNom([], 'Jean') === null)

// ─── Fiche créée depuis un devis ────────────────────────────────────────────
const fiche = ficheDepuisDevis({ name: '  Félix et Tania ', phone: '450-555-1234', address: '12 rue du Domaine' })
eq('le nom est nettoyé de ses espaces', fiche.name, 'Félix et Tania')
eq('le téléphone du devis est repris', fiche.phone, '450-555-1234')
eq('l’adresse du devis est reprise', fiche.address, '12 rue du Domaine')
eq('le type par défaut est Particulier', fiche.type, 'Particulier')
eq('le client est actif', fiche.status, 'Actif')
eq('le chiffre d’affaires démarre à zéro', fiche.ca, 0)
vrai('la date de début est celle du jour', fiche.since === new Date().toISOString().slice(0, 10))
vrai('aucun champ n’est undefined',
  Object.values(fiche).every(v => v !== undefined && v !== null))
eq('un devis sans téléphone donne une chaîne vide, pas undefined',
  ficheDepuisDevis({ name: 'X' }).phone, '')

// ─── Compléments : on remplit les trous, jamais le reste ────────────────────
const compl = complementsPourClient(clients[1], { phone: '514-555-9999', address: '5 rue A' })
eq('un téléphone manquant est proposé', compl.phone, '514-555-9999')
eq('une adresse manquante est proposée', compl.address, '5 rue A')
const aucun = complementsPourClient(clients[0], { phone: '999-999-9999', address: 'Ailleurs' })
vrai('un téléphone déjà renseigné n’est jamais remplacé', aucun.phone === undefined)
vrai('une adresse déjà renseignée n’est jamais remplacée', aucun.address === undefined)
eq('rien à compléter donne un objet vide', Object.keys(aucun).length, 0)
eq('une valeur vide dans le devis ne complète rien',
  Object.keys(complementsPourClient(clients[1], { phone: '   ' })).length, 0)

// ─── Décision ───────────────────────────────────────────────────────────────
eq('un nom inconnu doit être créé', resoudreClient(clients, { name: 'Sophie Girard' }).action, 'creer')
eq('un nom connu rattache au client existant', resoudreClient(clients, { name: 'Jean Tremblay' }).action, 'existant')
eq('un nom connu à la casse près aussi', resoudreClient(clients, { name: 'JEAN TREMBLAY' }).action, 'existant')
eq('le bon client est retrouvé', resoudreClient(clients, { name: 'jean tremblay' }).client.id, 2)
eq('sans nom, rien à faire', resoudreClient(clients, { name: '' }).action, 'aucun')
eq('un client choisi dans la liste est repris tel quel',
  resoudreClient(clients, { clientId: 1, name: 'Peu importe' }).client.id, 1)
eq('un identifiant en texte fonctionne aussi',
  resoudreClient(clients, { clientId: '2' }).client.id, 2)
eq('un identifiant inconnu retombe sur le nom',
  resoudreClient(clients, { clientId: 999, name: 'Sophie Girard' }).action, 'creer')
eq('aucune liste de clients ne plante', resoudreClient(undefined, { name: 'X' }).action, 'creer')

// ─── Application ────────────────────────────────────────────────────────────
{
  const m = magasin(clients)
  const r = assurerClient({ clients: m.etat, saisie: { name: 'Sophie Girard', phone: '418-555-7788', address: '9 rue B' }, add: m.add, update: m.update })
  vrai('le client est créé', r.cree === true)
  eq('un seul enregistrement', m.journal.length, 1)
  eq('il va bien dans la collection clients', m.journal[0].collection, 'clients')
  eq('le client créé porte un identifiant', typeof r.client.id, 'number')
  eq('le nom est le bon', r.client.name, 'Sophie Girard')
  eq('le téléphone a suivi', r.client.phone, '418-555-7788')
  eq('la liste compte un client de plus', m.etat.length, clients.length + 1)
}

{
  // Deux devis pour la même personne ne doivent pas faire deux clients.
  const m = magasin(clients)
  const a = assurerClient({ clients: m.etat, saisie: { name: 'Sophie Girard' }, add: m.add, update: m.update })
  const b = assurerClient({ clients: m.etat, saisie: { name: 'sophie  girard' }, add: m.add, update: m.update })
  vrai('le second devis ne crée pas de doublon', b.cree === false)
  eq('les deux devis pointent le même client', a.client.id, b.client.id)
  eq('un seul client ajouté au total', m.etat.length, clients.length + 1)
}

{
  // Un client connu mais incomplet se complète, sans rien écraser.
  const m = magasin(clients)
  const r = assurerClient({ clients: m.etat, saisie: { name: 'Jean Tremblay', phone: '514-555-4321' }, add: m.add, update: m.update })
  vrai('aucun client créé', r.cree === false)
  vrai('la fiche est complétée', r.complete === true)
  eq('une seule écriture', m.journal.length, 1)
  eq('c’est une mise à jour', m.journal[0].op, 'update')
  eq('le téléphone est enregistré', m.etat.find(c => c.id === 2).phone, '514-555-4321')
  eq('le client retourné porte le nouveau téléphone', r.client.phone, '514-555-4321')
}

{
  // Un client complet n'est jamais touché.
  const m = magasin(clients)
  const r = assurerClient({ clients: m.etat, saisie: { clientId: 1, name: 'Immobilier Trépanier Inc.', phone: '000' }, add: m.add, update: m.update })
  eq('aucune écriture', m.journal.length, 0)
  vrai('ni créé ni complété', !r.cree && !r.complete)
  eq('le téléphone d’origine est intact', m.etat.find(c => c.id === 1).phone, '514-555-0182')
  eq('le devis reste rattaché au bon client', r.client.id, 1)
}

{
  // Sans nom : aucun client, aucune écriture — le devis reste valide.
  const m = magasin(clients)
  const r = assurerClient({ clients: m.etat, saisie: { name: '  ' }, add: m.add, update: m.update })
  vrai('aucun client retourné', r.client === null)
  eq('aucune écriture', m.journal.length, 0)
}

console.log(`\n${ok} réussis, ${fail} échoués`)
if (fail > 0) process.exit(1)
console.log('✅ Un client saisi dans un devis se crée, sans doublon ni écrasement')
