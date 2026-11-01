// Durable Object de uma sala: WebSockets (com hibernação), persistência e alarmes. (Padrão do Scout Report.)
// Toda a lógica está em src/motor; aqui só há I/O. A sala guarda-se inteira na chave 'sala' e não expira no fim
// do jogo: apaga-se só depois de CONFIG.sala.diasSemAtividade sem ninguém mexer.
import { DurableObject } from 'cloudflare:workers';
import { CONFIG } from './config.js';
import { lerBase, descomprimir } from './motor/base.js';
import * as L from './motor/sala-logica.js';
import { agir } from './motor/partida.js';
import { estadoPublico, privado } from './motor/vista.js';
import { lerEmblema } from './motor/emblema.js';

const DIA = 24 * 60 * 60 * 1000;

// A base de jogadores é a mesma para todas as salas: carrega-se uma vez por isolate.
let basePromessa = null;
function carregarBase(env) {
  basePromessa ??= env.ASSETS.fetch('https://assets/dados/jogadores.bin')
    .then((r) => {
      if (!r.ok) throw new Error(`base de jogadores: ${r.status}`);
      return descomprimir(r);
    })
    .then((b) => lerBase(b).jogadores)
    .catch((e) => {
      basePromessa = null;
      throw e;
    });
  return basePromessa;
}

