-- Backdate le cache Serie A pour forcer un vrai refresh au prochain appel
-- de l'Edge Function, afin de tester le nouvel upsert (sport, external_id).
update public.matches_cache set fetched_at = now() - interval '7 hours' where league = 'SA';
