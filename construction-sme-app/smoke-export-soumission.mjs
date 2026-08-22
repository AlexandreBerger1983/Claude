// Exporte une soumission ENREGISTRÉE (onglet Soumissions) en Excel et en Word,
// et vérifie que le total du fichier est exactement celui affiché à l'écran —
// la marge des gabarits ne doit pas être appliquée une seconde fois sur des
// lignes qui la contiennent déjà.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const OUT = '/tmp/export-soum'
mkdirSync(OUT, { recursive: true })

const errors = []
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } })
const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(base + '/soumissions/1')
await page.waitForSelector('text=SOUMISSION', { timeout: 5000 })
console.log('OK: fiche soumission ouverte')

// Total affiché à l'écran (ligne TOTAL du document)
const parseMoney = (s) => parseFloat(s.replace(/[^0-9,]/g, '').replace(',', '.'))
const sousTotalTxt = await page.evaluate(() => {
  for (const d of document.querySelectorAll('#devis div')) {
    const sp = d.querySelectorAll(':scope > span')
    if (sp.length === 2 && sp[0].textContent.trim() === 'Sous-total') return sp[1].textContent
  }
  return null
})
if (!sousTotalTxt) throw new Error('ligne « Sous-total » introuvable')
const totalAffiche = parseMoney(sousTotalTxt)
console.log('Sous-total affiché :', totalAffiche, '$')

for (const [kind, label, file] of [
  ['excel', 'Excel', 'soumission.xlsx'],
  ['word', 'Word', 'soumission.docx'],
]) {
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click(`button:has-text("${label}")`),
  ])
  await dl.saveAs(`${OUT}/${file}`)
  console.log(`OK: ${kind} téléchargé → ${dl.suggestedFilename()}`)
}

const body = await page.textContent('body')
if (body.includes("L'export n'a pas fonctionné")) throw new Error("message d'erreur d'export affiché")
console.log("OK: aucun message d'erreur")

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
await browser.close()

// Le total du fichier doit égaler celui de l'écran : marge non recomptée
execFileSync('python3', ['verif-export.py', `${OUT}/soumission.xlsx`, String(totalAffiche)],
  { stdio: 'inherit' })

console.log('✅ Export d\'une soumission enregistrée conforme, sans double marge')
