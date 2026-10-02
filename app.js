/**
 * ==============================================================================
 * PlanCalender PRO — Ultra-Aesthetic Engine & Logic (v2.5 + Supabase Cloud)
 * ==============================================================================
 * Didesain dengan arsitektur modular, rapih, bersih, dan SANGAT MUDAH DI-EDIT!
 * 
 * Modul Terintegrasi:
 * 1. STATE & STORAGE MANAGEMENT (User Session & Supabase Cloud Sync)
 * 2. SUPABASE AUTH & USER ISOLATION (Login, Register, Logout per Akun)
 * 3. WEB AUDIO SYNTHESIZER (Efek Suara UI Lembut)
 * 4. CANVAS CONFETTI ENGINE (Perayaan Tugas Selesai)
 * 5. REAL-TIME DIGITAL CLOCK & DYNAMIC GREETING
 * 6. COMMAND PALETTE (RAYCAST / LINEAR STYLE: CTRL+K)
 * 7. POMODORO FOCUS TIMER ENGINE
 * 8. DATE ENGINE & FORMATTING
 * 9. 5 VIEW RENDERERS (Bulan, Minggu, Hari, Kanban, Agenda)
 * 10. MODALS & CHECKLIST BUILDER
 * 11. IMPORT, EXPORT, & SHORTCUTS
 * ==============================================================================
 */

import { CATEGORIES, PRIORITIES, STATUSES, getDefaultSchedules, isOldDummySchedule, HOLIDAY_CATEGORY } from './schedule-data.js';
import {
  initSupabase,
  getSupabase,
  isSupabaseConfigured,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  registerWithEmail,
  loginWithEmail,
  verifyEmailOtp,
  resendVerificationOtp,
  logoutUser,
  getCurrentUser,
  fetchUserSchedules,
  saveUserSchedule,
  deleteUserSchedule,
  fetchUserDayNotes,
  saveUserDayNote,
  seedInitialSchedulesForUser,
  purgeOldDummySchedules,
  isUserAdmin,
  fetchAllSchedulesAdmin,
  deleteAnyScheduleAdmin,
  fetchAdminDatabaseStats,
  fetchUserGroups,
  createGroupInCloud,
  generateGroupInviteCode,
  joinGroupByCodeInCloud,
  fetchGroupMembersFromCloud,
  updateGroupMemberRoleInCloud,
  removeGroupMemberFromCloud,
  deleteGroupInCloud,
  fetchGroupSchedulesFromCloud,
  saveGroupScheduleToCloud,
  deleteGroupScheduleFromCloud
} from './supabase-client.js';

// ==============================================================================
// 1. STATE APLIKASI
// ==============================================================================
const STORAGE_PREFIX = 'plancraft_schedules_';
const THEME_KEY = 'plancraft_theme_pref';
const NOTES_PREFIX = 'plancraft_day_notes_';
const SOUND_KEY = 'plancraft_sound_pref';

/** Membersihkan seluruh cache LocalStorage dari jadwal dummy lama di browser */
function sanitizeAllStoredSchedules() {
  try {
    const keysToClean = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToClean.push(k);
      }
    }

    keysToClean.forEach(key => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const items = JSON.parse(raw);
          if (Array.isArray(items)) {
            const nonDummy = items.filter(s => !isOldDummySchedule(s)).map(s => {
              if (s.category === 'holiday' || s.isHoliday || (typeof s.id === 'string' && s.id.includes('idn-'))) {
                return { ...s, priority: 'none', isHoliday: true };
              }
              return s;
            });
            const hasIdn = nonDummy.some(s => s.category === 'holiday' || (typeof s.id === 'string' && s.id.includes('idn-')));
            const defaults = getDefaultSchedules();
            const finalItems = hasIdn ? nonDummy : [...defaults, ...nonDummy];
            localStorage.setItem(key, JSON.stringify(finalItems));
          }
        }
      } catch {}
    });
  } catch {}
}

// Jalankan sanitasi cache storage secara dini saat modul dimuat
sanitizeAllStoredSchedules();

const state = {
  schedules: [],
  currentUser: null,           // Objek User dari Supabase Auth
  isAdmin: false,              // True jika user memiliki role admin
  adminModeAllSchedules: false,// Mode pengawas: melihat seluruh jadwal cloud
  isSupabaseConnected: false,  // Status koneksi cloud
  currentDate: new Date(),     // Viewport kalender saat ini
  selectedDate: new Date(),    // Tanggal aktif yang dipilih
  activeView: 'month',         // 'month' | 'week' | 'day' | 'kanban' | 'agenda'
  activeCategoryFilter: 'all', // 'all' atau id kategori
  activePriorityFilter: 'all', // 'all' | 'high' | 'medium' | 'low'
  searchQuery: '',             // String pencarian
  theme: localStorage.getItem(THEME_KEY) || 'dark',
  soundEnabled: localStorage.getItem(SOUND_KEY) !== 'false',
  dayNotes: {},
  groups: [],                  // Daftar grup pengguna
  currentGroup: null,          // null = Personal Schedule; or group object
  currentGroupMembers: [],     // Anggota grup yang sedang aktif
  openGroupDropdownId: null    // ID grup yang dropdown kodenya sedang terbuka
};

/** Memeriksa apakah user saat ini adalah Admin di grup aktif (atau jadwal pribadi) */
function isCurrentGroupAdmin() {
  if (!state.currentGroup) return true; // Jadwal pribadi selalu bisa diedit sendiri
  if (state.isAdmin) return true; // Global Super Admin (Jovan) selalu memiliki hak admin
  const r = (state.currentGroup.role || '').toLowerCase();
  return r === 'admin' || r === 'owner';
}


// ==============================================================================
// 2. SUPABASE INITIALIZATION & USER SESSION
// ==============================================================================
async function initSupabaseSession() {
  initSupabase();
  const configured = isSupabaseConfigured();
  state.isSupabaseConnected = configured;
  updateSupabaseStatusBadges();

  if (configured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        state.currentUser = user;
        const emailLower = (user.email || '').toLowerCase().trim();
        const isAdm = isUserAdmin(user) || emailLower === 'matthewajovan@gmail.com' || emailLower.includes('matthewajovan') || user.id === 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa';
        state.isAdmin = isAdm;

        if (isAdm) {
          user.user_metadata = user.user_metadata || {};
          user.user_metadata.role = 'admin';
          user.user_metadata.is_admin = true;
          user.app_metadata = user.app_metadata || {};
          user.app_metadata.role = 'admin';
          user.app_metadata.is_admin = true;

          // Otomatis sinkronkan klaim admin ke Supabase user metadata jika belum ada
          const client = getSupabase();
          if (client) {
            client.auth.updateUser({
              data: {
                role: 'admin',
                is_admin: true,
                display_name: 'Jovan Matthew Adderson'
              }
            }).catch(() => {});
          }
        }
        updateUserUI();
        await loadUserData(user.id);
        return;
      }
    } catch (err) {
      console.warn('Gagal memverifikasi session Supabase:', err);
    }
  }

  // Default: Masuk sebagai Guest Mode (Tamu) jika belum login
  state.currentUser = null;
  state.isAdmin = false;
  updateUserUI();
  loadLocalSchedules('guest');

  // Ajak pengunjung pertama kali untuk membuat akun (atau lanjut sebagai tamu)
  const hasPromptedAuth = sessionStorage.getItem('plancalender_auth_prompted');
  if (!hasPromptedAuth) {
    sessionStorage.setItem('plancalender_auth_prompted', 'true');
    setTimeout(() => {
      openAuthModal('register');
    }, 600);
  }
}

/** Mengaktifkan sesi Super Administrator: Jovan Matthew Adderson secara instan */
function activateJovanAdminSession(showFeedback = true) {
  const adminUser = {
    id: 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa',
    email: 'matthewajovan@gmail.com',
    user_metadata: {
      display_name: 'jovan matthew adderson',
      role: 'admin',
      is_admin: true
    },
    app_metadata: {
      role: 'admin',
      is_admin: true,
      provider: 'email'
    }
  };

  state.currentUser = adminUser;
  state.isAdmin = true;
  localStorage.setItem('plancraft_active_account', 'admin');
  localStorage.removeItem('plancraft_logged_out');

  // Sinkronkan ke Supabase jika client aktif
  try {
    const client = getSupabase();
    client?.auth?.updateUser({
      data: {
        role: 'admin',
        is_admin: true,
        display_name: 'jovan matthew adderson'
      }
    }).catch(() => {});
  } catch {}

  updateUserUI();
  closeAuthModal();

  if (showFeedback) {
    playUiSound('chime');
    triggerConfetti();
    showToast('👑 Administrator Mode Active: Jovan Matthew Adderson!', 'success');
  }

  loadUserData(adminUser.id);
}

/** Memuat data jadwal dan catatan khusus milik user ID yang sedang aktif */
async function loadUserData(userId) {
  try {
    // 1. Bersihkan seluruh jadwal dummy / contoh lama dari Supabase
    await purgeOldDummySchedules(userId).catch(() => {});

    let cloudSchedules = null;
    if (state.isAdmin && state.adminModeAllSchedules) {
      cloudSchedules = await fetchAllSchedulesAdmin();
    } else {
      cloudSchedules = await fetchUserSchedules(userId);
    }

    if (cloudSchedules === null) {
      console.warn('Tabel Supabase belum dibuat di cloud. Memuat data dari cache lokal.');
      loadLocalSchedules(userId);
      return;
    }

    // Filter jadwal di cloud agar tidak memuat contoh/dummy lama
    let cleanCloud = (cloudSchedules || [])
      .filter(s => !isOldDummySchedule(s))
      .map(s => {
        if (s.category === 'holiday' || s.isHoliday || (typeof s.id === 'string' && s.id.includes('idn-'))) {
          return { ...s, priority: 'none', isHoliday: true };
        }
        return s;
      });

    // Periksa apakah event resmi Kalender Indonesia sudah masuk
    const hasIndonesianEvents = cleanCloud.some(s => s.category === 'holiday' || (typeof s.id === 'string' && s.id.includes('idn-')));

    if (!hasIndonesianEvents || cleanCloud.length === 0) {
      const defaults = getDefaultSchedules();
      await seedInitialSchedulesForUser(userId, defaults).catch(() => {});
      const seeded = await fetchUserSchedules(userId).catch(() => null);
      if (seeded && seeded.length > 0) {
        cleanCloud = seeded.filter(s => !isOldDummySchedule(s)).map(s => {
          if (s.category === 'holiday' || s.isHoliday || (typeof s.id === 'string' && s.id.includes('idn-'))) {
            return { ...s, priority: 'none', isHoliday: true };
          }
          return s;
        });
      } else {
        cleanCloud = [...defaults, ...cleanCloud];
      }
    }

    state.schedules = cleanCloud;

    // Simpan cache offline per user
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(state.schedules));

    // Muat catatan harian per user
    state.dayNotes = await fetchUserDayNotes(userId);
    localStorage.setItem(`${NOTES_PREFIX}${userId}`, JSON.stringify(state.dayNotes));

    renderApp();
  } catch (err) {
    console.warn('Gagal mengambil data dari Supabase, memuat dari cache lokal:', err);
    loadLocalSchedules(userId);
  }
}

/** Fallback muat dari cache LocalStorage terisolasi per akun/guest */
function loadLocalSchedules(accountKey) {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${accountKey}`);
    let list = saved ? JSON.parse(saved) : null;
    if (list && Array.isArray(list)) {
      list = list.filter(s => !isOldDummySchedule(s)).map(s => {
        if (s.category === 'holiday' || s.isHoliday || (typeof s.id === 'string' && s.id.includes('idn-'))) {
          return { ...s, priority: 'none', isHoliday: true };
        }
        return s;
      });
      const hasIndonesianEvents = list.some(s => s.category === 'holiday' || (typeof s.id === 'string' && s.id.includes('idn-')));
      if (!hasIndonesianEvents) {
        list = [...getDefaultSchedules(), ...list];
      }
      state.schedules = list;
    } else {
      state.schedules = getDefaultSchedules();
    }
    localStorage.setItem(`${STORAGE_PREFIX}${accountKey}`, JSON.stringify(state.schedules));

    const savedNotes = localStorage.getItem(`${NOTES_PREFIX}${accountKey}`);
    state.dayNotes = savedNotes ? JSON.parse(savedNotes) : {};
  } catch {
    state.schedules = getDefaultSchedules();
    state.dayNotes = {};
  }
  renderApp();
}

/** Simpan jadwal ke Supabase Cloud & cache lokal (Mendukung Jadwal Pribadi & Jadwal Grup) */
async function persistSchedule(scheduleData) {
  // Jika sedang membuka grup, simpan ke jadwal grup
  if (state.currentGroup) {
    const uid = state.currentUser ? state.currentUser.id : 'guest';
    try {
      await saveGroupScheduleToCloud(scheduleData, state.currentGroup.id, uid);
    } catch (err) {
      console.warn('Gagal sinkron jadwal grup:', err);
    }
    return;
  }

  // 1. Simpan ke state dan cache lokal personal
  const accKey = state.currentUser ? state.currentUser.id : 'guest';
  localStorage.setItem(`${STORAGE_PREFIX}${accKey}`, JSON.stringify(state.schedules));

  // 2. Jika akun terhubung ke Supabase, simpan langsung ke Supabase dengan RLS
  if (state.currentUser && isSupabaseConfigured()) {
    try {
      await saveUserSchedule(scheduleData, state.currentUser.id);
    } catch (err) {
      console.error('Failed to sync schedule with Supabase:', err);
      showToast('Saved locally. Supabase sync failed: ' + err.message, 'warning');
    }
  }
}

/** Hapus jadwal dari Supabase Cloud & cache lokal (Mendukung Jadwal Pribadi & Jadwal Grup) */
async function removeSchedule(scheduleId) {
  if (state.currentGroup) {
    try {
      await deleteGroupScheduleFromCloud(scheduleId, state.currentGroup.id);
    } catch (err) {
      console.warn('Gagal hapus jadwal grup:', err);
    }
    return;
  }

  const accKey = state.currentUser ? state.currentUser.id : 'guest';
  localStorage.setItem(`${STORAGE_PREFIX}${accKey}`, JSON.stringify(state.schedules));

  if (state.currentUser && isSupabaseConfigured()) {
    try {
      await deleteUserSchedule(scheduleId, state.currentUser.id);
    } catch (err) {
      console.error('Failed to delete from Supabase:', err);
    }
  }
}


/** Update Tampilan Badge Supabase di Header & Footer */
function updateSupabaseStatusBadges() {
  const pillDot = document.getElementById('supabasePillDot');
  const pillText = document.getElementById('supabasePillText');
  const brandDot = document.getElementById('brandStatusDot');
  const footerDot = document.getElementById('footerStatusDot');
  const brandSubtitle = document.getElementById('brandSubtitle');
  const btnSupabaseBadge = document.getElementById('btnSupabaseBadge');
  const btnOpenSupabaseConfig = document.getElementById('btnOpenSupabaseConfig');

  const isConfigured = isSupabaseConfigured();
  const isLoggedIn = Boolean(state.currentUser);
  const isAdm = Boolean(state.isAdmin);

  // KETAT: Ikon / Tombol Supabase Cloud HANYA boleh muncul jika pengguna adalah ADMINISTRATOR!
  if (!isAdm) {
    btnSupabaseBadge?.classList.add('hidden');
    btnOpenSupabaseConfig?.classList.add('hidden');
    if (brandSubtitle) brandSubtitle.textContent = 'Smart Schedule & Focus';
  } else {
    btnSupabaseBadge?.classList.remove('hidden');
    btnOpenSupabaseConfig?.classList.remove('hidden');
    if (brandSubtitle) brandSubtitle.textContent = 'Admin • Supabase Cloud';
  }

  if (isLoggedIn) {
    if (pillDot) pillDot.className = 'supabase-status-indicator status-online';
    if (pillText) pillText.textContent = 'Supabase Cloud';
    if (brandDot) brandDot.className = 'brand-live-pulse status-online';
    if (footerDot) footerDot.className = 'version-dot status-online';
  } else if (isConfigured) {
    if (pillDot) pillDot.className = 'supabase-status-indicator status-warning';
    if (pillText) pillText.textContent = 'Ready to Sign In';
    if (brandDot) brandDot.className = 'brand-live-pulse status-warning';
    if (footerDot) footerDot.className = 'version-dot status-warning';
  } else {
    if (pillDot) pillDot.className = 'supabase-status-indicator status-offline';
    if (pillText) pillText.textContent = 'Setup Supabase';
    if (brandDot) brandDot.className = 'brand-live-pulse status-offline';
    if (footerDot) footerDot.className = 'version-dot status-offline';
  }
}

/** Update Informasi Pengguna di UI (Sidebar, Header, Profile Modal, Admin Badges) */
function updateUserUI() {
  const sidebarName = document.getElementById('sidebarUserName');
  const sidebarEmail = document.getElementById('sidebarUserEmail');
  const sidebarAvatar = document.getElementById('sidebarUserAvatar');
  const headerAvatar = document.getElementById('headerAvatarEl');
  const headerEmail = document.getElementById('headerEmailEl');

  const sidebarAdminBadge = document.getElementById('sidebarAdminBadge');
  const sidebarAdminWrap = document.getElementById('sidebarAdminWrap');
  const headerAdminCrown = document.getElementById('headerAdminCrown');
  const profileRoleBadge = document.getElementById('profileRoleBadge');
  const btnProfileAdmin = document.getElementById('btnProfileOpenAdmin');

  if (state.currentUser) {
    const user = state.currentUser;
    const email = (user.email || '').toLowerCase().trim();
    const isAdm = isUserAdmin(user) || email === 'matthewajovan@gmail.com' || email.includes('matthewajovan') || user.id === 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa';
    state.isAdmin = isAdm;

    let fullName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    if (email === 'matthewajovan@gmail.com' || email.includes('matthewajovan')) {
      fullName = 'Jovan Matthew Adderson';
    }
    const shortName = isAdm ? 'Jovan Matthew' : (fullName.length > 14 ? fullName.slice(0, 13) + '…' : fullName);
    const initial = fullName.charAt(0).toUpperCase();

    if (sidebarName) sidebarName.textContent = isAdm ? 'Jovan Matthew' : fullName;
    if (sidebarEmail) sidebarEmail.textContent = email;
    if (sidebarAvatar) sidebarAvatar.textContent = isAdm ? '👑' : initial;
    if (headerAvatar) headerAvatar.textContent = isAdm ? '👑' : initial;
    if (headerEmail) {
      headerEmail.textContent = shortName;
      headerEmail.title = `${fullName} (${email})`;
    }

    // Toggle Admin Badges & Panels
    if (isAdm) {
      sidebarAdminBadge?.classList.remove('hidden');
      sidebarAdminWrap?.classList.remove('hidden');
      headerAdminCrown?.classList.add('hidden'); // Avatar already shows 👑, prevents duplicate crown & saves header space
      profileRoleBadge?.classList.remove('hidden');
      btnProfileAdmin?.classList.remove('hidden');
    } else {
      sidebarAdminBadge?.classList.add('hidden');
      sidebarAdminWrap?.classList.add('hidden');
      headerAdminCrown?.classList.add('hidden');
      profileRoleBadge?.classList.add('hidden');
      btnProfileAdmin?.classList.add('hidden');
    }

    // Update Profile Modal jika dibuka
    const profName = document.getElementById('profileDisplayName');
    const profEmail = document.getElementById('profileEmailBadge');
    const profAvatar = document.getElementById('profileBigAvatar');
    const profCount = document.getElementById('profileTotalSchedules');

    if (profName) profName.textContent = fullName;
    if (profEmail) profEmail.textContent = email;
    if (profAvatar) profAvatar.textContent = isAdm ? '👑' : initial;
    if (profCount) profCount.textContent = state.schedules.length;
  } else {
    state.isAdmin = false;
    sidebarAdminBadge?.classList.add('hidden');
    sidebarAdminWrap?.classList.add('hidden');
    headerAdminCrown?.classList.add('hidden');
    profileRoleBadge?.classList.add('hidden');
    btnProfileAdmin?.classList.add('hidden');

    if (sidebarName) sidebarName.textContent = 'Guest Mode';
    if (sidebarEmail) sidebarEmail.textContent = 'Click to Sign In';
    if (sidebarAvatar) sidebarAvatar.textContent = '👤';
    if (headerAvatar) headerAvatar.textContent = '👤';
    if (headerEmail) {
      headerEmail.textContent = 'Sign In';
      headerEmail.title = 'Sign In or Manage Account';
    }
  }

  updateSupabaseStatusBadges();
}

// ==============================================================================
// 3. SYNTHESIZED WEB AUDIO ENGINE
// ==============================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playUiSound(type = 'click') {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'pop') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'complete') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'delete') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'chime') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch {}
}

// ==============================================================================
// 4. CANVAS CONFETTI ENGINE
// ==============================================================================
function triggerConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#a855f7'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 300,
      y: window.innerHeight * 0.5 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 18,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }

  let animationFrame;
  function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45;
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.016;

      if (p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      animationFrame = requestAnimationFrame(updateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  updateConfetti();
}

// ==============================================================================
// 5. REAL-TIME DIGITAL CLOCK & GREETING
// ==============================================================================
function initLiveClock() {
  const clockEl = document.getElementById('liveClockTime');
  const greetingEl = document.getElementById('liveGreetingText');
  if (!clockEl || !greetingEl) return;

  function update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}:${seconds}`;

    const h = now.getHours();
    let greet = 'Stay Productive ✨';
    if (h >= 4 && h < 11) greet = 'Good Morning ⚡';
    else if (h >= 11 && h < 15) greet = 'Good Afternoon 🚀';
    else if (h >= 15 && h < 18) greet = 'Good Evening 🌅';
    else greet = 'Good Night 🌙';

    greetingEl.textContent = greet;
  }

  update();
  setInterval(update, 1000);
}

