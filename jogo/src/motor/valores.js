// Valor de mercado, cláusula, salário e preços derivados. Tudo a partir do overall e da idade (config.valores).
import { CONFIG } from '../config.js';

const V = CONFIG.valores;

export function arredondar(valor, passo = V.arredondar) {
  return Math.round(valor / passo) * passo;
}

export function fatorIdade(idade) {
  return (V.idade.find((e) => idade <= e.ate) ?? V.idade.at(-1)).fator;
}

/** Valor de mercado em M€. */
export function valorMercado(overall, idade) {
  const pontos = V.curva * (Math.min(overall, V.joelho) - V.overallBase) + V.curvaTopo * Math.max(0, overall - V.joelho);
  const bruto = V.base * Math.exp(pontos) * fatorIdade(idade);
  return Math.max(V.minimo, arredondar(bruto));
}

/** Cláusula de rescisão: 1,5× o valor, ou o multiplicador do Empresário. */
export function clausula(valor, multiplicador = V.clausula) {
  return arredondar(valor * multiplicador);
}

/** Preço de venda à banca (preço base). */
export function precoBase(valor) {
  return Math.max(V.minimo, arredondar(valor * V.precoBase));
}

/** Preço de uma escolha do draft. */
export function precoDraft(valor) {
  return Math.max(V.minimo, arredondar(valor * V.precoDraft));
}

/** Salário cobrado em cada jornada: o salário da época dividido pelas jornadas. Sem arredondar (é residual). */
export function salarioJornada(valor, jornadasEpoca) {
  return (valor * V.salarioEpoca) / jornadasEpoca;
}

/** Idade (anos completos) numa data, a partir da data de nascimento ISO. */
export function idadeEm(nascimento, data) {
  const n = new Date(nascimento);
  const d = new Date(data);
  let idade = d.getUTCFullYear() - n.getUTCFullYear();
  if (d.getUTCMonth() < n.getUTCMonth() || (d.getUTCMonth() === n.getUTCMonth() && d.getUTCDate() < n.getUTCDate())) idade--;
  return idade;
}
