// A demo: mostra os estados de uma partida já jogada (public/dados/demo.json, de scripts/demo-guiao.mjs) nos ecrãs a sério
// do jogo, com um texto a explicar cada momento. Quem vê só lê e carrega em "Próximo passo": nada vai para o servidor.
import { $, $$, esc } from './util.js';

const PODE_CARREGAR = [
  '.demo-guia',
  '[data-acao=fim-aba]',
  '[data-acao=fim-continuar]',
  '[data-separador]',
  '[data-contrato]',
  '.carta-clicavel[data-jogador]',
  '.dialogo-jogador [data-fechar]',
  '.dialogo-registo [data-fechar]',
].join(', ');

/**
 * @param {object} o
 * @param {(passo: {sala: object, eu: object}) => void} o.mostrarEstado desenha o estado deste passo
 * @param {(nome: string) => void} o.abrir abre um diálogo do jogo (o plantel ou as classificações)
 */
export async function iniciarDemo({ mostrarEstado, abrir }) {
  const resposta = await fetch('/dados/demo.json');
  if (!resposta.ok) throw new Error('Não foi possível carregar a demo.');
  const { passos } = await resposta.json();
  let atual = -1;

  // Um diálogo modal bloquearia o guia, por isso as cartas abrem-se como os outros.
  HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.show;
  document.body.classList.add('modo-demo');
  const guia = document.createElement('aside');
  guia.className = 'demo-guia painel';
  guia.setAttribute('aria-live', 'polite');
  document.body.append(guia);

  // O jogo fica só para ver: dá para fazer scroll, abrir fichas e mudar de separador, mas o resto dos cliques não conta.
  for (const tipo of ['click', 'pointerdown', 'submit', 'change']) {
    document.addEventListener(tipo, (ev) => {
      // Na demo a ficha não tem o fundo escuro de um diálogo modal: fecha-se aqui ao clicar fora dela.
      const ficha = $('#dialogo-jogador');
      if (tipo === 'click' && ficha.open && !ev.target.closest('.dialogo-jogador')) ficha.close();
      if (ev.target.closest(PODE_CARREGAR)) return;
      ev.preventDefault();
      ev.stopPropagation();
    }, true);
  }

  function ir(i) {
    if (i < 0 || i >= passos.length) return;
    atual = i;
    const p = passos[i];
    for (const d of $$('dialog[open]')) d.close();
    for (const el of $$('.demo-alvo')) el.classList.remove('demo-alvo');
    mostrarEstado(p);
    if (p.abrir) abrir(p.abrir);
    if (p.alvo) $(p.alvo)?.classList.add('demo-alvo');
    const fim = i === passos.length - 1;
    guia.innerHTML = `
      <div class="demo-progresso" role="progressbar" aria-valuemin="1" aria-valuemax="${passos.length}" aria-valuenow="${i + 1}"><span style="width:${((i + 1) / passos.length) * 100}%"></span></div>
      <p class="rotulo">Demo · passo ${i + 1} de ${passos.length}</p>
      <h2 class="demo-titulo">${esc(p.titulo)}</h2>
      ${p.texto.map((x) => `<p class="demo-texto">${esc(x)}</p>`).join('')}
      <div class="demo-botoes">
        <button class="btn btn-contorno btn-mini" type="button" data-demo="anterior" ${i === 0 ? 'disabled' : ''}>Anterior</button>
        ${fim ? '<a class="btn btn-contorno btn-mini" href="/">Voltar ao menu</a>' : '<button class="btn btn-contorno btn-mini" type="button" data-demo="seguinte">Próximo passo</button>'}
      </div>
      ${fim ? '' : '<a class="demo-sair" href="/">Sair da demo</a>'}`;
    guia.querySelector('[data-demo=seguinte], a.btn')?.focus({ preventScroll: true });
    guia.scrollTop = 0;
    colocarLegenda();
  }

  /** A legenda de quem é a vez e o treinador da esquerda ficam por baixo do guia. */
  function colocarLegenda() {
    const legenda = $('#legenda-vez');
    const palco = $('#palco');
    if (!legenda || !palco) return;
    const fundo = guia.getBoundingClientRect().bottom;
    document.documentElement.style.setProperty('--demo-fundo', `${fundo}px`);
    legenda.style.top = matchMedia('(min-width: 801px)').matches ? `${fundo - palco.getBoundingClientRect().top + 8}px` : '';
  }
  addEventListener('resize', colocarLegenda);

  guia.addEventListener('click', (ev) => {
    // O jogo fecha o plantel com um clique fora dele: este clique não é para o jogo.
    ev.stopPropagation();
    const botao = ev.target.closest('[data-demo]');
    if (botao) ir(atual + (botao.dataset.demo === 'seguinte' ? 1 : -1));
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight') ir(atual + 1);
    if (ev.key === 'ArrowLeft') ir(atual - 1);
  });
  // /demo?passo=5 abre logo nesse passo (serve para as imagens do README).
  const pedido = Number(new URLSearchParams(location.search).get('passo'));
  ir(Number.isInteger(pedido) && pedido >= 1 ? Math.min(pedido, passos.length) - 1 : 0);
}
