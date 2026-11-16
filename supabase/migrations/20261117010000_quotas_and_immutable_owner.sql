-- 1. A lesson's school and author can't be changed after it is saved.
create function public.keep_lesson_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id or new.created_by is distinct from old.created_by then
    raise exception 'A lesson''s school and author can''t be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger lessons_keep_owner
  before update on public.lessons
  for each row execute function public.keep_lesson_owner();

-- 2. Daily AI budget per school, shared by every server instance.
create table public.usage (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null,
  day date not null default current_date,
  count integer not null default 0,
  primary key (tenant_id, kind, day)
);
-- No policies: only use_quota below can read or change it.
alter table public.usage enable row level security;

-- Counts one paid call against the caller's school and says whether it is within today's budget.
-- The insert-or-increment is a single statement, so concurrent calls can't overspend.
create function public.use_quota(p_kind text, p_daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_count integer;
begin
  select m.tenant_id into v_tenant
  from public.memberships m
  where m.user_id = (select auth.uid())
  order by m.created_at
  limit 1;
  if v_tenant is null or p_daily_limit < 1 then
    return false;
  end if;

  insert into public.usage as u (tenant_id, kind, day, count)
  values (v_tenant, p_kind, current_date, 1)
  on conflict (tenant_id, kind, day) do update
    set count = u.count + 1
    where u.count < p_daily_limit
  returning u.count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.use_quota(text, integer) from public, anon;
grant execute on function public.use_quota(text, integer) to authenticated;
revoke all on function public.keep_lesson_owner() from public, anon, authenticated;
