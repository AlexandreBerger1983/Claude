// Questionnaires d'estimation détaillés par type de pièce, transcrits des
// formulaires papier fournis (« Soumission pour salle de bain » et
// « Soumission pour cuisine ») : chaque travail possible est une question
// Oui/Non avec ses champs (temps alloué, coûts matériel, superficie en pc,
// longueur en pl, nombre) et génère les lignes du devis correspondantes.
//
// Tous les tarifs viennent d'une grille paramétrable (Paramètres → Tarifs du
// questionnaire) et restent modifiables question par question dans le
// questionnaire lui-même.
//
// Unités : pc = pied carré, pl = pied linéaire, ch = chaque, hrs = heures.

export const RATES_KEY = 'cp-questionnaire-tarifs'

// ─── Grille de tarifs par défaut ──────────────────────────────────────────────
// clé, libellé, unité, valeur par défaut, groupe (pour la page Paramètres)
export const RATE_DEFS = [
  { key: 'laborRate', label: "Taux horaire main-d'œuvre", unit: '$/h', def: 65, group: 'Général' },

  { key: 'enlCouvrePlancher', label: 'Enlever couvre-plancher (M.O.)', unit: '$/pc', def: 1.1, group: 'Démolition' },
  { key: 'enlContreplaque', label: 'Enlever contre-plaqué (M.O.)', unit: '$/pc', def: 1.0, group: 'Démolition' },
  { key: 'enlGypseMurs', label: 'Enlever gypse murs (M.O.)', unit: '$/pc', def: 1.2, group: 'Démolition' },
  { key: 'enlGypsePlafond', label: 'Enlever gypse plafond (M.O.)', unit: '$/pc', def: 1.4, group: 'Démolition' },
  { key: 'demolDivision', label: 'Défaire division en bois (M.O.)', unit: '$/pl', def: 15, group: 'Démolition' },
  { key: 'poseContreplaqueMat', label: 'Contre-plaqué 3/8 posé (mat.)', unit: '$/pc', def: 1.4, group: 'Démolition' },
  { key: 'poseContreplaqueMo', label: 'Contre-plaqué 3/8 posé (M.O.)', unit: '$/pc', def: 1.4, group: 'Démolition' },

  { key: 'divisionMat', label: 'Nouvelle division bois (mat.)', unit: '$/pl', def: 12, group: 'Construction & Murs' },
  { key: 'divisionMo', label: 'Nouvelle division bois (M.O.)', unit: '$/pl', def: 22, group: 'Construction & Murs' },
  { key: 'gypseNeufMat', label: 'Nouveau gypse posé (mat.)', unit: '$/pc', def: 0.85, group: 'Construction & Murs' },
  { key: 'gypseNeufMo', label: 'Nouveau gypse posé (M.O.)', unit: '$/pc', def: 1.7, group: 'Construction & Murs' },
  { key: 'boisMursMat', label: 'Bois sur les murs (mat.)', unit: '$/pc', def: 3, group: 'Construction & Murs' },
  { key: 'boisMursMo', label: 'Bois sur les murs (M.O.)', unit: '$/pc', def: 2, group: 'Construction & Murs' },
  { key: 'jointsMat', label: 'Tirage de joints (mat.)', unit: '$/pc', def: 0.15, group: 'Construction & Murs' },
  { key: 'jointsMo', label: 'Tirage de joints (M.O.)', unit: '$/pc', def: 1.1, group: 'Construction & Murs' },
  { key: 'peintureMat', label: 'Peinture (mat., peinture incluse)', unit: '$/pc', def: 0.33, group: 'Construction & Murs' },
  { key: 'peintureMo', label: 'Peinture (M.O.)', unit: '$/pc', def: 0.65, group: 'Construction & Murs' },
  { key: 'peinturePorteMat', label: 'Peinture de porte (mat.)', unit: '$/porte', def: 10, group: 'Construction & Murs' },
  { key: 'peinturePorteMo', label: 'Peinture de porte (M.O.)', unit: '$/porte', def: 50, group: 'Construction & Murs' },

  { key: 'dosseretPoseMo', label: 'Pose céramique dosseret (M.O.)', unit: '$/pc', def: 6, group: 'Céramique & Revêtements' },
  { key: 'ceramFournirDosseret', label: 'Fournir céramique dosseret (mat.)', unit: '$/pc', def: 7, group: 'Céramique & Revêtements' },
  { key: 'ditraMat', label: 'Membrane Ditraheat (mat.)', unit: '$/pc', def: 8, group: 'Céramique & Revêtements' },
  { key: 'ditraMo', label: 'Membrane Ditraheat (M.O.)', unit: '$/pc', def: 3, group: 'Céramique & Revêtements' },
  { key: 'membraneSousCeramMat', label: 'Membrane sous céramique (mat.)', unit: '$/pc', def: 2, group: 'Céramique & Revêtements' },
  { key: 'membraneSousCeramMo', label: 'Membrane sous céramique (M.O.)', unit: '$/pc', def: 1, group: 'Céramique & Revêtements' },
  { key: 'ceramPlancherMat', label: 'Pose céramique plancher (mat. pose)', unit: '$/pc', def: 0.5, group: 'Céramique & Revêtements' },
  { key: 'ceramPlancherMo', label: 'Pose céramique plancher (M.O.)', unit: '$/pc', def: 4.5, group: 'Céramique & Revêtements' },
  { key: 'ceramFournir', label: 'Fournir céramique (mat.)', unit: '$/pc', def: 5, group: 'Céramique & Revêtements' },
  { key: 'autonivMat', label: 'Autoniveleur (mat.)', unit: '$/pc', def: 1.2, group: 'Céramique & Revêtements' },
  { key: 'autonivMo', label: 'Autoniveleur (M.O.)', unit: '$/pc', def: 0.8, group: 'Céramique & Revêtements' },
  { key: 'revPlancherMat', label: 'Autre revêtement plancher (mat.)', unit: '$/pc', def: 3.5, group: 'Céramique & Revêtements' },
  { key: 'revPlancherMo', label: 'Autre revêtement plancher (M.O.)', unit: '$/pc', def: 1.3, group: 'Céramique & Revêtements' },
  { key: 'membraneImperMat', label: 'Membrane imperméabilisante (mat.)', unit: '$/pc', def: 1.7, group: 'Céramique & Revêtements' },
  { key: 'membraneImperMo', label: 'Membrane imperméabilisante (M.O.)', unit: '$/pc', def: 2, group: 'Céramique & Revêtements' },
  { key: 'ceramMursMo', label: 'Pose céramique murs douche/bain (M.O.)', unit: '$/pc', def: 5, group: 'Céramique & Revêtements' },
  { key: 'doucheCeramMat', label: 'Douche en céramique complète (mat.)', unit: '$', def: 2800, group: 'Céramique & Revêtements' },
  { key: 'doucheCeramMo', label: 'Douche en céramique complète (M.O.)', unit: '$', def: 2200, group: 'Céramique & Revêtements' },
  { key: 'verrePorteMo', label: 'Installation verre de douche (M.O.)', unit: '$', def: 160, group: 'Céramique & Revêtements' },
  { key: 'alcoveMat', label: 'Alcôve de douche (mat.)', unit: '$/ch', def: 60, group: 'Céramique & Revêtements' },
  { key: 'alcoveMo', label: 'Alcôve de douche (M.O.)', unit: '$/ch', def: 190, group: 'Céramique & Revêtements' },

  { key: 'ventMat', label: 'Ventilateur de salle de bain (mat.)', unit: '$', def: 180, group: 'Ventilation & Hotte' },
  { key: 'ventMo', label: 'Ventilateur de salle de bain (M.O.)', unit: '$', def: 120, group: 'Ventilation & Hotte' },
  { key: 'sortieVentMat', label: 'Nouvelle sortie ventilateur (mat.)', unit: '$', def: 60, group: 'Ventilation & Hotte' },
  { key: 'sortieVentMo', label: 'Nouvelle sortie ventilateur (M.O.)', unit: '$', def: 190, group: 'Ventilation & Hotte' },
  { key: 'deplVentFacile', label: 'Déplacer ventilateur — accès facile (M.O.)', unit: '$', def: 190, group: 'Ventilation & Hotte' },
  { key: 'deplVentMoyen', label: 'Déplacer ventilateur — accès moyen (M.O.)', unit: '$', def: 320, group: 'Ventilation & Hotte' },
  { key: 'deplVentDifficile', label: 'Déplacer ventilateur — accès difficile (M.O.)', unit: '$', def: 450, group: 'Ventilation & Hotte' },
  { key: 'deplVentMat', label: 'Déplacer ventilateur (mat.)', unit: '$', def: 40, group: 'Ventilation & Hotte' },
  { key: 'ureMat', label: "Boucher avec uréthane (mat.)", unit: '$', def: 15, group: 'Ventilation & Hotte' },
  { key: 'ureMo', label: "Boucher avec uréthane (M.O.)", unit: '$', def: 35, group: 'Ventilation & Hotte' },
  { key: 'sortieHotteMat', label: 'Nouvelle sortie de hotte (mat.)', unit: '$', def: 80, group: 'Ventilation & Hotte' },
  { key: 'sortieHotteMo', label: 'Nouvelle sortie de hotte (M.O.)', unit: '$', def: 270, group: 'Ventilation & Hotte' },
  { key: 'deplHotteFacile', label: 'Déplacer sortie hotte — facile (M.O.)', unit: '$', def: 260, group: 'Ventilation & Hotte' },
  { key: 'deplHotteMoyen', label: 'Déplacer sortie hotte — moyen (M.O.)', unit: '$', def: 390, group: 'Ventilation & Hotte' },
  { key: 'deplHotteDifficile', label: 'Déplacer sortie hotte — difficile (M.O.)', unit: '$', def: 520, group: 'Ventilation & Hotte' },
  { key: 'deplHotteMat', label: 'Déplacer sortie hotte (mat.)', unit: '$', def: 60, group: 'Ventilation & Hotte' },
  { key: 'reparRevMat', label: 'Réparer revêtement ext. (mat. par nous)', unit: '$', def: 45, group: 'Ventilation & Hotte' },

  { key: 'pointElecMat', label: 'Point électrique déplacé/ajouté (mat.)', unit: '$/ch', def: 25, group: 'Électricité' },
  { key: 'pointElecMo', label: 'Point électrique déplacé/ajouté (M.O.)', unit: '$/ch', def: 95, group: 'Électricité' },
  { key: 'lumEncMat', label: 'Lumière encastrée (mat.)', unit: '$/ch', def: 65, group: 'Électricité' },
  { key: 'lumEncMo', label: 'Lumière encastrée (M.O.)', unit: '$/ch', def: 55, group: 'Électricité' },
  { key: 'chauffModifMo', label: 'Chauffage à modifier (M.O.)', unit: '$', def: 195, group: 'Électricité' },

  { key: 'enlToilette', label: 'Enlever toilette + caps (M.O.)', unit: '$', def: 95, group: 'Plomberie' },
  { key: 'enlBain', label: 'Enlever bain + caps (M.O.)', unit: '$', def: 160, group: 'Plomberie' },
  { key: 'enlDouche', label: 'Enlever douche + caps (M.O.)', unit: '$', def: 160, group: 'Plomberie' },
  { key: 'enlLavabo', label: 'Enlever lavabo + caps (M.O.)', unit: '$', def: 95, group: 'Plomberie' },
  { key: 'enlLaveuse', label: 'Enlever laveuse + caps (M.O.)', unit: '$', def: 95, group: 'Plomberie' },
  { key: 'enlEvier', label: 'Enlever évier + caps (M.O.)', unit: '$', def: 160, group: 'Plomberie' },
  { key: 'enlDrainLaveuse', label: 'Enlever drainage laveuse (M.O.)', unit: '$', def: 190, group: 'Plomberie' },
  { key: 'deplDrainMo', label: 'Déplacer drainage + alimentation (M.O.)', unit: '$', def: 380, group: 'Plomberie' },
  { key: 'deplDrainMat', label: 'Déplacer drainage + alimentation (mat.)', unit: '$', def: 220, group: 'Plomberie' },
  { key: 'instLavaboMat', label: 'Installer lavabo (mat.)', unit: '$/ch', def: 30, group: 'Plomberie' },
  { key: 'instLavaboMo', label: 'Installer lavabo (M.O.)', unit: '$/ch', def: 150, group: 'Plomberie' },
  { key: 'instBainMat', label: 'Installer bain (mat.)', unit: '$', def: 60, group: 'Plomberie' },
  { key: 'instBainMo', label: 'Installer bain (M.O.)', unit: '$', def: 390, group: 'Plomberie' },
  { key: 'instToiletteMat', label: 'Installer toilette (mat.)', unit: '$', def: 25, group: 'Plomberie' },
  { key: 'instToiletteMo', label: 'Installer toilette (M.O.)', unit: '$', def: 155, group: 'Plomberie' },
  { key: 'instBaseMat', label: 'Installer base douche acrylique (mat.)', unit: '$', def: 50, group: 'Plomberie' },
  { key: 'instBaseMo', label: 'Installer base douche acrylique (M.O.)', unit: '$', def: 350, group: 'Plomberie' },
  { key: 'instRobinetMat', label: 'Installer robinet laveuse (mat.)', unit: '$', def: 30, group: 'Plomberie' },
  { key: 'instRobinetMo', label: 'Installer robinet laveuse (M.O.)', unit: '$', def: 150, group: 'Plomberie' },
  { key: 'instPorteDoucheMat', label: 'Installer porte de douche (mat.)', unit: '$', def: 20, group: 'Plomberie' },
  { key: 'instPorteDoucheMo', label: 'Installer porte de douche (M.O.)', unit: '$', def: 230, group: 'Plomberie' },
  { key: 'instEvierMat', label: 'Installer évier (mat.)', unit: '$', def: 50, group: 'Plomberie' },
  { key: 'instEvierMo', label: 'Installer évier (M.O.)', unit: '$', def: 150, group: 'Plomberie' },
  { key: 'instBroyeurMat', label: 'Installer broyeur (mat.)', unit: '$', def: 20, group: 'Plomberie' },
  { key: 'instBroyeurMo', label: 'Installer broyeur (M.O.)', unit: '$', def: 130, group: 'Plomberie' },
  { key: 'instLVMat', label: 'Installer lave-vaisselle (mat.)', unit: '$', def: 20, group: 'Plomberie' },
  { key: 'instLVMo', label: 'Installer lave-vaisselle (M.O.)', unit: '$', def: 130, group: 'Plomberie' },
  { key: 'instHotteMat', label: 'Installer hotte de cuisine (mat.)', unit: '$', def: 30, group: 'Plomberie' },
  { key: 'instHotteMo', label: 'Installer hotte de cuisine (M.O.)', unit: '$', def: 150, group: 'Plomberie' },
  { key: 'evierTempMat', label: 'Évier temporaire (mat.)', unit: '$', def: 60, group: 'Plomberie' },
  { key: 'evierTempMo', label: 'Évier temporaire (M.O.)', unit: '$', def: 130, group: 'Plomberie' },

  { key: 'porteEscamMat', label: 'Porte escamotable (mat.)', unit: '$', def: 190, group: 'Finition' },
  { key: 'porteEscamMo', label: 'Porte escamotable (M.O.)', unit: '$', def: 260, group: 'Finition' },
  { key: 'plinthesBoisMat', label: 'Plinthes de bois (mat.)', unit: '$/pl', def: 2, group: 'Finition' },
  { key: 'plinthesBoisMo', label: 'Plinthes de bois (M.O.)', unit: '$/pl', def: 2, group: 'Finition' },
  { key: 'plinthesCeramMat', label: 'Plinthes de céramique (mat.)', unit: '$/pl', def: 4, group: 'Finition' },
  { key: 'plinthesCeramMo', label: 'Plinthes de céramique (M.O.)', unit: '$/pl', def: 5, group: 'Finition' },
  { key: 'chambranlesMat', label: 'Chambranles (mat.)', unit: '$/pl', def: 2.5, group: 'Finition' },
  { key: 'chambranlesMo', label: 'Chambranles (M.O.)', unit: '$/pl', def: 2.5, group: 'Finition' },
  { key: 'soufflageMat', label: 'Soufflage de fenêtre (mat.)', unit: '$/pl', def: 2, group: 'Finition' },
  { key: 'soufflageMo', label: 'Soufflage de fenêtre (M.O.)', unit: '$/pl', def: 3, group: 'Finition' },
  { key: 'ogeeMat', label: 'Ogee ou cimaise (mat.)', unit: '$/pl', def: 1.5, group: 'Finition' },
  { key: 'ogeeMo', label: 'Ogee ou cimaise (M.O.)', unit: '$/pl', def: 2, group: 'Finition' },
  { key: 'menageMat', label: 'Finition finale et ménage (mat.)', unit: '$', def: 15, group: 'Finition' },

  { key: 'genVinyleMat', label: 'Plancher vinyle/flottant (mat.)', unit: '$/pc', def: 3.5, group: 'Pièce standard' },
  { key: 'genVinyleMo', label: 'Plancher vinyle/flottant (M.O.)', unit: '$/pc', def: 1.3, group: 'Pièce standard' },
  { key: 'genBoisMat', label: 'Plancher bois franc (mat.)', unit: '$/pc', def: 8, group: 'Pièce standard' },
  { key: 'genCeramMat', label: 'Plancher céramique (mat.)', unit: '$/pc', def: 5.5, group: 'Pièce standard' },
  { key: 'genCeramMo', label: 'Plancher céramique (M.O.)', unit: '$/pc', def: 4.5, group: 'Pièce standard' },
]

