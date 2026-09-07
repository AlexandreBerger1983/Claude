// Vérifie qu'un devis enregistré peut être rouvert et modifié en tout temps :
// le devis modifié remplace l'ancien, garde son numéro, et ne crée pas de
// second devis ni de seconde soumission.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const num = (s) => parseFloat(String(s).replace(/[^0-9,.-]/g, '').replace(/\s/g, '').replace(',', '.'))

// Le montant total est le second <span> de la ligne « TOTAL » du devis.
const totalAffiche = async () => {
  const txt = await page.locator('span:text-is("TOTAL")').first()
    .locator('xpath=following-sibling::span[1]').textContent()
  return num(txt)
}
const devisEnregistres = () => page.evaluate(() =>
  JSON.parse(localStorage.getItem('cp-devis-enregistres') || '[]'))
const soumissions = () => page.evaluate(() =>
  (JSON.parse(localStorage.getItem('cp-donnees-v1') || '{}').quotes ?? []))

// ─── Créer un devis ──────────────────────────────────────────────────────────
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouveau devis', { timeout: 8000 })
await page.click('text=Nouveau devis')
await page.waitForSelector('text=Pour qui est ce devis ?', { timeout: 5000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Jean Tremblay"]', 'Client À Modifier')
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
await page.waitForSelector('button:has-text("Enregistrer")', { timeout: 8000 })

const totalAvant = await totalAffiche()
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Devis enregistré', { timeout: 8000 })
await page.waitForTimeout(2200)

const apresCreation = await devisEnregistres()
const soumissionsApres = await soumissions()
const numero = apresCreation[apresCreation.length - 1].number
console.log(`Devis créé : ${numero} — ${apresCreation[apresCreation.length - 1].total} $`)
if (apresCreation.length !== 1) throw new Error(`${apresCreation.length} devis enregistrés au lieu de 1`)
console.log('OK: devis créé et enregistré')

// ─── Le bouton « Modifier » est proposé ──────────────────────────────────────
await page.waitForSelector('text=Mes devis enregistrés', { timeout: 8000 })
await page.waitForSelector('button:has-text("Modifier")', { timeout: 5000 })
console.log('OK: un devis enregistré propose « Modifier »')

// ─── Rouvrir et vérifier que tout est bien rechargé ──────────────────────────
await page.click('button:has-text("Modifier")')
await page.waitForSelector('text=Modification du devis', { timeout: 8000 })
const banniere = await page.textContent('body')
if (!banniere.includes(numero))
  throw new Error('la bannière de modification n’affiche pas le numéro du devis')
console.log(`OK: bannière « Modification du devis ${numero} » affichée`)

// Le devis rouvre directement sur l'étape finale, déjà complet
if (!banniere.includes('Client À Modifier'))
  throw new Error('le nom du client n’a pas été rechargé')
const totalRouvert = await totalAffiche()
console.log(`Total rouvert : ${totalRouvert} $ (créé à ${totalAvant} $)`)
if (Math.abs(totalRouvert - totalAvant) > 0.02)
  throw new Error('le total a changé à la réouverture')
console.log('OK: le devis rouvre complet, au même montant')

// ─── Modifier : revenir à l'étape des travaux et ajouter une ligne ───────────
// Les pastilles de progression portent le libellé de leur étape
await page.locator('button[aria-label="Les travaux"]').first().click()
await page.waitForSelector('text=Quels travaux faut-il faire ?', { timeout: 8000 })
console.log('OK: retour possible aux étapes précédentes pendant la modification')

// Un travail « Peinture… » est déjà choisi et s'affiche plus haut : cibler la
// catégorie par son libellé exact, sinon le clic tombe sur la ligne choisie.
const categorie = (nom) =>
  page.locator('button').filter({ has: page.locator(`p:text-is("${nom}")`) }).first()
await categorie('Peinture').click()
await page.waitForTimeout(500)
await page.click('text=Peinture plafond — 2 couches')
await page.waitForTimeout(600)
await page.click('text=Continuer')
await page.waitForSelector('button:has-text("Enregistrer")', { timeout: 8000 })
const totalModifie = await totalAffiche()
console.log(`Total après ajout : ${totalModifie} $`)
if (!(totalModifie > totalAvant))
  throw new Error('le total n’a pas augmenté après l’ajout d’un travail')
console.log('OK: le total suit la modification')

// ─── Enregistrer : remplacement, pas duplication ─────────────────────────────
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Devis mis à jour', { timeout: 8000 })
console.log('OK: message « Devis mis à jour » plutôt que « enregistré »')
await page.waitForTimeout(2200)

const finaux = await devisEnregistres()
if (finaux.length !== 1)
  throw new Error(`${finaux.length} devis enregistrés après modification — il devrait y en avoir 1`)
console.log('OK: toujours un seul devis — pas de doublon')

const modifie = finaux[0]
if (modifie.number !== numero)
  throw new Error(`le numéro a changé : ${modifie.number} au lieu de ${numero}`)
console.log(`OK: le numéro est conservé (${numero})`)
// L'écran arrondit au dollar ; l'enregistrement garde les cents. On compare
// donc à un dollar près, ce qui suffit à détecter un montant qui n'aurait pas
// suivi la modification.
if (Math.abs(modifie.total - totalModifie) > 1)
  throw new Error(`le total enregistré (${modifie.total}) ne correspond pas à l’écran (${totalModifie})`)
console.log('OK: le nouveau total est bien enregistré')
if (!modifie.modifieLe) throw new Error('la date de modification n’est pas conservée')
console.log('OK: la date de modification est conservée')

// La soumission liée est mise à jour, pas dupliquée
const soumissionsFinales = await soumissions()
const memeNumero = soumissionsFinales.filter(q => q.number === numero)
if (memeNumero.length !== 1)
  throw new Error(`${memeNumero.length} soumissions portent le numéro ${numero}`)
if (soumissionsFinales.length !== soumissionsApres.length)
  throw new Error('une soumission a été ajoutée alors que le devis était modifié')
if (Math.abs(memeNumero[0].total - totalModifie) > 1)
  throw new Error('la soumission liée n’a pas suivi le nouveau montant')
console.log('OK: la soumission liée est mise à jour, sans doublon')

// ─── La liste montre la date de modification ─────────────────────────────────
await page.waitForSelector('text=Mes devis enregistrés', { timeout: 8000 })
if (!(await page.textContent('body')).includes('modifié le'))
  throw new Error('la liste n’indique pas que le devis a été modifié')
console.log('OK: la liste indique « modifié le … »')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Un devis enregistré se modifie en tout temps')
await browser.close()
