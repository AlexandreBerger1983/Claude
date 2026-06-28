// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = [
  { id: 1, name: 'Immobilier Trépanier Inc.', contact: 'Marc Trépanier', email: 'marc@trepanier.ca', phone: '514-555-0182', address: '1200 boul. René-Lévesque O., Montréal, QC H3B 4Y9', type: 'Entreprise', neq: '1178234560', ca: 420000, status: 'Actif', since: '2021-03-15', notes: 'Client prioritaire — projets résidentiels haute densité.' },
  { id: 2, name: 'Ville de Laval — Travaux publics', contact: 'Sylvie Michaud', email: 'smichaud@laval.ca', phone: '450-555-0934', address: '1 Place du Souvenir, Laval, QC H7V 1W7', type: 'Municipalité', neq: '', ca: 850000, status: 'Actif', since: '2019-06-01', notes: 'Appels d\'offres publics — délais stricts.' },
  { id: 3, name: 'Constructions Beaumont Ltée', contact: 'Pierre Beaumont', email: 'pierre@beaumont.ca', phone: '418-555-0345', address: '88 rue Industrielle, Québec, QC G1K 3B2', type: 'Entreprise', neq: '2234567890', ca: 230000, status: 'Actif', since: '2022-01-20', notes: '' },
  { id: 4, name: 'Résidences du Parc', contact: 'Annie Côté', email: 'acote@residencesduparc.ca', phone: '514-555-0567', address: '345 av. du Parc, Montréal, QC H2V 4T2', type: 'Copropriété', neq: '', ca: 115000, status: 'Inactif', since: '2020-09-10', notes: '' },
  { id: 5, name: 'Investissements GBL', contact: 'Guillaume Blais', email: 'gblais@gbl.ca', phone: '514-555-0712', address: '1000 rue de la Gauchetière O., Montréal, QC H3B 4W5', type: 'Entreprise', neq: '3345678901', ca: 680000, status: 'Actif', since: '2023-02-14', notes: 'Potentiel de 3 projets en 2026.' },
  { id: 6, name: 'École privée Saint-Laurent', contact: 'Directeur Leblanc', email: 'leblanc@stlaurent.ca', phone: '514-555-0821', address: '750 rue Saint-Laurent, Montréal, QC H2Y 2Z3', type: 'Institution', neq: '', ca: 95000, status: 'Actif', since: '2024-04-01', notes: 'Travaux durant l\'été seulement.' },
]

// ─── Employees ────────────────────────────────────────────────────────────────
export const employees = [
  { id: 1, name: 'Jean-François Lapointe', role: 'Chargé de projet', email: 'jf.lapointe@constructpro.ca', phone: '514-555-0101', hourlyRate: 65, status: 'Actif', startDate: '2018-04-01', hrsThisWeek: 42, hrsThisMonth: 168, certifications: ['ASP Construction', 'PMP'], avatar: 'JL' },
  { id: 2, name: 'Marie-Eve Ouellet', role: 'Estimatrice', email: 'me.ouellet@constructpro.ca', phone: '514-555-0202', hourlyRate: 58, status: 'Actif', startDate: '2020-01-15', hrsThisWeek: 38, hrsThisMonth: 152, certifications: ['ASP Construction'], avatar: 'MO' },
  { id: 3, name: 'Kevin Tremblay', role: 'Contremaître', email: 'k.tremblay@constructpro.ca', phone: '514-555-0303', hourlyRate: 52, status: 'Actif', startDate: '2019-07-22', hrsThisWeek: 44, hrsThisMonth: 176, certifications: ['ASP Construction', 'Grue mobile'], avatar: 'KT' },
  { id: 4, name: 'Sophie Deschênes', role: 'Comptable', email: 's.deschenes@constructpro.ca', phone: '514-555-0404', hourlyRate: 48, status: 'Actif', startDate: '2021-03-01', hrsThisWeek: 35, hrsThisMonth: 140, certifications: ['CPA'], avatar: 'SD' },
  { id: 5, name: 'Patrick Gagnon', role: 'Charpentier-menuisier', email: 'p.gagnon@constructpro.ca', phone: '514-555-0505', hourlyRate: 40, status: 'Actif', startDate: '2022-06-01', hrsThisWeek: 40, hrsThisMonth: 160, certifications: ['ASP Construction', 'Compagnon menuiserie'], avatar: 'PG' },
  { id: 6, name: 'Luc Bergeron', role: 'Électricien', email: 'l.bergeron@constructpro.ca', phone: '514-555-0606', hourlyRate: 55, status: 'Congé', startDate: '2020-09-15', hrsThisWeek: 0, hrsThisMonth: 80, certifications: ['Licence RBQ', 'ASP Construction'], avatar: 'LB' },
  { id: 7, name: 'Isabelle Roy', role: 'Dessinatrice CAO', email: 'i.roy@constructpro.ca', phone: '514-555-0707', hourlyRate: 45, status: 'Actif', startDate: '2023-01-09', hrsThisWeek: 37, hrsThisMonth: 148, certifications: ['AutoCAD', 'Revit'], avatar: 'IR' },
]

