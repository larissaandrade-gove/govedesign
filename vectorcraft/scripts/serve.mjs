// Abre o VectorCraft (ferramenta interna) no navegador desta máquina:
//   npm run vectorcraft            →  http://localhost:3041/
//   npm run vectorcraft -- 4000    →  outra porta
// Só escuta em 127.0.0.1: a ferramenta é da equipe, não faz parte do Design System.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const PORT = Number(process.argv[2]) || 3041;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(DIST, path.endsWith('/') ? `${path}index.html` : path));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    if (!statSync(file).isFile()) throw new Error();
  } catch {
    return res.writeHead(404).end('Não encontrado');
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
  createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`VectorCraft em http://localhost:${PORT}/`));
