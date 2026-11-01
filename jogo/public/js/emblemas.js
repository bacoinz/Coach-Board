// O criador de emblemas: fazer um de raiz (escudo, padrão, símbolo e letras) ou carregar uma imagem, sozinha ou dentro
// de um escudo. O resultado é sempre uma imagem quadrada, feita aqui no cliente e enviada ao servidor.
import { CONFIG } from './comum/config.gen.js';
import { esc } from './util.js';
import { botaoCor } from './seletor-cor.js';

const circulo = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

const FORMAS = {
  classico: 'M50 4L90 16V52C90 76 70 90 50 97C30 90 10 76 10 52V16Z',
  heraldico: 'M10 8H90V50C90 72 70 88 50 97C30 88 10 72 10 50Z',
  coroado: 'M10 10Q30 16 50 6Q70 16 90 10V56C90 78 68 90 50 97C32 90 10 78 10 56Z',
  largo: 'M14 6H86L93 30C93 62 72 84 50 96C28 84 7 62 7 30Z',
  redondo: circulo(50, 50, 46),
  hexagono: 'M50 4L90 27V73L50 96L10 73V27Z',
};

const PADROES = {
  liso: '',
  metades: 'M50 0H100V100H50Z',
  verticais: 'M20 0H32V100H20ZM44 0H56V100H44ZM68 0H80V100H68Z',
  horizontais: 'M0 20H100V32H0ZM0 44H100V56H0ZM0 68H100V80H0Z',
  faixa: 'M0 22L22 0H42L0 42ZM0 72L72 0H100V8L8 100H0ZM58 100L100 58V78L78 100Z',
  quartos: 'M0 0H50V50H0ZM50 50H100V100H50Z',
  divisa: 'M0 28L50 60L100 28V50L50 82L0 50Z',
};
const NOMES_PADROES = { liso: 'Liso', metades: 'Metades', verticais: 'Verticais', horizontais: 'Horizontais', faixa: 'Faixas', quartos: 'Quartos', divisa: 'Divisa' };

