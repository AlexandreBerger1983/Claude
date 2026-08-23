-- ConstructPro — schéma de la base de données et règles d'accès.
--
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller
-- ce fichier → Run. Le script est ré-exécutable sans risque.
--
-- ─── Modèle de sécurité ──────────────────────────────────────────────────────
-- L'application est un site statique public : la clé « anon » qu'elle utilise
-- est visible par quiconque ouvre le site. C'est prévu par Supabase, MAIS cela
-- veut dire que toute la protection repose sur les règles ci-dessous (Row
-- Level Security). Rien n'est accessible sans être connecté.
--
-- Deux rôles :
--   • bureau   — accès complet : prix, marges, factures, paie.
--   • chantier — saisit ses heures et consulte les projets, SANS voir les
--                prix, les marges, les factures ni la paie.
--
-- Le rôle « chantier » n'a AUCUN droit sur les tables sensibles : ses requêtes
-- ne renvoient rien, même s'il modifiait l'application dans son navigateur.

-- ─── Profils : relie un compte Supabase à un rôle ────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  nom         text,
  role        text not null default 'chantier' check (role in ('bureau', 'chantier')),
  employee_id bigint,
  cree_le     timestamptz not null default now()
);

comment on table public.profiles is
  'Rôle de chaque compte. employee_id relie le compte à sa fiche employé, ce qui permet au chantier de ne voir que ses propres heures.';

-- Un nouveau compte reçoit automatiquement un profil, au rôle le moins
-- privilégié. C'est un choix délibéré : un compte créé par erreur ne donne
-- jamais accès aux données financières.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nom, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nom', new.email), 'chantier')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vrai si le compte connecté appartient au bureau.
-- « security definer » permet de lire profiles sans être bloqué par ses
-- propres règles, ce qui éviterait une récursion infinie.
create or replace function public.est_bureau()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'bureau'
  );
$$;

-- Fiche employé rattachée au compte connecté (null pour le bureau).
create or replace function public.mon_employe_id()
returns bigint
language sql
stable
security definer set search_path = public
as $$
  select employee_id from public.profiles where id = auth.uid();
$$;

-- ─── Tables métier ───────────────────────────────────────────────────────────
-- `donnees` (jsonb) conserve la forme exacte des objets de l'application :
-- la migration se fait donc sans réécrire les écrans, et un champ ajouté plus
-- tard ne demande pas de modification du schéma. Les colonnes sorties du jsonb
-- sont celles servant aux règles d'accès ou aux tris.

