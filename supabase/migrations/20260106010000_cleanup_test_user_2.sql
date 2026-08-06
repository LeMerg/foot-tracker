-- Supprime le compte de test "TestUI" créé pendant la vérification de la
-- grille calendrier mensuelle (même raison que la migration précédente).
delete from public.users where lower(pseudo) = lower('TestUI');
