// Visualização de um jogo ao estilo do 2D do Football Manager: pontos a mexer, remate e golo, desenhados num canvas.
// Serve de textura no relvado 3D e, sem WebGL, aparece diretamente na página.
import { CONFIG } from './comum/config.gen.js';
import { LUGARES } from './campo.js';

const J = CONFIG.jogo;
const DURACAO_PERIODO = J.segundosPorPeriodo * 1000;
const LARGURA = 768;
const ALTURA = 512;
const TOPO = 56; // barra do resultado

/** Escala o minuto de um evento para dentro do tempo do período no ecrã. */
export function tempoNoPeriodo(minuto, duracao = DURACAO_PERIODO) {
  const dentro = ((minuto - 1) % J.minutosPorPeriodo) / J.minutosPorPeriodo;
  return Math.max(0, dentro) * duracao * 0.9;
}

/**
 * Os eventos novos de um período viram jogadas: cada lance com oportunidade leva a bola à baliza, e o golo que vem a seguir
 * (do mesmo lado e minuto) acaba dentro dela. Os outros eventos só mostram um texto.
 */
export function planearEventos(eventos, duracao = DURACAO_PERIODO) {
  const plano = [];
  eventos.forEach((ev, i) => {
    const t = tempoNoPeriodo(ev.minuto, duracao);
    if (ev.tipo === 'lance') {
      const golo = eventos.slice(i + 1).find((o) => o.tipo === 'golo' && o.lado === ev.lado && o.minuto === ev.minuto && o.origem === 'jogada');
      plano.push({ t, tipo: ev.oportunidade === 'nada' ? 'posse' : 'ataque', lado: ev.lado, oportunidade: ev.oportunidade, golo: Boolean(golo), marcador: golo?.jogador ?? null });
    } else if (ev.tipo === 'golo' && ev.origem !== 'jogada') {
      plano.push({ t, tipo: 'golo-direto', lado: ev.lado, marcador: ev.jogador, texto: ev.origem === 'penalti' ? 'Penálti' : 'Bola parada' });
    } else if (ev.tipo !== 'golo') {
      plano.push({ t, tipo: 'texto', lado: ev.lado, texto: textoCurto(ev) });
    }
  });
  return plano.sort((a, b) => a.t - b.t);
}

function textoCurto(ev) {
  switch (ev.tipo) {
    case 'leve':
      return ev.texto;
    case 'vermelho':
      return 'Vermelho!';
    case 'lesao':
      return 'Lesão';
    case 'penalti':
      return ev.marcou ? null : 'Penálti falhado';
    case 'bolaParada':
      return ev.marcou ? null : 'Bola parada sem perigo';
    case 'substituicao':
      return `Entra ${ev.entra}`;
    default:
      return null;
  }
}

const suave = (x) => x * x * (3 - 2 * x);

