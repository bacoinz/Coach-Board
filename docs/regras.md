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
- **Jovem promessa**: até 21 anos (desde o mais novo da base, 16), overall 60–68.
- **Último classificado**: 2 escolhas, uma jovem promessa e uma **escolha extra**, em que cada uma das 3 opções é:
  - um veterano com **mais de 33 anos e overall 80–85**; ou
  - um jogador com **21–23 anos e overall 78–82**.

  O jogador da escolha extra entra no onze ou é vendido, e só à banca.
- **Restantes**: 1 jovem promessa.

### 3.3 Formação (jovens)
- Os jovens do draft são a formação do clube. Recebem um **potencial escondido entre 85 e 95**.
- Os jovens da formação **podem ser titulares**: é a jogar que crescem.
- O plantel pode ter **um 12.º jogador**, fora do onze, desde que seja da formação.
- No fim de cada época crescem entre **+2** (quase não jogou) e **+8** (jogou quase tudo), proporcionalmente aos
  minutos e sem passar o potencial. O valor de mercado acompanha.
- Com **mais de 21 anos e mais de 78 de overall**, o jovem passa para o plantel principal.

### 3.4 Tabuleiro de mercado (40 casas)

| Casas | |
|---|---|
| 0–9 | **Início** · Mercado · Patrocínio · Mercado · Rede · **Mistério** · Patrocínio · Mercado · Empresário · Mercado |
| 10–19 | **Jovens Talentos** · Médico · Mercado · Rede · Mercado · **Mistério** · Empresário · Patrocínio · Mercado · Empresário |
| 20–29 | **Investigação** · Patrocínio · Mercado · Empresário · Mercado · **Mistério** · Rede · Médico · Mercado · Empresário |
| 30–39 | **Jovens Talentos** · Rede · Mercado · Médico · Mercado · **Mistério** · Patrocínio · Empresário · Mercado · Rede |

Totais: Mercado 13, Empresário 6, Rede 5, Patrocínio 5, Mistério 4, Médico 3, Jovens Talentos 2, Investigação 1,
Início 1.

**Início:** a meio das voltas do verão, ao passar pelo Início, há uma **injeção de capital da SAD**. Acaba por só
acontecer uma vez por época: no fim da última volta e no inverno não há. Vale 3 M€ na época 1 e **duplica a cada
época** (3, 6, 12, 24, 48…).

**Uma vez** **[A]** (pela ordem do draft):
1. propostas, se quiseres (ver 3.5);
2. lançar **um dado** e andar (nos jogos é que são dois);
3. resolver a casa;
4. mais propostas, se quiseres;
5. **Terminar vez**.

**[A]** Quem já completou as voltas continua na rotação, sem dados: só pode fazer propostas e usar o Empresário.

**As casas:**
- **Mercado**: sai uma carta de jogador do baralho (jogadores reais sem equipa, ver 3.4.1). Quem cai na casa compra a
  **80% do valor** ou passa. Se passar, já não pode licitar: há **leilão** entre os outros, a partir do **valor de
  mercado**. Cada um licita ou passa e, se todos passarem, a carta é **descartada** (**[A]** não volta a sair até à
  próxima janela). A Rede soma-se aos 80%: 64% do valor.
- **Rede de observação**: carta de uma liga que dá **20% de desconto** nos jogadores dessa liga que saiam no Mercado.
  Máximo **2 por treinador**: ao calhar a terceira, descarta-se uma.
- **Jovens Talentos**: um jogador com **overall 78–82 e até 23 anos**. Compra-se a 80% do valor ou vai a leilão, como
  no Mercado **[A]**. Com até 21 anos entra na formação (com potencial escondido); senão, no plantel
  principal.
- **Empresário**: carta guardada na mão, com três usos:
  - inflacionar a cláusula de um jogador teu para **2× o valor de mercado** (uma vez por jogador);
  - **anular** um Empresário usado contra ti;
  - **exclusividade**: a cláusula de um jogador de outra equipa desce para **1× o valor de mercado** e compras sem
    leilão.
- **Departamento médico**: carta guardada na mão para curar uma lesão.
- **Patrocínio**: sai uma carta de marca ou patrocinador (ver secção 5). Aceitas ou recusas.
- **Mistério**: tiras uma carta, com efeito imediato (ver 3.4.2).
- **Investigação**: o clube é investigado e pode ser sancionado (ver 3.4.3).

#### 3.4.2 Cartas Mistério
40 cartas, **20 boas e 20 más**, num baralho que se volta a baralhar quando acaba. Texto, valores e efeitos em
`CONFIG.misterio`.

| Boas | Efeito |
|---|---|
| Camisolas virais · Herança de um sócio · Prémio de fair-play · Digressão pela Ásia · Patrocínio surpresa | +3 · +5 · +2 · +4 · +3 M€ |
| Clube comprado · Nome no estádio · Mecenas anónimo | +15 · +8 · +5 M€, só na próxima janela |
| Super-empréstimo | um craque (86 ou mais) joga por ti no próximo jogo |
| Estágio na montanha | +1 no modificador do próximo jogo |
| Agente amigo · Clínica nova | uma carta de Empresário · do Departamento médico |
| Olheiro genial | uma Rede de observação (+2 M€ se já tiveres 2) |
| Amigo do presidente | 30% de desconto na próxima compra no Mercado |
| Livre de luxo | um jogador de overall 72–77, a custo zero |
| A academia explode | +3 de overall ao melhor jovem da formação (+2 M€ se não houver) |
| Adjunto génio | +1 de overall a um jogador ao acaso |
| Voo fretado | lanças os dados outra vez |
| Telefonema importante | avanças até ao próximo Mercado |
| Cláusula blindada | a cláusula do teu melhor jogador passa a 2× (+2 M€ se já estiverem todas) |

