// Vérifie qu'une soumission peut être supprimée, depuis la liste comme depuis
// sa fiche — y compris sur un écran de téléphone, où la colonne d'actions de
// la liste était auparavant rognée et hors d'atteinte.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const soumissions = () => page.evaluate(() =>
  (JSON.parse(localStorage.getItem('cp-donnees-v1') || '{}').quotes ?? []))

// ─── Créer deux soumissions par l'estimateur ─────────────────────────────────
const creerDevis = async (nomClient) => {
  await page.goto(base + '/estimateur')
  await page.waitForSelector('text=Nouveau devis', { timeout: 8000 })
  await page.click('text=Nouveau devis')
  await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
  await page.click('text=Nouveau client')
  await page.fill('input[placeholder="ex: Jean Tremblay"]', nomClient)
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
  await page.waitForSelector('text=Devis', { timeout: 8000 })
  await page.waitForTimeout(2300)
}

// Ouvrir l'application avant de lire son stockage : sur une page vierge,
// localStorage n'est pas accessible.
await page.goto(base + '/soumissions')
await page.waitForSelector('table', { timeout: 10000 })
// L'application démarre avec des soumissions d'exemple : on compte donc les
// nôtres, pas le total.
const avant = (await soumissions()).length
await creerDevis('Client À Supprimer')
await creerDevis('Client À Garder')
const depart = await soumissions()
console.log(`Soumissions : ${avant} au départ, ${depart.length} après nos deux ajouts`)
if (depart.length !== avant + 2) throw new Error(`${depart.length - avant} soumissions ajoutées au lieu de 2`)
const aSupprimer = depart.find(q => q.client === 'Client À Supprimer')
const aGarder = depart.find(q => q.client === 'Client À Garder')
if (!aSupprimer || !aGarder) throw new Error('les soumissions créées sont introuvables')
console.log(`OK: deux soumissions — ${aSupprimer.number} et ${aGarder.number}`)

// ─── Sur téléphone : le bouton de suppression doit être atteignable ──────────
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(base + '/soumissions')
// Sur téléphone le menu latéral est masqué : attendre le tableau plutôt que
// le mot « Soumissions », qui existe aussi dans un menu invisible.
await page.waitForSelector('table', { timeout: 10000 })
const boutonSuppr = page.locator(`button[aria-label="Supprimer ${aSupprimer.number}"]`)
if (await boutonSuppr.count() === 0)
  throw new Error('le bouton de suppression n’existe pas dans la liste')

// Le tableau doit pouvoir défiler horizontalement, sinon la colonne est rognée
const peutDefiler = await page.evaluate(() => {
  const t = document.querySelector('table')
  const cadre = t?.parentElement
  if (!cadre) return null
  return {
    debordement: cadre.scrollWidth > cadre.clientWidth,
    style: getComputedStyle(cadre).overflowX,
  }
})
console.log('Cadre du tableau :', JSON.stringify(peutDefiler))
if (peutDefiler.debordement && !['auto', 'scroll'].includes(peutDefiler.style))
  throw new Error('le tableau déborde sans pouvoir défiler : la colonne d’actions est inatteignable')
console.log('OK: sur téléphone, le tableau défile — la colonne d’actions reste accessible')

// ─── Supprimer depuis la fiche de la soumission ──────────────────────────────
await page.setViewportSize({ width: 1280, height: 1000 })
await page.goto(base + '/soumissions')
await page.waitForSelector('table', { timeout: 10000 })
// On ouvre la fiche depuis la liste : c'est le geste réel de l'utilisateur.
await page.locator('tr', { hasText: aSupprimer.number }).first().click()
await page.waitForTimeout(1200)
await page.waitForSelector('text=Retour aux soumissions', { timeout: 10000 })
await page.waitForSelector('button:has-text("Supprimer")', { timeout: 5000 })
console.log('OK: la fiche d’une soumission propose « Supprimer »')

// Refuser la confirmation ne doit rien supprimer
page.once('dialog', d => d.dismiss())
await page.click('button:has-text("Supprimer")')
await page.waitForTimeout(900)
if ((await soumissions()).length !== avant + 2)
  throw new Error('la soumission a été supprimée malgré le refus de la confirmation')
console.log('OK: refuser la confirmation ne supprime rien')

// Accepter supprime et renvoie à la liste
page.once('dialog', async d => {
  if (!/Supprimer la soumission/.test(d.message()))
    errors.push('la confirmation ne nomme pas la soumission : ' + d.message())
  await d.accept()
})
await page.click('button:has-text("Supprimer")')
await page.waitForTimeout(1500)
if (!page.url().includes('/soumissions') || page.url().includes(String(aSupprimer.id)))
  throw new Error('la suppression ne renvoie pas à la liste des soumissions')
console.log('OK: la suppression renvoie à la liste')

const restantes = await soumissions()
console.log('Soumissions restantes :', restantes.length)
if (restantes.length !== avant + 1)
  throw new Error(`${restantes.length} soumissions restantes au lieu de ${avant + 1}`)
if (restantes.some(q => q.number === aSupprimer.number))
  throw new Error('la soumission visée est toujours là')
if (!restantes.some(q => q.number === aGarder.number))
  throw new Error('ce n’est pas la bonne soumission qui a été supprimée')
console.log(`OK: seule ${aSupprimer.number} est supprimée — ${aGarder.number} est intacte`)

const corps = await page.textContent('body')
if (corps.includes(aSupprimer.number))
  throw new Error('la soumission supprimée apparaît encore dans la liste')
console.log('OK: la liste ne montre plus la soumission supprimée')

// ─── Supprimer depuis la liste ───────────────────────────────────────────────
page.once('dialog', d => d.accept())
await page.click(`button[aria-label="Supprimer ${aGarder.number}"]`)
await page.waitForTimeout(1200)
if ((await soumissions()).some(q => q.number === aGarder.number))
  throw new Error('la suppression depuis la liste n’a pas fonctionné')
console.log('OK: la suppression depuis la liste fonctionne aussi')

// ─── Une soumission acceptée doit avertir plus fort ──────────────────────────
await creerDevis('Client Accepté')
const acceptee = (await soumissions()).find(q => q.client === 'Client Accepté')
if (!acceptee) throw new Error('la soumission d’essai est introuvable')
await page.goto(base + '/soumissions')
await page.waitForSelector('table', { timeout: 10000 })
await page.locator('tr', { hasText: acceptee.number }).first().click()
await page.waitForTimeout(1000)
await page.waitForSelector('button:has-text("Marquer acceptée")', { timeout: 10000 })
await page.click('button:has-text("Marquer acceptée")')
await page.waitForTimeout(900)

let messageAvertissement = ''
page.once('dialog', async d => { messageAvertissement = d.message(); await d.dismiss() })
await page.click('button:has-text("Supprimer")')
await page.waitForTimeout(900)
if (!/ACCEPT/i.test(messageAvertissement))
  throw new Error('la confirmation n’avertit pas qu’une soumission acceptée est supprimée')
console.log('OK: une soumission acceptée déclenche un avertissement renforcé')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Suppression des soumissions possible depuis la liste et depuis la fiche')
await browser.close()
