/**
 * ==============================================================================
 * PlanCraft PRO — Supabase Client & Authentication Layer
 * ==============================================================================
 * Mengelola koneksi ke Supabase:
 * 1. Login & Register dengan Email dan Password (auth.users)
 * 2. Penyimpanan & Isolasi Data Jadwal per Akun (Row Level Security)
 * 3. Catatan Harian per Akun (Day Notes)
 * ==============================================================================
 */

// Kredensial Supabase dari Project Anda
const DEFAULT_SUPABASE_URL = 'https://zwpqneedroxllkdjohos.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_X9uSzLvrb8WDUj1TEgXupQ_OeZTSRe8';

const STORAGE_URL_KEY = 'plancraft_supabase_url';
const STORAGE_KEY_KEY = 'plancraft_supabase_anon_key';

let supabaseClient = null;

/** Mengambil kredensial aktif dari LocalStorage atau default */
export function getSupabaseCredentials() {
  const url = localStorage.getItem(STORAGE_URL_KEY) || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem(STORAGE_KEY_KEY) || DEFAULT_SUPABASE_ANON_KEY;
  return { url: url.trim(), key: key.trim() };
}

/** Menyimpan kredensial baru ke LocalStorage dan inisialisasi ulang */
export function saveSupabaseCredentials(url, key) {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  return initSupabase();
}

/** Memeriksa apakah kredensial Supabase sudah terisi */
export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http') && key.length > 20);
}

/** Inisialisasi Supabase Client */
export function initSupabase() {
  const { url, key } = getSupabaseCredentials();
  if (!isSupabaseConfigured()) {
    supabaseClient = null;
    return null;
  }

  try {
    // Menggunakan library Supabase yang dimuat lewat CDN di window.supabase
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return supabaseClient;
    } else {
      console.warn('Library Supabase belum termuat di window.supabase');
      return null;
    }
  } catch (err) {
    console.error('Gagal inisialisasi Supabase Client:', err);
    supabaseClient = null;
    return null;
  }
}

/** Dapatkan instance Supabase Client aktif */
export function getSupabase() {
  if (!supabaseClient) {
    initSupabase();
  }
  return supabaseClient;
}

// ------------------------------------------------------------------------------
// AUTHENTICATION METHODS (DAFTAR & MASUK AKUN)
// ------------------------------------------------------------------------------

/** Mendaftar akun baru dengan Email dan Password */
export async function registerWithEmail(email, password, displayName = '') {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum dikonfigurasi. Silakan masukkan Project URL & Anon Key di pengaturan.');

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0]
      }
    }
  });

  if (error) throw error;
  return data;
}

/** Masuk akun dengan Email dan Password */
export async function loginWithEmail(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum dikonfigurasi. Silakan masukkan Project URL & Anon Key di pengaturan.');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

/** Keluar dari Akun (Logout) */
export async function logoutUser() {
  const client = getSupabase();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) console.warn('Error saat logout:', error);
  }
}

/** Mendapatkan User yang sedang aktif dari Session */
export async function getCurrentUser() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) return null;
    return session.user;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------
// DATABASE METHODS (DATA ISOLASI PER AKUN DENGAN ROW LEVEL SECURITY)
// ------------------------------------------------------------------------------

/** Mengambil seluruh jadwal milik akun pengguna aktif dari Supabase */
export async function fetchUserSchedules(userId) {
  const client = getSupabase();
  if (!client || !userId) return [];

  const { data, error } = await client
    .from('schedules')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Tabel public.schedules belum dibuat di Supabase. Jalankan supabase-schema.sql di Supabase SQL Editor.');
      return null;
    }
    console.error('Gagal mengambil jadwal dari Supabase:', error);
    throw error;
  }

  // Format data tabel Supabase ke format struktur state aplikasi
  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    category: row.category,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    priority: row.priority,
    status: row.status,
    location: row.location || '',
    description: row.description || '',
    checklist: Array.isArray(row.checklist) ? row.checklist : []
  }));
}

/** Menyimpan atau memperbarui (upsert) satu jadwal ke Supabase untuk user aktif */
export async function saveUserSchedule(schedule, userId) {
  const client = getSupabase();
  if (!client || !userId) return;

  const rowData = {
    id: schedule.id,
    user_id: userId,
    title: schedule.title,
    category: schedule.category || 'work',
    date: schedule.date,
    start_time: schedule.startTime || '09:00',
    end_time: schedule.endTime || '10:00',
    priority: schedule.priority || 'medium',
    status: schedule.status || 'scheduled',
    location: schedule.location || '',
    description: schedule.description || '',
    checklist: schedule.checklist || [],
    updated_at: new Date().toISOString()
  };

  const { error } = await client
    .from('schedules')
    .upsert(rowData, { onConflict: 'id' });

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Tabel public.schedules belum dibuat di Supabase.');
      return;
    }
    console.error('Gagal menyimpan jadwal ke Supabase:', error);
    throw error;
  }
}

/** Menghapus jadwal dari Supabase */
export async function deleteUserSchedule(scheduleId, userId) {
  const client = getSupabase();
  if (!client || !userId) return;

  const { error } = await client
    .from('schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('user_id', userId);

  if (error) {
    console.error('Gagal menghapus jadwal di Supabase:', error);
    throw error;
  }
}

/** Mengambil catatan harian milik akun pengguna dari Supabase */
export async function fetchUserDayNotes(userId) {
  const client = getSupabase();
  if (!client || !userId) return {};

  const { data, error } = await client
    .from('day_notes')
    .select('date, note')
    .eq('user_id', userId);

  if (error) {
    console.warn('Gagal memuat day_notes dari Supabase:', error);
    return {};
  }

  const notesMap = {};
  (data || []).forEach(item => {
    notesMap[item.date] = item.note || '';
  });
  return notesMap;
}

/** Menyimpan catatan harian ke Supabase */
export async function saveUserDayNote(date, note, userId) {
  const client = getSupabase();
  if (!client || !userId) return;

  const { error } = await client
    .from('day_notes')
    .upsert({
      user_id: userId,
      date,
      note,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' });

  if (error) {
    console.warn('Gagal menyimpan catatan harian ke Supabase:', error);
  }
}

/** Menginisialisasi jadwal bawaan (seed data) pertama kali untuk akun baru */
export async function seedInitialSchedulesForUser(userId, defaultSchedules) {
  const client = getSupabase();
  if (!client || !userId || !defaultSchedules.length) return;

  const rows = defaultSchedules.map(item => ({
    id: `sch-${userId.slice(0, 5)}-${item.id}-${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId,
    title: item.title,
    category: item.category,
    date: item.date,
    start_time: item.startTime,
    end_time: item.endTime,
    priority: item.priority,
    status: item.status,
    location: item.location || '',
    description: item.description || '',
    checklist: item.checklist || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { error } = await client
    .from('schedules')
    .insert(rows);

  if (error) {
    console.warn('Gagal men-seed jadwal awal untuk user baru:', error);
  }
}
