// Moteur de calcul des soumissions, transcrit des gabarits Excel de
// l'entreprise (« template_soumission_SALLE_DE_BAIN » et
// « template_soumission_CUISINE », feuille « Calcul des coûts »).
//
// Formule d'une ligne, telle qu'elle figure dans le fichier :
//   G = SI(inclus = 1 ; MAX(inclus × quantité × coût_unitaire ; montant_minimum) ; 0)
// Le « Montant Minimum » est donc un prix plancher : une ligne incluse n'est
// jamais facturée moins que ce montant, même si la quantité est faible.
//
// Le résumé regroupe ensuite les lignes par corps de métier, puis :
//   Total avant profit = somme des corps de métier
//   Admin et Profit    = Total avant profit × 20 %
//   Total avec profit  = Total avant profit + Admin et Profit
//
// Le fichier Excel vérifie que la somme des corps de métier égale la somme de
// toutes les lignes (cellule « BON » / « ERREUR ») : `coherent` reproduit ce
// contrôle, pour qu'une ligne oubliée dans un corps de métier soit visible.

// Taux d'administration et profit du gabarit Excel (cellule D17 = 0,2).
export const ADMIN_PROFIT_PCT = 20

// Corps de métier, dans l'ordre exact du résumé Excel.
export const TRADES = [
  { key: 'menuiserie',     label: 'Menuiserie' },
  { key: 'materiel',       label: 'Matériel' },
  { key: 'joints',         label: 'Tirage de joint' },
  { key: 'peinture',       label: 'Peinture' },
  { key: 'ceramique',      label: 'Céramique' },
  { key: 'couvrePlancher', label: 'Autre type de couvre plancher' },
  { key: 'verreDouche',    label: 'Verre de douche avec ou sans porte' },
  { key: 'plomberie',      label: 'Plombier' },
  { key: 'electricite',    label: 'Électricité' },
  { key: 'gestion',        label: 'Frais de gestion' },
  { key: 'autres',         label: 'Autre travaux' },
]

// Corps de métier déduit de l'identifiant de question. Les identifiants sont
// préfixés par pièce (sdb-, cui-, gen-) mais leur suffixe est stable, c'est
// donc lui qui porte le sens. Une ligne sans corps de métier explicite est
// ventilée entre Menuiserie (main-d'œuvre) et Matériel (matériaux), comme le
// fait le gabarit Excel pour tous les travaux de menuiserie générale.
const TRADE_BY_SUFFIX = [
  [/-joints$/,                                              'joints'],
  // Peinture : le questionnaire la scinde en murs, plafond et boiseries.
  [/-peinture(-murs|-plafond|-boiseries)?$/,                'peinture'],
  [/-(dosseret|ditra|membrane-imper|alcove)$/,              'ceramique'],
  [/-ceramique(-plancher|-murs)?$/,                         'ceramique'],
  [/-douche-ceramique$/,                                    'ceramique'],
  [/-plinthes-ceramique$/,                                  'ceramique'],
  // Membrane et préparation du sous-plancher : travaux du céramiste, comme
  // dans le gabarit Excel où ils suivent la ligne de céramique.
  [/-membrane-plancher$/,                                   'ceramique'],
  [/-sous-plancher$/,                                       'ceramique'],
  [/-plancher-(flottant|ingenieur|tapis|beton-poli)$/,      'couvrePlancher'],
  [/-(autre-plancher|plancher)$/,                           'couvrePlancher'],
  [/-verre-(sans|avec)-porte$/,                             'verreDouche'],
  [/-(prises|lumieres)-\w+$/,                               'electricite'],
  [/-chauffage-(modifier|ajout)$/,                          'electricite'],
  [/-elec-allocation$/,                                     'electricite'],
  [/-enl-(toilette|bain|douche|lavabo|laveuse|evier)$/,     'plomberie'],
  [/-depl-\w+$/,                                            'plomberie'],
  [/-inst-\w+$/,                                            'plomberie'],
  [/-enl-drain-\w+$/,                                       'plomberie'],
  [/-evier-temporaire$/,                                    'plomberie'],
  [/-gestion$/,                                             'gestion'],
  [/-autres$/,                                              'autres'],
]

export function tradeForQuestion(questionId) {
  if (!questionId) return null
  for (const [re, trade] of TRADE_BY_SUFFIX) if (re.test(questionId)) return trade
  return null // → ventilation Menuiserie / Matériel
}

const num = (v) => parseFloat(v) || 0

// Montant d'une ligne, plancher « Montant Minimum » compris.
export function lineAmount(line) {
  const brut = num(line.qty) * (num(line.unitMat) + num(line.unitLabor))
  return +Math.max(brut, num(line.min)).toFixed(2)
}

// Ventilation par corps de métier. Une ligne sans corps de métier explicite
// est séparée : sa part de main-d'œuvre va en Menuiserie, sa part de
// matériaux en Matériel. Le plancher éventuel est réparti au prorata pour que
// la somme des corps de métier reste égale au total des lignes.
export function tradeBreakdown(items) {
  const out = Object.fromEntries(TRADES.map(t => [t.key, 0]))
  for (const line of items) {
    const total = lineAmount(line)
    if (total === 0) continue
    const trade = line.trade ?? tradeForQuestion(line.questionId)
    if (trade && trade in out) { out[trade] += total; continue }
    const qty = num(line.qty)
    const mat = qty * num(line.unitMat)
    const lab = qty * num(line.unitLabor)
    const brut = mat + lab
    if (brut <= 0) { out.menuiserie += total; continue }
    // Prorata : préserve le plancher tout en gardant la répartition M.O./mat.
    out.menuiserie += +(total * (lab / brut)).toFixed(2)
    out.materiel   += +(total * (mat / brut)).toFixed(2)
  }
  for (const k of Object.keys(out)) out[k] = +out[k].toFixed(2)
  return out
}

// Résumé complet, équivalent du bloc « RÉSUMÉ » de la feuille Calcul des coûts.
export function costSummary(items, adminProfitPct = ADMIN_PROFIT_PCT) {
  const trades = tradeBreakdown(items)
  const totalLignes = +items.reduce((s, l) => s + lineAmount(l), 0).toFixed(2)
  const totalAvantProfit = +Object.values(trades).reduce((s, v) => s + v, 0).toFixed(2)
  const adminProfit = +(totalAvantProfit * adminProfitPct / 100).toFixed(2)
  const totalAvecProfit = +(totalAvantProfit + adminProfit).toFixed(2)
  return {
    trades,
    totalLignes,
    totalAvantProfit,
    adminProfitPct,
    adminProfit,
    totalAvecProfit,
    // Contrôle « BON » / « ERREUR » du gabarit : tolérance au centime près
    // pour absorber les arrondis du prorata.
    coherent: Math.abs(totalLignes - totalAvantProfit) < 0.05,
  }
}

// Totaux client : le gabarit applique les taxes sur le total AVEC profit
// (« Sous-total des travaux » = Calcul des coûts!C18).
export function quoteTotals(items, { adminProfitPct = ADMIN_PROFIT_PCT, tpsPct = 5, tvqPct = 9.975 } = {}) {
  const summary = costSummary(items, adminProfitPct)
  const sousTotal = summary.totalAvecProfit
  const tps = +(sousTotal * tpsPct / 100).toFixed(2)
  const tvq = +(sousTotal * tvqPct / 100).toFixed(2)
  return { ...summary, sousTotal, tps, tvq, total: +(sousTotal + tps + tvq).toFixed(2) }
}
