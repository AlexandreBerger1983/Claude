// Tests du moteur de soumission « maison neuve », vérifiés contre les chiffres
// réels du modèle de l'entreprise (CGF — Felix et Tania, construction
// unifamiliale, 725 657,97 $).
import {
  montantLigne, totauxSection, totauxDivision, resumeNeuf, exclusionsDe,
  divisionsNonVides, divisionsDepuisSelection, valeursInitiales,
  CONTINGENCE_PCT, PROFIT_PCT,
} from './neufCosting.js'
import {
  DIVISIONS_NEUF, SECTIONS_NEUF, TAUX_HORAIRE_NEUF, INCLUS, EXCLUS, cleGabarit,
} from './neufStructure.js'

let ok = 0, fail = 0
const eq = (label, got, want, tol = 0.02) => {
  if (Math.abs(got - want) <= tol) { ok++; console.log(`OK   ${label} = ${got}`) }
  else { fail++; console.log(`ÉCHEC ${label} : obtenu ${got}, attendu ${want}`) }
}
const vrai = (label, cond) => {
  if (cond) { ok++; console.log(`OK   ${label}`) }
  else { fail++; console.log(`ÉCHEC ${label}`) }
}

const ligne = (o) => ({ statut: INCLUS, tauxHoraire: TAUX_HORAIRE_NEUF, ...o })

// ─── Taux horaire du modèle ─────────────────────────────────────────────────
// « Temps chargé de projet : 86,6 h → 8 227,00 $ » donne exactement 95 $/h.
eq('taux horaire déduit du modèle', 8227 / 86.6, TAUX_HORAIRE_NEUF, 0.01)
eq('temps contremaître : 51,96 h → 4 936,20 $', 51.96 * TAUX_HORAIRE_NEUF, 4936.20, 0.01)

// ─── Montant d'une ligne ────────────────────────────────────────────────────
// Ligne matériaux seule : « Béton pour mur de fondation, 1280,59 pi³ à 5,66 $ »
eq('béton de fondation', montantLigne(ligne({ qte: 1280.59, prixU: 5.66 })).materiel, 7248.14, 0.02)

// Ligne main-d'œuvre seule : « Mise en place d'acier, 4 h »
const mo = montantLigne(ligne({ qte: 1399, prixU: 0, heures: 4 }))
eq('main-d’œuvre seule — matériaux nuls', mo.materiel, 0)
eq('main-d’œuvre seule — 4 h à 95 $', mo.mo, 380)

// Ligne mixte : « Contreplaqué 3/4 sur poutrelles, 1452 pi² à 2,23 $ + 15,88 h »
const mixte = montantLigne(ligne({ qte: 1452, prixU: 2.23, heures: 15.88 }))
eq('contreplaqué — matériaux', mixte.materiel, 3237.96, 0.02)
eq('contreplaqué — main-d’œuvre', mixte.mo, 1508.60, 0.02)
eq('contreplaqué — total', mixte.total, 4746.56, 0.04)

// Heures déduites d'un temps par unité, quand elles ne sont pas saisies
const parUnite = montantLigne(ligne({ qte: 100, prixU: 1, h: 0.05 }))
eq('heures déduites : 100 × 0,05', parUnite.heures, 5)
eq('main-d’œuvre déduite', parUnite.mo, 475)
// Des heures saisies l'emportent sur le temps par unité
eq('heures saisies prioritaires', montantLigne(ligne({ qte: 100, h: 0.05, heures: 2 })).heures, 2)

// ─── Une ligne exclue ne compte nulle part ──────────────────────────────────
const exclue = montantLigne({ statut: EXCLUS, qte: 100, prixU: 50, heures: 10 })
eq('ligne exclue — matériaux', exclue.materiel, 0)
eq('ligne exclue — main-d’œuvre', exclue.mo, 0)
eq('ligne exclue — heures', exclue.heures, 0)
eq('ligne exclue — total', exclue.total, 0)
// Sans statut, une ligne compte : c'est le cas par défaut à la saisie
vrai('une ligne sans statut compte', montantLigne({ qte: 2, prixU: 100 }).total === 200)

