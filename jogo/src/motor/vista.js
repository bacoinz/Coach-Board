// O que cada treinador recebe: o estado público (igual para todos) e a sua parte privada.
// Os plantéis e as cartas na mão são públicos; ficam de fora os tokens e o potencial escondido dos jovens.
import { jogador } from './estado.js';
import { sugestaoFecho, precoOpcao } from './janela.js';
import { faltaParaComecar } from './sala-logica.js';

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
      suplente: e.suplente ?? null,
      cartas: e.cartas,
      redes: e.redes,
      marca: e.marca,
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
    campeonato: sala.campeonato ?? null,
    classificacao: sala.classificacao,
    palmares: sala.palmares,
    log: sala.log.slice(-60),
  };
}

/** A parte privada: quem sou e, no fecho, o plantel sugerido. */
export function privado(sala, ctx, treinadorId) {
  const t = sala.treinadores.find((x) => x.id === treinadorId);
  if (!t) return null;
  const r = { id: t.id, equipa: t.equipa };
  const j = sala.janela;
  const e = sala.equipas[t.equipa];
  if (j?.fase === 'fecho' && e && !e.espera && !j.prontos.includes(e.id)) r.sugestaoFecho = sugestaoFecho(sala, ctx, e.id);
  return r;
}
