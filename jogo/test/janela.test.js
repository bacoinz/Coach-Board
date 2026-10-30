import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { contexto, salaComecada, salaNoTabuleiro, treinadorDe, vezDe, ok, verificarInvariantes } from './apoio.js';
import { agir } from '../src/motor/partida.js';
import { jogador, transferir } from '../src/motor/estado.js';
import { resolverCasa, totalCasas, precoCarta } from '../src/motor/tabuleiro.js';
import { precoBase, precoDraft } from '../src/motor/valores.js';
import { livresQue, faseMercado, faixasMercado, tirarMercado } from '../src/motor/cartas.js';
import { sugestaoFecho, abrirJanela } from '../src/motor/janela.js';

const dentro = (x, [a, b]) => x >= a && x <= b;

describe('formação e draft', () => {
  it('o draft só começa quando todos escolhem a formação', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    ok(agir(sala, ctx, 't1', { t: 'formacao', formacao: '4-3-3' }));
    expect(sala.janela.fase).toBe('formacao');
    expect(agir(sala, ctx, 't2', { t: 'formacao', formacao: '4-6-0' }).erro).toBeTruthy();
    ok(agir(sala, ctx, 't2', { t: 'formacao', formacao: '5-3-2' }));
    expect(sala.janela.fase).toBe('draft');
  });
  it('na 1.ª janela cada um tem uma escolha de 3 jovens, e o jovem fica na formação com potencial escondido', () => {
    const ctx = contexto();
    const sala = salaComecada(3, {}, ctx);
    for (const t of sala.treinadores) ok(agir(sala, ctx, t.id, { t: 'formacao', formacao: '4-4-2' }));
    const d = sala.janela.draft;
    expect(d.escolhas).toHaveLength(3);
    expect(d.escolhas.every((e) => e.tipo === 'jovem')).toBe(true);
    expect(d.opcoes).toHaveLength(CONFIG.draft.opcoes);
    for (const id of d.opcoes) {
      const j = jogador(sala, ctx, id);
      expect(dentro(j.idade, CONFIG.draft.jovem.idade) && dentro(j.overall, CONFIG.draft.jovem.overall)).toBe(true);
    }
    const eq = d.escolhas[0].equipa;
    const escolhido = d.opcoes[1];
    const antes = sala.equipas[eq].dinheiro;
    const preco = precoDraft(jogador(sala, ctx, escolhido).valor);
    expect(agir(sala, ctx, treinadorDe(sala, d.escolhas[1].equipa), { t: 'draft', jogador: escolhido }).erro).toBeTruthy();
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'draft', jogador: escolhido }));
    expect(sala.equipas[eq].dinheiro).toBeCloseTo(antes - preco);
    const j = sala.jogadores[escolhido];
    expect(j.formacao).toBe(true);
    expect(dentro(j.potencial, CONFIG.jovens.potencial)).toBe(true);
    verificarInvariantes(sala);
  });
  it('a partir da 2.ª janela o último escolhe primeiro e tem a escolha extra (só para vender à banca)', () => {
    const ctx = contexto();
    const sala = salaComecada(3, {}, ctx);
    sala.classificacao = ['e1', 'e2', 'e3'];
    for (const t of sala.treinadores) ok(agir(sala, ctx, t.id, { t: 'formacao', formacao: '4-4-2' }));
    const d = sala.janela.draft;
    expect(d.escolhas.map((e) => `${e.equipa}:${e.tipo}`)).toEqual(['e3:jovem', 'e3:extra', 'e2:jovem', 'e1:jovem']);
    ok(agir(sala, ctx, 't3', { t: 'draft', jogador: null }));
    const extra = d.opcoes.map((id) => jogador(sala, ctx, id));
    expect(extra.every((j) => CONFIG.draft.extra.some((c) => dentro(j.idade, c.idade) && dentro(j.overall, c.overall)))).toBe(true);
    ok(agir(sala, ctx, 't3', { t: 'draft', jogador: extra[0].id }));
    expect(sala.jogadores[extra[0].id].soBanca).toBe(true);
  });
});

