// Desenha o equipamento de uma equipa em SVG: camisola com padrão, duas cores, marca e patrocínio.
// A marca e o patrocínio aparecem em texto; os logos (assets/marcas, assets/patrocinios) ficam para as cartas e o rodapé.

export const PADROES = [
  { id: 'liso', nome: 'Liso', curto: 'Liso' },
  { id: 'riscas-v', nome: 'Riscas verticais', curto: 'Verticais' },
  { id: 'riscas-h', nome: 'Riscas horizontais', curto: 'Horizontais' },
  { id: 'faixa', nome: 'Faixa', curto: 'Faixa' },
  { id: 'metades', nome: 'Metades', curto: 'Metades' },
  { id: 'mangas', nome: 'Mangas de outra cor', curto: 'Mangas' },
];

// A camisola (viewBox 0 0 100 100): corpo, manga do lado esquerdo (a direita é o espelho), punho e gola.
const CORPO = 'M34 14 L41 10 Q50 17 59 10 L66 14 L71 36 V90 Q50 95 29 90 V36 Z';
const MANGA = 'M34 14 L9 33 Q7 35 8.5 37.5 L17 50 Q18.5 52 20.5 50.5 L29 44 V36 Z';
const PUNHO = 'M9 33 Q7 35 8.5 37.5 L17 50 Q18.5 52 20.5 50.5 L24 47.8 L12.6 30.300 Z';
const COSTAS = 'M41 10 Q50 6 59 10 Q50 17 41 10 Z';
const GOLA_COSTAS = 'M41 10 Q50 6 59 10 L57.500 11.500 Q50 8.500 42.500 11.500 Z';
const GOLA = 'M41 10 Q50 17 59 10 L61.500 11.300 Q50 23 38.500 11.300 Z';
const ESPELHO = 'transform="translate(100 0) scale(-1 1)"';

let contador = 0;

const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Cor do texto (marca, patrocínio) que se lê melhor sobre a cor principal. */
function corTexto(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? '#111111' : '#ffffff';
}

/** O desenho do corpo, simétrico e só dentro da camisola. */
function padrao(tipo, secundaria) {
  switch (tipo) {
    case 'liso':
      // Duas riscas de lado, de baixo das mangas até ao fundo.
      return `<path d="M29 36 H34.500 V96 H29 Z M65.500 36 H71 V96 H65.500 Z" fill="${secundaria}"/>`;
    case 'riscas-v':
      return [35, 47, 59].map((x) => `<rect x="${x}" y="0" width="6" height="100" fill="${secundaria}"/>`).join('');
    case 'riscas-h':
      return [25, 39, 53, 67, 81].map((y) => `<rect x="0" y="${y}" width="100" height="7" fill="${secundaria}"/>`).join('');
    case 'faixa':
      return `<path d="M58 8 L74 24 L38 98 L20 98 Z" fill="${secundaria}"/>`;
    case 'metades':
      return `<rect x="50" y="0" width="50" height="100" fill="${secundaria}"/>`;
    default:
      return '';
  }
}

/** Manga e punho de um lado. */
function manga(cor, punho, espelho = false) {
  return `<g ${espelho ? ESPELHO : ''}><path d="${MANGA}" fill="${cor}"/><path d="${PUNHO}" fill="${punho}"/></g>`;
}

/**
 * @param {{ padrao?: string, principal?: string, secundaria?: string, marca?: string, patrocinio?: string, tamanho?: number }} e
 * @returns {string} SVG
 */
export function equipamentoSVG({ padrao: tipo = 'liso', principal = '#c49a6c', secundaria = '#3d241d', marca = '', patrocinio = '', tamanho = 120 } = {}) {
  const n = ++contador;
  const texto = corTexto(principal);
  const mangaOutra = tipo === 'mangas';
  const metades = tipo === 'metades';
  const [corEsq, corDir] = mangaOutra ? [secundaria, secundaria] : metades ? [principal, secundaria] : [principal, principal];
  const [punhoEsq, punhoDir] = mangaOutra ? [principal, principal] : metades ? [secundaria, principal] : [secundaria, secundaria];
  return `<svg class="equipamento" viewBox="4 3 92 94" width="${tamanho}" height="${tamanho}" role="img" aria-label="Equipamento">
  <defs>
    <clipPath id="cam-${n}"><path d="${CORPO}"/></clipPath>
    <linearGradient id="luz-${n}" x1="0" x2="1" y1="0" y2="0"><stop offset="0.28" stop-color="#000" stop-opacity=".3"/><stop offset="0.4" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity=".12"/><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="0.72" stop-color="#000" stop-opacity=".3"/></linearGradient>
  </defs>
  <path d="${COSTAS}" fill="${principal}"/><path d="${COSTAS}" fill="#000" opacity=".45"/>
  <path d="${GOLA_COSTAS}" fill="${secundaria}"/>
  ${manga(corEsq, punhoEsq)}${manga(corDir, punhoDir, true)}
  <g clip-path="url(#cam-${n})">
    <rect width="100" height="100" fill="${principal}"/>
    ${padrao(tipo, secundaria)}
    <rect width="100" height="100" fill="url(#luz-${n})"/>
    <path d="M29 86.500 Q50 91.500 71 86.500" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".8"/>
  </g>
  <path d="${GOLA}" fill="${secundaria}" stroke="#000" stroke-opacity=".35" stroke-width=".6"/>
  <path d="M34 14 L29 36 V44 M66 14 L71 36 V44" fill="none" stroke="#000" stroke-opacity=".4" stroke-width=".8"/>
  <path d="M41 10 L34 14 L9 33 Q7 35 8.500 37.500 L17 50 Q18.500 52 20.500 50.500 L29 44 V90 Q50 95 71 90 V44 L79.500 50.500 Q81.500 52 83 50 L91.500 37.500 Q93 35 91 33 L66 14 L59 10" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="1.1" stroke-linejoin="round"/>
  ${marca ? `<text x="61" y="30" font-size="4.500" font-family="Inter, sans-serif" font-weight="800" fill="${texto}" text-anchor="middle" paint-order="stroke" stroke="${principal}" stroke-width="1.200">${escapar(marca)}</text>` : ''}
  ${patrocinio ? `<text x="50" y="54" font-size="7.500" font-family="Anton, Impact, sans-serif" fill="${texto}" text-anchor="middle" paint-order="stroke" stroke="${principal}" stroke-width="2" textLength="${Math.min(36, patrocinio.length * 5)}" lengthAdjust="spacingAndGlyphs">${escapar(patrocinio.toUpperCase())}</text>` : ''}
</svg>`;
}

/** O emblema do clube: o que foi enviado ou, enquanto não houver, um escudo com as cores e as iniciais. */
export function emblemaSVG({ nome = '', kit = {}, emblema = null }, tamanho = 40) {
  if (emblema) return `<img class="emblema" src="${escapar(emblema)}" alt="" width="${tamanho}" height="${tamanho}">`;
  const { principal = '#c49a6c', secundaria = '#3d241d' } = kit;
  const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return `<svg class="emblema" viewBox="0 0 100 100" width="${tamanho}" height="${tamanho}" role="img" aria-label="Emblema">
  <path d="M50 4 L90 16 V52 C90 76 70 90 50 97 C30 90 10 76 10 52 V16 Z" fill="${principal}" stroke="${secundaria}" stroke-width="6"/>
  <text x="50" y="62" font-family="Anton, Impact, sans-serif" font-size="36" text-anchor="middle" fill="${corTexto(principal)}">${escapar(iniciais)}</text>
</svg>`;
}
