// Fim de época: prémios, idade, evolução dos jogadores e crescimento dos jovens da formação.
// Só evoluem os jogadores que estão em equipas: os do baralho ficam como na base, senão deixava de haver jovens no draft.
import { CONFIG } from '../config.js';
import { comPeso } from './aleatorio.js';
import { jogador, mudarJogador, registar } from './estado.js';

const E = CONFIG.evolucao;
const LINHA = CONFIG.posicoes.linha;
const J = CONFIG.jogo;

/** Quanto muda o overall de um jogador que não é da formação, pela idade na época que acaba. */
export function variacaoOverall(rng, idade, overall = 0, rendimento = 0) {
  const { influencia } = E.rendimento;
  const escalao = E.adultos.find((x) => idade <= x.ate);
  if (escalao) {
    const { variacoes } = escalao.travao && overall > escalao.travao.acima ? escalao.travao : escalao;
    const pares = Object.entries(variacoes).map(([v, p]) => [Number(v), p]);
    const media = pares.reduce((s, [v, p]) => s + v * p, 0);
    // Quem rendeu bem tem mais hipóteses das subidas maiores; quem rendeu mal, das menores.
    return comPeso(rng, pares.map(([v, p]) => [v, Math.max(0, p * (1 + influencia * rendimento * Math.sign(v - media)))]));
  }
  const { desde, probabilidade, aumentoPorAno, delta } = E.veteranos;
  return rng() < (probabilidade + (idade - desde) * aumentoPorAno) * (1 - influencia * rendimento) ? delta : 0;
}

/**
 * O rendimento de um jogador na época, de −1 a +1. Médios e avançados: golos e assistências por jogo, em relação ao alvo.
 * Defesas e GR: golos sofridos pela equipa por jogo, em relação à média da liga. Quem quase não jogou fica em 0.
 */
export function rendimentoEpoca(sala, ctx, j) {
  const R = E.rendimento;
  const est = sala.estatisticas?.[j.id];
  const possiveis = sala.calendario.length * 2 * J.periodos * J.minutosPorPeriodo;
  if (!est || est.minutos < possiveis * R.minimoMinutos) return 0;
  const linha = LINHA[j.posicao];
  const limitar = (x) => Math.max(-1, Math.min(1, x));
  if (linha === 'MED' || linha === 'AV') {
    const porJogo = (est.golos + est.assistencias * R.pesoAssistencia) / (est.minutos / (J.periodos * J.minutosPorPeriodo));
    return limitar((porJogo - R.alvoPorJogo[linha]) / R.alvoPorJogo[linha]);
  }
  const linhas = Object.values(sala.tabela ?? {}).filter((l) => l.j > 0);
  const media = linhas.reduce((s, l) => s + l.gs / l.j, 0) / (linhas.length || 1);
  const minha = sala.tabela?.[j.equipa];
  if (!minha?.j || !media) return 0;
  return limitar((media - minha.gs / minha.j) / media);
}

/** Jovem da formação: de +2 (quase não jogou) a +8 (jogou quase tudo), conforme os minutos, sem passar o potencial. */
export function crescimentoJovem(minutos, minutosPossiveis) {
  const parte = Math.min(1, minutosPossiveis ? minutos / minutosPossiveis : 0);
  const [a, b] = E.crescimentoJovem;
  return Math.round(a + (b - a) * parte);
}

/** Aplica o ano que passou a todos os jogadores das equipas. Devolve as mudanças a mostrar. */
export function envelhecer(sala, ctx) {
  const jornadas = sala.calendario.length * 2;
  const minutosPossiveis = jornadas * J.periodos * J.minutosPorPeriodo;
  const mudancas = [];
  for (const e of Object.values(sala.equipas)) {
    for (const id of e.plantel) {
      const j = jogador(sala, ctx, id);
      if (j.emprestado) continue;
      let overall = j.overall;
      if (j.formacao) overall = Math.min(Math.max(j.potencial ?? overall, overall), overall + crescimentoJovem(j.minutos ?? 0, minutosPossiveis));
      else overall = Math.min(E.overallMaximo, overall + variacaoOverall(ctx.aleatorio, j.idade, overall, rendimentoEpoca(sala, ctx, j)));
      const idade = j.idade + 1;
      const promovido = j.formacao && idade > CONFIG.jovens.promocao.idade && overall > CONFIG.jovens.promocao.overall;
      mudarJogador(sala, id, { idade, overall, minutos: 0, ...(promovido ? { formacao: false } : {}) });
      if (promovido) registar(sala, ctx, `${j.curto} (${e.nome}) passa ao plantel principal, com ${overall} de overall.`, { tipo: 'carta' });
      if (overall !== j.overall || promovido) mudancas.push({ jogador: id, nome: j.curto, equipa: e.id, antes: j.overall, depois: overall, formacao: Boolean(j.formacao), promovido });
    }
  }
  return mudancas.sort((a, b) => b.depois - b.antes - (a.depois - a.antes));
}

// --- Prémios ---

/** Nota da época de um jogador. */
function nota(est, overall) {
  const P = E.notaEpoca;
  return est.golos * P.golo + est.assistencias * P.assistencia + (est.homens ?? 0) * P.homemDoJogo + (est.minutos / 90) * P.jogo + overall * P.overall;
}

/** Marcadores e assistentes da Taça, que só contam para esta tabela. */
export function topTaca(sala, n = 3) {
  const lista = Object.entries(sala.estatisticasTaca ?? {}).map(([id, e]) => ({ id: Number(id), ...e }));
  const top = (campo) => lista.filter((x) => x[campo] > 0).sort((a, b) => b[campo] - a[campo]).slice(0, n).map(({ id, nome, equipa, [campo]: valor }) => ({ id, nome, equipa, valor }));
  return { tacaMarcadores: top('golos'), tacaAssistentes: top('assistencias') };
}

export function calcularPremios(sala, ctx, tabela) {
  const lista = Object.entries(sala.estatisticas ?? {}).map(([id, est]) => {
    const j = ctx.base.get(Number(id));
    const overall = sala.jogadores[id]?.overall ?? j?.overall ?? 0;
    return { id: Number(id), nome: est.nome, equipa: est.equipa, golos: est.golos, assistencias: est.assistencias, homens: est.homens ?? 0, minutos: est.minutos, linha: LINHA[j?.posicao], nota: nota(est, overall) };
  }).filter((x) => x.minutos > 0);
  const top = (campo, n = 5) => lista.filter((x) => x[campo] > 0).sort((a, b) => b[campo] - a[campo]).slice(0, n).map(({ id, nome, equipa, [campo]: v }) => ({ id, nome, equipa, valor: v }));
  const melhores = [...lista].sort((a, b) => b.nota - a.nota);
  // A equipa da época: 1 GR, 4 defesas, 3 médios e 3 avançados, de qualquer equipa.
  const equipa = Object.entries(E.equipaDaEpoca).flatMap(([linha, n]) =>
    melhores.filter((x) => x.linha === linha).slice(0, n).map(({ id, nome, equipa: eq }) => ({ id, nome, equipa: eq, linha })));
  const estrela = melhores[0];
  return {
    epoca: sala.epoca,
    campeao: tabela[0].equipa,
    pontos: tabela[0].pts,
    marcadores: top('golos'),
    assistentes: top('assistencias'),
    homens: top('homens', 1),
    equipa,
    jogador: estrela ? { id: estrela.id, nome: estrela.nome, equipa: estrela.equipa } : null,
    ...topTaca(sala),
  };
}
