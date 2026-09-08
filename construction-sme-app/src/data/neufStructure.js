// Structure d'une soumission de construction neuve, transcrite du modèle de
// l'entreprise (« CGF — Felix et Tania », construction unifamiliale).
//
// Une soumission de maison neuve ne se découpe pas par pièce comme une
// rénovation, mais par DIVISION de travaux normalisée (01 Exigences
// générales, 04 Béton, 06 Structure et menuiserie…), chaque division en
// sous-sections, chaque sous-section en lignes.
//
// Trois différences de fond avec le devis de rénovation :
//
//   • chaque ligne porte séparément son coût de matériaux et son coût de
//     main-d'œuvre (quantité d'heures × taux horaire), car le modèle totalise
//     les deux à part et suit le nombre d'heures du projet ;
//   • chaque ligne est marquée « Inclus » ou « Exclus » — les exclusions sont
//     imprimées pour le client, c'est ce qui protège l'entreprise ;
//   • la marge se calcule en deux temps : une contingence, puis les profits et
//     l'administration par-dessus (voir neufCosting.js).

// Taux horaire du modèle : toutes les lignes de main-d'œuvre y reviennent
// (8 227,00 $ / 86,6 h = 95,00 $).
export const TAUX_HORAIRE_NEUF = 95

// Types de ligne. Ils décident des colonnes affichées et de la façon dont le
// montant se calcule.
export const TYPES_LIGNE = {
  mixte:      { label: 'Matériaux + main-d’œuvre', materiel: true, mo: true },
  materiel:   { label: 'Matériaux seulement',      materiel: true, mo: false },
  mo:         { label: 'Main-d’œuvre seulement',   materiel: false, mo: true },
  forfait:    { label: 'Forfait',                  materiel: true, mo: false },
  soumission: { label: 'Soumission de sous-traitant', materiel: true, mo: false },
  allocation: { label: 'Allocation',               materiel: true, mo: false },
}

export const INCLUS = 'inclus'
export const EXCLUS = 'exclus'

// Fabrique de gabarit de ligne. `h` = heures par unité.
const l = (libelle, unite, prixU = 0, h = 0, type = 'mixte') =>
  ({ libelle, unite, prixU, h, type })

