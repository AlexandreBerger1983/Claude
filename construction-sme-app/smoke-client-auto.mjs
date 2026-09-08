// Vérifie qu'un client saisi dans un devis se crée pour de vrai dans la fiche
// Clients — depuis l'estimateur de rénovation, depuis la maison neuve et
// depuis une soumission modifiée — sans jamais faire de doublon.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const lesClients = () => page.evaluate(() =>
  (JSON.parse(localStorage.getItem('cp-donnees-v1') || '{}').clients ?? []))
const lesSoumissions = () => page.evaluate(() =>
  (JSON.parse(localStorage.getItem('cp-donnees-v1') || '{}').quotes ?? []))

await page.goto(base + '/clients')
await page.waitForSelector('text=Nouveau client', { timeout: 10000 })
const depart = await lesClients()
console.log(`Clients au départ : ${depart.length}`)

// ─── 1. Un nom neuf tapé dans l'estimateur de rénovation ─────────────────────
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 8000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Sophie Girard')
await page.fill('input[placeholder="ex: 514-555-1234"]', '418-555-7788')
await page.fill('input[placeholder="ex: 455 rue des Érables, Laval"]', '9 rue des Bouleaux, Sainte-Foy')
await page.waitForTimeout(500)

// L'application annonce ce qu'elle va faire du nom saisi
const avis = await page.textContent('body')
if (!/sera ajouté à vos clients/.test(avis))
  throw new Error('rien n’annonce que le client sera créé')
console.log('OK: l’écran annonce que le nouveau nom deviendra un client')

await page.click('text=Salle de bain')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Salle de bain")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })
await page.locator('button').filter({ has: page.locator('p:text-is("Peinture")') }).first().click()
await page.waitForTimeout(400)
await page.click('text=Peinture murs — 2 couches (apprêt + finition)')
await page.waitForSelector('text=Travaux choisis', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('button:has-text("Enregistrer")', { timeout: 8000 })
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Devis enregistré', { timeout: 8000 })
await page.waitForTimeout(2400)

const apresRenovation = await lesClients()
console.log(`Clients après le devis de rénovation : ${apresRenovation.length}`)
if (apresRenovation.length !== depart.length + 1)
  throw new Error(`${apresRenovation.length - depart.length} clients créés au lieu de 1`)
const sophie = apresRenovation.find(c => c.name === 'Sophie Girard')
if (!sophie) throw new Error('le client saisi dans le devis n’a pas été créé')
console.log(`Client créé : ${sophie.name} · ${sophie.phone} · ${sophie.address} · ${sophie.type}`)
if (sophie.phone !== '418-555-7788') throw new Error('le téléphone du devis n’a pas suivi')
if (!/Bouleaux/.test(sophie.address)) throw new Error('l’adresse du devis n’a pas suivi')
if (sophie.type !== 'Particulier') throw new Error(`type « ${sophie.type} » au lieu de « Particulier »`)
if (sophie.status !== 'Actif') throw new Error('le client créé devrait être actif')
console.log('OK: le client est créé avec son téléphone et son adresse')

// La soumission produite pointe le client, pas seulement son nom
const soumissionRenovation = (await lesSoumissions()).find(q => q.client === 'Sophie Girard')
if (!soumissionRenovation) throw new Error('aucune soumission au nom de Sophie Girard')
if (soumissionRenovation.clientId !== sophie.id)
  throw new Error(`la soumission pointe le client ${soumissionRenovation.clientId} au lieu de ${sophie.id}`)
console.log('OK: la soumission est rattachée à la fiche du client, pas juste à son nom')

// ─── 2. Le client apparaît vraiment dans l'écran Clients ─────────────────────
await page.goto(base + '/clients')
await page.waitForSelector('text=Nouveau client', { timeout: 10000 })
await page.waitForTimeout(600)
const ecranClients = await page.textContent('body')
if (!ecranClients.includes('Sophie Girard'))
  throw new Error('le client créé n’apparaît pas dans l’écran Clients')
if (!ecranClients.includes('418-555-7788'))
  throw new Error('le téléphone n’apparaît pas dans l’écran Clients')
console.log('OK: le client est visible dans l’écran Clients, avec ses coordonnées')

// ─── 3. Le même nom une seconde fois : aucun doublon ─────────────────────────
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 8000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
// À la casse et aux espaces près : c'est la même personne
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'sophie  girard')
await page.waitForTimeout(600)
const avisDoublon = await page.textContent('body')
if (!/est déjà dans vos clients/.test(avisDoublon))
  throw new Error('rien ne signale que ce nom existe déjà')
console.log('OK: un nom déjà connu est signalé avant l’enregistrement')

