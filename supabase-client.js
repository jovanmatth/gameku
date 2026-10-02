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
  const rawUrl = localStorage.getItem(STORAGE_URL_KEY);
  const rawKey = localStorage.getItem(STORAGE_KEY_KEY);
  const url = (rawUrl && rawUrl.trim()) ? rawUrl.trim() : DEFAULT_SUPABASE_URL;
  const key = (rawKey && rawKey.trim()) ? rawKey.trim() : DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
}

/** Menyimpan kredensial baru ke LocalStorage dan inisialisasi ulang */
export function saveSupabaseCredentials(url, key) {
  localStorage.setItem(STORAGE_URL_KEY, (url || '').trim());
  localStorage.setItem(STORAGE_KEY_KEY, (key || '').trim());
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

// Global window fallbacks to prevent ReferenceError anywhere
if (typeof window !== 'undefined') {
  window.getSupabase = getSupabase;
  window.initSupabase = initSupabase;
  window.isSupabaseConfigured = isSupabaseConfigured;
  window.getSupabaseCredentials = getSupabaseCredentials;
}

// ------------------------------------------------------------------------------
// AUTHENTICATION METHODS (DAFTAR & MASUK AKUN)
// ------------------------------------------------------------------------------

/** Mendaftar akun baru dengan Email dan Password */
export async function registerWithEmail(email, password, displayName = '') {
  const client = getSupabase();
  if (!client) throw new Error('Supabase connection is not configured. Please enter your Project URL & Anon Key in settings.');

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

/** Verifikasi akun baru dengan kode 6-digit OTP email */
export async function verifyEmailOtp(email, token, type = 'signup') {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');

  // Coba verifikasi dengan type 'signup' terlebih dahulu
  let res = await client.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: type
  });

  // Jika gagal, coba fallback ke type 'email'
  if (res.error) {
    const retryRes = await client.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email'
    });
    if (!retryRes.error) {
      return retryRes.data;
    }
    throw res.error;
  }

  return res.data;
}

/** Kirim ulang kode verifikasi email (Resend OTP) */
export async function resendVerificationOtp(email, type = 'signup') {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum terkonfigurasi.');

  const res = await client.auth.resend({
    type: type,
    email: email.trim()
  });

  if (res.error) {
    // Coba fallback type 'email' jika signup gagal
    const retry = await client.auth.resend({
      type: 'email',
      email: email.trim()
    });
    if (retry.error) throw res.error;
    return retry.data;
  }
  return res.data;
}

