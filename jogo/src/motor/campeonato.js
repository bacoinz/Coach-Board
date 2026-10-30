// Campeonato: calendário a duas voltas, jornadas com jogos em simultâneo, TV, salários e classificação.
import { CONFIG } from '../config.js';
import { baralhar, escolher } from './aleatorio.js';
import { jogador, erro, registar, equipasTreinadores, receber } from './estado.js';
import { CICLO_TATICAS, criarJogo, jogarPeriodo, pedirSubstituicao } from './jogo.js';
import { descontar } from './misterio.js';
import { salarioJornada } from './valores.js';

const C = CONFIG.campeonato;
const J = CONFIG.jogo;

/** Todos contra todos (método da roda). Com número ímpar de equipas, uma folga por jornada. Devolve a 1.ª volta. */
export function calendarioVolta(ids) {
  const lista = ids.length % 2 ? [...ids, null] : [...ids];
  const n = lista.length;
  const jornadas = [];
  const roda = [...lista];
  for (let r = 0; r < n - 1; r++) {
    const pares = [];
    for (let i = 0; i < n / 2; i++) {
      const [a, b] = [roda[i], roda[n - 1 - i]];
      if (a != null && b != null) pares.push(r % 2 ? [b, a] : [a, b]);
    }
    jornadas.push(pares);
    roda.splice(1, 0, roda.pop());
  }
  return jornadas;
}

const equipasNoCampeonato = (sala) => Object.values(sala.equipas).filter((e) => !e.espera).map((e) => e.id);

function novaLinha(id) {
  return { equipa: id, j: 0, v: 0, e: 0, d: 0, gm: 0, gs: 0, pts: 0 };
}

/** Classificação: pontos e, em caso de empate, diferença de golos e golos marcados. */
export function ordenarTabela(tabela) {
  return Object.values(tabela).sort((a, b) => b.pts - a.pts || b.gm - b.gs - (a.gm - a.gs) || b.gm - a.gm);
}

/** Depois do fecho de uma janela: na de verão começa uma época nova; na de inverno, a segunda volta. */
export function iniciarVolta(sala, ctx, volta) {
  if (volta === 1 || !sala.calendario) {
    const ids = baralhar(ctx.aleatorio, equipasNoCampeonato(sala));
    sala.calendario = calendarioVolta(ids);
    sala.tabela = Object.fromEntries(ids.map((id) => [id, novaLinha(id)]));
    sala.estatisticas = {};
  }
  for (const id of equipasNoCampeonato(sala)) sala.tabela[id] ??= novaLinha(id);
  sala.fase = 'campeonato';
  sala.campeonato = { volta, jornada: 0, fase: 'taticas', taticas: {}, jogos: [], prontos: [], proximoPeriodo: null };
  abrirJornada(sala, ctx);
}

const jornadasPorEpoca = (sala) => sala.calendario.length * 2;

function jogosDaJornada(sala) {
  const c = sala.campeonato;
  const pares = sala.calendario[c.jornada];
  return c.volta === 1 ? pares : pares.map(([a, b]) => [b, a]);
}

function abrirJornada(sala, ctx) {
  const c = sala.campeonato;
  c.fase = 'taticas';
  c.taticas = {};
  c.jogos = [];
  c.prontos = [];
  c.proximoPeriodo = null;
  for (const [a, b] of jogosDaJornada(sala)) {
    for (const id of [a, b]) if (sala.equipas[id].bot) c.taticas[id] = escolher(ctx.aleatorio, CICLO_TATICAS);
  }
  registar(sala, ctx, `Época ${sala.epoca}, ${c.volta}.ª volta, jornada ${c.jornada + 1}: escolham a tática.`, { tipo: 'fase' });
  verificarTaticas(sala, ctx);
}

const quemFaltaTatica = (sala) => jogosDaJornada(sala).flat().filter((id) => !sala.campeonato.taticas[id]);

export function escolherTatica(sala, ctx, equipaId, tatica) {
  const c = sala.campeonato;
  if (sala.fase !== 'campeonato' || c.fase !== 'taticas') return erro('Já não é altura de escolher a tática.');
  if (!CICLO_TATICAS.includes(tatica)) return erro('Tática desconhecida.');
  if (!jogosDaJornada(sala).flat().includes(equipaId)) return erro('Tens folga nesta jornada.');
  c.taticas[equipaId] = tatica;
  verificarTaticas(sala, ctx);
  return { ok: true };
}

function verificarTaticas(sala, ctx) {
  if (quemFaltaTatica(sala).length) return;
  const c = sala.campeonato;
  c.jogos = jogosDaJornada(sala).map(([a, b]) => criarJogo(sala, ctx, a, b, c.taticas));
  c.fase = 'jogos';
  c.proximoPeriodo = (ctx.agora ?? 0) + J.segundosPorPeriodo * 1000;
}

/** Avança os períodos cujo tempo já passou. Devolve true se algo mudou. */
export function avancarTempo(sala, ctx) {
  const c = sala.campeonato;
  if (sala.fase !== 'campeonato' || c?.fase !== 'jogos' || c.proximoPeriodo == null) return false;
  let mudou = false;
  while (c.fase === 'jogos' && ctx.agora >= c.proximoPeriodo) {
    jogarTodosUmPeriodo(sala, ctx);
    c.proximoPeriodo += J.segundosPorPeriodo * 1000;
    mudou = true;
  }
  return mudou;
}

