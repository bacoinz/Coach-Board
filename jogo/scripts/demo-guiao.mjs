// O guião da demo: joga uma partida a sério com o motor do jogo, com os dados escolhidos para passar por todas as casas,
// e guarda o estado de cada momento com o texto que o explica. O cliente só mostra estes estados, um a um.
import { criarAleatorio } from '../src/motor/aleatorio.js';
import { novaSala, entrar, marcarPronto, configurar } from '../src/motor/sala-logica.js';
import { comecar, agir } from '../src/motor/partida.js';
import { jogador } from '../src/motor/estado.js';
import { sugestaoFecho } from '../src/motor/janela.js';
import { CICLO_TATICAS, lesaoPorDecidir } from '../src/motor/jogo.js';
import { estadoPublico, privado } from '../src/motor/vista.js';
import { CONFIG } from '../src/config.js';
import { passo } from './treinador-auto.mjs';

const EQUIPAS = {
  eu: { nome: 'Noob FC', kit: { padrao: 'riscas-v', principal: '#1d4ed8', secundaria: '#ffffff' } },
  rival: { nome: 'Dumb United', kit: { padrao: 'metades', principal: '#dc2626', secundaria: '#111111' } },
  bots: [
    { nome: 'CD Algoritmo', kit: { padrao: 'faixa', principal: '#facc15', secundaria: '#15803d' } },
    { nome: 'Real Calhau', kit: { padrao: 'mangas', principal: '#ffffff', secundaria: '#7c3aed' } },
  ],
};

const ULTIMA_CASA = CONFIG.tabuleiro.casas.length - 1;