// Valeurs abîmées : jamais de NaN dans un devis
for (const mauvaise of [{}, { qte: 'abc', prixU: 'x' }, { qte: null, prixU: undefined }]) {
  const m = montantLigne(ligne(mauvaise))
  vrai(`valeur invalide ${JSON.stringify(mauvaise)} → 0`, m.total === 0 && !Number.isNaN(m.total))
}

// ─── La chaîne complète, sur les chiffres réels du modèle ───────────────────
// On reconstitue le projet par deux lignes qui portent ses totaux exacts.
const projetReel = [{
  code: '00', titre: 'Projet complet',
  sections: [{
    code: '00.1', titre: 'Totaux',
    lignes: [
      ligne({ libelle: 'Matériaux et sous-traitance', qte: 1, prixU: 422451.13 }),
      ligne({ libelle: 'Main-d’œuvre', qte: 0, prixU: 0, heures: 1055.110778 }),
    ],
  }],
}]

const r = resumeNeuf(projetReel)
console.log('\n── Comparaison avec la soumission réelle ──')
eq('coût matériaux et sous-traitance', r.coutMateriel, 422451.13)
eq('heures totales de main-d’œuvre', r.heures, 1055.11, 0.01)
eq('coût de main-d’œuvre', r.coutMO, 100235.52, 0.05)
eq('MONTANT BRUT DES TRAVAUX', r.brut, 522686.65, 0.05)
eq('contingence 5 %', r.contingence, 26134.33, 0.05)
eq('profits et administration 15 %', r.profit, 82323.15, 0.05)
eq('sous-total', r.sousTotal, 631144.14, 0.10)
eq('TPS 5 %', r.tps, 31557.21, 0.05)
eq('TVQ 9,975 %', r.tvq, 62956.63, 0.05)
eq('GRAND TOTAL DES TRAVAUX AVEC TAXES', r.total, 725657.97, 0.15)

// Le piège du modèle : les profits portent sur brut + contingence.
// Les appliquer sur le brut seul perdrait près de 4 000 $.
const profitSurBrutSeul = 522686.65 * 0.15
console.log(`\nProfits sur le brut seul : ${profitSurBrutSeul.toFixed(2)} $ — écart de ${(r.profit - profitSurBrutSeul).toFixed(2)} $`)
vrai('les profits ne se calculent PAS sur le brut seul', Math.abs(r.profit - profitSurBrutSeul) > 3000)
eq('les profits portent sur brut + contingence', r.profit, (r.brut + r.contingence) * 0.15, 0.05)

// ─── Taux modifiables ───────────────────────────────────────────────────────
const sansMarge = resumeNeuf(projetReel, { contingencePct: 0, profitPct: 0 })
eq('sans contingence ni profit, le sous-total est le brut', sansMarge.sousTotal, sansMarge.brut, 0.02)
eq('taxes sur le brut seul', sansMarge.total, sansMarge.brut * 1.14975, 1)

const plusGenereux = resumeNeuf(projetReel, { contingencePct: 10, profitPct: 20 })
vrai('des taux plus élevés donnent un total plus élevé', plusGenereux.total > r.total)

// ─── Totaux par section et par division ─────────────────────────────────────
const division = {
  code: '04', titre: 'Travaux de béton',
  sections: [
    { code: '04.1', titre: 'Coffrage', lignes: [
      ligne({ qte: 114, prixU: 12.5 }),          // galerie : 1 425,00
      ligne({ qte: 1, prixU: 13300 }),           // sous-traitant : 13 300,00
      ligne({ qte: 1, prixU: 250 }),             // marche : 250,00
    ] },
    { code: '04.2', titre: 'Armatures', lignes: [
      ligne({ qte: 1399, prixU: 0.82 }),         // treillis : 1 147,18
      ligne({ qte: 114, prixU: 0.90 }),          // armature : 102,60
    ] },
  ],
}
eq('sous-section 04.1 — coffrage', totauxSection(division.sections[0]).total, 14975, 0.5)
eq('sous-section 04.2 — armatures', totauxSection(division.sections[1]).total, 1249.78, 0.5)
eq('division 04 — somme de ses sous-sections', totauxDivision(division).total, 16224.78, 1)

// Une exclusion retire bien son montant du total de la division
const avecExclusion = {
  ...division,
  sections: [
    { ...division.sections[0], lignes: [...division.sections[0].lignes, { statut: EXCLUS, qte: 1, prixU: 99999 }] },
    division.sections[1],
  ],
}
eq('une exclusion ne gonfle pas la division',
  totauxDivision(avecExclusion).total, totauxDivision(division).total, 0.02)

