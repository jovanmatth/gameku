/**
 * ==============================================================================
 * SCHEDULE DATA & CONFIGURATION (KALENDER INDONESIA & HARI LIBUR NASIONAL)
 * ==============================================================================
 * File ini memuat konfigurasi kategori jadwal, tingkat prioritas, dan database
 * Hari Libur Nasional & Hari Peringatan Resmi Kalender Indonesia.
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. KATEGORI HARI LIBUR NASIONAL & KATEGORI TUGAS
// ------------------------------------------------------------------------------
export const HOLIDAY_CATEGORY = {
  id: 'holiday',
  name: 'Libur Nasional',
  nameEn: 'National Holiday',
  color: '#ef4444',       // Merah Putih Indonesia
  gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
  bgColor: 'rgba(239, 68, 68, 0.16)',
  borderColor: '#f87171',
  icon: '🇮🇩'
};

export const CATEGORIES = [
  {
    id: 'work',
    name: 'Pekerjaan',
    nameEn: 'Work',
    color: '#6366f1',       // Indigo
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    bgColor: 'rgba(99, 102, 241, 0.16)',
    borderColor: '#818cf8',
    icon: '💼'
  },
  {
    id: 'meeting',
    name: 'Meeting & Rapat',
    nameEn: 'Meeting',
    color: '#f59e0b',       // Amber Gold
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bgColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: '#fbbf24',
    icon: '👥'
  },
  {
    id: 'deadline',
    name: 'Deadline Penting',
    nameEn: 'Deadline',
    color: '#f43f5e',       // Rose Neon
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    bgColor: 'rgba(244, 63, 94, 0.16)',
    borderColor: '#fb7185',
    icon: '🚨'
  },
  {
    id: 'study',
    name: 'Belajar & Riset',
    nameEn: 'Study',
    color: '#0ea5e9',       // Sky Cyan
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
    bgColor: 'rgba(14, 165, 233, 0.16)',
    borderColor: '#38bdf8',
    icon: '📚'
  },
  {
    id: 'personal',
    name: 'Pribadi & Santai',
    nameEn: 'Personal',
    color: '#10b981',       // Emerald
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    bgColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: '#34d399',
    icon: '☕'
  },
  {
    id: 'health',
    name: 'Kesehatan & Olahraga',
    nameEn: 'Health & Fitness',
    color: '#a855f7',       // Purple Violet
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
    bgColor: 'rgba(168, 85, 247, 0.16)',
    borderColor: '#c084fc',
    icon: '🏃‍♂️'
  }
];

// ------------------------------------------------------------------------------
// 2. DAFTAR PRIORITAS JADWAL DENGAN GLOW
// ------------------------------------------------------------------------------
export const PRIORITIES = [
  { id: 'low', label: 'Rendah (Low)', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', icon: '🟢' },
  { id: 'medium', label: 'Sedang (Medium)', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', icon: '🟡' },
  { id: 'high', label: 'Tinggi (High)', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', icon: '🔴' }
];

// ------------------------------------------------------------------------------
// 3. DAFTAR STATUS JADWAL
// ------------------------------------------------------------------------------
export const STATUSES = [
  { id: 'todo', label: 'Rencana (To Do)', color: '#94a3b8', icon: '📋' },
  { id: 'in_progress', label: 'Sedang Berjalan', color: '#38bdf8', icon: '⚡' },
  { id: 'scheduled', label: 'Terjadwal (Scheduled)', color: '#818cf8', icon: '📅' },
  { id: 'completed', label: 'Selesai (Completed)', color: '#34d399', icon: '✅' }
];

// ------------------------------------------------------------------------------
// 4. DATABASE HARI LIBUR & EVENT RESMI KALENDER INDONESIA
// ------------------------------------------------------------------------------
export function getDefaultSchedules() {
  return [
    // =========================================================================
    // KALENDER INDONESIA 2026 (HARI LIBUR NASIONAL & PERINGATAN RESMI)
    // =========================================================================
    {
      id: 'idn-2026-01-01',
      title: 'Tahun Baru 2026 Masehi 🎆',
      category: 'holiday',
      date: '2026-01-01',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Tahun Baru Masehi 2026. Awal lembaran tahun baru dengan resolusi dan harapan produktif.',
      checklist: [{ text: 'Perayaan tahun baru & refleksi resolusi tahun 2026', done: true }]
    },
    {
      id: 'idn-2026-01-16',
      title: 'Isra Mi\'raj Nabi Muhammad SAW 1447 H 🕌',
      category: 'holiday',
      date: '2026-01-16',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional peringatan perjalanan agung Isra Mi\'raj Nabi Muhammad SAW 1447 Hijriah.',
      checklist: [{ text: 'Ibadah & peringatan Isra Mi\'raj', done: false }]
    },
    {
      id: 'idn-2026-02-17',
      title: 'Tahun Baru Imlek 2577 Kongzili 🏮',
      category: 'holiday',
      date: '2026-02-17',
      startTime: '08:00',
      endTime: '20:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Tahun Baru Imlek 2577 Kongzili (Tahun Kuda Api). Silaturahmi keluarga & festival budaya.',
      checklist: [{ text: 'Silaturahmi keluarga & perayaan Imlek', done: false }]
    },
    {
      id: 'idn-2026-03-20',
      title: 'Hari Raya Idul Fitri 1447 H (Hari Pertama) 🌙',
      category: 'holiday',
      date: '2026-03-20',
      startTime: '06:00',
      endTime: '21:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Raya Idul Fitri 1 Syawal 1447 H. Shalat Idul Fitri, silaturahmi akbar, dan saling memaafkan.',
      checklist: [
        { text: 'Shalat Idul Fitri berjamaah', done: false },
        { text: 'Silaturahmi & halalbihalal keluarga besar', done: false }
      ]
    },
    {
      id: 'idn-2026-03-21',
      title: 'Hari Raya Idul Fitri 1447 H (Hari Kedua) & Nyepi 1948 🕊️',
      category: 'holiday',
      date: '2026-03-21',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Idul Fitri Hari ke-2 bertepatan dengan Hari Suci Nyepi (Tahun Baru Saka 1948).',
      checklist: [
        { text: 'Silaturahmi lebaran hari kedua', done: false },
        { text: 'Menghormati perayaan Catur Brata Penyepian', done: false }
      ]
    },
    {
      id: 'idn-2026-04-03',
      title: 'Wafat Yesus Kristus (Jumat Agung) ✝️',
      category: 'holiday',
      date: '2026-04-03',
      startTime: '09:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional peringatan Wafat Yesus Kristus (Jumat Agung). Ibadah kebaktian & refleksi spiritual.',
      checklist: [{ text: 'Ibadah Jumat Agung', done: false }]
    },
    {
      id: 'idn-2026-04-05',
      title: 'Hari Raya Paskah 2026 🐣',
      category: 'holiday',
      date: '2026-04-05',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan Kebangkitan Yesus Kristus (Hari Paskah). Ibadah ucapan syukur & perayaan keluarga.',
      checklist: [{ text: 'Ibadah Minggu Paskah', done: false }]
    },
    {
      id: 'idn-2026-04-21',
      title: 'Hari Kartini 🌺',
      category: 'holiday',
      date: '2026-04-21',
      startTime: '08:00',
      endTime: '16:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari peringatan nasional pelopor emansipasi wanita Indonesia, Raden Ajeng Kartini ("Habis Gelap Terbitlah Terang").',
      checklist: [{ text: 'Peringatan Hari Kartini & apresiasi wanita Indonesia', done: false }]
    },
    {
      id: 'idn-2026-05-01',
      title: 'Hari Buruh Internasional (May Day) ✊',
      category: 'holiday',
      date: '2026-05-01',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Buruh Internasional. Mengapresiasi dedikasi dan kerja keras para pekerja di seluruh tanah air.',
      checklist: [{ text: 'Hari istirahat & apresiasi pekerja Indonesia', done: false }]
    },
    {
      id: 'idn-2026-05-02',
      title: 'Hari Pendidikan Nasional (Hardiknas) 🎓',
      category: 'holiday',
      date: '2026-05-02',
      startTime: '08:00',
      endTime: '11:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan hari lahir Ki Hadjar Dewantara ("Ing Ngarso Sung Tulodo, Ing Madyo Mangun Karso, Tut Wuri Handayani").',
      checklist: [{ text: 'Upacara bendera Hardiknas & refleksi pendidikan bangsa', done: false }]
    },
    {
      id: 'idn-2026-05-14',
      title: 'Kenaikan Yesus Kristus 🕊️',
      category: 'holiday',
      date: '2026-05-14',
      startTime: '09:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional peringatan Kenaikan Yesus Kristus ke surga. Ibadah kebaktian gereja.',
      checklist: [{ text: 'Ibadah Kenaikan Yesus Kristus', done: false }]
    },
    {
      id: 'idn-2026-05-27',
      title: 'Hari Raya Idul Adha 1447 H (Hari Qurban) 🐑',
      category: 'holiday',
      date: '2026-05-27',
      startTime: '06:00',
      endTime: '17:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Raya Idul Adha 10 Dzulhijjah 1447 H. Shalat Idul Adha & penyembelihan hewan qurban.',
      checklist: [
        { text: 'Shalat Idul Adha berjamaah', done: false },
        { text: 'Penyembelihan & pembagian daging qurban', done: false }
      ]
    },
    {
      id: 'idn-2026-05-31',
      title: 'Hari Raya Waisak 2570 BE 🪷',
      category: 'holiday',
      date: '2026-05-31',
      startTime: '08:00',
      endTime: '22:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩 / Candi Borobudur',
      description: 'Hari Libur Nasional Hari Tri Suci Waisak 2570 Buddhist Era. Pelepasan lampion Borobudur & doa perdamaian.',
      checklist: [{ text: 'Meditasi & doa peringatan Waisak', done: false }]
    },
    {
      id: 'idn-2026-06-01',
      title: 'Hari Lahir Pancasila 🦅',
      category: 'holiday',
      date: '2026-06-01',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Peringatan Hari Lahir Dasar Negara Indonesia, Pancasila (1 Juni 1945). Bhinneka Tunggal Ika.',
      checklist: [{ text: 'Upacara kenegaraan Hari Lahir Pancasila', done: false }]
    },
    {
      id: 'idn-2026-06-16',
      title: 'Tahun Baru Islam 1448 H (1 Muharram) 🌙',
      category: 'holiday',
      date: '2026-06-16',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Tahun Baru Islam 1 Muharram 1448 Hijriah. Refleksi spiritual dan doa awal tahun.',
      checklist: [{ text: 'Doa akhir & awal tahun Hijriah', done: false }]
    },
    {
      id: 'idn-2026-08-17',
      title: 'HUT Kemerdekaan RI ke-81 (17 Agustus) 🇮🇩',
      category: 'holiday',
      date: '2026-08-17',
      startTime: '08:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩 / Istana Merdeka',
      description: 'Hari Proklamasi Kemerdekaan Republik Indonesia ke-81. Detik-detik proklamasi, upacara bendera, dan pesta rakyat merah putih.',
      checklist: [
        { text: 'Pengibaran Sang Saka Merah Putih', done: true },
        { text: 'Mengikuti siaran upacara detik-detik Proklamasi', done: false },
        { text: 'Lomba kemerdekaan bersama warga lingkungan', done: false }
      ]
    },
    {
      id: 'idn-2026-08-25',
      title: 'Maulid Nabi Muhammad SAW 1448 H 🕌',
      category: 'holiday',
      date: '2026-08-25',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional memperingati hari kelahiran Nabi Muhammad SAW 12 Rabiul Awal 1448 Hijriah.',
      checklist: [{ text: 'Pengajian & peringatan Maulid Nabi SAW', done: false }]
    },
    {
      id: 'idn-2026-09-30',
      title: 'Peringatan Hari G30S/PKI 🇮🇩',
      category: 'holiday',
      date: '2026-09-30',
      startTime: '06:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan Hari Pemberontakan G30S/PKI untuk mengenang gugurnya para Pahlawan Revolusi. Pengibaran bendera setengah tiang.',
      checklist: [{ text: 'Pengibaran bendera setengah tiang tanda duka nasional', done: true }]
    },
    {
      id: 'idn-2026-10-01',
      title: 'Hari Kesaktian Pancasila 🛡️',
      category: 'holiday',
      date: '2026-10-01',
      startTime: '08:00',
      endTime: '10:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩 / Monumen Pancasila Sakti',
      description: 'Hari peringatan nasional untuk mengenang jasa Pahlawan Revolusi dan kokohnya ideologi Pancasila. Pengibaran bendera satu tiang penuh.',
      checklist: [{ text: 'Upacara Hari Kesaktian Pancasila & bendera satu tiang penuh', done: false }]
    },
    {
      id: 'idn-2026-10-05',
      title: 'HUT Tentara Nasional Indonesia (TNI) ke-81 ⚔️',
      category: 'holiday',
      date: '2026-10-05',
      startTime: '08:00',
      endTime: '14:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Mabes TNI / Seluruh Indonesia 🇮🇩',
      description: 'Peringatan Hari Ulang Tahun Tentara Nasional Indonesia (TNI) ke-81.',
      checklist: [{ text: 'Menyaksikan parade alutsista & upacara HUT TNI', done: false }]
    },
    {
      id: 'idn-2026-10-02',
      title: 'Hari Batik Nasional 🎨',
      category: 'holiday',
      date: '2026-10-02',
      startTime: '08:00',
      endTime: '17:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan penetapan Batik sebagai Warisan Kemanusiaan untuk Budaya Lisan dan Nonbendawi oleh UNESCO pada 2 Oktober 2009.',
      checklist: [{ text: 'Mengenakan busana batik khas Indonesia', done: true }]
    },
    {
      id: 'idn-2026-10-28',
      title: 'Hari Sumpah Pemuda (28 Oktober) 🇮🇩',
      category: 'holiday',
      date: '2026-10-28',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan ikrar pemuda Indonesia 1928: Satu Nusa, Satu Bangsa, dan Satu Bahasa Indonesia.',
      checklist: [{ text: 'Peringatan semangat Sumpah Pemuda', done: false }]
    },
    {
      id: 'idn-2026-11-10',
      title: 'Hari Pahlawan Nasional 🎖️',
      category: 'holiday',
      date: '2026-11-10',
      startTime: '08:00',
      endTime: '11:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩 / Tugu Pahlawan',
      description: 'Peringatan Pertempuran Surabaya 10 November 1945 untuk menghormati jasa dan pengorbanan para pahlawan bangsa.',
      checklist: [{ text: 'Mengheningkan cipta serentak 60 detik untuk para pahlawan', done: false }]
    },
    {
      id: 'idn-2026-11-25',
      title: 'Hari Guru Nasional (HGN) 📚',
      category: 'holiday',
      date: '2026-11-25',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan Hari Guru Nasional dan HUT PGRI sebagai tanda penghormatan dan terima kasih kepada para guru bangsa.',
      checklist: [{ text: 'Apresiasi & terima kasih untuk bapak/ibu guru', done: false }]
    },
    {
      id: 'idn-2026-12-22',
      title: 'Hari Ibu Nasional 💐',
      category: 'holiday',
      date: '2026-12-22',
      startTime: '08:00',
      endTime: '20:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan Hari Ibu Indonesia memperingati Kongres Perempuan Indonesia I tahun 1928. Ungkapan kasih sayang kepada ibu.',
      checklist: [{ text: 'Memberikan ucapan & kado spesial untuk Ibu', done: false }]
    },
    {
      id: 'idn-2026-12-25',
      title: 'Hari Raya Natal 2026 🎄',
      category: 'holiday',
      date: '2026-12-25',
      startTime: '08:00',
      endTime: '22:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Raya Natal memperingati kelahiran Yesus Kristus. Damai di bumi, damai di hati.',
      checklist: [
        { text: 'Ibadah Natal bersama keluarga', done: false },
        { text: 'Silaturahmi & berbagi kebahagiaan Natal', done: false }
      ]
    },

    // =========================================================================
    // KALENDER INDONESIA 2025 (HARI LIBUR NASIONAL & PERINGATAN RESMI)
    // =========================================================================
    {
      id: 'idn-2025-01-01',
      title: 'Tahun Baru 2025 Masehi 🎆',
      category: 'holiday',
      date: '2025-01-01',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Tahun Baru 2025 Masehi.',
      checklist: []
    },
    {
      id: 'idn-2025-01-27',
      title: 'Isra Mi\'raj Nabi Muhammad SAW 1446 H 🕌',
      category: 'holiday',
      date: '2025-01-27',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Isra Mi\'raj Nabi Muhammad SAW 1446 H.',
      checklist: []
    },
    {
      id: 'idn-2025-01-29',
      title: 'Tahun Baru Imlek 2576 Kongzili 🏮',
      category: 'holiday',
      date: '2025-01-29',
      startTime: '08:00',
      endTime: '20:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Tahun Baru Imlek 2576 Kongzili (Tahun Ular Kayu).',
      checklist: []
    },
    {
      id: 'idn-2025-03-29',
      title: 'Hari Suci Nyepi (Tahun Baru Saka 1947) 🕊️',
      category: 'holiday',
      date: '2025-03-29',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Suci Nyepi Tahun Baru Saka 1947.',
      checklist: []
    },
    {
      id: 'idn-2025-03-31',
      title: 'Hari Raya Idul Fitri 1446 H (Hari Ke-1) 🌙',
      category: 'holiday',
      date: '2025-03-31',
      startTime: '06:00',
      endTime: '21:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Raya Idul Fitri 1 Syawal 1446 H.',
      checklist: []
    },
    {
      id: 'idn-2025-04-01',
      title: 'Hari Raya Idul Fitri 1446 H (Hari Ke-2) 🌙',
      category: 'holiday',
      date: '2025-04-01',
      startTime: '06:00',
      endTime: '21:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Raya Idul Fitri 2 Syawal 1446 H.',
      checklist: []
    },
    {
      id: 'idn-2025-04-18',
      title: 'Wafat Yesus Kristus (Jumat Agung) ✝️',
      category: 'holiday',
      date: '2025-04-18',
      startTime: '09:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan Wafat Yesus Kristus.',
      checklist: []
    },
    {
      id: 'idn-2025-05-01',
      title: 'Hari Buruh Internasional (May Day) ✊',
      category: 'holiday',
      date: '2025-05-01',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Buruh Internasional 2025.',
      checklist: []
    },
    {
      id: 'idn-2025-05-12',
      title: 'Hari Raya Waisak 2569 BE 🪷',
      category: 'holiday',
      date: '2025-05-12',
      startTime: '08:00',
      endTime: '22:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Tri Suci Waisak 2569 BE.',
      checklist: []
    },
    {
      id: 'idn-2025-05-29',
      title: 'Kenaikan Yesus Kristus 🕊️',
      category: 'holiday',
      date: '2025-05-29',
      startTime: '09:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Kenaikan Yesus Kristus.',
      checklist: []
    },
    {
      id: 'idn-2025-06-01',
      title: 'Hari Lahir Pancasila 🦅',
      category: 'holiday',
      date: '2025-06-01',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Peringatan Hari Lahir Pancasila 1 Juni 2025.',
      checklist: []
    },
    {
      id: 'idn-2025-06-06',
      title: 'Hari Raya Idul Adha 1446 H 🐑',
      category: 'holiday',
      date: '2025-06-06',
      startTime: '06:00',
      endTime: '17:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Raya Idul Adha 1446 H.',
      checklist: []
    },
    {
      id: 'idn-2025-06-27',
      title: 'Tahun Baru Islam 1447 H 🌙',
      category: 'holiday',
      date: '2025-06-27',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional 1 Muharram 1447 H.',
      checklist: []
    },
    {
      id: 'idn-2025-08-17',
      title: 'HUT Kemerdekaan RI ke-80 🇮🇩',
      category: 'holiday',
      date: '2025-08-17',
      startTime: '08:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'HUT Proklamasi Kemerdekaan RI ke-80.',
      checklist: []
    },
    {
      id: 'idn-2025-09-05',
      title: 'Maulid Nabi Muhammad SAW 1447 H 🕌',
      category: 'holiday',
      date: '2025-09-05',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Maulid Nabi Muhammad SAW 1447 H.',
      checklist: []
    },
    {
      id: 'idn-2025-12-25',
      title: 'Hari Raya Natal 2025 🎄',
      category: 'holiday',
      date: '2025-12-25',
      startTime: '08:00',
      endTime: '22:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Seluruh Indonesia 🇮🇩',
      description: 'Hari Libur Nasional Hari Raya Natal 2025.',
      checklist: []
    }
  ];
}

/**
 * Memeriksa apakah sebuah objek jadwal merupakan jadwal dummy / contoh lama (mock tasks)
 * @param {Object} schedule - Objek jadwal yang akan diperiksa
 * @returns {boolean} True jika merupakan jadwal contoh bawaan lama yang perlu dihapus
 */
export function isOldDummySchedule(schedule) {
  if (!schedule) return false;
  
  // 1. Cek pola ID lama (sch-001 s/d sch-010, atau sch-user-sch-00X)
  const idStr = String(schedule.id || '');
  if (/^sch-0[0-9]{2}$/.test(idStr)) return true;
  if (idStr.includes('-sch-00') || idStr.includes('-sch-010') || idStr.includes('sch-00')) return true;

  // 2. Cek judul kegiatan contoh/dummy lama
  const titleLower = String(schedule.title || '').toLowerCase().trim();
  const dummyKeywords = [
    'sesi lari pagi',
    'daily standup',
    'refactor design system',
    'coffee break',
    'client pitch deck',
    'deep work: core engine',
    'deep work',
    'team brainstorming',
    'quick catch-up',
    'sprint retrospective',
    'workshop ui/ux',
    'sync weekly'
  ];

  return dummyKeywords.some(keyword => titleLower.includes(keyword));
}

