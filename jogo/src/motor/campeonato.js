// Campeonato: calendário a duas voltas, jornadas com jogos em simultâneo, TV, salários e classificação.
import { CONFIG } from '../config.js';
import { baralhar, dado, escolher } from './aleatorio.js';
import { jogador, erro, registar, equipasTreinadores, receber } from './estado.js';
import { CICLO_TATICAS, criarJogo, jogarPeriodo, jogarLance, pedirSubstituicao, usarMedico, suplentePorLesao, ficarLesionado, lesaoPorDecidir, resolverLesoes } from './jogo.js';
import { descontar } from './misterio.js';
import { salarioJornada } from './valores.js';
import { momentosDoJogo, quem, registarMomento } from './momentos.js';
import { faseMercado } from './cartas.js';

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

/** Acabou a época: a classificação e as estatísticas voltam a zero, com as mesmas equipas. */
/** A TV desta época: acompanha os preços do Mercado da época seguinte. */
export const tvDaEpoca = (sala) => C.tvPorFase[faseMercado(sala, sala.epoca + 1)];

export function zerarEpoca(sala) {
  sala.tabela = Object.fromEntries(equipasNoCampeonato(sala).map((id) => [id, novaLinha(id)]));
  sala.estatisticas = {};
  sala.momentos = [];
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
  sala.campeonato = { volta, jornada: 0, fase: 'taticas', taticas: {}, jogos: [], prontos: [] };
  abrirJornada(sala, ctx);
}

const jornadasPorEpoca = (sala) => sala.calendario.length * 2;

function jogosDaJornada(sala) {
  const c = sala.campeonato;
  if (c.pares) return c.pares;
  const pares = sala.calendario[c.jornada];
  return c.volta === 1 ? pares : pares.map(([a, b]) => [b, a]);
}

function abrirJornada(sala, ctx) {
  const c = sala.campeonato;
  c.fase = 'taticas';
  c.taticas = {};
  c.jogos = [];
  c.prontos = [];
  for (const [a, b] of jogosDaJornada(sala)) {
    for (const id of [a, b]) if (sala.equipas[id].bot) c.taticas[id] = escolher(ctx.aleatorio, CICLO_TATICAS);
  }
  registar(sala, ctx, c.pares ? `Taça, ${c.ronda}: escolham a tática.` : `Época ${sala.epoca}, ${c.volta}.ª volta, jornada ${c.jornada + 1}: escolham a tática.`, { tipo: 'fase' });
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
  // Se a casa for um bot, o primeiro lance é logo dele.
  for (const jogo of c.jogos) if (humanos(sala, jogo).length) lancesDosBots(sala, ctx, jogo);
}

const humanos = (sala, jogo) => jogo.lados.map((l) => l.equipa).filter((id) => !sala.equipas[id].bot);

/** Enquanto a vez for de um bot, ele lança sozinho. */
function lancesDosBots(sala, ctx, jogo) {
  while (!jogo.acabou && sala.equipas[jogo.lados[jogo.vezLance].equipa].bot) jogarLance(sala, ctx, jogo);
}

/** O lance de quem tem a vez; os jogos só de bots acompanham o mais adiantado; e vê se a jornada acabou. */
function jogarVez(sala, ctx, jogo) {
  const c = sala.campeonato;
  jogarLance(sala, ctx, jogo);
  lancesDosBots(sala, ctx, jogo);
  const adiantado = Math.max(...c.jogos.map((j) => j.periodo));
  for (const j of c.jogos) {
    if (!humanos(sala, j).length) while (j.periodo < adiantado && !j.acabou) jogarPeriodo(sala, ctx, j);
  }
  if (c.jogos.every((j) => j.acabou)) concluirJornada(sala, ctx);
}

/** Os jogos são à vez: cada treinador lança os dados, vê a sua jogada, e segue-se o outro. */
export function lancarRonda(sala, ctx, equipaId) {
  const c = sala.campeonato;
  if (sala.fase !== 'campeonato' || c.fase !== 'jogos') return erro('Não há jogos a decorrer.');
  const jogo = c.jogos.find((j) => j.lados.some((l) => l.equipa === equipaId));
  if (!jogo) return erro('Não tens jogo nesta jornada.');
  if (jogo.acabou) return erro('O teu jogo já acabou.');
  if (jogo.lados[jogo.vezLance].equipa !== equipaId) return erro('Não é a tua vez de lançar.');
  if (lesaoPorDecidir(jogo.lados[jogo.vezLance])) return erro('Decide primeiro o que fazer com o lesionado.');
  jogarVez(sala, ctx, jogo);
  return { ok: true };
}

