// Questionnaires d'estimation détaillés par type de pièce, transcrits des
// formulaires papier fournis (« Soumission pour salle de bain » et
// « Soumission pour cuisine ») : chaque travail possible est une question
// Oui/Non avec ses champs (temps alloué, coûts matériel, superficie en pc,
// longueur en pl, nombre) et génère les lignes du devis correspondantes.
//
// Unités : pc = pied carré, pl = pied linéaire, ch = chaque, hrs = heures.
// La main-d'œuvre horaire est calculée au taux ci-dessous (modifiable ensuite
// ligne par ligne avec le crayon).

export const LABOR_RATE = 65 // $ / heure

// ─── Fabriques de questions ───────────────────────────────────────────────────
const q = (id, label, inputs, lines, extra = {}) => ({ id, label, inputs, lines, ...extra })

// Temps (hrs) + coûts matériel ($) → ligne forfait
const timeMat = (id, label, defH = 1, defM = 0) =>
  q(id, label,
    [
      { name: 'hrs', label: 'Temps alloué', type: 'number', unit: 'hrs', default: defH },
      ...(defM > 0 ? [{ name: 'mat', label: 'Coûts matériel', type: 'number', unit: '$', default: defM }] : []),
    ],
    (a) => [{ description: label, qty: 1, unit: 'forfait', unitMat: a.mat || 0, unitLabor: (a.hrs || 0) * LABOR_RATE }])

// Oui/Non simple à prix fixe
const flat = (id, label, labor, mat = 0) =>
  q(id, label, [],
    () => [{ description: label, qty: 1, unit: 'forfait', unitMat: mat, unitLabor: labor }])

// Superficie en pieds carrés
const perPc = (id, label, matRate, laborRate, defPc = 0, pcLabel = 'Superficie') =>
  q(id, label,
    [{ name: 'pc', label: pcLabel, type: 'number', unit: 'pc', default: defPc }],
    (a) => [{ description: label, qty: a.pc || 0, unit: 'pc', unitMat: matRate, unitLabor: laborRate }])

// Longueur en pieds linéaires
const perPl = (id, label, matRate, laborRate, defPl = 0, plLabel = 'Quantité') =>
  q(id, label,
    [{ name: 'pl', label: plLabel, type: 'number', unit: 'pl', default: defPl }],
    (a) => [{ description: label, qty: a.pl || 0, unit: 'pl', unitMat: matRate, unitLabor: laborRate }])

// Nombre d'unités
const perCount = (id, label, matUnit, laborUnit, defN = 1, nLabel = 'Nombre') =>
  q(id, label,
    [{ name: 'n', label: nLabel, type: 'number', unit: 'ch', default: defN }],
    (a) => [{ description: label, qty: a.n || 0, unit: 'unité', unitMat: matUnit, unitLabor: laborUnit }])

// Montant direct (allocation, verre de douche…)
const amount = (id, label, defA = 0) =>
  q(id, label,
    [{ name: 'amt', label: 'Montant', type: 'number', unit: '$', default: defA }],
    (a) => (a.amt > 0 ? [{ description: label, qty: 1, unit: 'forfait', unitMat: a.amt, unitLabor: 0 }] : []))

// Question d'information (aucune ligne — ajoutée aux notes du devis)
const info = (id, label, type = 'text', options = null) =>
  q(id, label,
    [{ name: 'val', label, type, options }],
    () => [], { infoOnly: true })