// ==============================================================================
// 6. POMODORO FOCUS TIMER
// ==============================================================================
const pomodoro = {
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  isRunning: false,
  timerInterval: null
};

function initPomodoro() {
  const display = document.getElementById('pomodoroTimerDisplay');
  const badge = document.getElementById('headerTimerBadge');
  const toggleBtn = document.getElementById('btnToggleTimer');
  const resetBtn = document.getElementById('btnResetTimer');
  const statusLabel = document.getElementById('pomodoroStatusLabel');

  function updateDisplay() {
    const m = Math.floor(pomodoro.remainingSeconds / 60);
    const s = pomodoro.remainingSeconds % 60;
    const str = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (display) display.textContent = str;
    if (badge) badge.textContent = pomodoro.isRunning ? `⚡ ${str}` : 'Focus';
  }

  function startTimer() {
    if (pomodoro.isRunning) return;
    pomodoro.isRunning = true;
    if (document.getElementById('btnTimerText')) {
      document.getElementById('btnTimerText').textContent = 'Pause';
    }
    if (statusLabel) statusLabel.textContent = '🔥 In progress... Stay focused!';
    playUiSound('pop');

    pomodoro.timerInterval = setInterval(() => {
      if (pomodoro.remainingSeconds > 0) {
        pomodoro.remainingSeconds--;
        updateDisplay();
      } else {
        clearInterval(pomodoro.timerInterval);
        pomodoro.isRunning = false;
        if (document.getElementById('btnTimerText')) {
          document.getElementById('btnTimerText').textContent = 'Start Focus';
        }
        if (statusLabel) statusLabel.textContent = '🎉 Focus Session Completed! Time to take a break.';
        playUiSound('chime');
        triggerConfetti();
        showToast('Focus session has ended! Great job! 🎉', 'success');
      }
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(pomodoro.timerInterval);
    pomodoro.isRunning = false;
    if (document.getElementById('btnTimerText')) {
      document.getElementById('btnTimerText').textContent = 'Resume';
    }
    if (statusLabel) statusLabel.textContent = '⏸️ Session paused';
    playUiSound('click');
    updateDisplay();
  }

  toggleBtn?.addEventListener('click', () => {
    if (pomodoro.isRunning) pauseTimer();
    else startTimer();
  });

  resetBtn?.addEventListener('click', () => {
    pauseTimer();
    pomodoro.remainingSeconds = pomodoro.totalSeconds;
    if (document.getElementById('btnTimerText')) {
      document.getElementById('btnTimerText').textContent = 'Start Focus';
    }
    if (statusLabel) statusLabel.textContent = 'Focus on one important task';
    updateDisplay();
    playUiSound('click');
  });

  document.querySelectorAll('.pomodoro-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pomodoro-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mins = Number(btn.dataset.time);
      pomodoro.totalSeconds = mins * 60;
      pomodoro.remainingSeconds = mins * 60;
      pauseTimer();
      updateDisplay();
      playUiSound('click');
    });
  });

  updateDisplay();
}

// ==============================================================================
// 7. COMMAND PALETTE (RAYCAST / LINEAR STYLE: CTRL+K)
// ==============================================================================
let commandSelectedIndex = 0;

function openCommandPalette() {
  const overlay = document.getElementById('commandPaletteOverlay');
  const input = document.getElementById('commandPaletteInput');
  if (!overlay || !input) return;

  playUiSound('pop');
  overlay.classList.remove('hidden');
  input.value = '';
  commandSelectedIndex = 0;
  renderCommandResults('');
  input.focus();
}

function closeCommandPalette() {
  document.getElementById('commandPaletteOverlay')?.classList.add('hidden');
}

function renderCommandResults(query = '') {
  const list = document.getElementById('commandResultsList');
  if (!list) return;
  list.innerHTML = '';

  const q = query.toLowerCase().trim();

  const systemActions = [
    ...(state.isAdmin ? [
      { id: 'act-admin-panel', label: '👑 Administrator Control Center (Super Admin)', icon: '👑', cat: 'Admin', action: () => { closeCommandPalette(); openAdminModal(); } },
      { id: 'act-admin-toggle', label: `👑 Cloud Overseer Mode: ${state.adminModeAllSchedules ? 'Disable' : 'Enable (View All)'}`, icon: '👁️', cat: 'Admin', action: () => { closeCommandPalette(); toggleAdminGlobalMode(); } }
    ] : []),
    { id: 'act-new', label: 'Create New Schedule', icon: '➕', cat: 'Navigation', action: () => { closeCommandPalette(); openScheduleModal(); } },
    { id: 'act-auth', label: state.currentUser ? `Account Profile (${state.currentUser.email})` : 'Sign In or Register Supabase Account', icon: '🔐', cat: 'Account', action: () => { closeCommandPalette(); openAuthOrProfile(); } },
    { id: 'act-supabase-cfg', label: 'Supabase Connection Settings', icon: '⚡', cat: 'Settings', action: () => { closeCommandPalette(); openSupabaseConfigModal(); } },
    { id: 'act-today', label: 'Jump to Today', icon: '📅', cat: 'Navigation', action: () => { closeCommandPalette(); goToToday(); } },
    { id: 'act-month', label: 'Switch to Monthly Calendar View', icon: '📆', cat: 'Views', action: () => { closeCommandPalette(); switchView('month'); } },
    { id: 'act-week', label: 'Switch to Weekly Timeline View', icon: '⏰', cat: 'Views', action: () => { closeCommandPalette(); switchView('week'); } },
    { id: 'act-day', label: 'Switch to Daily Focus View', icon: '🎯', cat: 'Views', action: () => { closeCommandPalette(); switchView('day'); } },
    { id: 'act-kanban', label: 'Switch to Kanban Board View', icon: '📋', cat: 'Views', action: () => { closeCommandPalette(); switchView('kanban'); } },
    { id: 'act-agenda', label: 'Switch to Agenda List View', icon: '📝', cat: 'Views', action: () => { closeCommandPalette(); switchView('agenda'); } },
    { id: 'act-pomodoro', label: 'Open Focus Session (Pomodoro)', icon: '⏱️', cat: 'Tools', action: () => { closeCommandPalette(); document.getElementById('pomodoroModalOverlay')?.classList.remove('hidden'); } },
    { id: 'act-theme', label: `Switch Theme to ${state.theme === 'dark' ? 'Light' : 'Dark'} Mode`, icon: '🌓', cat: 'Settings', action: () => { closeCommandPalette(); toggleTheme(); } },
    { id: 'act-sound', label: `Sound Effects: ${state.soundEnabled ? 'Disable' : 'Enable'}`, icon: '🔊', cat: 'Settings', action: () => { closeCommandPalette(); toggleSound(); } },
    { id: 'act-export', label: 'Export Schedule Data (Backup JSON)', icon: '💾', cat: 'Data', action: () => { closeCommandPalette(); exportDataJSON(); } },
    { id: 'act-reset', label: '🇮🇩 Reset & Load Calendar Holidays (Clear Old Data)', icon: '🇮🇩', cat: 'Data', action: () => { closeCommandPalette(); resetToIndonesiaCalendar(); } }
  ];

  const matchedActions = systemActions.filter(a => a.label.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q));

  const matchedSchedules = state.schedules.filter(s => {
    return s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
  }).slice(0, 6);

  let allItems = [];

  if (matchedActions.length > 0) {
    const grp = document.createElement('div');
    grp.className = 'cmd-group-label';
    grp.textContent = 'SYSTEM COMMANDS';
    list.appendChild(grp);

    matchedActions.forEach(act => {
      allItems.push(act);
      const itemEl = createCommandItemEl(act.label, act.icon, act.cat, allItems.length - 1, act.action);
      list.appendChild(itemEl);
    });
  }

  if (matchedSchedules.length > 0) {
    const grp = document.createElement('div');
    grp.className = 'cmd-group-label';
    grp.textContent = 'MATCHING SCHEDULES & EVENTS';
    list.appendChild(grp);

    matchedSchedules.forEach(sch => {
      const cat = getCategory(sch.category);
      const itemData = {
        label: sch.title,
        icon: cat.icon,
        cat: `${sch.date} • ${sch.startTime || ''}`,
        action: () => { closeCommandPalette(); openPreviewModal(sch); }
      };
      allItems.push(itemData);
      const itemEl = createCommandItemEl(sch.title, cat.icon, `${sch.date} • ${sch.startTime || ''}`, allItems.length - 1, itemData.action);
      list.appendChild(itemEl);
    });
  }

  if (allItems.length === 0) {
    list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No results found for "${escapeHtml(query)}"</div>`;
  } else {
    updateCommandSelection(allItems);
  }
}

function createCommandItemEl(title, icon, tag, index, action) {
  const el = document.createElement('div');
  el.className = `cmd-item ${index === commandSelectedIndex ? 'selected' : ''}`;
  el.dataset.index = index;

  el.innerHTML = `
    <div class="cmd-item-left">
      <span class="cmd-item-icon">${icon}</span>
      <span style="font-weight: 600;">${escapeHtml(title)}</span>
    </div>
    <span class="cmd-item-action-tag">${escapeHtml(tag)}</span>
  `;

  el.addEventListener('click', () => {
    action();
  });

  return el;
}

function updateCommandSelection() {
  const elements = document.querySelectorAll('#commandResultsList .cmd-item');
  elements.forEach((el, idx) => {
    el.classList.toggle('selected', idx === commandSelectedIndex);
  });
}

// ==============================================================================
// 8. DATE ENGINE & FORMATTING HELPERS
// ==============================================================================
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDate(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function isDateToday(date) {
  return isSameDate(date, new Date());
}

function getCategory(catId) {
  if (catId === 'holiday') return HOLIDAY_CATEGORY;
  return CATEGORIES.find(c => c.id === catId) || {
    id: 'other',
    name: 'Other',
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: '#94a3b8',
    icon: '📌'
  };
}

function getPriority(pId) {
  if (pId === 'none' || !pId) {
    return { id: 'none', label: 'Public Holiday', color: '#ef4444', icon: '🇮🇩' };
  }
  return PRIORITIES.find(p => p.id === pId) || { id: 'none', label: 'Non-Task', color: 'transparent', icon: '' };
}

function getStatus(sId) {
  return STATUSES.find(s => s.id === sId) || STATUSES[2];
}

function getFilteredSchedules() {
  return state.schedules.filter(item => {
    if (state.activeCategoryFilter !== 'all' && item.category !== state.activeCategoryFilter) return false;
    if (state.activePriorityFilter !== 'all') {
      // Event libur / tanggal merah TIDAK masuk prioritas tugas apapun
      if (item.category === 'holiday' || item.isHoliday || item.priority === 'none') return false;
      if (item.priority !== state.activePriorityFilter) return false;
    }
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase();
      const matchTitle = item.title && item.title.toLowerCase().includes(q);
      const matchDesc = item.description && item.description.toLowerCase().includes(q);
      const matchLoc = item.location && item.location.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchLoc) return false;
    }
    return true;
  });
}

// ==============================================================================
// 9. MAIN RENDER DISPATCHER
// ==============================================================================
function renderApp() {
  updatePeriodHeader();
  updateDashboardRibbon();
  renderMiniCalendar();
  renderCategoryFilterSidebar();
  renderActiveFilterBanner();
  renderGroupSwitcher();
  renderGroupBanner();

  switch (state.activeView) {
    case 'month':
      renderMonthView();
      break;
    case 'week':
      renderWeekView();
      break;
    case 'day':
      renderDayView();
      break;
    case 'kanban':
      renderKanbanView();
      break;
    case 'agenda':
      renderAgendaView();
      break;
  }
}

function updatePeriodHeader() {
  const titleEl = document.getElementById('currentPeriodTitle');
  const subEl = document.getElementById('currentPeriodSubtitle');
  if (!titleEl) return;

  const y = state.currentDate.getFullYear();
  const m = state.currentDate.getMonth();

  if (state.activeView === 'month') {
    titleEl.textContent = `${MONTH_NAMES[m]} ${y}`;
    subEl.textContent = `Monthly Calendar`;
  } else if (state.activeView === 'week') {
    const monday = getMondayOfWeek(state.currentDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    titleEl.textContent = `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()].slice(0, 3)} - ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]} ${y}`;
    subEl.textContent = `Week ${getWeekNumber(state.currentDate)} of ${y}`;
  } else if (state.activeView === 'day') {
    const d = state.selectedDate;
    titleEl.textContent = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    subEl.textContent = isDateToday(d) ? "Today's Agenda" : "Selected Date Agenda";
  } else if (state.activeView === 'kanban') {
    titleEl.textContent = `Kanban Workflow Board`;
    subEl.textContent = `Manage Task Workflow & Progress`;
  } else if (state.activeView === 'agenda') {
    titleEl.textContent = `Chronological Agenda List`;
    subEl.textContent = `Timeline Order of All Events`;
  }
}

function updateDashboardRibbon() {
  const todayKey = formatDateKey(new Date());
  const allEvents = state.schedules;
  
  // Hanya hitung tugas aktif (bukan tanggal merah / hari libur)
  const taskEvents = allEvents.filter(e => e.category !== 'holiday' && !e.isHoliday);
  const todayTasks = taskEvents.filter(e => e.date === todayKey);
  const todayCountEl = document.getElementById('statTodayCount');
  if (todayCountEl) todayCountEl.textContent = todayTasks.length;

  const completedEvents = taskEvents.filter(e => e.status === 'completed');
  const compCountEl = document.getElementById('statCompletedCount');
  const compPercentEl = document.getElementById('statProgressPercent');
  if (compCountEl && compPercentEl) {
    compCountEl.textContent = completedEvents.length;
    const pct = taskEvents.length > 0 ? Math.round((completedEvents.length / taskEvents.length) * 100) : 0;
    compPercentEl.textContent = `${pct}% Completed`;
  }

  const nextEventWrap = document.getElementById('statNextEvent');
  if (nextEventWrap) {
    const upcoming = taskEvents
      .filter(e => e.status !== 'completed' && e.date >= todayKey)
      .sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')))[0];

    if (upcoming) {
      const isToday = upcoming.date === todayKey;
      const dayLabel = isToday ? 'Today' : 'Upcoming';
      nextEventWrap.innerHTML = `
        <span class="next-title" title="${escapeHtml(upcoming.title)}">${escapeHtml(upcoming.title)}</span>
        <span class="next-time">⏰ ${dayLabel}, ${upcoming.startTime || 'All-Day'}</span>
      `;
    } else {
      nextEventWrap.innerHTML = `
        <span class="next-title">No urgent tasks</span>
        <span class="next-time">All caught up! 🎉</span>
      `;
    }
  }

  // Tugas prioritas tinggi murni (hari libur tidak masuk prioritas)
  const highPriority = taskEvents.filter(e => e.priority === 'high' && e.status !== 'completed');
  const highCountEl = document.getElementById('statHighPriorityCount');
  if (highCountEl) highCountEl.textContent = highPriority.length;
}

function renderActiveFilterBanner() {
  const banner = document.getElementById('activeFilterBanner');
  const text = document.getElementById('filterDetailsText');
  if (!banner || !text) return;

  const hasCat = state.activeCategoryFilter !== 'all';
  const hasPri = state.activePriorityFilter !== 'all';
  const hasSearch = state.searchQuery.trim() !== '';

  if (hasCat || hasPri || hasSearch) {
    banner.classList.remove('hidden');
    const filters = [];
    if (hasCat) filters.push(`Category: ${getCategory(state.activeCategoryFilter).name}`);
    if (hasPri) filters.push(`Priority: ${getPriority(state.activePriorityFilter).label}`);
    if (hasSearch) filters.push(`Search: "${state.searchQuery}"`);
    text.textContent = filters.join(' • ');
  } else {
    banner.classList.add('hidden');
  }
}

// ==============================================================================
// 10. VIEW 1: MONTH VIEW (KALENDER BULANAN)
// ==============================================================================
function renderMonthView() {
  const grid = document.getElementById('monthGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const startOffset = (firstDayIndex + 6) % 7;

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const filtered = getFilteredSchedules();
  const totalSlots = (startOffset + totalDaysInMonth) > 35 ? 42 : 35;

  for (let i = 0; i < totalSlots; i++) {
    const cell = document.createElement('div');
    cell.className = 'month-cell';

    let cellDate;
    if (i < startOffset) {
      const dayNum = prevMonthTotalDays - startOffset + i + 1;
      cellDate = new Date(year, month - 1, dayNum);
      cell.classList.add('other-month');
    } else if (i < startOffset + totalDaysInMonth) {
      const dayNum = i - startOffset + 1;
      cellDate = new Date(year, month, dayNum);
    } else {
      const dayNum = i - (startOffset + totalDaysInMonth) + 1;
      cellDate = new Date(year, month + 1, dayNum);
      cell.classList.add('other-month');
    }

    const dateKey = formatDateKey(cellDate);
    const isToday = isDateToday(cellDate);
    if (isToday) cell.classList.add('is-today');

    const dayEvents = filtered.filter(item => item.date === dateKey);
    const dayHolidays = dayEvents.filter(item => item.category === 'holiday' || item.isHoliday);
    const dayTasks = dayEvents.filter(item => item.category !== 'holiday' && !item.isHoliday);

    const isSunday = cellDate.getDay() === 0;
    const isTanggalMerah = isSunday || dayHolidays.length > 0;
    if (isTanggalMerah) cell.classList.add('is-tanggal-merah');

    const cellHeader = document.createElement('div');
    cellHeader.className = 'cell-header';

    const dayNumber = document.createElement('span');
    dayNumber.className = `day-number ${isTanggalMerah ? 'is-tanggal-merah' : ''}`;
    dayNumber.textContent = cellDate.getDate();
    if (dayHolidays.length > 0) {
      dayNumber.title = `🇮🇩 Public Holiday: ${dayHolidays.map(h => h.title).join(', ')}`;
    }

    cellHeader.appendChild(dayNumber);

    if (!state.currentGroup || isCurrentGroupAdmin()) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-cell-add';
      addBtn.innerHTML = '+';
      addBtn.title = `Add schedule on ${dateKey}`;
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playUiSound('click');
        openScheduleModal(null, dateKey);
      });
      cellHeader.appendChild(addBtn);
    }
    cell.appendChild(cellHeader);

    // Tempat Khusus: Tanggal Merah & Libur Nasional di bagian atas cell
    if (dayHolidays.length > 0) {
      const holidayWrap = document.createElement('div');
      holidayWrap.className = 'cell-holiday-wrap';
      dayHolidays.forEach(h => {
        const hBadge = document.createElement('div');
        hBadge.className = 'cell-holiday-badge';
        hBadge.title = `🇮🇩 Public Holiday: ${h.title} (Click for details)`;
        hBadge.innerHTML = `
          <span class="tm-flag">🇮🇩</span>
          <span class="tm-text">${escapeHtml(h.title)}</span>
        `;
        hBadge.addEventListener('click', (e) => {
          e.stopPropagation();
          playUiSound('pop');
          openPreviewModal(h);
        });
        holidayWrap.appendChild(hBadge);
      });
      cell.appendChild(holidayWrap);
    }

    const eventsList = document.createElement('div');
    eventsList.className = 'cell-events-list';

    const maxVisibleChips = dayHolidays.length > 0 ? 2 : 3;
    const visibleEvents = dayTasks.slice(0, maxVisibleChips);

    visibleEvents.forEach(item => {
      const cat = getCategory(item.category);
      const pri = getPriority(item.priority);

      const chip = document.createElement('div');
      chip.className = `event-chip ${item.status === 'completed' ? 'is-completed' : ''}`;
      chip.style.backgroundColor = cat.bgColor;
      chip.style.borderLeftColor = cat.color;
      chip.style.color = 'var(--text-main)';
      chip.title = `${item.title} (${item.startTime || 'All day'})`;

      chip.innerHTML = `
        <span class="chip-time">${item.startTime || ''}</span>
        <span class="chip-title">${escapeHtml(item.title)}</span>
        <span class="chip-priority-dot" style="background-color: ${pri.color}; color: ${pri.color};" title="Priority: ${pri.label}"></span>
      `;

      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        playUiSound('pop');
        openPreviewModal(item);
      });

      eventsList.appendChild(chip);
    });

    if (dayTasks.length > maxVisibleChips) {
      const overflow = document.createElement('div');
      overflow.className = 'more-events-pill';
      overflow.textContent = `+${dayTasks.length - maxVisibleChips} more`;
      overflow.addEventListener('click', (e) => {
        e.stopPropagation();
        playUiSound('click');
        state.selectedDate = cellDate;
        switchView('day');
      });
      eventsList.appendChild(overflow);
    }

    // Indikator Titik Rapi Khusus Layar HP (Mobile Indicator Dots)
    const dotsRow = document.createElement('div');
    dotsRow.className = 'cell-dots-row';

    if (dayHolidays.length > 0) {
      const hDot = document.createElement('span');
      hDot.className = 'cell-dot is-holiday';
      hDot.title = `Libur: ${dayHolidays[0].title}`;
      dotsRow.appendChild(hDot);
    }

    const maxMobileDots = 3;
    dayTasks.slice(0, maxMobileDots).forEach(task => {
      const c = getCategory(task.category);
      const dot = document.createElement('span');
      dot.className = 'cell-dot';
      dot.style.backgroundColor = c.color;
      dot.title = task.title;
      dotsRow.appendChild(dot);
    });

    if (dayTasks.length > maxMobileDots) {
      const moreDot = document.createElement('span');
      moreDot.className = 'cell-dot-more';
      moreDot.textContent = `+${dayTasks.length - maxMobileDots}`;
      dotsRow.appendChild(moreDot);
    }

    cell.appendChild(dotsRow);

    const selDateKey = formatDateKey(state.selectedDate || state.currentDate);
    if (dateKey === selDateKey) {
      cell.classList.add('is-selected-date');
    }

    cell.addEventListener('click', () => {
      state.selectedDate = cellDate;
      renderApp();
    });

    grid.appendChild(cell);
  }

  // Render Daily Agenda Summary for Mobile Viewports
  renderMobileDayAgenda(state.selectedDate || state.currentDate);
}

/**
 * Render Agenda Hari Ini di bawah kalender bulanan khusus perangkat HP
 * Memungkinkan pengguna melihat dan membuat jadwal tanpa kesulitan klik cell kecil
 */
function renderMobileDayAgenda(targetDate) {
  const sheet = document.getElementById('mobileDayAgendaSheet');
  if (!sheet) return;

  const dateObj = targetDate ? new Date(targetDate) : new Date();
  const dateKey = formatDateKey(dateObj);
  const filtered = getFilteredSchedules();
  const dayEvents = filtered.filter(item => item.date === dateKey);
  const dayHolidays = dayEvents.filter(item => item.category === 'holiday' || item.isHoliday);
  const dayTasks = dayEvents.filter(item => item.category !== 'holiday' && !item.isHoliday);

  const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNamesIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const dayName = dayNamesIndo[dateObj.getDay()];
  const dateFormatted = `${dayName}, ${dateObj.getDate()} ${monthNamesIndo[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  let holidayBannerHtml = '';
  if (dayHolidays.length > 0) {
    holidayBannerHtml = `
      <div class="m-agenda-holiday-banner">
        <span>🇮🇩</span>
        <span><strong>Libur Nasional:</strong> ${escapeHtml(dayHolidays.map(h => h.title).join(', '))}</span>
      </div>
    `;
  }

  let cardsHtml = '';
  if (dayTasks.length > 0) {
    cardsHtml = `<div class="m-agenda-list">`;
    dayTasks.forEach(task => {
      const cat = getCategory(task.category);
      const pri = getPriority(task.priority);
      const timeStr = task.startTime ? `${task.startTime}${task.endTime ? ' - ' + task.endTime : ''}` : 'Sepanjang Hari';
      const statusIcon = task.status === 'completed' ? '✅' : '⏳';
      cardsHtml += `
        <div class="m-agenda-card" data-id="${task.id}">
          <div class="m-agenda-card-left">
            <span class="m-agenda-cat-dot" style="background-color: ${cat.color};"></span>
            <div class="m-agenda-info">
              <span class="m-agenda-event-title">${escapeHtml(task.title)}</span>
              <span class="m-agenda-time">${timeStr} • <span style="color:${pri.color};">${pri.icon} ${pri.label}</span></span>
            </div>
          </div>
          <span style="font-size: 0.85rem;">${statusIcon}</span>
        </div>
      `;
    });
    cardsHtml += `</div>`;
  } else {
    cardsHtml = `
      <div class="m-agenda-empty">
        <span>✨ Tidak ada jadwal pada tanggal ini.</span>
      </div>
    `;
  }

  const canAdd = !state.currentGroup || isCurrentGroupAdmin();
  const addBtnHtml = canAdd ? `
    <button type="button" class="m-agenda-add-btn" id="btnMobileAgendaAdd">
      <span>+ Tambah Jadwal pada ${dateObj.getDate()} ${monthNamesIndo[dateObj.getMonth()]}</span>
    </button>
  ` : '';

  sheet.innerHTML = `
    <div class="m-agenda-header">
      <div class="m-agenda-title-wrap">
        <span class="m-agenda-title">📅 ${dateFormatted}</span>
        <span class="m-agenda-subtitle">${dayTasks.length} jadwal terencana</span>
      </div>
      <span class="m-agenda-badge">${isDateToday(dateObj) ? 'Hari Ini' : `${dayTasks.length} Agenda`}</span>
    </div>
    ${holidayBannerHtml}
    ${cardsHtml}
    ${addBtnHtml}
  `;

  // Pasang event listener pada setiap kartu agenda
  sheet.querySelectorAll('.m-agenda-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const item = state.schedules.find(s => s.id === id);
      if (item) {
        playUiSound('pop');
        openPreviewModal(item);
      }
    });
  });

  document.getElementById('btnMobileAgendaAdd')?.addEventListener('click', () => {
    playUiSound('click');
    openScheduleModal(null, dateKey);
  });
}

