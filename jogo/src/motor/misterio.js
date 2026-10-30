// Casas Mistério e Investigação. As cartas e os valores estão em config.js.
// Os efeitos para o próximo jogo ficam em equipa.efeitos e são consumidos pelo motor dos jogos (passo 4).
import { CONFIG } from '../config.js';
import { baralhar, comPeso, escolher } from './aleatorio.js';
import { jogador, mudarJogador, transferir, pagar, receber, registar, M } from './estado.js';
import { livresQue, tirarRede } from './cartas.js';
import { precoBase } from './valores.js';

const I = CONFIG.investigacao;

/** Tira dinheiro sem deixar o orçamento negativo (uma carta má nunca bloqueia o clube). */
export function descontar(sala, equipaId, valor) {
  const tirado = Math.min(sala.equipas[equipaId].dinheiro, valor);
  pagar(sala, equipaId, tirado);
  return tirado;
}

/** Mexe no dinheiro em qualquer sentido e diz o que aconteceu. */
function mexerDinheiro(sala, equipaId, valor) {
  if (valor >= 0) receber(sala, equipaId, valor);
  else valor = -descontar(sala, equipaId, -valor);
  return valor > 0 ? `+${M(valor)}` : `−${M(-valor)}`;
}

const emCampo = (sala, ctx, e) => e.plantel.map((id) => jogador(sala, ctx, id)).filter((j) => !j.emprestado);
const porOverall = (lista) => [...lista].sort((a, b) => b.overall - a.overall);

const MAIORIDADE = 18;

/**
 * "Nome + razão." de um castigo ou de uma lesão. O humor adulto não sai a menores: a base tem jogadores reais de
 * 16 e 17 anos.
 */
export function frase(rng, j, tipo) {
  const { razoesCastigo, razoesCastigoAdultos, lesoes, lesoesAdultas, comidas } = CONFIG.misterio;
  const [todas, adultas] = tipo === 'castigo' ? [razoesCastigo, razoesCastigoAdultos] : [lesoes, lesoesAdultas];
  const razao = escolher(rng, j.idade >= MAIORIDADE ? [...todas, ...adultas] : todas).replace('{comida}', () => escolher(rng, comidas));
  return `${j.curto} ${razao}.`;
}

/** Soma pontos de ajuda, que contam para a Investigação. */
export function somarAjuda(e, pontos = 1) {
  e.ajudas = (e.ajudas ?? 0) + pontos;
}

/** As cartas más doem o dobro nas últimas épocas. */
function agravar(sala, efeito) {
  if (!fimDePartida(sala)) return efeito;
  const m = CONFIG.misterio.fimDePartida.multiplicadorMas;
  const novo = { ...efeito };
  if (novo.valor < 0) novo.valor *= m;
  if (novo.ou < 0) novo.ou *= m;
  if (novo.tipo === 'percentagem') novo.fracao *= m;
  return novo;
}

/**
 * Aplica o efeito de uma carta. Devolve { detalhe } para o registo e, nos que mexem no tabuleiro,
 * { repetir } ou { avancar }, que o tabuleiro trata.
 */
