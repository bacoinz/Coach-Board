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
    // Acima do joelho, cada ponto vale menos, para os craques das partidas longas não ficarem impossíveis de pagar.
    joelho: 88,
    curvaTopo: 0.08,                // cada ponto acima do joelho vale ~8% mais
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
    clausulaInflacionada: 2,        // Agente: cláusula de um jogador teu
    clausulaEmpresario: 1,          // Agente: cláusula do jogador alvo
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
    emblema: { tamanho: 256, maxKB: 200 }, // píxeis do lado e peso máximo de cada emblema
  },

  // --- Início da partida (src/motor/equipas.js) ---
  inicio: {
    orcamento: 40,
    // Numa partida curta, o Mercado encarece depressa: sem isto não há dinheiro para os bons jogadores na 2.ª época.
    orcamentoExtra: { 3: 20, 5: 10 },
    // Os 11 overalls do plantel inicial: iguais para todos (média 75), distribuídos ao acaso pelas posições.
    overalls: [78, 77, 77, 76, 75, 75, 75, 74, 73, 73, 72],
    // As posições do plantel inicial (servem a 4-4-2 e, com alternativas, as outras formações).
    posicoes: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    idade: [22, 31],
    // Bots "inferiores": overall do plantel inicial menos isto. "Equivalentes": igual.
    botsInferiores: 4,
    premioMarcaInicial: 3,
    premioPatrocinioInicial: 2,
  },

  // --- Posições e formações (src/motor/formacao.js) ---
  posicoes: {
    // Linha de cada posição: conta para a Defesa (GR + DEF) ou para o Ataque (MED + AV) no motor dos jogos.
    linha: { GK: 'GR', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MED', CM: 'MED', CAM: 'MED', LM: 'MED', RM: 'MED', LW: 'AV', RW: 'AV', ST: 'AV' },
    nome: { GK: 'GR', CB: 'DC', LB: 'DE', RB: 'DD', CDM: 'MDC', CM: 'MC', CAM: 'MCO', LM: 'ME', RM: 'MD', LW: 'EE', RW: 'ED', ST: 'PL' },
    // Na posição principal e nas alternativas joga com o overall todo. Noutra posição pode jogar, escolhido à mão, com menos:
    foraDePosicao: { mesmaLinha: 5, outraLinha: 10 },
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
    idadeMaxima: 21,                // só entra na formação até esta idade
    overallPrincipal: 78,           // com este overall já não é da formação: entra ou passa ao plantel principal
  },

  // --- Draft (src/motor/draft.js). Critérios: idade e overall inclusivos. ---
  draft: {
    opcoes: 3,
    // Na 1.ª época; cada época seguinte sobe porEpoca nos dois limites do overall.
    jovem: { idade: [0, 21], overall: [60, 68], porEpoca: 1 },
    // Segunda escolha do último classificado (não há na 1.ª janela, porque ainda não há classificação).
    // Na 1.ª época: até 80 de overall e até 5 M€. Cada época sobe 1 de overall até 82 e 1 M€ até 7 M€.
    extra: {
      overall: { inicial: 80, porEpoca: 1, maximo: 82 },
      valor: { inicial: 5, porEpoca: 1, maximo: 7 },
      margemOverall: 6,             // as opções saem a menos de 6 pontos do limite, para a escolha valer a pena
    },
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
    // Casa SAD: quem pára lá recebe o valor inteiro; quem passa, recebe parte. Cresce com os preços: o valor depende da
    // fase do Mercado desta época, e por isso da duração da partida.
    injecaoSAD: {
      aoPassar: 0.5,
      inverno: 0.5,                 // no inverno vale metade do verão
      porFase: [null, 3, 6, 12, 18, 27, 40, 60],
    },
  },

  // --- Investigação (src/motor/misterio.js) ---
  // Probabilidade de um clube ser condenado = base + porCampeonato × títulos + porAjuda × ajudas, até ao máximo.
  // Ajudas (desde a última condenação): cartas Mistério boas (com o seu peso), cartas de Agente usadas e
  // contratos com marcas ou patrocinadores iniciais que entretanto se tornaram grandes.
  // Quem não teve ajudas quase nunca é condenado.
  investigacao: {
    acusacoes: [
      'Fuga ao fisco',
      'Contas da SAD maquilhadas',
      'Empresas-fantasma em offshores',
      'Comissões a agentes por baixo da mesa',
      'Salários pagos em envelopes',
      'Viciação de resultados',
      'Direitos de jogadores vendidos duas vezes',
      'Contratos de patrocínio inventados',
    ],
    base: 0.03,
    porCampeonato: 0.05,
    porAjuda: 0.12,
    maximo: 0.85,
    ajudaMisterio: 1 / 3,           // multiplica o peso de cada carta Mistério boa
    ajudaEmpresario: 1,             // por cada carta de Agente usada
    ajudaInicialInvestida: 1,       // por aceitar uma marca ou patrocinador inicial já investido
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
    // Fim da partida: nas últimas épocas saem mais cartas más, para o jogo ficar mais imprevisível.
    // Também limita a Força nos jogos e faz as cartas más doerem mais. É nestas épocas que se joga a Taça.
    fimDePartida: { epocas: { 3: 1, 5: 2, 8: 3, 10: 3 }, probabilidadeMa: 0.7, multiplicadorMas: 2, forcaMaxima: 1 },
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
      { bom: true, titulo: 'Cláusula blindada', texto: 'A cláusula do teu melhor jogador passa a 2× o valor, sem gastar Agente.', efeito: { tipo: 'blindar', ou: 2 } },

      { bom: false, titulo: 'Multa da federação', texto: 'O castigo chegou por carta registada.', efeito: { tipo: 'dinheiro', valor: -4 } },
      { bom: false, titulo: 'Obras no estádio', texto: 'A bancada central afinal precisava de pilares.', efeito: { tipo: 'dinheiro', valor: -3 } },
      { bom: false, titulo: 'Erro do contabilista', texto: 'Havia um zero a mais nas contas.', efeito: { tipo: 'dinheiro', valor: -5 } },
      { bom: false, titulo: 'Salários em atraso', texto: 'O plantel foi para tribunal e ganhou.', efeito: { tipo: 'dinheiro', valor: -2 } },
      { bom: false, titulo: 'Balneário destruído', texto: 'A claque não gostou do último resultado.', efeito: { tipo: 'dinheiro', valor: -2 } },
      { bom: false, titulo: 'Patrocinador furioso', texto: 'Um escândalo obriga a devolver dinheiro.', efeito: { tipo: 'dinheiro', valor: -3 } },
      { bom: false, titulo: 'Penhora das Finanças', texto: 'Na próxima janela, fica dinheiro retido.', efeito: { tipo: 'proximaJanela', valor: -8 } },
      { bom: false, titulo: 'Dívida antiga', texto: 'Uma transferência de há dez anos ficou por pagar. Vence na próxima janela.', efeito: { tipo: 'proximaJanela', valor: -5 } },
      { bom: false, titulo: 'Inspeção fiscal', texto: 'Levaram parte do orçamento.', efeito: { tipo: 'percentagem', fracao: 0.1 } },
      { bom: false, titulo: 'Diretor em fuga', texto: 'Levou parte do orçamento numa mala.', efeito: { tipo: 'percentagem', fracao: 0.15 } },
      { bom: false, titulo: 'Lesão no treino', texto: 'Um jogador ao acaso falha o próximo jogo, por uma das lesões da lista.', efeito: { tipo: 'jogo', efeito: 'lesao' } },
      { bom: false, titulo: 'Castigo interno', texto: 'Um jogador ao acaso fica de fora do próximo jogo, por uma das razões de razoesCastigo.', efeito: { tipo: 'jogo', efeito: 'suspenso' } },
      { bom: false, titulo: 'Balneário dividido', texto: 'Ninguém se fala: −1 no modificador do próximo jogo.', efeito: { tipo: 'jogo', efeito: 'modificador', valor: -1 } },
      { bom: false, titulo: 'Noite de copos', texto: 'Um jogador ao acaso perde 1 de overall.', efeito: { tipo: 'overall', alvo: 'acaso', delta: -1, ou: -1 } },
      { bom: false, titulo: 'Olheiro roubado', texto: 'Perdes uma Rede de observação.', efeito: { tipo: 'perderRede', ou: -2 } },
      { bom: false, titulo: 'Agente zangado', texto: 'Perdes uma carta de Agente.', efeito: { tipo: 'perderCarta', carta: 'empresario', ou: -2 } },
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
    redeMinJogadores: 60,           // só há carta de Rede com pelo menos isto no baralho do Mercado
    // As cartas de Rede que existem: uma liga, ou um grupo de ligas.
    redes: [
      { nome: 'Liga Portugal', ligas: ['Liga Portugal'] },
      { nome: 'LALIGA EA SPORTS', ligas: ['LALIGA EA SPORTS'] },
      { nome: 'Serie A Enilive', ligas: ['Serie A Enilive'] },
      { nome: "Ligue 1 McDonald's", ligas: ["Ligue 1 McDonald's"] },
      { nome: 'Premier League', ligas: ['Premier League'] },
      { nome: 'EFL Championship', ligas: ['EFL Championship'] },
      { nome: 'Bundesliga', ligas: ['Bundesliga'] },
      { nome: 'Ligas asiáticas', ligas: ['ROSHN Saudi League', 'CSL', 'K League 1', 'United Emirates League', 'Thailand League', 'ISL'] },
      { nome: 'Ligas sul-americanas', ligas: ['LPF', 'CONMEBOL Libertadores', 'CONMEBOL Sudamericana', 'Liga do Brasil', 'Liga Colombia'] },
      { nome: 'Ligas norte-americanas', ligas: ['MLS', 'Liga BBVA MX'] },
    ],
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
  // Numa janela, não se compram mais do que estes jogadores ao mesmo treinador (propostas, Agente e trocas).
  transferencias: {
    maxPorTreinador: 2,
    // Durante a janela pode-se gastar mais do que se tem, até esta dívida, mas tem de se acabar a janela sem ela.
    // Cresce com os preços: depende da fase do Mercado desta época.
    dividaPorFase: [null, 40, 50, 60, 70, 85, 100, 120],
    // Em dívida não se vende à banca: o jogador vai a leilão, a começar nesta parte do valor de mercado.
    // Só se ninguém licitar é que vai para a banca, ao preço base.
    leilaoDivida: 0.8,
  },

  // Os momentos da época, no ecrã do campeão (src/motor/momentos.js).
  momentos: {
    goleada: 3,                     // diferença de golos que já conta como goleada
    hatTrick: 3,                    // golos de um jogador num jogo
    compraCara: 1.25,               // pagar isto × o valor é uma compra ruinosa...
    compraCaraMinimo: 3,            // ...desde que sejam pelo menos estes M€ a mais
    pechincha: 0.7,                 // pagar isto × o valor, ou menos, é uma pechincha
    porLista: 3,
  },

  // --- Motor dos jogos (src/motor/jogo.js) ---
  jogo: {
    // Cada tática vence a seguinte; a última vence a primeira.
    taticas: ['Contra-ataque', 'Ataque Total', 'Autocarro', 'Posse de Bola', 'Pressão Alta'],
    periodos: 9,
    minutosPorPeriodo: 10,
    segundosPorPeriodo: 7,          // quanto dura no ecrã a animação de cada ronda de 10 minutos
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
    // Quem se lesiona e fica em campo joga com menos isto de overall até ao fim do jogo.
    // Um suplente que entra por lesão para fora das suas posições joga só com menos foraDePosicao.
    lesao: { penalizacao: 10, foraDePosicao: 3 },
    // As lesões em campo; as outras, mais disparatadas, ficam para as cartas Mistério.
    lesoesEmCampo: [
      'sentiu a coxa num sprint',
      'torceu o tornozelo numa dividida',
      'levou uma pancada no joelho',
      'ficou com uma contratura na barriga da perna',
      'caiu mal em cima do ombro',
      'sentiu os isquiotibiais a puxar',
      'magoou as costas num choque',
      'lesionou o pé num carrinho',
    ],
    emprestimoLesao: { margemPior: 8 },     // nunca melhor nem mais caro do que o lesionado
    substitutoUmJogo: { overall: [60, 65] },
  },

  // --- Bots: podem ganhar títulos, mas tem de ser muito raro ---
  // Modificador escondido em todos os jogos dos bots, conforme o nível escolhido no lobby.
  bots: {
    modificador: { inferior: -1.5, equivalente: -1 },
    // Na Taça só entra um bot quando os treinadores são ímpares. A um só jogo é preciso mais, senão ganha demasiadas.
    modificadorTaca: { inferior: -3, equivalente: -2 },
    // Em cada janela trocam os piores jogadores até a média ficar esta distância abaixo da dos onzes dos treinadores.
    distancia: { inferior: 6, equivalente: 2 },
    trocasPorJanela: 3,
  },

  // --- Marcas e patrocínios (src/motor/patrocinios.js) ---
  patrocinios: {
    // Prémio de assinatura em M€. Os "iniciais" (no início da partida) estão em CONFIG.inicio.
    premios: {
      marca: { baixas: 4, medias: 10, grandes: 20, investidas: 24 },
      patrocinio: { baixas: 3, medias: 6, grandes: 12, investidas: 14 },
    },
    extensao: 0.25,                 // prémio de extensão = esta parte do prémio de assinatura
    probabilidadeMarca: 0.5,        // a carta da casa é uma marca ou um patrocinador
    mudancasMarcaPorEpoca: 1,
    mudancasPatrocinioPorJanela: 1, // e o mesmo lugar de patrocinador não muda duas vezes na mesma época
    altos: ['grandes', 'investidas'], // nunca dois patrocínios destes ao mesmo tempo
    // Probabilidades de cada categoria por fase (a fase de cada época está em CONFIG.mercado.fasesPorDuracao).
    fases: [
      null,
      { baixas: 1 },
      { baixas: 0.5, medias: 0.5 },
      { baixas: 0.25, medias: 0.75 },
      { baixas: 0.1, medias: 0.5, grandes: 0.4 },
      { investidas: 0.1, medias: 0.4, grandes: 0.5 },
      { investidas: 0.2, medias: 0.2, grandes: 0.6 },
      { investidas: 0.3, grandes: 0.7 },
    ],
  },

  // --- Fim de época (src/motor/fim-epoca.js) ---
  evolucao: {
    // Overall de quem não é da formação, pela idade na época que acaba: o primeiro escalão em que idade ≤ ate.
    // Em cada um, as probabilidades de cada variação.
    adultos: [
      // Quem já tem overall acima de "travao.acima" sobe mais devagar, senão passava os 95 muito depressa.
      { ate: 23, variacoes: { 1: 0.15, 2: 0.6, 3: 0.25 }, travao: { acima: 84, variacoes: { 1: 0.8, 2: 0.2 } } },
      { ate: 30, variacoes: { 1: 0.8, 2: 0.2 }, travao: { acima: 88, variacoes: { 0: 0.5, 1: 0.5 } } },
      { ate: 33, variacoes: { 0: 0.7, 1: 0.3 } },
    ],
    // A partir daqui, pode perder overall: a probabilidade começa aqui e aumenta a cada ano.
    veteranos: { desde: 34, probabilidade: 0.2, aumentoPorAno: 0.1, delta: -1 },
    // No fim de cada época: quem faz esta idade pode reformar-se, com esta probabilidade, que sobe a cada ano.
    reforma: { desde: 34, probabilidade: 0.1, aumentoPorAno: 0.1 },
    overallMaximo: 99,
    // O rendimento da época (de −1 a +1) inclina as probabilidades: mais peso às subidas de quem jogou bem.
    // Médios e avançados: golos e assistências por jogo, em relação ao alvo. Defesas e GR: golos sofridos pela equipa por
    // jogo, em relação à média da liga. Quem jogou menos do que "minimoMinutos" da época não conta.
    rendimento: { influencia: 0.5, minimoMinutos: 0.2, alvoPorJogo: { MED: 0.25, AV: 0.55 }, pesoAssistencia: 0.7 },
    crescimentoJovem: [2, 8],       // de +2 (quase não jogou) a +8 (jogou quase tudo)
    notaEpoca: { golo: 3, assistencia: 2, homemDoJogo: 4, jogo: 0.5, overall: 0.2 },
    equipaDaEpoca: { GR: 1, DEF: 4, MED: 3, AV: 3 },
  },

  // --- Campeonato (src/motor/campeonato.js) ---
  campeonato: {
    vitoria: 3,
    empate: 1,
    // M€ de TV por época, iguais para todos e pagos por jornada. Cresce com os preços: depende da fase do Mercado da
    // época seguinte, porque é esse dinheiro que paga a janela seguinte (na última época, da própria).
    tvPorFase: [null, 40, 60, 70, 80, 100, 130, 170],
  },

  // --- Taça (src/motor/campeonato.js): a eliminar, no fim das últimas épocas (CONFIG.misterio.fimDePartida.epocas) ---
  taca: {
    valor: 0.5,                     // um campeonato vale 1 título; a Taça vale metade
    penaltis: 5,                    // desempate: 5 de cada lado, com o dado de um penálti normal, e depois morte súbita
    premioVitoria: 1,               // M€ por cada eliminatória ganha
    premioVencedor: 3,              // M€ a mais para quem ganha a Taça
  },

  // --- Fecho da janela ---
  fecho: {
    plantel: 11,
    formacao: 1,                    // +1 jovem da formação
    emprestimo: { overall: [60, 65] }, // jogador emprestado para uma posição em falta
  },
};
