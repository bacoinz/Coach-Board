// Valida a imagem de um emblema enviada pelo cliente. Só aceita PNG, JPEG e WebP (nunca SVG, que pode trazer código)
// e confere os primeiros bytes em vez de confiar no tipo declarado.
import { CONFIG } from '../config.js';
import { erro } from './estado.js';

const PREFIXO = /^data:image\/(?:png|jpeg|webp);base64,/;

function tipoReal(b) {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  const ascii = (i, n) => String.fromCharCode(...b.subarray(i, i + n));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  return null;
}

/** @returns {{ bytes: Uint8Array, tipo: string } | { erro: string }} */
export function lerEmblema(dados) {
  if (typeof dados !== 'string' || !PREFIXO.test(dados)) return erro('Imagem inválida.');
  const base64 = dados.slice(dados.indexOf(',') + 1);
  if ((base64.length * 3) / 4 > CONFIG.sala.emblema.maxKB * 1024) return erro('A imagem é demasiado pesada.');
  let texto;
  try {
    texto = atob(base64);
  } catch {
    return erro('Imagem inválida.');
  }
  const bytes = Uint8Array.from(texto, (c) => c.charCodeAt(0));
  const tipo = tipoReal(bytes);
  return tipo ? { bytes, tipo } : erro('Imagem inválida.');
}