// ─── Sections communes ────────────────────────────────────────────────────────
const sectionsCommunes = {
  demolition: (prefix, defaults = {}) => [
    q(`${prefix}-couvre-plancher`, 'Enlever le couvre-plancher existant',
      [
        { name: 'type', label: 'Type de couvre-plancher', type: 'select', options: ['Céramique', 'Bois franc', 'Flottant', 'Vinyle', 'Tapis'] },
        { name: 'pc', label: 'Superficie à enlever', type: 'number', unit: 'pc', default: defaults.couvrePc ?? 100 },
        { name: 'rangs', label: 'Nombre de rangs à enlever', type: 'number', unit: 'rangs', default: 1 },
      ],
      (a) => [{ description: `Enlever le couvre-plancher existant (${a.type || 'céramique'})`, qty: a.pc || 0, unit: 'pc', unitMat: 0, unitLabor: 1.1 }]),
    perPc(`${prefix}-contreplaque-enl`, "Enlever le ou les contre-plaqués jusqu'à la structure", 0, 1.0, defaults.veneerPc ?? 100),
    perPc(`${prefix}-gypse-murs-enl`, 'Enlever le gypse sur les murs aux endroits touchés', 0, 1.2, defaults.gypseMursPc ?? 320),
    perPc(`${prefix}-gypse-plafond-enl`, 'Enlever le gypse du plafond aux endroits touchés', 0, 1.4, defaults.gypsePlafondPc ?? 100),
    perPl(`${prefix}-division-demolir`, 'Défaire une division en bois', 0, 15, 8, 'Longueur de mur à démolir'),
    perPc(`${prefix}-contreplaque-pose`, 'Poser un contre-plaqué 3/8 BC FIR sélect sur le plancher, vissé au 4" c/c', 1.4, 1.4, 100),
    info(`${prefix}-entretoit`, "Accès à l'entretoît", 'select', ['Facile ou non applicable', 'Moyen', 'Difficile']),
  ],
  construction: (prefix) => [
    perPl(`${prefix}-division-neuve`, 'Faire une nouvelle division en bois', 12, 22, 0, 'Longueur de mur à construire'),
    timeMat(`${prefix}-fond-clouage`, 'Installer un fond de clouage', 3, 50),
    perPc(`${prefix}-gypse-neuf`, 'Fournir et installer du nouveau gypse aux endroits touchés', 0.85, 1.7, 420),
    perPc(`${prefix}-bois-murs`, 'Fournir et installer du bois sur les murs', 3, 2, 0),
    q(`${prefix}-autre-revetement-murs`, 'Autre revêtement sur les murs',
      [
        { name: 'pose', label: 'Coûts pour cet autre revêtement — pose', type: 'number', unit: '$', default: 0 },
        { name: 'mat', label: 'Coûts pour cet autre revêtement — matériel', type: 'number', unit: '$', default: 0 },
      ],
      (a) => [{ description: 'Autre revêtement sur les murs', qty: 1, unit: 'forfait', unitMat: a.mat || 0, unitLabor: a.pose || 0 }]),
    perPc(`${prefix}-joints`, 'Faire le tirage des joints de gypse prêt pour la peinture', 0.15, 1.1, 600),
    q(`${prefix}-peinture`, 'Peindre murs, plafonds, portes et moulures — 2 couleurs (peinture incluse)',
      [
        { name: 'pc', label: 'Peinture gypse : superficie', type: 'number', unit: 'pc', default: 420 },
        { name: 'portes', label: 'Nombre de portes à peindre', type: 'number', unit: 'ch', default: 0 },
      ],
      (a) => [
        { description: 'Peinture murs et plafonds — 2 couleurs (peinture incluse)', qty: a.pc || 0, unit: 'pc', unitMat: 0.33, unitLabor: 0.65 },
        ...(a.portes > 0 ? [{ description: 'Peinture des portes', qty: a.portes, unit: 'unité', unitMat: 10, unitLabor: 50 }] : []),
      ]),
  ],
  electricite: (prefix, extras = []) => [
    info(`${prefix}-chauffage-type`, 'Préciser le type de chauffage'),
    perCount(`${prefix}-prises-deplacer`, 'Prises électriques à déplacer', 25, 95, 1, 'Nombre de prises'),
    perCount(`${prefix}-lumieres-deplacer`, 'Lumières à déplacer', 25, 95, 1, 'Nombre de lumières'),
    perCount(`${prefix}-lumieres-encastrees`, 'Lumières encastrées à poser', 65, 55, 1, 'Nombre de lumières'),
    ...extras,
    flat(`${prefix}-chauffage-modifier`, 'Chauffage à modifier', 195),
    q(`${prefix}-chauffage-ajout`, 'Ajout de chauffage',
      [
        { name: 'type', label: 'Type de chauffage à ajouter', type: 'text' },
        { name: 'cout', label: 'Coût du chauffage', type: 'number', unit: '$', default: 0 },
      ],
      (a) => [{ description: `Ajout de chauffage${a.type ? ` (${a.type})` : ''}`, qty: 1, unit: 'forfait', unitMat: a.cout || 0, unitLabor: 2 * LABOR_RATE }]),
    amount(`${prefix}-elec-allocation`, 'Électricité — allocation (électricien licencié)', 0),
  ],
  finition: (prefix, extras = []) => [
    q(`${prefix}-plinthes-bois`, 'Fournir et installer de la plinthe de bois au plancher',
      [
        { name: 'type', label: 'Type de plinthes de bois', type: 'text' },
        { name: 'pl', label: 'Quantité de plinthes à poser', type: 'number', unit: 'pl', default: 48 },
      ],
      (a) => [{ description: `Plinthes de bois au plancher${a.type ? ` (${a.type})` : ''}`, qty: a.pl || 0, unit: 'pl', unitMat: 2, unitLabor: 2 }]),
    perPl(`${prefix}-plinthes-ceramique`, 'Fournir et installer de la plinthe de céramique au plancher', 4, 5, 0),
    q(`${prefix}-chambranles`, 'Fournir et installer des chambranles pour la porte et fenêtre',
      [
        { name: 'type', label: 'Type de chambranles', type: 'text' },
        { name: 'pl', label: 'Quantité de chambranles à poser', type: 'number', unit: 'pl', default: 40 },
      ],
      (a) => [{ description: `Chambranles pour portes et fenêtres${a.type ? ` (${a.type})` : ''}`, qty: a.pl || 0, unit: 'pl', unitMat: 2.5, unitLabor: 2.5 }]),
    q(`${prefix}-soufflage`, 'Fournir et installer du soufflage à la fenêtre',
      [
        { name: 'type', label: 'Type de soufflage', type: 'select', options: ['PVC', 'Bois'] },
        { name: 'pl', label: 'Quantité de soufflage de fenêtres', type: 'number', unit: 'pl', default: 0 },
      ],
      (a) => [{ description: `Soufflage de fenêtre (${a.type || 'PVC'})`, qty: a.pl || 0, unit: 'pl', unitMat: 2, unitLabor: 3 }]),
    q(`${prefix}-ogee`, 'Ogee ou cimaise',
      [
        { name: 'type', label: 'Type de OGEE ou cimaise', type: 'text' },
        { name: 'pl', label: 'Quantité à poser', type: 'number', unit: 'pl', default: 0 },
      ],
      (a) => [{ description: `Ogee ou cimaise${a.type ? ` (${a.type})` : ''}`, qty: a.pl || 0, unit: 'pl', unitMat: 1.5, unitLabor: 2 }]),
    ...extras,
    q(`${prefix}-menage`, 'Finition finale et ménage',
      [{ name: 'hrs', label: 'Temps alloué', type: 'number', unit: 'hrs', default: 4 }],
      (a) => [{ description: 'Finition finale et ménage', qty: 1, unit: 'forfait', unitMat: 15, unitLabor: (a.hrs || 0) * LABOR_RATE }]),
    amount(`${prefix}-gestion`, 'Frais de gestion', 0),
    q(`${prefix}-autres`, 'Autres travaux',
      [
        { name: 'desc', label: 'Description des travaux additionnels', type: 'text' },
        { name: 'amt', label: 'Montant alloué', type: 'number', unit: '$', default: 0 },
      ],
      (a) => (a.amt > 0 ? [{ description: a.desc || 'Autres travaux', qty: 1, unit: 'forfait', unitMat: a.amt, unitLabor: 0 }] : [])),
  ],
}

