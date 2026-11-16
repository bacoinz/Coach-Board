// Copia do pacote flag-icons (licença MIT) só as bandeiras dos países da base, para public/bandeiras.
// Corre-se uma vez depois de `npm install` (npm run bandeiras); o resultado fica no repositório.
import { copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAISES } from './paises.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'node_modules', 'flag-icons', 'flags', '4x3');
const destino = join(raiz, 'public', 'bandeiras');
mkdirSync(destino, { recursive: true });

let total = 0;
for (const [, codigo] of Object.values(PAISES)) {
  copyFileSync(join(origem, `${codigo}.svg`), join(destino, `${codigo}.svg`));
  total += statSync(join(destino, `${codigo}.svg`)).size;
}
writeFileSync(join(raiz, 'public', 'LICENCAS.txt'), [
  '# Licenças de terceiros incluídas no Coach Board',
  '',
  '## Fontes — SIL Open Font License 1.1',
  '- Anton (Vernon Adams)',
  '- Inter (Rasmus Andersson)',
  '',
  '## Bandeiras — flag-icons (https://github.com/lipis/flag-icons), licença MIT',
  '',
  '## Fotos dos jogadores',
  'Wikimedia Commons: o autor e a licença de cada foto aparecem no detalhe do jogador.',
  '',
  '## Dados dos jogadores',
  'EA SPORTS FC 27 Player Ratings (Kaggle, MikeDPad). Os dados e os nomes pertencem à Electronic Arts; projeto não comercial.',
  '',
].join('\n'));
console.log(`${Object.keys(PAISES).length} bandeiras, ${(total / 1024).toFixed(0)} KB.`);