/** Masuk akun dengan Email dan Password */
export async function loginWithEmail(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase connection is not configured. Please enter your Project URL & Anon Key in settings.');

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

/** Menginisialisasi jadwal bawaan (Kalender Indonesia) pertama kali untuk akun baru */
export async function seedInitialSchedulesForUser(userId, defaultSchedules) {
  const client = getSupabase();
  if (!client || !userId || !defaultSchedules.length) return;

  const rows = defaultSchedules.map(item => {
    const cleanId = String(item.id || '').replace(/^sch-/, 'idn-');
    return {
      id: cleanId.startsWith(`${userId.slice(0, 8)}-`) ? cleanId : `${userId.slice(0, 8)}-${cleanId}`,
      user_id: userId,
      title: item.title,
      category: item.category || 'holiday',
      date: item.date,
      start_time: item.startTime || '08:00',
      end_time: item.endTime || '17:00',
      priority: item.priority || 'high',
      status: item.status || 'scheduled',
      location: item.location || '',
      description: item.description || '',
      checklist: item.checklist || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  const { error } = await client
    .from('schedules')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.warn('Gagal men-seed jadwal awal untuk user baru:', error);
  }
}

/** Menghapus seluruh jadwal contoh / dummy lama dari akun user di Supabase */
export async function purgeOldDummySchedules(userId) {
  const client = getSupabase();
  if (!client || !userId) return;

  try {
    // 1. Hapus berdasarkan pola ID dummy lama (sch-001, sch-002, dll)
    await client
      .from('schedules')
      .delete()
      .eq('user_id', userId)
      .like('id', '%sch-00%');

    await client
      .from('schedules')
      .delete()
      .eq('user_id', userId)
      .like('id', '%sch-010%');

    // 2. Hapus judul dummy spesifik jika ada
    const dummyTitles = [
      '%Daily Standup%',
      '%Sesi Lari Pagi%',
      '%Refactor Design System%',
      '%Coffee Break%',
      '%Client Pitch Deck%',
      '%Deep Work%',
      '%Team Brainstorming%',
      '%Quick Catch-up%',
      '%Sprint Retrospective%',
      '%Workshop UI/UX%'
    ];

    for (const titlePattern of dummyTitles) {
      await client
        .from('schedules')
        .delete()
        .eq('user_id', userId)
        .ilike('title', titlePattern);
    }
  } catch (err) {
    console.warn('Pembersihan dummy schedules di Supabase:', err);
  }
}


// ------------------------------------------------------------------------------
// ADMINISTRATOR ROLES & DATA METHODS
// ------------------------------------------------------------------------------

/** Memeriksa apakah user aktif memiliki hak akses Administrator */
export function isUserAdmin(user) {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const uid = (user.id || '').trim();
  const appRole = (user.app_metadata?.role || '').toLowerCase();
  const userRole = (user.user_metadata?.role || '').toLowerCase();
  const isAdminClaim = user.app_metadata?.is_admin || user.user_metadata?.is_admin;

  return (
    email === 'matthewajovan@gmail.com' ||
    email.includes('matthewajovan') ||
    uid === 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa' ||
    appRole === 'admin' ||
    userRole === 'admin' ||
    Boolean(isAdminClaim)
  );
}

/** Mengambil seluruh jadwal dari semua akun di Supabase (Khusus Administrator) */
export async function fetchAllSchedulesAdmin() {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('schedules')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Gagal mengambil semua jadwal (admin):', error);
    throw error;
  }

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
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

/** Menghapus jadwal apapun di Supabase (Khusus Administrator) */
export async function deleteAnyScheduleAdmin(scheduleId) {
  const client = getSupabase();
  if (!client || !scheduleId) return;

  const { error } = await client
    .from('schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    console.error('Gagal menghapus jadwal (admin):', error);
    throw error;
  }
}

/** Mengambil ringkasan statistik database Supabase untuk Panel Admin */
export async function fetchAdminDatabaseStats() {
  const client = getSupabase();
  if (!client) return { totalSchedules: 0, totalNotes: 0, distinctUsers: 0 };

  try {
    const [schedRes, notesRes] = await Promise.all([
      client.from('schedules').select('id, user_id'),
      client.from('day_notes').select('id, user_id')
    ]);

    const scheds = schedRes.data || [];
    const notes = notesRes.data || [];

    const userIds = new Set();
    scheds.forEach(s => s.user_id && userIds.add(s.user_id));
    notes.forEach(n => n.user_id && userIds.add(n.user_id));

    return {
      totalSchedules: scheds.length,
      totalNotes: notes.length,
      distinctUsers: Math.max(userIds.size, 1)
    };
  } catch (err) {
    console.warn('Gagal memuat statistik admin:', err);
    return { totalSchedules: 0, totalNotes: 0, distinctUsers: 0 };
  }
}

// ------------------------------------------------------------------------------
// 5. GROUP SCHEDULES, INVITE CODES & ROLE-BASED ADMIN ENGINE (WITH CLOUD RELAY)
// ------------------------------------------------------------------------------

const GROUPS_STORAGE_PREFIX = 'plancraft_user_groups_';
const GROUP_MEMBERS_PREFIX = 'plancraft_grp_members_';
const GROUP_SCHEDULES_PREFIX = 'plancraft_grp_schedules_';
const RELAY_BASE_URL = 'https://ntfy.sh';

/** Mendapatkan ID unik browser/perangkat klien (persistent per browser) */
export function getClientDeviceId() {
  try {
    let id = localStorage.getItem('plancraft_device_client_id');
    if (!id || typeof id !== 'string' || id.length < 4) {
      id = Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
      localStorage.setItem('plancraft_device_client_id', id);
    }
    return id;
  } catch {
    return 'dev_' + Math.floor(1000 + Math.random() * 9000);
  }
}

/** Mendapatkan User ID unik untuk Tamu (Guest) agar tidak bertabrakan antar-perangkat */
export function getGuestUserId() {
  return `guest_${getClientDeviceId()}`;
}

/** Mendapatkan nama tampilan Tamu (Guest) */
export function getGuestDisplayName() {
  try {
    const saved = localStorage.getItem('plancraft_guest_display_name');
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  const devId = getClientDeviceId().substring(0, 4).toUpperCase();
  return `Tamu #${devId}`;
}

/** Mengatur nama tampilan Tamu */
export function setGuestDisplayName(name) {
  try {
    if (name && typeof name === 'string' && name.trim()) {
      localStorage.setItem('plancraft_guest_display_name', name.trim());
    }
  } catch {}
}

/** Mendapatkan email representatif Tamu */
export function getGuestEmail() {
  return `${getGuestUserId()}@plancraft.local`;
}

/**
 * Mendapatkan identitas pengguna efektif:
 * Baik user login maupun tamu/guest mendapatkan ID dan nama yang unik dan tidak pernah collision.
 */
export function getEffectiveUser(user) {
  if (user && user.id) {
    const email = user.email || '';
    const name = user.user_metadata?.display_name || (email ? email.split('@')[0] : 'Pengguna');
    return {
      id: user.id,
      email,
      name,
      isGuest: false
    };
  }
  return {
    id: getGuestUserId(),
    email: getGuestEmail(),
    name: getGuestDisplayName(),
    isGuest: true
  };
}

/**
 * Menghasilkan Group ID deterministik berdasarkan kode undangan.
 * Contoh: kode "482915" -> ID "grp_482915" di SEMUA perangkat dan browser!
 */
export function getDeterministicGroupId(inviteCode) {
  const digits = (inviteCode || '').toString().trim().replace(/\D/g, '');
  if (digits && digits.length >= 4) {
    return `grp_${digits}`;
  }
  const clean = (inviteCode || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `grp_${clean || 'general'}`;
}

/** Mendapatkan nama topic ntfy untuk cloud relay */
export function getGroupRelayTopic(inviteCode) {
  const digits = (inviteCode || '').toString().trim().replace(/\D/g, '');
  const code = (digits && digits.length >= 4) ? digits : (inviteCode || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `plancraft_grp_${code || 'general'}`;
}

/**
 * Mengirim action event ke Cloud Relay publik (ntfy.sh)
 * Berjalan seketika, bebas CORS, tanpa perlu konfigurasi database manual oleh pengguna.
 */
export async function sendGroupCloudRelay(inviteCode, actionType, payload) {
  if (!inviteCode) return false;
  const topic = getGroupRelayTopic(inviteCode);
  try {
    const bodyData = {
      action: actionType,
      payload,
      senderDeviceId: getClientDeviceId(),
      timestamp: Date.now()
    };
    await fetch(`${RELAY_BASE_URL}/${topic}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Title': `PlanCraft: ${actionType}`
      },
      body: JSON.stringify(bodyData)
    });
    return true;
  } catch (err) {
    console.warn(`[CloudRelay] Gagal kirim ${actionType}:`, err);
    return false;
  }
}

/**
 * Mengambil seluruh riwayat action event dari Cloud Relay untuk kode grup ini.
 */
export async function fetchGroupCloudRelay(inviteCode) {
  if (!inviteCode) return [];
  const topic = getGroupRelayTopic(inviteCode);
  try {
    const res = await fetch(`${RELAY_BASE_URL}/${topic}/json?poll=1&since=all`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text) return [];

    const events = [];
    const lines = text.trim().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        if (item.event === 'message' && item.message) {
          const parsedMsg = typeof item.message === 'string' ? JSON.parse(item.message) : item.message;
          if (parsedMsg && parsedMsg.action) {
            events.push({
              action: parsedMsg.action,
              payload: parsedMsg.payload,
              senderDeviceId: parsedMsg.senderDeviceId,
              timestamp: parsedMsg.timestamp || (item.time ? item.time * 1000 : Date.now())
            });
          }
        }
      } catch {}
    }
    events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return events;
  } catch (err) {
    console.warn('[CloudRelay] Gagal fetch events:', err);
    return [];
  }
}

/** Mendapatkan key LocalStorage khusus per user agar data grup terisolasi */
export function getUserGroupsStorageKey(userId) {
  if (!userId || userId === 'guest') {
    return `${GROUPS_STORAGE_PREFIX}${getGuestUserId()}`;
  }
  return `${GROUPS_STORAGE_PREFIX}${userId.trim()}`;
}

/** Helper LocalStorage untuk Groups terisolasi ketat per akun dengan migrasi otomatis */
export function getLocalGroupsStore(userId) {
  try {
    const effId = (!userId || userId === 'guest') ? getGuestUserId() : userId.trim();
    const key = `${GROUPS_STORAGE_PREFIX}${effId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      let list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.filter(g => g && g.id !== 'grp-demo-sprint' && g.inviteCode !== 'GRP-ALPHA');
      }
    }

    // Migrasi otomatis dari key guest lama jika akun tamu
    if (effId.startsWith('guest_')) {
      const legacyGuestRaw = localStorage.getItem(`${GROUPS_STORAGE_PREFIX}guest`);
      if (legacyGuestRaw) {
        try {
          const list = JSON.parse(legacyGuestRaw);
          if (Array.isArray(list) && list.length > 0) {
            saveLocalGroupsStore(list, effId);
            return list;
          }
        } catch {}
      }
    }

    // Migrasi dari legacy store awal
    const legacyRaw = localStorage.getItem('plancraft_groups_store');
    if (legacyRaw) {
      try {
        const oldList = JSON.parse(legacyRaw);
        if (Array.isArray(oldList)) {
          oldList.forEach(g => {
            if (g && g.inviteCode) localStorage.setItem(`plancraft_shared_grp_${g.inviteCode}`, JSON.stringify(g));
            if (g && g.id) localStorage.setItem(`plancraft_shared_grp_${g.id}`, JSON.stringify(g));
          });
          const matched = oldList.filter(g => g && (g.ownerId === effId || effId.startsWith('guest_')));
          localStorage.removeItem('plancraft_groups_store');
          if (matched.length > 0) {
            saveLocalGroupsStore(matched, effId);
            return matched;
          }
        }
      } catch {}
    }

    return [];
  } catch {
    return [];
  }
}

export function saveLocalGroupsStore(groups, userId) {
  try {
    const effId = (!userId || userId === 'guest') ? getGuestUserId() : userId.trim();
    const key = `${GROUPS_STORAGE_PREFIX}${effId}`;
    localStorage.setItem(key, JSON.stringify(groups || []));
  } catch {}
}

export function getLocalGroupMembers(groupId) {
  try {
    const raw = localStorage.getItem(`${GROUP_MEMBERS_PREFIX}${groupId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalGroupMembers(groupId, members) {
  try {
    localStorage.setItem(`${GROUP_MEMBERS_PREFIX}${groupId}`, JSON.stringify(members || []));
  } catch {}
}

export function getLocalGroupSchedules(groupId) {
  try {
    const raw = localStorage.getItem(`${GROUP_SCHEDULES_PREFIX}${groupId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalGroupSchedules(groupId, schedules) {
  try {
    localStorage.setItem(`${GROUP_SCHEDULES_PREFIX}${groupId}`, JSON.stringify(schedules || []));
  } catch {}
}

/** Mengambil daftar semua grup yang HANYA diikuti oleh akun user ini (Terisolasi per Akun) */
export async function fetchUserGroups(userId) {
  const effUser = getEffectiveUser(typeof userId === 'object' ? userId : { id: userId });
  const cleanUid = effUser.id;
  const localGroups = getLocalGroupsStore(cleanUid);
  const client = getSupabase();
  if (!client || !cleanUid || cleanUid.startsWith('guest_') || !isSupabaseConfigured()) {
    return localGroups;
  }

  try {
    // 1. Ambil membership user ini
    const { data: memberRows, error: memErr } = await client
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', cleanUid);

    if (memErr || !memberRows || memberRows.length === 0) {
      return localGroups;
    }

    const groupIds = memberRows.map(m => m.group_id);
    const roleMap = {};
    memberRows.forEach(m => { roleMap[m.group_id] = m.role; });

    // 2. Ambil data grup yang di-join oleh user ini
    const { data: groupRows, error: grpErr } = await client
      .from('groups')
      .select('*')
      .in('id', groupIds);

    if (grpErr || !groupRows) {
      return localGroups;
    }

    const merged = groupRows.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description || '',
      icon: g.icon || '👥',
      color: g.color || '#6366f1',
      inviteCode: g.invite_code,
      ownerId: g.owner_id,
      createdAt: g.created_at,
      role: roleMap[g.id] || 'member',
      membersCount: 1
    }));

    saveLocalGroupsStore(merged, cleanUid);
    return merged;
  } catch (err) {
    console.warn('Error fetching groups from Supabase:', err);
    return localGroups;
  }
}

/** Membuat 6 digit angka acak unik untuk kode grup */
export function generateGroupInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Membuat Grup Baru di Supabase & LocalStorage & Cloud Relay */
export async function createGroupInCloud(groupData, user, creatorCustomName = '') {
  const effUser = getEffectiveUser(user);
  if (creatorCustomName && creatorCustomName.trim()) {
    effUser.name = creatorCustomName.trim();
    if (effUser.isGuest) {
      setGuestDisplayName(creatorCustomName.trim());
    }
  }

  const inviteCode = (groupData.inviteCode || '').toString().trim() || generateGroupInviteCode();
  const groupId = getDeterministicGroupId(inviteCode);

  const newGroup = {
    id: groupId,
    name: groupData.name.trim(),
    description: (groupData.description || '').trim(),
    icon: groupData.icon || '👥',
    color: groupData.color || '#6366f1',
    inviteCode: inviteCode,
    ownerId: effUser.id,
    createdAt: new Date().toISOString(),
    role: 'admin', // Pembuat grup otomatis menjadi Admin
    membersCount: 1
  };

  // Simpan ke local groups store user ini
  const currentGroups = getLocalGroupsStore(effUser.id);
  const existingIdx = currentGroups.findIndex(g => g.id === groupId);
  if (existingIdx !== -1) {
    currentGroups[existingIdx] = newGroup;
  } else {
    currentGroups.unshift(newGroup);
  }
  saveLocalGroupsStore(currentGroups, effUser.id);

  // Simpan juga definisinya ke shared store agar bisa dicari oleh browser ini
  try {
    localStorage.setItem(`plancraft_shared_grp_${inviteCode}`, JSON.stringify(newGroup));
    localStorage.setItem(`plancraft_shared_grp_${groupId}`, JSON.stringify(newGroup));
  } catch {}

  const initialMember = {
    id: `mem-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    userId: effUser.id,
    userName: effUser.name,
    userEmail: effUser.email,
    role: 'admin',
    joinedAt: new Date().toISOString()
  };
  saveLocalGroupMembers(groupId, [initialMember]);
  saveLocalGroupSchedules(groupId, []);

  // Broadcast ke Cloud Relay publik (ntfy.sh) agar perangkat manapun (HP/Laptop rekan) bisa langsung menemukannya!
  sendGroupCloudRelay(inviteCode, 'GROUP_INIT', {
    group: newGroup,
    initialMember
  }).catch(() => {});

  // Jika terhubung ke Supabase, simpan ke database cloud
  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { error: grpErr } = await client.from('groups').insert({
        id: groupId,
        name: newGroup.name,
        description: newGroup.description,
        icon: newGroup.icon,
        color: newGroup.color,
        invite_code: newGroup.inviteCode,
        owner_id: effUser.id
      });

      if (grpErr) {
        if (grpErr.code === 'PGRST205' || grpErr.message?.includes('schema cache')) {
          window._supabaseMissingTables = true;
          window.dispatchEvent(new CustomEvent('supabase-tables-missing', { detail: { table: 'groups' } }));
        }
      } else {
        await client.from('group_members').insert({
          id: initialMember.id,
          group_id: groupId,
          user_id: effUser.id,
          user_email: effUser.email,
          user_name: effUser.name,
          role: 'admin'
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Gagal sinkron grup baru ke Supabase:', err);
    }
  }

  return newGroup;
}

/** Bergabung ke grup menggunakan Kode Undangan (Mendukung Cloud Relay & Antar Perangkat) */
export async function joinGroupByCodeInCloud(inviteCode, user, fallbackGroup = null, customUserName = '') {
  const rawInput = (inviteCode || '').toString().trim();
  if (!rawInput && !fallbackGroup) throw new Error('Kode undangan harus diisi.');

  const digitsOnly = rawInput.replace(/\D/g, '');
  const cleanCode = rawInput.toUpperCase().replace(/\s+/g, '');
  const codeWithoutPrefix = cleanCode.replace(/^GRP-?/i, '');
  const targetCode = digitsOnly && digitsOnly.length >= 4 ? digitsOnly : (cleanCode || rawInput);

  const effUser = getEffectiveUser(user);
  if (customUserName && customUserName.trim()) {
    effUser.name = customUserName.trim();
    if (effUser.isGuest) {
      setGuestDisplayName(customUserName.trim());
    }
  }

  const isMatch = (targetCodeCheck) => {
    if (!targetCodeCheck) return false;
    const str = targetCodeCheck.toString().trim();
    const gDigits = str.replace(/\D/g, '');
    const gClean = str.toUpperCase().replace(/\s+/g, '');
    const gWithoutPrefix = gClean.replace(/^GRP-?/i, '');

    if (gClean === cleanCode) return true;
    if (digitsOnly && digitsOnly.length >= 4 && gDigits === digitsOnly) return true;
    if (gWithoutPrefix && codeWithoutPrefix && gWithoutPrefix === codeWithoutPrefix) return true;
    return false;
  };

  let foundGroup = null;

  // 1. Cek dari Cloud Relay publik (ntfy.sh) terlebih dahulu
  // Ini memungkinkan rekan di HP/Laptop lain langsung menemukan grup tanpa perlu setup database!
  try {
    const relayEvents = await fetchGroupCloudRelay(targetCode);
    if (relayEvents && relayEvents.length > 0) {
      for (const ev of relayEvents) {
        if (ev.action === 'GROUP_INIT' && ev.payload?.group) {
          foundGroup = { ...ev.payload.group };
        } else if (ev.action === 'GROUP_UPDATE' && foundGroup && ev.payload) {
          foundGroup = { ...foundGroup, ...ev.payload };
        }
      }
    }
  } catch (err) {
    console.warn('[CloudRelay] Gagal lookup grup:', err);
  }

  // 2. Cek di Supabase jika terhubung
  if (!foundGroup) {
    const client = getSupabase();
    if (client && isSupabaseConfigured()) {
      try {
        const candidates = [cleanCode];
        if (digitsOnly && !candidates.includes(digitsOnly)) candidates.push(digitsOnly);
        if (codeWithoutPrefix && !candidates.includes(codeWithoutPrefix)) candidates.push(codeWithoutPrefix);
        if (!cleanCode.startsWith('GRP-')) candidates.push('GRP-' + cleanCode);

        const { data, error } = await client
          .from('groups')
          .select('*')
          .in('invite_code', candidates)
          .limit(1);

        if (!error && data && data.length > 0) {
          const row = data[0];
          foundGroup = {
            id: row.id,
            name: row.name,
            description: row.description || '',
            icon: row.icon || '👥',
            color: row.color || '#6366f1',
            inviteCode: row.invite_code,
            ownerId: row.owner_id,
            createdAt: row.created_at,
            role: 'member',
            membersCount: 2
          };
        }
      } catch (err) {
        console.warn('Gagal cek kode undangan di Supabase:', err);
      }
    }
  }

  // 3. Jika belum ditemukan di cloud, cari di local storage milik user ini
  if (!foundGroup) {
    const allLocal = getLocalGroupsStore(effUser.id);
    foundGroup = allLocal.find(g => isMatch(g.inviteCode));
  }

  // 4. Cari di shared group definitions di browser ini
  if (!foundGroup) {
    try {
      const codeKey = digitsOnly || cleanCode;
      const rawShared = localStorage.getItem(`plancraft_shared_grp_${codeKey}`);
      if (rawShared) {
        const parsed = JSON.parse(rawShared);
        if (parsed && parsed.name) {
          foundGroup = { ...parsed };
        }
      }
    } catch {}
  }

  // 5. Jika belum ditemukan tapi ada fallbackGroup (dari link URL)
  if (!foundGroup && fallbackGroup) {
    foundGroup = {
      id: fallbackGroup.id || getDeterministicGroupId(targetCode),
      name: fallbackGroup.name,
      description: fallbackGroup.description || '',
      icon: fallbackGroup.icon || '👥',
      color: fallbackGroup.color || '#6366f1',
      inviteCode: fallbackGroup.inviteCode || targetCode,
      ownerId: fallbackGroup.ownerId || 'admin',
      createdAt: fallbackGroup.createdAt || new Date().toISOString(),
      role: 'member',
      membersCount: 2
    };
  }

  // 6. Cek apakah cocok dengan preset grup bawaan (seperti grup 'ada' 482915)
  if (!foundGroup) {
    const PRESET_GROUPS = [
      {
        id: 'grp_482915',
        name: 'ada',
        description: 'Ruang kolaborasi jadwal tim',
        icon: '👥',
        color: '#6366f1',
        inviteCode: '482915'
      }
    ];
    const matchPreset = PRESET_GROUPS.find(p => isMatch(p.inviteCode));
    if (matchPreset) {
      foundGroup = {
        ...matchPreset,
        role: 'member',
        membersCount: 2,
        createdAt: new Date().toISOString()
      };
    }
  }

  // 7. Jika masih belum ditemukan (misal grup baru dari rekan di perangkat lain):
  if (!foundGroup) {
    const displayCode = digitsOnly && digitsOnly.length >= 4 ? digitsOnly : cleanCode;
    const promptName = typeof window !== 'undefined' && window.prompt
      ? window.prompt(`Kode grup "${displayCode}" terdeteksi!\n\nMasukkan nama grup Anda untuk langsung masuk ke ruang jadwal:`, 'ada')
      : ('Grup ' + displayCode);

    if (promptName && promptName.trim()) {
      foundGroup = {
        id: getDeterministicGroupId(displayCode),
        name: promptName.trim(),
        description: 'Ruang kolaborasi jadwal tim',
        icon: '👥',
        color: '#6366f1',
        inviteCode: displayCode,
        ownerId: 'creator',
        createdAt: new Date().toISOString(),
        role: 'member',
        membersCount: 2
      };
    } else {
      throw new Error(`Grup dengan kode "${displayCode}" tidak ditemukan. Pastikan kodenya benar.`);
    }
  }

  // Pastikan groupId deterministik berdasarkan inviteCode
  if (foundGroup.inviteCode && /^\d{4,}$/.test(foundGroup.inviteCode.toString().trim())) {
    foundGroup.id = getDeterministicGroupId(foundGroup.inviteCode);
  }

  const role = foundGroup.ownerId === effUser.id ? 'admin' : 'member';
  foundGroup.role = role;

  // Tambahkan ke store local groups HANYA untuk user ini (terisolasi per akun!)
  const myGroups = getLocalGroupsStore(effUser.id);
  const existingIdx = myGroups.findIndex(g => g.id === foundGroup.id);
  if (existingIdx !== -1) {
    myGroups[existingIdx] = { ...myGroups[existingIdx], ...foundGroup };
  } else {
    myGroups.push(foundGroup);
  }
  saveLocalGroupsStore(myGroups, effUser.id);

  // Buat member record unik untuk user ini
  const newMember = {
    id: `mem-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    userId: effUser.id,
    userName: effUser.name,
    userEmail: effUser.email,
    role: role,
    joinedAt: new Date().toISOString()
  };

  // Tambahkan ke member list lokal
  const members = getLocalGroupMembers(foundGroup.id);
  const existingMemIdx = members.findIndex(m => m.userId === effUser.id);
  if (existingMemIdx !== -1) {
    members[existingMemIdx] = { ...members[existingMemIdx], ...newMember };
  } else {
    members.push(newMember);
  }
  saveLocalGroupMembers(foundGroup.id, members);

  // Broadcast MEMBER_JOIN ke Cloud Relay publik (ntfy.sh) agar Admin Host LANGSUNG melihat teman ini di Daftar Peserta!
  sendGroupCloudRelay(foundGroup.inviteCode, 'MEMBER_JOIN', {
    groupId: foundGroup.id,
    member: newMember
  }).catch(() => {});

  // Coba sinkron ke Supabase jika ada
  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    client.from('group_members').upsert({
      id: newMember.id,
      group_id: foundGroup.id,
      user_id: effUser.id,
      user_email: effUser.email,
      user_name: effUser.name,
      role: role
    }, { onConflict: 'group_id,user_id' }).catch(() => {});
  }

  return foundGroup;
}

/** Sinkronkan seluruh grup lokal ke Supabase jika tabel sudah dibuat */
export async function syncAllLocalGroupsToCloud(userId) {
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) return false;
  const groups = getLocalGroupsStore(userId);
  if (!groups || groups.length === 0) return true;

  try {
    for (const g of groups) {
      const { error } = await client.from('groups').upsert({
        id: g.id,
        name: g.name,
        description: g.description || '',
        icon: g.icon || '👥',
        color: g.color || '#6366f1',
        invite_code: g.inviteCode,
        owner_id: g.ownerId || (userId || 'admin')
      }, { onConflict: 'id' });

      if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
        window._supabaseMissingTables = true;
        return false;
      }
    }
    window._supabaseMissingTables = false;
    return true;
  } catch {
    return false;
  }
}

/** Mengambil seluruh anggota dalam suatu grup (dengan merger Cloud Relay) */
export async function fetchGroupMembersFromCloud(groupId, inviteCode = null) {
  let members = getLocalGroupMembers(groupId);

  // Cari inviteCode jika belum terdefinisi
  let code = inviteCode;
  if (!code) {
    if (groupId.startsWith('grp_')) {
      code = groupId.replace('grp_', '');
    } else {
      try {
        const raw = localStorage.getItem(`plancraft_shared_grp_${groupId}`);
        if (raw) {
          const g = JSON.parse(raw);
          if (g && g.inviteCode) code = g.inviteCode;
        }
      } catch {}
    }
  }

  // 1. Ambil seluruh event dari Cloud Relay (ntfy.sh) untuk menyinkronkan peserta antar-perangkat secara instan
  if (code) {
    try {
      const relayEvents = await fetchGroupCloudRelay(code);
      if (relayEvents && relayEvents.length > 0) {
        for (const ev of relayEvents) {
          if (ev.action === 'GROUP_INIT' && ev.payload?.initialMember) {
            const initMem = ev.payload.initialMember;
            const exIdx = members.findIndex(m => m.userId === initMem.userId);
            if (exIdx === -1) {
              members.unshift(initMem);
            } else {
              members[exIdx] = { ...members[exIdx], ...initMem };
            }
          } else if (ev.action === 'MEMBER_JOIN' && ev.payload?.member) {
            const joinedMem = ev.payload.member;
            const exIdx = members.findIndex(m => m.userId === joinedMem.userId);
            if (exIdx === -1) {
              members.push(joinedMem);
            } else {
              members[exIdx] = { ...members[exIdx], ...joinedMem };
            }
          } else if (ev.action === 'MEMBER_ROLE' && ev.payload) {
            const { userId, newRole } = ev.payload;
            const target = members.find(m => m.userId === userId);
            if (target) {
              target.role = newRole;
            }
          } else if (ev.action === 'MEMBER_KICK' && ev.payload?.userId) {
            members = members.filter(m => m.userId !== ev.payload.userId);
          }
        }
      }
    } catch (err) {
      console.warn('[CloudRelay] Gagal sinkron members:', err);
    }
  }

  // 2. Ambil dari Supabase jika terhubung
  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (!error && data && data.length > 0) {
        data.forEach(m => {
          const formatted = {
            id: m.id,
            userId: m.user_id,
            userName: m.user_name || m.user_email?.split('@')[0] || 'Anggota',
            userEmail: m.user_email || '',
            role: m.role || 'member',
            joinedAt: m.joined_at
          };
          const exIdx = members.findIndex(x => x.userId === formatted.userId);
          if (exIdx === -1) {
            members.push(formatted);
          } else {
            members[exIdx] = { ...members[exIdx], ...formatted };
          }
        });
      }
    } catch {}
  }

  saveLocalGroupMembers(groupId, members);
  return members;
}

/** Mengubah perizinan role anggota (Jadikan Admin / Ubah ke Member) */
export async function updateGroupMemberRoleInCloud(groupId, targetUserId, newRole, inviteCode = null) {
  const members = getLocalGroupMembers(groupId);
  const target = members.find(m => m.userId === targetUserId);
  if (target) {
    target.role = newRole;
    saveLocalGroupMembers(groupId, members);
  }

  const code = inviteCode || (groupId.startsWith('grp_') ? groupId.replace('grp_', '') : '');
  if (code) {
    sendGroupCloudRelay(code, 'MEMBER_ROLE', {
      groupId,
      userId: targetUserId,
      newRole
    }).catch(() => {});
  }

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      await client
        .from('group_members')
        .update({ role: newRole })
        .eq('group_id', groupId)
        .eq('user_id', targetUserId);
    } catch (err) {
      console.warn('Gagal update role anggota di Supabase:', err);
    }
  }
}

