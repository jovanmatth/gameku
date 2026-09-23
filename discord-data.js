// Initial Data Models for Discord Features (Servers, Channels, Friends, DMs)

export const INITIAL_SERVERS = [
  {
    id: "srv-outmedia",
    name: "OutMedia Official",
    icon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    description: "Komunitas resmi kreator & penikmat konten OutMedia",
    ownerId: "user-me",
    channels: [
      { id: "ch-general", name: "obrolan-santai", type: "TEXT", topic: "Bebas ngobrol apa saja di sini!" },
      { id: "ch-memes", name: "meme-dan-klip", type: "TEXT", topic: "Bagikan klip TikTok & meme terlucu" },
      { id: "ch-music", name: "rekomendasi-lagu", type: "TEXT", topic: "Rekomendasi sound viral dan lo-fi" },
      { id: "vc-lounge", name: "Lounge Suara 1", type: "VOICE", activeUsers: [] },
      { id: "vc-chill", name: "Chill & Ngobrol", type: "VOICE", activeUsers: [] }
    ]
  },
  {
    id: "srv-gamers",
    name: "Gamer Squad ID",
    icon: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=80",
    description: "Mabar santai, scrim, dan diskusi game mobile/PC",
    ownerId: "user-gamer",
    channels: [
      { id: "ch-mabar", name: "cari-tim-mabar", type: "TEXT", topic: "Yuk push rank malam ini" },
      { id: "ch-highlights", name: "video-clutch", type: "TEXT", topic: "Pamer momen clutch gameplay" },
      { id: "vc-squad", name: "Voice Mabar Room", type: "VOICE", activeUsers: [] },
      { id: "vc-duo", name: "Voice Duo Rank", type: "VOICE", activeUsers: [] }
    ]
  },
  {
    id: "srv-creators",
    name: "TikTok Creator Lab",
    icon: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=100&auto=format&fit=crop&q=80",
    description: "Diskusi algoritma, editing, dan kolaborasi kreator",
    ownerId: "user-sarah",
    channels: [
      { id: "ch-algo", name: "diskusi-fyp", type: "TEXT", topic: "Bahas cara masuk FYP terbaru" },
      { id: "ch-collab", name: "ajakan-kolab", type: "TEXT", topic: "Cari partner duet dan stitch" },
      { id: "vc-brainstorm", name: "Voice Brainstorming", type: "VOICE", activeUsers: [] }
    ]
  }
];

export const INITIAL_FRIENDS = [
  {
    id: "user-sarah",
    name: "Sarah Aurelia",
    username: "sarahaurelia",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    status: "ONLINE",
    customStatus: "Sedang edit video sunset 🌅",
    activity: "Mendengarkan Chill Lo-Fi"
  },
  {
    id: "user-chef-ken",
    name: "Chef Kenzo",
    username: "chefkenzo",
    avatar: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150&auto=format&fit=crop&q=80",
    status: "IDLE",
    customStatus: "Lagi nyoba resep kentang renyah 🥔",
    activity: "Away 15m"
  },
  {
    id: "user-dance-crew",
    name: "Neon Step Crew",
    username: "neonstepcrew",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "DND",
    customStatus: "Latihan koreografi jangan diganggu 🔥",
    activity: "Do Not Disturb"
  },
  {
    id: "user-tech-indra",
    name: "Indra Gadget Review",
    username: "indragadget",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    status: "OFFLINE",
    customStatus: "",
    activity: "Terakhir aktif 2 jam lalu"
  }
];

export const INITIAL_FRIEND_REQUESTS = [
  {
    id: "req-1",
    user: {
      id: "user-gamer-budi",
      name: "Budi Pro Gamer",
      username: "budiprogamer",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      mutualFriends: 3
    },
    type: "INCOMING"
  }
];

export const INITIAL_CHANNEL_MESSAGES = {
  "ch-general": [
    {
      id: "msg-101",
      userId: "user-sarah",
      userName: "Sarah Aurelia",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      time: "Hari ini pukul 09:20",
      content: "Halo semuanya! Selamat datang di OutMedia Community ✨ Jangan lupa cek video sunset terbaru di tab feed ya!",
      reactions: [{ emoji: "👋", count: 5, userReacted: true }, { emoji: "❤️", count: 8, userReacted: false }]
    },
    {
      id: "msg-102",
      userId: "user-chef-ken",
      userName: "Chef Kenzo",
      avatar: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=100&auto=format&fit=crop&q=80",
      time: "Hari ini pukul 09:28",
      content: "Siapa yang mau join voice channel Lounge? Mau sharing tips masak kentang goreng super garing nih 🥔🔥",
      reactions: [{ emoji: "🔥", count: 4, userReacted: false }]
    }
  ],
  "ch-memes": [
    {
      id: "msg-201",
      userId: "user-dance-crew",
      userName: "Neon Step Crew",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      time: "Kemarin pukul 21:15",
      content: "Ketika lu udah cape-cape latihan dance challenge TikTok tapi lupa pencet tombol record 😭",
      reactions: [{ emoji: "😂", count: 12, userReacted: true }]
    }
  ]
};

export const INITIAL_DIRECT_MESSAGES = {
  "user-sarah": [
    {
      id: "dm-1",
      senderId: "user-sarah",
      content: "Halo! Kamu udah liat video feed sunset tadi belum?",
      time: "09:30",
      isRead: true
    },
    {
      id: "dm-2",
      senderId: "user-me",
      content: "Udah dong, keren banget warnanya! Pake kamera apa pas shoot?",
      time: "09:32",
      isRead: true
    },
    {
      id: "dm-3",
      senderId: "user-sarah",
      content: "Cuma pake smartphone kok, yang penting dapet momen golden hour-nya. Nanti sore mau join voice channel?",
      time: "09:35",
      isRead: true
    }
  ]
};
