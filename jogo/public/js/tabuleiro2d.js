// Tabuleiro de mercado em 2D (as casas à volta de uma grelha, como no Monopólio). O 3D chega no passo 6.
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
  misterio: 'Mistério',
  investigacao: 'Investigação',
  sad: 'SAD',
};
// Para tabuleiros pequenos (telemóvel).
const CURTOS = { inicio: 'Início', mercado: 'Merc.', rede: 'Rede', empresario: 'Emp.', medico: 'Méd.', patrocinio: 'Patr.', jovens: 'Jovens', misterio: 'Mist.', investigacao: 'Invest.', sad: 'SAD' };

// Cada lado tem um canto e as casas até ao canto seguinte: 36 casas dão uma grelha de 10×10.
const LADO = CASAS.length / 4;

/** Linha e coluna de uma casa: 0 no canto de baixo à direita, a andar no sentido dos ponteiros. */
function posicaoGrelha(i) {
  const n = LADO + 1;
  if (i <= LADO) return [n, n - i];
  if (i <= 2 * LADO) return [n - (i - LADO), 1];
  if (i <= 3 * LADO) return [1, i - 2 * LADO + 1];
  return [i - 3 * LADO + 1, n];
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
    const canto = i % LADO === 0 ? ' casa-canto' : '';
    const aqui = (fichas.get(i) ?? [])
      .map((id) => {
        const e = equipas[id];
        return `<span class="ficha${id === vez ? ' ficha-vez' : ''}" style="--c1:${e.kit.principal};--c2:${e.kit.secundaria}" title="${esc(e.nome)}"></span>`;
      })
      .join('');
    return `<div class="casa casa-${tipo}${canto}" style="grid-area:${linha}/${coluna}" title="${i}. ${ROTULOS[tipo]}">
      <span class="casa-rotulo"><span class="longo">${ROTULOS[tipo]}</span><span class="curto">${CURTOS[tipo]}</span></span><span class="fichas">${aqui}</span></div>`;
  }).join('');
  return `<div class="tabuleiro" style="--celas:${LADO + 1}">${casas}<div class="tabuleiro-centro">${centro}</div></div>`;
}

const PONTOS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

export function dadoHTML(n) {
  const pontos = Array.from({ length: 9 }, (_, i) => `<i${PONTOS[n]?.includes(i + 1) ? ' class="p"' : ''}></i>`).join('');
  return `<span class="dado" aria-label="${n}">${pontos}</span>`;
}
