// Gera public/dados/demo.json, os estados que a demo mostra. Corre antes de cada `wrangler dev`/`deploy`, com o gerar-comum.
import { readFileSync, writeFileSync } from 'node:fs';
import { lerBase, descomprimir } from '../src/motor/base.js';
import { gerarPassos } from './demo-guiao.mjs';

const pasta = new URL('../public/dados/', import.meta.url);
const base = lerBase(await descomprimir(readFileSync(new URL('jogadores.bin', pasta)))).jogadores;
const { semente, passos } = gerarPassos(base);
const texto = JSON.stringify({ passos });
writeFileSync(new URL('demo.json', pasta), texto);
console.log(`Demo: ${passos.length} passos, semente ${semente}, ${Math.round(texto.length / 1024)} KB.`);
