// Leilões, propostas, Agente, vendas à banca e trocas diretas (durante a janela de transferências).
import { CONFIG } from '../config.js';
import { jogador, transferir, mudarJogador, pagar, receber, registar, equipaDe, equipasTreinadores, libertar, erro, M } from './estado.js';
import { podeContratar, contarContratacao, somarAjuda } from './misterio.js';
import { clausula, precoBase, arredondar } from './valores.js';

const naJanela = (sala) => sala.fase === 'janela';
const nome = (sala, ctx, id) => ctx.base.get(id)?.curto ?? '?';
const nomeEquipa = (sala, id) => sala.equipas[id]?.nome ?? '?';

/** Jogador que está num leilão ou num pedido pendente (não pode ser vendido nem trocado entretanto). */
function ocupado(sala, id) {
  const j = sala.janela;
  return j?.leilao?.jogador === id || j?.contestacao?.jogador === id || j?.pendente?.jogador === id;
}

/** Quantos jogadores esta equipa já comprou a esse treinador nesta janela. */
const comprasA = (sala, comprador, vendedor) => sala.janela?.compras?.[comprador]?.[vendedor] ?? 0;
const noLimite = (sala, comprador, vendedor) => comprasA(sala, comprador, vendedor) >= CONFIG.transferencias.maxPorTreinador;
const TEXTO_LIMITE = `Só podes comprar ${CONFIG.transferencias.maxPorTreinador} jogadores ao mesmo treinador em cada janela.`;

function contarCompra(sala, comprador, vendedor, n = 1) {
  const j = sala.janela;
  if (!j || !sala.equipas[vendedor]?.treinador) return;
  j.compras ??= {};
  j.compras[comprador] ??= {};
  j.compras[comprador][vendedor] = (j.compras[comprador][vendedor] ?? 0) + n;
}

/** Pode ser alvo de proposta ou de Agente por esta equipa? */
function alvoValido(sala, ctx, equipaId, id) {
  const j = jogador(sala, ctx, id);
  if (!j || !j.equipa) return 'Esse jogador não tem equipa.';
  if (j.equipa === equipaId) return 'O jogador já é teu.';
  if (!sala.equipas[j.equipa].treinador) return 'Não se fazem propostas às equipas bot.';
  if (j.emprestado) return 'Esse jogador está emprestado.';
  if (j.soBanca) return 'Esse jogador só pode ser vendido à banca.';
  if (j.compradoRonda === sala.janela.ronda) return 'Esse jogador foi comprado nesta ronda.';
  if (ocupado(sala, id)) return 'Esse jogador já está em negociação.';
  if (noLimite(sala, equipaId, j.equipa)) return TEXTO_LIMITE;
  return null;
}

/** Na tua vez no tabuleiro, sem nada por resolver. */
function tuaVezLivre(sala, equipaId) {
  const j = sala.janela;
  if (!naJanela(sala) || j.fase !== 'tabuleiro') return 'Só no tabuleiro.';
  if (j.ordem[j.vez] !== equipaId) return 'Não é a tua vez.';
  if (j.leilao || j.pendente || j.contestacao) return 'Há uma decisão por resolver.';
  return null;
}

// --- Transferência efetiva ---

export function executarVenda(sala, ctx, id, compradorId, valor) {
  const vendedorId = sala.jogadores[id]?.equipa ?? null;
  contarContratacao(sala.equipas[compradorId]);
  if (vendedorId) contarCompra(sala, compradorId, vendedorId);
  pagar(sala, compradorId, valor);
  if (vendedorId) receber(sala, vendedorId, valor);
  const formacao = sala.jogadores[id]?.formacao;
  const potencial = sala.jogadores[id]?.potencial;
  transferir(sala, id, null);
  transferir(sala, id, compradorId, { compradoRonda: sala.janela?.ronda ?? null, formacao: Boolean(formacao), ...(potencial ? { potencial } : {}) });
  registar(sala, ctx, vendedorId
    ? `${nomeEquipa(sala, compradorId)} compra ${nome(sala, ctx, id)} a ${nomeEquipa(sala, vendedorId)} por ${M(valor)}.`
    : `${nomeEquipa(sala, compradorId)} compra ${nome(sala, ctx, id)} por ${M(valor)}.`, { tipo: 'transferencia' });
}

// --- Leilões ---

/**
 * Abre um leilão. origem 'mesa' (carta do Mercado ou Jovens Talentos que ninguém comprou) ou 'proposta'.
 * Numa proposta, o proponente começa como líder com o valor proposto.
 */
