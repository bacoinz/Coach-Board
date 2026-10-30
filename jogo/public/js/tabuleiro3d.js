// Tabuleiro 3D em Three.js, low-poly: casas, peões, dados e a transformação entre o mercado e o estádio.
// Só desenha quando há alguma coisa a mexer, para poupar bateria no telemóvel.
import * as THREE from '/vendor/three.min.js';
import { CONFIG } from './comum/config.gen.js';
import { Relvado } from './relvado.js';

const CASAS = CONFIG.tabuleiro.casas;
const LADO = CASAS.length / 4;
const ALCANCE = LADO / 2; // o centro das casas dos cantos, a partir do centro do tabuleiro

const TIPOS = {
  inicio: ['Início', '#3d241d'],
  mercado: ['Mercado', '#b07a46'],
  rede: ['Rede', '#2563eb'],
  empresario: ['Empresário', '#7c3aed'],
  medico: ['Médico', '#16a34a'],
  patrocinio: ['Patrocínio', '#ca8a04'],
  jovens: ['Jovens Talentos', '#ea580c'],
  misterio: ['Mistério', '#db2777'],
  investigacao: ['Investigação', '#991b1b'],
  sad: ['SAD', '#0f766e'],
};

/** Posição de uma casa: 0 no canto da frente à direita, no sentido dos ponteiros (como no tabuleiro 2D). */
export function posicaoCasa(i) {
  const n = ((i % CASAS.length) + CASAS.length) % CASAS.length;
  if (n <= LADO) return { x: ALCANCE - n, z: ALCANCE };
  if (n <= 2 * LADO) return { x: -ALCANCE, z: ALCANCE - (n - LADO) };
  if (n <= 3 * LADO) return { x: -ALCANCE + (n - 2 * LADO), z: -ALCANCE };
  return { x: ALCANCE, z: -ALCANCE + (n - 3 * LADO) };
}

/** As casas por onde um peão passa, sem contar com a de partida. */
export function caminho(de, para) {
  const passos = (para - de + CASAS.length) % CASAS.length;
  return Array.from({ length: passos }, (_, i) => (de + i + 1) % CASAS.length);
}

const COR_TABULEIRO = new THREE.Color(0x3d241d);
const COR_ESTADIO = new THREE.Color(0x0a2015);
const suave = (x) => x * x * (3 - 2 * x);
const limitar = (x) => Math.max(0, Math.min(1, x));
const CAMARA = {
  mercado: { pos: [0, 20, 11], alvo: [0, 0, 0.3] },
  estadio: { pos: [0, 25, 10], alvo: [0, 0, -1.3] },
};

