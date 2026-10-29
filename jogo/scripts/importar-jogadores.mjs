// Converte o CSV do EAFC (dados/brutos/players.csv, "EA SPORTS FC 27 Player Ratings", Kaggle) na base do jogo:
// public/dados/jogadores.bin = JSON com gzip, em colunas, que o Durable Object carrega pela binding ASSETS.
// Só entram jogadores masculinos com overall ≥ CONFIG.dados.overallMinimo. A idade é a da data de referência.
//   node scripts/importar-jogadores.mjs [caminho-do-csv]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../src/config.js';
import { idadeEm, valorMercado } from '../src/motor/valores.js';
import { COLUNAS } from '../src/motor/base.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = process.argv[2] ?? join(raiz, '..', 'dados', 'brutos', 'players.csv');
const destino = join(raiz, 'public', 'dados', 'jogadores.bin');

const POSICOES = new Set(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST']);

/** CSV com aspas (RFC 4180): devolve linhas de campos. */
function lerCsv(texto) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo.replace(/\r$/, ''));
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  if (campo || linha.length) linhas.push([...linha, campo]);
  return linhas;
}

const [cabecalho, ...linhas] = lerCsv(readFileSync(origem, 'utf8').replace(/^﻿/, ''));
const registos = linhas.filter((l) => l.length === cabecalho.length).map((l) => Object.fromEntries(cabecalho.map((k, i) => [k, l[i]])));

// Tabelas de nomes repetidos (nações, ligas, clubes) guardam-se uma vez e os jogadores levam o índice.
const tabelas = { nacoes: [], ligas: [], clubes: [] };
const indices = { nacoes: new Map(), ligas: new Map(), clubes: new Map() };
function indice(tabela, nome) {
  if (!indices[tabela].has(nome)) {
    indices[tabela].set(nome, tabelas[tabela].length);
    tabelas[tabela].push(nome);
  }
  return indices[tabela].get(nome);
}

// As 6 facetas da carta: PAC SHO PAS DRI DEF PHY, ou DIV HAN KIC REF SPD POS nos guarda-redes.
const facetas = (r) =>
  (r.position === 'GK'
    ? [r.goalkeeping_diving, r.goalkeeping_handling, r.goalkeeping_kicking, r.goalkeeping_reflexes, r.movement_sprint_speed, r.goalkeeping_positioning]
    : [r.pace, r.shooting, r.passing, r.dribbling, r.defending, r.physicality]
  ).map(Number);

const avisos = [];
const jogadores = [];
for (const r of registos) {
  if (r.gender !== "Men's Football") continue;
  const overall = Number(r.overall_rating);
  if (!(overall >= CONFIG.dados.overallMinimo)) continue;
  if (!POSICOES.has(r.position)) {
    avisos.push(`posição desconhecida ${r.position} (${r.player_id})`);
    continue;
  }
  const idade = idadeEm(r.birthdate, CONFIG.dados.dataReferencia);
  if (!Number.isFinite(idade)) {
    avisos.push(`sem data de nascimento (${r.player_id})`);
    continue;
  }
  const alternativas = r.alternate_positions.split(/\s+/).filter((p) => POSICOES.has(p) && p !== r.position);
  const nome = r.common_name || `${r.first_name} ${r.last_name}`.trim();
  const curto = r.common_name || r.last_name || r.first_name;
  // A ordem tem de ser a de COLUNAS (src/motor/base.js).
  jogadores.push([
    Number(r.player_id),
    nome,
    curto,
    idade,
    indice('nacoes', r.nationality),
    indice('ligas', r.league),
    indice('clubes', r.club),
    r.position,
    alternativas.join(' '),
    overall,
    Number(r.attacking_finishing),
    Number(r.attacking_short_passing),
    facetas(r),
  ]);
}
jogadores.sort((a, b) => b[COLUNAS.indexOf('overall')] - a[COLUNAS.indexOf('overall')]);

const base = {
  edicao: registos[0]?.edition ?? '',
  snapshot: registos[0]?.snapshot_date ?? '',
  dataReferencia: CONFIG.dados.dataReferencia,
  colunas: COLUNAS,
  ...tabelas,
  jogadores,
};
const json = JSON.stringify(base);
const gz = gzipSync(json, { level: 9 });
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, gz);

// --- Relatório ---
const col = (j, nome) => j[COLUNAS.indexOf(nome)];
const contar = (lista, f) => lista.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map());
const LINHA = { GK: 'GR', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MED', CM: 'MED', CAM: 'MED', LM: 'MED', RM: 'MED', LW: 'AV', RW: 'AV', ST: 'AV' };
const entre = (j, nome, a, b) => col(j, nome) >= a && col(j, nome) <= b;

console.log(`${base.edicao} (snapshot ${base.snapshot}): ${registos.length} registos → ${jogadores.length} jogadores`);
console.log(`${tabelas.nacoes.length} nações, ${tabelas.ligas.length} ligas, ${tabelas.clubes.length} clubes`);
console.log(`ficheiro: ${(json.length / 1024).toFixed(0)} KB em JSON, ${(gz.length / 1024).toFixed(0)} KB com gzip`);
console.log('por linha:', Object.fromEntries(contar(jogadores, (j) => LINHA[col(j, 'posicao')])));
console.log('por posição:', Object.fromEntries(contar(jogadores, (j) => col(j, 'posicao'))));
console.log('plantel inicial (70–78):', jogadores.filter((j) => entre(j, 'overall', 70, 78)).length);
const criterio = (c) => (j) => entre(j, 'idade', ...c.idade) && entre(j, 'overall', ...c.overall);
console.log('jovens do draft:', jogadores.filter(criterio(CONFIG.draft.jovem)).length);
CONFIG.draft.extra.forEach((c, n) => console.log(`escolha extra do último (${n + 1}):`, jogadores.filter(criterio(c)).length));
console.log('Jovens Talentos:', jogadores.filter(criterio(CONFIG.cartas.jovensTalentos)).length);
for (const [n, f] of CONFIG.mercado.fases.entries()) if (f) console.log(`Mercado, faixa da fase ${n} (${f[0]}–${f[1]}):`, jogadores.filter((j) => entre(j, 'overall', ...f)).length);
const valorTotal = jogadores.reduce((s, j) => s + valorMercado(col(j, 'overall'), col(j, 'idade')), 0);
console.log(`valor de mercado de toda a base: ${valorTotal.toFixed(0)} M€`);
if (avisos.length) console.log(`${avisos.length} avisos:`, avisos.slice(0, 10));
console.log(`→ ${destino}`);
