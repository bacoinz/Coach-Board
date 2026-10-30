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
    // 36 casas: 4 lados de 9 (canto + 8), com os cantos em 0, 9, 18 e 27.
    casas: [
      'inicio', 'mercado', 'patrocinio', 'mercado', 'jovens', 'rede', 'mercado', 'empresario', 'mercado',
      'misterio', 'medico', 'mercado', 'rede', 'investigacao', 'empresario', 'mercado', 'patrocinio', 'mercado',
      'sad', 'patrocinio', 'mercado', 'empresario', 'jovens', 'rede', 'mercado', 'medico', 'mercado',
      'misterio', 'rede', 'mercado', 'medico', 'jovens', 'patrocinio', 'mercado', 'empresario', 'mercado',
    ],
    voltas: { verao: 1, inverno: 1 },
    // Dados lançados no tabuleiro (nos jogos são sempre 2). No inverno, o 1.º lançamento de cada treinador é com um dado.
    dados: { verao: 1, inverno: 2, primeiroInverno: 1 },
    // Casa SAD: quem pára lá recebe o valor inteiro; quem passa, recebe parte. Vale a base na época 1 e, em cada época
    // seguinte, multiplica pelo fator do primeiro escalão em que época ≤ ate.
    injecaoSAD: {
      aoPassar: 0.5,
      inverno: 0.5,                 // no inverno vale metade do verão
      base: 3,
      fatores: [
        { ate: 3, fator: 2 },
        { ate: 7, fator: 1.5 },
        { ate: 99, fator: 1.2 },
      ],
    },
  },

  // --- Investigação (src/motor/misterio.js) ---
  // Probabilidade de um clube ser condenado = base + porCampeonato × títulos + porAjuda × ajudas, até ao máximo.
  // Ajudas (desde a última condenação): cartas Mistério boas (com o seu peso), cartas de Empresário usadas e
  // contratos com marcas ou patrocinadores iniciais que entretanto se tornaram grandes.
  // Quem não teve ajudas quase nunca é condenado.
  investigacao: {
    base: 0.03,
    porCampeonato: 0.05,
    porAjuda: 0.12,
    maximo: 0.85,
    ajudaMisterio: 1 / 3,           // multiplica o peso de cada carta Mistério boa
    ajudaEmpresario: 1,             // por cada carta de Empresário usada
    ajudaInicialInvestida: 1,       // por aceitar uma marca ou patrocinador inicial já investido (passo 5)
    // A sanção é sorteada entre estas, com estes pesos.
    sancoes: { limite: 0.4, multa: 0.4, ambas: 0.2 },
    limiteContratacoes: 2,          // contratações que ainda pode fazer nesta janela
    multa: 0.2,                     // parte do orçamento atual que perde
    multaMinima: 2,
  },

  // --- Baralho Mistério (src/motor/misterio.js): metade boas, metade más ---
  // bom: true conta como "ajuda" para a Investigação, com o peso indicado (1 por omissão).
  // ou: valor em M€ que se aplica quando o efeito não é possível (ex.: perder uma carta que não se tem).
  // inverno: título e texto que a carta usa nas janelas de inverno.
  misterio: {
    // Razões do "Castigo interno": a frase é o nome do jogador seguido de uma destas.
    // As de razoesCastigoAdultos nunca saem a jogadores com menos de 18 anos (a base tem reais de 16 e 17).
    razoesCastigoAdultos: [
      'foi apanhado a meter o dedo no cu dos jogadores no banho',
      'foi apanhado a conduzir bêbado e ficou inibido de conduzir',
      'foi apanhado a fumar ganzas atrás das balizas',
      'foi apanhado a sniffar coca na casinha do roupeiro',
      'apareceu bêbedo num treino',
      'disse que se tinha aleijado mas foi só curtir o Carnaval com a irmã',
      'fumava nites no intervalo',
      'fumava ganza no intervalo e nem rodava',
      'arrotou e cheirou a piça',
    ],
    razoesCastigo: [
      'foi apanhado a sair à noite',
      'minou as águas da equipa',
      'proferiu a n-word a um colega',
      'cuspiu na cara do treinador',
      'fez birra pra acordar de manhã',
      'votou num partido de extrema-direita',
      'fez comentários desnecessários no Twitter sobre a mãe de outro jogador',
      'cagou dentro das chuteiras dum colega',
      'recusou-se a fazer perna no ginásio',
      'disse que só jogava pra chegar ao golo 1000',
      'despediu-se dos jogadores com um beijinho e eu não gosto cá dessas merdas',
      'não se benzeu antes de entrar em campo',
      'deu-lhe um grito "não!"',
      'não sabia o que era um fora-de-jogo',
      'não gostava de Coca-Cola com gelo',
      'não gostava de bitoque',
      'achava que delícias-do-mar era um peixe',
      'achava que o árbitro era só um trabalhador da FootLocker',
      'tinha como ídolo o Yannick Djaló',
      'lançou um álbum de funk brasileiro',
    ],
    // Lesões: a frase é o nome do jogador seguido de uma destas. As adultas nunca saem a menores de 18.
    lesoes: [
      'tem uma rotura no posterior da coxa',
      'fez uma entorse no tornozelo',
      'distendeu a virilha',
      'tem uma rotura na barriga da perna',
      'fraturou um metatarso',
      'tem uma pubalgia',
      'sofreu uma concussão',
      'deslocou o ombro',
      'rasgou os ligamentos do joelho',
      'está de caganeira depois de ter comido {comida}',
      'bateu com o mindinho numa cómoda',
      'tem uma unha encravada',
      'tem hemorróidas',
      'apanhou covid',
      'teve um acidente de carro',
      'está cego temporariamente',
      'desmaiou no último treino',
      'está a cagar sangue',
      'está a urinar em pó',
      'está temporariamente surdo',
    ],
    lesoesAdultas: [
      'torceu o colhão',
      'partiu a piça em Z',
      'apanhou uma DST',
      'tem uma borbulha na ponta da piça',
      'está a jorrar leite pelo cu',
      'está com dor de cabecinha',
      'apanhou sífilis',
      'teve um acidente com um dildo',
      'perdeu a sensibilidade na ponta da piroca',
      'rachou um colhão',
      'está temporariamente teso',
    ],
    comidas: [
      'sushi estragado', 'francesinha estragada', 'bitoque sem ovo', 'um pastel de nata da bomba de gasolina',
      'uma bifana de roulotte às 5 da manhã', 'marisco de terça-feira', 'a sopa da sogra', 'um kebab duvidoso',
      'um rissol do bar do estádio', 'um courato da feira', 'uma bola de Berlim da praia em outubro',
    ],
    cartas: [
      { bom: true, titulo: 'Camisolas virais', texto: 'A camisola do clube tornou-se moda nas redes sociais.', efeito: { tipo: 'dinheiro', valor: 3 } },
      { bom: true, titulo: 'Herança de um sócio', texto: 'O sócio n.º 7 deixou tudo ao clube.', efeito: { tipo: 'dinheiro', valor: 5 } },
      { bom: true, titulo: 'Prémio de fair-play', texto: 'As contas estão em dia e alguém reparou.', efeito: { tipo: 'dinheiro', valor: 2 } },
      { bom: true, titulo: 'Digressão pela Ásia', texto: 'Uma digressão de pré-época enche os cofres.', inverno: { titulo: 'Amigáveis nos EUA', texto: 'Uns amigáveis a meio da época enchem os cofres.' }, efeito: { tipo: 'dinheiro', valor: 4 } },
      { bom: true, titulo: 'Patrocínio surpresa', texto: 'Uma empresa de que nunca ouviste falar paga adiantado.', efeito: { tipo: 'dinheiro', valor: 3 } },
      { bom: true, peso: 3, titulo: 'Clube comprado', texto: 'Um fundo estrangeiro comprou o clube. O dinheiro só chega na próxima janela.', efeito: { tipo: 'proximaJanela', valor: 15 } },
      { bom: true, peso: 2, titulo: 'Nome no estádio', texto: 'Venderam o nome do estádio. Recebes na próxima janela.', efeito: { tipo: 'proximaJanela', valor: 8 } },
      { bom: true, peso: 2, titulo: 'Mecenas anónimo', texto: 'Alguém promete uma transferência bancária para a próxima janela.', efeito: { tipo: 'proximaJanela', valor: 5 } },
      { bom: true, titulo: 'Super-empréstimo', texto: 'Um craque (86 ou mais) joga por ti no próximo jogo.', efeito: { tipo: 'jogo', efeito: 'craque', overall: [86, 99] } },
      { bom: true, titulo: 'Estágio na montanha', texto: 'A equipa voa no próximo jogo: +1 no modificador.', efeito: { tipo: 'jogo', efeito: 'modificador', valor: 1 } },
      { bom: true, titulo: 'Agente amigo', texto: 'Um velho conhecido oferece os seus serviços.', efeito: { tipo: 'carta', carta: 'empresario' } },
      { bom: true, titulo: 'Clínica nova', texto: 'O clube inaugura um centro médico.', efeito: { tipo: 'carta', carta: 'medico' } },
      { bom: true, titulo: 'Olheiro genial', texto: 'Contrataste um olheiro com faro: ganhas uma Rede.', efeito: { tipo: 'rede', ou: 2 } },
      { bom: true, titulo: 'Amigo do presidente', texto: 'A tua próxima compra no Mercado tem 30% de desconto.', efeito: { tipo: 'desconto', fracao: 0.3 } },
      { bom: true, titulo: 'Livre de luxo', texto: 'Um jogador sem clube quer assinar por ti, a custo zero.', efeito: { tipo: 'jogadorLivre', overall: [72, 77] } },
      { bom: true, titulo: 'A academia explode', texto: 'O teu melhor jovem da formação ganha +3 de overall.', efeito: { tipo: 'overall', alvo: 'jovem', delta: 3, ou: 2 } },
      { bom: true, titulo: 'Adjunto génio', texto: 'Um jogador ao acaso ganha +1 de overall.', efeito: { tipo: 'overall', alvo: 'acaso', delta: 1, ou: 1 } },
      { bom: true, titulo: 'Voo fretado', texto: 'Lanças os dados outra vez.', efeito: { tipo: 'repetir' } },
      { bom: true, titulo: 'Telefonema importante', texto: 'Avanças até ao próximo Mercado.', efeito: { tipo: 'avancar', casa: 'mercado' } },
      { bom: true, titulo: 'Cláusula blindada', texto: 'A cláusula do teu melhor jogador passa a 2× o valor, sem gastar Empresário.', efeito: { tipo: 'blindar', ou: 2 } },

      { bom: false, titulo: 'Multa da federação', texto: 'O castigo chegou por carta registada.', efeito: { tipo: 'dinheiro', valor: -4 } },
      { bom: false, titulo: 'Obras no estádio', texto: 'A bancada central afinal precisava de pilares.', efeito: { tipo: 'dinheiro', valor: -3 } },
      { bom: false, titulo: 'Erro do contabilista', texto: 'Havia um zero a mais nas contas.', efeito: { tipo: 'dinheiro', valor: -5 } },
      { bom: false, titulo: 'Salários em atraso', texto: 'O plantel foi para tribunal e ganhou.', efeito: { tipo: 'dinheiro', valor: -2 } },
      { bom: false, titulo: 'Balneário destruído', texto: 'A claque não gostou do último resultado.', efeito: { tipo: 'dinheiro', valor: -2 } },
      { bom: false, titulo: 'Patrocinador furioso', texto: 'Um escândalo obriga a devolver dinheiro.', efeito: { tipo: 'dinheiro', valor: -3 } },
      { bom: false, titulo: 'Penhora das Finanças', texto: 'Na próxima janela, 8 M€ ficam retidos.', efeito: { tipo: 'proximaJanela', valor: -8 } },
      { bom: false, titulo: 'Dívida antiga', texto: 'Uma transferência de há dez anos ficou por pagar. Vence na próxima janela.', efeito: { tipo: 'proximaJanela', valor: -5 } },
      { bom: false, titulo: 'Inspeção fiscal', texto: 'Perdes 10% do orçamento.', efeito: { tipo: 'percentagem', fracao: 0.1 } },
      { bom: false, titulo: 'Diretor em fuga', texto: 'Levou 15% do orçamento numa mala.', efeito: { tipo: 'percentagem', fracao: 0.15 } },
      { bom: false, titulo: 'Lesão no treino', texto: 'Um jogador ao acaso falha o próximo jogo, por uma das lesões da lista.', efeito: { tipo: 'jogo', efeito: 'lesao' } },
      { bom: false, titulo: 'Castigo interno', texto: 'Um jogador ao acaso fica de fora do próximo jogo, por uma das razões de razoesCastigo.', efeito: { tipo: 'jogo', efeito: 'suspenso' } },
      { bom: false, titulo: 'Balneário dividido', texto: 'Ninguém se fala: −1 no modificador do próximo jogo.', efeito: { tipo: 'jogo', efeito: 'modificador', valor: -1 } },
      { bom: false, titulo: 'Noite de copos', texto: 'Um jogador ao acaso perde 1 de overall.', efeito: { tipo: 'overall', alvo: 'acaso', delta: -1, ou: -1 } },
      { bom: false, titulo: 'Olheiro roubado', texto: 'Perdes uma Rede de observação.', efeito: { tipo: 'perderRede', ou: -2 } },
      { bom: false, titulo: 'Empresário zangado', texto: 'Perdes uma carta de Empresário.', efeito: { tipo: 'perderCarta', carta: 'empresario', ou: -2 } },
      { bom: false, titulo: 'Médico despedido', texto: 'Perdes uma carta do Departamento médico.', efeito: { tipo: 'perderCarta', carta: 'medico', ou: -1 } },
      { bom: false, titulo: 'Papelada em atraso', texto: 'Perdes a próxima vez no tabuleiro.', efeito: { tipo: 'perderVez' } },
      { bom: false, titulo: 'O craque quer sair', texto: 'Até à próxima janela, a cláusula do teu melhor jogador fica em 1× o valor.', efeito: { tipo: 'clausulaBaixa' } },
      { bom: false, titulo: 'Farto disto tudo', texto: 'Um jogador ao acaso (fora dos 3 melhores) vai embora, ao preço base.', efeito: { tipo: 'vendaForcada' } },
    ],
  },

  // --- Cartas ---
  cartas: {
    precoCasa: 0.8,                 // quem cai no Mercado ou em Jovens Talentos compra a 80% do valor
    redeDesconto: 0.2,              // 20% de desconto nos jogadores da liga (soma-se ao anterior)
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

  // --- Motor dos jogos (src/motor/jogo.js) ---
  jogo: {
    // Cada tática vence a seguinte; a última vence a primeira.
    taticas: ['Contra-ataque', 'Ataque Total', 'Autocarro', 'Posse de Bola', 'Pressão Alta'],
    periodos: 9,
    minutosPorPeriodo: 10,
    segundosPorPeriodo: 4,          // no ecrã
    forca: { pontosPorUnidade: 3, maximo: 2 }, // ±1 por cada 3 pontos de Ataque − Defesa, entre −2 e +2
    bonusTatica: 1,
    vermelho: 1,                    // −1 no modificador até ao fim
    // Química: grupos de jogadores da mesma nacionalidade no onze. Uma parte decimal é a probabilidade de +1 em cada lance.
    quimica: { tamanhoGrupo: 3, porGrupo: 0.25, maximo: 0.5 },
    // Total (dados + modificador) → resultado: até este total, golo com este dado extra ou mais.
    oportunidades: [
      { ate: 5, nome: 'nada' },
      { ate: 7, nome: 'baixa', dadoMinimo: 6 },
      { ate: 9, nome: 'media', dadoMinimo: 5 },
      { ate: 12, nome: 'alta', dadoMinimo: 4 },
      { ate: 99, nome: 'certo', dadoMinimo: 0 },
    ],
    // Dados iguais: carta de acontecimento.
    acontecimentos: {
      leves: 2 / 3,
      textosLeves: ['Amarelo', 'Bola ao poste', 'Grande defesa', 'Fora de jogo', 'Canto'],
      fortes: { vermelho: 1, lesao: 1, penalti: 1, bolaParada: 1 },
      penaltiMinimo: 3,             // um dado: golo com 3–6
      bolaParadaMinimo: 4,          // um dado: golo com 4–6
    },
    // Peso de cada linha para marcar e assistir (multiplica pela finalização ou pelo passe).
    pesoMarcar: { GR: 0.01, DEF: 0.35, MED: 1, AV: 2.5 },
    pesoAssistir: { GR: 0.05, DEF: 0.6, MED: 1.3, AV: 1 },
    probabilidadeAssistencia: 0.8,
    // Quem substitui: lesão sem carta médica (15% de ser pelo menos tão bom) ou efeito de carta Mistério por um jogo.
    emprestimoLesao: { probabilidadeIgualOuMelhor: 0.15, margemMelhor: 3, margemPior: 8 },
    substitutoUmJogo: { overall: [60, 65] },
  },

  // --- Bots: podem ganhar títulos, mas tem de ser muito raro ---
  // Modificador escondido em todos os jogos dos bots, conforme o nível escolhido no lobby.
  bots: {
    modificador: { inferior: -1.5, equivalente: -1 },
  },

  // --- Campeonato (src/motor/campeonato.js) ---
  campeonato: {
    vitoria: 3,
    empate: 1,
    tvEpoca: 40,                    // M€ de TV por época, iguais para todos e pagos por jornada
  },

  // --- Fecho da janela ---
  fecho: {
    plantel: 11,
    formacao: 1,                    // +1 jovem da formação
    emprestimo: { overall: [60, 65] }, // jogador emprestado para uma posição em falta
  },
};
