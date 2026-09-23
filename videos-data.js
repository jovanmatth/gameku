// Data Feed Video Awal OutMedia
export const INITIAL_VIDEOS = [
  {
    id: "vid-1",
    author: {
      id: "user-sarah",
      name: "Sarah Aurelia",
      username: "sarahaurelia",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      isFollowed: false,
      isVerified: true
    },
    caption: "Sunset vibes di Pantai Kuta sore ini! Suasananya tenang banget 🌅 Siapa yang rindu liburan ke Bali? #sunset #bali #fyp #travelindonesia #aesthetic",
    sound: {
      title: "Audio Asli - Sarah Aurelia (Chill Lo-Fi Sunset)",
      artist: "Sarah Aurelia",
      cover: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=150&auto=format&fit=crop&q=80"
    },
    // High reliability MP4 vertical videos from CDN
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-vertical-view-of-waves-coming-to-the-beach-at-sunset-41444-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=720&auto=format&fit=crop&q=80",
    theme: "sunset",
    stats: {
      likes: 142500,
      comments: 2840,
      bookmarks: 9320,
      shares: 3120
    },
    isLiked: false,
    isBookmarked: false,
    comments: [
      {
        id: "c-101",
        author: "budi_traveler",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        text: "Kangen banget sama Bali! Terakhir ke sana tahun lalu 😍",
        time: "2 jam lalu",
        likes: 124,
        isLiked: false
      },
      {
        id: "c-102",
        author: "diana_putri",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80",
        text: "Pake filter apa kak? Warnanya cakep banget!",
        time: "1 jam lalu",
        likes: 42,
        isLiked: false
      },
      {
        id: "c-103",
        author: "rizky.vibes",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
        text: "Healing terbaik emang liat ombak senja 🔥✨",
        time: "30 menit lalu",
        likes: 19,
        isLiked: false
      }
    ]
  },
  {
    id: "vid-2",
    author: {
      id: "user-chef-ken",
      name: "Chef Kenzo",
      username: "chefkenzo",
      avatar: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150&auto=format&fit=crop&q=80",
      isFollowed: true,
      isVerified: true
    },
    caption: "Resep rahasia Crispy Golden Potatoes cuma 3 bahan! Renyah di luar, lembut di dalam 🥔🔥 Wajib recook di rumah! #masaksimple #kuliner #reseptiktok #foodie #cooking",
    sound: {
      title: "Cooking Beat - Food Lover Vibes",
      artist: "SoundFX Kitchen",
      cover: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop&q=80"
    },
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-cutting-fresh-vegetables-on-a-wooden-board-42996-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=720&auto=format&fit=crop&q=80",
    theme: "cooking",
    stats: {
      likes: 389200,
      comments: 6512,
      bookmarks: 45200,
      shares: 12400
    },
    isLiked: true,
    isBookmarked: true,
    comments: [
      {
        id: "c-201",
        author: "ibu_muda_kreatif",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
        text: "Langsung praktek besok buat sarapan anak-anak! Makasih chef!",
        time: "4 jam lalu",
        likes: 830,
        isLiked: true
      },
      {
        id: "c-202",
        author: "dimas_ganteng",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        text: "Bumbu rahasianya apa tadi yang bubuk putih chef? Garam kah?",
        time: "2 jam lalu",
        likes: 95,
        isLiked: false
      }
    ]
  },
  {
    id: "vid-3",
    author: {
      id: "user-dance-crew",
      name: "Neon Step Crew",
      username: "neonstepcrew",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isFollowed: false,
      isVerified: true
    },
    caption: "Tutor dance challenge baru nih! Tag temen kamu yang bisa ngikutin gerakan part terakhir tanpa salah tempo! 🕺💃⚡ #dancechallenge #streetdance #fypシ #viral #dancer",
    sound: {
      title: "Electro Bass Drop - Neon Crew Remix",
      artist: "DJ Hype ID",
      cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=80"
    },
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-dancer-dancing-in-a-studio-under-colored-lights-42416-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=720&auto=format&fit=crop&q=80",
    theme: "dance",
    stats: {
      likes: 671000,
      comments: 8900,
      bookmarks: 28400,
      shares: 19800
    },
    isLiked: false,
    isBookmarked: false,
    comments: [
      {
        id: "c-301",
        author: "maya_dancer",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80",
        text: "Transisinya smooth banget parah! Keren pol 🔥🔥",
        time: "5 jam lalu",
        likes: 312,
        isLiked: false
      }
    ]
  },
  {
    id: "vid-4",
    author: {
      id: "user-tech-indra",
      name: "Indra Gadget Review",
      username: "indragadget",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      isFollowed: false,
      isVerified: true
    },
    caption: "Fitur tersembunyi yang 90% pengguna belum tahu! Coba cek pengaturan smartphone kalian sekarang juga 📱⚡ #techtok #tipsandtricks #gadget #android #iphone #teknologi",
    sound: {
      title: "Cyber Synthwave - Tech Beats 2026",
      artist: "Future Labs",
      cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80"
    },
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-using-a-smartphone-at-night-42866-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=720&auto=format&fit=crop&q=80",
    theme: "tech",
    stats: {
      likes: 98400,
      comments: 1420,
      bookmarks: 18200,
      shares: 7200
    },
    isLiked: false,
    isBookmarked: false,
    comments: [
      {
        id: "c-401",
        author: "fajar_it",
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80",
        text: "Baru tau bisa begitu! Berguna banget infonya bang 🙏",
        time: "1 hari lalu",
        likes: 45,
        isLiked: false
      }
    ]
  },
  {
    id: "vid-5",
    author: {
      id: "user-cat-mochi",
      name: "Mochi The Cat",
      username: "mochithecat",
      avatar: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&auto=format&fit=crop&q=80",
      isFollowed: true,
      isVerified: false
    },
    caption: "Mochi waktu minta cemilan vs waktu disuruh mandi 😂 Mukanya ngambek banget astaga! 🐱🐾 #kucinglucu #catsoftiktok #anabul #gemes #hewanpeliharaan",
    sound: {
      title: "Funny Meow Meow Song - Cute Animals",
      artist: "PetSounds",
      cover: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=150&auto=format&fit=crop&q=80"
    },
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-domestic-cat-relaxing-in-the-grass-43896-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=720&auto=format&fit=crop&q=80",
    theme: "animals",
    stats: {
      likes: 852000,
      comments: 11200,
      bookmarks: 64100,
      shares: 34500
    },
    isLiked: true,
    isBookmarked: false,
    comments: [
      {
        id: "c-501",
        author: "chika_catlover",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        text: "GEMES BANGETTT pengen tak cubit pipinyaaa 😭❤️",
        time: "6 jam lalu",
        likes: 1204,
        isLiked: true
      }
    ]
  }
];

