// Copia para o cliente os módulos partilhados com o servidor (a configuração e as formações), para que haja um
// só sítio onde mudar os valores. Também copia os logos de assets/ para public/logos e faz a lista deles.
// Corre antes de cada `wrangler dev`/`deploy` (build em wrangler.jsonc).
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARCAS, PATROCINIOS } from '../src/motor/marcas.js';

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

// O ficheiro de cada logo escolhe-se pelo nome, sem contar com acentos, maiúsculas, espaços e pontuação:
// "Jardins Paulo Meira" encontra jardins-paulomeira.webp.
const normalizar = (t) => t.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
// Os logos cujo ficheiro não tem o nome completo.
const FICHEIROS = {
  'TimViewer23': 'timviewer',
  'Cerveja Conal': 'conal',
  'Construções Lomba': 'lomba',
  'Colchões Camarrata': 'camarrata',
  'Bar de Alterne O Pau': 'bar-opau',
  'Água dos Mijos': 'agua-mijos',
  'Convento de Freires': 'convento-freires',
};
const destinoLogos = join(raiz, 'public', 'logos');
rmSync(destinoLogos, { recursive: true, force: true });
const logos = {};
const semLogo = [];
const orfaos = [];
for (const [pasta, grupos] of [['marcas', MARCAS], ['patrocinios', PATROCINIOS]]) {
  const origem = join(raiz, '..', 'assets', pasta);
  const ficheiros = existsSync(origem) ? readdirSync(origem).filter((f) => /\.(webp|png|jpe?g|svg)$/i.test(f)) : [];
  const porNome = new Map(ficheiros.map((f) => [normalizar(f.replace(/\.[^.]+$/, '')), f]));
  mkdirSync(join(destinoLogos, pasta), { recursive: true });
  for (const nome of Object.values(grupos).flat()) {
    const chave = normalizar(FICHEIROS[nome] ?? nome);
    const ficheiro = porNome.get(chave);
    porNome.delete(chave);
    if (!ficheiro) {
      semLogo.push(nome);
      continue;
    }
    copyFileSync(join(origem, ficheiro), join(destinoLogos, pasta, ficheiro));
    logos[nome] = `/logos/${pasta}/${encodeURIComponent(ficheiro)}`;
  }
  orfaos.push(...porNome.values());
}
writeFileSync(join(destino, 'logos.gen.js'), `${cabecalho}export const LOGOS = ${JSON.stringify(logos, null, 2)};\n`);
console.log(`Logos: ${Object.keys(logos).length} com imagem, ${semLogo.length} sem${semLogo.length ? ` (${semLogo.join(', ')})` : ''}.`);
if (orfaos.length) console.warn(`Logos sem marca nem patrocinador com esse nome: ${orfaos.join(', ')}`);
