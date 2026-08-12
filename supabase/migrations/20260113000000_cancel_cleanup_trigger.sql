-- Anti double-comptage : si un match déjà marqué "vu" par des utilisateurs
-- passe au statut "annulé" (par ex. l'API le confirme après coup), on
-- retire automatiquement ces lignes watched_matches. Garantit qu'un match
-- annulé ne compte JAMAIS dans un total, même s'il avait été vu avant
-- l'annulation. Ne touche à rien tant qu'aucun match n'est annulé (aucun
-- effet sur les données existantes).
create or replace function public.remove_watched_on_cancellation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'CANCELLED' and (old.status is distinct from 'CANCELLED') then
    delete from public.watched_matches where match_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_cache_cancel_cleanup on public.matches_cache;
create trigger matches_cache_cancel_cleanup
after update on public.matches_cache
for each row
execute function public.remove_watched_on_cancellation();
