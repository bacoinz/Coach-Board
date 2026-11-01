// Motor de um jogo: 9 períodos em que cada equipa lança dois dados. Sem I/O nem relógio: quem chama avança os períodos.
import { CONFIG } from '../config.js';
import { comPeso, dado, escolher, inteiro } from './aleatorio.js';
import { jogador, transferir, registar } from './estado.js';
import { livresQue, tirarEmprestimo } from './cartas.js';
import { overallNaPosicao, overallNatural } from './formacao.js';
import { fimDePartida } from './misterio.js';
import { quem, registarMomento } from './momentos.js';

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
  return { posicao, jogador: id, nome: j.curto, nacao: j.nacao, overall: overallNaPosicao(j, posicao), ...extra };
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
      if (sup && overallNatural(sup, pos) != null) {
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
    vezLance: 0, // em cada ronda, cada lado lança à vez: primeiro a casa
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

/**
 * Um emprestado da mesma posição fica no lugar do lesionado até à próxima janela. Nunca é melhor nem tem mais
 * valor de mercado do que ele. Devolve a entrada do emprestado ou null, se não houver ninguém.
 */
function emprestarPara(sala, ctx, lado, lesionado, posicao) {
  const rng = ctx.aleatorio;
  const e = sala.equipas[lado.equipa];
  const { overall, valor } = jogador(sala, ctx, lesionado);
  const limite = { posicao, valorMaximo: valor };
  const id = escolher(rng, livresQue(sala, ctx, { ...limite, overall: [overall - J.emprestimoLesao.margemPior, overall] }))
    ?? escolher(rng, livresQue(sala, ctx, { ...limite, overall: [0, overall] }))
    ?? tirarEmprestimo(sala, ctx, posicao);
  if (id == null) return null;
  transferir(sala, id, lado.equipa, { emprestado: true, emprestadoLesao: true });
  const novo = entrada(sala, ctx, id, posicao);
  e.onze = (e.onze ?? []).map((l) => (l.jogador === lesionado ? { posicao: l.posicao, jogador: id, overall: novo.overall } : l));
  return novo;
}

/**
 * Lesão: nos bots e nos jogadores temporários entra logo um emprestado. Nos treinadores, o jogo pára até o treinador
 * decidir: usar uma ficha médica, fazer entrar o suplente ou deixá-lo em campo, diminuído. Sem ficha nem suplente, só
 * lhe resta confirmar que ele fica.
 */
function lesionar(sala, ctx, jogo, i, minuto) {
  const lado = jogo.lados[i];
  const rng = ctx.aleatorio;
  // Os guarda-redes não se lesionam.
  const candidatos = lado.onze.filter((l) => !l.lesionado && l.posicao !== 'GK');
  const alvo = candidatos.length ? escolher(rng, candidatos) : null;
  if (!alvo) return;
  const e = sala.equipas[lado.equipa];
  const texto = `${alvo.nome} ${escolher(rng, J.lesoesEmCampo)}.`;
  registarMomento(sala, { equipa: lado.equipa, tom: 'mau', peso: 3, texto: `Azar ${quem(sala, lado.equipa).do}: ${texto}` });
  if (!e.bot && !alvo.temp) {
    alvo.lesionado = true;
    alvo.overall -= J.lesao.penalizacao;
    lado.lesionados = [...(lado.lesionados ?? []), { jogador: alvo.jogador, nome: alvo.nome, posicao: alvo.posicao, overall: alvo.overall + J.lesao.penalizacao, pendente: true, texto }];
    const d = sala.jogadores[alvo.jogador];
    if (d) d.lesionado = true;
    jogo.eventos.push({ minuto, lado: i, tipo: 'lesao', texto, jogador: alvo.nome });
    registar(sala, ctx, `Lesão em ${e.nome}: ${texto}`, { tipo: 'lesao' });
    return;
  }
  const novo = emprestarPara(sala, ctx, lado, alvo.jogador, alvo.posicao);
  if (!novo) return;
  lado.onze[lado.onze.indexOf(alvo)] = novo;
  jogo.eventos.push({ minuto, lado: i, tipo: 'lesao', texto: `${texto} Entra ${novo.nome}, emprestado.` });
  registar(sala, ctx, `Lesão em ${e.nome}: ${texto} Entra ${novo.nome}, emprestado.`, { tipo: 'lesao' });
}

const ladoDe = (jogo, equipaId) => jogo.lados.find((l) => l.equipa === equipaId);
const podeEntrarSuplente = (lado) => !lado.subUsada && lado.suplente != null;

/** Há alguma lesão à espera da decisão do treinador deste lado? */
export const lesaoPorDecidir = (lado) => (lado.lesionados ?? []).some((l) => l.pendente);

/** A ficha do Departamento médico: o jogador recupera e continua em campo. */
export function usarMedico(sala, ctx, jogo, equipaId, id) {
  const lado = ladoDe(jogo, equipaId);
  if (!lado) return { erro: 'Não estás neste jogo.' };
  if (jogo.acabou) return { erro: 'O jogo já acabou.' };
  const e = sala.equipas[equipaId];
  if (!(e.cartas.medico > 0)) return { erro: 'Não tens fichas de lesão.' };
  const les = (lado.lesionados ?? []).find((l) => id == null || l.jogador === id);
  if (!les) return { erro: 'Não tens ninguém lesionado.' };
  e.cartas.medico--;
  lado.lesionados = lado.lesionados.filter((l) => l !== les);
  const lugar = lado.onze.find((l) => l.jogador === les.jogador);
  if (lugar) {
    lugar.overall += J.lesao.penalizacao;
    delete lugar.lesionado;
  }
  const d = sala.jogadores[les.jogador];
  if (d) delete d.lesionado;
  const minuto = jogo.periodo * J.minutosPorPeriodo;
  jogo.eventos.push({ minuto, lado: jogo.lados.indexOf(lado), tipo: 'medico', texto: `${les.nome} recupera.` });
  registar(sala, ctx, `${e.nome} usa o Departamento médico: ${les.nome} recupera.`, { tipo: 'carta' });
  return { ok: true };
}

/** O suplente entra já para o lugar do lesionado; fora das suas posições, joga com menos overall até ao fim. */
export function suplentePorLesao(sala, ctx, jogo, equipaId, id) {
  const lado = ladoDe(jogo, equipaId);
  if (!lado) return { erro: 'Não estás neste jogo.' };
  if (jogo.acabou) return { erro: 'O jogo já acabou.' };
  if (!podeEntrarSuplente(lado)) return { erro: 'Já não tens substituições.' };
  const les = (lado.lesionados ?? []).find((l) => id == null || l.jogador === id);
  const i = les ? lado.onze.findIndex((l) => l.jogador === les.jogador) : -1;
  if (i < 0) return { erro: 'Esse jogador não está lesionado em campo.' };
  const sup = jogador(sala, ctx, lado.suplente);
  // Fora das suas posições, perde menos do que quem é escalado à mão: já basta ter um jogador lesionado.
  const novo = { ...entrada(sala, ctx, sup.id, les.posicao), overall: overallNatural(sup, les.posicao) ?? sup.overall - J.lesao.foraDePosicao };
  jogo.eventos.push({ minuto: jogo.periodo * J.minutosPorPeriodo, lado: jogo.lados.indexOf(lado), tipo: 'substituicao', entra: novo.nome, sai: les.nome });
  lado.onze[i] = novo;
  lado.suplente = null;
  lado.subUsada = true;
  lado.subPedida = null;
  les.pendente = false;
  return { ok: true };
}

/** O treinador deixa o lesionado em campo, diminuído. */
export function ficarLesionado(sala, ctx, jogo, equipaId, id) {
  const lado = ladoDe(jogo, equipaId);
  if (!lado) return { erro: 'Não estás neste jogo.' };
  const les = (lado.lesionados ?? []).find((l) => l.pendente && (id == null || l.jogador === id));
  if (!les) return { erro: 'Não há nada a decidir.' };
  les.pendente = false;
  return { ok: true };
}

/** No fim do jogo, quem continua lesionado fica de fora até à próxima janela e vem um emprestado para o lugar dele. */
export function resolverLesoes(sala, ctx, jogo) {
  for (const lado of jogo.lados) {
    for (const les of lado.lesionados ?? []) {
      const novo = emprestarPara(sala, ctx, lado, les.jogador, les.posicao);
      if (!novo) continue;
      const e = sala.equipas[lado.equipa];
      e.emprestadosNovos = [...(e.emprestadosNovos ?? []), { jogador: novo.jogador, lesionado: les.nome }];
      registar(sala, ctx, `${les.nome} continua lesionado: ${novo.nome} fica emprestado a ${e.nome} a partir da próxima jornada.`, { tipo: 'lesao' });
    }
    lado.lesionados = [];
  }
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

/** O lance do lado que tem a vez. A casa joga na 1.ª metade dos 10 minutos e a visitante na 2.ª. */
export function jogarLance(sala, ctx, jogo) {
  if (jogo.acabou) return;
  const inicio = jogo.periodo * J.minutosPorPeriodo;
  if (jogo.vezLance === 0) for (const lado of jogo.lados) if (lado.subPedida != null) aplicarSubstituicao(sala, ctx, jogo, lado, inicio);
  const i = jogo.vezLance;
  const meio = Math.floor(J.minutosPorPeriodo / 2);
  lance(sala, ctx, jogo, i, inicio + (i === 0 ? inteiro(ctx.aleatorio, 1, meio) : inteiro(ctx.aleatorio, meio + 1, J.minutosPorPeriodo)));
  jogo.vezLance++;
  if (jogo.vezLance < jogo.lados.length) return;
  jogo.vezLance = 0;
  for (const lado of jogo.lados) for (const l of lado.onze) if (!l.temp) lado.minutos[l.jogador] = (lado.minutos[l.jogador] ?? 0) + J.minutosPorPeriodo;
  jogo.periodo++;
  jogo.acabou = jogo.periodo >= J.periodos;
}

/** O que falta da ronda atual, de uma vez (jogos entre bots e quando o anfitrião acaba os jogos). */
export function jogarPeriodo(sala, ctx, jogo) {
  const ronda = jogo.periodo;
  while (!jogo.acabou && jogo.periodo === ronda) jogarLance(sala, ctx, jogo);
}

/** Pede a substituição do jovem da formação: entra no período seguinte. */
export function pedirSubstituicao(sala, ctx, jogo, equipaId, sai) {
  const lado = jogo.lados.find((l) => l.equipa === equipaId);
  if (!lado) return { erro: 'Não estás neste jogo.' };
  if (jogo.acabou) return { erro: 'O jogo já acabou.' };
  if (lado.subUsada || lado.suplente == null) return { erro: 'Já não tens substituição.' };
  const lugar = lado.onze.find((l) => l.jogador === sai);
  if (!lugar) return { erro: 'Esse jogador não está em campo.' };
  if (overallNatural(jogador(sala, ctx, lado.suplente), lugar.posicao) == null) return { erro: 'O jovem não joga nessa posição.' };
  lado.subPedida = sai;
  return { ok: true };
}

/** Quem pode sair para entrar o suplente (mais de um da posição: o treinador escolhe). */
export function podemSair(sala, ctx, lado) {
  if (lado.subUsada || lado.suplente == null) return [];
  const sup = jogador(sala, ctx, lado.suplente);
  return lado.onze.filter((l) => overallNatural(sup, l.posicao) != null).map((l) => l.jogador);
}
