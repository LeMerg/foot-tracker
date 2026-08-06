-- Supprime le profil "LeMerg" de l'app à la demande de l'utilisateur
-- (les matchs vus associés partent avec, via la contrainte on delete cascade
-- de watched_matches.user_id).
delete from public.users where lower(pseudo) = lower('LeMerg');
