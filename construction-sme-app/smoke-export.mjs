// Télécharge réellement la soumission en Excel et en Word depuis le navigateur,
// puis enregistre les fichiers pour qu'ils soient validés (structure, feuilles,
// formules) par verif-export.py.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const OUT = '/tmp/export-test'
mkdirSync(OUT, { recursive: true })

const errors = []
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 } })
const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

// Parcours complet jusqu'au devis
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 5000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client Export')
await page.fill('input[placeholder="ex: 455 rue des Érables, Laval"]', '12 rue Test, Québec')
await page.click('text=Salle de bain')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Salle de bain")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })
await page.click('button:has-text("Questionnaire")')
await page.waitForSelector('text=Questionnaire — Salle de bain', { timeout: 5000 })
const oui = page.locator('button:has-text("Oui")')
for (const i of [0, 1, 2, 3, 4]) await oui.nth(i).click()
await page.click('button:has-text("Ajouter")')
await page.waitForTimeout(600)
await page.click('text=Continuer')
await page.waitForSelector('text=Prix total du devis, taxes incluses', { timeout: 5000 })
console.log('OK: devis prêt')

// Récupère le total affiché pour le comparer au contenu du fichier
const cells = await page.locator('table tfoot td').allTextContents()
const parseMoney = (s) => parseFloat(s.replace(/[^0-9,]/g, '').replace(',', '.'))
console.log(`TOTAL_AVEC_PROFIT=${parseMoney(cells[5])}`)

for (const [kind, label, file] of [
  ['excel', 'Télécharger en Excel', 'soumission.xlsx'],
  ['word', 'Télécharger en Word', 'soumission.docx'],
]) {
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click(`button:has-text("${label}")`),
  ])
  await dl.saveAs(`${OUT}/${file}`)
  console.log(`OK: ${kind} téléchargé → ${dl.suggestedFilename()}`)
}

// Aucun message d'erreur ne doit s'afficher
const body = await page.textContent('body')
if (body.includes("L'export n'a pas fonctionné")) throw new Error("message d'erreur d'export affiché")
console.log("OK: aucun message d'erreur d'export")

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
await browser.close()

// Valide le contenu et les formules du fichier Excel produit
const { execFileSync } = await import('node:child_process')
execFileSync('python3', ['verif-export.py', `${OUT}/soumission.xlsx`, String(parseMoney(cells[5]))],
  { stdio: 'inherit' })

console.log('✅ Export Excel et Word conformes aux gabarits')
