// Vérifie le chargement des données de démonstration dans la base, et le
// ménage après. Sert à préparer une présentation : la base doit se remplir
// pour de vrai, puis se vider complètement.
import { chromium } from 'playwright'

const base = 'http://localhost:4174/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } })
const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.addInitScript(() => {
  const session = {
    access_token: 'faux', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'faux',
    user: { id: '00000000-0000-0000-0000-000000000001', email: 'bureau@exemple.com', aud: 'authenticated' },
  }
  localStorage.setItem('cp-session', JSON.stringify(session))

  const VIDE = { clients: [], projects: [], employees: [], timesheets: [],
                 materials: [], subcontractors: [], documents: [], quotes: [], invoices: [] }
  let tables
  try { tables = JSON.parse(sessionStorage.getItem('__demo')) || VIDE } catch { tables = VIDE }
  const sauver = () => { try { sessionStorage.setItem('__demo', JSON.stringify(tables)) } catch {} }
  window.__base = tables

  const json = (c, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { 'Content-Type': 'application/json' } })
  const vraiFetch = window.fetch.bind(window)
  window.fetch = async (entree, init = {}) => {
    const url = typeof entree === 'string' ? entree : entree?.url ?? ''
    if (!url.includes('exemple-local-test.supabase.co')) return vraiFetch(entree, init)
    if (url.includes('/rest/v1/profiles'))
      return json({ id: session.user.id, nom: 'Bureau', role: 'bureau', employee_id: null })

    const nom = url.match(/\/rest\/v1\/([a-z_]+)/)?.[1]
    if (!nom || !(nom in tables)) return json([])
    const methode = (init.method || 'GET').toUpperCase()

    if (methode === 'GET') return json(tables[nom])
    if (methode === 'POST') {
      const corps = JSON.parse(init.body || '[]')
      for (const l of (Array.isArray(corps) ? corps : [corps])) {
        const i = tables[nom].findIndex(x => x.id === l.id)
        if (i === -1) tables[nom].push(l); else tables[nom][i] = l
      }
      window.__base = tables; sauver(); return json([])
    }
    if (methode === 'DELETE') {
      // La suppression en masse filtre sur id >= 0 ; la suppression d'une
      // ligne précise sur id = eq.<n>. On distingue les deux.
      const precis = url.match(/id=eq\.(\d+)/)
      tables[nom] = precis ? tables[nom].filter(l => l.id !== Number(precis[1])) : []
      window.__base = tables; sauver(); return json([])
    }
    return json([])
  }
})

const total = () => page.evaluate(() =>
  Object.values(window.__base).reduce((s, t) => s + t.length, 0))
const table = (t) => page.evaluate(n => window.__base[n].length, t)

// ─── Base vide : le bouton de démonstration est proposé ──────────────────────
await page.goto(base + '/parametres')
await page.waitForSelector('text=Données de l\'application', { timeout: 10000 })
await page.waitForSelector('button:has-text("Charger des données de démonstration")', { timeout: 8000 })
console.log('OK: base vide — le chargement de démonstration est proposé')
if (await total() !== 0) throw new Error('la base devrait être vide au départ')

// Le bouton de suppression ne doit pas être là quand il n'y a rien à supprimer
if (await page.locator('button:has-text("Vider complètement la base")').count() > 0)
  throw new Error('le bouton de suppression est proposé sur une base vide')
console.log('OK: aucun bouton de suppression sur une base vide')

// ─── Charger la démonstration ────────────────────────────────────────────────
await page.click('button:has-text("Charger des données de démonstration")')
await page.waitForSelector('text=Données de démonstration chargées', { timeout: 20000 })
const apres = await total()
console.log('Enregistrements écrits dans la base :', apres)
if (apres < 40) throw new Error(`trop peu d'enregistrements écrits : ${apres}`)

for (const [t, attendu] of [['clients', 6], ['projects', 5], ['quotes', 5], ['invoices', 6],
                            ['employees', 7], ['timesheets', 7], ['materials', 10],
                            ['subcontractors', 5], ['documents', 8]]) {
  const n = await table(t)
  if (n !== attendu) throw new Error(`${t} : ${n} enregistrements au lieu de ${attendu}`)
}
console.log('OK: les neuf collections sont remplies avec le bon nombre d’enregistrements')

// La colonne sortie du jsonb doit être remplie, pas seulement le jsonb
const premierClient = await page.evaluate(() => window.__base.clients[0])
if (!premierClient.nom) throw new Error('la colonne « nom » n’est pas remplie')
if (!premierClient.donnees?.name) throw new Error('le jsonb n’est pas rempli')
console.log(`OK: colonnes et jsonb remplis — premier client « ${premierClient.nom} »`)

// ─── Les écrans montrent bien ces données ────────────────────────────────────
await page.goto(base + '/clients')
await page.waitForSelector('text=Immobilier Trépanier', { timeout: 10000 })
console.log('OK: les clients de démonstration s’affichent')
await page.goto(base + '/projets')
await page.waitForSelector('text=Rénovation commerciale', { timeout: 10000 })
console.log('OK: les projets de démonstration s’affichent')

// ─── Recharger n'ajoute pas de doublons ──────────────────────────────────────
await page.goto(base + '/parametres')
await page.waitForSelector('button:has-text("Vider complètement la base")', { timeout: 10000 })
console.log('OK: base remplie — le bouton de suppression remplace celui de chargement')
if (await page.locator('button:has-text("Charger des données de démonstration")').count() > 0)
  throw new Error('le chargement est encore proposé alors que la base contient des données')
console.log('OK: le chargement n’est plus proposé — pas de mélange avec de vraies données')

// ─── Vider la base : le mot de confirmation doit être exact ──────────────────
page.once('dialog', d => d.accept('nimportequoi'))
await page.click('button:has-text("Vider complètement la base")')
await page.waitForTimeout(800)
if (await total() === 0) throw new Error('la base a été vidée malgré un mot de confirmation erroné')
console.log('OK: un mot de confirmation erroné n’efface rien')

page.once('dialog', d => d.accept('EFFACER'))
await page.click('button:has-text("Vider complètement la base")')
await page.waitForSelector('text=La base est vide', { timeout: 20000 })
if (await total() !== 0) throw new Error(`la base contient encore ${await total()} enregistrements`)
console.log('OK: « EFFACER » vide complètement la base')

await page.goto(base + '/clients')
await page.waitForTimeout(1200)
if (/Immobilier Trépanier/.test(await page.textContent('body')))
  throw new Error('des clients de démonstration s’affichent encore')
console.log('OK: les écrans sont vides après le ménage')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Données de démonstration : chargement et ménage fonctionnels')
await browser.close()
