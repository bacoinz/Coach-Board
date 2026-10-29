// Aleatoriedade do motor. Todas as funções recebem o gerador (rng: () => [0, 1)), para que os testes e as
// simulações usem uma semente e o Durable Object use Math.random.

/** Gerador com semente (mulberry32). */
export function criarAleatorio(semente = 1) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro entre a e b, inclusivos. */
export const inteiro = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

export const dado = (rng) => inteiro(rng, 1, 6);

export const escolher = (rng, lista) => (lista.length ? lista[Math.floor(rng() * lista.length)] : undefined);

/** Cópia baralhada (Fisher–Yates). */
export function baralhar(rng, lista) {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Sorteia n elementos distintos. */
export const amostra = (rng, lista, n) => baralhar(rng, lista).slice(0, n);

/** Sorteio com peso: pares [item, peso]. */
export function comPeso(rng, pares) {
  const total = pares.reduce((s, [, p]) => s + p, 0);
  let x = rng() * total;
  for (const [item, peso] of pares) {
    if ((x -= peso) < 0) return item;
  }
  return pares.at(-1)?.[0];
}