export const defaultRates = () =>
  Object.fromEntries(RATE_DEFS.map(r => [r.key, r.def]))

export const RATE_GROUPS = [...new Set(RATE_DEFS.map(r => r.group))]

// ─── Fabriques de questions ───────────────────────────────────────────────────
const q = (id, label, inputs, lines, extra = {}) => ({ id, label, inputs, lines, ...extra })

const buildFactories = (R) => {
  const timeMat = (id, label, defH = 1, defM = 0) =>
    q(id, label,
      [
        { name: 'hrs', label: 'Temps alloué', type: 'number', unit: 'hrs', default: defH },
        ...(defM > 0 ? [{ name: 'mat', label: 'Coûts matériel', type: 'number', unit: '$', default: defM }] : []),
      ],
      (a) => [{ description: label, qty: 1, unit: 'forfait', unitMat: a.mat || 0, unitLabor: (a.hrs || 0) * R.laborRate }])

  const flat = (id, label, labor, mat = 0) =>
    q(id, label, [],
      () => [{ description: label, qty: 1, unit: 'forfait', unitMat: mat, unitLabor: labor }])

  const perPc = (id, label, matRate, laborRate, defPc = 0, pcLabel = 'Superficie') =>
    q(id, label,
      [{ name: 'pc', label: pcLabel, type: 'number', unit: 'pc', default: defPc }],
      (a) => [{ description: label, qty: a.pc || 0, unit: 'pc', unitMat: matRate, unitLabor: laborRate }])

  const perPl = (id, label, matRate, laborRate, defPl = 0, plLabel = 'Quantité') =>
    q(id, label,
      [{ name: 'pl', label: plLabel, type: 'number', unit: 'pl', default: defPl }],
      (a) => [{ description: label, qty: a.pl || 0, unit: 'pl', unitMat: matRate, unitLabor: laborRate }])

  const perCount = (id, label, matUnit, laborUnit, defN = 1, nLabel = 'Nombre') =>
    q(id, label,
      [{ name: 'n', label: nLabel, type: 'number', unit: 'ch', default: defN }],
      (a) => [{ description: label, qty: a.n || 0, unit: 'unité', unitMat: matUnit, unitLabor: laborUnit }])

  const amount = (id, label, defA = 0) =>
    q(id, label,
      [{ name: 'amt', label: 'Montant', type: 'number', unit: '$', default: defA }],
      (a) => (a.amt > 0 ? [{ description: label, qty: 1, unit: 'forfait', unitMat: a.amt, unitLabor: 0 }] : []))

  const info = (id, label, type = 'text', options = null) =>
    q(id, label,
      [{ name: 'val', label, type, options }],
      () => [], { infoOnly: true })

  return { timeMat, flat, perPc, perPl, perCount, amount, info }
}

