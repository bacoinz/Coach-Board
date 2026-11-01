// Tabuleiro 3D em Three.js, low-poly: casas à volta do relvado, peões, baralhos, dados e a transformação em que as
// casas rodam e passam a ser as bancadas do estádio. Dá para o agarrar e rodar.
// Só desenha quando há alguma coisa a mexer, para poupar bateria no telemóvel.
import * as THREE from '/vendor/three.min.js';
import { CONFIG } from './comum/config.gen.js';
import { Relvado } from './relvado.js';
import { CASA, pintarCasa, pintarCostas } from './casas.js';

// As texturas desenham texto: só depois de a letra estar carregada.
await document.fonts?.load('800 40px Inter').catch(() => {});

const CASAS = CONFIG.tabuleiro.casas;
const LADO = CASAS.length / 4;
// Cada casa é um retângulo deitado: o tabuleiro fica retangular e abraça o relvado.
const CASA_X = 1.6;
const CASA_Z = 1;
const CANTO_X = (LADO * CASA_X) / 2;
const CANTO_Z = (LADO * CASA_Z) / 2;
const RELVADO_X = (LADO - 1) * CASA_X - 0.12;
const RELVADO_Z = RELVADO_X / 1.6;
const DURACAO_DADOS = 1250;
const MS_POR_CASA = 320;

// Baralhos em cima do relvado, com as moedas nas pontas.
const BARALHOS = ['misterio', 'mercado', 'rede', 'jovens', 'patrocinio'];

/** Posição de uma casa: 0 no canto da frente à direita, no sentido dos ponteiros (como no tabuleiro 2D). */
export function posicaoCasa(i) {
  const n = ((i % CASAS.length) + CASAS.length) % CASAS.length;
  if (n <= LADO) return { x: CANTO_X - n * CASA_X, z: CANTO_Z };
  if (n <= 2 * LADO) return { x: -CANTO_X, z: CANTO_Z - (n - LADO) * CASA_Z };
  if (n <= 3 * LADO) return { x: -CANTO_X + (n - 2 * LADO) * CASA_X, z: -CANTO_Z };
  return { x: CANTO_X, z: -CANTO_Z + (n - 3 * LADO) * CASA_Z };
}

/** Para que lado fica o exterior do tabuleiro nesta casa (nos cantos, nos dois sentidos). */
function exterior(i) {
  const { x, z } = posicaoCasa(i);
  // Os cantos ficam com as filas de trás e da frente, para o estádio não ter buracos.
  return Math.abs(z) === CANTO_Z ? { sx: 0, sz: Math.sign(z) } : { sx: Math.sign(x), sz: 0 };
}

/** As casas por onde um peão passa, sem contar com a de partida. */
export function caminho(de, para) {
  const passos = (para - de + CASAS.length) % CASAS.length;
  return Array.from({ length: passos }, (_, i) => (de + i + 1) % CASAS.length);
}

const COR_TABULEIRO = new THREE.Color(0x3d241d);
const COR_ESTADIO = new THREE.Color(0x0a2015);
const suave = (x) => x * x * (3 - 2 * x);
const limitar = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const misturar = (a, b, k) => a + (b - a) * k;
const VISTA = {
  mercado: { fi: 1.12, alvo: [0, 0, 0.05], cantos: [8.3, 5.3, 0.4] },
  estadio: { fi: 1.05, alvo: [0, 0, 0], cantos: [8.7, 5.9, 1.4] },
};
const INCLINACAO_BANCADA = 0.62;
const LARGURA_LADO = 0.68;
const FUNDO_X = 6.45; // onde começam as bancadas, mesmo à volta do relvado
const FUNDO_Z = 4.02;

