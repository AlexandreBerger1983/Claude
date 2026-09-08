// Vérifie le module de soumission « maison neuve » de bout en bout, dans un
// vrai navigateur : choix du client, composition par divisions, exclusions,
// chaîne de calcul (contingence puis profits sur brut + contingence),
// enregistrement, et reprise du devis pour modification.
import { chromium } from 'playwright'

const base = 'http://localhost:4173/Claude/claude/construction-sme-app-rc82di/#'
const errors = []

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const num = (s) => parseFloat(String(s).replace(/[^0-9,.-]/g, '').replace(/\s/g, '').replace(',', '.'))
const devisEnregistres = () => page.evaluate(() =>
  JSON.parse(localStorage.getItem('cp-devis-enregistres') || '[]'))
const soumissions = () => page.evaluate(() =>
  (JSON.parse(localStorage.getItem('cp-donnees-v1') || '{}').quotes ?? []))
// Montant en regard d'un libellé de la table des totaux
const montantEnFaceDe = async (libelle) => {
  const txt = await page.locator(`span:text-is("${libelle}")`).first()
    .locator('xpath=following-sibling::span[1]').textContent()
  return num(txt)
}

// ─── L'accueil propose les deux sortes de devis ──────────────────────────────
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Nouvelle maison neuve', { timeout: 10000 })
const accueil = await page.textContent('body')
if (!accueil.includes('Nouveau devis'))
  throw new Error('le devis de rénovation a disparu de l’accueil')
if (!/par divisions de travaux/.test(accueil))
  throw new Error('la maison neuve ne s’annonce pas comme chiffrée par divisions')
console.log('OK: l’accueil propose « Nouveau devis » (rénovation) et « Nouvelle maison neuve »')

const soumissionsAvant = (await soumissions()).length
const devisAvant = (await devisEnregistres()).length

// ─── Étape 1 : le client ─────────────────────────────────────────────────────
await page.click('text=Nouvelle maison neuve')
await page.waitForSelector('text=Pour qui est cette maison ?', { timeout: 8000 })
await page.click('text=Nouveau client')
await page.fill('input[placeholder="ex: Félix et Tania"]', 'Félix et Tania')
await page.fill('input[placeholder="ex: 455 rue des Érables, Laval"]', '12 rue du Domaine, Sainte-Adèle')
await page.fill('input[placeholder="ex: Construction unifamiliale — 2 étages"]', 'Construction unifamiliale')
await page.click('text=Continuer')
await page.waitForSelector('text=Quels travaux comprend la maison ?', { timeout: 8000 })
console.log('OK: étape client franchie')

// ─── Étape 2 : les divisions ─────────────────────────────────────────────────
const corpsDivisions = await page.textContent('body')
for (const titre of ['Exigences générales', 'Travaux de béton', 'Structure de bois', 'Plomberie'])
  if (!corpsDivisions.includes(titre))
    throw new Error(`la division « ${titre} » n’apparaît pas`)
console.log('OK: les divisions du modèle sont proposées')

// Ouvrir « 01 Exigences générales » et ajouter la GCR (2 500,00 $)
await page.click('button[aria-label="Division 01 Exigences générales"]')
await page.waitForSelector('button[aria-label^="Ajouter GCR"]', { timeout: 5000 })
await page.click('button[aria-label^="Ajouter GCR"]')
await page.waitForTimeout(400)

// La ligne s'ouvre avec le prix du catalogue et une quantité de 1
const prixGCR = await page.inputValue('input[aria-label^="Prix unitaire — GCR"]')
const qteGCR = await page.inputValue('input[aria-label^="Quantité — GCR"]')
console.log(`Ligne GCR : ${qteGCR} × ${prixGCR} $`)
if (num(prixGCR) !== 2500) throw new Error(`le prix du catalogue devrait être 2500, il est ${prixGCR}`)
if (num(qteGCR) !== 1) throw new Error('la quantité initiale devrait être 1')
console.log('OK: la ligne ajoutée reprend le prix du catalogue de l’entreprise')

// Le total en bas de l'écran suit immédiatement
await page.waitForTimeout(500)
const basDePage = await page.textContent('body')
if (!/Total en cours/.test(basDePage)) throw new Error('le total en cours ne s’affiche pas')

// Une ligne de main-d'œuvre : 86,6 h de gestion de projet → 8 227,00 $
await page.click('button[aria-label^="Ajouter Temps chargé de projet"]')
await page.waitForTimeout(300)
await page.fill('input[aria-label^="Quantité — Temps chargé de projet"]', '86.6')
await page.fill('input[aria-label^="Heures — Temps chargé de projet"]', '86.6')
await page.waitForTimeout(500)
const ecranMO = await page.textContent('body')
if (!/86\.6 h × 95 \$/.test(ecranMO))
  throw new Error('la ligne n’affiche pas 86,6 h × 95 $')
