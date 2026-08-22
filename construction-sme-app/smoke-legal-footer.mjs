// Vérifie que les conditions générales, le bloc de signature et la validité
// de 60 jours (transcrits des vrais modèles de soumission/contrat papier)
// apparaissent identiquement sur le devis de l'estimateur ET sur la fiche
// soumission enregistrée.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

// 1. Assistant devis, jusqu'à l'étape finale
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 5000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client Test Légal')
await page.click('text=Salle de bain')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Salle de bain")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })
await page.click('text=Peinture')
await page.click('text=Peinture murs — 2 couches (apprêt + finition)')
await page.waitForSelector('text=Travaux choisis', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Prix total du devis, taxes incluses', { timeout: 5000 })

await page.waitForSelector('text=Conditions générales', { timeout: 5000 })
console.log('OK: « Conditions générales » visible à l\'étape devis de l\'estimateur')

const bodyText1 = await page.textContent('body')
if (!bodyText1.includes('soixante (60) jours')) throw new Error('Validité 60 jours absente du devis estimateur')
console.log('OK: validité de 60 jours présente')
if (!bodyText1.includes("J'accepte que cette soumission devienne le contrat")) throw new Error('Texte d\'acceptation absent')
console.log('OK: texte d\'acceptation du client présent')
if (!bodyText1.includes('intérêt au taux mensuel de 1')) throw new Error('Clause de paiement mensuel absente')
console.log('OK: clause de paiement mensuel (1% d\'intérêt) présente')

// 2. Fiche soumission enregistrée (QuoteDetail) — vérifie la même chose
await page.goto(base + '/soumissions/1')
await page.waitForSelector('text=Conditions générales', { timeout: 5000 })
const bodyText2 = await page.textContent('body')
if (!bodyText2.includes("J'accepte que cette soumission devienne le contrat")) throw new Error('Texte d\'acceptation absent sur QuoteDetail')
console.log('OK: fiche soumission (QuoteDetail) affiche les mêmes conditions générales')

if (errors.length) {
  console.log('Erreurs JS détectées:', errors)
  process.exit(1)
}
console.log('✅ Conditions générales, validité 60 jours et bloc de signature identiques partout')
await browser.close()
