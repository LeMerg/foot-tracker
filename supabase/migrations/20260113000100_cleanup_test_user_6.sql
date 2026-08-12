-- Supprime le compte de test "V2StatusTest" créé pendant la vérification
-- des logos NBA / statuts d'événements / trigger anti double-comptage.
delete from public.users where lower(pseudo) = lower('V2StatusTest');
