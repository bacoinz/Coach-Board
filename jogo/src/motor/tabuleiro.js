// O tabuleiro de mercado: vezes, dados, casas e as decisões de cada casa.
import { CONFIG } from '../config.js';
import { dado } from './aleatorio.js';
import { jogador, reservar, libertar, receber, registar, erro, M } from './estado.js';
import { tirarMercado, tirarJovemTalento, tirarRede } from './cartas.js';
import { abrirLeilao, executarVenda, prepararJovem } from './negocios.js';
import { tirarMisterio, investigar, podeContratar } from './misterio.js';
import { arredondar } from './valores.js';

export const CASAS = CONFIG.tabuleiro.casas;

export const NOMES_CASAS = {
  inicio: 'Início',
  mercado: 'Mercado',
  rede: 'Rede de observação',
  empresario: 'Empresário',
  medico: 'Departamento médico',
  patrocinio: 'Patrocínio',
  jovens: 'Jovens Talentos',
  misterio: 'Mistério',
  investigacao: 'Investigação',
};

/** Casas a andar nesta janela (voltas × casas do tabuleiro). */
export function totalCasas(janela) {
  return CONFIG.tabuleiro.voltas[janela.tipo] * CASAS.length;
}

export const acabou = (janela, equipaId) => janela.andadas[equipaId] >= totalCasas(janela);

export function iniciarTabuleiro(sala, ctx, ordem) {
  const j = sala.janela;
  j.fase = 'tabuleiro';
  j.ordem = ordem;
  j.vez = 0;
  j.ronda = 1;
  j.lancou = false;
  j.andadas = Object.fromEntries(ordem.map((id) => [id, 0]));
  j.posicao = Object.fromEntries(ordem.map((id) => [id, 0]));
  j.pendente = null;
  j.leilao = null;
  j.contestacao = null;
  j.prontos = [];
  registar(sala, ctx, `Tabuleiro: ${CONFIG.tabuleiro.voltas[j.tipo] === 1 ? 'uma volta' : `${CONFIG.tabuleiro.voltas[j.tipo]} voltas`}. Começa ${sala.equipas[ordem[0]].nome}.`, { tipo: 'fase' });
}

function validarVez(sala, equipaId) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j?.fase !== 'tabuleiro') return 'Não estamos no tabuleiro.';
  if (j.ordem[j.vez] !== equipaId) return 'Não é a tua vez.';
  if (j.leilao) return 'Há um leilão a decorrer.';
  if (j.contestacao) return 'Há um Empresário por responder.';
  return null;
}

export function lancar(sala, ctx, equipaId) {
  const bloqueio = validarVez(sala, equipaId);
  if (bloqueio) return erro(bloqueio);
  const j = sala.janela;
  if (j.pendente) return erro('Resolve primeiro a casa.');
  if (j.lancou) return erro('Já lançaste os dados nesta vez.');
  if (acabou(j, equipaId)) return erro('Já completaste as voltas.');
  const dados = Array.from({ length: CONFIG.tabuleiro.dados }, () => dado(ctx.aleatorio));
  const de = j.posicao[equipaId];
  andar(sala, ctx, equipaId, dados.reduce((s, d) => s + d, 0));
  j.lancou = true;
  const casa = CASAS[j.posicao[equipaId]];
  j.ultimoLance = { equipa: equipaId, dados, de, para: j.posicao[equipaId] };
  const e = sala.equipas[equipaId];
  if (acabou(j, equipaId)) {
    registar(sala, ctx, `${e.nome} lança ${dados.join(' + ')} e completa as voltas.`, { tipo: 'dados' });
    return { ok: true };
  }
  registar(sala, ctx, `${e.nome} lança ${dados.join(' + ')} e cai em ${NOMES_CASAS[casa]}.`, { tipo: 'dados' });
  resolverCasa(sala, ctx, equipaId, casa);
  return { ok: true };
}

/**
 * Anda n casas, sem passar do fim das voltas. Ao passar pelo Início a meio (só acontece no verão), há a injeção
 * de capital da SAD; no fim da última volta já não há.
 */
