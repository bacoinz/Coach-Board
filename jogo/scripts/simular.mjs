// Simulação de equilíbrio, sem interface: mede os golos dos jogos e o dinheiro ao longo de partidas inteiras, e escreve
// docs/equilibrio.md. Usa os valores de src/config.js: muda-se lá e corre-se outra vez.
//   npm run simular                  (por omissão: 20 000 jogos e 12 partidas por duração)
//   npm run simular -- --jogos 5000 --partidas 4
import { readFileSync, writeFileSync } from 'node:fs';
import { CONFIG } from '../src/config.js';
import { lerBase, descomprimir } from '../src/motor/base.js';
import { criarAleatorio } from '../src/motor/aleatorio.js';
import { novaSala, entrar, marcarPronto, configurar } from '../src/motor/sala-logica.js';
import { comecar, rankingFinal } from '../src/motor/partida.js';
import { criarJogo, jogarPeriodo } from '../src/motor/jogo.js';
import { jogador } from '../src/motor/estado.js';
import { valorSAD } from '../src/motor/tabuleiro.js';
import { passo } from './treinador-auto.mjs';

const argumento = (nome, omissao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? Number(process.argv[i + 1]) : omissao;
};
const N_JOGOS = argumento('jogos', 20000);
const N_PARTIDAS = argumento('partidas', 12);
const NIVEL_BOTS = process.argv.includes('--inferiores') ? 'inferior' : 'equivalente';

const base = lerBase(await descomprimir(readFileSync(new URL('../public/dados/jogadores.bin', import.meta.url)))).jogadores;
const contexto = (s) => ({ base, aleatorio: criarAleatorio(s), agora: 0 });

function novaPartida(ctx, treinadores, config) {
  const sala = novaSala({ codigo: 'SIMU', anfitriaoToken: 'token-simulacao-1', agora: 0 });
  for (let i = 1; i <= treinadores; i++) entrar(sala, { token: `token-simulacao-${i}`, nome: `T${i}` }, ctx);
  configurar(sala, 't1', config);
  for (const t of sala.treinadores) marcarPronto(sala, t.id, true);
  comecar(sala, ctx, 't1');
  return sala;
}

const pct = (x) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
const num = (x, c = 2) => x.toFixed(c).replace('.', ',');
const mediaDe = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);

// --- 1. Jogos isolados: duas equipas com um modificador conhecido ---

/** Duas equipas de 75, sem química nem tática: o modificador de cada uma é só o que se pede. */
function jogarCenario(ctx, modA, modB, n) {
  const sala = novaPartida(ctx, 2, {});
  for (const id of ['e1', 'e2']) {
    const e = sala.equipas[id];
    e.onze = CONFIG.formacoes['4-4-2'].map((posicao, i) => ({ posicao, jogador: e.plantel[i] }));
    e.formacao = '4-4-2';
  }
  const r = { golosA: 0, golosB: 0, vitA: 0, empates: 0, cincoMais: 0, totais: {}, vermelhos: 0, lesoes: 0, penaltis: 0 };
  for (let k = 0; k < n; k++) {
    const copia = structuredClone(sala);
    const jogo = criarJogo(copia, ctx, 'e1', 'e2', {});
    jogo.lados.forEach((l, i) => {
      l.onze.forEach((x, m) => { x.overall = 75; x.nacao = `n${m}`; });
      l.modExtra = i === 0 ? modA : modB;
    });
    for (let p = 0; p < CONFIG.jogo.periodos; p++) jogarPeriodo(copia, ctx, jogo);
    const [a, b] = jogo.lados.map((l) => l.golos);
    r.golosA += a;
    r.golosB += b;
    if (a > b) r.vitA++;
    if (a === b) r.empates++;
    if (a >= 5) r.cincoMais++;
    if (b >= 5) r.cincoMais++;
    const chave = `${Math.max(a, b)}-${Math.min(a, b)}`;
    r.totais[chave] = (r.totais[chave] ?? 0) + 1;
    r.vermelhos += jogo.eventos.filter((e) => e.tipo === 'vermelho').length;
    r.lesoes += jogo.eventos.filter((e) => e.tipo === 'lesao').length;
    r.penaltis += jogo.eventos.filter((e) => e.tipo === 'penalti').length;
  }
  return { ...r, n };
}

