// Vérifie que la partie « Soumission » reproduit les gabarits Excel :
// résumé par corps de métier, Admin et Profit 20 %, contrôle BON/ERREUR,
// et liste « Inclus / Non-applicable » de tous les travaux possibles.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

// Parcours jusqu'au questionnaire d'une salle de bain
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 5000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client Excel')
await page.click('text=Salle de bain')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Salle de bain")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })

// Ouvre le questionnaire détaillé de la pièce
await page.click('button:has-text("Questionnaire")')
await page.waitForSelector('text=Questionnaire — Salle de bain', { timeout: 5000 })
console.log('OK: questionnaire dédié « Salle de bain » ouvert')

// Répond « Oui » à quelques travaux de corps de métier différents
const ouiButtons = page.locator('button:has-text("Oui")')
const n = await ouiButtons.count()
if (n < 5) throw new Error(`trop peu de questions : ${n}`)
for (const i of [0, 1, 2, 3, 4]) await ouiButtons.nth(i).click()
console.log('OK: 5 travaux marqués « Oui »')

await page.click('button:has-text("Ajouter")')
await page.waitForTimeout(600)
await page.click('text=Continuer')
await page.waitForSelector('text=Prix total du devis, taxes incluses', { timeout: 5000 })

// ─── Bloc « Estimé des coûts » (feuille Calcul des coûts) ───────────────────
await page.waitForSelector('text=Estimé des coûts', { timeout: 5000 })
console.log('OK: bloc « Estimé des coûts » affiché')
const body = await page.textContent('body')
for (const needle of ['Total avant profit', 'Admin et profit (20 %)', 'Total avec profit', 'Vérification de la formule']) {
  if (!body.includes(needle)) throw new Error(`« ${needle} » absent du résumé`)
  console.log(`OK: ${needle}`)
}
if (!body.includes('BON')) throw new Error('contrôle de cohérence absent ou en ERREUR')
console.log('OK: contrôle de cohérence = BON')

// Vérifie l'arithmétique : total avec profit = total avant profit × 1,20
const parseMoney = (s) => parseFloat(s.replace(/[^0-9,]/g, '').replace(',', '.'))
const cells = await page.locator('table tfoot td').allTextContents()
const avant = parseMoney(cells[1])
const profit = parseMoney(cells[3])
const avec = parseMoney(cells[5])
console.log(`Avant profit ${avant} $ · Admin et profit ${profit} $ · Avec profit ${avec} $`)
if (Math.abs(profit - avant * 0.2) > 1.5) throw new Error(`Admin et profit ≠ 20 % (${profit} vs ${avant * 0.2})`)
console.log('OK: Admin et profit = 20 % du total avant profit')
if (Math.abs(avec - (avant + profit)) > 1.5) throw new Error('total avec profit incohérent')
console.log('OK: total avec profit = avant profit + admin et profit')

// ─── Liste « Inclus / Non-applicable » (feuille Formulaire soumission) ──────
if (!body.includes('Non-applicable')) throw new Error('liste Inclus/Non-applicable absente')
console.log('OK: travaux non retenus marqués « Non-applicable »')
if (!body.includes('Inclus')) throw new Error('aucun travail marqué « Inclus »')
console.log('OK: travaux retenus marqués « Inclus »')
if (!body.includes('Le client doit fournir la céramique') && !body.includes('client fournit la céramique'))
  throw new Error('note sur la céramique absente')
console.log('OK: note sur la céramique présente')


// ─── Cohérence : l'en-tête doit annoncer la MÊME marge que le résumé ────────
const entete = await page.locator('text=/Travaux .* admin et profit .* taxes/').first().textContent()
console.log('En-tête :', entete.trim())
const nums = entete.match(/([\d\s\u202f,]+)\s*\$/g).map(x => parseFloat(x.replace(/[^0-9,]/g,'').replace(',', '.')))
if (Math.abs(nums[1] - profit) > 1.5)
  throw new Error(`marge de l'en-tête (${nums[1]}) ≠ marge du résumé (${profit})`)
console.log('OK: en-tête et résumé annoncent la même marge')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ La partie Soumission reproduit les gabarits Excel')
await browser.close()
