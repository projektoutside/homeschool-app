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

create or replace function public.current_user_has_manager_role()
returns boolean
language sql
stable
as $$
  select (
    lower(
      coalesce(
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      )
    ) in ('manager', 'admin', 'owner')
    or lower(
      coalesce(
        auth.jwt() -> 'app_metadata' ->> 'is_manager',
        auth.jwt() -> 'user_metadata' ->> 'is_manager',
        auth.jwt() -> 'app_metadata' ->> 'manager',
        auth.jwt() -> 'user_metadata' ->> 'manager',
        'false'
      )
    ) in ('1', 'true', 'yes', 'on')
  );
$$;

drop policy if exists "Authenticated users can read classroom global state" on public.classroom_global_states;
create policy "Authenticated users can read classroom global state"
  on public.classroom_global_states
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Manager users can insert classroom global state" on public.classroom_global_states;
create policy "Manager users can insert classroom global state"
  on public.classroom_global_states
  for insert
  with check (public.current_user_has_manager_role());

drop policy if exists "Manager users can update classroom global state" on public.classroom_global_states;
create policy "Manager users can update classroom global state"
  on public.classroom_global_states
  for update
  using (public.current_user_has_manager_role())
  with check (public.current_user_has_manager_role());

drop policy if exists "Manager users can delete classroom global state" on public.classroom_global_states;
create policy "Manager users can delete classroom global state"
  on public.classroom_global_states
  for delete
  using (public.current_user_has_manager_role());

do $$
begin
  alter publication supabase_realtime add table public.classroom_global_states;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- Live HomepageAPP categories controlled by manager users
create table if not exists public.homepage_prop_categories (
  key text primary key,
  label text not null default '',
  slot_key text not null default 'headWear',
  equip_limit integer not null default 1,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_by_username text not null default ''
);

create index if not exists homepage_prop_categories_sort_order_idx
  on public.homepage_prop_categories (sort_order asc, label asc);

alter table public.homepage_prop_categories enable row level security;

drop policy if exists "Authenticated users can read homepage prop categories" on public.homepage_prop_categories;
create policy "Authenticated users can read homepage prop categories"
  on public.homepage_prop_categories
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Manager users can insert homepage prop categories" on public.homepage_prop_categories;
create policy "Manager users can insert homepage prop categories"
  on public.homepage_prop_categories
  for insert
  with check (public.current_user_has_manager_role());

drop policy if exists "Manager users can update homepage prop categories" on public.homepage_prop_categories;
create policy "Manager users can update homepage prop categories"
  on public.homepage_prop_categories
  for update
  using (public.current_user_has_manager_role())
  with check (public.current_user_has_manager_role());

drop policy if exists "Manager users can delete homepage prop categories" on public.homepage_prop_categories;
create policy "Manager users can delete homepage prop categories"
  on public.homepage_prop_categories
  for delete
  using (public.current_user_has_manager_role());

-- Live HomepageAPP props controlled by manager users
create table if not exists public.homepage_props (
  key text primary key,
  label text not null default '',
  category_key text not null references public.homepage_prop_categories (key) on delete cascade,
  rarity text not null default 'rare',
  asset_url text,
  storage_path text,
  attachment jsonb not null default '{}'::jsonb,
  eye_preset text,
  material_preset text,
  mystery_box_enabled boolean not null default true,
  active boolean not null default true,
  archived boolean not null default false,
  tags text[] not null default '{}'::text[],
  description text not null default '',
  preview jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_by_username text not null default ''
);

create index if not exists homepage_props_category_key_idx
  on public.homepage_props (category_key);

create index if not exists homepage_props_active_idx
  on public.homepage_props (active, archived, mystery_box_enabled);

alter table public.homepage_props enable row level security;

drop policy if exists "Authenticated users can read homepage props" on public.homepage_props;
create policy "Authenticated users can read homepage props"
  on public.homepage_props
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Manager users can insert homepage props" on public.homepage_props;
create policy "Manager users can insert homepage props"
  on public.homepage_props
  for insert
  with check (public.current_user_has_manager_role());

drop policy if exists "Manager users can update homepage props" on public.homepage_props;
create policy "Manager users can update homepage props"
  on public.homepage_props
  for update
  using (public.current_user_has_manager_role())
  with check (public.current_user_has_manager_role());

drop policy if exists "Manager users can delete homepage props" on public.homepage_props;
create policy "Manager users can delete homepage props"
  on public.homepage_props
  for delete
  using (public.current_user_has_manager_role());

do $$
begin
  alter publication supabase_realtime add table public.homepage_prop_categories;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.homepage_props;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

insert into storage.buckets (id, name, public)
values ('homepage-props', 'homepage-props', true)
on conflict (id) do update
  set public = excluded.public;

