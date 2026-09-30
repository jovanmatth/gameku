/**
 * ==============================================================================
 * PlanCraft PRO — Ultra-Aesthetic Engine & Logic (v2.5 + Supabase Cloud)
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

import { CATEGORIES, PRIORITIES, STATUSES, getDefaultSchedules, isOldDummySchedule } from './schedule-data.js';
import {
  initSupabase,
  isSupabaseConfigured,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  registerWithEmail,
  loginWithEmail,
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
  fetchAdminDatabaseStats
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
  dayNotes: {}
};


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

  // Jika belum login via session Supabase, otomatis jadikan akun Jovan Matthew Adderson (Admin) sebagai default aktif
  const isExplicitLogout = localStorage.getItem('plancraft_logged_out') === 'true';
  const activeAcc = localStorage.getItem('plancraft_active_account');
  if (!isExplicitLogout || activeAcc === 'admin') {
    activateJovanAdminSession(false);
    return;
  }

  // Jika sengaja keluar (guest mode)
  state.currentUser = null;
  state.isAdmin = false;
  updateUserUI();
  loadLocalSchedules('guest');
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
    showToast('👑 Mode Administrator Aktif: Jovan Matthew Adderson!', 'success');
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

/** Simpan jadwal ke Supabase Cloud & cache lokal */
async function persistSchedule(scheduleData) {
  // 1. Simpan ke state dan cache lokal
  const accKey = state.currentUser ? state.currentUser.id : 'guest';
  localStorage.setItem(`${STORAGE_PREFIX}${accKey}`, JSON.stringify(state.schedules));

  // 2. Jika akun terhubung ke Supabase, simpan langsung ke Supabase dengan RLS
  if (state.currentUser && isSupabaseConfigured()) {
    try {
      await saveUserSchedule(scheduleData, state.currentUser.id);
    } catch (err) {
      console.error('Gagal sinkronisasi jadwal ke Supabase:', err);
      showToast('Tersimpan di lokal. Gagal sinkronisasi Supabase: ' + err.message, 'warning');
    }
  }
}

