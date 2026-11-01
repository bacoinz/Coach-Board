// A janela de transferências: formação → draft → tabuleiro → fecho.
import { CONFIG } from '../config.js';
import { baralhar } from './aleatorio.js';
import { jogador, transferir, reservar, libertar, pagar, receber, registar, equipasTreinadores, erro, M, podePagar, textoSaldo } from './estado.js';
import { FORMACOES, melhorOnze, onzeEscolhido, overallNaPosicao } from './formacao.js';
import { opcoesDraft, tirarEmprestimo } from './cartas.js';
import { iniciarTabuleiro, acabou, todosAcabaram } from './tabuleiro.js';
import { prepararJovem } from './negocios.js';
import { aplicarAberturaJanela } from './misterio.js';
import { iniciarVolta } from './campeonato.js';
import { extensaoPatrocinios } from './patrocinios.js';
import { ajustarBots } from './bots.js';
import { precoBase, precoDraft } from './valores.js';

const NOMES = { verao: 'de transferências de verão', inverno: 'de transferências de inverno' };

/** Abre a janela: devolve os emprestados, reinicia as marcas de ronda e pede a formação a todos. */
export function abrirJanela(sala, ctx, tipo) {
  for (const [id, d] of Object.entries(sala.jogadores)) {
    delete d.lesionado;
    // O emprestado por lesão fica até à escolha da formação, para poder ser comprado (só por treinadores).
    if (d.emprestado && !(d.emprestadoLesao && !sala.equipas[d.equipa]?.bot)) transferir(sala, Number(id), null);
    else if (d.compradoRonda != null) delete d.compradoRonda;
  }
  sala.descartados = [];
  // Na abertura da janela, os emprestados já aparecem com a carta, para os poder comprar.
  for (const e of Object.values(sala.equipas)) delete e.emprestadosNovos;
  ajustarBots(sala, ctx);
  sala.fase = 'janela';
  sala.janela = { tipo, fase: 'formacao', prontos: [], ronda: 0, trocas: [] };
  registar(sala, ctx, `Época ${sala.epoca}: abre a janela ${NOMES[tipo]}. Escolham a formação.`, { tipo: 'fase' });
  aplicarAberturaJanela(sala, ctx);
}

export function escolherFormacao(sala, ctx, equipaId, formacao) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j.fase !== 'formacao') return erro('Já não é altura de escolher a formação.');
  if (!FORMACOES.includes(formacao)) return erro('Formação desconhecida.');
  if (sala.equipas[equipaId].formacao !== formacao) delete sala.equipas[equipaId].escolhaOnze;
  sala.equipas[equipaId].formacao = formacao;
  if (!j.prontos.includes(equipaId)) j.prontos.push(equipaId);
  if (equipasTreinadores(sala).every((e) => j.prontos.includes(e.id))) iniciarDraft(sala, ctx);
  return { ok: true };
}

/** Ordem da janela: classificação invertida (último primeiro); na 1.ª janela, ao acaso. */
export function ordemJanela(sala, ctx) {
  const ids = equipasTreinadores(sala).map((e) => e.id);
  if (!sala.classificacao?.length) return baralhar(ctx.aleatorio, ids);
  const pos = new Map(sala.classificacao.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => (pos.get(b) ?? -1) - (pos.get(a) ?? -1));
}

/** Na abertura da janela, um jogador emprestado por lesão pode ser comprado ao valor de mercado. */
export function comprarEmprestado(sala, ctx, equipaId, id) {
  if (sala.fase !== 'janela' || sala.janela.fase !== 'formacao') return erro('Só na abertura da janela.');
  const jg = jogador(sala, ctx, id);
  if (!jg || jg.equipa !== equipaId || !jg.emprestadoLesao) return erro('Esse jogador não está emprestado a ti.');
  if (!podePagar(sala, equipaId, jg.valor)) return erro(textoSaldo(sala));
  pagar(sala, equipaId, jg.valor);
  const d = sala.jogadores[id];
  delete d.emprestado;
  delete d.emprestadoLesao;
  registar(sala, ctx, `${sala.equipas[equipaId].nome} compra ${jg.curto}, que estava emprestado, por ${M(jg.valor)}.`, { tipo: 'transferencia' });
  return { ok: true };
}

function devolverEmprestados(sala) {
  for (const [id, d] of Object.entries(sala.jogadores)) if (d.emprestadoLesao) transferir(sala, Number(id), null);
}