// ─── SALLE DE BAIN ────────────────────────────────────────────────────────────
export const QUESTIONNAIRE_SDB = [
  {
    title: 'Travaux généraux',
    questions: [
      timeMat('sdb-protection-planchers', 'Faire la protection des planchers', 2),
      timeMat('sdb-polythene', 'Faire des murs avec des polythènes pour isoler la zone', 2, 45),
      timeMat('sdb-zipper', 'Fournir et installer un zipper dans le polythène pour permettre le passage', 1, 25),
      timeMat('sdb-escaliers', 'Protéger les escaliers', 2),
      q('sdb-armoires-enl', 'Enlever les armoires et en débarrasser',
        [
          { name: 'type', label: "Type d'armoires", type: 'select', options: ['Modules', 'Encastrées'] },
          { name: 'hrs', label: 'Temps alloué pour enlever', type: 'number', unit: 'hrs', default: 4 },
          { name: 'hrsDechets', label: 'Temps pour sortir déchets jusque dans remorque', type: 'number', unit: 'hrs', default: 4 },
        ],
        (a) => [{ description: `Enlever les armoires (${a.type || 'modules'}) et en débarrasser`, qty: 1, unit: 'forfait', unitMat: 0, unitLabor: ((a.hrs || 0) + (a.hrsDechets || 0)) * LABOR_RATE }]),
      flat('sdb-enl-toilette', 'Enlever la toilette et poser des caps sur les tuyaux', 95),
      flat('sdb-enl-bain', 'Enlever le bain et poser des caps sur les tuyaux', 160),
      flat('sdb-enl-douche', 'Enlever la douche et poser des caps sur les tuyaux', 160),
      flat('sdb-enl-lavabo', 'Enlever le lavabo et poser des caps sur les tuyaux', 95),
      flat('sdb-enl-laveuse', 'Enlever la laveuse et poser des caps sur les tuyaux', 95),
    ],
  },
  {
    title: 'Démolition',
    questions: sectionsCommunes.demolition('sdb'),
  },
  {
    title: 'Ventilation',
    questions: [
      flat('sdb-ventilateur', 'Installer un ventilateur de salle de bain', 120, 180),
      q('sdb-sortie-vent', 'Faire une nouvelle sortie pour le ventilateur',
        [{ name: 'type', label: 'Type de sortie à faire', type: 'select', options: ['Entretoit', 'Mur', 'Direct'] }],
        (a) => [{ description: `Nouvelle sortie de ventilateur (${a.type || 'entretoit'})`, qty: 1, unit: 'forfait', unitMat: 60, unitLabor: 190 }]),
      q('sdb-deplacer-vent', 'Déplacer le ventilateur',
        [
          { name: 'acces', label: 'Accès pour déplacer la sortie', type: 'select', options: ['Facile', 'Moyen', 'Difficile'] },
          { name: 'rev', label: 'Type de revêtement', type: 'text' },
        ],
        (a) => [{
          description: `Déplacer le ventilateur (accès ${(a.acces || 'moyen').toLowerCase()})`,
          qty: 1, unit: 'forfait', unitMat: 40,
          unitLabor: a.acces === 'Facile' ? 190 : a.acces === 'Difficile' ? 450 : 320,
        }]),
      timeMat('sdb-boucher-sortie', 'Boucher la vieille sortie du ventilateur', 1, 20),
      flat('sdb-urethane', "Boucher la vieille sortie du ventilateur avec de l'uréthane", 35, 15),
      q('sdb-reparer-revetement', "Réparer le revêtement extérieur de l'ancienne sortie",
        [
          { name: 'hrs', label: 'Temps alloué', type: 'number', unit: 'hrs', default: 1 },
          { name: 'fourniture', label: 'Fourniture du revêtement', type: 'select', options: ['Par nous', 'Par client'] },
        ],
        (a) => [{ description: `Réparer le revêtement extérieur (fourniture ${(a.fourniture || 'par nous').toLowerCase()})`, qty: 1, unit: 'forfait', unitMat: a.fourniture === 'Par client' ? 0 : 45, unitLabor: (a.hrs || 0) * LABOR_RATE }]),
    ],
  },
  {
    title: 'Construction & Murs',
    questions: sectionsCommunes.construction('sdb'),
  },
  {
    title: 'Céramique & Revêtements',
    questions: [
      q('sdb-dosseret', 'Faire la pose de la céramique entre les armoires',
        [
          { name: 'surface', label: 'Surface à faire en céramique', type: 'select', options: ['Dosseret', 'Autre'] },
          { name: 'pc', label: 'Quantité de céramique à fournir', type: 'number', unit: 'pc', default: 0 },
        ],
        (a) => [
          { description: `Pose de céramique — ${(a.surface || 'dosseret').toLowerCase()}`, qty: Math.max(a.pc || 0, 1), unit: 'pc', unitMat: 0, unitLabor: 6 },
          ...(a.pc > 0 ? [{ description: 'Fournir la céramique (dosseret)', qty: a.pc, unit: 'pc', unitMat: 7, unitLabor: 0 }] : []),
        ]),
      q('sdb-ditra', 'Fournir et poser une membrane Ditraheat avec chauffage radiant',
        [
          { name: 'type', label: 'Type de membrane', type: 'select', options: ['Ditraheat', 'Autre'] },
          { name: 'pc', label: 'Superficie de membrane à poser', type: 'number', unit: 'pc', default: 144 },
        ],
        (a) => [{ description: `Membrane ${a.type || 'Ditraheat'} avec chauffage radiant`, qty: a.pc || 0, unit: 'pc', unitMat: 8, unitLabor: 3 }]),
      q('sdb-ceramique-plancher', 'Faire la pose de la céramique sur le plancher',
        [
          { name: 'posePc', label: 'Céramique à poser', type: 'number', unit: 'pc', default: 100 },
          { name: 'fournirPc', label: 'Céramique à fournir', type: 'number', unit: 'pc', default: 0 },
          { name: 'autonivPc', label: 'Autoniveleur à mettre en place', type: 'number', unit: 'pc', default: 0 },
          { name: 'format', label: 'Format de la céramique', type: 'text' },
          { name: 'pose', label: 'Type de pose', type: 'text' },
        ],
        (a) => [
          { description: `Pose de céramique au plancher${a.format ? ` (${a.format}${a.pose ? `, ${a.pose}` : ''})` : ''}`, qty: a.posePc || 0, unit: 'pc', unitMat: 0.5, unitLabor: 4.5 },
          ...(a.fournirPc > 0 ? [{ description: 'Fournir la céramique pour le plancher', qty: a.fournirPc, unit: 'pc', unitMat: 5, unitLabor: 0 }] : []),
          ...(a.autonivPc > 0 ? [{ description: 'Fournir et mettre en place un autoniveleur', qty: a.autonivPc, unit: 'pc', unitMat: 1.2, unitLabor: 0.8 }] : []),
        ]),
      q('sdb-autre-plancher', 'Installer un autre type de revêtement de plancher',
        [
          { name: 'type', label: 'Type de revêtement', type: 'select', options: ['Planchettes de vinyle', 'Bois franc', 'Flottant', 'Autre'] },
          { name: 'pc', label: 'Superficie pour ce revêtement', type: 'number', unit: 'pc', default: 0 },
        ],
        (a) => [{ description: `Revêtement de plancher — ${(a.type || 'planchettes de vinyle').toLowerCase()}`, qty: a.pc || 0, unit: 'pc', unitMat: 3.5, unitLabor: 1.3 }]),
      perPc('sdb-membrane-imper', "Fournir et installer de la membrane imperméabilisante sur les murs", 1.7, 2, 90),
      q('sdb-ceramique-murs', 'Faire la pose de la céramique sur les murs de la douche et du bain',
        [
          { name: 'posePc', label: 'Céramique à poser sur les murs', type: 'number', unit: 'pc', default: 90 },
          { name: 'fournirPc', label: 'Céramique à fournir', type: 'number', unit: 'pc', default: 0 },
        ],
        (a) => [
          { description: 'Pose de céramique — murs de douche et bain', qty: a.posePc || 0, unit: 'pc', unitMat: 0.5, unitLabor: 5 },
          ...(a.fournirPc > 0 ? [{ description: 'Fournir la céramique pour les murs', qty: a.fournirPc, unit: 'pc', unitMat: 5, unitLabor: 0 }] : []),
        ]),
      flat('sdb-douche-ceramique', 'Faire une douche en céramique (complète)', 2800, 2200),
      amount('sdb-verre-sans-porte', 'Fournir et installer un verre de douche sans porte', 2000),
      q('sdb-verre-avec-porte', 'Fournir et installer un verre de douche avec porte',
        [
          { name: 'type', label: 'Type de porte', type: 'select', options: ['Battante', 'Coulissante'] },
          { name: 'amt', label: 'Montant', type: 'number', unit: '$', default: 2500 },
        ],
        (a) => [{ description: `Verre de douche avec porte ${(a.type || 'battante').toLowerCase()}`, qty: 1, unit: 'forfait', unitMat: a.amt || 0, unitLabor: 160 }]),
      perCount('sdb-alcove', 'Faire une alcôve dans la douche', 60, 190, 1, "Quantité d'alcôves"),
    ],
  },
  {
    title: 'Électricité',
    questions: sectionsCommunes.electricite('sdb'),
  },
  {
    title: 'Comptoir',
    questions: [
      info('sdb-comptoir', 'Type de comptoir', 'select', ['Stratifié', 'Quartz', 'Granit', 'Bois']),
    ],
  },
  {
    title: 'Plomberie & Finition',
    questions: sectionsCommunes.finition('sdb', [
      flat('sdb-porte-escamotable', 'Fournir et installer une porte escamotable', 260, 190),
      flat('sdb-depl-lavabo', "Déplacer le drainage et l'alimentation du lavabo", 380, 220),
      flat('sdb-depl-bain', "Déplacer le drainage et l'alimentation du bain", 380, 220),
      flat('sdb-depl-toilette', "Déplacer le drainage et l'alimentation de la toilette", 380, 220),
      flat('sdb-depl-douche', "Déplacer le drainage et l'alimentation de la douche", 380, 220),
      flat('sdb-enl-drain-laveuse', "Enlever le drainage et l'alimentation de la laveuse", 190),
      perCount('sdb-inst-lavabo', 'Installer un lavabo', 30, 150, 1, 'Nombre de lavabos'),
      flat('sdb-inst-bain', 'Installer un bain', 60, 390),
      flat('sdb-inst-toilette', 'Installer une toilette', 25, 155),
      flat('sdb-inst-base-douche', 'Installer une base de douche en acrylique', 50, 350),
      flat('sdb-inst-robinet-laveuse', 'Installer le robinet de la laveuse', 30, 150),
      flat('sdb-inst-porte-douche', 'Installer une porte de douche', 20, 230),
    ]),
  },
]

