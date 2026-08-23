// Tests des prix personnalisés du devis rapide : une surcharge remplace le prix
// livré, tout le reste du catalogue est inchangé, et un prix invalide ne peut
// jamais casser un devis.
import {
  CATALOG, CATALOG_PRICE_FIELDS, applyCatalogPrices, catalogDefaultPrice,
} from './estimatorCatalog.js'
import { readFileSync } from 'node:fs'
import { lineTotal } from '../components/estimator/estimatorUtils.js'

let ok = 0, fail = 0
const eq = (label, got, want, tol = 0.001) => {
  if (Math.abs(got - want) <= tol) { ok++; console.log(`OK   ${label} = ${got}`) }
  else { fail++; console.log(`ÉCHEC ${label} : obtenu ${got}, attendu ${want}`) }
}
const vrai = (label, cond) => {
  if (cond) { ok++; console.log(`OK   ${label}`) }
  else { fail++; console.log(`ÉCHEC ${label}`) }
}

const ID = 'peinture-murs'
const matOrigine = catalogDefaultPrice(ID, 'unitMat')
const moOrigine = catalogDefaultPrice(ID, 'unitLabor')
console.log(`Prix livré de « ${ID} » : ${matOrigine} $ mat. + ${moOrigine} $ M.O.`)

// ─── Sans surcharge, rien ne change ──────────────────────────────────────────
vrai('aucune surcharge → le catalogue livré, à l’identique', applyCatalogPrices({}) === CATALOG)
vrai('surcharge nulle → le catalogue livré', applyCatalogPrices(null) === CATALOG)
vrai('le catalogue livré n’est jamais modifié en place',
  catalogDefaultPrice(ID, 'unitLabor') === moOrigine)

// ─── Une surcharge remplace bien le prix ─────────────────────────────────────
const c1 = applyCatalogPrices({ [ID]: { unitLabor: 25 } })
const art = c1.find(a => a.id === ID)
eq('main-d’œuvre remplacée', art.unitLabor, 25)
eq('matériel intact', art.unitMat, matOrigine)
vrai('les autres champs de l’article sont préservés',
  art.label && art.unit && art.autoQty && art.wasteFactor === CATALOG.find(a => a.id === ID).wasteFactor)

// ─── Les autres articles ne bougent pas ──────────────────────────────────────
const intacts = c1.filter(a => a.id !== ID)
vrai(`les ${intacts.length} autres articles gardent leur prix`,
  intacts.every(a => {
    const o = CATALOG.find(x => x.id === a.id)
    return a.unitMat === o.unitMat && a.unitLabor === o.unitLabor
  }))

// ─── Les deux champs à la fois ───────────────────────────────────────────────
const c2 = applyCatalogPrices({ [ID]: { unitMat: 5, unitLabor: 12 } })
const art2 = c2.find(a => a.id === ID)
eq('matériel personnalisé', art2.unitMat, 5)
eq('main-d’œuvre personnalisée', art2.unitLabor, 12)
// Un devis de 30 m² doit suivre le nouveau prix : 30 × (5 + 12) = 510 $
eq('le devis suit le prix personnalisé',
  lineTotal({ qty: 30, unitMat: art2.unitMat, unitLabor: art2.unitLabor }), 510)

// ─── Valeurs invalides : le prix livré reprend la main ───────────────────────
for (const mauvaise of [{ unitLabor: 'abc' }, { unitLabor: null }, { unitLabor: -5 }, { unitLabor: NaN }, {}]) {
  const c = applyCatalogPrices({ [ID]: mauvaise })
  const a = c.find(x => x.id === ID)
  vrai(`valeur invalide ${JSON.stringify(mauvaise)} → prix livré conservé`, a.unitLabor === moOrigine)
}
// Un zéro est une valeur légitime (travail fourni par le client)
eq('zéro accepté', applyCatalogPrices({ [ID]: { unitMat: 0 } }).find(a => a.id === ID).unitMat, 0)

// Un article inconnu dans les surcharges ne casse rien
const cInconnu = applyCatalogPrices({ 'article-qui-nexiste-plus': { unitMat: 99 } })
vrai('surcharge d’un article disparu : sans effet', cInconnu.length === CATALOG.length)
vrai('surcharge d’un article disparu : aucun prix modifié',
  cInconnu.every(a => {
    const o = CATALOG.find(x => x.id === a.id)
    return a.unitMat === o.unitMat && a.unitLabor === o.unitLabor
  }))

// ─── Tous les articles sont personnalisables ─────────────────────────────────
const tout = Object.fromEntries(CATALOG.map(a => [a.id, { unitMat: 1, unitLabor: 2 }]))
const cTout = applyCatalogPrices(tout)
vrai(`les ${CATALOG.length} articles du catalogue acceptent un prix personnalisé`,
  cTout.every(a => a.unitMat === 1 && a.unitLabor === 2))
vrai('deux champs de prix modifiables par article', CATALOG_PRICE_FIELDS.length === 2)

// ─── La sauvegarde emporte les prix personnalisés ────────────────────────────
// (vérifié pour de vrai, fichier téléchargé à l'appui, dans
//  smoke-prix-catalogue.mjs : ici on s'assure seulement de la déclaration)
const sourceBackup = readFileSync(new URL('../utils/backup.js', import.meta.url), 'utf8')
vrai('les prix personnalisés sont déclarés dans la sauvegarde',
  /CATALOG_PRICES_KEY/.test(sourceBackup))

console.log(`\n${ok} réussis, ${fail} échoués`)
if (fail > 0) process.exit(1)
console.log('✅ Prix du devis rapide personnalisables sans risque')