// ─── Liste des exclusions ───────────────────────────────────────────────────
const avecExclus = [{
  code: '01', titre: 'Exigences générales',
  sections: [{ code: '01.4', titre: 'Frais hivernaux', lignes: [
    ligne({ libelle: 'Déneigement', statut: EXCLUS }),
    ligne({ libelle: 'Chauffage intérieur', statut: EXCLUS, loc: 'Chantier' }),
    ligne({ libelle: 'Toilette de chantier', qte: 4, prixU: 250 }),
  ] }],
}]
const exclusions = exclusionsDe(avecExclus)
eq('deux exclusions relevées', exclusions.length, 2)
vrai('l’exclusion nomme sa division et sa section',
  exclusions[0].division.includes('Exigences générales') && exclusions[0].section.includes('01.4'))
vrai('l’emplacement est conservé', exclusions[1].loc === 'Chantier')
eq('le résumé compte les exclusions', resumeNeuf(avecExclus).nbExclusions, 2)
eq('seule la ligne incluse compte', resumeNeuf(avecExclus).brut, 1000)

// ─── Sections vides écartées du devis client ────────────────────────────────
const avecVides = [
  { code: '01', titre: 'A', sections: [{ code: '01.1', titre: 'x', lignes: [ligne({ qte: 1, prixU: 10 })] }] },
  { code: '03', titre: 'B', sections: [{ code: '03.1', titre: 'y', lignes: [] }] },
]
eq('les divisions sans ligne disparaissent', divisionsNonVides(avecVides).length, 1)
eq('divisions vides : rien ne plante', divisionsNonVides([]).length, 0)
eq('résumé sans division', resumeNeuf([]).total, 0)

// ─── La structure livrée est cohérente ──────────────────────────────────────
console.log(`\nStructure : ${DIVISIONS_NEUF.length} divisions · ${SECTIONS_NEUF.length} sous-sections`)
vrai('16 divisions', DIVISIONS_NEUF.length === 16)
vrai('chaque division a un code et un titre',
  DIVISIONS_NEUF.every(d => d.code && d.titre && Array.isArray(d.sections)))
vrai('chaque sous-section a un code, un titre et des gabarits',
  SECTIONS_NEUF.every(s => s.code && s.titre && Array.isArray(s.lignes) && s.lignes.length > 0))
vrai('aucun code de sous-section en double',
  new Set(SECTIONS_NEUF.map(s => s.code)).size === SECTIONS_NEUF.length)
vrai('tous les gabarits ont un libellé et une unité',
  SECTIONS_NEUF.every(s => s.lignes.every(l => l.libelle && l.unite)))
vrai('aucun prix unitaire négatif',
  SECTIONS_NEUF.every(s => s.lignes.every(l => l.prixU >= 0 && l.h >= 0)))

const nbGabarits = SECTIONS_NEUF.reduce((n, s) => n + s.lignes.length, 0)
console.log(`Gabarits de ligne : ${nbGabarits}`)
vrai('au moins 100 gabarits de ligne prêts à l’emploi', nbGabarits >= 100)

// Les divisions du modèle sont toutes présentes
for (const code of ['01', '03', '04', '06.1', '06.2', '07', '08.1', '08.2', '09', '10', '11.1', '11.2', '12', '15', '17', '18'])
  vrai(`division ${code} présente`, DIVISIONS_NEUF.some(d => d.code === code))

eq('contingence par défaut', CONTINGENCE_PCT, 5)
eq('profit par défaut', PROFIT_PCT, 15)

// ─── De la saisie de l'écran au devis chiffré ───────────────────────────────
console.log('\n── Sélection de lignes ──')
// Rien de coché : rien au devis. C'est la première chose que voit
// l'utilisateur, elle ne doit pas planter.
eq('sélection vide → aucune division', divisionsDepuisSelection({}).length, 0)
eq('sélection vide → total nul', resumeNeuf(divisionsDepuisSelection({})).total, 0)