// ─── Subcontractors ───────────────────────────────────────────────────────────
export const subcontractors = [
  { id: 1, name: 'Électricité Pro Mtl Inc.', contact: 'Daniel Fortier', trade: 'Électricité', phone: '514-555-1001', email: 'dfortier@electropro.ca', rbq: 'RBQ-1234-5678', insurance: '2026-12-31', rating: 4.8, status: 'Approuvé', activeProjects: 2 },
  { id: 2, name: 'Plomberie Excellence', contact: 'Robert Simard', trade: 'Plomberie', phone: '450-555-1002', email: 'rsimard@plombex.ca', rbq: 'RBQ-2345-6789', insurance: '2026-09-30', rating: 4.5, status: 'Approuvé', activeProjects: 1 },
  { id: 3, name: 'Toitures Nordiques', contact: 'Alain Morin', trade: 'Toiture', phone: '514-555-1003', email: 'amorin@toituresnord.ca', rbq: 'RBQ-3456-7890', insurance: '2027-03-31', rating: 4.7, status: 'Approuvé', activeProjects: 0 },
  { id: 4, name: 'HVAC Solutions QC', contact: 'Sandra Lemaire', trade: 'Mécanique du bâtiment', phone: '514-555-1004', email: 'slemaire@hvacsolutions.ca', rbq: 'RBQ-4567-8901', insurance: '2025-06-30', rating: 3.9, status: 'Vérifier assurance', activeProjects: 1 },
  { id: 5, name: 'Béton Lavoie & Fils', contact: 'Michel Lavoie', trade: 'Béton / Fondation', phone: '450-555-1005', email: 'mlavoie@betonlavoie.ca', rbq: 'RBQ-5678-9012', insurance: '2026-11-30', rating: 4.9, status: 'Approuvé', activeProjects: 1 },
]

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = [
  {
    id: 1, code: 'PRJ-2026-001', name: 'Rénovation commerciale — Centre Trépanier', client: 'Immobilier Trépanier Inc.', clientId: 1,
    manager: 'Jean-François Lapointe', type: 'Commercial', status: 'En cours',
    startDate: '2026-03-01', endDate: '2026-09-30',
    budgetTotal: 485000, budgetSpent: 198700, progress: 41,
    address: '1200 boul. René-Lévesque O., Montréal, QC',
    description: 'Rénovation complète d\'un espace commercial de 2 200 m² incluant systèmes électriques, HVAC, planchers et finitions.',
    phases: [
      { name: 'Démolition', status: 'Terminé', progress: 100, budget: 45000, spent: 43200 },
      { name: 'Structure', status: 'Terminé', progress: 100, budget: 120000, spent: 118500 },
      { name: 'Mécanique & Électricité', status: 'En cours', progress: 60, budget: 185000, spent: 37000 },
      { name: 'Finitions', status: 'Non démarré', progress: 0, budget: 95000, spent: 0 },
      { name: 'Nettoyage & Livraison', status: 'Non démarré', progress: 0, budget: 40000, spent: 0 },
    ],
    tasks: [
      { id: 1, title: 'Inspection électrique intermédiaire', assignee: 'Luc Bergeron', due: '2026-07-15', priority: 'Haute', status: 'À faire' },
      { id: 2, title: 'Commande luminaires LED', assignee: 'Jean-François Lapointe', due: '2026-07-10', priority: 'Normale', status: 'En cours' },
      { id: 3, title: 'Plan de mise en page HVAC révisé', assignee: 'Isabelle Roy', due: '2026-07-05', priority: 'Haute', status: 'Terminé' },
    ]
  },
  {
    id: 2, code: 'PRJ-2026-002', name: 'Agrandissement entrepôt — Ville de Laval', client: 'Ville de Laval — Travaux publics', clientId: 2,
    manager: 'Kevin Tremblay', type: 'Municipal', status: 'En cours',
    startDate: '2026-01-15', endDate: '2026-12-31',
    budgetTotal: 1250000, budgetSpent: 412000, progress: 33,
    address: '400 rue des Laurentides, Laval, QC',
    description: 'Agrandissement de 4 800 m² pour les équipements municipaux. Structure d\'acier, enveloppe isolée, quais de chargement.',
    phases: [
      { name: 'Plans & Permis', status: 'Terminé', progress: 100, budget: 85000, spent: 82000 },
      { name: 'Fondations', status: 'Terminé', progress: 100, budget: 220000, spent: 215000 },
      { name: 'Structure acier', status: 'En cours', progress: 70, budget: 380000, spent: 115000 },
      { name: 'Enveloppe', status: 'Non démarré', progress: 0, budget: 285000, spent: 0 },
      { name: 'Intérieur & Systèmes', status: 'Non démarré', progress: 0, budget: 280000, spent: 0 },
    ],
    tasks: [
      { id: 4, title: 'Réception poutres d\'acier lot 3', assignee: 'Kevin Tremblay', due: '2026-07-20', priority: 'Haute', status: 'À faire' },
      { id: 5, title: 'Rapport de conformité fondations', assignee: 'Jean-François Lapointe', due: '2026-07-08', priority: 'Haute', status: 'Terminé' },
    ]
  },
  {
    id: 3, code: 'PRJ-2026-003', name: 'Construction résidentielle — 12 unités', client: 'Investissements GBL', clientId: 5,
    manager: 'Jean-François Lapointe', type: 'Résidentiel', status: 'Planification',
    startDate: '2026-09-01', endDate: '2027-08-31',
    budgetTotal: 2100000, budgetSpent: 15000, progress: 1,
    address: '885 av. Victoria, Westmount, QC',
    description: 'Immeuble résidentiel de 12 unités de luxe — 3 étages + sous-sol. Terrasses privées, stationnement souterrain.',
    phases: [
      { name: 'Conception & Permis', status: 'En cours', progress: 45, budget: 120000, spent: 15000 },
      { name: 'Fondations & Sous-sol', status: 'Non démarré', progress: 0, budget: 380000, spent: 0 },
      { name: 'Structure & Enveloppe', status: 'Non démarré', progress: 0, budget: 720000, spent: 0 },
      { name: 'Systèmes intérieurs', status: 'Non démarré', progress: 0, budget: 520000, spent: 0 },
      { name: 'Finitions haut de gamme', status: 'Non démarré', progress: 0, budget: 360000, spent: 0 },
    ],
    tasks: [
      { id: 6, title: 'Dépôt plans architecturaux à la ville', assignee: 'Isabelle Roy', due: '2026-07-30', priority: 'Haute', status: 'En cours' },
      { id: 7, title: 'Étude géotechnique', assignee: 'Jean-François Lapointe', due: '2026-07-25', priority: 'Haute', status: 'À faire' },
    ]
  },
  {
    id: 4, code: 'PRJ-2025-018', name: 'Réfection toiture — Constructions Beaumont', client: 'Constructions Beaumont Ltée', clientId: 3,
    manager: 'Kevin Tremblay', type: 'Industriel', status: 'Terminé',
    startDate: '2025-06-01', endDate: '2025-10-15',
    budgetTotal: 178000, budgetSpent: 172400, progress: 100,
    address: '88 rue Industrielle, Québec, QC',
    description: 'Réfection complète de la toiture d\'un bâtiment industriel de 3 600 m².',
    phases: [],
    tasks: []
  },
  {
    id: 5, code: 'PRJ-2026-004', name: 'Réaménagement école Saint-Laurent', client: 'École privée Saint-Laurent', clientId: 6,
    manager: 'Marie-Eve Ouellet', type: 'Institutionnel', status: 'Soumission acceptée',
    startDate: '2026-07-01', endDate: '2026-08-29',
    budgetTotal: 320000, budgetSpent: 0, progress: 0,
    address: '750 rue Saint-Laurent, Montréal, QC',
    description: 'Réaménagement de 8 salles de classe et cafétéria. Travaux estivaux obligatoires.',
    phases: [
      { name: 'Préparation & Démolition', status: 'Non démarré', progress: 0, budget: 35000, spent: 0 },
      { name: 'Mécanique & Électricité', status: 'Non démarré', progress: 0, budget: 95000, spent: 0 },
      { name: 'Gypse & Peinture', status: 'Non démarré', progress: 0, budget: 80000, spent: 0 },
      { name: 'Planchers & Mobilier', status: 'Non démarré', progress: 0, budget: 110000, spent: 0 },
    ],
    tasks: [
      { id: 8, title: 'Réunion de démarrage', assignee: 'Marie-Eve Ouellet', due: '2026-07-02', priority: 'Haute', status: 'À faire' },
    ]
  },
]

