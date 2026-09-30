/**
 * ==============================================================================
 * SCHEDULE DATA & CONFIGURATION (PANDUAN MUDAH EDIT DATA)
 * ==============================================================================
 * File ini dirancang khusus agar SANGAT MUDAH DI-EDIT oleh Anda!
 * 
 * 1. Menambah Kategori Baru:
 *    Cukup tambahkan objek baru pada array `CATEGORIES` di bawah.
 * 
 * 2. Mengubah Warna / Icon / Gradien Kategori:
 *    Ganti nilai `color`, `bgColor`, `gradient`, atau `icon` pada kategori yang ingin diubah.
 * 
 * 3. Menambah Jadwal Bawaan (Default Events):
 *    Tambahkan item pada fungsi `getDefaultSchedules()`.
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. DAFTAR KATEGORI JADWAL DENGAN GRADIEN MEWAH
// ------------------------------------------------------------------------------
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
// 4. GENERATOR JADWAL BAWAAN (DINAMIS TERHADAP HARI INI)
// ------------------------------------------------------------------------------
export function getDefaultSchedules() {
  const now = new Date();
  
  // Helper membuat format tanggal YYYY-MM-DD
  const formatOffsetDate = (dayOffset = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return [
    {
      id: 'sch-001',
      title: 'Sesi Lari Pagi & Hidrasi Kardio',
      category: 'health',
      date: formatOffsetDate(0), // Hari ini
      startTime: '06:30',
      endTime: '07:30',
      priority: 'medium',
      status: 'completed',
      location: 'Taman Kota / Fitness Track',
      description: 'Lari 4km untuk menjaga stamina, dilanjutkan stretching dan sarapan sehat.',
      checklist: [
        { text: 'Pemanasan & stretching 10 menit', done: true },
        { text: 'Lari pagi 4 km santai', done: true },
        { text: 'Minum air 500ml + protein shake', done: true }
      ]
    },
    {
      id: 'sch-002',
      title: 'Daily Standup & Sync Tim Produk',
      category: 'meeting',
      date: formatOffsetDate(0), // Hari ini
      startTime: '09:30',
      endTime: '10:30',
      priority: 'high',
      status: 'in_progress',
      location: 'Google Meet (meet.google.com/xyz-prod)',
      description: 'Sinkronisasi prioritas mingguan, penyelarasan roadmap fitur baru, dan evaluasi bug sprint.',
      checklist: [
        { text: 'Review metrik performa sprint', done: true },
        { text: 'Penyelarasan tim UI/UX dan Frontend', done: true },
        { text: 'Bahas integrasi API pembayaran', done: false }
      ]
    },
    {
      id: 'sch-003',
      title: 'Refactor Design System & Glassmorphic UI',
      category: 'work',
      date: formatOffsetDate(0), // Hari ini
      startTime: '13:30',
      endTime: '15:30',
      priority: 'high',
      status: 'scheduled',
      location: 'Workstation Utama Studio',
      description: 'Implementasi tema ultra-modern, ambient glow orbs, micro-animations, dan command palette.',
      checklist: [
        { text: 'Polish gradien dan shadows', done: false },
        { text: 'Uji responsivitas tablet dan mobile', done: false },
        { text: 'Tambahkan sound synthesizers Web Audio', done: false }
      ]
    },
    {
      id: 'sch-004',
      title: 'Coffee Break & Eksplorasi Tech Trends',
      category: 'personal',
      date: formatOffsetDate(0), // Hari ini
      startTime: '16:30',
      endTime: '17:15',
      priority: 'low',
      status: 'todo',
      location: 'Lounge Kafe Artisan',
      description: 'Menikmati latte hangat sambil membaca rilis artikel web dev dan AI agents terbaru.',
      checklist: []
    },
    {
      id: 'sch-005',
      title: 'Deadline Pengiriman Proposal Klien',
      category: 'deadline',
      date: formatOffsetDate(1), // Besok
      startTime: '10:00',
      endTime: '11:30',
      priority: 'high',
      status: 'scheduled',
      location: 'Portal Stakeholder / Pitch Deck',
      description: 'Submit dokumen proposal final beserta kalkulasi timeline dan skema arsitektur.',
      checklist: [
        { text: 'Cek ulang estimasi anggaran biaya', done: false },
        { text: 'Export PDF resolusi tinggi', done: false },
        { text: 'Kirim email pengantar resmi', done: false }
      ]
    },
    {
      id: 'sch-006',
      title: 'Deep Work: Eksplorasi AI Agents & SDK',
      category: 'study',
      date: formatOffsetDate(1), // Besok
      startTime: '14:00',
      endTime: '16:30',
      priority: 'medium',
      status: 'todo',
      location: 'Lab Riset Pribadi',
      description: 'Eksperimen integrasi model reasoning dan automation pipeline.',
      checklist: [
        { text: 'Setup environment isolated', done: false },
        { text: 'Jalankan benchmark performa', done: false }
      ]
    },
    {
      id: 'sch-007',
      title: '1-on-1 Mentoring Arsitektur Kode',
      category: 'meeting',
      date: formatOffsetDate(2), // 2 hari lagi
      startTime: '11:00',
      endTime: '12:00',
      priority: 'medium',
      status: 'scheduled',
      location: 'Zoom Meeting Room',
      description: 'Sharing session praktik clean code, pemisahan dependensi, dan prinsip SOLID.',
      checklist: []
    },
    {
      id: 'sch-008',
      title: 'Pemeriksaan Kesehatan Berkala & Dental',
      category: 'health',
      date: formatOffsetDate(3), // 3 hari lagi
      startTime: '15:00',
      endTime: '16:15',
      priority: 'medium',
      status: 'scheduled',
      location: 'Klinik Medika Utama',
      description: 'Pemeriksaan rutin kesehatan mata dan gigi secara komprehensif.',
      checklist: []
    },
    {
      id: 'sch-009',
      title: 'Santai Akhir Pekan & Barbeque Bersama',
      category: 'personal',
      date: formatOffsetDate(4), // 4 hari lagi
      startTime: '17:00',
      endTime: '20:30',
      priority: 'low',
      status: 'todo',
      location: 'Taman Belakang Rumah',
      description: 'Waktu berkualitas bersama teman dan keluarga menikmati santapan barbeque.',
      checklist: []
    },
    {
      id: 'sch-010',
      title: 'Rilis Besar Produksi PlanCraft v2.5',
      category: 'deadline',
      date: formatOffsetDate(6), // 6 hari lagi
      startTime: '09:00',
      endTime: '11:00',
      priority: 'high',
      status: 'scheduled',
      location: 'Cloud Infrastructure Pipeline',
      description: 'Deployment live production, monitoring log server, dan pengumuman update fitur.',
      checklist: [
        { text: 'Verifikasi build & asset compression', done: false },
        { text: 'Deploy ke global edge CDN', done: false },
        { text: 'Publikasi changelog resmi', done: false }
      ]
    }
  ];
}
