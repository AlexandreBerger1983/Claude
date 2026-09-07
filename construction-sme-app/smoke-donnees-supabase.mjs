// Vérifie que l'application lit et écrit ses données dans la base plutôt que
// dans le navigateur. Le vrai Supabase n'étant pas joignable depuis l'atelier,
// on le remplace par une petite base en mémoire dans la page : les requêtes
// REST sont interceptées et servies par elle. Ce qui est écrit doit donc
// ressortir de cette base, et pas du stockage local.
import { chromium } from 'playwright'

const base = 'http://localhost:4174/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
const page = await ctx.newPage()
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

// Fausse base Supabase, vivant dans la page : tables jsonb, lecture, upsert,
// suppression. `window.__base` permet au test d'inspecter son contenu réel.
await page.addInitScript(() => {
  const session = {
    access_token: 'faux-jeton', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'faux',
    user: { id: '00000000-0000-0000-0000-000000000001', email: 'bureau@exemple.com', aud: 'authenticated' },
  }
  localStorage.setItem('cp-session', JSON.stringify(session))

  // La fausse base doit survivre à un rechargement de page, sinon on ne peut
  // pas vérifier que la donnée revient bien de la base et non de l'écran.
  const VIDE = { clients: [], projects: [], employees: [], timesheets: [],
                 materials: [], subcontractors: [], documents: [], quotes: [], invoices: [] }
  let tables
  try { tables = JSON.parse(sessionStorage.getItem('__faussebase')) || VIDE } catch { tables = VIDE }
  const sauver = () => { try { sessionStorage.setItem('__faussebase', JSON.stringify(tables)) } catch {} }
  window.__base = tables

  const json = (corps, status = 200) =>
    new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } })

  const vraiFetch = window.fetch.bind(window)
  window.fetch = async (entree, init = {}) => {
    const url = typeof entree === 'string' ? entree : entree?.url ?? ''
    if (!url.includes('exemple-local-test.supabase.co')) return vraiFetch(entree, init)

    if (url.includes('/rest/v1/profiles')) {
      return json({ id: session.user.id, nom: 'Bureau', role: 'bureau', employee_id: null })
    }

    const m = url.match(/\/rest\/v1\/([a-z_]+)/)
    const nom = m?.[1]
    if (!nom || !(nom in tables)) return json({})

    const methode = (init.method || 'GET').toUpperCase()
    if (methode === 'GET') return json(tables[nom])
    if (methode === 'POST') {           // upsert
      const corps = JSON.parse(init.body || '[]')
      for (const ligne of (Array.isArray(corps) ? corps : [corps])) {
        const i = tables[nom].findIndex(l => l.id === ligne.id)
        if (i === -1) tables[nom].push(ligne); else tables[nom][i] = ligne
      }
      sauver()
      window.__base = tables
      return json([])
    }
    if (methode === 'DELETE') {
      const id = Number(url.match(/id=eq\.(\d+)/)?.[1])
      tables[nom] = tables[nom].filter(l => l.id !== id)
      window.__base = tables
      sauver()
      return json([])
    }
    return json({})
  }
})

const contenu = (table) => page.evaluate(t => window.__base[t], table)

await page.goto(base + '/clients')
await page.waitForSelector('text=Clients', { timeout: 8000 })
console.log('OK: application ouverte avec la base branchée')

// ─── La base est vide : aucune donnée d'exemple ne doit apparaître ───────────
const corpsDepart = await page.textContent('body')
if (/Gestion Tremblay|Construction Bergeron|Immobilier/i.test(corpsDepart))
  throw new Error('des données d’exemple s’affichent alors que la base est vide')
if ((await contenu('clients')).length !== 0)
  throw new Error('la base contient des données alors qu’elle devrait être vide')
console.log('OK: base vide — aucune donnée de démonstration écrite')

// ─── Ajouter un client : il doit atterrir dans la base ───────────────────────
await page.click('button:has-text("Nouveau client")')
await page.fill('input[placeholder="ex: Constructions Untel Inc."]', 'Rénovations Latulippe')
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Rénovations Latulippe', { timeout: 8000 })
await page.waitForTimeout(1200)

const clients = await contenu('clients')
console.log('Lignes dans la table clients :', clients.length)
if (clients.length !== 1) throw new Error(`la base devrait contenir 1 client, elle en a ${clients.length}`)
const ligne = clients[0]
if (ligne.nom !== 'Rénovations Latulippe')
  throw new Error(`la colonne « nom » vaut « ${ligne.nom} »`)
if (ligne.donnees?.name !== 'Rénovations Latulippe')
  throw new Error('l’objet complet n’est pas conservé dans la colonne jsonb')
if (typeof ligne.id !== 'number') throw new Error('l’identifiant n’est pas un nombre')
console.log('OK: le client est écrit dans la base — colonne « nom » et jsonb complet')

// ─── Rien ne doit être écrit dans le stockage du navigateur ─────────────────
const local = await page.evaluate(() => window.localStorage.getItem('cp-donnees-v1'))
if (local && /Latulippe/.test(local))
  throw new Error('le client a été écrit dans le navigateur alors que la base est branchée')
console.log('OK: rien n’est écrit dans le stockage du navigateur')

// ─── Recharger la page : la donnée revient de la base ────────────────────────
await page.reload()
await page.waitForSelector('text=Rénovations Latulippe', { timeout: 8000 })
console.log('OK: après rechargement, le client revient de la base')

// ─── Un échec d'enregistrement doit être visible ─────────────────────────────
await page.evaluate(() => {
  const precedent = window.fetch
  window.fetch = async (entree, init = {}) => {
    const url = typeof entree === 'string' ? entree : entree?.url ?? ''
    if (url.includes('/rest/v1/clients') && (init.method || 'GET').toUpperCase() === 'POST') {
      return new Response(JSON.stringify({ message: 'new row violates row-level security policy' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
    return precedent(entree, init)
  }
})
await page.click('button:has-text("Nouveau client")')
await page.fill('input[placeholder="ex: Constructions Untel Inc."]', 'Client Refusé')
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Modification non enregistrée', { timeout: 8000 })
const alerte = await page.textContent('body')
if (!/n'a pas le droit|droit de modifier/.test(alerte))
  throw new Error('le refus des règles d’accès n’est pas expliqué à l’écran')
console.log('OK: un enregistrement refusé est signalé, pas passé sous silence')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Les données vivent dans la base, pas dans le navigateur')
await browser.close()
