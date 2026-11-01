import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { contexto, salaComecada, salaNoTabuleiro, treinadorDe, vezDe, ok } from './apoio.js';
import { agir } from '../src/motor/partida.js';
import { jogador } from '../src/motor/estado.js';
import { criterioExtra, criterioJovem, sugestaoFecho } from '../src/motor/janela.js';
import { criarJogo } from '../src/motor/jogo.js';
import { executarVenda } from '../src/motor/negocios.js';
import { melhorOnze, onzeEscolhido } from '../src/motor/formacao.js';
import { livresQue } from '../src/motor/cartas.js';

describe('segunda escolha do draft', () => {
  it('sobe 1 de overall e 1 M€ por época, até 82 e 7 M€', () => {
    const limites = [1, 2, 3, 4, 10].map((e) => criterioExtra(e));
    expect(limites.map((c) => c.overall[1])).toEqual([80, 81, 82, 82, 82]);
    expect(limites.map((c) => c.valorMaximo)).toEqual([5, 6, 7, 7, 7]);
  });
  it('há jogadores para a escolha, com o valor e o overall dentro dos limites, em todas as épocas', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    for (const epoca of [1, 2, 3]) {
      const c = criterioExtra(epoca);
      const ids = livresQue(sala, ctx, c);
      expect(ids.length).toBeGreaterThan(CONFIG.draft.opcoes * 3);
      for (const id of ids) {
        const j = jogador(sala, ctx, id);
        expect(j.overall).toBeLessThanOrEqual(c.overall[1]);
        expect(j.valor).toBeLessThanOrEqual(c.valorMaximo);
      }
    }
  });
});

describe('limite de compras ao mesmo treinador', () => {
  const alvos = (sala, id) => sala.equipas[id].plantel;

  it('à terceira compra na mesma janela, a proposta é recusada', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const outro = sala.janela.ordem.find((x) => x !== eq);
    sala.equipas[eq].dinheiro = 1000;
    executarVenda(sala, ctx, alvos(sala, outro)[0], eq, 1);
    executarVenda(sala, ctx, alvos(sala, outro)[0], eq, 1);
    expect(sala.janela.compras[eq][outro]).toBe(CONFIG.transferencias.maxPorTreinador);
    sala.janela.ronda = 99;
    const r = agir(sala, ctx, treinadorDe(sala, eq), { t: 'propor', jogador: alvos(sala, outro)[0], valor: 10 });
    expect(r.erro).toMatch(/mesmo treinador/);
  });
  it('as trocas também contam', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const [a, b] = sala.janela.ordem;
    sala.janela.compras = { [a]: { [b]: 2 } };
    const r = agir(sala, ctx, treinadorDe(sala, a), { t: 'propor_troca', para: b, dar: [alvos(sala, a)[0]], receber: [alvos(sala, b)[0]] });
    expect(r.erro).toMatch(/mesmo treinador/);
    // No sentido contrário ainda pode.
    delete sala.janela.compras[a][b];
    sala.janela.compras[b] = {};
    ok(agir(sala, ctx, treinadorDe(sala, b), { t: 'propor_troca', para: a, dar: [alvos(sala, b)[0]], receber: [alvos(sala, a)[0]] }));
  });
});