/** Mengeluarkan anggota dari grup (Kick ala WhatsApp) */
export async function removeGroupMemberFromCloud(groupId, targetUserId, inviteCode = null) {
  const members = getLocalGroupMembers(groupId).filter(m => m.userId !== targetUserId);
  saveLocalGroupMembers(groupId, members);

  const code = inviteCode || (groupId.startsWith('grp_') ? groupId.replace('grp_', '') : '');
  if (code) {
    sendGroupCloudRelay(code, 'MEMBER_KICK', {
      groupId,
      userId: targetUserId
    }).catch(() => {});
  }

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      await client
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', targetUserId);
    } catch (err) {
      console.warn('Gagal hapus anggota di Supabase:', err);
    }
  }
}

/** Atur ulang kode undangan grup menjadi 6 digit angka baru (ala WhatsApp Reset Link) */
export async function regenerateGroupInviteCodeInCloud(groupId, userId) {
  const newCode = generateGroupInviteCode();
  const groups = getLocalGroupsStore(userId);
  const target = groups.find(g => g && g.id === groupId);
  if (target) {
    target.inviteCode = newCode;
    saveLocalGroupsStore(groups, userId);
    try {
      localStorage.setItem(`plancraft_shared_grp_${newCode}`, JSON.stringify(target));
    } catch {}
  }

  sendGroupCloudRelay(newCode, 'GROUP_UPDATE', {
    groupId,
    inviteCode: newCode
  }).catch(() => {});

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      await client.from('groups').update({ invite_code: newCode }).eq('id', groupId);
    } catch (err) {
      console.warn('Gagal atur ulang kode grup di Supabase:', err);
    }
  }

  return newCode;
}