export class Relvado {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    this.c = canvas.getContext('2d');
    this.chave = null;
    this.visto = 0;
    this.plano = [];
    this.inicio = 0;
    this.golos = [0, 0];
    this.bola = { x: 0.5, y: 0.5 };
    this.percurso = null;
    this.posse = 0;
    this.aviso = null;
    this.jogadores = [[], []];
    this.equipas = null;
    this.titulo = '';
    this.minuto = 0;
    this.acabou = false;
    this.desenhar(0);
  }

  /** Sem jogo: mostra só um texto no relvado (a jornada, por exemplo). */
  semJogo(titulo = '') {
    this.chave = null;
    this.titulo = titulo;
    this.jogadores = [[], []];
    this.plano = [];
    this.percurso = null;
    this.aviso = null;
    this.acabou = false;
    this.desenhar(0);
  }

  /** Recebe o jogo do estado do servidor. Só as jogadas novas são animadas. */
  definirJogo(jogo, equipas, agora) {
    const [a, b] = jogo.lados;
    const chave = `${a.equipa}-${b.equipa}`;
    const novo = chave !== this.chave || jogo.eventos.length < this.visto;
    this.equipas = jogo.lados.map((l) => equipas[l.equipa]);
    if (novo) {
      this.chave = chave;
      this.visto = jogo.eventos.length;
      this.golos = [a.golos, b.golos];
      this.minuto = jogo.periodo * J.minutosPorPeriodo;
      this.minutoInicio = this.minuto;
      this.inicio = agora;
      this.plano = [];
      this.percurso = null;
      this.aviso = null;
      this.titulo = '';
      this.jogadores = jogo.lados.map((l, i) => this.colocar(l, equipas[l.equipa], i));
    } else {
      jogo.lados.forEach((l, i) => this.atualizarOnze(l, i));
    }
    if (jogo.eventos.length > this.visto) {
      // O período anterior pode não ter acabado de se ver: o resultado certo é o que o servidor tinha.
      if (this.final) this.golos = [...this.final.golos];
      this.plano = planearEventos(jogo.eventos.slice(this.visto));
      this.visto = jogo.eventos.length;
      this.inicio = agora;
      this.minutoInicio = this.minuto;
    }
    this.final = { golos: [a.golos, b.golos], periodo: jogo.periodo, acabou: jogo.acabou };
  }

  /** Posições de partida: cada equipa na sua metade, a atacar a baliza adversária. */
  colocar(lado, equipa, i) {
    const lugares = LUGARES[equipa.formacao] ?? LUGARES['4-4-2'];
    return lado.onze.map((l, n) => {
      const [x, y] = lugares[n] ?? [50, 50];
      const u = (100 - y) / 100; // 0 na própria baliza, 1 no ataque
      const px = i === 0 ? 0.05 + u * 0.42 : 0.95 - u * 0.42;
      const py = 0.08 + (x / 100) * 0.84;
      return { casa: { x: px, y: py }, x: px, y: py, fase: n * 1.7 + i, jogador: l.jogador };
    });
  }

  atualizarOnze(lado, i) {
    lado.onze.forEach((l, n) => {
      if (this.jogadores[i][n]) this.jogadores[i][n].jogador = l.jogador;
    });
  }

  /** A jogada: a bola passa pelo meio-campo, entra na área e acaba na baliza, para fora ou nas mãos do guarda-redes. */
  iniciarJogada(p, agora) {
    const dir = p.lado === 0 ? 1 : -1;
    const alvoX = (u) => 0.5 + dir * u;
    const y = () => 0.2 + Math.random() * 0.6;
    const pontos = [{ x: this.bola.x, y: this.bola.y }];
    this.posse = p.lado;
    if (p.tipo === 'posse') {
      pontos.push({ x: alvoX(0.05 + Math.random() * 0.15), y: y() });
      this.percurso = { pontos, inicio: agora, duracao: 900 };
      return;
    }
    const alcance = { baixa: 0.3, media: 0.36, alta: 0.42, certo: 0.44 }[p.oportunidade] ?? 0.3;
    pontos.push({ x: alvoX(alcance * 0.45), y: y() }, { x: alvoX(alcance), y: 0.3 + Math.random() * 0.4 });
    pontos.push(p.golo ? { x: alvoX(0.5), y: 0.45 + Math.random() * 0.1 } : { x: alvoX(0.5), y: Math.random() < 0.5 ? 0.3 : 0.7 });
    this.percurso = { pontos, inicio: agora, duracao: 1500, fim: p };
  }

  /** Avança a animação. Devolve true enquanto houver alguma coisa a mexer. */
  tick(agora) {
    if (!this.chave) return false;
    const t = agora - this.inicio;
    while (this.plano.length && this.plano[0].t <= t) {
      const p = this.plano.shift();
      if (p.tipo === 'posse' || p.tipo === 'ataque') this.iniciarJogada(p, agora);
      else if (p.tipo === 'golo-direto') this.marcar(p.lado, p.marcador, agora, p.texto);
      else if (p.texto) this.aviso = { texto: p.texto, ate: agora + 1400 };
    }
    if (this.final) this.minuto = Math.min(this.final.periodo * J.minutosPorPeriodo, this.minutoInicio + (t / DURACAO_PERIODO) * J.minutosPorPeriodo);
    if (this.percurso) {
      const { pontos, inicio, duracao, fim } = this.percurso;
      const prog = Math.min(1, (agora - inicio) / duracao);
      const seg = Math.min(pontos.length - 2, Math.floor(prog * (pontos.length - 1)));
      const s = suave(prog * (pontos.length - 1) - seg);
      this.bola.x = pontos[seg].x + (pontos[seg + 1].x - pontos[seg].x) * s;
      this.bola.y = pontos[seg].y + (pontos[seg + 1].y - pontos[seg].y) * s;
      if (prog >= 1) {
        if (fim?.golo) this.marcar(fim.lado, fim.marcador, agora);
        this.percurso = null;
        if (fim) this.recomeco = agora + 900;
      }
    } else if (this.recomeco && agora > this.recomeco) {
      this.bola = { x: 0.5, y: 0.5 };
      this.recomeco = null;
    }
    // No fim do jogo, o resultado do servidor manda.
    if (this.final?.acabou && !this.plano.length && !this.percurso) {
      this.golos = [...this.final.golos];
      this.acabou = true;
    } else this.acabou = false;
    this.moverJogadores(agora);
    this.desenhar(agora);
    return !this.acabou || Boolean(this.aviso);
  }

  marcar(lado, nome, agora, texto = null) {
    this.golos[lado]++;
    this.aviso = { texto: `GOLO! ${nome ?? ''}`, ate: agora + 1900, golo: true, extra: texto };
  }

  moverJogadores(agora) {
    this.jogadores.forEach((equipa, i) => {
      const dir = i === 0 ? 1 : -1;
      const empurra = (this.bola.x - 0.5) * 0.3 + (this.posse === i ? dir * 0.05 : -dir * 0.02);
      equipa.forEach((j, n) => {
        const ondula = 0.012;
        let alvoX = j.casa.x + (n === 0 ? empurra * 0.2 : empurra) + Math.sin(agora / 700 + j.fase) * ondula;
        let alvoY = j.casa.y + (this.bola.y - 0.5) * 0.12 + Math.cos(agora / 900 + j.fase) * ondula;
        // Quem está mais perto vai à bola.
        const dx = this.bola.x - j.x;
        const dy = this.bola.y - j.y;
        if (dx * dx + dy * dy < 0.012 && n !== 0) {
          alvoX = this.bola.x;
          alvoY = this.bola.y;
        }
        j.x += (alvoX - j.x) * 0.06;
        j.y += (alvoY - j.y) * 0.06;
      });
    });
  }

  desenhar(agora) {
    const c = this.c;
    const W = LARGURA;
    const H = ALTURA - TOPO;
    c.save();
    // Relvado com riscas
    c.fillStyle = '#1c6b40';
    c.fillRect(0, 0, LARGURA, ALTURA);
    c.fillStyle = '#186139';
    for (let i = 0; i < 10; i += 2) c.fillRect((i * W) / 10, TOPO, W / 10, H);
    // Linhas
    c.strokeStyle = '#ffffffb0';
    c.lineWidth = 3;
    const m = 18;
    const px = (x) => m + x * (W - 2 * m);
    const py = (y) => TOPO + m + y * (H - 2 * m);
    c.strokeRect(px(0), py(0), W - 2 * m, H - 2 * m);
    c.beginPath();
    c.moveTo(px(0.5), py(0));
    c.lineTo(px(0.5), py(1));
    c.moveTo(px(0.5) + 56, py(0.5));
    c.arc(px(0.5), py(0.5), 56, 0, Math.PI * 2);
    c.stroke();
    for (const [x, sinal] of [[0, 1], [1, -1]]) {
      c.strokeRect(px(x), py(0.2), sinal * 0.15 * (W - 2 * m), 0.6 * (H - 2 * m));
      c.strokeRect(px(x), py(0.36), sinal * 0.055 * (W - 2 * m), 0.28 * (H - 2 * m));
    }
    // Jogadores
    this.jogadores.forEach((equipa, i) => {
      const kit = this.equipas?.[i]?.kit;
      equipa.forEach((j) => {
        c.beginPath();
        c.arc(px(j.x), py(j.y), 11, 0, Math.PI * 2);
        c.fillStyle = kit?.principal ?? '#fff';
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = kit?.secundaria ?? '#000';
        c.stroke();
      });
    });
    if (this.chave) {
      c.beginPath();
      c.arc(px(this.bola.x), py(this.bola.y), 6, 0, Math.PI * 2);
      c.fillStyle = '#fff';
      c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = '#000';
      c.stroke();
    }
    // Resultado
    c.fillStyle = '#06140de6';
    c.fillRect(0, 0, LARGURA, TOPO);
    c.textBaseline = 'middle';
    if (this.chave && this.equipas) {
      c.font = '34px Anton, Impact, sans-serif';
      c.fillStyle = '#fff';
      c.textAlign = 'center';
      c.fillText(`${this.golos[0]} – ${this.golos[1]}`, W / 2, TOPO / 2);
      c.font = '700 20px Inter, sans-serif';
      c.textAlign = 'right';
      c.fillText(cortar(this.equipas[0].nome, 22), W / 2 - 62, TOPO / 2);
      c.textAlign = 'left';
      c.fillText(cortar(this.equipas[1].nome, 22), W / 2 + 62, TOPO / 2);
      c.textAlign = 'right';
      c.fillStyle = '#d7b48c';
      c.font = '700 18px Inter, sans-serif';
      c.fillText(this.acabou ? 'Fim' : `${Math.floor(this.minuto)}'`, W - 14, TOPO / 2);
    } else if (this.titulo) {
      c.font = '28px Anton, Impact, sans-serif';
      c.fillStyle = '#fff';
      c.textAlign = 'center';
      c.fillText(this.titulo, W / 2, TOPO / 2);
    }
    // Aviso (golo, cartão, lesão)
    if (this.aviso) {
      if (agora > this.aviso.ate) this.aviso = null;
      else {
        const golo = this.aviso.golo;
        c.fillStyle = golo ? '#c49a6ce6' : '#06140dcc';
        const h = golo ? 92 : 50;
        c.fillRect(0, ALTURA / 2 - h / 2 + TOPO / 2, LARGURA, h);
        c.fillStyle = golo ? '#1f120d' : '#fff';
        c.textAlign = 'center';
        c.font = golo ? '50px Anton, Impact, sans-serif' : '700 22px Inter, sans-serif';
        c.fillText(this.aviso.texto, W / 2, ALTURA / 2 + TOPO / 2);
      }
    }
    c.restore();
  }
}

const cortar = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
