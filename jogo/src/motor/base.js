// Formato da base de jogadores (public/dados/jogadores.bin, gerada por scripts/importar-jogadores.mjs)
// e leitura para objetos. A base é só de leitura: o que muda durante a partida (overall, idade, lesões…)
// fica no estado de cada equipa, com o id do jogador.

/** Ordem das colunas de cada jogador na base. */
export const COLUNAS = ['id', 'nome', 'curto', 'idade', 'nacao', 'liga', 'clube', 'posicao', 'alternativas', 'overall', 'finalizacao', 'passe', 'facetas'];

/** Converte a base em colunas num Map id → jogador, com os nomes das tabelas já resolvidos. */
export function lerBase(base) {
  const i = Object.fromEntries(base.colunas.map((c, n) => [c, n]));
  const jogadores = new Map();
  for (const l of base.jogadores) {
    jogadores.set(l[i.id], {
      id: l[i.id],
      nome: l[i.nome],
      curto: l[i.curto],
      idade: l[i.idade],
      nacao: base.nacoes[l[i.nacao]],
      liga: base.ligas[l[i.liga]],
      clube: base.clubes[l[i.clube]],
      posicao: l[i.posicao],
      alternativas: l[i.alternativas] ? l[i.alternativas].split(' ') : [],
      overall: l[i.overall],
      finalizacao: l[i.finalizacao],
      passe: l[i.passe],
      facetas: l[i.facetas],
    });
  }
  return { edicao: base.edicao, snapshot: base.snapshot, jogadores, ligas: base.ligas, nacoes: base.nacoes };
}

/** Lê o ficheiro com gzip (Response, ArrayBuffer ou Uint8Array) num ambiente com DecompressionStream. */
export async function descomprimir(dados) {
  const corpo = dados instanceof Response ? dados.body : new Blob([dados]).stream();
  const texto = await new Response(corpo.pipeThrough(new DecompressionStream('gzip'))).text();
  return JSON.parse(texto);
}