// On coche la première ligne de la première sous-section : « GCR », 2 500 $.
const sectionGCR = DIVISIONS_NEUF[0].sections[0]
const cleGCR = cleGabarit(sectionGCR.code, 0)
const initiales = valeursInitiales(sectionGCR.lignes[0])
eq('valeurs initiales — prix du catalogue repris', +initiales.prixU, sectionGCR.lignes[0].prixU)
eq('valeurs initiales — quantité 1', +initiales.qte, 1)
vrai('valeurs initiales — incluse par défaut', initiales.statut === INCLUS)

const choix = divisionsDepuisSelection({ [cleGCR]: initiales })
eq('une seule division retenue', choix.length, 1)
eq('une seule sous-section retenue', choix[0].sections.length, 1)
eq('une seule ligne retenue', choix[0].sections[0].lignes.length, 1)
vrai('la ligne garde le libellé du catalogue',
  choix[0].sections[0].lignes[0].libelle === sectionGCR.lignes[0].libelle)
eq('le montant est celui du catalogue', resumeNeuf(choix).brut, sectionGCR.lignes[0].prixU)

// Une quantité modifiée suit jusqu'au total
const doublee = divisionsDepuisSelection({ [cleGCR]: { ...initiales, qte: '2' } })
eq('doubler la quantité double le brut', resumeNeuf(doublee).brut, sectionGCR.lignes[0].prixU * 2)

// Une ligne de main-d'œuvre pure : « Temps chargé de projet », 1 h par unité
const cleTemps = cleGabarit(DIVISIONS_NEUF[0].sections[1].code, 0)
const heures = divisionsDepuisSelection({
  [cleTemps]: { qte: '86.6', prixU: '0', heures: '86.6', statut: INCLUS },
})
eq('86,6 h de gestion de projet', resumeNeuf(heures).coutMO, 8227, 0.02)
eq('aucun matériau sur une ligne d’heures', resumeNeuf(heures).coutMateriel, 0)

// Une ligne exclue reste au devis mais ne coûte rien
const exclueSel = divisionsDepuisSelection({ [cleGCR]: { ...initiales, statut: EXCLUS } })
eq('la ligne exclue reste affichée', exclueSel[0].sections[0].lignes.length, 1)
eq('la ligne exclue ne coûte rien', resumeNeuf(exclueSel).brut, 0)
eq('la ligne exclue est comptée comme exclusion', resumeNeuf(exclueSel).nbExclusions, 1)

// Lignes écrites à la main
const avecPerso = divisionsDepuisSelection({}, {
  [sectionGCR.code]: [{ id: 'p1', libelle: 'Étude de sol', qte: '1', prixU: '1800' }],
})
eq('une ligne personnalisée crée sa division', avecPerso.length, 1)
eq('la ligne personnalisée compte au brut', resumeNeuf(avecPerso).brut, 1800)
vrai('la ligne personnalisée est marquée comme telle',
  avecPerso[0].sections[0].lignes[0].perso === true)

// Gabarit coché ET ligne personnalisée dans la même sous-section
const melange = divisionsDepuisSelection(
  { [cleGCR]: initiales },
  { [sectionGCR.code]: [{ id: 'p1', libelle: 'Étude de sol', qte: '1', prixU: '1800' }] })
eq('les deux sortes de lignes cohabitent', melange[0].sections[0].lignes.length, 2)
eq('leur somme est correcte', resumeNeuf(melange).brut, sectionGCR.lignes[0].prixU + 1800)

// Chaque ligne retenue porte une clé unique : c'est ce qui l'identifie dans
// la soumission remise au client.
const toutCoche = {}
for (const s of SECTIONS_NEUF) s.lignes.forEach((g, i) => { toutCoche[cleGabarit(s.code, i)] = valeursInitiales(g) })
const complet = divisionsDepuisSelection(toutCoche)
const cles = complet.flatMap(d => d.sections.flatMap(s => s.lignes.map(l => l.cle)))
eq('tout cocher retient les 141 gabarits', cles.length, nbGabarits)
vrai('aucune clé de ligne en double', new Set(cles).size === cles.length)
vrai('le devis complet a un total positif', resumeNeuf(complet).total > 0)

console.log(`\n${ok} réussis, ${fail} échoués`)
if (fail > 0) process.exit(1)
console.log('✅ Le moteur « maison neuve » reproduit la soumission de l’entreprise')
