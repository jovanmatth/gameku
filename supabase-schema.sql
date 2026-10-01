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
-- 6. TABEL GROUPS (Ruang Jadwal Bersama / Kolaborasi)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '👥',
  color text DEFAULT '#6366f1',
  invite_code text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. TABEL GROUP_MEMBERS (Anggota Grup & Perizinan Admin Grup)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id text NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text DEFAULT '',
  user_name text DEFAULT '',
  role text NOT NULL DEFAULT 'member', -- 'admin' atau 'member'
  joined_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT group_members_group_user_key UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Tambahkan kolom group_id ke tabel schedules jika belum ada
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS group_id text REFERENCES public.groups(id) ON DELETE CASCADE;

-- Index performa pencarian grup dan anggota
CREATE INDEX IF NOT EXISTS idx_schedules_group_id ON public.schedules(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);

-- ==============================================================================
-- 8. FUNGSI HELPER KEAMANAN: is_group_member() & is_group_admin()
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = p_group_id AND g.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = p_group_id AND g.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    ),
    false
  );
$$;

-- ==============================================================================
-- 9. KEBIJAKAN ROW LEVEL SECURITY (RLS) GRUP & ANGGOTA
-- ==============================================================================

-- Kebijakan Tabel groups:
DROP POLICY IF EXISTS "groups_select_policy" ON public.groups;
CREATE POLICY "groups_select_policy" ON public.groups
  FOR SELECT USING (true); -- Izinkan baca agar kode undangan dapat dicari oleh calon anggota

DROP POLICY IF EXISTS "groups_insert_policy" ON public.groups;
CREATE POLICY "groups_insert_policy" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR public.is_admin());

DROP POLICY IF EXISTS "groups_update_policy" ON public.groups;
CREATE POLICY "groups_update_policy" ON public.groups
  FOR UPDATE USING (public.is_group_admin(id))
  WITH CHECK (public.is_group_admin(id));

DROP POLICY IF EXISTS "groups_delete_policy" ON public.groups;
CREATE POLICY "groups_delete_policy" ON public.groups
  FOR DELETE USING (owner_id = auth.uid() OR public.is_admin());

-- Kebijakan Tabel group_members:
DROP POLICY IF EXISTS "group_members_select_policy" ON public.group_members;
CREATE POLICY "group_members_select_policy" ON public.group_members
  FOR SELECT USING (public.is_group_member(group_id) OR public.is_admin());

DROP POLICY IF EXISTS "group_members_insert_policy" ON public.group_members;
CREATE POLICY "group_members_insert_policy" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_group_admin(group_id) OR public.is_admin());

DROP POLICY IF EXISTS "group_members_update_policy" ON public.group_members;
CREATE POLICY "group_members_update_policy" ON public.group_members
  FOR UPDATE USING (public.is_group_admin(group_id) OR public.is_admin())
  WITH CHECK (public.is_group_admin(group_id) OR public.is_admin());

DROP POLICY IF EXISTS "group_members_delete_policy" ON public.group_members;
CREATE POLICY "group_members_delete_policy" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id OR public.is_group_admin(group_id) OR public.is_admin());

-- ==============================================================================
-- 10. PEMBARUAN KEBIJAKAN RLS SCHEDULES (PERSONAL & GROUP AWARE)
-- ==============================================================================
-- Aturan Khusus: Hanya Admin Grup yang bisa ganti / tambah / hapus isi jadwal grup!
-- Anggota biasa (role = 'member') hanya bisa melihat (SELECT).
DROP POLICY IF EXISTS "schedules_select_policy" ON public.schedules;
CREATE POLICY "schedules_select_policy" ON public.schedules
  FOR SELECT USING (
    (group_id IS NULL AND (auth.uid() = user_id OR public.is_admin()))
    OR
    (group_id IS NOT NULL AND (public.is_group_member(group_id) OR public.is_admin()))
  );

DROP POLICY IF EXISTS "schedules_insert_policy" ON public.schedules;
CREATE POLICY "schedules_insert_policy" ON public.schedules
  FOR INSERT WITH CHECK (
    (group_id IS NULL AND (auth.uid() = user_id OR public.is_admin()))
    OR
    (group_id IS NOT NULL AND (public.is_group_admin(group_id) OR public.is_admin()))
  );

DROP POLICY IF EXISTS "schedules_update_policy" ON public.schedules;
CREATE POLICY "schedules_update_policy" ON public.schedules
  FOR UPDATE USING (
    (group_id IS NULL AND (auth.uid() = user_id OR public.is_admin()))
    OR
    (group_id IS NOT NULL AND (public.is_group_admin(group_id) OR public.is_admin()))
  )
  WITH CHECK (
    (group_id IS NULL AND (auth.uid() = user_id OR public.is_admin()))
    OR
    (group_id IS NOT NULL AND (public.is_group_admin(group_id) OR public.is_admin()))
  );

DROP POLICY IF EXISTS "schedules_delete_policy" ON public.schedules;
CREATE POLICY "schedules_delete_policy" ON public.schedules
  FOR DELETE USING (
    (group_id IS NULL AND (auth.uid() = user_id OR public.is_admin()))
    OR
    (group_id IS NOT NULL AND (public.is_group_admin(group_id) OR public.is_admin()))
  );

-- ==============================================================================
-- 11. HAK AKSES PERMISSION DATABASE
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO anon, authenticated;
GRANT ALL ON TABLE public.schedules TO anon, authenticated;
GRANT ALL ON TABLE public.day_notes TO anon, authenticated;
GRANT ALL ON TABLE public.groups TO anon, authenticated;
GRANT ALL ON TABLE public.group_members TO anon, authenticated;

-- ==============================================================================
-- 12. PEMBERSIHAN JADWAL CONTOH / DUMMY LAMA DI DATABASE
-- ==============================================================================
DELETE FROM public.schedules 
WHERE id LIKE '%sch-00%' 
   OR id LIKE '%sch-010%'
   OR title ILIKE '%Daily Standup%'
   OR title ILIKE '%Sesi Lari Pagi%'
   OR title ILIKE '%Refactor Design System%'
   OR title ILIKE '%Coffee Break%'
   OR title ILIKE '%Sprint Retrospective%'
   OR title ILIKE '%Client Pitch Deck%'
   OR title ILIKE '%Workshop UI/UX%'
   OR title ILIKE '%Team Brainstorming%';

-- ==============================================================================
-- 13. QUERY VERIFIKASI AKHIR
-- ==============================================================================
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


