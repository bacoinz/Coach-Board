// Desenha o equipamento de uma equipa em SVG: camisola com padrão, duas cores, marca e patrocínio.
// Enquanto não houver logótipos (assets/marcas, assets/patrocinios), a marca e o patrocínio aparecem em texto.

export const PADROES = [
  { id: 'liso', nome: 'Liso', curto: 'Liso' },
  { id: 'riscas-v', nome: 'Riscas verticais', curto: 'Verticais' },
  { id: 'riscas-h', nome: 'Riscas horizontais', curto: 'Horizontais' },
  { id: 'faixa', nome: 'Faixa', curto: 'Faixa' },
  { id: 'metades', nome: 'Metades', curto: 'Metades' },
];

// Contorno da camisola (viewBox 0 0 100 100): corpo, mangas e gola.
const CAMISOLA = 'M30 10 L40 6 Q50 12 60 6 L70 10 L92 24 L84 40 L74 35 L74 94 L26 94 L26 35 L16 40 L8 24 Z';

let contador = 0;

const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Cor do texto (marca, patrocínio) que se lê melhor sobre a cor principal. */
function corTexto(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? '#111111' : '#ffffff';
}

function padrao(tipo, secundaria) {
  switch (tipo) {
    case 'riscas-v':
      return [22, 36, 50, 64].map((x) => `<rect x="${x}" y="0" width="7" height="100" fill="${secundaria}"/>`).join('');
    case 'riscas-h':
      return [26, 44, 62, 80].map((y) => `<rect x="0" y="${y}" width="100" height="8" fill="${secundaria}"/>`).join('');
    case 'faixa':
      return `<path d="M20 20 L36 20 L84 94 L68 94 Z" fill="${secundaria}"/>`;
    case 'metades':
      return `<rect x="50" y="0" width="50" height="100" fill="${secundaria}"/>`;
    default:
      return '';
  }
}

/**
 * @param {{ padrao?: string, principal?: string, secundaria?: string, marca?: string, patrocinio?: string, tamanho?: number }} e
 * @returns {string} SVG
 */
export function equipamentoSVG({ padrao: tipo = 'liso', principal = '#c49a6c', secundaria = '#3d241d', marca = '', patrocinio = '', tamanho = 120 } = {}) {
  const id = `cam-${++contador}`;
  const texto = corTexto(principal);
  return `<svg class="equipamento" viewBox="0 0 100 100" width="${tamanho}" height="${tamanho}" role="img" aria-label="Equipamento">
  <defs><clipPath id="${id}"><path d="${CAMISOLA}"/></clipPath></defs>
  <g clip-path="url(#${id})">
    <rect width="100" height="100" fill="${principal}"/>
    ${padrao(tipo, secundaria)}
    <path d="M40 6 Q50 12 60 6 L58 4 Q50 9 42 4 Z" fill="${secundaria}"/>
  </g>
  <path d="${CAMISOLA}" fill="none" stroke="#0008" stroke-width="1.5" stroke-linejoin="round"/>
  ${marca ? `<text x="62" y="26" font-size="5" font-family="Inter, sans-serif" font-weight="800" fill="${texto}" text-anchor="middle" paint-order="stroke" stroke="${principal}" stroke-width="1.2">${escapar(marca)}</text>` : ''}
  ${patrocinio ? `<text x="50" y="54" font-size="7.5" font-family="Anton, Impact, sans-serif" fill="${texto}" text-anchor="middle" paint-order="stroke" stroke="${principal}" stroke-width="2" textLength="${Math.min(44, patrocinio.length * 5)}" lengthAdjust="spacingAndGlyphs">${escapar(patrocinio.toUpperCase())}</text>` : ''}
</svg>`;
}
