// Seletor de cor do jogo, igual em todos os browsers: paleta, quadrado de tom, matiz e código hexadecimal.
// O botão comporta-se como um campo: tem `value` e lança `input` enquanto se escolhe e `change` quando a cor fica.

const PALETA = [
  '#ffffff', '#d1d5db', '#6b7280', '#111827', '#000000', '#fff6e3', '#e6b98a', '#7c4a21',
  '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d', '#fdba74', '#f97316', '#c2410c', '#facc15',
  '#ca8a04', '#bef264', '#22c55e', '#15803d', '#064e3b', '#5eead4', '#0f766e', '#7dd3fc',
  '#0ea5e9', '#2563eb', '#1e3a8a', '#01203e', '#a78bfa', '#7c3aed', '#f9a8d4', '#db2777',
];

export function botaoCor(valor, texto, atributos = '') {
  return `<button class="cor" type="button" data-seletor-cor value="${valor}" ${atributos}><span class="cor-amostra" style="background:${valor}"></span>${texto}</button>`;
}

function hexParaHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: h * 60, s: max ? d / max : 0, v: max };
}

function hsvParaHex({ h, s, v }) {
  const canal = (n) => {
    const k = (n + h / 60) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${canal(5)}${canal(3)}${canal(1)}`;
}

let painel = null;
let alvo = null; // o botão de onde se abriu
let hsv = null;
let mudou = false;

function construir() {
  painel = document.createElement('div');
  painel.className = 'seletor-cor';
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-label', 'Escolher cor');
  painel.innerHTML = `
    <div class="seletor-area"><span class="seletor-ponto"></span></div>
    <input class="slider seletor-matiz" type="range" min="0" max="359" aria-label="Matiz">
    <div class="seletor-hex"><span class="cor-amostra"></span><input class="campo" maxlength="7" spellcheck="false" aria-label="Código da cor"></div>
    <div class="seletor-paleta">${PALETA.map((c) => `<button type="button" data-paleta="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;

  const area = painel.querySelector('.seletor-area');
  const aPartirDoPonteiro = (ev) => {
    const r = area.getBoundingClientRect();
    hsv.s = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    hsv.v = 1 - Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
    aplicar(hsvParaHex(hsv));
  };
  area.addEventListener('pointerdown', (ev) => {
    area.setPointerCapture(ev.pointerId);
    aPartirDoPonteiro(ev);
  });
  area.addEventListener('pointermove', (ev) => area.hasPointerCapture(ev.pointerId) && aPartirDoPonteiro(ev));
  area.addEventListener('pointerup', confirmar);

  const matiz = painel.querySelector('.seletor-matiz');
  matiz.addEventListener('input', () => {
    hsv.h = Number(matiz.value);
    aplicar(hsvParaHex(hsv));
  });
  matiz.addEventListener('change', confirmar);

  painel.querySelector('.seletor-hex input').addEventListener('input', (ev) => {
    const v = ev.target.value.trim();
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    hsv = { ...hexParaHsv(v) };
    aplicar(v.toLowerCase(), true);
    confirmar();
  });
  painel.addEventListener('click', (ev) => {
    const c = ev.target.dataset?.paleta;
    if (!c) return;
    hsv = hexParaHsv(c);
    aplicar(c);
    confirmar();
  });
}

function desenhar(hex, aEscrever = false) {
  painel.querySelector('.seletor-area').style.setProperty('--matiz', `hsl(${hsv.h} 100% 50%)`);
  const ponto = painel.querySelector('.seletor-ponto');
  ponto.style.left = `${hsv.s * 100}%`;
  ponto.style.top = `${(1 - hsv.v) * 100}%`;
  ponto.style.background = hex;
  painel.querySelector('.seletor-matiz').value = Math.round(hsv.h);
  painel.querySelector('.seletor-hex .cor-amostra').style.background = hex;
  if (!aEscrever) painel.querySelector('.seletor-hex input').value = hex;
  painel.querySelectorAll('[data-paleta]').forEach((b) => b.classList.toggle('escolhida', b.dataset.paleta === hex));
}

function aplicar(hex, aEscrever = false) {
  desenhar(hex, aEscrever);
  alvo.value = hex;
  alvo.querySelector('.cor-amostra').style.background = hex;
  mudou = true;
  alvo.dispatchEvent(new Event('input', { bubbles: true }));
}

function confirmar() {
  if (!mudou || !alvo) return;
  mudou = false;
  alvo.dispatchEvent(new Event('change', { bubbles: true }));
}

function abrir(botao) {
  if (!painel) construir();
  alvo = botao;
  hsv = hexParaHsv(botao.value);
  // Dentro de um diálogo modal tem de ficar lá dentro, senão fica por baixo.
  (botao.closest('dialog') ?? document.body).append(painel);
  painel.hidden = false;
  desenhar(botao.value);
  const r = botao.getBoundingClientRect();
  const { offsetWidth: w, offsetHeight: h } = painel;
  const cima = r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8;
  painel.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left))}px`;
  painel.style.top = `${cima}px`;
}

/** A cor que o treinador está a escolher neste botão, para o estado que chega não a desfazer. */
export const corEmEdicao = (botao) => botao === alvo;

export function fecharSeletorCor() {
  if (!alvo) return;
  confirmar();
  alvo = null;
  painel.hidden = true;
}

document.addEventListener('click', (ev) => {
  const botao = ev.target.closest('[data-seletor-cor]');
  if (botao) {
    const eraEste = botao === alvo;
    fecharSeletorCor();
    if (!eraEste) abrir(botao);
  }
});
document.addEventListener('pointerdown', (ev) => {
  if (alvo && !ev.target.closest('.seletor-cor, [data-seletor-cor]')) fecharSeletorCor();
});
// Esc fecha só o seletor, não o diálogo onde ele está.
document.addEventListener('cancel', (ev) => {
  if (alvo) {
    ev.preventDefault();
    fecharSeletorCor();
  }
}, true);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') fecharSeletorCor();
});
// Fica preso ao botão: se a página andar, fecha-se em vez de ficar a flutuar longe dele.
addEventListener('scroll', fecharSeletorCor, true);
