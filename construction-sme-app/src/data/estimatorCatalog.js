// Catalogue de travaux avec coûts unitaires matériaux + main-d'œuvre (QC, 2026)
// unitMat: coût matériaux par unité ($)
// unitLabor: coût main-d'œuvre par unité ($)
// autoQty: propriété de la pièce à utiliser pour la quantité automatique
// wasteFactor: facteur de perte/surplus (ex: 1.10 = +10%)

export const CATALOG = [
  // ─── Démolition ────────────────────────────────────────────────────────────
  {
    id: 'demo-murs', category: 'Démolition', label: 'Démolition — cloisons intérieures',
    unit: 'm²', autoQty: 'wallArea', unitMat: 0, unitLabor: 14, wasteFactor: 1,
    note: 'Inclut évacuation débris (benne sur place)',
  },
  {
    id: 'demo-plancher', category: 'Démolition', label: 'Démolition — revêtement de plancher',
    unit: 'm²', autoQty: 'floorArea', unitMat: 0, unitLabor: 8, wasteFactor: 1,
    note: 'Carrelage, parquet, vinyl — évacuation incluse',
  },
  {
    id: 'demo-plafond', category: 'Démolition', label: 'Démolition — plafond existant',
    unit: 'm²', autoQty: 'ceilArea', unitMat: 0, unitLabor: 12, wasteFactor: 1,
    note: 'Gypse ou tuiles acoustiques',
  },
  {
    id: 'demo-fenetres', category: 'Démolition', label: 'Dépose fenêtre existante',
    unit: 'unité', autoQty: null, unitMat: 0, unitLabor: 95, wasteFactor: 1,
    note: 'Inclut scellage temporaire',
  },
  {
    id: 'demo-portes', category: 'Démolition', label: 'Dépose porte intérieure',
    unit: 'unité', autoQty: null, unitMat: 0, unitLabor: 65, wasteFactor: 1,
    note: '',
  },

  // ─── Ossature ───────────────────────────────────────────────────────────────
  {
    id: 'ossature-metal', category: 'Ossature & Structure', label: 'Ossature métallique — murs (profils 3⅝")',
    unit: 'm²', autoQty: 'wallArea', unitMat: 9.50, unitLabor: 14, wasteFactor: 1.10,
    note: 'Inclut montants 16" o.c., lisses haut/bas',
  },
  {
    id: 'ossature-bois-2x4', category: 'Ossature & Structure', label: 'Ossature bois 2×4 — murs intérieurs',
    unit: 'm lin.', autoQty: 'perimeter', unitMat: 18, unitLabor: 22, wasteFactor: 1.10,
    note: 'Murs de séparation, hauteur standard 8\'',
  },
  {
    id: 'ossature-plafond', category: 'Ossature & Structure', label: 'Ossature faux plafond — suspentes',
    unit: 'm²', autoQty: 'ceilArea', unitMat: 8, unitLabor: 12, wasteFactor: 1.05,
    note: 'Grille T pour tuiles acoustiques ou support gypse',
  },
  {
    id: 'ossature-fond-clouage', category: 'Ossature & Structure', label: 'Fond de clouage (blocage bois entre montants)',
    unit: 'm lin.', autoQty: 'perimeter', unitMat: 6, unitLabor: 12, wasteFactor: 1.05,
    note: 'Support pour armoires, mains courantes, vanités, accessoires muraux — mesure linéaire',
  },

  // ─── Isolation ──────────────────────────────────────────────────────────────
  {
    id: 'iso-murs-r14', category: 'Isolation', label: 'Isolant laine de roche — murs R14 (3½")',
    unit: 'm²', autoQty: 'wallArea', unitMat: 7.50, unitLabor: 4, wasteFactor: 1.05,
    note: "Roxul Safe'n'Sound ou Comfortbatt",
  },
  {
    id: 'iso-murs-r22', category: 'Isolation', label: 'Isolant soufflé — murs R22 (5½")',
    unit: 'm²', autoQty: 'wallArea', unitMat: 12, unitLabor: 5, wasteFactor: 1.05,
    note: 'Cellulose soufflée — pour murs extérieurs',
  },
  {
    id: 'iso-plafond-r40', category: 'Isolation', label: 'Isolant soufflé plafond — R40',
    unit: 'm²', autoQty: 'ceilArea', unitMat: 18, unitLabor: 6, wasteFactor: 1.05,
    note: 'Cellulose soufflée sur plafond',
  },
  {
    id: 'iso-acoustique', category: 'Isolation', label: 'Isolant acoustique — murs mitoyens',
    unit: 'm²', autoQty: 'wallArea', unitMat: 10, unitLabor: 4.50, wasteFactor: 1.05,
    note: "Roxul Safe'n'Sound pour réduction bruit",
  },

  // ─── Gypse / Plâtrage ───────────────────────────────────────────────────────
  {
    id: 'gypse-murs-1-cote', category: 'Gypse & Plâtrage', label: 'Gypse 5/8" — murs 1 côté',
    unit: 'm²', autoQty: 'wallArea', unitMat: 9, unitLabor: 18, wasteFactor: 1.08,
    note: 'Pose, jointoiement, sablage, apprêt',
  },
  {
    id: 'gypse-murs-2-cotes', category: 'Gypse & Plâtrage', label: 'Gypse 5/8" — murs 2 côtés',
    unit: 'm²', autoQty: 'wallArea', unitMat: 17, unitLabor: 28, wasteFactor: 1.08,
    note: 'Cloison complète, 2 faces, jointoyée et sablée',
  },
  {
    id: 'gypse-plafond', category: 'Gypse & Plâtrage', label: 'Gypse 5/8" — plafond',
    unit: 'm²', autoQty: 'ceilArea', unitMat: 10, unitLabor: 22, wasteFactor: 1.08,
    note: 'Plafond suspendu ou fixé, 3 couches finition',
  },
  {
    id: 'gypse-humidite', category: 'Gypse & Plâtrage', label: 'Gypse hydrofuge (salles humides)',
    unit: 'm²', autoQty: 'wallArea', unitMat: 14, unitLabor: 20, wasteFactor: 1.08,
    note: 'Pour salles de bain, cuisines, sous-sol',
  },

  // ─── Plafonds finis ─────────────────────────────────────────────────────────
  {
    id: 'plafond-acoustique', category: 'Plafonds finis', label: 'Tuiles acoustiques Armstrong 24×24"',
    unit: 'm²', autoQty: 'ceilArea', unitMat: 28, unitLabor: 15, wasteFactor: 1.10,
    note: 'Grille T suspendue incluse — idéal commercial',
  },
  {
    id: 'plafond-gypse-peint', category: 'Plafonds finis', label: 'Plafond gypse peint (2 couches)',
    unit: 'm²', autoQty: 'ceilArea', unitMat: 18, unitLabor: 24, wasteFactor: 1.05,
    note: 'Incluant pose gypse + peinture latex blanche',
  },

  // ─── Planchers ──────────────────────────────────────────────────────────────
  {
    id: 'plancher-lvt', category: 'Planchers', label: 'Plancher vinyle de luxe LVT 6mm (pose flottante)',
    unit: 'm²', autoQty: 'floorArea', unitMat: 38, unitLabor: 14, wasteFactor: 1.10,
    note: 'Lifeproof ou Beauflor — inclus sous-couche',
  },
  {
    id: 'plancher-ceramique', category: 'Planchers', label: 'Céramique / Grès cérame (format 60×60)',
    unit: 'm²', autoQty: 'floorArea', unitMat: 65, unitLabor: 45, wasteFactor: 1.12,
    note: 'Inclus mortier, coulis, membranes imperméabilisantes',
  },
  {
    id: 'plancher-parquet', category: 'Planchers', label: 'Parquet d\'ingénierie chêne posé cloué',
    unit: 'm²', autoQty: 'floorArea', unitMat: 85, unitLabor: 32, wasteFactor: 1.10,
    note: 'Finition huilée ou vernie — 3/4" d\'épaisseur',
  },
  {
    id: 'plancher-beton-poli', category: 'Planchers', label: 'Béton poli — finition industrielle',
    unit: 'm²', autoQty: 'floorArea', unitMat: 55, unitLabor: 60, wasteFactor: 1,
    note: 'Polissage 400 grit + scellant époxy — commercial',
  },
  {
    id: 'plancher-tapis', category: 'Planchers', label: 'Moquette commerciale (pose collée)',
    unit: 'm²', autoQty: 'floorArea', unitMat: 28, unitLabor: 12, wasteFactor: 1.10,
    note: 'Colle incluse — bureaux et espaces de travail',
  },
  {
    id: 'plancher-sous-couche', category: 'Planchers', label: 'Préparation sous-plancher (autonivelant)',
    unit: 'm²', autoQty: 'floorArea', unitMat: 12, unitLabor: 8, wasteFactor: 1,
    note: 'Mikka ou béton autonivelant — correction planéité',
  },

  // ─── Peinture ───────────────────────────────────────────────────────────────
  {
    id: 'peinture-murs', category: 'Peinture', label: 'Peinture murs — 2 couches (apprêt + finition)',
    unit: 'm²', autoQty: 'wallArea', unitMat: 3.50, unitLabor: 7, wasteFactor: 1.10,
    note: 'Dulux ProMaster ou Benjamin Moore Regal',
  },
  {
    id: 'peinture-plafond', category: 'Peinture', label: 'Peinture plafond — 2 couches',
    unit: 'm²', autoQty: 'ceilArea', unitMat: 3, unitLabor: 8, wasteFactor: 1.10,
    note: 'Blanc mat — inclut protection plancher',
  },
  {
    id: 'peinture-boiseries', category: 'Peinture', label: 'Peinture boiseries & cadres (laque)',
    unit: 'm lin.', autoQty: 'perimeter', unitMat: 4, unitLabor: 12, wasteFactor: 1,
    note: 'Portes, fenêtres, plinthes — laque semi-lustre',
  },

  // ─── Fenêtres & Portes ──────────────────────────────────────────────────────
  {
    id: 'fenetre-double', category: 'Fenêtres & Portes', label: 'Fenêtre double vitrage (casement)',
    unit: 'unité', autoQty: null, unitMat: 650, unitLabor: 180, wasteFactor: 1,
    note: 'Cascades ou Gentek — isolation R-3,2',
  },
  {
    id: 'fenetre-triple', category: 'Fenêtres & Portes', label: 'Fenêtre triple vitrage Énergie Star',
    unit: 'unité', autoQty: null, unitMat: 980, unitLabor: 220, wasteFactor: 1,
    note: 'Pour zones nordiques — R-5 minimum',
  },
  {
    id: 'porte-int', category: 'Fenêtres & Portes', label: 'Porte intérieure préhung 32×80"',
    unit: 'unité', autoQty: null, unitMat: 285, unitLabor: 120, wasteFactor: 1,
    note: 'Inclus quincaillerie, pose et ajustement',
  },
  {
    id: 'porte-ext', category: 'Fenêtres & Portes', label: 'Porte extérieure isolée (acier)',
    unit: 'unité', autoQty: null, unitMat: 850, unitLabor: 320, wasteFactor: 1,
    note: 'Inclus seuil, coupe-froid, serrure',
  },
  {
    id: 'porte-garage', category: 'Fenêtres & Portes', label: 'Porte de garage isolée 16×7\' + moteur',
    unit: 'unité', autoQty: null, unitMat: 2200, unitLabor: 450, wasteFactor: 1,
    note: 'Garaga ou Amarr — R-12, moteur 1/2 HP',
  },

  // ─── Électricité ────────────────────────────────────────────────────────────
  {
    id: 'elec-point', category: 'Électricité', label: 'Point électrique (prise, interrupteur, luminaire)',
    unit: 'point', autoQty: null, unitMat: 45, unitLabor: 75, wasteFactor: 1,
    note: 'NMD90 14/2, boîte, dispositif — licencié RBQ',
  },
  {
    id: 'elec-luminaire-led', category: 'Électricité', label: 'Luminaire encastré LED 4" (pose)',
    unit: 'unité', autoQty: null, unitMat: 65, unitLabor: 55, wasteFactor: 1,
    note: 'Inclus ampoule GU10 800 lm, câblage',
  },
  {
    id: 'elec-panneau-200a', category: 'Électricité', label: 'Panneau électrique 200A (remplacement)',
    unit: 'forfait', autoQty: null, unitMat: 1800, unitLabor: 1200, wasteFactor: 1,
    note: 'Inclus inspection HQ + Siemens ou Eaton',
  },
  {
    id: 'elec-mise-normes', category: 'Électricité', label: 'Mise aux normes — câblage existant',
    unit: 'm²', autoQty: 'floorArea', unitMat: 8, unitLabor: 22, wasteFactor: 1,
    note: 'Remplacement aluminium/vieux câblage en cuivre',
  },
  {
    id: 'elec-thermostat', category: 'Électricité', label: 'Thermostat intelligent (Ecobee ou Nest)',
    unit: 'unité', autoQty: null, unitMat: 220, unitLabor: 65, wasteFactor: 1,
    note: 'Connexion Wi-Fi, programmation incluse',
  },

  // ─── Plomberie ──────────────────────────────────────────────────────────────
  {
    id: 'plombing-sdb-complete', category: 'Plomberie', label: 'Salle de bain complète (baignoire/douche, lavabo, toilette)',
    unit: 'forfait', autoQty: null, unitMat: 4200, unitLabor: 3800, wasteFactor: 1,
    note: 'Inclus fournitures milieu de gamme, raccordements',
  },
  {
    id: 'plombing-douche', category: 'Plomberie', label: 'Douche à l\'italienne (drain linéaire)',
    unit: 'forfait', autoQty: null, unitMat: 2800, unitLabor: 2200, wasteFactor: 1,
    note: 'Inclus drain, membrane, céramique 1m×1m',
  },
  {
    id: 'plombing-cuisine', category: 'Plomberie', label: 'Plomberie cuisine (évier, robinet, lave-vaisselle)',
    unit: 'forfait', autoQty: null, unitMat: 980, unitLabor: 780, wasteFactor: 1,
    note: 'Raccordements existants — inclus siphon et purge',
  },
  {
    id: 'plombing-point-eau', category: 'Plomberie', label: 'Nouveau point d\'eau (alimentation + évacuation)',
    unit: 'point', autoQty: null, unitMat: 280, unitLabor: 320, wasteFactor: 1,
    note: 'PEX-A + PVC DWV — par point d\'eau ajouté',
  },

  // ─── HVAC / Mécanique ───────────────────────────────────────────────────────
  {
    id: 'hvac-split-mural', category: 'HVAC & Mécanique', label: 'Thermopompe murale split (18 000 BTU)',
    unit: 'unité', autoQty: null, unitMat: 2800, unitLabor: 1200, wasteFactor: 1,
    note: 'Mitsubishi ou Daikin — COP 4.0, EnerGuide',
  },
  {
    id: 'hvac-centrale', category: 'HVAC & Mécanique', label: 'Thermopompe centrale air-air (3 tonnes)',
    unit: 'forfait', autoQty: null, unitMat: 8500, unitLabor: 3500, wasteFactor: 1,
    note: 'Trane ou Lennox — inclus distribution gaines existantes',
  },
  {
    id: 'hvac-vrc', category: 'HVAC & Mécanique', label: 'Ventilateur récupérateur chaleur (VRC)',
    unit: 'forfait', autoQty: null, unitMat: 1800, unitLabor: 1400, wasteFactor: 1,
    note: 'Venmar AVS — échangeur + distribution dans 4 zones',
  },
  {
    id: 'hvac-ventilo-sdb', category: 'HVAC & Mécanique', label: 'Ventilateur de salle de bain (Broan)',
    unit: 'unité', autoQty: null, unitMat: 180, unitLabor: 120, wasteFactor: 1,
    note: '110 CFM, renvoi extérieur inclus',
  },
  {
    id: 'hvac-conduits', category: 'HVAC & Mécanique', label: 'Gaines de ventilation — nouvelles (diamètre 8")',
    unit: 'm lin.', autoQty: null, unitMat: 22, unitLabor: 28, wasteFactor: 1.10,
    note: 'Gaines galvanisées isolées, raccords inclus',
  },

  // ─── Revêtements extérieurs ─────────────────────────────────────────────────
  {
    id: 'ext-vinyl', category: 'Revêtement extérieur', label: 'Revêtement vinyle (couleurs standards)',
    unit: 'm²', autoQty: 'wallArea', unitMat: 22, unitLabor: 18, wasteFactor: 1.12,
    note: 'Mitten ou Kaycan — panneau 4" avec isolant',
  },
  {
    id: 'ext-brique', category: 'Revêtement extérieur', label: 'Brique face (pose)',
    unit: 'm²', autoQty: 'wallArea', unitMat: 95, unitLabor: 110, wasteFactor: 1.05,
    note: 'Brique d\'Acton ou Glen-Gery — mortier type S',
  },
  {
    id: 'ext-stucco', category: 'Revêtement extérieur', label: 'Stucco acrylique 3 couches',
    unit: 'm²', autoQty: 'wallArea', unitMat: 35, unitLabor: 55, wasteFactor: 1.05,
    note: 'Lathage métallique + 3 couches + finition texturée',
  },

  // ─── Toiture ────────────────────────────────────────────────────────────────
  {
    id: 'toiture-bardeau', category: 'Toiture', label: 'Bardeau d\'asphalte 30 ans (remplacement)',
    unit: 'm²', autoQty: 'floorArea', unitMat: 28, unitLabor: 22, wasteFactor: 1.15,
    note: 'Owens Corning Duration ou IKO Nordic — inclus sous-couche',
  },
  {
    id: 'toiture-tpo', category: 'Toiture', label: 'Membrane TPO (toiture plate)',
    unit: 'm²', autoQty: 'floorArea', unitMat: 42, unitLabor: 38, wasteFactor: 1.05,
    note: '60 mil, soudée à chaud — garantie 20 ans',
  },

  // ─── Fondations & Béton ─────────────────────────────────────────────────────
  {
    id: 'fondation-dallage', category: 'Béton & Fondations', label: 'Dalle de béton 4" (intérieur)',
    unit: 'm²', autoQty: 'floorArea', unitMat: 55, unitLabor: 40, wasteFactor: 1.05,
    note: 'Inclus coffrage, armature #4, béton 25 MPa',
  },
  {
    id: 'fondation-drain', category: 'Béton & Fondations', label: 'Drain français extérieur (par mètre)',
    unit: 'm lin.', autoQty: 'perimeter', unitMat: 45, unitLabor: 80, wasteFactor: 1,
    note: 'Drain 4" + géotextile + gravier — excavation incluse',
  },
  {
    id: 'fondation-impermeabilisation', category: 'Béton & Fondations', label: 'Imperméabilisation fondation (membrane)',
    unit: 'm²', autoQty: 'wallArea', unitMat: 18, unitLabor: 22, wasteFactor: 1.05,
    note: 'Membrane Delta-MS ou Bakor 790-11',
  },

  // ─── Carrelage ──────────────────────────────────────────────────────────────
  {
    id: 'carrelage-mur-sdb', category: 'Carrelage', label: 'Carrelage mural salle de bain (30×60)',
    unit: 'm²', autoQty: 'wallArea', unitMat: 55, unitLabor: 55, wasteFactor: 1.12,
    note: 'Inclus backer board, mortier, coulis',
  },
  {
    id: 'carrelage-dosseret', category: 'Carrelage', label: 'Dosseret cuisine (métro ou mosaïque)',
    unit: 'm²', autoQty: null, unitMat: 75, unitLabor: 65, wasteFactor: 1.15,
    note: 'Pose au mortier époxy, joints serrés',
  },

  // ─── Cuisines ───────────────────────────────────────────────────────────────
  {
    id: 'cuisine-armoires', category: 'Cuisine & Armoires', label: 'Armoires de cuisine (par m linéaire)',
    unit: 'm lin.', autoQty: null, unitMat: 1200, unitLabor: 350, wasteFactor: 1,
    note: 'IKEA/Cuisines Laurier — inclus quincaillerie Blum',
  },
  {
    id: 'cuisine-comptoir-quartz', category: 'Cuisine & Armoires', label: 'Comptoir quartz 3 cm (fourni & posé)',
    unit: 'm lin.', autoQty: null, unitMat: 850, unitLabor: 280, wasteFactor: 1,
    note: 'Silestone ou Cambria — découpe évier incluse',
  },
  {
    id: 'cuisine-comptoir-granit', category: 'Cuisine & Armoires', label: 'Comptoir granite naturel 3 cm',
    unit: 'm lin.', autoQty: null, unitMat: 980, unitLabor: 320, wasteFactor: 1,
    note: 'Importé, scellant inclus, bords profilés',
  },

  // ─── Accessibilité / Divers ─────────────────────────────────────────────────
  {
    id: 'misc-escalier', category: 'Divers', label: 'Escalier intérieur (refaire marches)',
    unit: 'marche', autoQty: null, unitMat: 185, unitLabor: 120, wasteFactor: 1,
    note: 'Chêne ou érable — contremarches peintes',
  },
  {
    id: 'misc-rampe', category: 'Divers', label: 'Rampe & balustres acier inoxydable',
    unit: 'm lin.', autoQty: null, unitMat: 420, unitLabor: 180, wasteFactor: 1,
    note: 'Fixation plancher, conformité bâtiment',
  },
  {
    id: 'misc-nettoyage', category: 'Divers', label: 'Nettoyage fin de chantier',
    unit: 'm²', autoQty: 'floorArea', unitMat: 0.50, unitLabor: 3, wasteFactor: 1,
    note: 'Balayage, aspiration, vitres, enlèvement protections',
  },
  {
    id: 'misc-benne', category: 'Divers', label: 'Location benne à déchets (14 verges)',
    unit: 'unité', autoQty: null, unitMat: 480, unitLabor: 0, wasteFactor: 1,
    note: 'Livraison + reprise + disposition — durée 1 semaine',
  },
  {
    id: 'misc-gestion-projet', category: 'Divers', label: 'Gestion de projet & supervision chantier',
    unit: 'hre', autoQty: null, unitMat: 0, unitLabor: 95, wasteFactor: 1,
    note: 'Chargé de projet senior — réunions, coordination, rapports',
  },
]

