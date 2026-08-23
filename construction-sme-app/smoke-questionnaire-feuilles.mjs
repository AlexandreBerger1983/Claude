// Vérifie dans le navigateur les modifications demandées sur les feuilles
// manuscrites : choix « Toute la pièce » / « En partie » dans tous les onglets,
// onglets Plafond / Plancher / Peinture, types de gypse, formats de céramique,
// membranes, planchers flottant / ingénieur / tapis / béton poli, peinture en
// pieds linéaires et ajouts de ventilation.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const num = (s) => parseFloat(String(s).replace(/[^0-9,.-]/g, '').replace(',', '.'))

// Parcours jusqu'au questionnaire d'une salle de bain
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 5000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client Feuilles')
await page.click('text=Salle de bain')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Salle de bain")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })

await page.click('text=Questionnaire détaillé')
await page.waitForSelector('text=Questionnaire —', { timeout: 5000 })
console.log('OK: questionnaire ouvert')

// ─── Les onglets demandés sont là ────────────────────────────────────────────
const onglets = await page.locator('button span.uppercase').allTextContents()
console.log('Onglets :', onglets.join(' · '))
for (const t of ['PLAFOND', 'PLANCHER', 'PEINTURE', 'OSSATURE & STRUCTURE', 'VENTILATION']) {
  if (!onglets.map(o => o.toUpperCase()).includes(t))
    throw new Error(`onglet « ${t} » absent`)
  console.log(`OK: onglet « ${t} » présent`)
}

const ouvrirOnglet = async (titre) => {
  await page.locator('button', { has: page.locator(`span:text-is("${titre}")`) }).first().click()
  await page.waitForTimeout(350)
}
// Le premier onglet est ouvert d'office : on le referme pour isoler les tests
await ouvrirOnglet('Travaux généraux')

// Une question est un <div> contenant un <p> de libellé et, quand la réponse
// est « Oui », le bloc de champs : on remonte du libellé à ce div (parent du
// parent), sinon on n'attrape que la rangée du libellé, sans les champs.
const question = (libelle) => page.locator(`p:text-is("${libelle}")`).first().locator('xpath=../..')

const repondreOui = async (libelle) => {
  const ligne = question(libelle)
  await ligne.locator('button:text-is("Oui")').first().click()
  await page.waitForTimeout(350)
  return ligne
}

// ─── Ossature & Structure : cloison en pi. lin. et types de gypse ────────────
await ouvrirOnglet('Ossature & Structure')
const gypse = await repondreOui('Fournir et installer du nouveau gypse aux endroits touchés')
const optionsGypse = await gypse.locator('select').first().locator('option').allTextContents()
console.log('Gypse :', optionsGypse.join(' / '))
for (const attendu of ['1/2" régulier', '1/2" parfait 1 côté', '1/2" parfait 2 côtés', 'Parfait Novotech']) {
  if (!optionsGypse.includes(attendu)) throw new Error(`type de gypse manquant : ${attendu}`)
}
console.log('OK: gypse 1/2", parfait 1 côté, 2 côtés et Novotech proposés')

// Le champ de superficie doit offrir le choix, sur « Toute la pièce » au départ
const boutonPiece = gypse.locator('button:text-is("Toute la pièce")').first()
const boutonPartie = gypse.locator('button:text-is("En partie")').first()
await boutonPiece.waitFor({ timeout: 5000 })
const champGypse = gypse.locator('input[type="number"]').first()
const qtyPiece = num(await champGypse.inputValue())
if (!(qtyPiece > 0)) throw new Error('la superficie « toute la pièce » est nulle')
if (await champGypse.isEditable()) throw new Error('le champ devrait être verrouillé en mode « toute la pièce »')
console.log(`OK: gypse — toute la pièce = ${qtyPiece} pc, champ verrouillé`)

// En partie : le champ devient modifiable
await boutonPartie.click()
await page.waitForTimeout(300)
if (!(await champGypse.isEditable())) throw new Error('le champ devrait être modifiable en mode « en partie »')
await champGypse.fill('120')
await page.waitForTimeout(300)
console.log('OK: « En partie » déverrouille la saisie du nombre de pi²')

