/* ==========================================================================
   OutMedia - Unified Hybrid Platform Application Engine
   Integrates TikTok Vertical Feed + Discord Servers, Channels, WebRTC Voice & DMs
   ========================================================================== */

import { INITIAL_VIDEOS, CURRENT_USER } from './videos-data.js';
import { 
  INITIAL_SERVERS, 
  INITIAL_FRIENDS, 
  INITIAL_FRIEND_REQUESTS, 
  INITIAL_CHANNEL_MESSAGES, 
  INITIAL_DIRECT_MESSAGES 
} from './discord-data.js';

class OutMediaPlatform {
  constructor() {
    // State persistence
    this.user = this.loadState('outmedia_user', CURRENT_USER);
    this.videos = this.loadState('outmedia_videos', INITIAL_VIDEOS);
    this.servers = this.loadState('outmedia_servers', INITIAL_SERVERS);
    this.friends = this.loadState('outmedia_friends', INITIAL_FRIENDS);
    this.friendRequests = this.loadState('outmedia_friend_requests', INITIAL_FRIEND_REQUESTS);
    this.channelMessages = this.loadState('outmedia_channel_messages', INITIAL_CHANNEL_MESSAGES);
    this.directMessages = this.loadState('outmedia_direct_messages', INITIAL_DIRECT_MESSAGES);

    // Active Navigation Context
    this.activeRailTarget = 'dm'; // 'dm', 'tiktok-feed', or serverId
    this.activeServerId = null;
    this.activeChannelId = null;
    this.activeDmUserId = null;
    this.activeFriendsFilter = 'ONLINE'; // 'ONLINE', 'ALL', 'PENDING', 'ADD'

    // Voice & WebRTC State
    this.connectedVoiceChannel = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.isSpeaking = false;
    this.localAudioStream = null;
    this.audioContext = null;
    this.audioAnalyser = null;
    this.vadInterval = null;

    // WebSocket Connection
    this.ws = null;
    this.typingTimeout = null;

    // TikTok Feed State
    this.currentFeedIndex = 0;
    this.isFeedMuted = true;
    this.activeFeedType = 'fyp';

    // Synthesizer Audio
    this.sfxCtx = null;

    this.cacheDom();
    this.init();
  }

