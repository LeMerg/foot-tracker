drop table if exists public._diag_results;

create table if not exists public.diag_results (line text);

insert into public.diag_results (line)
select format('policy=%s cmd=%s roles=%s qual=%s check=%s', policyname, cmd, roles, qual, with_check)
from pg_policies where tablename = 'matches_cache';

insert into public.diag_results (line)
select format('rowsecurity=%s forcerowsecurity=%s', relrowsecurity, relforcerowsecurity)
from pg_class where relname = 'matches_cache';

insert into public.diag_results (line)
select format('grantee=%s privilege=%s', grantee, privilege_type)
from information_schema.role_table_grants
where table_name = 'matches_cache' and grantee in ('anon','authenticated');

alter table public.diag_results enable row level security;
create policy "diag_select_all" on public.diag_results for select using (true);
grant select on public.diag_results to anon, authenticated;
