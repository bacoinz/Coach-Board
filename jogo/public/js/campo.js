// O onze de uma equipa desenhado num campo: cada lugar da formação com a carta pequena do jogador.
import { posicao, miniCartaHTML } from './carta.js';

// Posição (x, y em %) de cada lugar, pela ordem de CONFIG.formacoes. O ataque é para cima.
const GR = [50, 89];
const QUATRO = [[12, 65], [37, 68], [63, 68], [88, 65]];
const TRES = [[22, 66], [50, 68], [78, 66]];
export const LUGARES = {
  '4-4-2': [GR, ...QUATRO, [12, 39], [37, 45], [63, 45], [88, 39], [35, 13], [65, 13]],
  '4-3-3': [GR, ...QUATRO, [25, 38], [50, 46], [75, 38], [15, 15], [50, 12], [85, 15]],
  '4-2-3-1': [GR, ...QUATRO, [30, 47], [70, 47], [15, 26], [50, 30], [85, 26], [50, 10]],
  '3-5-2': [GR, ...TRES, [10, 39], [50, 46], [30, 36], [70, 36], [90, 39], [35, 12], [65, 12]],
  '3-4-3': [GR, ...TRES, [12, 40], [37, 45], [63, 45], [88, 40], [15, 15], [50, 12], [85, 15]],
  '5-3-2': [GR, [8, 59], [28, 67], [50, 68], [72, 67], [92, 59], [25, 38], [50, 46], [75, 38], [35, 13], [65, 13]],
};

/**
 * @param {string} formacao
 * @param {{ posicao: string, jogador: number|null }[]} onze os 11 lugares, pela ordem da formação
 * @param {Record<number, object>} jogadores
 * @param {{ editavel?: boolean, selecionado?: number|null, validos?: Set<number> }} o na edição, cada lugar é um alvo de troca
 */
export function campoHTML(formacao, onze, jogadores, { editavel = false, selecionado = null, validos = null } = {}) {
  const coordenadas = LUGARES[formacao] ?? LUGARES['4-4-2'];
  const lugares = onze.map((l, i) => {
    const [x, y] = coordenadas[i];
    const j = l.jogador != null ? jogadores[l.jogador] : null;
    const conteudo = j ? miniCartaHTML(j) : `<div class="mini-carta mini-vazia">${posicao(l.posicao)}</div>`;
    if (editavel) {
      const classes = [i === selecionado ? 'selecionado' : '', validos?.has(i) ? 'valido' : '', validos && !validos.has(i) && i !== selecionado ? 'invalido' : ''].join(' ');
      const penalizado = j && l.overall != null && l.overall < j.overall ? `<span class="lugar-alt">${l.overall}</span>` : '';
      return `<button type="button" class="lugar lugar-editavel ${classes}" style="left:${x}%;top:${y}%" data-lugar="${i}">${conteudo}${penalizado}<span class="lugar-pos">${posicao(l.posicao)}</span></button>`;
    }
    return `<div class="lugar" style="left:${x}%;top:${y}%" ${j ? `data-jogador="${j.id}"` : ''}>${conteudo}</div>`;
  }).join('');
  return `<div class="campo-jogo">
    <div class="campo-linhas" aria-hidden="true"><i class="meio"></i><i class="circulo"></i><i class="area cima"></i><i class="area baixo"></i></div>
    ${lugares}
  </div>`;
}
