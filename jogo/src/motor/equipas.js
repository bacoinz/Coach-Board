// Criação das equipas no início da partida: plantel inicial, orçamento, marca e patrocinadores iniciais, bots.
import { CONFIG } from '../config.js';
import { baralhar, escolher } from './aleatorio.js';
import { transferir, livre, receber } from './estado.js';
import { MARCAS, PATROCINIOS, NOMES_BOTS, KITS_BOTS } from './marcas.js';

const I = CONFIG.inicio;

/** Equipa nova, ainda sem plantel (no lobby, ou quem entra a meio). */
export function novaEquipa({ id, treinador = null, nome, kit }) {
  return {
    id,
    treinador,
    nome,
    kit: kit ?? { padrao: 'liso', principal: '#c49a6c', secundaria: '#3d241d' },
    emblema: null,
    dinheiro: 0,
    plantel: [],
    formacao: null,
    onze: null,
    cartas: { empresario: 0, medico: 0 },
    redes: [],
    marca: null,
    patrocinios: [],
  };
}

/** Um jogador livre para o plantel inicial: a posição certa, o overall mais próximo do pedido, idade na faixa. */
function sortearInicial(sala, ctx, posicao, overall) {
  const [idadeMin, idadeMax] = I.idade;
  for (let desvio = 0; desvio <= 6; desvio++) {
    const candidatos = [];
    for (const j of ctx.base.values()) {
      if (j.posicao !== posicao || Math.abs(j.overall - overall) !== desvio) continue;
      if (j.idade < idadeMin || j.idade > idadeMax || !livre(sala, j.id)) continue;
      candidatos.push(j.id);
    }
    if (candidatos.length) return escolher(ctx.aleatorio, candidatos);
  }
  return null;
}

/** Dá a uma equipa os 11 iniciais: os overalls da configuração (menos um desconto, nos bots), ao acaso pelas posições. */
export function darPlantelInicial(sala, ctx, equipaId, desconto = 0) {
  const overalls = baralhar(ctx.aleatorio, I.overalls);
  I.posicoes.forEach((pos, i) => {
    const id = sortearInicial(sala, ctx, pos, overalls[i] - desconto);
    if (id != null) transferir(sala, id, equipaId);
  });
}

/** Marca e dois patrocinadores da lista "iniciais", sem repetir. Quando a lista acaba, usam-se os baixos. */
export function darContratosIniciais(sala, ctx, equipaId) {
  const usados = new Set(Object.values(sala.equipas).flatMap((e) => [e.marca, ...e.patrocinios].filter(Boolean)));
  const tirar = (listas) => {
    for (const lista of listas) {
      const livres = lista.filter((n) => !usados.has(n));
      if (livres.length) {
        const n = escolher(ctx.aleatorio, livres);
        usados.add(n);
        return n;
      }
    }
    return null;
  };
  const e = sala.equipas[equipaId];
  e.marca = tirar([MARCAS.iniciais, MARCAS.baixas]);
  e.patrocinios = [tirar([PATROCINIOS.iniciais, PATROCINIOS.baixas]), tirar([PATROCINIOS.iniciais, PATROCINIOS.baixas])];
  e.mudancas = { marca: 0, patrocinios: 0 };
  receber(sala, equipaId, I.premioMarcaInicial + 2 * I.premioPatrocinioInicial);
}

/** Prepara uma equipa de treinador para começar a jogar (no início da partida ou ao entrar numa janela). */
export function prepararEquipa(sala, ctx, equipaId) {
  const e = sala.equipas[equipaId];
  e.dinheiro = I.orcamento;
  darPlantelInicial(sala, ctx, equipaId);
  darContratosIniciais(sala, ctx, equipaId);
}

/** Cria as equipas bot (só jogam o campeonato). */
export function criarBots(sala, ctx) {
  const { bots, nivelBots } = sala.config;
  for (let i = 0; i < bots; i++) {
    const id = `bot${i + 1}`;
    sala.equipas[id] = novaEquipa({ id, nome: NOMES_BOTS[i % NOMES_BOTS.length], kit: KITS_BOTS[i % KITS_BOTS.length] });
    sala.equipas[id].bot = true;
    sala.equipas[id].formacao = '4-4-2';
    darPlantelInicial(sala, ctx, id, nivelBots === 'inferior' ? I.botsInferiores : 0);
  }
}
