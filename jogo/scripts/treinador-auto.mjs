// Um treinador automático simples, usado pelos testes e pela simulação de equilíbrio. Joga com bom senso, não bem:
// compra quem melhora o onze e cabe no orçamento, licita até ao valor, e de vez em quando faz propostas.
import { CONFIG } from '../src/config.js';
import { agir } from '../src/motor/partida.js';
import { jogador } from '../src/motor/estado.js';
import { sugestaoFecho } from '../src/motor/janela.js';
import { melhorOnze, FORMACOES } from '../src/motor/formacao.js';
import { CICLO_TATICAS, podemSair } from '../src/motor/jogo.js';
import { acabou } from '../src/motor/tabuleiro.js';
import { premio } from '../src/motor/patrocinios.js';

const acaso = (rng, lista) => lista[Math.floor(rng() * lista.length)];

/** Melhora o onze? Compara a soma de overalls com e sem o jogador. */
function melhoraOnze(sala, ctx, e, id) {
  const atuais = e.plantel.map((x) => jogador(sala, ctx, x)).filter((x) => !x.emprestado);
  const soma = (lista) => melhorOnze(lista, e.formacao).onze.reduce((s, l) => s + (l.overall ?? 55), 0);
  return soma([...atuais, jogador(sala, ctx, id)]) - soma(atuais);
}