drop policy if exists "Authenticated users can read homepage prop assets" on storage.objects;
create policy "Authenticated users can read homepage prop assets"
  on storage.objects
  for select
  using (
    bucket_id = 'homepage-props'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Manager users can upload homepage prop assets" on storage.objects;
create policy "Manager users can upload homepage prop assets"
  on storage.objects
  for insert
  with check (
    bucket_id = 'homepage-props'
    and public.current_user_has_manager_role()
  );

drop policy if exists "Manager users can update homepage prop assets" on storage.objects;
create policy "Manager users can update homepage prop assets"
  on storage.objects
  for update
  using (
    bucket_id = 'homepage-props'
    and public.current_user_has_manager_role()
  )
  with check (
    bucket_id = 'homepage-props'
    and public.current_user_has_manager_role()
  );

drop policy if exists "Manager users can delete homepage prop assets" on storage.objects;
create policy "Manager users can delete homepage prop assets"
  on storage.objects
  for delete
  using (
    bucket_id = 'homepage-props'
    and public.current_user_has_manager_role()
  );

-- Per-user cumulative points totals and idempotent game point events
create table if not exists public.user_points_totals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_points bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint user_points_totals_nonnegative check (total_points >= 0)
);

create index if not exists user_points_totals_updated_at_idx
  on public.user_points_totals (updated_at desc);

alter table public.user_points_totals enable row level security;

drop policy if exists "Users can read own points total" on public.user_points_totals;
create policy "Users can read own points total"
  on public.user_points_totals
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own points total" on public.user_points_totals;
create policy "Users can insert own points total"
  on public.user_points_totals
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own points total" on public.user_points_totals;
create policy "Users can update own points total"
  on public.user_points_totals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.user_points_events (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null,
  session_id text not null,
  event_id text not null,
  points integer not null,
  label text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_points_events_nonzero_points check (points <> 0),
  constraint user_points_events_unique_event unique (user_id, game_id, session_id, event_id)
);

do $$
begin
  alter table public.user_points_events
    drop constraint if exists user_points_events_positive_points;
exception
  when undefined_table then null;
end;
$$;

do $$
begin
  alter table public.user_points_events
    add constraint user_points_events_nonzero_points check (points <> 0);
exception
  when duplicate_object then null;
  when undefined_table then null;
end;
$$;

create index if not exists user_points_events_user_created_idx
  on public.user_points_events (user_id, created_at desc);

alter table public.user_points_events enable row level security;

drop policy if exists "Users can read own points events" on public.user_points_events;
create policy "Users can read own points events"
  on public.user_points_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own points events" on public.user_points_events;
create policy "Users can insert own points events"
  on public.user_points_events
  for insert
  with check (auth.uid() = user_id);

create or replace function public.apply_game_points_event(
  p_game_id text,
  p_session_id text,
  p_event_id text,
  p_points integer,
  p_metadata jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns table (accepted boolean, total_points bigint, reason text)
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_event boolean := false;
  event_accepted boolean := false;
  current_total bigint := 0;
  result_reason text := null;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if coalesce(trim(p_game_id), '') = '' then
    raise exception 'Game id is required';
  end if;

  if coalesce(trim(p_session_id), '') = '' then
    raise exception 'Session id is required';
  end if;

  if coalesce(trim(p_event_id), '') = '' then
    raise exception 'Event id is required';
  end if;

  if p_points is null or p_points = 0 then
    raise exception 'Points delta must be a non-zero integer';
  end if;

  insert into public.user_points_events (
    user_id,
    game_id,
    session_id,
    event_id,
    points,
    label,
    metadata,
    occurred_at
  )
  values (
    current_user_id,
    trim(p_game_id),
    trim(p_session_id),
    trim(p_event_id),
    p_points,
    '',
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, now())
  )
  on conflict on constraint user_points_events_unique_event do nothing
  returning true into inserted_event;

  insert into public.user_points_totals (
    user_id,
    total_points,
    updated_at
  )
  values (
    current_user_id,
    0,
    now()
  )
  on conflict (user_id) do nothing;

  select upt.total_points
  into current_total
  from public.user_points_totals as upt
  where upt.user_id = current_user_id
  for update;

  current_total := coalesce(current_total, 0);

  if coalesce(inserted_event, false) then
    if (current_total + p_points) < 0 then
      delete from public.user_points_events
      where user_id = current_user_id
        and game_id = trim(p_game_id)
        and session_id = trim(p_session_id)
        and event_id = trim(p_event_id);
      result_reason := 'insufficient_points';
    else
      update public.user_points_totals
      set total_points = current_total + p_points,
          updated_at = now()
      where user_id = current_user_id;

      current_total := current_total + p_points;
      event_accepted := true;
    end if;
  else
    result_reason := 'duplicate';
  end if;

  return query
    select event_accepted, current_total, result_reason;
end;
$$;
