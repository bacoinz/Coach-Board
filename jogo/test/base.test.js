import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { CONFIG } from '../src/config.js';
import { lerBase, descomprimir, COLUNAS } from '../src/motor/base.js';

const ficheiro = new URL('../public/dados/jogadores.bin', import.meta.url);

describe.skipIf(!existsSync(ficheiro))('base de jogadores gerada', async () => {
  const base = lerBase(await descomprimir(readFileSync(ficheiro)));
  const todos = [...base.jogadores.values()];

  it('tem as colunas atuais', async () => {
    expect((await descomprimir(readFileSync(ficheiro))).colunas).toEqual(COLUNAS);
  });
  it('tem milhares de jogadores, todos acima do mínimo', () => {
    expect(todos.length).toBeGreaterThan(10000);
    expect(todos.every((j) => j.overall >= CONFIG.dados.overallMinimo)).toBe(true);
  });
  it('cada jogador tem idade, nação, liga, posição, finalização e passe', () => {
    for (const j of todos) {
      expect(j.idade).toBeGreaterThanOrEqual(15);
      expect(j.nacao && j.liga && j.clube).toBeTruthy();
      expect(j.posicao).toMatch(/^(GK|CB|LB|RB|CDM|CM|CAM|LM|RM|LW|RW|ST)$/);
      expect(j.alternativas).not.toContain(j.posicao);
      expect(j.finalizacao).toBeGreaterThan(0);
      expect(j.passe).toBeGreaterThan(0);
    }
  });
  it('há candidatos suficientes para os sorteios do jogo', () => {
    const jovens = todos.filter((j) => j.idade >= 18 && j.idade <= 21 && j.overall >= 60 && j.overall <= 68);
    const iniciais = todos.filter((j) => j.overall >= 70 && j.overall <= 78);
    expect(jovens.length).toBeGreaterThan(500);
    expect(iniciais.length).toBeGreaterThan(1000);
    for (const p of ['GK', 'CB', 'LB', 'RB', 'CM', 'ST']) expect(iniciais.filter((j) => j.posicao === p).length).toBeGreaterThan(50);
  });
});