function aplicar(sala, ctx, e, efeito) {
  const rng = ctx.aleatorio;
  const plano = () => (efeito.ou != null ? { detalhe: mexerDinheiro(sala, e.id, efeito.ou) } : {});
  switch (efeito.tipo) {
    case 'dinheiro':
      return { detalhe: mexerDinheiro(sala, e.id, efeito.valor) };
    case 'percentagem':
      return { detalhe: `−${M(descontar(sala, e.id, e.dinheiro * efeito.fracao))}` };
    case 'proximaJanela':
      e.capitalProximaJanela = (e.capitalProximaJanela ?? 0) + efeito.valor;
      return { detalhe: `${efeito.valor > 0 ? '+' : '−'}${M(Math.abs(efeito.valor))} na próxima janela` };
    case 'carta':
      e.cartas[efeito.carta]++;
      return {};
    case 'perderCarta':
      if (e.cartas[efeito.carta] < 1) return plano();
      e.cartas[efeito.carta]--;
      return {};
    case 'rede': {
      const liga = e.redes.length < CONFIG.cartas.maxRedes ? tirarRede(sala, ctx, e.redes) : null;
      if (!liga) return plano();
      e.redes.push(liga);
      return { detalhe: liga };
    }
    case 'perderRede': {
      if (!e.redes.length) return plano();
      const liga = escolher(rng, e.redes);
      e.redes = e.redes.filter((l) => l !== liga);
      return { detalhe: liga };
    }
    case 'desconto':
      e.descontoProxima = efeito.fracao;
      return {};
    case 'jogadorLivre': {
      const id = escolher(rng, livresQue(sala, ctx, { overall: efeito.overall, idade: [20, 32] }));
      if (id == null) return plano();
      transferir(sala, id, e.id, { compradoRonda: sala.janela.ronda });
      contarContratacao(e);
      return { detalhe: jogador(sala, ctx, id).curto };
    }
    case 'overall': {
      const lista = emCampo(sala, ctx, e);
      const j = efeito.alvo === 'jovem' ? porOverall(lista.filter((x) => x.formacao))[0] : escolher(rng, lista);
      if (!j) return plano();
      mudarJogador(sala, j.id, { overall: j.overall + efeito.delta });
      return { detalhe: `${j.curto} ${efeito.delta > 0 ? '+' : '−'}${Math.abs(efeito.delta)}` };
    }
    case 'jogo': {
      const { tipo, ...resto } = efeito;
      const ef = { ...resto };
      let detalhe;
      if (ef.efeito === 'lesao' || ef.efeito === 'suspenso') {
        // Os guarda-redes não se lesionam.
        const j = escolher(rng, emCampo(sala, ctx, e).filter((x) => ef.efeito !== 'lesao' || x.posicao !== 'GK'));
        if (!j) return {};
        ef.jogador = j.id;
        detalhe = j.curto;
      }
      e.efeitos = [...(e.efeitos ?? []), ef];
      if (ef.efeito === 'suspenso') return { texto: `${frase(rng, jogador(sala, ctx, ef.jogador), 'castigo')} Fica de fora do próximo jogo.` };
      if (ef.efeito === 'lesao') return { texto: `${frase(rng, jogador(sala, ctx, ef.jogador), 'lesao')} Falha o próximo jogo.` };
      return { detalhe };
    }
    case 'repetir':
      return { repetir: true };
    case 'avancar':
      return { avancar: efeito.casa };
    case 'perderVez':
      e.saltarVez = true;
      return {};
    case 'blindar': {
      const j = porOverall(emCampo(sala, ctx, e)).find((x) => !x.inflacionada);
      if (!j) return plano();
      mudarJogador(sala, j.id, { multClausula: CONFIG.valores.clausulaInflacionada, inflacionada: true });
      return { detalhe: j.curto };
    }
    case 'clausulaBaixa': {
      const j = porOverall(emCampo(sala, ctx, e))[0];
      if (!j) return {};
      mudarJogador(sala, j.id, { multClausula: CONFIG.valores.clausulaEmpresario, clausulaBaixa: true });
      return { detalhe: j.curto };
    }
    case 'vendaForcada': {
      const j = escolher(rng, porOverall(emCampo(sala, ctx, e)).slice(3));
      if (!j) return {};
      const preco = precoBase(j.valor);
      receber(sala, e.id, preco);
      transferir(sala, j.id, null);
      return { detalhe: `${j.curto}, ${M(preco)}` };
    }
    default:
      return {};
  }
}

/** Estamos nas últimas épocas da partida? */
export function fimDePartida(sala) {
  const { epocas } = CONFIG.misterio.fimDePartida;
  const finais = epocas[sala.config.epocas] ?? 0;
  return sala.epoca > sala.config.epocas - finais;
}

/** A carta de cima. Nas últimas épocas sorteia-se primeiro se é má ou boa, e sai a primeira desse tipo que houver. */
function tirarDoBaralho(sala, ctx) {
  if (!fimDePartida(sala)) return sala.baralhoMisterio.pop();
  const querBoa = ctx.aleatorio() >= CONFIG.misterio.fimDePartida.probabilidadeMa;
  const posicao = () => sala.baralhoMisterio.findLastIndex((n) => CONFIG.misterio.cartas[n].bom === querBoa);
  // Se já não houver cartas desse tipo, baralha-se de novo, senão a percentagem voltava a meio por meio.
  if (posicao() < 0) sala.baralhoMisterio = baralhar(ctx.aleatorio, CONFIG.misterio.cartas.map((_, i) => i));
  return sala.baralhoMisterio.splice(posicao(), 1)[0];
}

