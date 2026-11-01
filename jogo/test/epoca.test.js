import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { contexto, salaComecada, salaNoTabuleiro, treinadorDe, vezDe, ok, verificarInvariantes } from './apoio.js';
import { agir } from '../src/motor/partida.js';
import { prepararJovem } from '../src/motor/negocios.js';
import { jogador, transferir, livre } from '../src/motor/estado.js';
import { resolverCasa } from '../src/motor/tabuleiro.js';
import { abrirJanela } from '../src/motor/janela.js';
import { entrar } from '../src/motor/sala-logica.js';
import { premio, extensaoPatrocinios, extensaoMarca } from '../src/motor/patrocinios.js';
import { MARCAS, PATROCINIOS } from '../src/motor/marcas.js';
import { crescimentoJovem, envelhecer, variacaoOverall, rendimentoEpoca, reformaSe } from '../src/motor/fim-epoca.js';
import { emparelhar, nomeRonda, ordenarTabela } from '../src/motor/campeonato.js';
import { criarJogo, forca } from '../src/motor/jogo.js';
import { tirarMisterio } from '../src/motor/misterio.js';
import { rankingFinal } from '../src/motor/partida.js';
import { ajustarBots } from '../src/motor/bots.js';
import { passo, jogarAteAoFim } from '../scripts/treinador-auto.mjs';
import { estadoPublico, privado } from '../src/motor/vista.js';

/** Tira cartas de patrocínio até sair uma do género pedido. */
function carta(sala, ctx, eq, genero, categoria = null) {
  for (let i = 0; i < 400; i++) {
    resolverCasa(sala, ctx, eq, 'patrocinio');
    const p = sala.janela.pendente;
    if (p.genero === genero && (!categoria || p.categoria === categoria)) return p;
    sala.janela.pendente = null;
  }
  throw new Error('carta não saiu');
}

