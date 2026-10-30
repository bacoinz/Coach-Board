# Dados dos jogadores

## Dataset escolhido
**[EA SPORTS FC 27 Player Ratings](https://www.kaggle.com/datasets/mikedpad/ea-sports-fc27-player-ratings)** (Kaggle,
MikeDPad), snapshot de 12/09/2026. O ficheiro vai em `dados/brutos/players.csv`, que fica fora do git.

**Porquê este:**
- vem da **API oficial da EA** (a mesma das páginas de ratings no ea.com), por isso tem os overalls mais recentes do
  FC 27 e o autor atualiza-o todos os meses;
- tem tudo o que o jogo usa: data de nascimento, nacionalidade, liga, clube, posição principal e alternativas,
  overall, finalização (`attacking_finishing`) e passe curto (`attacking_short_passing`);
- não precisa de pós-processamento: as ligas e as posições vêm limpas.

**Alternativas que vi:**
- [fc-27-players-dataset](https://github.com/mattabelhom/fc-27-players-dataset) (GitHub, via FIFPlay): não pede
  conta, mas não tem idade nem data de nascimento e a liga vem sempre como "League";
- datasets do SoFIFA: só os há para o FC 25 ou mais antigos;
- eFootball: não tem posições alternativas nem atributos comparáveis.

**O que falta: o potencial.** A API da EA não o publica. Para o jogo não faz falta, porque as regras dão aos jovens
do draft um potencial escondido sorteado entre 85 e 95, e os outros jogadores evoluem pela idade.

## Importação
```bash
cd jogo
npm run dados      # dados/brutos/players.csv → public/dados/jogadores.bin
npm run valores    # tabela de valores, para validar as fórmulas
```
- Entram só os jogadores **masculinos** com overall ≥ 55 (`CONFIG.dados.overallMinimo`): 17 016 jogadores, 163
  nações, 49 ligas e 669 clubes.
- A idade é a de 01/09/2026 (`CONFIG.dados.dataReferencia`, o início da época 1). Daí em diante, o jogo soma +1 por
  época.
- O ficheiro é JSON em colunas com gzip (422 KB), carregado pelo Durable Object através da binding `ASSETS`. As
  nações, as ligas e os clubes guardam-se uma vez e os jogadores levam o índice. O formato está em
  `src/motor/base.js`.
- As posições ficam com as siglas da EA: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST. A interface mostra-as
  em português (GR, DC, DE, DD, MDC, MC, MCO, ME, MD, EE, ED, PL).

**Quantos há para cada sorteio:**

| Sorteio | Critério | Jogadores |
|---|---|---:|
| Plantel inicial | overall 70–78 | 4 575 |
| Jovens do draft | até 21 anos, overall 60–68 | 2 003 |
| Escolha extra do último (A) | mais de 33 anos, overall 80–85 | 48 |
| Escolha extra do último (B) | 21–23 anos, overall 78–82 | 96 |
| Jovens Talentos | até 23 anos, overall 78–82 | 115 |
| Baralho do Mercado | overall 70 ou mais, por fases (docs/regras.md, 3.4.1) | 5 215 |

A base também guarda as 6 facetas de cada carta (VEL, REM, PAS, DRI, DEF, FÍS; nos guarda-redes MER, MÃO, PON, REF,
VEL, POS), que aparecem nas cartas de jogador.

## Fórmulas (`src/config.js` → `valores`, `src/motor/valores.js`)
- **Valor de mercado** = 8 M€ × e^(0,2 × (overall − 75)) × fator da idade. Cada ponto de overall vale ~22% mais.
- **Fator da idade:**

  | Idade | ≤ 21 | 22–24 | 25–28 | 29–30 | 31–32 | 33–34 | 35+ |
  |---|---:|---:|---:|---:|---:|---:|---:|
  | Fator | 1,3 | 1,2 | 1,0 | 0,85 | 0,65 | 0,45 | 0,3 |

- **Cláusula** = 1,5 × valor. O Empresário põe-na em 2× (num jogador teu) ou em 1× (num jogador alvo).
- **Preço base** (venda à banca) = 40% do valor. **Preço do draft** = 60% do valor.
- **Salário** = 5% do valor por época, dividido pelas jornadas. Um jogador de 75 custa ~29 mil € por jornada num
  campeonato de 8 equipas.

### Valor de mercado (M€) por overall e idade

| Overall | 19 anos | 22 anos | 26 anos | 30 anos | 32 anos | 34 anos | 36 anos |
|---|---:|---:|---:|---:|---:|---:|---:|
| 60 | 0,5 | 0,5 | 0,4 | 0,3 | 0,3 | 0,2 | 0,1 |
| 65 | 1,4 | 1,3 | 1,1 | 0,9 | 0,7 | 0,5 | 0,3 |
| 68 | 2,6 | 2,4 | 2,0 | 1,7 | 1,3 | 0,9 | 0,6 |
| 70 | 3,8 | 3,5 | 2,9 | 2,5 | 1,9 | 1,3 | 0,9 |
| 72 | 5,7 | 5,3 | 4,4 | 3,7 | 2,9 | 2,0 | 1,3 |
| 75 | 10,4 | 9,6 | 8,0 | 6,8 | 5,2 | 3,6 | 2,4 |
| 78 | 19,0 | 17,5 | 14,6 | 12,4 | 9,5 | 6,6 | 4,4 |
| 80 | 28,3 | 26,1 | 21,7 | 18,5 | 14,1 | 9,8 | 6,5 |
| 82 | 42,2 | 38,9 | 32,4 | 27,6 | 21,1 | 14,6 | 9,7 |
| 85 | 76,8 | 70,9 | 59,1 | 50,2 | 38,4 | 26,6 | 17,7 |
| 88 | 140,0 | 129,3 | 107,7 | 91,6 | 70,0 | 48,5 | 32,3 |
| 90 | 208,9 | 192,8 | 160,7 | 136,6 | 104,4 | 72,3 | 48,2 |

### Exemplos da base

| Jogador | Overall | Idade | Valor | Cláusula |
|---|---:|---:|---:|---:|
| Kylian Mbappé | 91 | 27 | 196,3 | 294,5 |
| Lamine Yamal | 90 | 19 | 208,9 | 313,4 |
| Pedri | 90 | 23 | 192,8 | 289,2 |
| Vitinha | 90 | 26 | 160,7 | 241,1 |
| Bruno Fernandes | 89 | 31 | 85,5 | 128,3 |
| Rúben Dias | 87 | 29 | 75,0 | 112,5 |
| Diogo Costa | 86 | 26 | 72,2 | 108,3 |
| Gonçalo Ramos | 80 | 25 | 21,7 | 32,6 |
| Cristiano Ronaldo | 84 | 41 | 14,5 | 21,8 |

Um plantel inicial (11 jogadores com média 75) vale à volta de 90–110 M€, conforme as idades. O orçamento inicial, o dinheiro de TV e os prémios de
patrocínio vão para a configuração no passo 3 e afinam-se com a simulação do passo 4.

## Fotos
`node scripts/fotos.mjs` liga os jogadores às fotos do **Wikimedia Commons** através da Wikidata (imagem P18). Só há foto
quando a data de nascimento é exatamente a mesma e o nome bate; em caso de dúvida fica a silhueta. Depois corre-se
`npm run dados`, que põe o ficheiro de cada jogador na base.

- Resultado: **7029 de 17 016 jogadores (41%)**; entre os que têm overall 80 ou mais, cerca de 95%.
- As imagens vêm diretamente do Commons, em tamanho reduzido. O autor e a licença de cada uma aparecem no detalhe do
  jogador (`public/dados/creditos-fotos.json`), como as licenças CC pedem.
- As fotos são as que existem: nem todas são caras de frente. Não há outra fonte de licença livre com mais cobertura.
