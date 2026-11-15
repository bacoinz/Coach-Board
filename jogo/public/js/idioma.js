// Idioma do jogo: português (o original) ou inglês. Em inglês, cada texto que aparece no ecrã (do cliente ou do
// servidor) troca-se pela tradução de ingles.js, à medida que vai aparecendo. Mudar de idioma recarrega a página.
import { PARES, FRASES, COMIDAS, POSICOES, FACETAS, COMO_JOGAR } from './ingles.js';

const CHAVE = 'gaffer-idioma';

function escolhido() {
  if (typeof location === 'undefined') return 'pt'; // nos testes, sem browser
  const doLink = new URLSearchParams(location.search).get('lang');
  try {
    // Um link com ?lang=en fica escolhido para as próximas visitas.
    if (doLink === 'pt' || doLink === 'en') localStorage.setItem(CHAVE, doLink);
  } catch {}
  if (doLink === 'pt' || doLink === 'en') return doLink;
  try {
    const guardado = localStorage.getItem(CHAVE);
    if (guardado === 'pt' || guardado === 'en') return guardado;
  } catch {}
  return (navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export const IDIOMA = escolhido();
export const emIngles = IDIOMA === 'en';

export function mudarIdioma(idioma) {
  try {
    localStorage.setItem(CHAVE, idioma);
  } catch {}
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url);
}

// --- O dicionário: textos exatos e padrões com partes que mudam ---

const exatos = new Map();
const padroes = [];
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function juntar(pt, en) {
  if (!/\{\d+\}/.test(pt)) {
    if (!exatos.has(pt)) exatos.set(pt, en);
    return;
  }
  const ordem = [];
  const re = new RegExp(`^${escapar(pt).replace(/\\\{(\d+)\\\}/g, (_, d) => {
    ordem.push(Number(d));
    return '([\\s\\S]+?)';
  })}$`);
  padroes.push({ re, ordem, en, fixo: pt.replace(/\{\d+\}/g, '').length });
}

for (const [pt, en] of PARES) juntar(pt, en);
for (const [pt, en] of COMIDAS) juntar(pt, en);
// "Fulano tem uma pubalgia." e iguais: o nome muda, a frase traduz-se.
for (const [pt, en] of FRASES) {
  const a = pt.replace('{0}', '{1}');
  const b = en.replace('{0}', '{1}');
  juntar(pt, en);
  juntar(`{0} ${a}.`, `{0} ${b}.`);
  juntar(`{0} ${a}`, `{0} ${b}`);
}

// Os padrões com mais texto fixo são os mais específicos: experimentam-se primeiro.
padroes.sort((a, b) => b.fixo - a.fixo);

// Como se fala de uma equipa nas frases do servidor: "o mister Ana", "do Real Calhau".
const QUEM = [
  [/^O mister (.+)$/, 'Coach $1'],
  [/^(?:o|do|ao) mister (.+)$/, 'coach $1'],
  [/^(?:O|o|do|ao) (.+)$/, '$1'],
];

/** Valores em M€: "12,5 M€" passa a "€12.5M". */
function dinheiro(t) {
  const m = t.match(/^([+−-]?)(\d+)(?:,(\d+))? M€$/);
  return m ? `${m[1]}€${m[2]}${m[3] ? `.${m[3]}` : ''}M` : null;
}

/** "DD MD ED" ou "DC, MDC, MC": só siglas de posições. */
function posicoes(t) {
  const partes = t.split(/(,? )/);
  if (!partes.every((p, i) => (i % 2 ? true : POSICOES[p]))) return null;
  return partes.map((p, i) => (i % 2 ? p : POSICOES[p])).join('');
}

const cache = new Map();

function parte(t, profundidade) {
  const exato = exatos.get(t);
  if (exato !== undefined) return exato;
  const outro = dinheiro(t) ?? posicoes(t) ?? FACETAS[t];
  if (outro) return outro;
  if (profundidade > 3) return t;
  for (const p of padroes) {
    const m = t.match(p.re);
    if (!m) continue;
    return p.en.replace(/\{(\d+)\}/g, (_, d) => parte(m[p.ordem.indexOf(Number(d)) + 1], profundidade + 1));
  }
  if (profundidade > 0) for (const [re, en] of QUEM) if (re.test(t)) return t.replace(re, en);
  return t;
}

/** O texto no idioma escolhido. Em português, fica igual. */
export function traduzir(texto) {
  if (!emIngles || !texto) return texto;
  const m = texto.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const nucleo = m[2];
  if (!nucleo) return texto;
  let r = cache.get(nucleo);
  if (r === undefined) {
    r = parte(nucleo, 0);
    if (cache.size > 20000) cache.clear();
    cache.set(nucleo, r);
  }
  return m[1] + r + m[3];
}

// --- No ecrã: traduz o que já lá está e o que for aparecendo ---

const ATRIBUTOS = ['title', 'placeholder', 'aria-label', 'alt'];
const SVG = 'http://www.w3.org/2000/svg';

function traduzirAtributo(el, nome) {
  const v = el.getAttribute(nome);
  if (!v) return;
  const t = traduzir(v);
  if (t !== v) el.setAttribute(nome, t);
}

function traduzirNo(no) {
  if (no.nodeType === 3) {
    if (no.parentNode?.namespaceURI === SVG) return;
    const v = no.nodeValue;
    const t = traduzir(v);
    if (t !== v) no.nodeValue = t;
    return;
  }
  if (no.nodeType !== 1 || no.tagName === 'SCRIPT' || no.tagName === 'STYLE') return;
  for (const a of ATRIBUTOS) traduzirAtributo(no, a);
  if (no.namespaceURI === SVG) return; // as letras dos emblemas ficam como estão
  for (const filho of no.childNodes) traduzirNo(filho);
}

/** Liga a tradução do ecrã. Chama-se uma vez, antes de o jogo desenhar alguma coisa. */
export function instalarTradutor() {
  document.documentElement.lang = IDIOMA === 'en' ? 'en' : 'pt-PT';
  for (const el of document.querySelectorAll('[data-idioma]')) el.hidden = el.dataset.idioma !== IDIOMA;
  if (!emIngles) return;
  const como = document.querySelector('#dialogo-como .regras');
  if (como) como.innerHTML = COMO_JOGAR;
  traduzirNo(document.body);
  new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      if (m.type === 'characterData') traduzirNo(m.target);
      else if (m.type === 'attributes') traduzirAtributo(m.target, m.attributeName);
      else for (const no of m.addedNodes) traduzirNo(no);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
}

/** O nome do país de um jogador, a partir da bandeira (em português vem da base). */
const PAISES_UK = { 'gb-eng': 'England', 'gb-sct': 'Scotland', 'gb-wls': 'Wales', 'gb-nir': 'Northern Ireland' };
let nomesPaises = null;
export function nomeNacao(j) {
  if (!emIngles || !j.bandeira) return j.nacao;
  if (PAISES_UK[j.bandeira]) return PAISES_UK[j.bandeira];
  try {
    nomesPaises ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return nomesPaises.of(j.bandeira.toUpperCase()) ?? j.nacao;
  } catch {
    return j.nacao;
  }
}