describe('marcas e patrocínios', () => {
  it('as probabilidades seguem a tabela de 7 fases, e somam 1', () => {
    for (const f of CONFIG.patrocinios.fases.slice(1)) expect(Object.values(f).reduce((s, x) => s + x, 0)).toBeCloseTo(1);
    const ctx = contexto(2);
    const sala = salaNoTabuleiro(2, { epocas: 3 }, ctx);
    const eq = vezDe(sala);
    const conta = {};
    sala.epoca = 3; // 3.ª época de 3: fase 7, 30% iniciais investidas e 70% grandes
    for (let i = 0; i < 500; i++) {
      resolverCasa(sala, ctx, eq, 'patrocinio');
      conta[sala.janela.pendente.categoria] = (conta[sala.janela.pendente.categoria] ?? 0) + 1;
      sala.janela.pendente = null;
    }
    expect(Object.keys(conta).sort()).toEqual(['grandes', 'investidas']);
    expect(conta.investidas / 500).toBeCloseTo(0.3, 1);
  });
  it('na 1.ª época só saem baixos; as iniciais investidas pagam tanto ou mais do que as grandes', () => {
    const ctx = contexto(3);
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    for (let i = 0; i < 50; i++) {
      resolverCasa(sala, ctx, eq, 'patrocinio');
      expect(sala.janela.pendente.categoria).toBe('baixas');
      sala.janela.pendente = null;
    }
    for (const g of ['marca', 'patrocinio']) expect(premio(g, 'investidas')).toBeGreaterThanOrEqual(premio(g, 'grandes'));
  });
  it('aceitar paga só uma vez, muda o contrato e a marca só muda uma vez por época', () => {
    const ctx = contexto(4);
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    const t = treinadorDe(sala, eq);
    const p = carta(sala, ctx, eq, 'marca');
    const antes = e.dinheiro;
    ok(agir(sala, ctx, t, { t: 'patrocinio', aceitar: true }));
    expect(e.marca).toBe(p.nome);
    expect(e.dinheiro).toBeCloseTo(antes + p.premio);
    const outra = carta(sala, ctx, eq, 'marca');
    expect(outra.bloqueio).toBeTruthy();
    expect(agir(sala, ctx, t, { t: 'patrocinio', aceitar: true }).erro).toBeTruthy();
    ok(agir(sala, ctx, t, { t: 'patrocinio', aceitar: false }));
    expect(e.marca).toBe(p.nome);
  });
  it('os patrocínios mudam uma vez por janela e dá para escolher qual sai', () => {
    const ctx = contexto(5);
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    const t = treinadorDe(sala, eq);
    const fica = e.patrocinios[0];
    const p = carta(sala, ctx, eq, 'patrocinio');
    ok(agir(sala, ctx, t, { t: 'patrocinio', aceitar: true, substitui: 1 }));
    expect(e.patrocinios).toEqual([fica, p.nome]);
    expect(carta(sala, ctx, eq, 'patrocinio').bloqueio).toBeTruthy();
    extensaoPatrocinios(sala, ctx);
    expect(e.mudancas.patrocinios).toBe(0);
  });
  it('numa época mudam-se os dois patrocinadores, um de cada vez, mas nunca o mesmo duas vezes', () => {
    const ctx = contexto(21);
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    const t = treinadorDe(sala, eq);
    carta(sala, ctx, eq, 'patrocinio');
    ok(agir(sala, ctx, t, { t: 'patrocinio', aceitar: true, substitui: 0 }));
    // Na janela seguinte só pode mudar o outro.
    extensaoPatrocinios(sala, ctx);
    const segunda = carta(sala, ctx, eq, 'patrocinio');
    expect(segunda.substituir).toEqual([1]);
    expect(agir(sala, ctx, t, { t: 'patrocinio', aceitar: true, substitui: 0 }).erro).toBeTruthy();
    ok(agir(sala, ctx, t, { t: 'patrocinio', aceitar: true, substitui: 1 }));
    // Depois de mudar os dois, fica bloqueado até ao fim da época.
    extensaoPatrocinios(sala, ctx);
    expect(carta(sala, ctx, eq, 'patrocinio').bloqueio).toMatch(/dois/);
    ok(agir(sala, ctx, t, { t: 'patrocinio', aceitar: false }));
    extensaoMarca(sala, ctx);
    expect(carta(sala, ctx, eq, 'patrocinio').substituir).toEqual([0, 1]);
    expect(e.mudancas.trocados).toEqual([false, false]);
  });
  it('nunca dois patrocínios de valor alto', () => {
    const ctx = contexto(6);
    const sala = salaNoTabuleiro(2, { epocas: 3 }, ctx);
    sala.epoca = 3;
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    e.patrocinios = [PATROCINIOS.grandes[0], PATROCINIOS.baixas[0]];
    e.categorias.patrocinios = ['grandes', 'baixas'];
    const p = carta(sala, ctx, eq, 'patrocinio');
    expect(CONFIG.patrocinios.altos).toContain(p.categoria);
    expect(p.substituir).toEqual([0]);
    expect(agir(sala, ctx, treinadorDe(sala, eq), { t: 'patrocinio', aceitar: true, substitui: 1 }).erro).toMatch(/alto/);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'patrocinio', aceitar: true, substitui: 0 }));
    expect(e.categorias.patrocinios.filter((c) => CONFIG.patrocinios.altos.includes(c))).toHaveLength(1);
  });
  it('cada marca e patrocinador só está numa equipa de cada vez', () => {
    const ctx = contexto(7);
    const sala = salaNoTabuleiro(4, {}, ctx);
    const eq = vezDe(sala);
    const outros = Object.values(sala.equipas).filter((e) => e.id !== eq);
    outros[0].marca = MARCAS.baixas[0];
    outros[1].marca = MARCAS.baixas[1];
    for (let i = 0; i < 100; i++) {
      const p = carta(sala, ctx, eq, 'marca');
      expect([MARCAS.baixas[0], MARCAS.baixas[1]]).not.toContain(p.nome);
      sala.janela.pendente = null;
    }
  });
  it('aceitar uma inicial que se tornou grande soma pontos de ajuda; uma normal não', () => {
    const ctx = contexto(8);
    const sala = salaNoTabuleiro(2, { epocas: 3 }, ctx);
    sala.epoca = 3;
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    carta(sala, ctx, eq, 'marca', 'grandes');
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'patrocinio', aceitar: true }));
    expect(e.ajudas ?? 0).toBe(0);
    e.mudancas.marca = 0;
    carta(sala, ctx, eq, 'marca', 'investidas');
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'patrocinio', aceitar: true }));
    expect(e.ajudas).toBe(CONFIG.investigacao.ajudaInicialInvestida);
  });
  it('quem não muda recebe a extensão: patrocínios por janela, marca por época', () => {
    const ctx = contexto(9);
    const sala = salaNoTabuleiro(2, {}, ctx);
    const [a, b] = Object.values(sala.equipas);
    b.mudancas.patrocinios = 1;
    b.mudancas.marca = 1;
    const [da, db] = [a.dinheiro, b.dinheiro];
    extensaoPatrocinios(sala, ctx);
    expect(a.dinheiro).toBeCloseTo(da + 2 * CONFIG.inicio.premioPatrocinioInicial * CONFIG.patrocinios.extensao);
    expect(b.dinheiro).toBe(db);
    const da2 = a.dinheiro;
    extensaoMarca(sala, ctx);
    expect(a.dinheiro).toBeCloseTo(da2 + CONFIG.inicio.premioMarcaInicial * CONFIG.patrocinios.extensao);
    expect(b.dinheiro).toBe(db);
    expect(b.mudancas.marca).toBe(0);
  });
});

