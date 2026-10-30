import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { contexto, salaNoTabuleiro, salaComecada, treinadorDe, ok, verificarInvariantes } from './apoio.js';
import { agir, rankingFinal } from '../src/motor/partida.js';
import { jogador, transferir } from '../src/motor/estado.js';
import { criarJogo, jogarPeriodo, forca, quimica, modificador, taticaVence, CICLO_TATICAS, pedirSubstituicao } from '../src/motor/jogo.js';
import { calendarioVolta, ordenarTabela, avancarTempo } from '../src/motor/campeonato.js';
import { sugestaoFecho, comprarEmprestado } from '../src/motor/janela.js';
import { melhorOnze } from '../src/motor/formacao.js';
import { jogarAteAoFim } from '../scripts/treinador-auto.mjs';
import { estadoPublico } from '../src/motor/vista.js';

/** Sala com 2 treinadores já no campeonato, na 1.ª jornada. */
function salaNoCampeonato(ctx, config = {}) {
  const sala = salaNoTabuleiro(2, config, ctx);
  ok(agir(sala, ctx, 't1', { t: 'forcar_fecho' }));
  for (const t of ['t1', 't2']) {
    const e = sala.equipas[t === 't1' ? 'e1' : 'e2'];
    ok(agir(sala, ctx, t, { t: 'fechar', ...sugestaoFecho(sala, ctx, e.id) }));
  }
  expect(sala.fase).toBe('campeonato');
  return sala;
}

function jogoEntre(ctx) {
  const sala = salaNoCampeonato(ctx);
  return { sala, jogo: criarJogo(sala, ctx, 'e1', 'e2', { e1: 'Autocarro', e2: 'Autocarro' }) };
}

describe('táticas', () => {
  it('o ciclo: cada uma vence exatamente uma e perde com uma', () => {
    expect(taticaVence('Contra-ataque', 'Ataque Total')).toBe(true);
    expect(taticaVence('Ataque Total', 'Autocarro')).toBe(true);
    expect(taticaVence('Autocarro', 'Posse de Bola')).toBe(true);
    expect(taticaVence('Posse de Bola', 'Pressão Alta')).toBe(true);
    expect(taticaVence('Pressão Alta', 'Contra-ataque')).toBe(true);
    for (const t of CICLO_TATICAS) {
      expect(CICLO_TATICAS.filter((o) => taticaVence(t, o))).toHaveLength(1);
      expect(CICLO_TATICAS.filter((o) => taticaVence(o, t))).toHaveLength(1);
      expect(taticaVence(t, t)).toBe(false);
    }
  });
  it('dá +2 só a quem vence', () => {
    const ctx = contexto();
    const { jogo } = jogoEntre(ctx);
    jogo.lados[0].tatica = 'Contra-ataque';
    jogo.lados[1].tatica = 'Ataque Total';
    const a = modificador(jogo, 0) - forca(jogo.lados[0], jogo.lados[1]) - quimica(jogo.lados[0]);
    const b = modificador(jogo, 1) - forca(jogo.lados[1], jogo.lados[0]) - quimica(jogo.lados[1]);
    expect(a).toBe(CONFIG.jogo.bonusTatica);
    expect(b).toBe(0);
  });
});

describe('modificador', () => {
  const lado = (ov, nacao = 'X') => ({
    onze: [['GK', ov.def], ['CB', ov.def], ['CM', ov.atq], ['ST', ov.atq]].map(([posicao, overall], i) => ({ posicao, overall, jogador: i, nacao: `${nacao}${i}` })),
  });
  it('força: ±1 por cada 3 pontos, entre −2 e +2', () => {
    const f = (atq, def) => forca(lado({ atq, def: 70 }), lado({ atq: 70, def }));
    expect(f(75, 75)).toBe(0);
    expect(f(77, 75)).toBe(0);
    expect(f(78, 75)).toBe(1);
    expect(f(81, 75)).toBe(2);
    expect(f(95, 75)).toBe(2);
    expect(f(72, 75)).toBe(-1);
    expect(f(60, 75)).toBe(-2);
  });
  it('química: pequena e com teto', () => {
    const nacoes = (lista) => ({ onze: lista.map((nacao, i) => ({ nacao, posicao: 'CM', overall: 70, jogador: i })) });
    expect(quimica(nacoes(['A', 'A', 'B', 'C']))).toBe(0);
    expect(quimica(nacoes(['A', 'A', 'A', 'C']))).toBe(CONFIG.jogo.quimica.porGrupo);
    expect(quimica(nacoes(['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C']))).toBe(CONFIG.jogo.quimica.maximo);
    expect(quimica(nacoes(Array(11).fill('A')))).toBeLessThan(1);
  });
});