/** Tira uma carta do baralho (baralha de novo quando acaba) e aplica-a. */
export function tirarMisterio(sala, ctx, equipaId) {
  if (!sala.baralhoMisterio?.length) {
    sala.baralhoMisterio = baralhar(ctx.aleatorio, CONFIG.misterio.cartas.map((_, i) => i));
  }
  const base = CONFIG.misterio.cartas[tirarDoBaralho(sala, ctx)];
  const carta = sala.janela.tipo === 'inverno' && base.inverno ? { ...base, ...base.inverno } : base;
  const e = sala.equipas[equipaId];
  const r = aplicar(sala, ctx, e, carta.bom ? carta.efeito : agravar(sala, carta.efeito));
  if (carta.bom) somarAjuda(e, (carta.peso ?? 1) * CONFIG.investigacao.ajudaMisterio);
  const texto = r.texto ?? carta.texto;
  sala.janela.ultimaCarta = { equipa: equipaId, tipo: 'misterio', bom: carta.bom, titulo: carta.titulo, texto, detalhe: r.detalhe ?? null };
  registar(sala, ctx, `Mistério, ${e.nome}: ${carta.titulo}. ${texto}${r.detalhe ? ` (${r.detalhe})` : ''}`, { tipo: 'carta' });
  return r;
}

// --- Investigação ---

/** Títulos, contando cada Taça pelo que vale. */
export const titulos = (sala, equipaId) =>
  (sala.palmares ?? []).filter((p) => p.campeao === equipaId).length +
  (sala.palmaresTaca ?? []).filter((p) => p.vencedor === equipaId).length * CONFIG.taca.valor;

/** Probabilidade de condenação deste clube. */
export function probabilidadeCondenacao(sala, equipaId) {
  const e = sala.equipas[equipaId];
  return Math.min(I.maximo, I.base + I.porCampeonato * titulos(sala, equipaId) + I.porAjuda * (e.ajudas ?? 0));
}

/** O clube é investigado. Se for condenado, leva a sanção e as ajudas ficam pagas (voltam a zero). */
export function investigar(sala, ctx, equipaId) {
  const e = sala.equipas[equipaId];
  if (ctx.aleatorio() >= probabilidadeCondenacao(sala, equipaId)) {
    sala.janela.ultimaCarta = { equipa: equipaId, tipo: 'investigacao', bom: true, titulo: 'Investigação arquivada', texto: 'Não foram encontradas irregularidades.', detalhe: null };
    registar(sala, ctx, `${e.nome} foi investigado: processo arquivado.`, { tipo: 'carta' });
    return;
  }
  const sancao = comPeso(ctx.aleatorio, Object.entries(I.sancoes));
  const partes = [];
  if (sancao === 'limite' || sancao === 'ambas') {
    e.limiteContratacoes = I.limiteContratacoes;
    partes.push(`só pode fazer mais ${I.limiteContratacoes} contratações nesta janela`);
  }
  if (sancao === 'multa' || sancao === 'ambas') {
    const multa = descontar(sala, equipaId, Math.max(I.multaMinima, e.dinheiro * I.multa));
    partes.push(`multa de ${M(multa)}`);
  }
  e.ajudas = 0;
  const detalhe = partes.join(' e ');
  const acusacao = escolher(ctx.aleatorio, I.acusacoes);
  sala.janela.ultimaCarta = { equipa: equipaId, tipo: 'investigacao', bom: false, titulo: 'Clube condenado', texto: 'A investigação encontrou irregularidades.', detalhe, acusacao };
  registar(sala, ctx, `${e.nome} foi investigado e condenado: ${detalhe}.`, { tipo: 'carta' });
}

// --- Limite de contratações (sanção) ---

export const podeContratar = (e, n = 1) => e.limiteContratacoes == null || e.limiteContratacoes >= n;

export function contarContratacao(e, n = 1) {
  if (e.limiteContratacoes != null) e.limiteContratacoes = Math.max(0, e.limiteContratacoes - n);
}

/** Na abertura da janela: chega o dinheiro prometido (ou a penhora), e acabam as sanções e cláusulas baixas. */
export function aplicarAberturaJanela(sala, ctx) {
  for (const e of Object.values(sala.equipas)) {
    delete e.limiteContratacoes;
    if (e.capitalProximaJanela) {
      const texto = mexerDinheiro(sala, e.id, e.capitalProximaJanela);
      registar(sala, ctx, `${e.nome}: ${texto} prometidos na janela anterior.`, { tipo: 'carta' });
      delete e.capitalProximaJanela;
    }
  }
  for (const d of Object.values(sala.jogadores)) {
    if (d.clausulaBaixa) {
      delete d.clausulaBaixa;
      delete d.multClausula;
    }
  }
}
