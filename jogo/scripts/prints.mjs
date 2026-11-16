// Tira as imagens do README (docs/screenshots) com o Chrome sem janela, a partir do jogo a correr localmente
// (npm run dev). Usa a demo em inglês: cada imagem é um passo dela.
//   node scripts/prints.mjs [http://localhost:8787]
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, '..', 'docs', 'screenshots');
const base = process.argv[2] ?? 'http://localhost:8787';
const CHROMES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = CHROMES.find((c) => existsSync(c));
if (!chrome) throw new Error('Não encontrei o Chrome: indica o caminho na variável CHROME.');

// [ficheiro, caminho, largura, altura]
const IMAGENS = [
  ['start', '/?lang=en', 1440, 900],
  ['board', '/demo?lang=en&passo=4', 1440, 900],
  ['market', '/demo?lang=en&passo=5', 1440, 900],
  ['auction', '/demo?lang=en&passo=6', 1440, 900],
  ['draft', '/demo?lang=en&passo=3', 1440, 900],
  ['mystery', '/demo?lang=en&passo=12', 1440, 900],
  ['squad', '/demo?lang=en&passo=17', 1440, 900],
  ['match', '/demo?lang=en&passo=20', 1440, 900],
  ['injury', '/demo?lang=en&passo=21', 1440, 900],
  ['champion', '/demo?lang=en&passo=24', 1440, 900],
  // Para a imagem de capa (scripts/capa.mjs): sem o guia da demo, nas duas línguas.
  ['capa-mercado-en', '/demo?lang=en&passo=5&limpo=1', 1440, 900],
  ['capa-campeao-en', '/demo?lang=en&passo=24&limpo=1', 1440, 900],
  ['capa-mercado-pt', '/demo?lang=pt&passo=5&limpo=1', 1440, 900],
  ['capa-campeao-pt', '/demo?lang=pt&passo=24&limpo=1', 1440, 900],
];

await mkdir(destino, { recursive: true });
for (const [nome, caminho, w, h] of IMAGENS) {
  const perfil = await mkdtemp(join(tmpdir(), 'coach-board-print-'));
  try {
    await promisify(execFile)(chrome, [
      '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${perfil}`,
      '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio',
      `--window-size=${w},${h}`, '--virtual-time-budget=12000', `--screenshot=${join(destino, `${nome}.png`)}`,
      `${base}${caminho}`,
    ], { timeout: 90000 });
    console.log(`docs/screenshots/${nome}.png`);
  } finally {
    await rm(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}