function jogarTodosUmPeriodo(sala, ctx) {
  const c = sala.campeonato;
  for (const jogo of c.jogos) jogarPeriodo(sala, ctx, jogo);
  if (c.jogos.every((j) => j.acabou)) concluirJornada(sala, ctx);
}

/** O prazo do próximo período, para o alarme do Durable Object. */
export function proximoPrazo(sala) {
  return sala.fase === 'campeonato' && sala.campeonato?.fase === 'jogos' ? sala.campeonato.proximoPeriodo : null;
}

/** Homem do jogo: nota com golos, assistências e resultado. */
function homemDoJogo(jogo) {
  let melhor = null;
  jogo.lados.forEach((lado, i) => {
    const venceu = lado.golos > jogo.lados[1 - i].golos;
    for (const l of lado.onze) {
      const nota = 6 + 1.5 * (lado.marcadores[l.jogador] ?? 0) + (lado.assistencias[l.jogador] ?? 0) + (venceu ? 0.5 : 0) + l.overall / 100;
      if (!melhor || nota > melhor.nota) melhor = { jogador: l.jogador, nome: l.nome, equipa: lado.equipa, nota: Math.round(nota * 10) / 10 };
    }
  });
  return melhor;
}

function concluirJornada(sala, ctx) {
  const c = sala.campeonato;
  for (const jogo of c.jogos) {
    const [a, b] = jogo.lados;
    jogo.homem = homemDoJogo(jogo);
    for (const [lado, adv] of [[a, b], [b, a]]) {
      const t = sala.tabela[lado.equipa];
      t.j++;
      t.gm += lado.golos;
      t.gs += adv.golos;
      if (lado.golos > adv.golos) {
        t.v++;
        t.pts += C.vitoria;
      } else if (lado.golos === adv.golos) {
        t.e++;
        t.pts += C.empate;
      } else t.d++;
      const somar = (mapa, campo) => {
        for (const [id, n] of Object.entries(mapa)) {
          const est = (sala.estatisticas[id] ??= { golos: 0, assistencias: 0, minutos: 0, jogos: 0, nome: ctx.base.get(Number(id))?.curto, equipa: lado.equipa });
          est[campo] += n;
        }
      };
      somar(lado.marcadores, 'golos');
      somar(lado.assistencias, 'assistencias');
      somar(lado.minutos, 'minutos');
      for (const [id, n] of Object.entries(lado.minutos)) {
        const d = sala.jogadores[id];
        if (d) d.minutos = (d.minutos ?? 0) + n;
      }
    }
    registar(sala, ctx, `${sala.equipas[a.equipa].nome} ${a.golos}-${b.golos} ${sala.equipas[b.equipa].nome}. Homem do jogo: ${jogo.homem?.nome}.`, { tipo: 'resultado' });
  }
  // TV igual para todos e salários, cobrados a cada jornada.
  const jornadas = jornadasPorEpoca(sala);
  for (const e of equipasTreinadores(sala)) {
    receber(sala, e.id, C.tvEpoca / jornadas);
    const salarios = e.plantel.reduce((s, id) => {
      const j = jogador(sala, ctx, id);
      return j.emprestado ? s : s + salarioJornada(j.valor, jornadas);
    }, 0);
    descontar(sala, e.id, salarios);
  }
  sala.classificacao = ordenarTabela(sala.tabela).map((l) => l.equipa);
  c.fase = 'resultados';
  c.proximoPeriodo = null;
  c.prontos = [];
}

/** Treinador pede a substituição do jovem durante os jogos. */
export function substituir(sala, ctx, equipaId, sai) {
  const c = sala.campeonato;
  if (sala.fase !== 'campeonato' || c.fase !== 'jogos') return erro('Não há jogos a decorrer.');
  const jogo = c.jogos.find((j) => j.lados.some((l) => l.equipa === equipaId));
  if (!jogo) return erro('Não tens jogo nesta jornada.');
  return pedirSubstituicao(sala, ctx, jogo, equipaId, sai);
}

/**
 * Passa à jornada seguinte. Devolve { fimDeVolta: true } quando a volta acabou: é a partida que abre a janela.
 * Com pronto=true só marca o treinador; a jornada segue quando todos estiverem prontos.
 */
export function continuar(sala, ctx, equipaId) {
  const c = sala.campeonato;
  if (sala.fase !== 'campeonato' || c.fase !== 'resultados') return erro('Ainda não há resultados.');
  if (!c.prontos.includes(equipaId)) c.prontos.push(equipaId);
  if (!equipasTreinadores(sala).every((e) => c.prontos.includes(e.id))) return { ok: true };
  return seguir(sala, ctx);
}

function seguir(sala, ctx) {
  const c = sala.campeonato;
  c.jornada++;
  if (c.jornada >= sala.calendario.length) return { ok: true, fimDeVolta: true };
  abrirJornada(sala, ctx);
  return { ok: true };
}

/** O anfitrião desbloqueia o que estiver parado: táticas ao acaso, jogos até ao fim, ou jornada seguinte. */
export function forcarCampeonato(sala, ctx) {
  const c = sala.campeonato;
  if (sala.fase !== 'campeonato') return erro('Não estamos no campeonato.');
  if (c.fase === 'taticas') {
    for (const id of quemFaltaTatica(sala)) c.taticas[id] = escolher(ctx.aleatorio, CICLO_TATICAS);
    verificarTaticas(sala, ctx);
    return { ok: true };
  }
  if (c.fase === 'jogos') {
    while (c.fase === 'jogos') jogarTodosUmPeriodo(sala, ctx);
    return { ok: true };
  }
  return seguir(sala, ctx);
}
