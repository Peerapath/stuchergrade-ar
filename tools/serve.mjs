// Static dev server for WebAR/. POST /__save-target stores a compiled MindAR target (dev only).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8080);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.mind': 'application/octet-stream', '.css': 'text/css', '.pdf': 'application/pdf',
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/__save-target') {
      const origin = req.headers.origin;
      if (origin !== undefined && origin !== `http://localhost:${port}` && origin !== `http://127.0.0.1:${port}`) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('forbidden origin');
        return;
      }
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const out = path.join(root, 'assets/targets/targets.mind');
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.writeFile(out, body);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`saved ${body.length} bytes`);
      return;
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    const rel = path.relative(root, file);
    if (rel.startsWith('..') || path.isAbsolute(rel)) { res.writeHead(403); res.end(); return; }
    try {
      const data = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  } catch (err) {
    if (res.headersSent) { res.destroy(); return; }
    if (err instanceof URIError) { res.writeHead(400); res.end('bad request'); return; }
    console.error(err);
    res.writeHead(500); res.end('server error');
  }
}).listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}/`));