// ─── CUISINE ──────────────────────────────────────────────────────────────────
export const QUESTIONNAIRE_CUISINE = [
  {
    title: 'Travaux généraux',
    questions: [
      timeMat('cui-protection-planchers', 'Protection des planchers', 6),
      timeMat('cui-anti-poussiere', 'Mur anti-poussière', 2, 45),
      timeMat('cui-porte-anti-poussiere', 'Porte sur mur anti-poussière', 1, 25),
      timeMat('cui-escaliers', 'Protection des escaliers', 2),
      q('cui-armoires-enl', 'Enlever les armoires',
        [
          { name: 'type', label: "Type d'armoires", type: 'select', options: ['Modules', 'Encastrées'] },
          { name: 'hrs', label: 'Temps alloué pour enlever', type: 'number', unit: 'hrs', default: 6 },
          { name: 'hrsDechets', label: 'Temps pour sortir déchets jusque dans remorque', type: 'number', unit: 'hrs', default: 6 },
        ],
        (a) => [{ description: `Enlever les armoires (${a.type || 'modules'}) et en débarrasser`, qty: 1, unit: 'forfait', unitMat: 0, unitLabor: ((a.hrs || 0) + (a.hrsDechets || 0)) * LABOR_RATE }]),
      flat('cui-enl-evier', "Enlever l'évier par plombier et poser les caps sur tuyaux", 160),
    ],
  },
  {
    title: 'Démolition',
    questions: sectionsCommunes.demolition('cui', { couvrePc: 816, gypseMursPc: 600, gypsePlafondPc: 140 }),
  },
  {
    title: 'Hotte de cuisine',
    questions: [
      q('cui-sortie-hotte', 'Faire une nouvelle sortie pour hotte de cuisine',
        [{ name: 'type', label: 'Type de sortie à faire', type: 'select', options: ['Direct', 'Entretoit', 'Mur'] }],
        (a) => [{ description: `Nouvelle sortie de hotte (${(a.type || 'direct').toLowerCase()})`, qty: 1, unit: 'forfait', unitMat: 80, unitLabor: 270 }]),
      q('cui-deplacer-hotte', 'Déplacer la sortie de la hotte de cuisine',
        [
          { name: 'acces', label: 'Accès pour déplacer la sortie', type: 'select', options: ['Facile', 'Moyen', 'Difficile'] },
          { name: 'rev', label: 'Type de revêtement', type: 'text' },
        ],
        (a) => [{
          description: `Déplacer la sortie de hotte (accès ${(a.acces || 'facile').toLowerCase()})`,
          qty: 1, unit: 'forfait', unitMat: 60,
          unitLabor: a.acces === 'Difficile' ? 520 : a.acces === 'Moyen' ? 390 : 260,
        }]),
      timeMat('cui-boucher-hotte', 'Boucher la vieille sortie de la hotte', 1, 20),
      flat('cui-urethane', "Boucher la vieille sortie de hotte avec de l'uréthane", 35, 15),
      q('cui-reparer-revetement', "Réparer le revêtement extérieur à l'ancienne sortie",
        [
          { name: 'hrs', label: 'Temps alloué', type: 'number', unit: 'hrs', default: 1 },
          { name: 'fourniture', label: 'Fourniture du revêtement', type: 'select', options: ['Par nous', 'Par client'] },
        ],
        (a) => [{ description: `Réparer le revêtement extérieur (fourniture ${(a.fourniture || 'par nous').toLowerCase()})`, qty: 1, unit: 'forfait', unitMat: a.fourniture === 'Par client' ? 0 : 45, unitLabor: (a.hrs || 0) * LABOR_RATE }]),
    ],
  },
  {
    title: 'Construction & Murs',
    questions: sectionsCommunes.construction('cui'),
  },
  {
    title: 'Céramique & Planchers',
    questions: [
      q('cui-dosseret', 'Céramique entre les armoires',
        [
          { name: 'surface', label: 'Surface à faire en céramique', type: 'select', options: ['Dosseret', 'Autre'] },
          { name: 'pc', label: 'Quantité de céramique à fournir', type: 'number', unit: 'pc', default: 30 },
        ],
        (a) => [
          { description: `Pose de céramique — ${(a.surface || 'dosseret').toLowerCase()}`, qty: Math.max(a.pc || 0, 1), unit: 'pc', unitMat: 0, unitLabor: 6 },
          ...(a.pc > 0 ? [{ description: 'Fournir la céramique (dosseret)', qty: a.pc, unit: 'pc', unitMat: 7, unitLabor: 0 }] : []),
        ]),
      q('cui-membrane', 'Fournir et poser membrane sous céramique',
        [
          { name: 'type', label: 'Type de membrane', type: 'select', options: ['Insonorisante', 'Ditra', 'Autre'] },
          { name: 'pc', label: 'Superficie de membrane à poser', type: 'number', unit: 'pc', default: 252 },
        ],
        (a) => [{ description: `Membrane sous céramique (${(a.type || 'insonorisante').toLowerCase()})`, qty: a.pc || 0, unit: 'pc', unitMat: 2, unitLabor: 1 }]),
      q('cui-ceramique-plancher', 'Céramique sur le plancher',
        [
          { name: 'posePc', label: 'Céramique au plancher à poser', type: 'number', unit: 'pc', default: 252 },
          { name: 'fournirPc', label: 'Céramique au plancher à fournir', type: 'number', unit: 'pc', default: 0 },
          { name: 'format', label: 'Format de céramique', type: 'text' },
          { name: 'pose', label: 'Type de pose', type: 'text' },
        ],
        (a) => [
          { description: `Pose de céramique au plancher${a.format ? ` (${a.format}${a.pose ? `, ${a.pose}` : ''})` : ''}`, qty: a.posePc || 0, unit: 'pc', unitMat: 0.5, unitLabor: 4.5 },
          ...(a.fournirPc > 0 ? [{ description: 'Fournir la céramique pour le plancher', qty: a.fournirPc, unit: 'pc', unitMat: 5, unitLabor: 0 }] : []),
        ]),
      q('cui-autre-plancher', 'Autre type de revêtement de plancher',
        [
          { name: 'type', label: 'Type de revêtement', type: 'select', options: ['Bois franc', 'Planchettes de vinyle', 'Flottant', 'Autre'] },
          { name: 'pc', label: 'Superficie pour ce revêtement', type: 'number', unit: 'pc', default: 564 },
        ],
        (a) => [{ description: `Revêtement de plancher — ${(a.type || 'bois franc').toLowerCase()}`, qty: a.pc || 0, unit: 'pc', unitMat: 3.5, unitLabor: 1.3 }]),
    ],
  },
  {
    title: 'Électricité',
    questions: sectionsCommunes.electricite('cui', [
      perCount('cui-sorties-tel', 'Nouvelles sorties de téléphone', 25, 95, 1, 'Nombre de sorties'),
      perCount('cui-sorties-cable', 'Nouvelles sorties de câble', 25, 95, 1, 'Nombre de sorties'),
    ]),
  },
  {
    title: 'Comptoir',
    questions: [
      info('cui-comptoir', 'Type de comptoir', 'select', ['Stratifié', 'Quartz', 'Granit', 'Bois']),
      flat('cui-evier-temporaire', 'Fournir un évier temporaire durant les travaux', 130, 60),
    ],
  },
  {
    title: 'Plomberie & Finition',
    questions: sectionsCommunes.finition('cui', [
      flat('cui-depl-evier', "Déplacer le drainage et l'alimentation de l'évier", 380, 220),
      flat('cui-inst-evier', "Installer l'évier", 50, 150),
      flat('cui-inst-broyeur', 'Installer le broyeur', 20, 130),
      flat('cui-inst-lave-vaisselle', 'Installer le lave-vaisselle', 20, 130),
      flat('cui-inst-hotte', 'Installer la hotte de cuisine', 30, 150),
    ]),
  },
]

