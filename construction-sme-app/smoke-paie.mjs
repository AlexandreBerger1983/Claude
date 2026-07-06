import { chromium } from 'playwright'

const base = 'http://localhost:4173'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

// 1. Paramètres
await page.goto(base + '/parametres')
await page.waitForSelector('text=Paramètres', { timeout: 5000 })
await page.fill('input[placeholder="ex: Claude Gariépy et Fils Inc."]', 'Claude Gariépy et Fils Inc.')
await page.fill('input[placeholder="ex: Alexandre Berger"]', 'Alexandre Berger')
await page.fill('input[placeholder="ex: 8001-2345-67"]', '5678-1234-01')
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Enregistré', { timeout: 3000 })
console.log('OK: paramètres enregistrés')

await page.reload()
await page.waitForSelector('text=Claude Gariépy et Fils Inc.', { timeout: 5000 })
console.log('OK: nom de compagnie persiste après rechargement, visible dans le menu')

// 2. Paie & Heures
await page.goto(base + '/paie')
await page.waitForSelector('text=Paie & Heures (CCQ)', { timeout: 5000 })
await page.waitForSelector('text=Simon Gariépy', { timeout: 5000 })
console.log('OK: page Paie & Heures + employés importés du fichier Excel')

const firstRowInputs = page.locator('table input[type="number"]')
await firstRowInputs.nth(0).fill('45')
await firstRowInputs.nth(0).blur()
await page.waitForTimeout(300)
console.log('OK: saisie d\'heures dans la table hebdomadaire')

await page.click('text=Résumé de la semaine')
await page.waitForSelector('text=Comm. simple', { timeout: 5000 })
console.log('OK: onglet résumé hebdomadaire (reproduit la feuille Excel)')

await page.click('text=Fiche annuelle')
await page.waitForSelector('text=Heures travaillées', { timeout: 5000 })
await page.waitForSelector('text=Salaire annuel estimé', { timeout: 5000 })
console.log('OK: onglet fiche annuelle par employé (52 semaines + salaire estimé)')

await page.click('text=Banque d\'heures')
await page.waitForSelector('text=Banque Lourd (h)', { timeout: 5000 })
console.log('OK: onglet banque d\'heures (roster lié au module Employés)')

await page.click('text=Licences')
await page.waitForSelector('text=Licences expirées', { timeout: 5000 })
const firstLicenseName = await page.locator('table input').first().inputValue()
if (!firstLicenseName) throw new Error('licence sans nom importé')
console.log('OK: onglet licences avec données importées —', firstLicenseName)

// 3. Vérifie que les infos d'entreprise se propagent aux documents
await page.goto(base + '/')
await page.waitForSelector('text=Facturé en', { timeout: 5000 })
console.log('OK: tableau de bord toujours fonctionnel')

await page.goto(base + '/soumissions/1')
await page.waitForSelector('text=Claude Gariépy et Fils Inc.', { timeout: 5000 })
console.log('OK: soumission affiche le nom de compagnie personnalisé (deep-link direct)')

await browser.close()
if (errors.length) {
  console.log('\nERREURS JS:')
  errors.forEach(e => console.log(' -', e))
  process.exit(1)
}
console.log('\n✅ Tous les tests passent, aucune erreur JS')
