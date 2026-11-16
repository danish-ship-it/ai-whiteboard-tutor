-- Chalk: tenants (a school, a class, a review team), their members, and the lessons they save.
-- Every table has row-level security: a signed-in user only ever sees rows of tenants they belong to.

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic text not null check (char_length(topic) <= 500),
  title text not null check (char_length(title) <= 200),
  lesson jsonb not null,
  -- Signed lesson token so follow-up questions keep working (they expire after 12 hours).
  token text not null,
  token_expires_at timestamptz not null,
  -- Narration audio lives in the private "narration" bucket at <tenant_id>/<lesson id>.
  audio_path text,
  mime_type text,
  alignment jsonb,
  normalized_alignment jsonb,
  duration real not null default 0,
  -- Step pictures and clips by scene id: {"s1": {"image": "...", "video": "..."}}.
  visuals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now()
);
create index lessons_tenant_created_idx on public.lessons (tenant_id, created_at desc);

-- Tenants the current user belongs to. SECURITY DEFINER so policies on memberships
-- can use it without recursing into themselves; it only ever returns the caller's own tenants.
create function public.my_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenant_id from public.memberships where user_id = (select auth.uid())
$$;
revoke all on function public.my_tenant_ids() from public, anon;
grant execute on function public.my_tenant_ids() to authenticated;

alter table public.tenants enable row level security;
alter table public.memberships enable row level security;
alter table public.lessons enable row level security;

-- Tenants and memberships are read-only from the app; they are created by the seed script.
create policy "members read their tenants" on public.tenants
  for select to authenticated using (id in (select public.my_tenant_ids()));

create policy "members read their tenant's memberships" on public.memberships
  for select to authenticated using (tenant_id in (select public.my_tenant_ids()));

create policy "members read their tenant's lessons" on public.lessons
  for select to authenticated using (tenant_id in (select public.my_tenant_ids()));

create policy "members add lessons to their tenant" on public.lessons
  for insert to authenticated
  with check (tenant_id in (select public.my_tenant_ids()) and created_by = (select auth.uid()));

create policy "members update their tenant's lessons" on public.lessons
  for update to authenticated
  using (tenant_id in (select public.my_tenant_ids()))
  with check (tenant_id in (select public.my_tenant_ids()));

create policy "members delete their tenant's lessons" on public.lessons
  for delete to authenticated using (tenant_id in (select public.my_tenant_ids()));

-- Narration audio: a private bucket, foldered by tenant id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('narration', 'narration', false, 15728640, array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm']);

create policy "members read their tenant's narration" on storage.objects
  for select to authenticated
  using (bucket_id = 'narration' and (storage.foldername(name))[1]::uuid in (select public.my_tenant_ids()));

create policy "members upload their tenant's narration" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'narration' and (storage.foldername(name))[1]::uuid in (select public.my_tenant_ids()));

create policy "members delete their tenant's narration" on storage.objects
  for delete to authenticated
  using (bucket_id = 'narration' and (storage.foldername(name))[1]::uuid in (select public.my_tenant_ids()));
