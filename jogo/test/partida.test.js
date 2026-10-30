import { describe, it, expect } from 'vitest';
import { contexto, salaComecada, treinadorDe, verificarInvariantes } from './apoio.js';
import { agir } from '../src/motor/partida.js';
import { jogador } from '../src/motor/estado.js';
import { sugestaoFecho } from '../src/motor/janela.js';
import { estadoPublico, privado } from '../src/motor/vista.js';
import { FORMACOES } from '../src/motor/formacao.js';
import { acabou } from '../src/motor/tabuleiro.js';

/** Um passo de jogo: quem tem de agir faz uma jogada ao acaso (mas válida, quase sempre). */
function passo(sala, ctx) {
  const rng = ctx.aleatorio;
  const t = (eq) => treinadorDe(sala, eq);
  const acaso = (lista) => lista[Math.floor(rng() * lista.length)];
  if (sala.fase === 'campeonato' || sala.fase === 'fimEpoca') return agir(sala, ctx, sala.anfitriao, { t: 'avancar' });
  const j = sala.janela;
  if (j.fase === 'formacao') {
    const e = Object.values(sala.equipas).find((x) => x.treinador && !x.espera && !j.prontos.includes(x.id));
    return agir(sala, ctx, e.treinador, { t: 'formacao', formacao: acaso(FORMACOES) });
  }
  if (j.fase === 'draft') {
    const atual = j.draft.escolhas[j.draft.i];
    return agir(sala, ctx, t(atual.equipa), { t: 'draft', jogador: rng() < 0.7 ? acaso(j.draft.opcoes) : null });
  }
  if (j.fase === 'fecho') {
    const e = Object.values(sala.equipas).find((x) => x.treinador && !x.espera && !j.prontos.includes(x.id));
    const s = sugestaoFecho(sala, ctx, e.id);
    return agir(sala, ctx, e.treinador, { t: 'fechar', ...s });
  }
  // Tabuleiro
  if (j.contestacao) return agir(sala, ctx, t(j.contestacao.vendedor), { t: 'responder_empresario', anular: rng() < 0.5 });
  if (j.leilao) {
    const l = j.leilao;
    if (l.fase === 'decisao') return agir(sala, ctx, t(l.vendedor), { t: 'decidir', aceitar: rng() < 0.5 });
    const ativo = l.participantes.find((x) => x !== l.lider && !l.desistiram.includes(x));
    const lance = (l.lider ? l.valor + 1 : l.minimo);
    if (rng() < 0.3 && sala.equipas[ativo].dinheiro >= lance) return agir(sala, ctx, t(ativo), { t: 'licitar', valor: lance });
    return agir(sala, ctx, t(ativo), { t: 'desistir' });
  }
  const eq = j.ordem[j.vez];
  const e = sala.equipas[eq];
  if (j.pendente) {
    if (j.pendente.tipo === 'rede') return agir(sala, ctx, t(eq), { t: 'descartar_rede', liga: acaso([...e.redes, j.pendente.liga]) });
    if (j.pendente.tipo === 'patrocinio') return agir(sala, ctx, t(eq), { t: 'patrocinio', aceitar: !j.pendente.bloqueio && rng() < 0.5, substitui: j.pendente.substituir?.[0] ?? 0 });
    if (rng() < 0.5 && e.dinheiro >= j.pendente.preco) return agir(sala, ctx, t(eq), { t: 'comprar' });
    return agir(sala, ctx, t(eq), { t: 'passar' });
  }
  // De vez em quando, uma proposta, um Empresário ou uma venda à banca.
  const outros = Object.values(sala.equipas).filter((x) => x.treinador && x.id !== eq && !x.espera);
  const r = rng();
  if (r < 0.05 && outros.length) {
    const alvo = acaso(acaso(outros).plantel);
    const jg = jogador(sala, ctx, alvo);
    const valor = Math.min(e.dinheiro, rng() < 0.3 ? jg.clausula : jg.valor);
    const res = agir(sala, ctx, t(eq), { t: 'propor', jogador: alvo, valor });
    if (!res.erro) return res;
  } else if (r < 0.08 && e.cartas.empresario && outros.length) {
    const res = agir(sala, ctx, t(eq), { t: 'exclusividade', jogador: acaso(acaso(outros).plantel) });
    if (!res.erro) return res;
  } else if (r < 0.1 && e.plantel.length > 13) {
    return agir(sala, ctx, t(eq), { t: 'vender_banca', jogador: acaso(e.plantel) });
  }
  if (!j.lancou && !acabou(j, eq)) {
    const res = agir(sala, ctx, t(eq), { t: 'lancar' });
    if (!res.erro) return res;
  }
  if (j.ordem.every((x) => acabou(j, x))) {
    const falta = j.ordem.find((x) => !j.prontos.includes(x));
    if (falta) return agir(sala, ctx, t(falta), { t: 'pronto_fechar' });
  }
  return agir(sala, ctx, t(eq), { t: 'terminar_vez' });
}

describe('partida inteira com jogadas ao acaso', () => {
  for (const semente of [1, 2, 3]) {
    it(`semente ${semente}: 3 épocas até ao fim, sem encravar e sem jogadores repetidos`, () => {
      const ctx = contexto(semente);
      const sala = salaComecada(4, { epocas: 3, bots: 2 }, ctx);
      let passos = 0;
      const erros = new Map();
      while (sala.fase !== 'fim' && passos < 20000) {
        const r = passo(sala, ctx);
        if (r?.erro) erros.set(r.erro, (erros.get(r.erro) ?? 0) + 1);
        passos++;
        if (passos % 200 === 0) verificarInvariantes(sala);
      }
      expect(sala.fase).toBe('fim');
      expect(sala.palmares).toHaveLength(3);
      verificarInvariantes(sala);
      // As vistas geram-se sem rebentar e cabem numa mensagem.
      const publico = JSON.stringify(estadoPublico(sala, ctx));
      expect(publico.length).toBeLessThan(400_000);
      expect(privado(sala, ctx, 't1').equipa).toBe('e1');
      expect(passos).toBeLessThan(20000);
    });
  }
});