function iniciarDraft(sala, ctx) {
  devolverEmprestados(sala);
  const j = sala.janela;
  const ordem = ordemJanela(sala, ctx);
  const ultimo = sala.classificacao?.length ? ordem[0] : null;
  j.ordemJanela = ordem;
  j.fase = 'draft';
  j.draft = { escolhas: [], i: 0, opcoes: [] };
  for (const id of ordem) {
    j.draft.escolhas.push({ equipa: id, tipo: 'jovem' });
    if (id === ultimo) j.draft.escolhas.push({ equipa: id, tipo: 'extra' });
  }
  registar(sala, ctx, 'Draft: cada um escolhe um de três jogadores.', { tipo: 'fase' });
  prepararEscolha(sala, ctx);
}

/** Os jovens do draft são melhores a cada época que passa. */
export function criterioJovem(epoca) {
  const { idade, overall: [a, b], porEpoca } = CONFIG.draft.jovem;
  const sobe = (epoca - 1) * porEpoca;
  return { idade, overall: [a + sobe, b + sobe] };
}

/** A segunda escolha do draft nesta época: o limite de overall e de valor sobem até ao máximo. */
export function criterioExtra(epoca) {
  const { overall, valor, margemOverall } = CONFIG.draft.extra;
  const limite = (x) => Math.min(x.maximo, x.inicial + (epoca - 1) * x.porEpoca);
  const topo = limite(overall);
  return { overall: [topo - margemOverall, topo], valorMaximo: limite(valor) };
}

function prepararEscolha(sala, ctx) {
  const d = sala.janela.draft;
  libertar(sala, d.opcoes);
  d.opcoes = [];
  const atual = d.escolhas[d.i];
  if (!atual) return iniciarTabuleiro(sala, ctx, sala.janela.ordemJanela);
  const criterios = [atual.tipo === 'jovem' ? criterioJovem(sala.epoca) : criterioExtra(sala.epoca)];
  d.opcoes = opcoesDraft(sala, ctx, criterios, CONFIG.draft.opcoes);
  reservar(sala, d.opcoes);
}

/** Preço de uma opção do draft. */
export const precoOpcao = (sala, ctx, id) => precoDraft(jogador(sala, ctx, id).valor);

export function escolherDraft(sala, ctx, equipaId, id) {
  const j = sala.janela;
  const d = j?.draft;
  if (sala.fase !== 'janela' || j.fase !== 'draft') return erro('Não estamos no draft.');
  const atual = d.escolhas[d.i];
  if (atual.equipa !== equipaId) return erro('Não é a tua escolha.');
  if (id == null) {
    registar(sala, ctx, `${sala.equipas[equipaId].nome} passa a escolha do draft.`, { tipo: 'draft' });
  } else {
    if (!d.opcoes.includes(id)) return erro('Escolhe uma das três opções.');
    const preco = precoOpcao(sala, ctx, id);
    if (!podePagar(sala, equipaId, preco)) return erro(textoSaldo(sala));
    pagar(sala, equipaId, preco);
    d.opcoes = d.opcoes.filter((x) => x !== id);
    transferir(sala, id, equipaId, atual.tipo === 'extra' ? { soBanca: true } : {});
    if (atual.tipo === 'jovem') prepararJovem(sala, ctx, id);
    registar(sala, ctx, `${sala.equipas[equipaId].nome} escolhe ${ctx.base.get(id).curto} no draft por ${M(preco)}.`, { tipo: 'draft' });
  }
  d.i++;
  prepararEscolha(sala, ctx);
  return { ok: true };
}

/**
 * O treinador escolhe quem joga em cada lugar: só nas posições do jogador. Na janela fica como escolha para o fecho;
 * antes de um jogo muda logo o onze, e quem sai do onze passa a suplente.
 */
export function escolherOnze(sala, ctx, equipaId, lugares) {
  const e = sala.equipas[equipaId];
  const posicoes = CONFIG.formacoes[e.formacao];
  const naJanela = sala.fase === 'janela' && !(sala.janela.fase === 'fecho' && sala.janela.prontos.includes(equipaId));
  const antesDoJogo = sala.fase === 'campeonato' && sala.campeonato.fase === 'taticas';
  if (!naJanela && !antesDoJogo) return erro('Agora não podes mudar o onze.');
  if (!posicoes || !Array.isArray(lugares) || lugares.length !== posicoes.length) return erro('Onze inválido.');
  const ids = lugares.filter((id) => id != null);
  if (new Set(ids).size !== ids.length) return erro('Um jogador não pode ocupar dois lugares.');
  for (let i = 0; i < lugares.length; i++) {
    if (lugares[i] == null) continue;
    const j = jogador(sala, ctx, lugares[i]);
    if (!j || j.equipa !== equipaId) return erro('Esse jogador não é teu.');
    if (antesDoJogo && j.lesionado) return erro(`${j.curto} está lesionado.`);
    if (overallNaPosicao(j, posicoes[i]) == null) return erro(`${j.curto} não joga a ${CONFIG.posicoes.nome[posicoes[i]]}.`);
  }
  if (antesDoJogo) {
    if (ids.length < e.onze.filter((l) => l.jogador != null).length) return erro('Não podes deixar lugares vazios.');
    e.onze = lugares.map((id, i) => ({ posicao: posicoes[i], jogador: id, overall: id == null ? null : overallNaPosicao(jogador(sala, ctx, id), posicoes[i]) }));
    e.suplente = e.plantel.find((id) => !ids.includes(id)) ?? null;
  }
  e.escolhaOnze = lugares;
  return { ok: true };
}

