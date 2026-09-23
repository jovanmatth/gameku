// Real-Time Server for OutMedia (TikTok + Discord Platform)
// Native zero-dependency Node.js HTTP + WebSocket (RFC 6455) Server
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Connected WebSocket Clients
const clients = new Set();

// In-Memory Presence & Voice State
const presenceState = new Map(); // userId -> { status, lastSeen }
const voiceRooms = new Map();    // channelId -> Set of { userId, userName, isMuted, isDeafened, isSpeaking }

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

// Broadcast payload to all connected WebSocket clients
function broadcast(messageObj, excludeClient = null) {
  const jsonStr = JSON.stringify(messageObj);
  const frame = encodeWebSocketFrame(jsonStr);
  for (const client of clients) {
    if (client !== excludeClient && client.readyState === 1) {
      try {
        client.socket.write(frame);
      } catch (err) {
        clients.delete(client);
      }
    }
  }
}

// Encode UTF-8 text into WebSocket RFC 6455 frame
function encodeWebSocketFrame(text) {
  const payload = Buffer.from(text, 'utf-8');
  const length = payload.length;

  let header;
  if (length <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = length;
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // REST API status
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      platform: 'OutMedia (TikTok + Discord)',
      connectedClients: clients.size
    }));
  }

  // Static File Serving
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    // Support Video Streaming Range Header
    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

// Native WebSocket Upgrade (RFC 6455)
server.on('upgrade', (req, socket, head) => {
  if (req.headers['upgrade']?.toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }

  const clientKey = req.headers['sec-websocket-key'];
  if (!clientKey) {
    socket.destroy();
    return;
  }

  // Generate Sec-WebSocket-Accept
  const acceptKey = crypto
    .createHash('sha1')
    .update(clientKey + WS_GUID)
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');

  const client = {
    socket,
    readyState: 1,
    userId: null,
    channelId: null
  };
  clients.add(client);

  // Parse incoming frames
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const isFin = (buffer[0] & 0x80) !== 0;
      const opcode = buffer[0] & 0x0F;
      const isMasked = (buffer[1] & 0x80) !== 0;
      let payloadLength = buffer[1] & 0x7F;
      let offset = 2;

      // Close frame
      if (opcode === 0x8) {
        clients.delete(client);
        socket.end();
        return;
      }

      // Ping/Pong
      if (opcode === 0x9) {
        socket.write(Buffer.from([0x8A, 0x00])); // send pong
        buffer = buffer.slice(2);
        continue;
      }

      if (payloadLength === 126) {
        if (buffer.length < 4) return;
        payloadLength = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (buffer.length < 10) return;
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      let maskKey = null;
      if (isMasked) {
        if (buffer.length < offset + 4) return;
        maskKey = buffer.slice(offset, offset + 4);
        offset += 4;
      }

      if (buffer.length < offset + payloadLength) return;

      const payload = buffer.slice(offset, offset + payloadLength);
      buffer = buffer.slice(offset + payloadLength);

      if (isMasked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i % 4];
        }
      }

      // Process message
      try {
        const messageText = payload.toString('utf-8');
        const data = JSON.parse(messageText);
        handleClientMessage(client, data);
      } catch (err) {
        console.warn('Invalid WS JSON:', err);
      }
    }
  });

  socket.on('close', () => {
    clients.delete(client);
    if (client.userId) {
      broadcast({
        type: 'presence:update',
        userId: client.userId,
        status: 'OFFLINE'
      });
      // If was in voice room
      if (client.voiceChannelId) {
        broadcast({
          type: 'voice:user-left',
          channelId: client.voiceChannelId,
          userId: client.userId
        });
      }
    }
  });

  socket.on('error', () => {
    clients.delete(client);
  });
});

// WebSocket Protocol Message Handler
function handleClientMessage(client, data) {
  const { type, payload } = data;

  switch (type) {
    // 1. User Presence Registration
    case 'presence:init': {
      client.userId = payload.userId;
      presenceState.set(payload.userId, { status: payload.status || 'ONLINE', lastSeen: Date.now() });
      broadcast({
        type: 'presence:update',
        userId: payload.userId,
        status: payload.status || 'ONLINE'
      });
      break;
    }

    // 2. Chat Messages (Server Channel or Direct Message)
    case 'chat:send': {
      broadcast({
        type: 'chat:received',
        message: payload.message,
        channelId: payload.channelId,
        dmUserId: payload.dmUserId
      });
      break;
    }

    // 3. Typing Indicators
    case 'chat:typing': {
      broadcast({
        type: 'chat:typing-status',
        userId: client.userId,
        userName: payload.userName,
        channelId: payload.channelId,
        dmUserId: payload.dmUserId,
        isTyping: payload.isTyping
      }, client);
      break;
    }

    // 4. Discord Voice Channel (WebRTC Signaling & VAD)
    case 'voice:join': {
      client.voiceChannelId = payload.channelId;
      broadcast({
        type: 'voice:user-joined',
        channelId: payload.channelId,
        user: payload.user
      });
      break;
    }

    case 'voice:leave': {
      const chId = client.voiceChannelId || payload.channelId;
      client.voiceChannelId = null;
      broadcast({
        type: 'voice:user-left',
        channelId: chId,
        userId: payload.userId
      });
      break;
    }

    case 'voice:speaking': {
      broadcast({
        type: 'voice:user-speaking',
        channelId: payload.channelId,
        userId: payload.userId,
        isSpeaking: payload.isSpeaking
      });
      break;
    }

    case 'voice:state': {
      // Mute / Deafen updates
      broadcast({
        type: 'voice:user-state-change',
        channelId: payload.channelId,
        userId: payload.userId,
        isMuted: payload.isMuted,
        isDeafened: payload.isDeafened
      });
      break;
    }

    // WebRTC SDP Offer / Answer & ICE Candidate Relay
    case 'webrtc:signal': {
      broadcast({
        type: 'webrtc:signal-relay',
        targetUserId: payload.targetUserId,
        fromUserId: client.userId,
        signal: payload.signal
      });
      break;
    }

    default:
      break;
  }
}

server.listen(PORT, () => {
  console.log(`OutMedia (TikTok + Discord) Unified Server running on http://localhost:${PORT}`);
});
