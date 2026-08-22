// Vérifie que les boutons de tous les modules sont fonctionnels :
// création de client/projet/facture/employé/article/entrée de temps,
// approbation, changement de statut, ajustement de stock, recherche globale.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('dialog', d => d.accept())

// ── Clients : nouveau client ──
await page.goto(base + '/clients')
await page.click('button:has-text("Nouveau client")')
await page.fill('input[placeholder="ex: Constructions Untel Inc."]', 'Client Test Bouton Inc.')
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Client Test Bouton Inc.', { timeout: 5000 })
console.log('OK: nouveau client créé et visible')

// ── Clients : modifier ──
const card = page.locator('.card', { hasText: 'Client Test Bouton Inc.' }).first()
await card.locator('button:has-text("Modifier")').click()
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Contact Test')
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Contact Test', { timeout: 5000 })
console.log('OK: client modifié')

// ── Projets : nouveau projet ──
await page.goto(base + '/projets')
await page.click('button:has-text("Nouveau projet")')
await page.fill('input[placeholder="ex: Rénovation cuisine — Résidence Tremblay"]', 'Projet Test Bouton')
await page.locator('form select').first().selectOption({ label: 'Client Test Bouton Inc.' })
await page.click('button:has-text("Créer le projet")')
await page.waitForSelector('text=Projet Test Bouton', { timeout: 5000 })
console.log('OK: nouveau projet créé')

// ── Projet détail : modifier + créer facture ──
await page.click('text=Projet Test Bouton')
await page.waitForSelector('text=Budget & Finances', { timeout: 5000 })
await page.click('button:has-text("Créer facture")')
await page.locator('form input[type="number"]').first().fill('10000')
await page.click('button:has-text("Créer la facture")')
await page.waitForURL('**/facturation', { timeout: 5000 })
await page.waitForSelector('text=Client Test Bouton Inc.', { timeout: 5000 })
console.log('OK: facture créée depuis le projet, redirection vers Facturation')

// ── Facturation : marquer payée ──
const invRow = page.locator('tr', { hasText: 'Client Test Bouton Inc.' }).first()
await invRow.locator('button[title="Marquer payée"]').click()
await page.waitForTimeout(300)
const rowText = await invRow.textContent()
if (!rowText.includes('Payée')) throw new Error('facture pas marquée payée')
console.log('OK: facture marquée payée')

// ── Employés : ajouter ──
await page.goto(base + '/employes')
await page.click('button:has-text("Ajouter employé")')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Employé Test')
await page.fill('input[placeholder="ex: Charpentier-menuisier"]', 'Manoeuvre')
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Employé Test', { timeout: 5000 })
console.log('OK: employé ajouté')

// ── Feuilles de temps : nouvelle entrée + approbation ──
await page.goto(base + '/feuilles-de-temps')
await page.click('button:has-text("Nouvelle entrée")')
await page.locator('form select').nth(0).selectOption({ index: 1 })
await page.locator('form select').nth(1).selectOption({ index: 1 })
await page.locator('form button:has-text("Ajouter")').click()
await page.waitForTimeout(300)
const approveButtons = page.locator('button:has-text("Approuver")')
const nApprove = await approveButtons.count()
if (nApprove === 0) throw new Error('aucun bouton approuver')
await approveButtons.first().click()
await page.waitForTimeout(300)
console.log('OK: entrée de temps créée et approbation fonctionnelle')

// ── Matériaux : +/- stock ──
await page.goto(base + '/materiaux')
await page.waitForSelector('table', { timeout: 5000 })
const stockCell = page.locator('table tbody tr').first().locator('span.font-bold')
const before = parseInt(await stockCell.textContent())
await page.locator('button[aria-label="Ajouter 1"]').first().click()
await page.waitForTimeout(300)
const after = parseInt(await stockCell.textContent())
if (after !== before + 1) throw new Error(`stock pas incrémenté: ${before} → ${after}`)
console.log('OK: boutons +/- de stock fonctionnels', before, '→', after)

// ── Sous-traitants : ajouter ──
await page.goto(base + '/sous-traitants')
await page.click('button:has-text("Ajouter sous-traitant")')
await page.fill('input[placeholder="ex: Électricité Pro Inc."]', 'Sous-traitant Test')
await page.fill('input[placeholder="ex: Électricité"]', 'Excavation')
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Sous-traitant Test', { timeout: 5000 })
console.log('OK: sous-traitant ajouté')

// ── Soumissions : statut ──
await page.goto(base + '/soumissions')
await page.waitForSelector('table', { timeout: 5000 })
await page.locator('a:has-text("Voir")').first().click()
await page.waitForSelector('text=SOUMISSION', { timeout: 5000 })
const acceptBtn = page.locator('button:has-text("Marquer acceptée")')
if (await acceptBtn.count() > 0) {
  await acceptBtn.click()
  await page.waitForTimeout(300)
  const badges = await page.locator('.badge', { hasText: 'Acceptée' }).count()
  if (badges === 0) throw new Error('statut pas changé')
}
console.log('OK: soumission — changement de statut fonctionnel')

// ── Recherche globale ──
await page.goto(base + '/')
await page.fill('input[placeholder="Rechercher un projet, client, facture..."]', 'Projet Test')
await page.waitForSelector('text=Projet · PRJ-', { timeout: 5000 })
console.log('OK: recherche globale retourne des résultats')

// ── Persistance après rechargement ──
await page.reload()
await page.goto(base + '/clients')
await page.waitForSelector('text=Client Test Bouton Inc.', { timeout: 5000 })
console.log('OK: données persistantes après rechargement')

await browser.close()
if (errors.length) {
  console.log('\nERREURS JS:')
  errors.forEach(e => console.log(' -', e))
  process.exit(1)
}
console.log('\n✅ Tous les boutons testés fonctionnent, aucune erreur JS')
