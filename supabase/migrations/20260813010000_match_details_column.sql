-- ============================================================================
-- Détail au clic pour les matchs déjà joués (foot : score mi-temps, arbitre,
-- stage — récupéré à la demande et caché de façon permanente ; NBA : score
-- quart-temps, déjà présent dans la réponse balldontlie qu'on récupère en
-- masse, juste jeté jusqu'ici). Nullable : les lignes existantes et les
-- matchs pas encore joués ont simplement details = null.
-- ============================================================================

alter table public.matches_cache add column if not exists details jsonb;