| Más | Efeito |
|---|---|
| Multa da federação · Obras no estádio · Erro do contabilista · Salários em atraso · Balneário destruído · Patrocinador furioso | −4 · −3 · −5 · −2 · −2 · −3 M€ |
| Penhora das Finanças · Dívida antiga | −8 · −5 M€, só na próxima janela |
| Inspeção fiscal · Diretor em fuga | perdes 10% · 15% do orçamento |
| Lesão no treino · Castigo interno | um jogador ao acaso falha o próximo jogo, com uma razão sorteada |
| Balneário dividido | −1 no modificador do próximo jogo |
| Noite de copos | −1 de overall a um jogador ao acaso |
| Olheiro roubado · Empresário zangado · Médico despedido | perdes essa carta (−2 · −2 · −1 M€ se não a tiveres) |
| Papelada em atraso | perdes a próxima vez no tabuleiro |
| O craque quer sair | a cláusula do teu melhor jogador fica em 1× até à próxima janela |
| Farto disto tudo | um jogador ao acaso, fora dos 3 melhores, vai embora ao preço base |

A Digressão pela Ásia só sai assim no verão: no inverno a mesma carta é **Amigáveis nos EUA**.

As razões dos castigos e das lesões, e as comidas da caganeira, estão em `CONFIG.misterio`. As mais adultas nunca saem a
jogadores com menos de 18 anos, porque a base tem jogadores reais de 16 e 17 anos.

**[A]** Uma carta má nunca deixa o orçamento negativo: tira só o que houver. Os efeitos no próximo jogo ficam guardados
e só têm efeito quando os jogos existirem (passo 4).

#### 3.4.3 Investigação
Castiga quem teve sorte a mais. A probabilidade de condenação é:

**3% + 5% por campeonato ganho + 12% por cada ponto de ajuda**, até 85%.

- Cada carta Mistério boa dá 1 ponto de ajuda. As que dão dinheiro na próxima janela dão mais: Clube comprado 3, Nome no
  estádio e Mecenas anónimo 2.
- Cada carta de **Empresário usada** dá 1 ponto (inflacionar, exclusividade ou anular).
- Aceitar uma marca ou patrocinador **da lista "iniciais" que já se tornou grande** dá 1 ponto (entra com os patrocínios,
  no passo 5).
- **[A]** A injeção da SAD não conta, porque todos a recebem.
- Quem não teve ajudas nem títulos tem só 3%.

Se for condenado, a sanção é sorteada: **limite de contratações** (40%), **multa** (40%) ou **as duas** (20%).
- **Limite:** **[A]** só pode fazer mais 2 contratações nesta janela (compras, leilões, propostas, Empresário e trocas
  contam, e fica de fora dos leilões quando chega a 0).
- **Multa:** 20% do orçamento atual, no mínimo 2 M€.
- **[A]** Depois de condenado, as ajudas voltam a zero: já pagou.

#### 3.4.1 Baralho do Mercado: as fases
O nível dos jogadores que saem no Mercado sobe ao longo da partida. Cada época tem uma **fase** (a mesma tabela de
fases dos patrocínios), e cada fase tem uma **faixa principal** de overall. Cada carta sai:
- **60%** da faixa principal;
- **30%** de baixo (de 70 até à faixa);
- **10%** de cima (da faixa até ao melhor da base).

Por isso continua a ser possível calhar um jogador melhor ou pior do que a faixa.

| Fase | Faixa principal | Jogadores na base |
|---|---|---:|
| 1 | 78–81 | 623 |
| 2 | 80–83 | 373 |
| 3 | 82–84 | 177 |
| 4 | 83–86 | 150 |
| 5 | 85–87 | 67 |
| 6 | 86–89 | 54 |
| 7 | 88 ou mais | 29 |

| Partida | Fase de cada época | Faixa principal por época |
|---|---|---|
| 3 épocas | 1 · 4 · 7 | 78–81 · 83–86 · 88+ |
| 5 épocas | 1 · 3 · 4 · 6 · 7 | 78–81 · 82–84 · 83–86 · 86–89 · 88+ |
| 8 épocas | 1 · 2 · 3 · 4 · 4 · 5 · 6 · 7 | 78–81 · 80–83 · 82–84 · 83–86 · 83–86 · 85–87 · 86–89 · 88+ |
| 10 épocas | 1 · 2 · 2 · 3 · 4 · 4 · 5 · 6 · 6 · 7 | 78–81 · 80–83 · 80–83 · 82–84 · 83–86 · 83–86 · 85–87 · 86–89 · 86–89 · 88+ |

A subida é mais lenta do que "+4 por época" porque o topo da base é pequeno: só há 65 jogadores com 86 ou mais e 29
com 88 ou mais. Se a faixa sorteada estiver vazia (todos com equipa), a carta sai da faixa mais próxima. Faixas,
percentagens e fases estão em `CONFIG.mercado`.

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
- Durante a janela o plantel não tem limite. No fecho, só podes ficar com o **onze**, que tem de encaixar na formação
  escolhida, e **um 12.º fora do onze, se for da formação**. O jogo sugere o melhor onze; podes mudá-lo.
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