// ==============================================================================
// 11. VIEW 2: WEEK VIEW (TIMELINE MINGGUAN)
// ==============================================================================
function getMondayOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function getWeekNumber(d) {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function renderWeekView() {
  const headerRow = document.getElementById('weekHeaderRow');
  const timeAxis = document.getElementById('timeAxis');
  const gridColumns = document.getElementById('weekGridColumns');
  if (!headerRow || !timeAxis || !gridColumns) return;

  headerRow.innerHTML = '<div class="week-day-header"></div>';
  timeAxis.innerHTML = '';
  gridColumns.innerHTML = '';

  const monday = getMondayOfWeek(state.currentDate);
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  weekDays.forEach(dayDate => {
    const isToday = isDateToday(dayDate);
    const dateKey = formatDateKey(dayDate);
    const dayHolidays = state.schedules.filter(s => s.date === dateKey && (s.category === 'holiday' || s.isHoliday));
    const isSunday = dayDate.getDay() === 0;
    const isTanggalMerah = isSunday || dayHolidays.length > 0;

    const dayCol = document.createElement('div');
    dayCol.className = `week-day-header ${isToday ? 'is-today' : ''} ${isTanggalMerah ? 'is-tanggal-merah' : ''}`;
    dayCol.innerHTML = `
      <span class="week-day-name">${DAY_NAMES[dayDate.getDay()].slice(0, 3)}</span>
      <span class="week-day-number">${dayDate.getDate()}</span>
      ${dayHolidays.length > 0 ? `<span class="week-holiday-tag" title="🇮🇩 Public Holiday: ${escapeHtml(dayHolidays[0].title)}">🇮🇩 Holiday</span>` : ''}
    `;
    dayCol.style.cursor = 'pointer';
    dayCol.addEventListener('click', () => {
      state.selectedDate = dayDate;
      switchView('day');
    });
    headerRow.appendChild(dayCol);
  });

  for (let hour = 0; hour < 24; hour++) {
    const slot = document.createElement('div');
    slot.className = 'time-axis-slot';
    slot.textContent = `${String(hour).padStart(2, '0')}:00`;
    timeAxis.appendChild(slot);
  }

  const filtered = getFilteredSchedules();
  const hourHeight = 54;

  weekDays.forEach(dayDate => {
    const dateKey = formatDateKey(dayDate);
    const track = document.createElement('div');
    track.className = 'week-day-track';

    for (let hour = 0; hour < 24; hour++) {
      const hSlot = document.createElement('div');
      hSlot.className = 'week-hour-slot';
      hSlot.title = `Add schedule on ${dateKey} ${String(hour).padStart(2, '0')}:00`;
      hSlot.addEventListener('click', () => {
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        openScheduleModal(null, dateKey, timeStr);
      });
      track.appendChild(hSlot);
    }

    if (isDateToday(dayDate)) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const topOffset = (currentMinutes / 60) * hourHeight;

      const indicator = document.createElement('div');
      indicator.className = 'current-time-indicator';
      indicator.style.top = `${topOffset}px`;
      track.appendChild(indicator);
    }

    // Hanya render tugas murni di timeline jam, bukan tanggal merah
    const dayTasks = filtered.filter(item => item.date === dateKey && item.category !== 'holiday' && !item.isHoliday);

    dayTasks.forEach(item => {
      const cat = getCategory(item.category);
      const [sh, sm] = (item.startTime || '09:00').split(':').map(Number);
      const [eh, em] = (item.endTime || '10:00').split(':').map(Number);

      const startMin = (sh || 0) * 60 + (sm || 0);
      let endMin = (eh || 0) * 60 + (em || 0);
      if (endMin <= startMin) endMin = startMin + 60;

      const top = (startMin / 60) * hourHeight;
      const height = Math.max(34, ((endMin - startMin) / 60) * hourHeight - 2);

      const eventCard = document.createElement('div');
      eventCard.className = `week-event-card ${item.status === 'completed' ? 'is-completed' : ''}`;
      eventCard.style.top = `${top}px`;
      eventCard.style.height = `${height}px`;
      eventCard.style.backgroundColor = cat.bgColor;
      eventCard.style.borderLeftColor = cat.color;
      eventCard.style.color = 'var(--text-main)';

      eventCard.innerHTML = `
        <div style="font-weight: 700; font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${cat.icon} ${escapeHtml(item.title)}
        </div>
        <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-mono);">
          ${item.startTime || ''} - ${item.endTime || ''}
        </div>
      `;

      eventCard.addEventListener('click', (e) => {
        e.stopPropagation();
        playUiSound('pop');
        openPreviewModal(item);
      });

      track.appendChild(eventCard);
    });

    gridColumns.appendChild(track);
  });
}

// ==============================================================================
// 12. VIEW 3: DAY VIEW (AGENDA HARIAN TERFOKUS)
// ==============================================================================
function renderDayView() {
  const header = document.getElementById('dayViewHeader');
  const timelineCol = document.getElementById('dayTimelineColumn');
  const notesTextarea = document.getElementById('dayNotesInput');
  const tasksList = document.getElementById('dayTasksList');
  const counterEl = document.getElementById('dayChecklistCounter');
  if (!header || !timelineCol) return;

  const d = state.selectedDate;
  const dateKey = formatDateKey(d);

  const dayEvents = getFilteredSchedules().filter(item => item.date === dateKey);
  const dayHolidays = dayEvents.filter(item => item.category === 'holiday' || item.isHoliday);
  const dayTasks = dayEvents.filter(item => item.category !== 'holiday' && !item.isHoliday);
  const completedCount = dayTasks.filter(e => e.status === 'completed').length;

  const isSunday = d.getDay() === 0;
  const isTanggalMerah = isSunday || dayHolidays.length > 0;

  const canAddDay = !state.currentGroup || isCurrentGroupAdmin();
  header.innerHTML = `
    <div class="day-header-main">
      <h2 style="${isTanggalMerah ? 'color: #ef4444;' : ''}">
        ${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}
        ${isTanggalMerah ? '<span style="font-size: 0.8rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 2px 8px; border-radius: 6px; margin-left: 8px;">🇮🇩 Public Holiday</span>' : ''}
      </h2>
      <p>${dayTasks.length} Scheduled Tasks • ${completedCount} Completed</p>
    </div>
    ${canAddDay ? `
      <button class="btn btn-primary btn-sm" id="btnDayAddEvent">
        + Today's Schedule
      </button>
    ` : ''}
  `;

  if (canAddDay) {
    document.getElementById('btnDayAddEvent')?.addEventListener('click', () => {
      openScheduleModal(null, dateKey);
    });
  }

  timelineCol.innerHTML = '';

  // 1. Tempat Khusus Tanggal Merah di Day View:
  if (dayHolidays.length > 0) {
    dayHolidays.forEach(h => {
      const banner = document.createElement('div');
      banner.className = 'day-holiday-banner';
      banner.innerHTML = `
        <div class="tm-flag-icon">🇮🇩</div>
        <div class="tm-banner-body">
          <div class="tm-banner-kicker">PUBLIC HOLIDAY • NATIONAL OBSERVANCE</div>
          <div class="tm-banner-title">${escapeHtml(h.title)}</div>
          ${h.description ? `<div class="tm-banner-desc">${escapeHtml(h.description)}</div>` : ''}
        </div>
      `;
      banner.style.cursor = 'pointer';
      banner.addEventListener('click', () => {
        openPreviewModal(h);
      });
      timelineCol.appendChild(banner);
    });
  }

  // 2. Daftar tugas hari ini (hanya tugas biasa):
  if (dayTasks.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'text-align: center; padding: 40px 20px; color: var(--text-muted);';
    if (dayHolidays.length > 0) {
      emptyMsg.innerHTML = `
        <p style="font-size: 2.8rem; margin-bottom: 8px;">🏖️</p>
        <p style="font-weight: 800; color: #ef4444; font-size: 1.15rem; font-family: var(--font-display);">Enjoy Your Holiday!</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">No mandatory tasks scheduled today. A great time to rest, recharge, or spend time with loved ones.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="document.getElementById('btnOpenNewSchedule').click()">
          + Add Personal Activity
        </button>
      `;
    } else {
      emptyMsg.innerHTML = `
        <p style="font-size: 2.8rem; margin-bottom: 8px;">🏖️</p>
        <p style="font-weight: 800; color: var(--text-main); font-size: 1.15rem; font-family: var(--font-display);">No schedules for today</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Enjoy your free time or add a new plan.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="document.getElementById('btnOpenNewSchedule').click()">
          + Add Activity
        </button>
      `;
    }
    timelineCol.appendChild(emptyMsg);
  } else {
    dayTasks.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).forEach(item => {
      const cat = getCategory(item.category);
      const pri = getPriority(item.priority);
      const stat = getStatus(item.status);

      const card = document.createElement('div');
      card.className = `day-schedule-card ${item.status === 'completed' ? 'is-completed' : ''}`;
      card.style.borderLeftColor = cat.color;

      card.innerHTML = `
        <div class="day-card-left">
          <div class="day-time-tag">${item.startTime || 'All day'} - ${item.endTime || 'End'}</div>
          <div>
            <div class="day-card-title">${cat.icon} ${escapeHtml(item.title)}</div>
            <div class="day-card-meta">
              <span style="color: ${cat.color}; font-weight: 700;">${cat.name}</span>
              <span>•</span>
              <span style="color: ${pri.color}; font-weight: 700;">${pri.label}</span>
              ${item.location ? `<span>•</span> <span>📍 ${escapeHtml(item.location)}</span>` : ''}
            </div>
          </div>
        </div>
        <div>
          <button class="btn btn-outline btn-sm btn-quick-status" title="Change status">
            ${stat.icon} ${stat.label}
          </button>
        </div>
      `;

      card.querySelector('.btn-quick-status').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleScheduleComplete(item.id);
      });

      card.addEventListener('click', () => {
        openPreviewModal(item);
      });

      timelineCol.appendChild(card);
    });
  }

  if (notesTextarea) {
    notesTextarea.value = state.dayNotes[dateKey] || '';
  }

  if (tasksList) {
    tasksList.innerHTML = '';
    const allChecklistItems = [];
    dayEvents.forEach(evt => {
      if (evt.checklist && evt.checklist.length > 0) {
        evt.checklist.forEach((chk, idx) => {
          allChecklistItems.push({
            eventId: evt.id,
            index: idx,
            text: chk.text,
            done: chk.done
          });
        });
      }
    });

    const doneCount = allChecklistItems.filter(c => c.done).length;
    if (counterEl) {
      counterEl.textContent = `${doneCount}/${allChecklistItems.length} Done`;
    }

    if (allChecklistItems.length === 0) {
      tasksList.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">No active sub-tasks for today's agenda.</p>`;
    } else {
      allChecklistItems.forEach(item => {
        const row = document.createElement('label');
        row.className = 'day-task-item';
        const canEditChecklist = !state.currentGroup || isCurrentGroupAdmin();
        row.innerHTML = `
          <input type="checkbox" ${item.done ? 'checked' : ''} ${canEditChecklist ? '' : 'disabled'} class="agenda-checkbox">
          <span style="${item.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(item.text)}</span>
        `;
        row.querySelector('input').addEventListener('change', async (e) => {
          if (state.currentGroup && !isCurrentGroupAdmin()) {
            e.preventDefault();
            e.target.checked = !e.target.checked;
            playUiSound('error');
            showToast('⚠️ Akses Dibatasi: Hanya Admin Grup yang dapat memperbarui checklist jadwal grup.', 'warning');
            return;
          }
          const evt = state.schedules.find(s => s.id === item.eventId);
          if (evt && evt.checklist && evt.checklist[item.index]) {
            evt.checklist[item.index].done = e.target.checked;
            if (e.target.checked) {
              playUiSound('complete');
              triggerConfetti();
            } else {
              playUiSound('click');
            }
            await persistSchedule(evt);
            renderApp();
          }
        });
        tasksList.appendChild(row);
      });
    }
  }
}