export function abrirLeilao(sala, ctx, { jogador: id, origem, vendedor = null, proponente = null, minimo, excluir = null, obrigatorio = false, formacao = false }) {
  // Fora do leilão: o dono, quem passou a carta, quem está sancionado e quem já comprou o máximo a este treinador.
  const participantes = equipasTreinadores(sala).filter((e) => e.id !== vendedor && e.id !== excluir && podeContratar(e) && !(vendedor && noLimite(sala, e.id, vendedor))).map((e) => e.id);
  sala.janela.leilao = {
    jogador: id,
    origem,
    vendedor,
    proponente,
    minimo: arredondar(minimo),
    valor: proponente ? arredondar(minimo) : null,
    lider: proponente,
    participantes,
    desistiram: [],
    obrigatorio,
    formacao,
    fase: 'lances',
  };
  verificarFimLeilao(sala, ctx);
}

export function licitar(sala, ctx, equipaId, valor) {
  const l = sala.janela?.leilao;
  if (!l || l.fase !== 'lances') return erro('Não há leilão a decorrer.');
  if (!l.participantes.includes(equipaId) || l.desistiram.includes(equipaId)) return erro('Não estás neste leilão.');
  if (l.lider === equipaId) return erro('Já tens o lance mais alto.');
  valor = arredondar(Number(valor));
  const minimo = l.lider ? arredondar(l.valor + CONFIG.leilao.incrementoMinimo) : l.minimo;
  if (!(valor >= minimo)) return erro(`O lance mínimo é ${M(minimo)}.`);
  if (sala.equipas[equipaId].dinheiro < valor) return erro('Não tens dinheiro para esse lance.');
  l.valor = valor;
  l.lider = equipaId;
  registar(sala, ctx, `${nomeEquipa(sala, equipaId)} licita ${M(valor)} por ${nome(sala, ctx, l.jogador)}.`, { tipo: 'lance' });
  verificarFimLeilao(sala, ctx);
  return { ok: true };
}

export function desistir(sala, ctx, equipaId) {
  const l = sala.janela?.leilao;
  if (!l || l.fase !== 'lances') return erro('Não há leilão a decorrer.');
  if (!l.participantes.includes(equipaId) || l.desistiram.includes(equipaId)) return erro('Não estás neste leilão.');
  if (l.lider === equipaId) return erro('Tens o lance mais alto: não podes desistir.');
  l.desistiram.push(equipaId);
  verificarFimLeilao(sala, ctx);
  return { ok: true };
}

/** O anfitrião fecha o leilão: quem ainda não licitou nem desistiu, desiste. */
export function forcarFimLeilao(sala, ctx) {
  const l = sala.janela?.leilao;
  if (!l) return erro('Não há leilão.');
  if (l.fase === 'decisao') return decidirProposta(sala, ctx, l.vendedor, false);
  l.desistiram = l.participantes.filter((x) => x !== l.lider);
  verificarFimLeilao(sala, ctx);
  return { ok: true };
}

function verificarFimLeilao(sala, ctx) {
  const l = sala.janela.leilao;
  const ativos = l.participantes.filter((x) => x !== l.lider && !l.desistiram.includes(x));
  if (ativos.length) return;
  if (!l.lider) {
    libertar(sala, [l.jogador]);
    // Descartada: não volta a sair até à próxima janela.
    sala.descartados = [...(sala.descartados ?? []), l.jogador];
    registar(sala, ctx, `Ninguém licitou por ${nome(sala, ctx, l.jogador)}: a carta é descartada.`);
    sala.janela.leilao = null;
    return;
  }
  if (l.origem === 'mesa') {
    executarVenda(sala, ctx, l.jogador, l.lider, l.valor);
    if (l.formacao) prepararJovem(sala, ctx, l.jogador);
    sala.janela.leilao = null;
    return;
  }
  if (l.obrigatorio) {
    registar(sala, ctx, `Cláusula batida: ${nomeEquipa(sala, l.vendedor)} não pode recusar.`);
    executarVenda(sala, ctx, l.jogador, l.lider, l.valor);
    sala.janela.leilao = null;
    return;
  }
  l.fase = 'decisao';
  registar(sala, ctx, `${nomeEquipa(sala, l.vendedor)} decide se vende ${nome(sala, ctx, l.jogador)} por ${M(l.valor)} a ${nomeEquipa(sala, l.lider)}.`);
}

/** O dono decide a proposta (abaixo da cláusula), depois do leilão. */
export function decidirProposta(sala, ctx, equipaId, aceitar) {
  const l = sala.janela?.leilao;
  if (!l || l.fase !== 'decisao') return erro('Não há proposta por decidir.');
  if (l.vendedor !== equipaId) return erro('A decisão é do dono do jogador.');
  if (aceitar) executarVenda(sala, ctx, l.jogador, l.lider, l.valor);
  else registar(sala, ctx, `${nomeEquipa(sala, equipaId)} recusa vender ${nome(sala, ctx, l.jogador)}.`);
  sala.janela.leilao = null;
  return { ok: true };
}

// --- Propostas ---

