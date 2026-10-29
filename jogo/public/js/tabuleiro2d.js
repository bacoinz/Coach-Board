// Tabuleiro de mercado em 2D (40 casas à volta de uma grelha 11×11, como no Monopólio). O 3D chega no passo 6.
import { CONFIG } from './comum/config.gen.js';
import { esc } from './util.js';

const CASAS = CONFIG.tabuleiro.casas;
const ROTULOS = {
  inicio: 'Início',
  mercado: 'Mercado',
  rede: 'Rede',
  empresario: 'Empresário',
  medico: 'Médico',
  patrocinio: 'Patrocínio',
  jovens: 'Jovens Talentos',
};
// Para tabuleiros pequenos (telemóvel).
const CURTOS = { inicio: 'Início', mercado: 'Merc.', rede: 'Rede', empresario: 'Emp.', medico: 'Méd.', patrocinio: 'Patr.', jovens: 'Jovens' };

/** Linha e coluna (1–11) de uma casa: 0 no canto de baixo à direita, a andar no sentido dos ponteiros. */
function posicaoGrelha(i) {
  if (i <= 10) return [11, 11 - i];
  if (i <= 20) return [11 - (i - 10), 1];
  if (i <= 30) return [1, i - 19];
  return [i - 29, 11];
}

/**
 * @param {object} o
 * @param {Record<string, number>|null} o.posicoes casa de cada equipa
 * @param {Record<string, object>} o.equipas
 * @param {string|null} o.vez equipa com a vez
 * @param {string} o.centro HTML do centro (dados, vez)
 */
export function tabuleiroHTML({ posicoes, equipas, vez, centro }) {
  const fichas = new Map();
  for (const [id, casa] of Object.entries(posicoes ?? {})) {
    if (!fichas.has(casa)) fichas.set(casa, []);
    fichas.get(casa).push(id);
  }
  const casas = CASAS.map((tipo, i) => {
    const [linha, coluna] = posicaoGrelha(i);
    const canto = i % 10 === 0 ? ' casa-canto' : '';
    const aqui = (fichas.get(i) ?? [])
      .map((id) => {
        const e = equipas[id];
        return `<span class="ficha${id === vez ? ' ficha-vez' : ''}" style="--c1:${e.kit.principal};--c2:${e.kit.secundaria}" title="${esc(e.nome)}"></span>`;
      })
      .join('');
    return `<div class="casa casa-${tipo}${canto}" style="grid-area:${linha}/${coluna}" title="${i}. ${ROTULOS[tipo]}">
      <span class="casa-rotulo"><span class="longo">${ROTULOS[tipo]}</span><span class="curto">${CURTOS[tipo]}</span></span><span class="fichas">${aqui}</span></div>`;
  }).join('');
  return `<div class="tabuleiro">${casas}<div class="tabuleiro-centro">${centro}</div></div>`;
}

const PONTOS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

export function dadoHTML(n) {
  const pontos = Array.from({ length: 9 }, (_, i) => `<i${PONTOS[n]?.includes(i + 1) ? ' class="p"' : ''}></i>`).join('');
  return `<span class="dado" aria-label="${n}">${pontos}</span>`;
}
