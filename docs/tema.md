# Tema

O The Gaffer usa o tema partilhado dos outros jogos: `jogo/public/css/tema.css`, copiado do Scout Report. Mantém-se
tudo igual (relvado escuro, painéis, Anton + Inter, botões, salas, placar, pódio, `<dialog>` "Como jogar" com passos
01., 02., … e botão "Percebi") e só muda a cor de destaque.

## Cor de destaque
O castanho pedido não tem contraste suficiente sobre o relvado `#06140d` (`#3D241D` dá 1,32:1 e `#765340` dá 2,77:1),
por isso divide-se em dois papéis:

| Token | Cor | Uso | Contraste |
|---|---|---|---|
| `--castanho` | `#3d241d` | fundo do botão principal, 1.º lugar do pódio, etiquetas | branco por cima: 14,30:1 |
| `--castanho-2` | `#765340` | topo do gradiente, estados secundários | branco por cima: 6,81:1 |
| `--destaque` | `#c49a6c` | caramelo: títulos, bordas, anéis de foco | 7,35:1 sobre o fundo |
| `--destaque-2` | `#d7b48c` | caramelo claro: texto pequeno em destaque | 9,70:1 sobre o fundo, 8,75:1 num painel |

O botão principal leva uma borda caramelo fina, para se destacar do relvado (o castanho, sozinho, quase desaparece).
`theme-color` = `#3d241d`.

## Verificar
```bash
cd jogo
npm run contraste
node scripts/servir.mjs 8791   # mockup em http://127.0.0.1:8791/mockup.html
```
O mockup aceita `?vista=inicio|sala|placar|final` e `?como`.
