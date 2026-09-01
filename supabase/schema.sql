-- Sistema de Evolução · cloud schema
-- Designed for Supabase Auth + Row Level Security.

create table if not exists public.muscle_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id text not null,
  completed_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, workout_id)
);

create index if not exists workout_records_user_completed_idx
  on public.workout_records (user_id, completed_at desc);

alter table public.muscle_profiles enable row level security;
alter table public.workout_records enable row level security;

drop policy if exists "muscle_profiles_select_own" on public.muscle_profiles;
create policy "muscle_profiles_select_own"
  on public.muscle_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "muscle_profiles_insert_own" on public.muscle_profiles;
create policy "muscle_profiles_insert_own"
  on public.muscle_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "muscle_profiles_update_own" on public.muscle_profiles;
create policy "muscle_profiles_update_own"
  on public.muscle_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "muscle_profiles_delete_own" on public.muscle_profiles;
create policy "muscle_profiles_delete_own"
  on public.muscle_profiles for delete
  using (auth.uid() = user_id);

drop policy if exists "workout_records_select_own" on public.workout_records;
create policy "workout_records_select_own"
  on public.workout_records for select
  using (auth.uid() = user_id);

drop policy if exists "workout_records_insert_own" on public.workout_records;
create policy "workout_records_insert_own"
  on public.workout_records for insert
  with check (auth.uid() = user_id);

drop policy if exists "workout_records_update_own" on public.workout_records;
create policy "workout_records_update_own"
  on public.workout_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_records_delete_own" on public.workout_records;
create policy "workout_records_delete_own"
  on public.workout_records for delete
  using (auth.uid() = user_id);
