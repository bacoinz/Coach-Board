// Tabela de valores de mercado (M€) por overall e idade, e exemplos reais da base, para validar as fórmulas.
//   npm run valores   (depois de mudar config.valores)
import { readFileSync, existsSync } from 'node:fs';
import { CONFIG } from '../src/config.js';
import { valorMercado, clausula, precoBase, precoDraft, salarioJornada } from '../src/motor/valores.js';
import { lerBase, descomprimir } from '../src/motor/base.js';

const fmt = (v) => v.toFixed(1).replace('.', ',');
const idades = [19, 22, 26, 30, 32, 34, 36];
const overalls = [60, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90];

console.log(`| Overall | ${idades.map((i) => `${i} anos`).join(' | ')} |`);
console.log(`|---|${idades.map(() => '---:').join('|')}|`);
for (const ov of overalls) console.log(`| ${ov} | ${idades.map((i) => fmt(valorMercado(ov, i))).join(' | ')} |`);

const v = valorMercado(75, 26);
const jornadas = 2 * (8 - 1);
console.log(`\nJogador de 75 com 26 anos: valor ${fmt(v)}, cláusula ${fmt(clausula(v))}, preço base ${fmt(precoBase(v))}, draft ${fmt(precoDraft(v))}, salário ${(salarioJornada(v, jornadas) * 1000).toFixed(0)} mil € por jornada (com 8 equipas, ${jornadas} jornadas).`);

const ficheiro = new URL('../public/dados/jogadores.bin', import.meta.url);
if (existsSync(ficheiro)) {
  const { jogadores } = lerBase(await descomprimir(readFileSync(ficheiro)));
  const nomes = ['Kylian Mbappé', 'Lamine Yamal', 'Vitinha', 'Bruno Fernandes', 'Cristiano Ronaldo', 'Pedri', 'Rúben Dias', 'Diogo Costa', 'Gonçalo Ramos'];
  console.log('\n| Jogador | Overall | Idade | Valor | Cláusula |\n|---|---:|---:|---:|---:|');
  for (const nome of nomes) {
    const j = [...jogadores.values()].find((x) => x.nome === nome);
    if (j) {
      const val = valorMercado(j.overall, j.idade);
      console.log(`| ${j.nome} | ${j.overall} | ${j.idade} | ${fmt(val)} | ${fmt(clausula(val))} |`);
    }
  }
}