export const CATEGORIES = [...new Set(CATALOG.map(i => i.category))]

// Émojis et descriptions simples par catégorie (pour l'interface tactile)
export const CATEGORY_META = {
  'Démolition':            { emoji: '🔨', desc: 'Enlever murs, planchers, plafonds' },
  'Ossature & Structure':  { emoji: '🏗️', desc: 'Monter de nouveaux murs' },
  'Isolation':             { emoji: '❄️', desc: 'Isoler murs et plafonds' },
  'Gypse & Plâtrage':      { emoji: '🧱', desc: 'Poser et finir le gypse' },
  'Plafonds finis':        { emoji: '⬜', desc: 'Tuiles acoustiques, gypse peint' },
  'Planchers':             { emoji: '🪵', desc: 'Bois, céramique, vinyle…' },
  'Peinture':              { emoji: '🎨', desc: 'Murs, plafonds, boiseries' },
  'Fenêtres & Portes':     { emoji: '🚪', desc: 'Remplacer portes et fenêtres' },
  'Électricité':           { emoji: '💡', desc: 'Prises, luminaires, panneau' },
  'Plomberie':             { emoji: '🚿', desc: 'Salle de bain, cuisine, points d\'eau' },
  'HVAC & Mécanique':      { emoji: '🌡️', desc: 'Chauffage, climatisation, ventilation' },
  'Revêtement extérieur':  { emoji: '🏠', desc: 'Vinyle, brique, stucco' },
  'Toiture':               { emoji: '☔', desc: 'Bardeau, membrane' },
  'Béton & Fondations':    { emoji: '🪨', desc: 'Dalles, drains, imperméabilisation' },
  'Carrelage':             { emoji: '🔲', desc: 'Céramique murale, dosseret' },
  'Cuisine & Armoires':    { emoji: '🍳', desc: 'Armoires, comptoirs' },
  'Divers':                { emoji: '📦', desc: 'Nettoyage, benne, gestion' },
}

