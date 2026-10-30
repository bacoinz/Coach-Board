// Motor de um jogo: 9 períodos em que cada equipa lança dois dados. Sem I/O nem relógio: quem chama avança os períodos.
import { CONFIG } from '../config.js';
import { comPeso, dado, escolher, inteiro } from './aleatorio.js';
import { jogador, transferir, registar } from './estado.js';
import { livresQue, tirarEmprestimo } from './cartas.js';
import { overallNaPosicao } from './formacao.js';
import { frase, fimDePartida } from './misterio.js';

const J = CONFIG.jogo;
const LINHA = CONFIG.posicoes.linha;

/** As táticas e o ciclo: cada uma vence a seguinte. */
export const CICLO_TATICAS = J.taticas;

export function taticaVence(a, b) {
  return CICLO_TATICAS[(CICLO_TATICAS.indexOf(a) + 1) % CICLO_TATICAS.length] === b;
}

const media = (lista) => (lista.length ? lista.reduce((s, x) => s + x, 0) / lista.length : 0);

function entrada(sala, ctx, id, posicao, extra = {}) {
  const j = jogador(sala, ctx, id);
  return { posicao, jogador: id, nome: j.curto, nacao: j.nacao, overall: overallNaPosicao(j, posicao) ?? j.overall, ...extra };
}

/** O onze de uma equipa para este jogo, depois dos efeitos das cartas Mistério, que se gastam aqui. */
function prepararLado(sala, ctx, equipaId, tatica) {
  const e = sala.equipas[equipaId];
  const lado = {
    equipa: equipaId,
    tatica,
    onze: (e.onze ?? []).filter((l) => l.jogador != null).map((l) => entrada(sala, ctx, l.jogador, l.posicao)),
    suplente: e.suplente ?? null,
    subUsada: false,
    subPedida: null,
    vermelhos: 0,
    modExtra: e.bot ? (sala.campeonato?.competicao === 'taca' ? CONFIG.bots.modificadorTaca : CONFIG.bots.modificador)[sala.config.nivelBots] ?? 0 : 0,
    golos: 0,
    minutos: {},
    marcadores: {},
    assistencias: {},
  };
  const temporario = (posicao, overall) => {
    const id = escolher(ctx.aleatorio, livresQue(sala, ctx, { posicao, overall })) ?? tirarEmprestimo(sala, ctx, posicao);
    return id == null ? null : entrada(sala, ctx, id, posicao, { temp: true });
  };
  for (const ef of e.efeitos ?? []) {
    if (ef.efeito === 'modificador') lado.modExtra += ef.valor;
    else if (ef.efeito === 'craque') {
      const pior = lado.onze.reduce((a, b) => (b.overall < a.overall ? b : a), lado.onze[0]);
      const novo = pior && temporario(pior.posicao, ef.overall);
      if (novo) lado.onze[lado.onze.indexOf(pior)] = novo;
    } else {
      const i = lado.onze.findIndex((l) => l.jogador === ef.jogador);
      if (i < 0) continue;
      const pos = lado.onze[i].posicao;
      const sup = lado.suplente != null && jogador(sala, ctx, lado.suplente);
      if (sup && overallNaPosicao(sup, pos) != null) {
        lado.onze[i] = entrada(sala, ctx, sup.id, pos);
        lado.suplente = null;
      } else {
        const novo = temporario(pos, J.substitutoUmJogo.overall);
        if (novo) lado.onze[i] = novo;
      }
    }
  }
  delete e.efeitos;
  return lado;
}

export function criarJogo(sala, ctx, casa, fora, taticas = {}) {
  return {
    lados: [prepararLado(sala, ctx, casa, taticas[casa]), prepararLado(sala, ctx, fora, taticas[fora])],
    // Nas últimas épocas a Força conta menos, para haver mais surpresas.
    forcaMaxima: fimDePartida(sala) ? CONFIG.misterio.fimDePartida.forcaMaxima : J.forca.maximo,
    periodo: 0,
    acabou: false,
    eventos: [],
  };
}

// --- Modificador ---

const linhaMedia = (lado, linhas) => media(lado.onze.filter((l) => linhas.includes(LINHA[l.posicao])).map((l) => l.overall));

/** Ataque do lado menos a Defesa adversária: ±1 por cada 3 pontos, entre −2 e +2. */
export function forca(lado, adversario, maximo = J.forca.maximo) {
  const dif = linhaMedia(lado, ['MED', 'AV']) - linhaMedia(adversario, ['GR', 'DEF']);
  return Math.max(-maximo, Math.min(maximo, Math.trunc(dif / J.forca.pontosPorUnidade)));
}

