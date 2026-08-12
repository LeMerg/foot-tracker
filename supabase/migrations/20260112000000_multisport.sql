-- ============================================================================
-- Refonte multi-sport : ajout NBA (partage matches_cache avec le foot) et
-- Formule 1 (nouveau modèle races_cache/watched_races, une course ne
-- ressemble pas à un match : plusieurs sessions, classement à 20+ pilotes).
-- Voir le plan de cette session pour le détail des choix.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- matches_cache : ajoute sport + external_id (id technique séparé de l'id
-- fourni par la source externe). Nécessaire car on mélange maintenant deux
-- fournisseurs différents (football-data.org, balldontlie) dont les
-- identifiants pourraient un jour se chevaucher — l'ancienne colonne `id`
-- utilisait directement l'id externe comme clé primaire, ce qui n'est plus
-- sûr avec plusieurs sources.
-- ----------------------------------------------------------------------------
alter table public.matches_cache add column if not exists sport text not null default 'football';
alter table public.matches_cache add constraint matches_cache_sport_check check (sport in ('football','basketball'));

alter table public.matches_cache add column if not exists external_id bigint;
update public.matches_cache set external_id = id where external_id is null;
alter table public.matches_cache alter column external_id set not null;
alter table public.matches_cache add constraint matches_cache_sport_external_id_key unique (sport, external_id);

alter table public.matches_cache drop constraint matches_cache_league_check;
alter table public.matches_cache add constraint matches_cache_league_check
  check (league in ('PL','PD','BL1','FL1','SA','CL','NBA'));

alter table public.watched_matches drop constraint watched_matches_league_check;
alter table public.watched_matches add constraint watched_matches_league_check
  check (league in ('PL','PD','BL1','FL1','SA','CL','NBA'));

-- ----------------------------------------------------------------------------
-- Table: races_cache — week-ends de course F1 (Grands Prix), remplie par
-- l'Edge Function "fetch-races" (clé service_role, comme matches_cache).
-- Les sessions (essais, qualifs, course...) sont stockées en jsonb : très
-- peu de volume (~5 sessions x ~24 courses/an), pas besoin d'une table à part.
-- ----------------------------------------------------------------------------
create table if not exists public.races_cache (
  id            bigint primary key, -- meeting_key OpenF1
  name          text not null, -- ex: "Bahrain Grand Prix"
  country       text,
  country_flag  text,
  circuit       text,
  date_start    timestamptz not null,
  date_end      timestamptz not null,
  sessions      jsonb not null default '[]'::jsonb,
  fetched_at    timestamptz not null default now()
);

create index if not exists races_cache_date_start_idx on public.races_cache (date_start);

alter table public.races_cache enable row level security;
create policy "races_cache_select_all" on public.races_cache for select using (true);
grant select on public.races_cache to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Table: watched_races — quels week-ends de course chaque utilisateur a
-- marqués "vu" (suivi au niveau du week-end entier, pas par session).
-- ----------------------------------------------------------------------------
create table if not exists public.watched_races (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  race_id    bigint not null references public.races_cache (id) on delete cascade,
  watched_at timestamptz not null default now(),
  unique (user_id, race_id)
);

create index if not exists watched_races_user_id_idx on public.watched_races (user_id);

alter table public.watched_races enable row level security;
-- Même honor-system que watched_matches (voir schema.sql pour le raisonnement).
create policy "watched_races_select_all" on public.watched_races for select using (true);
create policy "watched_races_insert_open" on public.watched_races for insert with check (true);
create policy "watched_races_delete_open" on public.watched_races for delete using (true);
grant select, insert, delete on public.watched_races to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Vue leaderboard : le total combine désormais matchs (foot+NBA) ET courses
-- F1 regardées.
-- ----------------------------------------------------------------------------
create or replace view public.leaderboard
with (security_invoker = true) as
select
  u.id as user_id,
  u.pseudo,
  u.favorite_team,
  u.favorite_league,
  (coalesce(m.cnt, 0) + coalesce(r.cnt, 0))::int as total_watched
from public.users u
left join (
  select user_id, count(*) as cnt from public.watched_matches group by user_id
) m on m.user_id = u.id
left join (
  select user_id, count(*) as cnt from public.watched_races group by user_id
) r on r.user_id = u.id
order by total_watched desc, u.pseudo asc;