// Marge par défaut. Le gabarit Excel de l'entreprise n'applique qu'un seul
// taux « Admin et Profit » (20 %) plutôt que plusieurs pourcentages composés.
export const DEFAULT_SETTINGS = {
  adminProfitPct: 20,
  tpsPct: 5,
  tvqPct: 9.975,
}

// Types de pièces avec dimensions typiques (en mètres) pour ajout rapide
export const ROOM_PRESETS = [
  { label: 'Cuisine', emoji: '🍳', length: 4.5, width: 3.5, height: 2.44 },
  { label: 'Salle de bain', emoji: '🛁', length: 2.4, width: 2.1, height: 2.44 },
  { label: 'Chambre', emoji: '🛏️', length: 4.2, width: 3.4, height: 2.44 },
  { label: 'Salon', emoji: '🛋️', length: 6.5, width: 5, height: 2.44 },
  { label: 'Sous-sol', emoji: '🔦', length: 12, width: 8, height: 2.13 },
  { label: 'Garage', emoji: '🚗', length: 7.5, width: 6, height: 2.44 },
  { label: 'Couloir', emoji: '🚶', length: 8, width: 1.2, height: 2.44 },
  { label: 'Bureau', emoji: '💼', length: 5, width: 4, height: 2.44 },
  { label: 'Salle de lavage', emoji: '🧺', length: 2.5, width: 2, height: 2.44 },
  { label: 'Extérieur / Toit', emoji: '🏠', length: 12, width: 9, height: 2.44 },
  { label: 'Local commercial', emoji: '🏢', length: 15, width: 10, height: 3 },
  { label: 'Autre pièce', emoji: '➕', length: 4, width: 3, height: 2.44 },
]

// Types de travaux proposés à l'étape 1 (gros boutons)
export const PROJECT_TYPE_CHIPS = [
  { label: 'Cuisine', emoji: '🍳' },
  { label: 'Salle de bain', emoji: '🛁' },
  { label: 'Sous-sol', emoji: '🔦' },
  { label: 'Peinture', emoji: '🎨' },
  { label: 'Planchers', emoji: '🪵' },
  { label: 'Toiture', emoji: '☔' },
  { label: 'Portes & Fenêtres', emoji: '🚪' },
  { label: 'Agrandissement', emoji: '🏗️' },
  { label: 'Rénovation générale', emoji: '🔨' },
  { label: 'Autre', emoji: '📋' },
]