// Le prix suit la superficie saisie
const prixDe = async (ligne) => num(await ligne.locator('p.text-emerald-700').first().textContent())
const prix120 = await prixDe(gypse)
await boutonPiece.click()
await page.waitForTimeout(300)
const prixPiece = await prixDe(gypse)
console.log(`Prix : ${prix120} $ pour 120 pc · ${prixPiece} $ pour toute la pièce (${qtyPiece} pc)`)
if (Math.abs(prix120 - prixPiece) < 1)
  throw new Error('le prix ne suit pas le changement de base de mesure')
console.log('OK: le prix suit le choix toute la pièce / en partie')

// Cloison intérieure mesurée en pieds linéaires
const cloison = await repondreOui('Faire une nouvelle cloison en bois (ossature et structure)')
const uniteCloison = await cloison.locator('span.w-9').first().textContent()
if (uniteCloison.trim() !== 'pl') throw new Error('la cloison devrait se mesurer en pi. lin. : ' + uniteCloison)
await cloison.locator('button:text-is("Toute la pièce")').first().waitFor({ timeout: 5000 })
console.log('OK: cloison mesurée en pieds linéaires, avec le choix de base')
await ouvrirOnglet('Ossature & Structure')

// ─── Plafond ─────────────────────────────────────────────────────────────────
await ouvrirOnglet('Plafond')
const plafond = await repondreOui('Plafond — finition')
const finitions = await plafond.locator('select').first().locator('option').allTextContents()
console.log('Plafond :', finitions.join(' / '))
if (finitions.length < 4) throw new Error('moins de 4 finitions de plafond')
await plafond.locator('button:text-is("Toute la pièce")').first().waitFor({ timeout: 5000 })
const pcPlafond = num(await plafond.locator('input[type="number"]').first().inputValue())
console.log(`OK: plafond — ${finitions.length} finitions, toute la pièce = ${pcPlafond} pc`)
await page.locator('p:text-is("Plafond — 2e proposition à présenter au client")').first().waitFor({ timeout: 5000 })
console.log('OK: 2e proposition de plafond disponible')
await ouvrirOnglet('Plafond')

// ─── Plancher ────────────────────────────────────────────────────────────────
await ouvrirOnglet('Plancher')
for (const libelle of [
  'Plancher — céramique', 'Plancher — membrane sous la céramique', 'Plancher — flottant',
  'Plancher — ingénieur', 'Plancher — tapis mur à mur', 'Plancher — béton poli',
  'Préparation du sous-plancher (auto-nivelant)',
]) {
  await page.locator(`p:text-is("${libelle}")`).first().waitFor({ timeout: 5000 })
  console.log(`OK: « ${libelle} » présent`)
}

const ceram = await repondreOui('Plancher — céramique')
const formats = await ceram.locator('select').nth(0).locator('option').allTextContents()
const poses = await ceram.locator('select').nth(1).locator('option').allTextContents()
console.log('Formats :', formats.join(' / '), '· Poses :', poses.join(' / '))
for (const f of ['24x24', '24x48']) if (!formats.includes(f)) throw new Error(`format ${f} absent`)
if (!poses.includes('Sur fret')) throw new Error('pose « Sur fret » absente')
console.log('OK: formats 24x24 / 24x48 et pose « Sur fret »')

// Le grand format coûte plus cher
const prix2424 = await prixDe(ceram)
await ceram.locator('select').nth(0).selectOption('24x48')
await page.waitForTimeout(350)
const prix2448 = await prixDe(ceram)
console.log(`24x24 : ${prix2424} $ · 24x48 : ${prix2448} $`)
if (!(prix2448 > prix2424)) throw new Error('le grand format devrait coûter plus cher à poser')
console.log('OK: supplément de pose au grand format')

