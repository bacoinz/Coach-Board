// Formações táticas e o onze: que jogador ocupa cada lugar, com a penalização de quem joga fora de posição.
import { CONFIG } from '../config.js';

export const FORMACOES = Object.keys(CONFIG.formacoes);

/** Overall de um jogador num lugar que é seu (a posição principal ou uma alternativa), ou null se não é. */
export function overallNatural(j, posicao) {
  return j.posicao === posicao || j.alternativas?.includes(posicao) ? j.overall : null;
}

/** Overall de um jogador em qualquer lugar: fora de posição perde menos se ficar na sua linha (defesa, meio, ataque). */
export function overallNaPosicao(j, posicao) {
  const { linha, foraDePosicao } = CONFIG.posicoes;
  return overallNatural(j, posicao) ?? j.overall - (linha[j.posicao] === linha[posicao] ? foraDePosicao.mesmaLinha : foraDePosicao.outraLinha);
}

/**
 * Atribuição ótima (algoritmo húngaro, minimiza o custo) de uma matriz custo[linha][coluna], com linhas ≤ colunas.
 * Devolve, para cada linha, a coluna atribuída.
 */
function hungaro(custo) {
  const n = custo.length;
  const m = custo[0]?.length ?? 0;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);
  const caminho = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(Infinity);
    const usado = new Array(m + 1).fill(false);
    do {
      usado[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (usado[j]) continue;
        const cur = custo[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          caminho[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (usado[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = caminho[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const r = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) r[p[j] - 1] = j - 1;
  return r;
}

const SEM_LUGAR = 1e6;

/**
 * O melhor onze possível com estes jogadores na formação: maximiza o número de lugares preenchidos e, depois,
 * a soma dos overalls. Devolve os 11 lugares ({ posicao, jogador|null, overall }) e os jogadores que sobram.
 */
export function melhorOnze(jogadores, formacao) {
  return atribuir(jogadores, CONFIG.formacoes[formacao]);
}

/**
 * O onze com a escolha do treinador (o id do jogador em cada lugar): quem ainda pode ficar no seu lugar fica, e o
 * melhor possível preenche os outros. Sem escolha, é o melhor onze.
 */
export function onzeEscolhido(jogadores, formacao, escolha = null) {
  if (!escolha) return melhorOnze(jogadores, formacao);
  const lugares = CONFIG.formacoes[formacao];
  const usados = new Set();
  const fixos = lugares.map((posicao, i) => {
    const j = jogadores.find((x) => x.id === escolha[i]);
    if (!j || usados.has(j.id)) return null;
    usados.add(j.id);
    return j;
  });
  const livres = lugares.map((_, i) => i).filter((i) => !fixos[i]);
  const { onze: resto, sobram } = atribuir(jogadores.filter((j) => !usados.has(j.id)), livres.map((i) => lugares[i]));
  const onze = lugares.map((posicao, i) => (fixos[i] ? { posicao, jogador: fixos[i].id, overall: overallNaPosicao(fixos[i], posicao) } : resto[livres.indexOf(i)]));
  return { onze, sobram };
}

function atribuir(jogadores, lugares) {
  if (!lugares.length) return { onze: [], sobram: jogadores.map((j) => j.id) };
  // Linhas = lugares; colunas = jogadores + 11 colunas "vazio" (para poder deixar um lugar por preencher).
  const colunas = [...jogadores, ...lugares.map(() => null)];
  // Sozinho, o jogo só põe cada um nas suas posições: fora de posição é sempre escolha do treinador.
  const custo = lugares.map((pos) =>
    colunas.map((j) => {
      if (!j) return SEM_LUGAR;
      const ov = overallNatural(j, pos);
      return ov == null ? SEM_LUGAR * 2 : 100 - ov;
    }),
  );
  const atribuicao = hungaro(custo);
  const usados = new Set();
  const onze = lugares.map((posicao, i) => {
    const j = colunas[atribuicao[i]];
    const ov = j ? overallNatural(j, posicao) : null;
    if (!j || ov == null) return { posicao, jogador: null, overall: null };
    usados.add(j.id);
    return { posicao, jogador: j.id, overall: ov };
  });
  return { onze, sobram: jogadores.filter((j) => !usados.has(j.id)).map((j) => j.id) };
}
