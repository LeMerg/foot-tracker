-- ============================================================================
-- Classement filtrable par sport (Tout / Foot / NBA / F1) + ajout de matchs
-- de foot "faits main" (hors cache API : matchs amateurs, historiques,
-- amicaux, absents de football-data.org).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: custom_matches — matchs de foot ajoutés manuellement par un
-- utilisateur. Équipes en texte libre (ne référencent pas forcément
-- matches_cache/teams.json, puisque ce sont justement des matchs absents de
-- l'API). Créer une ligne = l'avoir vu (pas d'étape "marquer vu" séparée,
-- donc pas de table watched_* additionnelle ici).
-- ----------------------------------------------------------------------------
create table if not exists public.custom_matches (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.users (id) on delete cascade,
  home_team   text not null,
  away_team   text not null,
  home_score  int,
  away_score  int,
  played_on   date,
  created_at  timestamptz not null default now(),

  constraint custom_matches_team_names_length check (
    char_length(home_team) between 1 and 60
    and char_length(away_team) between 1 and 60
  ),
  constraint custom_matches_distinct_teams check (
    lower(home_team) <> lower(away_team)
  ),
  constraint custom_matches_scores_both_or_none check (
    (home_score is null) = (away_score is null)
  ),
  constraint custom_matches_scores_non_negative check (
    (home_score is null or home_score >= 0)
    and (away_score is null or away_score >= 0)
  )
);

create index if not exists custom_matches_user_id_idx on public.custom_matches (user_id);

alter table public.custom_matches enable row level security;
-- Même honor-system que watched_matches/watched_races (voir schema.sql).
create policy "custom_matches_select_all" on public.custom_matches for select using (true);
create policy "custom_matches_insert_open" on public.custom_matches for insert with check (true);
create policy "custom_matches_delete_open" on public.custom_matches for delete using (true);
grant select, insert, delete on public.custom_matches to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Vue leaderboard : expose désormais le détail par sport en plus de
-- total_watched, pour permettre le filtrage du classement côté UI.
-- IMPORTANT : total_watched doit rester en 5e position (ordre de colonnes
-- déjà en place) — CREATE OR REPLACE VIEW interdit de réordonner/retirer des
-- colonnes existantes, seulement d'en ajouter à la fin.
--
-- football_watched   = matchs foot du cache (league <> 'NBA') + matchs
--                       ajoutés manuellement (custom_matches, 100% foot).
-- basketball_watched  = matchs NBA du cache (league = 'NBA').
-- f1_watched          = courses F1 vues (watched_races).
-- ----------------------------------------------------------------------------
create or replace view public.leaderboard
with (security_invoker = true) as
select
  u.id as user_id,
  u.pseudo,
  u.favorite_team,
  u.favorite_league,
  (coalesce(mf.cnt, 0) + coalesce(cm.cnt, 0) + coalesce(mb.cnt, 0) + coalesce(r.cnt, 0))::int as total_watched,
  (coalesce(mf.cnt, 0) + coalesce(cm.cnt, 0))::int as football_watched,
  coalesce(mb.cnt, 0)::int as basketball_watched,
  coalesce(r.cnt, 0)::int as f1_watched
from public.users u
left join (
  select user_id, count(*) as cnt from public.watched_matches where league <> 'NBA' group by user_id
) mf on mf.user_id = u.id
left join (
  select user_id, count(*) as cnt from public.watched_matches where league = 'NBA' group by user_id
) mb on mb.user_id = u.id
left join (
  select user_id, count(*) as cnt from public.custom_matches group by user_id
) cm on cm.user_id = u.id
left join (
  select user_id, count(*) as cnt from public.watched_races group by user_id
) r on r.user_id = u.id
order by total_watched desc, u.pseudo asc;

grant select on public.leaderboard to anon, authenticated;
