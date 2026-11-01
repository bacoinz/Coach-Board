import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { contexto, salaNoTabuleiro, salaComecada, treinadorDe, vezDe, ok } from './apoio.js';
import { agir } from '../src/motor/partida.js';
import { jogador, saldoMinimo } from '../src/motor/estado.js';
import { executarVenda } from '../src/motor/negocios.js';
import { precoBase, arredondar } from '../src/motor/valores.js';
import { momentosDoJogo, resumoMomentos, momentoCompra } from '../src/motor/momentos.js';
import { zerarEpoca } from '../src/motor/campeonato.js';

/** Dois treinadores no tabuleiro: o primeiro a jogar fica em dívida. */
function emDivida(saldo = -10) {
  const ctx = contexto();
  const sala = salaNoTabuleiro(2, {}, ctx);
  const eq = vezDe(sala);
  const outra = sala.janela.ordem.find((id) => id !== eq);
  sala.equipas[eq].dinheiro = saldo;
  sala.equipas[outra].dinheiro = 200;
  sala.janela.pendente = null;
  const id = sala.equipas[eq].plantel.map((x) => jogador(sala, ctx, x)).sort((a, b) => b.valor - a.valor)[0].id;
  return { ctx, sala, eq, outra, id, t: treinadorDe(sala, eq), to: treinadorDe(sala, outra) };
}

describe('saldo negativo', () => {
  it('o limite da dívida cresce com a fase do Mercado, por isso depende da duração', () => {
    const limites = (epocas) => Array.from({ length: epocas }, (_, i) => saldoMinimo({ config: { epocas }, epoca: i + 1 }));
    expect(limites(3)).toEqual([-40, -70, -120]);
    expect(limites(10)).toEqual([-40, -50, -50, -60, -70, -70, -85, -100, -100, -120]);
  });

  it('deixa gastar até ao limite, mas não para lá dele', () => {
    const { ctx, sala, outra, to } = emDivida();
    sala.janela.pendente = null;
    const minimo = saldoMinimo(sala);
    expect(minimo).toBeLessThan(0);
    const eq = sala.janela.ordem.find((x) => x !== outra);
    const alvo = sala.equipas[eq].plantel[0];
    sala.equipas[outra].dinheiro = 1;
    sala.janela.vez = sala.janela.ordem.indexOf(outra);
    sala.janela.lancou = false;
    const jg = jogador(sala, ctx, alvo);
    // Com 1 M€, propor abaixo do limite passa e acima do limite não.
    expect(agir(sala, ctx, to, { t: 'propor', jogador: alvo, valor: 1 - minimo + 1 }).erro).toMatch(/saldo/);
    ok(agir(sala, ctx, to, { t: 'propor', jogador: alvo, valor: Math.min(1 - minimo, Math.max(jg.valor, 5)) }));
  });

  it('em dívida não se vende à banca: o jogador vai a leilão a partir de 80% do valor', () => {
    const { ctx, sala, eq, id, t } = emDivida();
    expect(agir(sala, ctx, t, { t: 'vender_banca', jogador: id }).erro).toMatch(/leilão/);
    ok(agir(sala, ctx, t, { t: 'leiloar_divida', jogador: id }));
    const l = sala.janela.leilao;
    const jg = jogador(sala, ctx, id);
    expect(l.origem).toBe('divida');
    expect(l.minimo).toBeCloseTo(arredondar(jg.valor * CONFIG.transferencias.leilaoDivida));
    expect(l.minimo).toBeLessThan(jg.clausula);
    expect(l.participantes).not.toContain(eq);
  });

  it('quem licita fica com o jogador e o dono não pode recusar', () => {
    const { ctx, sala, eq, outra, id, t, to } = emDivida();
    ok(agir(sala, ctx, t, { t: 'leiloar_divida', jogador: id }));
    const lance = sala.janela.leilao.minimo;
    ok(agir(sala, ctx, to, { t: 'licitar', valor: lance }));
    expect(sala.janela.leilao).toBeNull();
    expect(jogador(sala, ctx, id).equipa).toBe(outra);
    expect(sala.equipas[eq].dinheiro).toBeCloseTo(-10 + lance);
    expect(sala.equipas[outra].dinheiro).toBeCloseTo(200 - lance);
  });

  it('se ninguém licitar, vai para a banca ao preço base', () => {
    const { ctx, sala, eq, id, t, to } = emDivida();
    ok(agir(sala, ctx, t, { t: 'leiloar_divida', jogador: id }));
    const jg = jogador(sala, ctx, id);
    ok(agir(sala, ctx, to, { t: 'desistir' }));
    expect(sala.janela.leilao).toBeNull();
    expect(jogador(sala, ctx, id).equipa).toBeNull();
    expect(sala.equipas[eq].dinheiro).toBeCloseTo(-10 + precoBase(jg.valor));
  });

  it('sem dívida não há leilão forçado, e os jogadores só de banca continuam a ir à banca', () => {
    const { ctx, sala, eq, id, t } = emDivida();
    sala.equipas[eq].dinheiro = 5;
    expect(agir(sala, ctx, t, { t: 'leiloar_divida', jogador: id }).erro).toBeTruthy();
    sala.equipas[eq].dinheiro = -5;
    sala.jogadores[id].soBanca = true;
    expect(agir(sala, ctx, t, { t: 'leiloar_divida', jogador: id }).erro).toMatch(/banca/);
    ok(agir(sala, ctx, t, { t: 'vender_banca', jogador: id }));
  });

  it('a janela não fecha com dívida, e quem ficar em dívida deixa de estar pronto', () => {
    const { ctx, sala, eq, outra, t, to } = emDivida();
    const total = CONFIG.tabuleiro.voltas[sala.janela.tipo] * CONFIG.tabuleiro.casas.length;
    for (const id of sala.janela.ordem) sala.janela.andadas[id] = total;
    expect(agir(sala, ctx, t, { t: 'pronto_fechar' }).erro).toMatch(/saldo negativo/);
    ok(agir(sala, ctx, to, { t: 'pronto_fechar' }));
    expect(sala.janela.fase).toBe('tabuleiro');
    sala.equipas[eq].dinheiro = 1;
    sala.equipas[outra].dinheiro = -1;
    ok(agir(sala, ctx, t, { t: 'pronto_fechar' }));
    expect(sala.janela.fase).toBe('tabuleiro');
    expect(sala.janela.prontos).not.toContain(outra);
    sala.equipas[outra].dinheiro = 1;
    ok(agir(sala, ctx, to, { t: 'pronto_fechar' }));
    expect(sala.janela.fase).toBe('fecho');
  });

  it('o anfitrião pode forçar o fecho: os mais valiosos vão para a banca até a dívida acabar', () => {
    const { ctx, sala, eq, id } = emDivida(-1);
    ok(agir(sala, ctx, 't1', { t: 'forcar_fecho' }));
    expect(sala.janela.fase).toBe('fecho');
    expect(sala.equipas[eq].dinheiro).toBeGreaterThanOrEqual(0);
    expect(jogador(sala, ctx, id).equipa).toBeNull();
  });
});

