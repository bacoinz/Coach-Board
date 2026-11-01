import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { contexto, salaNoTabuleiro, treinadorDe, vezDe, ok, verificarInvariantes } from './apoio.js';
import { agir } from '../src/motor/partida.js';
import { jogador } from '../src/motor/estado.js';
import { resolverCasa, totalCasas, precoCarta, valorSAD } from '../src/motor/tabuleiro.js';
import { tirarMisterio, investigar, probabilidadeCondenacao, frase } from '../src/motor/misterio.js';
import { abrirJanela } from '../src/motor/janela.js';

const CARTAS = CONFIG.misterio.cartas;

/** Põe uma carta específica no topo do baralho e tira-a. */
function tirar(sala, ctx, eq, titulo) {
  const i = CARTAS.findIndex((c) => c.titulo === titulo);
  expect(i).toBeGreaterThanOrEqual(0);
  sala.baralhoMisterio = [i];
  return tirarMisterio(sala, ctx, eq);
}

describe('tabuleiro', () => {
  it('tem a disposição pedida: 36 casas', () => {
    const casas = CONFIG.tabuleiro.casas;
    const conta = (t) => casas.filter((c) => c === t).length;
    expect(casas).toHaveLength(36);
    expect([0, 9, 18, 27].map((i) => casas[i])).toEqual(['inicio', 'misterio', 'sad', 'misterio']);
    expect([4, 13, 22, 31].map((i) => casas[i])).toEqual(['jovens', 'investigacao', 'jovens', 'jovens']);
    expect({ m: conta('mercado'), p: conta('patrocinio'), r: conta('rede'), e: conta('empresario'), d: conta('medico') })
      .toEqual({ m: 13, p: 4, r: 4, e: 4, d: 3 });
  });
  it('dá-se uma volta em cada janela, com um dado no verão e dois no inverno', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    expect(totalCasas(sala.janela)).toBe(36);
    const eq = vezDe(sala);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'lancar' }));
    expect(sala.janela.ultimoLance.dados).toHaveLength(1);
    const inverno = salaNoTabuleiro(2, {}, ctx);
    inverno.janela.tipo = 'inverno';
    expect(totalCasas(inverno.janela)).toBe(36);
    // No inverno, o 1.º lançamento é com um dado e os seguintes com dois.
    const quem = vezDe(inverno);
    ok(agir(inverno, ctx, treinadorDe(inverno, quem), { t: 'lancar' }));
    expect(inverno.janela.ultimoLance.dados).toHaveLength(1);
    inverno.janela.lancou = false;
    inverno.janela.pendente = null;
    inverno.janela.leilao = null;
    ok(agir(inverno, ctx, treinadorDe(inverno, quem), { t: 'lancar' }));
    expect(inverno.janela.ultimoLance.dados).toHaveLength(2);
  });
  it('a SAD paga o valor inteiro a quem pára e metade a quem passa; o Início não paga', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(3, {}, ctx);
    sala.epoca = 3;
    const [a, b, c] = sala.janela.ordem.map((id) => sala.equipas[id]);
    const correr = (e, ate, n) => {
      sala.log = [];
      sala.janela.vez = sala.janela.ordem.indexOf(e.id);
      sala.janela.lancou = false;
      sala.janela.pendente = null;
      sala.janela.andadas[e.id] = ate;
      const dadoFixo = () => (n - 1) / 6 + 0.01;
      ok(agir(sala, { ...ctx, aleatorio: dadoFixo }, e.treinador, { t: 'lancar' }));
      return sala.log.find((l) => l.texto.includes('SAD'))?.texto ?? null;
    };
    expect(correr(a, 17, 1)).toContain(`recebe 60,0 M€`);
    expect(correr(b, 17, 3)).toContain(`recebe 30,0 M€`);
    expect(correr(c, 35, 1)).toBeNull();
    // No inverno vale metade (a meio da volta lançam-se dois dados).
    sala.janela.tipo = 'inverno';
    expect(correr(a, 16, 1)).toContain('recebe 30,0 M€');
    expect(correr(b, 17, 1)).toContain('recebe 15,0 M€');
  });
});