/** Joga a partida com esta semente. Devolve os passos, ou rebenta se a sorte não servir para o guião. */
function jogarGuiao(base, semente) {
  const rng = criarAleatorio(semente);
  const fila = []; // os dados que o guião escolheu
  const ctx = { base, aleatorio: () => (fila.length ? (fila.shift() - 1) / 6 + 0.01 : rng()), agora: 0 };

  const sala = novaSala({ codigo: 'DEMO', anfitriaoToken: 'token-demo-aprendiz', agora: 0 });
  entrar(sala, { token: 'token-demo-aprendiz', nome: 'Aprendiz' }, ctx);
  entrar(sala, { token: 'token-demo-rival', nome: 'Rival' }, ctx);
  configurar(sala, 't1', { epocas: 3, bots: 2, nivelBots: 'inferior' });
  for (const t of sala.treinadores) marcarPronto(sala, t.id, true);
  certo(comecar(sala, ctx, 't1'));

  const [EU, RIVAL] = ['t1', 't2'].map((t) => Object.values(sala.equipas).find((e) => e.treinador === t).id);
  // As equipas ganham os nomes e as cores da demo, também no que já ficou no registo.
  const nomes = [[sala.equipas[EU], EQUIPAS.eu], [sala.equipas[RIVAL], EQUIPAS.rival], ...Object.values(sala.equipas).filter((e) => e.bot).map((e, i) => [e, EQUIPAS.bots[i]])];
  for (const [e, { nome, kit }] of nomes) {
    for (const l of sala.log) l.texto = l.texto.replaceAll(e.nome, nome);
    Object.assign(e, { nome, kit });
  }
  const treinadorDe = (eq) => sala.equipas[eq].treinador;
  const fazer = (eq, msg) => certo(agir(sala, ctx, treinadorDe(eq), msg));
  const passos = [];
  const mostrar = (titulo, texto, extra = {}) => passos.push({ titulo, texto, ...extra, ...JSON.parse(JSON.stringify({ sala: estadoPublico(sala, ctx), eu: privado(sala, ctx, 't1') })) });
  const exigir = (condicao, motivo) => {
    if (!condicao) throw new Error(motivo);
  };
  const janela = () => sala.janela;

  /** O rival joga a vez dele sem dar nas vistas: anda uma casa e resolve o que lá encontrar. */
  function vezDoRival() {
    const j = janela();
    while (!j.lancou) {
      fila.push(1);
      fazer(RIVAL, { t: 'lancar' });
    }
    const p = j.pendente;
    if (p?.tipo === 'patrocinio') fazer(RIVAL, { t: 'patrocinio', aceitar: false });
    else if (p?.tipo === 'rede') fazer(RIVAL, { t: 'descartar_rede', liga: p.liga });
    else if (p) fazer(RIVAL, { t: 'comprar' });
    fazer(RIVAL, { t: 'terminar_vez' });
  }
  const chegarAMim = () => {
    while (janela().ordem[janela().vez] !== EU) vezDoRival();
  };
  /** Na minha vez, lança estes dados e fica na casa. */
  const lancar = (n) => {
    chegarAMim();
    fila.push(n);
    fazer(EU, { t: 'lancar' });
  };
  const acabarVez = () => {
    if (janela().ultimaCarta && !janela().ultimaCarta.confirmada) fazer(EU, { t: 'confirmar_carta' });
    fazer(EU, { t: 'terminar_vez' });
  };

  // --- Formação e draft ---
  mostrar('Bem-vindo ao Coach Board', ['O Coach Board é um jogo de tabuleiro interativo em que és um treinador e jogas contra os teus amigos, época após época, comprando e vendendo jogadores, para ver quem consegue somar mais títulos.', 'Cada época tem duas janelas de transferências (verão e inverno) e duas voltas de campeonato.', 'Começas com 11 jogadores, um orçamento igual para todos, uma marca de equipamento e dois patrocinadores. Toda a informação da tua equipa está no rodapé.'], { alvo: '#barra-equipa' });
  mostrar('A formação', ['Cada janela de transferências começa com a escolha da formação, que decide que posições precisas de ter.', 'Só a podes voltar a mudar na janela seguinte, por isso pensa bem!']);
  for (const eq of [EU, RIVAL]) fazer(eq, { t: 'formacao', formacao: '4-4-2' });
  while (janela().fase === 'draft') {
    const d = janela().draft;
    const eq = d.escolhas[d.i].equipa;
    if (eq === EU) {
      mostrar('O draft', ['Depois da formação há um draft de jovens jogadores (até 21 anos e, na primeira época, até 68 de overall), semelhante ao da NBA. Escolhes um jovem para a formação do teu clube.', 'Na primeira janela a ordem é aleatória. Nas seguintes, quem vai em último escolhe primeiro e tem direito a uma segunda escolha: um jogador experiente e barato, que só se vende à banca.', 'Os jovens melhoram a cada época, por isso um miúdo barato pode vir a ser um craque. Usa-o como o teu único substituto, para evoluir mais depressa.', 'Um jogador de formação que chegue aos 78 de overall passa a ser um jogador do plantel principal.']);
      fazer(EU, { t: 'draft', jogador: d.opcoes[0] });
    } else fazer(eq, { t: 'draft', jogador: null });
  }

  // --- Tabuleiro: o caminho pelas casas, com os dados escolhidos ---
  chegarAMim();
  mostrar('O tabuleiro', ['À vez, lança-se o dado e anda-se no tabuleiro (uma volta apenas). Quando chegares ao Balneário, a tua volta acabou. No verão lança-se um dado e no inverno dois (exceto no primeiro lançamento).', 'Cada casa do tabuleiro faz uma coisa diferente. Vamos a elas!']);
  lancar(1);
  exigir(janela().pendente?.tipo === 'mercado', 'sem carta de Mercado');
  mostrar('Casa - Mercado', ['Sai um jogador e podes comprá-lo por 80% do valor de mercado. É a forma mais barata de reforçar a equipa. Quanto mais avança a partida, melhores e mais caros vão ficando os jogadores.', 'Podes clicar na carta de um jogador para veres mais dados sobre o jogador. Um jogador pode estar apto a jogar em mais que uma posição.']);
  fazer(EU, { t: 'comprar' });
  fazer(EU, { t: 'terminar_vez' });

  // O rival cai no Mercado e passa: vai a leilão.
  const janelaRival = janela();
  exigir(janelaRival.ordem[janelaRival.vez] === RIVAL, 'o rival devia jogar agora');
  fila.push(1);
  fazer(RIVAL, { t: 'lancar' });
  exigir(janelaRival.pendente?.tipo === 'mercado', 'o rival devia cair no Mercado');
  fazer(RIVAL, { t: 'passar' });
  exigir(janelaRival.leilao, 'sem leilão');
  mostrar('Leilões', ['Se o treinador que calhou no Mercado passar o jogador, este vai a leilão entre os outros treinadores, a começar no valor de mercado. Aqui outro treinador passou e és tu quem pode licitar.']);
  fazer(EU, { t: 'desistir' });
  fazer(RIVAL, { t: 'terminar_vez' });

  lancar(1);
  exigir(janela().pendente?.tipo === 'patrocinio', 'sem carta de patrocínio');
  mostrar('Casa - Patrocinadores', ['Aqui podes ganhar dinheiro com patrocinadores e marcas novas, através de um prémio de assinatura. Aceitas e trocas um dos contratos que já tens, ou recusas.', 'A marca só pode mudar uma vez por época e os patrocinadores um por janela.', 'Quem não muda de contrato recebe um prémio de extensão: o dos patrocínios no fim da janela e o da marca no fim da época.']);
  fazer(EU, { t: 'patrocinio', aceitar: false });
  fazer(EU, { t: 'terminar_vez' });

  lancar(2);
  exigir(janela().pendente?.tipo === 'jovens', 'sem Jovens Talentos');
  mostrar('Casa - Jovens Talentos', ['Esta casa é semelhante ao Mercado, mas sai uma jovem promessa. Os jogadores jovens evoluem mais rapidamente.']);
  fazer(EU, { t: 'comprar' });
  fazer(EU, { t: 'terminar_vez' });

  lancar(1);
  exigir(janela().ultimaCarta?.tipo === 'rede', 'sem Rede');
  mostrar('Casa - Rede de observação', ['Ganhas olheiros numa liga ou num grupo de ligas, que te dão 20% de desconto nesses jogadores, em cima do desconto do Mercado.', 'Só podes ter 2 cartas da Rede de Observação ao mesmo tempo.']);
  acabarVez();

  lancar(2);
  exigir(janela().ultimaCarta?.tipo === 'empresario', 'sem Agente');
  mostrar('Casa - Agente', ['Ganhas uma moeda de Agente para usar quando quiseres. Inflaciona para 2× a cláusula de um jogador teu, anula um Agente usado contra ti, ou compra um jogador pela cláusula, sem leilão.', 'Para o usares num jogador de outro plantel, clica no clube, clica no jogador e podes comprá-lo pela cláusula de rescisão sem ir a leilão. Mas, se esse treinador tiver uma moeda de Agente, pode bloquear o teu e fica sem efeito.']);
  acabarVez();

  // Na minha vez, antes de lançar: uma proposta por um jogador do rival.
  chegarAMim();
  const alvo = sala.equipas[RIVAL].plantel.map((id) => jogador(sala, ctx, id)).sort((a, b) => b.overall - a.overall)[0];
  fazer(EU, { t: 'propor', jogador: alvo.id, valor: alvo.valor });
  exigir(janela().leilao, 'a proposta devia abrir um leilão');
  mostrar('Propostas e cláusulas', ['Na tua vez, além de lançares o dado, podes fazer uma proposta por qualquer jogador de outro treinador, e isso abre um leilão.', 'O dono pode recusar, a não ser que o valor chegue à cláusula, de 1,5× o valor. Aí a venda é obrigatória, apesar de ir a leilão também (exceto quando usas a moeda do Agente).']);
  while (janela().leilao) {
    const l = janela().leilao;
    if (l.fase === 'decisao') fazer(l.vendedor, { t: 'decidir', aceitar: false });
    else fazer(l.participantes.find((x) => x !== l.lider && !l.desistiram.includes(x)), { t: 'desistir' });
  }

  lancar(2);
  const misterio = janela().ultimaCarta;
  exigir(misterio?.tipo === 'misterio' && misterio.bom && janela().posicao[EU] === 9 && janela().lancou && !janela().pendente, 'carta Mistério que não serve');
  mostrar('Casa - Mistério', ['Tiras uma carta que tanto pode ser boa como má: dinheiro, descontos, multas, perder a vez de jogar...', 'Cuidado, porque a sorte a mais fica registada e pode virar-se contra ti!']);
  acabarVez();

  lancar(1);
  exigir(janela().ultimaCarta?.tipo === 'medico', 'sem Departamento médico');
  mostrar('Casa - Departamento médico', ['Ganhas uma moeda que trata uma lesão durante um jogo. O jogador recupera e continua em campo.', 'Guarda-a: vais ver para que serve daqui a pouco.']);
  acabarVez();

  lancar(3);
  exigir(janela().ultimaCarta?.tipo === 'investigacao' && janela().ultimaCarta.bom && janela().posicao[EU] === 13, 'a Investigação não devia condenar');
  mostrar('Casa - Investigação', ['As autoridades olham para as contas do teu clube e abrem uma investigação.', 'Quanto mais títulos e ajudas tiveres (como cartas Mistério boas e Agentes usados), maior é o risco de levares uma multa ou uma sanção da liga, por isso põe-te fino!']);
  acabarVez();

  lancar(5);
  exigir(janela().posicao[EU] === 18, 'devia estar na SAD');
  mostrar('Casa - Reunião com a SAD', ['Se parares nesta casa, a SAD do teu clube injeta uma boa quantia de capital. Se só passares, dá-te metade. Na janela de inverno, estes valores são metade.', 'O montante aumenta à medida que as épocas vão passando.'], { alvo: '.barra-orcamento' });
  acabarVez();

  // Saldo negativo: o mesmo momento, com o clube a dever dinheiro.
  chegarAMim();
  const saldo = sala.equipas[EU].dinheiro;
  sala.equipas[EU].dinheiro = -12;
  mostrar('Saldo negativo', ['Podes gastar mais do que tens até um certo limite, mas tens de acabar a janela de transferências sem dívidas.', 'Em dívida tens de vender jogadores (à tua escolha) até liquidares o montante, mas não vendes à banca: o jogador vai a leilão, a começar em 80% do valor de mercado. Só vai para a banca se ninguém o quiser.', 'Tem atenção ao teu saldo, senão os outros treinadores é que vão aos saldos!'], { alvo: '.barra-orcamento' });
  sala.equipas[EU].dinheiro = saldo;

  // O resto da volta anda depressa: todos chegam ao Balneário.
  const faltaAndar = () => janela().ordem.find((id) => janela().andadas[id] < CONFIG.tabuleiro.casas.length);
  while (faltaAndar()) {
    const eq = janela().ordem[janela().vez];
    janela().andadas[eq] = Math.max(janela().andadas[eq], ULTIMA_CASA);
    janela().posicao[eq] = janela().andadas[eq] % CONFIG.tabuleiro.casas.length;
    fila.push(1);
    fazer(eq, { t: 'lancar' });
    fazer(eq, { t: 'terminar_vez' });
  }
  for (const eq of janela().ordem) fazer(eq, { t: 'pronto_fechar' });
  exigir(janela().fase === 'fecho', 'a janela devia estar a fechar');
  mostrar('O fecho da janela', ['Durante a janela o plantel não tem limite, mas no fecho só ficam os 11 titulares e um 12.º da formação. O resto é vendido à banca, a 40% do valor.', 'Os lugares vazios recebem um jogador emprestado, de overall baixo, até à janela seguinte.', 'Se um jogador é colocado numa posição errada perde 5 de overall, se for dentro da sua região, ou 10 de overall se for fora.'], { abrir: 'plantel' });
  for (const eq of [EU, RIVAL]) fazer(eq, { t: 'fechar', ...sugestaoFecho(sala, ctx, eq) });

  // --- O jogo ---
  exigir(sala.fase === 'campeonato', 'devia começar o campeonato');
  mostrar('Vamos a jogo - A tática', ['Agora começa o campeonato! Antes de cada jogo escolhes uma tática em segredo.', 'Cada uma vence outra, como no pedra-papel-tesoura: Contra-ataque vence Ataque Total, que vence Autocarro. Ganhar o duelo dá +1 em todos os lances.']);
  for (const eq of [EU, RIVAL]) if (sala.campeonato.taticas[eq] === undefined) fazer(eq, { t: 'tatica', tatica: CICLO_TATICAS[0] });
  const meuJogo = () => sala.campeonato.jogos.find((x) => x.lados.some((l) => l.equipa === EU));
  const jogoMeu = meuJogo();
  exigir(jogoMeu, 'sem jogo nesta jornada');
  mostrar('Os lances', ['Um jogo tem 9 rondas (uma por cada 10 minutos de jogo) e os lances são à vez: lança a casa, depois o visitante.', 'Dois dados, mais a força da equipa, a tática e a química. Quanto maior o total, melhor a oportunidade de golo.']);

  let lesaoMostrada = false;
  let eventoMostrado = false;
  const decidirLesoes = (jogo) => {
    for (const lado of jogo.lados.filter(lesaoPorDecidir)) {
      const les = lado.lesionados.find((l) => l.pendente);
      if (lado.equipa === EU) {
        lesaoMostrada = true;
        mostrar('Lesões', ['Uma lesão pára o jogo até decidires: usas a moeda do Departamento Médico, fazes entrar o suplente, ou deixas o jogador em campo com −10 de overall.', 'Sem a moeda, ele falha os jogos todos até à janela seguinte. A partir da jornada seguinte é-te emprestado um jogador para jogar no lugar dele, que podes comprar na abertura da próxima janela.']);
        fazer(EU, { t: 'usar_medico', jogador: les.jogador });
      } else fazer(lado.equipa, { t: 'lesao_ficar', jogador: les.jogador });
    }
  };
  const jogarAteAcabar = (jogo) => {
    let limite = 200;
    while (!jogo.acabou && limite-- > 0) {
      decidirLesoes(jogo);
      const eq = jogo.lados[jogo.vezLance].equipa;
      fazer(eq, { t: 'lancar_ronda' });
      const naoLesao = jogo.eventos.some((ev) => ['leve', 'vermelho'].includes(ev.tipo));
      if (jogo === jogoMeu && !eventoMostrado && !lesaoMostrada && naoLesao && !jogo.acabou && !jogo.lados.some(lesaoPorDecidir)) {
        eventoMostrado = true;
        mostrar('Acontecimentos', ["Se te calharem dois dados iguais acontece algo: cartões, penáltis, livres, lesões...","Lembra-te que em cada jogo só tens uma substituição, para o jovem da formação entrar, e os minutos fazem-no evoluir."]);
      }
    }
  };
  jogarAteAcabar(jogoMeu);
  exigir(lesaoMostrada, 'esta partida não teve lesão');
  exigir(eventoMostrado, 'esta partida não teve acontecimentos antes da lesão');
  for (const jogo of sala.campeonato.jogos) if (!jogo.acabou) jogarAteAcabar(jogo);
  exigir(sala.campeonato.fase === 'resultados', 'a jornada devia ter acabado');
  mostrar('Classificação', ['No fim de cada jornada recebes os direitos televisivos (iguais para todos) e pagam-se os salários, 5% do valor do plantel por época.', 'A classificação total mostra os pontos de todas as épocas e o número de campeonatos e taças ganhos.'], { abrir: 'classificacoes' });

  // --- Até ao inverno e ao fim da época, sozinho ---
  let limite = 200000;
  const avancarAte = (condicao) => {
    while (!condicao() && limite-- > 0) passo(sala, ctx);
    exigir(condicao(), 'a partida não chegou ao momento pedido');
  };
  avancarAte(() => sala.fase === 'janela' && janela().tipo === 'inverno' && janela().fase === 'tabuleiro');
  mostrar('A janela de inverno', ['A meio da época há outra janela de transferências, com dois dados, logo mais rápida. A seguir joga-se a segunda volta do campeonato.', 'Nas últimas épocas do jogo há ainda uma Taça a eliminar, que vale meio campeonato.']);
  avancarAte(() => sala.fase === 'fimEpoca');
  exigir(sala.palmares.at(-1)?.campeao === EU, 'o guião quer-te campeão');
  exigir(sala.fimEpoca.mudancas.some((m) => m.equipa === EU && m.depois > m.antes), 'o guião quer mostrar a evolução do plantel');
  mostrar('Campeão!', ["No fim da época vês quem foi o campeão, os melhores marcadores e assistências, os melhores e piores momentos e a equipa da época.","Em \"Continuar\" vês a evolução do teu plantel para a próxima época, e começa tudo outra vez, agora com jogadores melhores e mais caros.","Agora é a tua vez! Cria uma sala, partilha o link e joga contra os teus amigos. Sê campeão com o teu clube no Coach Board.","Ah, e não te esqueças de clicar em \"TERMINAR A VEZ\" quando acabares de jogar, se faz favor!"]);
  return passos;
}

function certo(r) {
  if (r?.erro) throw new Error(r.erro);
  return r;
}

/** Procura uma semente em que a partida passa por tudo o que o guião quer mostrar. */
export function gerarPassos(base) {
  let ultimoErro;
  const motivos = {};
  for (let semente = 1; semente <= 3000; semente++) {
    try {
      return { semente, passos: jogarGuiao(base, semente) };
    } catch (e) {
      ultimoErro = e;
      motivos[e.message] = (motivos[e.message] ?? 0) + 1;
    }
  }
  throw new Error(`Nenhuma semente serviu para a demo: ${JSON.stringify(motivos)}`);
}