function textura(desenhar, largura, altura) {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  desenhar(canvas.getContext('2d'), largura, altura);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const texturaCasa = (tipo) => textura((c, W, H) => pintarCasa(c, tipo, W, H), 512, 320);

/** Assentos e público em tons claros: a cor da equipa da casa vem da cor do material. */
function texturaAssentos() {
  return textura((c, W, H) => {
    c.fillStyle = '#8f8f8f';
    c.fillRect(0, 0, W, H);
    for (let y = 2; y < H; y += 12) {
      for (let x = 2; x < W; x += 9) {
        const r = Math.random();
        c.fillStyle = r < 0.45 ? '#ffffff' : r < 0.75 ? '#d9d9d9' : '#565656';
        c.fillRect(x, y, 7, 9);
      }
    }
  }, 256, 160);
}

const texturaBaralho = (tipo) => textura((c, W, H) => pintarCostas(c, tipo, W, H), 360, 504);

function texturaMoeda(tipo) {
  return textura((c, W) => {
    const r = W / 2;
    c.fillStyle = tipo === 'medico' ? '#16a34a' : '#d9a93c';
    c.fillRect(0, 0, W, W);
    c.strokeStyle = tipo === 'medico' ? '#bbf7d0' : '#fbe39a';
    c.lineWidth = 8;
    c.beginPath();
    c.arc(r, r, r - 10, 0, Math.PI * 2);
    c.stroke();
    if (tipo === 'medico') {
      c.fillStyle = '#fff';
      c.fillRect(r - 13, r - 40, 26, 80);
      c.fillRect(r - 40, r - 13, 80, 26);
      return;
    }
    // A mala de quem faz negócios.
    c.fillStyle = '#4a2f0e';
    c.fillRect(r - 34, r - 16, 68, 46);
    c.fillRect(r - 15, r - 30, 30, 8);
    c.fillRect(r - 15, r - 30, 7, 16);
    c.fillRect(r + 8, r - 30, 7, 16);
    c.fillStyle = '#e0b34c';
    c.fillRect(r - 34, r + 3, 68, 4);
    c.fillStyle = '#fbe39a';
    c.fillRect(r - 7, r - 3, 14, 12);
  }, 128, 128);
}

/** O equipamento enrolado no corpo do peão. */
function texturaPeao(kit) {
  return textura((c, W, H) => {
    c.fillStyle = kit.principal;
    c.fillRect(0, 0, W, H);
    c.fillStyle = kit.secundaria;
    switch (kit.padrao) {
      case 'riscas-v':
        for (let x = 0; x < W; x += W / 8) c.fillRect(x, 0, W / 16, H);
        break;
      case 'riscas-h':
        for (let y = 0; y < H; y += H / 7) c.fillRect(0, y, W, H / 14);
        break;
      case 'faixa':
        c.beginPath();
        c.moveTo(W * 0.1, 0);
        c.lineTo(W * 0.25, 0);
        c.lineTo(W * 0.4, H);
        c.lineTo(W * 0.25, H);
        c.closePath();
        c.fill();
        break;
      case 'metades':
        c.fillRect(0, 0, W / 2, H);
        break;
      default:
    }
    // A base do peão, na cor secundária.
    c.fillRect(0, H * 0.72, W, H * 0.28);
  }, 128, 96);
}

const PINTAS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };

function texturaDado(n) {
  return textura((c, W) => {
    c.fillStyle = '#fbf8ef';
    c.fillRect(0, 0, W, W);
    c.fillStyle = '#2b1a0e';
    for (const [x, y] of PINTAS[n]) {
      c.beginPath();
      c.arc(W * (0.25 + x * 0.25), W * (0.25 + y * 0.25), W * 0.09, 0, Math.PI * 2);
      c.fill();
    }
  }, 96, 96);
}

// Ordem das faces de uma caixa no Three.js: +x, −x, +y, −y, +z, −z. Rotação para cada valor ficar virado para cima.
const FACES_DADO = [1, 6, 2, 5, 3, 4];
const ROTACAO_DADO = {
  1: [0, 0, Math.PI / 2],
  6: [0, 0, -Math.PI / 2],
  2: [0, 0, 0],
  5: [Math.PI, 0, 0],
  3: [-Math.PI / 2, 0, 0],
  4: [Math.PI / 2, 0, 0],
};

/** Corpo de peão de xadrez, feito ao torno. */
const PERFIL_PEAO = [[0, 0], [0.29, 0], [0.29, 0.06], [0.2, 0.12], [0.11, 0.26], [0.095, 0.44], [0.16, 0.48], [0.09, 0.52]].map(([x, y]) => new THREE.Vector2(x, y));

const distanciaEntre = (ponteiros) => {
  const [a, b] = [...ponteiros.values()];
  return Math.hypot(a.x - b.x, a.y - b.y) || 1;
};

/** Uma cor quase preta deixaria o estádio às escuras. */
function corVisivel(hex) {
  const c = new THREE.Color(hex);
  const l = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
  return l < 0.04 ? c.lerp(new THREE.Color(0xffffff), 0.18) : c;
}

