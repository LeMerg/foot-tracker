-- Supprime le compte de test "CrossDeviceTest" créé pendant la vérification
-- du flux de connexion multi-appareils.
delete from public.users where lower(pseudo) = lower('CrossDeviceTest');
