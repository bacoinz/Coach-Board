# The Gaffer — regras

Referência das regras do jogo, por ordem cronológica. Os números (dinheiro, preços, probabilidades, bónus) estão
todos em `jogo/src/config.js`; aqui aparecem só os que fazem parte da regra. As decisões que não vinham na
especificação original estão marcadas com **[A]** (assumido) e podem mudar.

## 1. Sala
- O anfitrião cria a sala (código de 4 letras, sem I nem O; link `/sala/ABCD`) e escolhe:
  - a duração: **3, 5, 8 ou 10 épocas**;
  - as **equipas bot** (opcional): quantas e se são de overall **inferior** ou **equivalente** ao dos treinadores.
- **[A]** 2 a 8 treinadores e no máximo 10 equipas no total (contando os bots).
- Na opção **sem bots**, se os treinadores forem ímpares entra **um bot**, para todos jogarem em todas as jornadas.
- Cada treinador cria a equipa: **nome, cores** (principal e secundária), **equipamento** (liso, riscas verticais,
  riscas horizontais, faixa, metades, mangas de outra cor) e **emblema** (criado no jogo ou uma imagem, sozinha ou
  dentro de um escudo, sempre com 256 px).
- Cada equipa recebe:
  - o **mesmo orçamento**;
  - **11 jogadores** com overall entre 70 e 78 e média 75. **[A]** São 1 GR, 4 defesas, 4 médios e 2 avançados;
  - **1 marca e 2 patrocinadores** da lista "iniciais", sem repetir entre equipas, com o prémio de assinatura básico.
- Todos os plantéis são públicos, sempre.
- Quem entra com a partida a decorrer fica a ver até ao início da janela seguinte. **[A]** Nessa altura cria equipa
  com o orçamento e o plantel iniciais. Se a janela for a de inverno, substitui um bot (se houver); senão espera pela
  de verão.

## 2. Uma época
1. **Janela de verão**: formação → draft → **uma volta** ao tabuleiro, com um dado → fecho.
2. **Primeira volta do campeonato.**
3. **Janela de inverno**: formação → draft → **uma volta** ao tabuleiro, com dois dados → fecho.
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
- **Jovem promessa**: até 21 anos (desde o mais novo da base, 16), overall 60–68 na 1.ª época. Cada época sobe 1 nos
  dois limites (61–69 na 2.ª, 69–77 na 10.ª).
- **Na 1.ª janela** de verão ainda não há classificação: todos têm só uma escolha.
- **Último classificado**, a partir daí: 2 escolhas, uma jovem promessa e uma **segunda escolha**, de um jogador com
  limite de overall e de valor: na 1.ª época até **80** e **5 M€**; cada época sobe 1 de overall até **82** e 1 M€ até
  **7 M€**. **[A]** As opções saem a menos de 6 pontos do limite. Esse jogador entra no onze ou é vendido, e só à banca.
- **Restantes**: 1 jovem promessa.

### 3.3 Formação (jovens)
- Os jovens do draft são a formação do clube. Recebem um **potencial escondido entre 85 e 95**.
- Os jovens da formação **podem ser titulares**: é a jogar que crescem.
- O plantel pode ter **um 12.º jogador**, fora do onze, desde que seja da formação.
- No fim de cada época crescem entre **+2** (quase não jogou) e **+8** (jogou quase tudo), proporcionalmente aos
  minutos e sem passar o potencial. O valor de mercado acompanha.
- Com **mais de 21 anos e mais de 78 de overall**, o jovem passa para o plantel principal.

### 3.4 Tabuleiro de mercado (36 casas)

| Casas | |
|---|---|
| 0–8 | **Balneário** · Mercado · Patrocinadores · Mercado · **Jovens Talentos** · Rede de observação · Mercado · Agente · Mercado |
| 9–17 | **Mistério** · Departamento médico · Mercado · Rede de observação · **Investigação** · Agente · Mercado · Patrocinadores · Mercado |
| 18–26 | **Reunião com a SAD** · Patrocinadores · Mercado · Agente · **Jovens Talentos** · Rede de observação · Mercado · Departamento médico · Mercado |
| 27–35 | **Mistério** · Rede de observação · Mercado · Departamento médico · **Jovens Talentos** · Patrocinadores · Mercado · Agente · Mercado |

