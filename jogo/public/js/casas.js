// O aspeto de cada casa do tabuleiro: nome, cores e símbolo. O tabuleiro 3D, os baralhos, as cartas e os títulos
// desenham-se todos a partir daqui, em canvas ou em SVG.

const retangulo = (x, y, w, h, r = 0) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
const circulo = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

// Uma carta do leque do Mercado, com um filete da cor de fundo para se distinguir da de trás.
const cartaLeque = (rotacao) => [
  { d: retangulo(26, 14, 48, 70, 5), cor: 'fundo', rotacao },
  { d: retangulo(28, 16, 44, 66, 4), cor: 'simbolo', rotacao },
];
// Uma pessoa vista de cima, à volta da mesa da SAD.
const pessoa = (x, y, r = 8) => [
  { d: circulo(x, y, r), cor: 'simbolo' },
  { d: `M${x - r * 1.9} ${y + r * 3.4}c0-${r * 1.9} ${r * 0.9}-${r * 2.1} ${r * 1.9}-${r * 2.1}s${r * 1.9} ${r * 0.2} ${r * 1.9} ${r * 2.1}z`, cor: 'simbolo' },
];

const SIMBOLOS = {
  mercado: [
    ...cartaLeque(-26),
    ...cartaLeque(-6),
    ...cartaLeque(14),
    { d: circulo(50, 38, 8.5), cor: 'fundo', rotacao: 14 },
    { d: 'M33 68c0-13 8-20 17-20s17 7 17 20z', cor: 'fundo', rotacao: 14 },
  ],
  empresario: [
    { d: `${retangulo(32, 14, 36, 26, 6)}${retangulo(40, 22, 20, 14, 2)}`, cor: 'simbolo' },
    { d: retangulo(6, 30, 88, 58, 7), cor: 'simbolo' },
    { d: 'M6 56h88v5H6z', cor: 'fundo' },
    { d: retangulo(42, 50, 16, 17, 3), cor: 'fundo' },
  ],
  jovens: [
    { d: circulo(55, 15, 10), cor: 'simbolo' },
    { linha: 'M50 33L42 57', largura: 15, cor: 'simbolo' },
    { linha: 'M51 34L71 44', largura: 8, cor: 'simbolo' },
    { linha: 'M50 34L30 46L18 40', largura: 8, cor: 'simbolo' },
    { linha: 'M42 58L30 76L16 98', largura: 10, cor: 'simbolo' },
    { linha: 'M42 58L60 60L73 68', largura: 10, cor: 'simbolo' },
    { d: circulo(89, 68, 9), cor: 'simbolo' },
  ],
  rede: [
    { linha: `${circulo(50, 50, 42)}M50 8A19 42 0 0 0 50 92A19 42 0 0 0 50 8M50 8V92M8 50H92M14 28H86M14 72H86`, largura: 5.5, cor: 'simbolo' },
  ],
  medico: [
    { d: 'M37 10H63V37H90V63H63V90H37V63H10V37H37Z', linha: 'M37 10H63V37H90V63H63V90H37V63H10V37H37Z', largura: 5, cor: 'simbolo' },
  ],
  patrocinio: [
    // Duas mãos a fechar o negócio.
    { linha: 'M11 17l2 2a1 1 0 1 0 3-3M14 14l2.5 2.500a1 1 0 1 0 3-3l-3.880-3.880a3 3 0 0 0-4.240 0l-.88.88a1 1 0 1 1-3-3l2.810-2.810a5.790 5.790 0 0 1 7.060-.87l.47.28a2 2 0 0 0 1.420.25L21 4M21 3l1 11h-2M3 3L2 14l6.500 6.500a1 1 0 1 0 3-3M3 4h8', largura: 1.7, escala: 100 / 24, cor: 'simbolo' },
  ],
  misterio: [
    { linha: 'M31 34C31 8 69 8 69 34C69 52 50 50 50 68', largura: 15, cor: 'simbolo' },
    { d: circulo(50, 88, 9.5), cor: 'simbolo' },
  ],
  investigacao: [
    { linha: circulo(41, 41, 28), largura: 11, cor: 'simbolo' },
    { linha: 'M63 63L90 90', largura: 15, cor: 'simbolo' },
  ],
  sad: [
    ...pessoa(38, 8), ...pessoa(80, 5), ...pessoa(122, 8),
    ...pessoa(12, 38, 7),
    ...pessoa(148, 38, 7),
    { d: `${retangulo(26, 26, 108, 56, 22)}${retangulo(31, 31, 98, 46, 18)}`, cor: 'simbolo' },
    { d: retangulo(31, 31, 98, 46, 18), cor: 'fundo' },
  ],
  inicio: [
    { d: 'M96 44H38V28L6 54L38 80V64H96Z', cor: 'simbolo' },
  ],
};
const CAIXA_SIMBOLO = { sad: [160, 90] };

