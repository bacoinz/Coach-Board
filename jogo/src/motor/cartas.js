// Baralhos que tiram jogadores da base: Mercado (por fases), Jovens Talentos, draft, empréstimos; e as Redes.
import { CONFIG } from '../config.js';
import { comPeso, escolher, amostra } from './aleatorio.js';
import { livre } from './estado.js';

const dentro = (x, [a, b]) => x >= a && x <= b;

/** Overall e idade atuais de um jogador (a base, ou o que mudou na partida). */
function atual(sala, j) {
  const d = sala.jogadores[j.id];
  return d ? { overall: d.overall ?? j.overall, idade: d.idade ?? j.idade } : j;
}

/** Ids dos jogadores livres que cumprem um critério ({ idade?, overall?, posicao?, liga? }). */
export function livresQue(sala, ctx, { idade, overall, posicao, liga } = {}) {
  const r = [];
  for (const j of ctx.base.values()) {
    if (posicao && j.posicao !== posicao) continue;
    if (liga && j.liga !== liga) continue;
    const a = atual(sala, j);
    if (overall && !dentro(a.overall, overall)) continue;
    if (idade && !dentro(a.idade, idade)) continue;
    if (!livre(sala, j.id)) continue;
    r.push(j.id);
  }
  return r;
}

/** Fase do baralho do Mercado nesta época (1–7). */
export function faseMercado(sala) {
  const fases = CONFIG.mercado.fasesPorDuracao[sala.config.epocas] ?? CONFIG.mercado.fasesPorDuracao[3];
  return fases[Math.min(sala.epoca, fases.length) - 1];
}

/** As três faixas de overall desta fase: principal, abaixo e acima. */
export function faixasMercado(fase) {
  const { overallMinimo: min, overallMaximo: max, fases } = CONFIG.mercado;
  const [a, b] = fases[fase];
  return { principal: [a, b], abaixo: [min, a - 1], acima: [b + 1, max] };
}

/** Tira uma carta do Mercado: sorteia a faixa e depois um jogador livre dessa faixa. */
export function tirarMercado(sala, ctx) {
  const faixas = faixasMercado(faseMercado(sala));
  const p = CONFIG.mercado.probabilidades;
  const sorteada = comPeso(ctx.aleatorio, Object.entries(p));
  // Se a faixa sorteada estiver vazia, usa-se a mais próxima.
  const ordem = { principal: ['principal', 'abaixo', 'acima'], abaixo: ['abaixo', 'principal', 'acima'], acima: ['acima', 'principal', 'abaixo'] }[sorteada];
  for (const nome of ordem) {
    const [a, b] = faixas[nome];
    if (a > b) continue;
    const id = escolher(ctx.aleatorio, livresQue(sala, ctx, { overall: [a, b] }));
    if (id != null) return { id, faixa: nome };
  }
  return null;
}

export function tirarJovemTalento(sala, ctx) {
  return escolher(ctx.aleatorio, livresQue(sala, ctx, CONFIG.cartas.jovensTalentos)) ?? null;
}

/** Ligas que podem sair numa carta de Rede: as que têm jogadores suficientes no baralho do Mercado. */
export function ligasRede(sala, ctx) {
  const { overallMinimo: min, overallMaximo: max } = CONFIG.mercado;
  const conta = new Map();
  for (const id of livresQue(sala, ctx, { overall: [min, max] })) {
    const liga = ctx.base.get(id).liga;
    conta.set(liga, (conta.get(liga) ?? 0) + 1);
  }
  return [...conta].filter(([, n]) => n >= CONFIG.cartas.redeMinJogadores).map(([l]) => l).sort();
}

export function tirarRede(sala, ctx, jaTem = []) {
  return escolher(ctx.aleatorio, ligasRede(sala, ctx).filter((l) => !jaTem.includes(l))) ?? null;
}

/** Opções do draft: n jogadores livres que cumprem um dos critérios (sorteado por opção, se houver vários). */
export function opcoesDraft(sala, ctx, criterios, n) {
  const listas = criterios.map((c) => livresQue(sala, ctx, c));
  const escolhidos = new Set();
  for (let tentativa = 0; escolhidos.size < n && tentativa < n * 10; tentativa++) {
    const lista = escolher(ctx.aleatorio, listas.filter((l) => l.some((id) => !escolhidos.has(id))));
    if (!lista) break;
    const [id] = amostra(ctx.aleatorio, lista.filter((x) => !escolhidos.has(x)), 1);
    escolhidos.add(id);
  }
  return [...escolhidos];
}

/** Jogador para emprestar numa posição em falta: overall baixo, da posição. */
export function tirarEmprestimo(sala, ctx, posicao, overall = CONFIG.fecho.emprestimo.overall) {
  return escolher(ctx.aleatorio, livresQue(sala, ctx, { posicao, overall })) ?? escolher(ctx.aleatorio, livresQue(sala, ctx, { posicao }));
}
