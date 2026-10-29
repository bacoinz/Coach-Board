import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { contexto, salaLobby, salaComecada, verificarInvariantes, ok } from './apoio.js';
import { comecar, agir } from '../src/motor/partida.js';
import { entrar, marcarPronto, configurar, editarEquipa, sair } from '../src/motor/sala-logica.js';
import { melhorOnze, overallNaPosicao } from '../src/motor/formacao.js';
import { jogador } from '../src/motor/estado.js';

describe('lobby', () => {
  it('o primeiro a entrar é o anfitrião e cada treinador tem equipa', () => {
    const sala = salaLobby(3);
    expect(sala.anfitriao).toBe('t1');
    expect(Object.keys(sala.equipas)).toHaveLength(3);
    expect(sala.treinadores.map((t) => t.cor).every((c, i, a) => a.indexOf(c) === i)).toBe(true);
  });
  it('voltar a entrar com o mesmo token não duplica', () => {
    const ctx = contexto();
    const sala = salaLobby(2, {}, ctx);
    entrar(sala, { token: 'token-teste-1', nome: 'Outro' }, ctx);
    expect(sala.treinadores).toHaveLength(2);
    expect(sala.treinadores[0].nome).toBe('Outro');
  });
  it('só o anfitrião configura; valores fora da lista falham', () => {
    const sala = salaLobby(2);
    expect(configurar(sala, 't2', { epocas: 5 }).erro).toBeTruthy();
    expect(configurar(sala, 't1', { epocas: 4 }).erro).toBeTruthy();
    ok(configurar(sala, 't1', { epocas: 10, bots: 2, nivelBots: 'equivalente' }));
    expect(sala.config).toEqual({ epocas: 10, bots: 2, nivelBots: 'equivalente' });
  });
  it('não começa sem todos prontos', () => {
    const ctx = contexto();
    const sala = salaLobby(2, {}, ctx);
    marcarPronto(sala, 't1', true);
    expect(comecar(sala, ctx, 't1').erro).toMatch(/Pronto/);
  });
  it('edita a equipa e recusa nomes repetidos e cores inválidas', () => {
    const sala = salaLobby(2);
    ok(editarEquipa(sala, 't1', { nome: 'Sporting da Ribeira', kit: { padrao: 'faixa', principal: '#112233' } }));
    expect(editarEquipa(sala, 't2', { nome: 'sporting da ribeira' }).erro).toBeTruthy();
    expect(editarEquipa(sala, 't2', { kit: { principal: 'vermelho' } }).erro).toBeTruthy();
  });
  it('se o anfitrião sai, passa a outro', () => {
    const ctx = contexto();
    const sala = salaLobby(3, {}, ctx);
    sair(sala, 't1', ctx);
    expect(sala.anfitriao).toBe('t2');
  });
});

describe('início da partida', () => {
  it('cada treinador recebe 11 jogadores com os overalls da configuração, nas posições certas', () => {
    const ctx = contexto();
    const sala = salaComecada(4, {}, ctx);
    for (const e of Object.values(sala.equipas)) {
      expect(e.plantel).toHaveLength(11);
      const js = e.plantel.map((id) => jogador(sala, ctx, id));
      expect(js.map((j) => j.overall).sort()).toEqual([...CONFIG.inicio.overalls].sort());
      expect(js.map((j) => j.posicao).sort()).toEqual([...CONFIG.inicio.posicoes].sort());
      expect(js.every((j) => j.idade >= CONFIG.inicio.idade[0] && j.idade <= CONFIG.inicio.idade[1])).toBe(true);
      const media = js.reduce((s, j) => s + j.overall, 0) / 11;
      expect(media).toBeCloseTo(75, 0);
    }
    verificarInvariantes(sala);
  });
  it('orçamento igual para todos, com os prémios iniciais, e contratos sem repetir', () => {
    const sala = salaComecada(4);
    const equipas = Object.values(sala.equipas);
    const esperado = CONFIG.inicio.orcamento + CONFIG.inicio.premioMarcaInicial + 2 * CONFIG.inicio.premioPatrocinioInicial;
    expect(equipas.every((e) => e.dinheiro === esperado)).toBe(true);
    const contratos = equipas.flatMap((e) => [e.marca, ...e.patrocinios]);
    expect(new Set(contratos).size).toBe(contratos.length);
  });
  it('os bots inferiores têm overall mais baixo e não jogam a janela', () => {
    const ctx = contexto();
    const sala = salaComecada(2, { bots: 2, nivelBots: 'inferior' }, ctx);
    const bots = Object.values(sala.equipas).filter((e) => e.bot);
    expect(bots).toHaveLength(2);
    for (const b of bots) {
      const media = b.plantel.reduce((s, id) => s + jogador(sala, ctx, id).overall, 0) / b.plantel.length;
      expect(media).toBeLessThan(75 - CONFIG.inicio.botsInferiores + 1);
    }
    expect(sala.fase).toBe('janela');
    expect(sala.janela.fase).toBe('formacao');
  });
  it('quem entra a meio fica a ver e não pode agir', () => {
    const ctx = contexto();
    const sala = salaComecada(2, {}, ctx);
    const { jogador: t } = entrar(sala, { token: 'token-teste-9', nome: 'Atrasado' }, ctx);
    expect(sala.equipas[t.equipa].espera).toBe(true);
    expect(agir(sala, ctx, t.id, { t: 'formacao', formacao: '4-4-2' }).erro).toMatch(/ver/);
  });
});

describe('formações', () => {
  const j = (id, posicao, overall, alternativas = []) => ({ id, posicao, overall, alternativas });
  it('penaliza as posições alternativas e recusa as outras', () => {
    expect(overallNaPosicao(j(1, 'CM', 80, ['CDM']), 'CM')).toBe(80);
    expect(overallNaPosicao(j(1, 'CM', 80, ['CDM']), 'CDM')).toBe(80 - CONFIG.posicoes.penalizacaoAlternativa);
    expect(overallNaPosicao(j(1, 'CM', 80, ['CDM']), 'ST')).toBeNull();
  });
  it('o melhor onze põe cada um no sítio certo e diz quem sobra', () => {
    const jogadores = [
      j(1, 'GK', 80), j(2, 'LB', 75), j(3, 'CB', 75), j(4, 'CB', 75), j(5, 'RB', 75),
      j(6, 'LM', 75), j(7, 'CM', 75), j(8, 'CM', 75, ['CDM']), j(9, 'RM', 75), j(10, 'ST', 75), j(11, 'ST', 75), j(12, 'GK', 60),
    ];
    const { onze, sobram } = melhorOnze(jogadores, '4-4-2');
    expect(onze.every((l) => l.jogador != null)).toBe(true);
    expect(onze[0].jogador).toBe(1);
    expect(sobram).toEqual([12]);
  });
  it('usa as alternativas quando é preciso e deixa lugares vazios quando não há ninguém', () => {
    const { onze } = melhorOnze([j(1, 'GK', 80), j(2, 'CM', 78, ['CDM'])], '4-2-3-1');
    const cdm = onze.find((l) => l.jogador === 2);
    expect(cdm.posicao).toBe('CDM');
    expect(cdm.overall).toBe(78 - CONFIG.posicoes.penalizacaoAlternativa);
    expect(onze.filter((l) => l.jogador == null)).toHaveLength(9);
  });
});
