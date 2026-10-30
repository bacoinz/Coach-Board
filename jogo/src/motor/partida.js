// A partida: começar, passar de fase em fase e encaminhar as ações dos treinadores para o motor.
import { CONFIG } from '../config.js';
import { baralhar } from './aleatorio.js';
import { erro, registar, equipasTreinadores } from './estado.js';
import { prepararEquipa, criarBots } from './equipas.js';
import { faltaParaComecar } from './sala-logica.js';
import { abrirJanela, escolherFormacao, escolherDraft, prontoFechar, forcarFecho, fechar, verificarFecho } from './janela.js';
import { lancar, comprar, passar, descartarRede, terminarVez, forcarVez } from './tabuleiro.js';
import {
  licitar, desistir, forcarFimLeilao, decidirProposta, propor, inflacionar, exclusividade, responderExclusividade,
  venderBanca, proporTroca, responderTroca,
} from './negocios.js';

export function comecar(sala, ctx, id) {
  if (id !== sala.anfitriao) return erro('Só o anfitrião pode começar.');
  if (sala.fase !== 'lobby') return erro('A partida já começou.');
  const falta = faltaParaComecar(sala);
  if (falta) return erro(falta);
  for (const e of equipasTreinadores(sala)) prepararEquipa(sala, ctx, e.id);
  criarBots(sala, ctx);
  sala.epoca = 1;
  registar(sala, ctx, `Começa a partida: ${sala.config.epocas} épocas.`, { tipo: 'fase' });
  abrirJanela(sala, ctx, 'verao');
  return { ok: true };
}

/** Quem estava a ver entra na janela que abre: no verão com equipa nova, no inverno no lugar de um bot. */
function entrarEspectadores(sala, ctx, tipo) {
  for (const e of Object.values(sala.equipas).filter((x) => x.espera)) {
    const t = sala.treinadores.find((x) => x.id === e.treinador);
    if (!t || t.saiu) continue;
    if (tipo === 'verao') {
      delete e.espera;
      prepararEquipa(sala, ctx, e.id);
      registar(sala, ctx, `${t.nome} entra no jogo com ${e.nome}.`);
      continue;
    }
    const bot = Object.values(sala.equipas).find((x) => x.bot);
    if (!bot) continue;
    // Fica com a equipa do bot (plantel e lugar na classificação) e com o orçamento inicial.
    delete sala.equipas[e.id];
    t.equipa = bot.id;
    delete bot.bot;
    bot.treinador = t.id;
    bot.dinheiro = CONFIG.inicio.orcamento;
    registar(sala, ctx, `${t.nome} fica com ${bot.nome}, que era um bot.`);
  }
}

/**
 * Passo 3: o campeonato ainda não se joga (chega no passo 4). O anfitrião avança: a classificação fica
 * provisoriamente ao acaso e abre a janela seguinte.
 */
export function avancarCampeonato(sala, ctx, id) {
  if (id !== sala.anfitriao) return erro('Só o anfitrião pode avançar.');
  if (sala.fase !== 'campeonato') return erro('Não estamos no campeonato.');
  sala.classificacao = baralhar(ctx.aleatorio, Object.keys(sala.equipas).filter((x) => !sala.equipas[x].espera));
  // Sem jogos ainda, os efeitos "no próximo jogo" das cartas Mistério gastam-se aqui.
  for (const e of Object.values(sala.equipas)) delete e.efeitos;
  if (sala.campeonato.volta === 1) {
    entrarEspectadores(sala, ctx, 'inverno');
    abrirJanela(sala, ctx, 'inverno');
    return { ok: true };
  }
  sala.palmares.push({ epoca: sala.epoca, campeao: sala.classificacao[0] });
  if (sala.epoca >= sala.config.epocas) {
    sala.fase = 'fim';
    registar(sala, ctx, 'Fim da partida.', { tipo: 'fase' });
    return { ok: true };
  }
  sala.epoca++;
  entrarEspectadores(sala, ctx, 'verao');
  abrirJanela(sala, ctx, 'verao');
  return { ok: true };
}

/** Ações do anfitrião (desbloquear quem não está). */
function acaoAnfitriao(sala, ctx, id, msg) {
  if (id !== sala.anfitriao) return erro('Só o anfitrião pode fazer isso.');
  switch (msg.t) {
    case 'forcar_vez':
      return forcarVez(sala, ctx);
    case 'forcar_leilao':
      return forcarFimLeilao(sala, ctx);
    case 'forcar_fecho':
      return forcarFecho(sala, ctx);
    case 'avancar':
      return avancarCampeonato(sala, ctx, id);
    default:
      return erro('Ação desconhecida.');
  }
}

/** Encaminha uma ação de um treinador. Devolve { ok } ou { erro }. */
export function agir(sala, ctx, id, msg) {
  if (['forcar_vez', 'forcar_leilao', 'forcar_fecho', 'avancar'].includes(msg.t)) return acaoAnfitriao(sala, ctx, id, msg);
  if (msg.t === 'comecar') return comecar(sala, ctx, id);
  const t = sala.treinadores.find((x) => x.id === id);
  const e = t && sala.equipas[t.equipa];
  if (!e || e.espera || e.bot) return erro('Estás a ver: entras na próxima janela.');
  const eq = e.id;
  let r;
  switch (msg.t) {
    case 'formacao': r = escolherFormacao(sala, ctx, eq, msg.formacao); break;
    case 'draft': r = escolherDraft(sala, ctx, eq, msg.jogador ?? null); break;
    case 'lancar': r = lancar(sala, ctx, eq); break;
    case 'comprar': r = comprar(sala, ctx, eq); break;
    case 'passar': r = passar(sala, ctx, eq); break;
    case 'descartar_rede': r = descartarRede(sala, ctx, eq, msg.liga); break;
    case 'terminar_vez': r = terminarVez(sala, ctx, eq); break;
    case 'licitar': r = licitar(sala, ctx, eq, msg.valor); break;
    case 'desistir': r = desistir(sala, ctx, eq); break;
    case 'decidir': r = decidirProposta(sala, ctx, eq, Boolean(msg.aceitar)); break;
    case 'propor': r = propor(sala, ctx, eq, msg.jogador, msg.valor); break;
    case 'inflacionar': r = inflacionar(sala, ctx, eq, msg.jogador); break;
    case 'exclusividade': r = exclusividade(sala, ctx, eq, msg.jogador); break;
    case 'responder_empresario': r = responderExclusividade(sala, ctx, eq, Boolean(msg.anular)); break;
    case 'vender_banca': r = venderBanca(sala, ctx, eq, msg.jogador); break;
    case 'propor_troca': r = proporTroca(sala, ctx, eq, { para: msg.para, dar: msg.dar, receber: msg.receber }); break;
    case 'responder_troca': r = responderTroca(sala, ctx, eq, msg.troca, Boolean(msg.aceitar)); break;
    case 'pronto_fechar': r = prontoFechar(sala, ctx, eq, msg.pronto !== false); break;
    case 'fechar': r = fechar(sala, ctx, eq, { manter: msg.manter ?? [] }); break;
    default: return erro('Ação desconhecida.');
  }
  if (!r.erro) verificarFecho(sala, ctx);
  return r;
}
