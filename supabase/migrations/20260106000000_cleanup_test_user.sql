-- Supprime le compte de test "Mergim" créé pendant la vérification du site
-- (la table users n'a pas de policy RLS DELETE côté clé publique, donc ce
-- nettoyage doit passer par une migration plutôt que par le frontend).
delete from public.users where lower(pseudo) = lower('Mergim');