await page.click('text=Cuisine')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Cuisine")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })
await page.locator('button').filter({ has: page.locator('p:text-is("Peinture")') }).first().click()
await page.waitForTimeout(400)
await page.click('text=Peinture murs — 2 couches (apprêt + finition)')
await page.waitForSelector('text=Travaux choisis', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('button:has-text("Enregistrer")', { timeout: 8000 })
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Devis enregistré', { timeout: 8000 })
await page.waitForTimeout(2400)

const apresDoublon = await lesClients()
console.log(`Clients après le second devis : ${apresDoublon.length}`)
if (apresDoublon.length !== depart.length + 1)
  throw new Error('un doublon a été créé pour le même client')
if (apresDoublon.filter(c => /sophie/i.test(c.name)).length !== 1)
  throw new Error('plusieurs fiches portent le nom de Sophie Girard')
console.log('OK: le même nom ne crée pas de second client')

// Le téléphone d'origine n'a pas été écrasé par un devis qui n'en portait pas
const sophieApres = apresDoublon.find(c => /sophie/i.test(c.name))
if (sophieApres.phone !== '418-555-7788')
  throw new Error('le téléphone du client a été écrasé par le second devis')
console.log('OK: les coordonnées existantes ne sont jamais écrasées')

// ─── 4. Depuis un devis de maison neuve ──────────────────────────────────────
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouvelle maison neuve', { timeout: 8000 })
await page.click('text=Nouvelle maison neuve')
await page.waitForSelector('text=Pour qui est cette maison ?', { timeout: 8000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Félix et Tania"]', 'Félix et Tania Lavoie')
await page.fill('input[placeholder="ex: 514-555-1234"]', '450-555-2211')
await page.fill('input[placeholder="ex: 455 rue des Érables, Laval"]', '12 rue du Domaine, Sainte-Adèle')
await page.waitForTimeout(500)
if (!/sera ajouté à vos clients/.test(await page.textContent('body')))
  throw new Error('la maison neuve n’annonce pas la création du client')
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux comprend la maison ?', { timeout: 8000 })
await page.click('button[aria-label="Division 01 Exigences générales"]')
await page.waitForSelector('button[aria-label^="Ajouter GCR"]', { timeout: 5000 })
await page.click('button[aria-label^="Ajouter GCR"]')
await page.waitForTimeout(400)
await page.click('text=Continuer')
await page.waitForSelector('button:has-text("Enregistrer")', { timeout: 8000 })
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Devis enregistré', { timeout: 8000 })
await page.waitForTimeout(2400)

const apresNeuf = await lesClients()
console.log(`Clients après le devis de maison neuve : ${apresNeuf.length}`)
if (apresNeuf.length !== depart.length + 2)
  throw new Error(`${apresNeuf.length - depart.length} clients au lieu de 2`)
const felix = apresNeuf.find(c => c.name === 'Félix et Tania Lavoie')
if (!felix) throw new Error('le client de la maison neuve n’a pas été créé')
if (felix.phone !== '450-555-2211') throw new Error('le téléphone de la maison neuve n’a pas suivi')
if (!/Domaine/.test(felix.address)) throw new Error('l’adresse de la maison neuve n’a pas suivi')
console.log(`OK: la maison neuve crée aussi son client — ${felix.name} · ${felix.phone}`)

const soumissionNeuve = (await lesSoumissions()).find(q => q.client === 'Félix et Tania Lavoie')
if (soumissionNeuve.clientId !== felix.id)
  throw new Error('la soumission de maison neuve n’est pas rattachée à la fiche du client')
console.log('OK: la soumission de maison neuve pointe la fiche du client')

// ─── 5. Une soumission dont le client n'existe pas dans la fiche ────────────
// Cas des données déjà en place : une soumission créée avant cette
// correction porte un nom de client que la fiche Clients ignore. La
// modifier doit réparer le lien plutôt que de le laisser pendant.
await page.goto(base + '/soumissions')
await page.waitForSelector('table', { timeout: 10000 })
await page.evaluate(() => {
  const cle = 'cp-donnees-v1'
  const d = JSON.parse(localStorage.getItem(cle) || '{}')
  d.quotes = [...(d.quotes ?? []), {
    id: 987654, number: 'SOU-ANCIENNE-01', title: 'Soumission d’avant',
    client: 'Gestion Rivard Inc.', clientId: null,
    date: '2026-01-15', validUntil: '2026-03-15', status: 'Brouillon', estimator: '',
    items: [{ id: 1, description: 'Travaux divers', unit: 'forfait', qty: 1, unitPrice: 5000 }],
    subtotal: 5000, tps: 250, tvq: 498.75, total: 5748.75,
  }]
  localStorage.setItem(cle, JSON.stringify(d))
})
// Rechargement complet : l'application relit alors le stockage.
await page.reload()
await page.waitForSelector('table', { timeout: 10000 })
await page.locator('tr', { hasText: 'SOU-ANCIENNE-01' }).first().click()
await page.waitForSelector('text=Retour aux soumissions', { timeout: 10000 })
const avantReparation = await lesClients()
if (avantReparation.some(c => c.name === 'Gestion Rivard Inc.'))
  throw new Error('le client de départ ne devrait pas exister encore')
await page.click('button:has-text("Modifier")')
await page.waitForTimeout(700)
await page.click('button:has-text("Enregistrer")')
await page.waitForTimeout(2400)

const apresFiche = await lesClients()
console.log(`Clients après modification de la soumission : ${apresFiche.length}`)
if (apresFiche.length !== depart.length + 3)
  throw new Error(`${apresFiche.length - depart.length} clients au lieu de 3`)
const rivard = apresFiche.find(c => c.name === 'Gestion Rivard Inc.')
if (!rivard) throw new Error('le client de la soumission n’a pas été créé')
const soumissionMaj = (await lesSoumissions()).find(q => q.number === 'SOU-ANCIENNE-01')
if (soumissionMaj.clientId !== rivard.id)
  throw new Error('la soumission n’a pas été rattachée au client créé')
console.log('OK: une soumission dont le client manquait crée sa fiche et s’y rattache')

// ─── 6. Rien n'a été cassé côté clients existants ────────────────────────────
for (const origine of depart) {
  const encore = apresFiche.find(c => c.id === origine.id)
  if (!encore) throw new Error(`le client « ${origine.name} » a disparu`)
  if (encore.name !== origine.name || encore.phone !== origine.phone)
    throw new Error(`le client « ${origine.name} » a été modifié`)
}
console.log(`OK: les ${depart.length} clients existants sont intacts`)

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Un client saisi dans un devis se crée dans la fiche Clients, sans doublon')
await browser.close()