describe('o onze escolhido pelo treinador', () => {
  const preparar = () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    const e = sala.equipas.e1;
    e.formacao = '4-4-2';
    const jogadores = e.plantel.map((id) => jogador(sala, ctx, id));
    const { onze } = melhorOnze(jogadores, e.formacao);
    return { ctx, sala, e, onze, lugares: onze.map((l) => l.jogador) };
  };

  it('aceita um jogador fora das suas posições, e o jogo fica com o overall penalizado', () => {
    const { ctx, sala, e, lugares, onze } = preparar();
    const gr = onze.findIndex((l) => l.posicao === 'GK');
    const outro = onze.findIndex((l, i) => i !== gr && l.jogador != null);
    const trocados = [...lugares];
    [trocados[gr], trocados[outro]] = [trocados[outro], trocados[gr]];
    ok(agir(sala, ctx, 't1', { t: 'onze', lugares: trocados }));
    expect(e.escolhaOnze).toEqual(trocados);
    const naBaliza = jogador(sala, ctx, onze[outro].jogador);
    expect(onzeEscolhido(e.plantel.map((id) => jogador(sala, ctx, id)), e.formacao, trocados).onze[gr]).toMatchObject({
      jogador: naBaliza.id,
      overall: naBaliza.overall - CONFIG.posicoes.foraDePosicao.outraLinha,
    });
  });
  it('fora de posição chega ao jogo: o fecho guarda a escolha e o lance usa o overall penalizado', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const e = sala.equipas.e1;
    const todos = e.plantel.map((id) => jogador(sala, ctx, id));
    const { onze } = melhorOnze(todos, e.formacao);
    const dd = onze.findIndex((l) => l.posicao === 'RB');
    const pl = onze.findIndex((l) => l.posicao === 'ST');
    const lugares = onze.map((l) => l.jogador);
    [lugares[dd], lugares[pl]] = [lugares[pl], lugares[dd]];
    ok(agir(sala, ctx, 't1', { t: 'onze', lugares }));
    sala.janela.fase = 'fecho';
    for (const eq of ['e1', 'e2']) ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'fechar', ...sugestaoFecho(sala, ctx, eq) }));
    expect(sala.fase).toBe('campeonato');
    const avancado = jogador(sala, ctx, lugares[dd]);
    expect(e.onze[dd]).toMatchObject({ jogador: avancado.id, overall: avancado.overall - CONFIG.posicoes.foraDePosicao.outraLinha });
    const jogo = criarJogo(sala, ctx, 'e1', 'e2', { e1: 'Autocarro', e2: 'Autocarro' });
    expect(jogo.lados[0].onze.find((l) => l.jogador === avancado.id).overall).toBe(avancado.overall - CONFIG.posicoes.foraDePosicao.outraLinha);
  });

  it('não aceita o mesmo jogador em dois lugares nem jogadores de outros', () => {
    const { ctx, sala, lugares } = preparar();
    const repetido = [...lugares];
    repetido[1] = repetido[2];
    expect(agir(sala, ctx, 't1', { t: 'onze', lugares: repetido }).erro).toBeTruthy();
    const alheio = [...lugares];
    alheio[1] = sala.equipas.e2.plantel[0];
    expect(agir(sala, ctx, 't1', { t: 'onze', lugares: alheio }).erro).toBeTruthy();
  });
  it('dois jogadores da mesma posição podem trocar de lugar, e a escolha mantém-se', () => {
    const { ctx, sala, e, lugares, onze } = preparar();
    const i = onze.findIndex((l) => l.posicao === 'CB');
    const k = onze.findIndex((l, n) => n !== i && l.posicao === 'CB');
    const trocados = [...lugares];
    [trocados[i], trocados[k]] = [trocados[k], trocados[i]];
    ok(agir(sala, ctx, 't1', { t: 'onze', lugares: trocados }));
    expect(e.escolhaOnze).toEqual(trocados);
    const jogadores = e.plantel.map((id) => jogador(sala, ctx, id));
    expect(onzeEscolhido(jogadores, e.formacao, e.escolhaOnze).onze.map((l) => l.jogador)).toEqual(trocados);
  });
  it('quem saiu do plantel deixa o lugar para o melhor possível', () => {
    const { ctx, sala, e, lugares } = preparar();
    ok(agir(sala, ctx, 't1', { t: 'onze', lugares }));
    const jogadores = e.plantel.map((id) => jogador(sala, ctx, id)).filter((j) => j.id !== lugares[3]);
    const { onze } = onzeEscolhido(jogadores, e.formacao, e.escolhaOnze);
    expect(onze[3].jogador).toBeNull();
    expect(onze[0].jogador).toBe(lugares[0]);
  });
  it('antes de um jogo muda logo o onze e quem sai passa a suplente; durante o jogo não', () => {
    const { ctx, sala, e, onze, lugares } = preparar();
    const i = onze.findIndex((l) => l.posicao === 'CB');
    const k = onze.findIndex((l, n) => n !== i && l.posicao === 'CB');
    e.onze = onze;
    sala.fase = 'campeonato';
    sala.campeonato = { fase: 'taticas', taticas: {}, jogos: [] };
    const trocados = [...lugares];
    [trocados[i], trocados[k]] = [trocados[k], trocados[i]];
    ok(agir(sala, ctx, 't1', { t: 'onze', lugares: trocados }));
    expect(e.onze.map((l) => l.jogador)).toEqual(trocados);
    sala.campeonato.fase = 'jogos';
    expect(agir(sala, ctx, 't1', { t: 'onze', lugares }).erro).toMatch(/Agora/);
  });
});

describe('fim das voltas', () => {
  it('quem completa a volta termina a vez uma última vez e sai da rotação', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(3, {}, ctx);
    const j = sala.janela;
    const [a, b, c] = j.ordem;
    j.andadas[a] = 35;
    j.posicao[a] = 35;
    ok(agir(sala, ctx, treinadorDe(sala, a), { t: 'lancar' }));
    expect(j.andadas[a]).toBe(36);
    expect(j.posicao[a]).toBe(0);
    ok(agir(sala, ctx, treinadorDe(sala, a), { t: 'terminar_vez' }));
    expect(j.ordem[j.vez]).toBe(b);
    ok(agir(sala, ctx, treinadorDe(sala, b), { t: 'lancar' }));
    if (j.pendente) ok(agir(sala, ctx, treinadorDe(sala, b), j.pendente.tipo === 'patrocinio' ? { t: 'patrocinio', aceitar: false } : j.pendente.tipo === 'rede' ? { t: 'descartar_rede', liga: j.pendente.liga } : { t: 'passar' }));
    if (j.leilao) ok(agir(sala, ctx, 't1', { t: 'forcar_leilao' }));
    ok(agir(sala, ctx, treinadorDe(sala, b), { t: 'terminar_vez' }));
    expect(j.ordem[j.vez]).toBe(c);
    if (j.leilao) ok(agir(sala, ctx, 't1', { t: 'forcar_leilao' }));
    j.andadas[c] = 35;
    j.posicao[c] = 35;
    ok(agir(sala, ctx, treinadorDe(sala, c), { t: 'lancar' }));
    ok(agir(sala, ctx, treinadorDe(sala, c), { t: 'terminar_vez' }));
    // Só falta b: a vez salta quem já acabou.
    expect(j.ordem[j.vez]).toBe(b);
  });
});

describe('jovens do draft', () => {
  it('sobem 1 de overall por época e há jovens que cheguem até à última', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    expect(criterioJovem(1).overall).toEqual([60, 68]);
    expect(criterioJovem(2).overall).toEqual([61, 69]);
    expect(criterioJovem(10).overall).toEqual([69, 77]);
    for (let epoca = 1; epoca <= 10; epoca++) {
      const ids = livresQue(sala, ctx, criterioJovem(epoca));
      expect(ids.length).toBeGreaterThan(CONFIG.draft.opcoes * 8);
      expect(ids.every((id) => jogador(sala, ctx, id).idade <= 21)).toBe(true);
    }
  });
});