describe('bots', () => {
  it('têm um modificador escondido, conforme o nível; quem fica com a equipa do bot deixa de o ter', () => {
    for (const [nivelBots, esperado] of Object.entries(CONFIG.bots.modificador)) {
      const ctx = contexto(12);
      const sala = salaNoCampeonato(ctx, { bots: 1, nivelBots });
      expect(criarJogo(sala, ctx, 'bot1', 'e1', {}).lados[0].modExtra).toBe(esperado);
      delete sala.equipas.bot1.bot;
      expect(criarJogo(sala, ctx, 'bot1', 'e1', {}).lados[0].modExtra).toBe(0);
    }
  });
});

describe('um jogo', () => {
  it('tem 9 períodos e 18 lançamentos, e os golos batem certo com marcadores', () => {
    const ctx = contexto(3);
    const { sala, jogo } = jogoEntre(ctx);
    for (let i = 0; i < 20; i++) jogarPeriodo(sala, ctx, jogo);
    expect(jogo.acabou).toBe(true);
    expect(jogo.periodo).toBe(9);
    expect(jogo.eventos.filter((e) => e.tipo === 'lance')).toHaveLength(18);
    for (const lado of jogo.lados) {
      expect(Object.values(lado.marcadores).reduce((s, n) => s + n, 0)).toBe(lado.golos);
      expect(Math.max(...Object.values(lado.minutos))).toBe(90);
    }
    expect(jogo.eventos.filter((e) => e.tipo === 'golo')).toHaveLength(jogo.lados[0].golos + jogo.lados[1].golos);
  });
  it('dados iguais tiram sempre uma carta de acontecimento', () => {
    const ctx = contexto(4);
    const { sala, jogo } = jogoEntre(ctx);
    for (let i = 0; i < 9; i++) jogarPeriodo(sala, ctx, jogo);
    const iguais = jogo.eventos.filter((e) => e.tipo === 'lance' && e.dados[0] === e.dados[1]).length;
    const cartas = jogo.eventos.filter((e) => ['leve', 'vermelho', 'lesao', 'penalti', 'bolaParada'].includes(e.tipo)).length;
    expect(iguais).toBeGreaterThan(0);
    expect(cartas).toBe(iguais);
  });
  it('duas equipas equivalentes marcam ~2 golos cada, e 5 ou mais é raro', () => {
    const ctx = contexto(11);
    const { sala } = jogoEntre(ctx);
    let golos = 0;
    let cinco = 0;
    const N = 1500;
    for (let n = 0; n < N; n++) {
      const copia = structuredClone(sala);
      const jogo = criarJogo(copia, ctx, 'e1', 'e2', { e1: 'Autocarro', e2: 'Autocarro' });
      // Força e química a zero, para medir a tabela de dados.
      for (const l of jogo.lados) l.onze.forEach((x, i) => { x.overall = 75; x.nacao = `n${i}`; });
      for (let i = 0; i < 9; i++) jogarPeriodo(copia, ctx, jogo);
      for (const l of jogo.lados) {
        golos += l.golos;
        if (l.golos >= 5) cinco++;
      }
    }
    const media = golos / (2 * N);
    expect(media).toBeGreaterThan(1.8);
    expect(media).toBeLessThan(2.4);
    expect(cinco / (2 * N)).toBeLessThan(0.1);
  });
  it('vermelho tira 1 ao modificador até ao fim', () => {
    const ctx = contexto();
    const { jogo } = jogoEntre(ctx);
    const antes = modificador(jogo, 0);
    jogo.lados[0].vermelhos = 1;
    expect(modificador(jogo, 0)).toBe(antes - 1);
  });
});

