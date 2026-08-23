// Vérifie l'onglet « Prix du devis rapide » des Paramètres : un prix modifié
// là doit se retrouver dans le prochain devis, être annulable article par
// article, et faire partie de la sauvegarde.
import { chromium } from 'playwright'
import { readFileSync, rmSync, existsSync } from 'node:fs'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const dossier = '/tmp/claude-0/-home-user-Claude/9fa53caa-9b0c-53ae-97c0-7e552c4e54eb/scratchpad/prix'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 1000 } })
const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const num = (s) => parseFloat(String(s).replace(/[^0-9,.-]/g, '').replace(',', '.'))

// ─── L'onglet existe et liste le catalogue ───────────────────────────────────
await page.goto(base + '/parametres')
await page.waitForSelector('text=Prix du devis rapide', { timeout: 5000 })
await page.click('button:has-text("Prix du devis rapide")')
await page.waitForSelector('text=À quoi servent ces prix ?', { timeout: 5000 })
console.log('OK: onglet « Prix du devis rapide » ouvert')

await page.waitForSelector('text=Tous les prix sont aux valeurs par défaut', { timeout: 5000 })
console.log('OK: au départ, tous les prix sont aux valeurs par défaut')

// La recherche isole un article
await page.fill('input[placeholder="Rechercher un travail…"]', 'Peinture murs')
await page.waitForTimeout(400)
// La rangée d'un article est le div qui contient à la fois son libellé, ses
// deux champs de prix et le bouton de retour au prix livré : on y remonte
// depuis le libellé, sinon on n'attrape que le bloc de texte, sans les champs.
const rangee = (libelle) =>
  page.locator(`p:text-is("${libelle}")`).first().locator('xpath=../../..')
const LIBELLE = 'Peinture murs — 2 couches (apprêt + finition)'
const ligne = rangee(LIBELLE)
await ligne.waitFor({ timeout: 5000 })
console.log('OK: la recherche retrouve « Peinture murs »')

const champMat = ligne.locator('input[type="number"]').nth(0)
const champMo = ligne.locator('input[type="number"]').nth(1)
const matOrigine = num(await champMat.inputValue())
const moOrigine = num(await champMo.inputValue())
console.log(`Prix livré : ${matOrigine} $ mat. + ${moOrigine} $ M.O. le m²`)

// ─── Modifier un prix ────────────────────────────────────────────────────────
await champMo.fill('20')
await page.waitForTimeout(500)
await page.waitForSelector('text=/[0-9]+ prix personnalisé/', { timeout: 5000 })
console.log('OK: le compteur signale un prix personnalisé')
await ligne.locator(`text=/défaut .*${moOrigine}/`).first().waitFor({ timeout: 5000 })
console.log('OK: le bouton de retour au prix livré est proposé')

// ─── Le devis rapide utilise le nouveau prix ─────────────────────────────────
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 5000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client Prix')
await page.click('text=Peinture')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Chambre")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })

await page.click('text=Peinture')
await page.click('text=Peinture murs — 2 couches (apprêt + finition)')
await page.waitForSelector('text=Travaux choisis', { timeout: 5000 })

const champQty = page.locator('input[inputmode="decimal"], input[type="number"]').first()
const qty = num(await champQty.inputValue())
const totalLigne = num(await page.locator('text=Travaux choisis').locator('xpath=ancestor::div[1]').locator('p.font-bold').last().textContent())
console.log(`Devis : ${qty} pi² — ${totalLigne} $`)

// Les prix sont au m² : 1 m² = 10,7639 pi². Le total doit valoir
// (qté en m²) × (mat. + M.O. personnalisée) = (qty / 10,7639) × (3,50 + 20)
const attendu = (qty / 10.7639) * (matOrigine + 20)
console.log(`Attendu avec la M.O. à 20 $/m² : ${attendu.toFixed(2)} $`)
if (Math.abs(totalLigne - attendu) > 2)
  throw new Error(`le devis n'utilise pas le prix personnalisé : ${totalLigne} $ au lieu de ${attendu.toFixed(2)} $`)
console.log('OK: le devis rapide utilise le prix personnalisé')

// Avec le prix d'origine le total aurait été nettement plus bas
const attenduOrigine = (qty / 10.7639) * (matOrigine + moOrigine)
if (Math.abs(totalLigne - attenduOrigine) < 5)
  throw new Error('le devis semble encore utiliser le prix livré')
console.log(`OK: le prix livré aurait donné ${attenduOrigine.toFixed(2)} $ — le changement est bien pris en compte`)

// ─── La sauvegarde emporte les prix personnalisés ────────────────────────────
if (existsSync(dossier)) rmSync(dossier, { recursive: true, force: true })
await page.goto(base + '/parametres')
await page.waitForSelector('text=Sauvegarde de vos données', { timeout: 5000 })
const [fichier] = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  page.click('button:has-text("Sauvegarder mes données")'),
])
const chemin = `${dossier}/${fichier.suggestedFilename()}`
await fichier.saveAs(chemin)
const sauvegarde = JSON.parse(readFileSync(chemin, 'utf8'))
if (!sauvegarde.donnees['cp-catalogue-prix'])
  throw new Error('les prix personnalisés sont absents de la sauvegarde')
const prixSauvegardes = JSON.parse(sauvegarde.donnees['cp-catalogue-prix'])
console.log('Sauvegarde :', JSON.stringify(prixSauvegardes))
if (prixSauvegardes['peinture-murs']?.unitLabor !== 20)
  throw new Error('le prix personnalisé n’est pas celui attendu dans la sauvegarde')
console.log('OK: les prix personnalisés sont bien dans le fichier de sauvegarde')

// ─── Retour au prix livré ────────────────────────────────────────────────────
await page.click('button:has-text("Prix du devis rapide")')
await page.waitForSelector('text=À quoi servent ces prix ?', { timeout: 5000 })
await page.fill('input[placeholder="Rechercher un travail…"]', 'Peinture murs')
await page.waitForTimeout(400)
const ligne2 = rangee(LIBELLE)
await ligne2.locator(`text=/défaut .*${moOrigine}/`).first().click()
await page.waitForTimeout(500)
const moRetour = num(await ligne2.locator('input[type="number"]').nth(1).inputValue())
if (Math.abs(moRetour - moOrigine) > 0.01)
  throw new Error(`le retour au prix livré a donné ${moRetour} au lieu de ${moOrigine}`)
await page.waitForSelector('text=Tous les prix sont aux valeurs par défaut', { timeout: 5000 })
console.log('OK: retour au prix livré article par article')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Prix du devis rapide modifiables depuis les Paramètres')
await browser.close()
