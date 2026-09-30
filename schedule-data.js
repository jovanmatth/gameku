/**
 * ==============================================================================
 * SCHEDULE DATA & CONFIGURATION (KALENDER INDONESIA & HARI LIBUR NASIONAL)
 * ==============================================================================
 * File ini memuat konfigurasi kategori jadwal, tingkat prioritas, dan database
 * Hari Libur Nasional & Hari Peringatan Resmi Kalender Indonesia.
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. PUBLIC HOLIDAYS & TASK CATEGORIES
// ------------------------------------------------------------------------------
export const HOLIDAY_CATEGORY = {
  id: 'holiday',
  name: 'Public Holiday',
  nameEn: 'Public Holiday',
  color: '#ef4444',
  gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
  bgColor: 'rgba(239, 68, 68, 0.16)',
  borderColor: '#f87171',
  icon: '🇮🇩'
};

export const CATEGORIES = [
  {
    id: 'work',
    name: 'Work',
    nameEn: 'Work',
    color: '#6366f1',       // Indigo
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    bgColor: 'rgba(99, 102, 241, 0.16)',
    borderColor: '#818cf8',
    icon: '💼'
  },
  {
    id: 'meeting',
    name: 'Meeting',
    nameEn: 'Meeting',
    color: '#f59e0b',       // Amber Gold
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bgColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: '#fbbf24',
    icon: '👥'
  },
  {
    id: 'deadline',
    name: 'Important Deadline',
    nameEn: 'Important Deadline',
    color: '#f43f5e',       // Rose Neon
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    bgColor: 'rgba(244, 63, 94, 0.16)',
    borderColor: '#fb7185',
    icon: '🚨'
  },
  {
    id: 'study',
    name: 'Study & Research',
    nameEn: 'Study & Research',
    color: '#0ea5e9',       // Sky Cyan
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
    bgColor: 'rgba(14, 165, 233, 0.16)',
    borderColor: '#38bdf8',
    icon: '📚'
  },
  {
    id: 'personal',
    name: 'Personal & Leisure',
    nameEn: 'Personal & Leisure',
    color: '#10b981',       // Emerald
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    bgColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: '#34d399',
    icon: '☕'
  },
  {
    id: 'health',
    name: 'Health & Fitness',
    nameEn: 'Health & Fitness',
    color: '#a855f7',       // Purple Violet
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
    bgColor: 'rgba(168, 85, 247, 0.16)',
    borderColor: '#c084fc',
    icon: '🏃‍♂️'
  }
];

// ------------------------------------------------------------------------------
// 2. TASK PRIORITIES LIST WITH GLOW
// ------------------------------------------------------------------------------
export const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', icon: '🟢' },
  { id: 'medium', label: 'Medium', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', icon: '🟡' },
  { id: 'high', label: 'High', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', icon: '🔴' }
];

// ------------------------------------------------------------------------------
// 3. TASK STATUSES LIST
// ------------------------------------------------------------------------------
export const STATUSES = [
  { id: 'todo', label: 'To Do', color: '#94a3b8', icon: '📋' },
  { id: 'in_progress', label: 'In Progress', color: '#38bdf8', icon: '⚡' },
  { id: 'scheduled', label: 'Scheduled', color: '#818cf8', icon: '📅' },
  { id: 'completed', label: 'Completed', color: '#34d399', icon: '✅' }
];

// ------------------------------------------------------------------------------
// 4. CALENDAR HOLIDAYS & OFFICIAL CELEBRATIONS DATABASE
// ------------------------------------------------------------------------------
export function getDefaultSchedules() {
  return [
    // =========================================================================
    // CALENDAR 2026 (PUBLIC HOLIDAYS & NATIONAL OBSERVANCES)
    // =========================================================================
    {
      id: 'idn-2026-01-01',
      title: 'New Year\'s Day 2026 🎆',
      category: 'holiday',
      date: '2026-01-01',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for New Year\'s Day 2026. A fresh beginning with productive goals and resolutions.',
      checklist: [{ text: 'New Year celebration & 2026 goal reflection', done: true }]
    },
    {
      id: 'idn-2026-01-16',
      title: 'Isra and Mi\'raj 1447 H 🕌',
      category: 'holiday',
      date: '2026-01-16',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday commemorating the miraculous night journey of Prophet Muhammad SAW.',
      checklist: [{ text: 'Prayer & spiritual remembrance of Isra Mi\'raj', done: false }]
    },
    {
      id: 'idn-2026-02-17',
      title: 'Chinese New Year 2577 🏮',
      category: 'holiday',
      date: '2026-02-17',
      startTime: '08:00',
      endTime: '20:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Chinese New Year 2577 (Year of the Fire Horse). Family gatherings & cultural festival.',
      checklist: [{ text: 'Family gathering & celebration', done: false }]
    },
    {
      id: 'idn-2026-03-20',
      title: 'Eid al-Fitr 1447 H (Day 1) 🌙',
      category: 'holiday',
      date: '2026-03-20',
      startTime: '06:00',
      endTime: '21:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Eid al-Fitr 1 Syawal 1447 H. Eid prayers, family visits, and shared forgiveness.',
      checklist: [
        { text: 'Congregational Eid prayer', done: false },
        { text: 'Family visits & celebration', done: false }
      ]
    },
    {
      id: 'idn-2026-03-21',
      title: 'Eid al-Fitr 1447 H (Day 2) & Nyepi 1948 🕊️',
      category: 'holiday',
      date: '2026-03-21',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Eid al-Fitr Day 2 coinciding with Nyepi (Balinese Saka New Year 1948).',
      checklist: [
        { text: 'Eid celebration day two', done: false },
        { text: 'Respect the silent contemplation of Nyepi', done: false }
      ]
    },
    {
      id: 'idn-2026-04-03',
      title: 'Good Friday ✝️',
      category: 'holiday',
      date: '2026-04-03',
      startTime: '09:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday commemorating the Crucifixion of Jesus Christ (Good Friday). Church service & spiritual reflection.',
      checklist: [{ text: 'Good Friday church service', done: false }]
    },
    {
      id: 'idn-2026-04-05',
      title: 'Easter Sunday 2026 🐣',
      category: 'holiday',
      date: '2026-04-05',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'Commemoration of the Resurrection of Jesus Christ (Easter). Thanksgiving service & family celebration.',
      checklist: [{ text: 'Easter Sunday church service', done: false }]
    },
    {
      id: 'idn-2026-04-21',
      title: 'Kartini Day 🌺',
      category: 'holiday',
      date: '2026-04-21',
      startTime: '08:00',
      endTime: '16:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National commemoration honoring Raden Ajeng Kartini, pioneer of women\'s empowerment and education in Indonesia.',
      checklist: [{ text: 'Kartini Day remembrance & honoring women', done: false }]
    },
    {
      id: 'idn-2026-05-01',
      title: 'International Workers\' Day (May Day) ✊',
      category: 'holiday',
      date: '2026-05-01',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for International Workers\' Day. Honoring the dedication and hard work of workers nationwide.',
      checklist: [{ text: 'Rest & worker appreciation day', done: false }]
    },
    {
      id: 'idn-2026-05-02',
      title: 'National Education Day 🎓',
      category: 'holiday',
      date: '2026-05-02',
      startTime: '08:00',
      endTime: '11:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'Commemoration of Ki Hadjar Dewantara\'s birthday, championing education for all in Indonesia.',
      checklist: [{ text: 'Flag ceremony & reflection on national education', done: false }]
    },
    {
      id: 'idn-2026-05-14',
      title: 'Ascension Day of Jesus Christ 🕊️',
      category: 'holiday',
      date: '2026-05-14',
      startTime: '09:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday commemorating the Ascension of Jesus Christ into heaven. Church worship service.',
      checklist: [{ text: 'Ascension Day church service', done: false }]
    },
    {
      id: 'idn-2026-05-27',
      title: 'Eid al-Adha 1447 H (Feast of Sacrifice) 🐑',
      category: 'holiday',
      date: '2026-05-27',
      startTime: '06:00',
      endTime: '17:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Eid al-Adha 10 Dzulhijjah 1447 H. Congregational prayers & Qurban charity distribution.',
      checklist: [
        { text: 'Congregational Eid al-Adha prayer', done: false },
        { text: 'Qurban sacrifice & distribution to those in need', done: false }
      ]
    },
    {
      id: 'idn-2026-05-31',
      title: 'Waisak Day (Vesak) 2570 BE 🪷',
      category: 'holiday',
      date: '2026-05-31',
      startTime: '08:00',
      endTime: '22:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩 / Borobudur Temple',
      description: 'National Public Holiday for Vesak 2570 Buddhist Era. Borobudur lantern release and prayers for universal peace.',
      checklist: [{ text: 'Meditation & Vesak prayer', done: false }]
    },
    {
      id: 'idn-2026-06-01',
      title: 'Pancasila Day 🦅',
      category: 'holiday',
      date: '2026-06-01',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday celebrating the birth of Indonesia\'s state philosophy, Pancasila (June 1, 1945). Unity in Diversity.',
      checklist: [{ text: 'National Pancasila Day ceremony', done: false }]
    },
    {
      id: 'idn-2026-06-16',
      title: 'Islamic New Year 1448 H (1 Muharram) 🌙',
      category: 'holiday',
      date: '2026-06-16',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for the Islamic New Year 1 Muharram 1448 Hijri. Spiritual renewal and new year prayers.',
      checklist: [{ text: 'Year-end and new year Hijri prayers', done: false }]
    },
    {
      id: 'idn-2026-08-17',
      title: 'Indonesian Independence Day (81st Anniversary) 🇮🇩',
      category: 'holiday',
      date: '2026-08-17',
      startTime: '08:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩 / Merdeka Palace',
      description: 'National Day commemorating Indonesia\'s Proclamation of Independence (August 17, 1945). Flag ceremonies and festive celebrations.',
      checklist: [
        { text: 'Raise the Red and White National Flag', done: true },
        { text: 'Watch Independence Day ceremony broadcast', done: false },
        { text: 'Community celebration and games', done: false }
      ]
    },
    {
      id: 'idn-2026-08-25',
      title: 'Mawlid of Prophet Muhammad SAW 1448 H 🕌',
      category: 'holiday',
      date: '2026-08-25',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday commemorating the birth of Prophet Muhammad SAW (12 Rabiul Awal 1448 H).',
      checklist: [{ text: 'Religious gathering & Mawlid celebration', done: false }]
    },
    {
      id: 'idn-2026-09-30',
      title: 'G30S Memorial Day 🇮🇩',
      category: 'holiday',
      date: '2026-09-30',
      startTime: '06:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Memorial Day honoring the fallen Revolutionary Heroes. Flying flags at half-mast in solemn remembrance.',
      checklist: [{ text: 'Fly flag at half-mast in solemn national remembrance', done: true }]
    },
    {
      id: 'idn-2026-10-01',
      title: 'Pancasila Sanctity Day 🛡️',
      category: 'holiday',
      date: '2026-10-01',
      startTime: '08:00',
      endTime: '10:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩 / Pancasila Sakti Monument',
      description: 'National Memorial Day reaffirming the steadfast resolve and defense of the Pancasila ideology. Full mast flag ceremony.',
      checklist: [{ text: 'Ceremony & fly flag at full mast', done: false }]
    },
    {
      id: 'idn-2026-10-05',
      title: 'Indonesian Armed Forces (TNI) Day (81st Ann.) ⚔️',
      category: 'holiday',
      date: '2026-10-05',
      startTime: '08:00',
      endTime: '14:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'TNI HQ / Across Indonesia 🇮🇩',
      description: 'National Commemoration for the 81st Anniversary of the Indonesian National Armed Forces.',
      checklist: [{ text: 'Watch defense equipment parade & military ceremony', done: false }]
    },
    {
      id: 'idn-2026-10-02',
      title: 'National Batik Day 🎨',
      category: 'holiday',
      date: '2026-10-02',
      startTime: '08:00',
      endTime: '17:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'Celebration of Indonesian Batik inscribed by UNESCO as an Intangible Cultural Heritage of Humanity on Oct 2, 2009.',
      checklist: [{ text: 'Wear traditional Indonesian batik attire', done: true }]
    },
    {
      id: 'idn-2026-10-28',
      title: 'Youth Pledge Day (28 October) 🇮🇩',
      category: 'holiday',
      date: '2026-10-28',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'Commemorating the historic 1928 Youth Pledge: One Motherland, One Nation, and One Language: Indonesia.',
      checklist: [{ text: 'Commemorate the spirit of Youth Pledge', done: false }]
    },
    {
      id: 'idn-2026-11-10',
      title: 'National Heroes\' Day 🎖️',
      category: 'holiday',
      date: '2026-11-10',
      startTime: '08:00',
      endTime: '11:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩 / Heroes Monument',
      description: 'Commemorating the Battle of Surabaya (November 10, 1945) in honor of heroes who fought for Indonesian freedom.',
      checklist: [{ text: '60 seconds of silent prayer honoring national heroes', done: false }]
    },
    {
      id: 'idn-2026-11-25',
      title: 'National Teachers\' Day 📚',
      category: 'holiday',
      date: '2026-11-25',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Teachers\' Day honoring teachers and educators for their dedicated service to the nation.',
      checklist: [{ text: 'Express appreciation and gratitude to teachers', done: false }]
    },
    {
      id: 'idn-2026-12-22',
      title: 'National Mother\'s Day 💐',
      category: 'holiday',
      date: '2026-12-22',
      startTime: '08:00',
      endTime: '20:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'Indonesian Mother\'s Day commemorating the first Indonesian Women\'s Congress in 1928. Celebrating love and gratitude for mothers.',
      checklist: [{ text: 'Send heartfelt appreciation & special gift to mother', done: false }]
    },
    {
      id: 'idn-2026-12-25',
      title: 'Christmas Day 2026 🎄',
      category: 'holiday',
      date: '2026-12-25',
      startTime: '08:00',
      endTime: '22:00',
      priority: 'none', isHoliday: true,
      status: 'scheduled',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday celebrating the birth of Jesus Christ. Peace on earth, good will toward men.',
      checklist: [
        { text: 'Christmas church service with family', done: false },
        { text: 'Family gathering & holiday fellowship', done: false }
      ]
    },

    // =========================================================================
    // CALENDAR 2025 (PUBLIC HOLIDAYS & NATIONAL OBSERVANCES)
    // =========================================================================
    {
      id: 'idn-2025-01-01',
      title: 'New Year\'s Day 2025 🎆',
      category: 'holiday',
      date: '2025-01-01',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for New Year\'s Day 2025.',
      checklist: []
    },
    {
      id: 'idn-2025-01-27',
      title: 'Isra and Mi\'raj 1446 H 🕌',
      category: 'holiday',
      date: '2025-01-27',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Isra and Mi\'raj 1446 H.',
      checklist: []
    },
    {
      id: 'idn-2025-01-29',
      title: 'Chinese New Year 2576 🏮',
      category: 'holiday',
      date: '2025-01-29',
      startTime: '08:00',
      endTime: '20:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Chinese New Year 2576 (Year of the Wood Snake).',
      checklist: []
    },
    {
      id: 'idn-2025-03-29',
      title: 'Nyepi (Balinese Saka New Year 1947) 🕊️',
      category: 'holiday',
      date: '2025-03-29',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Nyepi Saka New Year 1947.',
      checklist: []
    },
    {
      id: 'idn-2025-03-31',
      title: 'Eid al-Fitr 1446 H (Day 1) 🌙',
      category: 'holiday',
      date: '2025-03-31',
      startTime: '06:00',
      endTime: '21:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'Eid al-Fitr 1 Syawal 1446 H.',
      checklist: []
    },
    {
      id: 'idn-2025-04-01',
      title: 'Eid al-Fitr 1446 H (Day 2) 🌙',
      category: 'holiday',
      date: '2025-04-01',
      startTime: '06:00',
      endTime: '21:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'Eid al-Fitr 2 Syawal 1446 H.',
      checklist: []
    },
    {
      id: 'idn-2025-04-18',
      title: 'Good Friday ✝️',
      category: 'holiday',
      date: '2025-04-18',
      startTime: '09:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'Commemoration of Good Friday.',
      checklist: []
    },
    {
      id: 'idn-2025-05-01',
      title: 'International Workers\' Day (May Day) ✊',
      category: 'holiday',
      date: '2025-05-01',
      startTime: '00:00',
      endTime: '23:59',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for International Workers\' Day 2025.',
      checklist: []
    },
    {
      id: 'idn-2025-05-12',
      title: 'Waisak Day (Vesak) 2569 BE 🪷',
      category: 'holiday',
      date: '2025-05-12',
      startTime: '08:00',
      endTime: '22:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Vesak 2569 BE.',
      checklist: []
    },
    {
      id: 'idn-2025-05-29',
      title: 'Ascension Day of Jesus Christ 🕊️',
      category: 'holiday',
      date: '2025-05-29',
      startTime: '09:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Ascension Day of Jesus Christ.',
      checklist: []
    },
    {
      id: 'idn-2025-06-01',
      title: 'Pancasila Day 🦅',
      category: 'holiday',
      date: '2025-06-01',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'Commemoration of Pancasila Day June 1, 2025.',
      checklist: []
    },
    {
      id: 'idn-2025-06-06',
      title: 'Eid al-Adha 1446 H 🐑',
      category: 'holiday',
      date: '2025-06-06',
      startTime: '06:00',
      endTime: '17:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Eid al-Adha 1446 H.',
      checklist: []
    },
    {
      id: 'idn-2025-06-27',
      title: 'Islamic New Year 1447 H 🌙',
      category: 'holiday',
      date: '2025-06-27',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for 1 Muharram 1447 H.',
      checklist: []
    },
    {
      id: 'idn-2025-08-17',
      title: 'Indonesian Independence Day (80th Anniversary) 🇮🇩',
      category: 'holiday',
      date: '2025-08-17',
      startTime: '08:00',
      endTime: '18:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'Indonesian Independence Day 80th Anniversary.',
      checklist: []
    },
    {
      id: 'idn-2025-09-05',
      title: 'Mawlid of Prophet Muhammad SAW 1447 H 🕌',
      category: 'holiday',
      date: '2025-09-05',
      startTime: '08:00',
      endTime: '12:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Mawlid of Prophet Muhammad SAW 1447 H.',
      checklist: []
    },
    {
      id: 'idn-2025-12-25',
      title: 'Christmas Day 2025 🎄',
      category: 'holiday',
      date: '2025-12-25',
      startTime: '08:00',
      endTime: '22:00',
      priority: 'none', isHoliday: true,
      status: 'completed',
      location: 'Across Indonesia 🇮🇩',
      description: 'National Public Holiday for Christmas Day 2025.',
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