/** Os dados de cada ronda do jogo, num quadro só deles: os do adversário em cima, os meus em baixo. */
export class DadosJogo {
  constructor(caixa) {
    this.caixa = caixa;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    caixa.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1.4, 0.1, 40);
    this.camera.position.set(0, 9, 2.4);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const sol = new THREE.DirectionalLight(0xffffff, 1.5);
    sol.position.set(2, 8, 4);
    this.scene.add(sol);
    const materiais = FACES_DADO.map((n) => new THREE.MeshLambertMaterial({ map: texturaDado(n) }));
    const geo = new THREE.BoxGeometry(1.25, 1.25, 1.25);
    // Primeiro os meus (em baixo), depois os do adversário (em cima).
    this.dados = [[-0.85, 1.55], [0.85, 1.55], [-0.85, -1], [0.85, -1]].map(([x, z]) => {
      const d = new THREE.Mesh(geo, materiais);
      d.position.set(x, 0.65, z);
      d.visible = false;
      this.scene.add(d);
      return d;
    });
    this.reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.tweens = [];
    new ResizeObserver(() => this.redimensionar()).observe(caixa);
    this.redimensionar();
  }

  /** valores: [os meus [a, b] ou null, os do adversário [a, b] ou null]. Só rolam os dados de quem lançou agora. */
  mostrar(valores) {
    const inicio = performance.now();
    [0, 1].forEach((lado) => {
      const chave = JSON.stringify(valores[lado]);
      const mudou = chave !== this.atuais?.[lado];
      (valores[lado] ?? [null, null]).forEach((n, k) => {
        const d = this.dados[lado * 2 + k];
        d.visible = n != null;
        if (n == null || !mudou) return;
        const [rx, ry, rz] = ROTACAO_DADO[n];
        const fim = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
        fim.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (Math.random() - 0.5) * 0.8, 0)));
        if (this.reduzir || !this.atuais) {
          d.quaternion.copy(fim);
          d.position.y = 0.65;
          return;
        }
        const eixo = new THREE.Vector3(1 + Math.random(), (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8).normalize();
        const volta = new THREE.Quaternion();
        const duracao = DURACAO_DADOS * 0.8 + k * 60;
        this.tweens.push((agora) => {
          const x = limitar((agora - inicio) / duracao);
          const s = 1 - (1 - x) ** 2.4;
          d.position.y = 0.65 + Math.abs(Math.cos(x * x * Math.PI * 3.5 + Math.PI / 2)) * 1.5 * (1 - x) ** 1.6;
          volta.setFromAxisAngle(eixo, -(1 - s) * Math.PI * 8);
          d.quaternion.copy(fim).premultiply(volta);
          return x < 1;
        });
      });
    });
    this.atuais = valores.map((v) => JSON.stringify(v));
    this.ciclo();
  }

  ciclo() {
    const agora = performance.now();
    this.tweens = this.tweens.filter((f) => f(agora));
    this.renderer.render(this.scene, this.camera);
    if (this.tweens.length) requestAnimationFrame(() => this.ciclo());
  }

  redimensionar() {
    const w = this.caixa.clientWidth;
    const h = this.caixa.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }
}

export { DURACAO_DADOS };