/** Uma bola de futebol a sério: pentágono ao centro, cinco manchas na orla e as costuras entre eles. */
function bolaDeFutebol() {
  const ponto = (r, graus) => {
    const a = (graus * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`;
  };
  const angulos = [0, 1, 2, 3, 4].map((k) => -90 + 72 * k);
  const centro = `M${angulos.map((a) => ponto(16, a)).join('L')}Z`;
  const manchas = angulos.map((a) => `M${ponto(30, a)}L${ponto(37, a - 15)}L${ponto(45, a - 11)}L${ponto(45, a + 11)}L${ponto(37, a + 15)}Z`).join('');
  const costuras = angulos.map((a) => `M${ponto(16, a)}L${ponto(30, a)}M${ponto(37, a + 15)}L${ponto(30, a + 36)}L${ponto(37, a + 57)}M${ponto(30, a + 36)}L${ponto(16, a + 36)}`).join('');
  return [
    { d: circulo(50, 50, 46) },
    { linha: costuras, largura: 2.4, tom: 'fundo' },
    { d: centro + manchas, tom: 'fundo' },
  ];
}

// As partes com `tom: 'fundo'` ficam da cor de fundo do emblema, para se distinguirem do símbolo.
const SIMBOLOS = {
  estrela: [{ d: 'M50 6L62 38H96L68 59L79 93L50 72L21 93L32 59L4 38H38Z' }],
  bola: bolaDeFutebol(),
  coroa: [{ d: 'M8 26L30 52L50 16L70 52L92 26L84 82H16Z' }],
  raio: [{ d: 'M62 4L18 56H46L36 96L84 38H54Z' }],
  castelo: [{ d: 'M12 92V24H26V36H38V24H62V36H74V24H88V92H62V70a12 12 0 0 0-24 0V92Z' }],
  ancora: [{ linha: `${circulo(50, 15, 9)}M50 24V90M30 38H70M12 58C14 78 34 90 50 90C66 90 86 78 88 58`, largura: 8 }],
  arvore: [{ d: 'M50 4L76 38H62L84 66H58V95H42V66H16L38 38H24Z' }],
  taca: [{ d: 'M30 6H70V13H88V28C88 41 77 49 67 49C64 56 59 60 55 62V74H67V90H33V74H45V62C41 60 36 56 33 49C23 49 12 41 12 28V13H30ZM21 22V28C21 34 25 38 30 40C30 34 30 28 30 22ZM79 22H70C70 28 70 34 70 40C75 38 79 34 79 28Z' }],
  aguia: [{ d: 'M50 22C45 22 42 27 42 33L4 16C7 36 19 50 36 54L31 62H17L29 72L40 69L42 86L50 96L58 86L60 69L71 72L83 62H69L64 54C81 50 93 36 96 16L58 33C58 31 58 29 57 27L64 24L55 23C54 22 52 22 50 22Z' }],
  touro: [
    { d: 'M29 40C29 30 39 26 50 26C61 26 71 30 71 40C71 56 62 68 59 82C56 91 44 91 41 82C38 68 29 56 29 40Z' },
    { d: 'M31 37C17 36 6 25 7 6C13 18 24 23 38 26Z' },
    { d: 'M69 37C83 36 94 25 93 6C87 18 76 23 62 26Z' },
    { d: `${circulo(40, 45, 4)}${circulo(60, 45, 4)}`, tom: 'fundo' },
  ],
  flor: [
    { d: 'M50 3C62 19 63 38 56 55H44C37 38 38 19 50 3Z' },
    { d: 'M38 56C20 62 5 50 7 35C9 24 22 22 28 31C21 33 20 42 26 46C31 49 36 46 41 50Z' },
    { d: 'M62 56C80 62 95 50 93 35C91 24 78 22 72 31C79 33 80 42 74 46C69 49 64 46 59 50Z' },
    { d: 'M26 58H74V67H26Z' },
    { d: 'M43 69H57L62 92L50 84L38 92Z' },
  ],
  espadas: [
    { linha: 'M20 8L78 80M80 8L22 80', largura: 7 },
    { linha: 'M60 74L84 60M40 74L16 60M72 76L84 92M28 76L16 92', largura: 7 },
  ],
  chama: [{ d: 'M53 3C57 23 80 34 81 62C82 83 67 97 50 97C33 97 18 83 19 62C20 48 30 39 35 28C38 39 41 44 46 45C51 32 46 18 53 3ZM50 90C60 90 66 82 65 73C64 63 54 58 52 47C46 56 35 62 35 74C35 83 41 90 50 90Z' }],
  coracao: [{ d: 'M50 92C20 67 6 51 6 32C6 18 17 8 30 8C39 8 46 13 50 21C54 13 61 8 70 8C83 8 94 18 94 32C94 51 80 67 50 92Z' }],
  trevo: [
    { d: circulo(50, 28, 19) },
    { d: circulo(27, 52, 19) },
    { d: circulo(73, 52, 19) },
    { d: circulo(50, 50, 10) },
    { linha: 'M50 54C50 70 56 82 66 94', largura: 7 },
  ],
  lua: [{ d: 'M68 8A44 44 0 1 0 68 92A30 44 0 0 1 68 8Z' }],
  sol: [
    { d: circulo(50, 50, 23) },
    { linha: 'M50 6V18M50 82V94M6 50H18M82 50H94M19 19L27.500 27.500M72.500 72.500L81 81M19 81L27.500 72.500M72.500 27.500L81 19', largura: 7 },
  ],
  montanha: [{ d: 'M3 88L36 24L52 54L65 34L97 88Z' }],
  onda: [{ linha: 'M6 30C18 16 30 16 40 30S62 44 72 30S86 18 94 26M6 56C18 42 30 42 40 56S62 70 72 56S86 44 94 52M6 82C18 68 30 68 40 82S62 96 72 82S86 70 94 78', largura: 8 }],
  peixe: [
    { d: 'M5 50C21 23 56 19 74 45L95 26V74L74 55C56 81 21 77 5 50Z' },
    { d: circulo(28, 44, 5), tom: 'fundo' },
  ],
  navio: [
    { d: 'M8 64H92L77 90H23Z' },
    { d: 'M46 6V58H13Z' },
    { d: 'M54 18V58H84Z' },
  ],
  cruz: [{ d: 'M39 5H61V32H89V54H61V95H39V54H11V32H39Z' }],
};
const NOMES_SIMBOLOS = { nenhum: 'Nenhum', bola: 'Bola', estrela: 'Estrela', coroa: 'Coroa', taca: 'Taça', aguia: 'Águia', touro: 'Touro', flor: 'Flor-de-lis', espadas: 'Espadas', castelo: 'Castelo', raio: 'Raio', chama: 'Chama', coracao: 'Coração', trevo: 'Trevo', lua: 'Lua', sol: 'Sol', montanha: 'Montanha', onda: 'Ondas', peixe: 'Peixe', navio: 'Navio', ancora: 'Âncora', arvore: 'Árvore', cruz: 'Cruz' };

let o = null; // as escolhas do emblema aberto
let aoGuardar = null;
let dialogo = null;
let temEmblema = false;

function corContraste(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? '#111111' : '#ffffff';
}

function desenharSimbolo(c, x, y, tamanho) {
  const k = tamanho / 100;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  for (const { d, linha, largura, tom } of SIMBOLOS[o.simbolo]) {
    const cor = tom === 'fundo' ? o.cor1 : o.corSimbolo;
    if (d) {
      c.fillStyle = cor;
      c.fill(new Path2D(d), 'evenodd');
    }
    if (linha) {
      c.strokeStyle = cor;
      c.lineWidth = largura;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.stroke(new Path2D(linha));
    }
  }
  c.restore();
}

function desenharLetras(c, x, y, tamanho, larguraMax) {
  let t = tamanho;
  do {
    c.font = `400 ${t}px Anton, Impact, sans-serif`;
    if (c.measureText(o.letras).width <= larguraMax) break;
    t -= 1;
  } while (t > 8);
  c.fillStyle = o.corSimbolo;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(o.letras, x, y);
}

/** A imagem carregada, inteira, centrada e com a escala escolhida. */
function desenharImagem(c, escala) {
  const { imagem } = o;
  const w = imagem.naturalWidth || 100;
  const h = imagem.naturalHeight || 100;
  const k = (100 * escala) / Math.max(w, h);
  c.drawImage(imagem, 50 - (w * k) / 2, 50 - (h * k) / 2, w * k, h * k);
}

function desenharEmblema(c, S) {
  c.clearRect(0, 0, S, S);
  c.save();
  c.scale(S / 100, S / 100);
  const emImagem = o.modo === 'imagem';
  if (emImagem && o.soImagem) {
    if (o.imagem) desenharImagem(c, 1);
    c.restore();
    return;
  }
  const forma = new Path2D(FORMAS[o.forma]);
  c.save();
  c.clip(forma);
  c.fillStyle = o.cor1;
  c.fillRect(0, 0, 100, 100);
  if (emImagem) {
    if (o.imagem) desenharImagem(c, o.escala);
  } else if (PADROES[o.padrao]) {
    c.fillStyle = o.cor2;
    c.fill(new Path2D(PADROES[o.padrao]));
  }
  // Um pouco de luz em cima, para não ficar chapado.
  if (!emImagem) {
    const luz = c.createLinearGradient(0, 0, 0, 100);
    luz.addColorStop(0, '#ffffff2e');
    luz.addColorStop(0.55, '#ffffff00');
    luz.addColorStop(1, '#00000026');
    c.fillStyle = luz;
    c.fillRect(0, 0, 100, 100);
  }
  c.restore();
  c.strokeStyle = o.contorno;
  c.lineWidth = 5;
  c.lineJoin = 'round';
  c.stroke(forma);
  if (!emImagem) {
    c.shadowColor = '#0007';
    c.shadowBlur = 2 * (S / 100);
    c.shadowOffsetY = 0.6 * (S / 100);
    const comSimbolo = o.simbolo !== 'nenhum';
    if (comSimbolo && o.letras) {
      desenharSimbolo(c, 28, 15, 44);
      desenharLetras(c, 50, 74, 24, 56);
    } else if (comSimbolo) desenharSimbolo(c, 22, 20, 56);
    else if (o.letras) desenharLetras(c, 50, 50, 40, 66);
  }
  c.restore();
}

function redesenhar() {
  desenharEmblema(dialogo.querySelector('#emblema-previa').getContext('2d'), 256);
}

// --- O diálogo ---

const opcao = (campo, valor, conteudo, titulo) => `<button class="segmento emblema-opcao" type="button" role="radio" aria-checked="${o[campo] === valor}" data-emblema="${campo}" data-valor="${valor}" title="${titulo}" aria-label="${titulo}">${conteudo}</button>`;
const svg = (corpo) => `<svg viewBox="0 0 100 100" width="34" height="34" aria-hidden="true">${corpo}</svg>`;

const opcoesFormas = () => `<p class="rotulo">Escudo</p><div class="emblema-opcoes" role="radiogroup" aria-label="Escudo">${Object.entries(FORMAS).map(([id, d]) => opcao('forma', id, svg(`<path d="${d}" fill="currentColor"/>`), id)).join('')}</div>`;

const cor = (campo, texto) => botaoCor(o[campo], texto, `data-emblema-cor="${campo}"`);

function iconeSimbolo(id) {
  if (id === 'nenhum') return svg('<path d="M20 20L80 80M80 20L20 80" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>');
  return svg(SIMBOLOS[id].map(({ d, linha, largura, tom }) => {
    const c = tom === 'fundo' ? '#0b2016' : 'currentColor';
    return (d ? `<path d="${d}" fill="${c}" fill-rule="evenodd"/>` : '') + (linha ? `<path d="${linha}" fill="none" stroke="${c}" stroke-width="${largura}" stroke-linecap="round"/>` : '');
  }).join(''));
}

function controlosCriar() {
  return `${opcoesFormas()}
    <p class="rotulo">Padrão</p>
    <div class="emblema-opcoes" role="radiogroup" aria-label="Padrão">${Object.entries(PADROES).map(([id, d]) => opcao('padrao', id, svg(`<rect width="100" height="100" fill="currentColor" opacity=".35"/><path d="${d}" fill="currentColor"/>`), NOMES_PADROES[id])).join('')}</div>
    <p class="rotulo">Cores</p>
    <div class="cores">${cor('cor1', 'Fundo')}${cor('cor2', 'Padrão')}${cor('contorno', 'Contorno')}${cor('corSimbolo', 'Símbolo')}</div>
    <p class="rotulo">Símbolo</p>
    <div class="emblema-opcoes" role="radiogroup" aria-label="Símbolo">${Object.keys(NOMES_SIMBOLOS).map((id) => opcao('simbolo', id, iconeSimbolo(id), NOMES_SIMBOLOS[id])).join('')}</div>
    <label class="rotulo" for="emblema-letras">Letras</label>
    <input id="emblema-letras" class="campo" maxlength="4" value="${esc(o.letras)}" placeholder="Sem letras">`;
}

function controlosImagem() {
  return `<label class="btn btn-contorno emblema-ficheiro">${o.imagem ? 'Trocar imagem' : 'Escolher imagem'}<input id="emblema-ficheiro" type="file" accept="image/*" hidden></label>
    <div class="segmentos" role="radiogroup" aria-label="Como usar a imagem">
      <button class="segmento" type="button" role="radio" aria-checked="${o.soImagem}" data-emblema="soImagem" data-valor="1">Só a imagem</button>
      <button class="segmento" type="button" role="radio" aria-checked="${!o.soImagem}" data-emblema="soImagem" data-valor="">Dentro de um escudo</button>
    </div>
    ${o.soImagem ? '' : `${opcoesFormas()}
      <p class="rotulo">Cores</p>
      <div class="cores">${cor('cor1', 'Fundo')}${cor('contorno', 'Contorno')}</div>
      <label class="rotulo" for="emblema-escala">Tamanho da imagem</label>
      <input id="emblema-escala" class="slider" type="range" min="0.3" max="1.8" step="0.02" value="${o.escala}">`}`;
}

function desenharDialogo() {
  dialogo.innerHTML = `
    <div class="dialogo-cabecalho"><h2 class="titulo titulo-medio">Emblema</h2><button class="btn-fechar" type="button" data-fechar aria-label="Fechar">×</button></div>
    <div class="dialogo-corpo">
      <div class="segmentos" role="radiogroup" aria-label="Como fazer o emblema">
        <button class="segmento" type="button" role="radio" aria-checked="${o.modo === 'criar'}" data-emblema="modo" data-valor="criar">Criar emblema</button>
        <button class="segmento" type="button" role="radio" aria-checked="${o.modo === 'imagem'}" data-emblema="modo" data-valor="imagem">Carregar imagem</button>
      </div>
      <div class="emblema-editor">
        <div class="emblema-previa"><canvas id="emblema-previa" width="256" height="256" role="img" aria-label="Pré-visualização do emblema"></canvas></div>
        <div class="emblema-controlos">${o.modo === 'criar' ? controlosCriar() : controlosImagem()}</div>
      </div>
      <p id="emblema-aviso" class="nota" role="alert" hidden></p>
      <div class="linha-botoes">
        <button class="btn btn-principal" type="button" data-emblema-acao="guardar">Guardar emblema</button>
        ${temEmblema ? '<button class="btn btn-contorno" type="button" data-emblema-acao="remover">Tirar emblema</button>' : ''}
      </div>
    </div>`;
  redesenhar();
}

function avisar(texto) {
  const el = dialogo.querySelector('#emblema-aviso');
  el.textContent = texto;
  el.hidden = !texto;
}

/** Gera a imagem final, a baixar a qualidade se for preciso para caber no limite. */
function exportar() {
  const { tamanho, maxKB } = CONFIG.sala.emblema;
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  desenharEmblema(canvas.getContext('2d'), tamanho);
  for (const q of [0.92, 0.8, 0.6]) {
    const dados = canvas.toDataURL('image/webp', q);
    if ((dados.length * 3) / 4 <= maxKB * 1024) return dados;
  }
  return null;
}

function carregarFicheiro(ficheiro) {
  if (!ficheiro) return;
  if (!ficheiro.type.startsWith('image/')) return avisar('Esse ficheiro não é uma imagem.');
  const url = URL.createObjectURL(ficheiro);
  const imagem = new Image();
  imagem.onload = () => {
    o.imagem = imagem;
    desenharDialogo();
  };
  imagem.onerror = () => {
    URL.revokeObjectURL(url);
    avisar('Não foi possível abrir essa imagem.');
  };
  imagem.src = url;
}

function aoClicar(ev) {
  const b = ev.target.closest('[data-emblema]');
  if (b) {
    const { emblema: campo, valor } = b.dataset;
    o[campo] = campo === 'soImagem' ? Boolean(valor) : valor;
    if (campo === 'modo' || campo === 'soImagem') return desenharDialogo();
    dialogo.querySelectorAll(`[data-emblema="${campo}"]`).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    return redesenhar();
  }
  const acao = ev.target.closest('[data-emblema-acao]')?.dataset.emblemaAcao;
  if (acao === 'remover') {
    aoGuardar(null);
    dialogo.close();
  } else if (acao === 'guardar') {
    if (o.modo === 'imagem' && !o.imagem) return avisar('Escolhe primeiro uma imagem.');
    const dados = exportar();
    if (!dados) return avisar('A imagem é demasiado pesada. Experimenta outra.');
    aoGuardar(dados);
    dialogo.close();
  }
}

function aoMudar(ev) {
  const t = ev.target;
  if (t.dataset.emblemaCor) o[t.dataset.emblemaCor] = t.value;
  else if (t.id === 'emblema-letras') o.letras = t.value.toUpperCase();
  else if (t.id === 'emblema-escala') o.escala = Number(t.value);
  else return;
  redesenhar();
}

/** Abre o criador. Volta às escolhas anteriores se já tiver sido aberto nesta sessão. */
export async function abrirCriadorEmblema(d, equipa, guardar) {
  if (!dialogo) {
    d.addEventListener('click', aoClicar);
    d.addEventListener('input', aoMudar);
    d.addEventListener('change', (ev) => {
      if (ev.target.id === 'emblema-ficheiro') carregarFicheiro(ev.target.files[0]);
    });
  }
  dialogo = d;
  aoGuardar = guardar;
  temEmblema = Boolean(equipa.emblema);
  if (!o) {
    const { principal, secundaria } = equipa.kit;
    o = {
      modo: 'criar',
      forma: 'classico',
      padrao: 'liso',
      simbolo: 'nenhum',
      cor1: principal,
      cor2: secundaria,
      contorno: secundaria,
      corSimbolo: corContraste(principal),
      letras: equipa.nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase(),
      imagem: null,
      soImagem: true,
      escala: 0.8,
    };
  }
  await document.fonts?.load('400 40px Anton').catch(() => {});
  desenharDialogo();
  d.showModal();
}
