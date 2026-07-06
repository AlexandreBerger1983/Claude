import { chromium } from 'playwright'

const base = 'http://localhost:4173'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }) // iPhone-ish
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

// 1. Home estimateur
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 5000 })
console.log('OK: page estimateur (accueil)')

// 2. Start wizard
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
console.log('OK: étape 1 (client)')

// 3. New client
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Test Client')
await page.click('text=Salle de bain')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
console.log('OK: étape 2 (pièces)')

// 4. Add room preset (Salle de bain preset button in grid)
await page.locator('button:has-text("Salle de bain")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
console.log('OK: pièce ajoutée avec surface calculée')

// 5. Continue to works
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })
console.log('OK: étape 3 (travaux)')

// 6. Open category + add a work
await page.click('text=Peinture')
await page.click('text=Peinture murs — 2 couches (apprêt + finition)')
await page.waitForSelector('text=Travaux choisis', { timeout: 5000 })
console.log('OK: travail ajouté avec quantité auto')

// 7. Continue to quote
await page.click('text=Continuer')
await page.waitForSelector('text=Prix total du devis, taxes incluses', { timeout: 5000 })
const total = await page.locator('.text-4xl').first().textContent()
console.log('OK: étape 4 (devis) — total affiché:', total.trim())

// 8. Save
await page.click('button:has-text("Enregistrer le devis")')
await page.waitForSelector('text=Devis enregistré', { timeout: 5000 })
console.log('OK: devis enregistré')

// 9. Back at home with saved quote
await page.waitForSelector('text=Mes devis enregistrés', { timeout: 8000 })
await page.waitForSelector('text=Test Client', { timeout: 5000 })
console.log('OK: devis visible dans la liste')

// 10. Dashboard still renders on mobile
await page.goto(base + '/')
await page.waitForSelector('text=Facturé en', { timeout: 5000 })
console.log('OK: tableau de bord mobile')

await browser.close()
if (errors.length) {
  console.log('\nERREURS JS:')
  errors.forEach(e => console.log(' -', e))
  process.exit(1)
}
console.log('\n✅ Tous les tests passent, aucune erreur JS')