// ==============================================================================
// 13. VIEW 4: KANBAN BOARD VIEW
// ==============================================================================
function renderKanbanView() {
  const cols = {
    todo: document.getElementById('cardsListTodo'),
    in_progress: document.getElementById('cardsListInProgress'),
    scheduled: document.getElementById('cardsListScheduled'),
    completed: document.getElementById('cardsListCompleted')
  };

  const counts = {
    todo: document.getElementById('countColTodo'),
    in_progress: document.getElementById('countColInProgress'),
    scheduled: document.getElementById('countColScheduled'),
    completed: document.getElementById('countColCompleted')
  };

  if (!cols.todo) return;
  Object.values(cols).forEach(col => { col.innerHTML = ''; });

  // Kanban hanya untuk alur kerja dan tugas nyata, bukan hari libur / tanggal merah
  const filtered = getFilteredSchedules().filter(item => item.category !== 'holiday' && !item.isHoliday && item.priority !== 'none');
  const grouped = { todo: [], in_progress: [], scheduled: [], completed: [] };
  filtered.forEach(item => {
    const st = item.status || 'scheduled';
    if (grouped[st]) grouped[st].push(item);
    else grouped.scheduled.push(item);
  });

  const mBadges = {
    todo: document.getElementById('mBadgeTodo'),
    in_progress: document.getElementById('mBadgeInProgress'),
    scheduled: document.getElementById('mBadgeScheduled'),
    completed: document.getElementById('mBadgeCompleted')
  };

  Object.keys(grouped).forEach(statusKey => {
    if (counts[statusKey]) {
      counts[statusKey].textContent = grouped[statusKey].length;
    }
    if (mBadges[statusKey]) {
      mBadges[statusKey].textContent = grouped[statusKey].length;
    }

    grouped[statusKey].forEach(item => {
      const cat = getCategory(item.category);
      const pri = getPriority(item.priority);

      const card = document.createElement('div');
      card.className = 'kanban-card';

      let checkText = '';
      if (item.checklist && item.checklist.length > 0) {
        const done = item.checklist.filter(c => c.done).length;
        checkText = `☑️ ${done}/${item.checklist.length}`;
      }

      const canAdvance = !state.currentGroup || isCurrentGroupAdmin();
      card.innerHTML = `
        <div class="kanban-card-header">
          <span class="kanban-cat-badge" style="background-color: ${cat.bgColor}; color: ${cat.color};">
            ${cat.icon} ${cat.name}
          </span>
          <span style="font-size: 0.72rem; font-weight: 700; color: ${pri.color};">${pri.icon}</span>
        </div>
        <div class="kanban-card-title">${escapeHtml(item.title)}</div>
        <div class="kanban-card-footer">
          <span>📅 ${item.date}</span>
          ${checkText ? `<span style="font-size: 0.68rem; color: var(--text-muted);">${checkText}</span>` : ''}
          ${canAdvance ? `
            <button class="kanban-advance-btn" title="Move to next stage">
              <span>Next</span> ➜
            </button>
          ` : ''}
        </div>
      `;

      if (canAdvance) {
        card.querySelector('.kanban-advance-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          advanceKanbanStatus(item.id);
        });
      }

      card.addEventListener('click', () => {
        openPreviewModal(item);
      });

      cols[statusKey].appendChild(card);
    });
  });
}

async function advanceKanbanStatus(scheduleId) {
  if (state.currentGroup && !isCurrentGroupAdmin()) {
    playUiSound('error');
    showToast('⚠️ Akses Dibatasi: Hanya Admin Grup yang dapat memindahkan alur status Kanban.', 'warning');
    return;
  }
  const item = state.schedules.find(s => s.id === scheduleId);
  if (!item) return;

  const sequence = ['todo', 'in_progress', 'scheduled', 'completed'];
  const currentIndex = sequence.indexOf(item.status || 'scheduled');
  const nextIndex = (currentIndex + 1) % sequence.length;
  item.status = sequence[nextIndex];

  if (item.status === 'completed') {
    playUiSound('complete');
    triggerConfetti();
  } else {
    playUiSound('pop');
  }

  await persistSchedule(item);
  renderApp();
  showToast(`Status '${item.title}' changed to: ${getStatus(item.status).label}`, 'success');
}

// ==============================================================================
// 14. VIEW 5: AGENDA / LIST VIEW
// ==============================================================================
function renderAgendaView() {
  const container = document.getElementById('agendaViewContainer');
  if (!container) return;
  container.innerHTML = '';

  const filtered = getFilteredSchedules();
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px; color: var(--text-muted);">
        <p style="font-size: 2.8rem; margin-bottom: 10px;">📋</p>
        <p style="font-weight: 800; color: var(--text-main); font-size: 1.15rem; font-family: var(--font-display);">No matching schedules</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Try adjusting your search keywords or category filters.</p>
      </div>
    `;
    return;
  }

  const sorted = [...filtered].sort((a, b) => {
    const da = a.date + (a.startTime || '00:00');
    const db = b.date + (b.startTime || '00:00');
    return da.localeCompare(db);
  });

  const todayKey = formatDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = formatDateKey(tomorrow);

  const groups = [
    { title: 'Today', items: sorted.filter(s => s.date === todayKey) },
    { title: 'Tomorrow', items: sorted.filter(s => s.date === tomorrowKey) },
    { title: 'Upcoming', items: sorted.filter(s => s.date > tomorrowKey) },
    { title: 'Past', items: sorted.filter(s => s.date < todayKey) }
  ];

  groups.forEach(group => {
    if (group.items.length === 0) return;

    const groupSection = document.createElement('div');
    groupSection.className = 'agenda-group';

    groupSection.innerHTML = `
      <div class="agenda-group-header">
        <h3 class="agenda-group-title">
          <span>${group.title}</span>
        </h3>
        <span class="agenda-group-count">${group.items.length} Events</span>
      </div>
    `;

    group.items.forEach(item => {
      const isHoliday = item.category === 'holiday' || item.isHoliday || item.priority === 'none';

      if (isHoliday) {
        // TAMPILAN KHUSUS TANGGAL MERAH / HARI LIBUR NASIONAL
        const card = document.createElement('div');
        card.className = 'agenda-card is-holiday-card';
        card.style.cursor = 'pointer';

        card.innerHTML = `
          <div class="agenda-left-section">
            <span class="agenda-holiday-flag">🇮🇩</span>
            <div class="agenda-time-pill" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
              ${item.date} • Public Holiday
            </div>
            <div>
              <div class="agenda-card-title" style="color: #ef4444; font-weight: 700;">${escapeHtml(item.title)}</div>
              <div class="agenda-meta-row">
                <span class="agenda-holiday-badge">🇮🇩 Public Holiday</span>
                ${item.description ? `<span>•</span> <span style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(item.description)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="agenda-actions-right">
            <span style="font-size: 0.75rem; font-weight: 700; color: #ef4444; padding: 4px 10px; background: rgba(239, 68, 68, 0.08); border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.2);">
              Official Holiday
            </span>
          </div>
        `;

        card.addEventListener('click', () => {
          openPreviewModal(item);
        });

        groupSection.appendChild(card);
        return;
      }

      const cat = getCategory(item.category);
      const pri = getPriority(item.priority);
      const isDone = item.status === 'completed';

      const card = document.createElement('div');
      card.className = `agenda-card ${isDone ? 'is-completed' : ''}`;

      card.innerHTML = `
        <div class="agenda-left-section">
          <input type="checkbox" class="agenda-checkbox" ${isDone ? 'checked' : ''} title="Mark as Completed">
          <div class="agenda-time-pill">${item.date} • ${item.startTime || 'All day'}</div>
          <div>
            <div class="agenda-card-title">${escapeHtml(item.title)}</div>
            <div class="agenda-meta-row">
              <span style="color: ${cat.color}; font-weight: 700;">${cat.icon} ${cat.name}</span>
              <span>•</span>
              <span style="color: ${pri.color}; font-weight: 700;">${pri.label}</span>
              ${item.location ? `<span>•</span> <span>📍 ${escapeHtml(item.location)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="agenda-actions-right">
          <button class="btn btn-outline btn-sm btn-edit-item" title="Edit Schedule">Edit</button>
          <button class="btn-icon btn-sm text-danger btn-delete-item" title="Delete Schedule">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      card.querySelector('.agenda-checkbox').addEventListener('change', (e) => {
        e.stopPropagation();
        toggleScheduleComplete(item.id);
      });

      card.querySelector('.btn-edit-item').addEventListener('click', (e) => {
        e.stopPropagation();
        openScheduleModal(item);
      });

      card.querySelector('.btn-delete-item').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteSchedule(item.id);
      });

      card.addEventListener('click', () => {
        openPreviewModal(item);
      });

      groupSection.appendChild(card);
    });

    container.appendChild(groupSection);
  });
}

// ==============================================================================
// 15. MINI CALENDAR & SIDEBAR FILTER
// ==============================================================================
function renderMiniCalendar() {
  const grid = document.getElementById('miniCalGrid');
  const title = document.getElementById('miniCalTitle');
  if (!grid || !title) return;
  grid.innerHTML = '';

  const d = state.currentDate;
  title.textContent = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;

  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const allDatesWithEvents = new Set(state.schedules.map(s => s.date));
  const holidayDates = new Set(
    state.schedules
      .filter(s => s.category === 'holiday' || s.isHoliday || s.priority === 'none')
      .map(s => s.date)
  );

  for (let i = firstDay - 1; i >= 0; i--) {
    const el = document.createElement('div');
    el.className = 'mini-day other-month';
    el.textContent = prevDays - i;
    grid.appendChild(el);
  }

  for (let day = 1; day <= totalDays; day++) {
    const el = document.createElement('div');
    el.className = 'mini-day';
    el.textContent = day;

    const thisDate = new Date(year, month, day);
    const dateKey = formatDateKey(thisDate);
    const isSunday = thisDate.getDay() === 0;
    const isHoliday = holidayDates.has(dateKey);

    if (isSunday || isHoliday) {
      el.classList.add('is-tanggal-merah');
      if (isHoliday) el.title = `🇮🇩 Public Holiday`;
    }
    if (isDateToday(thisDate)) el.classList.add('is-today');
    if (isSameDate(thisDate, state.selectedDate)) el.classList.add('is-selected');
    if (allDatesWithEvents.has(dateKey)) el.classList.add('has-event');

    el.addEventListener('click', () => {
      playUiSound('click');
      state.selectedDate = thisDate;
      state.currentDate = new Date(thisDate);
      renderApp();
    });

    grid.appendChild(el);
  }
}

function renderCategoryFilterSidebar() {
  const container = document.getElementById('categoryFilterList');
  if (!container) return;
  container.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const count = state.schedules.filter(s => s.category === cat.id).length;
    const isActive = state.activeCategoryFilter === cat.id;

    const item = document.createElement('div');
    item.className = `cat-filter-item ${isActive ? 'active' : ''}`;

    item.innerHTML = `
      <div class="cat-info-wrap">
        <span class="cat-dot" style="background-color: ${cat.color}; color: ${cat.color};"></span>
        <span>${cat.name}</span>
      </div>
      <span class="cat-count-badge">${count}</span>
    `;

    item.addEventListener('click', () => {
      playUiSound('click');
      state.activeCategoryFilter = isActive ? 'all' : cat.id;
      renderApp();
    });

    container.appendChild(item);
  });
}

// ==============================================================================
// 16. MODAL MANAJER (CREATE, EDIT, PREVIEW)
// ==============================================================================
let currentEditingId = null;

function openScheduleModal(itemToEdit = null, defaultDateStr = null, defaultTimeStr = null) {
  const modal = document.getElementById('scheduleModalOverlay');
  const titleEl = document.getElementById('modalTitle');
  const badgeEl = document.getElementById('modalIconBadge');
  const deleteBtn = document.getElementById('btnDeleteSchedule');
  const pillSelector = document.getElementById('formCategoryPillSelector');
  const checklistContainer = document.getElementById('formChecklistContainer');

  if (!modal) return;

  if (state.currentGroup && !isCurrentGroupAdmin()) {
    playUiSound('error');
    showToast('⚠️ Akses Dibatasi: Anda adalah Anggota di grup ini. Hanya Admin Grup yang dapat menambah atau mengubah jadwal bersama.', 'warning');
    return;
  }

  playUiSound('pop');

  pillSelector.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-pill-btn';
    btn.dataset.category = cat.id;
    btn.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span>`;

    btn.addEventListener('click', () => {
      playUiSound('click');
      pillSelector.querySelectorAll('.category-pill-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });

    pillSelector.appendChild(btn);
  });

  checklistContainer.innerHTML = '';

  if (itemToEdit) {
    currentEditingId = itemToEdit.id;
    titleEl.textContent = 'Edit Schedule Details';
    badgeEl.textContent = '✏️';
    deleteBtn.classList.remove('hidden');

    document.getElementById('formScheduleId').value = itemToEdit.id;
    document.getElementById('formTitle').value = itemToEdit.title || '';
    document.getElementById('formDate').value = itemToEdit.date || formatDateKey(new Date());
    document.getElementById('formStartTime').value = itemToEdit.startTime || '09:00';
    document.getElementById('formEndTime').value = itemToEdit.endTime || '10:00';
    document.getElementById('formPriority').value = itemToEdit.priority || 'medium';
    document.getElementById('formStatus').value = itemToEdit.status || 'scheduled';
    document.getElementById('formLocation').value = itemToEdit.location || '';
    document.getElementById('formDescription').value = itemToEdit.description || '';

    const activePill = pillSelector.querySelector(`[data-category="${itemToEdit.category}"]`);
    if (activePill) activePill.classList.add('selected');
    else pillSelector.firstElementChild?.classList.add('selected');

    if (itemToEdit.checklist && Array.isArray(itemToEdit.checklist)) {
      itemToEdit.checklist.forEach(chk => {
        addChecklistInputRow(chk.text, chk.done);
      });
    }
  } else {
    currentEditingId = null;
    titleEl.textContent = 'Add New Schedule';
    badgeEl.textContent = '📅';
    deleteBtn.classList.add('hidden');

    document.getElementById('scheduleForm').reset();
    document.getElementById('formScheduleId').value = '';
    document.getElementById('formDate').value = defaultDateStr || formatDateKey(state.selectedDate || new Date());
    document.getElementById('formStartTime').value = defaultTimeStr || '09:00';
    document.getElementById('formEndTime').value = defaultTimeStr ? addHours(defaultTimeStr, 1) : '10:00';
    document.getElementById('formPriority').value = 'medium';
    document.getElementById('formStatus').value = 'scheduled';

    pillSelector.firstElementChild?.classList.add('selected');
  }

  modal.classList.remove('hidden');
  document.getElementById('formTitle').focus();
}

function closeScheduleModal() {
  document.getElementById('scheduleModalOverlay')?.classList.add('hidden');
}

function addChecklistInputRow(text = '', isDone = false) {
  const container = document.getElementById('formChecklistContainer');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'checklist-input-row';
  row.innerHTML = `
    <input type="checkbox" class="agenda-checkbox" ${isDone ? 'checked' : ''}>
    <input type="text" class="form-control checklist-text-input" placeholder="Sub-task name..." value="${escapeHtml(text)}">
    <button type="button" class="btn-icon btn-remove-check" title="Remove sub-task">✕</button>
  `;

  row.querySelector('.btn-remove-check').addEventListener('click', () => {
    playUiSound('click');
    row.remove();
  });

  container.appendChild(row);
}

async function handleScheduleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('formTitle').value.trim();
  const date = document.getElementById('formDate').value;
  if (!title || !date) {
    showToast('Please provide a schedule title and date.', 'warning');
    return;
  }

  const selectedPill = document.querySelector('#formCategoryPillSelector .category-pill-btn.selected');
  const category = selectedPill ? selectedPill.dataset.category : 'work';

  const checklist = [];
  document.querySelectorAll('#formChecklistContainer .checklist-input-row').forEach(row => {
    const txt = row.querySelector('.checklist-text-input').value.trim();
    const done = row.querySelector('.agenda-checkbox').checked;
    if (txt) checklist.push({ text: txt, done });
  });

  const isHolidayCat = category === 'holiday';
  const scheduleData = {
    id: currentEditingId || `sch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title,
    category,
    date,
    startTime: document.getElementById('formStartTime').value || '09:00',
    endTime: document.getElementById('formEndTime').value || '10:00',
    priority: isHolidayCat ? 'none' : (document.getElementById('formPriority').value || 'medium'),
    isHoliday: isHolidayCat,
    status: document.getElementById('formStatus').value || 'scheduled',
    location: document.getElementById('formLocation').value.trim(),
    description: document.getElementById('formDescription').value.trim(),
    checklist
  };

  if (currentEditingId) {
    const idx = state.schedules.findIndex(s => s.id === currentEditingId);
    if (idx !== -1) state.schedules[idx] = scheduleData;
    showToast('Schedule updated successfully!', 'success');
  } else {
    state.schedules.push(scheduleData);
    showToast('New schedule added successfully!', 'success');
  }

  playUiSound('complete');
  await persistSchedule(scheduleData);
  closeScheduleModal();
  renderApp();
}

async function confirmDeleteSchedule(id) {
  if (state.currentGroup && !isCurrentGroupAdmin()) {
    playUiSound('error');
    showToast('⚠️ Akses Dibatasi: Hanya Admin Grup yang dapat menghapus jadwal grup.', 'warning');
    return;
  }

  const item = state.schedules.find(s => s.id === id);
  if (!item) return;

  if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
    playUiSound('delete');
    state.schedules = state.schedules.filter(s => s.id !== id);
    await removeSchedule(id);
    closeScheduleModal();
    closePreviewModal();
    renderApp();
    showToast('Schedule deleted successfully.', 'info');
  }
}

let activePreviewItem = null;

