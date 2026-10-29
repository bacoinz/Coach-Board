// A janela de transferências: formação → draft → tabuleiro → fecho.
import { CONFIG } from '../config.js';
import { baralhar } from './aleatorio.js';
import { jogador, transferir, reservar, libertar, pagar, receber, registar, equipasTreinadores, erro, M } from './estado.js';
import { FORMACOES, melhorOnze } from './formacao.js';
import { opcoesDraft, tirarEmprestimo } from './cartas.js';
import { iniciarTabuleiro, acabou, todosAcabaram } from './tabuleiro.js';
import { prepararJovem } from './negocios.js';
import { precoBase, precoDraft } from './valores.js';

const NOMES = { verao: 'de verão', inverno: 'de inverno' };

/** Abre a janela: devolve os emprestados, reinicia as marcas de ronda e pede a formação a todos. */
export function abrirJanela(sala, ctx, tipo) {
  for (const [id, d] of Object.entries(sala.jogadores)) {
    if (d.emprestado) transferir(sala, Number(id), null);
    else if (d.compradoRonda != null) delete d.compradoRonda;
  }
  sala.fase = 'janela';
  sala.janela = { tipo, fase: 'formacao', prontos: [], ronda: 0, trocas: [] };
  registar(sala, ctx, `Época ${sala.epoca}: abre a janela ${NOMES[tipo]}. Escolham a formação.`, { tipo: 'fase' });
}

export function escolherFormacao(sala, ctx, equipaId, formacao) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j.fase !== 'formacao') return erro('Já não é altura de escolher a formação.');
  if (!FORMACOES.includes(formacao)) return erro('Formação desconhecida.');
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

function iniciarDraft(sala, ctx) {
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

function prepararEscolha(sala, ctx) {
  const d = sala.janela.draft;
  libertar(sala, d.opcoes);
  d.opcoes = [];
  const atual = d.escolhas[d.i];
  if (!atual) return iniciarTabuleiro(sala, ctx, sala.janela.ordemJanela);
  const criterios = atual.tipo === 'jovem' ? [CONFIG.draft.jovem] : CONFIG.draft.extra;
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
    if (sala.equipas[equipaId].dinheiro < preco) return erro(`Precisas de ${M(preco)}.`);
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

/** Quem já completou as voltas marca que está pronto para fechar a janela. */
export function prontoFechar(sala, ctx, equipaId, pronto = true) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j.fase !== 'tabuleiro') return erro('Não estamos no tabuleiro.');
  if (!acabou(j, equipaId)) return erro('Completa primeiro as voltas.');
  j.prontos = j.prontos.filter((x) => x !== equipaId);
  if (pronto) j.prontos.push(equipaId);
  verificarFecho(sala, ctx);
  return { ok: true };
}

/** Fecha a janela quando todos completaram as voltas, estão prontos e não há nada por resolver. */
export function verificarFecho(sala, ctx) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j?.fase !== 'tabuleiro') return false;
  if (!todosAcabaram(j) || !j.ordem.every((id) => j.prontos.includes(id)) || j.leilao || j.contestacao || j.pendente) return false;
  abrirFecho(sala, ctx);
  return true;
}

/** O anfitrião fecha a janela (só quando não há nada por resolver). */
export function forcarFecho(sala, ctx) {
  const j = sala.janela;
  if (sala.fase !== 'janela' || j.fase !== 'tabuleiro') return erro('Não estamos no tabuleiro.');
  if (j.leilao || j.contestacao) return erro('Há um leilão ou um Empresário por resolver.');
  if (j.pendente?.jogador) libertar(sala, [j.pendente.jogador]);
  j.pendente = null;
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
  const { onze, sobram } = melhorOnze(todos, e.formacao);
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
  const { onze, sobram } = melhorOnze(jogadores, e.formacao);
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
  registar(sala, ctx, `A janela ${NOMES[sala.janela.tipo]} fecha.`, { tipo: 'fase' });
  sala.fase = 'campeonato';
  sala.campeonato = { volta: sala.janela.tipo === 'verao' ? 1 : 2 };
  sala.janela = null;
}