describe('tabuleiro', () => {
  it('só lança quem tem a vez, uma vez, e a vez só passa depois de lançar', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(3, {}, ctx);
    const eq = vezDe(sala);
    const outro = sala.janela.ordem[1];
    expect(agir(sala, ctx, treinadorDe(sala, outro), { t: 'lancar' }).erro).toMatch(/vez/);
    expect(agir(sala, ctx, treinadorDe(sala, eq), { t: 'terminar_vez' }).erro).toMatch(/lançaste/);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'lancar' }));
    const lance = sala.janela.ultimoLance.dados.reduce((s, d) => s + d, 0);
    expect(sala.janela.andadas[eq]).toBe(lance);
    expect(agir(sala, ctx, treinadorDe(sala, eq), { t: 'lancar' }).erro).toBeTruthy();
  });
  it('no verão dão-se duas voltas e quem acaba para no Início', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    expect(totalCasas(sala.janela)).toBe(CONFIG.tabuleiro.voltas.verao * CONFIG.tabuleiro.casas.length);
    const eq = vezDe(sala);
    sala.janela.andadas[eq] = totalCasas(sala.janela) - 1;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'lancar' }));
    expect(sala.janela.andadas[eq]).toBe(totalCasas(sala.janela));
    expect(sala.janela.posicao[eq]).toBe(0);
    expect(sala.janela.pendente).toBeNull();
  });
  it('Mercado: comprar paga o preço; passar abre leilão a todos', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(3, {}, ctx);
    const eq = vezDe(sala);
    sala.janela.lancou = true;
    resolverCasa(sala, ctx, eq, 'mercado');
    const p = sala.janela.pendente;
    expect(p.tipo).toBe('mercado');
    for (const e of Object.values(sala.equipas)) e.dinheiro = 500;
    expect(p.preco).toBeCloseTo(jogador(sala, ctx, p.jogador).valor * CONFIG.cartas.precoCasa, 0);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'comprar' }));
    expect(sala.equipas[eq].dinheiro).toBeCloseTo(500 - p.preco);
    expect(sala.equipas[eq].plantel).toContain(p.jogador);

    resolverCasa(sala, ctx, eq, 'mercado');
    const carta = sala.janela.pendente.jogador;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'passar' }));
    const l = sala.janela.leilao;
    expect(l.participantes).toHaveLength(2);
    expect(l.participantes).not.toContain(eq);
    expect(l.minimo).toBeCloseTo(jogador(sala, ctx, carta).valor);
    expect(agir(sala, ctx, treinadorDe(sala, eq), { t: 'licitar', valor: l.minimo }).erro).toMatch(/Não estás/);
    const [e2, e3] = l.participantes;
    ok(agir(sala, ctx, treinadorDe(sala, e2), { t: 'licitar', valor: l.minimo }));
    expect(agir(sala, ctx, treinadorDe(sala, e3), { t: 'licitar', valor: l.minimo }).erro).toMatch(/mínimo/);
    ok(agir(sala, ctx, treinadorDe(sala, e3), { t: 'licitar', valor: l.minimo + 1 }));
    ok(agir(sala, ctx, treinadorDe(sala, e2), { t: 'desistir' }));
    expect(sala.janela.leilao).toBeNull();
    expect(sala.equipas[e3].plantel).toContain(carta);
    verificarInvariantes(sala);
  });
  it('se todos passarem, a carta é descartada até à próxima janela', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    resolverCasa(sala, ctx, eq, 'mercado');
    const carta = sala.janela.pendente.jogador;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'passar' }));
    for (const id of sala.janela.leilao.participantes) ok(agir(sala, ctx, treinadorDe(sala, id), { t: 'desistir' }));
    expect(sala.janela.leilao).toBeNull();
    expect(sala.reservados).not.toContain(carta);
    expect(sala.jogadores[carta]?.equipa).toBeFalsy();
    expect(livresQue(sala, ctx, {})).not.toContain(carta);
    abrirJanela(sala, ctx, 'inverno');
    expect(livresQue(sala, ctx, {})).toContain(carta);
  });
  it('as cartas do Mercado seguem as faixas da fase da época', () => {
    const ctx = contexto(3);
    const sala = salaNoTabuleiro(2, { epocas: 10 }, ctx);
    const faixas = faixasMercado(faseMercado(sala));
    const conta = { principal: 0, abaixo: 0, acima: 0 };
    for (let i = 0; i < 400; i++) {
      const c = tirarMercado(sala, ctx);
      conta[c.faixa]++;
      expect(dentro(jogador(sala, ctx, c.id).overall, faixas[c.faixa])).toBe(true);
    }
    expect(conta.principal / 400).toBeCloseTo(CONFIG.mercado.probabilidades.principal, 1);
    sala.epoca = 10;
    expect(faseMercado(sala)).toBe(7);
  });
  it('Rede: no máximo duas; a terceira obriga a descartar uma, e o desconto aplica-se', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    resolverCasa(sala, ctx, eq, 'rede');
    resolverCasa(sala, ctx, eq, 'rede');
    expect(sala.equipas[eq].redes).toHaveLength(2);
    resolverCasa(sala, ctx, eq, 'rede');
    const nova = sala.janela.pendente.liga;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'descartar_rede', liga: sala.equipas[eq].redes[0] }));
    expect(sala.equipas[eq].redes).toContain(nova);
    expect(sala.equipas[eq].redes).toHaveLength(2);
    // Desconto: uma carta da liga custa 80%.
    const daLiga = livresQue(sala, ctx, { liga: nova, overall: [75, 80] })[0];
    const deFora = livresQue(sala, ctx, { overall: [75, 80] }).find((id) => !sala.equipas[eq].redes.includes(jogador(sala, ctx, id).liga));
    expect(precoCarta(sala, ctx, eq, daLiga)).toBeCloseTo(jogador(sala, ctx, daLiga).valor * CONFIG.cartas.precoCasa * (1 - CONFIG.cartas.redeDesconto), 1);
    expect(precoCarta(sala, ctx, eq, deFora)).toBeCloseTo(jogador(sala, ctx, deFora).valor * CONFIG.cartas.precoCasa, 1);
  });
  it('Jovens Talentos dá um jogador da faixa e, se tiver até 21 anos, entra na formação', () => {
    const ctx = contexto(11);
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    sala.equipas[eq].dinheiro = 1000;
    resolverCasa(sala, ctx, eq, 'jovens');
    const id = sala.janela.pendente.jogador;
    const j = jogador(sala, ctx, id);
    expect(dentro(j.idade, CONFIG.cartas.jovensTalentos.idade) && dentro(j.overall, CONFIG.cartas.jovensTalentos.overall)).toBe(true);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'comprar' }));
    expect(Boolean(sala.jogadores[id].formacao)).toBe(j.idade <= 21);
  });
  it('Empresário e Médico vão para a mão', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    resolverCasa(sala, ctx, eq, 'empresario');
    resolverCasa(sala, ctx, eq, 'medico');
    expect(sala.equipas[eq].cartas).toEqual({ empresario: 1, medico: 1 });
  });
  it('o anfitrião força a vez de quem não está: lança por ele e passa', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(3, {}, ctx);
    const eq = vezDe(sala);
    expect(agir(sala, ctx, 't2', { t: 'forcar_vez' }).erro).toMatch(/anfitrião/);
    ok(agir(sala, ctx, 't1', { t: 'forcar_vez' }));
    expect(sala.janela.andadas[eq]).toBeGreaterThan(0);
    expect(vezDe(sala)).not.toBe(eq);
    expect(sala.janela.pendente).toBeNull();
  });
});

