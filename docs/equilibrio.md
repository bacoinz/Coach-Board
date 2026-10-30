# Equilíbrio: resultados da simulação

Gerado por `npm run simular`, com os valores de `jogo/src/config.js`. Muda-se lá e corre-se outra vez.

**O que isto ainda não inclui:** marcas e patrocínios (o dinheiro deles), evolução e envelhecimento dos jogadores, e os ajustes de plantel dos bots (entram no passo 5). Os treinadores são automáticos e simples: compram quem melhora o onze e não têm a malícia de um jogador a sério.

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

40 partidas por duração, 4 treinadores e 2 bots de nível equivalente. Valores médios por treinador **no fim de cada época**. O orçamento inicial é 40 M€ e o plantel inicial vale cerca de 100 M€.

### 3 épocas

| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3,0 M€ | 4,19 | 33 M€ | 52 M€ | 134 M€ | 76,2 |
| 2 | 6,0 M€ | 4,13 | 37 M€ | 60 M€ | 168 M€ | 77,4 |
| 3 | 12,0 M€ | 4,24 | 50 M€ | 100 M€ | 192 M€ | 78,2 |

Títulos do vencedor: 1,6 de 3. Títulos ganhos por bots: 0,07 por partida (**2,5% dos títulos**). Condenações na Investigação: 0,3 por partida. Vezes no tabuleiro por treinador: 11 no verão e 6 no inverno.

### 5 épocas

| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3,0 M€ | 4,25 | 34 M€ | 49 M€ | 134 M€ | 76,2 |
| 2 | 6,0 M€ | 4,18 | 35 M€ | 58 M€ | 167 M€ | 77,5 |
| 3 | 12,0 M€ | 4,23 | 41 M€ | 71 M€ | 198 M€ | 78,6 |
| 4 | 18,0 M€ | 4,25 | 50 M€ | 86 M€ | 231 M€ | 79,3 |
| 5 | 27,0 M€ | 4,36 | 63 M€ | 115 M€ | 265 M€ | 80,1 |

Títulos do vencedor: 2,3 de 5. Títulos ganhos por bots: 0,05 por partida (**1,0% dos títulos**). Condenações na Investigação: 0,8 por partida. Vezes no tabuleiro por treinador: 11 no verão e 6 no inverno.

### 8 épocas

| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3,0 M€ | 4,16 | 35 M€ | 55 M€ | 133 M€ | 76,0 |
| 2 | 6,0 M€ | 4,26 | 35 M€ | 57 M€ | 167 M€ | 77,5 |
| 3 | 12,0 M€ | 4,29 | 40 M€ | 71 M€ | 197 M€ | 78,6 |
| 4 | 18,0 M€ | 4,36 | 45 M€ | 88 M€ | 232 M€ | 79,5 |
| 5 | 27,0 M€ | 4,42 | 47 M€ | 111 M€ | 275 M€ | 80,4 |
| 6 | 40,5 M€ | 4,49 | 58 M€ | 108 M€ | 323 M€ | 81,2 |
| 7 | 60,8 M€ | 4,47 | 67 M€ | 151 M€ | 387 M€ | 82,0 |
| 8 | 72,9 M€ | 4,54 | 83 M€ | 157 M€ | 452 M€ | 82,8 |

Títulos do vencedor: 3,6 de 8. Títulos ganhos por bots: 0,13 por partida (**1,6% dos títulos**). Condenações na Investigação: 2,0 por partida. Vezes no tabuleiro por treinador: 11 no verão e 6 no inverno.

### 10 épocas

| Época | SAD | Golos por jogo | Orçamento médio | Maior orçamento | Valor do plantel | Overall do onze |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3,0 M€ | 4,08 | 34 M€ | 63 M€ | 133 M€ | 76,1 |
| 2 | 6,0 M€ | 4,19 | 35 M€ | 55 M€ | 164 M€ | 77,5 |
| 3 | 12,0 M€ | 4,12 | 39 M€ | 82 M€ | 195 M€ | 78,6 |
| 4 | 18,0 M€ | 4,28 | 43 M€ | 69 M€ | 227 M€ | 79,6 |
| 5 | 27,0 M€ | 4,33 | 50 M€ | 100 M€ | 265 M€ | 80,4 |
| 6 | 40,5 M€ | 4,45 | 54 M€ | 101 M€ | 313 M€ | 81,3 |
| 7 | 60,8 M€ | 4,46 | 60 M€ | 135 M€ | 376 M€ | 82,1 |
| 8 | 72,9 M€ | 4,52 | 72 M€ | 161 M€ | 443 M€ | 82,8 |
| 9 | 87,5 M€ | 4,50 | 77 M€ | 161 M€ | 524 M€ | 83,6 |
| 10 | 105,0 M€ | 4,46 | 91 M€ | 208 M€ | 611 M€ | 84,3 |

Títulos do vencedor: 4,3 de 10. Títulos ganhos por bots: 0,10 por partida (**1,0% dos títulos**). Condenações na Investigação: 2,9 por partida. Vezes no tabuleiro por treinador: 11 no verão e 6 no inverno.
