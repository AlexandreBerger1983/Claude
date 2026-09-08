// Moteur de calcul d'une soumission de construction neuve.
//
// La chaîne est relevée du modèle de l'entreprise et vérifiée contre ses
// chiffres réels (voir neufCosting.test.mjs) :
//
//   Coût matériaux et sous-traitance  422 451,13 $
// + Coût main-d'œuvre                 100 235,52 $
// ─────────────────────────────────────────────────
// = MONTANT BRUT DES TRAVAUX          522 686,66 $
// + Contingence            5 %         26 134,33 $   ← sur le brut
// + Profits et administration 15 %     82 323,15 $   ← sur brut + contingence
// ─────────────────────────────────────────────────
// = Sous-total                        631 144,14 $
// + TPS                    5 %         31 557,21 $
// + TVQ                9,975 %         62 956,63 $
// = GRAND TOTAL                       725 657,97 $
//
// Le point à ne pas se tromper : les profits se calculent sur le brut PLUS la
// contingence, pas sur le brut seul. Appliquer les deux taux séparément
// donnerait 78 403 $ au lieu de 82 323 $, soit près de 4 000 $ manquants.
//
// C'est aussi une différence de fond avec le devis de rénovation, qui n'a
// qu'un seul taux « Admin et profit » de 20 %.

import {
  TAUX_HORAIRE_NEUF, EXCLUS, INCLUS, DIVISIONS_NEUF, cleGabarit,
} from './neufStructure.js'

export const CONTINGENCE_PCT = 5
export const PROFIT_PCT = 15
export const TPS_PCT = 5
export const TVQ_PCT = 9.975

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
const sou = (v) => +num(v).toFixed(2)

// ─── Montant d'une ligne ─────────────────────────────────────────────────────
// Une ligne exclue vaut zéro partout : elle reste affichée — c'est même tout
// l'intérêt, le client voit ce qui n'est PAS compris — mais elle ne compte
// dans aucun total.
export function montantLigne(ligne) {
  if (!ligne || ligne.statut === EXCLUS) {
    return { materiel: 0, mo: 0, heures: 0, total: 0 }
  }
  const qte = num(ligne.qte)
  const materiel = sou(qte * num(ligne.prixU))
  // Les heures sont saisies directement, ou déduites d'un temps par unité.
  const heures = ligne.heures != null && ligne.heures !== ''
    ? num(ligne.heures)
    : +(qte * num(ligne.h)).toFixed(4)
  const mo = sou(heures * num(ligne.tauxHoraire ?? TAUX_HORAIRE_NEUF))
  return { materiel, mo, heures, total: sou(materiel + mo) }
}

// ─── Cumuls ─────────────────────────────────────────────────────────────────
const cumuler = (lignes = []) =>
  lignes.reduce((acc, ligne) => {
    const m = montantLigne(ligne)
    return {
      materiel: sou(acc.materiel + m.materiel),
      mo: sou(acc.mo + m.mo),
      heures: +(acc.heures + m.heures).toFixed(4),
      total: sou(acc.total + m.total),
    }
  }, { materiel: 0, mo: 0, heures: 0, total: 0 })

export const totauxSection = (section) => cumuler(section?.lignes ?? [])

export const totauxDivision = (division) =>
  cumuler((division?.sections ?? []).flatMap(s => s.lignes ?? []))

export const toutesLesLignes = (divisions = []) =>
  divisions.flatMap(d => (d.sections ?? []).flatMap(s => s.lignes ?? []))

