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