function openPreviewModal(item) {
  activePreviewItem = item;
  const modal = document.getElementById('previewModalOverlay');
  const badgesRow = document.getElementById('previewBadgesRow');
  const body = document.getElementById('previewModalBody');
  const toggleBtn = document.getElementById('btnTogglePreviewStatus');
  const editBtn = document.getElementById('btnEditFromPreview');
  if (!modal || !badgesRow || !body) return;

  const isHoliday = item.category === 'holiday' || item.isHoliday || item.priority === 'none';

  if (isHoliday) {
    badgesRow.innerHTML = `
      <span class="kanban-cat-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 800;">
        🇮🇩 Public Holiday
      </span>
      <span class="kanban-cat-badge" style="background: var(--border-subtle); color: var(--text-main);">
        Official National Holiday
      </span>
    `;

    body.innerHTML = `
      <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; line-height: 1.35; color: #ef4444;">
        🇮🇩 ${escapeHtml(item.title)}
      </h3>
      <div style="font-size: 0.84rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
        <div>📅 Date: <strong>${item.date}</strong></div>
        <div>🏷️ Category: <strong style="color: #ef4444;">National Public Holiday</strong></div>
        <div>⚡ Priority: <em>Excluded from task priorities (Public Holiday)</em></div>
      </div>
      ${item.description ? `
        <div style="margin-top: 12px; background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.2); padding: 12px; border-radius: 8px; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.45;">
          ${escapeHtml(item.description)}
        </div>
      ` : ''}
    `;

    if (toggleBtn) toggleBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    modal.classList.remove('hidden');
    return;
  }

  // Regular task item
  const isGrpAdmin = !state.currentGroup || isCurrentGroupAdmin();
  if (toggleBtn) toggleBtn.style.display = isGrpAdmin ? '' : 'none';
  if (editBtn) editBtn.style.display = isGrpAdmin ? '' : 'none';

  const cat = getCategory(item.category);
  const pri = getPriority(item.priority);
  const stat = getStatus(item.status);

  badgesRow.innerHTML = `
    <span class="kanban-cat-badge" style="background-color: ${cat.bgColor}; color: ${cat.color};">
      ${cat.icon} ${cat.name}
    </span>
    <span class="kanban-cat-badge" style="background-color: var(--border-subtle); color: ${pri.color};">
      ${pri.icon} ${pri.label}
    </span>
    <span class="kanban-cat-badge" style="background-color: var(--border-subtle); color: var(--text-main);">
      ${stat.icon} ${stat.label}
    </span>
    ${state.currentGroup && !isGrpAdmin ? `
      <span class="kanban-cat-badge" style="background: rgba(148, 163, 184, 0.15); color: var(--text-secondary); border: 1px solid var(--border-subtle);">
        👁️ Mode Baca Sahaja
      </span>
    ` : ''}
  `;

  let checklistHtml = '';
  if (item.checklist && item.checklist.length > 0) {
    checklistHtml = `
      <div style="margin-top: 12px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Checklist:</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${item.checklist.map(c => `
            <div style="font-size: 0.82rem; display: flex; align-items: center; gap: 8px; ${c.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
              <span>${c.done ? '✅' : '⬜'}</span>
              <span>${escapeHtml(c.text)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; line-height: 1.35;">${escapeHtml(item.title)}</h3>
    <div style="font-size: 0.84rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
      <div>📅 Date: <strong>${item.date}</strong></div>
      <div>⏰ Time: <strong>${item.startTime || 'All day'} - ${item.endTime || 'End'}</strong></div>
      ${item.location ? `<div>📍 Location: <strong>${escapeHtml(item.location)}</strong></div>` : ''}
    </div>
    ${item.description ? `
      <div style="margin-top: 12px; background: var(--bg-input); padding: 12px; border-radius: 8px; font-size: 0.84rem; color: var(--text-secondary);">
        ${escapeHtml(item.description)}
      </div>
    ` : ''}
    ${checklistHtml}
  `;

  if (toggleBtn) {
    toggleBtn.textContent = item.status === 'completed' ? 'Mark as Incomplete' : 'Mark as Completed';
  }
  modal.classList.remove('hidden');
}

function closePreviewModal() {
  document.getElementById('previewModalOverlay')?.classList.add('hidden');
  activePreviewItem = null;
}

async function toggleScheduleComplete(id) {
  if (state.currentGroup && !isCurrentGroupAdmin()) {
    playUiSound('error');
    showToast('⚠️ Akses Dibatasi: Hanya Admin Grup yang dapat mengubah status jadwal bersama.', 'warning');
    return;
  }

  const item = state.schedules.find(s => s.id === id);
  if (!item) return;

  if (item.status === 'completed') {
    item.status = 'scheduled';
    playUiSound('click');
    showToast(`'${item.title}' marked as active.`, 'info');
  } else {
    item.status = 'completed';
    playUiSound('complete');
    triggerConfetti();
    showToast(`'${item.title}' completed! 🎉`, 'success');
  }

  await persistSchedule(item);
  renderApp();
  if (activePreviewItem && activePreviewItem.id === id) {
    openPreviewModal(item);
  }
}

// ==============================================================================
// 17. SUPABASE AUTH MODAL & PROFILE LOGIC
// ==============================================================================
let activeAuthMode = 'login'; // 'login' | 'register'

function openAuthOrProfile() {
  if (state.currentUser) {
    openProfileModal();
  } else {
    openAuthModal('login');
  }
}

let pendingVerification = {
  email: '',
  password: '',
  displayName: '',
  timerInterval: null,
  countdownSeconds: 60
};

function openAuthModal(mode = 'login') {
  activeAuthMode = mode;
  const modal = document.getElementById('authModalOverlay');
  const title = document.getElementById('authModalTitle');
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabReg = document.getElementById('tabBtnRegister');
  const groupName = document.getElementById('groupDisplayName');
  const submitText = document.getElementById('authSubmitText');
  const alertBox = document.getElementById('authAlertBox');

  if (!modal) return;
  playUiSound('pop');

  // Reset to credentials view
  document.getElementById('authCredentialsView')?.classList.remove('hidden');
  document.getElementById('authVerifyOtpView')?.classList.add('hidden');
  stopOtpResendCountdown();

  alertBox?.classList.add('hidden');
  document.getElementById('otpAlertBox')?.classList.add('hidden');
  document.getElementById('authForm')?.reset();

  if (mode === 'login') {
    title.textContent = 'Sign In to Your Account';
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    groupName.classList.add('hidden');
    submitText.textContent = 'Sign In Now';
  } else {
    title.textContent = 'Create New Account';
    tabLogin.classList.remove('active');
    tabReg.classList.add('active');
    groupName.classList.remove('hidden');
    submitText.textContent = 'Create Account';
  }

  const emailField = document.getElementById('authEmail');
  if (emailField) {
    if (mode === 'login') {
      emailField.value = localStorage.getItem('plancalender_last_email') || '';
    } else {
      emailField.value = '';
    }
  }

  modal.classList.remove('hidden');
  document.getElementById('authEmail')?.focus();
}

function closeAuthModal() {
  document.getElementById('authModalOverlay')?.classList.add('hidden');
  stopOtpResendCountdown();
}

function showVerifyOtpView(email, password = '', displayName = '') {
  pendingVerification.email = email;
  pendingVerification.password = password;
  pendingVerification.displayName = displayName;

  const credentialsView = document.getElementById('authCredentialsView');
  const otpView = document.getElementById('authVerifyOtpView');
  const modalTitle = document.getElementById('authModalTitle');
  const targetEmailEl = document.getElementById('verifyTargetEmail');

  credentialsView?.classList.add('hidden');
  otpView?.classList.remove('hidden');

  if (modalTitle) modalTitle.textContent = 'Verifikasi Email Akun';
  if (targetEmailEl) targetEmailEl.textContent = email;

  // Clear inputs
  const inputs = document.querySelectorAll('#otpBoxesRow .otp-box-digit');
  inputs.forEach(input => {
    input.value = '';
    input.classList.remove('has-value', 'digit-error');
  });

  // Focus first input
  setTimeout(() => {
    const firstInput = document.querySelector('#otpBoxesRow .otp-box-digit[data-idx="0"]');
    firstInput?.focus();
  }, 100);

  // Show friendly notification
  showOtpAlert('Kode verifikasi 6-digit telah dikirimkan ke Gmail Anda. Cek Inbox atau folder Spam.', 'info');

  // Start 1 minute (60s) countdown
  startOtpResendCountdown(60);
  playUiSound('pop');
}

function startOtpResendCountdown(seconds = 60) {
  stopOtpResendCountdown();
  pendingVerification.countdownSeconds = seconds;

  const btnResend = document.getElementById('btnResendOtp');
  const label = document.getElementById('resendTimerLabel');
  const hint = document.getElementById('resendTimerHint');
  const icon = document.getElementById('resendIcon');

  if (!btnResend || !label) return;

  btnResend.disabled = true;
  btnResend.classList.remove('btn-resend-active');
  if (icon) icon.textContent = '⏳';
  label.textContent = `Kirim Ulang Kode (${pendingVerification.countdownSeconds}s)`;
  if (hint) hint.textContent = 'Tombol kirim ulang aktif dalam 60 detik jika kode belum sampai.';

  pendingVerification.timerInterval = setInterval(() => {
    pendingVerification.countdownSeconds--;
    if (pendingVerification.countdownSeconds > 0) {
      label.textContent = `Kirim Ulang Kode (${pendingVerification.countdownSeconds}s)`;
    } else {
      stopOtpResendCountdown();
      btnResend.disabled = false;
      btnResend.classList.add('btn-resend-active');
      if (icon) icon.textContent = '🔄';
      label.textContent = 'Kirim Ulang Kode Sekarang';
      if (hint) hint.textContent = 'Belum terima kode di Gmail? Klik tombol di atas untuk minta kode baru.';
      playUiSound('pop');
    }
  }, 1000);
}

function stopOtpResendCountdown() {
  if (pendingVerification.timerInterval) {
    clearInterval(pendingVerification.timerInterval);
    pendingVerification.timerInterval = null;
  }
}

async function handleResendOtpClick() {
  const btnResend = document.getElementById('btnResendOtp');
  const label = document.getElementById('resendTimerLabel');
  if (!btnResend || btnResend.disabled) return;

  if (!pendingVerification.email) {
    showOtpAlert('Email verifikasi tidak ditemukan. Silakan isi form pendaftaran lagi.', 'error');
    return;
  }

  try {
    btnResend.disabled = true;
    if (label) label.textContent = 'Mengirim kode baru... ⏳';

    await resendVerificationOtp(pendingVerification.email, 'signup');
    showToast(`Kode baru berhasil dikirim ke ${pendingVerification.email}!`, 'success');
    showOtpAlert('Kode verifikasi baru telah dikirim ke email Gmail Anda. Silakan cek Inbox atau folder Spam.', 'success');
    playUiSound('chime');

    // Reset countdown to 60s
    startOtpResendCountdown(60);

    // Clear boxes & refocus
    const inputs = document.querySelectorAll('#otpBoxesRow .otp-box-digit');
    inputs.forEach(input => { input.value = ''; input.classList.remove('has-value'); });
    const firstInput = document.querySelector('#otpBoxesRow .otp-box-digit[data-idx="0"]');
    firstInput?.focus();
  } catch (err) {
    showOtpAlert(err.message || 'Gagal mengirim ulang kode verifikasi.', 'error');
    btnResend.disabled = false;
    if (label) label.textContent = 'Kirim Ulang Kode Sekarang';
  }
}

function getEnteredOtpCode() {
  const inputs = document.querySelectorAll('#otpBoxesRow .otp-box-digit');
  let code = '';
  inputs.forEach(input => {
    code += (input.value || '').trim();
  });
  return code;
}

async function handleVerifyOtpSubmit() {
  const token = getEnteredOtpCode();
  const submitBtn = document.getElementById('btnSubmitOtp');
  const submitText = document.getElementById('btnSubmitOtpText');

  if (token.length < 6) {
    showOtpAlert('Harap masukkan lengkap 6-digit kode verifikasi.', 'error');
    playUiSound('error');
    const firstEmpty = Array.from(document.querySelectorAll('#otpBoxesRow .otp-box-digit')).find(i => !i.value);
    firstEmpty?.focus();
    return;
  }

  if (!pendingVerification.email) {
    showOtpAlert('Email tidak ditemukan. Silakan daftar kembali.', 'error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (submitText) submitText.textContent = 'Memverifikasi Kode... ⏳';

  try {
    const data = await verifyEmailOtp(pendingVerification.email, token);
    
    // Session may be returned or null
    let authenticatedUser = data?.user || data?.session?.user;

    // If session wasn't automatically opened, try loginWithEmail with the pending password
    if (!authenticatedUser && pendingVerification.password) {
      try {
        const loginRes = await loginWithEmail(pendingVerification.email, pendingVerification.password);
        authenticatedUser = loginRes.user;
      } catch (loginErr) {
        console.warn('Auto-login post OTP note:', loginErr);
      }
    }

    if (authenticatedUser) {
      localStorage.setItem('plancalender_last_email', (authenticatedUser.email || pendingVerification.email).trim());
      state.currentUser = authenticatedUser;
      updateUserUI();
      closeAuthModal();
      playUiSound('chime');
      triggerConfetti();
      showToast(`Email terverifikasi! Selamat datang, ${authenticatedUser.email}!`, 'success');
      await loadUserData(authenticatedUser.id);
    } else {
      localStorage.setItem('plancalender_last_email', pendingVerification.email.trim());
      showToast('Email terverifikasi! Silakan Sign In sekarang.', 'success');
      openAuthModal('login');
      showAuthAlert('Verifikasi berhasil! Silakan masuk dengan kata sandi Anda.', 'success');
    }
  } catch (err) {
    playUiSound('error');
    showOtpAlert(err.message || 'Kode verifikasi tidak cocok atau telah kedaluwarsa. Silakan periksa kembali atau kirim ulang.', 'error');
    const row = document.getElementById('otpBoxesRow');
    row?.classList.add('otp-boxes-error');
    setTimeout(() => row?.classList.remove('otp-boxes-error'), 800);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Verifikasi & Aktifkan Akun';
  }
}

function showOtpAlert(message, type = 'error') {
  const box = document.getElementById('otpAlertBox');
  if (!box) return;
  box.className = `auth-alert-box auth-alert-${type}`;
  box.textContent = message;
  box.classList.remove('hidden');
}

function setupOtpInputs() {
  const inputs = document.querySelectorAll('#otpBoxesRow .otp-box-digit');
  if (!inputs.length) return;

  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      if (val) {
        e.target.value = val.slice(-1);
        e.target.classList.add('has-value');
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
          inputs[index + 1].select();
        } else {
          if (getEnteredOtpCode().length === 6) {
            handleVerifyOtpSubmit();
          }
        }
      } else {
        e.target.value = '';
        e.target.classList.remove('has-value');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!e.target.value && index > 0) {
          inputs[index - 1].focus();
          inputs[index - 1].value = '';
          inputs[index - 1].classList.remove('has-value');
        } else {
          e.target.value = '';
          e.target.classList.remove('has-value');
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputs[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
        inputs[index + 1].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleVerifyOtpSubmit();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      const digits = pasteData.replace(/\D/g, '').slice(0, 6);
      if (!digits) return;

      digits.split('').forEach((digit, i) => {
        if (inputs[i]) {
          inputs[i].value = digit;
          inputs[i].classList.add('has-value');
        }
      });

      const nextIdx = Math.min(digits.length, inputs.length - 1);
      inputs[nextIdx]?.focus();

      if (digits.length === 6) {
        handleVerifyOtpSubmit();
      }
    });
  });
}

let emailTemplateCache = null;

async function openEmailTemplateGuideModal() {
  const modal = document.getElementById('emailTemplateModalOverlay');
  const viewer = document.getElementById('emailTemplateCodeViewer');
  if (!modal) return;
  playUiSound('pop');
  modal.classList.remove('hidden');

  if (viewer) {
    if (emailTemplateCache) {
      viewer.value = emailTemplateCache;
    } else {
      viewer.value = 'Memuat template HTML... ⏳';
      try {
        const res = await fetch('./supabase-email-template.html');
        if (res.ok) {
          emailTemplateCache = await res.text();
          viewer.value = emailTemplateCache;
        } else {
          viewer.value = '<!-- Buka file supabase-email-template.html di root project untuk menyalin template -->';
        }
      } catch {
        viewer.value = '<!-- Buka file supabase-email-template.html di root project untuk menyalin template -->';
      }
    }
  }
}

function closeEmailTemplateGuideModal() {
  document.getElementById('emailTemplateModalOverlay')?.classList.add('hidden');
}

function copyEmailTemplateCode() {
  const viewer = document.getElementById('emailTemplateCodeViewer');
  const btnText = document.getElementById('copyTplBtnText');
  const code = viewer?.value || emailTemplateCache || '';

  if (!code) return;

  navigator.clipboard.writeText(code).then(() => {
    playUiSound('chime');
    showToast('Template email Gmail berhasil disalin!', 'success');
    if (btnText) btnText.textContent = '✅ Berhasil Disalin!';
    setTimeout(() => {
      if (btnText) btnText.textContent = '📋 Salin Seluruh HTML';
    }, 2500);
  }).catch(() => {
    viewer?.select();
    document.execCommand('copy');
    showToast('Template email disalin!', 'success');
  });
}

function openProfileModal() {
  const modal = document.getElementById('userProfileModalOverlay');
  if (!modal) return;
  updateUserUI();
  playUiSound('pop');
  modal.classList.remove('hidden');
}

function closeProfileModal() {
  document.getElementById('userProfileModalOverlay')?.classList.add('hidden');
}

async function handleAuthFormSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail')?.value.trim();
  const password = document.getElementById('authPassword')?.value;
  const displayName = document.getElementById('authDisplayName')?.value.trim();
  const alertBox = document.getElementById('authAlertBox');
  const submitBtn = document.getElementById('btnAuthSubmit');
  const submitText = document.getElementById('authSubmitText');

  if (!email || !password) {
    showAuthAlert('Email and password are required.', 'error');
    return;
  }

  if (password.length < 6) {
    showAuthAlert('Password must be at least 6 characters.', 'error');
    return;
  }

  if (!isSupabaseConfigured()) {
    showAuthAlert('Supabase credentials not configured. Click "Configure Supabase" below.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitText.textContent = 'Processing... ⏳';

  try {
    if (activeAuthMode === 'login') {
      const data = await loginWithEmail(email, password);
      state.currentUser = data.user;

      if (isUserAdmin(data.user)) {
        state.isAdmin = true;
        localStorage.setItem('plancraft_active_account', 'admin');
        localStorage.removeItem('plancraft_logged_out');
        try {
          const client = getSupabase();
          client?.auth?.updateUser({
            data: {
              role: 'admin',
              is_admin: true,
              display_name: 'jovan matthew adderson'
            }
          }).catch(() => {});
        } catch {}
      }

      updateUserUI();
      closeAuthModal();
      playUiSound('chime');
      triggerConfetti();
      showToast(`Welcome back, ${data.user.email}!`, 'success');
      localStorage.setItem('plancalender_last_email', email.trim());
      await loadUserData(data.user.id);
    } else {
      const data = await registerWithEmail(email, password, displayName);
      if (data.session) {
        state.currentUser = data.user;
        updateUserUI();
        closeAuthModal();
        playUiSound('chime');
        triggerConfetti();
        showToast('Account successfully created and connected!', 'success');
        localStorage.setItem('plancalender_last_email', email.trim());
        await loadUserData(data.user.id);
      } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        // Supabase returns identities: [] when email is already registered
        showAuthAlert('Email ini sudah terdaftar sebelumnya! Silakan masuk di tab Sign In.', 'warning');
        openAuthModal('login');
      } else {
        // Supabase sends 6-digit verification code to email (Gmail)
        showVerifyOtpView(email, password, displayName);
      }
    }
  } catch (err) {
    showAuthAlert(err.message || 'An error occurred during authentication.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = activeAuthMode === 'login' ? 'Sign In Now' : 'Create Account';
  }
}

function showAuthAlert(message, type = 'error') {
  const box = document.getElementById('authAlertBox');
  if (!box) return;
  box.className = `auth-alert-box auth-alert-${type}`;
  box.textContent = message;
  box.classList.remove('hidden');
}

async function handleLogout() {
  if (confirm('Are you sure you want to sign out?')) {
    playUiSound('click');
    await logoutUser();
    state.currentUser = null;
    updateUserUI();
    closeProfileModal();
    loadLocalSchedules('guest');
    showToast('You have been signed out.', 'info');
    openAuthModal('login');
  }
}

// ==============================================================================
// 18. SUPABASE CONFIGURATION MODAL
// ==============================================================================
function openSupabaseConfigModal() {
  const modal = document.getElementById('supabaseConfigModalOverlay');
  const urlInput = document.getElementById('cfgSupabaseUrl');
  const keyInput = document.getElementById('cfgSupabaseAnonKey');
  if (!modal) return;

  const { url, key } = getSupabaseCredentials();
  if (urlInput) urlInput.value = url;
  if (keyInput) keyInput.value = key;

  playUiSound('pop');
  modal.classList.remove('hidden');
}

function closeSupabaseConfigModal() {
  document.getElementById('supabaseConfigModalOverlay')?.classList.add('hidden');
}

async function handleSaveSupabaseConfig() {
  const url = document.getElementById('cfgSupabaseUrl')?.value.trim();
  const key = document.getElementById('cfgSupabaseAnonKey')?.value.trim();

  if (!url || !key) {
    showToast('Project URL and Anon Key are required.', 'warning');
    return;
  }

  saveSupabaseCredentials(url, key);
  closeSupabaseConfigModal();
  showToast('Supabase credentials saved! Testing connection...', 'info');

  await initSupabaseSession();

  if (isSupabaseConfigured()) {
    playUiSound('chime');
    showToast('🟢 Successfully connected to Supabase! Please sign in to your account.', 'success');
    if (!state.currentUser) {
      openAuthModal('login');
    }
  }
}

// ==============================================================================
// 19. ADMINISTRATOR CONTROL CENTER (SUPER ADMIN)
// ==============================================================================
async function openAdminModal() {
  const modal = document.getElementById('adminControlModalOverlay');
  if (!modal) return;

  const user = state.currentUser;
  const isAdm = isUserAdmin(user);
  if (!isAdm) {
    showToast('⚠️ Access Denied: Administrator account required to access this panel.', 'error');
    return;
  }

  // Populate User Meta
  const nameEl = document.getElementById('adminModalName');
  const emailEl = document.getElementById('adminModalEmail');
  const uidEl = document.getElementById('adminModalUid');
  const avatarEl = document.getElementById('adminModalAvatar');
  const toggleView = document.getElementById('toggleAdminGlobalView');

  let displayName = user?.user_metadata?.display_name || 'Jovan Matthew Adderson';
  if (user?.email === 'matthewajovan@gmail.com' && (!user.user_metadata?.display_name || user.user_metadata.display_name === 'matthewajovan')) {
    displayName = 'Jovan Matthew Adderson';
  }
  const email = user?.email || 'matthewajovan@gmail.com';
  const uid = user?.id || 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa';

  if (nameEl) nameEl.textContent = displayName;
  if (emailEl) emailEl.textContent = email;
  if (uidEl) uidEl.textContent = uid;
  if (avatarEl) avatarEl.textContent = '👑';
  if (toggleView) toggleView.checked = state.adminModeAllSchedules;

  playUiSound('pop');
  modal.classList.remove('hidden');

  // Load Realtime Cloud Stats
  await refreshAdminStats();
}

function closeAdminModal() {
  document.getElementById('adminControlModalOverlay')?.classList.add('hidden');
}

async function refreshAdminStats() {
  const statSched = document.getElementById('adminStatSchedules');
  const statNotes = document.getElementById('adminStatNotes');
  const statUsers = document.getElementById('adminStatUsers');
  const statPing = document.getElementById('adminStatPing');

  if (statSched) statSched.textContent = '...';
  if (statNotes) statNotes.textContent = '...';
  if (statUsers) statUsers.textContent = '...';
  if (statPing) statPing.textContent = 'Measuring...';

  const startTime = performance.now();
  try {
    const stats = await fetchAdminDatabaseStats();
    const duration = Math.round(performance.now() - startTime);

    if (statSched) statSched.textContent = stats.totalSchedules;
    if (statNotes) statNotes.textContent = stats.totalNotes;
    if (statUsers) statUsers.textContent = stats.distinctUsers;
    if (statPing) statPing.textContent = `${duration} ms (Online)`;
  } catch (err) {
    console.warn('Failed to load admin stats:', err);
    if (statPing) statPing.textContent = 'Error';
  }
}

async function toggleAdminGlobalMode() {
  state.adminModeAllSchedules = !state.adminModeAllSchedules;
  const toggle = document.getElementById('toggleAdminGlobalView');
  if (toggle) toggle.checked = state.adminModeAllSchedules;

  playUiSound('pop');
  if (state.adminModeAllSchedules) {
    showToast('👑 Overseer Mode Enabled: Displaying all schedules from the cloud.', 'success');
  } else {
    showToast('👤 Private Mode: Displaying only your personal schedules.', 'info');
  }

  if (state.currentUser) {
    await loadUserData(state.currentUser.id);
  }
}

async function exportAdminMasterBackup() {
  try {
    showToast('Preparing cloud database master backup...', 'info');
    const allSchedules = await fetchAllSchedulesAdmin();
    const stats = await fetchAdminDatabaseStats();

    const masterData = {
      app: 'PlanCalender PRO',
      exportType: 'ADMIN_MASTER_BACKUP',
      exportedAt: new Date().toISOString(),
      adminAccount: {
        email: state.currentUser?.email || 'matthewajovan@gmail.com',
        uid: state.currentUser?.id || 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa'
      },
      stats,
      schedules: allSchedules
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(masterData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `plancalender-master-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    playUiSound('complete');
    triggerConfetti();
    showToast(`Master backup downloaded successfully (${allSchedules.length} cloud schedules)!`, 'success');
  } catch (err) {
    console.error('Failed to export master backup:', err);
    showToast('Failed to download master backup: ' + err.message, 'error');
  }
}

function copyAdminSqlToClipboard() {
  const sql = `-- ==============================================================================
-- ADMIN ROLE ACTIVATION: JOVAN MATTHEW ADDERSON
-- ==============================================================================
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb
WHERE id = 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa'
   OR email = 'matthewajovan@gmail.com';`;

  navigator.clipboard.writeText(sql).then(() => {
    playUiSound('pop');
    showToast('📋 Admin activation SQL query copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy query. Please copy directly from supabase-schema.sql', 'warning');
  });
}

function showAdminBroadcastPrompt() {
  const msg = prompt('Enter system announcement message to broadcast to users:');
  if (msg && msg.trim()) {
    showToast(`📢 ADMIN ANNOUNCEMENT: ${msg.trim()}`, 'info');
    playUiSound('chime');
  }
}

// ==============================================================================
// 20. GROUP SCHEDULES, INVITE SYSTEM & ROLE-BASED ADMIN ENGINE
// ==============================================================================

let selectedGroupEmoji = '🚀';
let selectedGroupColor = '#6366f1';

/** Memuat daftar grup pengguna */
async function loadGroups() {
  try {
    const uid = state.currentUser ? state.currentUser.id : 'guest';
    state.groups = await fetchUserGroups(uid);
    renderGroupSwitcher();
    renderGroupBanner();
  } catch (err) {
    console.warn('Gagal memuat grup:', err);
  }
}

/** Beralih antara Jadwal Pribadi dan Jadwal Grup */
async function switchGroup(groupOrNull) {
  state.currentGroup = groupOrNull;

  if (!groupOrNull) {
    // Mode Jadwal Pribadi
    const uid = state.currentUser ? state.currentUser.id : 'guest';
    if (state.currentUser && isSupabaseConfigured()) {
      await loadUserData(uid);
    } else {
      loadLocalSchedules(uid);
    }
    showToast('Beralih ke Jadwal Pribadi 👤', 'info');
  } else {
    // Mode Jadwal Grup
    playUiSound('chime');
    state.schedules = await fetchGroupSchedulesFromCloud(groupOrNull.id);
    state.currentGroupMembers = await fetchGroupMembersFromCloud(groupOrNull.id);

    // Refresh role user saat ini
    const myId = state.currentUser ? state.currentUser.id : 'guest';
    const myEmail = state.currentUser ? state.currentUser.email : '';
    const myMem = state.currentGroupMembers.find(m => m.userId === myId || (myEmail && m.userEmail === myEmail));
    if (myMem) {
      state.currentGroup.role = myMem.role;
    }

    const roleName = isCurrentGroupAdmin() ? '👑 Admin Grup' : '👁️ Anggota (Lihat Saja)';
    showToast(`Beralih ke grup "${groupOrNull.name}" (${roleName})`, 'success');
  }

  renderApp();
}

/** Merender daftar switch grup di sidebar dengan Dropdown Kode Undangan */
function renderGroupSwitcher() {
  const container = document.getElementById('groupSwitcherList');
  if (!container) return;

  container.innerHTML = '';

  // 1. Tab Jadwal Pribadi
  const isPersonalActive = !state.currentGroup;
  const personalBtn = document.createElement('button');
  personalBtn.type = 'button';
  personalBtn.className = `group-nav-item ${isPersonalActive ? 'active' : ''}`;
  personalBtn.title = 'Buka Jadwal Pribadi';
  personalBtn.innerHTML = `
    <span class="group-nav-icon">👤</span>
    <div class="group-nav-info">
      <span class="group-nav-name">Jadwal Pribadi</span>
      <span class="group-nav-role-badge role-admin">Pribadi</span>
    </div>
  `;
  personalBtn.addEventListener('click', () => {
    playUiSound('click');
    state.openGroupDropdownId = null;
    if (!isPersonalActive) switchGroup(null);
    else renderGroupSwitcher();
  });
  container.appendChild(personalBtn);

  // 2. Tab untuk Setiap Grup dengan Dropdown Kode Undangan
  if (state.groups && state.groups.length > 0) {
    state.groups.forEach(g => {
      const isGroupActive = state.currentGroup && state.currentGroup.id === g.id;
      const isDropdownOpen = isGroupActive && (state.openGroupDropdownId === g.id);

      const wrapper = document.createElement('div');
      wrapper.className = 'group-nav-wrapper';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `group-nav-item ${isGroupActive ? 'active' : ''}`;
      btn.title = `Klik untuk buka jadwal grup ${escapeHtml(g.name)} dan lihat kode undangan`;

      const isAdmin = (g.role === 'admin' || g.role === 'owner' || state.isAdmin);
      const roleBadgeHtml = isAdmin
        ? '<span class="group-nav-role-badge role-admin">👑 Admin</span>'
        : '<span class="group-nav-role-badge role-member">👁️ Anggota</span>';

      btn.innerHTML = `
        <span class="group-nav-icon">${g.icon || '👥'}</span>
        <div class="group-nav-info">
          <span class="group-nav-name">${escapeHtml(g.name)}</span>
          ${roleBadgeHtml}
        </div>
        <div class="group-nav-arrow ${isDropdownOpen ? 'open' : ''}" title="Klik grup untuk toggle dropdown kode">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      `;

      btn.addEventListener('click', () => {
        playUiSound('click');
        if (!isGroupActive) {
          // Beralih ke grup ini dan buka dropdown kodenya
          state.openGroupDropdownId = g.id;
          switchGroup(g);
        } else {
          // Jika sudah di grup ini, toggle dropdown kode (buka/tutup)
          state.openGroupDropdownId = (state.openGroupDropdownId === g.id) ? null : g.id;
          renderGroupSwitcher();
        }
      });

      wrapper.appendChild(btn);

      // Panel Dropdown Kode Undangan Grup (Hanya Tampil Saat Pencet Grup)
      const dropdownPanel = document.createElement('div');
      dropdownPanel.className = `group-code-dropdown-panel ${isDropdownOpen ? 'open' : ''}`;
      dropdownPanel.innerHTML = `
        <div class="sidebar-code-header">
          <div class="sidebar-code-title-wrap">
            <span class="sidebar-code-icon">🔑</span>
            <span class="sidebar-code-label">KODE GABUNG GRUP</span>
          </div>
          <span class="sidebar-code-group-badge">${g.icon || '👥'} ${escapeHtml(g.name)}</span>
        </div>
        <div class="sidebar-code-body">
          <div class="sidebar-code-val-wrap" title="Klik untuk salin kode">
            <span class="sidebar-code-val">${escapeHtml(g.inviteCode || '---')}</span>
          </div>
          <button type="button" class="sidebar-code-copy-btn" title="Salin Kode Undangan">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-label-text">Salin</span>
          </button>
        </div>
        <div class="sidebar-code-sub">
          <span class="sidebar-code-hint">Bagikan kode ini agar rekan bisa bergabung</span>
        </div>
      `;

      // Event listener salin kode di dalam dropdown
      const doCopy = (e) => {
        e.stopPropagation();
        const code = g.inviteCode;
        if (!code) return;
        playUiSound('pop');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
        const copyBtn = dropdownPanel.querySelector('.sidebar-code-copy-btn');
        const copyLabel = dropdownPanel.querySelector('.copy-label-text');
        if (copyBtn && copyLabel) {
          copyLabel.textContent = 'Tersalin!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyLabel.textContent = 'Salin';
            copyBtn.classList.remove('copied');
          }, 2000);
        }
        showToast(`🔑 Kode Undangan "${code}" berhasil disalin! Bagikan ke rekan Anda.`, 'success');
      };

      dropdownPanel.querySelector('.sidebar-code-val-wrap')?.addEventListener('click', doCopy);
      dropdownPanel.querySelector('.sidebar-code-copy-btn')?.addEventListener('click', doCopy);
      dropdownPanel.addEventListener('click', (e) => e.stopPropagation());

      wrapper.appendChild(dropdownPanel);
      container.appendChild(wrapper);
    });
  } else {
    // Empty state jika belum ada grup
    const hint = document.createElement('div');
    hint.className = 'groups-empty-hint';
    hint.innerHTML = `
      <span class="empty-hint-icon">💡</span>
      <span>Belum ada grup tim. Buat grup baru atau gabung dengan kode undangan di bawah.</span>
    `;
    container.appendChild(hint);
  }
}