function andar(sala, ctx, equipaId, n) {
  const j = sala.janela;
  const antes = j.andadas[equipaId];
  const depois = Math.min(antes + n, totalCasas(j));
  j.andadas[equipaId] = depois;
  j.posicao[equipaId] = depois % CASAS.length;
  if (Math.floor(depois / CASAS.length) > Math.floor(antes / CASAS.length) && depois < totalCasas(j)) {
    const valor = valorSAD(sala.epoca);
    receber(sala, equipaId, valor);
    registar(sala, ctx, `Injeção de capital da SAD: ${sala.equipas[equipaId].nome} recebe ${M(valor)}.`, { tipo: 'carta' });
  }
}

/** A injeção da SAD duplica a cada época. */
export function valorSAD(epoca) {
  const { base, fator } = CONFIG.tabuleiro.injecaoSAD;
  return base * fator ** (epoca - 1);
}

/**
 * Preço de uma carta do Mercado para quem caiu na casa: 80% do valor, com o desconto da Rede, se for da liga, e o
 * da carta "Amigo do presidente", se o tiver.
 */
export function precoCarta(sala, ctx, equipaId, id) {
  const jg = jogador(sala, ctx, id);
  const e = sala.equipas[equipaId];
  const rede = e.redes.includes(jg.liga) ? CONFIG.cartas.redeDesconto : 0;
  return arredondar(jg.valor * CONFIG.cartas.precoCasa * (1 - rede) * (1 - (e.descontoProxima ?? 0)));
}

/** A carta Mistério pode mandar lançar outra vez ou avançar até à próxima casa de um tipo. */
function resolverMisterio(sala, ctx, equipaId) {
  const j = sala.janela;
  const r = tirarMisterio(sala, ctx, equipaId);
  if (r.repetir) j.lancou = false;
  if (!r.avancar) return;
  let passos = 1;
  while (passos < CASAS.length && CASAS[(j.posicao[equipaId] + passos) % CASAS.length] !== r.avancar) passos++;
  if (j.andadas[equipaId] + passos >= totalCasas(j)) return;
  andar(sala, ctx, equipaId, passos);
  resolverCasa(sala, ctx, equipaId, CASAS[j.posicao[equipaId]]);
}

export function resolverCasa(sala, ctx, equipaId, casa) {
  const j = sala.janela;
  const e = sala.equipas[equipaId];
  switch (casa) {
    case 'mercado': {
      const carta = tirarMercado(sala, ctx);
      if (!carta) return registar(sala, ctx, 'O baralho do Mercado está vazio.');
      reservar(sala, [carta.id]);
      j.pendente = { tipo: 'mercado', equipa: equipaId, jogador: carta.id, preco: precoCarta(sala, ctx, equipaId, carta.id) };
      break;
    }
    case 'jovens': {
      const id = tirarJovemTalento(sala, ctx);
      if (id == null) return registar(sala, ctx, 'Já não há Jovens Talentos.');
      reservar(sala, [id]);
      j.pendente = { tipo: 'jovens', equipa: equipaId, jogador: id, preco: arredondar(jogador(sala, ctx, id).valor * CONFIG.cartas.precoCasa) };
      break;
    }
    case 'rede': {
      const liga = tirarRede(sala, ctx, e.redes);
      if (!liga) return registar(sala, ctx, 'Não há mais Redes de observação.');
      if (e.redes.length < CONFIG.cartas.maxRedes) {
        e.redes.push(liga);
        registar(sala, ctx, `${e.nome} ganha a Rede de observação de ${liga}: 20% de desconto nos jogadores dessa liga.`, { tipo: 'carta' });
      } else j.pendente = { tipo: 'rede', equipa: equipaId, liga };
      break;
    }
    case 'empresario':
      e.cartas.empresario++;
      registar(sala, ctx, `${e.nome} ganha uma carta de Empresário.`, { tipo: 'carta' });
      break;
    case 'medico':
      e.cartas.medico++;
      registar(sala, ctx, `${e.nome} ganha uma carta do Departamento médico.`, { tipo: 'carta' });
      break;
    case 'patrocinio':
      // As cartas de marca e patrocínio entram no passo 5.
      registar(sala, ctx, `${e.nome} cai em Patrocínio (as cartas de patrocínio ainda não estão no jogo).`, { tipo: 'carta' });
      break;
    case 'misterio':
      resolverMisterio(sala, ctx, equipaId);
      break;
    case 'investigacao':
      investigar(sala, ctx, equipaId);
      break;
    default:
      break;
  }
}