export class Tabuleiro3D {
  constructor(caixa, { aoGolo = null, zona = null } = {}) {
    this.caixa = caixa;
    this.zona = zona;
    this.aoGolo = aoGolo;
    const telemovel = matchMedia('(pointer: coarse)').matches;
    this.intervaloRelvado = telemovel ? 66 : 33;
    this.renderer = new THREE.WebGLRenderer({ antialias: !telemovel, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, telemovel ? 1.5 : 2));
    caixa.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.1, 120);
    this.scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6);
    sol.position.set(3, 10, 6);
    this.scene.add(sol);

    this.progresso = 0; // 0 = mercado, 1 = estádio
    this.tweens = [];
    this.pecas = new Map();
    this.orbita = { teta: 0, fi: 0, zoom: 1 };
    this.distancias = { mercado: 30, estadio: 40 };
    this.relvadoAtivo = false;
    this.aDesenhar = false;
    this.reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.construirTabuleiro();
    this.construirCentro();
    this.construirDados();
    this.aplicarProgresso(0);
    this.ligarOrbita();

    this.observador = new ResizeObserver(() => this.redimensionar());
    this.observador.observe(caixa);
    if (zona) this.observador.observe(zona);
    this.redimensionar();
  }

  // --- Construção ---

  construirTabuleiro() {
    this.base = new THREE.Mesh(new THREE.BoxGeometry(LADO * CASA_X + 2.1, 0.3, LADO * CASA_Z + 1.5), new THREE.MeshLambertMaterial({ color: COR_TABULEIRO.clone() }));
    this.base.position.y = -0.15;
    this.scene.add(this.base);
    this.corLado = new THREE.MeshLambertMaterial({ color: 0x8a6a4f });
    this.corAssentos = new THREE.MeshLambertMaterial({ map: texturaAssentos(), color: 0xc49a6c });
    const tampas = Object.fromEntries(Object.keys(CASA).map((t) => [t, new THREE.MeshLambertMaterial({ map: texturaCasa(t) })]));
    const geo = new THREE.BoxGeometry(CASA_X - 0.05, 0.14, CASA_Z - 0.05);
    const cos = Math.cos(INCLINACAO_BANCADA);
    const sen = Math.sin(INCLINACAO_BANCADA);
    this.casas = CASAS.map((tipo, i) => {
      const { x, z } = posicaoCasa(i);
      const { sx, sz } = exterior(i);
      // A cara de baixo é a bancada: rodando em torno da aresta do lado, os assentos ficam virados para o relvado.
      const comp = Math.hypot(sx, sz);
      const eixo = new THREE.Vector3(sz / comp, 0, -sx / comp);
      const m = new THREE.Mesh(geo, [this.corLado, this.corLado, tampas[tipo], this.corAssentos, this.corLado, this.corLado]);
      // Nas filas dos lados a casa encolhe no sentido do relvado: senão as bancadas tiravam-lhe o espaço.
      const largura = sx ? CASA_X * LARGURA_LADO : CASA_Z;
      const baixa = { x: sx ? sx * (FUNDO_X + (largura / 2) * cos) : x, y: 0.42, z: sz ? sz * (FUNDO_Z + (largura / 2) * cos) : z };
      m.position.set(x, 0.08, z);
      this.scene.add(m);
      // Por trás de cada casa sobe um segundo piso.
      const alta = new THREE.Mesh(geo, [this.corLado, this.corLado, this.corLado, this.corAssentos, this.corLado, this.corLado]);
      alta.visible = false;
      this.scene.add(alta);
      const altaFim = { x: baixa.x + sx * largura * cos * 0.98, y: baixa.y + largura * sen * 0.98, z: baixa.z + sz * largura * cos * 0.98 };
      return { m, alta, x, z, eixo, baixa, altaFim, encolhe: sx ? LARGURA_LADO : 1, ordem: i / CASAS.length };
    });
  }

  construirCentro() {
    this.tapete = new THREE.Mesh(new THREE.BoxGeometry(RELVADO_X + 0.1, 0.1, (LADO - 1) * CASA_Z - 0.04), new THREE.MeshLambertMaterial({ color: 0x0d2a1b }));
    this.tapete.position.y = 0.03;
    this.scene.add(this.tapete);
    const canvas = document.createElement('canvas');
    this.relvado = new Relvado(canvas, { aoGolo: () => this.aoGolo?.() });
    this.texturaRelvado = new THREE.CanvasTexture(canvas);
    this.texturaRelvado.colorSpace = THREE.SRGBColorSpace;
    this.texturaRelvado.anisotropy = 4;
    this.campo = new THREE.Mesh(new THREE.PlaneGeometry(RELVADO_X, RELVADO_Z), new THREE.MeshBasicMaterial({ map: this.texturaRelvado }));
    this.campo.rotation.x = -Math.PI / 2;
    this.campo.position.y = 0.09;
    this.scene.add(this.campo);

    // Baralhos e moedas em cima do relvado.
    this.mesa = new THREE.Group();
    this.lateralCarta = new THREE.MeshLambertMaterial({ color: 0xf4ead8 });
    const geoBaralho = new THREE.BoxGeometry(1.4, 0.28, 1.96);
    this.baralhos = {};
    const POSICAO_Z = -1.75;
    const passo = 1.78;
    BARALHOS.forEach((tipo, i) => {
      const tampa = new THREE.MeshLambertMaterial({ map: texturaBaralho(tipo) });
      const m = new THREE.Mesh(geoBaralho, [this.lateralCarta, this.lateralCarta, tampa, this.lateralCarta, this.lateralCarta, this.lateralCarta]);
      m.position.set((i - 2) * passo, 0.21, POSICAO_Z);
      m.rotation.y = (i % 2 ? 1 : -1) * 0.04;
      this.mesa.add(m);
      this.baralhos[tipo] = { m, tampa };
    });
    for (const [tipo, x] of [['empresario', -3 * passo], ['medico', 3 * passo]]) {
      const lado = new THREE.MeshLambertMaterial({ color: tipo === 'medico' ? 0x128a3e : 0xb98a2c });
      const tampa = new THREE.MeshLambertMaterial({ map: texturaMoeda(tipo) });
      const geo = new THREE.CylinderGeometry(0.62, 0.62, 0.1, 26);
      for (let n = 0; n < 3; n++) {
        const moeda = new THREE.Mesh(geo, [lado, tampa, lado]);
        moeda.position.set(x + n * 0.015, 0.14 + n * 0.1, POSICAO_Z + n * 0.012);
        this.mesa.add(moeda);
      }
    }
    this.cartaVoadora = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 1.96), this.lateralCarta);
    this.cartaVoadora.visible = false;
    this.mesa.add(this.cartaVoadora);
    this.scene.add(this.mesa);
  }

  construirDados() {
    const materiais = FACES_DADO.map((n) => new THREE.MeshLambertMaterial({ map: texturaDado(n) }));
    const geo = new THREE.BoxGeometry(0.72, 0.72, 0.72);
    this.dados = [0, 1].map(() => {
      const d = new THREE.Mesh(geo, materiais);
      d.visible = false;
      this.scene.add(d);
      return d;
    });
  }

  novaPeca(equipa) {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.LatheGeometry(PERFIL_PEAO, 18), new THREE.MeshLambertMaterial({ map: texturaPeao(equipa.kit) }));
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), new THREE.MeshLambertMaterial({ color: new THREE.Color(equipa.kit.principal) }));
    cabeca.position.y = 0.62;
    const anel = new THREE.Mesh(new THREE.RingGeometry(0.33, 0.42, 26), new THREE.MeshBasicMaterial({ color: 0xf2c879 }));
    anel.rotation.x = -Math.PI / 2;
    anel.position.y = 0.01;
    anel.visible = false;
    g.add(corpo, cabeca, anel);
    g.scale.setScalar(1.15);
    this.scene.add(g);
    return { grupo: g, anel };
  }

  // --- Estado ---

  /** Recebe o estado do jogo. Devolve quantos ms faltam para acabar a animação do lance (os dados e o peão). */
  atualizar(S, EU) {
    const agora = performance.now();
    const emMercado = S.fase === 'janela';
    this.definirModo(emMercado ? 0 : 1, this.jaDesenhou && !this.reduzir);
    const espera = this.atualizarDados(S);
    this.atualizarPecas(S, espera);
    this.atualizarBaralhos(S, espera);
    this.atualizarCorEstadio(S, EU);
    this.atualizarJogo(S, EU, agora);
    this.jaDesenhou = true;
    this.pedir();
    return espera;
  }

  definirModo(alvo, animar) {
    if (this.alvo === alvo) return;
    this.alvo = alvo;
    if (!animar) {
      this.progresso = alvo;
      this.aplicarProgresso(alvo);
      return;
    }
    const de = this.progresso;
    // A câmara volta à posição de origem para se ver a transformação como deve ser.
    const orbita = { ...this.orbita };
    this.animar('modo', 3000, (x) => {
      this.progresso = de + (alvo - de) * suave(x);
      const volta = suave(limitar(x * 2.2));
      this.orbita.teta = orbita.teta * (1 - volta);
      this.orbita.fi = orbita.fi * (1 - volta);
      this.orbita.zoom = misturar(orbita.zoom, 1, volta);
      this.aplicarProgresso(this.progresso);
    });
  }

  aplicarProgresso(p) {
    // As casas rodam em cascata, sobem e ficam viradas para o relvado, com os assentos à vista.
    const angulo = Math.PI - INCLINACAO_BANCADA;
    for (const c of this.casas) {
      const s = suave(limitar(p * 1.55 - c.ordem * 0.55));
      c.m.quaternion.setFromAxisAngle(c.eixo, angulo * s);
      c.m.position.set(misturar(c.x, c.baixa.x, s), misturar(0.08, c.baixa.y, s) + Math.sin(Math.PI * s) * 0.8, misturar(c.z, c.baixa.z, s));
      c.m.scale.y = 1 + 1.4 * s;
      c.m.scale.x = misturar(1, c.encolhe, s);
      const a = suave(limitar((p - 0.55 - c.ordem * 0.12) / 0.33));
      c.alta.visible = a > 0.001;
      if (c.alta.visible) {
        c.alta.quaternion.copy(c.m.quaternion);
        c.alta.position.set(c.altaFim.x, misturar(-2.5, c.altaFim.y, a), c.altaFim.z);
        c.alta.scale.y = 2.4;
        c.alta.scale.x = c.encolhe;
      }
    }
    // O tabuleiro escurece e vira o chão do estádio.
    this.base.material.color.lerpColors(COR_TABULEIRO, COR_ESTADIO, suave(limitar(p * 1.4)));
    // Peões, baralhos e dados saem de cena no início.
    const fora = limitar(p * 4);
    for (const { grupo } of this.pecas.values()) {
      grupo.visible = fora < 1;
      grupo.scale.setScalar(1.15 * (1 - fora));
    }
    this.mesa.visible = fora < 1;
    this.mesa.scale.setScalar(Math.max(0.001, 1 - fora));
    for (const d of this.dados) d.scale.setScalar(Math.max(0.001, 1 - fora));
    this.aplicarCamara();
  }

  aplicarCamara() {
    const q = suave(this.progresso);
    const { mercado: a, estadio: b } = VISTA;
    const fi = limitar(misturar(a.fi, b.fi, q) + this.orbita.fi, 0.42, 1.52);
    const d = (misturar(this.distancias.mercado, this.distancias.estadio, q) + Math.sin(Math.PI * q) * 3) * this.orbita.zoom;
    const t = this.orbita.teta;
    const alvo = [misturar(a.alvo[0], b.alvo[0], q), misturar(a.alvo[1], b.alvo[1], q), misturar(a.alvo[2], b.alvo[2], q)];
    this.camera.position.set(alvo[0] + d * Math.cos(fi) * Math.sin(t), alvo[1] + d * Math.sin(fi), alvo[2] + d * Math.cos(fi) * Math.cos(t));
    this.camera.lookAt(alvo[0], alvo[1], alvo[2]);
  }

  /** A distância a que tudo cabe no ecrã, sem cortar os cantos. */
  distanciaQueCabe({ fi, alvo, cantos: [cx, cz, cy] }, limiteX = 0.985, limiteY = 0.985) {
    const cam = new THREE.PerspectiveCamera(this.camera.fov, this.camera.aspect, 0.1, 200);
    const pontos = [];
    for (const x of [-cx, cx]) for (const z of [-cz, cz]) for (const y of [0, cy]) pontos.push(new THREE.Vector3(x, y, z));
    const v = new THREE.Vector3();
    for (let d = 8; d < 120; d += 0.5) {
      cam.position.set(alvo[0], alvo[1] + d * Math.sin(fi), alvo[2] + d * Math.cos(fi));
      cam.lookAt(alvo[0], alvo[1], alvo[2]);
      cam.updateMatrixWorld();
      if (pontos.every((p) => {
        v.copy(p).project(cam);
        return Math.abs(v.x) <= limiteX && Math.abs(v.y) <= limiteY;
      })) return d;
    }
    return 120;
  }

  atualizarPecas(S, espera) {
    const j = S.janela;
    const posicoes = j?.posicao ?? null;
    if (!posicoes) {
      for (const { grupo } of this.pecas.values()) grupo.visible = false;
      return;
    }
    const ids = Object.keys(posicoes);
    const vez = j.fase === 'tabuleiro' ? j.ordem?.[j.vez] : null;
    for (const id of ids) {
      if (!this.pecas.has(id)) {
        this.pecas.set(id, { ...this.novaPeca(S.equipas[id]), casa: posicoes[id] });
        this.colocarPeca(id, this.pecas.get(id), ids, posicoes);
      }
      const peca = this.pecas.get(id);
      peca.anel.visible = id === vez;
      if (peca.casa !== posicoes[id]) this.moverPeca(id, peca, posicoes[id], ids, posicoes, espera);
      else if (!peca.emMovimento) this.colocarPeca(id, peca, ids, posicoes);
      peca.grupo.visible = this.progresso < 0.25;
    }
    for (const [id, { grupo }] of this.pecas) if (!ids.includes(id)) grupo.visible = false;
  }

  /** Várias peças na mesma casa ficam lado a lado. */
  deslocamento(id, casa, ids, posicoes) {
    const aqui = ids.filter((x) => posicoes[x] === casa);
    const n = aqui.indexOf(id);
    if (aqui.length <= 1) return { x: 0, z: 0 };
    const colunas = Math.min(aqui.length, 3);
    return { x: ((n % colunas) - (colunas - 1) / 2) * 0.46, z: (Math.floor(n / colunas) - (aqui.length > colunas ? 0.5 : 0)) * 0.38 };
  }

  colocarPeca(id, peca, ids, posicoes) {
    const { x, z } = posicaoCasa(peca.casa);
    const d = this.deslocamento(id, peca.casa, ids, posicoes);
    peca.grupo.position.set(x + d.x, 0.15, z + d.z);
  }

  /** Depois de os dados pararem, o peão salta de casa em casa. */
  moverPeca(id, peca, para, ids, posicoes, espera) {
    const passos = caminho(peca.casa, para);
    peca.casa = para;
    if (!passos.length || this.reduzir) return this.colocarPeca(id, peca, ids, posicoes);
    peca.emMovimento = true;
    const atraso = Math.max(0, espera - passos.length * MS_POR_CASA - 120);
    const inicio = peca.grupo.position.clone();
    const pontos = [inicio, ...passos.map((c) => {
      const { x, z } = posicaoCasa(c);
      return new THREE.Vector3(x, 0.15, z);
    })];
    this.animar(`peca-${id}`, passos.length * MS_POR_CASA, (t) => {
      const k = t * (pontos.length - 1);
      const n = Math.min(pontos.length - 2, Math.floor(k));
      const s = k - n;
      peca.grupo.position.lerpVectors(pontos[n], pontos[n + 1], s);
      peca.grupo.position.y = 0.15 + Math.sin(Math.PI * s) * 0.5;
      if (t >= 1) {
        peca.emMovimento = false;
        this.colocarPeca(id, peca, ids, posicoes);
      }
    }, atraso);
  }

  /** Os dados são atirados da frente para cima do relvado, batem e rolam até parar. */
  atualizarDados(S) {
    const lance = S.janela?.ultimoLance ?? null;
    if (!lance) {
      for (const d of this.dados) d.visible = false;
      this.ultimoLance = null;
      return 0;
    }
    const chave = JSON.stringify(lance);
    if (chave === this.ultimoLance) return 0;
    const primeiro = !this.jaDesenhou;
    this.ultimoLance = chave;
    let espera = 0;
    this.dados.forEach((d, i) => {
      const n = lance.dados[i];
      d.visible = n != null;
      if (n == null) return;
      const dois = lance.dados.length > 1;
      const fimX = dois ? (i === 0 ? -0.75 : 0.75) : 0;
      const fimZ = 1.15 + (i ? 0.25 : 0);
      const [rx, ry, rz] = ROTACAO_DADO[n];
      const fim = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
      fim.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (Math.random() - 0.5) * 1.2, 0)));
      if (primeiro || this.reduzir) {
        d.quaternion.copy(fim);
        d.position.set(fimX, 0.45, fimZ);
        return;
      }
      const eixo = new THREE.Vector3(1 + Math.random(), (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8).normalize();
      const volta = new THREE.Quaternion();
      const deX = fimX * 2.6 + (Math.random() - 0.5);
      espera = DURACAO_DADOS;
      this.animar(`dado-${i}`, DURACAO_DADOS, (t) => {
        // Cada ressalto é mais baixo e mais curto, e o dado vai perdendo velocidade.
        const s = 1 - (1 - t) ** 2.4;
        const salto = Math.abs(Math.cos(t * t * Math.PI * 3.5 + Math.PI / 2)) * 2.9 * (1 - t) ** 1.6;
        d.position.set(misturar(deX, fimX, s), 0.45 + salto, misturar(4.1, fimZ, s));
        volta.setFromAxisAngle(eixo, -(1 - s) * Math.PI * 9);
        d.quaternion.copy(fim).premultiply(volta);
      });
    });
    return espera ? espera + caminho(lance.de, lance.para).length * MS_POR_CASA + 120 : 0;
  }

  /** Quando sai uma carta, ela levanta-se do baralho dela. */
  atualizarBaralhos(S, espera) {
    const j = S.janela;
    const p = j?.pendente;
    const c = j?.ultimaCarta;
    let baralho = null;
    let chave = null;
    if (p && this.baralhos[p.tipo]) {
      baralho = p.tipo;
      chave = JSON.stringify([p.tipo, p.jogador, p.liga, p.nome]);
    } else if (c && this.baralhos[c.tipo]) {
      baralho = c.tipo;
      chave = JSON.stringify([c.tipo, c.titulo, j.ultimoLance]);
    }
    if (chave === this.ultimaCartaChave) return;
    const primeira = !this.jaDesenhou;
    this.ultimaCartaChave = chave;
    if (!baralho || primeira || this.reduzir) return;
    const { m, tampa } = this.baralhos[baralho];
    const voa = this.cartaVoadora;
    const l = this.lateralCarta;
    voa.material = [l, l, tampa, l, l, l];
    voa.position.copy(m.position);
    voa.rotation.set(0, 0, 0);
    this.animar('carta', 750, (t) => {
      voa.visible = t < 1;
      voa.position.y = 0.33 + suave(t) * 2.6;
      voa.position.z = m.position.z + suave(t) * 1.4;
      voa.rotation.x = suave(t) * Math.PI * 1.5;
    }, Math.max(0, espera - 200));
  }

  /** O estádio pinta-se com as cores da equipa da casa do jogo em causa. */
  atualizarCorEstadio(S, EU) {
    const c = S.campeonato;
    if (!c) return;
    const pares = c.jogos?.length ? c.jogos.map((x) => x.lados.map((l) => l.equipa)) : c.calendario ?? [];
    const par = pares.find((x) => x.includes(EU?.equipa)) ?? pares[0];
    const casa = par && S.equipas[par[0]];
    if (!casa || casa.id === this.equipaDaCasa) return;
    this.equipaDaCasa = casa.id;
    const alvoAssentos = corVisivel(casa.kit.principal);
    const alvoLado = new THREE.Color(casa.kit.secundaria);
    const deA = this.corAssentos.color.clone();
    const deL = this.corLado.color.clone();
    this.animar('cor', 900, (t) => {
      this.corAssentos.color.lerpColors(deA, alvoAssentos, t);
      this.corLado.color.lerpColors(deL, alvoLado, t);
    });
  }

  /** Até que minuto se viu o jogo no relvado. */
  minutoVisto() {
    return this.relvadoAtivo ? this.relvado.minuto : Infinity;
  }

  atualizarJogo(S, EU, agora) {
    const c = S.campeonato;
    if (S.fase === 'campeonato' && c?.jogos?.length) {
      const meu = c.jogos.find((j) => j.lados.some((l) => l.equipa === EU?.equipa)) ?? c.jogos[0];
      this.relvado.definirJogo(meu, S.equipas, agora, { espelho: meu.lados[1].equipa === EU?.equipa });
      this.relvadoAtivo = true;
      this.relvadoMexe = true;
    } else {
      const titulo = S.fase === 'campeonato' ? (c.competicao === 'taca' ? `Taça · ${c.ronda}` : `Jornada ${Math.min(c.jornada + 1, c.jornadas)}`) : '';
      if (this.tituloRelvado !== titulo || this.relvado.chave) {
        this.tituloRelvado = titulo;
        this.relvado.semJogo(titulo);
        this.texturaRelvado.needsUpdate = true;
      }
      this.relvadoAtivo = false;
    }
  }

  // --- Agarrar e rodar ---

  ligarOrbita() {
    const el = this.renderer.domElement;
    const ponteiros = new Map();
    let distancia = 0;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', (ev) => {
      el.setPointerCapture(ev.pointerId);
      ponteiros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      el.style.cursor = 'grabbing';
      if (ponteiros.size === 2) distancia = distanciaEntre(ponteiros);
    });
    el.addEventListener('pointermove', (ev) => {
      const p = ponteiros.get(ev.pointerId);
      if (!p) return;
      const dx = ev.clientX - p.x;
      const dy = ev.clientY - p.y;
      p.x = ev.clientX;
      p.y = ev.clientY;
      if (ponteiros.size === 1) {
        this.orbita.teta -= dx * 0.006;
        this.orbita.fi = limitar(this.orbita.fi + dy * 0.004, -0.75, 0.45);
      } else if (ponteiros.size === 2) {
        const d = distanciaEntre(ponteiros);
        if (distancia) this.orbita.zoom = limitar(this.orbita.zoom * (distancia / d), 0.55, 1.5);
        distancia = d;
      }
      this.aplicarCamara();
      this.pedir();
    });
    const largar = (ev) => {
      ponteiros.delete(ev.pointerId);
      if (!ponteiros.size) el.style.cursor = 'grab';
    };
    el.addEventListener('pointerup', largar);
    el.addEventListener('pointercancel', largar);
    el.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      this.orbita.zoom = limitar(this.orbita.zoom * (1 + Math.sign(ev.deltaY) * 0.07), 0.55, 1.5);
      this.aplicarCamara();
      this.pedir();
    }, { passive: false });
    // Dois cliques: volta à vista normal.
    el.addEventListener('dblclick', () => {
      const de = { ...this.orbita };
      this.animar('orbita', 500, (x) => {
        const s = suave(x);
        this.orbita.teta = de.teta * (1 - s);
        this.orbita.fi = de.fi * (1 - s);
        this.orbita.zoom = misturar(de.zoom, 1, s);
        this.aplicarCamara();
      });
    });
  }

  // --- Animação ---

  animar(nome, duracao, passo, atraso = 0) {
    this.tweens = this.tweens.filter((t) => t.nome !== nome);
    this.tweens.push({ nome, inicio: performance.now() + atraso, duracao, passo });
    this.pedir();
  }

  pedir() {
    if (this.aDesenhar) return;
    this.aDesenhar = true;
    requestAnimationFrame(() => this.ciclo());
  }

  ciclo() {
    this.aDesenhar = false;
    const agora = performance.now();
    this.tweens = this.tweens.filter((tw) => {
      if (agora < tw.inicio) return true;
      const x = limitar((agora - tw.inicio) / tw.duracao);
      tw.passo(x);
      return x < 1;
    });
    let continuar = this.tweens.length > 0;
    if (this.relvadoAtivo) {
      if (!this.ultimaTextura || agora - this.ultimaTextura >= this.intervaloRelvado) {
        this.relvadoMexe = this.relvado.tick(agora);
        this.texturaRelvado.needsUpdate = true;
        this.ultimaTextura = agora;
      }
      continuar = continuar || this.relvadoMexe;
    }
    this.renderer.render(this.scene, this.camera);
    if (continuar) this.pedir();
  }

  redimensionar() {
    const w = this.caixa.clientWidth;
    const h = this.caixa.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // O centro da câmara vai para o meio da zona livre: o canvas continua por trás dos nomes, para o zoom os preencher.
    let [lx, ly] = [0.985, 0.985];
    const z = this.zona?.getBoundingClientRect();
    const c = this.caixa.getBoundingClientRect();
    if (z && z.width > 40 && z.height > 40) {
      lx = (0.985 * z.width) / w;
      ly = (0.985 * z.height) / h;
      this.camera.setViewOffset(w, h, c.left + w / 2 - (z.left + z.width / 2), c.top + h / 2 - (z.top + z.height / 2), w, h);
    } else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.distancias = { mercado: this.distanciaQueCabe(VISTA.mercado, lx, ly), estadio: this.distanciaQueCabe(VISTA.estadio, lx, ly) };
    this.aplicarProgresso(this.progresso);
    this.pedir();
  }
}