if (!/8\s?227/.test(ecranMO))
  throw new Error('86,6 h à 95 $ devraient faire 8 227 $')
console.log('OK: la main-d’œuvre se chiffre à 95 $/h — 86,6 h = 8 227 $, comme dans le modèle')

// Une exclusion : on ajoute une ligne puis on l'exclut — elle doit rester
// affichée sans rien coûter.
await page.click('button[aria-label^="Ajouter Toilette de chantier"]')
await page.waitForTimeout(300)
await page.click('button[aria-label^="Exclure Toilette de chantier"]')
await page.waitForTimeout(400)
if (await page.locator('button[aria-label^="Inclure Toilette de chantier"]').count() === 0)
  throw new Error('la ligne exclue ne propose pas de la réinclure')
console.log('OK: une ligne peut être exclue et reste au devis')

// Une division de plus, avec un prix modifié à la main
await page.click('button[aria-label="Division 04 Travaux de béton"]')
await page.waitForTimeout(500)
const boutonBeton = page.locator('button[aria-label^="Ajouter Béton"]').first()
await boutonBeton.click()
await page.waitForTimeout(300)
const libelleBeton = (await page.locator('input[aria-label^="Quantité — Béton"]').first()
  .getAttribute('aria-label')).replace('Quantité — ', '')
await page.fill(`input[aria-label="Quantité — ${libelleBeton}"]`, '1280.59')
await page.fill(`input[aria-label="Prix unitaire — ${libelleBeton}"]`, '5.66')
await page.waitForTimeout(500)
console.log(`OK: ligne de béton chiffrée — ${libelleBeton}`)

// ─── Étape 3 : le devis et sa chaîne de calcul ───────────────────────────────
await page.click('text=Continuer')
await page.waitForSelector('text=MONTANT BRUT DES TRAVAUX', { timeout: 8000 })

// L'écran arrondit au dollar ; on compare donc à un dollar près, et les
// montants exacts au cent seront vérifiés sur le devis enregistré.
const brut = await montantEnFaceDe('MONTANT BRUT DES TRAVAUX')
const sousTotal = await montantEnFaceDe('Sous-total')
const total = await montantEnFaceDe('TOTAL')

// Béton 1280,59 × 5,66 = 7 248,14 · GCR 2 500 · M.-O. 86,6 h × 95 = 8 227
// La toilette de chantier (250 $) est exclue et ne doit pas compter.
const brutAttendu = 7248.14 + 2500 + 8227
const contingenceAttendue = +(brutAttendu * 0.05).toFixed(2)
const profitAttendu = +((brutAttendu + contingenceAttendue) * 0.15).toFixed(2)
const sousTotalAttendu = +(brutAttendu + contingenceAttendue + profitAttendu).toFixed(2)
const totalAttendu = +(sousTotalAttendu * 1.14975).toFixed(2)

console.log(`Brut : ${brut} $ (attendu ${brutAttendu.toFixed(2)} $)`)
if (Math.abs(brut - brutAttendu) > 1)
  throw new Error(`le montant brut est ${brut} au lieu de ${brutAttendu.toFixed(2)}`)
console.log('OK: le montant brut est exact — la toilette exclue ne compte pas')

console.log(`Sous-total : ${sousTotal} $ (attendu ${sousTotalAttendu} $)`)
if (Math.abs(sousTotal - sousTotalAttendu) > 1)
  throw new Error(`sous-total ${sousTotal} au lieu de ${sousTotalAttendu}`)
// Le piège du modèle : appliquer les profits au brut seul donnerait moins.
const sousTotalNaif = +(brutAttendu + contingenceAttendue + brutAttendu * 0.15).toFixed(2)
if (sousTotalAttendu - sousTotalNaif < 100)
  throw new Error('le test ne distingue pas les deux façons de calculer les profits')
if (Math.abs(sousTotal - sousTotalNaif) < 100)
  throw new Error(`les profits semblent calculés sur le brut seul (${sousTotal} ≈ ${sousTotalNaif})`)
console.log(`OK: les profits portent sur le brut PLUS la contingence (${sousTotalAttendu - sousTotalNaif} $ d’écart avec l’autre méthode)`)

console.log(`Total avec taxes : ${total} $ (attendu ${totalAttendu} $)`)
if (Math.abs(total - totalAttendu) > 1)
  throw new Error(`total ${total} au lieu de ${totalAttendu}`)
console.log('OK: TPS 5 % et TVQ 9,975 % appliquées au sous-total')

// Les exclusions sont imprimées pour le client
const devisTexte = await page.textContent('body')
if (!/Non compris dans cette soumission/.test(devisTexte))
  throw new Error('la liste des exclusions ne figure pas au devis')
