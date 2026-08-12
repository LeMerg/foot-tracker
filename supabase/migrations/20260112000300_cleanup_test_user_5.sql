-- Supprime le compte de test "MultiSportTest" créé pendant la vérification
-- de la refonte multi-sport (NBA + F1). watched_matches/watched_races liés
-- partent avec via les on delete cascade.
delete from public.users where lower(pseudo) = lower('MultiSportTest');
