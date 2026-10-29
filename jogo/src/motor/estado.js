// Acesso ao estado da sala partilhado pelos módulos do motor.
// Um jogador é a soma da base (só de leitura, ctx.base) com o que mudou na partida (sala.jogadores[id]):
// equipa, overall, idade, formação, cláusula, empréstimo… Os jogadores livres não têm entrada em sala.jogadores.
import { CONFIG } from '../config.js';
import { valorMercado, clausula as calcularClausula, arredondar } from './valores.js';

/** Vista completa de um jogador (base + estado da partida). */
export function jogador(sala, ctx, id) {
  const base = ctx.base.get(id);
  if (!base) return null;
  const d = sala.jogadores[id];
  const j = { ...base, equipa: null, formacao: false, multClausula: CONFIG.valores.clausula, ...d };
  j.valor = valorMercado(j.overall, j.idade);
  j.clausula = calcularClausula(j.valor, j.multClausula);
  return j;
}

/** Muda o estado de um jogador na partida (cria a entrada se for preciso). */
export function mudarJogador(sala, id, mudancas) {
  sala.jogadores[id] = { ...(sala.jogadores[id] ?? { id }), ...mudancas };
  return sala.jogadores[id];
}

/** Um jogador livre: sem equipa e sem estar em jogo (carta na mesa, opção do draft…). */
export function livre(sala, id) {
  const d = sala.jogadores[id];
  return !d?.equipa && !sala.reservados?.includes(id);
}

export function reservar(sala, ids) {
  sala.reservados = [...new Set([...(sala.reservados ?? []), ...ids])];
}

export function libertar(sala, ids) {
  sala.reservados = (sala.reservados ?? []).filter((x) => !ids.includes(x));
}

/** Põe o jogador numa equipa (ou na banca, com equipa = null). */
export function transferir(sala, id, equipaId, extra = {}) {
  const antiga = sala.jogadores[id]?.equipa;
  if (antiga && sala.equipas[antiga]) sala.equipas[antiga].plantel = sala.equipas[antiga].plantel.filter((x) => x !== id);
  if (equipaId) {
    const e = sala.equipas[equipaId];
    if (!e.plantel.includes(id)) e.plantel.push(id);
    mudarJogador(sala, id, { equipa: equipaId, ...extra });
  } else {
    // Livre outra vez: perde o estado ligado à equipa (formação, cláusula inflacionada, empréstimo).
    const d = sala.jogadores[id];
    if (d) {
      delete d.equipa;
      delete d.formacao;
      delete d.multClausula;
      delete d.inflacionada;
      delete d.emprestado;
      delete d.soBanca;
      delete d.compradoRonda;
      delete d.potencial;
    }
  }
  libertar(sala, [id]);
}

/** Mexe no dinheiro de uma equipa, sem erros de vírgula flutuante. */
export function pagar(sala, equipaId, valor) {
  const e = sala.equipas[equipaId];
  e.dinheiro = Math.round((e.dinheiro - valor) * 1000) / 1000;
}

export function receber(sala, equipaId, valor) {
  pagar(sala, equipaId, -valor);
}

/** A equipa do treinador (ou null). */
export function equipaDe(sala, treinadorId) {
  const t = sala.treinadores.find((x) => x.id === treinadorId);
  return t?.equipa ? sala.equipas[t.equipa] : null;
}

/** As equipas dos treinadores ativos (sem bots e sem espectadores). */
export function equipasTreinadores(sala) {
  return Object.values(sala.equipas).filter((e) => e.treinador && !e.espera);
}

/** Acrescenta uma linha ao registo de acontecimentos (os últimos 200). */
export function registar(sala, ctx, texto, extra = {}) {
  sala.log.push({ t: ctx.agora ?? 0, texto, ...extra });
  if (sala.log.length > 200) sala.log.splice(0, sala.log.length - 200);
}

export const M = (v) => `${arredondar(v).toFixed(1).replace('.', ',')} M€`;

export const erro = (msg) => ({ erro: msg });
