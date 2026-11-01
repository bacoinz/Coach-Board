// A partida: começar, passar de fase em fase e encaminhar as ações dos treinadores para o motor.
import { CONFIG } from '../config.js';
import { erro, registar, equipasTreinadores } from './estado.js';
import { prepararEquipa, criarBots, darContratosIniciais, orcamentoInicial } from './equipas.js';
import { faltaParaComecar } from './sala-logica.js';
import { abrirJanela, comprarEmprestado, escolherFormacao, escolherOnze, escolherDraft, prontoFechar, forcarFecho, fechar, verificarFecho } from './janela.js';
import { lancar, comprar, passar, descartarRede, terminarVez, forcarVez, confirmarCarta } from './tabuleiro.js';
import {
  licitar, desistir, forcarFimLeilao, decidirProposta, propor, inflacionar, exclusividade, responderExclusividade,
  venderBanca, proporTroca, responderTroca, leiloarDivida,
} from './negocios.js';
import { decidirPatrocinio, extensaoMarca } from './patrocinios.js';
import { envelhecer, calcularPremios } from './fim-epoca.js';
import { escolherTatica, substituir, continuar, forcarCampeonato, ordenarTabela, iniciarTaca, lancarRonda, forcarRonda, fichaLesao, lesaoSuplente, lesaoFicar, zerarEpoca } from './campeonato.js';
import { fimDePartida } from './misterio.js';
import { resumoMomentos } from './momentos.js';

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
    bot.dinheiro = orcamentoInicial(sala);
    darContratosIniciais(sala, ctx, bot.id);
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
  // Nas últimas épocas joga-se a Taça antes de fechar a época.
  if (fimDePartida(sala)) iniciarTaca(sala, ctx);
  else concluirEpoca(sala, ctx);
}

/** A Taça acabou: fica no palmarés e a época fecha. */
function fimDeTaca(sala, ctx) {
  const vencedor = sala.campeonato.restantes[0];
  sala.palmaresTaca = [...(sala.palmaresTaca ?? []), { epoca: sala.epoca, vencedor }];
  registar(sala, ctx, `${sala.equipas[vencedor].nome} ganha a Taça da época ${sala.epoca}!`, { tipo: 'fase' });
  concluirEpoca(sala, ctx);
}

/** Fim de época: prémios, extensão da marca e, se a partida continuar, o ano que passa. */
function concluirEpoca(sala, ctx) {
  const tabela = ordenarTabela(sala.tabela);
  sala.pontosTotais = sala.pontosTotais ?? {};
  for (const l of tabela) sala.pontosTotais[l.equipa] = (sala.pontosTotais[l.equipa] ?? 0) + l.pts;
  sala.epocaContada = sala.epoca;
  sala.palmares.push({ epoca: sala.epoca, campeao: tabela[0].equipa });
  const premiosEpoca = calcularPremios(sala, ctx, tabela);
  sala.estatisticasTaca = null;
  premiosEpoca.taca = sala.palmaresTaca?.find((p) => p.epoca === sala.epoca)?.vencedor ?? null;
  sala.premios = [...(sala.premios ?? []), premiosEpoca];
  extensaoMarca(sala, ctx);
  registar(sala, ctx, `${sala.equipas[tabela[0].equipa].nome} é campeão da época ${sala.epoca}!`, { tipo: 'fase' });
  const ultima = sala.epoca >= sala.config.epocas;
  sala.fase = 'fimEpoca';
  const momentos = resumoMomentos(sala);
  sala.fimEpoca = { prontos: [], ultima, momentos, mudancas: ultima ? [] : envelhecer(sala, ctx) };
}

/** Sai do ecrã de fim de época: acaba a partida ou abre a época seguinte. */
function seguirFimEpoca(sala, ctx) {
  if (sala.fimEpoca.ultima) {
    sala.fase = 'fim';
    registar(sala, ctx, 'Fim da partida.', { tipo: 'fase' });
    return;
  }
  sala.epoca++;
  zerarEpoca(sala);
  entrarEspectadores(sala, ctx, 'verao');
  abrirJanela(sala, ctx, 'verao');
}

function continuarFimEpoca(sala, ctx, equipaId) {
  const f = sala.fimEpoca;
  if (!f.prontos.includes(equipaId)) f.prontos.push(equipaId);
  if (equipasTreinadores(sala).every((e) => f.prontos.includes(e.id))) seguirFimEpoca(sala, ctx);
  return { ok: true };
}

/** Ranking final: ganha quem tiver mais títulos (a Taça vale metade de um campeonato); depois, mais pontos de todas as épocas. */
export function rankingFinal(sala) {
  const conta = (lista, chave, id) => (lista ?? []).filter((p) => p[chave] === id).length;
  return Object.values(sala.equipas).filter((e) => !e.espera)
    .map((e) => {
      const campeonatos = conta(sala.palmares, 'campeao', e.id);
      const tacas = conta(sala.palmaresTaca, 'vencedor', e.id);
      return { equipa: e.id, campeonatos, tacas, titulos: campeonatos + tacas * CONFIG.taca.valor, pontos: sala.pontosTotais?.[e.id] ?? 0 };
    })
    .sort((a, b) => b.titulos - a.titulos || b.pontos - a.pontos);
}