describe('propostas', () => {
  function preparar(ctx) {
    const sala = salaNoTabuleiro(3, {}, ctx);
    const eq = vezDe(sala);
    const dono = sala.janela.ordem[1];
    const terceiro = sala.janela.ordem[2];
    for (const e of Object.values(sala.equipas)) e.dinheiro = 300;
    const alvo = sala.equipas[dono].plantel[0];
    return { sala, eq, dono, terceiro, alvo, t: (id) => treinadorDe(sala, id) };
  }
  it('abaixo da cláusula: leilão e o dono decide (pode recusar)', () => {
    const ctx = contexto();
    const { sala, eq, dono, terceiro, alvo, t } = preparar(ctx);
    const j = jogador(sala, ctx, alvo);
    ok(agir(sala, ctx, t(eq), { t: 'propor', jogador: alvo, valor: j.valor }));
    const l = sala.janela.leilao;
    expect(l.participantes).not.toContain(dono);
    expect(l.lider).toBe(eq);
    ok(agir(sala, ctx, t(terceiro), { t: 'licitar', valor: j.valor + 1 }));
    ok(agir(sala, ctx, t(eq), { t: 'desistir' }));
    expect(l.fase).toBe('decisao');
    expect(agir(sala, ctx, t(eq), { t: 'decidir', aceitar: true }).erro).toBeTruthy();
    ok(agir(sala, ctx, t(dono), { t: 'decidir', aceitar: false }));
    expect(sala.equipas[dono].plantel).toContain(alvo);
  });
  it('aceite: o comprador paga, o dono recebe e o jogador fica bloqueado nesta ronda', () => {
    const ctx = contexto();
    const { sala, eq, dono, terceiro, alvo, t } = preparar(ctx);
    const valor = jogador(sala, ctx, alvo).valor;
    ok(agir(sala, ctx, t(eq), { t: 'propor', jogador: alvo, valor }));
    ok(agir(sala, ctx, t(terceiro), { t: 'desistir' }));
    ok(agir(sala, ctx, t(dono), { t: 'decidir', aceitar: true }));
    expect(sala.equipas[eq].plantel).toContain(alvo);
    expect(sala.equipas[eq].dinheiro).toBeCloseTo(300 - valor);
    expect(sala.equipas[dono].dinheiro).toBeCloseTo(300 + valor);
    expect(sala.jogadores[alvo].compradoRonda).toBe(sala.janela.ronda);
    verificarInvariantes(sala);
  });
  it('bater a cláusula: há leilão mas o dono não pode impedir', () => {
    const ctx = contexto();
    const { sala, eq, dono, terceiro, alvo, t } = preparar(ctx);
    const clausula = jogador(sala, ctx, alvo).clausula;
    ok(agir(sala, ctx, t(eq), { t: 'propor', jogador: alvo, valor: clausula }));
    expect(sala.janela.leilao.obrigatorio).toBe(true);
    ok(agir(sala, ctx, t(terceiro), { t: 'licitar', valor: clausula + 2 }));
    ok(agir(sala, ctx, t(eq), { t: 'desistir' }));
    expect(sala.janela.leilao).toBeNull();
    expect(sala.equipas[terceiro].plantel).toContain(alvo);
    expect(sala.equipas[dono].dinheiro).toBeCloseTo(300 + clausula + 2);
  });
  it('só na tua vez, e não a bots', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, { bots: 1 }, ctx);
    const eq = vezDe(sala);
    const outro = sala.janela.ordem[1];
    const alvo = sala.equipas[eq].plantel[0];
    expect(agir(sala, ctx, treinadorDe(sala, outro), { t: 'propor', jogador: alvo, valor: 5 }).erro).toMatch(/vez/);
    const doBot = sala.equipas.bot1.plantel[0];
    expect(agir(sala, ctx, treinadorDe(sala, eq), { t: 'propor', jogador: doBot, valor: 5 }).erro).toMatch(/bot/);
  });
});

