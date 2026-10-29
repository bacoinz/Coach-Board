// Sala: lobby, entrar e sair, anfitrião, configuração e espectadores (quem entra a meio).
import { CONFIG } from '../config.js';
import { novaEquipa } from './equipas.js';
import { erro, registar } from './estado.js';
import { PADROES_KIT } from './kits.js';

const CORES = ['#3b82f6', '#ef4444', '#eab308', '#22c55e', '#ec4899', '#14b8a6', '#f97316', '#a855f7'];

export function novaSala({ codigo, anfitriaoToken, agora }) {
  return {
    codigo,
    criada: agora,
    atualizada: agora,
    anfitriao: null,
    anfitriaoToken,
    config: { epocas: 3, bots: 0, nivelBots: 'inferior' },
    fase: 'lobby',
    epoca: 0,
    treinadores: [],
    equipas: {},
    jogadores: {},
    reservados: [],
    classificacao: null,
    palmares: [],
    log: [],
    proximoId: 1,
  };
}

const limparNome = (t, max) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function entrar(sala, { token, nome }, ctx) {
  if (typeof token !== 'string' || token.length < 8) return erro('Ligação inválida.');
  nome = limparNome(nome, 16);
  const existente = sala.treinadores.find((t) => t.token === token);
  if (existente) {
    existente.ligado = true;
    if (nome) existente.nome = nome;
    return { jogador: existente };
  }
  if (!nome) return erro('Escreve o teu nome.');
  const ativos = sala.treinadores.filter((t) => !t.saiu);
  if (ativos.length >= CONFIG.sala.maxTreinadores) return erro('A sala está cheia.');
  const id = `t${sala.proximoId++}`;
  const equipaId = `e${id.slice(1)}`;
  const cor = CORES.find((c) => !ativos.some((t) => t.cor === c)) ?? CORES[0];
  const t = { id, token, nome, cor, ligado: true, pronto: false, equipa: equipaId };
  sala.treinadores.push(t);
  const equipa = novaEquipa({ id: equipaId, treinador: id, nome: `${nome} FC`, kit: { ...PADROES_KIT[(sala.proximoId - 2) % PADROES_KIT.length] } });
  // Quem entra a meio fica a ver até à janela seguinte.
  if (sala.fase !== 'lobby') {
    equipa.espera = true;
    registar(sala, ctx, `${nome} entrou e fica a ver até à próxima janela.`);
  }
  sala.equipas[equipaId] = equipa;
  if (token === sala.anfitriaoToken && !sala.anfitriao) sala.anfitriao = id;
  if (!sala.anfitriao) sala.anfitriao = id;
  return { jogador: t };
}

export function desligar(sala, id) {
  const t = sala.treinadores.find((x) => x.id === id);
  if (!t || !t.ligado) return false;
  t.ligado = false;
  return true;
}

export function sair(sala, id, ctx) {
  const t = sala.treinadores.find((x) => x.id === id);
  if (!t) return false;
  if (sala.fase === 'lobby') {
    sala.treinadores = sala.treinadores.filter((x) => x !== t);
    delete sala.equipas[t.equipa];
  } else {
    t.ligado = false;
    t.saiu = true;
  }
  if (sala.anfitriao === id) {
    const outro = sala.treinadores.find((x) => x.id !== id && !x.saiu);
    sala.anfitriao = outro?.id ?? null;
    if (outro) registar(sala, ctx, `${outro.nome} passa a ser o anfitrião.`);
  }
  return true;
}

export function configurar(sala, id, { epocas, bots, nivelBots }) {
  if (id !== sala.anfitriao) return erro('Só o anfitrião muda a configuração.');
  if (sala.fase !== 'lobby') return erro('A partida já começou.');
  if (epocas != null) {
    if (!CONFIG.sala.epocas.includes(Number(epocas))) return erro('Duração inválida.');
    sala.config.epocas = Number(epocas);
  }
  if (bots != null) {
    const n = Number(bots);
    if (!Number.isInteger(n) || n < 0 || n > CONFIG.sala.maxBots) return erro('Número de bots inválido.');
    sala.config.bots = n;
  }
  if (nivelBots != null) {
    if (!['inferior', 'equivalente'].includes(nivelBots)) return erro('Nível inválido.');
    sala.config.nivelBots = nivelBots;
  }
  return { ok: true };
}

const COR_HEX = /^#[0-9a-f]{6}$/i;

export function editarEquipa(sala, id, { nome, kit }) {
  const t = sala.treinadores.find((x) => x.id === id);
  const e = t && sala.equipas[t.equipa];
  if (!e) return erro('Não tens equipa.');
  if (sala.fase !== 'lobby' && !e.espera) return erro('A equipa só se edita antes de entrar no jogo.');
  if (nome != null) {
    const n = limparNome(nome, 24);
    if (n.length < 2) return erro('O nome da equipa é curto demais.');
    if (Object.values(sala.equipas).some((x) => x !== e && x.nome.toLowerCase() === n.toLowerCase())) return erro('Já há uma equipa com esse nome.');
    e.nome = n;
  }
  if (kit) {
    const { padrao, principal, secundaria } = kit;
    if (padrao && !PADROES_KIT.some((p) => p.padrao === padrao)) return erro('Padrão inválido.');
    if ((principal && !COR_HEX.test(principal)) || (secundaria && !COR_HEX.test(secundaria))) return erro('Cor inválida.');
    e.kit = { ...e.kit, ...(padrao && { padrao }), ...(principal && { principal }), ...(secundaria && { secundaria }) };
  }
  return { ok: true };
}

export function marcarPronto(sala, id, pronto) {
  const t = sala.treinadores.find((x) => x.id === id);
  if (!t || sala.fase !== 'lobby') return erro('Já não é altura.');
  t.pronto = Boolean(pronto);
  return { ok: true };
}

/** O que falta para o anfitrião poder começar (ou null). */
export function faltaParaComecar(sala) {
  const ativos = sala.treinadores.filter((t) => !t.saiu);
  if (ativos.length < CONFIG.sala.minTreinadores) return `São precisos pelo menos ${CONFIG.sala.minTreinadores} treinadores.`;
  if (ativos.length + sala.config.bots > CONFIG.sala.maxEquipas) return `No máximo ${CONFIG.sala.maxEquipas} equipas (com os bots).`;
  const naoProntos = ativos.filter((t) => !t.pronto);
  if (naoProntos.length) return `Falta marcar "Pronto": ${naoProntos.map((t) => t.nome).join(', ')}.`;
  return null;
}