/** Não tem nada que possa vender: fica a zero, senão a partida ficava presa. */
function perdoarSemJogadores(sala, ctx, e) {
  const vendaveis = e.plantel.filter((id) => !jogador(sala, ctx, id).emprestado);
  if (e.dinheiro >= 0 || vendaveis.length) return;
  e.dinheiro = 0;
  registar(sala, ctx, `${e.nome} já não tem jogadores para vender: a dívida é perdoada.`, { tipo: 'banca' });
}

/** O anfitrião fecha a janela por quem não está: os jogadores mais valiosos vão para a banca até a dívida acabar. */
function liquidarDividas(sala, ctx) {
  for (const e of equipasTreinadores(sala)) {
    const porValor = e.plantel.map((id) => jogador(sala, ctx, id)).filter((x) => !x.emprestado).sort((a, b) => b.valor - a.valor);
    for (const jg of porValor) {
      if (e.dinheiro >= 0) break;
      const preco = precoBase(jg.valor);
      receber(sala, e.id, preco);
      transferir(sala, jg.id, null);
      registar(sala, ctx, `${e.nome} estava em saldo negativo: ${jg.curto} vai para a banca por ${M(preco)}.`, { tipo: 'banca' });
    }
    perdoarSemJogadores(sala, ctx, e);
  }
}

/** Quem já completou as voltas marca que está pronto para fechar a janela. */
export function prontoFechar(sala, ctx, equipaId, pronto = true) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j.fase !== 'tabuleiro') return erro('Não estamos no tabuleiro.');
  if (!acabou(j, equipaId)) return erro('Completa primeiro as voltas.');
  perdoarSemJogadores(sala, ctx, sala.equipas[equipaId]);
  if (pronto && sala.equipas[equipaId].dinheiro < 0) return erro('Estás em saldo negativo: leiloa jogadores até ficares sem dívida.');
  j.prontos = j.prontos.filter((x) => x !== equipaId);
  if (pronto) j.prontos.push(equipaId);
  verificarFecho(sala, ctx);
  return { ok: true };
}

/** Fecha a janela quando todos completaram as voltas, estão prontos e não há nada por resolver. */
export function verificarFecho(sala, ctx) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j?.fase !== 'tabuleiro') return false;
  // Quem comprou depois de estar pronto e ficou em dívida tem de a resolver primeiro.
  j.prontos = j.prontos.filter((id) => sala.equipas[id].dinheiro >= 0);
  if (!todosAcabaram(j) || !j.ordem.every((id) => j.prontos.includes(id)) || j.leilao || j.contestacao || j.pendente) return false;
  abrirFecho(sala, ctx);
  return true;
}

/** O anfitrião fecha a janela (só quando não há nada por resolver). */
export function forcarFecho(sala, ctx) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j.fase !== 'tabuleiro') return erro('Não estamos no tabuleiro.');
  if (j.leilao || j.contestacao) return erro('Há um leilão ou um Agente por resolver.');
  if (j.pendente?.jogador) libertar(sala, [j.pendente.jogador]);
  j.pendente = null;
  liquidarDividas(sala, ctx);
  abrirFecho(sala, ctx);
  return { ok: true };
}

function abrirFecho(sala, ctx) {
  const j = sala.janela;
  j.fase = 'fecho';
  j.prontos = [];
  j.trocas = [];
  registar(sala, ctx, `Fecho da janela: cada um fica com ${CONFIG.fecho.plantel} + ${CONFIG.fecho.formacao} da formação.`, { tipo: 'fase' });
}

/**
 * O plantel sugerido no fecho: o melhor onze na formação (os jovens da formação também jogam, porque crescem
 * com os minutos) e, de fora, o melhor jovem da formação que sobrar, como 12.º.
 */