describe('baralho Mistério', () => {
  it('tem metade de cartas boas e metade más', () => {
    expect(CARTAS.length).toBeGreaterThanOrEqual(40);
    expect(CARTAS.filter((c) => c.bom).length).toBe(CARTAS.filter((c) => !c.bom).length);
  });
  it('todas as cartas se aplicam sem rebentar e sem deixar o orçamento negativo', () => {
    for (let dinheiro = 0; dinheiro <= 50; dinheiro += 50) {
      const ctx = contexto(5);
      const sala = salaNoTabuleiro(2, {}, ctx);
      const eq = vezDe(sala);
      for (const c of CARTAS) {
        sala.equipas[eq].dinheiro = dinheiro;
        sala.janela.lancou = true;
        tirar(sala, ctx, eq, c.titulo);
        expect(sala.equipas[eq].dinheiro).toBeGreaterThanOrEqual(0);
        if (sala.janela.pendente?.jogador) ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'passar' }));
        for (const id of sala.janela.leilao?.participantes ?? []) ok(agir(sala, ctx, treinadorDe(sala, id), { t: 'desistir' }));
        verificarInvariantes(sala);
      }
    }
  });
  it('nas últimas épocas saem mais cartas más; antes é meio por meio', () => {
    const conta = (epocas, epoca) => {
      const ctx = contexto(31);
      const sala = salaNoTabuleiro(2, { epocas }, ctx);
      sala.epoca = epoca;
      const eq = vezDe(sala);
      let mas = 0;
      for (let i = 0; i < 1000; i++) {
        tirarMisterio(sala, ctx, eq);
        if (!sala.janela.ultimaCarta.bom) mas++;
        sala.janela.pendente = null;
        sala.janela.leilao = null;
      }
      return mas / 1000;
    };
    expect(conta(10, 7)).toBeCloseTo(0.5, 1);
    expect(conta(10, 8)).toBeCloseTo(CONFIG.misterio.fimDePartida.probabilidadeMa, 1);
    expect(conta(10, 10)).toBeCloseTo(CONFIG.misterio.fimDePartida.probabilidadeMa, 1);
    expect(conta(3, 2)).toBeCloseTo(0.5, 1);
    expect(conta(3, 3)).toBeCloseTo(CONFIG.misterio.fimDePartida.probabilidadeMa, 1);
  });
  it('uma carta boa conta como ajuda, com o seu peso; uma má não', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    tirar(sala, ctx, eq, 'Multa da federação');
    expect(sala.equipas[eq].ajudas ?? 0).toBe(0);
    tirar(sala, ctx, eq, 'Herança de um sócio');
    expect(sala.equipas[eq].ajudas).toBeCloseTo(1 / 3);
    tirar(sala, ctx, eq, 'Clube comprado');
    expect(sala.equipas[eq].ajudas).toBeCloseTo(4 / 3);
  });
  it('o clube comprado só recebe na próxima janela; a penhora só desconta aí', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    const antes = e.dinheiro;
    tirar(sala, ctx, eq, 'Clube comprado');
    expect(e.dinheiro).toBe(antes);
    abrirJanela(sala, ctx, 'inverno');
    expect(e.dinheiro).toBe(antes + 15);
    tirar2(sala, ctx, eq);
    abrirJanela(sala, ctx, 'verao');
    expect(e.dinheiro).toBe(antes + 15 - 8);
    function tirar2(s, c, q) {
      s.janela.ronda = 1;
      tirar(s, c, q, 'Penhora das Finanças');
    }
  });
  it('voo fretado lança outra vez; papelada em atraso salta a vez seguinte', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(3, {}, ctx);
    const [a, b, c] = sala.janela.ordem;
    sala.janela.lancou = true;
    sala.baralhoMisterio = [CARTAS.findIndex((x) => x.titulo === 'Voo fretado')];
    resolverCasa(sala, ctx, a, 'misterio');
    expect(sala.janela.lancou).toBe(false);
    tirar(sala, ctx, b, 'Papelada em atraso');
    sala.janela.lancou = true;
    ok(agir(sala, ctx, treinadorDe(sala, a), { t: 'terminar_vez' }));
    expect(vezDe(sala)).toBe(c);
    expect(sala.equipas[b].saltarVez).toBeUndefined();
  });
  it('telefonema importante avança até ao próximo Mercado e tira a carta', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    sala.janela.andadas[eq] = 4;
    sala.janela.posicao[eq] = 4;
    sala.baralhoMisterio = [CARTAS.findIndex((x) => x.titulo === 'Telefonema importante')];
    resolverCasa(sala, ctx, eq, 'misterio');
    expect(sala.janela.posicao[eq]).toBe(6);
    expect(sala.janela.pendente?.tipo).toBe('mercado');
  });
  it('amigo do presidente: 30% de desconto só na próxima compra', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    e.dinheiro = 500;
    tirar(sala, ctx, eq, 'Amigo do presidente');
    sala.janela.lancou = true;
    resolverCasa(sala, ctx, eq, 'mercado');
    const p = sala.janela.pendente;
    expect(p.preco).toBeCloseTo(jogador(sala, ctx, p.jogador).valor * CONFIG.cartas.precoCasa * 0.7, 0);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'comprar' }));
    expect(e.descontoProxima).toBeUndefined();
    expect(precoCarta(sala, ctx, eq, e.plantel[0])).toBeCloseTo(jogador(sala, ctx, e.plantel[0]).valor * CONFIG.cartas.precoCasa, 1);
  });
  it('os efeitos do próximo jogo ficam guardados para o motor dos jogos', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    tirar(sala, ctx, eq, 'Super-empréstimo');
    tirar(sala, ctx, eq, 'Lesão no treino');
    const [craque, lesao] = sala.equipas[eq].efeitos;
    expect(craque.efeito).toBe('craque');
    expect(sala.equipas[eq].plantel).toContain(lesao.jogador);
  });
  it('o craque que quer sair fica com a cláusula em 1× até à próxima janela', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    tirar(sala, ctx, eq, 'O craque quer sair');
    const melhor = [...sala.equipas[eq].plantel].map((id) => jogador(sala, ctx, id)).sort((a, b) => b.overall - a.overall)[0];
    expect(melhor.clausula).toBeCloseTo(melhor.valor, 1);
    abrirJanela(sala, ctx, 'inverno');
    const depois = jogador(sala, ctx, melhor.id);
    expect(depois.clausula).toBeCloseTo(depois.valor * CONFIG.valores.clausula, 0);
  });
});

