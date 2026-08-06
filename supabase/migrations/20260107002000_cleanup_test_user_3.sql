-- Supprime le compte de test "TestCL" créé pendant la vérification de
-- l'intégration Ligue des Champions.
delete from public.users where lower(pseudo) = lower('TestCL');
