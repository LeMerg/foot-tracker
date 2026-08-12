-- ============================================================================
-- Cache pour les classements de session F1. Auparavant récupéré en direct
-- depuis OpenF1 côté navigateur : en pratique, OpenF1 applique une vraie
-- limite de débit (429 constaté en test) et un appel navigateur→navigateur
-- répété (fermer/rouvrir la modale) refaisait systématiquement les 2 appels
-- (session_result + drivers). Passage par une Edge Function (même pattern
-- que fetch-match-detail) : un seul appel externe par session, jamais
-- répété une fois le résultat mis en cache (le classement final d'une
-- session terminée ne change plus).
-- ============================================================================

create table if not exists public.session_results_cache (
  session_key bigint primary key,
  results     jsonb not null,
  fetched_at  timestamptz not null default now()
);

alter table public.session_results_cache enable row level security;
-- Lecture publique, comme matches_cache/races_cache. Écriture uniquement via
-- la clé service_role dans l'Edge Function (aucune policy insert/update ici).
create policy "session_results_cache_select_all" on public.session_results_cache for select using (true);
grant select on public.session_results_cache to anon, authenticated;