describe('Empresário, banca e trocas', () => {
  it('inflacionar põe a cláusula em 2× uma vez por jogador', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const id = sala.equipas[eq].plantel[0];
    sala.equipas[eq].cartas.empresario = 2;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'inflacionar', jogador: id }));
    const j = jogador(sala, ctx, id);
    expect(j.clausula).toBeCloseTo(j.valor * 2, 1);
    expect(agir(sala, ctx, treinadorDe(sala, eq), { t: 'inflacionar', jogador: id }).erro).toBeTruthy();
  });
  it('exclusividade compra a 1× sem leilão; o dono com Empresário pode anular', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const dono = sala.janela.ordem[1];
    const [alvo1, alvo2] = sala.equipas[dono].plantel;
    sala.equipas[eq].dinheiro = 300;
    sala.equipas[eq].cartas.empresario = 2;
    const valor = jogador(sala, ctx, alvo1).valor;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'exclusividade', jogador: alvo1 }));
    expect(sala.janela.leilao).toBeNull();
    expect(sala.equipas[eq].plantel).toContain(alvo1);
    expect(sala.equipas[eq].dinheiro).toBeCloseTo(300 - valor);

    sala.equipas[dono].cartas.empresario = 1;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'exclusividade', jogador: alvo2 }));
    expect(sala.janela.contestacao).not.toBeNull();
    ok(agir(sala, ctx, treinadorDe(sala, dono), { t: 'responder_empresario', anular: true }));
    expect(sala.equipas[dono].plantel).toContain(alvo2);
    expect(sala.equipas[dono].cartas.empresario).toBe(0);
    expect(sala.equipas[eq].cartas.empresario).toBe(0);
  });
  it('vender à banca dá o preço base', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const id = sala.equipas[eq].plantel[3];
    const antes = sala.equipas[eq].dinheiro;
    const preco = precoBase(jogador(sala, ctx, id).valor);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'vender_banca', jogador: id }));
    expect(sala.equipas[eq].dinheiro).toBeCloseTo(antes + preco);
    expect(sala.equipas[eq].plantel).not.toContain(id);
  });
  it('troca direta: só acontece se o outro aceitar', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const [a, b] = sala.janela.ordem;
    const dar = [sala.equipas[a].plantel[0]];
    const receber = [sala.equipas[b].plantel[1]];
    ok(agir(sala, ctx, treinadorDe(sala, a), { t: 'propor_troca', para: b, dar, receber }));
    const troca = sala.janela.trocas[0].id;
    expect(agir(sala, ctx, treinadorDe(sala, a), { t: 'responder_troca', troca, aceitar: true }).erro).toBeTruthy();
    ok(agir(sala, ctx, treinadorDe(sala, b), { t: 'responder_troca', troca, aceitar: true }));
    expect(sala.equipas[a].plantel).toContain(receber[0]);
    expect(sala.equipas[b].plantel).toContain(dar[0]);
    verificarInvariantes(sala);
  });
});