describe('regras afinadas depois de jogar', () => {
  it('a SAD cresce com a fase do Mercado, por isso depende da duração da partida', () => {
    const valores = (epocas) => Array.from({ length: epocas }, (_, i) => valorSAD({ config: { epocas }, epoca: i + 1 }));
    expect(valores(3)).toEqual([3, 18, 60]);
    expect(valores(5)).toEqual([3, 12, 18, 40, 60]);
    expect(valores(10)).toEqual([3, 6, 6, 12, 18, 18, 27, 40, 40, 60]);
  });
  it('usar o Empresário soma pontos de ajuda: inflacionar, exclusividade e anular', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const dono = sala.janela.ordem[1];
    const [e, d] = [sala.equipas[eq], sala.equipas[dono]];
    e.dinheiro = 500;
    e.cartas.empresario = 2;
    d.cartas.empresario = 1;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'inflacionar', jogador: e.plantel[0] }));
    expect(e.ajudas).toBe(1);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'exclusividade', jogador: d.plantel[0] }));
    expect(e.ajudas).toBe(2);
    ok(agir(sala, ctx, treinadorDe(sala, dono), { t: 'responder_empresario', anular: true }));
    expect(d.ajudas).toBe(1);
  });
  it('as sanções são 40% limite, 40% multa e 20% as duas', () => {
    expect(CONFIG.investigacao.sancoes).toEqual({ limite: 0.4, multa: 0.4, ambas: 0.2 });
  });
  it('a digressão pela Ásia é só no verão; no inverno são amigáveis nos EUA, com o mesmo efeito', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const antes = sala.equipas[eq].dinheiro;
    tirar(sala, ctx, eq, 'Digressão pela Ásia');
    expect(sala.janela.ultimaCarta.titulo).toBe('Digressão pela Ásia');
    sala.janela.tipo = 'inverno';
    tirar(sala, ctx, eq, 'Digressão pela Ásia');
    expect(sala.janela.ultimaCarta.titulo).toBe('Amigáveis nos EUA');
    expect(sala.equipas[eq].dinheiro).toBe(antes + 8);
  });
  it('o castigo interno diz quem foi e porquê, com uma razão da lista', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    tirar(sala, ctx, eq, 'Castigo interno');
    const { texto } = sala.janela.ultimaCarta;
    const { jogador: id } = sala.equipas[eq].efeitos.at(-1);
    expect(texto.startsWith(jogador(sala, ctx, id).curto)).toBe(true);
    const { razoesCastigo, razoesCastigoAdultos } = CONFIG.misterio;
    expect([...razoesCastigo, ...razoesCastigoAdultos].some((r) => texto.includes(r))).toBe(true);
  });
  it('a lesão no treino diz o que aconteceu, e as comidas ficam preenchidas', () => {
    const ctx = contexto();
    const adulto = { curto: 'Zé', idade: 25 };
    const vistas = new Set();
    for (let i = 0; i < 3000; i++) vistas.add(frase(ctx.aleatorio, adulto, 'lesao'));
    expect([...vistas].some((t) => t.includes('caganeira'))).toBe(true);
    expect([...vistas].some((t) => t.includes('{comida}'))).toBe(false);
    expect([...vistas].some((t) => t.includes('colhão'))).toBe(true);
  });
  it('o humor adulto nunca sai a jogadores com menos de 18 anos', () => {
    const ctx = contexto();
    const { razoesCastigoAdultos, lesoesAdultas } = CONFIG.misterio;
    const menor = { curto: 'Zé', idade: 17 };
    for (let i = 0; i < 3000; i++) {
      const c = frase(ctx.aleatorio, menor, 'castigo');
      const l = frase(ctx.aleatorio, menor, 'lesao');
      expect(razoesCastigoAdultos.some((r) => c.includes(r))).toBe(false);
      expect(lesoesAdultas.some((r) => l.includes(r))).toBe(false);
    }
  });
});