describe('fim de época', () => {
  /** Joga até ao ecrã de fim de época. */
  function ateFimEpoca(sala, ctx) {
    let n = 0;
    while (sala.fase !== 'fimEpoca' && n++ < 50000) passo(sala, ctx);
    expect(sala.fase).toBe('fimEpoca');
  }
  it('os jovens crescem de +2 a +8 conforme os minutos', () => {
    expect(crescimentoJovem(0, 1000)).toBe(2);
    expect(crescimentoJovem(1000, 1000)).toBe(8);
    expect(crescimentoJovem(500, 1000)).toBe(5);
    expect(crescimentoJovem(5000, 1000)).toBe(8);
  });
  it('todos fazem +1 ano; o jovem não passa o potencial', () => {
    const ctx = contexto(10);
    const sala = salaComecada(2, {}, ctx);
    sala.calendario = [[]];
    const e = sala.equipas.e1;
    const jovem = e.plantel[0];
    const antes = jogador(sala, ctx, e.plantel[3]);
    sala.jogadores[jovem] = { ...sala.jogadores[jovem], idade: 19, overall: 70, formacao: true, potencial: 72, minutos: 100000 };
    envelhecer(sala, ctx);
    expect(jogador(sala, ctx, jovem).overall).toBe(72);
    expect(jogador(sala, ctx, jovem).idade).toBe(20);
    expect(jogador(sala, ctx, e.plantel[3]).idade).toBe(antes.idade + 1);
    expect(jogador(sala, ctx, jovem).minutos).toBe(0);
  });
  it('a evolução segue a tabela de cada idade', () => {
    const ctx = contexto(20);
    const distribuicao = (idade) => {
      const conta = {};
      for (let i = 0; i < 20000; i++) {
        const v = variacaoOverall(ctx.aleatorio, idade);
        conta[v] = (conta[v] ?? 0) + 1 / 20000;
      }
      return conta;
    };
    const ate23 = distribuicao(23);
    expect(ate23[1]).toBeCloseTo(0.15, 1);
    expect(ate23[2]).toBeCloseTo(0.6, 1);
    expect(ate23[3]).toBeCloseTo(0.25, 1);
    // Um jovem que já tem mais de 84 sobe mais devagar; com 84 ainda não.
    const travado = {};
    for (let i = 0; i < 20000; i++) {
      const v = variacaoOverall(ctx.aleatorio, 20, 85);
      travado[v] = (travado[v] ?? 0) + 1 / 20000;
    }
    expect(travado[1]).toBeCloseTo(0.8, 1);
    expect(travado[2]).toBeCloseTo(0.2, 1);
    expect(travado[3]).toBeUndefined();
    expect(variacaoOverall(() => 0.99, 20, 84)).toBe(3);
    const ate30 = distribuicao(30);
    expect(ate30[1]).toBeCloseTo(0.8, 1);
    expect(ate30[2]).toBeCloseTo(0.2, 1);
    const ate33 = distribuicao(33);
    expect(ate33[0]).toBeCloseTo(0.7, 1);
    expect(ate33[1]).toBeCloseTo(0.3, 1);
    // Aos 34 perde 1 com 20%, e a probabilidade sobe 10% por ano.
    expect(distribuicao(34)[-1]).toBeCloseTo(0.2, 1);
    expect(distribuicao(35)[-1]).toBeCloseTo(0.3, 1);
    expect(distribuicao(40)[-1]).toBeCloseTo(0.8, 1);
    expect(distribuicao(50)[-1]).toBeCloseTo(1);
    expect(Object.keys(distribuicao(36))).not.toContain('1');
  });
  it('o jovem com mais de 21 anos e mais de 78 passa ao plantel principal', () => {
    const ctx = contexto(11);
    const sala = salaComecada(2, {}, ctx);
    sala.calendario = [[]];
    const id = sala.equipas.e1.plantel[0];
    sala.jogadores[id] = { ...sala.jogadores[id], idade: 21, overall: 77, formacao: true, potencial: 90, minutos: 0 };
    envelhecer(sala, ctx);
    expect(jogador(sala, ctx, id).overall).toBe(79);
    expect(sala.jogadores[id].formacao).toBe(false);
  });
  it('um jogador vendido à banca volta ao baralho como está na base', () => {
    const ctx = contexto(12);
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const id = sala.equipas[eq].plantel[0];
    const base = ctx.base.get(id);
    sala.jogadores[id].overall = base.overall + 5;
    sala.jogadores[id].idade = base.idade + 3;
    transferir(sala, id, null);
    const j = jogador(sala, ctx, id);
    expect([j.overall, j.idade]).toEqual([base.overall, base.idade]);
  });
  it('a época acaba com campeão, prémios e equipa da época; a extensão e a evolução acontecem; a seguir vem o verão', () => {
    const ctx = contexto(13);
    const sala = salaComecada(4, { epocas: 3, bots: 1 }, ctx);
    ateFimEpoca(sala, ctx);
    const p = sala.premios.at(-1);
    expect(p.epoca).toBe(1);
    expect(sala.palmares[0].campeao).toBe(p.campeao);
    expect(p.marcadores.length).toBeGreaterThan(0);
    expect(p.marcadores[0].valor).toBeGreaterThanOrEqual(p.marcadores.at(-1).valor);
    expect(p.jogador?.nome).toBeTruthy();
    const linhas = p.equipa.map((x) => x.linha);
    expect(linhas.filter((l) => l === 'GR')).toHaveLength(1);
    expect(p.equipa.length).toBeLessThanOrEqual(11);
    expect(new Set(p.equipa.map((x) => x.equipa)).size).toBeGreaterThan(1);
    expect(sala.fimEpoca.mudancas.length).toBeGreaterThan(0);
    const estado = estadoPublico(sala, ctx);
    expect(estado.premios).toHaveLength(1);
    for (const id of ['t1', 't2', 't3', 't4']) ok(agir(sala, ctx, id, { t: 'continuar' }));
    expect(sala.fase).toBe('janela');
    expect(sala.epoca).toBe(2);
    expect(sala.janela.tipo).toBe('verao');
  });
  it('o ranking e o palmarés da última época não fazem envelhecer ninguém', () => {
    const ctx = contexto(14);
    const sala = salaComecada(2, { epocas: 3 }, ctx);
    let n = 0;
    while (!(sala.fase === 'fimEpoca' && sala.fimEpoca.ultima) && n++ < 80000) passo(sala, ctx);
    expect(sala.fimEpoca.mudancas).toEqual([]);
    ok(agir(sala, ctx, 't1', { t: 'avancar' }));
    expect(sala.fase).toBe('fim');
    expect(estadoPublico(sala, ctx).ranking).toHaveLength(2);
    expect(sala.premios).toHaveLength(3);
  });
});

