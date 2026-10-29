// Copia para o cliente os módulos partilhados com o servidor (a configuração e as formações), para que haja um
// só sítio onde mudar os valores. Corre antes de cada `wrangler dev`/`deploy` (build em wrangler.jsonc).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'public', 'js', 'comum');
mkdirSync(destino, { recursive: true });

const cabecalho = '// GERADO por scripts/gerar-comum.mjs a partir de src/ — não editar aqui.\n';
const copias = [
  ['src/config.js', 'config.gen.js'],
  ['src/motor/formacao.js', 'formacao.gen.js'],
];
for (const [origem, nome] of copias) {
  const texto = readFileSync(join(raiz, origem), 'utf8').replace("from '../config.js'", "from './config.gen.js'");
  writeFileSync(join(destino, nome), cabecalho + texto);
}
console.log(`Gerados ${copias.length} módulos em public/js/comum.`);