// ─── Les divisions ───────────────────────────────────────────────────────────
// Les prix unitaires viennent du modèle fourni : ce sont ceux réellement
// pratiqués par l'entreprise, et ils restent modifiables ligne par ligne.
export const DIVISIONS_NEUF = [
  {
    code: '01', titre: 'Exigences générales',
    sections: [
      { code: '01.1', titre: 'Exigences réglementaires', lignes: [
        l('GCR — Garantie de construction résidentielle', 'unité', 2500, 0, 'forfait'),
        l('Assurance chantier construction neuve', 'unité', 3843.84, 0, 'forfait'),
      ] },
      { code: '01.2', titre: 'Organisation et installation de chantier', lignes: [
        l('Temps chargé de projet', 'h', 0, 1, 'mo'),
        l('Temps contremaître', 'h', 0, 1, 'mo'),
        l('Livraisons : matériaux, portes, équipement de plomberie', 'unité', 75, 0, 'materiel'),
        l('Fourniture et livraison d’un conteneur d’entreposage', 'mois', 350, 0, 'materiel'),
      ] },
      { code: '01.3', titre: 'Protection temporaire', lignes: [
        l('Toilette de chantier', 'mois', 250, 0, 'materiel'),
      ] },
      { code: '01.4', titre: 'Frais hivernaux — services temporaires', lignes: [
        l('Conditions d’hiver', 'mois', 0, 0, 'materiel'),
        l('Déneigement', 'mois', 0, 0, 'materiel'),
        l('Chauffage intérieur', 'mois', 0, 0, 'materiel'),
        l('Éclairage', 'mois', 0, 0, 'materiel'),
      ] },
      { code: '01.5', titre: 'Ménage et évacuation des déchets', lignes: [
        l('Ménage journalier', 'jour', 0, 1, 'mo'),
        l('Ménage de fin de chantier', 'forfait', 0, 0, 'mo'),
        l('Conteneur 40 verges 5 tonnes (8x20x8)', 'unité', 1247, 0, 'materiel'),
        l('Location de conteneur à déchets', 'mois', 240, 0, 'materiel'),
      ] },
    ],
  },
  {
    code: '03', titre: 'Travaux sur emplacement',
    sections: [
      { code: '03.1', titre: 'Excavation et remblai', lignes: [
        l('Excavation', 'forfait', 0, 0, 'soumission'),
        l('Remblai et nivellement', 'forfait', 0, 0, 'soumission'),
      ] },
    ],
  },
  {
    code: '04', titre: 'Travaux de béton',
    sections: [
      { code: '04.1', titre: 'Coffrage : semelle et solage', lignes: [
        l('Galerie de béton structurale 8" 32 MPa', 'pi³', 12.5, 0, 'materiel'),
        l('Marche de béton', 'pi³', 250, 0, 'materiel'),
        l('Coffrage de fondation — sous-traitant', 'forfait', 0, 0, 'soumission'),
      ] },
      { code: '04.2', titre: 'Armatures pour béton', lignes: [
        l('Fourniture treillis léger N6', 'pi²', 0.82, 0, 'materiel'),
        l('Fourniture d’armature à béton 20 mm', 'pi²', 0.90, 0, 'materiel'),
      ] },
      { code: '04.3', titre: 'Finition de dalle', lignes: [
        l('Dalle sur sol 4" en béton 25 MPa', 'pi²', 1.45, 0, 'materiel'),
        l('Finition et pose de scellant sur dalle', 'pi²', 1.98, 0, 'materiel'),
      ] },
      { code: '04.4', titre: 'Béton coulé en place', lignes: [
        l('Pompe à béton', 'unité', 1200, 0, 'materiel'),
        l('Béton pour semelles isolées 25 MPa', 'pi³', 5.66, 0, 'materiel'),
        l('Béton pour semelles filantes 25 MPa', 'pi³', 5.66, 0, 'materiel'),
        l('Béton pour mur de fondation 25 MPa', 'pi³', 5.66, 0, 'materiel'),
        l('Béton pour galerie', 'pi³', 5.66, 0, 'materiel'),
        l('Béton pour dalle de finition 25 MPa', 'pi³', 5.66, 0, 'materiel'),
      ] },
    ],
  },
  {
    code: '06.1', titre: 'Structure de bois',
    sections: [
      { code: '06.1.1', titre: 'Structure de bois', lignes: [
        l('Transport de grue', 'unité', 300, 0, 'materiel'),
        l('Gruttage en jour', 'jour', 1960, 0, 'materiel'),
        l('LVL 3½" x 5¼" x 10\'', 'unité', 76.91, 0, 'materiel'),
        l('LVL 5½" x 5½" x 10\'', 'unité', 120.75, 0, 'materiel'),
        l('Poutre LVL 9½"', 'pi lin.', 7.08, 0, 'materiel'),
        l('Bois de contreventement et de construction', 'forfait', 0, 0, 'materiel'),
        l('Structure : murs — sous-traitant', 'forfait', 0, 0, 'soumission'),
        l('Structure : poutrelles et fermes de toit — sous-traitant', 'forfait', 0, 0, 'soumission'),
      ] },
      { code: '06.1.2', titre: 'Structure de bois massif', lignes: [
        l('Entrait basse 5½ x 7½ — fourniture, traçage, coupe et pose', 'pi lin.', 24.68, 0.1625, 'mixte'),
        l('Arbalétrier 5½ x 7½ — fourniture, traçage, coupe et pose', 'pi lin.', 24.68, 0.15, 'mixte'),
        l('Liens 5½ x 5½ — fourniture, traçage, coupe et pose', 'pi lin.', 24.68, 0.2375, 'mixte'),
        l('Poinçon 5½ x 5½ — fourniture, traçage, coupe et pose', 'pi lin.', 24.68, 0.1376, 'mixte'),
      ] },
    ],
  },
  {
    code: '06.2', titre: 'Menuiserie',
    sections: [
      { code: '06.2.1', titre: 'Menuiserie temporaire et travaux connexes', lignes: [
        l('Échafaudage — pose, dépose, location et livraison', 'pi²', 0.13, 0.04, 'mixte'),
        l('Mise en place d’acier d’armature dans dalle', 'pi²', 0, 0.003, 'mo'),
        l('Limon crémaillère en 2x12 — escalier temporaire', 'pi lin.', 3.45, 0.0625, 'mixte'),
        l('Marche composée 2U 2x6', 'pi lin.', 1.15, 0.1, 'mixte'),
        l('Poteaux en 2x4', 'unité', 3.96, 0.15, 'mixte'),
        l('Lisse en 2x4', 'pi lin.', 0.45, 0.005, 'mixte'),
      ] },
      { code: '06.2.2', titre: 'Pose d’éléments structuraux', lignes: [
        l('Pose des colonnes structurelles', 'pi lin.', 0.89, 0.074, 'mixte'),
        l('Pose des poutres structurales', 'pi lin.', 2.33, 0.032, 'mixte'),
        l('Pose des poutrelles de plancher préfabriquées', 'pi lin.', 1.21, 0.018, 'mixte'),
        l('Pose des murets de fermeture de plancher', 'pi lin.', 0.13, 0.06, 'mixte'),
        l('Pose des renforts — contreventement de poutrelles', 'unité', 2.57, 0.06, 'mixte'),
        l('Panneau R4 et OSB 7/16 aux rives de poutrelle', 'pi lin.', 0, 0.031, 'mo'),
        l('Contreplaqué 3/4 embouveté sur poutrelles', 'pi²', 2.23, 0.011, 'mixte'),
        l('Lisse basse et étafoam', 'pi lin.', 0.72, 0.029, 'mixte'),
        l('Pose des murs structuraux', 'pi lin.', 0.13, 0.175, 'mixte'),
        l('Pose des pignons habitables', 'pi lin.', 0.13, 0.126, 'mixte'),
        l('Pose de fermes de toit standard', 'unité', 0, 0.23, 'mo'),
        l('Pose des renforts — contreventement de toitures', 'unité', 3.42, 0.1, 'mixte'),
        l('Contreplaqué 5/8 sur toit, pente inférieure à 6/12', 'pi²', 2.02, 0.0202, 'mixte'),
        l('Contreplaqué 5/8 sur toit, pente supérieure à 6/12', 'pi²', 2.02, 0.0343, 'mixte'),
      ] },
      { code: '06.2.4', titre: 'Charpenterie : travaux de petite envergure', lignes: [
        l('Lattage horizontal au 16" c/c', 'pi²', 0.16, 0.00626, 'mixte'),
        l('Contreplaqué sur mur extérieur (fond de clouage)', 'unité', 61.69, 1, 'mixte'),
        l('Découpe des panneaux pour ouvertures', 'pi lin.', 0, 0.01, 'mo'),
        l('2x6 pour fascia et fond de clouage de gouttière', 'pi lin.', 0.72, 0.025, 'mixte'),
        l('Échelle de toit (débord en pignon)', 'pi lin.', 2.36, 0.025, 'mixte'),
        l('Arrêts de laine', 'unité', 1.50, 0.1, 'mixte'),
        l('Trappe d’accès à l’entretoit', 'unité', 149, 1.5, 'mixte'),
        l('Pieux structuraux légers', 'unité', 350, 0.3, 'mixte'),
      ] },
    ],
  },
  {
    code: '07', titre: 'Toiture',
    sections: [
      { code: '07.2', titre: 'Système de toiture en bardeaux d’asphalte', lignes: [
        l('Toiture en bardeaux d’asphalte — sous-traitant', 'forfait', 0, 0, 'soumission'),
      ] },
    ],
  },
  {
    code: '08.1', titre: 'Ouvertures extérieures',
    sections: [
      { code: '08.1.1', titre: 'Fourniture de fenêtres et portes extérieures', lignes: [
        l('Fourniture des fenêtres — sous-traitant', 'forfait', 0, 0, 'soumission'),
        l('Fourniture des portes extérieures', 'unité', 0, 0, 'materiel'),
      ] },
      { code: '08.1.5', titre: 'Installation', lignes: [
        l('Installation de fenêtre', 'unité', 0, 2, 'mo'),
        l('Installation de porte extérieure', 'unité', 0, 3, 'mo'),
      ] },
    ],
  },
  {
    code: '08.2', titre: 'Ouvertures intérieures',
    sections: [
      { code: '08.2.3', titre: 'Fourniture et pose de portes intérieures en bois', lignes: [
        l('Porte intérieure en bois — fourniture', 'unité', 0, 0, 'materiel'),
        l('Pose de porte intérieure, quincaillerie comprise', 'unité', 0, 1.5, 'mo'),
      ] },
    ],
  },
  {
    code: '09', titre: 'Revêtements extérieurs',
    sections: [
      { code: '09.1', titre: 'Revêtement extérieur lourd', lignes: [
        l('Revêtement de maçonnerie ou pierre', 'pi²', 0, 0, 'materiel'),
      ] },
      { code: '09.2', titre: 'Revêtement léger', lignes: [
        l('Revêtement léger — fourniture', 'pi²', 0, 0, 'materiel'),
        l('Revêtement léger — pose', 'pi²', 0, 0, 'mo'),
        l('Revêtement extérieur — sous-traitant', 'forfait', 0, 0, 'soumission'),
      ] },
    ],
  },
  {
    code: '10', titre: 'Isolation et étanchéité',
    sections: [
      { code: '10.1', titre: 'Étanchéité à l’air et à l’eau', lignes: [
        l('Membrane d’étanchéité autour des ouvertures', 'pi lin.', 1.47, 0.0235, 'mixte'),
        l('Panneau isolant MSL R+ 1/2 sur murs intérieurs', 'pi²', 0.91, 0.0133, 'mixte'),
        l('Panneau isolant MSL R+ 1/2 et double lattes aux plafonds', 'pi²', 1.09, 0.0192, 'mixte'),
      ] },
      { code: '10.2', titre: 'Isolation thermique', lignes: [
        l('Isolation sous dalle en Foamular C300 2"', 'pi²', 2.27, 0.00625, 'mixte'),
        l('Isolation de murs de fondation Isofoil 3"', 'pi²', 1.66, 0.0128, 'mixte'),
        l('Isolation des murs en laine minérale R20', 'pi²', 0.76, 0.007, 'mixte'),
        l('Panneau de support uréthane en fibre de bois sur pignon', 'pi²', 2.86, 0.0312, 'mixte'),
        l('Isolation soufflée — sous-traitant', 'forfait', 0, 0, 'soumission'),
      ] },
    ],
  },
  {
    code: '11.1', titre: 'Système intérieur',
    sections: [
      { code: '11.1.1', titre: 'Divisions et accessoires', lignes: [
        l('Échafaudage — plafond cathédrale ou plafond haut', 'pi²', 0.16, 0.015, 'mixte'),
        l('Soufflage de 8\' en 2x3', 'pi lin.', 3.27, 0.04, 'mixte'),
        l('Soufflage de 9\' en 2x3', 'pi lin.', 3.60, 0.05, 'mixte'),
        l('Division simple 8\' en 2x4', 'pi lin.', 3.87, 0.0585, 'mixte'),
        l('Division simple 9\' en 2x4', 'pi lin.', 3.96, 0.067, 'mixte'),
        l('Division simple 8\' en 2x6', 'pi lin.', 5.72, 0.075, 'mixte'),
        l('Division simple 9\' en 2x6', 'pi lin.', 5.72, 0.083, 'mixte'),
        l('Double lattage au 16" c/c sous poutrelles', 'pi²', 0.31, 0.0078, 'mixte'),
        l('Triple lattage au 16" c/c sous fermes de toit', 'pi²', 0.47, 0.0156, 'mixte'),
        l('Soufflage de contreplaqué BC fir 3/8 vissé au 6"', 'pi²', 0.98, 0.0109, 'mixte'),
        l('Contreplaqué 5/8 pour ébénisterie', 'pi lin.', 3.51, 0.126, 'mixte'),
        l('Contreplaqué 5/8 pour mur de tablettes H=8\'', 'pi lin.', 4.21, 0.25, 'mixte'),
      ] },
      { code: '11.1.2', titre: 'Gypses', lignes: [
        l('Gypse 1 épaisseur sur mur de 8 pi — 1/2"', 'pi²', 3.95, 0, 'materiel'),
        l('Gypse 1 épaisseur sur mur de 9 pi — 1/2"', 'pi²', 6.67, 0, 'materiel'),
        l('Gypse 1 épaisseur sur mur de 10 pi — 1/2"', 'pi²', 4.94, 0, 'materiel'),
        l('Gypse 1/2 48x12 sur plafond', 'pi²', 0.49, 0, 'materiel'),
        l('Pose par sous-traitant résidentiel', 'pi²', 0.85, 0, 'materiel'),
      ] },
      { code: '11.1.3', titre: 'Tirage de joints', lignes: [
        l('Tirage de joints — doublages, divisions, soufflages, plafonds', 'pi²', 0.90, 0, 'materiel'),
        l('Coin de fer à 90 degrés', 'pi lin.', 2.98, 0, 'materiel'),
        l('Ajustement selon la difficulté (cathédrale, escalier, mezzanine)', 'forfait', 0, 0, 'materiel'),
      ] },
      { code: '11.1.4', titre: 'Peinture', lignes: [
        l('Peinture sur doublages, divisions, soufflages et plafonds', 'pi²', 0.85, 0, 'materiel'),
        l('Peinture sur portes de bois', 'unité', 47.50, 0, 'materiel'),
        l('Peinture sur soffites de bois', 'pi²', 9.90, 0, 'materiel'),
      ] },
    ],
  },
  {
    code: '11.2', titre: 'Préparation et finition intérieure',
    sections: [
      { code: '11.2.1', titre: 'Céramique', lignes: [
        l('Pose céramique format standard 12x24 — plancher', 'pi²', 8.55, 0, 'materiel'),
        l('Pose céramique murale format standard 12x24', 'pi²', 14.25, 0, 'materiel'),
        l('Pose céramique de douche, coulis et membrane compris', 'pi²', 17.10, 0, 'materiel'),
        l('Pose céramique de douche grand format, coulis et membrane', 'pi²', 19.00, 0, 'materiel'),
        l('Pose de céramique pour dosseret', 'pi²', 19.00, 0, 'materiel'),
        l('Céramique — matériaux (pertes comprises)', 'pi²', 5.85, 0, 'materiel'),
        l('Moulure Schlüter alu chrome 1/2" longueur 10\'', 'pi lin.', 2.87, 0, 'materiel'),
        l('Découpe pour prise électrique', 'unité', 25, 0, 'materiel'),
        l('Alcôve ou fenêtre en céramique', 'unité', 250, 0, 'materiel'),
      ] },
      { code: '11.2.2', titre: 'Revêtement en lames, sol souple, tapis', lignes: [
        l('Pose bois franc agrafé, membrane papier ciré comprise', 'pi²', 2.85, 0, 'materiel'),
        l('Nozing longueur 8 pi', 'unité', 180, 0, 'materiel'),
        l('Couvre-plancher — matériaux (pertes comprises)', 'pi²', 0, 0, 'materiel'),
      ] },
    ],
  },
  {
    code: '12', titre: 'Ventilation, climatisation, chauffage',
    sections: [
      { code: '12.1', titre: 'Conditionnement de l’air, chauffage, ventilation', lignes: [
        l('Ventilation et chauffage — sous-traitant', 'forfait', 0, 0, 'soumission'),
      ] },
      { code: '12.2', titre: 'Foyer, poêle, cheminée', lignes: [
        l('Allocation pour foyer ou poêle', 'unité', 0, 0, 'allocation'),
      ] },
    ],
  },
  {
    code: '15', titre: 'Plomberie',
    sections: [
      { code: '15.1', titre: 'Plomberie : sous-traitance', lignes: [
        l('Plomberie — sous-traitant', 'forfait', 0, 0, 'soumission'),
      ] },
      { code: '15.2', titre: 'Allocation pour équipements de plomberie', lignes: [
        l('Allocation pour appareils et robinetterie', 'forfait', 0, 0, 'allocation'),
      ] },
    ],
  },
  {
    code: '17', titre: 'Électricité et luminaires',
    sections: [
      { code: '17.1', titre: 'Sous-traitance électrique', lignes: [
        l('Électricité — sous-traitant', 'forfait', 0, 0, 'soumission'),
      ] },
      { code: '17.3', titre: 'Allocation pour équipement et éclairage', lignes: [
        l('Allocation pour luminaires et appareillage', 'forfait', 0, 0, 'allocation'),
      ] },
    ],
  },
  {
    code: '18', titre: 'Ébénisterie et mobilier architectural',
    sections: [
      { code: '18.1', titre: 'Escalier', lignes: [
        l('Allocation escalier avec gardes-corps, nozings et mains courantes', 'unité', 12000, 0, 'allocation'),
      ] },
      { code: '18.2', titre: 'Mobilier intégré', lignes: [
        l('Allocation cuisine aménagée avec comptoirs (hors électroménagers)', 'unité', 24000, 0, 'allocation'),
        l('Allocation comptoir granit ou Corian', 'unité', 5000, 0, 'allocation'),
        l('Allocation meuble vanité et armoire haute', 'unité', 1000, 0, 'allocation'),
        l('Allocation tablette stratifiée : 4 plateformes', 'pi lin.', 70, 0, 'allocation'),
        l('Aménagement de walk-in', 'unité', 2500, 0, 'allocation'),
      ] },
      { code: '18.3', titre: 'Ameublement et décoration', lignes: [
        l('Tablette grillagée avec pôle', 'unité', 19.99, 0, 'materiel'),
        l('Ferme de toit décorative — entrait basse 5½ x 7½', 'pi lin.', 24.68, 0.1625, 'mixte'),
        l('Ferme de toit décorative — arbalétrier 5½ x 7½', 'pi lin.', 24.68, 0.15, 'mixte'),
        l('Plaque de maintien en acier noir, charge importante', 'unité', 349, 1, 'mixte'),
        l('Plaque de maintien en acier noir, charge faible', 'unité', 199, 0.3, 'mixte'),
      ] },
    ],
  },
]

// Toutes les sous-sections à plat, pour les recherches
export const SECTIONS_NEUF = DIVISIONS_NEUF.flatMap(d =>
  d.sections.map(s => ({ ...s, divisionCode: d.code, divisionTitre: d.titre })))

export const gabaritsDe = (codeSection) =>
  SECTIONS_NEUF.find(s => s.code === codeSection)?.lignes ?? []

// Clé d'une ligne du catalogue de divisions. Elle sert de repère à la
// sélection : cocher une ligne, c'est retenir sa clé avec ses quantités.
export const cleGabarit = (codeSection, index) => `${codeSection}#${index}`
