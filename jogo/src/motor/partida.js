// A partida: começar, passar de fase em fase e encaminhar as ações dos treinadores para o motor.
import { CONFIG } from '../config.js';
import { erro, registar, equipasTreinadores } from './estado.js';
import { prepararEquipa, criarBots } from './equipas.js';
import { faltaParaComecar } from './sala-logica.js';
import { abrirJanela, comprarEmprestado, escolherFormacao, escolherDraft, prontoFechar, forcarFecho, fechar, verificarFecho } from './janela.js';
import { lancar, comprar, passar, descartarRede, terminarVez, forcarVez } from './tabuleiro.js';
import {
  licitar, desistir, forcarFimLeilao, decidirProposta, propor, inflacionar, exclusividade, responderExclusividade,
  venderBanca, proporTroca, responderTroca,
} from './negocios.js';
import { escolherTatica, substituir, continuar, forcarCampeonato, ordenarTabela } from './campeonato.js';

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

/** Acabou uma volta do campeonato: abre a janela seguinte ou, no fim da época, regista o campeão e segue. */
function fimDeVolta(sala, ctx) {
  if (sala.campeonato.volta === 1) {
    entrarEspectadores(sala, ctx, 'inverno');
    abrirJanela(sala, ctx, 'inverno');
    return;
  }
  const tabela = ordenarTabela(sala.tabela);
  sala.pontosTotais = sala.pontosTotais ?? {};
  for (const l of tabela) sala.pontosTotais[l.equipa] = (sala.pontosTotais[l.equipa] ?? 0) + l.pts;
  sala.palmares.push({ epoca: sala.epoca, campeao: tabela[0].equipa });
  registar(sala, ctx, `${sala.equipas[tabela[0].equipa].nome} é campeão da época ${sala.epoca}!`, { tipo: 'fase' });
  if (sala.epoca >= sala.config.epocas) {
    sala.fase = 'fim';
    registar(sala, ctx, 'Fim da partida.', { tipo: 'fase' });
    return;
  }
  // O fim de época (idade, evolução, prémios) entra no passo 5.
  sala.epoca++;
  entrarEspectadores(sala, ctx, 'verao');
  abrirJanela(sala, ctx, 'verao');
}

/** Ranking final: mais campeonatos e, em caso de empate, mais pontos de todas as épocas. */
export function rankingFinal(sala) {
  const titulos = (id) => sala.palmares.filter((p) => p.campeao === id).length;
  return Object.values(sala.equipas).filter((e) => !e.espera).map((e) => ({ equipa: e.id, titulos: titulos(e.id), pontos: sala.pontosTotais?.[e.id] ?? 0 }))
    .sort((a, b) => b.titulos - a.titulos || b.pontos - a.pontos);
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
    case 'avancar': {
      const r = forcarCampeonato(sala, ctx);
      if (r.fimDeVolta) fimDeVolta(sala, ctx);
      return r;
    }
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
    case 'comprar_emprestado': r = comprarEmprestado(sala, ctx, eq, msg.jogador); break;
    case 'tatica': r = escolherTatica(sala, ctx, eq, msg.tatica); break;
    case 'substituir': r = substituir(sala, ctx, eq, msg.sai); break;
    case 'continuar':
      r = continuar(sala, ctx, eq);
      if (r.fimDeVolta) fimDeVolta(sala, ctx);
      break;
    default: return erro('Ação desconhecida.');
  }
  if (!r.erro) verificarFecho(sala, ctx);
  return r;
}