console.log(`A simular ${N_JOGOS} jogos entre equipas equivalentes…`);
const ctxJogos = contexto(1);
const iguais = jogarCenario(ctxJogos, 0, 0, N_JOGOS);
const CENARIOS = [
  ['Equivalentes (0)', 0, 0],
  ['Química no máximo (+0,5)', 0.5, 0],
  ['Força +1', 1, -1],
  [`Tática a favor (+${CONFIG.jogo.bonusTatica})`, CONFIG.jogo.bonusTatica, 0],
  ['Força +2', 2, -2],
  ['Força +1 e tática', 1 + CONFIG.jogo.bonusTatica, -1],
  ['Força +2 e tática', 2 + CONFIG.jogo.bonusTatica, -2],
  ['Vermelho contra o adversário', 0, -1],
];
const nCenario = Math.round(N_JOGOS / 4);
const cenarios = CENARIOS.map(([nome, a, b]) => ({ nome, a, b, ...jogarCenario(ctxJogos, a, b, nCenario) }));

// --- 2. Partidas inteiras ---

function jogarPartida(semente, epocas, treinadores, bots) {
  const ctx = contexto(semente);
  const sala = novaPartida(ctx, treinadores, { epocas, bots, nivelBots: NIVEL_BOTS });
  const porEpoca = Array.from({ length: epocas }, () => ({ dinheiro: [], valor: [], onze: [], golos: 0, jogos: 0, compras: 0 }));
  let epocaAnterior = 1;
  let voltaAnterior = 0;
  const contados = new Set();
  let condenados = 0;
  let cartaAnterior = null;
  let lanceAnterior = null;
  const lances = { verao: 0, inverno: 0 };
  const janelas = { verao: 0, inverno: 0 };
  let janelaAnterior = null;
  const fotografar = (i) => {
    for (const e of Object.values(sala.equipas)) {
      if (!e.treinador) continue;
      const js = e.plantel.map((id) => jogador(sala, ctx, id));
      porEpoca[i].dinheiro.push(e.dinheiro);
      porEpoca[i].valor.push(js.reduce((s, j) => s + (j.emprestado ? 0 : j.valor), 0));
      const onze = (e.onze ?? []).filter((l) => l.overall != null);
      porEpoca[i].onze.push(mediaDe(onze.map((l) => l.overall)));
    }
  };
  let n = 0;
  while (sala.fase !== 'fim' && n++ < 400000) {
    passo(sala, ctx);
    const janela = sala.janela;
    if (janela) {
      if (janela.ultimaCarta && janela.ultimaCarta !== cartaAnterior) {
        cartaAnterior = janela.ultimaCarta;
        if (cartaAnterior.titulo === 'Clube condenado') condenados++;
      }
      if (janela.ultimoLance && janela.ultimoLance !== lanceAnterior) {
        lanceAnterior = janela.ultimoLance;
        lances[janela.tipo]++;
      }
      if (janela !== janelaAnterior) {
        janelaAnterior = janela;
        janelas[janela.tipo]++;
      }
    }
    const c = sala.campeonato;
    if (sala.fase === 'campeonato' && c?.fase === 'resultados') {
      const chave = `${sala.epoca}-${c.volta}-${c.jornada}`;
      if (!contados.has(chave)) {
        contados.add(chave);
        for (const jogo of c.jogos) {
          porEpoca[sala.epoca - 1].golos += jogo.lados[0].golos + jogo.lados[1].golos;
          porEpoca[sala.epoca - 1].jogos++;
        }
      }
      if (c.volta === 2 && c.jornada === sala.calendario.length - 1 && voltaAnterior !== sala.epoca) {
        voltaAnterior = sala.epoca;
        fotografar(sala.epoca - 1);
      }
    }
    if (sala.epoca !== epocaAnterior) epocaAnterior = sala.epoca;
  }
  const ranking = rankingFinal(sala);
  return { porEpoca, passos: n, ranking, condenados, lancesVerao: lances.verao / (janelas.verao * treinadores), lancesInverno: lances.inverno / (janelas.inverno * treinadores), titulosVencedor: ranking[0].titulos, bots: Object.values(sala.equipas).filter((e) => e.bot).map((e) => e.id), palmares: sala.palmares };
}

const DURACOES = [3, 5, 8, 10];
const partidas = {};
for (const epocas of DURACOES) {
  console.log(`A simular ${N_PARTIDAS} partidas de ${epocas} épocas (4 treinadores, 2 bots)…`);
  partidas[epocas] = Array.from({ length: N_PARTIDAS }, (_, i) => jogarPartida(100 * epocas + i, epocas, 4, 2));
}

function resumoEpocas(lista, epocas) {
  return Array.from({ length: epocas }, (_, i) => {
    const d = lista.map((p) => p.porEpoca[i]);
    return {
      epoca: i + 1,
      golos: mediaDe(d.map((x) => (x.jogos ? x.golos / x.jogos : 0))),
      dinheiro: mediaDe(d.flatMap((x) => x.dinheiro)),
      dinheiroMax: Math.max(...d.flatMap((x) => x.dinheiro), 0),
      valor: mediaDe(d.flatMap((x) => x.valor)),
      onze: mediaDe(d.flatMap((x) => x.onze)),
    };
  });
}

