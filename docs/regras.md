# The Gaffer — regras

Referência das regras do jogo, por ordem cronológica. Os números (dinheiro, preços, probabilidades, bónus) estão
todos em `jogo/src/config.js`; aqui aparecem só os que fazem parte da regra. As decisões que não vinham na
especificação original estão marcadas com **[A]** (assumido) e podem mudar.

## 1. Sala
- O anfitrião cria a sala (código de 4 letras, sem I nem O; link `/sala/ABCD`) e escolhe:
  - a duração: **3, 5, 8 ou 10 épocas**;
  - as **equipas bot** (opcional): quantas e se são de overall **inferior** ou **equivalente** ao dos treinadores.
- **[A]** 2 a 8 treinadores e no máximo 10 equipas no total (contando os bots).
- Cada treinador cria a equipa: **nome, cores** (principal e secundária), **equipamento** (liso, riscas verticais,
  riscas horizontais, faixa, metades) e **emblema** (imagem redimensionada para 256 px).
- Cada equipa recebe:
  - o **mesmo orçamento**;
  - **11 jogadores** com overall entre 70 e 78 e média 75. **[A]** São 1 GR, 4 defesas, 4 médios e 2 avançados;
  - **1 marca e 2 patrocinadores** da lista "iniciais", sem repetir entre equipas, com o prémio de assinatura básico.
- Todos os plantéis são públicos, sempre.
- Quem entra com a partida a decorrer fica a ver até ao início da janela seguinte. **[A]** Nessa altura cria equipa
  com o orçamento e o plantel iniciais. Se a janela for a de inverno, substitui um bot (se houver); senão espera pela
  de verão.

## 2. Uma época
1. **Janela de verão**: formação → draft → **duas voltas** ao tabuleiro → fecho.
2. **Primeira volta do campeonato.**
3. **Janela de inverno**: formação → draft → **uma volta** ao tabuleiro → fecho.
4. **Segunda volta do campeonato.**
5. **Fim de época.**

## 3. Janela de transferências

### 3.1 Formação tática
- Todos escolhem ao mesmo tempo, no início da janela: 4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 3-4-3 ou 5-3-2.
- Só se muda na janela seguinte.
- Um jogador pode jogar na posição principal ou nas alternativas do EAFC. Nas alternativas tem uma pequena
  penalização de overall.

### 3.2 Draft
- Antes do tabuleiro, uma escolha de cada vez, pela **classificação invertida**. Na 1.ª época a ordem é aleatória e
  cada um tem uma escolha.
- Em cada escolha aparecem **3 jogadores**. Fica-se com um e paga-se um preço abaixo do valor de mercado.
- **Último classificado**: 2 escolhas, uma jovem promessa (18–21 anos) e um jogador até 82 de overall e até 25 anos.
  Esse jogador entra no onze ou é vendido, e só à banca.
- **Restantes**: 1 jovem promessa (18–21 anos).

### 3.3 Formação (jovens)
- Os jovens do draft são a formação do clube. Entram com overall 60–68 e um **potencial escondido entre 85 e 95**.
- O plantel pode ter **um 12.º jogador**, desde que seja da formação.
- No fim de cada época crescem entre **+2** (quase não jogou) e **+8** (jogou quase tudo), proporcionalmente aos
  minutos e sem passar o potencial. O valor de mercado acompanha.
- Com **mais de 21 anos e mais de 78 de overall**, o jovem passa para o plantel principal e o lugar da formação fica
  livre.
- **[A]** Um jovem que chegue com o lugar da formação ocupado conta como jogador normal no fecho da janela.

### 3.4 Tabuleiro de mercado (40 casas)

| Casas | |
|---|---|
| 0–9 | **Início** · Mercado · Rede · Mercado · Empresário · Patrocínio · Mercado · Médico · Mercado · Mercado |
| 10–19 | **Jovens Talentos** · Mercado · Rede · Empresário · Mercado · Patrocínio · Mercado · Empresário · Mercado · Médico |
| 20–29 | **Patrocínio** · Mercado · Empresário · Rede · Mercado · Mercado · Mercado · Patrocínio · Empresário · Mercado |
| 30–39 | **Jovens Talentos** · Rede · Médico · Mercado · Patrocínio · Mercado · Mercado · Empresário · Rede · Jovens Talentos |

