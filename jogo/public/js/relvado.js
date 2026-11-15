// Visualização de um jogo ao estilo do 2D do Football Manager, desenhada num canvas: as duas equipas sobem e descem
// com a bola, marcam-se e misturam-se, a bola anda de jogador em jogador e cada lance acaba em remate.
// Serve de textura no relvado 3D e, sem WebGL, aparece diretamente na página.
import { traduzir } from './idioma.js';
import { CONFIG } from './comum/config.gen.js';
import { LUGARES } from './campo.js';

const J = CONFIG.jogo;
const DURACAO_PERIODO = J.segundosPorPeriodo * 1000;
const LARGURA = 1024;
const ALTURA = 640;
const MARGEM = 22;
const INTERVALO_LANCES = 3000;

const distanciaCor = (a, b) => {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

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
    const base = { t, minuto: ev.minuto, lado: ev.lado };
    if (ev.tipo === 'lance') {
      const golo = eventos.slice(i + 1).find((o) => o.tipo === 'golo' && o.lado === ev.lado && o.minuto === ev.minuto && o.origem === 'jogada');
      plano.push({ ...base, tipo: ev.oportunidade === 'nada' ? 'posse' : 'ataque', oportunidade: ev.oportunidade, golo: Boolean(golo), marcador: golo?.jogador ?? null, assistencia: golo?.assistencia ?? null });
    } else if (ev.tipo === 'golo' && ev.origem !== 'jogada') {
      plano.push({ ...base, tipo: 'golo-direto', marcador: ev.jogador, texto: ev.origem === 'penalti' ? 'Penálti' : 'Bola parada' });
    } else if (ev.tipo !== 'golo') {
      plano.push({ ...base, tipo: 'texto', texto: textoCurto(ev), expulso: ev.tipo === 'vermelho' });
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

const limitar = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const cortar = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const suave = (x) => x * x * (3 - 2 * x);

export class Relvado {
  constructor(canvas, { aoGolo = null } = {}) {
    this.canvas = canvas;
    canvas.width = LARGURA;
    canvas.height = ALTURA;
    this.c = canvas.getContext('2d');
    this.aoGolo = aoGolo;
    this.chave = null;
    this.titulo = '';
    this.limpar();
    this.desenhar(0);
  }

  limpar() {
    this.visto = 0;
    this.plano = [];
    this.golos = [0, 0];
    this.bola = { x: 0.5, y: 0.5 };
    this.voo = null; // a bola a caminho: { de, para|jogador, inicio, duracao, aoChegar }
    this.jogada = null;
    this.portador = null;
    this.posse = 0;
    this.avanco = [0.3, 0.3];
    this.aviso = null;
    this.jogadores = [[], []];
    this.equipas = null;
    this.minuto = 0;
    this.minutoEvento = 0;
    this.acabou = false;
    this.final = null;
    this.pausaAte = 0;
    this.emGolo = false;
    this.ultimo = 0;
  }

  /** Sem jogo: só o relvado e, se houver, um título. */
  semJogo(titulo = '') {
    this.chave = null;
    this.titulo = titulo;
    this.limpar();
    this.desenhar(0);
  }

  /** Recebe o jogo do estado do servidor. Só as jogadas novas são animadas. */
  definirJogo(jogo, equipas, agora, { espelho = false } = {}) {
    this.espelho = espelho;
    const [a, b] = jogo.lados;
    const chave = `${a.equipa}-${b.equipa}`;
    const novo = chave !== this.chave || jogo.eventos.length < this.visto;
    if (novo) {
      this.chave = chave;
      this.titulo = '';
      this.limpar();
      this.visto = jogo.eventos.length;
      this.golos = [a.golos, b.golos];
      this.minuto = jogo.periodo * J.minutosPorPeriodo;
      this.minutoEvento = this.minuto;
      this.jogadores = jogo.lados.map((l, i) => this.colocar(l, equipas[l.equipa], i));
    } else {
      jogo.lados.forEach((l, i) => l.onze.forEach((o, n) => {
        const j = this.jogadores[i][n];
        if (j) j.nome = o.nome;
      }));
    }
    this.equipas = jogo.lados.map((l) => equipas[l.equipa]);
    // Cores parecidas: a visitante joga com a segunda cor do equipamento.
    const [casa, fora] = this.equipas.map((e) => e.kit);
    this.kits = [casa, distanciaCor(casa.principal, fora.principal) < 90 ? { principal: fora.secundaria, secundaria: fora.principal } : fora];
    if (jogo.eventos.length > this.visto) {
      // Cada lance joga-se logo, inteiro: os seguintes esperam que ele acabe.
      let quando = Math.max(agora, (this.plano.at(-1)?.quando ?? -INTERVALO_LANCES) + INTERVALO_LANCES);
      let primeiro = true;
      for (const p of planearEventos(jogo.eventos.slice(this.visto))) {
        const lance = p.tipo !== 'texto';
        if (lance && !primeiro) quando += INTERVALO_LANCES;
        if (lance) primeiro = false;
        this.plano.push({ ...p, quando: lance ? quando : quando + INTERVALO_LANCES / 2 });
      }
      this.plano.sort((a, b) => a.quando - b.quando);
      this.visto = jogo.eventos.length;
    }
    this.final = { golos: [a.golos, b.golos], periodo: jogo.periodo, acabou: jogo.acabou };
  }

  /** Já acabou a ronda no ecrã? Só aí se lança a seguinte. */
  parado() {
    return !this.plano.length && !this.voo && !this.jogada && !this.emGolo && !this.pausaAte;
  }

  /** Cada jogador guarda o seu lugar na equipa: profundidade (0 na própria baliza, 1 no ataque) e largura. */
  colocar(lado, equipa, i) {
    const lugares = LUGARES[equipa.formacao] ?? LUGARES['4-4-2'];
    return lado.onze.map((l, n) => {
      const [x, y] = lugares[n] ?? [50, 50];
      const p = { lado: i, n, u: (100 - y) / 100, v: 0.08 + (x / 100) * 0.84, nome: l.nome, gr: n === 0, desvio: { x: 0, y: 0, ate: 0 }, fora: false };
      const alvo = this.alvoBase(p, 0.3);
      p.x = alvo.x;
      p.y = alvo.y;
      return p;
    });
  }

  /** Onde o jogador está quando a equipa está nesta altura do campo (0 toda atrás, 1 toda à frente). */
  alvoBase(p, avanco) {
    const profundo = p.gr ? 0.035 + 0.06 * avanco : 0.05 + 0.06 * avanco + p.u * (0.38 + 0.44 * avanco);
    return { x: p.lado === 0 ? profundo : 1 - profundo, y: p.v };
  }

  progresso(lado, x = this.bola.x) {
    return lado === 0 ? x : 1 - x;
  }

  // --- Jogadas ---

  executar(p, agora) {
    this.minuto = Math.max(this.minuto, p.minuto);
    this.minutoEvento = Math.max(this.minutoEvento, p.minuto);
    if (p.tipo === 'texto') {
      if (p.texto) this.aviso = { texto: p.texto, ate: agora + 1400 };
      if (p.expulso) this.expulsar(p.lado);
      return;
    }
    if (p.tipo === 'golo-direto') return this.bolaParada(p, agora);
    this.jogada = { ...p, passes: p.tipo === 'ataque' ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2) };
    this.posse = p.lado;
    if (this.portador?.lado === p.lado) return this.proximaAccao(agora);
    // A outra equipa ganha a bola: quem está mais perto vai buscá-la.
    const perto = this.maisPerto(p.lado, this.bola);
    this.portador = null;
    this.chutar(perto, 240, agora, (t) => this.proximaAccao(t));
  }

  /** Penálti ou bola parada: a bola vai direta do sítio para a baliza. */
  bolaParada(p, agora) {
    this.posse = p.lado;
    this.portador = null;
    this.jogada = null;
    const dir = p.lado === 0 ? 1 : -1;
    this.bola = { x: 0.5 + dir * (p.texto === 'Penálti' ? 0.39 : 0.28), y: p.texto === 'Penálti' ? 0.5 : 0.25 };
    this.emGolo = true;
    this.aviso = { texto: p.texto, ate: agora + 500 };
    this.voo = { de: { ...this.bola }, para: { x: 0.5 + dir * 0.5, y: 0.47 }, inicio: agora + 450, duracao: 320, aoChegar: (t) => this.marcar(p.lado, p.marcador, t) };
  }

  /** O passo seguinte da jogada: mais um passe, o remate ou nada. */
  proximaAccao(agora) {
    const j = this.jogada;
    if (!j) return;
    if (j.passes > 0) {
      j.passes--;
      const colega = this.escolherColega(j);
      if (colega && colega !== this.portador) {
        const dist = Math.hypot(colega.x - this.bola.x, colega.y - this.bola.y);
        this.portador = null;
        return this.chutar(colega, limitar(dist * 1500, 240, 650), agora, (t) => this.proximaAccao(t));
      }
      return this.proximaAccao(agora);
    }
    if (j.tipo === 'ataque') return this.rematar(j, agora);
    this.jogada = null;
  }

  escolherColega(j) {
    const atual = this.portador;
    const colegas = this.jogadores[j.lado].filter((p) => !p.gr && !p.fora && p !== atual);
    if (!colegas.length) return null;
    // O golo tem de ser de quem o marcou, com o passe de quem o assistiu.
    if (j.golo && j.passes === 0 && j.marcador) return colegas.find((p) => p.nome === j.marcador) ?? (atual?.nome === j.marcador ? atual : colegas[0]);
    if (j.golo && j.passes === 1 && j.assistencia) {
      const a = colegas.find((p) => p.nome === j.assistencia);
      if (a) return a;
    }
    const pontos = colegas.map((p) => {
      const dist = Math.hypot(p.x - this.bola.x, p.y - this.bola.y);
      const frente = this.progresso(j.lado, p.x) - this.progresso(j.lado);
      return { p, nota: (j.tipo === 'ataque' ? frente * 1.6 : frente * 0.4) - dist * 0.7 + Math.random() * 0.25 - (dist < 0.05 ? 1 : 0) };
    });
    return pontos.sort((a, b) => b.nota - a.nota)[0].p;
  }

  rematar(j, agora) {
    const dir = j.lado === 0 ? 1 : -1;
    const baliza = 0.5 + dir * 0.5;
    const gr = this.jogadores[1 - j.lado][0];
    this.portador = null;
    this.jogada = null;
    if (j.golo) {
      this.emGolo = true;
      const para = { x: baliza, y: 0.43 + Math.random() * 0.14 };
      this.voo = { de: { ...this.bola }, para, inicio: agora, duracao: 420, aoChegar: (t) => this.marcar(j.lado, j.marcador, t) };
      return;
    }
    const defendida = Math.random() < 0.55 && gr;
    const para = defendida ? { x: gr.x, y: gr.y } : { x: baliza, y: Math.random() < 0.5 ? 0.34 : 0.66 };
    this.voo = { de: { ...this.bola }, para, inicio: agora, duracao: 440, aoChegar: () => {
      this.posse = 1 - j.lado;
      if (gr) this.portador = gr;
    } };
  }

  chutar(jogador, duracao, agora, aoChegar) {
    this.voo = { de: { ...this.bola }, jogador, inicio: agora, duracao, aoChegar: (t) => {
      this.portador = jogador;
      aoChegar?.(t);
    } };
  }

  marcar(lado, nome, agora) {
    this.golos[lado]++;
    this.aviso = { texto: `GOLO! ${nome ?? ''}`, ate: agora + 1900, golo: true };
    this.pausaAte = agora + 1500;
    this.emGolo = false;
    this.portador = null;
    this.jogada = null;
    this.aoGolo?.();
  }

  expulsar(lado) {
    const possiveis = this.jogadores[lado].filter((p) => !p.gr && !p.fora && p !== this.portador);
    if (possiveis.length) possiveis[Math.floor(Math.random() * possiveis.length)].fora = true;
  }

  maisPerto(lado, ponto) {
    let melhor = null;
    let d = Infinity;
    for (const p of this.jogadores[lado]) {
      if (p.fora) continue;
      const x = Math.hypot(p.x - ponto.x, p.y - ponto.y);
      if (x < d) {
        d = x;
        melhor = p;
      }
    }
    return melhor;
  }

  // --- Tempo ---

  /** Avança a animação. Devolve true enquanto houver alguma coisa a mexer. */
  tick(agora) {
    if (!this.chave) return false;
    const dt = Math.min(100, agora - (this.ultimo || agora));
    this.ultimo = agora;
    if (this.pausaAte && agora >= this.pausaAte) {
      this.pausaAte = 0;
      this.bola = { x: 0.5, y: 0.5 };
    }
    // Um golo não se interrompe: a jogada seguinte espera que a bola entre e que o jogo recomece.
    const ocupado = () => this.emGolo || this.jogada?.golo || this.pausaAte;
    while (this.plano.length && this.plano[0].quando <= agora && !ocupado()) this.executar(this.plano.shift(), agora);
    this.moverBola(agora);
    this.moverJogadores(dt, agora);
    // No fim do jogo, o resultado do servidor manda.
    this.acabou = Boolean(this.final?.acabou && !this.plano.length && !this.voo && !this.jogada && !this.emGolo);
    if (this.acabou) {
      this.golos = [...this.final.golos];
      this.minuto = this.final.periodo * J.minutosPorPeriodo;
    }
    this.desenhar(agora);
    return !this.acabou || Boolean(this.aviso);
  }

  moverBola(agora) {
    if (this.voo) {
      const { de, para, jogador, inicio, duracao, aoChegar } = this.voo;
      const prog = limitar((agora - inicio) / duracao);
      const fim = jogador ? { x: jogador.x, y: jogador.y } : para;
      const s = suave(prog);
      this.bola.x = de.x + (fim.x - de.x) * s;
      this.bola.y = de.y + (fim.y - de.y) * s;
      if (prog >= 1) {
        this.voo = null;
        aoChegar?.(agora);
      }
    } else if (this.portador) {
      // A conduzir: a bola vai colada aos pés.
      const dir = this.portador.lado === 0 ? 1 : -1;
      this.bola.x = this.portador.x + dir * 0.012;
      this.bola.y = this.portador.y;
    }
  }

  moverJogadores(dt, agora) {
    const bp = this.progresso(this.posse);
    // Quem tem a bola sobe com ela; quem defende recua na mesma medida. As duas equipas juntam-se à volta da bola.
    const alvos = [0, 1].map((i) => (this.posse === i ? 0.15 + 0.85 * bp : 0.6 - 0.6 * bp));
    this.avanco = this.avanco.map((a, i) => a + (limitar(alvos[i]) - a) * Math.min(1, dt * 0.0026));
    const ataca = this.jogadores[this.posse] ?? [];
    const defende = this.jogadores[1 - this.posse] ?? [];
    const pressiona = this.maisPerto(1 - this.posse, this.bola);
    for (const equipa of this.jogadores) {
      const aDefender = equipa === defende;
      const dir = equipa[0]?.lado === 0 ? 1 : -1;
      for (const p of equipa) {
        if (p.fora) continue;
        if (agora > p.desvio.ate) {
          p.desvio = { x: (Math.random() - 0.5) * 0.09, y: (Math.random() - 0.5) * 0.14, ate: agora + 900 + Math.random() * 1200 };
        }
        const base = this.alvoBase(p, this.avanco[p.lado]);
        // Toda a equipa encosta para o lado da bola.
        let x = base.x + (p.gr ? 0 : p.desvio.x);
        let y = base.y + (this.bola.y - 0.5) * (p.gr ? 0.25 : 0.32) + (p.gr ? 0 : p.desvio.y);
        if (aDefender && !p.gr) {
          // Cada defensor marca o atacante mais próximo, entre ele e a baliza; o mais perto vai à bola.
          let marcado = null;
          let d = Infinity;
          for (const a of ataca) {
            if (a.fora || a.gr) continue;
            const q = Math.hypot(a.x - p.x, a.y - p.y);
            if (q < d) {
              d = q;
              marcado = a;
            }
          }
          if (marcado) {
            x += (marcado.x - dir * 0.022 - x) * 0.6;
            y += (marcado.y - y) * 0.6;
          }
          if (p === pressiona) {
            x = this.bola.x;
            y = this.bola.y;
          }
        }
        if (this.portador === p && !p.gr) x += dir * 0.05;
        const dx = limitar(x, 0.02, 0.98) - p.x;
        const dy = limitar(y, 0.05, 0.95) - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.0005) {
          const passo = Math.min(dist, dt * (p === pressiona ? 0.0002 : 0.00016));
          p.x += (dx / dist) * passo;
          p.y += (dy / dist) * passo;
        }
      }
    }
  }

  // --- Desenho ---

  desenhar(agora) {
    const c = this.c;
    const W = LARGURA;
    const H = ALTURA;
    const m = MARGEM;
    const px = (x) => m + (this.espelho ? 1 - x : x) * (W - 2 * m);
    const py = (y) => m + y * (H - 2 * m);
    c.save();
    c.fillStyle = '#1c6b40';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#186139';
    for (let i = 0; i < 12; i += 2) c.fillRect((i * W) / 12, 0, W / 12, H);
    c.strokeStyle = '#ffffffc0';
    c.lineWidth = 4;
    const lx = (x) => m + x * (W - 2 * m);
    c.strokeRect(lx(0), py(0), W - 2 * m, H - 2 * m);
    c.beginPath();
    c.moveTo(lx(0.5), py(0));
    c.lineTo(lx(0.5), py(1));
    c.moveTo(lx(0.5) + 78, py(0.5));
    c.arc(lx(0.5), py(0.5), 78, 0, Math.PI * 2);
    c.stroke();
    for (const [x, sinal] of [[0, 1], [1, -1]]) {
      c.strokeRect(lx(x), py(0.2), sinal * 0.15 * (W - 2 * m), 0.6 * (H - 2 * m));
      c.strokeRect(lx(x), py(0.36), sinal * 0.055 * (W - 2 * m), 0.28 * (H - 2 * m));
      c.fillStyle = '#ffffffd9';
      c.fillRect(lx(x) - (sinal > 0 ? 8 : 0), py(0.44), 8, 0.12 * (H - 2 * m));
    }
    this.jogadores.forEach((equipa, i) => {
      const kit = this.kits?.[i];
      for (const p of equipa) {
        if (p.fora) continue;
        c.beginPath();
        c.arc(px(p.x), py(p.y), 15, 0, Math.PI * 2);
        c.fillStyle = p.gr ? '#e5e7eb' : kit?.principal ?? '#fff';
        c.fill();
        c.lineWidth = 4;
        c.strokeStyle = kit?.secundaria ?? '#000';
        c.stroke();
      }
    });
    if (this.chave) {
      if (this.portador) {
        c.font = '700 24px Inter, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'bottom';
        c.lineWidth = 4;
        c.strokeStyle = '#06140dcc';
        c.strokeText(this.portador.nome, px(this.portador.x), py(this.portador.y) - 18);
        c.fillStyle = '#fff';
        c.fillText(this.portador.nome, px(this.portador.x), py(this.portador.y) - 18);
      }
      c.beginPath();
      c.arc(px(this.bola.x), py(this.bola.y), 7.5, 0, Math.PI * 2);
      c.fillStyle = '#fff';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#000';
      c.stroke();
    }
    c.textBaseline = 'middle';
    if (!this.chave && this.titulo) {
      c.fillStyle = '#06140de0';
      c.fillRect(W / 2 - 240, H / 2 - 42, 480, 84);
      c.font = '38px Anton, Impact, sans-serif';
      c.fillStyle = '#fff';
      c.textAlign = 'center';
      c.fillText(traduzir(this.titulo), W / 2, H / 2);
    }
    if (this.aviso) {
      if (agora > this.aviso.ate) this.aviso = null;
      else {
        const golo = this.aviso.golo;
        c.fillStyle = golo ? '#c49a6cee' : '#06140dcc';
        const h = golo ? 120 : 62;
        c.fillRect(0, H / 2 - h / 2, W, h);
        c.fillStyle = golo ? '#1f120d' : '#fff';
        c.textAlign = 'center';
        c.font = golo ? '68px Anton, Impact, sans-serif' : '700 30px Inter, sans-serif';
        c.fillText(traduzir(this.aviso.texto), W / 2, H / 2);
      }
    }
    c.restore();
  }
}