describe('fecho da janela', () => {
  function noFecho(ctx, n = 2) {
    const sala = salaNoTabuleiro(n, {}, ctx);
    ok(agir(sala, ctx, 't1', { t: 'forcar_fecho' }));
    expect(sala.janela.fase).toBe('fecho');
    return sala;
  }
  it('recusa mais de 11 e jogadores que não encaixam; vende os que saem e empresta para os lugares vazios', () => {
    const ctx = contexto();
    const sala = noFecho(ctx);
    const e = sala.equipas.e1;
    // Mais 2 jogadores (um GR e um PL) → 13.
    const [gr] = livresQue(sala, ctx, { posicao: 'GK', overall: [70, 75] });
    const [pl] = livresQue(sala, ctx, { posicao: 'ST', overall: [70, 75] });
    transferir(sala, gr, 'e1');
    transferir(sala, pl, 'e1');
    expect(agir(sala, ctx, 't1', { t: 'fechar', manter: e.plantel }).erro).toMatch(/11/);
    // Dois GR no onze: o segundo não encaixa.
    const semUmCentral = e.plantel.filter((id) => jogador(sala, ctx, id).posicao !== 'CB').slice(0, 11);
    expect(agir(sala, ctx, 't1', { t: 'fechar', manter: semUmCentral }).erro).toMatch(/cabem|encaixa/);
    // Fica só com 9 de campo: os 2 lugares vazios recebem emprestados.
    const nove = e.plantel.filter((id) => ![gr, pl].includes(id)).slice(0, 9);
    const antes = e.dinheiro;
    ok(agir(sala, ctx, 't1', { t: 'fechar', manter: nove }));
    expect(e.dinheiro).toBeGreaterThan(antes);
    expect(e.onze.every((l) => l.jogador != null)).toBe(true);
    expect(e.plantel.filter((id) => sala.jogadores[id].emprestado)).toHaveLength(2);
    verificarInvariantes(sala);
  });
  it('os jovens da formação podem ser titulares; só fica de fora um 12.º, e tem de ser da formação', () => {
    const ctx = contexto();
    const sala = noFecho(ctx);
    const e = sala.equipas.e1;
    // Um jovem central de 81 (titular) e um jovem avançado (12.º).
    const [central] = livresQue(sala, ctx, { posicao: 'CB', idade: [0, 21], overall: [80, 85] });
    const [avancado] = livresQue(sala, ctx, { posicao: 'ST', idade: [0, 21], overall: [60, 68] });
    for (const id of [central, avancado]) transferir(sala, id, 'e1', { formacao: true, potencial: 90 });
    const { manter } = sugestaoFecho(sala, ctx, 'e1');
    expect(manter).toContain(central);
    expect(manter).toContain(avancado);
    expect(manter).toHaveLength(12);
    // Um 12.º que não é da formação não pode ficar.
    const naoJovem = e.plantel.find((id) => !manter.includes(id));
    expect(agir(sala, ctx, 't1', { t: 'fechar', manter: [...manter.filter((id) => id !== avancado), naoJovem] }).erro).toMatch(/formação/);
    ok(agir(sala, ctx, 't1', { t: 'fechar', manter }));
    expect(e.onze.some((l) => l.jogador === central)).toBe(true);
    expect(e.suplente).toBe(avancado);
    expect(sala.jogadores[central].formacao).toBe(true);
  });
  it('quando todos fecham, passa ao campeonato; ao avançar abre a janela de inverno e os emprestados voltam', () => {
    const ctx = contexto();
    const sala = noFecho(ctx);
    const e1 = sala.equipas.e1;
    ok(agir(sala, ctx, 't1', { t: 'fechar', manter: e1.plantel.slice(0, 10) }));
    ok(agir(sala, ctx, 't2', { t: 'fechar', manter: sala.equipas.e2.plantel }));
    expect(sala.fase).toBe('campeonato');
    const emprestados = e1.plantel.filter((id) => sala.jogadores[id].emprestado);
    expect(emprestados).toHaveLength(1);
    let i = 0;
    while (sala.fase === 'campeonato' && i++ < 100) ok(agir(sala, ctx, 't1', { t: 'avancar' }));
    expect(sala.fase).toBe('janela');
    expect(sala.janela.tipo).toBe('inverno');
    expect(e1.plantel).not.toContain(emprestados[0]);
    verificarInvariantes(sala);
  });
});