export const CASA = {
  inicio: { nome: 'Balneário', cor: '#FFF6E3', escuro: '#EFDFC2', texto: '#41261F', simbolo: '#41261F' },
  mercado: { nome: 'Mercado', cor: '#BB8550', escuro: '#8A5A30', texto: '#fff', simbolo: '#fff' },
  rede: { nome: 'Rede de observação', rotulo: 'Rede observação', cor: '#2F6FF0', escuro: '#1646B4', texto: '#fff', simbolo: '#fff' },
  empresario: { nome: 'Agente', cor: '#F0BC42', escuro: '#D2931F', texto: '#2B1A0E', simbolo: '#3B2412' },
  medico: { nome: 'Departamento médico', rotulo: 'Dep. médico', cor: '#1DB056', escuro: '#0E7F3A', texto: '#fff', simbolo: '#fff' },
  patrocinio: { nome: 'Patrocinadores', cor: '#8B45F5', escuro: '#5B21B6', texto: '#fff', simbolo: '#fff' },
  jovens: { nome: 'Jovens Talentos', cor: '#F76512', escuro: '#C2410C', texto: '#fff', simbolo: '#fff' },
  misterio: { nome: 'Mistério', cor: '#EE3A8C', escuro: '#B3145F', texto: '#fff', simbolo: '#fff', inteira: true },
  investigacao: { nome: 'Investigação', cor: '#A81F1F', escuro: '#6B1010', texto: '#fff', simbolo: '#fff', inteira: true },
  sad: { nome: 'Reunião com a SAD', cor: '#01203E', escuro: '#000F20', texto: '#fff', simbolo: '#fff', inteira: true },
};

const corDe = (casa, cor) => (cor === 'simbolo' ? casa.simbolo : cor === 'fundo' ? casa.cor : cor);

/** O símbolo em SVG, para as cartas, os títulos e as notificações. */
export function simboloSVG(tipo, tamanho = 64) {
  const casa = CASA[tipo];
  const [w, h] = CAIXA_SIMBOLO[tipo] ?? [100, 100];
  const partes = SIMBOLOS[tipo].map(({ d, linha, largura, cor, rotacao, escala }) => {
    const transforma = rotacao ? ` transform="rotate(${rotacao} 50 90)"` : escala ? ` transform="scale(${escala})"` : '';
    const c = corDe(casa, cor);
    const cheio = d ? `<path d="${d}" fill="${c}" fill-rule="evenodd"${transforma}/>` : '';
    const traco = linha ? `<path d="${linha}" fill="none" stroke="${c}" stroke-width="${largura}" stroke-linecap="round" stroke-linejoin="round"${transforma}/>` : '';
    return cheio + traco;
  });
  return `<svg class="simbolo-casa" viewBox="0 0 ${w} ${h}" height="${tamanho}" width="${(tamanho * w) / h}" aria-hidden="true">${partes.join('')}</svg>`;
}

/** Desenha o símbolo num canvas, com o canto superior esquerdo em (x, y) e `tamanho` de altura. */
export function desenharSimbolo(c, tipo, x, y, tamanho, sombra = true) {
  const casa = CASA[tipo];
  const [w, h] = CAIXA_SIMBOLO[tipo] ?? [100, 100];
  const k = tamanho / h;
  // A sombra é a do símbolo inteiro: desenhado à parte, as peças não fazem sombra umas nas outras.
  if (sombra) {
    const folga = 12;
    const copia = document.createElement('canvas');
    copia.width = Math.ceil(w * k) + 2 * folga;
    copia.height = Math.ceil(tamanho) + 2 * folga;
    desenharSimbolo(copia.getContext('2d'), tipo, folga, folga, tamanho, false);
    c.save();
    c.shadowColor = '#0006';
    c.shadowBlur = 7;
    c.shadowOffsetY = 3;
    c.drawImage(copia, x - folga, y - folga);
    c.restore();
    return;
  }
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  for (const { d, linha, largura, cor, rotacao, escala } of SIMBOLOS[tipo]) {
    c.save();
    if (rotacao) {
      c.translate(50, 90);
      c.rotate((rotacao * Math.PI) / 180);
      c.translate(-50, -90);
    }
    if (escala) c.scale(escala, escala);
    const cor2 = corDe(casa, cor);
    if (d) {
      c.fillStyle = cor2;
      c.fill(new Path2D(d), 'evenodd');
    }
    if (linha) {
      c.strokeStyle = cor2;
      c.lineWidth = largura;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.stroke(new Path2D(linha));
    }
    c.restore();
  }
  c.restore();
}

