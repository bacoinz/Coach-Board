// Liga os jogadores do EAFC às fotos do Wikimedia Commons, através da Wikidata (imagem P18).
// Um jogador só fica com foto se a data de nascimento for exatamente a mesma E o nome bater: é melhor uma silhueta
// do que a cara de outra pessoa.
//   node scripts/fotos.mjs     → dados/fotos.json (id → ficheiro) e public/dados/creditos-fotos.json (id → autor, licença)
// Depois corre-se `npm run dados`, que põe o ficheiro de cada jogador na base. As respostas ficam em cache.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerRegistos } from './csv.mjs';
import { CONFIG } from '../src/config.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(raiz, '..', 'dados', 'brutos', '.cache-fotos');
const UA = 'CoachBoard/1.0 (https://coach-board.bacoinz.workers.dev; football board game, data build script)';
mkdirSync(CACHE, { recursive: true });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pedido com cache em disco e novas tentativas (a Wikidata limita os pedidos). */
async function pedir(chave, url, opcoes = {}) {
  const ficheiro = join(CACHE, `${chave}.json`);
  if (existsSync(ficheiro)) return JSON.parse(readFileSync(ficheiro, 'utf8'));
  for (let t = 0; t < 6; t++) {
    const r = await fetch(url, { ...opcoes, headers: { 'User-Agent': UA, Accept: 'application/json', ...opcoes.headers } }).catch(() => null);
    if (r?.ok) {
      const dados = await r.json();
      writeFileSync(ficheiro, JSON.stringify(dados));
      return dados;
    }
    console.log(`  ${chave}: ${r?.status ?? 'sem resposta'}, a tentar de novo`);
    await esperar(5000 * (t + 1));
  }
  throw new Error(`falhou: ${chave}`);
}

const sparql = (chave, q) =>
  pedir(chave, 'https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' },
    body: `query=${encodeURIComponent(q)}`,
  }).then((d) => d.results.bindings);

const normalizar = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/ß/g, 'ss').replace(/[^a-z ]/g, ' ');
const palavras = (t) => normalizar(t).split(/\s+/).filter((p) => p.length >= 3);

// --- 1. Os jogadores do jogo, por data de nascimento ---
const registos = lerRegistos(readFileSync(join(raiz, '..', 'dados', 'brutos', 'players.csv'), 'utf8').replace(/^﻿/, ''))
  .filter((r) => r.gender === "Men's Football" && Number(r.overall_rating) >= CONFIG.dados.overallMinimo);
const porData = new Map();
for (const r of registos) {
  if (!porData.has(r.birthdate)) porData.set(r.birthdate, []);
  porData.get(r.birthdate).push(r);
}
console.log(`${registos.length} jogadores, ${porData.size} datas de nascimento`);

// --- 2. Futebolistas com imagem na Wikidata, nascidos nessas datas (um pedido por ano, para não dar timeout) ---
const anos = [...new Set(registos.map((r) => Number(r.birthdate.slice(0, 4))))].sort();
const candidatos = new Map(); // qid → { data, img }
for (const ano of anos) {
  const linhas = await sparql(`img-${ano}`, `SELECT ?p ?b ?img WHERE {
    ?p wdt:P106 wd:Q937857 ; wdt:P18 ?img ; wdt:P569 ?b .
    FILTER(?b >= "${ano}-01-01T00:00:00Z"^^xsd:dateTime && ?b < "${ano + 1}-01-01T00:00:00Z"^^xsd:dateTime)
  }`);
  for (const l of linhas) {
    const data = l.b.value.slice(0, 10);
    if (!porData.has(data)) continue;
    const qid = l.p.value.split('/').pop();
    if (!candidatos.has(qid)) candidatos.set(qid, { data, img: decodeURIComponent(l.img.value.split('/Special:FilePath/')[1]) });
  }
  console.log(`  ${ano}: ${linhas.length} com imagem (${candidatos.size} candidatos até agora)`);
  await esperar(1000);
}

