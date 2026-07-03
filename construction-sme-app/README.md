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

## Test de fumée

```bash
npm run preview -- --port 4173 &   # serveur
PW_CHROMIUM=/opt/pw-browsers/chromium node smoke.mjs
```

Parcourt tout l'assistant de devis dans un vrai navigateur (mobile 390 px)
et vérifie qu'aucune erreur JavaScript ne survient.
