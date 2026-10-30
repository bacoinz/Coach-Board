import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/config.js';
import { planearEventos, tempoNoPeriodo } from '../public/js/relvado.js';
import { LUGARES } from '../public/js/campo.js';

describe('jogadas do relvado', () => {
  it('um lance com golo termina em golo; sem oportunidade é só posse de bola', () => {
    const plano = planearEventos([
      { minuto: 12, lado: 0, tipo: 'lance', oportunidade: 'nada', dados: [1, 2] },
      { minuto: 15, lado: 1, tipo: 'lance', oportunidade: 'alta', dados: [5, 5] },
      { minuto: 15, lado: 1, tipo: 'golo', jogador: 'Zé', origem: 'jogada' },
      { minuto: 18, lado: 0, tipo: 'lance', oportunidade: 'baixa', dados: [3, 3] },
    ]);
    expect(plano.map((p) => p.tipo)).toEqual(['posse', 'ataque', 'ataque']);
    expect(plano[1]).toMatchObject({ golo: true, marcador: 'Zé', lado: 1 });
    expect(plano[2].golo).toBe(false);
  });
  it('os penáltis e as bolas paradas marcam diretamente; os outros eventos só dão um aviso', () => {
    const plano = planearEventos([
      { minuto: 3, lado: 0, tipo: 'golo', jogador: 'Ana', origem: 'penalti' },
      { minuto: 5, lado: 1, tipo: 'vermelho' },
      { minuto: 6, lado: 1, tipo: 'leve', texto: 'Canto' },
    ]);
    expect(plano[0]).toMatchObject({ tipo: 'golo-direto', marcador: 'Ana', lado: 0 });
    expect(plano[1]).toMatchObject({ tipo: 'texto', texto: 'Vermelho!' });
    expect(plano[2]).toMatchObject({ tipo: 'texto', texto: 'Canto' });
  });
  it('os eventos ficam dentro do tempo do período, por ordem', () => {
    const duracao = CONFIG.jogo.segundosPorPeriodo * 1000;
    for (let m = 1; m <= 90; m++) {
      const t = tempoNoPeriodo(m);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(duracao);
    }
    expect(tempoNoPeriodo(21)).toBeLessThan(tempoNoPeriodo(29));
  });
  it('há coordenadas para os 11 lugares de todas as formações', () => {
    for (const f of Object.keys(CONFIG.formacoes)) expect(LUGARES[f]).toHaveLength(11);
  });
});
