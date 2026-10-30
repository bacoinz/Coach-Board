// O que cada treinador recebe: o estado público (igual para todos) e a sua parte privada.
// Os plantéis e as cartas na mão são públicos; ficam de fora os tokens e o potencial escondido dos jovens.
import { jogador } from './estado.js';
import { sugestaoFecho, precoOpcao } from './janela.js';
import { faltaParaComecar } from './sala-logica.js';
import { ordenarTabela } from './campeonato.js';
import { modificador, podemSair } from './jogo.js';
import { rankingFinal, rankingAtual } from './partida.js';
import { topTaca } from './fim-epoca.js';

function vistaJogador(sala, ctx, id) {
  const j = jogador(sala, ctx, id);
  if (!j) return null;
  return {
    id: j.id,
    nome: j.nome,
    curto: j.curto,
    idade: j.idade,
    nacao: j.nacao,
    bandeira: j.bandeira,
    liga: j.liga,
    clube: j.clube,
    posicao: j.posicao,
    alternativas: j.alternativas,
    overall: j.overall,
    facetas: j.facetas,
    foto: j.foto ?? undefined,
    valor: j.valor,
    clausula: j.clausula,
    equipa: j.equipa,
    formacao: j.formacao || undefined,
    emprestado: j.emprestado || undefined,
    emprestadoLesao: j.emprestadoLesao || undefined,
    lesionado: j.lesionado || undefined,
    soBanca: j.soBanca || undefined,
    inflacionada: j.inflacionada || undefined,
    compradoRonda: j.compradoRonda ?? undefined,
  };
}

/** Os ids de todos os jogadores que aparecem no ecrã: plantéis, cartas na mesa, draft, leilão. */
function jogadoresVisiveis(sala) {
  const ids = new Set();
  for (const e of Object.values(sala.equipas)) for (const id of e.plantel) ids.add(id);
  for (const id of sala.reservados ?? []) ids.add(id);
  const j = sala.janela;
  if (j?.pendente?.jogador) ids.add(j.pendente.jogador);
  if (j?.leilao) ids.add(j.leilao.jogador);
  return ids;
}

/** As táticas são secretas até os jogos começarem. */
function vistaCampeonato(sala, ctx) {
  const c = sala.campeonato;
  if (!c) return null;
  const emTaticas = c.fase === 'taticas';
  const pares = sala.calendario[Math.min(c.jornada, sala.calendario.length - 1)] ?? [];
  return {
    competicao: c.competicao ?? 'liga',
    ronda: c.ronda ?? null,
    volta: c.volta,
    jornada: c.jornada,
    jornadas: sala.calendario.length,
    fase: c.fase,
    prontos: emTaticas ? Object.keys(c.taticas) : c.prontos,
    calendario: c.pares ?? pares.map(([a, b]) => (c.volta === 1 ? [a, b] : [b, a])),
    jogos: c.jogos.map((jogo) => ({
      periodo: jogo.periodo,
      acabou: jogo.acabou,
      homem: jogo.homem ?? null,
      penaltis: jogo.penaltis ?? null,
      vencedor: jogo.vencedor ?? null,
      vezLance: jogo.vezLance ?? 0,
      eventos: jogo.eventos,
      lados: jogo.lados.map((l, i) => ({
        equipa: l.equipa,
        tatica: l.tatica,
        golos: l.golos,
        vermelhos: l.vermelhos,
        modificador: Math.round(modificador(jogo, i) * 100) / 100,
        onze: l.onze.map((x) => ({ jogador: x.jogador, nome: x.nome, posicao: x.posicao, overall: x.overall, lesionado: x.lesionado || undefined })),
        lesionados: l.lesionados ?? [],
        suplente: l.suplente,
        podemSair: podemSair(sala, ctx, l),
        subPedida: l.subPedida,
      })),
    })),
  };
}

function topEstatisticas(sala) {
  const lista = Object.entries(sala.estatisticas ?? {}).map(([id, e]) => ({ id: Number(id), ...e }));
  const top = (campo) => lista.filter((e) => e[campo] > 0).sort((a, b) => b[campo] - a[campo]).slice(0, 5);
  return { marcadores: top('golos'), assistentes: top('assistencias') };
}