export function propor(sala, ctx, equipaId, id, valor) {
  const bloqueio = tuaVezLivre(sala, equipaId) ?? alvoValido(sala, ctx, equipaId, id);
  if (bloqueio) return erro(bloqueio);
  valor = arredondar(Number(valor));
  if (!(valor >= CONFIG.valores.minimo)) return erro('Valor inválido.');
  if (!podeContratar(sala.equipas[equipaId])) return erro('Estás sancionado: já não podes contratar nesta janela.');
  if (sala.equipas[equipaId].dinheiro < valor) return erro('Não tens dinheiro para essa proposta.');
  const j = jogador(sala, ctx, id);
  const obrigatorio = valor >= j.clausula;
  registar(sala, ctx, `${nomeEquipa(sala, equipaId)} faz uma proposta de ${M(valor)} por ${j.curto} (${nomeEquipa(sala, j.equipa)})${obrigatorio ? ' e bate a cláusula' : ''}. Abre o leilão.`, { tipo: 'proposta' });
  abrirLeilao(sala, ctx, { jogador: id, origem: 'proposta', vendedor: j.equipa, proponente: equipaId, minimo: valor, obrigatorio });
  return { ok: true };
}

// --- Agente ---

export function inflacionar(sala, ctx, equipaId, id) {
  if (!naJanela(sala)) return erro('Só durante a janela.');
  const e = sala.equipas[equipaId];
  const j = jogador(sala, ctx, id);
  if (!j || j.equipa !== equipaId) return erro('Esse jogador não é teu.');
  if (e.cartas.empresario < 1) return erro('Não tens carta de Agente.');
  if (j.inflacionada) return erro('A cláusula desse jogador já foi inflacionada.');
  if (j.emprestado) return erro('Esse jogador está emprestado.');
  e.cartas.empresario--;
  somarAjuda(e, CONFIG.investigacao.ajudaEmpresario);
  mudarJogador(sala, id, { multClausula: CONFIG.valores.clausulaInflacionada, inflacionada: true });
  registar(sala, ctx, `${e.nome} usa o Agente: a cláusula de ${j.curto} passa a ${M(clausula(j.valor, CONFIG.valores.clausulaInflacionada))}.`, { tipo: 'empresario' });
  return { ok: true };
}

/** Exclusividade: compra o jogador pelo valor da cláusula, sem leilão. O dono pode anular com outro Agente. */
export function exclusividade(sala, ctx, equipaId, id) {
  const bloqueio = tuaVezLivre(sala, equipaId) ?? alvoValido(sala, ctx, equipaId, id);
  if (bloqueio) return erro(bloqueio);
  const e = sala.equipas[equipaId];
  if (e.cartas.empresario < 1) return erro('Não tens carta de Agente.');
  if (!podeContratar(e)) return erro('Estás sancionado: já não podes contratar nesta janela.');
  const j = jogador(sala, ctx, id);
  const preco = j.clausula;
  if (e.dinheiro < preco) return erro(`Precisas de ${M(preco)}.`);
  e.cartas.empresario--;
  somarAjuda(e, CONFIG.investigacao.ajudaEmpresario);
  registar(sala, ctx, `${e.nome} usa o Agente para comprar ${j.curto} em exclusivo por ${M(preco)}.`, { tipo: 'empresario' });
  if (sala.equipas[j.equipa].cartas.empresario > 0) {
    sala.janela.contestacao = { atacante: equipaId, vendedor: j.equipa, jogador: id, preco };
    return { ok: true };
  }
  roubar(sala, ctx, id, equipaId, preco);
  return { ok: true };
}

/** A venda em exclusivo fica marcada, para o dono ser avisado de quem lhe levou o jogador. */
function roubar(sala, ctx, id, compradorId, preco) {
  const de = sala.jogadores[id]?.equipa;
  executarVenda(sala, ctx, id, compradorId, preco);
  sala.janela.roubos = [...(sala.janela.roubos ?? []), { jogador: id, de, para: compradorId }];
}

/** O dono responde à exclusividade: anula com um Agente seu ou deixa vender. */
export function responderExclusividade(sala, ctx, equipaId, anular) {
  const c = sala.janela?.contestacao;
  if (!c) return erro('Não há nada a responder.');
  if (c.vendedor !== equipaId) return erro('Não és o dono desse jogador.');
  sala.janela.contestacao = null;
  if (anular) {
    sala.equipas[equipaId].cartas.empresario--;
    somarAjuda(sala.equipas[equipaId], CONFIG.investigacao.ajudaEmpresario);
    registar(sala, ctx, `${nomeEquipa(sala, equipaId)} anula o Agente com outro Agente.`, { tipo: 'empresario' });
  } else roubar(sala, ctx, c.jogador, c.atacante, c.preco);
  return { ok: true };
}

// --- Banca e trocas ---