// ─── Résumé de la soumission ────────────────────────────────────────────────
export function resumeNeuf(divisions = [], options = {}) {
  const {
    contingencePct = CONTINGENCE_PCT,
    profitPct = PROFIT_PCT,
    tpsPct = TPS_PCT,
    tvqPct = TVQ_PCT,
  } = options

  const lignes = toutesLesLignes(divisions)
  const { materiel, mo, heures } = cumuler(lignes)

  const brut = sou(materiel + mo)
  const contingence = sou(brut * contingencePct / 100)
  // Les profits portent sur le brut ET la contingence — c'est ce que fait le
  // modèle de l'entreprise.
  const baseProfit = sou(brut + contingence)
  const profit = sou(baseProfit * profitPct / 100)
  const sousTotal = sou(baseProfit + profit)
  const tps = sou(sousTotal * tpsPct / 100)
  const tvq = sou(sousTotal * tvqPct / 100)

  return {
    coutMateriel: materiel,
    coutMO: mo,
    heures: +heures.toFixed(2),
    brut,
    contingencePct, contingence,
    profitPct, profit,
    sousTotal,
    tpsPct, tps,
    tvqPct, tvq,
    total: sou(sousTotal + tps + tvq),
    nbLignes: lignes.length,
    nbExclusions: lignes.filter(l => l.statut === EXCLUS).length,
  }
}

// Les exclusions, pour les imprimer à part : c'est ce qui protège
// l'entreprise quand le client revient sur ce qu'il croyait compris.
export const exclusionsDe = (divisions = []) =>
  divisions.flatMap(d => (d.sections ?? []).flatMap(s =>
    (s.lignes ?? [])
      .filter(ligne => ligne.statut === EXCLUS)
      .map(ligne => ({
        division: `${d.code} ${d.titre}`,
        section: `${s.code} ${s.titre}`,
        libelle: ligne.libelle,
        loc: ligne.loc ?? '',
      }))))

// ─── De la saisie de l'utilisateur aux divisions chiffrées ──────────────────
// La saisie ne retient que ce qui a été coché : `selection` associe la clé
// d'un gabarit à ses valeurs (quantité, prix, heures, statut), et `perso`
// porte les lignes écrites à la main, par code de sous-section.
//
// Reconstruire les divisions à chaque calcul plutôt que de les stocker
// entières garde le brouillon léger et fait profiter un devis rouvert des
// corrections apportées depuis au catalogue de l'entreprise.
export function divisionsDepuisSelection(selection = {}, perso = {}) {
  const depuisGabarit = (gabarit, cle, valeurs) => ({
    cle,
    libelle: valeurs.libelle || gabarit.libelle,
    unite: gabarit.unite,
    type: gabarit.type,
    h: gabarit.h,
    loc: valeurs.loc ?? '',
    qte: valeurs.qte,
    prixU: valeurs.prixU,
    heures: valeurs.heures,
    statut: valeurs.statut ?? INCLUS,
    tauxHoraire: TAUX_HORAIRE_NEUF,
  })

  return DIVISIONS_NEUF
    .map(division => ({
      ...division,
      sections: division.sections
        .map(section => ({
          ...section,
          lignes: [
            ...section.lignes
              .map((gabarit, i) => [gabarit, cleGabarit(section.code, i)])
              .filter(([, cle]) => selection[cle])
              .map(([gabarit, cle]) => depuisGabarit(gabarit, cle, selection[cle])),
            ...(perso[section.code] ?? []).map(ligne => ({
              unite: 'unité', type: 'mixte', h: 0, statut: INCLUS,
              tauxHoraire: TAUX_HORAIRE_NEUF, ...ligne, perso: true,
            })),
          ],
        }))
        .filter(section => section.lignes.length > 0),
    }))
    .filter(division => division.sections.length > 0)
}

// Valeurs de départ d'une ligne qu'on vient de cocher : le prix du catalogue,
// une quantité de 1, et le temps par unité du gabarit s'il en a un.
export const valeursInitiales = (gabarit = {}) => ({
  qte: '1',
  prixU: String(gabarit.prixU ?? 0),
  heures: gabarit.h ? String(+(gabarit.h).toFixed(2)) : '',
  statut: INCLUS,
})

// Divisions ne gardant que ce qui a un montant : le devis remis au client ne
// montre pas les sections vides.
export const divisionsNonVides = (divisions = []) =>
  divisions
    .map(d => ({
      ...d,
      sections: (d.sections ?? []).filter(s => (s.lignes ?? []).length > 0),
    }))
    .filter(d => d.sections.length > 0)