if (!/Toilette de chantier/.test(devisTexte))
  throw new Error('la ligne exclue n’apparaît pas dans les non-compris')
console.log('OK: le devis imprime ce qui n’est PAS compris')

// Les divisions sont détaillées ligne par ligne
if (!/01 — Exigences générales/.test(devisTexte) || !/04 — Travaux de béton/.test(devisTexte))
  throw new Error('le devis ne détaille pas ses divisions')
console.log('OK: le devis détaille chaque division')

// ─── Les taux sont modifiables ───────────────────────────────────────────────
await page.click('text=Contingence, profits et taxes')
await page.waitForSelector('input[aria-label="Contingence %"]', { timeout: 5000 })
await page.fill('input[aria-label="Contingence %"]', '10')
await page.waitForTimeout(500)
const totalPlusHaut = await montantEnFaceDe('TOTAL')
console.log(`Total à 10 % de contingence : ${totalPlusHaut} $`)
if (!(totalPlusHaut > total + 100))
  throw new Error('augmenter la contingence n’augmente pas le total')
await page.fill('input[aria-label="Contingence %"]', '5')
await page.waitForTimeout(500)
if (Math.abs(await montantEnFaceDe('TOTAL') - total) > 1)
  throw new Error('revenir à 5 % ne redonne pas le total d’origine')
console.log('OK: contingence, profits et taxes sont modifiables et recalculent tout')

// ─── Enregistrement ──────────────────────────────────────────────────────────
await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Devis enregistré', { timeout: 8000 })
await page.waitForTimeout(2300)

const apres = await devisEnregistres()
if (apres.length !== devisAvant + 1)
  throw new Error(`${apres.length - devisAvant} devis ajoutés au lieu de 1`)
const devis = apres[apres.length - 1]
console.log(`Devis enregistré : ${devis.number} — ${devis.total} $ — type ${devis.type}`)
if (devis.type !== 'neuf') throw new Error('le devis n’est pas marqué « neuf »')
// Le devis enregistré garde les cents : c'est là qu'on vérifie la chaîne au
// cent près, l'écran arrondissant au dollar.
const r = devis.resume
console.log(`Chaîne enregistrée : brut ${r.brut} → contingence ${r.contingence} → profits ${r.profit} → sous-total ${r.sousTotal} → total ${r.total}`)
if (Math.abs(r.brut - brutAttendu) > 0.02)
  throw new Error(`brut enregistré ${r.brut} au lieu de ${brutAttendu.toFixed(2)}`)
if (Math.abs(r.contingence - contingenceAttendue) > 0.02)
  throw new Error(`contingence ${r.contingence} au lieu de ${contingenceAttendue}`)
if (Math.abs(r.profit - profitAttendu) > 0.02)
  throw new Error(`profits ${r.profit} au lieu de ${profitAttendu}`)
if (Math.abs(r.total - totalAttendu) > 0.05)
  throw new Error(`total enregistré ${r.total} au lieu de ${totalAttendu}`)
if (Math.abs(r.coutMO - 8227) > 0.02)
  throw new Error(`coût de main-d’œuvre ${r.coutMO} au lieu de 8227`)
if (r.nbExclusions !== 1) throw new Error(`${r.nbExclusions} exclusions au lieu de 1`)
console.log('OK: la chaîne de calcul est exacte au cent près dans le devis enregistré')
if (Math.abs(devis.total - total) > 1)
  throw new Error(`le total enregistré (${devis.total}) ne correspond pas à l’écran (${total})`)
if (!devis.selection || Object.keys(devis.selection).length !== 4)
  throw new Error(`la sélection enregistrée compte ${Object.keys(devis.selection ?? {}).length} lignes au lieu de 4`)
console.log('OK: le devis de maison neuve est enregistré avec sa sélection')

// ─── La soumission liée porte le détail ──────────────────────────────────────
const laSoumission = (await soumissions()).find(q => q.number === devis.number)
if (!laSoumission) throw new Error('aucune soumission créée pour le devis de maison neuve')
if ((await soumissions()).length !== soumissionsAvant + 1)
  throw new Error('plus d’une soumission a été créée')
console.log(`Lignes de la soumission : ${laSoumission.items.length}`)
if (laSoumission.items.length !== 6)
  throw new Error(`${laSoumission.items.length} lignes au lieu de 6 (4 lignes + contingence + profits)`)
if (!laSoumission.items.some(l => /01 Exigences générales/.test(l.description)))
  throw new Error('les lignes ne portent pas leur division')
if (!laSoumission.items.some(l => /EXCLU/.test(l.description)))
  throw new Error('la ligne exclue ne figure pas dans la soumission')
if (!laSoumission.items.some(l => /Contingence/.test(l.description)))
  throw new Error('la contingence ne figure pas en ligne séparée')
