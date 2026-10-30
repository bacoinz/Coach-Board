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
  it('tem a disposição pedida: 40 casas e uma Mistério no centro de cada lado', () => {
    const casas = CONFIG.tabuleiro.casas;
    const conta = (t) => casas.filter((c) => c === t).length;
    expect(casas).toHaveLength(40);
    expect([5, 15, 25, 35].map((i) => casas[i])).toEqual(['misterio', 'misterio', 'misterio', 'misterio']);
    expect([0, 10, 20, 30].map((i) => casas[i])).toEqual(['inicio', 'jovens', 'investigacao', 'jovens']);
    expect({ m: conta('mercado'), p: conta('patrocinio'), r: conta('rede'), e: conta('empresario'), d: conta('medico'), j: conta('jovens') })
      .toEqual({ m: 13, p: 5, r: 5, e: 6, d: 3, j: 2 });
  });
  it('a SAD paga ao passar pelo Início a meio do verão, e não no fim das voltas', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    const e = sala.equipas[eq];
    sala.janela.andadas[eq] = 39;
    const antes = e.dinheiro;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'lancar' }));
    expect(e.dinheiro).toBeGreaterThanOrEqual(antes + valorSAD(1) - 15);
    expect(sala.log.some((l) => l.texto.includes('SAD'))).toBe(true);

    const outra = sala.equipas[sala.janela.ordem[1]];
    sala.log = [];
    sala.janela.andadas[outra.id] = totalCasas(sala.janela) - 1;
    sala.janela.pendente = null;
    sala.janela.lancou = true;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'terminar_vez' }));
    ok(agir(sala, ctx, treinadorDe(sala, outra.id), { t: 'lancar' }));
    expect(sala.log.some((l) => l.texto.includes('SAD'))).toBe(false);
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
  it('uma carta boa conta como ajuda, com o seu peso; uma má não', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    tirar(sala, ctx, eq, 'Multa da federação');
    expect(sala.equipas[eq].ajudas ?? 0).toBe(0);
    tirar(sala, ctx, eq, 'Herança de um sócio');
    expect(sala.equipas[eq].ajudas).toBe(1);
    tirar(sala, ctx, eq, 'Clube comprado');
    expect(sala.equipas[eq].ajudas).toBe(4);
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
    sala.janela.andadas[eq] = 5;
    sala.janela.posicao[eq] = 5;
    sala.baralhoMisterio = [CARTAS.findIndex((x) => x.titulo === 'Telefonema importante')];
    resolverCasa(sala, ctx, eq, 'misterio');
    expect(sala.janela.posicao[eq]).toBe(7);
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
  it('no tabuleiro lança-se um só dado', () => {
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'lancar' }));
    expect(sala.janela.ultimoLance.dados).toHaveLength(1);
    expect(sala.janela.andadas[eq]).toBe(sala.janela.ultimoLance.dados[0]);
  });
  it('a SAD duplica a cada época', () => {
    expect([1, 2, 3, 4].map(valorSAD)).toEqual([3, 6, 12, 24]);
    const ctx = contexto();
    const sala = salaNoTabuleiro(2, {}, ctx);
    const eq = vezDe(sala);
    sala.epoca = 3;
    sala.janela.andadas[eq] = 39;
    ok(agir(sala, ctx, treinadorDe(sala, eq), { t: 'lancar' }));
    expect(sala.log.some((l) => l.texto.includes('recebe 12,0 M€'))).toBe(true);
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
    expect(contar(10)).toBeGreaterThan(0.7);
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
