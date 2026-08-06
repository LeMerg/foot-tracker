create table if not exists public.diag_results (line text);
insert into public.diag_results (line)
select format('table=%s constraint=%s def=%s', conrelid::regclass, conname, pg_get_constraintdef(oid))
from pg_constraint
where conrelid in ('public.matches_cache'::regclass, 'public.watched_matches'::regclass) and contype = 'c';
alter table public.diag_results enable row level security;
create policy "diag_select_all" on public.diag_results for select using (true);
grant select on public.diag_results to anon, authenticated;
