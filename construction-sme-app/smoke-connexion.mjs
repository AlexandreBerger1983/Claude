// Vérifie la connexion et les rôles, sur une version construite AVEC les clés
// Supabase. Le vrai serveur Supabase n'est pas joignable depuis l'atelier :
// on intercepte donc ses appels réseau pour lui faire répondre un profil
// « bureau » ou « chantier », et on observe ce que l'application affiche.
//
// Ce que ce test prouve : l'écran de connexion apparaît, un profil bureau
// ouvre tout, un profil chantier ne voit ni prix, ni factures, ni paie, et une
// adresse réservée tapée à la main le renvoie sur son écran.
// Ce qu'il ne prouve pas : que les règles de la base refusent réellement les
// données — ça, c'est Supabase qui l'applique, et seul un vrai projet le dira.
import { chromium } from 'playwright'

const base = 'http://localhost:4174/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

// Intercepte les appels à Supabase : session déjà ouverte + profil au rôle voulu.
const prepare = async (page, role) => {
  await page.addInitScript(({ role }) => {
    const session = {
      access_token: 'faux-jeton',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'faux-rafraichissement',
      user: { id: '00000000-0000-0000-0000-000000000001', email: 'essai@exemple.com', aud: 'authenticated' },
    }
    if (role) localStorage.setItem('cp-session', JSON.stringify(session))

    const vraiFetch = window.fetch.bind(window)
    window.fetch = async (entree, init) => {
      const url = typeof entree === 'string' ? entree : entree?.url ?? ''
      if (url.includes('exemple-local-test.supabase.co')) {
        // Profil demandé par l'application
        if (url.includes('/rest/v1/profiles')) {
          return new Response(JSON.stringify({
            id: session.user.id, nom: 'Essai', role, employee_id: role === 'chantier' ? 3 : null,
          }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
        // Authentification : on imite le refus de Supabase sur un mauvais mot de passe
        if (url.includes('/auth/v1/token')) {
          return new Response(JSON.stringify({
            code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials',
            error: 'invalid_grant', error_description: 'Invalid login credentials',
          }), { status: 400, headers: { 'Content-Type': 'application/json' } })
        }
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return vraiFetch(entree, init)
    }
  }, { role })
}

const nouvelOnglet = async (role) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(`pageerror (${role}): ` + e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(`console (${role}): ` + m.text()) })
  await prepare(page, role)
  return page
}

// ─── 1. Personne de connecté : l'écran de connexion s'affiche ────────────────
{
  const page = await nouvelOnglet(null)
  await page.goto(base + '/')
  await page.waitForSelector('text=Connectez-vous pour continuer', { timeout: 8000 })
  await page.waitForSelector('button:has-text("Se connecter")', { timeout: 5000 })
  console.log('OK: écran de connexion affiché quand la base est configurée')

  // L'application ne doit rien laisser filtrer avant la connexion
  const corps = await page.textContent('body')
  if (corps.includes('Soumissions') || corps.includes('Facturation'))
    throw new Error('des écrans sont visibles avant la connexion')
  console.log('OK: aucun écran de l’application avant la connexion')

  // Un mauvais mot de passe donne un message en français, pas un message brut
  await page.fill('#courriel', 'essai@exemple.com')
  await page.fill('#mot-de-passe', 'mauvais')
  await page.click('button:has-text("Se connecter")')
  await page.waitForTimeout(1200)
  const apres = await page.textContent('body')
  if (!/incorrect|échou|Impossible/i.test(apres))
    throw new Error('aucun message d’erreur après une mauvaise tentative')
  console.log('OK: échec de connexion signalé en français')
  await page.context().close()
}

// ─── 2. Compte bureau : tout est ouvert ──────────────────────────────────────
let menuBureau
{
  const page = await nouvelOnglet('bureau')
  await page.goto(base + '/')
  await page.waitForSelector('text=Tableau de bord', { timeout: 8000 })
  console.log('OK: le compte bureau entre directement dans l’application')

  menuBureau = await page.locator('aside nav a').allTextContents()
  console.log('Menu bureau :', menuBureau.map(t => t.trim()).join(' · '))
  for (const attendu of ['Soumissions', 'Facturation', 'Paie & Heures', 'Matériaux', 'Clients']) {
    if (!menuBureau.some(t => t.includes(attendu)))
      throw new Error(`le bureau devrait voir « ${attendu} »`)
  }
  console.log('OK: le bureau voit les écrans financiers')

  const corps = await page.textContent('body')
  if (!corps.includes('Bureau')) throw new Error('le rôle « Bureau » n’est pas affiché')
  console.log('OK: le rôle affiché est « Bureau »')

  await page.goto(base + '/paie')
  await page.waitForTimeout(900)
  if (!page.url().includes('/paie')) throw new Error('le bureau ne devrait pas être redirigé hors de la paie')
  console.log('OK: le bureau accède à la paie')
  await page.context().close()
}

// ─── 3. Compte chantier : prix, factures et paie hors de portée ──────────────
{
  const page = await nouvelOnglet('chantier')
  await page.goto(base + '/')
  await page.waitForSelector('text=Feuilles de temps', { timeout: 8000 })
  // Le tableau de bord est bâti sur le chiffre d'affaires et les marges : le
  // chantier est renvoyé sur ses feuilles de temps dès l'ouverture.
  if (!page.url().includes('/feuilles-de-temps'))
    throw new Error('le chantier devrait atterrir sur ses feuilles de temps, pas sur ' + page.url())
  console.log('OK: le compte chantier atterrit sur ses feuilles de temps')

  const menu = (await page.locator('aside nav a').allTextContents()).map(t => t.trim())
  console.log('Menu chantier :', menu.join(' · '))
  for (const interdit of ['Soumissions', 'Facturation', 'Paie & Heures', 'Matériaux', 'Clients', 'Estimateur', 'Sous-traitants', 'Rapports']) {
    if (menu.some(t => t.includes(interdit)))
      throw new Error(`le chantier ne devrait pas voir « ${interdit} » dans le menu`)
  }
  console.log('OK: aucun écran financier dans le menu du chantier')

  if (menu.some(t => t.includes('Tableau de bord')))
    throw new Error('le chantier ne devrait pas voir le tableau de bord (chiffre d’affaires, marges)')
  for (const attendu of ['Feuilles de temps', 'Projets', 'Calendrier', 'Documents']) {
    if (!menu.some(t => t.includes(attendu)))
      throw new Error(`le chantier devrait voir « ${attendu} »`)
  }
  console.log('OK: le chantier garde ses écrans de travail')
  if (menu.length >= menuBureau.length)
    throw new Error('le menu du chantier devrait être plus court que celui du bureau')
  console.log(`OK: menu réduit — ${menu.length} entrées contre ${menuBureau.length} pour le bureau`)

  const corps = await page.textContent('body')
  if (!corps.includes('Chantier')) throw new Error('le rôle « Chantier » n’est pas affiché')
  if (corps.includes('Paramètres')) throw new Error('le chantier ne devrait pas voir les Paramètres')
  console.log('OK: rôle « Chantier » affiché, Paramètres masqués')

  // Adresses réservées tapées à la main : renvoi vers son écran
  for (const interdite of ['/paie', '/facturation', '/soumissions', '/parametres', '/estimateur', '/rapports']) {
    await page.goto(base + interdite)
    await page.waitForTimeout(700)
    if (page.url().includes(interdite))
      throw new Error(`le chantier reste sur ${interdite} au lieu d’être redirigé`)
  }
  console.log('OK: les adresses réservées renvoient le chantier sur son écran')

  // Un projet précis reste accessible
  await page.goto(base + '/projets')
  await page.waitForTimeout(700)
  if (!page.url().includes('/projets')) throw new Error('le chantier devrait accéder aux projets')
  console.log('OK: le chantier accède toujours aux projets')
  await page.context().close()
}

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Connexion et rôles fonctionnels')
await browser.close()