// Sempre os mesmos números, para o padrão não mudar de um ecrã para o outro.
function aleatorio(semente) {
  let s = semente;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** O fundo de uma casa: gradiente, brilho na diagonal e um padrão discreto. */
export function pintarFundo(c, tipo, W, H) {
  const casa = CASA[tipo];
  const g = c.createLinearGradient(0, 0, W * 0.5, H);
  g.addColorStop(0, casa.cor);
  g.addColorStop(1, casa.escuro);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // Riscas diagonais muito leves, como as de um relvado.
  c.save();
  c.globalAlpha = tipo === 'inicio' ? 0.035 : 0.05;
  c.fillStyle = tipo === 'inicio' ? casa.texto : '#fff';
  const passo = Math.max(W, H) / 7;
  for (let x = -H; x < W + H; x += passo * 2) {
    c.beginPath();
    c.moveTo(x, H);
    c.lineTo(x + H * 0.7, 0);
    c.lineTo(x + H * 0.7 + passo, 0);
    c.lineTo(x + passo, H);
    c.closePath();
    c.fill();
  }
  c.restore();

  // Mistério e Investigação têm os seus símbolos espalhados pelo fundo.
  if (tipo === 'misterio' || tipo === 'investigacao') {
    const r = aleatorio(tipo === 'misterio' ? 7 : 23);
    const lado = Math.min(W, H) * 0.3;
    c.save();
    c.globalAlpha = tipo === 'misterio' ? 0.34 : 0.22;
    const colunas = Math.ceil(W / lado) + 1;
    const linhas = Math.ceil(H / lado) + 1;
    for (let i = 0; i < colunas; i++) {
      for (let k = 0; k < linhas; k++) {
        const t = lado * (0.5 + r() * 0.4);
        const x = i * lado - t / 2 + (r() - 0.5) * lado * 0.5;
        const y = k * lado - t / 2 + (r() - 0.5) * lado * 0.5;
        c.save();
        c.translate(x + t / 2, y + t / 2);
        c.rotate((r() - 0.5) * 1.3);
        desenharSimbolo(c, tipo, -t / 2, -t / 2, t, false);
        c.restore();
      }
    }
    c.restore();
  }

  // Luz em cima e sombra nos bordos.
  const luz = c.createRadialGradient(W * 0.32, H * 0.12, 0, W * 0.32, H * 0.12, Math.max(W, H) * 0.85);
  luz.addColorStop(0, '#ffffff38');
  luz.addColorStop(1, '#ffffff00');
  c.fillStyle = luz;
  c.fillRect(0, 0, W, H);
  const orla = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.72);
  orla.addColorStop(0, '#00000000');
  orla.addColorStop(1, tipo === 'inicio' ? '#41261f26' : '#00000052');
  c.fillStyle = orla;
  c.fillRect(0, 0, W, H);
}

/** Escreve o texto no maior tamanho que caiba na largura. */
export function textoAjustado(c, texto, x, y, larguraMax, tamanho, peso = 800, familia = 'Inter, sans-serif') {
  let t = tamanho;
  do {
    c.font = `${peso} ${t}px ${familia}`;
    if (c.measureText(texto).width <= larguraMax) break;
    t -= 1;
  } while (t > 8);
  c.fillText(texto, x, y);
  return t;
}

/** Instala os fundos como variáveis de CSS (--fundo-misterio, ...), para as cartas serem iguais às casas. */
export function instalarFundos() {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 680;
  const c = canvas.getContext('2d');
  for (const tipo of Object.keys(CASA)) {
    pintarFundo(c, tipo, canvas.width, canvas.height);
    document.documentElement.style.setProperty(`--fundo-${tipo}`, `url(${canvas.toDataURL('image/jpeg', 0.86)})`);
  }
}