// ─── PIÈCE GÉNÉRIQUE (chambre, salon, sous-sol…) ──────────────────────────────
export const QUESTIONNAIRE_GENERIQUE = [
  {
    title: 'Travaux généraux',
    questions: [
      timeMat('gen-protection-planchers', 'Protection des planchers', 2),
      timeMat('gen-anti-poussiere', 'Mur anti-poussière (polythène)', 2, 45),
      timeMat('gen-escaliers', 'Protection des escaliers', 2),
    ],
  },
  { title: 'Démolition', questions: sectionsCommunes.demolition('gen') },
  { title: 'Construction & Murs', questions: sectionsCommunes.construction('gen') },
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
          unitMat: a.type === 'Céramique' ? 5.5 : a.type === 'Bois franc' ? 8 : 3.5,
          unitLabor: a.type === 'Céramique' ? 4.5 : 1.3,
        }]),
    ],
  },
  { title: 'Électricité', questions: sectionsCommunes.electricite('gen') },
  { title: 'Finition', questions: sectionsCommunes.finition('gen') },
]

// Sélection du questionnaire selon le nom / type de la pièce
export function questionnaireForRoom(room) {
  const name = `${room?.baseName || ''} ${room?.name || ''}`.toLowerCase()
  if (name.includes('bain') || name.includes('lavage')) return { title: 'Salle de bain', sections: QUESTIONNAIRE_SDB }
  if (name.includes('cuisine')) return { title: 'Cuisine', sections: QUESTIONNAIRE_CUISINE }
  return { title: 'Pièce standard', sections: QUESTIONNAIRE_GENERIQUE }
}