const membrane = await repondreOui('Plancher — membrane sous la céramique')
const membranes = await membrane.locator('select').first().locator('option').allTextContents()
console.log('Membranes :', membranes.join(' / '))
for (const m of ['Ditra-Heat', 'nécessaire', 'Aucune'])
  if (!membranes.some(o => o.includes(m))) throw new Error(`membrane « ${m} » absente`)
console.log('OK: Ditra-Heat, membrane nécessaire et Aucune')

const flottant = await repondreOui('Plancher — flottant')
const typesFlottant = await flottant.locator('select').first().locator('option').allTextContents()
for (const t of ['Vinyle clic', 'Bois franc 3/4"'])
  if (!typesFlottant.includes(t)) throw new Error(`plancher flottant « ${t} » absent`)
console.log('OK: vinyle clic et bois franc 3/4"')

const ingenieur = await repondreOui('Plancher — ingénieur')
const posesIng = await ingenieur.locator('select').first().locator('option').allTextContents()
for (const p of ['Double encollage', 'Collé', 'Cloué'])
  if (!posesIng.includes(p)) throw new Error(`plancher ingénieur « ${p} » absent`)
console.log('OK: double encollage, collé et cloué')
await ouvrirOnglet('Plancher')

// ─── Peinture ────────────────────────────────────────────────────────────────
await ouvrirOnglet('Peinture')
for (const libelle of [
  'Peinture — murs (2 couches, peinture incluse)',
  'Peinture — plafond (2 couches, peinture incluse)',
  'Peinture — boiseries et portes',
]) {
  await page.locator(`p:text-is("${libelle}")`).first().waitFor({ timeout: 5000 })
  console.log(`OK: « ${libelle} » présent`)
}
const pMurs = await repondreOui('Peinture — murs (2 couches, peinture incluse)')
const uniteMurs = await pMurs.locator('span.w-9').first().textContent()
if (uniteMurs.trim() !== 'pl')
  throw new Error('la peinture des murs en partie se mesure en pi. lin. : ' + uniteMurs)
await pMurs.locator('button:text-is("En partie")').first().click()
await page.waitForTimeout(300)
const champMurs = pMurs.locator('input[type="number"]').first()
await champMurs.fill('10')
await page.waitForTimeout(350)
const prix10pl = await prixDe(pMurs)
await champMurs.fill('20')
await page.waitForTimeout(350)
const prix20pl = await prixDe(pMurs)
console.log(`Peinture murs : ${prix10pl} $ pour 10 pi. lin. · ${prix20pl} $ pour 20 pi. lin.`)
if (Math.abs(prix20pl - 2 * prix10pl) > 1)
  throw new Error('le prix de peinture ne double pas quand la longueur double')
console.log('OK: peinture des murs proportionnelle aux pieds linéaires')
await ouvrirOnglet('Peinture')

// ─── Ventilation ─────────────────────────────────────────────────────────────
await ouvrirOnglet('Ventilation')
for (const libelle of ['Ajout d’un ventilateur', 'Déplacer ou repositionner une trappe de ventilation']) {
  await page.locator(`p:text-is("${libelle}")`).first().waitFor({ timeout: 5000 })
  console.log(`OK: « ${libelle} » présent`)
}

// ─── Le devis se construit bien à partir de ces réponses ─────────────────────
const totalTxt = await page.locator('p.text-xl.font-extrabold').first().textContent()
const total = num(totalTxt)
console.log('Total du questionnaire :', total, '$')
if (!(total > 0)) throw new Error('le questionnaire ne calcule aucun montant')
await page.click('text=Ajouter au devis')
await page.waitForTimeout(700)
await page.waitForSelector('text=Travaux choisis', { timeout: 5000 })
const corps = await page.textContent('body')
for (const attendu of ['Nouveau gypse aux endroits touchés', 'Plancher flottant', 'Peinture des murs']) {
  if (!corps.includes(attendu)) throw new Error(`ligne « ${attendu} » absente du devis`)
  console.log(`OK: ligne « ${attendu} » ajoutée au devis`)
}

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Questionnaire conforme aux feuilles manuscrites')
await browser.close()