describe('fim da partida', () => {
  /** Joga até à Taça da última época de uma partida de 3 épocas. */
  function ateTaca(sala, ctx) {
    let n = 0;
    while (sala.campeonato?.competicao !== 'taca' && n++ < 80000) passo(sala, ctx);
    expect(sala.campeonato.competicao).toBe('taca');
  }
  it('emparelha 1.º-2.º, 3.º-4.º e o último ímpar passa sem jogar', () => {
    expect(emparelhar(['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([['a', 'b'], ['c', 'd'], ['e', 'f']]);
    expect(emparelhar(['a', 'b', 'c'])).toEqual([['a', 'b']]);
    expect(nomeRonda(2)).toBe('final');
    expect(nomeRonda(4)).toBe('meias-finais');
    expect(nomeRonda(6)).toBe('quartos de final');
  });
  it('a Taça é só de treinadores, pela ordem da liga, com prémios pequenos, sem TV nem salários', () => {
    const ctx = contexto(40);
    const sala = salaComecada(4, { epocas: 3, bots: 2 }, ctx);
    ateTaca(sala, ctx);
    expect(sala.epoca).toBe(3);
    expect(sala.palmaresTaca ?? []).toHaveLength(0);
    const ordem = ordenarTabela(sala.tabela).map((l) => l.equipa).filter((id) => !sala.equipas[id].bot);
    expect(sala.campeonato.pares).toEqual([[ordem[0], ordem[1]], [ordem[2], ordem[3]]]);
    const antes = Object.fromEntries(Object.values(sala.equipas).map((e) => [e.id, e.dinheiro]));
    const tabela = JSON.stringify(sala.tabela);
    while (sala.campeonato.fase !== 'resultados') passo(sala, ctx);
    expect(JSON.stringify(sala.tabela)).toBe(tabela);
    // Todos os jogos têm vencedor, nem que seja nos penáltis.
    for (const j of sala.campeonato.jogos) {
      expect(j.lados.map((l) => l.equipa)).toContain(j.vencedor);
      if (j.lados[0].golos === j.lados[1].golos) expect(j.penaltis[0]).not.toBe(j.penaltis[1]);
      expect(sala.equipas[j.vencedor].dinheiro).toBeCloseTo(antes[j.vencedor] + CONFIG.taca.premioVitoria);
    }
    expect(sala.campeonato.ronda).toBe('meias-finais');
    expect(sala.campeonato.restantes).toHaveLength(2);
    // As estatísticas da Taça ficam à parte das da liga.
    const golos = sala.campeonato.jogos.flatMap((j) => j.lados).reduce((s, l) => s + l.golos, 0);
    const naTabela = Object.values(sala.estatisticasTaca).reduce((s, e) => s + e.golos, 0);
    expect(naTabela).toBe(golos);
    const liga = JSON.stringify(sala.estatisticas);
    while (sala.fase !== 'fimEpoca') {
      passo(sala, ctx);
      if (sala.fase === 'campeonato') expect(JSON.stringify(sala.estatisticas)).toBe(liga);
    }
    expect(sala.palmaresTaca).toHaveLength(1);
    const p = sala.premios.at(-1);
    expect(p.taca).toBe(sala.palmaresTaca[0].vencedor);
    expect(p.tacaMarcadores.length + p.tacaAssistentes.length).toBeGreaterThan(0);
  });
  it('com treinadores ímpares entra o bot mais bem classificado, para ficarem em número par', () => {
    const ctx = contexto(44);
    const sala = salaComecada(3, { epocas: 3, bots: 2 }, ctx);
    ateTaca(sala, ctx);
    const participantes = sala.campeonato.pares.flat();
    expect(participantes).toHaveLength(4);
    const bots = participantes.filter((id) => sala.equipas[id].bot);
    expect(bots).toHaveLength(1);
    const melhorBot = ordenarTabela(sala.tabela).map((l) => l.equipa).find((id) => sala.equipas[id].bot);
    expect(bots[0]).toBe(melhorBot);
  });
  it('os penáltis usam o dado de um penálti normal: 3–6 é golo', () => {
    const ctx = contexto(45);
    const sala = salaComecada(2, { epocas: 3 }, ctx);
    ateTaca(sala, ctx);
    const contas = { golos: 0, total: 0 };
    for (let i = 0; i < 400; i++) {
      const copia = structuredClone(sala);
      while (copia.campeonato.fase !== 'jogos') passo(copia, ctx);
      copia.campeonato.jogos[0].lados.forEach((l) => { l.golos = 0; l.marcadores = {}; l.assistencias = {}; });
      copia.campeonato.jogos[0].periodo = CONFIG.jogo.periodos;
      copia.campeonato.jogos[0].acabou = true;
      passo(copia, ctx);
      const [a, b] = copia.campeonato.jogos[0].penaltis;
      if (a + b <= 10) {
        contas.golos += a + b;
        contas.total += 10;
      }
    }
    expect(contas.golos / contas.total).toBeGreaterThan(0.55);
    expect(contas.golos / contas.total).toBeLessThan(0.72);
  });
  it('numa partida de 10 épocas há Taça nas 3 últimas, e nunca antes', () => {
    const ctx = contexto(41);
    const sala = salaComecada(4, { epocas: 10, bots: 1 }, ctx);
    jogarAteAoFim(sala, ctx);
    expect(sala.palmaresTaca.map((p) => p.epoca)).toEqual([8, 9, 10]);
    verificarInvariantes(sala);
  });
  it('ganha quem tiver mais títulos: a Taça vale metade de um campeonato', () => {
    const sala = { equipas: { a: { id: 'a' }, b: { id: 'b' }, c: { id: 'c' } }, pontosTotais: { a: 10, b: 20, c: 30 } };
    sala.palmares = [{ campeao: 'a' }];
    sala.palmaresTaca = [{ vencedor: 'b' }];
    expect(rankingFinal(sala).map((r) => r.equipa)).toEqual(['a', 'b', 'c']);
    expect(rankingFinal(sala)[1].titulos).toBe(CONFIG.taca.valor);
    sala.palmaresTaca = [{ vencedor: 'b' }, { vencedor: 'b' }];
    // Duas Taças igualam um campeonato: desempata pelos pontos.
    expect(rankingFinal(sala).map((r) => r.equipa)).toEqual(['b', 'a', 'c']);
  });
  it('a Força fica entre −1 e +1 só nas últimas épocas', () => {
    const ctx = contexto(42);
    const sala = salaComecada(2, { epocas: 10 }, ctx);
    sala.equipas.e1.onze = [{ posicao: 'ST', jogador: sala.equipas.e1.plantel[0] }];
    sala.equipas.e2.onze = [{ posicao: 'GK', jogador: sala.equipas.e2.plantel[0] }];
    sala.epoca = 7;
    const normal = criarJogo(sala, ctx, 'e1', 'e2', {});
    expect(normal.forcaMaxima).toBe(CONFIG.jogo.forca.maximo);
    sala.epoca = 8;
    expect(criarJogo(sala, ctx, 'e1', 'e2', {}).forcaMaxima).toBe(CONFIG.misterio.fimDePartida.forcaMaxima);
    const lado = (n) => ({ onze: [{ posicao: 'CM', overall: n }, { posicao: 'CB', overall: n }] });
    expect(forca(lado(90), lado(60), 1)).toBe(1);
    expect(forca(lado(60), lado(90), 1)).toBe(-1);
  });
  it('as cartas más doem o dobro nas últimas épocas', () => {
    const ctx = contexto(43);
    const sala = salaNoTabuleiro(2, { epocas: 10 }, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    const multa = CONFIG.misterio.cartas.findIndex((c) => c.titulo === 'Multa da federação');
    e.dinheiro = 100;
    sala.baralhoMisterio = [multa];
    tirarMisterio(sala, ctx, eq);
    expect(e.dinheiro).toBe(96);
    sala.epoca = 8;
    e.dinheiro = 100;
    // Sorteio fixo: sai uma carta má, e a única é a multa.
    sala.baralhoMisterio = [multa];
    tirarMisterio(sala, { ...ctx, aleatorio: () => 0.1 }, eq);
    expect(e.dinheiro).toBe(92);
  });
});

describe('bot automático', () => {
  it('na opção sem bots, com treinadores ímpares entra um bot e todos jogam em todas as jornadas', () => {
    const ctx = contexto(46);
    const sala = salaComecada(3, { epocas: 3, bots: 0 }, ctx);
    expect(Object.values(sala.equipas).filter((e) => e.bot)).toHaveLength(1);
    let n = 0;
    while (sala.fase !== 'campeonato' && n++ < 5000) passo(sala, ctx);
    for (const jornada of sala.calendario) expect(jornada.flat()).toHaveLength(4);
  });
  it('com treinadores pares e sem bots, não entra nenhum', () => {
    const sala = salaComecada(4, { epocas: 3, bots: 0 });
    expect(Object.values(sala.equipas).filter((e) => e.bot)).toHaveLength(0);
  });
  it('se o anfitrião escolher bots, não se acrescentam mais', () => {
    const sala = salaComecada(3, { epocas: 3, bots: 2 });
    expect(Object.values(sala.equipas).filter((e) => e.bot)).toHaveLength(2);
  });
});

describe('rendimento', () => {
  const media = (idade, ov, r) => {
    const ctx = contexto(50);
    let s = 0;
    for (let i = 0; i < 20000; i++) s += variacaoOverall(ctx.aleatorio, idade, ov, r);
    return s / 20000;
  };
  it('quem rende bem tem mais hipóteses de subir, quem rende mal menos, e os veteranos caem menos', () => {
    expect(media(25, 75, 1)).toBeGreaterThan(media(25, 75, 0) + 0.05);
    expect(media(25, 75, -1)).toBeLessThan(media(25, 75, 0) - 0.05);
    expect(media(36, 80, 1)).toBeGreaterThan(media(36, 80, 0));
    expect(media(36, 80, -1)).toBeLessThan(media(36, 80, 0));
  });
  it('médios e avançados medem-se pelos golos e assistências; defesas pelos golos sofridos; quem não jogou não conta', () => {
    const ctx = contexto(51);
    const sala = salaComecada(2, {}, ctx);
    const [a, b] = [sala.equipas.e1, sala.equipas.e2];
    sala.calendario = [[]];
    sala.tabela = { e1: { j: 2, gs: 0 }, e2: { j: 2, gs: 8 } };
    const pos = (e, p) => e.plantel.map((id) => jogador(sala, ctx, id)).find((j) => j.posicao === p);
    const st = pos(a, 'ST');
    const cb = pos(a, 'CB');
    const cbMau = pos(b, 'CB');
    const mc = pos(a, 'CM');
    sala.estatisticas = {
      [st.id]: { golos: 4, assistencias: 2, minutos: 180 },
      [cb.id]: { golos: 0, assistencias: 0, minutos: 180 },
      [cbMau.id]: { golos: 0, assistencias: 0, minutos: 180 },
      [mc.id]: { golos: 0, assistencias: 0, minutos: 180 },
    };
    expect(rendimentoEpoca(sala, ctx, st)).toBe(1);
    expect(rendimentoEpoca(sala, ctx, mc)).toBe(-1);
    expect(rendimentoEpoca(sala, ctx, cb)).toBeGreaterThan(0.5);
    expect(rendimentoEpoca(sala, ctx, cbMau)).toBeLessThan(-0.5);
    expect(rendimentoEpoca(sala, ctx, pos(a, 'GK'))).toBe(0);
  });
  it('os jogadores de 24 a 30 acima de 88 sobem devagar', () => {
    const ctx = contexto(52);
    let s = 0;
    for (let i = 0; i < 10000; i++) s += variacaoOverall(ctx.aleatorio, 27, 89);
    expect(s / 10000).toBeCloseTo(0.5, 1);
    expect(variacaoOverall(() => 0.99, 27, 88)).toBe(2);
  });
});

describe('bots', () => {
  it('ajustam o plantel para ficarem atrás dos treinadores, sem repetir jogadores', () => {
    const ctx = contexto(15);
    const sala = salaComecada(2, { bots: 2, nivelBots: 'equivalente' }, ctx);
    for (const e of Object.values(sala.equipas)) if (e.treinador) e.onze = [{ overall: 85, jogador: 1, posicao: 'CM' }];
    const bot = sala.equipas.bot1;
    const media = () => bot.plantel.reduce((s, id) => s + jogador(sala, ctx, id).overall, 0) / bot.plantel.length;
    const antes = media();
    for (let i = 0; i < 6; i++) ajustarBots(sala, ctx);
    expect(media()).toBeGreaterThan(antes);
    expect(media()).toBeLessThanOrEqual(85 - CONFIG.bots.distancia.equivalente + 2);
    expect(bot.plantel).toHaveLength(11);
    for (const e of Object.values(sala.equipas)) if (e.treinador) e.onze = null;
    verificarInvariantes(sala);
  });
});

describe('guardar e retomar', () => {
  it('uma partida de 10 épocas sobrevive a ser guardada e recarregada a toda a hora, e cabe no armazenamento', () => {
    const ctx = contexto(16);
    let sala = salaComecada(4, { epocas: 10, bots: 2 }, ctx);
    let n = 0;
    let maior = 0;
    while (sala.fase !== 'fim' && n++ < 100000) {
      passo(sala, ctx);
      // O Durable Object guarda a sala e pode acordar com ela a qualquer momento.
      if (n % 25 === 0) {
        const texto = JSON.stringify(sala);
        maior = Math.max(maior, texto.length);
        sala = JSON.parse(texto);
      }
    }
    expect(sala.fase).toBe('fim');
    expect(sala.palmares).toHaveLength(10);
    verificarInvariantes(sala);
    // O limite de uma chave no armazenamento do Durable Object é de 2 MB.
    expect(maior).toBeLessThan(1_500_000);
  });
  it('a vista pública e a privada geram-se em qualquer fase de uma partida inteira', () => {
    const ctx = contexto(17);
    const sala = salaComecada(2, { epocas: 3, bots: 1 }, ctx);
    let n = 0;
    while (sala.fase !== 'fim' && n++ < 50000) {
      passo(sala, ctx);
      if (n % 7 === 0) {
        expect(() => JSON.stringify(estadoPublico(sala, ctx))).not.toThrow();
        expect(privado(sala, ctx, 't1').equipa).toBe('e1');
      }
    }
    expect(sala.fase).toBe('fim');
  });
  it('uma partida inteira acaba sem encravar, também com 8 treinadores', () => {
    const ctx = contexto(18);
    const sala = salaComecada(8, { epocas: 3, bots: 2 }, ctx);
    const passos = jogarAteAoFim(sala, ctx);
    expect(sala.fase).toBe('fim');
    expect(passos).toBeLessThan(200000);
    verificarInvariantes(sala);
  });
  it('quem entra a meio joga na janela seguinte, com contratos', () => {
    const ctx = contexto(19);
    const sala = salaComecada(2, { epocas: 3, bots: 1 }, ctx);
    const { jogador: t } = entrar(sala, { token: 'token-teste-9', nome: 'Atrasado' }, ctx);
    let n = 0;
    while (!(sala.fase === 'janela' && sala.janela.tipo === 'inverno') && n++ < 20000) passo(sala, ctx);
    // No inverno fica com a equipa do bot, com contratos e orçamento.
    const e = sala.equipas[t.equipa];
    expect(t.equipa).toBe('bot1');
    expect(e.bot).toBeUndefined();
    expect(e.marca).toBeTruthy();
    expect(e.patrocinios).toHaveLength(2);
    expect(e.dinheiro).toBeGreaterThanOrEqual(CONFIG.inicio.orcamento);
    jogarAteAoFim(sala, ctx);
    expect(sala.fase).toBe('fim');
    verificarInvariantes(sala);
  });
});

describe('reformas', () => {
  it('10% aos 34 anos, mais 10% por ano, e nunca antes dos 34', () => {
    const rngA = (v) => () => v;
    expect(reformaSe(rngA(0), 33)).toBe(false);
    expect(reformaSe(rngA(0.09), 34)).toBe(true);
    expect(reformaSe(rngA(0.11), 34)).toBe(false);
    expect(reformaSe(rngA(0.29), 36)).toBe(true);
    expect(reformaSe(rngA(0.31), 36)).toBe(false);
    expect(reformaSe(rngA(0.99), 43)).toBe(true);
  });

  it('quem se reforma sai do plantel, aparece nas mudanças e não volta ao baralho; os bots ficam com o plantel cheio', () => {
    const ctx = contexto();
    const sala = salaComecada(2, { bots: 1 }, ctx);
    sala.calendario = [[['e1', 'e2']]];
    const bot = Object.values(sala.equipas).find((e) => e.bot);
    const [velho, velhoBot] = [sala.equipas.e1.plantel[0], bot.plantel[0]];
    const tamanhoBot = bot.plantel.length;
    sala.jogadores[velho].idade = 50;
    sala.jogadores[velhoBot].idade = 50;
    const mudancas = envelhecer(sala, ctx);
    expect(sala.equipas.e1.plantel).not.toContain(velho);
    expect(sala.jogadores[velho].reformado).toBe(true);
    expect(mudancas.find((m) => m.jogador === velho).reformado).toBe(51);
    expect(livre(sala, velho)).toBe(false);
    expect(bot.plantel).not.toContain(velhoBot);
    expect(bot.plantel).toHaveLength(tamanhoBot);
    verificarInvariantes(sala);
  });
});

describe('partida longa com reformas', () => {
  it('10 épocas até ao fim, com os plantéis a envelhecer e reformas pelo caminho', () => {
    const ctx = contexto(11);
    const sala = salaComecada(3, { epocas: 10, bots: 2 }, ctx);
    jogarAteAoFim(sala, ctx);
    expect(sala.fase).toBe('fim');
    verificarInvariantes(sala);
    expect(Object.values(sala.jogadores).filter((d) => d.reformado).length).toBeGreaterThan(0);
    for (const e of Object.values(sala.equipas)) for (const id of e.plantel) expect(sala.jogadores[id].reformado).toBeFalsy();
  });
});

describe('quem é da formação', () => {
  it('com 78 de overall já não é da formação: passa ao plantel principal, seja qual for a idade', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    sala.calendario = [[['e1', 'e2']]];
    const [a, b] = sala.equipas.e1.plantel;
    Object.assign(sala.jogadores[a], { formacao: true, overall: 70, idade: 19, potencial: 95, minutos: 0 });
    Object.assign(sala.jogadores[b], { formacao: true, overall: 76, idade: 19, potencial: 78, minutos: 99999 });
    envelhecer(sala, ctx);
    expect(sala.jogadores[a].formacao).toBe(true);
    expect(sala.jogadores[b].overall).toBe(78);
    expect(sala.jogadores[b].formacao).toBe(false);
  });

  it('um jovem só entra na formação com 77 ou menos', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    const jovem = [...ctx.base.values()].find((j) => j.overall >= 78 );
    const miudo = [...ctx.base.values()].find((j) => j.overall <= 77);
    for (const j of [jovem, miudo]) sala.jogadores[j.id] = { id: j.id, overall: j.overall, idade: 20 };
    prepararJovem(sala, ctx, jovem.id);
    prepararJovem(sala, ctx, miudo.id);
    expect(sala.jogadores[jovem.id].formacao).toBeFalsy();
    expect(sala.jogadores[miudo.id].formacao).toBe(true);
  });
});