export function venderBanca(sala, ctx, equipaId, id) {
  if (!naJanela(sala)) return erro('Só durante a janela.');
  const j = jogador(sala, ctx, id);
  if (!j || j.equipa !== equipaId) return erro('Esse jogador não é teu.');
  if (j.emprestado) return erro('Os emprestados não se vendem.');
  if (ocupado(sala, id)) return erro('Esse jogador está em negociação.');
  const preco = precoBase(j.valor);
  receber(sala, equipaId, preco);
  transferir(sala, id, null);
  registar(sala, ctx, `${nomeEquipa(sala, equipaId)} vende ${j.curto} à banca por ${M(preco)}.`, { tipo: 'banca' });
  return { ok: true, preco };
}

function trocavel(sala, ctx, id, equipaId) {
  const j = jogador(sala, ctx, id);
  return j && j.equipa === equipaId && !j.emprestado && !j.soBanca && !ocupado(sala, id);
}

const excedeLimite = (sala, comprador, vendedor, n) => comprasA(sala, comprador, vendedor) + n > CONFIG.transferencias.maxPorTreinador;

export function proporTroca(sala, ctx, equipaId, { para, dar = [], receber: pedir = [] }) {
  if (!naJanela(sala)) return erro('Só durante a janela.');
  if (!sala.equipas[para]?.treinador || para === equipaId) return erro('Escolhe outro treinador.');
  if (!dar.length || !pedir.length) return erro('Uma troca leva jogadores dos dois lados.');
  if (!dar.every((id) => trocavel(sala, ctx, id, equipaId)) || !pedir.every((id) => trocavel(sala, ctx, id, para))) return erro('Há jogadores que não podem entrar na troca.');
  if (excedeLimite(sala, equipaId, para, pedir.length) || excedeLimite(sala, para, equipaId, dar.length)) return erro(TEXTO_LIMITE);
  const j = sala.janela;
  j.trocas = j.trocas ?? [];
  j.proximaTroca = (j.proximaTroca ?? 0) + 1;
  j.trocas.push({ id: j.proximaTroca, de: equipaId, para, dar, receber: pedir });
  registar(sala, ctx, `${nomeEquipa(sala, equipaId)} propõe uma troca a ${nomeEquipa(sala, para)}.`, { tipo: 'troca' });
  return { ok: true };
}

export function responderTroca(sala, ctx, equipaId, trocaId, aceitar) {
  const lista = sala.janela?.trocas ?? [];
  const t = lista.find((x) => x.id === trocaId);
  if (!t) return erro('Essa troca já não existe.');
  if (t.para !== equipaId && !(t.de === equipaId && !aceitar)) return erro('Essa troca não é para ti.');
  sala.janela.trocas = lista.filter((x) => x !== t);
  if (!aceitar) {
    registar(sala, ctx, `Troca entre ${nomeEquipa(sala, t.de)} e ${nomeEquipa(sala, t.para)} cancelada.`);
    return { ok: true };
  }
  if (!t.dar.every((id) => trocavel(sala, ctx, id, t.de)) || !t.receber.every((id) => trocavel(sala, ctx, id, t.para))) return erro('A troca já não é possível.');
  const [de, para] = [sala.equipas[t.de], sala.equipas[t.para]];
  if (!podeContratar(de, t.receber.length) || !podeContratar(para, t.dar.length)) return erro('Um dos clubes está sancionado e não pode contratar tantos jogadores.');
  if (excedeLimite(sala, t.de, t.para, t.receber.length) || excedeLimite(sala, t.para, t.de, t.dar.length)) return erro(TEXTO_LIMITE);
  contarCompra(sala, t.de, t.para, t.receber.length);
  contarCompra(sala, t.para, t.de, t.dar.length);
  contarContratacao(de, t.receber.length);
  contarContratacao(para, t.dar.length);
  const ronda = sala.janela.ronda;
  for (const id of t.dar) transferir(sala, id, t.para, { compradoRonda: ronda });
  for (const id of t.receber) transferir(sala, id, t.de, { compradoRonda: ronda });
  const nomes = (ids) => ids.map((id) => nome(sala, ctx, id)).join(', ');
  registar(sala, ctx, `Troca: ${nomes(t.dar)} para ${nomeEquipa(sala, t.para)}, ${nomes(t.receber)} para ${nomeEquipa(sala, t.de)}.`, { tipo: 'troca' });
  return { ok: true };
}

/** Um jovem que chega à formação recebe o potencial escondido. */
export function prepararJovem(sala, ctx, id) {
  const j = jogador(sala, ctx, id);
  if (j.idade > CONFIG.jovens.promocao.idade) return;
  const [a, b] = CONFIG.jovens.potencial;
  mudarJogador(sala, id, { formacao: true, potencial: a + Math.floor(ctx.aleatorio() * (b - a + 1)) });
}

export { equipaDe };