describe('lesões e substituição', () => {
  function forcarLesao(ctx, sala, jogo) {
    // A carta forte "lesão" do lado 1 atinge o lado 0.
    let n = 0;
    while (!jogo.eventos.some((e) => e.tipo === 'lesao') && n++ < 500) {
      jogo.periodo = 0;
      jogo.acabou = false;
      jogarPeriodo(sala, ctx, jogo);
    }
    expect(jogo.eventos.some((e) => e.tipo === 'lesao')).toBe(true);
  }
  it('sem carta médica, entra um emprestado da mesma posição, que fica no onze', () => {
    const ctx = contexto(5);
    const { sala, jogo } = jogoEntre(ctx);
    forcarLesao(ctx, sala, jogo);
    const emprestados = Object.entries(sala.jogadores).filter(([, d]) => d.emprestadoLesao);
    expect(emprestados.length).toBeGreaterThan(0);
    const [id, d] = emprestados[0];
    const e = sala.equipas[d.equipa];
    expect(e.plantel).toContain(Number(id));
    const lugar = e.onze.find((l) => l.jogador === Number(id));
    expect(lugar.posicao).toBe(jogador(sala, ctx, Number(id)).posicao);
    verificarInvariantes(sala);
  });
  it('com carta médica, gasta a carta e o jogador recupera', () => {
    const ctx = contexto(5);
    const { sala, jogo } = jogoEntre(ctx);
    sala.equipas.e1.cartas.medico = 50;
    sala.equipas.e2.cartas.medico = 50;
    forcarLesao(ctx, sala, jogo);
    expect(Object.values(sala.jogadores).some((d) => d.emprestadoLesao)).toBe(false);
    expect(sala.equipas.e1.cartas.medico + sala.equipas.e2.cartas.medico).toBeLessThan(100);
  });
  it('a substituição do jovem entra no período seguinte e os minutos contam até à saída', () => {
    const ctx = contexto(6);
    const sala = salaNoCampeonato(ctx);
    const e = sala.equipas.e1;
    const titular = e.onze.find((l) => l.posicao === 'CM').jogador;
    const jovem = [...ctx.base.values()].find((j) => j.posicao === 'CM' && j.idade <= 21 && j.overall <= 68 && !sala.jogadores[j.id]?.equipa).id;
    transferir(sala, jovem, 'e1', { formacao: true, potencial: 90 });
    e.suplente = jovem;
    const jogo = criarJogo(sala, ctx, 'e1', 'e2', {});
    for (let i = 0; i < 3; i++) jogarPeriodo(sala, ctx, jogo);
    expect(pedirSubstituicao(sala, ctx, jogo, 'e1', e.onze.find((l) => l.posicao === 'GK').jogador).erro).toBeTruthy();
    ok(pedirSubstituicao(sala, ctx, jogo, 'e1', titular));
    jogarPeriodo(sala, ctx, jogo);
    const lado = jogo.lados[0];
    expect(lado.onze.some((l) => l.jogador === jovem)).toBe(true);
    expect(lado.minutos[titular]).toBe(30);
    expect(lado.minutos[jovem]).toBe(10);
    expect(pedirSubstituicao(sala, ctx, jogo, 'e1', titular).erro).toBeTruthy();
  });
  it('os efeitos das cartas Mistério gastam-se no próximo jogo', () => {
    const ctx = contexto(7);
    const sala = salaNoCampeonato(ctx);
    const e = sala.equipas.e1;
    const fora = e.onze[3].jogador;
    e.efeitos = [{ efeito: 'modificador', valor: 1 }, { efeito: 'suspenso', jogador: fora }, { efeito: 'craque', overall: [86, 99] }];
    const jogo = criarJogo(sala, ctx, 'e1', 'e2', {});
    const lado = jogo.lados[0];
    expect(lado.modExtra).toBe(1);
    expect(lado.onze.some((l) => l.jogador === fora)).toBe(false);
    expect(lado.onze.some((l) => l.temp && l.overall >= 84)).toBe(true);
    expect(e.efeitos).toBeUndefined();
  });
});