/** Pequeno bónus por grupos de jogadores da mesma nacionalidade. */
export function quimica(lado) {
  const conta = {};
  for (const l of lado.onze) conta[l.nacao] = (conta[l.nacao] ?? 0) + 1;
  const grupos = Object.values(conta).filter((n) => n >= J.quimica.tamanhoGrupo).length;
  return Math.min(J.quimica.maximo, grupos * J.quimica.porGrupo);
}

export function modificador(jogo, i) {
  const [lado, adv] = [jogo.lados[i], jogo.lados[1 - i]];
  const tatica = lado.tatica && adv.tatica && taticaVence(lado.tatica, adv.tatica) ? J.bonusTatica : 0;
  return forca(lado, adv, jogo.forcaMaxima) + tatica + quimica(lado) + lado.modExtra - lado.vermelhos * J.vermelho;
}

// --- Golos ---

function sortearJogador(rng, lado, pesos, atributo, base, excluir = null) {
  const pares = lado.onze.filter((l) => l.jogador !== excluir).map((l) => [l, pesos[LINHA[l.posicao]] * (base.get(l.jogador)?.[atributo] ?? 50)]);
  return comPeso(rng, pares);
}

function golo(jogo, ctx, i, minuto, tipo) {
  const lado = jogo.lados[i];
  const rng = ctx.aleatorio;
  const marcador = sortearJogador(rng, lado, J.pesoMarcar, 'finalizacao', ctx.base);
  lado.golos++;
  lado.marcadores[marcador.jogador] = (lado.marcadores[marcador.jogador] ?? 0) + 1;
  let assistente = null;
  if (tipo !== 'penalti' && rng() < J.probabilidadeAssistencia) {
    assistente = sortearJogador(rng, lado, J.pesoAssistir, 'passe', ctx.base, marcador.jogador);
    if (assistente) lado.assistencias[assistente.jogador] = (lado.assistencias[assistente.jogador] ?? 0) + 1;
  }
  jogo.eventos.push({ minuto, lado: i, tipo: 'golo', jogador: marcador.nome, assistencia: assistente?.nome ?? null, origem: tipo });
}

// --- Lesões ---

/** Lesão sem carta: fica de fora até à próxima janela; vem um emprestado da mesma posição (15% de ser igual ou melhor). */
function lesionar(sala, ctx, jogo, i, minuto) {
  const lado = jogo.lados[i];
  const rng = ctx.aleatorio;
  const alvo = escolher(rng, lado.onze);
  if (!alvo) return;
  const e = sala.equipas[lado.equipa];
  const texto = frase(rng, jogador(sala, ctx, alvo.jogador), 'lesao');
  if (e.cartas?.medico > 0 && !e.bot && !alvo.temp) {
    e.cartas.medico--;
    jogo.eventos.push({ minuto, lado: i, tipo: 'lesao', texto: `${texto} O Departamento médico resolve.` });
    return;
  }
  const { probabilidadeIgualOuMelhor: p, margemMelhor, margemPior } = J.emprestimoLesao;
  const ov = alvo.overall;
  const faixa = rng() < p ? [ov, ov + margemMelhor] : [ov - margemPior, ov - 1];
  const id = escolher(rng, livresQue(sala, ctx, { posicao: alvo.posicao, overall: faixa })) ?? tirarEmprestimo(sala, ctx, alvo.posicao);
  if (id == null) return;
  if (!alvo.temp) {
    const d = sala.jogadores[alvo.jogador];
    if (d) d.lesionado = true;
  }
  transferir(sala, id, lado.equipa, { emprestado: true, emprestadoLesao: true });
  const novo = entrada(sala, ctx, id, alvo.posicao);
  lado.onze[lado.onze.indexOf(alvo)] = novo;
  // O emprestado fica no onze até à próxima janela.
  e.onze = (e.onze ?? []).map((l) => (l.jogador === alvo.jogador ? { posicao: l.posicao, jogador: id, overall: novo.overall } : l));
  jogo.eventos.push({ minuto, lado: i, tipo: 'lesao', texto: `${texto} Entra ${novo.nome}, emprestado.` });
  registar(sala, ctx, `Lesão em ${e.nome}: ${texto} Entra ${novo.nome}, emprestado.`, { tipo: 'lesao' });
}

