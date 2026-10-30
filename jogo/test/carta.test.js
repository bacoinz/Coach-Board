import { describe, it, expect } from 'vitest';
import { nivel } from '../public/js/carta.js';
import { BASE } from './apoio.js';

describe('cartas', () => {
  it('os níveis seguem os limites de overall', () => {
    const casos = [[69, 'bronze'], [70, 'prata'], [77, 'prata'], [78, 'ouro'], [83, 'ouro'], [84, 'ouro-brilho'], [87, 'ouro-brilho'], [88, 'ciano'], [91, 'ciano']];
    for (const [overall, esperado] of casos) expect(nivel(overall)).toBe(esperado);
  });
  it('os países estão em português e têm bandeira', () => {
    const j = [...BASE.values()].find((x) => x.nome === 'Kylian Mbappé');
    expect(j.nacao).toBe('França');
    expect(j.bandeira).toBe('fr');
    expect([...BASE.values()].every((x) => x.nacao && x.bandeira)).toBe(true);
  });
});
