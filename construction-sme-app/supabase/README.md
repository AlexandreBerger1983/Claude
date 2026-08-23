# Mise en place de la base de données

Cette étape se fait une seule fois, et demande environ dix minutes. Tant
qu'elle n'est pas faite, l'application continue de fonctionner normalement sur
le stockage du navigateur : rien ne casse entre-temps.

## 1. Créer le projet Supabase

1. Aller sur <https://supabase.com> et créer un compte (gratuit).
2. **New project**. Choisir un nom, un mot de passe de base de données (à
   conserver), et la région **East US (North Virginia)** ou **Canada** — la
   plus proche du Québec.
3. Attendre deux ou trois minutes que le projet se crée.

> **À savoir sur le forfait gratuit** : un projet sans aucune activité pendant
> une semaine est mis en pause par Supabase. Il se réactive en un clic, mais si
> l'application devient importante pour l'entreprise, le forfait payant
> (25 $ US/mois) évite cette interruption.

## 2. Créer les tables et les règles de sécurité

1. Dans le projet : **SQL Editor** → **New query**.
2. Coller tout le contenu de [`schema.sql`](./schema.sql).
3. **Run**.

Le script crée les tables, active la sécurité par ligne et définit les droits
des deux rôles. Il peut être ré-exécuté sans risque.

## 3. Récupérer les deux clés

Dans **Project Settings → API**, noter :

- **Project URL** — ressemble à `https://abcdefgh.supabase.co`
- **anon public** — une longue clé commençant par `eyJ...`

La clé `anon` est faite pour être publique : elle se retrouvera dans le code du
site. Ce n'est pas elle qui protège les données — c'est le rôle des règles
créées à l'étape 2. **Ne jamais utiliser la clé `service_role`** dans
l'application : celle-là contourne toutes les règles.

## 4. Donner les clés à l'application

Dans le dépôt GitHub : **Settings → Secrets and variables → Actions** →
**New repository secret**, créer les deux secrets :

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | l'adresse du projet |
| `VITE_SUPABASE_ANON_KEY` | la clé `anon public` |

Le workflow de déploiement les injecte au moment de la construction du site.

## 5. Créer les comptes

Dans **Authentication → Users → Add user**, créer un compte par personne
(courriel + mot de passe).

Chaque nouveau compte reçoit automatiquement le rôle **`chantier`**, le moins
privilégié — un compte créé par erreur ne donne donc jamais accès aux données
financières.

Pour passer un compte au bureau, dans **SQL Editor** :

```sql
update public.profiles
   set role = 'bureau'
 where id = (select id from auth.users where email = 'vous@exemple.com');
```

Pour rattacher un compte chantier à sa fiche employé — ce qui lui permet de ne
voir que ses propres heures :

```sql
update public.profiles
   set employee_id = 3      -- identifiant de la fiche employé
 where id = (select id from auth.users where email = 'employe@exemple.com');
```

## Ce que voit chaque rôle

| | Bureau | Chantier |
|---|---|---|
| Clients, soumissions, factures | Oui | **Non** |
| Matériaux, sous-traitants | Oui | **Non** |
| Paie et banques d'heures | Oui | **Non** |
| Projets | Tout | Sans les montants |
| Employés | Tout | Consultation |
| Feuilles de temps | Toutes | **Les siennes uniquement** |

Un compte chantier ne peut pas contourner ces limites en modifiant
l'application dans son navigateur : les restrictions sont appliquées par la
base de données elle-même, pas par l'interface.