function acontecimento(sala, ctx, jogo, i, minuto) {
  const rng = ctx.aleatorio;
  const A = J.acontecimentos;
  if (rng() < A.leves) {
    jogo.eventos.push({ minuto, lado: i, tipo: 'leve', texto: escolher(rng, A.textosLeves) });
    return;
  }
  const carta = comPeso(rng, Object.entries(A.fortes));
  if (carta === 'vermelho') {
    jogo.lados[1 - i].vermelhos++;
    jogo.eventos.push({ minuto, lado: 1 - i, tipo: 'vermelho' });
  } else if (carta === 'lesao') lesionar(sala, ctx, jogo, 1 - i, minuto);
  else {
    const minimo = carta === 'penalti' ? A.penaltiMinimo : A.bolaParadaMinimo;
    const d = dado(rng);
    jogo.eventos.push({ minuto, lado: i, tipo: carta, dado: d, marcou: d >= minimo });
    if (d >= minimo) golo(jogo, ctx, i, minuto, carta === 'penalti' ? 'penalti' : 'bolaParada');
  }
}

// --- Um período ---

/** Lance de um lado: dois dados + modificador. A parte decimal do modificador é a probabilidade de +1. */
function lance(sala, ctx, jogo, i, minuto) {
  const rng = ctx.aleatorio;
  const m = modificador(jogo, i);
  const inteiroM = Math.floor(m) + (rng() < m - Math.floor(m) ? 1 : 0);
  const dados = [dado(rng), dado(rng)];
  const total = dados[0] + dados[1] + inteiroM;
  const op = J.oportunidades.find((o) => total <= o.ate) ?? J.oportunidades.at(-1);
  const ev = { minuto, lado: i, tipo: 'lance', dados, mod: inteiroM, total, oportunidade: op.nome };
  jogo.eventos.push(ev);
  if (op.nome !== 'nada') {
    const extra = op.dadoMinimo > 0 ? dado(rng) : null;
    ev.extra = extra;
    if (extra == null || extra >= op.dadoMinimo) golo(jogo, ctx, i, minuto, 'jogada');
  }
  if (dados[0] === dados[1]) acontecimento(sala, ctx, jogo, i, minuto);
}

function aplicarSubstituicao(sala, ctx, jogo, lado, minuto) {
  const sai = lado.subPedida;
  lado.subPedida = null;
  const i = lado.onze.findIndex((l) => l.jogador === sai);
  if (i < 0 || lado.suplente == null) return;
  const entra = entrada(sala, ctx, lado.suplente, lado.onze[i].posicao);
  jogo.eventos.push({ minuto, lado: jogo.lados.indexOf(lado), tipo: 'substituicao', entra: entra.nome, sai: lado.onze[i].nome });
  lado.onze[i] = entra;
  lado.suplente = null;
  lado.subUsada = true;
}

export function jogarPeriodo(sala, ctx, jogo) {
  if (jogo.acabou) return;
  const inicio = jogo.periodo * J.minutosPorPeriodo;
  for (const lado of jogo.lados) if (lado.subPedida != null) aplicarSubstituicao(sala, ctx, jogo, lado, inicio);
  for (const i of [0, 1]) lance(sala, ctx, jogo, i, inicio + inteiro(ctx.aleatorio, 1, J.minutosPorPeriodo));
  for (const lado of jogo.lados) for (const l of lado.onze) if (!l.temp) lado.minutos[l.jogador] = (lado.minutos[l.jogador] ?? 0) + J.minutosPorPeriodo;
  jogo.periodo++;
  jogo.acabou = jogo.periodo >= J.periodos;
}

/** Pede a substituição do jovem da formação: entra no período seguinte. */
export function pedirSubstituicao(sala, ctx, jogo, equipaId, sai) {
  const lado = jogo.lados.find((l) => l.equipa === equipaId);
  if (!lado) return { erro: 'Não estás neste jogo.' };
  if (jogo.acabou) return { erro: 'O jogo já acabou.' };
  if (lado.subUsada || lado.suplente == null) return { erro: 'Já não tens substituição.' };
  const lugar = lado.onze.find((l) => l.jogador === sai);
  if (!lugar) return { erro: 'Esse jogador não está em campo.' };
  if (overallNaPosicao(jogador(sala, ctx, lado.suplente), lugar.posicao) == null) return { erro: 'O jovem não joga nessa posição.' };
  lado.subPedida = sai;
  return { ok: true };
}

/** Quem pode sair para entrar o suplente (mais de um da posição: o treinador escolhe). */
export function podemSair(sala, ctx, lado) {
  if (lado.subUsada || lado.suplente == null) return [];
  const sup = jogador(sala, ctx, lado.suplente);
  return lado.onze.filter((l) => overallNaPosicao(sup, l.posicao) != null).map((l) => l.jogador);
}