/** Memperbarui informasi nama, deskripsi, icon grup (ala Info Grup WhatsApp) */
export async function updateGroupInfoInCloud(groupId, { name, description, icon, color }, userId, inviteCode = null) {
  const groups = getLocalGroupsStore(userId);
  const target = groups.find(g => g && g.id === groupId);
  if (target) {
    if (name !== undefined) target.name = name;
    if (description !== undefined) target.description = description;
    if (icon !== undefined) target.icon = icon;
    if (color !== undefined) target.color = color;
    saveLocalGroupsStore(groups, userId);
    try {
      if (target.inviteCode) {
        localStorage.setItem(`plancraft_shared_grp_${target.inviteCode}`, JSON.stringify(target));
      }
    } catch {}
  }

  const code = inviteCode || target?.inviteCode || (groupId.startsWith('grp_') ? groupId.replace('grp_', '') : '');
  if (code) {
    sendGroupCloudRelay(code, 'GROUP_UPDATE', {
      groupId,
      name,
      description,
      icon,
      color
    }).catch(() => {});
  }

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const payload = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      if (icon !== undefined) payload.icon = icon;
      if (color !== undefined) payload.color = color;
      await client.from('groups').update(payload).eq('id', groupId);
    } catch (err) {
      console.warn('Gagal update info grup di Supabase:', err);
    }
  }

  return target;
}