Totais: Mercado 17, Empresário 6, Rede 5, Patrocínio 5, Médico 3, Jovens Talentos 3, Início 1.

**Uma vez** **[A]** (pela ordem do draft):
1. propostas, se quiseres (ver 3.5);
2. lançar dois dados e andar;
3. resolver a casa;
4. mais propostas, se quiseres;
5. **Terminar vez**.

**[A]** Quem já completou as voltas continua na rotação, sem dados: só pode fazer propostas e usar o Empresário.

**As casas:**
- **Mercado**: sai uma carta de jogador do baralho. Compras pelo valor de mercado ou passas. Se passares, há
  **leilão** entre todos. **[A]** O baralho só tem jogadores reais sem equipa, com overall entre 70 e 88 (a
  configuração alarga este intervalo com o avançar das épocas).
- **Rede de observação**: carta de uma liga que dá **20% de desconto** nos jogadores dessa liga que saiam no Mercado.
  Máximo **2 por treinador**: ao calhar a terceira, descarta-se uma.
- **Jovens Talentos**: um jogador com **80 de overall e menos de 23 anos**. Com mais de 21 entra no plantel
  principal; senão conta como formação.
- **Empresário**: carta guardada na mão, com três usos:
  - inflacionar a cláusula de um jogador teu para **2× o valor de mercado** (uma vez por jogador);
  - **anular** um Empresário usado contra ti;
  - **exclusividade**: a cláusula de um jogador de outra equipa desce para **1× o valor de mercado** e compras sem
    leilão.
- **Departamento médico**: carta guardada na mão para curar uma lesão.
- **Patrocínio**: sai uma carta de marca ou patrocinador (ver secção 5). Aceitas ou recusas.

### 3.5 Propostas e leilões
- **Na tua vez** podes fazer uma proposta por **qualquer jogador de outra equipa**, exceto um que tenha sido comprado
  na mesma ronda (uma ronda = uma vez de cada treinador).
- **Toda a proposta abre um leilão público**, que começa no valor proposto. Os outros treinadores podem licitar. O
  leilão fecha quando todos menos o maior licitador desistem. Sem relógio: o anfitrião pode forçar o fecho.
- **Abaixo da cláusula**: no fim, **decide o dono**. Aceita a melhor oferta ou recusa, e o jogador fica.
- **Igual ou acima da cláusula** ("bater a cláusula"): há leilão na mesma, mas **o dono não pode impedir a venda**.
  Recebe o valor final.
- Com o **Empresário** (exclusividade), não há leilão. O dono pode anular com outro Empresário.
- A qualquer altura da janela:
  - **vender à banca**, sempre ao **preço base** (baixo);
  - **trocas diretas** acordadas entre os dois treinadores, sem leilão.
- **[A]** Enquanto decorre um leilão, o tabuleiro fica parado.

### 3.6 Fecho da janela
- A janela fecha quando todos completaram as voltas e confirmaram **Fechar janela** (ou quando o anfitrião força).
- Durante a janela o plantel não tem limite. No fecho, só podes ficar com **11 (+1 da formação)** e o onze tem de
  encaixar na formação escolhida.
- **Posições a mais**: escolhes quem sai, e esse jogador é vendido à banca ao preço base.
- **Posição em falta**: recebes um jogador emprestado de overall baixo até à próxima janela.
- Quem não mudou de patrocínio nesta janela recebe o **prémio de extensão**.

## 4. Campeonato
- Todos contra todos, a duas voltas (treinadores e bots). **[A]** Com número ímpar de equipas, há uma folga por
  jornada.
- Vitória 3, empate 1, derrota 0. Desempate pela diferença de golos.
- **Dinheiro de TV igual para todos**, pago a cada jornada. Os **salários** são cobrados a cada jornada.
- Não há prémios de classificação.
- Os jogos de uma jornada decorrem **todos ao mesmo tempo**. **[A]** Cada período dura ~4 s no ecrã.
- **[A]** A jornada seguinte começa quando todos carregam em **Continuar** (ou quando o anfitrião força).

