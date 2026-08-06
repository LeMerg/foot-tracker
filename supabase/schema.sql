-- ============================================================================
-- Foot Tracker — schéma Supabase (tables + Row Level Security)
--
-- À exécuter UNE FOIS dans Supabase : Dashboard > SQL Editor > New query
-- (colle tout ce fichier, puis "Run"). Voir le README pour le pas-à-pas.
--
-- Choix de sécurité assumé pour ce projet : pas d'authentification (juste un
-- pseudo, pas de mot de passe). Les policies RLS ci-dessous sont donc
-- "ouvertes" côté honor-system pour users/watched_matches (n'importe qui
-- avec la clé publique peut lire/écrire ces tables) — acceptable pour un
-- site privé entre amis de confiance. En revanche, la table matches_cache
-- (les matchs) n'est modifiable QUE par la clé service_role (utilisée par
-- l'Edge Function), jamais par la clé publique : ça évite que quelqu'un
-- pollue le calendrier de tout le monde.
-- ============================================================================

create extension if not exists pgcrypto; -- pour gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Table: users — un pseudo + une équipe favorite par utilisateur
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id             uuid primary key default gen_random_uuid(),
  pseudo         text not null,
  favorite_team  text,
  favorite_league text check (favorite_league is null or favorite_league in ('PL','PD','BL1','FL1','SA')),
  created_at     timestamptz not null default now(),

  constraint pseudo_format check (
    char_length(pseudo) between 2 and 20
    and pseudo ~ '^[a-zA-Z0-9 _-]+$'
  )
);

-- Unicité du pseudo insensible à la casse ("Mergim" et "mergim" = même pseudo)
create unique index if not exists users_pseudo_lower_idx on public.users (lower(pseudo));

-- ----------------------------------------------------------------------------
-- Table: matches_cache — cache local des matchs récupérés depuis football-data.org
-- Remplie uniquement par l'Edge Function "fetch-matches" (clé service_role).
-- Créée AVANT watched_matches car cette dernière la référence par clé étrangère.
-- ----------------------------------------------------------------------------
create table if not exists public.matches_cache (
  id          bigint primary key, -- id du match côté football-data.org (réutilisé tel quel)
  -- 'CL' = Ligue des Champions, en plus des 5 championnats domestiques.
  league      text not null check (league in ('PL','PD','BL1','FL1','SA','CL')),
  matchday    int,
  utc_date    timestamptz not null,
  status      text not null, -- SCHEDULED, TIMED, IN_PLAY, FINISHED, POSTPONED, ...
  home_team   text not null,
  home_crest  text,
  away_team   text not null,
  away_crest  text,
  home_score  int,
  away_score  int,
  fetched_at  timestamptz not null default now()
);

create index if not exists matches_cache_league_idx on public.matches_cache (league);
create index if not exists matches_cache_utc_date_idx on public.matches_cache (utc_date);

-- ----------------------------------------------------------------------------
-- Table: watched_matches — quels matchs chaque utilisateur a marqué "vu"
-- ----------------------------------------------------------------------------
create table if not exists public.watched_matches (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  -- Référence matches_cache (et pas l'inverse) : on ne peut marquer "vu"
  -- qu'un match déjà présent dans le cache, ce qui est toujours le cas
  -- puisqu'on ne clique "vu" que sur un match déjà affiché à l'écran.
  match_id   bigint not null references public.matches_cache (id) on delete cascade,
  league     text not null check (league in ('PL','PD','BL1','FL1','SA','CL')),
  watched_at timestamptz not null default now(),

  unique (user_id, match_id) -- un match ne peut être marqué "vu" qu'une fois par utilisateur
);

create index if not exists watched_matches_user_id_idx on public.watched_matches (user_id);
create index if not exists watched_matches_match_id_idx on public.watched_matches (match_id);

-- ----------------------------------------------------------------------------
-- Vue: leaderboard — classement des utilisateurs par nombre de matchs vus
-- "security_invoker = true" : la vue respecte les policies RLS de l'appelant
-- au lieu de s'exécuter avec les droits du propriétaire de la vue.
-- ----------------------------------------------------------------------------
create or replace view public.leaderboard
with (security_invoker = true) as
select
  u.id as user_id,
  u.pseudo,
  u.favorite_team,
  u.favorite_league,
  count(w.id)::int as total_watched
from public.users u
left join public.watched_matches w on w.user_id = u.id
group by u.id
order by total_watched desc, u.pseudo asc;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.users enable row level security;
alter table public.watched_matches enable row level security;
alter table public.matches_cache enable row level security;

-- users : tout le monde peut lire (classement, profils publics),
-- tout le monde peut créer son pseudo et modifier son équipe favorite plus tard.
create policy "users_select_all" on public.users
  for select using (true);

create policy "users_insert_open" on public.users
  for insert with check (true);

create policy "users_update_open" on public.users
  for update using (true) with check (true);

-- Pas de policy DELETE => personne ne peut supprimer un profil via la clé publique.

-- watched_matches : lecture publique (classement + détails par utilisateur),
-- écriture publique pour marquer/démarquer un match comme vu.
create policy "watched_select_all" on public.watched_matches
  for select using (true);

create policy "watched_insert_open" on public.watched_matches
  for insert with check (true);

create policy "watched_delete_open" on public.watched_matches
  for delete using (true);

-- matches_cache : lecture publique uniquement. Les écritures passent
-- exclusivement par l'Edge Function (clé service_role, qui contourne RLS) —
-- aucune policy INSERT/UPDATE/DELETE n'est créée ici, donc la clé anon
-- ne peut pas modifier le calendrier.
create policy "matches_cache_select_all" on public.matches_cache
  for select using (true);

-- ----------------------------------------------------------------------------
-- Droits d'accès explicites pour les rôles publics de Supabase
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update on public.users to anon, authenticated;
grant select, insert, delete on public.watched_matches to anon, authenticated;
grant select on public.matches_cache to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;
