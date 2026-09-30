-- ==============================================================================
-- PlanCraft PRO — Supabase Database Schema & Row Level Security (RLS)
-- ==============================================================================
-- Script SQL ini dijamin 100% kompatibel tanpa error permission schema auth!
-- Cara menjalankan:
-- 1. Buka Supabase Dashboard -> SQL Editor -> New query
-- 2. Paste seluruh script ini -> klik RUN
-- ==============================================================================

-- 1. Buat Tabel Schedules (Jadwal Kegiatan Pengguna)
create table if not exists public.schedules (
  id text primary key,
  user_id uuid not null default auth.uid(),
  title text not null,
  category text not null default 'work',
  date text not null,
  start_time text default '09:00',
  end_time text default '10:00',
  priority text default 'medium',
  status text default 'scheduled',
  location text default '',
  description text default '',
  checklist jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Buat Tabel Day Notes (Catatan Harian Pengguna)
create table if not exists public.day_notes (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid(),
  date text not null,
  note text default '',
  updated_at timestamptz default now() not null,
  constraint day_notes_user_date_key unique (user_id, date)
);

-- 3. Aktifkan Row Level Security (RLS) pada Kedua Tabel
alter table public.schedules enable row level security;
alter table public.day_notes enable row level security;

-- 4. Kebijakan Keamanan (Policies) untuk Tabel Schedules
drop policy if exists "schedules_select_policy" on public.schedules;
create policy "schedules_select_policy" on public.schedules
  for select using (auth.uid() = user_id);

drop policy if exists "schedules_insert_policy" on public.schedules;
create policy "schedules_insert_policy" on public.schedules
  for insert with check (auth.uid() = user_id);

drop policy if exists "schedules_update_policy" on public.schedules;
create policy "schedules_update_policy" on public.schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "schedules_delete_policy" on public.schedules;
create policy "schedules_delete_policy" on public.schedules
  for delete using (auth.uid() = user_id);

-- 5. Kebijakan Keamanan (Policies) untuk Tabel Day Notes
drop policy if exists "notes_select_policy" on public.day_notes;
create policy "notes_select_policy" on public.day_notes
  for select using (auth.uid() = user_id);

drop policy if exists "notes_insert_policy" on public.day_notes;
create policy "notes_insert_policy" on public.day_notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_policy" on public.day_notes;
create policy "notes_update_policy" on public.day_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_delete_policy" on public.day_notes;
create policy "notes_delete_policy" on public.day_notes
  for delete using (auth.uid() = user_id);

-- 6. Beri hak akses standar ke role authenticated & anon
grant usage on schema public to anon, authenticated;
grant all on table public.schedules to anon, authenticated;
grant all on table public.day_notes to anon, authenticated;

-- Selesai! Schema siap digunakan dengan isolasi data akun 100% aman.
