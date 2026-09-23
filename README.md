# ⚡ OutMedia - Hybrid TikTok Feed & Discord Voice Spaces

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![WebRTC](https://img.shields.io/badge/WebRTC-Real--Time-orange.svg)
![WebSocket](https://img.shields.io/badge/WebSocket-RFC6455-brightgreen.svg)

Platform media sosial hibrida modern yang memadukan keunggulan **TikTok** (video feed vertikal 9:16 snap-scroll) dan **Discord** (Server komunitas, Text Channels, Direct Messages, dan WebRTC Voice Spaces dengan Voice Activity Detection).

---

## ✨ Fitur Utama

### 🎬 TikTok Feed Engine
- **Vertical Snap-Scrolling**: Transisi geser vertikal mulus ala TikTok (`scroll-snap-type: y mandatory`).
- **Autoplay / Auto-Pause**: Berbasis `IntersectionObserver` hemat memori dan bandwidth.
- **Double-Tap Floating Heart**: Animasi ledakan hati melayang tepat pada koordinat klik/tap ganda.
- **Action Sidebar**: Follow (+) button, Like counter dinamis, Comment sheet, Share, dan piringan hitam musik berputar (*spinning vinyl disc*).
- **Video Creator / Uploader**: Unggah video lokal MP4/WebM, rekam langsung via kamera web, atau pilih preset animasi dengan caption dan musik latar.

### 🔊 Discord Servers & WebRTC Voice Spaces
- **Server Rail**: Navigasi server vertikal khas Discord ("OutMedia Official", "Gamer Squad ID", "TikTok Creator Lab").
- **Kanal Teks & Suara**: Pemisahan kanal obrolan teks dan ruang suara.
- **WebRTC Voice Room**: Pengguna dapat bergabung dan keluar dari saluran suara secara instan.
- **Voice Activity Detection (VAD)**: Dilengkapi deteksi volume mikrofon nyata via Web Audio API. Avatar pengguna menyala dengan **lingkaran hijau berdenyut (*green glowing halo*)** saat berbicara.
- **Audio Control Dock**: Mute Microphone, Deafen Audio, dan fitur Berbagi Layar (*Screen Share*).

### 💬 Direct Messages & Friends Hub
- **Presence Real-Time**: Status Online (hijau), Idle (kuning), DND (merah), dan Offline (abu-abu).
- **Friends Hub**: Filter tab Teman Online, Semua, Permintaan Masuk (*Pending*), dan Tambah Teman.
- **Real-Time 1-on-1 Chat**: Pengiriman pesan instan via WebSocket, *typing indicator*, dan reaksi emoji (👍, ❤️, 🔥, 😂).

### 🗄️ Database Schema ([prisma/schema.prisma](prisma/schema.prisma))
- Skema PostgreSQL / Prisma relasional untuk `User`, `Video`, `Friendship`, `DirectMessage`, `Server`, `ServerMember`, `Channel`, `ChannelMessage`, dan `VoiceState`.

---

## 🚀 Panduan Memulai

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.

### 2. Menjalankan Server Lokal
Clone repositori dan jalankan server langsung tanpa perlu instalasi modul tambahan:

```bash
# Menjalankan server OutMedia
node server.js
# atau
npm start
```

Buka peramban Anda di:
👉 **`http://localhost:3000`**

---

## 📂 Struktur Proyek

```text
├── index.html            # Layout utama 3-kolom Discord + Viewport TikTok Feed
├── style.css             # Tema gelap Discord & TikTok neon aesthetics
├── app.js                # Logika platform: WebRTC VAD, WebSocket, Chat, Feed
├── server.js             # Native Node.js HTTP + RFC 6455 WebSocket Server
├── discord-data.js       # Data awal server, channels, friends, dan riwayat chat
├── videos-data.js        # Data video feed vertikal awal
├── prisma/
│   └── schema.prisma     # Skema database Prisma
├── package.json          # Konfigurasi package & scripts
└── .gitignore            # Git ignore rules
```

---

## 📄 Lisensi
Didistribusikan di bawah Lisensi MIT.
