// Vérifie : suppression employés / heures / matériaux, et les liaisons
// heures ↔ taux horaire ↔ employés / clients / paie.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('dialog', d => d.accept())

// ── Employés : heures et coût M.O. calculés depuis les feuilles de temps ──
await page.goto(base + '/employes')
await page.waitForSelector('text=Heures saisies', { timeout: 5000 })
await page.waitForSelector('text=Coût M.O.', { timeout: 5000 })
// Jean-François Lapointe a 16h dans les feuilles de temps (8+8), taux 65 $ → 1 040 $
const jfRow = page.locator('tr', { hasText: 'Jean-François Lapointe' }).first()
const jfTxt = await jfRow.textContent()
if (!jfTxt.includes('16h')) throw new Error('heures non liées: ' + jfTxt)
if (!jfTxt.includes('1') || !jfTxt.includes('040')) throw new Error('coût M.O. non calculé: ' + jfTxt)
console.log('OK: liaison heures × taux dans Employés (16h × 65 $ = 1 040 $)')

// ── Suppression d'un employé ──
await page.click('button:has-text("Ajouter employé")')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Employé À Supprimer')
await page.fill('input[placeholder="ex: Charpentier-menuisier"]', 'Test')
await page.click('form button:has-text("Enregistrer")')
await page.waitForSelector('text=Employé À Supprimer', { timeout: 5000 })
await page.locator('tr', { hasText: 'Employé À Supprimer' }).locator('button[title="Supprimer cet employé"]').click()
await page.waitForTimeout(400)
if (await page.locator('text=Employé À Supprimer').count() > 0) throw new Error('employé pas supprimé')
console.log('OK: suppression d\'un employé')

// ── Suppression d'une entrée de feuille de temps ──
await page.goto(base + '/feuilles-de-temps')
await page.waitForSelector('table', { timeout: 5000 })
const rowsBefore = await page.locator('tbody tr').count()
await page.locator('tbody tr').first().locator('button[title="Supprimer cette entrée"]').click()
await page.waitForTimeout(400)
const rowsAfter = await page.locator('tbody tr').count()
if (rowsAfter !== rowsBefore - 1) throw new Error(`entrée pas supprimée: ${rowsBefore} → ${rowsAfter}`)
console.log('OK: suppression d\'une entrée de temps', rowsBefore, '→', rowsAfter)

// ── Suppression d'un matériau ──
await page.goto(base + '/materiaux')
await page.waitForSelector('table', { timeout: 5000 })
const matBefore = await page.locator('tbody tr').count()
await page.locator('tbody tr').first().locator('button[title="Supprimer cet article"]').click()
await page.waitForTimeout(400)
const matAfter = await page.locator('tbody tr').count()
if (matAfter !== matBefore - 1) throw new Error(`matériau pas supprimé: ${matBefore} → ${matAfter}`)
console.log('OK: suppression d\'un matériau', matBefore, '→', matAfter)

// ── Clients : heures travaillées et coût M.O. par client ──
await page.goto(base + '/clients')
await page.waitForSelector('text=travaillées', { timeout: 5000 })
console.log('OK: liaison heures/coût M.O. visible sur les fiches clients')

// ── Paie & Heures : roster du module Employés + salaire estimé ──
await page.goto(base + '/paie')
await page.waitForSelector('text=Paie & Heures (CCQ)', { timeout: 5000 })
await page.waitForSelector('text=Salaire estimé', { timeout: 8000 })
// les 22 employés du fichier Excel ont été importés dans le module Employés
await page.waitForSelector('text=Simon Gariépy', { timeout: 8000 })
console.log('OK: paie liée au module Employés (roster importé + colonne salaire)')

// saisir 45h Commercial pour Jean-François Lapointe (65 $/h).
// Selon les formules exactes du classeur Excel : E=40, F=1 (×1,5), G=4 (×2),
// et le surplus de 5h est mis en banque Non-Réglementé (V=5 → Y=-5, Z=35).
// Salaire = (35 + 1,5×1 + 2×4) × 65 = 44,5 × 65 = 2 892,50 $ ≈ 2 893 $.
const jfPaieRow = page.locator('tbody tr', { hasText: 'Jean-François Lapointe' }).first()
await jfPaieRow.locator('input').first().fill('45')
await jfPaieRow.locator('input').first().blur()
await page.waitForTimeout(400)
const paieTxt = (await jfPaieRow.textContent()).replace(/\s/g, '')
if (!paieTxt.includes('2893') && !paieTxt.includes('2892')) throw new Error('salaire estimé incorrect: ' + paieTxt)
console.log('OK: salaire estimé fidèle aux formules Excel (44,5 h équiv. × 65 $ ≈ 2 893 $)')

// ── Résumé de la semaine : masse salariale ──
await page.click('text=Résumé de la semaine')
await page.waitForSelector('text=Masse salariale de la semaine', { timeout: 5000 })
console.log('OK: masse salariale hebdomadaire affichée dans le résumé')

await browser.close()
if (errors.length) {
  console.log('\nERREURS JS:')
  errors.forEach(e => console.log(' -', e))
  process.exit(1)
}
console.log('\n✅ Suppressions et liaisons heures/taux fonctionnelles')
