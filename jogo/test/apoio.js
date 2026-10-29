// Apoio aos testes do motor: a base real (public/dados/jogadores.bin), um contexto com semente e partidas prontas.
import { readFileSync } from 'node:fs';
import { lerBase, descomprimir } from '../src/motor/base.js';
import { criarAleatorio } from '../src/motor/aleatorio.js';
import { novaSala, entrar, marcarPronto, configurar } from '../src/motor/sala-logica.js';
import { comecar, agir } from '../src/motor/partida.js';

const ficheiro = new URL('../public/dados/jogadores.bin', import.meta.url);
export const BASE = lerBase(await descomprimir(readFileSync(ficheiro))).jogadores;

export function contexto(semente = 7) {
  return { base: BASE, aleatorio: criarAleatorio(semente), agora: 0 };
}

/** Sala no lobby com n treinadores (t1, t2, …). */
export function salaLobby(n = 3, config = {}, ctx = contexto()) {
  const sala = novaSala({ codigo: 'TEST', anfitriaoToken: 'token-teste-1', agora: 0 });
  for (let i = 1; i <= n; i++) entrar(sala, { token: `token-teste-${i}`, nome: `Treinador ${i}` }, ctx);
  configurar(sala, 't1', config);
  return sala;
}

/** Sala já começada, na escolha da formação da 1.ª janela. */
export function salaComecada(n = 3, config = {}, ctx = contexto()) {
  const sala = salaLobby(n, config, ctx);
  for (const t of sala.treinadores) marcarPronto(sala, t.id, true);
  const r = comecar(sala, ctx, 't1');
  if (r.erro) throw new Error(r.erro);
  return sala;
}

/** Sala no tabuleiro: todos escolheram 4-4-2 e passaram o draft. */
export function salaNoTabuleiro(n = 3, config = {}, ctx = contexto()) {
  const sala = salaComecada(n, config, ctx);
  for (const t of sala.treinadores) ok(agir(sala, ctx, t.id, { t: 'formacao', formacao: '4-4-2' }));
  while (sala.janela.fase === 'draft') {
    const vez = sala.janela.draft.escolhas[sala.janela.draft.i].equipa;
    ok(agir(sala, ctx, treinadorDe(sala, vez), { t: 'draft', jogador: null }));
  }
  return sala;
}

export const treinadorDe = (sala, equipaId) => sala.equipas[equipaId].treinador;

export const vezDe = (sala) => sala.janela.ordem[sala.janela.vez];

export function ok(r) {
  if (r?.erro) throw new Error(r.erro);
  return r;
}

/** Nenhum jogador em duas equipas e o estado bate certo com os plantéis. */
export function verificarInvariantes(sala) {
  const visto = new Map();
  for (const e of Object.values(sala.equipas)) {
    for (const id of e.plantel) {
      if (visto.has(id)) throw new Error(`jogador ${id} em ${visto.get(id)} e ${e.id}`);
      visto.set(id, e.id);
      if (sala.jogadores[id]?.equipa !== e.id) throw new Error(`jogador ${id} no plantel de ${e.id} mas com equipa ${sala.jogadores[id]?.equipa}`);
    }
  }
  for (const [id, d] of Object.entries(sala.jogadores)) {
    if (d.equipa && !sala.equipas[d.equipa].plantel.includes(Number(id))) throw new Error(`jogador ${id} diz ${d.equipa} mas não está no plantel`);
  }
}
