/**
 * ==============================================================================
 * PlanCraft Scheduler - Native Node.js Server
 * ==============================================================================
 * Server ringan, cepat, tanpa dependensi eksternal (Zero Dependencies).
 * Berfungsi untuk:
 * 1. Menyajikan file statis (HTML, CSS, JS, Assets)
 * 2. Menyediakan REST API sederhana untuk menyimpan & memuat data jadwal otomatis
 * ==============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file jika ada
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eqIdx = trimmed.indexOf('=');
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca .env:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');

// Pastikan direktori data/ tersedia untuk penyimpanan persisten file
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer(async (req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // ----------------------------------------------------------------------------
  // REST API ENDPOINTS
  // ----------------------------------------------------------------------------
  if (pathname === '/api/supabase-config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      url: process.env.SUPABASE_URL || 'https://zwpqneedroxllkdjohos.supabase.co',
      key: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_X9uSzLvrb8WDUj1TEgXupQ_OeZTSRe8'
    }));
    return;
  }

  if (pathname === '/api/schedules') {
    if (req.method === 'GET') {
      try {
        if (fs.existsSync(SCHEDULES_FILE)) {
          const fileData = fs.readFileSync(SCHEDULES_FILE, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(fileData);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: null, message: 'No server data yet, using client storage' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gagal membaca file data: ' + err.message }));
      }
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Jadwal berhasil disimpan ke server' }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
  }

  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      app: 'PlanCraft Scheduler',
      version: '2.5.0',
      supabase: 'configured',
      time: new Date().toISOString()
    }));
    return;
  }

  // ----------------------------------------------------------------------------
  // STATIC FILE SERVING
  // ----------------------------------------------------------------------------
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);

  // Periksa apakah file ada dan berada di dalam direktori proyek
  if (!filePath.startsWith(__dirname) || path.basename(filePath).startsWith('.')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p>Halaman atau file tidak ditemukan.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 PlanCraft Scheduler Server berjalan di:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log('====================================================');
});