### 4.1 Carta de tática
Antes de cada jogo, cada treinador vê o plantel do adversário e escolhe a carta de tática às escondidas. **[A]** Sem
relógio: o anfitrião pode forçar, e quem estiver ausente recebe uma tática ao acaso.

| Tática | Vence | Perde com | Neutra com |
|---|---|---|---|
| Contra-ataque | Ataque Total | Pressão Alta | Autocarro, Posse de Bola |
| Ataque Total | Autocarro | Contra-ataque | Posse de Bola, Pressão Alta |
| Autocarro | Posse de Bola | Ataque Total | Contra-ataque, Pressão Alta |
| Posse de Bola | Pressão Alta | Autocarro | Contra-ataque, Ataque Total |
| Pressão Alta | Contra-ataque | Posse de Bola | Ataque Total, Autocarro |

A mesma tática dos dois lados é neutra.

### 4.2 Modificador
- **Defesa** = média do GR e dos defesas. **Ataque** = média dos médios e dos avançados.
- **Força**: o teu Ataque menos a Defesa do adversário, ±1 por cada 3 pontos, entre −2 e +2.
- **Tática**: +2 se a tua carta vence a do adversário.
- **Química**: pequeno bónus por grupos de jogadores da mesma nacionalidade.
- **Vermelho**: −1 até ao fim do jogo.

### 4.3 Desenrolar
- **9 períodos de 10 minutos**. Em cada período, cada equipa lança dois dados (18 lançamentos por jogo).
- Total = dados + modificador:

| Total | Resultado |
|---|---|
| 2–5 | Nada |
| 6–7 | Oportunidade baixa: golo com 6 num dado extra |
| 8–9 | Oportunidade média: golo com 5 ou 6 |
| 10–12 | Oportunidade alta: golo com 4, 5 ou 6 |
| 13+ | Golo certo |

- **Dados iguais**: além do lance normal, tira-se uma carta de acontecimento.
  - 2/3 são **leves**: amarelo, bola ao poste, grande defesa, fora de jogo, canto.
  - 1/3 são **fortes**:
    - **vermelho** para o adversário: −1 no modificador dele até ao fim;
    - **lesão** no adversário (ver 4.4);
    - **penálti** a favor: um dado, golo com 3–6;
    - **bola parada perigosa**: um dado, golo com 4–6.
- **Substituição**: uma por jogo, para o jovem da formação entrar em qualquer período. Se houver mais de um jogador
  dessa posição em campo, o treinador escolhe quem sai. Os minutos contam até à saída.
- **Marcador**: sorteado com peso pela finalização e pela posição. **Assistente**: com peso pelo passe.
- Os dados lançados são visíveis para todos.
- Objetivo de equilíbrio: duas equipas equivalentes marcam ~2 golos cada (3-2, 2-2, 4-1 são normais; 5 ou mais é
  raro). Com modificador 0, a conta dá ~1,96 golos por equipa nos lances normais e ~0,15 nas cartas fortes.

### 4.4 Lesões
- **Com carta do Departamento médico**: usa-se e o jogador recupera. **[A]** É usada automaticamente (há uma opção
  para desligar), para o jogo não parar.
- **Sem carta**: o jogador fica lesionado até à próxima janela, e tira-se do baralho do Mercado um jogador da mesma
  posição, **emprestado**.
  - Esse jogador tem **15%** de hipótese de ter overall igual ou superior ao do lesionado.
  - **[A]** Entra logo nesse jogo.
  - Pode ser comprado na abertura da janela seguinte, ao valor de mercado. Se não for comprado, volta ao baralho.

## 5. Marcas e patrocínios
- Cada equipa tem **1 marca e 2 patrocínios**, e nunca dois patrocínios de valor alto ao mesmo tempo.
- **Exclusivos**: cada marca e cada patrocinador só está numa equipa de cada vez.
- Pagam **só ao assinar** (prémio de assinatura por categoria).
- A marca muda no máximo **uma vez por época**. Os patrocínios mudam no máximo **uma vez por janela**.
- Quem não muda recebe um **prémio de extensão**: o da marca no fim da época, o dos patrocínios no fim de cada janela.
- Os logótipos aparecem no equipamento (em `assets/marcas/` e `assets/patrocinios/`). Enquanto não houver PNG,
  aparece o nome em texto.