// ─── Quotes ───────────────────────────────────────────────────────────────────
export const quotes = [
  {
    id: 1, number: 'SOM-2026-042', title: 'Rénovation bureaux — 3e étage', clientId: 1, client: 'Immobilier Trépanier Inc.',
    date: '2026-06-01', validUntil: '2026-07-01', status: 'Acceptée',
    subtotal: 285000, tps: 14250, tvq: 28401.75, total: 327651.75,
    estimator: 'Marie-Eve Ouellet',
    items: [
      { id: 1, description: 'Démolition cloisons existantes', unit: 'forfait', qty: 1, unitPrice: 18000, total: 18000 },
      { id: 2, description: 'Construction nouvelles cloisons gypse', unit: 'm²', qty: 450, unitPrice: 85, total: 38250 },
      { id: 3, description: 'Faux plafond acoustique Armstrong', unit: 'm²', qty: 680, unitPrice: 65, total: 44200 },
      { id: 4, description: 'Plancher vinyle de luxe LVT', unit: 'm²', qty: 680, unitPrice: 55, total: 37400 },
      { id: 5, description: 'Électricité — mise aux normes + luminaires LED', unit: 'forfait', qty: 1, unitPrice: 68000, total: 68000 },
      { id: 6, description: 'Peinture (2 couches)', unit: 'm²', qty: 1200, unitPrice: 8.5, total: 10200 },
      { id: 7, description: 'Remplacement fenêtres triple vitrage', unit: 'unité', qty: 24, unitPrice: 850, total: 20400 },
      { id: 8, description: 'Main-d\'œuvre supervision et gestion', unit: 'hre', qty: 160, unitPrice: 95, total: 15200 },
      { id: 9, description: 'Frais généraux et profit (10%)', unit: 'forfait', qty: 1, unitPrice: 25132, total: 25132 },
      { id: 10, description: 'Nettoyage fin chantier', unit: 'forfait', qty: 1, unitPrice: 8218, total: 8218 },
    ]
  },
  {
    id: 2, number: 'SOM-2026-043', title: 'Entretien préventif systèmes HVAC', clientId: 2, client: 'Ville de Laval — Travaux publics',
    date: '2026-06-10', validUntil: '2026-07-10', status: 'En attente',
    subtotal: 42500, tps: 2125, tvq: 4229.38, total: 48854.38,
    estimator: 'Marie-Eve Ouellet',
    items: [
      { id: 1, description: 'Inspection complète 14 unités HVAC', unit: 'unité', qty: 14, unitPrice: 850, total: 11900 },
      { id: 2, description: 'Remplacement filtres MERV-13', unit: 'unité', qty: 42, unitPrice: 85, total: 3570 },
      { id: 3, description: 'Nettoyage conduits (section A)', unit: 'm lin.', qty: 320, unitPrice: 22, total: 7040 },
      { id: 4, description: 'Recharge réfrigérant R-410A', unit: 'kg', qty: 8, unitPrice: 85, total: 680 },
      { id: 5, description: 'Main-d\'œuvre spécialisée HVAC', unit: 'hre', qty: 120, unitPrice: 95, total: 11400 },
      { id: 6, description: 'Rapport de maintenance détaillé', unit: 'forfait', qty: 1, unitPrice: 1800, total: 1800 },
      { id: 7, description: 'Déplacement et mobilisation', unit: 'forfait', qty: 1, unitPrice: 2110, total: 2110 },
      { id: 8, description: 'Contrat de maintenance annuel', unit: 'forfait', qty: 1, unitPrice: 4000, total: 4000 },
    ]
  },
  {
    id: 3, number: 'SOM-2026-044', title: 'Construction immeuble résidentiel 12 unités', clientId: 5, client: 'Investissements GBL',
    date: '2026-05-20', validUntil: '2026-06-20', status: 'Acceptée',
    subtotal: 2100000, tps: 105000, tvq: 209003.00, total: 2414003,
    estimator: 'Marie-Eve Ouellet',
    items: []
  },
  {
    id: 4, number: 'SOM-2026-045', title: 'Réfection stationnement extérieur', clientId: 4, client: 'Résidences du Parc',
    date: '2026-06-20', validUntil: '2026-07-20', status: 'Envoyée',
    subtotal: 67800, tps: 3390, tvq: 6749.93, total: 77939.93,
    estimator: 'Marie-Eve Ouellet',
    items: [
      { id: 1, description: 'Démolition asphalte existant', unit: 'm²', qty: 1800, unitPrice: 12, total: 21600 },
      { id: 2, description: 'Sous-fondation granulaire MG-20', unit: 'm³', qty: 180, unitPrice: 75, total: 13500 },
      { id: 3, description: 'Pavage asphalte 2 couches', unit: 'm²', qty: 1800, unitPrice: 18, total: 32400 },
      { id: 4, description: 'Marquage de stationnement', unit: 'forfait', qty: 1, unitPrice: 300, total: 300 },
    ]
  },
  {
    id: 5, number: 'SOM-2026-046', title: 'Réfection salle de bain collective', clientId: 3, client: 'Constructions Beaumont Ltée',
    date: '2026-06-25', validUntil: '2026-07-25', status: 'Brouillon',
    subtotal: 28400, tps: 1420, tvq: 2826.97, total: 32646.97,
    estimator: 'Marie-Eve Ouellet',
    items: []
  },
]

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoices = [
  { id: 1, number: 'FAC-2026-089', projectId: 1, project: 'PRJ-2026-001', clientId: 1, client: 'Immobilier Trépanier Inc.', date: '2026-06-01', dueDate: '2026-07-01', status: 'Payée', subtotal: 97000, tps: 4850, tvq: 9657.15, total: 111507.15, paid: 111507.15, type: 'Avancement (40%)' },
  { id: 2, number: 'FAC-2026-090', projectId: 2, project: 'PRJ-2026-002', clientId: 2, client: 'Ville de Laval — Travaux publics', date: '2026-06-05', dueDate: '2026-07-05', status: 'Payée', subtotal: 125000, tps: 6250, tvq: 12450.63, total: 143700.63, paid: 143700.63, type: 'Avancement (25%)' },
  { id: 3, number: 'FAC-2026-091', projectId: 1, project: 'PRJ-2026-001', clientId: 1, client: 'Immobilier Trépanier Inc.', date: '2026-06-20', dueDate: '2026-07-20', status: 'En attente', subtotal: 58000, tps: 2900, tvq: 5779.30, total: 66679.30, paid: 0, type: 'Avancement (20%)' },
  { id: 4, number: 'FAC-2026-092', projectId: 5, project: 'PRJ-2026-004', clientId: 6, client: 'École privée Saint-Laurent', date: '2026-06-25', dueDate: '2026-07-25', status: 'En attente', subtotal: 64000, tps: 3200, tvq: 6374.40, total: 73574.40, paid: 0, type: 'Acompte (20%)' },
  { id: 5, number: 'FAC-2026-093', projectId: 3, project: 'PRJ-2026-003', clientId: 5, client: 'Investissements GBL', date: '2026-06-28', dueDate: '2026-07-28', status: 'Envoyée', subtotal: 210000, tps: 10500, tvq: 20913.45, total: 241413.45, paid: 0, type: 'Acompte (10%)' },
  { id: 6, number: 'FAC-2026-088', projectId: 4, project: 'PRJ-2025-018', clientId: 3, client: 'Constructions Beaumont Ltée', date: '2026-05-15', dueDate: '2026-06-14', status: 'En retard', subtotal: 172400, tps: 8620, tvq: 17173.48, total: 198193.48, paid: 0, type: 'Solde final' },
]

