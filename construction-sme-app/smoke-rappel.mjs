// Vérifie le rappel mensuel de sauvegarde : absent à la première visite,
// affiché passé 30 jours, report de 7 jours, et disparition après avoir
// sauvegardé.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const OUT = '/tmp/rappel-test'
mkdirSync(OUT, { recursive: true })

const errors = []
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 950 } })
const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const visible = () => page.locator('text=/Vos données ne sont pas encore sauvegardées|Dernière sauvegarde il y a/').isVisible()

// Recule la date de référence du rappel de N jours
const vieillir = (jours) => page.evaluate((j) => {
  const e = JSON.parse(localStorage.getItem('cp-sauvegarde-rappel') || '{}')
  const d = new Date(Date.now() - j * 86400000).toISOString()
  if (e.derniere) e.derniere = d; else e.depuis = d
  e.reporteA = null
  localStorage.setItem('cp-sauvegarde-rappel', JSON.stringify(e))
}, jours)

// 1. Première visite : pas de rappel (on ne harcèle pas un nouvel arrivant)
await page.goto(base + '/')
await page.waitForSelector('text=ConstructPro', { timeout: 8000 })
await page.waitForTimeout(400)
if (await visible()) throw new Error('le rappel apparaît dès la première visite')
console.log('OK: aucun rappel à la première visite')

// 2. Après 31 jours : le rappel apparaît
await vieillir(31)
await page.reload()
await page.waitForTimeout(600)
if (!(await visible())) throw new Error('aucun rappel après 31 jours')
console.log('OK: rappel affiché après 31 jours')

// 3. « Me le rappeler dans 7 jours » le masque, y compris après rechargement
await page.click('button:has-text("Me le rappeler dans 7 jours")')
await page.waitForTimeout(300)
if (await visible()) throw new Error('le rappel reste affiché après report')
await page.reload()
await page.waitForTimeout(600)
if (await visible()) throw new Error('le report ne survit pas au rechargement')
console.log('OK: report de 7 jours respecté, même après rechargement')

// 4. Sauvegarder depuis le bandeau le fait disparaître et remet le compteur
await vieillir(31)
await page.reload()
await page.waitForTimeout(600)
if (!(await visible())) throw new Error('le rappel devrait être revenu')
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  page.click('button:has-text("Sauvegarder maintenant")'),
])
await dl.saveAs(`${OUT}/${dl.suggestedFilename()}`)
await page.waitForTimeout(400)
if (await visible()) throw new Error('le rappel persiste après sauvegarde')
console.log('OK: sauvegarde depuis le bandeau →', dl.suggestedFilename())

await page.reload()
await page.waitForTimeout(600)
if (await visible()) throw new Error('le rappel revient alors qu’on vient de sauvegarder')
console.log('OK: compteur remis à zéro, plus de rappel')

// 5. Le bandeau ne doit pas gêner l'assistant de devis
await page.evaluate(() => {
  const e = JSON.parse(localStorage.getItem('cp-sauvegarde-rappel'))
  e.derniere = new Date(Date.now() - 60 * 86400000).toISOString()
  e.reporteA = null
  localStorage.setItem('cp-sauvegarde-rappel', JSON.stringify(e))
})
await page.goto(base + '/estimateur/nouveau')
await page.waitForTimeout(800)
if (await visible()) throw new Error('le rappel s’affiche pendant l’assistant de devis')
console.log('OK: aucun rappel pendant l’assistant de devis')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Rappel mensuel de sauvegarde fonctionnel')
await browser.close()
