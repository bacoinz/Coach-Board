// Gera public/og.png (a pré-visualização do link no Discord) a partir de scripts/og.html, com o Chrome sem janela.
// Corre-se à mão quando o aspeto das casas mudar: npm run og. O resultado fica no repositório.
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const CHROMES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const chrome = CHROMES.find((c) => existsSync(c));
if (!chrome) throw new Error('Não encontrei o Chrome: indica o caminho na variável CHROME.');

const servidor = createServer(async (req, res) => {
  const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '');
  if (caminho.startsWith('..')) return res.writeHead(403).end();
  const ficheiro = caminho === 'og.html' ? join(raiz, 'scripts', 'og.html') : join(raiz, 'public', caminho);
  try {
    const dados = await readFile(ficheiro);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(caminho)] ?? 'application/octet-stream' }).end(dados);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));

const perfil = await mkdtemp(join(tmpdir(), 'coach-board-og-'));
try {
  await promisify(execFile)(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${perfil}`,
    '--window-size=1200,630', '--virtual-time-budget=5000', `--screenshot=${join(raiz, 'public', 'og.png')}`,
    `http://127.0.0.1:${servidor.address().port}/og.html`,
  ]);
  console.log('Gerado public/og.png');
} finally {
  servidor.close();
  await rm(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