// ─── Materials ────────────────────────────────────────────────────────────────
export const materials = [
  { id: 1, name: 'Panneau de gypse 5/8" (4x8)', category: 'Cloisons', unit: 'feuille', stock: 240, minStock: 100, unitCost: 18.50, supplier: 'BPB Canada', location: 'Entrepôt A' },
  { id: 2, name: 'Profilé métallique 3-5/8" (20 pi)', category: 'Ossature', unit: 'barre', stock: 85, minStock: 50, unitCost: 7.25, supplier: 'Canam', location: 'Entrepôt A' },
  { id: 3, name: 'Isolant roxul 3.5" R14 (batt 15")', category: 'Isolation', unit: 'sac', stock: 32, minStock: 40, unitCost: 45.00, supplier: 'ROCKWOOL', location: 'Entrepôt B' },
  { id: 4, name: 'Câble NMD90 14/2', category: 'Électricité', unit: 'boîte 75m', stock: 18, minStock: 20, unitCost: 68.00, supplier: 'Nexans', location: 'Camion 1' },
  { id: 5, name: 'Tuile acoustique Armstrong 24x24"', category: 'Plafond', unit: 'boîte 12 u.', stock: 45, minStock: 30, unitCost: 62.00, supplier: 'Armstrong', location: 'Entrepôt A' },
  { id: 6, name: 'Plancher LVT Lifeproof 6mm', category: 'Plancher', unit: 'boîte (2.23 m²)', stock: 120, minStock: 60, unitCost: 55.00, supplier: 'Home Depot Pro', location: 'Entrepôt B' },
  { id: 7, name: 'Peinture intérieure Dulux 3,78L blanc', category: 'Peinture', unit: 'chaudière', stock: 8, minStock: 20, unitCost: 42.00, supplier: 'Dulux Pro', location: 'Camion 2' },
  { id: 8, name: 'Boulons d\'ancrage M12 x 150mm', category: 'Fixation', unit: 'boîte 50', stock: 15, minStock: 10, unitCost: 28.00, supplier: 'Fastenal', location: 'Entrepôt A' },
  { id: 9, name: 'Béton prémélangé 20 MPa', category: 'Béton', unit: 'm³', stock: 0, minStock: 0, unitCost: 165.00, supplier: 'Lafarge', location: 'Sur commande' },
  { id: 10, name: 'Tube PVC 4" SDR 35', category: 'Plomberie', unit: 'm', stock: 65, minStock: 40, unitCost: 14.50, supplier: 'Rexel', location: 'Entrepôt B' },
]