/** Merender Banner Grup Aktif di atas kalender */
function renderGroupBanner() {
  const banner = document.getElementById('groupActiveBanner');
  if (!banner) return;

  if (!state.currentGroup) {
    banner.classList.add('hidden');
    const newBtn = document.getElementById('btnOpenNewSchedule');
    const headerAddBtn = document.getElementById('btnHeaderAdd');
    if (newBtn) {
      newBtn.title = 'Create New Schedule (Press N)';
      newBtn.style.opacity = '1';
    }
    if (headerAddBtn) {
      headerAddBtn.title = 'Create New Schedule (Press N)';
      headerAddBtn.style.opacity = '1';
    }
    return;
  }

  banner.classList.remove('hidden');

  const g = state.currentGroup;
  const isAdmin = isCurrentGroupAdmin();

  const iconEl = document.getElementById('groupBannerIcon');
  const titleEl = document.getElementById('groupBannerTitle');
  const codeEl = document.getElementById('groupBannerCodeDisplay');
  const countEl = document.getElementById('groupBannerMembersCount');
  const roleBadge = document.getElementById('groupBannerRoleBadge');
  const noticeEl = document.getElementById('groupReadOnlyNotice');
  const newBtn = document.getElementById('btnOpenNewSchedule');
  const headerAddBtn = document.getElementById('btnHeaderAdd');

  if (iconEl) iconEl.textContent = g.icon || '👥';
  if (titleEl) titleEl.textContent = g.name;
  if (codeEl) codeEl.textContent = g.inviteCode || '---';
  if (countEl) countEl.textContent = `${(state.currentGroupMembers && state.currentGroupMembers.length) || g.membersCount || 1} Anggota`;

  if (roleBadge) {
    if (isAdmin) {
      roleBadge.className = 'group-role-badge badge-admin';
      roleBadge.textContent = '👑 Admin Grup';
      roleBadge.title = 'Anda memiliki hak penuh untuk menambah, mengedit, dan menghapus jadwal grup ini';
    } else {
      roleBadge.className = 'group-role-badge badge-member';
      roleBadge.textContent = '👁️ Mode Anggota (Lihat Saja)';
      roleBadge.title = 'Anda hanya dapat melihat jadwal. Hubungi Admin Grup jika perlu mengubah jadwal.';
    }
  }

  if (noticeEl) {
    if (isAdmin) {
      noticeEl.classList.add('hidden');
    } else {
      noticeEl.classList.remove('hidden');
    }
  }

  if (!isAdmin) {
    if (newBtn) {
      newBtn.title = 'Akses Dibatasi: Hanya Admin yang dapat menambah jadwal grup ini';
      newBtn.style.opacity = '0.7';
    }
    if (headerAddBtn) {
      headerAddBtn.title = 'Akses Dibatasi: Hanya Admin yang dapat menambah jadwal grup ini';
      headerAddBtn.style.opacity = '0.7';
    }
  } else {
    if (newBtn) {
      newBtn.title = 'Create New Group Schedule (Press N)';
      newBtn.style.opacity = '1';
    }
    if (headerAddBtn) {
      headerAddBtn.title = 'Create New Group Schedule (Press N)';
      headerAddBtn.style.opacity = '1';
    }
  }
}

/** Buka Modal Buat Grup Baru */
function openCreateGroupModal() {
  playUiSound('pop');
  const modal = document.getElementById('createGroupModalOverlay');
  const form = document.getElementById('createGroupForm');
  if (!modal) return;

  if (form) form.reset();
  selectedGroupEmoji = '🚀';
  selectedGroupColor = '#6366f1';

  document.querySelectorAll('#groupEmojiSelector .emoji-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.emoji === selectedGroupEmoji);
  });

  document.querySelectorAll('#groupColorSelector .color-circle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === selectedGroupColor);
  });

  modal.classList.remove('hidden');
  document.getElementById('groupFormName')?.focus();
}

function closeCreateGroupModal() {
  document.getElementById('createGroupModalOverlay')?.classList.add('hidden');
}

let latestCreatedGroup = null;

/** Tampilkan Modal Sukses Buat Grup dengan Kode Join Sangat Jelas */
function openGroupCreatedSuccessModal(group) {
  latestCreatedGroup = group;
  playUiSound('complete');

  const modal = document.getElementById('groupCreatedSuccessModalOverlay');
  if (!modal) return;

  const iconEl = document.getElementById('createdSuccessGroupIcon');
  const nameEl = document.getElementById('createdSuccessGroupName');
  const descEl = document.getElementById('createdSuccessGroupDesc');
  const codeEl = document.getElementById('createdSuccessGroupCode');

  if (iconEl) iconEl.textContent = group.icon || '👥';
  if (nameEl) nameEl.textContent = group.name;
  if (descEl) descEl.textContent = group.description || 'Ruang kolaborasi jadwal tim';
  if (codeEl) codeEl.textContent = group.inviteCode;

  // Otomatis salin ke clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(group.inviteCode).catch(() => {});
  }

  modal.classList.remove('hidden');
}

function closeGroupCreatedSuccessModal() {
  document.getElementById('groupCreatedSuccessModalOverlay')?.classList.add('hidden');
}

async function handleCreateGroupSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('groupFormName')?.value.trim();
  const description = document.getElementById('groupFormDesc')?.value.trim();
  // Kode undangan grup otomatis dibuat berupa 6 digit angka acak unik
  const inviteCode = generateGroupInviteCode();

  if (!name) {
    showToast('Nama grup tidak boleh kosong.', 'warning');
    return;
  }

  const groupData = {
    name,
    description,
    icon: selectedGroupEmoji,
    color: selectedGroupColor,
    inviteCode
  };

  try {
    const newGroup = await createGroupInCloud(groupData, state.currentUser);
    latestCreatedGroup = newGroup;
    closeCreateGroupModal();
    playUiSound('complete');
    triggerConfetti();

    await loadGroups();
    await switchGroup(newGroup);

    // Update tampilan kode di sidebar tepat di atas tombol Buat & Gabung Grup
    renderSidebarGroupCode();

    // Buka Modal Sukses dengan Kode Join Sangat Jelas
    openGroupCreatedSuccessModal(newGroup);
  } catch (err) {
    showToast('Gagal membuat grup: ' + err.message, 'error');
  }
}

/** Buka Modal Gabung Grup */
function openJoinGroupModal(prefillCode = '') {
  playUiSound('pop');
  const modal = document.getElementById('joinGroupModalOverlay');
  const input = document.getElementById('joinGroupCodeInput');
  if (!modal) return;

  if (input) {
    input.value = prefillCode;
  }

  modal.classList.remove('hidden');
  input?.focus();
}

function closeJoinGroupModal() {
  document.getElementById('joinGroupModalOverlay')?.classList.add('hidden');
}

