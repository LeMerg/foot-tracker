-- Ajoute la Ligue des Champions (CL) aux ligues acceptées pour les matchs
-- et les matchs vus. favorite_league (l'équipe de cœur) reste volontairement
-- limité aux 5 championnats domestiques : la Ligue des Champions n'est pas
-- un championnat "d'appartenance" d'une équipe, juste une compétition
-- ponctuelle qu'on peut suivre en plus.
alter table public.matches_cache drop constraint matches_cache_league_check;
alter table public.matches_cache add constraint matches_cache_league_check
  check (league in ('PL','PD','BL1','FL1','SA','CL'));

alter table public.watched_matches drop constraint watched_matches_league_check;
alter table public.watched_matches add constraint watched_matches_league_check
  check (league in ('PL','PD','BL1','FL1','SA','CL'));

drop table if exists public.diag_results;
