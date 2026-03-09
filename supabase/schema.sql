create table if not exists public.backup_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  schema_version integer not null,
  payload_hash text not null,
  payload_json jsonb not null,
  stats_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists backup_snapshots_user_created_idx
  on public.backup_snapshots (user_id, created_at desc);

alter table public.backup_snapshots enable row level security;

drop policy if exists "Users can read their own backups" on public.backup_snapshots;
create policy "Users can read their own backups"
  on public.backup_snapshots
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own backups" on public.backup_snapshots;
create policy "Users can insert their own backups"
  on public.backup_snapshots
  for insert
  with check (auth.uid() = user_id);

create table if not exists public.ai_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  model text,
  provider text not null,
  request_json jsonb not null,
  response_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_reflections_user_created_idx
  on public.ai_reflections (user_id, created_at desc);

alter table public.ai_reflections enable row level security;

drop policy if exists "Users can read their own reflections" on public.ai_reflections;
create policy "Users can read their own reflections"
  on public.ai_reflections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own reflections" on public.ai_reflections;
create policy "Users can insert their own reflections"
  on public.ai_reflections
  for insert
  with check (auth.uid() = user_id);
