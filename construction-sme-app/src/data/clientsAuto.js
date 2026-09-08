// Création automatique d'un client à partir d'un devis.
//
// Jusqu'ici, taper un nouveau nom dans l'estimateur ne créait rien : le devis
// portait le nom du client en texte, la fiche Clients restait vide, et il
// fallait ressaisir la même personne à la main pour la retrouver ailleurs
// dans l'application. Le client est maintenant créé dès l'enregistrement du
// devis, avec ce qu'on connaît de lui.
//
// Deux garde-fous :
//
//   • on ne crée jamais deux fois le même client. Un nom déjà présent dans la
//     liste — à la casse, aux accents et aux espaces près — rattache le devis
//     au client existant ;
//   • on ne remplace jamais une information existante. Si la fiche du client
//     n'a pas de téléphone et que le devis en porte un, on le complète ; si
//     elle en a déjà un, on n'y touche pas, même s'il diffère.

// Comparaison de noms tolérante : « Jean Tremblay », « jean tremblay » et
// « Jean  Trémblay » désignent la même personne pour un entrepreneur.
export const normaliserNom = (nom = '') =>
  String(nom)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()

export const memeNom = (a, b) => normaliserNom(a) === normaliserNom(b)

export const trouverClientParNom = (clients = [], nom) => {
  const cible = normaliserNom(nom)
  if (!cible) return null
  return clients.find(c => normaliserNom(c.name) === cible) ?? null
}

// Fiche d'un client créé depuis un devis. Le type par défaut est
// « Particulier » : l'estimateur sert d'abord chez des propriétaires. Il reste
// modifiable dans la fiche Clients comme n'importe quel autre champ.
export const ficheDepuisDevis = (saisie = {}) => ({
  name: String(saisie.name ?? '').trim(),
  contact: String(saisie.contact ?? '').trim(),
  email: String(saisie.email ?? '').trim(),
  phone: String(saisie.phone ?? '').trim(),
  address: String(saisie.address ?? '').trim(),
  type: saisie.type || 'Particulier',
  neq: '',
  ca: 0,
  status: 'Actif',
  since: new Date().toISOString().slice(0, 10),
  notes: '',
})

// Champs vides de la fiche existante que le devis peut renseigner. On ne
// retourne que ce qui manque : jamais de quoi écraser une donnée saisie.
export const complementsPourClient = (client = {}, saisie = {}) => {
  const complements = {}
  for (const champ of ['phone', 'address', 'email', 'contact']) {
    const valeur = String(saisie[champ] ?? '').trim()
    if (valeur && !String(client[champ] ?? '').trim()) complements[champ] = valeur
  }
  return complements
}

// Ce qu'il faut faire du client saisi, sans rien modifier : décider d'abord,
// agir ensuite. `action` vaut 'existant', 'creer' ou 'aucun'.
export function resoudreClient(clients = [], saisie = {}) {
  const parId = saisie.clientId != null && saisie.clientId !== ''
    ? clients.find(c => String(c.id) === String(saisie.clientId))
    : null
  if (parId) return { action: 'existant', client: parId, complements: complementsPourClient(parId, saisie) }

  const nom = String(saisie.name ?? '').trim()
  if (!nom) return { action: 'aucun', client: null, complements: {} }

  const parNom = trouverClientParNom(clients, nom)
  if (parNom) return { action: 'existant', client: parNom, complements: complementsPourClient(parNom, saisie) }

  return { action: 'creer', client: null, complements: {}, fiche: ficheDepuisDevis(saisie) }
}

// Applique la décision. `add` et `update` sont ceux du magasin de données ;
// les passer en paramètres garde la fonction vérifiable hors de React.
// Retourne le client à rattacher au devis, ou null si aucun nom n'a été saisi.
export function assurerClient({ clients = [], saisie = {}, add, update }) {
  const decision = resoudreClient(clients, saisie)

  if (decision.action === 'creer') {
    return { client: add('clients', decision.fiche) ?? null, cree: true, complete: false }
  }
  if (decision.action === 'existant') {
    const aCompleter = Object.keys(decision.complements).length > 0
    if (aCompleter) update('clients', decision.client.id, decision.complements)
    return {
      client: aCompleter ? { ...decision.client, ...decision.complements } : decision.client,
      cree: false,
      complete: aCompleter,
    }
  }
  return { client: null, cree: false, complete: false }
}