### 5.1 Probabilidades na casa Patrocínio

| Fase | Iniciais investidas | Baixas | Médias | Grandes |
|---|---|---|---|---|
| 1 | — | 100% | — | — |
| 2 | — | 50% | 50% | — |
| 3 | — | 25% | 75% | — |
| 4 | — | 10% | 50% | 40% |
| 5 | 10% | — | 40% | 50% |
| 6 | 20% | — | 20% | 60% |
| 7 | 30% | — | — | 70% |

| Partida | Fase de cada época |
|---|---|
| 3 épocas | 1 · 4 · 7 |
| 5 épocas | 1 · 3 · 4 · 6 · 7 |
| 8 épocas | 1 · 2 · 3 · 4 · 4 · 5 · 6 · 7 |
| 10 épocas | 1 · 2 · 2 · 3 · 4 · 4 · 5 · 6 · 6 · 7 |

**Iniciais investidas**: as marcas e os patrocinadores da lista "iniciais" regressam como se tivessem recebido um
grande investimento, e pagam **igual ou mais** do que os grandes.

### 5.2 Lista
- **Marcas**
  - grandes: Naik, Abadidas, Pumba, Old Balance;
  - médias: Ombru, Lappa, Castrole, Marcon, Hammer;
  - baixas: Lergea, Rikelme, Erreia, Toma, Kotto, Upper Armor;
  - iniciais: Larcatoni, CTD, Diadura, Girvova, Partick.
- **Patrocínios**
  - altos: Scotify, Fly Emigreats, Tecatar Airways, Naointendo, CEGA, SONIA, BID;
  - médios: Betrano, Betcrica, Solgreen, LeBollo, TimViewer, Jipe, Repsun;
  - baixos: Super Cock, Cerveja Conal, Estrella Dapicia, GIDI, MEU, NOZ, Palcard, Vodafode;
  - iniciais: JF Canha, SPARVO, Jardins Paulo Meira, CarCanhola, Restaurante "Peixaxa", Marisqueira "Mexilhão
    D'Molho", Construções Lomba, Café Central de Torres Novas, Colchões Camarrata, Bar de Alterne "O Pau", Mastur Bar,
    Bar Dalloca, REMIX, GandaPreço, Águas d'Mijo, Convento de Freire, Ping Doce, Arquipélago.

## 6. Janela de inverno
Abre com três coisas:
- os lesionados recuperam;
- os emprestados por lesão podem ser comprados;
- quem estava a ver entra.

O resto decorre como no verão (formação, draft pela classificação atual invertida, tabuleiro e fecho), mas com
**uma volta** ao tabuleiro.

## 7. Fim de época
- **Campeão** da época.
- **Prémios** (sem dinheiro):
  - homem do jogo em cada jogo (nota com golos, assistências e resultado);
  - tabelas de marcadores e de assistências;
  - equipa da época (com jogadores de várias equipas);
  - jogador do ano.
- **Idade**: todos fazem +1 ano. O overall estagna a partir dos 32 e desce a partir dos 35.
- Crescimento e promoção dos jovens (3.3).
- **Prémio de extensão** para quem não mudou de marca.

## 8. Fim da partida
Ao fim das épocas escolhidas, ganha quem tiver **mais campeonatos**. O desempate é pelo **total de pontos de todas as
épocas**. No fim mostra-se o palmarés.

## 9. Dados dos jogadores
- Base do EAFC (derivada do SoFIFA): nome, idade, nacionalidade, liga, posição principal e alternativas, overall,
  potencial, finalização e passe.
- **Valor de mercado**: fórmula a partir do overall e da idade.
- **Cláusula de rescisão** = 1,5× o valor de mercado.
- **Salário**: proporcional ao valor de mercado, não negociável, cobrado a cada jornada. No total da época dá ~5% do
  valor do plantel.
- **Preço base** (venda à banca): baixo, uma fração do valor de mercado.
