-- ==============================================================================
-- PlanCraft PRO — Supabase Database Schema, Super Admin & Instant Cloud Sync
-- ==============================================================================
-- CARA PENGGUNAAN DI SUPABASE (HANYA 15 DETIK):
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard/project/zwpqneedroxllkdjohos/sql/new
-- 2. Paste seluruh script ini ke dalam kotak query
-- 3. Klik tombol hijau "RUN" di kanan bawah
-- ==============================================================================

-- 1. AKTIVASI ROLE SUPER ADMIN UNTUK: matthewajovan@gmail.com
UPDATE auth.users
SET 
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true, "display_name": "Jovan Matthew Adderson"}'::jsonb
WHERE lower(trim(email)) = 'matthewajovan@gmail.com'
   OR id = 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa';

-- 2. TABEL GROUPS (Ruang Jadwal Bersama & Kode Undangan 6 Digit)
CREATE TABLE IF NOT EXISTS public.groups (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '👥',
  color text DEFAULT '#6366f1',
  invite_code text UNIQUE NOT NULL,
  owner_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. TABEL GROUP_MEMBERS (Daftar Peserta & Hak Akses Admin/Anggota)
CREATE TABLE IF NOT EXISTS public.group_members (
  id text PRIMARY KEY,
  group_id text NOT NULL,
  user_id text NOT NULL,
  user_email text DEFAULT '',
  user_name text DEFAULT '',
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_members_group_user_key UNIQUE (group_id, user_id)
);

-- 4. TABEL SCHEDULES (Jadwal Kegiatan Pribadi & Grup)
CREATE TABLE IF NOT EXISTS public.schedules (
  id text PRIMARY KEY,
  user_id text,
  group_id text,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'work',
  date text NOT NULL,
  start_time text DEFAULT '09:00',
  end_time text DEFAULT '10:00',
  priority text DEFAULT 'medium',
  status text DEFAULT 'scheduled',
  location text DEFAULT '',
  description text DEFAULT '',
  checklist jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 5. TABEL DAY NOTES (Catatan Harian)
CREATE TABLE IF NOT EXISTS public.day_notes (
  id text PRIMARY KEY,
  user_id text,
  date text NOT NULL,
  note text DEFAULT '',
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 6. TABEL PROFILES (Profil Pengguna & Super Admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id text PRIMARY KEY,
  email text,
  role text DEFAULT 'user',
  is_admin boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Sinkronkan data admin Jovan ke tabel profiles jika ada
INSERT INTO public.profiles (id, email, role, is_admin)
SELECT id::text, email, 'admin', true
FROM auth.users
WHERE lower(trim(email)) = 'matthewajovan@gmail.com'
   OR id = 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', is_admin = true, updated_at = now();

-- 7. BUAT INDEX UNTUK PERFORMA PENCARIAN CEPAT
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_group_id ON public.schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);

-- 8. AKTIFKAN ROW LEVEL SECURITY (RLS) DENGAN KEBIJAKAN TERBUKA UNTUK SYNC MULTI-DEVICE
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Kebijakan Groups: Izinkan baca & tulis agar teman bisa cari kode undangan & gabung
DROP POLICY IF EXISTS "groups_all_policy" ON public.groups;
CREATE POLICY "groups_all_policy" ON public.groups FOR ALL USING (true) WITH CHECK (true);

-- Kebijakan Group Members: Izinkan baca & tulis agar anggota bisa gabung & di-kick
DROP POLICY IF EXISTS "group_members_all_policy" ON public.group_members;
CREATE POLICY "group_members_all_policy" ON public.group_members FOR ALL USING (true) WITH CHECK (true);

-- Kebijakan Schedules: Izinkan baca & tulis jadwal
DROP POLICY IF EXISTS "schedules_all_policy" ON public.schedules;
CREATE POLICY "schedules_all_policy" ON public.schedules FOR ALL USING (true) WITH CHECK (true);

-- Kebijakan Day Notes:
DROP POLICY IF EXISTS "day_notes_all_policy" ON public.day_notes;
CREATE POLICY "day_notes_all_policy" ON public.day_notes FOR ALL USING (true) WITH CHECK (true);

-- Kebijakan Profiles:
DROP POLICY IF EXISTS "profiles_all_policy" ON public.profiles;
CREATE POLICY "profiles_all_policy" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 9. BERIKAN HAK AKSES API LENGKAP KE ANON & AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Verifikasi hasil:
SELECT 'Tabel groups & schedules berhasil dibuat!' AS status;
