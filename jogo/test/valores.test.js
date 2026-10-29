import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { valorMercado, clausula, precoBase, precoDraft, salarioJornada, fatorIdade, idadeEm, arredondar } from '../src/motor/valores.js';

describe('valor de mercado', () => {
  it('um jogador de 75 no auge vale a base', () => {
    expect(valorMercado(75, 27)).toBe(CONFIG.valores.base);
  });
  it('sobe com o overall', () => {
    for (let ov = 56; ov <= 95; ov++) expect(valorMercado(ov, 26)).toBeGreaterThanOrEqual(valorMercado(ov - 1, 26));
  });
  it('desce a partir do auge e os jovens valem mais', () => {
    expect(valorMercado(80, 20)).toBeGreaterThan(valorMercado(80, 27));
    expect(valorMercado(80, 31)).toBeLessThan(valorMercado(80, 27));
    expect(valorMercado(80, 36)).toBeLessThan(valorMercado(80, 33));
  });
  it('nunca fica abaixo do mínimo e arredonda ao 0,1', () => {
    expect(valorMercado(40, 38)).toBe(CONFIG.valores.minimo);
    const v = valorMercado(83, 24);
    expect(Math.abs(v * 10 - Math.round(v * 10))).toBeLessThan(1e-9);
  });
  it('fator da idade usa o primeiro escalão que serve', () => {
    expect(fatorIdade(21)).toBe(1.3);
    expect(fatorIdade(22)).toBe(1.2);
    expect(fatorIdade(45)).toBe(0.3);
  });
});

describe('cláusula e preços', () => {
  it('cláusula é 1,5× o valor; o Empresário põe 2× ou 1×', () => {
    expect(clausula(10)).toBe(15);
    expect(clausula(10, CONFIG.valores.clausulaInflacionada)).toBe(20);
    expect(clausula(10, CONFIG.valores.clausulaEmpresario)).toBe(10);
  });
  it('preço base e de draft ficam abaixo do valor', () => {
    expect(precoBase(10)).toBeLessThan(10);
    expect(precoDraft(10)).toBeLessThan(10);
    expect(precoBase(10)).toBeLessThan(precoDraft(10));
  });
  it('o salário de uma época inteira é 5% do valor', () => {
    const jornadas = 8;
    let total = 0;
    for (let j = 0; j < jornadas; j++) total += salarioJornada(20, jornadas);
    expect(total).toBeCloseTo(20 * CONFIG.valores.salarioEpoca);
  });
  it('arredondar evita erros de vírgula flutuante grandes', () => {
    expect(arredondar(0.1 + 0.2)).toBeCloseTo(0.3);
  });
});

describe('idade', () => {
  it('conta anos completos', () => {
    expect(idadeEm('2000-09-01', '2026-09-01')).toBe(26);
    expect(idadeEm('2000-09-02', '2026-09-01')).toBe(25);
    expect(idadeEm('2000-12-31', '2026-09-01')).toBe(25);
  });
});
