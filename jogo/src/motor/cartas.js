// Baralhos que tiram jogadores da base: Mercado (por fases), Jovens Talentos, draft, empréstimos; e as Redes.
import { CONFIG } from '../config.js';
import { comPeso, escolher, amostra } from './aleatorio.js';
import { livre, faseMercado } from './estado.js';

export { faseMercado };
import { valorMercado } from './valores.js';

const dentro = (x, [a, b]) => x >= a && x <= b;

/** Overall e idade atuais de um jogador (a base, ou o que mudou na partida). */
function atual(sala, j) {
  const d = sala.jogadores[j.id];
  return d ? { overall: d.overall ?? j.overall, idade: d.idade ?? j.idade } : j;
}

/** Ids dos jogadores livres que cumprem um critério ({ idade?, overall?, posicao?, liga?, valorMaximo? }). */
export function livresQue(sala, ctx, { idade, overall, posicao, liga, valorMaximo } = {}) {
  const r = [];
  for (const j of ctx.base.values()) {
    if (posicao && j.posicao !== posicao) continue;
    if (liga && j.liga !== liga) continue;
    const a = atual(sala, j);
    if (overall && !dentro(a.overall, overall)) continue;
    if (idade && !dentro(a.idade, idade)) continue;
    if (valorMaximo != null && valorMercado(a.overall, a.idade) > valorMaximo) continue;
    if (!livre(sala, j.id)) continue;
    r.push(j.id);
  }
  return r;
}

/** Os jogadores da casa Jovens Talentos não saem no Mercado: cada jogador só está num dos baralhos. */
function eJovemTalento(sala, ctx, id) {
  const { overall, idade } = CONFIG.cartas.jovensTalentos;
  const a = atual(sala, ctx.base.get(id));
  return dentro(a.overall, overall) && dentro(a.idade, idade);
}

/** Ids dos jogadores que podem sair no Mercado com este overall. */
export function livresDoMercado(sala, ctx, overall) {
  return livresQue(sala, ctx, { overall }).filter((id) => !eJovemTalento(sala, ctx, id));
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
    const id = escolher(ctx.aleatorio, livresDoMercado(sala, ctx, [a, b]));
    if (id != null) return { id, faixa: nome };
  }
  return null;
}

export function tirarJovemTalento(sala, ctx) {
  return escolher(ctx.aleatorio, livresQue(sala, ctx, CONFIG.cartas.jovensTalentos)) ?? null;
}

/** Esta Rede dá desconto nos jogadores desta liga? */
export const redeCobre = (nome, liga) => Boolean(CONFIG.cartas.redes.find((r) => r.nome === nome)?.ligas.includes(liga));

/** As Redes que podem sair: as da lista com jogadores suficientes no baralho do Mercado. */
export function ligasRede(sala, ctx) {
  const { overallMinimo: min, overallMaximo: max } = CONFIG.mercado;
  const ligas = livresDoMercado(sala, ctx, [min, max]).map((id) => ctx.base.get(id).liga);
  return CONFIG.cartas.redes
    .filter((r) => ligas.filter((l) => r.ligas.includes(l)).length >= CONFIG.cartas.redeMinJogadores)
    .map((r) => r.nome);
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
