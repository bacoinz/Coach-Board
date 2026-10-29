// Todos os valores de equilíbrio do jogo, num só sítio, para afinar depois de jogar.
// Dinheiro em milhões de euros (M€). Partilhado pelo servidor, pelo cliente e pelos scripts.
// As secções dos passos seguintes (tabuleiro, jogos, patrocínios…) vão sendo acrescentadas aqui.

export const CONFIG = {
  // --- Base de jogadores (scripts/importar-jogadores.mjs) ---
  dados: {
    overallMinimo: 55,              // abaixo disto não entra na base
    dataReferencia: '2026-09-01',   // a idade de cada jogador é calculada nesta data (início da época 1)
  },

  // --- Valor de mercado, cláusula, salário (src/motor/valores.js) ---
  valores: {
    // valor = base × e^(curva × (overall − overallBase)) × fator da idade
    base: 8,                        // um jogador de 75 com 25–28 anos vale 8 M€
    overallBase: 75,
    curva: 0.2,                     // cada ponto de overall vale ~22% mais
    minimo: 0.1,
    // Fator da idade: o primeiro escalão em que idade ≤ ate.
    idade: [
      { ate: 21, fator: 1.3 },
      { ate: 24, fator: 1.2 },
      { ate: 28, fator: 1.0 },
      { ate: 30, fator: 0.85 },
      { ate: 32, fator: 0.65 },
      { ate: 34, fator: 0.45 },
      { ate: 99, fator: 0.3 },
    ],
    arredondar: 0.1,                // os valores arredondam ao 0,1 M€
    clausula: 1.5,                  // cláusula = 1,5 × valor
    clausulaInflacionada: 2,        // Empresário: cláusula de um jogador teu
    clausulaEmpresario: 1,          // Empresário: cláusula do jogador alvo
    precoBase: 0.4,                 // venda à banca = 40% do valor
    precoDraft: 0.6,                // escolha do draft = 60% do valor
    salarioEpoca: 0.05,             // salário de uma época = 5% do valor (cobrado por jornada)
  },
};
