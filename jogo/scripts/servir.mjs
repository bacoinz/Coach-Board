// Servidor estático mínimo para ver o mockup sem o Worker: node scripts/servir.mjs [porta]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
const porta = Number(process.argv[2] ?? 8791);

createServer(async (req, res) => {
  const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
  if (caminho.startsWith('..')) return res.writeHead(403).end();
  try {
    const dados = await readFile(join(raiz, caminho || 'mockup.html'));
    res.writeHead(200, { 'Content-Type': tipos[extname(caminho)] ?? 'application/octet-stream' }).end(dados);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
}).listen(porta, '127.0.0.1', () => console.log(`http://127.0.0.1:${porta}/mockup.html`));