export class Sala extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sala = null;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    ctx.blockConcurrencyWhile(async () => {
      this.sala = (await ctx.storage.get('sala')) ?? null;
    });
  }

  async contexto() {
    return { base: await carregarBase(this.env), aleatorio: Math.random, agora: Date.now() };
  }

  // --- RPC chamado pelo Worker ---

  async criar({ codigo, anfitriaoToken }) {
    if (this.sala) return { ok: false };
    this.sala = L.novaSala({ codigo, anfitriaoToken, agora: Date.now() });
    await this.guardar();
    return { ok: true };
  }

  async info() {
    if (!this.sala) return { existe: false };
    const ativos = this.sala.treinadores.filter((t) => !t.saiu).length;
    return { existe: true, treinadores: ativos, cheia: ativos >= CONFIG.sala.maxTreinadores, fase: this.sala.fase };
  }

  /** A imagem de um emblema, servida pelo Worker. */
  async emblema(equipaId) {
    return (await this.ctx.storage.get(`emblema:${equipaId}`)) ?? null;
  }

  // --- WebSockets ---

  async fetch() {
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    servidor.serializeAttachment({ treinador: null });
    if (!this.sala) {
      this.enviar(servidor, { t: 'erro', msg: 'Esta sala não existe ou já expirou.', fatal: true });
      servidor.close(4004, 'sala inexistente');
    }
    return new Response(null, { status: 101, webSocket: cliente });
  }

  async webSocketMessage(ws, mensagem) {
    if (!this.sala || typeof mensagem !== 'string') return;
    // Só o emblema traz uma imagem; todas as outras mensagens são pequenas.
    const limite = mensagem.startsWith('{"t":"emblema"') ? (CONFIG.sala.emblema.maxKB * 1024 * 4) / 3 + 100 : 4000;
    if (mensagem.length > limite) return;
    let msg;
    try {
      msg = JSON.parse(mensagem);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
    const id = ws.deserializeAttachment()?.treinador ?? null;
    const sala = this.sala;
    let ctx;
    try {
      ctx = await this.contexto();
    } catch {
      this.enviar(ws, { t: 'erro', msg: 'Não foi possível carregar a base de jogadores.' });
      return;
    }

    if (msg.t === 'entrar') {
      const r = L.entrar(sala, { token: msg.token, nome: msg.nome }, ctx);
      if (r.erro) {
        this.enviar(ws, { t: 'erro', msg: r.erro, fatal: true });
        ws.close(4003, 'recusado');
        return;
      }
      ws.serializeAttachment({ treinador: r.jogador.id });
      this.enviar(ws, { t: 'bemvindo', eu: r.jogador.id });
      await this.publicar(ctx);
      return;
    }
    if (!id) return;

    let r;
    switch (msg.t) {
      case 'config':
        r = L.configurar(sala, id, msg);
        break;
      case 'equipa':
        r = L.editarEquipa(sala, id, { nome: msg.nome, kit: msg.kit });
        break;
      case 'emblema':
        r = await this.guardarEmblema(id, msg.dados);
        break;
      case 'pronto':
        r = L.marcarPronto(sala, id, msg.pronto);
        break;
      case 'sair':
        r = { ok: L.sair(sala, id, ctx) };
        break;
      default:
        try {
          r = agir(sala, ctx, id, msg);
        } catch (e) {
          console.error('erro no motor', msg.t, e);
          r = { erro: 'Ocorreu um erro inesperado.' };
        }
    }
    if (r?.erro) {
      this.enviar(ws, { t: 'erro', msg: r.erro });
      return;
    }
    await this.publicar(ctx);
  }

  async webSocketClose(ws) {
    await this.saiu(ws);
  }

  async webSocketError(ws) {
    await this.saiu(ws);
  }

  async saiu(ws) {
    const id = ws.deserializeAttachment()?.treinador;
    if (!id || !this.sala) return;
    const outros = this.ctx.getWebSockets().filter((w) => w !== ws && w.deserializeAttachment()?.treinador === id);
    if (outros.length) return; // ainda tem outro separador aberto
    if (L.desligar(this.sala, id)) await this.publicar(await this.contexto());
  }

  /**
   * Os emblemas ficam à parte, cada um na sua chave: o estado só leva o endereço, para não pesar em cada mensagem.
   * O `v` no endereço muda a cada troca, por isso o browser pode guardar a imagem para sempre.
   */
  async guardarEmblema(id, dados) {
    const pode = L.editarEquipa(this.sala, id, {});
    if (pode.erro) return pode;
    const t = this.sala.treinadores.find((x) => x.id === id);
    const e = this.sala.equipas[t.equipa];
    const chave = `emblema:${t.equipa}`;
    if (dados == null) {
      await this.ctx.storage.delete(chave);
      e.emblema = null;
      return { ok: true };
    }
    const imagem = lerEmblema(dados);
    if (imagem.erro) return imagem;
    await this.ctx.storage.put(chave, imagem);
    e.emblema = `/api/salas/${this.sala.codigo}/emblemas/${encodeURIComponent(t.equipa)}?v=${Date.now()}`;
    return { ok: true };
  }

  // --- Alarme: limpeza das salas abandonadas ---

  async alarm() {
    if (!this.sala) return;
    if (Date.now() - this.sala.atualizada > CONFIG.sala.diasSemAtividade * DIA) {
      await this.ctx.storage.deleteAll();
      this.sala = null;
      return;
    }
    await this.agendar();
  }

  // --- utilitários ---

  async publicar(ctx) {
    this.sala.atualizada = Date.now();
    await this.guardar();
    this.difundir(ctx);
    await this.agendar();
  }

  async guardar() {
    await this.ctx.storage.put('sala', this.sala);
  }

  async agendar() {
    // A limpeza da sala abandonada.
    const quando = this.sala.atualizada + CONFIG.sala.diasSemAtividade * DIA + 1000;
    if ((await this.ctx.storage.getAlarm()) !== quando) await this.ctx.storage.setAlarm(quando);
  }

  /** Cada socket recebe o estado público e a sua parte privada. */
  difundir(ctx) {
    const publico = JSON.stringify(estadoPublico(this.sala, ctx));
    for (const ws of this.ctx.getWebSockets()) {
      const id = ws.deserializeAttachment()?.treinador;
      if (!id) continue;
      try {
        ws.send(`{"t":"estado","agora":${Date.now()},"sala":${publico},"eu":${JSON.stringify(privado(this.sala, ctx, id))}}`);
      } catch {
        // socket a fechar; o webSocketClose trata do resto
      }
    }
  }

  enviar(ws, dados) {
    try {
      ws.send(JSON.stringify({ agora: Date.now(), ...dados }));
    } catch {
      // ignorado
    }
  }
}
