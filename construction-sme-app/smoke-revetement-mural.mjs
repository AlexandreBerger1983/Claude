// Vérifie la catégorie « Revêtement mural » de l'étape 3 : ses trois articles
// et le fait qu'ils se chiffrent en pieds carrés, avec le sélecteur de base.
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
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client Céramique')
await page.click('text=Salle de bain')
await page.click('text=Continuer')
await page.waitForSelector('text=Quelles pièces sont à rénover ?', { timeout: 5000 })
await page.locator('button:has-text("Salle de bain")').last().click()
await page.waitForSelector('text=Surface de plancher', { timeout: 5000 })
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 5000 })

// La catégorie doit porter le nouveau nom, et l'ancien avoir disparu
await page.waitForSelector('text=Revêtement mural', { timeout: 5000 })
console.log('OK: catégorie « Revêtement mural » présente')
if ((await page.textContent('body')).includes('Carrelage'))
  throw new Error('l’ancien nom « Carrelage » est encore affiché')
console.log('OK: l’ancien nom « Carrelage » a disparu')

// Ouvre la catégorie et vérifie les trois articles.
// L'en-tête de catégorie est lui-même un <button> et sa description contient le
// mot « dosseret » : on cible donc le bouton par son libellé exact, pas par
// sous-chaîne, sinon un clic replierait la catégorie au lieu d'ajouter l'article.
await page.click('text=Revêtement mural')
await page.waitForTimeout(500)
const article = (nom) =>
  page.locator('button').filter({ has: page.locator(`p:text-is("${nom}")`) }).first()

for (const nom of ['Céramique douche', 'Mur en céramique', 'Dosseret']) {
  await article(nom).waitFor({ timeout: 5000 })
  console.log(`OK: article « ${nom} » présent`)
}

// Chacun doit s'ajouter en pieds carrés, avec le sélecteur de base.
// Superficie des murs de la salle de bain de démonstration : 21,96 m² = 236 pi².
const MURS_PI2 = 236.4
const attendu = {
  'Céramique douche': [40, 120],   // alcôve 3 murs, pas la pièce entière
  'Mur en céramique': [200, 300],  // tous les murs, perte à la coupe incluse
  'Dosseret': [5, 45],             // bande au-dessus du comptoir
}

for (const nom of ['Céramique douche', 'Mur en céramique', 'Dosseret']) {
  await article(nom).click()
  await page.waitForTimeout(500)

  const texte = await page.textContent('body')
  if (!texte.includes('/ pi²'))
    throw new Error(`« ${nom} » n’est pas chiffré au pied carré`)

  const qty = num(await page.locator('input[inputmode="decimal"], input[type="number"]').first().inputValue())
  if (!(qty > 0)) throw new Error(`« ${nom} » ajouté avec une quantité nulle`)

  const [min, max] = attendu[nom]
  if (qty < min || qty > max)
    throw new Error(`« ${nom} » : ${qty} pi² hors de la fourchette réaliste ${min}–${max} pi² (murs de la pièce : ${MURS_PI2} pi²)`)
  console.log(`OK: « ${nom} » ajouté — ${qty} pi² (attendu ${min}–${max})`)

  await page.waitForSelector('button:has-text("Toute la pièce")', { timeout: 5000 })

  // Retire l'article pour tester le suivant isolément
  await article(nom).click()
  await page.waitForTimeout(400)
}
console.log('OK: les trois articles offrent le sélecteur de base de mesure')

// Les trois ensemble ne doivent pas compter trois fois les mêmes murs
for (const nom of ['Céramique douche', 'Mur en céramique', 'Dosseret']) {
  await article(nom).click()
  await page.waitForTimeout(300)
}
const quantites = await page.locator('input[inputmode="decimal"], input[type="number"]').evaluateAll(
  els => els.slice(0, 3).map(e => parseFloat(e.value) || 0)
)
const cumul = quantites.reduce((a, b) => a + b, 0)
console.log(`Cumul des trois revêtements : ${cumul.toFixed(1)} pi² pour ${MURS_PI2} pi² de murs`)
if (cumul > MURS_PI2 * 2)
  throw new Error(`les trois revêtements cumulent ${cumul.toFixed(1)} pi², plus du double des murs`)
console.log('OK: le cumul des trois articles reste réaliste')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Catégorie « Revêtement mural » conforme')
await browser.close()
