# Equilíbrio: resultados da simulação

Gerado por `npm run simular`, com os valores de `jogo/src/config.js`. Muda-se lá e corre-se outra vez.

**Atenção:** os treinadores são automáticos e simples: compram quem melhora o onze e não têm a malícia de um jogador a sério.

## 1. Jogos entre equipas equivalentes

20 000 jogos, modificador 0 dos dois lados. **Objetivo: ~2 golos por equipa; 5 ou mais raro.**

| Medida | Resultado |
|---|---:|
| Golos por equipa | **2,08** |
| Golos por jogo | 4,15 |
| Empates | 22,0% |
| Uma equipa marca 5 ou mais | 4,0% das equipas |
| Vermelhos por jogo | 0,25 |
| Lesões por jogo | 0,25 |
| Penáltis por jogo | 0,25 |

**Resultados mais frequentes:**

| Resultado | Frequência |
|---|---:|
| 2-1 | 16,0% |
| 3-2 | 12,3% |
| 3-1 | 11,0% |
| 2-2 | 8,9% |
| 1-1 | 6,7% |
| 2-0 | 5,7% |
| 4-2 | 5,6% |
| 4-1 | 4,9% |
| 1-0 | 4,8% |
| 3-3 | 4,3% |

## 2. O peso de cada modificador

5000 jogos por linha. "A favor" é a equipa com a vantagem.

| Vantagem | Golos a favor | Golos contra | Ganha | Empata | Perde |
|---|---:|---:|---:|---:|---:|
| Equivalentes (0) | 2,09 | 2,04 | 40,2% | 21,9% | 37,9% |
| Química no máximo (+0,5) | 2,44 | 2,08 | 46,7% | 21,2% | 32,2% |
| Força +1 | 2,80 | 1,52 | 66,3% | 17,3% | 16,3% |
| Tática a favor (+1) | 2,77 | 2,05 | 55,1% | 18,5% | 26,4% |
| Força +2 | 3,58 | 1,01 | 87,8% | 8,0% | 4,1% |
| Força +1 e tática | 3,56 | 1,53 | 78,7% | 11,9% | 9,5% |
| Força +2 e tática | 4,39 | 1,05 | 94,1% | 4,0% | 1,9% |
| Vermelho contra o adversário | 2,08 | 1,52 | 51,5% | 21,8% | 26,7% |

## 3. Partidas inteiras: dinheiro e nível dos plantéis

60 partidas por duração, 4 treinadores e 2 bots de nível equivalente. Valores médios por treinador **no fim de cada época**. O orçamento inicial é 40 M€ e o plantel inicial vale cerca de 100 M€.

### 3 épocas

| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3,0 M€ | 4,15 | 38 M€ | 73 M€ | 138 M€ | 76,2 |
| 2 | 6,0 M€ | 4,22 | 43 M€ | 80 M€ | 229 M€ | 78,8 |
| 3 | 12,0 M€ | 4,25 | 60 M€ | 119 M€ | 334 M€ | 80,9 |

Títulos do vencedor: 1,9 de 3. Campeonatos ganhos por bots: 0,08 por partida (**2,8%**). Taças ganhas por bots: **0,0%**. A Taça mudou o vencedor em 25,0% das partidas. Condenações na Investigação: 0,3 por partida. Vezes no tabuleiro por treinador: 11 no verão e 6 no inverno.

### 5 épocas

| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3,0 M€ | 4,25 | 36 M€ | 66 M€ | 139 M€ | 76,2 |
| 2 | 6,0 M€ | 4,15 | 39 M€ | 77 M€ | 230 M€ | 78,9 |
| 3 | 12,0 M€ | 4,29 | 48 M€ | 102 M€ | 334 M€ | 81,0 |
| 4 | 18,0 M€ | 4,26 | 54 M€ | 117 M€ | 453 M€ | 82,7 |
| 5 | 27,0 M€ | 4,31 | 67 M€ | 137 M€ | 568 M€ | 84,1 |

Títulos do vencedor: 2,7 de 5. Campeonatos ganhos por bots: 0,10 por partida (**2,0%**). Taças ganhas por bots: **0,0%**. A Taça mudou o vencedor em 15,0% das partidas. Condenações na Investigação: 0,9 por partida. Quem ia à frente a 3 épocas do fim ganhou 61,5% das vezes. Vezes no tabuleiro por treinador: 11 no verão e 6 no inverno.

### 8 épocas

| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3,0 M€ | 4,11 | 36 M€ | 60 M€ | 140 M€ | 76,3 |
| 2 | 6,0 M€ | 4,21 | 40 M€ | 71 M€ | 227 M€ | 78,9 |
| 3 | 12,0 M€ | 4,27 | 44 M€ | 81 M€ | 325 M€ | 80,9 |
| 4 | 18,0 M€ | 4,23 | 52 M€ | 104 M€ | 423 M€ | 82,5 |
| 5 | 27,0 M€ | 4,21 | 58 M€ | 128 M€ | 530 M€ | 83,8 |
| 6 | 40,5 M€ | 4,25 | 66 M€ | 153 M€ | 642 M€ | 85,0 |
| 7 | 60,8 M€ | 4,29 | 75 M€ | 225 M€ | 751 M€ | 86,2 |
| 8 | 72,9 M€ | 4,22 | 83 M€ | 235 M€ | 842 M€ | 87,2 |

Títulos do vencedor: 4,1 de 8. Campeonatos ganhos por bots: 0,13 por partida (**1,7%**). Taças ganhas por bots: **0,0%**. A Taça mudou o vencedor em 8,3% das partidas. Condenações na Investigação: 2,0 por partida. Quem ia à frente a 3 épocas do fim ganhou 80,6% das vezes. Vezes no tabuleiro por treinador: 11 no verão e 6 no inverno.

### 10 épocas

| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3,0 M€ | 4,16 | 37 M€ | 63 M€ | 140 M€ | 76,2 |
| 2 | 6,0 M€ | 4,12 | 40 M€ | 75 M€ | 222 M€ | 78,9 |
| 3 | 12,0 M€ | 4,26 | 47 M€ | 87 M€ | 314 M€ | 80,8 |
| 4 | 18,0 M€ | 4,24 | 50 M€ | 92 M€ | 413 M€ | 82,4 |
| 5 | 27,0 M€ | 4,22 | 58 M€ | 136 M€ | 519 M€ | 83,7 |
| 6 | 40,5 M€ | 4,28 | 69 M€ | 160 M€ | 627 M€ | 84,9 |
| 7 | 60,8 M€ | 4,23 | 78 M€ | 190 M€ | 747 M€ | 86,1 |
| 8 | 72,9 M€ | 4,29 | 87 M€ | 217 M€ | 844 M€ | 87,1 |
| 9 | 87,5 M€ | 4,22 | 109 M€ | 276 M€ | 903 M€ | 88,0 |
| 10 | 105,0 M€ | 4,34 | 120 M€ | 292 M€ | 946 M€ | 88,8 |

Títulos do vencedor: 4,5 de 10. Campeonatos ganhos por bots: 0,38 por partida (**3,8%**). Taças ganhas por bots: **0,0%**. A Taça mudou o vencedor em 10,0% das partidas. Condenações na Investigação: 3,4 por partida. Quem ia à frente a 3 épocas do fim ganhou 73,2% das vezes. Vezes no tabuleiro por treinador: 11 no verão e 6 no inverno.