/** O anfitrião lança por quem não está a lançar. */
export function forcarRonda(sala, ctx) {
  const c = sala.campeonato;
  if (sala.fase !== 'campeonato' || c.fase !== 'jogos') return erro('Não há jogos a decorrer.');
  for (const jogo of c.jogos) {
    if (c.fase !== 'jogos' || jogo.acabou || !humanos(sala, jogo).length) continue;
    // Quem não está a decidir deixa o lesionado em campo.
    for (const lado of jogo.lados.filter(lesaoPorDecidir)) ficarLesionado(sala, ctx, jogo, lado.equipa);
    jogarVez(sala, ctx, jogo);
  }
  return { ok: true };
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
  for (const e of Object.values(sala.equipas)) delete e.emprestadosNovos;
  for (const jogo of c.jogos) {
    resolverLesoes(sala, ctx, jogo);
    momentosDoJogo(sala, ctx, jogo);
  }
  if (c.pares) return concluirRondaTaca(sala, ctx);
  for (const jogo of c.jogos) {
    const [a, b] = jogo.lados;
    jogo.homem = homemDoJogo(jogo);
    if (jogo.homem) {
      const est = (sala.estatisticas[jogo.homem.jogador] ??= { golos: 0, assistencias: 0, minutos: 0, jogos: 0, nome: jogo.homem.nome, equipa: jogo.homem.equipa });
      est.homens = (est.homens ?? 0) + 1;
    }
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
    receber(sala, e.id, tvDaEpoca(sala) / jornadas);
    const salarios = e.plantel.reduce((s, id) => {
      const j = jogador(sala, ctx, id);
      return j.emprestado ? s : s + salarioJornada(j.valor, jornadas);
    }, 0);
    descontar(sala, e.id, salarios);
  }
  sala.classificacao = ordenarTabela(sala.tabela).map((l) => l.equipa);
  c.fase = 'resultados';
  c.prontos = [];
}

// --- Taça: a eliminar, 1.º contra 2.º, 3.º contra 4.º… da liga dessa época ---

export function nomeRonda(equipas) {
  if (equipas <= 2) return 'final';
  if (equipas <= 4) return 'meias-finais';
  if (equipas <= 8) return 'quartos de final';
  return 'oitavos de final';
}

/** Dois a dois, pela ordem. Com número ímpar, o último passa à ronda seguinte sem jogar. */
export function emparelhar(equipas) {
  const pares = [];
  for (let i = 0; i + 1 < equipas.length; i += 2) pares.push([equipas[i], equipas[i + 1]]);
  return pares;
}

/** Pela ordem da liga: só os treinadores e, se forem ímpares, o bot mais bem classificado, para ficarem em número par. */
export function participantesTaca(sala) {
  const ordem = ordenarTabela(sala.tabela).map((l) => l.equipa);
  const treinadores = ordem.filter((id) => !sala.equipas[id].bot);
  if (treinadores.length % 2 === 0) return treinadores;
  const bot = ordem.find((id) => sala.equipas[id].bot);
  return ordem.filter((id) => !sala.equipas[id].bot || id === bot);
}

export function iniciarTaca(sala, ctx) {
  sala.fase = 'campeonato';
  sala.estatisticasTaca = {};
  sala.campeonato = { volta: 2, jornada: 0, competicao: 'taca', restantes: participantesTaca(sala), pares: [], fase: 'taticas', taticas: {}, jogos: [], prontos: [] };
  registar(sala, ctx, `Começa a Taça da época ${sala.epoca}.`, { tipo: 'fase' });
  abrirRondaTaca(sala, ctx);
}

function abrirRondaTaca(sala, ctx) {
  const c = sala.campeonato;
  c.pares = emparelhar(c.restantes);
  c.ronda = nomeRonda(c.restantes.length);
  abrirJornada(sala, ctx);
}

