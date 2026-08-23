// Vérifie le cycle complet de sauvegarde : télécharger un fichier, modifier
// les données, restaurer, et confirmer que l'état d'origine revient — ainsi
// que le refus des fichiers qui ne sont pas des sauvegardes valides.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const OUT = '/tmp/sauvegarde-test'
mkdirSync(OUT, { recursive: true })

const errors = []
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 950 } })
const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const nbClients = () => page.evaluate(() =>
  JSON.parse(localStorage.getItem('cp-donnees-v1') || '{}').clients?.length ?? 0)

// 1. État de départ
await page.goto(base + '/')
await page.waitForSelector('text=ConstructPro', { timeout: 8000 })
await page.waitForFunction(() => localStorage.getItem('cp-donnees-v1') !== null, { timeout: 8000 })
const avant = await nbClients()
if (avant === 0) throw new Error('aucun client au départ, le test ne prouverait rien')
console.log('Clients au départ :', avant)

// 2. Sauvegarde
await page.goto(base + '/parametres')
await page.waitForSelector('text=Sauvegarde de vos données', { timeout: 5000 })
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  page.click('button:has-text("Sauvegarder mes données")'),
])
const fichier = `${OUT}/sauvegarde.json`
await dl.saveAs(fichier)
console.log('OK: sauvegarde téléchargée →', dl.suggestedFilename())

const contenu = JSON.parse(readFileSync(fichier, 'utf8'))
if (contenu.format !== 'constructpro-sauvegarde') throw new Error('format inattendu')
const cles = Object.keys(contenu.donnees)
console.log(`OK: fichier valide, ${cles.length} ensemble(s) :`, cles.join(', '))
if (!cles.includes('cp-donnees-v1')) throw new Error('données principales absentes du fichier')

// 3. Modifie les données (supprime tous les clients)
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('cp-donnees-v1'))
  d.clients = []
  localStorage.setItem('cp-donnees-v1', JSON.stringify(d))
})
await page.reload()
await page.waitForTimeout(500)
if (await nbClients() !== 0) throw new Error('la modification n’a pas pris')
console.log('OK: données modifiées (0 client)')

// 4. Restauration
page.on('dialog', d => d.accept())
await page.goto(base + '/parametres')
await page.waitForSelector('text=Restaurer une sauvegarde', { timeout: 5000 })
await page.setInputFiles('input[type="file"][accept*="json"]', fichier)
await page.waitForTimeout(2500)
const apres = await nbClients()
console.log('Clients après restauration :', apres)
if (apres !== avant) throw new Error(`restauration incorrecte : ${apres} au lieu de ${avant}`)
console.log('OK: les données d’origine sont revenues')

// 5. Un fichier invalide doit être refusé sans rien casser
const mauvais = `${OUT}/pasunesauvegarde.json`
writeFileSync(mauvais, JSON.stringify({ nimporte: 'quoi' }))
await page.setInputFiles('input[type="file"][accept*="json"]', mauvais)
await page.waitForSelector('text=/Restauration impossible/', { timeout: 5000 })
console.log('OK: fichier invalide refusé avec un message clair')
if (await nbClients() !== avant) throw new Error('un fichier invalide a altéré les données')
console.log('OK: les données sont intactes après le refus')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Sauvegarde et restauration fonctionnelles')
await browser.close()
