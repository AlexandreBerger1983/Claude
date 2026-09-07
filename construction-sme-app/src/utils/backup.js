// Sauvegarde et restauration de toutes les données de l'application.
//
// L'application n'a pas de base de données : tout vit dans le stockage local
// du navigateur. Ces données disparaissent donc si l'on vide les données de
// navigation, et ne suivent pas d'un appareil à l'autre. Ce module produit un
// fichier .json contenant l'intégralité des clés, et sait le relire.
//
// Les clés sont importées de leur module d'origine plutôt que recopiées :
// si l'une d'elles change de nom, la sauvegarde suit automatiquement.

import { SETTINGS_KEY } from '../data/settingsDefaults'
import { RATES_KEY } from '../data/roomQuestionnaires'
import { CATALOG_PRICES_KEY } from '../data/estimatorCatalog'
import { DRAFT_KEY, SAVED_KEY } from '../components/estimator/estimatorUtils'
import { PAYROLL_KEY, PAYROLL_IMPORT_FLAG } from '../components/payroll/payrollStore'
import { STORE_KEY } from '../store/DataContext'

export const BACKUP_FORMAT = 'constructpro-sauvegarde'
export const BACKUP_VERSION = 1

// Toutes les clés sauvegardées, avec un libellé lisible pour le compte rendu.
export const BACKUP_KEYS = [
  { key: STORE_KEY,           label: 'Clients, projets, factures, employés, matériaux, feuilles de temps' },
  { key: PAYROLL_KEY,         label: 'Paie et banques d\'heures' },
  { key: PAYROLL_IMPORT_FLAG, label: 'Indicateur d\'import de la paie' },
  { key: SAVED_KEY,           label: 'Devis enregistrés' },
  { key: DRAFT_KEY,           label: 'Devis en cours' },
  { key: SETTINGS_KEY,        label: 'Paramètres de l\'entreprise' },
  { key: RATES_KEY,           label: 'Grille de tarifs du questionnaire' },
  { key: CATALOG_PRICES_KEY,  label: 'Prix personnalisés du devis rapide' },
]

// Construit l'objet de sauvegarde à partir du stockage local.
// `donneesEnLigne` : les collections lues dans Supabase. Quand la base est
// branchée, les clients, projets et soumissions ne sont plus dans le
// navigateur — sans elles, le fichier ne contiendrait que les préférences et
// on croirait à tort avoir une sauvegarde complète.
export function buildBackup(donneesEnLigne = null) {
  const donnees = {}
  for (const { key } of BACKUP_KEYS) {
    const brut = window.localStorage.getItem(key)
    if (brut !== null) donnees[key] = brut // conservé tel quel, sans réinterprétation
  }
  if (donneesEnLigne) donnees[STORE_KEY] = JSON.stringify(donneesEnLigne)
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    creeLe: new Date().toISOString(),
    source: donneesEnLigne ? 'supabase' : 'navigateur',
    donnees,
  }
}

// ─── Rappel mensuel ──────────────────────────────────────────────────────────
// Cette clé est volontairement HORS de BACKUP_KEYS : elle décrit l'habitude de
// sauvegarde de ce navigateur-ci, pas les données de l'entreprise. Restaurer
// une vieille sauvegarde ne doit donc pas réécrire l'historique du rappel.
export const REMINDER_KEY = 'cp-sauvegarde-rappel'
export const RAPPEL_JOURS = 30

const JOUR_MS = 24 * 60 * 60 * 1000

function lireRappel() {
  try {
    const brut = window.localStorage.getItem(REMINDER_KEY)
    if (brut) return JSON.parse(brut)
  } catch { /* stockage indisponible */ }
  // Première visite : on démarre le compteur aujourd'hui, pour ne pas
  // réclamer une sauvegarde à quelqu'un qui vient d'ouvrir l'application.
  const etat = { derniere: null, depuis: new Date().toISOString(), reporteA: null }
  ecrireRappel(etat)
  return etat
}

function ecrireRappel(etat) {
  try {
    window.localStorage.setItem(REMINDER_KEY, JSON.stringify(etat))
  } catch { /* stockage indisponible */ }
}

export function etatRappel() {
  return lireRappel()
}

// Nombre de jours depuis la dernière sauvegarde, ou depuis la première
// utilisation si aucune sauvegarde n'a jamais été faite.
export function joursDepuisSauvegarde() {
  const { derniere, depuis } = lireRappel()
  const ref = derniere ?? depuis
  if (!ref) return 0
  return Math.floor((Date.now() - new Date(ref).getTime()) / JOUR_MS)
}

export function jamaisSauvegarde() {
  return lireRappel().derniere === null
}

// Faut-il afficher le rappel ? Non si l'utilisateur l'a reporté récemment.
export function doitRappeler() {
  const { reporteA } = lireRappel()
  if (reporteA && Date.now() < new Date(reporteA).getTime()) return false
  return joursDepuisSauvegarde() >= RAPPEL_JOURS
}

export function reporterRappel(jours = 7) {
  const etat = lireRappel()
  ecrireRappel({ ...etat, reporteA: new Date(Date.now() + jours * JOUR_MS).toISOString() })
}

function marquerSauvegarde() {
  const etat = lireRappel()
  ecrireRappel({ ...etat, derniere: new Date().toISOString(), reporteA: null })
}

export function exportBackup(donneesEnLigne = null) {
  const sauvegarde = buildBackup(donneesEnLigne)
  const blob = new Blob([JSON.stringify(sauvegarde, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const horodatage = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  a.href = url
  a.download = `constructpro-sauvegarde-${horodatage}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  marquerSauvegarde()
  return Object.keys(sauvegarde.donnees).length
}

// Vérifie qu'un fichier est bien une sauvegarde exploitable avant d'écraser
// quoi que ce soit. Renvoie l'objet validé, ou lève une erreur explicite.
export function parseBackup(texte) {
  let obj
  try {
    obj = JSON.parse(texte)
  } catch {
    throw new Error("ce fichier n'est pas une sauvegarde valide (JSON illisible)")
  }
  if (!obj || obj.format !== BACKUP_FORMAT) {
    throw new Error("ce fichier n'est pas une sauvegarde ConstructPro")
  }
  if (typeof obj.donnees !== 'object' || obj.donnees === null) {
    throw new Error('la sauvegarde ne contient aucune donnée')
  }
  const connues = new Set(BACKUP_KEYS.map(k => k.key))
  const cles = Object.keys(obj.donnees).filter(k => connues.has(k))
  if (cles.length === 0) {
    throw new Error('la sauvegarde ne contient aucune donnée reconnue')
  }
  return { ...obj, cles }
}

// Écrit la sauvegarde dans le stockage local. Les clés absentes du fichier
// sont effacées, pour que l'état restauré soit exactement celui sauvegardé
// plutôt qu'un mélange des deux.
export function restoreBackup(sauvegarde) {
  const { donnees } = sauvegarde
  for (const { key } of BACKUP_KEYS) {
    if (Object.prototype.hasOwnProperty.call(donnees, key)) {
      window.localStorage.setItem(key, donnees[key])
    } else {
      window.localStorage.removeItem(key)
    }
  }
  return sauvegarde.cles?.length ?? Object.keys(donnees).length
}

// Taille approximative des données, pour informer l'utilisateur.
export function backupSize() {
  let octets = 0
  for (const { key } of BACKUP_KEYS) {
    const v = window.localStorage.getItem(key)
    if (v) octets += v.length
  }
  return octets
}
