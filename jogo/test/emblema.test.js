import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config.js';
import { lerEmblema } from '../src/motor/emblema.js';

const dataUrl = (tipo, bytes) => `data:image/${tipo};base64,${btoa(String.fromCharCode(...bytes))}`;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)));

describe('Emblema enviado pelo cliente', () => {
  it('aceita PNG e WebP e usa o tipo real da imagem', () => {
    expect(lerEmblema(dataUrl('png', PNG)).tipo).toBe('image/png');
    expect(lerEmblema(dataUrl('webp', WEBP)).tipo).toBe('image/webp');
    // Declarado como PNG, mas o conteúdo é WebP.
    expect(lerEmblema(dataUrl('png', WEBP)).tipo).toBe('image/webp');
  });

  it('recusa SVG, conteúdo que não é imagem e lixo', () => {
    expect(lerEmblema('data:image/svg+xml;base64,PHN2Zz4=').erro).toBeTruthy();
    expect(lerEmblema(dataUrl('png', [1, 2, 3, 4])).erro).toBeTruthy();
    expect(lerEmblema('data:image/png;base64,@@@').erro).toBeTruthy();
    expect(lerEmblema(null).erro).toBeTruthy();
  });

  it('recusa imagens acima do limite', () => {
    const grande = `data:image/png;base64,${'A'.repeat(Math.ceil((CONFIG.sala.emblema.maxKB * 1024 * 4) / 3) + 8)}`;
    expect(lerEmblema(grande).erro).toMatch(/pesada/);
  });
});
