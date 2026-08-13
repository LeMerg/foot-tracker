-- ============================================================================
-- Notifications Discord (foot/NBA/F1 dans 3 salons séparés) quand un match
-- ou une course se termine, pour rappeler d'aller le marquer "vu" sur le
-- site. Un webhook Discord = juste une URL HTTPS à laquelle on POST un
-- message JSON, pas besoin d'héberger un vrai bot.
--
-- pg_cron + pg_net sont activés par défaut sur tout projet Supabase hébergé
-- (gratuit compris, vérifié 2026) : l'appel périodique de l'Edge Function
-- est donc entièrement géré ici, sans étape manuelle dans le dashboard.
-- ============================================================================

-- Anti-doublon : une ligne n'est notifiée qu'une fois, peu importe le
-- nombre de passages du cron.
alter table public.matches_cache add column if not exists notified_at timestamptz;
alter table public.races_cache add column if not exists notified_at timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'notify-discord-finished',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://njbfshxkismqikjzvrbm.supabase.co/functions/v1/notify-discord',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
