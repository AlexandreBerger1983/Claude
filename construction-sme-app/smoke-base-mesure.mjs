// Vérifie le sélecteur « Toute la pièce » / « Pieds linéaires » du devis
// rapide : la quantité doit correspondre à la surface ou au périmètre de la
// pièce, dans l'unité choisie, et le total doit suivre.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const num = (s) => parseFloat(String(s).replace(/[^0-9,.-]/g, '').replace(',', '.'))

await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 5000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client Mesure')
await page.click('text=Salle de bain')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Salle de bain")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })

// Surface affichée pour la pièce, en pi²
const surfaceTxt = await page.locator('text=/Surface de plancher/').first().textContent()
const surfacePi2 = num(surfaceTxt.split(':')[1])
console.log('Surface de la pièce :', surfacePi2, 'pi²')

await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })

// Ajoute un travail (chemin éprouvé par les autres tests)
await page.click('text=Peinture')
await page.click('text=Peinture murs — 2 couches (apprêt + finition)')
await page.waitForSelector('text=Travaux choisis', { timeout: 5000 })
console.log('OK: travail ajouté')

// Le sélecteur doit être présent, sur « Toute la pièce » par défaut
await page.waitForSelector('button:has-text("Toute la pièce")', { timeout: 5000 })
await page.waitForSelector('button:has-text("Pieds linéaires")', { timeout: 5000 })
console.log('OK: sélecteur « Toute la pièce » / « Pieds linéaires » affiché')

const ligne = page.locator('text=Travaux choisis').locator('xpath=ancestor::div[1]')
const totalLigne = async () => num(await ligne.locator('p.font-bold').last().textContent())

// ─── Toute la pièce ──────────────────────────────────────────────────────────
await page.click('button:has-text("Toute la pièce")')
await page.waitForTimeout(400)
const qtyPiece = num(await page.locator('input[inputmode="decimal"], input[type="number"]').first().inputValue())
const totalPiece = await totalLigne()
const unitePiece = await page.locator('text=/mat\\. \\+/').first().textContent()
console.log(`Toute la pièce : ${qtyPiece} — ${totalPiece} $ — ${unitePiece.trim().slice(-6)}`)
if (!unitePiece.includes('pi²'))
  throw new Error('l’unité devrait être en pi² : ' + unitePiece)
console.log('OK: quantité exprimée en pi², dans l’unité de la pièce')
if (qtyPiece <= 0) throw new Error('quantité nulle')

// ─── Pieds linéaires ─────────────────────────────────────────────────────────
await page.click('button:has-text("Pieds linéaires")')
await page.waitForTimeout(400)
const qtyLin = num(await page.locator('input[inputmode="decimal"], input[type="number"]').first().inputValue())
const totalLin = await totalLigne()
const uniteLin = await page.locator('text=/mat\\. \\+/').first().textContent()
console.log(`Pieds linéaires : ${qtyLin} — ${totalLin} $`)
if (!uniteLin.includes('pi lin.'))
  throw new Error('l’unité devrait être en pi lin. : ' + uniteLin)
console.log('OK: unité passée en pi lin.')

// Pièce carrée/rectangulaire : le périmètre est bien plus petit que la surface
if (!(qtyLin > 0 && qtyLin < qtyPiece))
  throw new Error(`périmètre ${qtyLin} incohérent avec la surface ${qtyPiece}`)
console.log('OK: le périmètre est bien inférieur à la surface')
if (Math.abs(totalLin - totalPiece) < 1)
  throw new Error('le total n’a pas changé alors que la base a changé')
console.log('OK: le total suit le changement de base')

// ─── Retour à « Toute la pièce » : on retrouve exactement les valeurs ────────
await page.click('button:has-text("Toute la pièce")')
await page.waitForTimeout(400)
const qtyRetour = num(await page.locator('input[inputmode="decimal"], input[type="number"]').first().inputValue())
const totalRetour = await totalLigne()
console.log(`Retour : ${qtyRetour} pi² — ${totalRetour} $`)
if (Math.abs(qtyRetour - qtyPiece) > 0.05 || Math.abs(totalRetour - totalPiece) > 0.05)
  throw new Error('aller-retour entre les bases ne redonne pas les mêmes valeurs')
console.log('OK: aller-retour sans dérive des prix')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Sélecteur de base de mesure fonctionnel')
await browser.close()