// ─── Timesheets ───────────────────────────────────────────────────────────────
export const timesheets = [
  { id: 1, employeeId: 1, employee: 'Jean-François Lapointe', projectId: 1, project: 'PRJ-2026-001', date: '2026-06-23', hours: 8, type: 'Régulier', description: 'Réunion de chantier + coordination sous-traitants', approved: true },
  { id: 2, employeeId: 3, employee: 'Kevin Tremblay', projectId: 2, project: 'PRJ-2026-002', date: '2026-06-23', hours: 10, type: 'Heures supp.', description: 'Montage ossature acier — lot 3', approved: true },
  { id: 3, employeeId: 5, employee: 'Patrick Gagnon', projectId: 1, project: 'PRJ-2026-001', date: '2026-06-23', hours: 8, type: 'Régulier', description: 'Installation cloisons gypse corridor', approved: true },
  { id: 4, employeeId: 7, employee: 'Isabelle Roy', projectId: 3, project: 'PRJ-2026-003', date: '2026-06-23', hours: 7.5, type: 'Régulier', description: 'Révision plans architecturaux étage 2', approved: false },
  { id: 5, employeeId: 1, employee: 'Jean-François Lapointe', projectId: 2, project: 'PRJ-2026-002', date: '2026-06-24', hours: 8, type: 'Régulier', description: 'Inspection structure intermédiaire', approved: false },
  { id: 6, employeeId: 2, employee: 'Marie-Eve Ouellet', projectId: 5, project: 'PRJ-2026-004', date: '2026-06-24', hours: 6, type: 'Régulier', description: 'Préparation documents de démarrage', approved: false },
  { id: 7, employeeId: 3, employee: 'Kevin Tremblay', projectId: 2, project: 'PRJ-2026-002', date: '2026-06-24', hours: 9, type: 'Régulier', description: 'Coordination livraison poutres + mise en place', approved: false },
]