describe('momentos da época', () => {
  const jogo = (ga, gb, marcadores = {}) => ({ lados: [{ equipa: 'e1', golos: ga, marcadores }, { equipa: 'e2', golos: gb, marcadores: {} }] });

  it('uma goleada dá um momento bom a quem ganhou e um mau a quem perdeu', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    momentosDoJogo(sala, ctx, jogo(5, 0));
    const r = resumoMomentos(sala);
    expect(r.equipas.e2.maus[0]).toMatch(/5-0/);
    expect(r.equipas.e1.bons[0]).toMatch(/5-0/);
    expect(r.geral.maus[0]).toMatch(/5-0/);
    // Na época em geral, a mesma goleada não aparece nos dois lados.
    expect(r.geral.bons.some((x) => x.includes('5-0'))).toBe(false);
  });

  it('jogos normais não contam; hat-tricks e compras ruinosas contam', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    momentosDoJogo(sala, ctx, jogo(2, 1));
    expect(sala.momentos ?? []).toHaveLength(0);
    const marcador = sala.equipas.e1.plantel[0];
    momentosDoJogo(sala, ctx, jogo(3, 2, { [marcador]: 3 }));
    expect(resumoMomentos(sala).equipas.e1.bons[0]).toMatch(/3 golos/);
    momentoCompra(sala, 'e2', 'Fulano', 30, 10);
    expect(resumoMomentos(sala).equipas.e2.maus[0]).toMatch(/Fulano/);
  });

  it('uma venda paga acima do valor fica nos momentos', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const id = sala.equipas.e2.plantel[0];
    executarVenda(sala, ctx, id, 'e1', jogador(sala, ctx, id).valor * 2 + 5);
    expect(resumoMomentos(sala).equipas.e1.maus.length).toBeGreaterThan(0);
  });

  it('a classificação e os momentos voltam a zero quando começa a época seguinte', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    sala.tabela = { e1: { equipa: 'e1', j: 5, v: 5, e: 0, d: 0, gm: 9, gs: 1, pts: 15 } };
    sala.estatisticas = { 1: { golos: 3 } };
    sala.momentos = [{ equipa: 'e1', tom: 'bom', peso: 1, texto: 'x' }];
    zerarEpoca(sala);
    expect(sala.tabela.e1.pts).toBe(0);
    expect(sala.tabela.e2.pts).toBe(0);
    expect(sala.estatisticas).toEqual({});
    expect(sala.momentos).toEqual([]);
  });
});
