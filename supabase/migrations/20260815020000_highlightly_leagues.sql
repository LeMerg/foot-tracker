-- ============================================================================
-- Ajoute 5 nouvelles compétitions de foot via l'API Highlightly (en plus
-- des 5 grands championnats + C1 déjà couverts par football-data.org) :
-- Eredivisie (ERE), Jupiler Pro League (JPL), Primeira Liga (PPL),
-- Ligue Europa (EL), Ligue Europa Conférence (ECL). Même pattern que
-- l'ajout de 'NBA' dans 20260112000000_multisport.sql.
-- ============================================================================

alter table public.matches_cache drop constraint matches_cache_league_check;
alter table public.matches_cache add constraint matches_cache_league_check
  check (league in ('PL','PD','BL1','FL1','SA','CL','NBA','ERE','JPL','PPL','EL','ECL'));

alter table public.watched_matches drop constraint watched_matches_league_check;
alter table public.watched_matches add constraint watched_matches_league_check
  check (league in ('PL','PD','BL1','FL1','SA','CL','NBA','ERE','JPL','PPL','EL','ECL'));