// ─── Sections communes ────────────────────────────────────────────────────────
const buildSectionsCommunes = (R, F) => ({
  demolition: (prefix, defaults = {}) => [
    q(`${prefix}-couvre-plancher`, 'Enlever le couvre-plancher existant',
      [
        { name: 'type', label: 'Type de couvre-plancher', type: 'select', options: ['Céramique', 'Bois franc', 'Flottant', 'Vinyle', 'Tapis'] },
        { name: 'pc', label: 'Superficie à enlever', type: 'number', unit: 'pc', default: defaults.couvrePc ?? 100 },
        { name: 'rangs', label: 'Nombre de rangs à enlever', type: 'number', unit: 'rangs', default: 1 },
      ],
      (a) => [{ description: `Enlever le couvre-plancher existant (${a.type || 'céramique'})`, qty: a.pc || 0, unit: 'pc', unitMat: 0, unitLabor: R.enlCouvrePlancher }]),
    F.perPc(`${prefix}-contreplaque-enl`, "Enlever le ou les contre-plaqués jusqu'à la structure", 0, R.enlContreplaque, defaults.veneerPc ?? 100),
    F.perPc(`${prefix}-gypse-murs-enl`, 'Enlever le gypse sur les murs aux endroits touchés', 0, R.enlGypseMurs, defaults.gypseMursPc ?? 320),
    F.perPc(`${prefix}-gypse-plafond-enl`, 'Enlever le gypse du plafond aux endroits touchés', 0, R.enlGypsePlafond, defaults.gypsePlafondPc ?? 100),
    F.perPl(`${prefix}-division-demolir`, 'Défaire une division en bois', 0, R.demolDivision, 8, 'Longueur de mur à démolir'),
    F.perPc(`${prefix}-contreplaque-pose`, 'Poser un contre-plaqué 3/8 BC FIR sélect sur le plancher, vissé au 4" c/c', R.poseContreplaqueMat, R.poseContreplaqueMo, 100),
    F.info(`${prefix}-entretoit`, "Accès à l'entretoît", 'select', ['Facile ou non applicable', 'Moyen', 'Difficile']),
  ],
  construction: (prefix) => [
    F.perPl(`${prefix}-division-neuve`, 'Faire une nouvelle division en bois', R.divisionMat, R.divisionMo, 0, 'Longueur de mur à construire'),
    F.timeMat(`${prefix}-fond-clouage`, 'Installer un fond de clouage', 3, 50),
    F.perPc(`${prefix}-gypse-neuf`, 'Fournir et installer du nouveau gypse aux endroits touchés', R.gypseNeufMat, R.gypseNeufMo, 420),
    F.perPc(`${prefix}-bois-murs`, 'Fournir et installer du bois sur les murs', R.boisMursMat, R.boisMursMo, 0),
    q(`${prefix}-autre-revetement-murs`, 'Autre revêtement sur les murs',
      [
        { name: 'pose', label: 'Coûts pour cet autre revêtement — pose', type: 'number', unit: '$', default: 0 },
        { name: 'mat', label: 'Coûts pour cet autre revêtement — matériel', type: 'number', unit: '$', default: 0 },
      ],
      (a) => [{ description: 'Autre revêtement sur les murs', qty: 1, unit: 'forfait', unitMat: a.mat || 0, unitLabor: a.pose || 0 }]),
    F.perPc(`${prefix}-joints`, 'Faire le tirage des joints de gypse prêt pour la peinture', R.jointsMat, R.jointsMo, 600),
    q(`${prefix}-peinture`, 'Peindre murs, plafonds, portes et moulures — 2 couleurs (peinture incluse)',
      [
        { name: 'pc', label: 'Peinture gypse : superficie', type: 'number', unit: 'pc', default: 420 },
        { name: 'portes', label: 'Nombre de portes à peindre', type: 'number', unit: 'ch', default: 0 },
      ],
      (a) => [
        { description: 'Peinture murs et plafonds — 2 couleurs (peinture incluse)', qty: a.pc || 0, unit: 'pc', unitMat: R.peintureMat, unitLabor: R.peintureMo },
        ...(a.portes > 0 ? [{ description: 'Peinture des portes', qty: a.portes, unit: 'unité', unitMat: R.peinturePorteMat, unitLabor: R.peinturePorteMo }] : []),
      ]),
  ],
  electricite: (prefix, extras = []) => [
    F.info(`${prefix}-chauffage-type`, 'Préciser le type de chauffage'),
    F.perCount(`${prefix}-prises-deplacer`, 'Prises électriques à déplacer', R.pointElecMat, R.pointElecMo, 1, 'Nombre de prises'),
    F.perCount(`${prefix}-lumieres-deplacer`, 'Lumières à déplacer', R.pointElecMat, R.pointElecMo, 1, 'Nombre de lumières'),
    F.perCount(`${prefix}-lumieres-encastrees`, 'Lumières encastrées à poser', R.lumEncMat, R.lumEncMo, 1, 'Nombre de lumières'),
    ...extras,
    F.flat(`${prefix}-chauffage-modifier`, 'Chauffage à modifier', R.chauffModifMo),
    q(`${prefix}-chauffage-ajout`, 'Ajout de chauffage',
      [
        { name: 'type', label: 'Type de chauffage à ajouter', type: 'text' },
        { name: 'cout', label: 'Coût du chauffage', type: 'number', unit: '$', default: 0 },
      ],
      (a) => [{ description: `Ajout de chauffage${a.type ? ` (${a.type})` : ''}`, qty: 1, unit: 'forfait', unitMat: a.cout || 0, unitLabor: 2 * R.laborRate }]),
    F.amount(`${prefix}-elec-allocation`, 'Électricité — allocation (électricien licencié)', 0),
  ],
  finition: (prefix, extras = []) => [
    q(`${prefix}-plinthes-bois`, 'Fournir et installer de la plinthe de bois au plancher',
      [
        { name: 'type', label: 'Type de plinthes de bois', type: 'text' },
        { name: 'pl', label: 'Quantité de plinthes à poser', type: 'number', unit: 'pl', default: 48 },
      ],
      (a) => [{ description: `Plinthes de bois au plancher${a.type ? ` (${a.type})` : ''}`, qty: a.pl || 0, unit: 'pl', unitMat: R.plinthesBoisMat, unitLabor: R.plinthesBoisMo }]),
    F.perPl(`${prefix}-plinthes-ceramique`, 'Fournir et installer de la plinthe de céramique au plancher', R.plinthesCeramMat, R.plinthesCeramMo, 0),
    q(`${prefix}-chambranles`, 'Fournir et installer des chambranles pour la porte et fenêtre',
      [
        { name: 'type', label: 'Type de chambranles', type: 'text' },
        { name: 'pl', label: 'Quantité de chambranles à poser', type: 'number', unit: 'pl', default: 40 },
      ],
      (a) => [{ description: `Chambranles pour portes et fenêtres${a.type ? ` (${a.type})` : ''}`, qty: a.pl || 0, unit: 'pl', unitMat: R.chambranlesMat, unitLabor: R.chambranlesMo }]),
    q(`${prefix}-soufflage`, 'Fournir et installer du soufflage à la fenêtre',
      [
        { name: 'type', label: 'Type de soufflage', type: 'select', options: ['PVC', 'Bois'] },
        { name: 'pl', label: 'Quantité de soufflage de fenêtres', type: 'number', unit: 'pl', default: 0 },
      ],
      (a) => [{ description: `Soufflage de fenêtre (${a.type || 'PVC'})`, qty: a.pl || 0, unit: 'pl', unitMat: R.soufflageMat, unitLabor: R.soufflageMo }]),
    q(`${prefix}-ogee`, 'Ogee ou cimaise',
      [
        { name: 'type', label: 'Type de OGEE ou cimaise', type: 'text' },
        { name: 'pl', label: 'Quantité à poser', type: 'number', unit: 'pl', default: 0 },
      ],
      (a) => [{ description: `Ogee ou cimaise${a.type ? ` (${a.type})` : ''}`, qty: a.pl || 0, unit: 'pl', unitMat: R.ogeeMat, unitLabor: R.ogeeMo }]),
    ...extras,
    q(`${prefix}-menage`, 'Finition finale et ménage',
      [{ name: 'hrs', label: 'Temps alloué', type: 'number', unit: 'hrs', default: 4 }],
      (a) => [{ description: 'Finition finale et ménage', qty: 1, unit: 'forfait', unitMat: R.menageMat, unitLabor: (a.hrs || 0) * R.laborRate }]),
    F.amount(`${prefix}-gestion`, 'Frais de gestion', 0),
    q(`${prefix}-autres`, 'Autres travaux',
      [
        { name: 'desc', label: 'Description des travaux additionnels', type: 'text' },
        { name: 'amt', label: 'Montant alloué', type: 'number', unit: '$', default: 0 },
      ],
      (a) => (a.amt > 0 ? [{ description: a.desc || 'Autres travaux', qty: 1, unit: 'forfait', unitMat: a.amt, unitLabor: 0 }] : [])),
  ],
})

