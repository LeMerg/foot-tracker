-- Sans ce backfill, la première vraie exécution de notify-discord (une fois
-- les secrets webhook posés) enverrait d'un coup toute la rétro-compatibilité
-- déjà en cache (150+ matchs terminés, plusieurs courses passées) — on
-- marque tout ce qui est déjà fini comme "déjà notifié" pour que la
-- fonctionnalité ne s'applique qu'aux matchs/courses qui se termineront
-- APRÈS l'activation.
update public.matches_cache set notified_at = now() where status = 'FINISHED' and notified_at is null;
update public.races_cache set notified_at = now() where notified_at is null;
