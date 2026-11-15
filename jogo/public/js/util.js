// Pequenos utilitários do cliente.
import { emIngles } from './idioma.js';

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Dinheiro em M€, à portuguesa ("12,5 M€") ou à inglesa ("€12.5M"). */
export const dinheiro = (v) => {
  const x = (Math.round((v ?? 0) * 10) / 10).toFixed(1);
  if (!emIngles) return `${x.replace('.', ',')} M€`;
  return x.startsWith('-') ? `−€${x.slice(1)}M` : `€${x}M`;
};

export function toast(texto, ms = 3200) {
  const caixa = $('#toasts');
  if (!caixa) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = texto;
  caixa.append(el);
  setTimeout(() => el.remove(), ms);
}

/** Token e nome guardados no browser. Com ?p=2, ?p=3… cada separador é um treinador diferente (para testar). */
export function identidade() {
  const perfil = new URLSearchParams(location.search).get('p');
  const sufixo = perfil ? `-${perfil}` : '';
  let token = localStorage.getItem(`gaffer-token${sufixo}`);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(`gaffer-token${sufixo}`, token);
  }
  return {
    token,
    get nome() {
      return localStorage.getItem(`gaffer-nome${sufixo}`) ?? '';
    },
    set nome(v) {
      localStorage.setItem(`gaffer-nome${sufixo}`, v);
    },
    sufixo: perfil ? `?p=${perfil}` : '',
  };
}