/** Menghapus Grup Selamanya */
export async function deleteGroupInCloud(groupId, userId, inviteCode = null) {
  const groups = getLocalGroupsStore(userId).filter(g => g.id !== groupId);
  saveLocalGroupsStore(groups, userId);
  localStorage.removeItem(`${GROUP_MEMBERS_PREFIX}${groupId}`);
  localStorage.removeItem(`${GROUP_SCHEDULES_PREFIX}${groupId}`);

  const code = inviteCode || (groupId.startsWith('grp_') ? groupId.replace('grp_', '') : '');
  if (code) {
    sendGroupCloudRelay(code, 'GROUP_DELETE', { groupId }).catch(() => {});
  }

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      await client.from('groups').delete().eq('id', groupId);
    } catch (err) {
      console.warn('Gagal hapus grup di Supabase:', err);
    }
  }
}

/** Mengambil jadwal khusus suatu grup (dengan merger Cloud Relay) */
export async function fetchGroupSchedulesFromCloud(groupId, inviteCode = null) {
  let schedules = getLocalGroupSchedules(groupId);

  const code = inviteCode || (groupId.startsWith('grp_') ? groupId.replace('grp_', '') : '');
  if (code) {
    try {
      const relayEvents = await fetchGroupCloudRelay(code);
      if (relayEvents && relayEvents.length > 0) {
        for (const ev of relayEvents) {
          if (ev.action === 'SCHEDULE_SAVE' && ev.payload?.schedule) {
            const sch = ev.payload.schedule;
            const exIdx = schedules.findIndex(s => s.id === sch.id);
            if (exIdx === -1) {
              schedules.push(sch);
            } else {
              schedules[exIdx] = { ...schedules[exIdx], ...sch };
            }
          } else if (ev.action === 'SCHEDULE_DELETE' && ev.payload?.scheduleId) {
            schedules = schedules.filter(s => s.id !== ev.payload.scheduleId);
          }
        }
      }
    } catch (err) {
      console.warn('[CloudRelay] Gagal sinkron schedules:', err);
    }
  }

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('schedules')
        .select('*')
        .eq('group_id', groupId)
        .order('date', { ascending: true });

      if (!error && data && data.length > 0) {
        data.forEach(row => {
          const formatted = {
            id: row.id,
            groupId: row.group_id,
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
          };
          const exIdx = schedules.findIndex(s => s.id === formatted.id);
          if (exIdx === -1) {
            schedules.push(formatted);
          } else {
            schedules[exIdx] = { ...schedules[exIdx], ...formatted };
          }
        });
      }
    } catch {}
  }

  saveLocalGroupSchedules(groupId, schedules);
  return schedules;
}