/** Comprar a carta da casa (Mercado ou Jovens Talentos) pelo preço pedido. */
export function comprar(sala, ctx, equipaId) {
  const j = sala.janela;
  const p = j?.pendente;
  if (!p || p.equipa !== equipaId || !['mercado', 'jovens'].includes(p.tipo)) return erro('Não há nada para comprar.');
  const e = sala.equipas[equipaId];
  if (e.dinheiro < p.preco) return erro(`Precisas de ${M(p.preco)}.`);
  if (!podeContratar(e)) return erro('Estás sancionado: já não podes contratar nesta janela.');
  j.pendente = null;
  executarVenda(sala, ctx, p.jogador, equipaId, p.preco);
  if (p.tipo === 'mercado') delete e.descontoProxima;
  if (p.tipo === 'jovens') prepararJovem(sala, ctx, p.jogador);
  return { ok: true };
}

/** Passar a carta: vai a leilão entre os outros treinadores, a partir do valor de mercado. Quem passou já não licita. */
export function passar(sala, ctx, equipaId) {
  const j = sala.janela;
  const p = j?.pendente;
  if (!p || p.equipa !== equipaId || !['mercado', 'jovens'].includes(p.tipo)) return erro('Não há nada para passar.');
  j.pendente = null;
  const jg = jogador(sala, ctx, p.jogador);
  registar(sala, ctx, `${sala.equipas[equipaId].nome} passa ${jg.curto}. Vai a leilão.`, { tipo: 'leilao' });
  abrirLeilao(sala, ctx, { jogador: p.jogador, origem: 'mesa', minimo: jg.valor, excluir: equipaId, formacao: p.tipo === 'jovens' });
  return { ok: true };
}

/** Com três Redes, descarta uma (pode ser a nova). */
export function descartarRede(sala, ctx, equipaId, liga) {
  const j = sala.janela;
  const p = j?.pendente;
  if (!p || p.equipa !== equipaId || p.tipo !== 'rede') return erro('Não há Rede para descartar.');
  const e = sala.equipas[equipaId];
  const todas = [...e.redes, p.liga];
  if (!todas.includes(liga)) return erro('Escolhe uma das tuas Redes.');
  e.redes = todas.filter((l) => l !== liga);
  j.pendente = null;
  registar(sala, ctx, `${e.nome} fica com as Redes de ${e.redes.join(' e ')}.`, { tipo: 'carta' });
  return { ok: true };
}

export function terminarVez(sala, ctx, equipaId) {
  const bloqueio = validarVez(sala, equipaId);
  if (bloqueio) return erro(bloqueio);
  const j = sala.janela;
  if (j.pendente) return erro('Resolve primeiro a casa.');
  if (!j.lancou && !acabou(j, equipaId)) return erro('Ainda não lançaste os dados.');
  passarVez(sala, ctx);
  return { ok: true };
}

function passarVez(sala, ctx) {
  const j = sala.janela;
  j.ultimaCarta = null;
  // Quem tirou "Papelada em atraso" perde esta vez (se ainda tiver casas para andar).
  for (let i = 0; i < j.ordem.length; i++) {
    j.vez = (j.vez + 1) % j.ordem.length;
    if (j.vez === 0) j.ronda++;
    const e = sala.equipas[j.ordem[j.vez]];
    if (!e.saltarVez) break;
    delete e.saltarVez;
    registar(sala, ctx, `${e.nome} perde a vez.`, { tipo: 'carta' });
  }
  j.lancou = false;
}

/** O anfitrião força a vez de quem não está a jogar: a carta da casa volta ao baralho e a vez passa. */
export function forcarVez(sala, ctx) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j?.fase !== 'tabuleiro') return erro('Não estamos no tabuleiro.');
  if (j.leilao || j.contestacao) return erro('Há um leilão ou um Empresário por resolver: usa "Fechar leilão".');
  const equipaId = j.ordem[j.vez];
  // Quem não está tem de andar na mesma, senão a janela nunca fecha: lança por ele e a carta da casa perde-se.
  if (!j.pendente && !j.lancou && !acabou(j, equipaId)) lancar(sala, ctx, equipaId);
  if (j.pendente) {
    if (j.pendente.jogador) libertar(sala, [j.pendente.jogador]);
    j.pendente = null;
  }
  registar(sala, ctx, `O anfitrião passou a vez de ${sala.equipas[equipaId].nome}.`);
  passarVez(sala, ctx);
  return { ok: true };
}

/** Todos completaram as voltas? */
export const todosAcabaram = (janela) => janela.ordem.every((id) => acabou(janela, id));
