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
// 5. GROUP SCHEDULES, INVITE CODES & ROLE-BASED ADMIN ENGINE
// ------------------------------------------------------------------------------

const GROUPS_STORAGE_KEY = 'plancraft_groups_store';
const GROUP_MEMBERS_PREFIX = 'plancraft_grp_members_';
const GROUP_SCHEDULES_PREFIX = 'plancraft_grp_schedules_';

/** Helper LocalStorage untuk Groups */
function getLocalGroupsStore() {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (raw) {
      let list = JSON.parse(raw);
      if (Array.isArray(list)) {
        // Hapus grup demo placeholder jika sebelumnya tersimpan di browser
        const filtered = list.filter(g => g && g.id !== 'grp-demo-sprint' && g.inviteCode !== 'GRP-ALPHA');
        if (filtered.length !== list.length) {
          localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(filtered));
          localStorage.removeItem(`${GROUP_MEMBERS_PREFIX}grp-demo-sprint`);
          localStorage.removeItem(`${GROUP_SCHEDULES_PREFIX}grp-demo-sprint`);
        }
        return filtered;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function saveLocalGroupsStore(groups) {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch {}
}

function getLocalGroupMembers(groupId) {
  try {
    const raw = localStorage.getItem(`${GROUP_MEMBERS_PREFIX}${groupId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGroupMembers(groupId, members) {
  try {
    localStorage.setItem(`${GROUP_MEMBERS_PREFIX}${groupId}`, JSON.stringify(members));
  } catch {}
}

function getLocalGroupSchedules(groupId) {
  try {
    const raw = localStorage.getItem(`${GROUP_SCHEDULES_PREFIX}${groupId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGroupSchedules(groupId, schedules) {
  try {
    localStorage.setItem(`${GROUP_SCHEDULES_PREFIX}${groupId}`, JSON.stringify(schedules));
  } catch {}
}

/** Mengambil daftar semua grup yang diikuti user */
export async function fetchUserGroups(userId) {
  const localGroups = getLocalGroupsStore();
  const client = getSupabase();
  if (!client || !userId || !isSupabaseConfigured()) {
    return localGroups;
  }

  try {
    // 1. Ambil membership user
    const { data: memberRows, error: memErr } = await client
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', userId);

    if (memErr) {
      if (memErr.code === 'PGRST205') {
        // Tabel belum dibuat di Supabase, gunakan local cache
        return localGroups;
      }
      console.warn('Gagal fetch group_members dari Supabase, gunakan local:', memErr);
      return localGroups;
    }

    if (!memberRows || memberRows.length === 0) {
      return localGroups;
    }

    const groupIds = memberRows.map(m => m.group_id);
    const roleMap = {};
    memberRows.forEach(m => { roleMap[m.group_id] = m.role; });

    // 2. Ambil data grup
    const { data: groupRows, error: grpErr } = await client
      .from('groups')
      .select('*')
      .in('id', groupIds);

    if (grpErr) {
      return localGroups;
    }

    const merged = (groupRows || []).map(g => ({
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

    // Sinkronkan ke local cache
    saveLocalGroupsStore(merged);
    return merged.length > 0 ? merged : localGroups;
  } catch (err) {
    console.warn('Error fetching groups from Supabase:', err);
    return localGroups;
  }
}

/** Membuat Grup Baru di Supabase & LocalStorage */
export async function createGroupInCloud(groupData, user) {
  const userId = user ? user.id : 'guest-' + Math.random().toString(36).substr(2, 6);
  const userEmail = user?.email || 'guest@plancraft.local';
  const userName = user?.user_metadata?.display_name || userEmail.split('@')[0] || 'User';

  const groupId = `grp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const inviteCode = groupData.inviteCode || ('GRP-' + Math.random().toString(36).substr(2, 4).toUpperCase());

  const newGroup = {
    id: groupId,
    name: groupData.name.trim(),
    description: (groupData.description || '').trim(),
    icon: groupData.icon || '👥',
    color: groupData.color || '#6366f1',
    inviteCode: inviteCode,
    ownerId: userId,
    createdAt: new Date().toISOString(),
    role: 'admin', // Pembuat grup otomatis menjadi Admin
    membersCount: 1
  };

  // Simpan ke local storage
  const currentGroups = getLocalGroupsStore();
  currentGroups.unshift(newGroup);
  saveLocalGroupsStore(currentGroups);

  const initialMember = {
    id: `mem-${Date.now()}`,
    userId: userId,
    userName: userName,
    userEmail: userEmail,
    role: 'admin',
    joinedAt: new Date().toISOString()
  };
  saveLocalGroupMembers(groupId, [initialMember]);
  saveLocalGroupSchedules(groupId, []);

  // Jika terhubung ke Supabase, simpan ke database cloud
  const client = getSupabase();
  if (client && user && isSupabaseConfigured()) {
    try {
      const { error: grpErr } = await client.from('groups').insert({
        id: groupId,
        name: newGroup.name,
        description: newGroup.description,
        icon: newGroup.icon,
        color: newGroup.color,
        invite_code: newGroup.inviteCode,
        owner_id: userId
      });

      if (!grpErr) {
        await client.from('group_members').insert({
          id: initialMember.id,
          group_id: groupId,
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          role: 'admin'
        });
      }
    } catch (err) {
      console.warn('Gagal sinkron grup baru ke Supabase:', err);
    }
  }

  return newGroup;
}

/** Bergabung ke grup menggunakan Kode Undangan */
export async function joinGroupByCodeInCloud(inviteCode, user) {
  const code = (inviteCode || '').trim().toUpperCase();
  if (!code) throw new Error('Kode undangan harus diisi.');

  const userId = user ? user.id : 'guest-' + Math.random().toString(36).substr(2, 6);
  const userEmail = user?.email || 'guest@plancraft.local';
  const userName = user?.user_metadata?.display_name || userEmail.split('@')[0] || 'User';

  let foundGroup = null;

  // 1. Cek di Supabase jika terhubung
  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('groups')
        .select('*')
        .eq('invite_code', code)
        .maybeSingle();

      if (!error && data) {
        foundGroup = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          icon: data.icon || '👥',
          color: data.color || '#6366f1',
          inviteCode: data.invite_code,
          ownerId: data.owner_id,
          createdAt: data.created_at,
          role: 'member', // Bergabung via invite code masuk sebagai Member biasa
          membersCount: 2
        };

        // Daftarkan membership di Supabase
        if (user) {
          await client.from('group_members').upsert({
            group_id: data.id,
            user_id: userId,
            user_email: userEmail,
            user_name: userName,
            role: 'member'
          }, { onConflict: 'group_id,user_id' });
        }
      }
    } catch (err) {
      console.warn('Gagal cek kode undangan di Supabase:', err);
    }
  }

  // 2. Jika belum ditemukan di cloud, cari di local storage
  if (!foundGroup) {
    const allLocal = getLocalGroupsStore();
    foundGroup = allLocal.find(g => (g.inviteCode || '').toUpperCase() === code);
    if (foundGroup) {
      foundGroup = { ...foundGroup, role: foundGroup.ownerId === userId ? 'admin' : 'member' };
    }
  }

  if (!foundGroup) {
    throw new Error(`Grup dengan kode undangan "${code}" tidak ditemukan. Periksa kembali kodenya.`);
  }

  // Tambahkan ke store local groups jika belum ada
  const myGroups = getLocalGroupsStore();
  const existingIdx = myGroups.findIndex(g => g.id === foundGroup.id);
  if (existingIdx !== -1) {
    myGroups[existingIdx] = { ...myGroups[existingIdx], ...foundGroup };
  } else {
    myGroups.push(foundGroup);
  }
  saveLocalGroupsStore(myGroups);

  // Tambahkan ke member list lokal
  const members = getLocalGroupMembers(foundGroup.id);
  const existsMember = members.some(m => m.userId === userId);
  if (!existsMember) {
    members.push({
      id: `mem-${Date.now()}`,
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      role: 'member',
      joinedAt: new Date().toISOString()
    });
    saveLocalGroupMembers(foundGroup.id, members);
  }

  return foundGroup;
}

/** Mengambil seluruh anggota dalam suatu grup */
export async function fetchGroupMembersFromCloud(groupId) {
  const localMembers = getLocalGroupMembers(groupId);
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    return localMembers;
  }

  try {
    const { data, error } = await client
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error || !data) {
      return localMembers;
    }

    const formatted = data.map(m => ({
      id: m.id,
      userId: m.user_id,
      userName: m.user_name || m.user_email?.split('@')[0] || 'Anggota',
      userEmail: m.user_email || '',
      role: m.role || 'member',
      joinedAt: m.joined_at
    }));

    saveLocalGroupMembers(groupId, formatted);
    return formatted.length > 0 ? formatted : localMembers;
  } catch {
    return localMembers;
  }
}

/** Mengubah perizinan role anggota (Jadikan Admin / Ubah ke Member) */
export async function updateGroupMemberRoleInCloud(groupId, targetUserId, newRole) {
  // Update local
  const members = getLocalGroupMembers(groupId);
  const target = members.find(m => m.userId === targetUserId);
  if (target) {
    target.role = newRole;
    saveLocalGroupMembers(groupId, members);
  }

  // Update Supabase jika ada
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

/** Mengeluarkan anggota dari grup */
export async function removeGroupMemberFromCloud(groupId, targetUserId) {
  const members = getLocalGroupMembers(groupId).filter(m => m.userId !== targetUserId);
  saveLocalGroupMembers(groupId, members);

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

/** Menghapus Grup Selamanya */
export async function deleteGroupInCloud(groupId) {
  const groups = getLocalGroupsStore().filter(g => g.id !== groupId);
  saveLocalGroupsStore(groups);
  localStorage.removeItem(`${GROUP_MEMBERS_PREFIX}${groupId}`);
  localStorage.removeItem(`${GROUP_SCHEDULES_PREFIX}${groupId}`);

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      await client.from('groups').delete().eq('id', groupId);
    } catch (err) {
      console.warn('Gagal hapus grup di Supabase:', err);
    }
  }
}

/** Mengambil jadwal khusus suatu grup */
export async function fetchGroupSchedulesFromCloud(groupId) {
  const localSchedules = getLocalGroupSchedules(groupId);
  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    return localSchedules;
  }

  try {
    const { data, error } = await client
      .from('schedules')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: true });

    if (error || !data) {
      return localSchedules;
    }

    const formatted = data.map(row => ({
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
    }));

    saveLocalGroupSchedules(groupId, formatted);
    return formatted.length > 0 ? formatted : localSchedules;
  } catch {
    return localSchedules;
  }
}

/** Menyimpan atau memperbarui jadwal di dalam grup */
export async function saveGroupScheduleToCloud(schedule, groupId, userId) {
  // Update local
  const schedules = getLocalGroupSchedules(groupId);
  const idx = schedules.findIndex(s => s.id === schedule.id);
  const itemToSave = { ...schedule, groupId };

  if (idx !== -1) {
    schedules[idx] = itemToSave;
  } else {
    schedules.push(itemToSave);
  }
  saveLocalGroupSchedules(groupId, schedules);

  // Update Supabase
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

/** Menghapus jadwal grup */
export async function deleteGroupScheduleFromCloud(scheduleId, groupId) {
  const schedules = getLocalGroupSchedules(groupId).filter(s => s.id !== scheduleId);
  saveLocalGroupSchedules(groupId, schedules);

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      await client.from('schedules').delete().eq('id', scheduleId).eq('group_id', groupId);
    } catch (err) {
      console.warn('Gagal hapus jadwal grup di Supabase:', err);
    }
  }
}