describe('campeonato', () => {
  it('o calendário tem todos contra todos, uma vez por volta, com número par e ímpar', () => {
    for (const n of [2, 4, 5, 6, 7, 10]) {
      const ids = Array.from({ length: n }, (_, i) => `e${i}`);
      const jornadas = calendarioVolta(ids);
      expect(jornadas).toHaveLength(n % 2 ? n : n - 1);
      const vistos = new Set();
      for (const j of jornadas) {
        const nesta = j.flat();
        expect(new Set(nesta).size).toBe(nesta.length);
        for (const [a, b] of j) vistos.add([a, b].sort().join('-'));
      }
      expect(vistos.size).toBe((n * (n - 1)) / 2);
    }
  });
  it('a classificação: 3, 1, 0 e desempate pela diferença de golos', () => {
    const t = {
      a: { equipa: 'a', pts: 6, gm: 3, gs: 3 },
      b: { equipa: 'b', pts: 6, gm: 5, gs: 2 },
      c: { equipa: 'c', pts: 9, gm: 1, gs: 0 },
    };
    expect(ordenarTabela(t).map((x) => x.equipa)).toEqual(['c', 'b', 'a']);
  });
  it('as táticas são secretas até todos escolherem e os jogos correm com o relógio', () => {
    const ctx = contexto(8);
    const sala = salaNoCampeonato(ctx);
    ok(agir(sala, ctx, 't1', { t: 'tatica', tatica: 'Autocarro' }));
    expect(sala.campeonato.fase).toBe('taticas');
    expect(JSON.stringify(estadoPublico(sala, ctx))).not.toContain('Autocarro');
    ok(agir(sala, ctx, 't2', { t: 'tatica', tatica: 'Ataque Total' }));
    const c = sala.campeonato;
    expect(c.fase).toBe('jogos');
    expect(avancarTempo(sala, { ...ctx, agora: ctx.agora })).toBe(false);
    expect(avancarTempo(sala, { ...ctx, agora: c.proximoPeriodo })).toBe(true);
    expect(c.jogos[0].periodo).toBe(1);
    expect(avancarTempo(sala, { ...ctx, agora: c.proximoPeriodo + 60_000 })).toBe(true);
    expect(c.fase).toBe('resultados');
  });
  it('paga TV igual a todos e desconta salários; quem tem jogadores mais caros paga mais', () => {
    const ctx = contexto(9);
    const sala = salaNoCampeonato(ctx);
    const [a, b] = [sala.equipas.e1, sala.equipas.e2];
    a.dinheiro = 100;
    b.dinheiro = 100;
    ok(agir(sala, ctx, 't1', { t: 'avancar' }));
    ok(agir(sala, ctx, 't1', { t: 'avancar' }));
    const jornadas = sala.calendario.length * 2;
    const tv = CONFIG.campeonato.tvEpoca / jornadas;
    const salarios = (e) => e.plantel.reduce((s, id) => s + (jogador(sala, ctx, id).emprestado ? 0 : jogador(sala, ctx, id).valor * 0.05), 0) / jornadas;
    expect(a.dinheiro).toBeCloseTo(100 + tv - salarios(a), 1);
    expect(b.dinheiro).toBeCloseTo(100 + tv - salarios(b), 1);
  });
  it('depois de uma volta abre a janela de inverno, e o emprestado por lesão pode ser comprado', () => {
    const ctx = contexto(10);
    const sala = salaNoCampeonato(ctx);
    let i = 0;
    while (sala.fase === 'campeonato' && i++ < 100) ok(agir(sala, ctx, 't1', { t: 'avancar' }));
    expect(sala.janela.tipo).toBe('inverno');
    const e = sala.equipas.e1;
    const livre = [...ctx.base.values()].find((j) => j.posicao === 'ST' && j.overall === 70 && !sala.jogadores[j.id]?.equipa).id;
    transferir(sala, livre, 'e1', { emprestado: true, emprestadoLesao: true });
    e.dinheiro = 100;
    ok(comprarEmprestado(sala, ctx, 'e1', livre));
    expect(sala.jogadores[livre].emprestado).toBeUndefined();
    for (const t of ['t1', 't2']) ok(agir(sala, ctx, t, { t: 'formacao', formacao: '4-4-2' }));
    expect(e.plantel).toContain(livre);
  });
  it('quem não compra o emprestado fica sem ele quando acaba a escolha da formação', () => {
    const ctx = contexto(10);
    const sala = salaNoCampeonato(ctx);
    let i = 0;
    while (sala.fase === 'campeonato' && i++ < 100) ok(agir(sala, ctx, 't1', { t: 'avancar' }));
    const livre = [...ctx.base.values()].find((j) => j.posicao === 'ST' && j.overall === 70 && !sala.jogadores[j.id]?.equipa).id;
    transferir(sala, livre, 'e1', { emprestado: true, emprestadoLesao: true });
    for (const t of ['t1', 't2']) ok(agir(sala, ctx, t, { t: 'formacao', formacao: '4-4-2' }));
    expect(sala.equipas.e1.plantel).not.toContain(livre);
    verificarInvariantes(sala);
  });
});

describe('partida inteira', () => {
  for (const [epocas, bots] of [[3, 2], [5, 1]]) {
    it(`${epocas} épocas com ${bots} bots: joga até ao fim, com campeões, palmarés e invariantes`, () => {
      const ctx = contexto(21 + epocas);
      const sala = salaComecada(4, { epocas, bots }, ctx);
      const passos = jogarAteAoFim(sala, ctx);
      expect(sala.fase).toBe('fim');
      expect(passos).toBeLessThan(200000);
      expect(sala.palmares).toHaveLength(epocas);
      verificarInvariantes(sala);
      const jornadas = sala.calendario.length * 2;
      expect(Object.values(sala.tabela).every((l) => l.j <= jornadas)).toBe(true);
      const ranking = rankingFinal(sala);
      expect(ranking[0].titulos).toBeGreaterThanOrEqual(ranking[1].titulos);
      expect(JSON.stringify(estadoPublico(sala, ctx)).length).toBeLessThan(600_000);
      for (const e of Object.values(sala.equipas)) expect(e.dinheiro).toBeGreaterThanOrEqual(0);
      expect(melhorOnze(sala.equipas.e1.plantel.map((id) => jogador(sala, ctx, id)), sala.equipas.e1.formacao).onze).toHaveLength(11);
    });
  }
});