/** A classificação total a meio da partida: os títulos e os pontos de todas as épocas, com os da época que decorre. */
export function rankingAtual(sala) {
  const emCurso = sala.tabela && sala.epocaContada !== sala.epoca && (sala.fase === 'campeonato' || sala.janela?.tipo === 'inverno');
  return rankingFinal(sala).map((r) => ({ ...r, pontos: r.pontos + (emCurso ? sala.tabela[r.equipa]?.pts ?? 0 : 0) })).sort((a, b) => b.titulos - a.titulos || b.pontos - a.pontos);
}

/** Ações do anfitrião (desbloquear quem não está). */
function acaoAnfitriao(sala, ctx, id, msg) {
  if (id !== sala.anfitriao) return erro('Só o anfitrião pode fazer isso.');
  switch (msg.t) {
    case 'forcar_vez':
      return forcarVez(sala, ctx);
    case 'forcar_ronda':
      return forcarRonda(sala, ctx);
    case 'forcar_leilao':
      return forcarFimLeilao(sala, ctx);
    case 'forcar_fecho':
      return forcarFecho(sala, ctx);
    case 'avancar': {
      if (sala.fase === 'fimEpoca') {
        seguirFimEpoca(sala, ctx);
        return { ok: true };
      }
      const r = forcarCampeonato(sala, ctx);
      if (r.fimDeVolta) fimDeVolta(sala, ctx);
      if (r.fimDeTaca) fimDeTaca(sala, ctx);
      return r;
    }
    default:
      return erro('Ação desconhecida.');
  }
}

/** Encaminha uma ação de um treinador. Devolve { ok } ou { erro }. */
export function agir(sala, ctx, id, msg) {
  if (['forcar_vez', 'forcar_ronda', 'forcar_leilao', 'forcar_fecho', 'avancar'].includes(msg.t)) return acaoAnfitriao(sala, ctx, id, msg);
  if (msg.t === 'comecar') return comecar(sala, ctx, id);
  const t = sala.treinadores.find((x) => x.id === id);
  const e = t && sala.equipas[t.equipa];
  if (!e || e.espera || e.bot) return erro('Estás a ver: entras na próxima janela.');
  const eq = e.id;
  let r;
  switch (msg.t) {
    case 'formacao': r = escolherFormacao(sala, ctx, eq, msg.formacao); break;
    case 'onze': r = escolherOnze(sala, ctx, eq, msg.lugares); break;
    case 'draft': r = escolherDraft(sala, ctx, eq, msg.jogador ?? null); break;
    case 'lancar': r = lancar(sala, ctx, eq); break;
    case 'confirmar_carta': r = confirmarCarta(sala, ctx, eq); break;
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
    case 'leiloar_divida': r = leiloarDivida(sala, ctx, eq, msg.jogador); break;
    case 'propor_troca': r = proporTroca(sala, ctx, eq, { para: msg.para, dar: msg.dar, receber: msg.receber }); break;
    case 'responder_troca': r = responderTroca(sala, ctx, eq, msg.troca, Boolean(msg.aceitar)); break;
    case 'pronto_fechar': r = prontoFechar(sala, ctx, eq, msg.pronto !== false); break;
    case 'fechar': r = fechar(sala, ctx, eq, { manter: msg.manter ?? [] }); break;
    case 'comprar_emprestado': r = comprarEmprestado(sala, ctx, eq, msg.jogador); break;
    case 'tatica': r = escolherTatica(sala, ctx, eq, msg.tatica); break;
    case 'substituir': r = substituir(sala, ctx, eq, msg.sai); break;
    case 'lancar_ronda': r = lancarRonda(sala, ctx, eq); break;
    case 'usar_medico': r = fichaLesao(sala, ctx, eq, msg.jogador ?? null); break;
    case 'lesao_suplente': r = lesaoSuplente(sala, ctx, eq, msg.jogador ?? null); break;
    case 'lesao_ficar': r = lesaoFicar(sala, ctx, eq, msg.jogador ?? null); break;
    case 'patrocinio': r = decidirPatrocinio(sala, ctx, eq, Boolean(msg.aceitar), Number(msg.substitui ?? 0)); break;
    case 'continuar':
      if (sala.fase === 'fimEpoca') return continuarFimEpoca(sala, ctx, eq);
      r = continuar(sala, ctx, eq);
      if (r.fimDeVolta) fimDeVolta(sala, ctx);
      if (r.fimDeTaca) fimDeTaca(sala, ctx);
      break;
    default: return erro('Ação desconhecida.');
  }
  if (!r.erro) verificarFecho(sala, ctx);
  return r;
}