  // --- Storage Helper ---
  loadState(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : JSON.parse(JSON.stringify(defaultVal));
    } catch {
      return JSON.parse(JSON.stringify(defaultVal));
    }
  }

  saveState(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }

  // --- DOM Elements Caching ---
  cacheDom() {
    this.appLayout = document.getElementById('app-layout');
    this.toastContainer = document.getElementById('toast-container');

    // Server Rail
    this.railBtnDm = document.getElementById('rail-btn-dm');
    this.railBtnFeed = document.getElementById('rail-btn-feed');
    this.railServersList = document.getElementById('rail-servers-list');
    this.btnAddServerModal = document.getElementById('btn-add-server-modal');

    // Sidebar
    this.sidebarHeaderTitle = document.getElementById('sidebar-header-title');
    this.dmSectionWrapper = document.getElementById('dm-section-wrapper');
    this.serverChannelsWrapper = document.getElementById('server-channels-wrapper');
    this.btnNavFriends = document.getElementById('btn-nav-friends');
    this.badgePendingFriends = document.getElementById('badge-pending-friends');
    this.dmFriendsList = document.getElementById('dm-friends-list');
    this.groupTextChannels = document.getElementById('group-text-channels');
    this.groupVoiceChannels = document.getElementById('group-voice-channels');

    // User Bottom Bar
    this.userBarName = document.getElementById('user-bar-name');
    this.userBarAvatar = document.getElementById('user-bar-avatar');
    this.btnToggleMic = document.getElementById('btn-toggle-mic');
    this.iconMicOn = document.getElementById('icon-mic-on');
    this.iconMicOff = document.getElementById('icon-mic-off');
    this.btnToggleDeafen = document.getElementById('btn-toggle-deafen');
    this.iconDeafenOn = document.getElementById('icon-deafen-on');
    this.iconDeafenOff = document.getElementById('icon-deafen-off');

    // Floating Voice Connected Bar
    this.voiceConnectedBar = document.getElementById('voice-connected-bar');
    this.connChannelName = document.getElementById('conn-channel-name');
    this.btnDisconnectVoice = document.getElementById('btn-disconnect-voice');

    // Views
    this.viewFeed = document.getElementById('view-feed');
    this.viewFriends = document.getElementById('view-friends');
    this.viewChat = document.getElementById('view-chat');
    this.viewVoiceRoom = document.getElementById('view-voice-room');

    // Chat View Elements
    this.chatHeaderPrefix = document.getElementById('chat-header-prefix');
    this.chatHeaderName = document.getElementById('chat-header-name');
    this.chatHeaderTopic = document.getElementById('chat-header-topic');
    this.btnCallDm = document.getElementById('btn-call-dm');
    this.chatMessagesContainer = document.getElementById('chat-messages-container');
    this.typingIndicatorBar = document.getElementById('typing-indicator-bar');
    this.typingText = document.getElementById('typing-text');
    this.formSendChat = document.getElementById('form-send-chat');
    this.inputChatMessage = document.getElementById('input-chat-message');

    // Friends View Elements
    this.friendTabs = document.querySelectorAll('.friend-tab');
    this.countOnlineFriends = document.getElementById('count-online-friends');
    this.countAllFriends = document.getElementById('count-all-friends');
    this.countPendingFriends = document.getElementById('count-pending-friends');
    this.inputSearchFriends = document.getElementById('input-search-friends');
    this.addFriendPanel = document.getElementById('add-friend-panel');
    this.inputAddFriendUsername = document.getElementById('input-add-friend-username');
    this.btnSubmitFriendRequest = document.getElementById('btn-submit-friend-request');
    this.friendsCardsContainer = document.getElementById('friends-cards-container');

    // Voice Room View Elements
    this.voiceRoomTitle = document.getElementById('voice-room-title');
    this.voiceRoomGrid = document.getElementById('voice-room-grid');
    this.btnVoiceLeaveTop = document.getElementById('btn-voice-leave-top');
    this.dockBtnMic = document.getElementById('dock-btn-mic');
    this.dockIconMicOn = document.getElementById('dock-icon-mic-on');
    this.dockIconMicOff = document.getElementById('dock-icon-mic-off');
    this.dockBtnDeafen = document.getElementById('dock-btn-deafen');
    this.dockIconDeafenOn = document.getElementById('dock-icon-deafen-on');
    this.dockIconDeafenOff = document.getElementById('dock-icon-deafen-off');
    this.dockBtnDisconnect = document.getElementById('dock-btn-disconnect');
    this.dockBtnShareScreen = document.getElementById('dock-btn-share-screen');

    // TikTok Feed Elements
    this.feedScroller = document.getElementById('feed-scroller');
    this.btnSoundToggle = document.getElementById('btn-sound-toggle');
    this.iconSoundUnmuted = document.getElementById('icon-sound-unmuted');
    this.iconSoundMuted = document.getElementById('icon-sound-muted');
    this.tabFeedFollowing = document.getElementById('tab-feed-following');
    this.tabFeedFyp = document.getElementById('tab-feed-fyp');
    this.btnFeedCreatePost = document.getElementById('btn-feed-create-post');
    this.modalCreateVideo = document.getElementById('modal-create-video');
    this.btnCloseCreateVideoModal = document.getElementById('btn-close-create-video-modal');

    // Modals
    this.modalCreateServer = document.getElementById('modal-create-server');
    this.btnCloseServerModal = document.getElementById('btn-close-server-modal');
    this.btnSubmitCreateServer = document.getElementById('btn-submit-create-server');
    this.inputNewServerName = document.getElementById('input-new-server-name');
    this.inputNewServerDesc = document.getElementById('input-new-server-desc');

    this.sheetComments = document.getElementById('sheet-comments');
    this.btnCloseComments = document.getElementById('btn-close-comments');
    this.commentsListContainer = document.getElementById('comments-list-container');
    this.inputNewComment = document.getElementById('input-new-comment');
    this.btnSendComment = document.getElementById('btn-send-comment');
  }

  // --- Initialize App ---
  init() {
    this.initWebSocket();
    this.renderServerRail();
    this.renderDmFriendsSidebar();
    this.renderFriendsHub();
    this.renderTikTokFeed();
    this.setupEventListeners();
    this.setupTikTokGestures();
  }

  // --- Web Audio SFX ---
  playSfx(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.sfxCtx && AudioCtx) this.sfxCtx = new AudioCtx();
      if (!this.sfxCtx) return;
      if (this.sfxCtx.state === 'suspended') this.sfxCtx.resume();

      const now = this.sfxCtx.currentTime;
      const osc = this.sfxCtx.createOscillator();
      const gain = this.sfxCtx.createGain();

      if (type === 'pop') {
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'join') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'leave') {
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {}
  }

  // --- Toast Notification ---
  showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast-pill';
    toast.textContent = msg;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // --- Real-time WebSocket Gateway ---
  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Register current presence
        this.sendWs('presence:init', { userId: this.user.id, status: 'ONLINE' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWsMessage(data);
        } catch (e) {
          console.warn('WS parse error:', e);
        }
      };

      this.ws.onclose = () => {
        // Auto-reconnect after 3s
        setTimeout(() => this.initWebSocket(), 3000);
      };
    } catch (e) {
      console.warn('WebSocket init error:', e);
    }
  }

  sendWs(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  handleWsMessage(data) {
    const { type, message, channelId, dmUserId, isTyping, userName, status, userId, isSpeaking, user } = data;

    switch (type) {
      case 'chat:received': {
        this.onChatMessageReceived(message, channelId, dmUserId);
        break;
      }
      case 'chat:typing-status': {
        this.onTypingStatusReceived(userName, channelId, dmUserId, isTyping);
        break;
      }
      case 'presence:update': {
        const friend = this.friends.find(f => f.id === userId);
        if (friend) {
          friend.status = status;
          this.renderFriendsHub();
          this.renderDmFriendsSidebar();
        }
        break;
      }
      case 'voice:user-joined': {
        if (this.connectedVoiceChannel?.id === channelId) {
          this.playSfx('join');
          this.showToast(`${user?.name || 'Seseorang'} bergabung ke saluran suara`);
          this.renderVoiceRoom();
        }
        break;
      }
      case 'voice:user-left': {
        if (this.connectedVoiceChannel?.id === channelId) {
          this.playSfx('leave');
          this.renderVoiceRoom();
        }
        break;
      }
      case 'voice:user-speaking': {
        this.updatePeerSpeakingState(channelId, userId, isSpeaking);
        break;
      }
      default:
        break;
    }
  }

  // --- Server Rail Rendering ---
  renderServerRail() {
    this.railServersList.innerHTML = this.servers.map(server => `
      <button class="server-rail-icon ${this.activeServerId === server.id ? 'active' : ''}" data-server-id="${server.id}" title="${server.name}">
        <img src="${server.icon}" alt="${server.name}">
      </button>
    `).join('');

    // Attach click listeners to server icons
    this.railServersList.querySelectorAll('.server-rail-icon').forEach(btn => {
      btn.addEventListener('click', () => {
        const srvId = btn.dataset.serverId;
        this.selectServer(srvId);
      });
    });
  }

  // --- Sidebar Channels & DMs Rendering ---
  renderDmFriendsSidebar() {
    this.dmFriendsList.innerHTML = this.friends.map(friend => {
      const statusClass = `status-${friend.status.toLowerCase()}`;
      const isActive = this.activeDmUserId === friend.id;
      return `
        <div class="dm-friend-row ${isActive ? 'active' : ''}" data-friend-id="${friend.id}">
          <div class="dm-avatar-wrap">
            <img src="${friend.avatar}" alt="${friend.name}">
            <span class="status-dot ${statusClass}"></span>
          </div>
          <div class="dm-info">
            <div class="dm-user-name">${friend.name}</div>
            <div class="dm-user-activity">${friend.customStatus || friend.activity}</div>
          </div>
        </div>
      `;
    }).join('');

    this.dmFriendsList.querySelectorAll('.dm-friend-row').forEach(row => {
      row.addEventListener('click', () => {
        const friendId = row.dataset.friendId;
        this.openDirectMessage(friendId);
      });
    });
  }

  renderServerChannels(server) {
    this.sidebarHeaderTitle.textContent = server.name;

    // Text Channels
    const textChannels = server.channels.filter(c => c.type === 'TEXT');
    this.groupTextChannels.innerHTML = textChannels.map(ch => `
      <div class="channel-item-row ${this.activeChannelId === ch.id ? 'active' : ''}" data-channel-id="${ch.id}">
        <svg viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
        <span>${ch.name}</span>
      </div>
    `).join('');

    // Voice Channels
    const voiceChannels = server.channels.filter(c => c.type === 'VOICE');
    this.groupVoiceChannels.innerHTML = voiceChannels.map(vc => `
      <div class="channel-item-row voice-channel ${this.connectedVoiceChannel?.id === vc.id ? 'active' : ''}" data-voice-id="${vc.id}">
        <svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        <span>${vc.name}</span>
      </div>
    `).join('');

    // Attach click events
    this.groupTextChannels.querySelectorAll('.channel-item-row').forEach(row => {
      row.addEventListener('click', () => {
        const chId = row.dataset.channelId;
        this.openServerChannel(chId);
      });
    });

    this.groupVoiceChannels.querySelectorAll('.channel-item-row').forEach(row => {
      row.addEventListener('click', () => {
        const vcId = row.dataset.voiceId;
        const channel = server.channels.find(c => c.id === vcId);
        this.joinVoiceChannel(channel, server);
      });
    });
  }

  // --- Friends Hub Rendering ---
  renderFriendsHub() {
    // Counts
    const onlineCount = this.friends.filter(f => f.status === 'ONLINE' || f.status === 'IDLE').length;
    const allCount = this.friends.length;
    const pendingCount = this.friendRequests.length;

    this.countOnlineFriends.textContent = onlineCount;
    this.countAllFriends.textContent = allCount;
    this.countPendingFriends.textContent = pendingCount;
    this.badgePendingFriends.textContent = pendingCount;

    if (this.activeFriendsFilter === 'ADD') {
      this.addFriendPanel.style.display = 'block';
      this.friendsCardsContainer.innerHTML = '';
      return;
    }

    this.addFriendPanel.style.display = 'none';

    let displayFriends = this.friends;
    if (this.activeFriendsFilter === 'ONLINE') {
      displayFriends = this.friends.filter(f => f.status === 'ONLINE' || f.status === 'IDLE');
    } else if (this.activeFriendsFilter === 'PENDING') {
      this.renderPendingRequests();
      return;
    }

    const searchQuery = this.inputSearchFriends.value.toLowerCase().trim();
    if (searchQuery) {
      displayFriends = displayFriends.filter(f => f.name.toLowerCase().includes(searchQuery) || f.username.toLowerCase().includes(searchQuery));
    }

    this.friendsCardsContainer.innerHTML = displayFriends.map(friend => `
      <div class="friend-card-row">
        <div class="friend-left-info">
          <div class="friend-card-avatar">
            <img src="${friend.avatar}" alt="${friend.name}">
            <span class="status-dot status-${friend.status.toLowerCase()}"></span>
          </div>
          <div>
            <div class="friend-card-name">${friend.name}</div>
            <div class="friend-card-status">${friend.customStatus || friend.activity}</div>
          </div>
        </div>

        <div class="friend-card-actions">
          <button class="btn-friend-action" data-action="chat" data-friend-id="${friend.id}" title="Kirim Pesan">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
          <button class="btn-friend-action call" data-action="call" data-friend-id="${friend.id}" title="Panggilan Suara">
            <svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          </button>
        </div>
      </div>
    `).join('');

    this.friendsCardsContainer.querySelectorAll('.btn-friend-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const fId = btn.dataset.friendId;
        if (action === 'chat') {
          this.openDirectMessage(fId);
        } else if (action === 'call') {
          const fakeChannel = { id: `dm-call-${fId}`, name: `Panggilan dengan ${fId}` };
          this.joinVoiceChannel(fakeChannel, { name: 'Panggilan Pribadi' });
        }
      });
    });
  }

  renderPendingRequests() {
    if (this.friendRequests.length === 0) {
      this.friendsCardsContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 10px;">
          Tidak ada permintaan pertemanan yang tertunda.
        </div>
      `;
      return;
    }

    this.friendsCardsContainer.innerHTML = this.friendRequests.map(req => `
      <div class="friend-card-row">
        <div class="friend-left-info">
          <div class="friend-card-avatar">
            <img src="${req.user.avatar}" alt="${req.user.name}">
          </div>
          <div>
            <div class="friend-card-name">${req.user.name}</div>
            <div class="friend-card-status">Permintaan Pertemanan Masuk • ${req.user.mutualFriends || 0} Teman Bersama</div>
          </div>
        </div>

        <div class="friend-card-actions">
          <button class="btn-friend-action" data-action="accept" data-req-id="${req.id}" title="Terima" style="color: var(--discord-green);">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" fill="none"></polyline></svg>
          </button>
          <button class="btn-friend-action" data-action="reject" data-req-id="${req.id}" title="Tolak" style="color: var(--discord-red);">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5"></line><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5"></line></svg>
          </button>
        </div>
      </div>
    `).join('');

    this.friendsCardsContainer.querySelectorAll('.btn-friend-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const reqId = btn.dataset.reqId;
        const req = this.friendRequests.find(r => r.id === reqId);
        if (!req) return;

        if (action === 'accept') {
          this.friends.push({
            id: req.user.id,
            name: req.user.name,
            username: req.user.username,
            avatar: req.user.avatar,
            status: 'ONLINE',
            customStatus: 'Baru saja menjadi teman!'
          });
          this.friendRequests = this.friendRequests.filter(r => r.id !== reqId);
          this.saveState('outmedia_friends', this.friends);
          this.saveState('outmedia_friend_requests', this.friendRequests);
          this.showToast(`Berhasil berteman dengan ${req.user.name}! 🎉`);
          this.renderFriendsHub();
          this.renderDmFriendsSidebar();
        } else {
          this.friendRequests = this.friendRequests.filter(r => r.id !== reqId);
          this.saveState('outmedia_friend_requests', this.friendRequests);
          this.showToast('Permintaan pertemanan ditolak.');
          this.renderFriendsHub();
        }
      });
    });
  }

  // --- Navigation & View Switching ---
  switchMainView(viewName) {
    this.viewFeed.style.display = viewName === 'feed' ? 'flex' : 'none';
    this.viewFriends.style.display = viewName === 'friends' ? 'flex' : 'none';
    this.viewChat.style.display = viewName === 'chat' ? 'flex' : 'none';
    this.viewVoiceRoom.style.display = viewName === 'voice' ? 'flex' : 'none';

    // Video play/pause when entering/leaving feed
    const activeVid = this.feedScroller.querySelectorAll('.video-item')[this.currentFeedIndex]?.querySelector('video');
    if (viewName === 'feed') {
      if (activeVid) activeVid.play().catch(() => {});
    } else {
      this.feedScroller.querySelectorAll('video').forEach(v => v.pause());
    }
  }

  selectServer(serverId) {
    this.activeRailTarget = serverId;
    this.activeServerId = serverId;
    this.railBtnDm.classList.remove('active');
    this.railBtnFeed.classList.remove('active');
    this.renderServerRail();

    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    this.dmSectionWrapper.style.display = 'none';
    this.serverChannelsWrapper.style.display = 'block';
    this.renderServerChannels(server);

    // Open first text channel
    const firstTextCh = server.channels.find(c => c.type === 'TEXT');
    if (firstTextCh) {
      this.openServerChannel(firstTextCh.id);
    }
  }

  openDirectMessage(friendId) {
    this.activeDmUserId = friendId;
    this.activeChannelId = null;
    this.renderDmFriendsSidebar();

    const friend = this.friends.find(f => f.id === friendId);
    if (!friend) return;

    this.chatHeaderPrefix.textContent = '@';
    this.chatHeaderName.textContent = friend.name;
    this.chatHeaderTopic.textContent = friend.customStatus || friend.activity || 'Percakapan Pribadi';
    this.btnCallDm.style.display = 'flex';
    this.inputChatMessage.placeholder = `Kirim pesan ke @${friend.name}`;

    this.switchMainView('chat');
    this.renderChatMessages();
  }

  openServerChannel(channelId) {
    this.activeChannelId = channelId;
    this.activeDmUserId = null;
    const server = this.servers.find(s => s.id === this.activeServerId);
    if (!server) return;

    const channel = server.channels.find(c => c.id === channelId);
    if (!channel) return;

    this.chatHeaderPrefix.textContent = '#';
    this.chatHeaderName.textContent = channel.name;
    this.chatHeaderTopic.textContent = channel.topic || 'Selamat datang di kanal ini!';
    this.btnCallDm.style.display = 'none';
    this.inputChatMessage.placeholder = `Kirim pesan ke #${channel.name}`;

    this.renderServerChannels(server);
    this.switchMainView('chat');
    this.renderChatMessages();
  }

  // --- Chat Messages Engine ---
  renderChatMessages() {
    let messages = [];
    if (this.activeChannelId) {
      messages = this.channelMessages[this.activeChannelId] || [];
    } else if (this.activeDmUserId) {
      messages = this.directMessages[this.activeDmUserId] || [];
    }

    if (messages.length === 0) {
      const label = this.activeChannelId ? `Selamat datang di #${this.chatHeaderName.textContent}!` : `Mulai obrolan baru dengan ${this.chatHeaderName.textContent}!`;
      this.chatMessagesContainer.innerHTML = `
        <div style="margin: auto 0 20px; color: var(--text-muted);">
          <h2 style="font-size: 24px; color: #fff; margin-bottom: 8px;">${label}</h2>
          <p style="font-size: 14px;">Ini adalah awal riwayat pesan.</p>
        </div>
      `;
      return;
    }

    this.chatMessagesContainer.innerHTML = messages.map(msg => {
      const isMe = msg.userId === this.user.id || msg.senderId === 'user-me';
      const senderName = isMe ? this.user.name : (msg.userName || this.friends.find(f => f.id === msg.senderId)?.name || 'Teman');
      const senderAvatar = isMe ? this.user.avatar : (msg.avatar || this.friends.find(f => f.id === msg.senderId)?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100');

      return `
        <div class="chat-message-row" data-msg-id="${msg.id}">
          <img class="chat-msg-avatar" src="${senderAvatar}" alt="${senderName}">
          <div class="chat-msg-body">
            <div class="chat-msg-header">
              <span class="chat-msg-author">${senderName}</span>
              <span class="chat-msg-time">${msg.time || 'Hari ini'}</span>
            </div>
            <div class="chat-msg-content">${msg.content}</div>
            ${msg.reactions ? `
              <div class="chat-msg-reactions">
                ${msg.reactions.map(r => `
                  <span class="reaction-pill ${r.userReacted ? 'reacted' : ''}" data-emoji="${r.emoji}">
                    ${r.emoji} ${r.count}
                  </span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    this.chatMessagesContainer.scrollTop = this.chatMessagesContainer.scrollHeight;

    // Reaction pills click
    this.chatMessagesContainer.querySelectorAll('.reaction-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const emoji = pill.dataset.emoji;
        const msgId = pill.closest('.chat-message-row').dataset.msgId;
        this.toggleMessageReaction(msgId, emoji);
      });
    });
  }

  sendChatMessage() {
    const text = this.inputChatMessage.value.trim();
    if (!text) return;

    const newMsg = {
      id: 'msg-' + Date.now(),
      userId: this.user.id,
      senderId: 'user-me',
      userName: this.user.name,
      avatar: this.user.avatar,
      content: text,
      time: `Hari ini pukul ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      reactions: []
    };

    if (this.activeChannelId) {
      if (!this.channelMessages[this.activeChannelId]) this.channelMessages[this.activeChannelId] = [];
      this.channelMessages[this.activeChannelId].push(newMsg);
      this.saveState('outmedia_channel_messages', this.channelMessages);
      this.sendWs('chat:send', { message: newMsg, channelId: this.activeChannelId });
    } else if (this.activeDmUserId) {
      if (!this.directMessages[this.activeDmUserId]) this.directMessages[this.activeDmUserId] = [];
      this.directMessages[this.activeDmUserId].push(newMsg);
      this.saveState('outmedia_direct_messages', this.directMessages);
      this.sendWs('chat:send', { message: newMsg, dmUserId: this.activeDmUserId });
    }

    this.playSfx('pop');
    this.inputChatMessage.value = '';
    this.renderChatMessages();
  }

  onChatMessageReceived(message, channelId, dmUserId) {
    if (channelId && channelId === this.activeChannelId) {
      this.renderChatMessages();
    } else if (dmUserId && dmUserId === this.activeDmUserId) {
      this.renderChatMessages();
    }
  }

  onTypingStatusReceived(userName, channelId, dmUserId, isTyping) {
    const isCurrent = (channelId && channelId === this.activeChannelId) || (dmUserId && dmUserId === this.activeDmUserId);
    if (!isCurrent) return;

    if (isTyping) {
      this.typingText.textContent = `${userName} sedang mengetik...`;
      this.typingIndicatorBar.style.display = 'flex';
    } else {
      this.typingIndicatorBar.style.display = 'none';
    }
  }

  toggleMessageReaction(msgId, emoji) {
    let list = this.activeChannelId ? this.channelMessages[this.activeChannelId] : this.directMessages[this.activeDmUserId];
    if (!list) return;

    const msg = list.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = [];
    const existing = msg.reactions.find(r => r.emoji === emoji);
    if (existing) {
      existing.userReacted = !existing.userReacted;
      existing.count += existing.userReacted ? 1 : -1;
      if (existing.count <= 0) msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
    } else {
      msg.reactions.push({ emoji, count: 1, userReacted: true });
    }

    if (this.activeChannelId) this.saveState('outmedia_channel_messages', this.channelMessages);
    else this.saveState('outmedia_direct_messages', this.directMessages);
    this.renderChatMessages();
  }

  // --- WebRTC Voice Space Engine with Real-Time VAD ---
  async joinVoiceChannel(channel, server) {
    this.connectedVoiceChannel = channel;
    this.connChannelName.textContent = `${channel.name} (${server.name})`;
    this.voiceRoomTitle.textContent = channel.name;
    this.voiceConnectedBar.style.display = 'flex';
    this.playSfx('join');

    // Request actual microphone stream for VAD & audio
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        this.localAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.setupVoiceActivityDetection(this.localAudioStream);
      }
    } catch (err) {
      console.warn('Microphone permission blocked or unavailable:', err);
      this.showToast('Mikrofon simulasi diaktifkan.');
    }

    this.sendWs('voice:join', { channelId: channel.id, user: { id: this.user.id, name: this.user.name, avatar: this.user.avatar } });
    this.renderVoiceRoom();
    this.switchMainView('voice');
    this.showToast(`Tersambung ke ${channel.name} 🔊`);
  }

  setupVoiceActivityDetection(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);

      const bufferLength = this.audioAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // VAD Poll Loop (Every 50ms)
      this.vadInterval = setInterval(() => {
        if (this.isMuted) {
          if (this.isSpeaking) this.setSpeakingState(false);
          return;
        }

        this.audioAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for speaking
        const isNowSpeaking = average > 18;
        if (isNowSpeaking !== this.isSpeaking) {
          this.setSpeakingState(isNowSpeaking);
        }
      }, 50);
    } catch (e) {
      console.warn('VAD AudioContext error:', e);
    }
  }

  setSpeakingState(speaking) {
    this.isSpeaking = speaking;
    const myCard = document.getElementById('voice-card-me');
    if (myCard) {
      myCard.classList.toggle('speaking', speaking);
    }

    // Broadcast speaking state over WebSocket
    if (this.connectedVoiceChannel) {
      this.sendWs('voice:speaking', {
        channelId: this.connectedVoiceChannel.id,
        userId: this.user.id,
        isSpeaking: speaking
      });
    }
  }

  updatePeerSpeakingState(channelId, userId, isSpeaking) {
    if (this.connectedVoiceChannel?.id !== channelId) return;
    const card = document.querySelector(`.voice-user-card[data-user-id="${userId}"]`);
    if (card) {
      card.classList.toggle('speaking', isSpeaking);
    }
  }

  toggleMicrophone() {
    this.isMuted = !this.isMuted;
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted);
    }

    this.iconMicOn.style.display = this.isMuted ? 'none' : 'block';
    this.iconMicOff.style.display = this.isMuted ? 'block' : 'none';
    this.dockIconMicOn.style.display = this.isMuted ? 'none' : 'block';
    this.dockIconMicOff.style.display = this.isMuted ? 'block' : 'none';

    if (this.isMuted) this.setSpeakingState(false);
    this.showToast(this.isMuted ? 'Mikrofon Dibisukan 🔇' : 'Mikrofon Aktif 🎙️');
    this.renderVoiceRoom();
  }

  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    this.iconDeafenOn.style.display = this.isDeafened ? 'none' : 'block';
    this.iconDeafenOff.style.display = this.isDeafened ? 'block' : 'none';
    this.dockIconDeafenOn.style.display = this.isDeafened ? 'none' : 'block';
    this.dockIconDeafenOff.style.display = this.isDeafened ? 'block' : 'none';

    if (this.isDeafened && !this.isMuted) {
      this.toggleMicrophone(); // Deafen also mutes mic
    }
    this.showToast(this.isDeafened ? 'Suara Dinonaktifkan' : 'Suara Diaktifkan');
  }

  disconnectVoice() {
    if (!this.connectedVoiceChannel) return;
    this.playSfx('leave');

    if (this.vadInterval) clearInterval(this.vadInterval);
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(t => t.stop());
      this.localAudioStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.sendWs('voice:leave', { channelId: this.connectedVoiceChannel.id, userId: this.user.id });
    this.connectedVoiceChannel = null;
    this.voiceConnectedBar.style.display = 'none';

    // Return to chat or friends view
    if (this.activeChannelId || this.activeDmUserId) {
      this.switchMainView('chat');
    } else {
      this.switchMainView('friends');
    }

    this.showToast('Terputus dari saluran suara.');
  }

  renderVoiceRoom() {
    // Current user + peers in voice
    const usersInVoice = [
      { id: this.user.id, name: `${this.user.name} (Saya)`, avatar: this.user.avatar, isMe: true, isMuted: this.isMuted },
      { id: 'user-sarah', name: 'Sarah Aurelia', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', isMe: false, isMuted: false },
      { id: 'user-chef-ken', name: 'Chef Kenzo', avatar: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150', isMe: false, isMuted: true }
    ];

    this.voiceRoomGrid.innerHTML = usersInVoice.map(u => `
      <div class="voice-user-card ${u.isMe && this.isSpeaking ? 'speaking' : ''}" id="${u.isMe ? 'voice-card-me' : ''}" data-user-id="${u.id}">
        <div class="voice-card-avatar">
          <img src="${u.avatar}" alt="${u.name}">
        </div>
        <span class="voice-card-name">${u.name}</span>
        ${u.isMuted ? `
          <div class="voice-card-state-icon">
            <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  // --- TikTok Feed Engine ---
  renderTikTokFeed() {
    let list = this.videos;
    if (this.activeFeedType === 'following') {
      list = this.videos.filter(v => v.author?.isFollowed);
      if (list.length === 0) list = this.videos;
    }

    this.feedScroller.innerHTML = list.map((video, idx) => `
      <article class="video-item" data-video-id="${video.id}" data-index="${idx}">
        <div class="video-player-wrapper" data-action="toggle-play">
          <video 
            class="feed-video"
            src="${video.videoUrl}" 
            poster="${video.posterUrl || ''}"
            loop 
            playsinline 
            preload="metadata"
            ${this.isFeedMuted ? 'muted' : ''}>
          </video>
          <canvas class="video-fallback-canvas" data-theme="${video.theme || 'sunset'}"></canvas>

          <div class="play-pause-indicator">
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
        </div>

        <div class="video-overlay-gradient"></div>

        <div class="video-info-overlay">
          <div class="creator-handle-row">
            <span class="creator-name">@${video.author?.username}</span>
            ${video.author?.isVerified ? '<span class="verified-badge">✓</span>' : ''}
          </div>
          <p class="video-caption">${video.caption}</p>
          <div class="video-sound-row">
            <svg class="sound-icon-note" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
            <div class="sound-marquee-container">
              <div class="sound-marquee-track">
                <span>${video.sound?.title || 'Audio Asli'} • ${video.sound?.artist || 'Kreator'} &nbsp;&nbsp;&nbsp;&nbsp;</span>
              </div>
            </div>
          </div>
        </div>

        <aside class="action-sidebar">
          <div class="action-avatar-wrapper">
            <div class="action-avatar">
              <img src="${video.author?.avatar}" alt="${video.author?.name}">
            </div>
            <button class="follow-plus-btn ${video.author?.isFollowed ? 'followed' : ''}" data-action="follow" data-author-id="${video.author?.id}">
              ${video.author?.isFollowed ? '✓' : '+'}
            </button>
          </div>

          <button class="action-item ${video.isLiked ? 'liked' : ''}" data-action="like" data-video-id="${video.id}">
            <div class="action-icon-circle">
              <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <span class="action-count">${video.stats?.likes || 0}</span>
          </button>

          <button class="action-item" data-action="comment" data-video-id="${video.id}">
            <div class="action-icon-circle">
              <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <span class="action-count">${video.stats?.comments || 0}</span>
          </button>

          <button class="action-item" data-action="share" data-video-id="${video.id}">
            <div class="action-icon-circle">
              <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </div>
            <span class="action-count">Bagikan</span>
          </button>

          <div class="disc-wrapper">
            <div class="disc-vinyl">
              <img src="${video.sound?.cover || video.author?.avatar}">
            </div>
          </div>
        </aside>
      </article>
    `).join('');

    this.setupFeedIntersectionObserver();
  }

  setupFeedIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const vid = entry.target.querySelector('video');
        if (entry.isIntersecting) {
          this.currentFeedIndex = parseInt(entry.target.dataset.index, 10);
          if (vid && this.viewFeed.style.display !== 'none') {
            vid.muted = this.isFeedMuted;
            vid.play().catch(() => {});
          }
        } else {
          if (vid) vid.pause();
        }
      });
    }, { root: this.feedScroller, threshold: 0.65 });

    this.feedScroller.querySelectorAll('.video-item').forEach(el => observer.observe(el));
  }

  setupTikTokGestures() {
    let lastTap = 0;

    this.feedScroller.addEventListener('click', (e) => {
      const now = Date.now();
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        this.handleFeedAction(actionBtn);
        return;
      }

      const wrapper = e.target.closest('.video-player-wrapper');
      if (!wrapper) return;

      const videoItem = wrapper.closest('.video-item');
      const videoId = videoItem.dataset.videoId;

      if (now - lastTap < 300) {
        // Double tap like!
        this.triggerDoubleTapHeart(e.clientX, e.clientY, wrapper);
        const video = this.videos.find(v => v.id === videoId);
        if (video && !video.isLiked) {
          video.isLiked = true;
          video.stats.likes += 1;
          this.saveState('outmedia_videos', this.videos);
          this.renderTikTokFeed();
        }
        lastTap = 0;
      } else {
        lastTap = now;
        setTimeout(() => {
          if (Date.now() - lastTap >= 300 && lastTap !== 0) {
            const vid = wrapper.querySelector('video');
            const ind = wrapper.querySelector('.play-pause-indicator');
            if (vid) {
              if (vid.paused) {
                vid.play();
                ind.classList.remove('show');
              } else {
                vid.pause();
                ind.classList.add('show');
                setTimeout(() => ind.classList.remove('show'), 700);
              }
            }
            lastTap = 0;
          }
        }, 300);
      }
    });
  }

  triggerDoubleTapHeart(x, y, container) {
    this.playSfx('pop');
    const rect = container.getBoundingClientRect();
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.style.left = `${x - rect.left}px`;
    heart.style.top = `${y - rect.top}px`;
    heart.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 900);
  }

  handleFeedAction(btn) {
    const action = btn.dataset.action;
    const vidId = btn.dataset.videoId;
    const video = this.videos.find(v => v.id === vidId);

    if (action === 'like' && video) {
      video.isLiked = !video.isLiked;
      video.stats.likes += video.isLiked ? 1 : -1;
      this.playSfx('pop');
      this.saveState('outmedia_videos', this.videos);
      this.renderTikTokFeed();
    } else if (action === 'comment' && video) {
      this.sheetComments.classList.add('open');
      this.renderFeedComments(video);
    } else if (action === 'share') {
      navigator.clipboard?.writeText(window.location.href);
      this.showToast('Tautan video disalin ke clipboard! 📋');
    }
  }

  renderFeedComments(video) {
    const list = video.comments || [];
    this.commentsListContainer.innerHTML = list.map(c => `
      <div style="display:flex; gap:10px; margin-bottom:12px;">
        <img src="${c.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
        <div>
          <div style="font-size:12px; font-weight:700; color:var(--text-muted);">@${c.author}</div>
          <div style="font-size:13.5px; color:#fff;">${c.text}</div>
        </div>
      </div>
    `).join('') || '<p style="color:var(--text-muted); text-align:center;">Belum ada komentar.</p>';
  }

  // --- Global Event Listeners ---
  setupEventListeners() {
    // 1. Server Rail Switchers
    this.railBtnDm.addEventListener('click', () => {
      this.activeRailTarget = 'dm';
      this.activeServerId = null;
      this.railBtnDm.classList.add('active');
      this.railBtnFeed.classList.remove('active');
      this.renderServerRail();

      this.dmSectionWrapper.style.display = 'block';
      this.serverChannelsWrapper.style.display = 'none';
      this.sidebarHeaderTitle.textContent = 'Percakapan Langsung';

      if (this.activeDmUserId) {
        this.openDirectMessage(this.activeDmUserId);
      } else {
        this.switchMainView('friends');
      }
    });

    this.railBtnFeed.addEventListener('click', () => {
      this.activeRailTarget = 'tiktok-feed';
      this.railBtnFeed.classList.add('active');
      this.railBtnDm.classList.remove('active');
      this.renderServerRail();
      this.switchMainView('feed');
    });

    // 2. Friends Button in Sidebar
    this.btnNavFriends.addEventListener('click', () => {
      this.activeDmUserId = null;
      this.renderDmFriendsSidebar();
      this.switchMainView('friends');
    });

    // 3. Friends Tabs (Online, All, Pending, Add)
    this.friendTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.friendTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeFriendsFilter = tab.dataset.filter;
        this.renderFriendsHub();
      });
    });

    this.inputSearchFriends.addEventListener('input', () => this.renderFriendsHub());

    // 4. Add Friend Submission
    this.btnSubmitFriendRequest.addEventListener('click', () => {
      const username = this.inputAddFriendUsername.value.trim();
      if (!username) return;

      this.showToast(`Permintaan pertemanan terkirim ke ${username}! ✨`);
      this.inputAddFriendUsername.value = '';
      this.friendTabs[0].click();
    });

    // 5. Chat Input Submit & Typing
    this.formSendChat.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendChatMessage();
    });

    this.inputChatMessage.addEventListener('input', () => {
      this.sendWs('chat:typing', {
        userName: this.user.name,
        channelId: this.activeChannelId,
        dmUserId: this.activeDmUserId,
        isTyping: true
      });

      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.sendWs('chat:typing', {
          userName: this.user.name,
          channelId: this.activeChannelId,
          dmUserId: this.activeDmUserId,
          isTyping: false
        });
      }, 1500);
    });

    // 6. Voice Controls
    this.btnToggleMic.addEventListener('click', () => this.toggleMicrophone());
    this.btnToggleDeafen.addEventListener('click', () => this.toggleDeafen());
    this.btnDisconnectVoice.addEventListener('click', () => this.disconnectVoice());
    this.btnVoiceLeaveTop.addEventListener('click', () => this.disconnectVoice());
    this.dockBtnMic.addEventListener('click', () => this.toggleMicrophone());
    this.dockBtnDeafen.addEventListener('click', () => this.toggleDeafen());
    this.dockBtnDisconnect.addEventListener('click', () => this.disconnectVoice());

    this.dockBtnShareScreen.addEventListener('click', async () => {
      try {
        if (navigator.mediaDevices?.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          this.showToast('Layar berhasil dibagikan! 🖥️');
          screenStream.getVideoTracks()[0].onended = () => {
            this.showToast('Berhenti berbagi layar.');
          };
        }
      } catch (err) {
        this.showToast('Fitur berbagi layar dibatalkan.');
      }
    });

    // 7. Modals
    this.btnAddServerModal.addEventListener('click', () => {
      this.modalCreateServer.classList.add('open');
    });

    this.btnCloseServerModal.addEventListener('click', () => {
      this.modalCreateServer.classList.remove('open');
    });

    this.btnSubmitCreateServer.addEventListener('click', () => {
      const name = this.inputNewServerName.value.trim() || 'Server Baru';
      const desc = this.inputNewServerDesc.value.trim() || 'Deskripsi server';
      const newSrv = {
        id: 'srv-' + Date.now(),
        name: name,
        icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
        description: desc,
        channels: [
          { id: 'ch-' + Date.now(), name: 'obrolan-umum', type: 'TEXT', topic: 'Selamat datang!' },
          { id: 'vc-' + Date.now(), name: 'Voice Room 1', type: 'VOICE' }
        ]
      };

      this.servers.push(newSrv);
      this.saveState('outmedia_servers', this.servers);
      this.renderServerRail();
      this.modalCreateServer.classList.remove('open');
      this.showToast(`Server "${name}" berhasil dibuat! 🚀`);
      this.selectServer(newSrv.id);
    });

    // TikTok Feed Mute Toggle
    this.btnSoundToggle.addEventListener('click', () => {
      this.isFeedMuted = !this.isFeedMuted;
      this.iconSoundUnmuted.style.display = this.isFeedMuted ? 'none' : 'block';
      this.iconSoundMuted.style.display = this.isFeedMuted ? 'block' : 'none';
      this.feedScroller.querySelectorAll('video').forEach(v => v.muted = this.isFeedMuted);
    });

    // TikTok Create Post Modal
    this.btnFeedCreatePost.addEventListener('click', () => {
      this.modalCreateVideo.classList.add('open');
    });

    this.btnCloseCreateVideoModal.addEventListener('click', () => {
      this.modalCreateVideo.classList.remove('open');
    });

    this.btnCloseComments.addEventListener('click', () => {
      this.sheetComments.classList.remove('open');
    });
  }
}

// Bootstrap Platform on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.outMedia = new OutMediaPlatform();
});