Totais: Mercado 13, Agente 4, Rede de observação 4, Patrocinadores 4, Departamento médico 3, Jovens Talentos 3, Mistério 2, Investigação 1, Reunião com a SAD 1,
Início 1.

Em cada janela dá-se **uma volta**: com **um dado no verão**; no **inverno**, o primeiro lançamento de cada treinador é
com um dado e os seguintes com dois.

**SAD:** quem pára na casa recebe uma **injeção de capital**; quem só passa recebe metade. No **inverno** vale metade do
que vale no verão. Cresce com a fase do Mercado (3 · 6 · 12 · 18 · 27 · 40 · 60 M€), por isso depende da duração da
partida. Em 3 épocas: 3 · 18 · 60 M€. Em 5: 3 · 12 · 18 · 40 · 60 M€. Em 10: 3 · 6 · 6 · 12 · 18 · 18 · 27 · 40 · 40 · 60 M€.

**Uma vez** **[A]** (pela ordem do draft):
1. propostas, se quiseres (ver 3.5);
2. lançar o dado (no inverno, os dois, exceto no primeiro lançamento) e andar;
3. resolver a casa;
4. mais propostas, se quiseres;
5. **Terminar vez**.

**[A]** Quem já completou as voltas continua na rotação, sem dados: só pode fazer propostas e usar o Agente.

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
- **Agente**: carta guardada na mão, com três usos:
  - inflacionar a cláusula de um jogador teu para **2× o valor de mercado** (uma vez por jogador);
  - **anular** um Agente usado contra ti;
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
| Agente amigo · Clínica nova | uma carta de Agente · do Departamento médico |
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
| Olheiro roubado · Agente zangado · Médico despedido | perdes essa carta (−2 · −2 · −1 M€ se não a tiveres) |
| Papelada em atraso | perdes a próxima vez no tabuleiro |
| O craque quer sair | a cláusula do teu melhor jogador fica em 1× até à próxima janela |
| Farto disto tudo | um jogador ao acaso, fora dos 3 melhores, vai embora ao preço base |

**Fim da partida:** são a última época numa partida de 3, as 2 últimas numa de 5, e as 3 últimas numa de 8 ou 10. Nessas
épocas:
- saem mais cartas más, **70%** em vez de metade, e o dinheiro que tiram **dobra**;
- nos jogos, a **Força fica entre −1 e +1**;
- joga-se a **Taça** (secção 4.5).

A Digressão pela Ásia só sai assim no verão: no inverno a mesma carta é **Amigáveis nos EUA**.

As razões dos castigos e das lesões, e as comidas da caganeira, estão em `CONFIG.misterio`. As mais adultas nunca saem a
jogadores com menos de 18 anos, porque a base tem jogadores reais de 16 e 17 anos.

**[A]** Uma carta má nunca deixa o orçamento negativo: tira só o que houver. Os efeitos no próximo jogo ficam guardados
e só têm efeito quando os jogos existirem (passo 4).

#### 3.4.3 Investigação
Castiga quem teve sorte a mais. A probabilidade de condenação é:

**3% + 5% por campeonato ganho + 12% por cada ponto de ajuda**, até 85%.

- Cada carta Mistério boa dá **1/3 de ponto** de ajuda. As que dão dinheiro na próxima janela dão mais: Clube comprado 1,
  Nome no estádio e Mecenas anónimo 2/3.
- Cada carta de **Agente usada** dá 1 ponto (inflacionar, exclusividade ou anular).
- Aceitar uma marca ou patrocinador **da lista "iniciais" que já se tornou grande** dá 1 ponto (entra com os patrocínios,
  no passo 5).
- **[A]** A injeção da SAD não conta, porque todos a recebem.
- Quem não teve ajudas nem títulos tem só 3%.

