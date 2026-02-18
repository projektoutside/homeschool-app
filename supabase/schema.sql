-- Create table for per-user manager configuration
create table if not exists public.user_manager_configs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_manager_configs_updated_at_idx
  on public.user_manager_configs (updated_at desc);

alter table public.user_manager_configs enable row level security;

-- Users can only read/write their own config row
drop policy if exists "Users can read own manager config" on public.user_manager_configs;
create policy "Users can read own manager config"
  on public.user_manager_configs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own manager config" on public.user_manager_configs;
create policy "Users can insert own manager config"
  on public.user_manager_configs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own manager config" on public.user_manager_configs;
create policy "Users can update own manager config"
  on public.user_manager_configs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own manager config" on public.user_manager_configs;
create policy "Users can delete own manager config"
  on public.user_manager_configs
  for delete
  using (auth.uid() = user_id);

-- Per-user 3D classroom app state (layout, lock state, component files)
create table if not exists public.user_classroom_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null default '',
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_classroom_states_username_idx
  on public.user_classroom_states (username);

create index if not exists user_classroom_states_updated_at_idx
  on public.user_classroom_states (updated_at desc);

alter table public.user_classroom_states enable row level security;

drop policy if exists "Users can read own classroom state" on public.user_classroom_states;
create policy "Users can read own classroom state"
  on public.user_classroom_states
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own classroom state" on public.user_classroom_states;
create policy "Users can insert own classroom state"
  on public.user_classroom_states
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own classroom state" on public.user_classroom_states;
create policy "Users can update own classroom state"
  on public.user_classroom_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own classroom state" on public.user_classroom_states;
create policy "Users can delete own classroom state"
  on public.user_classroom_states
  for delete
  using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.user_classroom_states;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- Global 3D classroom state controlled by manager users and shared to all users
create table if not exists public.classroom_global_states (
  app_id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_by_username text not null default ''
);

create index if not exists classroom_global_states_updated_at_idx
  on public.classroom_global_states (updated_at desc);

alter table public.classroom_global_states enable row level security;

drop policy if exists "Authenticated users can read classroom global state" on public.classroom_global_states;
create policy "Authenticated users can read classroom global state"
  on public.classroom_global_states
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Manager users can insert classroom global state" on public.classroom_global_states;
create policy "Manager users can insert classroom global state"
  on public.classroom_global_states
  for insert
  with check (
    lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) in ('manager', 'admin', 'owner')
    or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_manager', 'false')) in ('1', 'true', 'yes', 'on')
  );

drop policy if exists "Manager users can update classroom global state" on public.classroom_global_states;
create policy "Manager users can update classroom global state"
  on public.classroom_global_states
  for update
  using (
    lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) in ('manager', 'admin', 'owner')
    or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_manager', 'false')) in ('1', 'true', 'yes', 'on')
  )
  with check (
    lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) in ('manager', 'admin', 'owner')
    or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_manager', 'false')) in ('1', 'true', 'yes', 'on')
  );

drop policy if exists "Manager users can delete classroom global state" on public.classroom_global_states;
create policy "Manager users can delete classroom global state"
  on public.classroom_global_states
  for delete
  using (
    lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '')) in ('manager', 'admin', 'owner')
    or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'is_manager', 'false')) in ('1', 'true', 'yes', 'on')
  );

do $$
begin
  alter publication supabase_realtime add table public.classroom_global_states;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
