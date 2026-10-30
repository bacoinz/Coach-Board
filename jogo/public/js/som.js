// Os sons do jogo, sintetizados: nada para descarregar. O volume fica guardado neste browser.
const CHAVE = 'gaffer-volume';
let contexto = null;
let nivel = 0.5;
try {
  const guardado = localStorage.getItem(CHAVE);
  if (guardado != null) nivel = Number(guardado);
} catch {
  // Sem armazenamento: fica o volume por omissão.
}

export const volume = () => nivel;

export function mudarVolume(v) {
  nivel = v;
  try {
    localStorage.setItem(CHAVE, String(v));
  } catch {
    // Sem armazenamento, o volume dura só esta sessão.
  }
}

function nota(freq, inicio, duracao, tipo = 'sine', ganho = 0.3) {
  const osc = contexto.createOscillator();
  const g = contexto.createGain();
  osc.type = tipo;
  osc.frequency.value = freq;
  const t = contexto.currentTime + inicio;
  g.gain.setValueAtTime(ganho * nivel, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duracao);
  osc.connect(g).connect(contexto.destination);
  osc.start(t);
  osc.stop(t + duracao);
}

const SONS = {
  // Os dados a bater na mesa, cada vez mais devagar.
  dado: () => [0, 0.14, 0.32, 0.56, 0.84].forEach((t, i) => nota(220 + i * 40, t, 0.05, 'square', 0.14)),
  golo: () => [523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.11, 0.3, 'triangle')),
  vez: () => nota(880, 0, 0.18, 'sine', 0.2),
};

export function tocar(som) {
  if (!nivel) return;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === 'suspended') contexto.resume();
    SONS[som]();
  } catch {
    // Sem áudio, o jogo continua.
  }
}
