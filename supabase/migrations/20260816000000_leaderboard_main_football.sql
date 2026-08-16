-- ============================================================================
-- Ajoute une colonne au classement : football_main_watched, qui ne compte
-- que les 5 grands championnats (PL/PD/BL1/FL1/SA) + la Ligue des Champions
-- — contrairement à football_watched qui compte aussi les 5 compétitions
-- ajoutées via Highlightly (Eredivisie, Jupiler Pro League, Primeira Liga,
-- Ligue Europa, Ligue Europa Conférence). Devient le classement foot par
-- défaut côté site (voir LeaderboardPage.jsx).
--
-- Les matchs ajoutés manuellement (custom_matches) restent comptés ici : ce
-- sont des matchs qui échappent à l'API précisément parce qu'ils n'y sont
-- pas (ex. amicaux), rien n'indique qu'ils appartiennent aux compétitions
-- exclues, donc pas de raison de les en priver.
--
-- CREATE OR REPLACE VIEW interdit de réordonner/retirer des colonnes
-- existantes : la nouvelle colonne va à la fin, comme la dernière fois.
-- ============================================================================
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
  coalesce(r.cnt, 0)::int as f1_watched,
  (coalesce(mfm.cnt, 0) + coalesce(cm.cnt, 0))::int as football_main_watched
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
left join (
  select user_id, count(*) as cnt from public.watched_matches
  where league in ('PL', 'PD', 'BL1', 'FL1', 'SA', 'CL')
  group by user_id
) mfm on mfm.user_id = u.id
order by total_watched desc, u.pseudo asc;

grant select on public.leaderboard to anon, authenticated;