if (!laSoumission.items.some(l => /Profits et administration/.test(l.description)))
  throw new Error('les profits ne figurent pas en ligne séparée')
const sommeLignes = laSoumission.items.reduce((s, l) => s + l.qty * l.unitPrice, 0)
console.log(`Somme des lignes : ${sommeLignes.toFixed(2)} $ · sous-total : ${laSoumission.subtotal} $`)
if (Math.abs(sommeLignes - laSoumission.subtotal) > 0.01)
  throw new Error(`la somme des lignes (${sommeLignes.toFixed(2)}) ne fait pas le sous-total (${laSoumission.subtotal})`)
console.log('OK: la somme des lignes fait exactement le sous-total avant taxes')

// La fiche Soumission affiche ce détail
await page.goto(base + '/soumissions')
await page.waitForSelector('table', { timeout: 10000 })
await page.click(`text=${devis.number}`)
await page.waitForTimeout(1300)
const fiche = await page.textContent('body')
if (/Aucune ligne de détail/.test(fiche))
  throw new Error('la fiche Soumission n’affiche aucun détail')
if (!/Exigences générales/.test(fiche))
  throw new Error('la fiche Soumission n’affiche pas les lignes du devis neuf')
console.log('OK: la fiche Soumission affiche le détail par division')

// ─── Reprise pour modification ───────────────────────────────────────────────
await page.goto(base + '/estimateur')
await page.waitForSelector('text=Mes devis enregistrés', { timeout: 8000 })
const liste = await page.textContent('body')
if (!liste.includes('Maison neuve'))
  throw new Error('la liste ne distingue pas les devis de maison neuve')
console.log('OK: la liste marque les devis de maison neuve')

await page.locator('button:has-text("Modifier")').first().click()
await page.waitForSelector('text=Modification du devis', { timeout: 8000 })
const enModif = await page.textContent('body')
if (!enModif.includes(devis.number))
  throw new Error('la bannière de modification ne nomme pas le devis')
if (!enModif.includes('construction neuve'))
  throw new Error('la modification n’indique pas qu’il s’agit d’une maison neuve')
const totalRouvert = await montantEnFaceDe('TOTAL')
console.log(`Total rouvert : ${totalRouvert} $ (enregistré à ${total} $)`)
if (Math.abs(totalRouvert - total) > 1)
  throw new Error('le total a changé à la réouverture')
console.log('OK: le devis de maison neuve rouvre complet, au même montant')

// Modifier une quantité et réenregistrer : remplacement, pas duplication
await page.locator('button[aria-label="Les divisions"]').click()
await page.waitForSelector('text=Quels travaux comprend la maison ?', { timeout: 8000 })
await page.click('button[aria-label="Division 01 Exigences générales"]')
await page.waitForSelector('input[aria-label^="Quantité — GCR"]', { timeout: 5000 })
await page.fill('input[aria-label^="Quantité — GCR"]', '2')
await page.waitForTimeout(500)
await page.click('text=Continuer')
await page.waitForSelector('text=MONTANT BRUT DES TRAVAUX', { timeout: 8000 })
const brutModifie = await montantEnFaceDe('MONTANT BRUT DES TRAVAUX')
if (Math.abs(brutModifie - (brut + 2500)) > 1)
  throw new Error(`le brut modifié est ${brutModifie} au lieu de ${(brut + 2500).toFixed(2)}`)
console.log('OK: la modification d’une quantité suit jusqu’au brut')

await page.click('button:has-text("Enregistrer")')
await page.waitForSelector('text=Devis mis à jour', { timeout: 8000 })
await page.waitForTimeout(2300)
const finaux = await devisEnregistres()
if (finaux.length !== devisAvant + 1)
  throw new Error(`${finaux.length} devis après modification — il devrait toujours y en avoir ${devisAvant + 1}`)
const modifie = finaux.find(q => q.id === devis.id)
if (modifie.number !== devis.number) throw new Error('le numéro a changé')
if (!modifie.modifieLe) throw new Error('la date de modification manque')
console.log(`OK: un seul devis, numéro conservé (${devis.number}), pas de doublon`)

const soumissionsFinales = (await soumissions()).filter(q => q.number === devis.number)
if (soumissionsFinales.length !== 1)
  throw new Error(`${soumissionsFinales.length} soumissions portent ${devis.number}`)
if (!(soumissionsFinales[0].total > laSoumission.total))
  throw new Error('la soumission liée n’a pas suivi le nouveau montant')
console.log('OK: la soumission liée est mise à jour, sans doublon')

if (errors.length) { console.log('Erreurs JS:', errors); process.exit(1) }
console.log('\n✅ Soumission de maison neuve : divisions, exclusions, marges et reprise')
await browser.close()