/** Uma ação de quem tem de agir agora. Devolve o resultado de agir(). */
export function passo(sala, ctx) {
  const rng = ctx.aleatorio;
  const t = (eq) => sala.equipas[eq].treinador;
  const coaches = Object.values(sala.equipas).filter((e) => e.treinador && !e.espera);

  if (sala.fase === 'fimEpoca') {
    const falta = coaches.find((e) => !sala.fimEpoca.prontos.includes(e.id));
    return agir(sala, ctx, falta.treinador, { t: 'continuar' });
  }
  if (sala.fase === 'campeonato') {
    const c = sala.campeonato;
    if (c.fase === 'taticas') {
      const pares = (c.pares ?? sala.calendario[c.jornada]).flat();
      const falta = pares.find((id) => !c.taticas[id] && sala.equipas[id].treinador);
      return agir(sala, ctx, t(falta), { t: 'tatica', tatica: acaso(rng, CICLO_TATICAS) });
    }
    if (c.fase === 'jogos') {
      // Metade das vezes, o jovem da formação entra a meio.
      for (const jogo of c.jogos) {
        for (const lado of jogo.lados) {
          if (!sala.equipas[lado.equipa].treinador || jogo.periodo !== 4) continue;
          const podem = podemSair(sala, ctx, lado);
          if (podem.length && !lado.subPedida && rng() < 0.5) agir(sala, ctx, t(lado.equipa), { t: 'substituir', sai: podem[0] });
        }
      }
      return agir(sala, ctx, sala.anfitriao, { t: 'avancar' });
    }
    const falta = coaches.find((e) => !c.prontos.includes(e.id));
    return agir(sala, ctx, falta.treinador, { t: 'continuar' });
  }

  const j = sala.janela;
  if (j.fase === 'formacao') {
    const e = coaches.find((x) => !j.prontos.includes(x.id));
    return agir(sala, ctx, e.treinador, { t: 'formacao', formacao: e.formacao ?? acaso(rng, FORMACOES) });
  }
  if (j.fase === 'draft') {
    const atual = j.draft.escolhas[j.draft.i];
    const e = sala.equipas[atual.equipa];
    const opcao = j.draft.opcoes.find((id) => jogador(sala, ctx, id).valor * CONFIG.valores.precoDraft <= e.dinheiro);
    return agir(sala, ctx, e.treinador, { t: 'draft', jogador: opcao ?? null });
  }
  if (j.fase === 'fecho') {
    const e = coaches.find((x) => !j.prontos.includes(x.id));
    return agir(sala, ctx, e.treinador, { t: 'fechar', ...sugestaoFecho(sala, ctx, e.id) });
  }

  // Tabuleiro
  if (j.contestacao) return agir(sala, ctx, t(j.contestacao.vendedor), { t: 'responder_empresario', anular: rng() < 0.7 });
  if (j.leilao) {
    const l = j.leilao;
    if (l.fase === 'decisao') {
      const jg = jogador(sala, ctx, l.jogador);
      return agir(sala, ctx, t(l.vendedor), { t: 'decidir', aceitar: l.valor >= jg.valor });
    }
    const ativo = l.participantes.find((x) => x !== l.lider && !l.desistiram.includes(x));
    const e = sala.equipas[ativo];
    const lance = l.lider ? l.valor + CONFIG.leilao.incrementoMinimo : l.minimo;
    const jg = jogador(sala, ctx, l.jogador);
    if (lance <= jg.valor * 1.15 && lance <= e.dinheiro * 0.7 && melhoraOnze(sala, ctx, e, l.jogador) >= 2) return agir(sala, ctx, ativo && e.treinador, { t: 'licitar', valor: lance });
    return agir(sala, ctx, e.treinador, { t: 'desistir' });
  }
  const eq = j.ordem[j.vez];
  const e = sala.equipas[eq];
  if (j.pendente) {
    if (j.pendente.tipo === 'rede') return agir(sala, ctx, t(eq), { t: 'descartar_rede', liga: j.pendente.liga });
    if (j.pendente.tipo === 'patrocinio') {
      const p = j.pendente;
      if (p.bloqueio) return agir(sala, ctx, t(eq), { t: 'patrocinio', aceitar: false });
      // Aceita quando o prémio é melhor do que o do contrato que sai.
      const atual = p.genero === 'marca' ? premio('marca', e.categorias.marca) : Math.min(...p.substituir.map((i) => premio('patrocinio', e.categorias.patrocinios[i])));
      const substitui = p.genero === 'marca' ? 0 : p.substituir.reduce((a, b) => (premio('patrocinio', e.categorias.patrocinios[b]) < premio('patrocinio', e.categorias.patrocinios[a]) ? b : a));
      return agir(sala, ctx, t(eq), { t: 'patrocinio', aceitar: p.premio > atual, substitui });
    }
    const compensa = melhoraOnze(sala, ctx, e, j.pendente.jogador) >= 1 || jogador(sala, ctx, j.pendente.jogador).formacao;
    if (compensa && e.dinheiro >= j.pendente.preco && (e.limiteContratacoes ?? 1) > 0) return agir(sala, ctx, t(eq), { t: 'comprar' });
    return agir(sala, ctx, t(eq), { t: 'passar' });
  }
  if (!j.lancou && !acabou(j, eq) && rng() < 0.97) return agir(sala, ctx, t(eq), { t: 'lancar' });
  // Proposta ocasional pela cláusula a um jogador que melhore o onze.
  if (!j.lancou && !acabou(j, eq)) {
    const outro = acaso(rng, coaches.filter((x) => x.id !== eq));
    const alvo = outro && acaso(rng, outro.plantel);
    if (alvo != null) {
      const jg = jogador(sala, ctx, alvo);
      if (jg.clausula <= e.dinheiro * 0.5 && melhoraOnze(sala, ctx, e, alvo) >= 2) {
        const r = agir(sala, ctx, t(eq), { t: 'propor', jogador: alvo, valor: jg.clausula });
        if (!r.erro) return r;
      }
    }
    return agir(sala, ctx, t(eq), { t: 'lancar' });
  }
  if (j.ordem.every((x) => acabou(j, x))) {
    const falta = j.ordem.find((x) => !j.prontos.includes(x));
    if (falta) return agir(sala, ctx, t(falta), { t: 'pronto_fechar' });
  }
  return agir(sala, ctx, t(eq), { t: 'terminar_vez' });
}

/** Joga até ao fim da partida. Devolve os passos dados. */
export function jogarAteAoFim(sala, ctx, limite = 200000) {
  let n = 0;
  while (sala.fase !== 'fim' && n < limite) {
    passo(sala, ctx);
    n++;
  }
  return n;
}