/** Desempate: 5 penáltis de cada lado e depois morte súbita, cada um com o dado de um penálti normal. */
function penaltis(rng) {
  const chuta = () => (dado(rng) >= J.acontecimentos.penaltiMinimo ? 1 : 0);
  let [a, b] = [0, 0];
  for (let i = 0; i < CONFIG.taca.penaltis; i++) {
    a += chuta();
    b += chuta();
  }
  while (a === b) {
    a += chuta();
    b += chuta();
  }
  return [a, b];
}

function concluirRondaTaca(sala, ctx) {
  const c = sala.campeonato;
  const vencedores = new Map();
  for (const jogo of c.jogos) {
    const [a, b] = jogo.lados;
    jogo.homem = homemDoJogo(jogo);
    if (a.golos === b.golos) jogo.penaltis = penaltis(ctx.aleatorio);
    const [ga, gb] = jogo.penaltis ?? [a.golos, b.golos];
    const vencedor = ga > gb ? a.equipa : b.equipa;
    jogo.vencedor = vencedor;
    receber(sala, vencedor, CONFIG.taca.premioVitoria);
    for (const lado of [a, b]) {
      const somar = (mapa, campo) => {
        for (const [id, n] of Object.entries(mapa)) {
          const est = (sala.estatisticasTaca[id] ??= { golos: 0, assistencias: 0, nome: ctx.base.get(Number(id))?.curto, equipa: lado.equipa });
          est[campo] += n;
        }
      };
      somar(lado.marcadores, 'golos');
      somar(lado.assistencias, 'assistencias');
    }
    vencedores.set(a.equipa, vencedor);
    vencedores.set(b.equipa, vencedor);
    registar(sala, ctx, `Taça: ${sala.equipas[a.equipa].nome} ${a.golos}-${b.golos} ${sala.equipas[b.equipa].nome}${jogo.penaltis ? ` (${ga}-${gb} nos penáltis)` : ''}. Passa ${sala.equipas[vencedor].nome}.`, { tipo: 'resultado' });
  }
  // Mantém-se a ordem da liga: quem não jogou, passa.
  c.restantes = [...new Set(c.restantes.map((id) => vencedores.get(id) ?? id))];
  if (c.restantes.length === 1) {
    receber(sala, c.restantes[0], CONFIG.taca.premioVencedor);
    registarMomento(sala, { equipa: c.restantes[0], tom: 'bom', peso: 12, texto: `${quem(sala, c.restantes[0]).o} levantou a Taça.` });
  }
  c.fase = 'resultados';
  c.prontos = [];
}

/** Decisões do treinador sobre uma lesão, durante o jogo. */
function jogoDe(sala, equipaId) {
  const c = sala.campeonato;
  if (sala.fase !== 'campeonato' || c.fase !== 'jogos') return null;
  return c.jogos.find((j) => j.lados.some((l) => l.equipa === equipaId)) ?? null;
}

export function fichaLesao(sala, ctx, equipaId, id) {
  const jogo = jogoDe(sala, equipaId);
  return jogo ? usarMedico(sala, ctx, jogo, equipaId, id) : erro('Não há jogos a decorrer.');
}

export function lesaoSuplente(sala, ctx, equipaId, id) {
  const jogo = jogoDe(sala, equipaId);
  return jogo ? suplentePorLesao(sala, ctx, jogo, equipaId, id) : erro('Não há jogos a decorrer.');
}

export function lesaoFicar(sala, ctx, equipaId, id) {
  const jogo = jogoDe(sala, equipaId);
  return jogo ? ficarLesionado(sala, ctx, jogo, equipaId, id) : erro('Não há jogos a decorrer.');
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
  if (c.pares) {
    if (c.restantes.length === 1) return { ok: true, fimDeTaca: true };
    abrirRondaTaca(sala, ctx);
    return { ok: true };
  }
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
    while (c.fase === 'jogos') {
      for (const jogo of c.jogos) if (!jogo.acabou) jogarPeriodo(sala, ctx, jogo);
      if (c.jogos.every((j) => j.acabou)) concluirJornada(sala, ctx);
    }
    return { ok: true };
  }
  return seguir(sala, ctx);
}
