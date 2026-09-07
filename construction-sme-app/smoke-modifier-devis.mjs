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

// ─── La soumission liée porte les lignes de détail ───────────────────────────
const soumission = memeNumero[0]
console.log(`Lignes de détail dans la soumission : ${soumission.items?.length ?? 0}`)
if (!Array.isArray(soumission.items) || soumission.items.length < 3)
  throw new Error(`la soumission devrait détailler ses lignes, elle en a ${soumission.items?.length ?? 0}`)
if (!soumission.items.some(l => /Peinture murs/.test(l.description)))
  throw new Error('la ligne « Peinture murs » manque dans la soumission')
if (!soumission.items.some(l => /Peinture plafond/.test(l.description)))
  throw new Error('le travail ajouté à la modification n’a pas suivi dans la soumission')
if (!soumission.items.some(l => /Salle de bain —/.test(l.description)))
  throw new Error('les lignes ne portent pas le nom de la pièce')
const ligneMarge = soumission.items.find(l => /Administration et profit/.test(l.description))
if (!ligneMarge) throw new Error('la ligne « Administration et profit » manque')
console.log('OK: lignes détaillées, nom de pièce et ligne de marge présents')

// Chaque ligne garde sa quantité et son unité
const ligneAvecQte = soumission.items.find(l => /Peinture murs/.test(l.description))
if (!(ligneAvecQte.qty > 0)) throw new Error('la quantité de la ligne est nulle')
if (!ligneAvecQte.unit) throw new Error('l’unité de la ligne manque')
console.log(`OK: quantité et unité conservées — ${ligneAvecQte.qty} ${ligneAvecQte.unit}`)

// La somme des lignes doit égaler le sous-total avant taxes, au cent près :
// c'est ce que la fiche Soumission recalcule pour afficher son total.
const sommeLignes = soumission.items.reduce((s, l) => s + l.qty * l.unitPrice, 0)
console.log(`Somme des lignes : ${sommeLignes.toFixed(2)} $ · sous-total : ${soumission.subtotal} $`)
if (Math.abs(sommeLignes - soumission.subtotal) > 0.01)
  throw new Error(`la somme des lignes (${sommeLignes.toFixed(2)}) ne fait pas le sous-total (${soumission.subtotal})`)
console.log('OK: la somme des lignes fait exactement le sous-total avant taxes')

// ─── La fiche Soumission affiche bien ce détail ──────────────────────────────
await page.goto(base + '/soumissions')
await page.waitForTimeout(1200)
await page.click(`text=${numero}`)
await page.waitForTimeout(1200)
const fiche = await page.textContent('body')
if (/Aucune ligne de détail/.test(fiche))
  throw new Error('la fiche Soumission affiche encore « Aucune ligne de détail »')
if (!/Peinture murs/.test(fiche))
  throw new Error('la fiche Soumission n’affiche pas les lignes')
console.log('OK: la fiche Soumission affiche les lignes de détail')

// ─── La liste montre la date de modification ─────────────────────────────────
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Mes devis enregistrés', { timeout: 8000 })
if (!(await page.textContent('body')).includes('modifié le'))
  throw new Error('la liste n’indique pas que le devis a été modifié')
console.log('OK: la liste indique « modifié le … »')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Un devis enregistré se modifie en tout temps')
await browser.close()