async function handleJoinGroupSubmit(e) {
  e.preventDefault();
  const rawCode = document.getElementById('joinGroupCodeInput')?.value.trim();
  if (!rawCode) {
    showToast('Masukkan kode angka grup.', 'warning');
    return;
  }

  // Bersihkan input kode: utamakan angka
  const code = rawCode.replace(/\D/g, '') || rawCode.toUpperCase();

  try {
    const joined = await joinGroupByCodeInCloud(code, state.currentUser);
    closeJoinGroupModal();
    playUiSound('complete');
    triggerConfetti();

    showToast(`🎉 Berhasil bergabung ke "${joined.name}" sebagai Anggota!`, 'success');
    await loadGroups();
    await switchGroup(joined);
  } catch (err) {
    showToast(err.message || 'Gagal bergabung ke grup.', 'error');
  }
}

/** Buka Modal Kelola Grup & Hak Akses */
async function openManageGroupModal() {
  if (!state.currentGroup) {
    showToast('Pilih grup terlebih dahulu untuk mengelolanya.', 'info');
    return;
  }

  playUiSound('pop');
  const modal = document.getElementById('manageGroupModalOverlay');
  if (!modal) return;

  const g = state.currentGroup;
  const isAdmin = isCurrentGroupAdmin();

  const iconHeader = document.getElementById('mgHeaderIcon');
  const titleHeader = document.getElementById('mgHeaderTitle');
  const subHeader = document.getElementById('mgHeaderSubtitle');
  const iconSpot = document.getElementById('mgSpotlightIcon');
  const nameSpot = document.getElementById('mgSpotlightName');
  const descSpot = document.getElementById('mgSpotlightDesc');
  const badgeRole = document.getElementById('mgUserRoleBadge');
  const codeVal = document.getElementById('mgInviteCodeVal');
  const linkInput = document.getElementById('mgInviteLinkInput');
  const deleteBtn = document.getElementById('btnMgDeleteGroup');

  if (iconHeader) iconHeader.textContent = g.icon || '👥';
  if (titleHeader) titleHeader.textContent = `Kelola: ${g.name}`;
  if (subHeader) subHeader.textContent = isAdmin ? 'Akses Administrator • Kelola perizinan anggota & jadwal' : 'Akses Anggota • Melihat daftar anggota grup';
  if (iconSpot) iconSpot.textContent = g.icon || '👥';
  if (nameSpot) nameSpot.textContent = g.name;
  if (descSpot) descSpot.textContent = g.description || 'Tidak ada deskripsi.';
  if (codeVal) codeVal.textContent = g.inviteCode || '---';

  const directLink = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(g.inviteCode || '')}`;
  if (linkInput) linkInput.value = directLink;

  if (badgeRole) {
    if (isAdmin) {
      badgeRole.className = 'group-role-badge badge-admin';
      badgeRole.textContent = '👑 Admin Grup';
    } else {
      badgeRole.className = 'group-role-badge badge-member';
      badgeRole.textContent = '👁️ Anggota (Lihat Saja)';
    }
  }

  if (deleteBtn) {
    deleteBtn.classList.toggle('hidden', !isAdmin);
  }

  state.currentGroupMembers = await fetchGroupMembersFromCloud(g.id);
  renderManageGroupMembersList();

  modal.classList.remove('hidden');
}

function closeManageGroupModal() {
  document.getElementById('manageGroupModalOverlay')?.classList.add('hidden');
}

/** Render Daftar Anggota di Modal Kelola Grup */
function renderManageGroupMembersList() {
  const container = document.getElementById('mgMembersListContainer');
  const countLabel = document.getElementById('mgMembersCountLabel');
  if (!container) return;

  const members = state.currentGroupMembers || [];
  if (countLabel) countLabel.textContent = members.length;

  container.innerHTML = '';

  const isViewerAdmin = isCurrentGroupAdmin();
  const myId = state.currentUser ? state.currentUser.id : 'guest';

  members.forEach(mem => {
    const isThisMemberAdmin = mem.role === 'admin';
    const isSelf = mem.userId === myId;
    const initial = (mem.userName || mem.userEmail || 'A').charAt(0).toUpperCase();

    const row = document.createElement('div');
    row.className = 'group-member-item';

    row.innerHTML = `
      <div class="member-info-group">
        <div class="member-avatar-box">
          ${isThisMemberAdmin ? '👑' : initial}
        </div>
        <div class="member-info-col">
          <div class="member-name-row">
            <span class="member-name-text">${escapeHtml(mem.userName || 'Anggota')} ${isSelf ? '(Anda)' : ''}</span>
            <span class="group-role-badge ${isThisMemberAdmin ? 'badge-admin' : 'badge-member'}">
              ${isThisMemberAdmin ? '👑 Admin' : '👤 Anggota'}
            </span>
          </div>
          <span class="member-email-text">${escapeHtml(mem.userEmail || '')}</span>
        </div>
      </div>
      <div class="member-action-btns">
        ${isViewerAdmin && !isSelf ? `
          ${!isThisMemberAdmin ? `
            <button type="button" class="btn btn-outline btn-xs btn-promote-admin" title="Jadikan Admin agar dapat mengedit jadwal">
              👑 Jadikan Admin
            </button>
          ` : `
            <button type="button" class="btn btn-outline btn-xs btn-demote-member" title="Turunkan ke Anggota Biasa (Lihat Saja)">
              👤 Ubah ke Anggota
            </button>
          `}
          <button type="button" class="btn-icon btn-xs text-danger btn-remove-member" title="Keluarkan dari grup">✕</button>
        ` : ''}
      </div>
    `;

    const promoteBtn = row.querySelector('.btn-promote-admin');
    if (promoteBtn) {
      promoteBtn.addEventListener('click', async () => {
        playUiSound('complete');
        await updateGroupMemberRoleInCloud(state.currentGroup.id, mem.userId, 'admin');
        mem.role = 'admin';
        showToast(`👑 ${mem.userName} sekarang adalah Admin Grup (dapat mengedit jadwal)!`, 'success');
        renderManageGroupMembersList();
        renderGroupSwitcher();
        renderGroupBanner();
      });
    }

    const demoteBtn = row.querySelector('.btn-demote-member');
    if (demoteBtn) {
      demoteBtn.addEventListener('click', async () => {
        playUiSound('click');
        await updateGroupMemberRoleInCloud(state.currentGroup.id, mem.userId, 'member');
        mem.role = 'member';
        showToast(`👤 ${mem.userName} diubah menjadi Anggota (Lihat Saja).`, 'info');
        renderManageGroupMembersList();
        renderGroupSwitcher();
        renderGroupBanner();
      });
    }

    const removeBtn = row.querySelector('.btn-remove-member');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        if (confirm(`Keluarkan ${mem.userName} dari grup ini?`)) {
          playUiSound('delete');
          await removeGroupMemberFromCloud(state.currentGroup.id, mem.userId);
          state.currentGroupMembers = state.currentGroupMembers.filter(m => m.userId !== mem.userId);
          showToast(`${mem.userName} berhasil dikeluarkan dari grup.`, 'info');
          renderManageGroupMembersList();
          renderGroupBanner();
        }
      });
    }

    container.appendChild(row);
  });
}

/** Salin Kode Undangan ke Clipboard */
function copyGroupInviteCode() {
  if (!state.currentGroup) return;
  const code = state.currentGroup.inviteCode || '';
  const btnText = document.getElementById('btnMgCopyCodeText');

  const onCopied = () => {
    playUiSound('pop');
    if (btnText) {
      btnText.textContent = '✅ Tersalin!';
      setTimeout(() => { btnText.textContent = 'Salin Kode'; }, 2000);
    }
    showToast(`📋 Kode Undangan "${code}" berhasil disalin!`, 'success');
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(onCopied).catch(() => {
      prompt('Salin kode undangan ini:', code);
    });
  } else {
    prompt('Salin kode undangan ini:', code);
  }
}

/** Salin Tautan Gabung Grup ke Clipboard */
function copyGroupInviteLink() {
  if (!state.currentGroup) return;
  const code = state.currentGroup.inviteCode || '';
  const url = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(code)}`;
  const btnText = document.getElementById('btnMgCopyLinkText');

  const onCopied = () => {
    playUiSound('pop');
    if (btnText) {
      btnText.textContent = '✅ Tersalin!';
      setTimeout(() => { btnText.textContent = 'Salin Tautan'; }, 2000);
    }
    showToast(`🔗 Tautan Gabung Grup berhasil disalin! Bagikan ke rekan Anda.`, 'success');
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(onCopied).catch(() => {
      prompt('Salin tautan gabung grup ini:', url);
    });
  } else {
    prompt('Salin tautan gabung grup ini:', url);
  }
}

/** Bagikan Undangan Grup via WhatsApp */
function shareGroupViaWhatsApp() {
  if (!state.currentGroup) return;
  const g = state.currentGroup;
  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(g.inviteCode || '')}`;
  const text = `Halo! Yuk gabung ke ruang jadwal tim "${g.name}" di PlanCalender 📅.\n\nKlik link ini untuk langsung bergabung:\n${joinUrl}\n\nAtau masukkan kode undangan: *${g.inviteCode}*`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
}

/** Keluar dari Grup */
async function handleLeaveGroup() {
  if (!state.currentGroup) return;
  const gName = state.currentGroup.name;

  if (confirm(`Apakah Anda yakin ingin keluar dari grup "${gName}"?`)) {
    const myId = state.currentUser ? state.currentUser.id : 'guest';
    playUiSound('click');
    await removeGroupMemberFromCloud(state.currentGroup.id, myId);
    state.groups = state.groups.filter(g => g.id !== state.currentGroup.id);
    closeManageGroupModal();
    await switchGroup(null);
    showToast(`Anda telah keluar dari grup "${gName}".`, 'info');
  }
}

/** Hapus Grup Selamanya (Khusus Admin/Owner) */
async function handleDeleteGroup() {
  if (!state.currentGroup) return;
  const gName = state.currentGroup.name;

  if (confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin menghapus grup "${gName}" beserta seluruh jadwalnya selamanya? Tindakan ini tidak dapat dibatalkan.`)) {
    playUiSound('delete');
    await deleteGroupInCloud(state.currentGroup.id);
    state.groups = state.groups.filter(g => g.id !== state.currentGroup.id);
    closeManageGroupModal();
    await switchGroup(null);
    showToast(`Grup "${gName}" berhasil dihapus selamanya.`, 'info');
  }
}

function setupGroupEventListeners() {
  document.getElementById('btnOpenCreateGroup')?.addEventListener('click', openCreateGroupModal);
  document.getElementById('btnCloseCreateGroupModal')?.addEventListener('click', closeCreateGroupModal);
  document.getElementById('btnCancelCreateGroup')?.addEventListener('click', closeCreateGroupModal);
  document.getElementById('createGroupForm')?.addEventListener('submit', handleCreateGroupSubmit);

  // Salin Kode Grup di Sidebar (Tepat di Atas Tombol Buat & Gabung Grup)
  const copySidebarCodeAction = () => {
    const valEl = document.getElementById('sidebarGroupCodeValue');
    const copyLabel = document.getElementById('sidebarCopyBtnLabel');
    const copyBtn = document.getElementById('btnCopySidebarGroupCode');
    if (!valEl) return;
    const code = valEl.textContent.trim();
    if (!code || code === '---') return;

    playUiSound('pop');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }

    if (copyBtn && copyLabel) {
      const origText = copyLabel.textContent;
      copyLabel.textContent = 'Tersalin!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyLabel.textContent = origText;
        copyBtn.classList.remove('copied');
      }, 2000);
    }

    showToast(`🔑 Kode Undangan "${code}" berhasil disalin! Bagikan ke rekan Anda.`, 'success');
  };

  document.getElementById('btnCopySidebarGroupCode')?.addEventListener('click', copySidebarCodeAction);
  document.getElementById('sidebarGroupCodeValWrap')?.addEventListener('click', copySidebarCodeAction);

  // Modal Sukses Buat Grup Listeners
  document.getElementById('btnCloseGroupCreatedModal')?.addEventListener('click', closeGroupCreatedSuccessModal);
  document.getElementById('btnGoToCreatedGroup')?.addEventListener('click', closeGroupCreatedSuccessModal);

  document.getElementById('btnCopyCreatedCodeBig')?.addEventListener('click', () => {
    if (!latestCreatedGroup) return;
    playUiSound('pop');
    const code = latestCreatedGroup.inviteCode;
    navigator.clipboard?.writeText(code);
    showToast(`🎉 Kode Undangan "${code}" berhasil disalin! Bagikan ke teman Anda.`, 'success');
  });

  document.getElementById('btnCopyLinkCreated')?.addEventListener('click', () => {
    if (!latestCreatedGroup) return;
    playUiSound('pop');
    const code = latestCreatedGroup.inviteCode;
    const url = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(code)}`;
    navigator.clipboard?.writeText(url);
    showToast('🔗 Tautan gabung grup berhasil disalin!', 'success');
  });

  document.getElementById('btnShareWaCreated')?.addEventListener('click', () => {
    if (!latestCreatedGroup) return;
    const code = latestCreatedGroup.inviteCode;
    const text = `Halo! Yuk gabung ke jadwal grup "${latestCreatedGroup.name}" di PlanCalender. Gunakan Kode Undangan ini: *${code}* atau buka tautan: ${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(code)}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  });

  document.querySelectorAll('#groupEmojiSelector .emoji-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playUiSound('click');
      document.querySelectorAll('#groupEmojiSelector .emoji-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedGroupEmoji = btn.dataset.emoji;
    });
  });

  document.querySelectorAll('#groupColorSelector .color-circle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playUiSound('click');
      document.querySelectorAll('#groupColorSelector .color-circle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedGroupColor = btn.dataset.color;
    });
  });

  document.getElementById('btnOpenJoinGroup')?.addEventListener('click', () => openJoinGroupModal());
  document.getElementById('btnCloseJoinGroupModal')?.addEventListener('click', closeJoinGroupModal);
  document.getElementById('btnCancelJoinGroup')?.addEventListener('click', closeJoinGroupModal);
  document.getElementById('joinGroupForm')?.addEventListener('submit', handleJoinGroupSubmit);

  // Paste button from clipboard in Join Modal
  document.getElementById('btnPasteJoinCode')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        const clean = digits || text.trim().toUpperCase();
        const input = document.getElementById('joinGroupCodeInput');
        if (input) {
          input.value = clean;
          playUiSound('pop');
          showToast('Kode berhasil ditempel!', 'success');
          input.focus();
        }
      } else {
        showToast('Clipboard kosong atau tidak berisi teks.', 'info');
      }
    } catch {
      showToast('Silakan tempel kode secara manual dengan Ctrl+V.', 'info');
    }
  });

  // Khusus angka untuk input kode grup (maksimal 6 digit)
  document.getElementById('joinGroupCodeInput')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });

  document.getElementById('btnGroupCopyInvite')?.addEventListener('click', copyGroupInviteLink);
  document.getElementById('btnGroupManage')?.addEventListener('click', openManageGroupModal);
  document.getElementById('btnGroupBackPersonal')?.addEventListener('click', () => switchGroup(null));

  document.getElementById('btnCloseManageGroupModal')?.addEventListener('click', closeManageGroupModal);
  document.getElementById('btnMgCopyCode')?.addEventListener('click', copyGroupInviteCode);
  document.getElementById('btnMgCopyLink')?.addEventListener('click', copyGroupInviteLink);
  document.getElementById('btnMgShareWhatsApp')?.addEventListener('click', shareGroupViaWhatsApp);
  document.getElementById('btnMgLeaveGroup')?.addEventListener('click', handleLeaveGroup);
  document.getElementById('btnMgDeleteGroup')?.addEventListener('click', handleDeleteGroup);
}

// ==============================================================================
// 21. DATA EXPORT, IMPORT, & RESET
// ==============================================================================
function exportDataJSON() {
  playUiSound('pop');
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.schedules, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `plancalender-schedules-${formatDateKey(new Date())}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('JSON backup file downloaded successfully!', 'success');
}

function openImportModal() {
  playUiSound('pop');
  document.getElementById('importModalOverlay')?.classList.remove('hidden');
}

function closeImportModal() {
  document.getElementById('importModalOverlay')?.classList.add('hidden');
}

async function applyImportJSON() {
  const textarea = document.getElementById('importJsonTextarea');
  const rawText = textarea.value.trim();
  if (!rawText) {
    showToast('JSON content cannot be empty.', 'warning');
    return;
  }

  try {
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON data must be an array of schedules.');
    }
    state.schedules = parsed;
    playUiSound('complete');

    // Save to local & cloud
    const accKey = state.currentUser ? state.currentUser.id : 'guest';
    localStorage.setItem(`${STORAGE_PREFIX}${accKey}`, JSON.stringify(state.schedules));

    if (state.currentUser && isSupabaseConfigured()) {
      for (const item of parsed) {
        await saveUserSchedule(item, state.currentUser.id).catch(() => {});
      }
    }

    closeImportModal();
    renderApp();
    showToast(`Successfully imported ${parsed.length} schedule items!`, 'success');
  } catch (err) {
    showToast('Invalid JSON format: ' + err.message, 'danger');
  }
}

async function resetToDefaultData() {
  await resetToIndonesiaCalendar();
}

/** Reset all schedules and reload official Indonesian Calendar (National Holidays 2025 - 2026) */
async function resetToIndonesiaCalendar() {
  if (!confirm('Clear all old schedules and load official calendar holidays & events (2025 - 2026)?')) {
    return;
  }
  playUiSound('pop');
  const defaults = getDefaultSchedules();
  state.schedules = [...defaults];
  const accKey = state.currentUser ? state.currentUser.id : 'guest';
  localStorage.setItem(`${STORAGE_PREFIX}${accKey}`, JSON.stringify(state.schedules));

  if (state.currentUser && isSupabaseConfigured()) {
    showToast('Saving calendar holidays to Supabase...', 'info');
    await purgeOldDummySchedules(state.currentUser.id).catch(() => {});
    await seedInitialSchedulesForUser(state.currentUser.id, defaults).catch(() => {});
  }

  renderApp();
  triggerConfetti();
  showToast(`🇮🇩 Successfully loaded ${defaults.length} official calendar holidays & events!`, 'success');
}

// ==============================================================================
// 20. THEME & SOUND SETTINGS
// ==============================================================================
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem(THEME_KEY, state.theme);
  updateThemeIcon();
  playUiSound('pop');
  showToast(`Theme switched to ${state.theme === 'dark' ? 'Dark' : 'Light'} mode`, 'info');
}

function updateThemeIcon() {
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  if (!sunIcon || !moonIcon) return;

  if (state.theme === 'light') {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem(SOUND_KEY, state.soundEnabled);
  updateSoundIcon();
  if (state.soundEnabled) playUiSound('chime');
  showToast(`Interface sound effects ${state.soundEnabled ? 'enabled' : 'disabled'}`, 'info');
}

function updateSoundIcon() {
  const onIcon = document.querySelector('.sound-on-icon');
  const offIcon = document.querySelector('.sound-off-icon');
  const statusBadge = document.getElementById('soundStatusBadge');
  const desc = document.getElementById('hdropSoundDesc');
  if (!onIcon || !offIcon) return;

  if (state.soundEnabled) {
    onIcon.classList.remove('hidden');
    offIcon.classList.add('hidden');
    if (statusBadge) statusBadge.textContent = 'ON';
    if (desc) desc.textContent = 'Efek Suara UI Aktif';
  } else {
    onIcon.classList.add('hidden');
    offIcon.classList.remove('hidden');
    if (statusBadge) statusBadge.textContent = 'OFF';
    if (desc) desc.textContent = 'Efek Suara UI Nonaktif';
  }
}

// ==============================================================================
// 21. TOAST NOTIFICATION UTILITY
// ==============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✅',
    info: '💡',
    warning: '⚠️',
    danger: '❌'
  };

  toast.innerHTML = `
    <span>${iconMap[type] || '🔔'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 3400);
}