// --- Relatório ---

const totalJogos = iguais.n;
const resultados = Object.entries(iguais.totais).sort((a, b) => b[1] - a[1]).slice(0, 10);
const linhas = [];
const L = (t = '') => linhas.push(t);
L('# Equilíbrio: resultados da simulação');
L();
L('Gerado por `npm run simular`, com os valores de `jogo/src/config.js`. Muda-se lá e corre-se outra vez.');
L();
L('**O que isto ainda não inclui:** marcas e patrocínios (o dinheiro deles), evolução e envelhecimento dos jogadores, e os ajustes de plantel dos bots (entram no passo 5). Os treinadores são automáticos e simples: compram quem melhora o onze e não têm a malícia de um jogador a sério.');
L();
L('## 1. Jogos entre equipas equivalentes');
L();
L(`${totalJogos.toLocaleString('pt-PT')} jogos, modificador 0 dos dois lados. **Objetivo: ~2 golos por equipa; 5 ou mais raro.**`);
L();
L('| Medida | Resultado |');
L('|---|---:|');
L(`| Golos por equipa | **${num((iguais.golosA + iguais.golosB) / (2 * totalJogos))}** |`);
L(`| Golos por jogo | ${num((iguais.golosA + iguais.golosB) / totalJogos)} |`);
L(`| Empates | ${pct(iguais.empates / totalJogos)} |`);
L(`| Uma equipa marca 5 ou mais | ${pct(iguais.cincoMais / (2 * totalJogos))} das equipas |`);
L(`| Vermelhos por jogo | ${num(iguais.vermelhos / totalJogos)} |`);
L(`| Lesões por jogo | ${num(iguais.lesoes / totalJogos)} |`);
L(`| Penáltis por jogo | ${num(iguais.penaltis / totalJogos)} |`);
L();
L('**Resultados mais frequentes:**');
L();
L('| Resultado | Frequência |');
L('|---|---:|');
for (const [r, n] of resultados) L(`| ${r} | ${pct(n / totalJogos)} |`);
L();
L('## 2. O peso de cada modificador');
L();
L(`${nCenario.toLocaleString('pt-PT')} jogos por linha. "A favor" é a equipa com a vantagem.`);
L();
L('| Vantagem | Golos a favor | Golos contra | Ganha | Empata | Perde |');
L('|---|---:|---:|---:|---:|---:|');
for (const c of cenarios) {
  const vit = c.vitA / c.n;
  const emp = c.empates / c.n;
  L(`| ${c.nome} | ${num(c.golosA / c.n)} | ${num(c.golosB / c.n)} | ${pct(vit)} | ${pct(emp)} | ${pct(1 - vit - emp)} |`);
}
L();
L('## 3. Partidas inteiras: dinheiro e nível dos plantéis');
L();
L(`${N_PARTIDAS} partidas por duração, 4 treinadores e 2 bots de nível ${NIVEL_BOTS}. Valores médios por treinador **no fim de cada época**. O orçamento inicial é ${CONFIG.inicio.orcamento} M€ e o plantel inicial vale cerca de 100 M€.`);
for (const epocas of DURACOES) {
  L();
  L(`### ${epocas} épocas`);
  L();
  L('| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |');
  L('|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of resumoEpocas(partidas[epocas], epocas)) {
    L(`| ${r.epoca} | ${num(valorSAD(r.epoca), 1)} M€ | ${num(r.golos)} | ${num(r.dinheiro, 0)} M€ | ${num(r.dinheiroMax, 0)} M€ | ${num(r.valor, 0)} M€ | ${num(r.onze, 1)} |`);
  }
  const lista = partidas[epocas];
  const titulosBot = mediaDe(lista.map((p) => p.palmares.filter((x) => p.bots.includes(x.campeao)).length));
  L();
  L(`Títulos do vencedor: ${num(mediaDe(lista.map((p) => p.titulosVencedor)), 1)} de ${epocas}. Títulos ganhos por bots: ${num(titulosBot, 2)} por partida (**${pct(titulosBot / epocas)} dos títulos**). Condenações na Investigação: ${num(mediaDe(lista.map((p) => p.condenados)), 1)} por partida. Vezes no tabuleiro por treinador: ${num(mediaDe(lista.map((p) => p.lancesVerao)), 0)} no verão e ${num(mediaDe(lista.map((p) => p.lancesInverno)), 0)} no inverno.`);
}
L();
const destino = new URL('../../docs/equilibrio.md', import.meta.url);
writeFileSync(destino, linhas.join('\n'));
console.log(linhas.slice(0, 40).join('\n'));
console.log(`\nEscrito em docs/equilibrio.md`);
