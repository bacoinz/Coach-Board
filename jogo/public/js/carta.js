// Carta de jogador (estilo das cartas do Ultimate Team: escudo, overall, posição, foto, nome e 6 facetas)
// e a linha compacta usada nas listas de plantéis.
import { CONFIG } from './comum/config.gen.js';
import { esc, dinheiro } from './util.js';

const NOMES_POS = CONFIG.posicoes.nome;
const FACETAS = ['VEL', 'REM', 'PAS', 'DRI', 'DEF', 'FÍS'];
const FACETAS_GR = ['MER', 'MÃO', 'PON', 'REF', 'VEL', 'POS'];

export const posicao = (p) => NOMES_POS[p] ?? p;

/** Nível da carta pela cor: bronze, prata, ouro e ouro raro. */
export function nivel(overall) {
  if (overall >= 85) return 'raro';
  if (overall >= 75) return 'ouro';
  if (overall >= 65) return 'prata';
  return 'bronze';
}

const SILHUETA = `<svg class="carta-silhueta" viewBox="0 0 56 70" aria-hidden="true"><circle cx="28" cy="22" r="13"/><path d="M4 70C6 46 16 40 28 40s22 6 24 30z"/></svg>`;

/**
 * @param {object} j jogador (vista do servidor)
 * @param {{ tamanho?: 'normal'|'grande'|'pequena', extra?: string }} o
 */
export function cartaHTML(j, { tamanho = 'normal', extra = '' } = {}) {
  const nomes = j.posicao === 'GK' ? FACETAS_GR : FACETAS;
  const facetas = (j.facetas ?? []).map((v, i) => `<span><b>${v}</b> ${nomes[i]}</span>`).join('');
  const marcas = [
    j.formacao ? '<span class="carta-marca" title="Formação">F</span>' : '',
    j.emprestado ? '<span class="carta-marca" title="Emprestado">E</span>' : '',
    j.soBanca ? '<span class="carta-marca" title="Só pode ser vendido à banca">B</span>' : '',
  ].join('');
  return `<article class="carta carta-${nivel(j.overall)} carta-${tamanho}" aria-label="${esc(j.nome)}, ${j.overall} ${posicao(j.posicao)}">
  <div class="carta-topo"><span class="carta-ovr">${j.overall}</span><span class="carta-pos">${posicao(j.posicao)}</span>${marcas}</div>
  <div class="carta-foto">${SILHUETA}</div>
  <div class="carta-nome">${esc(j.curto)}</div>
  <div class="carta-facetas">${facetas}</div>
  <div class="carta-rodape">${esc(j.nacao)}<br>${esc(j.liga)}</div>
  ${extra}
</article>`;
}

/** Linha compacta de um jogador numa lista. */
export function linhaJogador(j, { acoes = '', onze = null } = {}) {
  const alt = j.alternativas?.length ? ` <small>${j.alternativas.map(posicao).join(' ')}</small>` : '';
  const etiquetas = [
    onze ? `<span class="tag tag-onze" title="No onze">${posicao(onze)}</span>` : '',
    j.formacao ? '<span class="tag" title="Formação">Formação</span>' : '',
    j.emprestado ? '<span class="tag" title="Emprestado">Emprestado</span>' : '',
    j.soBanca ? '<span class="tag" title="Só pode ser vendido à banca">Só banca</span>' : '',
    j.inflacionada ? '<span class="tag" title="Cláusula inflacionada pelo Empresário">2×</span>' : '',
  ].join('');
  return `<li class="linha-jog" data-jogador="${j.id}">
  <span class="mini-ovr mini-${nivel(j.overall)}">${j.overall}</span>
  <span class="linha-pos">${posicao(j.posicao)}</span>
  <span class="linha-nome"><strong>${esc(j.curto)}</strong>${alt}<small class="linha-sub">${j.idade} anos · ${esc(j.nacao)}</small></span>
  <span class="linha-tags">${etiquetas}</span>
  <span class="linha-valor">${dinheiro(j.valor)}</span>
  ${acoes}
</li>`;
}