// ==============================================================================
// 22. VIEW SWITCHING & NAVIGATION
// ==============================================================================
function switchView(viewName) {
  playUiSound('click');
  state.activeView = viewName;

  document.querySelectorAll('.nav-item').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
    tab.setAttribute('aria-selected', tab.dataset.view === viewName);
  });

  document.querySelectorAll('.mb-nav-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  const views = {
    month: document.getElementById('viewMonth'),
    week: document.getElementById('viewWeek'),
    day: document.getElementById('viewDay'),
    kanban: document.getElementById('viewKanban'),
    agenda: document.getElementById('viewAgenda')
  };

  Object.keys(views).forEach(k => {
    if (views[k]) {
      if (k === viewName) views[k].classList.remove('hidden');
      else views[k].classList.add('hidden');
    }
  });

  renderApp();
}

function navigatePeriod(step) {
  playUiSound('click');
  if (state.activeView === 'month') {
    state.currentDate.setMonth(state.currentDate.getMonth() + step);
  } else if (state.activeView === 'week') {
    state.currentDate.setDate(state.currentDate.getDate() + (step * 7));
  } else if (state.activeView === 'day') {
    state.selectedDate.setDate(state.selectedDate.getDate() + step);
    state.currentDate = new Date(state.selectedDate);
  } else {
    state.currentDate.setMonth(state.currentDate.getMonth() + step);
  }
  renderApp();
}

function goToToday() {
  playUiSound('click');
  state.currentDate = new Date();
  state.selectedDate = new Date();
  renderApp();
}

// ==============================================================================
// 23. SETUP EVENT LISTENERS
// ==============================================================================
function setupEventListeners() {
  setupGroupEventListeners();

  // Navigation Tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('btnNavPrev')?.addEventListener('click', () => navigatePeriod(-1));
  document.getElementById('btnNavNext')?.addEventListener('click', () => navigatePeriod(1));
  document.getElementById('btnNavToday')?.addEventListener('click', goToToday);

  document.getElementById('miniCalPrev')?.addEventListener('click', () => {
    playUiSound('click');
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    renderApp();
  });
  document.getElementById('miniCalNext')?.addEventListener('click', () => {
    playUiSound('click');
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    renderApp();
  });

  document.getElementById('btnOpenNewSchedule')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('btnHeaderAdd')?.addEventListener('click', () => openScheduleModal());

  // Command Palette
  document.getElementById('btnTriggerCommandPalette')?.addEventListener('click', openCommandPalette);
  document.getElementById('btnEscCommand')?.addEventListener('click', closeCommandPalette);
  document.getElementById('commandPaletteOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('commandPaletteOverlay')) closeCommandPalette();
  });

  const cmdInput = document.getElementById('commandPaletteInput');
  cmdInput?.addEventListener('input', (e) => {
    commandSelectedIndex = 0;
    renderCommandResults(e.target.value);
  });

  cmdInput?.addEventListener('keydown', (e) => {
    const items = document.querySelectorAll('#commandResultsList .cmd-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        commandSelectedIndex = (commandSelectedIndex + 1) % items.length;
        updateCommandSelection();
        items[commandSelectedIndex]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        commandSelectedIndex = (commandSelectedIndex - 1 + items.length) % items.length;
        updateCommandSelection();
        items[commandSelectedIndex]?.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length > 0 && items[commandSelectedIndex]) {
        items[commandSelectedIndex].click();
      }
    }
  });

  // Pomodoro
  document.getElementById('btnOpenPomodoro')?.addEventListener('click', () => {
    playUiSound('pop');
    document.getElementById('pomodoroModalOverlay')?.classList.remove('hidden');
  });
  document.getElementById('btnClosePomodoro')?.addEventListener('click', () => {
    document.getElementById('pomodoroModalOverlay')?.classList.add('hidden');
  });

  // Auth & Profile Triggers
  document.getElementById('btnHeaderAuth')?.addEventListener('click', openAuthOrProfile);
  document.getElementById('sidebarUserCard')?.addEventListener('click', openAuthOrProfile);
  document.getElementById('btnSidebarAuthAction')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openAuthOrProfile();
  });
  document.getElementById('btnCloseAuthModal')?.addEventListener('click', closeAuthModal);
  document.getElementById('btnCloseProfileModal')?.addEventListener('click', closeProfileModal);
  document.getElementById('btnContinueGuest')?.addEventListener('click', closeAuthModal);
  document.getElementById('btnLogout')?.addEventListener('click', handleLogout);

  document.getElementById('btnSyncNow')?.addEventListener('click', async () => {
    if (state.currentUser) {
      await loadUserData(state.currentUser.id);
      closeProfileModal();
    }
  });

  // Auth Tabs (Login vs Register)
  document.getElementById('tabBtnLogin')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('tabBtnRegister')?.addEventListener('click', () => openAuthModal('register'));
  document.getElementById('authForm')?.addEventListener('submit', handleAuthFormSubmit);

  // 6-Digit Email OTP Verification Listeners
  setupOtpInputs();
  document.getElementById('btnSubmitOtp')?.addEventListener('click', handleVerifyOtpSubmit);
  document.getElementById('btnResendOtp')?.addEventListener('click', handleResendOtpClick);
  document.getElementById('btnBackToRegisterForm')?.addEventListener('click', () => {
    document.getElementById('authVerifyOtpView')?.classList.add('hidden');
    document.getElementById('authCredentialsView')?.classList.remove('hidden');
    stopOtpResendCountdown();
    openAuthModal('register');
  });

  // Gmail Template Guide Modal Listeners
  document.getElementById('btnOpenEmailTemplateGuide')?.addEventListener('click', openEmailTemplateGuideModal);
  document.getElementById('btnCloseEmailTemplateModal')?.addEventListener('click', closeEmailTemplateGuideModal);
  document.getElementById('btnCloseEmailTemplateBtn')?.addEventListener('click', closeEmailTemplateGuideModal);
  document.getElementById('btnCopyEmailTemplateCode')?.addEventListener('click', copyEmailTemplateCode);
  document.getElementById('emailTemplateModalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('emailTemplateModalOverlay')) closeEmailTemplateGuideModal();
  });

  // Toggle Password Eye
  document.getElementById('btnTogglePasswordVisibility')?.addEventListener('click', () => {
    const pwInput = document.getElementById('authPassword');
    if (!pwInput) return;
    const isPw = pwInput.type === 'password';
    pwInput.type = isPw ? 'text' : 'password';
    document.getElementById('btnTogglePasswordVisibility').textContent = isPw ? '🙈' : '👁️';
  });

  // Supabase Config Modal Triggers
  document.getElementById('btnSupabaseBadge')?.addEventListener('click', openSupabaseConfigModal);
  document.getElementById('btnOpenSupabaseConfig')?.addEventListener('click', openSupabaseConfigModal);
  document.getElementById('btnOpenSupabaseFromAuth')?.addEventListener('click', () => {
    closeAuthModal();
    openSupabaseConfigModal();
  });
  document.getElementById('btnCloseSupabaseConfig')?.addEventListener('click', closeSupabaseConfigModal);
  document.getElementById('btnCancelSupabaseConfig')?.addEventListener('click', closeSupabaseConfigModal);
  document.getElementById('btnSaveSupabaseConfig')?.addEventListener('click', handleSaveSupabaseConfig);

  // Admin Control Panel Event Listeners
  document.getElementById('btnSidebarAdminPanel')?.addEventListener('click', openAdminModal);
  document.getElementById('btnProfileOpenAdmin')?.addEventListener('click', () => {
    closeProfileModal();
    openAdminModal();
  });
  document.getElementById('btnCloseAdminModal')?.addEventListener('click', closeAdminModal);
  document.getElementById('adminControlModalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('adminControlModalOverlay')) closeAdminModal();
  });
  document.getElementById('toggleAdminGlobalView')?.addEventListener('change', toggleAdminGlobalMode);
  document.getElementById('btnAdminExportMaster')?.addEventListener('click', exportAdminMasterBackup);
  document.getElementById('btnAdminCopySql')?.addEventListener('click', copyAdminSqlToClipboard);
  document.getElementById('btnAdminTestPing')?.addEventListener('click', refreshAdminStats);
  document.getElementById('btnAdminBroadcast')?.addEventListener('click', showAdminBroadcastPrompt);

  // Sound Toggle
  document.getElementById('btnToggleSound')?.addEventListener('click', toggleSound);

  // Priority Filter
  document.getElementById('priorityFilterSelect')?.addEventListener('change', (e) => {
    playUiSound('click');
    state.activePriorityFilter = e.target.value;
    renderApp();
  });

  // Reset Filters
  document.getElementById('btnResetCategoryFilter')?.addEventListener('click', () => {
    state.activeCategoryFilter = 'all';
    renderApp();
  });

  document.getElementById('btnClearAllFilters')?.addEventListener('click', () => {
    playUiSound('click');
    state.activeCategoryFilter = 'all';
    state.activePriorityFilter = 'all';
    state.searchQuery = '';
    const priSelect = document.getElementById('priorityFilterSelect');
    if (priSelect) priSelect.value = 'all';
    renderApp();
  });

  // Theme Toggle
  document.getElementById('btnThemeToggle')?.addEventListener('click', toggleTheme);

  // ========================================================================
  // Unified Sidebar & Workspace Navigation Controls
  // ========================================================================
  function handleSidebarToggle(forceState) {
    playUiSound('click');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isMobile = window.innerWidth <= 860;
    if (isMobile) {
      const willOpen = forceState !== undefined ? forceState : !sidebar?.classList.contains('mobile-open');
      sidebar?.classList.toggle('mobile-open', willOpen);
      backdrop?.classList.toggle('active', willOpen);
    } else {
      document.body.classList.toggle('sidebar-collapsed');
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      showToast(isCollapsed ? 'Sidebar disembunyikan (Layar Penuh)' : 'Sidebar ditampilkan', 'info');
    }
  }

  // Unified menu toggle button in top header
  document.getElementById('btnMobileMenuToggle')?.addEventListener('click', () => {
    handleSidebarToggle();
  });

  // Mobile drawer close 'X' button
  document.getElementById('btnSidebarCloseMobile')?.addEventListener('click', () => {
    handleSidebarToggle(false);
  });

  // Mobile sidebar backdrop click to close
  document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
    handleSidebarToggle(false);
  });

  // Mobile Bottom Navigation Dock Buttons
  document.getElementById('mbNavMonth')?.addEventListener('click', () => switchView('month'));
  document.getElementById('mbNavWeek')?.addEventListener('click', () => switchView('week'));
  document.getElementById('mbNavAdd')?.addEventListener('click', () => {
    playUiSound('click');
    openScheduleModal();
  });
  document.getElementById('mbNavKanban')?.addEventListener('click', () => switchView('kanban'));
  document.getElementById('mbNavDrawer')?.addEventListener('click', () => handleSidebarToggle(true));

  // Auto-close sidebar on mobile when navigating items
  document.querySelectorAll('#sidebar .nav-item, #sidebar .group-item-btn, #sidebar #btnOpenCreateGroup, #sidebar #btnOpenJoinGroup').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 860) {
        handleSidebarToggle(false);
      }
    });
  });

  // Mobile Kanban segmented tabs click
  document.querySelectorAll('.mkanban-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      playUiSound('click');
      document.querySelectorAll('.mkanban-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const colId = tab.dataset.col;
      const targetCol = document.getElementById(colId);
      if (targetCol) {
        targetCol.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  });

  // Calendar Holidays Reload in Sidebar
  document.getElementById('btnSyncIndonesiaHolidays')?.addEventListener('click', () => {
    resetToIndonesiaCalendar();
  });

  // Keyboard shortcut 'B' for toggling sidebar
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'b' || e.key === 'B') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      handleSidebarToggle();
    }
  });

  // Schedule Modal
  document.getElementById('scheduleForm')?.addEventListener('submit', handleScheduleFormSubmit);
  document.getElementById('btnCloseModal')?.addEventListener('click', closeScheduleModal);
  document.getElementById('btnCancelModal')?.addEventListener('click', closeScheduleModal);
  document.getElementById('btnAddChecklistItem')?.addEventListener('click', () => addChecklistInputRow());
  document.getElementById('btnDeleteSchedule')?.addEventListener('click', () => {
    if (currentEditingId) confirmDeleteSchedule(currentEditingId);
  });

  // Preview Modal
  document.getElementById('btnClosePreview')?.addEventListener('click', closePreviewModal);
  document.getElementById('btnTogglePreviewStatus')?.addEventListener('click', () => {
    if (activePreviewItem) toggleScheduleComplete(activePreviewItem.id);
  });
  document.getElementById('btnEditFromPreview')?.addEventListener('click', () => {
    if (activePreviewItem) {
      const item = activePreviewItem;
      closePreviewModal();
      openScheduleModal(item);
    }
  });

  // Data Actions
  document.getElementById('btnExportData')?.addEventListener('click', exportDataJSON);
  document.getElementById('btnImportData')?.addEventListener('click', openImportModal);
  document.getElementById('btnCloseImportModal')?.addEventListener('click', closeImportModal);
  document.getElementById('btnCancelImport')?.addEventListener('click', closeImportModal);
  document.getElementById('btnConfirmImport')?.addEventListener('click', applyImportJSON);

  document.getElementById('importFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        document.getElementById('importJsonTextarea').value = evt.target.result;
      };
      reader.readAsText(file);
    }
  });

  // Day Notes Save
  document.getElementById('btnSaveDayNotes')?.addEventListener('click', async () => {
    const txt = document.getElementById('dayNotesInput')?.value || '';
    const dateKey = formatDateKey(state.selectedDate);
    state.dayNotes[dateKey] = txt;

    const accKey = state.currentUser ? state.currentUser.id : 'guest';
    localStorage.setItem(`${NOTES_PREFIX}${accKey}`, JSON.stringify(state.dayNotes));

    if (state.currentUser && isSupabaseConfigured()) {
      await saveUserDayNote(dateKey, txt, state.currentUser.id);
    }

    playUiSound('complete');
    showToast('Daily notes saved successfully.', 'success');
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openCommandPalette();
    } else if (e.key === 'Escape') {
      closeCommandPalette();
      closeScheduleModal();
      closePreviewModal();
      closeImportModal();
      closeAuthModal();
      closeProfileModal();
      closeAdminModal();
      closeSupabaseConfigModal();
      closeCreateGroupModal();
      closeJoinGroupModal();
      closeManageGroupModal();
      document.getElementById('pomodoroModalOverlay')?.classList.add('hidden');
    } else if (!isTyping) {
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openScheduleModal();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        goToToday();
      } else if (e.key === '1') switchView('month');
      else if (e.key === '2') switchView('week');
      else if (e.key === '3') switchView('day');
      else if (e.key === '4') switchView('kanban');
      else if (e.key === '5') switchView('agenda');
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addHours(timeStr, hours) {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const nextHour = (h + hours) % 24;
  return `${String(nextHour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

// ==============================================================================
// 24. REAL-TIME LIVE APP UPDATE / PATCH NOTIFIER & RELOAD SYSTEM
// ==============================================================================
let currentAppBuildTimestamp = 0;
let latestPatchInfo = null;

async function initLiveUpdateChecker() {
  try {
    const res = await fetch(`version.json?_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      currentAppBuildTimestamp = data.buildTimestamp || 0;
      latestPatchInfo = data;
    }
  } catch (e) {}

  // Cek update baru secara berkala setiap 15 detik
  setInterval(checkForLiveAppPatch, 15000);

  // Cek juga saat tab kembali difokuskan oleh pengguna
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForLiveAppPatch();
    }
  });
  window.addEventListener('focus', checkForLiveAppPatch);

  setupLiveUpdateListeners();
}

async function checkForLiveAppPatch() {
  try {
    const res = await fetch(`version.json?_t=${Date.now()}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.buildTimestamp) return;

    if (currentAppBuildTimestamp && data.buildTimestamp > currentAppBuildTimestamp) {
      latestPatchInfo = data;
      showLiveUpdateBanner(data);
    } else if (!currentAppBuildTimestamp) {
      currentAppBuildTimestamp = data.buildTimestamp;
      latestPatchInfo = data;
    }
  } catch (e) {}
}

function showLiveUpdateBanner(patchData) {
  const banner = document.getElementById('liveUpdateBanner');
  if (!banner) return;

  const titleEl = document.getElementById('updateBannerTitle');
  const badgeEl = document.getElementById('updateBannerBadge');
  const subEl = document.getElementById('updateBannerSub');

  if (titleEl) titleEl.textContent = patchData.patchTitle || 'Update Baru Tersedia!';
  if (badgeEl) badgeEl.textContent = patchData.version || 'v2.7';
  if (subEl) subEl.textContent = `Pembaruan diterapkan (${patchData.releaseDate || 'Baru saja'}). Muat ulang untuk mendapatkan perubahan terbaru.`;

  banner.classList.remove('hidden');
  playUiSound('pop');
}

function openPatchNotesModal() {
  const modal = document.getElementById('patchNotesModalOverlay');
  if (!modal) return;
  playUiSound('pop');

  const titleEl = document.getElementById('patchNotesModalTitle');
  const dateEl = document.getElementById('patchNotesModalDate');
  const pillEl = document.getElementById('patchNotesVerPill');
  const listEl = document.getElementById('patchNotesList');

  const info = latestPatchInfo || {
    version: 'v2.7.0',
    releaseDate: '01 Oktober 2026',
    patchTitle: 'Catatan Pembaruan PlanCalender',
    changes: [
      '🚀 Deteksi pembaruan live real-time dengan tombol reload',
      '🔑 Fitur kode undangan grup saat membuat ruang jadwal baru',
      '👤 Mode Tamu default tanpa auto-login',
      '🔄 Kolom email Sign In memuat akun terakhir yang dipakai'
    ]
  };

  if (titleEl) titleEl.textContent = info.patchTitle || 'Catatan Pembaruan (Patch Notes)';
  if (dateEl) dateEl.textContent = info.releaseDate || 'Rilis Terbaru';
  if (pillEl) pillEl.textContent = info.version || 'v2.7.0';

  if (listEl) {
    listEl.innerHTML = (info.changes || []).map(item => `
      <li class="patch-change-item">
        <span class="patch-change-bullet">✦</span>
        <span>${escapeHtml(item)}</span>
      </li>
    `).join('');
  }

  modal.classList.remove('hidden');
}

function closePatchNotesModal() {
  document.getElementById('patchNotesModalOverlay')?.classList.add('hidden');
}

function setupLiveUpdateListeners() {
  // Tombol Muat Ulang Langsung
  const reloadFn = () => {
    playUiSound('pop');
    window.location.reload(true);
  };

  document.getElementById('btnReloadPatchNow')?.addEventListener('click', reloadFn);
  document.getElementById('btnApplyPatchReload')?.addEventListener('click', reloadFn);

  // Tombol Lihat Catatan Perubahan
  document.getElementById('btnViewPatchNotes')?.addEventListener('click', openPatchNotesModal);
  document.getElementById('btnClosePatchNotesModal')?.addEventListener('click', closePatchNotesModal);
}

// Inisialisasi Aplikasi Saat Memuat
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateSoundIcon();
  initLiveClock();
  initPomodoro();
  setupEventListeners();
  initLiveUpdateChecker();
  await initSupabaseSession();
  await loadGroups();

  // Periksa apakah ada parameter tautan undangan grup di URL (?join=CODE atau #join=CODE)
  const urlParams = new URLSearchParams(window.location.search);
  const joinCode = urlParams.get('join') || (window.location.hash.startsWith('#join=') ? window.location.hash.replace('#join=', '') : null);
  if (joinCode) {
    openJoinGroupModal(joinCode);
  }
});