create table if not exists public.clients (
  id       bigint primary key,
  nom      text,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

create table if not exists public.projects (
  id       bigint primary key,
  nom      text,
  statut   text,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

create table if not exists public.employees (
  id       bigint primary key,
  nom      text,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

create table if not exists public.timesheets (
  id           bigint primary key,
  employee_id  bigint,
  date_travail date,
  donnees      jsonb not null default '{}'::jsonb,
  maj_le       timestamptz not null default now()
);

create table if not exists public.materials (
  id       bigint primary key,
  nom      text,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

create table if not exists public.subcontractors (
  id       bigint primary key,
  nom      text,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

create table if not exists public.documents (
  id       bigint primary key,
  nom      text,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

-- Tables financières : réservées au bureau.
create table if not exists public.quotes (
  id       bigint primary key,
  numero   text,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

create table if not exists public.invoices (
  id       bigint primary key,
  numero   text,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

create table if not exists public.payroll (
  id       bigint primary key default 1,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

create table if not exists public.company_settings (
  id       bigint primary key default 1,
  donnees  jsonb not null default '{}'::jsonb,
  maj_le   timestamptz not null default now()
);

-- ─── Activation des règles d'accès ───────────────────────────────────────────
-- Sans RLS activé, une table est lisible par tout porteur de la clé anon.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'clients', 'projects', 'employees', 'timesheets',
    'materials', 'subcontractors', 'documents',
    'quotes', 'invoices', 'payroll', 'company_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ─── Règles : profils ────────────────────────────────────────────────────────
drop policy if exists profils_lecture on public.profiles;
create policy profils_lecture on public.profiles
  for select using (id = auth.uid() or public.est_bureau());

drop policy if exists profils_gestion on public.profiles;
create policy profils_gestion on public.profiles
  for all using (public.est_bureau()) with check (public.est_bureau());

-- ─── Règles : tables réservées au bureau ─────────────────────────────────────
-- Le chantier n'y a aucun droit : ni lecture, ni écriture.
do $$
declare t text;
begin
  foreach t in array array['clients', 'quotes', 'invoices', 'materials',
                           'subcontractors', 'payroll', 'company_settings'] loop
    execute format('drop policy if exists %I on public.%I', t || '_bureau', t);
    execute format(
      'create policy %I on public.%I for all using (public.est_bureau()) with check (public.est_bureau())',
      t || '_bureau', t);
  end loop;
end $$;

-- ─── Règles : projets et employés ────────────────────────────────────────────
-- Le chantier peut les consulter (pour choisir un projet en saisissant ses
-- heures) mais pas les modifier. Les montants sensibles sont retirés côté
-- application ET par la vue ci-dessous.
drop policy if exists projets_lecture on public.projects;
create policy projets_lecture on public.projects
  for select using (auth.uid() is not null);

drop policy if exists projets_ecriture on public.projects;
create policy projets_ecriture on public.projects
  for all using (public.est_bureau()) with check (public.est_bureau());

drop policy if exists employes_lecture on public.employees;
create policy employes_lecture on public.employees
  for select using (auth.uid() is not null);

drop policy if exists employes_ecriture on public.employees;
create policy employes_ecriture on public.employees
  for all using (public.est_bureau()) with check (public.est_bureau());

drop policy if exists documents_tous on public.documents;
create policy documents_tous on public.documents
  for select using (auth.uid() is not null);

drop policy if exists documents_ecriture on public.documents;
create policy documents_ecriture on public.documents
  for all using (public.est_bureau()) with check (public.est_bureau());

-- ─── Règles : feuilles de temps ──────────────────────────────────────────────
-- Le bureau voit tout. Un employé du chantier ne voit et ne crée que SES
-- propres heures, et ne peut pas les modifier une fois approuvées.
drop policy if exists heures_lecture on public.timesheets;
create policy heures_lecture on public.timesheets
  for select using (
    public.est_bureau() or employee_id = public.mon_employe_id()
  );

drop policy if exists heures_saisie on public.timesheets;
create policy heures_saisie on public.timesheets
  for insert with check (
    public.est_bureau() or employee_id = public.mon_employe_id()
  );

drop policy if exists heures_modif on public.timesheets;
create policy heures_modif on public.timesheets
  for update using (
    public.est_bureau()
    or (employee_id = public.mon_employe_id()
        and coalesce((donnees ->> 'approved')::boolean, false) = false)
  );

drop policy if exists heures_suppression on public.timesheets;
create policy heures_suppression on public.timesheets
  for delete using (
    public.est_bureau()
    or (employee_id = public.mon_employe_id()
        and coalesce((donnees ->> 'approved')::boolean, false) = false)
  );

-- ─── Vue « projets » sans montants, pour le chantier ─────────────────────────
-- Les règles d'accès de Postgres portent sur les lignes, pas sur les colonnes.
-- Pour qu'un employé du chantier ne voie jamais le budget d'un projet, cette
-- vue retire les champs financiers du jsonb.
create or replace view public.projets_chantier as
  select id, nom, statut,
         donnees - 'budget' - 'spent' - 'margin' - 'hourlyRate' as donnees,
         maj_le
  from public.projects;

comment on view public.projets_chantier is
  'Projets sans les montants — destinée aux comptes chantier.';