// ─── Revenue by month (chart data) ────────────────────────────────────────────
export const revenueByMonth = [
  { mois: 'Jan', revenus: 285000, depenses: 198000, marge: 87000 },
  { mois: 'Fév', revenus: 320000, depenses: 215000, marge: 105000 },
  { mois: 'Mar', revenus: 410000, depenses: 278000, marge: 132000 },
  { mois: 'Avr', revenus: 380000, depenses: 256000, marge: 124000 },
  { mois: 'Mai', revenus: 520000, depenses: 342000, marge: 178000 },
  { mois: 'Jun', revenus: 498000, depenses: 321000, marge: 177000 },
  { mois: 'Jul', revenus: 0, depenses: 0, marge: 0 },
]

// ─── Project types distribution ───────────────────────────────────────────────
export const projectTypeData = [
  { name: 'Commercial', value: 38, fill: '#f97316' },
  { name: 'Résidentiel', value: 28, fill: '#3b82f6' },
  { name: 'Municipal', value: 22, fill: '#8b5cf6' },
  { name: 'Institutionnel', value: 8, fill: '#10b981' },
  { name: 'Industriel', value: 4, fill: '#f59e0b' },
]

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export const kpis = {
  chiffreAffairesAnnuel: 2413000,
  chiffreAffairesObjectif: 3200000,
  margeNettePercent: 34.5,
  projectsActifs: 3,
  soumissionsEnCours: 2,
  facturesEnAttente: 381666.73,
  facturesEnRetard: 198193.48,
  tauxConversionSoumissions: 68,
  heuresCeeMois: 676,
  nbEmployes: 7,
  nbSousTraitants: 5,
  satisfactionClient: 4.7,
}

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = [
  { id: 1, name: 'Contrat PRJ-2026-001 signé', type: 'Contrat', projectId: 1, project: 'PRJ-2026-001', date: '2026-02-28', size: '2.4 MB', ext: 'pdf', author: 'Jean-François Lapointe' },
  { id: 2, name: 'Plans architecturaux v3.2 — Centre Trépanier', type: 'Plan', projectId: 1, project: 'PRJ-2026-001', date: '2026-03-05', size: '18.7 MB', ext: 'pdf', author: 'Isabelle Roy' },
  { id: 3, name: 'Permis de construction #2026-MT-04812', type: 'Permis', projectId: 1, project: 'PRJ-2026-001', date: '2026-02-20', size: '0.8 MB', ext: 'pdf', author: 'Ville de Montréal' },
  { id: 4, name: 'Rapport géotechnique — Laval entrepôt', type: 'Rapport technique', projectId: 2, project: 'PRJ-2026-002', date: '2025-12-15', size: '5.2 MB', ext: 'pdf', author: 'GéoTech Solutions' },
  { id: 5, name: 'Contrat PRJ-2026-002 signé', type: 'Contrat', projectId: 2, project: 'PRJ-2026-002', date: '2026-01-10', size: '3.1 MB', ext: 'pdf', author: 'Jean-François Lapointe' },
  { id: 6, name: 'Photos chantier semaine 22', type: 'Photo', projectId: 1, project: 'PRJ-2026-001', date: '2026-06-02', size: '45.3 MB', ext: 'zip', author: 'Kevin Tremblay' },
  { id: 7, name: 'Assurance responsabilité 2026 — ConstructPro', type: 'Assurance', projectId: null, project: 'Général', date: '2026-01-01', size: '1.2 MB', ext: 'pdf', author: 'Intact' },
  { id: 8, name: 'Fiche technique isolant Roxul RS60', type: 'Fiche technique', projectId: null, project: 'Général', date: '2025-09-10', size: '0.5 MB', ext: 'pdf', author: 'ROCKWOOL' },
]

// ─── Alerts / Notifications ────────────────────────────────────────────────────
export const alerts = [
  { id: 1, type: 'warning', message: 'Assurance sous-traitant HVAC Solutions QC expire le 30 juin 2025 — vérifier renouvellement', date: '2026-06-28' },
  { id: 2, type: 'danger', message: 'FAC-2026-088 (198 193 $) — En retard de 14 jours — Constructions Beaumont Ltée', date: '2026-06-28' },
  { id: 3, type: 'info', message: 'Stock isolant Roxul en dessous du minimum (32 sacs, min. 40)', date: '2026-06-28' },
  { id: 4, type: 'success', message: 'SOM-2026-044 acceptée — Construction 12 unités GBL (2,1 M$)', date: '2026-06-25' },
  { id: 5, type: 'warning', message: 'Soumission SOM-2026-042 expire le 1er juillet — relancer si pas de réponse', date: '2026-06-28' },
]