function textura(desenhar, largura, altura) {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  desenhar(canvas.getContext('2d'), largura, altura);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function texturaCasa(tipo) {
  const [nome, cor] = TIPOS[tipo];
  return textura((c, W, H) => {
    c.fillStyle = tipo === 'inicio' ? '#e9d5b5' : '#f4ead8';
    c.fillRect(0, 0, W, H);
    c.fillStyle = cor;
    c.fillRect(0, 0, W, H * 0.2);
    c.fillStyle = '#2b1a0e';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const palavras = nome.split(' ');
    c.font = `800 ${palavras.length > 1 || nome.length > 9 ? 25 : 30}px Inter, sans-serif`;
    palavras.forEach((p, i) => c.fillText(p, W / 2, H * 0.6 + (i - (palavras.length - 1) / 2) * 30));
  }, 192, 192);
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
/** Um metro quadrado de público; repete-se em cada degrau. */
function texturaPublico() {
  const cores = ['#6e5a48', '#8a6a4f', '#5a4a3e', '#a58b6f', '#7a4a3a', '#4a5a70'];
  const t = textura((c, W, H) => {
    c.fillStyle = '#2a1f19';
    c.fillRect(0, 0, W, H);
    for (let y = 1; y < H; y += 4) {
      for (let x = 1; x < W; x += 4) {
        if (Math.random() < 0.8) {
          c.fillStyle = cores[Math.floor(Math.random() * cores.length)];
          c.fillRect(x, y, 3, 3);
        }
      }
    }
  }, 64, 64);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

const FACES_DADO = [1, 6, 2, 5, 3, 4];
const ROTACAO_DADO = {
  1: [0, 0, Math.PI / 2],
  6: [0, 0, -Math.PI / 2],
  2: [0, 0, 0],
  5: [Math.PI, 0, 0],
  3: [-Math.PI / 2, 0, 0],
  4: [Math.PI / 2, 0, 0],
};

export class Tabuleiro3D {
  constructor(caixa) {
    this.caixa = caixa;
    const telemovel = matchMedia('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ antialias: !telemovel, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, telemovel ? 1.5 : 2));
    caixa.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    this.scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6);
    sol.position.set(3, 10, 6);
    this.scene.add(sol);

    this.progresso = 0; // 0 = mercado, 1 = estádio
    this.tweens = [];
    this.pecas = new Map();
    this.ultimoLance = null;
    this.quadro = null;
    this.relvadoAtivo = false;
    this.aDesenhar = false;
    this.reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.construirTabuleiro();
    this.construirCentro();
    this.construirEstadio();
    this.construirDados();
    this.aplicarProgresso(0);

    this.observador = new ResizeObserver(() => this.redimensionar());
    this.observador.observe(caixa);
    this.redimensionar();
  }

  // --- Construção ---

  construirTabuleiro() {
    const base = new THREE.Mesh(new THREE.BoxGeometry(LADO + 1.5, 0.3, LADO + 1.5), new THREE.MeshLambertMaterial({ color: 0x3d241d }));
    base.position.y = -0.15;
    this.scene.add(base);
    this.base = base;
    const lateral = new THREE.MeshLambertMaterial({ color: 0x8a6a4f });
    const baixo = new THREE.MeshLambertMaterial({ color: 0x3d241d });
    const materiais = Object.fromEntries(Object.keys(TIPOS).map((t) => [t, new THREE.MeshLambertMaterial({ map: texturaCasa(t) })]));
    const geo = new THREE.BoxGeometry(0.95, 0.16, 0.95);
    this.casas = CASAS.map((tipo, i) => {
      const m = new THREE.Mesh(geo, [lateral, lateral, materiais[tipo], baixo, lateral, lateral]);
      const { x, z } = posicaoCasa(i);
      m.position.set(x, 0.08, z);
      this.scene.add(m);
      return m;
    });
  }

  construirCentro() {
    const tamanho = LADO - 1.08;
    this.tapete = new THREE.Mesh(new THREE.BoxGeometry(tamanho, 0.1, tamanho), new THREE.MeshLambertMaterial({ color: 0x0d2a1b }));
    this.tapete.position.y = 0.03;
    this.scene.add(this.tapete);
    const canvas = document.createElement('canvas');
    this.relvado = new Relvado(canvas);
    this.texturaRelvado = new THREE.CanvasTexture(canvas);
    this.texturaRelvado.colorSpace = THREE.SRGBColorSpace;
    this.texturaRelvado.anisotropy = 4;
    this.campo = new THREE.Mesh(new THREE.PlaneGeometry(tamanho, tamanho * (512 / 768)), new THREE.MeshBasicMaterial({ map: this.texturaRelvado }));
    this.campo.rotation.x = -Math.PI / 2;
    this.campo.position.y = 0.09;
    this.scene.add(this.campo);
  }

  /** As bancadas crescem à volta do relvado e o painel da classificação sobe por trás delas. */
  construirEstadio() {
    this.bancadas = new THREE.Group();
    const padrao = texturaPublico();
    const lado = new THREE.MeshLambertMaterial({ color: 0x33261e });
    // Cada degrau fica mais alto à medida que se afasta do relvado (sentido dá a direção, para fora).
    const degraus = (eixo, interior, sentido, comprimento, fundo, alturas) => {
      const d = fundo / alturas.length;
      alturas.forEach((h, n) => {
        const fora = interior + sentido * d * (n + 0.5);
        const [lx, lz] = eixo === 'x' ? [d, comprimento] : [comprimento, d];
        const mapa = padrao.clone();
        mapa.repeat.set(lx, lz);
        mapa.needsUpdate = true;
        const publico = new THREE.MeshLambertMaterial({ map: mapa });
        const m = new THREE.Mesh(new THREE.BoxGeometry(lx, h, lz), [lado, lado, publico, lado, lado, lado]);
        m.position.set(eixo === 'x' ? fora : 0, h / 2, eixo === 'x' ? 0 : fora);
        this.bancadas.add(m);
      });
    };
    // Largas atrás e dos lados; à frente mais baixas, para não taparem o relvado.
    degraus('z', -3.7, -1, 12.8, 2, [0.45, 0.9, 1.35]);
    degraus('z', 3.7, 1, 12.8, 1.8, [0.2, 0.4]);
    degraus('x', -5.15, -1, 7.4, 1.25, [0.4, 0.8]);
    degraus('x', 5.15, 1, 7.4, 1.25, [0.4, 0.8]);
    this.scene.add(this.bancadas);

    // A classificação: um painel em cada lado de trás e dos lados.
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    this.canvasQuadro = canvas;
    this.texturaQuadro = new THREE.CanvasTexture(canvas);
    this.texturaQuadro.colorSpace = THREE.SRGBColorSpace;
    this.painel = new THREE.Mesh(new THREE.PlaneGeometry(12.4, 3.1), new THREE.MeshBasicMaterial({ map: this.texturaQuadro, transparent: true }));
    this.painel.rotation.x = -1;
    this.painel.position.set(0, 2.1, -7);
    this.scene.add(this.painel);
    this.desenharQuadro([]);
  }

  construirDados() {
    const materiais = FACES_DADO.map((n) => new THREE.MeshLambertMaterial({ map: texturaDado(n) }));
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    this.dados = [0, 1].map((i) => {
      const d = new THREE.Mesh(geo, materiais);
      d.position.set(i === 0 ? -0.65 : 0.65, 0.55, 0.15);
      d.visible = false;
      this.scene.add(d);
      return d;
    });
  }

  novaPeca(equipa) {
    const g = new THREE.Group();
    const corpo = new THREE.MeshLambertMaterial({ color: new THREE.Color(equipa.kit.principal) });
    const detalhe = new THREE.MeshLambertMaterial({ color: new THREE.Color(equipa.kit.secundaria) });
    const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.1, 10), detalhe);
    pe.position.y = 0.05;
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.34, 10), corpo);
    tronco.position.y = 0.27;
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), corpo);
    cabeca.position.y = 0.52;
    g.add(pe, tronco, cabeca);
    this.scene.add(g);
    return g;
  }

  // --- Estado ---

  /** Recebe o estado do jogo e põe a cena a condizer. */
  atualizar(S, EU) {
    const agora = performance.now();
    const emMercado = S.fase === 'janela';
    this.definirModo(emMercado ? 0 : 1, this.jaDesenhou && !this.reduzir);
    this.atualizarPecas(S, agora);
    this.atualizarDados(S);
    this.atualizarQuadro(S);
    this.atualizarJogo(S, EU, agora);
    this.jaDesenhou = true;
    this.pedir();
  }

  definirModo(alvo, animar) {
    if (this.alvo === alvo) return;
    this.alvo = alvo;
    if (!animar) {
      this.tweens = this.tweens.filter((t) => t.nome !== 'modo');
      this.progresso = alvo;
      this.aplicarProgresso(alvo);
      return;
    }
    const de = this.progresso;
    this.animar('modo', 2600, (x) => {
      this.progresso = de + (alvo - de) * suave(x);
      this.aplicarProgresso(this.progresso);
    });
  }

  aplicarProgresso(p) {
    // As casas viram-se e afundam-se em cascata.
    this.casas.forEach((m, i) => {
      const s = suave(limitar(p * 1.5 - (i / this.casas.length) * 0.5));
      m.rotation.x = Math.PI * s;
      m.position.y = 0.08 - 1.5 * s + Math.sin(Math.PI * s) * 0.5;
      m.visible = s < 0.995;
    });
    // O centro cresce e passa a ser o relvado; o tabuleiro escurece e vira o chão do estádio.
    const c = suave(limitar((p - 0.25) / 0.75));
    const escala = 1 + 0.22 * c;
    this.tapete.scale.set(1 + 0.3 * c, 1, 1 - 0.08 * c);
    this.campo.position.y = 0.09 + 0.02 * c;
    this.campo.scale.set(escala, escala, 1);
    this.base.material.color.lerpColors(COR_TABULEIRO, COR_ESTADIO, c);
    // As bancadas crescem do chão e a classificação aparece atrás delas.
    const b = suave(limitar((p - 0.4) / 0.6));
    this.bancadas.scale.y = Math.max(0.001, b);
    this.bancadas.visible = b > 0.001;
    this.painel.position.y = -0.5 + 2.6 * b;
    this.painel.visible = b > 0.001;
    this.painel.material.opacity = b;
    // Peões e dados saem de cena no início.
    const fora = limitar(p * 4);
    for (const { grupo } of this.pecas.values()) {
      grupo.visible = fora < 1;
      grupo.scale.setScalar(1 - fora);
    }
    this.dados.forEach((d) => {
      d.scale.setScalar(1 - fora);
    });
    // Câmara em curva suave.
    const q = suave(p);
    const [de, para] = [CAMARA.mercado, CAMARA.estadio];
    const arco = Math.sin(Math.PI * q) * 1.2;
    const mistura = (a, b2, k) => a + (b2 - a) * k;
    const factor = this.afastamento ?? 1;
    this.camera.position.set(mistura(de.pos[0], para.pos[0], q), mistura(de.pos[1], para.pos[1], q) * factor + arco, mistura(de.pos[2], para.pos[2], q) * factor);
    this.camera.lookAt(mistura(de.alvo[0], para.alvo[0], q), mistura(de.alvo[1], para.alvo[1], q), mistura(de.alvo[2], para.alvo[2], q));
  }

  atualizarPecas(S, agora) {
    const posicoes = S.janela?.posicao ?? null;
    if (!posicoes) {
      for (const { grupo } of this.pecas.values()) grupo.visible = false;
      return;
    }
    const ids = Object.keys(posicoes);
    for (const id of ids) {
      if (!this.pecas.has(id)) this.pecas.set(id, { grupo: this.novaPeca(S.equipas[id]), casa: posicoes[id] });
      const peca = this.pecas.get(id);
      if (peca.casa !== posicoes[id]) this.moverPeca(id, peca, posicoes[id], ids);
      else if (!peca.emMovimento) this.colocarPeca(id, peca, ids, posicoes);
      peca.grupo.visible = this.progresso < 0.25;
    }
    for (const [id, { grupo }] of this.pecas) if (!ids.includes(id)) grupo.visible = false;
    this.vez = S.janela.ordem?.[S.janela.vez] ?? null;
    void agora;
  }

  /** Várias peças na mesma casa ficam lado a lado. */
  deslocamento(id, casa, ids, posicoes) {
    const aqui = ids.filter((x) => posicoes[x] === casa);
    const n = aqui.indexOf(id);
    if (aqui.length <= 1) return { x: 0, z: 0 };
    return { x: ((n % 2) - 0.5) * 0.42, z: (Math.floor(n / 2) - (aqui.length > 2 ? 0.5 : 0)) * 0.42 };
  }

  colocarPeca(id, peca, ids, posicoes) {
    const { x, z } = posicaoCasa(peca.casa);
    const d = this.deslocamento(id, peca.casa, ids, posicoes);
    peca.grupo.position.set(x + d.x, 0.16, z + d.z);
  }

  /** O peão salta de casa em casa até à nova. */
  moverPeca(id, peca, para) {
    const passos = caminho(peca.casa, para);
    peca.casa = para;
    if (!passos.length || this.reduzir) {
      const { x, z } = posicaoCasa(para);
      peca.grupo.position.set(x, 0.16, z);
      return;
    }
    peca.emMovimento = true;
    const inicio = peca.grupo.position.clone();
    const pontos = [inicio, ...passos.map((c) => {
      const { x, z } = posicaoCasa(c);
      return new THREE.Vector3(x, 0.16, z);
    })];
    this.animar(`peca-${id}`, Math.min(1800, passos.length * 170), (t) => {
      const k = t * (pontos.length - 1);
      const n = Math.min(pontos.length - 2, Math.floor(k));
      const s = k - n;
      peca.grupo.position.lerpVectors(pontos[n], pontos[n + 1], s);
      peca.grupo.position.y = 0.16 + Math.sin(Math.PI * s) * 0.45;
      if (t >= 1) peca.emMovimento = false;
    });
  }

  atualizarDados(S) {
    const lance = S.janela?.ultimoLance ?? null;
    if (!lance) {
      this.dados.forEach((d) => { d.visible = false; });
      this.ultimoLance = null;
      return;
    }
    const chave = JSON.stringify(lance);
    if (chave === this.ultimoLance) return;
    const primeiro = this.ultimoLance === null && !this.jaDesenhou;
    this.ultimoLance = chave;
    this.dados.forEach((d, i) => {
      const n = lance.dados[i];
      d.visible = n != null;
      if (n == null) return;
      if (lance.dados.length === 1) d.position.x = 0;
      else d.position.x = i === 0 ? -0.65 : 0.65;
      const [rx, ry, rz] = ROTACAO_DADO[n];
      const fim = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
      const giro = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI * 2, 0));
      fim.premultiply(giro);
      if (primeiro || this.reduzir) {
        d.quaternion.copy(fim);
        return;
      }
      const eixos = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const volta = new THREE.Quaternion();
      this.animar(`dado-${i}`, 800, (t) => {
        const s = 1 - (1 - t) ** 3;
        volta.setFromAxisAngle(eixos, (1 - s) * Math.PI * 7);
        d.quaternion.copy(fim).premultiply(volta);
        d.position.y = 0.55 + Math.sin(Math.PI * t) * 2.1;
      });
    });
  }

  atualizarQuadro(S) {
    const linhas = S.tabela ?? [];
    const chave = JSON.stringify(linhas.map((l) => [l.equipa, l.pts, l.gm - l.gs]));
    if (chave === this.quadro) return;
    this.quadro = chave;
    this.desenharQuadro(linhas.map((l) => ({ nome: S.equipas[l.equipa]?.nome ?? '?', pts: l.pts, dg: l.gm - l.gs })));
  }

  desenharQuadro(linhas) {
    const c = this.canvasQuadro.getContext('2d');
    const { width: W, height: H } = this.canvasQuadro;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#06140df0';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = '#c49a6c';
    c.lineWidth = 6;
    c.strokeRect(3, 3, W - 6, H - 6);
    c.textBaseline = 'middle';
    const colunas = linhas.length > 5 ? 2 : 1;
    const porColuna = Math.ceil(linhas.length / colunas) || 1;
    const altura = (H - 24) / Math.max(porColuna, 3);
    c.font = `800 ${Math.min(34, altura * 0.62)}px Inter, sans-serif`;
    linhas.forEach((l, i) => {
      const col = Math.floor(i / porColuna);
      const x0 = 24 + col * (W / colunas);
      const larg = W / colunas - 48;
      const y = 12 + altura * (i % porColuna + 0.5);
      c.textAlign = 'left';
      c.fillStyle = '#d7b48c';
      c.fillText(`${i + 1}.`, x0, y);
      c.fillStyle = '#fff';
      c.fillText(l.nome.length > 20 ? `${l.nome.slice(0, 19)}…` : l.nome, x0 + 44, y);
      c.textAlign = 'right';
      c.fillStyle = '#d7b48c';
      c.fillText(String(l.pts), x0 + larg, y);
    });
    if (!linhas.length) {
      c.textAlign = 'center';
      c.fillStyle = '#d7b48c';
      c.font = '60px Anton, Impact, sans-serif';
      c.fillText('Classificação', W / 2, H / 2);
    }
    this.texturaQuadro.needsUpdate = true;
  }

  atualizarJogo(S, EU, agora) {
    const c = S.campeonato;
    if (S.fase === 'campeonato' && c?.jogos?.length) {
      const meu = c.jogos.find((j) => j.lados.some((l) => l.equipa === EU?.equipa)) ?? c.jogos[0];
      this.relvado.definirJogo(meu, S.equipas, agora);
      this.relvadoAtivo = true;
    } else {
      const titulo = S.fase === 'campeonato' ? (c.competicao === 'taca' ? `Taça · ${c.ronda}` : `Jornada ${Math.min(c.jornada + 1, c.jornadas)}`) : S.fase === 'fimEpoca' ? `Fim da época ${S.epoca}` : S.fase === 'fim' ? 'Fim da partida' : '';
      if (this.tituloRelvado !== titulo || this.relvado.chave) {
        this.tituloRelvado = titulo;
        this.relvado.semJogo(titulo);
        this.texturaRelvado.needsUpdate = true;
      }
      this.relvadoAtivo = false;
    }
  }

  // --- Animação ---

  animar(nome, duracao, passo) {
    this.tweens = this.tweens.filter((t) => t.nome !== nome);
    this.tweens.push({ nome, inicio: performance.now(), duracao, passo });
    this.pedir();
  }

  pedir() {
    if (this.aDesenhar) return;
    this.aDesenhar = true;
    requestAnimationFrame((t) => this.ciclo(t));
  }

  ciclo(t) {
    this.aDesenhar = false;
    const agora = performance.now();
    this.tweens = this.tweens.filter((tw) => {
      const x = limitar((agora - tw.inicio) / tw.duracao);
      tw.passo(x);
      return x < 1;
    });
    let continuar = this.tweens.length > 0;
    if (this.relvadoAtivo) {
      // O relvado atualiza a 15 imagens por segundo: chega para os pontos e poupa o telemóvel.
      if (!this.ultimaTextura || agora - this.ultimaTextura > 66) {
        const aMexer = this.relvado.tick(agora);
        this.texturaRelvado.needsUpdate = true;
        this.ultimaTextura = agora;
        this.relvadoMexe = aMexer;
      }
      continuar = continuar || this.relvadoMexe;
    }
    this.renderer.render(this.scene, this.camera);
    if (continuar) this.pedir();
    void t;
  }

  redimensionar() {
    const w = this.caixa.clientWidth;
    const h = this.caixa.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.afastamento = Math.max(1, 1 / this.camera.aspect);
    this.camera.updateProjectionMatrix();
    this.aplicarProgresso(this.progresso);
    this.pedir();
  }
}
