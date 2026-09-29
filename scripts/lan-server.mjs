/**
 * Dead-simple static file server for MatrixNotes dist/
 * Avoids Vite HMR / preview quirks that hang iOS Safari over LAN.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const PORT = Number(process.env.PORT || 8080);
const HOST = '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      const family = String(net.family);
      if (family !== 'IPv4' && family !== '4') continue;
      if (net.internal) continue;
      out.push(net.address);
    }
  }
  return out;
}

function safeJoin(base, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0] || '/');
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(base, cleaned);
  if (!full.startsWith(base)) return null;
  return full;
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

if (!fs.existsSync(dist)) {
  console.error('[MatrixNotes] dist/ missing. Run: npm run build');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || '/';
  let filePath = safeJoin(dist, urlPath === '/' ? '/index.html' : urlPath);
  if (!filePath) {
    send(res, 403, 'Forbidden');
    return;
  }

  // SPA-style fallback for client routes / missing files that look like paths
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const asIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(asIndex)) {
      filePath = asIndex;
    } else if (!path.extname(filePath)) {
      filePath = path.join(dist, 'index.html');
    } else {
      send(res, 404, 'Not found');
      return;
    }
  }

  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': data.length,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch (err) {
    console.error(err);
    send(res, 500, 'Server error');
  }
});

server.listen(PORT, HOST, () => {
  const ips = lanIPs();
  const wifi = ips.find((ip) => ip.startsWith('192.168.')) || ips[0];
  console.log('');
  console.log('  MatrixNotes LAN server');
  console.log('  ----------------------');
  console.log(`  Local:   http://127.0.0.1:${PORT}/`);
  if (wifi) console.log(`  iPhone:  http://${wifi}:${PORT}/`);
  for (const ip of ips) {
    if (ip !== wifi) console.log(`  Other:   http://${ip}:${PORT}/`);
  }
  console.log('');
  console.log('  On iPhone Safari open the iPhone line above.');
  console.log('  Same Wi-Fi required. Ctrl+C to stop.');
  console.log('');
});
