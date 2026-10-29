// Todos os valores de equilíbrio do jogo, num só sítio, para afinar depois de jogar.
// Dinheiro em milhões de euros (M€). Partilhado pelo servidor, pelo cliente e pelos scripts.
// As secções dos passos seguintes (jogos, patrocínios…) vão sendo acrescentadas aqui.

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

  // --- Sala ---
  sala: {
    minTreinadores: 2,
    maxTreinadores: 8,
    maxEquipas: 10,                 // treinadores + bots
    epocas: [3, 5, 8, 10],
    maxBots: 6,
    diasSemAtividade: 120,          // depois disto a sala apaga-se
  },

  // --- Início da partida (src/motor/equipas.js) ---
  inicio: {
    orcamento: 40,
    // Os 11 overalls do plantel inicial: iguais para todos (média 75), distribuídos ao acaso pelas posições.
    overalls: [78, 77, 77, 76, 75, 75, 75, 74, 73, 73, 72],
    // As posições do plantel inicial (servem a 4-4-2 e, com alternativas, as outras formações).
    posicoes: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    idade: [22, 31],
    // Bots "inferiores": overall do plantel inicial menos isto. "Equivalentes": igual.
    botsInferiores: 4,
    premioMarcaInicial: 1.5,
    premioPatrocinioInicial: 1,
  },

  // --- Posições e formações (src/motor/formacao.js) ---
  posicoes: {
    // Linha de cada posição: conta para a Defesa (GR + DEF) ou para o Ataque (MED + AV) no motor dos jogos.
    linha: { GK: 'GR', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MED', CM: 'MED', CAM: 'MED', LM: 'MED', RM: 'MED', LW: 'AV', RW: 'AV', ST: 'AV' },
    nome: { GK: 'GR', CB: 'DC', LB: 'DE', RB: 'DD', CDM: 'MDC', CM: 'MC', CAM: 'MCO', LM: 'ME', RM: 'MD', LW: 'EE', RW: 'ED', ST: 'PL' },
    penalizacaoAlternativa: 2,      // overall a menos numa posição alternativa
  },
  formacoes: {
    '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CM', 'LW', 'ST', 'RW'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LM', 'CAM', 'RM', 'ST'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LM', 'CDM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '3-4-3': ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'LW', 'ST', 'RW'],
    '5-3-2': ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CM', 'ST', 'ST'],
  },

  // --- Formação (jovens) ---
  jovens: {
    potencial: [85, 95],            // potencial escondido de um jovem
    promocao: { idade: 21, overall: 78 }, // com mais do que isto passa ao plantel principal
  },

  // --- Draft (src/motor/draft.js). Critérios: idade e overall inclusivos. ---
  draft: {
    opcoes: 3,
    jovem: { idade: [0, 21], overall: [60, 68] },
    // Escolha extra do último classificado: uma das variantes, sorteada por opção.
    extra: [
      { idade: [34, 99], overall: [80, 85] },
      { idade: [21, 23], overall: [78, 82] },
    ],
  },

  // --- Tabuleiro (src/motor/tabuleiro.js) ---
  tabuleiro: {
    casas: [
      'inicio', 'mercado', 'rede', 'mercado', 'empresario', 'patrocinio', 'mercado', 'medico', 'mercado', 'mercado',
      'jovens', 'mercado', 'rede', 'empresario', 'mercado', 'patrocinio', 'mercado', 'empresario', 'mercado', 'medico',
      'patrocinio', 'mercado', 'empresario', 'rede', 'mercado', 'mercado', 'mercado', 'patrocinio', 'empresario', 'mercado',
      'jovens', 'rede', 'medico', 'mercado', 'patrocinio', 'mercado', 'mercado', 'empresario', 'rede', 'jovens',
    ],
    voltas: { verao: 2, inverno: 1 },
  },

  // --- Cartas ---
  cartas: {
    redeDesconto: 0.2,              // 20% de desconto nos jogadores da liga
    maxRedes: 2,
    redeMinJogadores: 60,           // só há carta de Rede para ligas com pelo menos isto no baralho do Mercado
    jovensTalentos: { idade: [0, 23], overall: [78, 82] },
  },

  // --- Baralho do Mercado: fases por época (src/motor/cartas.js) ---
  // Cada fase tem uma faixa principal de overall. Cada carta sai da faixa principal, de baixo (do mínimo até à
  // faixa) ou de cima (da faixa até ao máximo), com estas probabilidades. Se a faixa sorteada estiver vazia,
  // usa-se a mais próxima.
  mercado: {
    overallMinimo: 70,
    overallMaximo: 99,
    probabilidades: { principal: 0.6, abaixo: 0.3, acima: 0.1 },
    fases: [
      null,
      [78, 81],  // 1
      [80, 83],  // 2
      [82, 84],  // 3
      [83, 86],  // 4
      [85, 87],  // 5
      [86, 89],  // 6
      [88, 99],  // 7
    ],
    // Fase de cada época, conforme a duração da partida (igual à dos patrocínios).
    fasesPorDuracao: {
      3: [1, 4, 7],
      5: [1, 3, 4, 6, 7],
      8: [1, 2, 3, 4, 4, 5, 6, 7],
      10: [1, 2, 2, 3, 4, 4, 5, 6, 6, 7],
    },
  },

  // --- Leilões e propostas ---
  leilao: {
    incrementoMinimo: 0.5,          // cada lance sobe pelo menos isto
  },

  // --- Fecho da janela ---
  fecho: {
    plantel: 11,
    formacao: 1,                    // +1 jovem da formação
    emprestimo: { overall: [60, 65] }, // jogador emprestado para uma posição em falta
  },
};
