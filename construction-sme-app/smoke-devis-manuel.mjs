// Vérifie les ajouts manuels dans l'estimateur : ligne personnalisée,
// article d'inventaire, et modification complète d'un item (crayon).
import { chromium } from 'playwright'

const base = 'http://localhost:4173'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

// Démarrer un devis jusqu'à l'étape travaux
await page.goto(base + '/estimateur')
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client Manuel')
await page.click('text=Rénovation générale')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Garage")').last().click()
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })
console.log('OK: arrivé à l\'étape travaux')

// 1. Ligne personnalisée
await page.click('button:has-text("Ligne personnalisée")')
await page.waitForSelector('text=Description du travail ou matériau', { timeout: 5000 })
await page.fill('input[placeholder="ex: Location nacelle 26 pi — 3 jours"]', 'Location conteneur à déchets')
await page.locator('form input[type="number"]').nth(0).fill('2')      // qté
await page.locator('form input[type="number"]').nth(1).fill('250')    // mat
await page.locator('form input[type="number"]').nth(2).fill('50')     // M.O.
await page.click('button:has-text("Ajouter au devis")')
await page.waitForSelector('text=Location conteneur à déchets', { timeout: 5000 })
console.log('OK: ligne personnalisée ajoutée (2 × (250+50) = 600 $ attendu)')

// vérifier le montant de la ligne : 600 $
const row = page.locator('.bg-white.rounded-xl', { hasText: 'Location conteneur à déchets' }).first()
const rowTxt = await row.textContent()
if (!rowTxt.includes('600')) throw new Error('total de ligne inattendu: ' + rowTxt)
console.log('OK: total de la ligne personnalisée = 600 $')

// 2. Article d'inventaire
await page.click('button:has-text("De mon inventaire")')
await page.waitForSelector('text=Mes matériaux en inventaire', { timeout: 5000 })
await page.fill('input[placeholder="Rechercher un article…"]', 'gypse')
await page.locator('button', { hasText: 'Panneau de gypse' }).first().click()
await page.waitForSelector('text=Panneau de gypse 5/8" (4x8)', { timeout: 5000 })
console.log('OK: article d\'inventaire ajouté au devis')

// 3. Modifier avec le crayon (changer qté et prix)
const gypseRow = page.locator('.bg-white.rounded-xl', { hasText: 'Panneau de gypse' }).first()
await gypseRow.locator('button[aria-label="Modifier"]').click()
await page.waitForSelector('text=Modifier ce travail', { timeout: 5000 })
await page.locator('form input[type="number"]').nth(0).fill('10')   // qté
await page.locator('form input[type="number"]').nth(1).fill('20')   // mat
await page.locator('form input[type="number"]').nth(2).fill('5')    // M.O.
await page.click('form button:has-text("Enregistrer")')
await page.waitForTimeout(400)
const gypseTxt = await page.locator('.bg-white.rounded-xl', { hasText: 'Panneau de gypse' }).first().textContent()
if (!gypseTxt.includes('250')) throw new Error('édition non appliquée: ' + gypseTxt)
console.log('OK: item modifié via crayon (10 × (20+5) = 250 $)')

// 4. Continuer jusqu'au devis final et vérifier que les lignes y figurent
await page.click('text=Continuer')
await page.waitForSelector('text=Prix total du devis, taxes incluses', { timeout: 5000 })
await page.waitForSelector('text=Location conteneur à déchets', { timeout: 5000 })
console.log('OK: lignes manuelles visibles dans le devis final')

await browser.close()
if (errors.length) {
  console.log('\nERREURS JS:')
  errors.forEach(e => console.log(' -', e))
  process.exit(1)
}
console.log('\n✅ Ajouts manuels et modification d\'items fonctionnels')