// ─── Construction des questionnaires avec une grille de tarifs ────────────────
export function buildQuestionnaires(R) {
  const F = buildFactories(R)
  const C = buildSectionsCommunes(R, F)

  const SDB = [
    {
      title: 'Travaux généraux',
      questions: [
        F.timeMat('sdb-protection-planchers', 'Faire la protection des planchers', 2),
        F.timeMat('sdb-polythene', 'Faire des murs avec des polythènes pour isoler la zone', 2, 45),
        F.timeMat('sdb-zipper', 'Fournir et installer un zipper dans le polythène pour permettre le passage', 1, 25),
        F.timeMat('sdb-escaliers', 'Protéger les escaliers', 2),
        q('sdb-armoires-enl', 'Enlever les armoires et en débarrasser',
          [
            { name: 'type', label: "Type d'armoires", type: 'select', options: ['Modules', 'Sur place'] },
            { name: 'hrs', label: 'Temps alloué pour enlever', type: 'number', unit: 'hrs', default: 4 },
            { name: 'hrsDechets', label: 'Temps pour sortir déchets jusque dans remorque', type: 'number', unit: 'hrs', default: 4 },
          ],
          (a) => [{ description: `Enlever les armoires (${a.type || 'modules'}) et en débarrasser`, qty: 1, unit: 'forfait', unitMat: 0, unitLabor: ((a.hrs || 0) + (a.hrsDechets || 0)) * R.laborRate }]),
        F.flat('sdb-enl-toilette', 'Enlever la toilette et poser des caps sur les tuyaux', R.enlToilette),
        F.flat('sdb-enl-bain', 'Enlever le bain et poser des caps sur les tuyaux', R.enlBain),
        F.flat('sdb-enl-douche', 'Enlever la douche et poser des caps sur les tuyaux', R.enlDouche),
        F.flat('sdb-enl-lavabo', 'Enlever le lavabo et poser des caps sur les tuyaux', R.enlLavabo),
        F.flat('sdb-enl-laveuse', 'Enlever la laveuse et poser des caps sur les tuyaux', R.enlLaveuse),
      ],
    },
    { title: 'Démolition', questions: C.demolition('sdb') },
    {
      title: 'Ventilation',
      questions: [
        F.flat('sdb-ventilateur', 'Installer un ventilateur de salle de bain', R.ventMo, R.ventMat),
        q('sdb-sortie-vent', 'Faire une nouvelle sortie pour le ventilateur',
          [{ name: 'type', label: 'Type de sortie à faire', type: 'select', options: ['Entretoit', 'Mur', 'Direct'] }],
          (a) => [{ description: `Nouvelle sortie de ventilateur (${a.type || 'entretoit'})`, qty: 1, unit: 'forfait', unitMat: R.sortieVentMat, unitLabor: R.sortieVentMo }]),
        q('sdb-deplacer-vent', 'Déplacer le ventilateur',
          [
            { name: 'acces', label: 'Accès pour déplacer la sortie', type: 'select', options: ['Facile', 'Moyen', 'Difficile'] },
            { name: 'rev', label: 'Type de revêtement', type: 'text' },
          ],
          (a) => [{
            description: `Déplacer le ventilateur (accès ${(a.acces || 'moyen').toLowerCase()})`,
            qty: 1, unit: 'forfait', unitMat: R.deplVentMat,
            unitLabor: a.acces === 'Facile' ? R.deplVentFacile : a.acces === 'Difficile' ? R.deplVentDifficile : R.deplVentMoyen,
          }]),
        F.timeMat('sdb-boucher-sortie', 'Boucher la vieille sortie du ventilateur', 1, 20),
        F.flat('sdb-urethane', "Boucher la vieille sortie du ventilateur avec de l'uréthane", R.ureMo, R.ureMat),
        q('sdb-reparer-revetement', "Réparer le revêtement extérieur de l'ancienne sortie",
          [
            { name: 'hrs', label: 'Temps alloué', type: 'number', unit: 'hrs', default: 1 },
            { name: 'fourniture', label: 'Fourniture du revêtement', type: 'select', options: ['Par nous', 'Par client'] },
          ],
          (a) => [{ description: `Réparer le revêtement extérieur (fourniture ${(a.fourniture || 'par nous').toLowerCase()})`, qty: 1, unit: 'forfait', unitMat: a.fourniture === 'Par client' ? 0 : R.reparRevMat, unitLabor: (a.hrs || 0) * R.laborRate }]),
      ],
    },
    { title: 'Construction & Murs', questions: C.construction('sdb') },
    {
      title: 'Céramique & Revêtements',
      questions: [
        q('sdb-dosseret', 'Faire la pose de la céramique entre les armoires',
          [
            { name: 'surface', label: 'Surface à faire en céramique', type: 'select', options: ['Dosseret', 'Autre'] },
            { name: 'pc', label: 'Quantité de céramique à fournir', type: 'number', unit: 'pc', default: 0 },
          ],
          (a) => [
            { description: `Pose de céramique — ${(a.surface || 'dosseret').toLowerCase()}`, qty: Math.max(a.pc || 0, 1), unit: 'pc', unitMat: 0, unitLabor: R.dosseretPoseMo },
            ...(a.pc > 0 ? [{ description: 'Fournir la céramique (dosseret)', qty: a.pc, unit: 'pc', unitMat: R.ceramFournirDosseret, unitLabor: 0 }] : []),
          ]),
        q('sdb-ditra', 'Fournir et poser une membrane Ditraheat avec chauffage radiant',
          [
            { name: 'type', label: 'Type de membrane', type: 'select', options: ['Ditraheat', 'Autre'] },
            { name: 'pc', label: 'Superficie de membrane à poser', type: 'number', unit: 'pc', default: 144 },
          ],
          (a) => [{ description: `Membrane ${a.type || 'Ditraheat'} avec chauffage radiant`, qty: a.pc || 0, unit: 'pc', unitMat: R.ditraMat, unitLabor: R.ditraMo }]),
        q('sdb-ceramique-plancher', 'Faire la pose de la céramique sur le plancher',
          [
            { name: 'posePc', label: 'Céramique à poser', type: 'number', unit: 'pc', default: 100 },
            { name: 'fournirPc', label: 'Céramique à fournir', type: 'number', unit: 'pc', default: 0 },
            { name: 'autonivPc', label: 'Autoniveleur à mettre en place', type: 'number', unit: 'pc', default: 0 },
            { name: 'format', label: 'Format de la céramique', type: 'text' },
            { name: 'pose', label: 'Type de pose', type: 'text' },
          ],
          (a) => [
            { description: `Pose de céramique au plancher${a.format ? ` (${a.format}${a.pose ? `, ${a.pose}` : ''})` : ''}`, qty: a.posePc || 0, unit: 'pc', unitMat: R.ceramPlancherMat, unitLabor: R.ceramPlancherMo },
            ...(a.fournirPc > 0 ? [{ description: 'Fournir la céramique pour le plancher', qty: a.fournirPc, unit: 'pc', unitMat: R.ceramFournir, unitLabor: 0 }] : []),
            ...(a.autonivPc > 0 ? [{ description: 'Fournir et mettre en place un autoniveleur', qty: a.autonivPc, unit: 'pc', unitMat: R.autonivMat, unitLabor: R.autonivMo }] : []),
          ]),
        q('sdb-autre-plancher', 'Installer un autre type de revêtement de plancher',
          [
            { name: 'type', label: 'Type de revêtement', type: 'select', options: ['Planchettes de vinyle', 'Bois franc', 'Flottant', 'Autre'] },
            { name: 'pc', label: 'Superficie pour ce revêtement', type: 'number', unit: 'pc', default: 0 },
          ],
          (a) => [{ description: `Revêtement de plancher — ${(a.type || 'planchettes de vinyle').toLowerCase()}`, qty: a.pc || 0, unit: 'pc', unitMat: R.revPlancherMat, unitLabor: R.revPlancherMo }]),
        F.perPc('sdb-membrane-imper', "Fournir et installer de la membrane imperméabilisante sur les murs", R.membraneImperMat, R.membraneImperMo, 90),
        q('sdb-ceramique-murs', 'Faire la pose de la céramique sur les murs de la douche et du bain',
          [
            { name: 'posePc', label: 'Céramique à poser sur les murs', type: 'number', unit: 'pc', default: 90 },
            { name: 'fournirPc', label: 'Céramique à fournir', type: 'number', unit: 'pc', default: 0 },
          ],
          (a) => [
            { description: 'Pose de céramique — murs de douche et bain', qty: a.posePc || 0, unit: 'pc', unitMat: R.ceramPlancherMat, unitLabor: R.ceramMursMo },
            ...(a.fournirPc > 0 ? [{ description: 'Fournir la céramique pour les murs', qty: a.fournirPc, unit: 'pc', unitMat: R.ceramFournir, unitLabor: 0 }] : []),
          ]),
        F.flat('sdb-douche-ceramique', 'Faire une douche en céramique (complète)', R.doucheCeramMo, R.doucheCeramMat),
        F.amount('sdb-verre-sans-porte', 'Fournir et installer un verre de douche sans porte', 2000),
        q('sdb-verre-avec-porte', 'Fournir et installer un verre de douche avec porte',
          [
            { name: 'type', label: 'Type de porte', type: 'select', options: ['Battante', 'Coulissante'] },
            { name: 'amt', label: 'Montant', type: 'number', unit: '$', default: 2500 },
          ],
          (a) => [{ description: `Verre de douche avec porte ${(a.type || 'battante').toLowerCase()}`, qty: 1, unit: 'forfait', unitMat: a.amt || 0, unitLabor: R.verrePorteMo }]),
        F.perCount('sdb-alcove', 'Faire une alcôve dans la douche', R.alcoveMat, R.alcoveMo, 1, "Quantité d'alcôves"),
      ],
    },
    { title: 'Électricité', questions: C.electricite('sdb') },
    {
      title: 'Comptoir',
      questions: [F.info('sdb-comptoir', 'Type de comptoir', 'select', ['Stratifié', 'Granite', 'Quartz', 'Béton', 'Céramique', 'Autre'])],
    },
    {
      title: 'Plomberie & Finition',
      questions: C.finition('sdb', [
        F.flat('sdb-porte-escamotable', 'Fournir et installer une porte escamotable', R.porteEscamMo, R.porteEscamMat),
        F.flat('sdb-depl-lavabo', "Déplacer le drainage et l'alimentation du lavabo", R.deplDrainMo, R.deplDrainMat),
        F.flat('sdb-depl-bain', "Déplacer le drainage et l'alimentation du bain", R.deplDrainMo, R.deplDrainMat),
        F.flat('sdb-depl-toilette', "Déplacer le drainage et l'alimentation de la toilette", R.deplDrainMo, R.deplDrainMat),
        F.flat('sdb-depl-douche', "Déplacer le drainage et l'alimentation de la douche", R.deplDrainMo, R.deplDrainMat),
        F.flat('sdb-enl-drain-laveuse', "Enlever le drainage et l'alimentation de la laveuse", R.enlDrainLaveuse),
        F.perCount('sdb-inst-lavabo', 'Installer un lavabo', R.instLavaboMat, R.instLavaboMo, 1, 'Nombre de lavabos'),
        F.flat('sdb-inst-bain', 'Installer un bain', R.instBainMo, R.instBainMat),
        F.flat('sdb-inst-toilette', 'Installer une toilette', R.instToiletteMo, R.instToiletteMat),
        F.flat('sdb-inst-base-douche', 'Installer une base de douche en acrylique', R.instBaseMo, R.instBaseMat),
        F.flat('sdb-inst-robinet-laveuse', 'Installer le robinet de la laveuse', R.instRobinetMo, R.instRobinetMat),
        F.flat('sdb-inst-porte-douche', 'Installer une porte de douche', R.instPorteDoucheMo, R.instPorteDoucheMat),
      ]),
    },
  ]

  const CUISINE = [
    {
      title: 'Travaux généraux',
      questions: [
        F.timeMat('cui-protection-planchers', 'Protection des planchers', 6),
        F.timeMat('cui-anti-poussiere', 'Mur anti-poussière', 2, 45),
        F.timeMat('cui-porte-anti-poussiere', 'Porte sur mur anti-poussière', 1, 25),
        F.timeMat('cui-escaliers', 'Protection des escaliers', 2),
        q('cui-armoires-enl', 'Enlever les armoires',
          [
            { name: 'type', label: "Type d'armoires", type: 'select', options: ['Modules', 'Sur place'] },
            { name: 'hrs', label: 'Temps alloué pour enlever', type: 'number', unit: 'hrs', default: 6 },
            { name: 'hrsDechets', label: 'Temps pour sortir déchets jusque dans remorque', type: 'number', unit: 'hrs', default: 6 },
          ],
          (a) => [{ description: `Enlever les armoires (${a.type || 'modules'}) et en débarrasser`, qty: 1, unit: 'forfait', unitMat: 0, unitLabor: ((a.hrs || 0) + (a.hrsDechets || 0)) * R.laborRate }]),
        F.flat('cui-enl-evier', "Enlever l'évier par plombier et poser les caps sur tuyaux", R.enlEvier),
      ],
    },
    { title: 'Démolition', questions: C.demolition('cui', { couvrePc: 816, gypseMursPc: 600, gypsePlafondPc: 140 }) },
    {
      title: 'Hotte de cuisine',
      questions: [
        q('cui-sortie-hotte', 'Faire une nouvelle sortie pour hotte de cuisine',
          [{ name: 'type', label: 'Type de sortie à faire', type: 'select', options: ['Direct', 'Entretoit', 'Mur'] }],
          (a) => [{ description: `Nouvelle sortie de hotte (${(a.type || 'direct').toLowerCase()})`, qty: 1, unit: 'forfait', unitMat: R.sortieHotteMat, unitLabor: R.sortieHotteMo }]),
        q('cui-deplacer-hotte', 'Déplacer la sortie de la hotte de cuisine',
          [
            { name: 'acces', label: 'Accès pour déplacer la sortie', type: 'select', options: ['Facile', 'Moyen', 'Difficile'] },
            { name: 'rev', label: 'Type de revêtement', type: 'text' },
          ],
          (a) => [{
            description: `Déplacer la sortie de hotte (accès ${(a.acces || 'facile').toLowerCase()})`,
            qty: 1, unit: 'forfait', unitMat: R.deplHotteMat,
            unitLabor: a.acces === 'Difficile' ? R.deplHotteDifficile : a.acces === 'Moyen' ? R.deplHotteMoyen : R.deplHotteFacile,
          }]),
        F.timeMat('cui-boucher-hotte', 'Boucher la vieille sortie de la hotte', 1, 20),
        F.flat('cui-urethane', "Boucher la vieille sortie de hotte avec de l'uréthane", R.ureMo, R.ureMat),
        q('cui-reparer-revetement', "Réparer le revêtement extérieur à l'ancienne sortie",
          [
            { name: 'hrs', label: 'Temps alloué', type: 'number', unit: 'hrs', default: 1 },
            { name: 'fourniture', label: 'Fourniture du revêtement', type: 'select', options: ['Par nous', 'Par client'] },
          ],
          (a) => [{ description: `Réparer le revêtement extérieur (fourniture ${(a.fourniture || 'par nous').toLowerCase()})`, qty: 1, unit: 'forfait', unitMat: a.fourniture === 'Par client' ? 0 : R.reparRevMat, unitLabor: (a.hrs || 0) * R.laborRate }]),
      ],
    },
    { title: 'Construction & Murs', questions: C.construction('cui') },
    {
      title: 'Céramique & Planchers',
      questions: [
        q('cui-dosseret', 'Céramique entre les armoires',
          [
            { name: 'surface', label: 'Surface à faire en céramique', type: 'select', options: ['Dosseret', 'Autre'] },
            { name: 'pc', label: 'Quantité de céramique à fournir', type: 'number', unit: 'pc', default: 30 },
          ],
          (a) => [
            { description: `Pose de céramique — ${(a.surface || 'dosseret').toLowerCase()}`, qty: Math.max(a.pc || 0, 1), unit: 'pc', unitMat: 0, unitLabor: R.dosseretPoseMo },
            ...(a.pc > 0 ? [{ description: 'Fournir la céramique (dosseret)', qty: a.pc, unit: 'pc', unitMat: R.ceramFournirDosseret, unitLabor: 0 }] : []),
          ]),
        q('cui-membrane', 'Fournir et poser membrane sous céramique',
          [
            { name: 'type', label: 'Type de membrane', type: 'select', options: ['Insonorisante', 'Ditra', 'Autre'] },
            { name: 'pc', label: 'Superficie de membrane à poser', type: 'number', unit: 'pc', default: 252 },
          ],
          (a) => [{ description: `Membrane sous céramique (${(a.type || 'insonorisante').toLowerCase()})`, qty: a.pc || 0, unit: 'pc', unitMat: R.membraneSousCeramMat, unitLabor: R.membraneSousCeramMo }]),
        q('cui-ceramique-plancher', 'Céramique sur le plancher',
          [
            { name: 'posePc', label: 'Céramique au plancher à poser', type: 'number', unit: 'pc', default: 252 },
            { name: 'fournirPc', label: 'Céramique au plancher à fournir', type: 'number', unit: 'pc', default: 0 },
            { name: 'format', label: 'Format de céramique', type: 'text' },
            { name: 'pose', label: 'Type de pose', type: 'text' },
          ],
          (a) => [
            { description: `Pose de céramique au plancher${a.format ? ` (${a.format}${a.pose ? `, ${a.pose}` : ''})` : ''}`, qty: a.posePc || 0, unit: 'pc', unitMat: R.ceramPlancherMat, unitLabor: R.ceramPlancherMo },
            ...(a.fournirPc > 0 ? [{ description: 'Fournir la céramique pour le plancher', qty: a.fournirPc, unit: 'pc', unitMat: R.ceramFournir, unitLabor: 0 }] : []),
          ]),
        q('cui-autre-plancher', 'Autre type de revêtement de plancher',
          [
            { name: 'type', label: 'Type de revêtement', type: 'select', options: ['Bois franc', 'Planchettes de vinyle', 'Flottant', 'Autre'] },
            { name: 'pc', label: 'Superficie pour ce revêtement', type: 'number', unit: 'pc', default: 564 },
          ],
          (a) => [{ description: `Revêtement de plancher — ${(a.type || 'bois franc').toLowerCase()}`, qty: a.pc || 0, unit: 'pc', unitMat: R.revPlancherMat, unitLabor: R.revPlancherMo }]),
      ],
    },
    {
      title: 'Électricité',
      questions: C.electricite('cui', [
        F.perCount('cui-sorties-tel', 'Nouvelles sorties de téléphone', R.pointElecMat, R.pointElecMo, 1, 'Nombre de sorties'),
        F.perCount('cui-sorties-cable', 'Nouvelles sorties de câble', R.pointElecMat, R.pointElecMo, 1, 'Nombre de sorties'),
      ]),
    },
    {
      title: 'Comptoir',
      questions: [
        F.info('cui-comptoir', 'Type de comptoir', 'select', ['Stratifié', 'Granite', 'Quartz', 'Béton', 'Céramique', 'Autre']),
        F.flat('cui-evier-temporaire', 'Fournir un évier temporaire durant les travaux', R.evierTempMo, R.evierTempMat),
      ],
    },
    {
      title: 'Plomberie & Finition',
      questions: C.finition('cui', [
        F.flat('cui-depl-evier', "Déplacer le drainage et l'alimentation de l'évier", R.deplDrainMo, R.deplDrainMat),
        F.flat('cui-inst-evier', "Installer l'évier", R.instEvierMo, R.instEvierMat),
        F.flat('cui-inst-broyeur', 'Installer le broyeur', R.instBroyeurMo, R.instBroyeurMat),
        F.flat('cui-inst-lave-vaisselle', 'Installer le lave-vaisselle', R.instLVMo, R.instLVMat),
        F.flat('cui-inst-hotte', 'Installer la hotte de cuisine', R.instHotteMo, R.instHotteMat),
      ]),
    },
  ]

  const GENERIQUE = [
    {
      title: 'Travaux généraux',
      questions: [
        F.timeMat('gen-protection-planchers', 'Protection des planchers', 2),
        F.timeMat('gen-anti-poussiere', 'Mur anti-poussière (polythène)', 2, 45),
        F.timeMat('gen-escaliers', 'Protection des escaliers', 2),
      ],
    },
    { title: 'Démolition', questions: C.demolition('gen') },
    { title: 'Construction & Murs', questions: C.construction('gen') },
    {
      title: 'Planchers',
      questions: [
        q('gen-plancher', 'Nouveau revêtement de plancher',
          [
            { name: 'type', label: 'Type de revêtement', type: 'select', options: ['Planchettes de vinyle', 'Bois franc', 'Flottant', 'Céramique', 'Tapis'] },
            { name: 'pc', label: 'Superficie', type: 'number', unit: 'pc', default: 150 },
          ],
          (a) => [{
            description: `Revêtement de plancher — ${(a.type || 'planchettes de vinyle').toLowerCase()}`,
            qty: a.pc || 0, unit: 'pc',
            unitMat: a.type === 'Céramique' ? R.genCeramMat : a.type === 'Bois franc' ? R.genBoisMat : R.genVinyleMat,
            unitLabor: a.type === 'Céramique' ? R.genCeramMo : R.genVinyleMo,
          }]),
      ],
    },
    { title: 'Électricité', questions: C.electricite('gen') },
    { title: 'Finition', questions: C.finition('gen') },
  ]

  return { SDB, CUISINE, GENERIQUE }
}

// Sélection du questionnaire selon le nom / type de la pièce
export function questionnaireForRoom(room, rates = defaultRates()) {
  const R = { ...defaultRates(), ...rates }
  const set = buildQuestionnaires(R)
  const name = `${room?.baseName || ''} ${room?.name || ''}`.toLowerCase()
  if (name.includes('bain') || name.includes('lavage')) return { title: 'Salle de bain', sections: set.SDB }
  if (name.includes('cuisine')) return { title: 'Cuisine', sections: set.CUISINE }
  return { title: 'Pièce standard', sections: set.GENERIQUE }
}
