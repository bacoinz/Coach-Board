// Carta de jogador (retangular: a foto ocupa a carta e desvanece para a cor do nível; overall, posição, nome e 6 facetas)
// e a carta pequena usada no campo (só cara, nome e overall). A liga e o clube ficam para o detalhe do jogador.
import { CONFIG } from './comum/config.gen.js';
import { esc, dinheiro } from './util.js';

const NOMES_POS = CONFIG.posicoes.nome;
const FACETAS = ['VEL', 'REM', 'PAS', 'DRI', 'DEF', 'FÍS'];
const FACETAS_GR = ['MER', 'MÃO', 'PON', 'REF', 'VEL', 'POS'];

export const posicao = (p) => NOMES_POS[p] ?? p;

/** Nível da carta: bronze até 69, prata até 77, ouro até 87 (a brilhar de 84 a 87) e ciano a brilhar a partir de 88. */
export function nivel(overall) {
  if (overall >= 88) return 'ciano';
  if (overall >= 84) return 'ouro-brilho';
  if (overall >= 78) return 'ouro';
  if (overall >= 70) return 'prata';
  return 'bronze';
}

const SILHUETA = `<svg class="carta-silhueta" viewBox="0 0 56 70" aria-hidden="true"><circle cx="28" cy="22" r="13"/><path d="M4 70C6 46 16 40 28 40s22 6 24 30z"/></svg>`;

/** A cara do jogador: a foto do Commons por cima da silhueta (que fica à vista se não houver foto ou ela falhar). */
function cara(j, largura) {
  if (!j.foto) return SILHUETA;
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(j.foto)}?width=${largura}`;
  return `${SILHUETA}<img class="foto-jogador" src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
}

/** Etiquetas de estado do jogador: Formação, Emprestado, Só banca. */
function etiquetas(j) {
  return [
    j.formacao ? '<span class="carta-tag">Formação</span>' : '',
    j.emprestado ? '<span class="carta-tag">Emprestado</span>' : '',
    j.soBanca ? '<span class="carta-tag">Só banca</span>' : '',
  ].join('');
}

/**
 * @param {object} j jogador (vista do servidor)
 * @param {{ tamanho?: 'normal'|'grande'|'pequena' }} o
 */
export function cartaHTML(j, { tamanho = 'normal' } = {}) {
  const nomes = j.posicao === 'GK' ? FACETAS_GR : FACETAS;
  const facetas = (j.facetas ?? []).map((v, i) => `<span><b>${v}</b> ${nomes[i]}</span>`).join('');
  return `<article class="carta carta-${nivel(j.overall)} carta-${tamanho}" aria-label="${esc(j.nome)}, ${j.overall} ${posicao(j.posicao)}">
  <div class="carta-topo"><span class="carta-ovr">${j.overall}</span><span class="carta-pos">${posicao(j.posicao)}</span></div>
  <div class="carta-foto">${cara(j, 240)}</div>
  <div class="carta-tags">${etiquetas(j)}</div>
  <div class="carta-nome">${esc(j.curto)}</div>
  <div class="carta-facetas">${facetas}</div>
  <div class="carta-rodape">${j.bandeira ? `<img class="bandeira" src="/bandeiras/${esc(j.bandeira)}.svg" alt="" loading="lazy">` : ''}<span>${esc(j.nacao)}</span></div>
</article>`;
}

/** Carta pequena do campo: cara, nome e overall, com o valor por baixo. */
export function miniCartaHTML(j) {
  return `<article class="mini-carta carta-${nivel(j.overall)}">
    <span class="mini-carta-ovr">${j.overall}</span>
    <div class="mini-carta-foto">${cara(j, 120)}</div>
    <span class="mini-carta-nome">${esc(j.curto)}</span>
    ${j.formacao ? '<span class="mini-carta-tag">Form.</span>' : ''}
  </article>
  <span class="mini-carta-valor">${dinheiro(j.valor)}</span>`;
}