export function estadoPublico(sala, ctx) {
  const j = sala.janela;
  const jogadores = {};
  for (const id of jogadoresVisiveis(sala)) {
    const v = vistaJogador(sala, ctx, id);
    if (v) jogadores[id] = v;
  }
  const equipas = Object.fromEntries(
    Object.values(sala.equipas).map((e) => [e.id, {
      id: e.id,
      nome: e.nome,
      treinador: e.treinador,
      bot: e.bot || undefined,
      espera: e.espera || undefined,
      kit: e.kit,
      emblema: e.emblema,
      dinheiro: e.dinheiro,
      plantel: e.plantel,
      formacao: e.formacao,
      onze: e.onze,
      escolhaOnze: e.escolhaOnze ?? null,
      emprestadosNovos: e.emprestadosNovos ?? [],
      suplente: e.suplente ?? null,
      cartas: e.cartas,
      redes: e.redes,
      marca: e.marca,
      categorias: e.categorias,
      mudancas: e.mudancas,
      patrocinios: e.patrocinios,
      efeitos: e.efeitos ?? [],
      limiteContratacoes: e.limiteContratacoes ?? null,
      capitalProximaJanela: e.capitalProximaJanela ?? 0,
      descontoProxima: e.descontoProxima ?? 0,
    }]),
  );
  let janela = null;
  if (j) {
    janela = {
      tipo: j.tipo,
      fase: j.fase,
      prontos: j.prontos,
      ordem: j.ordem ?? j.ordemJanela ?? null,
      vez: j.vez ?? null,
      ronda: j.ronda,
      lancou: j.lancou ?? false,
      andadas: j.andadas ?? null,
      posicao: j.posicao ?? null,
      ultimoLance: j.ultimoLance ?? null,
      ultimaCarta: j.ultimaCarta ?? null,
      pendente: j.pendente ?? null,
      leilao: j.leilao ?? null,
      contestacao: j.contestacao ?? null,
      trocas: j.trocas ?? [],
      compras: j.compras ?? {},
      roubos: j.roubos ?? [],
      draft: j.draft
        ? { escolhas: j.draft.escolhas, i: j.draft.i, opcoes: j.draft.opcoes.map((id) => ({ id, preco: precoOpcao(sala, ctx, id) })) }
        : null,
    };
  }
  return {
    codigo: sala.codigo,
    fase: sala.fase,
    epoca: sala.epoca,
    config: sala.config,
    anfitriao: sala.anfitriao,
    faltaParaComecar: sala.fase === 'lobby' ? faltaParaComecar(sala) : null,
    treinadores: sala.treinadores.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor, ligado: t.ligado, pronto: t.pronto, equipa: t.equipa, saiu: t.saiu || undefined })),
    equipas,
    jogadores,
    janela,
    campeonato: vistaCampeonato(sala, ctx),
    tabela: sala.tabela ? ordenarTabela(sala.tabela) : null,
    estatisticas: topEstatisticas(sala),
    estatisticasTaca: sala.estatisticasTaca ? topTaca(sala, 5) : null,
    ranking: sala.fase === 'fim' ? rankingFinal(sala) : null,
    rankingAtual: sala.fase === 'lobby' ? null : rankingAtual(sala),
    premios: sala.premios ?? [],
    fimEpoca: sala.fase === 'fimEpoca' ? sala.fimEpoca : null,
    classificacao: sala.classificacao,
    palmares: sala.palmares,
    log: sala.log.slice(-60),
  };
}

/** A parte privada: quem sou e, no fecho, o plantel sugerido. */
export function privado(sala, ctx, treinadorId) {
  const t = sala.treinadores.find((x) => x.id === treinadorId);
  if (!t) return null;
  const r = { id: t.id, equipa: t.equipa, tatica: sala.campeonato?.taticas?.[t.equipa] ?? null };
  const j = sala.janela;
  const e = sala.equipas[t.equipa];
  if (j?.fase === 'fecho' && e && !e.espera && !j.prontos.includes(e.id)) r.sugestaoFecho = sugestaoFecho(sala, ctx, e.id);
  return r;
}
