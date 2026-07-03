# ConstructPro — Gestion PME Construction

Application web de gestion pour PME en construction au Québec :
projets, soumissions, facturation, clients, employés, feuilles de temps,
matériaux, sous-traitants, calendrier, documents et rapports.

## Démarrer

```bash
npm install
npm run dev        # développement (http://localhost:5173)
npm run build      # production (dossier dist/)
npm run preview    # tester la version production
```

## ✦ Devis rapide sur place (mode terrain)

Le module **Devis** (menu « ✦ Estimateur » / onglet « Devis » sur mobile)
est conçu pour être utilisé debout, chez le client, sur un téléphone ou
une tablette — même par quelqu'un qui n'aime pas l'informatique :

1. **Le client** — on choisit un client existant ou on tape juste un nom.
2. **Les pièces** — on touche « Cuisine », « Salle de bain », etc., puis on
   ajuste les mesures avec les gros boutons − / + (en **pieds** ou en mètres).
3. **Les travaux** — on ouvre une catégorie (Peinture, Planchers, Plomberie…)
   et on coche les travaux. Le prix de chaque travail est calculé
   automatiquement à partir des mesures de la pièce.
4. **Le devis** — le prix total taxes incluses s'affiche en gros.
   Deux boutons : **Imprimer / PDF** (devis propre avec lignes de signature)
   et **Enregistrer**.

Points importants :

- **Sauvegarde automatique** : chaque geste est enregistré dans le
  navigateur. On peut fermer l'application et reprendre le devis plus tard.
- **Fonctionne sans connexion** une fois la page chargée (aucune ressource
  externe).
- Le total en cours est toujours visible au bas de l'écran.
- Les prix du catalogue (60+ travaux : matériaux + main-d'œuvre) et les
  majorations (frais généraux, profit, imprévus) sont ajustables.
- TPS 5 % et TVQ 9,975 % ajoutées automatiquement.

## Paramètres de l'entreprise

La page **Paramètres** (bas du menu, ou `/parametres`) permet de définir :
nom de l'entreprise, nom du propriétaire, adresse, téléphone, courriel,
licence RBQ, NEQ, numéros de TPS/TVQ et logo. Ces informations apparaissent
automatiquement sur toutes les soumissions et tous les devis générés par
l'application (plus besoin de « ConstructPro Inc. » codé en dur).

## Paie & Heures (CCQ)

Le module **Paie & Heures** (`/paie`) reproduit fidèlement le système de
suivi des heures fourni (classeur Excel avec banque d'heures CCQ) : mêmes
catégories (Commercial, Résidentiel Lourd/Léger Réglementé, Non-Réglementé),
mêmes formules de temps supplémentaire et de banque d'heures, pour obtenir
exactement les mêmes chiffres.

- **Saisie hebdomadaire** — heures travaillées par catégorie, par employé et
  par semaine ; le temps supplémentaire et la banque d'heures se calculent
  automatiquement.
- **Résumé de la semaine** — équivalent de la feuille « Heures payables par
  semaine » de l'ancien classeur, recalculé en direct.
- **Fiche annuelle** — tableau complet des 52 semaines par employé, avec
  soldes de banque et totaux, comme dans l'ancien fichier.
- **Employés & banque** — gestion de la liste des employés (préremplie avec
  les 22 employés du classeur fourni) et saisie du solde de banque reporté
  de l'année précédente.
- **Licences** — suivi des dates de renouvellement des certificats de
  compétence, avec alerte si expiré ou proche de l'échéance.

Le moteur de calcul (`src/components/payroll/payrollEngine.js`) est
directement porté ligne par ligne des formules Excel d'origine et vérifié
par des tests unitaires (`payrollEngine.test.mjs`).

## Tests

```bash
# Moteur de calcul de paie (sans navigateur)
node src/components/payroll/payrollEngine.test.mjs

# Parcours complet dans un vrai navigateur
npm run build && npm run preview -- --port 4173 &
PW_CHROMIUM=/opt/pw-browsers/chromium node smoke.mjs        # assistant de devis terrain
PW_CHROMIUM=/opt/pw-browsers/chromium node smoke-paie.mjs   # paramètres + paie & heures
```