/** Hapus jadwal dari Supabase Cloud & cache lokal */
async function removeSchedule(scheduleId) {
  const accKey = state.currentUser ? state.currentUser.id : 'guest';
  localStorage.setItem(`${STORAGE_PREFIX}${accKey}`, JSON.stringify(state.schedules));

  if (state.currentUser && isSupabaseConfigured()) {
    try {
      await deleteUserSchedule(scheduleId, state.currentUser.id);
    } catch (err) {
      console.error('Gagal menghapus dari Supabase:', err);
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
    if (pillText) pillText.textContent = 'Siap Login';
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

    if (sidebarName) sidebarName.textContent = 'Tamu (Guest Mode)';
    if (sidebarEmail) sidebarEmail.textContent = 'Klik untuk Masuk Akun';
    if (sidebarAvatar) sidebarAvatar.textContent = '👤';
    if (headerAvatar) headerAvatar.textContent = '👤';
    if (headerEmail) {
      headerEmail.textContent = 'Masuk Akun';
      headerEmail.title = 'Masuk atau Kelola Akun';
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
    let greet = 'Produktif ✨';
    if (h >= 4 && h < 11) greet = 'Pagi ⚡';
    else if (h >= 11 && h < 15) greet = 'Siang 🚀';
    else if (h >= 15 && h < 18) greet = 'Sore 🌅';
    else greet = 'Malam 🌙';

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
      document.getElementById('btnTimerText').textContent = 'Jeda (Pause)';
    }
    if (statusLabel) statusLabel.textContent = '🔥 Sedang berjalan... Tetap fokus!';
    playUiSound('pop');

    pomodoro.timerInterval = setInterval(() => {
      if (pomodoro.remainingSeconds > 0) {
        pomodoro.remainingSeconds--;
        updateDisplay();
      } else {
        clearInterval(pomodoro.timerInterval);
        pomodoro.isRunning = false;
        if (document.getElementById('btnTimerText')) {
          document.getElementById('btnTimerText').textContent = 'Mulai Fokus';
        }
        if (statusLabel) statusLabel.textContent = '🎉 Sesi Fokus Selesai! Saatnya istirahat.';
        playUiSound('chime');
        triggerConfetti();
        showToast('Waktu sesi fokus telah berakhir! Luar biasa!', 'success');
      }
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(pomodoro.timerInterval);
    pomodoro.isRunning = false;
    if (document.getElementById('btnTimerText')) {
      document.getElementById('btnTimerText').textContent = 'Lanjutkan';
    }
    if (statusLabel) statusLabel.textContent = '⏸️ Sesi dijeda';
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
      document.getElementById('btnTimerText').textContent = 'Mulai Fokus';
    }
    if (statusLabel) statusLabel.textContent = 'Fokus pada satu tugas penting';
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
      { id: 'act-admin-panel', label: '👑 Pusat Kontrol Administrator (Super Admin)', icon: '👑', cat: 'Admin', action: () => { closeCommandPalette(); openAdminModal(); } },
      { id: 'act-admin-toggle', label: `👑 Mode Pengawas Cloud: ${state.adminModeAllSchedules ? 'Nonaktifkan' : 'Aktifkan (Lihat Semua)'}`, icon: '👁️', cat: 'Admin', action: () => { closeCommandPalette(); toggleAdminGlobalMode(); } }
    ] : []),
    { id: 'act-new', label: 'Tambah Jadwal Baru', icon: '➕', cat: 'Navigasi', action: () => { closeCommandPalette(); openScheduleModal(); } },
    { id: 'act-auth', label: state.currentUser ? `Profil Akun (${state.currentUser.email})` : 'Masuk atau Daftar Akun Supabase', icon: '🔐', cat: 'Akun', action: () => { closeCommandPalette(); openAuthOrProfile(); } },
    { id: 'act-supabase-cfg', label: 'Pengaturan Koneksi Supabase', icon: '⚡', cat: 'Pengaturan', action: () => { closeCommandPalette(); openSupabaseConfigModal(); } },
    { id: 'act-today', label: 'Lompat ke Hari Ini', icon: '📅', cat: 'Navigasi', action: () => { closeCommandPalette(); goToToday(); } },
    { id: 'act-month', label: 'Beralih ke Tampilan Kalender Bulanan', icon: '📆', cat: 'Tampilan', action: () => { closeCommandPalette(); switchView('month'); } },
    { id: 'act-week', label: 'Beralih ke Timeline Mingguan', icon: '⏰', cat: 'Tampilan', action: () => { closeCommandPalette(); switchView('week'); } },
    { id: 'act-day', label: 'Beralih ke Agenda Harian Terfokus', icon: '🎯', cat: 'Tampilan', action: () => { closeCommandPalette(); switchView('day'); } },
    { id: 'act-kanban', label: 'Beralih ke Papan Status Kanban', icon: '📋', cat: 'Tampilan', action: () => { closeCommandPalette(); switchView('kanban'); } },
    { id: 'act-agenda', label: 'Beralih ke Daftar Agenda Lengkap', icon: '📝', cat: 'Tampilan', action: () => { closeCommandPalette(); switchView('agenda'); } },
    { id: 'act-pomodoro', label: 'Buka Focus Session (Pomodoro)', icon: '⏱️', cat: 'Alat', action: () => { closeCommandPalette(); document.getElementById('pomodoroModalOverlay')?.classList.remove('hidden'); } },
    { id: 'act-theme', label: `Ganti Tema ke Mode ${state.theme === 'dark' ? 'Terang' : 'Gelap'}`, icon: '🌓', cat: 'Pengaturan', action: () => { closeCommandPalette(); toggleTheme(); } },
    { id: 'act-sound', label: `Efek Suara Antarmuka: ${state.soundEnabled ? 'Nonaktifkan' : 'Aktifkan'}`, icon: '🔊', cat: 'Pengaturan', action: () => { closeCommandPalette(); toggleSound(); } },
    { id: 'act-export', label: 'Ekspor Data Jadwal (Backup JSON)', icon: '💾', cat: 'Data', action: () => { closeCommandPalette(); exportDataJSON(); } },
    { id: 'act-reset', label: '🇮🇩 Reset & Muat Kalender Indonesia (Hapus Data Lama)', icon: '🇮🇩', cat: 'Data', action: () => { closeCommandPalette(); resetToIndonesiaCalendar(); } }
  ];

  const matchedActions = systemActions.filter(a => a.label.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q));

  const matchedSchedules = state.schedules.filter(s => {
    return s.title.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
  }).slice(0, 6);

  let allItems = [];

  if (matchedActions.length > 0) {
    const grp = document.createElement('div');
    grp.className = 'cmd-group-label';
    grp.textContent = 'PERINTAH SISTEM';
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
    grp.textContent = 'JADWAL & AGENDA COCOK';
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
    list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Tidak ditemukan hasil untuk "${escapeHtml(query)}"</div>`;
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
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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
  return CATEGORIES.find(c => c.id === catId) || {
    id: 'other',
    name: 'Lainnya',
    color: '#94a3b8',
    gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: '#94a3b8',
    icon: '📌'
  };
}

function getPriority(pId) {
  if (pId === 'none' || !pId) {
    return { id: 'none', label: 'Tanggal Merah', color: '#ef4444', icon: '🇮🇩' };
  }
  return PRIORITIES.find(p => p.id === pId) || { id: 'none', label: 'Bukan Tugas', color: 'transparent', icon: '' };
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
    subEl.textContent = `Kalender Bulanan`;
  } else if (state.activeView === 'week') {
    const monday = getMondayOfWeek(state.currentDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    titleEl.textContent = `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()].slice(0, 3)} - ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]} ${y}`;
    subEl.textContent = `Pekan ke-${getWeekNumber(state.currentDate)} Tahun ${y}`;
  } else if (state.activeView === 'day') {
    const d = state.selectedDate;
    titleEl.textContent = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    subEl.textContent = isDateToday(d) ? 'Agenda Hari Ini' : 'Agenda Tanggal Terpilih';
  } else if (state.activeView === 'kanban') {
    titleEl.textContent = `Papan Status Alur Kerja`;
    subEl.textContent = `Kelola Alur Kerja & Progress Jadwal`;
  } else if (state.activeView === 'agenda') {
    titleEl.textContent = `Daftar Agenda Terstruktur`;
    subEl.textContent = `Urutan Kronologis Kegiatan`;
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
    compPercentEl.textContent = `${pct}% Selesai`;
  }

  const nextEventWrap = document.getElementById('statNextEvent');
  if (nextEventWrap) {
    const upcoming = taskEvents
      .filter(e => e.status !== 'completed' && e.date >= todayKey)
      .sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')))[0];

    if (upcoming) {
      const isToday = upcoming.date === todayKey;
      const dayLabel = isToday ? 'Hari Ini' : 'Besok/Nanti';
      nextEventWrap.innerHTML = `
        <span class="next-title" title="${escapeHtml(upcoming.title)}">${escapeHtml(upcoming.title)}</span>
        <span class="next-time">⏰ ${dayLabel}, ${upcoming.startTime || 'All-Day'}</span>
      `;
    } else {
      nextEventWrap.innerHTML = `
        <span class="next-title">Tidak ada tugas mendesak</span>
        <span class="next-time">Semua tuntas! 🎉</span>
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
    if (hasCat) filters.push(`Kategori: ${getCategory(state.activeCategoryFilter).name}`);
    if (hasPri) filters.push(`Prioritas: ${getPriority(state.activePriorityFilter).label}`);
    if (hasSearch) filters.push(`Cari: "${state.searchQuery}"`);
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
      dayNumber.title = `🇮🇩 Tanggal Merah: ${dayHolidays.map(h => h.title).join(', ')}`;
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-cell-add';
    addBtn.innerHTML = '+';
    addBtn.title = `Tambah jadwal pada ${dateKey}`;
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playUiSound('click');
      openScheduleModal(null, dateKey);
    });

    cellHeader.appendChild(dayNumber);
    cellHeader.appendChild(addBtn);
    cell.appendChild(cellHeader);

    // Tempat Khusus: Tanggal Merah & Libur Nasional di bagian atas cell
    if (dayHolidays.length > 0) {
      const holidayWrap = document.createElement('div');
      holidayWrap.className = 'cell-holiday-wrap';
      dayHolidays.forEach(h => {
        const hBadge = document.createElement('div');
        hBadge.className = 'cell-holiday-badge';
        hBadge.title = `🇮🇩 Tanggal Merah: ${h.title} (Klik untuk info detail)`;
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
        <span class="chip-priority-dot" style="background-color: ${pri.color}; color: ${pri.color};" title="Prioritas: ${pri.label}"></span>
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
      overflow.textContent = `+${dayTasks.length - maxVisibleChips} lainnya`;
      overflow.addEventListener('click', (e) => {
        e.stopPropagation();
        playUiSound('click');
        state.selectedDate = cellDate;
        switchView('day');
      });
      eventsList.appendChild(overflow);
    }

    cell.appendChild(eventsList);

    cell.addEventListener('click', () => {
      state.selectedDate = cellDate;
      renderApp();
    });

    grid.appendChild(cell);
  }
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
      ${dayHolidays.length > 0 ? `<span class="week-holiday-tag" title="🇮🇩 Tanggal Merah: ${escapeHtml(dayHolidays[0].title)}">🇮🇩 Libur</span>` : ''}
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
      hSlot.title = `Tambah jadwal pada ${dateKey} ${String(hour).padStart(2, '0')}:00`;
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

  header.innerHTML = `
    <div class="day-header-main">
      <h2 style="${isTanggalMerah ? 'color: #ef4444;' : ''}">
        ${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}
        ${isTanggalMerah ? '<span style="font-size: 0.8rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 2px 8px; border-radius: 6px; margin-left: 8px;">🇮🇩 Tanggal Merah</span>' : ''}
      </h2>
      <p>${dayTasks.length} Tugas Terjadwal • ${completedCount} Tuntas Selesai</p>
    </div>
    <button class="btn btn-primary btn-sm" id="btnDayAddEvent">
      + Jadwal Hari Ini
    </button>
  `;

  document.getElementById('btnDayAddEvent')?.addEventListener('click', () => {
    openScheduleModal(null, dateKey);
  });

  timelineCol.innerHTML = '';

  // 1. Tempat Khusus Tanggal Merah di Day View:
  if (dayHolidays.length > 0) {
    dayHolidays.forEach(h => {
      const banner = document.createElement('div');
      banner.className = 'day-holiday-banner';
      banner.innerHTML = `
        <div class="tm-flag-icon">🇮🇩</div>
        <div class="tm-banner-body">
          <div class="tm-banner-kicker">TANGGAL MERAH • HARI LIBUR NASIONAL</div>
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
        <p style="font-weight: 800; color: #ef4444; font-size: 1.15rem; font-family: var(--font-display);">Selamat Menikmati Hari Libur!</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Tidak ada agenda tugas wajib hari ini. Waktu yang tepat untuk beristirahat atau berkumpul bersama keluarga.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="document.getElementById('btnOpenNewSchedule').click()">
          + Tambah Kegiatan Pribadi
        </button>
      `;
    } else {
      emptyMsg.innerHTML = `
        <p style="font-size: 2.8rem; margin-bottom: 8px;">🏖️</p>
        <p style="font-weight: 800; color: var(--text-main); font-size: 1.15rem; font-family: var(--font-display);">Belum ada jadwal pada hari ini</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Nikmati waktu istirahat atau tambahkan agenda baru.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="document.getElementById('btnOpenNewSchedule').click()">
          + Tambah Kegiatan
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
          <button class="btn btn-outline btn-sm btn-quick-status" title="Ganti status">
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
      counterEl.textContent = `${doneCount}/${allChecklistItems.length} Selesai`;
    }

    if (allChecklistItems.length === 0) {
      tasksList.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">Tidak ada checklist aktif dari agenda hari ini.</p>`;
    } else {
      allChecklistItems.forEach(item => {
        const row = document.createElement('label');
        row.className = 'day-task-item';
        row.innerHTML = `
          <input type="checkbox" ${item.done ? 'checked' : ''} class="agenda-checkbox">
          <span style="${item.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(item.text)}</span>
        `;
        row.querySelector('input').addEventListener('change', async (e) => {
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

  Object.keys(grouped).forEach(statusKey => {
    if (counts[statusKey]) {
      counts[statusKey].textContent = grouped[statusKey].length;
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
          <button class="kanban-advance-btn" title="Pindah ke tahap berikutnya">
            <span>Lanjut</span> ➜
          </button>
        </div>
      `;

      card.querySelector('.kanban-advance-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        advanceKanbanStatus(item.id);
      });

      card.addEventListener('click', () => {
        openPreviewModal(item);
      });

      cols[statusKey].appendChild(card);
    });
  });
}

async function advanceKanbanStatus(scheduleId) {
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
  showToast(`Status '${item.title}' diubah ke: ${getStatus(item.status).label}`, 'success');
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
        <p style="font-weight: 800; color: var(--text-main); font-size: 1.15rem; font-family: var(--font-display);">Tidak ada agenda yang cocok</p>
        <p style="font-size: 0.85rem; margin-top: 4px;">Coba sesuaikan kata kunci pencarian atau filter kategori Anda.</p>
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
    { title: 'Hari Ini', items: sorted.filter(s => s.date === todayKey) },
    { title: 'Besok', items: sorted.filter(s => s.date === tomorrowKey) },
    { title: 'Mendatang', items: sorted.filter(s => s.date > tomorrowKey) },
    { title: 'Telah Lewat', items: sorted.filter(s => s.date < todayKey) }
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
        <span class="agenda-group-count">${group.items.length} Agenda</span>
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
              ${item.date} • Tanggal Merah
            </div>
            <div>
              <div class="agenda-card-title" style="color: #ef4444; font-weight: 700;">${escapeHtml(item.title)}</div>
              <div class="agenda-meta-row">
                <span class="agenda-holiday-badge">🇮🇩 Libur Nasional</span>
                ${item.description ? `<span>•</span> <span style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(item.description)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="agenda-actions-right">
            <span style="font-size: 0.75rem; font-weight: 700; color: #ef4444; padding: 4px 10px; background: rgba(239, 68, 68, 0.08); border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.2);">
              Libur Resmi
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
          <input type="checkbox" class="agenda-checkbox" ${isDone ? 'checked' : ''} title="Tandai Selesai">
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
          <button class="btn btn-outline btn-sm btn-edit-item" title="Edit Agenda">Edit</button>
          <button class="btn-icon btn-sm text-danger btn-delete-item" title="Hapus Agenda">
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
      if (isHoliday) el.title = `🇮🇩 Tanggal Merah / Libur Nasional`;
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
    titleEl.textContent = 'Edit Rincian Jadwal';
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
    titleEl.textContent = 'Tambah Jadwal Baru';
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
    <input type="text" class="form-control checklist-text-input" placeholder="Nama sub-tugas..." value="${escapeHtml(text)}">
    <button type="button" class="btn-icon btn-remove-check" title="Hapus sub-tugas">✕</button>
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
    showToast('Mohon isi judul dan tanggal jadwal.', 'warning');
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
    showToast('Jadwal berhasil diperbarui!', 'success');
  } else {
    state.schedules.push(scheduleData);
    showToast('Jadwal baru berhasil ditambahkan!', 'success');
  }

  playUiSound('complete');
  await persistSchedule(scheduleData);
  closeScheduleModal();
  renderApp();
}

async function confirmDeleteSchedule(id) {
  const item = state.schedules.find(s => s.id === id);
  if (!item) return;

  if (confirm(`Apakah Anda yakin ingin menghapus jadwal "${item.title}"?`)) {
    playUiSound('delete');
    state.schedules = state.schedules.filter(s => s.id !== id);
    await removeSchedule(id);
    closeScheduleModal();
    closePreviewModal();
    renderApp();
    showToast('Jadwal berhasil dihapus.', 'info');
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
        🇮🇩 Tanggal Merah
      </span>
      <span class="kanban-cat-badge" style="background: var(--border-subtle); color: var(--text-main);">
        Libur Resmi Nasional
      </span>
    `;

    body.innerHTML = `
      <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; line-height: 1.35; color: #ef4444;">
        🇮🇩 ${escapeHtml(item.title)}
      </h3>
      <div style="font-size: 0.84rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
        <div>📅 Tanggal: <strong>${item.date}</strong></div>
        <div>🏷️ Kategori: <strong style="color: #ef4444;">Hari Libur Nasional Indonesia</strong></div>
        <div>⚡ Prioritas: <em>Tidak masuk prioritas tugas (Tanggal Merah)</em></div>
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

  // Item tugas biasa
  if (toggleBtn) toggleBtn.style.display = '';
  if (editBtn) editBtn.style.display = '';

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
      <div>📅 Tanggal: <strong>${item.date}</strong></div>
      <div>⏰ Waktu: <strong>${item.startTime || 'All day'} - ${item.endTime || 'End'}</strong></div>
      ${item.location ? `<div>📍 Lokasi: <strong>${escapeHtml(item.location)}</strong></div>` : ''}
    </div>
    ${item.description ? `
      <div style="margin-top: 12px; background: var(--bg-input); padding: 12px; border-radius: 8px; font-size: 0.84rem; color: var(--text-secondary);">
        ${escapeHtml(item.description)}
      </div>
    ` : ''}
    ${checklistHtml}
  `;

  if (toggleBtn) {
    toggleBtn.textContent = item.status === 'completed' ? 'Tandai Belum Selesai' : 'Tandai Selesai';
  }
  modal.classList.remove('hidden');
}

function closePreviewModal() {
  document.getElementById('previewModalOverlay')?.classList.add('hidden');
  activePreviewItem = null;
}

async function toggleScheduleComplete(id) {
  const item = state.schedules.find(s => s.id === id);
  if (!item) return;

  if (item.status === 'completed') {
    item.status = 'scheduled';
    playUiSound('click');
    showToast(`'${item.title}' ditandai aktif kembali.`, 'info');
  } else {
    item.status = 'completed';
    playUiSound('complete');
    triggerConfetti();
    showToast(`'${item.title}' selesai dikerjakan! 🎉`, 'success');
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

  alertBox?.classList.add('hidden');
  document.getElementById('authForm')?.reset();

  if (mode === 'login') {
    title.textContent = 'Masuk ke Akun Anda';
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    groupName.classList.add('hidden');
    submitText.textContent = 'Masuk Sekarang';
  } else {
    title.textContent = 'Daftar Akun Baru';
    tabLogin.classList.remove('active');
    tabReg.classList.add('active');
    groupName.classList.remove('hidden');
    submitText.textContent = 'Buat Akun & Sinkronkan';
  }

  const emailField = document.getElementById('authEmail');
  if (emailField && !emailField.value) {
    emailField.value = 'matthewajovan@gmail.com';
  }

  modal.classList.remove('hidden');
  document.getElementById('authEmail')?.focus();
}

function closeAuthModal() {
  document.getElementById('authModalOverlay')?.classList.add('hidden');
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
    showAuthAlert('Email dan kata sandi wajib diisi.', 'error');
    return;
  }

  if (password.length < 6) {
    showAuthAlert('Kata sandi minimal 6 karakter.', 'error');
    return;
  }

  if (!isSupabaseConfigured()) {
    showAuthAlert('Kredensial Supabase belum terpasang. Klik tombol "Atur Kredensial Supabase" di bawah.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitText.textContent = 'Memproses... ⏳';

  try {
    if (activeAuthMode === 'login') {
      const data = await loginWithEmail(email, password);
      state.currentUser = data.user;

      if (isUserAdmin(data.user)) {
        state.isAdmin = true;
        localStorage.setItem('plancraft_active_account', 'admin');
        localStorage.removeItem('plancraft_logged_out');
        const client = getSupabase();
        client?.auth?.updateUser({
          data: {
            role: 'admin',
            is_admin: true,
            display_name: 'jovan matthew adderson'
          }
        }).catch(() => {});
      }

      updateUserUI();
      closeAuthModal();
      playUiSound('chime');
      triggerConfetti();
      showToast(`Selamat datang kembali, ${data.user.email}!`, 'success');
      await loadUserData(data.user.id);
    } else {
      const data = await registerWithEmail(email, password, displayName);
      if (data.session) {
        state.currentUser = data.user;
        updateUserUI();
        closeAuthModal();
        playUiSound('chime');
        triggerConfetti();
        showToast('Akun berhasil dibuat dan terhubung!', 'success');
        await loadUserData(data.user.id);
      } else {
        // Kasus jika Supabase memerlukan konfirmasi email
        showAuthAlert('Pendaftaran berhasil! Cek email Anda untuk konfirmasi aktivasi akun, lalu masuk kembali.', 'success');
      }
    }
  } catch (err) {
    showAuthAlert(err.message || 'Terjadi kesalahan saat otentikasi.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = activeAuthMode === 'login' ? 'Masuk Sekarang' : 'Buat Akun & Sinkronkan';
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
  if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
    playUiSound('click');
    await logoutUser();
    state.currentUser = null;
    updateUserUI();
    closeProfileModal();
    loadLocalSchedules('guest');
    showToast('Anda telah keluar dari akun.', 'info');
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
    showToast('Project URL dan Anon Key wajib diisi.', 'warning');
    return;
  }

  saveSupabaseCredentials(url, key);
  closeSupabaseConfigModal();
  showToast('Kredensial Supabase disimpan! Memeriksa koneksi...', 'info');

  await initSupabaseSession();

  if (isSupabaseConfigured()) {
    playUiSound('chime');
    showToast('🟢 Berhasil terhubung ke Supabase! Silakan masuk ke akun Anda.', 'success');
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
    showToast('⚠️ Akses Ditolak: Hanya akun Administrator yang dapat mengakses panel ini.', 'error');
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
  if (statPing) statPing.textContent = 'Mengukur...';

  const startTime = performance.now();
  try {
    const stats = await fetchAdminDatabaseStats();
    const duration = Math.round(performance.now() - startTime);

    if (statSched) statSched.textContent = stats.totalSchedules;
    if (statNotes) statNotes.textContent = stats.totalNotes;
    if (statUsers) statUsers.textContent = stats.distinctUsers;
    if (statPing) statPing.textContent = `${duration} ms (Online)`;
  } catch (err) {
    console.warn('Gagal memuat statistik admin:', err);
    if (statPing) statPing.textContent = 'Error';
  }
}

async function toggleAdminGlobalMode() {
  state.adminModeAllSchedules = !state.adminModeAllSchedules;
  const toggle = document.getElementById('toggleAdminGlobalView');
  if (toggle) toggle.checked = state.adminModeAllSchedules;

  playUiSound('pop');
  if (state.adminModeAllSchedules) {
    showToast('👑 Mode Pengawas Diaktifkan: Menampilkan seluruh jadwal dari cloud.', 'success');
  } else {
    showToast('👤 Mode Pribadi: Menampilkan jadwal milik Anda saja.', 'info');
  }

  if (state.currentUser) {
    await loadUserData(state.currentUser.id);
  }
}

async function exportAdminMasterBackup() {
  try {
    showToast('Menyiapkan master backup database cloud...', 'info');
    const allSchedules = await fetchAllSchedulesAdmin();
    const stats = await fetchAdminDatabaseStats();

    const masterData = {
      app: 'PlanCraft PRO',
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
    dlAnchor.setAttribute('download', `plancraft-master-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    playUiSound('complete');
    triggerConfetti();
    showToast(`Master backup berhasil diunduh (${allSchedules.length} jadwal cloud)!`, 'success');
  } catch (err) {
    console.error('Gagal export master backup:', err);
    showToast('Gagal mengunduh master backup: ' + err.message, 'error');
  }
}

function copyAdminSqlToClipboard() {
  const sql = `-- ==============================================================================
-- AKTIVASI ROLE ADMIN: JOVAN MATTHEW ADDERSON
-- ==============================================================================
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb
WHERE id = 'a76b1dfe-9c4d-4be5-be10-808f0355bfaa'
   OR email = 'matthewajovan@gmail.com';`;

  navigator.clipboard.writeText(sql).then(() => {
    playUiSound('pop');
    showToast('📋 Query SQL aktivasi admin berhasil disalin ke clipboard!', 'success');
  }).catch(() => {
    showToast('Gagal menyalin query. Silakan salin dari file supabase-schema.sql', 'warning');
  });
}

function showAdminBroadcastPrompt() {
  const msg = prompt('Masukkan pesan pengumuman sistem untuk ditampilkan ke pengguna:');
  if (msg && msg.trim()) {
    showToast(`📢 PENGUMUMAN ADMIN: ${msg.trim()}`, 'info');
    playUiSound('chime');
  }
}

// ==============================================================================
// 20. DATA EXPORT, IMPORT, & RESET
// ==============================================================================
function exportDataJSON() {
  playUiSound('pop');
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.schedules, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `plancraft-schedules-${formatDateKey(new Date())}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('File backup JSON berhasil diunduh!', 'success');
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
    showToast('Teks JSON tidak boleh kosong.', 'warning');
    return;
  }

  try {
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed)) {
      throw new Error('Data JSON harus berupa array jadwal.');
    }
    state.schedules = parsed;
    playUiSound('complete');

    // Simpan ke local & cloud
    const accKey = state.currentUser ? state.currentUser.id : 'guest';
    localStorage.setItem(`${STORAGE_PREFIX}${accKey}`, JSON.stringify(state.schedules));

    if (state.currentUser && isSupabaseConfigured()) {
      for (const item of parsed) {
        await saveUserSchedule(item, state.currentUser.id).catch(() => {});
      }
    }

    closeImportModal();
    renderApp();
    showToast(`Berhasil mengimpor ${parsed.length} data jadwal!`, 'success');
  } catch (err) {
    showToast('Format JSON salah: ' + err.message, 'danger');
  }
}

async function resetToDefaultData() {
  await resetToIndonesiaCalendar();
}

/** Mereset seluruh jadwal dan menggantinya dengan Kalender Indonesia resmi (Hari Libur Nasional 2025 - 2026) */
async function resetToIndonesiaCalendar() {
  if (!confirm('Hapus seluruh jadwal lama dan muat seluruh Hari Libur & Perayaan Resmi Kalender Indonesia (2025 - 2026)?')) {
    return;
  }
  playUiSound('pop');
  const defaults = getDefaultSchedules();
  state.schedules = [...defaults];
  const accKey = state.currentUser ? state.currentUser.id : 'guest';
  localStorage.setItem(`${STORAGE_PREFIX}${accKey}`, JSON.stringify(state.schedules));

  if (state.currentUser && isSupabaseConfigured()) {
    showToast('Menyimpan Kalender Indonesia ke Supabase...', 'info');
    await purgeOldDummySchedules(state.currentUser.id).catch(() => {});
    await seedInitialSchedulesForUser(state.currentUser.id, defaults).catch(() => {});
  }

  renderApp();
  triggerConfetti();
  showToast(`🇮🇩 Berhasil memuat ${defaults.length} Hari Libur & Perayaan Kalender Indonesia!`, 'success');
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
  showToast(`Tema diganti ke mode ${state.theme === 'dark' ? 'Gelap' : 'Terang'}`, 'info');
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
  showToast(`Efek suara antarmuka ${state.soundEnabled ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
}

function updateSoundIcon() {
  const onIcon = document.querySelector('.sound-on-icon');
  const offIcon = document.querySelector('.sound-off-icon');
  if (!onIcon || !offIcon) return;

  if (state.soundEnabled) {
    onIcon.classList.remove('hidden');
    offIcon.classList.add('hidden');
  } else {
    onIcon.classList.add('hidden');
    offIcon.classList.remove('hidden');
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
  document.getElementById('btnQuickAdminLogin')?.addEventListener('click', () => activateJovanAdminSession(true));

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
  // Header Quick Tools Dropdown & Sidebar Toggle Controls
  // ========================================================================
  const btnHeaderMenu = document.getElementById('btnHeaderMenu');
  const headerDropdownMenu = document.getElementById('headerDropdownMenu');

  function toggleHeaderDropdown(forceState) {
    if (!headerDropdownMenu) return;
    const shouldOpen = forceState !== undefined ? forceState : headerDropdownMenu.classList.contains('hidden');
    if (shouldOpen) {
      headerDropdownMenu.classList.remove('hidden');
      btnHeaderMenu?.setAttribute('aria-expanded', 'true');
      btnHeaderMenu?.classList.add('active');
    } else {
      headerDropdownMenu.classList.add('hidden');
      btnHeaderMenu?.setAttribute('aria-expanded', 'false');
      btnHeaderMenu?.classList.remove('active');
    }
  }

  btnHeaderMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
    playUiSound('pop');
    toggleHeaderDropdown();
  });

  function handleSidebarToggle() {
    playUiSound('click');
    const sidebar = document.getElementById('sidebar');
    const isMobile = window.innerWidth <= 860;
    if (isMobile) {
      sidebar?.classList.toggle('mobile-open');
    } else {
      document.body.classList.toggle('sidebar-collapsed');
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      showToast(isCollapsed ? 'Sidebar disembunyikan (Widescreen Mode)' : 'Sidebar ditampilkan', 'info');
    }
  }

  document.getElementById('btnToggleSidebar')?.addEventListener('click', () => {
    handleSidebarToggle();
    toggleHeaderDropdown(false);
  });

  document.getElementById('btnSyncIndonesiaHolidays')?.addEventListener('click', () => {
    toggleHeaderDropdown(false);
    resetToIndonesiaCalendar();
  });

  // Automatically close dropdown when action modals are opened
  headerDropdownMenu?.querySelectorAll('.hdrop-item').forEach((item) => {
    if (item.id === 'btnOpenPomodoro' || item.id === 'btnSupabaseBadge' || item.id === 'btnSyncIndonesiaHolidays') {
      item.addEventListener('click', () => {
        toggleHeaderDropdown(false);
      });
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (headerDropdownMenu && !headerDropdownMenu.classList.contains('hidden')) {
      if (!headerDropdownMenu.contains(e.target) && !btnHeaderMenu?.contains(e.target)) {
        toggleHeaderDropdown(false);
      }
    }
  });

  // Keyboard shortcut 'B' for sidebar & Escape for dropdown
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && headerDropdownMenu && !headerDropdownMenu.classList.contains('hidden')) {
      toggleHeaderDropdown(false);
    }
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
    showToast('Catatan harian berhasil disimpan.', 'success');
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

// Inisialisasi Aplikasi Saat Memuat
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateSoundIcon();
  initLiveClock();
  initPomodoro();
  setupEventListeners();
  await initSupabaseSession();
});
