import { describe, it, expect } from 'vitest';
import { BASE } from './apoio.js';
import { gerarPassos } from '../scripts/demo-guiao.mjs';

describe('demo', () => {
  const { passos } = gerarPassos(BASE);

  it('passa por todas as casas e pelas partes do jogo', () => {
    const titulos = passos.map((p) => p.titulo);
    for (const casa of ['Mercado', 'Patrocinadores', 'Jovens Talentos', 'Rede de observação', 'Agente', 'Mistério', 'Departamento médico', 'Investigação', 'Reunião com a SAD']) {
      expect(titulos).toContain(`Casa - ${casa}`);
    }
    for (const parte of ['O draft', 'Leilões', 'Propostas e cláusulas', 'Saldo negativo', 'O fecho da janela', 'Vamos a jogo - A tática', 'Acontecimentos', 'Lesões', 'Classificação', 'Campeão!']) {
      expect(titulos).toContain(parte);
    }
  });

  it('os acontecimentos vêm antes da lesão', () => {
    const titulos = passos.map((p) => p.titulo);
    expect(titulos.indexOf('Acontecimentos')).toBeLessThan(titulos.indexOf('Lesões'));
  });

  it('as equipas têm os nomes da demo, e cada passo é o estado do mesmo treinador', () => {
    expect(Object.values(passos[0].sala.equipas).map((e) => e.nome).sort()).toEqual(['CD Algoritmo', 'Dumb United', 'Noob FC', 'Real Calhau']);
    for (const p of passos) {
      expect(p.texto.length).toBeGreaterThan(0);
      expect(p.eu.id).toBe('t1');
    }
    expect(JSON.stringify(passos).length).toBeLessThan(1_500_000);
  });
});