describe('Investigação', () => {
  it('sem ajudas nem títulos, a probabilidade é muito pequena; sobe pouco com títulos e muito com ajudas', () => {
    const sala = salaNoTabuleiro(2);
    const eq = vezDe(sala);
    const p0 = probabilidadeCondenacao(sala, eq);
    expect(p0).toBe(CONFIG.investigacao.base);
    sala.palmares = [{ epoca: 1, campeao: eq }];
    const p1 = probabilidadeCondenacao(sala, eq);
    expect(p1 - p0).toBeCloseTo(CONFIG.investigacao.porCampeonato);
    sala.equipas[eq].ajudas = 3;
    expect(probabilidadeCondenacao(sala, eq) - p1).toBeCloseTo(3 * CONFIG.investigacao.porAjuda);
    sala.equipas[eq].ajudas = 100;
    expect(probabilidadeCondenacao(sala, eq)).toBe(CONFIG.investigacao.maximo);
  });
  it('quem não teve ajudas raramente é condenado; quem teve muitas é quase sempre', () => {
    const contar = (ajudas) => {
      let condenacoes = 0;
      for (let s = 1; s <= 300; s++) {
        const ctx = contexto(s);
        const sala = salaNoTabuleiro(2, {}, contexto(1));
        const eq = vezDe(sala);
        sala.equipas[eq].ajudas = ajudas;
        investigar(sala, ctx, eq);
        if (!sala.janela.ultimaCarta.bom) condenacoes++;
      }
      return condenacoes / 300;
    };
    expect(contar(0)).toBeLessThan(0.1);
    expect(contar(15)).toBeGreaterThan(0.7);
  });
  it('a condenação zera as ajudas e aplica a sanção', () => {
    const ctx = contexto(9);
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    e.ajudas = 100;
    const antes = e.dinheiro;
    investigar(sala, ctx, eq);
    expect(sala.janela.ultimaCarta.bom).toBe(false);
    expect(e.ajudas).toBe(0);
    expect(e.limiteContratacoes != null || e.dinheiro < antes).toBe(true);
  });
  it('o limite de contratações bloqueia compras, propostas e leilões, e acaba na janela seguinte', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(3, {}, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    e.dinheiro = 500;
    e.limiteContratacoes = 1;
    const t = treinadorDe(sala, eq);
    resolverCasa(sala, ctx, eq, 'mercado');
    ok(agir(sala, ctx, t, { t: 'comprar' }));
    expect(e.limiteContratacoes).toBe(0);
    resolverCasa(sala, ctx, eq, 'mercado');
    expect(agir(sala, ctx, t, { t: 'comprar' }).erro).toMatch(/sancionado/);
    ok(agir(sala, ctx, t, { t: 'passar' }));
    expect(sala.janela.leilao.participantes).not.toContain(eq);
    for (const id of sala.janela.leilao.participantes) ok(agir(sala, ctx, treinadorDe(sala, id), { t: 'desistir' }));
    const alvo = sala.equipas[sala.janela.ordem[1]].plantel[0];
    expect(agir(sala, ctx, t, { t: 'propor', jogador: alvo, valor: 50 }).erro).toMatch(/sancionado/);
    abrirJanela(sala, ctx, 'inverno');
    expect(e.limiteContratacoes).toBeUndefined();
  });
});
