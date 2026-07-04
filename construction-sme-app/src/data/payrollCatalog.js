// Données de départ extraites du classeur de paie fourni (Paie_2027.xlsm),
// pour que le module Paie & Heures reproduise fidèlement le même système :
// suivi des heures Commercial / Résidentiel Lourd / Léger / Non-réglementé
// avec banque d'heures, tel qu'utilisé dans l'industrie de la construction
// régie par la CCQ au Québec.

export const COMPANY_NAME_SEED = 'CLAUDE GARIÉPY ET FILS INC'

// Ordre exact de la feuille "Heures payables par semaine" du classeur fourni
export const PAYROLL_EMPLOYEES_SEED = [
  'Simon Gariépy', 'Patrick Guèvremont', 'Tony Martel', 'Samuel Lavoie Belleau',
  'Francois Boudreau', 'Gabriel Boudreau', 'Maxime Gariépy', 'Natacha Pelletier',
  'Jacob Gosselin', 'Vincent Gariépy', 'Louis Auger', 'William Mathieu',
  'Josée Bédard', 'Dave Jalbert', 'Frédérick Picard', 'Thomas Alexandre',
  'David Larin', 'Normand Fortier', 'Jonathan Letarte', 'Anthony Fortier',
  'Corinne Gariépy', 'Dylan Fortin',
].map((name, i) => ({
  id: i + 1,
  name,
  active: true,
  opening: { L: 0, R: 0, X: 0 }, // banques reportées de l'année précédente (Lourd/Léger/Non-règlem)
}))

// Extrait de la feuille "Suivi renouvellement Licence" du classeur fourni
export const LICENSE_SEED = [
  ['Simon Gariépy', '2025-02-01'],
  ['Luc Jacques', '2022-02-01'],
  ['Tony Martel', '2025-12-01'],
  ['Samuel Lavoie Belleau', '2023-12-31'],
  ['Francis Boudreau', '2023-12-31'],
  ['Gabriel Boudreau', '2023-12-31'],
  ['Marc Deslongchamp', '2023-12-31'],
  ['Benoit Fortin', '2023-12-31'],
  ['Maxime Gariépy', '2023-12-31'],
  ['Zacharie Guèvremont', '2023-12-31'],
  ['Mario Gravel', '2023-12-31'],
  ['William Mathieu', '2023-12-31'],
  ['Louis Auger', '2023-12-31'],
  ['Lauriane Gariépy', '2023-12-31'],
  ['Michael Morency', '2023-12-31'],
  ['Josée Bédard', '2023-12-31'],
  ['Dave Jalbert', '2023-12-31'],
  ['Thomas Torquet', '2023-12-31'],
  ['Dave Poulin', '2023-12-31'],
  ['Vincent Gariépy', '2023-12-31'],
  ['Corinne Gariépy', '2023-12-31'],
  ['Michel Belleau', '2023-12-31'],
  ['Antoine Arsac', '2023-12-31'],
  ['Félix Bégin', '2023-12-31'],
  ['Dylan Fortin', '2023-12-31'],
].map(([name, renewalDate], i) => ({
  id: i + 1,
  name,
  licenseType: 'Certificat de compétence (CCQ)',
  renewalDate,
}))

// Libellés exacts des colonnes, tels qu'affichés dans le classeur d'origine
export const CATEGORY_LABELS = {
  commercial: 'Commercial',
  lourd: 'Résidentiel Lourd Réglementé',
  leger: 'Résidentiel Léger Réglementé',
  nonReglem: 'Résidentiel Non-Réglementé',
}