Se for condenado, a sanção é sorteada: **limite de contratações** (40%), **multa** (40%) ou **as duas** (20%).
- **Limite:** **[A]** só pode fazer mais 2 contratações nesta janela (compras, leilões, propostas, Agente e trocas
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
- Com o **Agente** (exclusividade), não há leilão: compra-se pelo valor da cláusula. O dono pode anular com outro Agente.
- **Em cada janela não se compram mais de 2 jogadores ao mesmo treinador.** **[A]** Contam propostas, leilões de
  propostas, Agente e trocas.
- **Antes de cada jogo, e durante a janela, o treinador escolhe o onze** no Plantel: troca jogadores de lugar e com o
  banco, mas só nas suas posições. **[A]** No fecho, a escolha só cede se impedir alguém de ficar no plantel.
- A qualquer altura da janela:
  - **vender à banca**, sempre ao **preço base** (baixo);
  - **trocas diretas** acordadas entre os dois treinadores, sem leilão.
- **[A]** Enquanto decorre um leilão, o tabuleiro fica parado.

### 3.5.1 Saldo negativo
- Durante a janela pode-se gastar mais do que se tem (compras, leilões, propostas, Agente e draft), até um
  limite que cresce com a fase do Mercado: **−40 · −50 · −60 · −70 · −85 · −100 · −120 M€** (`CONFIG.transferencias.dividaPorFase`).
- Só se avança para o fecho da janela **sem dívida**. Quem comprar depois de estar pronto e ficar em dívida deixa de
  estar pronto.
- Em dívida não se vende à banca: o jogador vai a **leilão**, a começar em **80% do valor de mercado** (não da cláusula),
  e o dono não pode recusar. Só se ninguém licitar é que vai para a banca, ao preço base. Os jogadores da segunda escolha
  do draft, que só se vendem à banca, continuam a ir diretos.
- **[A]** Se o anfitrião forçar o fecho, os jogadores mais valiosos de quem está em dívida vão para a banca até a dívida
  acabar. Quem já não tiver nada para vender fica a zero.
- As cartas más e as multas não aumentam uma dívida.

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
- **Dinheiro de TV igual para todos**, pago a cada jornada, e cada vez maior: acompanha os preços do Mercado da época
  seguinte (40 a 170 M€ por época, em `CONFIG.campeonato.tvPorFase`). Os **salários** são cobrados a cada jornada.
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
- **Tática**: +1 se a tua carta vence a do adversário.
- **Química**: +0,25 por cada grupo de 3 ou mais jogadores da mesma nacionalidade no onze, até +0,5. A parte decimal é a
  probabilidade de +1 em cada lance.
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

**Os lances são à vez**: em cada ronda de 10 minutos lança primeiro a equipa da casa, vê-se a jogada e o registo, e só depois lança a visitante. Os bots lançam sozinhos.

### 4.4 Lesões
- Em campo só há lesões de jogo, e **os guarda-redes não se lesionam**.
- **O jogo pára até o treinador decidir**, e o adversário é avisado. As opções:
  - **Ficha do Departamento médico**: o jogador recupera e continua em campo.
  - **Substituição**: entra o suplente. Fora das suas posições, joga com **−3** de overall até ao fim do jogo.
  - **Fica em campo** com **−10** de overall até ao fim do jogo. Sem ficha nem substituição, é o que acontece.
- Se não foi tratado com uma ficha, o jogador fica de fora até à próxima janela. **O emprestado só joga a partir da
  jornada seguinte**, nunca no jogo da lesão, e a carta dele é mostrada ao treinador no início dessa jornada.
- O **emprestado** é um jogador da mesma posição que **nunca é melhor nem tem mais valor de mercado** do que o lesionado.
  Pode ser comprado na abertura da janela seguinte, ao valor de mercado. Se não for comprado, volta ao baralho.

### 4.5 Taça
- Joga-se nas últimas épocas da partida (ver 3.4.2), no fim da época, depois da liga e antes da janela de verão.
- Entram **só os treinadores**, pela classificação da liga dessa época. Se forem ímpares, entra também o bot mais bem
  classificado, para ficarem em número par.
- A eliminar, a um jogo: **1.º contra 2.º, 3.º contra 4.º, 5.º contra 6.º**… e os vencedores continuam pela mesma ordem.
- Escolhe-se a tática antes de cada jogo. Um empate resolve-se nos **penáltis**: 5 de cada lado e depois morte súbita, cada
  um com o dado de um penálti normal (golo com 3–6).
- **[A]** Cada eliminatória ganha dá 1 M€, e ganhar a Taça dá mais 3 M€. Não há TV nem salários.
- Há uma tabela de **marcadores e assistências só da Taça**. **[A]** Estes golos não contam para as da liga, nem os minutos
  para o crescimento dos jovens.
- **[A]** O bot, quando entra, tem uma penalização maior do que na liga, para ganhar muito raramente.

## 5. Marcas e patrocínios
- Cada equipa tem **1 marca e 2 patrocínios**, e nunca dois patrocínios de valor alto ao mesmo tempo.
- **Exclusivos**: cada marca e cada patrocinador só está numa equipa de cada vez.
- Pagam **só ao assinar** (prémio de assinatura por categoria).
- A marca muda no máximo **uma vez por época**. Os patrocínios mudam no máximo **um por janela**, e **o mesmo lugar não
  muda duas vezes na mesma época**: numa época podes mudar os dois, um no verão e o outro no inverno.
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
  - grandes: Like, Abidas, Fuma, Old Balance;
  - médias: Ombru, Lappa, Castrole, Marcon, Hammer;
  - baixas: Lergea, Rikelme, Erreia, Toma, Cotto, Upper Armour;
  - iniciais: Carlatoni, CTD, Diadura, Givulva, Batrick.
- **Patrocínios**
  - altos: Sportify, Fly Emigrants, Ratar Airways, Nãotendo, CEGA, SONIA;
  - médios: Betanus, Betcrica, Solvermelho, LeBollo, TimViewer23, Jipe;
  - baixos: Super Cock, Cerveja Conal, GIDI, MEU, NOZ, Palcard, Vodafode, Sabres;
  - iniciais: JF Canha, SPARVO, Jardins Paulo Meira, CarCanhola, Restaurante Peixaxa,
    Construções Lomba, Café o Relógio, Colchões Camarrata, Bar de Alterne O Pau, Mastur Bar,
    Bar Dalloca, REMIX, GandaPreço, Água dos Mijos, Convento de Freires, Ping Doce, Arquipélago.

## 6. Janela de inverno
Abre com três coisas:
- os lesionados recuperam;
- os emprestados por lesão podem ser comprados;
- quem estava a ver entra.

O resto decorre como no verão (formação, draft pela classificação atual invertida, tabuleiro e fecho), mas com **dois
dados** no tabuleiro.

## 7. Fim de época
- **Campeão** da época.
- **Prémios** (sem dinheiro):
  - homem do jogo em cada jogo (nota com golos, assistências e resultado);
  - tabelas de marcadores e de assistências;
  - equipa da época (com jogadores de várias equipas);
  - jogador do ano.
- **Idade**: todos os jogadores das equipas fazem +1 ano. Os jogadores do baralho ficam como na base, senão deixava de
  haver jovens para o draft; quem é vendido à banca volta ao baralho como estava na base.
- **Overall** de quem não é da formação, pela idade na época que acaba:

  | Idade | Variação |
  |---|---|
  | até 23, com overall até 84 | +1 (15%), +2 (60%) ou +3 (25%) |
  | até 23, com overall acima de 84 | +1 (80%) ou +2 (20%) |
  | 24 a 30, com overall até 88 | +1 (80%) ou +2 (20%) |
  | 24 a 30, com overall acima de 88 | +1 (50%) ou fica igual (50%) |
  | 31 a 33 | +1 (30%) ou fica igual (70%) |
  | 34 ou mais | −1 com 20% aos 34, mais 10% por cada ano: 30% aos 35, 40% aos 36… |

  O **rendimento** da época inclina estas probabilidades (até 50%): médios e avançados pelos golos e assistências por jogo,
  defesas e guarda-redes pelos golos que a equipa sofreu em relação à média da liga. Quem jogou menos de 20% dos minutos não
  conta.
- Crescimento e promoção dos jovens (3.3).
- **Prémio de extensão** para quem não mudou de marca.

## 8. Fim da partida
Ao fim das épocas escolhidas, ganha quem tiver **mais títulos**: um campeonato vale 1 e uma **Taça vale 0,5**. O desempate é
pelo **total de pontos de todas as épocas**. No fim mostra-se o palmarés.

## 9. Dados dos jogadores
- Base do EAFC (derivada do SoFIFA): nome, idade, nacionalidade, liga, posição principal e alternativas, overall,
  potencial, finalização e passe.
- **Valor de mercado**: fórmula a partir do overall e da idade.
- **Cláusula de rescisão** = 1,5× o valor de mercado.
- **Salário**: proporcional ao valor de mercado, não negociável, cobrado a cada jornada. No total da época dá ~5% do
  valor do plantel.
- **Preço base** (venda à banca): baixo, uma fração do valor de mercado.