// --- 3. Os nomes dos candidatos ---
const qids = [...candidatos.keys()];
const LOTE = 400;
for (let i = 0; i < qids.length; i += LOTE) {
  const lote = qids.slice(i, i + LOTE);
  const linhas = await sparql(`nomes-${i}-${lote.length}`, `SELECT ?p ?l WHERE {
    VALUES ?p { ${lote.map((q) => `wd:${q}`).join(' ')} }
    ?p rdfs:label|skos:altLabel ?l .
    FILTER(LANG(?l) IN ("en", "mul", "pt", "es", "fr", "de"))
  }`);
  for (const l of linhas) {
    const c = candidatos.get(l.p.value.split('/').pop());
    (c.nomes ??= new Set()).add(l.l.value);
  }
  await esperar(500);
}

// --- 4. Associação: a mesma data e o apelido (ou o nome único) nas palavras do nome ---
/** Pontos de um candidato: todas as palavras do apelido têm de aparecer; o nome próprio dá um extra. */
function pontos(r, nomes) {
  const doCandidato = new Set([...nomes].flatMap(palavras));
  const apelido = palavras(r.last_name);
  const comum = palavras(r.common_name);
  const proprio = palavras(r.first_name);
  const bate = (lista) => lista.length && lista.every((p) => doCandidato.has(p));
  if (!bate(apelido) && !bate(comum)) return 0;
  return 1 + (proprio.some((p) => doCandidato.has(p)) ? 1 : 0);
}

const fotos = {};
const usados = new Set();
const porDataCand = new Map();
for (const [qid, c] of candidatos) {
  if (!porDataCand.has(c.data)) porDataCand.set(c.data, []);
  porDataCand.get(c.data).push({ qid, ...c });
}
for (const [data, jogadores] of porData) {
  for (const r of jogadores) {
    const pares = (porDataCand.get(data) ?? []).filter((c) => c.nomes && !usados.has(c.qid)).map((c) => ({ c, p: pontos(r, c.nomes) })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p);
    // Dois candidatos empatados: não se sabe qual é, fica sem foto.
    if (!pares.length || (pares[1] && pares[1].p === pares[0].p)) continue;
    fotos[r.player_id] = pares[0].c.img;
    usados.add(pares[0].c.qid);
  }
}
const ids = Object.keys(fotos);
const porOverall = registos.filter((r) => Number(r.overall_rating) >= 80);
console.log(`Com foto: ${ids.length} de ${registos.length} (${Math.round((ids.length / registos.length) * 100)}%); overall ≥ 80: ${porOverall.filter((r) => fotos[r.player_id]).length} de ${porOverall.length}`);

// --- 5. Autor e licença de cada ficheiro (obrigatório nas licenças CC) ---
const limpar = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
const ficheiros = [...new Set(Object.values(fotos))];
const metadados = new Map();
for (let i = 0; i < ficheiros.length; i += 50) {
  const lote = ficheiros.slice(i, i + 50);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName&titles=${encodeURIComponent(lote.map((f) => `File:${f}`).join('|'))}`;
  const d = await pedir(`meta-${i}`, url);
  for (const p of Object.values(d.query?.pages ?? {})) {
    const m = p.imageinfo?.[0]?.extmetadata;
    if (m) metadados.set(p.title.replace(/^File:/, '').replace(/_/g, ' '), [limpar(m.Artist?.value), limpar(m.LicenseShortName?.value)]);
  }
  await esperar(200);
}

// Sem autor ou licença conhecidos não se pode creditar: fica sem foto.
const creditos = {};
for (const id of ids) {
  const m = metadados.get(fotos[id].replace(/_/g, ' '));
  if (m?.[1]) creditos[id] = m;
  else delete fotos[id];
}
writeFileSync(join(raiz, '..', 'dados', 'fotos.json'), JSON.stringify(fotos));
writeFileSync(join(raiz, 'public', 'dados', 'creditos-fotos.json'), JSON.stringify(creditos));
console.log(`Escritos: ${Object.keys(fotos).length} fotos com crédito.`);