// Data Pengguna Saat Ini (Current User Profile)
export const CURRENT_USER = {
  id: "user-me",
  name: "Saya (You)",
  username: "kamu_official",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
  bio: "Creator konten kreatif & penikmat video seru 🚀✨ | Follow yuk buat update harian!",
  followingCount: 142,
  followersCount: "28.5K",
  likesCount: "340.2K",
  createdVideos: []
};

// Data Tren (Trending Discovery)
export const TRENDING_TAGS = [
  { tag: "fyp", count: "14.2B tontonan", isHot: true },
  { tag: "kuliner", count: "3.8B tontonan", isHot: true },
  { tag: "dancechallenge", count: "2.1B tontonan", isHot: false },
  { tag: "techtok", count: "950M tontonan", isHot: false },
  { tag: "sunsetvibes", count: "620M tontonan", isHot: false },
  { tag: "kucinglucu", count: "1.4B tontonan", isHot: true },
  { tag: "masaksimple", count: "890M tontonan", isHot: false }
];

export const NOTIFICATIONS_DATA = [
  {
    id: "notif-1",
    user: "Sarah Aurelia",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    text: "menyukai video Anda.",
    time: "5 menit lalu",
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&auto=format&fit=crop&q=80"
  },
  {
    id: "notif-2",
    user: "Chef Kenzo",
    avatar: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=100&auto=format&fit=crop&q=80",
    text: "membalas komentar Anda: 'Terima kasih sudah nonton!'",
    time: "45 menit lalu",
    thumbnail: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80"
  },
  {
    id: "notif-3",
    user: "Neon Step Crew",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    text: "mulai mengikuti Anda.",
    time: "2 jam lalu",
    thumbnail: null
  },
  {
    id: "notif-4",
    user: "Mochi The Cat",
    avatar: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&auto=format&fit=crop&q=80",
    text: "menyukai komentar Anda.",
    time: "1 hari lalu",
    thumbnail: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&auto=format&fit=crop&q=80"
  }
];