/** Menyimpan atau memperbarui jadwal di dalam grup (dengan Cloud Relay) */
export async function saveGroupScheduleToCloud(schedule, groupId, userId, inviteCode = null) {
  const schedules = getLocalGroupSchedules(groupId);
  const idx = schedules.findIndex(s => s.id === schedule.id);
  const itemToSave = { ...schedule, groupId };

  if (idx !== -1) {
    schedules[idx] = itemToSave;
  } else {
    schedules.push(itemToSave);
  }
  saveLocalGroupSchedules(groupId, schedules);

  const code = inviteCode || (groupId.startsWith('grp_') ? groupId.replace('grp_', '') : '');
  if (code) {
    sendGroupCloudRelay(code, 'SCHEDULE_SAVE', {
      groupId,
      schedule: itemToSave
    }).catch(() => {});
  }

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const rowData = {
        id: schedule.id,
        user_id: userId,
        group_id: groupId,
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

      await client.from('schedules').upsert(rowData, { onConflict: 'id' });
    } catch (err) {
      console.warn('Gagal sinkron jadwal grup ke Supabase:', err);
    }
  }
}

/** Menghapus jadwal grup (dengan Cloud Relay) */
export async function deleteGroupScheduleFromCloud(scheduleId, groupId, inviteCode = null) {
  const schedules = getLocalGroupSchedules(groupId).filter(s => s.id !== scheduleId);
  saveLocalGroupSchedules(groupId, schedules);

  const code = inviteCode || (groupId.startsWith('grp_') ? groupId.replace('grp_', '') : '');
  if (code) {
    sendGroupCloudRelay(code, 'SCHEDULE_DELETE', {
      groupId,
      scheduleId
    }).catch(() => {});
  }

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      await client.from('schedules').delete().eq('id', scheduleId).eq('group_id', groupId);
    } catch (err) {
      console.warn('Gagal hapus jadwal grup di Supabase:', err);
    }
  }
}

// Global window fallbacks
if (typeof window !== 'undefined') {
  window.getClientDeviceId = getClientDeviceId;
  window.getGuestUserId = getGuestUserId;
  window.getGuestDisplayName = getGuestDisplayName;
  window.getEffectiveUser = getEffectiveUser;
  window.sendGroupCloudRelay = sendGroupCloudRelay;
  window.fetchGroupCloudRelay = fetchGroupCloudRelay;
}
