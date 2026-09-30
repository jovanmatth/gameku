-- ==============================================================================
-- PlanCraft PRO — Supabase Database Schema, Super Admin & RLS Setup
-- ==============================================================================
-- CARA PENGGUNAAN DI SUPABASE:
-- 1. Buka dashboard Supabase (https://supabase.com/dashboard)
-- 2. Klik menu "SQL Editor" di bilah samping kiri -> "New query"
-- 3. Paste seluruh script ini lalu klik tombol "RUN" (hijau)
-- ==============================================================================

-- ==============================================================================
-- 1. AKTIVASI ROLE SUPER ADMIN UNTUK: matthewajovan@gmail.com
-- ==============================================================================
-- Perintah ini langsung mengubah metadata akun Jovan Matthew menjadi Administrator:
UPDATE auth.users
SET 
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true, "display_name": "Jovan Matthew Adderson"}'::jsonb
WHERE lower(trim(email)) = 'matthewajovan@gmail.com'
   OR id = 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa';

-- ==============================================================================
-- 2. TABEL PROFIL PENGGUNA (public.profiles)
-- ==============================================================================
-- Agar status Admin dapat terlihat langsung di menu Table Editor Supabase:
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text DEFAULT 'user',
  is_admin boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_manage" ON public.profiles;
CREATE POLICY "profiles_manage" ON public.profiles FOR ALL USING (auth.uid() = id OR lower(trim(auth.jwt()->>'email')) = 'matthewajovan@gmail.com');

-- Sinkronkan data admin Jovan ke tabel profiles:
INSERT INTO public.profiles (id, email, role, is_admin)
SELECT id, email, 'admin', true
FROM auth.users
WHERE lower(trim(email)) = 'matthewajovan@gmail.com'
   OR id = 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', is_admin = true, updated_at = now();

-- ==============================================================================
-- 3. FUNGSI HELPER: is_admin()
-- ==============================================================================
-- Memeriksa apakah sesi pengguna saat ini memiliki hak akses Administrator:
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
    OR (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
    OR lower(trim(auth.jwt() ->> 'email')) = 'matthewajovan@gmail.com'
    OR auth.uid() = 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa'::uuid,
    false
  );
$$;

-- ==============================================================================
-- 4. TABEL SCHEDULES (Jadwal Kegiatan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
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

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select_policy" ON public.schedules;
CREATE POLICY "schedules_select_policy" ON public.schedules
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "schedules_insert_policy" ON public.schedules;
CREATE POLICY "schedules_insert_policy" ON public.schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "schedules_update_policy" ON public.schedules;
CREATE POLICY "schedules_update_policy" ON public.schedules
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "schedules_delete_policy" ON public.schedules;
CREATE POLICY "schedules_delete_policy" ON public.schedules
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- 5. TABEL DAY NOTES (Catatan Harian)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.day_notes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date text NOT NULL,
  note text DEFAULT '',
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT day_notes_user_date_key UNIQUE (user_id, date)
);

ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_policy" ON public.day_notes;
CREATE POLICY "notes_select_policy" ON public.day_notes
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "notes_insert_policy" ON public.day_notes;
CREATE POLICY "notes_insert_policy" ON public.day_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "notes_update_policy" ON public.day_notes;
CREATE POLICY "notes_update_policy" ON public.day_notes
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "notes_delete_policy" ON public.day_notes;
CREATE POLICY "notes_delete_policy" ON public.day_notes
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- 6. HAK AKSES PERMISSION DATABASE
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO anon, authenticated;
GRANT ALL ON TABLE public.schedules TO anon, authenticated;
GRANT ALL ON TABLE public.day_notes TO anon, authenticated;

-- ==============================================================================
-- 7. QUERY VERIFIKASI AKHIR (MUNCUL DI HASIL RESULT SQL EDITOR)
-- ==============================================================================
-- Setelah klik RUN, tabel di bawah ini akan memunculkan status Super Admin Anda:
SELECT 
  u.id, 
  u.email, 
  u.raw_app_meta_data->>'role' AS role_di_auth,
  u.raw_app_meta_data->>'is_admin' AS is_super_admin,
  p.role AS role_di_profiles_table,
  public.is_admin() AS fungsi_is_admin_aktif
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(trim(u.email)) = 'matthewajovan@gmail.com'
   OR u.id = 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa';