export function sugestaoFecho(sala, ctx, equipaId) {
  const e = sala.equipas[equipaId];
  const todos = e.plantel.map((id) => jogador(sala, ctx, id)).filter((x) => !x.emprestado);
  const { onze, sobram } = onzeEscolhido(todos, e.formacao, e.escolhaOnze);
  const suplente = todos.filter((x) => sobram.includes(x.id) && x.formacao).sort((a, b) => b.overall - a.overall)[0];
  return { manter: [...onze.map((l) => l.jogador).filter((x) => x != null), ...(suplente ? [suplente.id] : [])] };
}

/**
 * Valida o plantel escolhido para o fecho: o onze encaixa na formação e, fora dele, só pode ficar um jogador,
 * que tem de ser da formação. Devolve o onze e o suplente da formação, ou um erro.
 */
export function validarFecho(sala, ctx, equipaId, { manter = [] }) {
  const e = sala.equipas[equipaId];
  manter = [...new Set(manter)];
  if (!manter.every((id) => e.plantel.includes(id))) return erro('Há jogadores que não são teus.');
  const jogadores = manter.map((id) => jogador(sala, ctx, id)).filter((x) => !x.emprestado);
  if (jogadores.length > CONFIG.fecho.plantel + CONFIG.fecho.formacao) return erro(`Só podes ficar com ${CONFIG.fecho.plantel} jogadores (mais 1 da formação).`);
  // A escolha do treinador manda, a não ser que impeça alguém de ficar: aí encaixa-se o melhor possível.
  let { onze, sobram } = onzeEscolhido(jogadores, e.formacao, e.escolhaOnze);
  if (sobram.length > CONFIG.fecho.formacao) ({ onze, sobram } = melhorOnze(jogadores, e.formacao));
  const fora = jogadores.filter((x) => sobram.includes(x.id));
  const nomes = (lista) => lista.map((x) => x.curto).join(', ');
  if (fora.length > CONFIG.fecho.formacao) return erro(`${nomes(fora)} não cabem no onze ${e.formacao}: só pode ficar de fora 1 jovem da formação.`);
  if (fora.length && !fora[0].formacao) {
    return erro(onze.some((l) => l.jogador == null)
      ? `${nomes(fora)} não encaixa em nenhum lugar livre da formação ${e.formacao}.`
      : `Já tens 11: o 12.º tem de ser da formação, e ${nomes(fora)} não é.`);
  }
  return { ok: true, onze, manter: jogadores.map((x) => x.id), suplente: fora[0]?.id ?? null };
}

export function fechar(sala, ctx, equipaId, escolha) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j.fase !== 'fecho') return erro('Não estamos no fecho da janela.');
  if (j.prontos.includes(equipaId)) return erro('Já fechaste o plantel.');
  const v = validarFecho(sala, ctx, equipaId, escolha);
  if (v.erro) return v;
  const e = sala.equipas[equipaId];
  // Quem não fica vai para a banca, ao preço base.
  for (const id of [...e.plantel]) {
    if (v.manter.includes(id)) continue;
    const jg = jogador(sala, ctx, id);
    if (jg.emprestado) {
      transferir(sala, id, null);
      continue;
    }
    const preco = precoBase(jg.valor);
    receber(sala, equipaId, preco);
    transferir(sala, id, null);
    registar(sala, ctx, `${e.nome} vende ${jg.curto} à banca por ${M(preco)}.`, { tipo: 'banca' });
  }
  // Lugares vazios: um emprestado de overall baixo até à próxima janela.
  e.onze = v.onze.map((l) => {
    if (l.jogador != null) return l;
    const id = tirarEmprestimo(sala, ctx, l.posicao);
    if (id == null) return l;
    transferir(sala, id, equipaId, { emprestado: true });
    registar(sala, ctx, `${e.nome} recebe ${ctx.base.get(id).curto} emprestado para ${CONFIG.posicoes.nome[l.posicao]}.`, { tipo: 'emprestimo' });
    return { posicao: l.posicao, jogador: id, overall: ctx.base.get(id).overall };
  });
  e.suplente = v.suplente;
  j.prontos.push(equipaId);
  if (equipasTreinadores(sala).every((x) => j.prontos.includes(x.id))) concluirJanela(sala, ctx);
  return { ok: true };
}

/** Fecha a janela e passa ao campeonato. Os bots montam o onze sozinhos. */
function concluirJanela(sala, ctx) {
  for (const e of Object.values(sala.equipas)) {
    if (!e.bot) continue;
    const { onze } = melhorOnze(e.plantel.map((id) => jogador(sala, ctx, id)), e.formacao);
    e.onze = onze;
  }
  extensaoPatrocinios(sala, ctx);
  registar(sala, ctx, `A janela ${NOMES[sala.janela.tipo]} fecha.`, { tipo: 'fase' });
  const volta = sala.janela.tipo === 'verao' ? 1 : 2;
  sala.janela = null;
  iniciarVolta(sala, ctx, volta);
}
