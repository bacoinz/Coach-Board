// Cliente do The Gaffer: ecrãs de início e lobby, e a janela de transferências (tabuleiro 2D, draft, leilões,
// propostas, fecho). O servidor é autoritativo: aqui só se desenha o estado e se enviam intenções.
import { Ligacao } from './ligacao.js';
import { CONFIG } from './comum/config.gen.js';
import { onzeEscolhido, overallNaPosicao, overallNatural } from './comum/formacao.gen.js';
import { equipamentoSVG, emblemaSVG, PADROES } from './equipamento.js';
import { moedaEmpresarioSVG, moedaMedicoSVG } from './moedas.js';
import { CASA, instalarFundos, simboloSVG } from './casas.js';
import { abrirCriadorEmblema } from './emblemas.js';
import { botaoCor, corEmEdicao } from './seletor-cor.js';
import { LOGOS } from './comum/logos.gen.js';
import { tocar, volume, mudarVolume } from './som.js';
import { cartaHTML, miniCartaHTML, posicao, nivel } from './carta.js';
import { campoHTML } from './campo.js';
import { tabuleiroHTML, dadoHTML } from './tabuleiro2d.js';
import { Relvado } from './relvado.js';
import { $, $$, esc, dinheiro, toast, identidade } from './util.js';

const ID = identidade();
let ligacao = null;
let S = null; // estado público da sala
let EU = null; // parte privada
let codigoSala = null;
let separador = 'atual';
let ClasseDados = null; // os dados 3D do jogo, quando o 3D já carregou
let abrirSub = false; // a lista de quem pode sair
let fecho = null; // { doze } quando o treinador escolhe o 12.º no fecho
let lanceProposto = null;
let equipaAberta = null; // a equipa mostrada no diálogo do onze
let vista3d = null; // o tabuleiro 3D, quando já carregou
let semWebgl = new URLSearchParams(location.search).has('2d'); // sem WebGL, fica o tabuleiro 2D
let aCarregar3d = false;
let relvado2d = null; // sem WebGL, o jogo desenha-se num canvas normal

// --- Navegação ---

function mostrar(ecra) {
  for (const id of ['inicio', 'nome', 'lobby', 'jogo']) $(`#ecra-${id}`).hidden = id !== ecra;
}

function arrancar() {
  if (/^\/demo\/?$/.test(location.pathname)) return arrancarDemo();
  const m = location.pathname.match(/^\/sala\/([A-Za-z]{4})\/?$/);
  if (!m) {
    $('#nome').value = ID.nome;
    mostrar('inicio');
    return;
  }
  codigoSala = m[1].toUpperCase();
  if (!ID.nome) {
    $('#nome-codigo').textContent = codigoSala;
    mostrar('nome');
    return;
  }
  ligar();
}

/** A demo não fala com o servidor: desenha estados já gravados, como se tivessem chegado pela ligação. */
async function arrancarDemo() {
  const { iniciarDemo } = await import('./demo.js');
  try {
    await iniciarDemo({
      mostrarEstado: ({ sala, eu }) => {
        passoFimEpoca = 1;
        abaFimEpoca = 'marcadores';
        separador = 'atual';
        aoMensagem({ t: 'estado', sala, eu });
      },
      abrir: (nome) => {
        const d = $(`#dialogo-${nome}`);
        if (d.open) return;
        (nome === 'plantel' ? desenharPlantel : desenharClassificacoes)();
        d.show();
      },
    });
  } catch (e) {
    $('#erro-inicio').textContent = e.message;
    mostrar('inicio');
  }
}

function ligar() {
  $('#aviso-ligacao').hidden = false;
  ligacao = new Ligacao({
    codigo: codigoSala,
    identidade: () => ({ token: ID.token, nome: ID.nome }),
    aoEstado: (ligado) => ($('#aviso-ligacao').hidden = ligado),
    aoMensagem,
  });
  ligacao.ligar();
}

function aoMensagem(msg) {
  if (msg.t === 'estado') {
    const antes = S;
    S = msg.sala;
    EU = msg.eu;
    desenhar();
    notificarPlantel(antes);
  } else if (msg.t === 'erro') {
    toast(msg.msg);
    if (msg.fatal) {
      $('#erro-inicio').textContent = msg.msg;
      history.replaceState(null, '', `/${ID.sufixo}`);
      mostrar('inicio');
    }
  }
}

const enviar = (obj) => ligacao?.enviar(obj) || toast('Sem ligação ao servidor.');

// --- Atalhos do estado ---

const minhaEquipa = () => (EU && S ? S.equipas[EU.equipa] : null);
const souAnfitriao = () => S && EU && S.anfitriao === EU.id;
const equipa = (id) => S.equipas[id];
const jogador = (id) => S.jogadores[id];
/** O que o suplente de um lesionado perde, se entrar fora das suas posições. */
const textoForaDePosicao = (j, posicao) => (overallNatural(j, posicao) == null ? ` (−${CONFIG.jogo.lesao.foraDePosicao}, fora de posição)` : '');
const nomeEquipa = (id) => esc(S.equipas[id]?.nome ?? '?');
const kit = (e, tamanho = 30) => equipamentoSVG({ ...e.kit, tamanho });
const treinador = (id) => S.treinadores.find((t) => t.id === id);

function desenhar() {
  if (!S) return;
  if (S.fase === 'lobby') {
    mostrar('lobby');
    desenharLobby();
  } else {
    mostrar('jogo');
    desenharJogo();
  }
}

// --- Lobby ---

// Cada cartão só se desenha quando muda: assim ninguém perde o que está a escrever ou a arrastar quando outro treinador mexe.
const lobbyDesenhado = new Map();
function cartaoLobby(id, html) {
  if (lobbyDesenhado.get(id) === html && $(`#${id}`).innerHTML) return;
  lobbyDesenhado.set(id, html);
  $(`#${id}`).innerHTML = html;
}

function desenharLobby() {
  const eu = minhaEquipa();
  const anf = souAnfitriao();
  if (!$('#lobby-sala')) {
    lobbyDesenhado.clear();
    $('#lobby').innerHTML = `
      <section id="lobby-sala" class="cartao lobby-area-sala"></section>
      <section id="lobby-treinadores" class="cartao lobby-area-treinadores"></section>
      <section id="lobby-config" class="cartao lobby-config lobby-area-config"></section>
      <section id="editor-equipa" class="cartao lobby-area-equipa"></section>
      <section id="lobby-pronto" class="cartao lobby-area-pronto"></section>`;
  }
  const equipas = S.treinadores.filter((t) => !t.saiu).map((t) => {
    const e = equipa(t.equipa);
    return `<li class="linha-equipa${t.id === EU.id ? ' eu' : ''}${t.ligado ? '' : ' desligado'}">${emblemaSVG(e, 38)}${kit(e, 38)}
      <span class="quem"><strong>${esc(e.nome)}</strong><small><span class="ponto" style="display:inline-block;background:${t.cor}"></span> ${esc(t.nome)}${S.anfitriao === t.id ? ' <span class="coroa" title="Anfitrião">👑</span>' : ''}</small></span>
      <span class="etiqueta${t.pronto ? ' etiqueta-pronto' : ''}">${t.pronto ? 'Pronto' : 'A preparar'}</span></li>`;
  }).join('');
  const seg = (campo, valor, texto, sub = '') =>
    `<button class="segmento" role="radio" aria-checked="${S.config[campo] === valor}" data-config="${campo}" data-valor="${valor}" ${anf ? '' : 'disabled'}>${texto}${sub ? `<small>${sub}</small>` : ''}</button>`;
  const treinadores = S.treinadores.filter((t) => !t.saiu).length;
  // "Sem bots" com treinadores ímpares: entra um bot, para todos jogarem em todas as jornadas.
  const botExtra = S.config.bots === 0 && treinadores % 2 === 1;
  const total = treinadores + S.config.bots + (botExtra ? 1 : 0);
  const jornadas = 2 * (total % 2 ? total : total - 1);
  const { maxBots } = CONFIG.sala;
  cartaoLobby('lobby-sala', `
      <div class="lobby-sala">
        <div><p class="rotulo">Sala</p><p class="codigo-grande">${S.codigo}</p></div>
        <button class="btn btn-fantasma" type="button" data-acao="copiar">Copiar link</button>
      </div>
      <p class="nota">Partilha o link no Discord. Quem entrar depois de a partida começar fica a ver até à janela seguinte.</p>`);
  cartaoLobby('lobby-treinadores', `
      <p class="rotulo">Treinadores <small>(${treinadores}/${CONFIG.sala.maxTreinadores})</small></p>
      <ul class="lista-equipas">${equipas}</ul>`);
  cartaoLobby('lobby-config', `
      <p class="rotulo">Duração</p>
      <div class="segmentos" role="radiogroup" aria-label="Duração">${CONFIG.sala.epocas.map((n) => seg('epocas', n, `${n} épocas`)).join('')}</div>
      <label class="rotulo slider-rotulo" for="slider-bots">Equipas bot <strong id="valor-bots">${S.config.bots}</strong></label>
      <input id="slider-bots" class="slider" type="range" min="0" max="${maxBots}" step="1" value="${S.config.bots}" style="--p:${(S.config.bots / maxBots) * 100}%" ${anf ? '' : 'disabled'}>
      <div class="slider-marcas" aria-hidden="true">${Array.from({ length: maxBots + 1 }, (_, n) => `<span>${n}</span>`).join('')}</div>
      <div class="segmentos" role="radiogroup" aria-label="Nível dos bots">${seg('nivelBots', 'inferior', 'Inferior', 'overall mais baixo')}${seg('nivelBots', 'equivalente', 'Equivalente', 'como os treinadores')}</div>
      <p class="nota">${anf ? 'És o anfitrião.' : 'Só o anfitrião muda a configuração.'} ${total} equipas = ${jornadas} jornadas por época.${botExtra ? ' Como são ímpares, entra 1 bot para todos jogarem sempre.' : ''}</p>`);
  desenharEditor(eu);
  cartaoLobby('lobby-pronto', `
      <div class="lobby-botoes">
        <button class="btn ${treinador(EU.id).pronto ? 'btn-fantasma' : 'btn-principal'}" type="button" data-acao="pronto">${treinador(EU.id).pronto ? 'NÃO ESTOU PRONTO' : 'Estou pronto'}</button>
        ${anf ? `<button class="btn btn-principal" type="button" data-acao="comecar" ${S.faltaParaComecar ? 'disabled' : ''}>Começar partida</button>` : ''}
      </div>
      <p class="nota centro">${esc(S.faltaParaComecar ?? (anf ? 'Todos prontos: podes começar.' : 'À espera do anfitrião.'))}</p>`);
}

function previaEquipaHTML(e) {
  return `<button class="emblema-botao" type="button" data-acao="abrir-emblema" aria-label="Mudar o emblema">${emblemaSVG(e, 88)}<span>${e.emblema ? 'Mudar emblema' : 'Criar emblema'}</span></button>
    ${equipamentoSVG({ ...e.kit, tamanho: 132 })}`;
}

function padroesHTML(kitAtual) {
  return PADROES.map((p) => `
    <button class="segmento" type="button" role="radio" aria-checked="${p.id === kitAtual.padrao}" data-padrao="${p.id}" title="${p.nome}">${equipamentoSVG({ ...kitAtual, padrao: p.id, tamanho: 44 })}<small>${p.curto}</small></button>`).join('');
}

/** O equipamento e o emblema mudam logo; o nome e as cores não se tocam enquanto o treinador mexe neles. */
function desenharEditor(e) {
  const caixa = $('#editor-equipa');
  if (!caixa.innerHTML) {
    caixa.innerHTML = `
      <p class="rotulo">A tua equipa</p>
      <div class="editor-equipa">
        <div class="editor-previa"></div>
        <div class="lobby-config">
          <input id="nome-equipa" class="campo" maxlength="24" aria-label="Nome da equipa">
          <div class="cores">${botaoCor(e.kit.principal, 'Principal', 'id="cor-1"')}${botaoCor(e.kit.secundaria, 'Secundária', 'id="cor-2"')}</div>
          <div class="padroes" role="radiogroup" aria-label="Equipamento"></div>
        </div>
      </div>`;
  }
  const nome = $('#nome-equipa');
  if (document.activeElement !== nome) nome.value = e.nome;
  for (const [id, cor] of [['#cor-1', e.kit.principal], ['#cor-2', e.kit.secundaria]]) {
    const b = $(id);
    if (corEmEdicao(b)) continue;
    b.value = cor;
    b.querySelector('.cor-amostra').style.background = cor;
  }
  const kitAtual = { ...e.kit, principal: $('#cor-1').value, secundaria: $('#cor-2').value };
  $('.editor-previa').innerHTML = previaEquipaHTML({ ...e, kit: kitAtual });
  $('.padroes').innerHTML = padroesHTML(kitAtual);
}

// --- Jogo ---

const FASES = { formacao: 'Formação', draft: 'Draft', tabuleiro: 'Tabuleiro', fecho: 'Fecho' };

let ateMostrar = 0; // o painel em cima do relvado espera que acabem os dados e o peão
let temporizadorPainel = null;
let vezAnterior = null;
let chaveFecho = null;
let temporizadorRelato = null;

/** Enquanto a animação decorre, o relvado fica à vista. */
function segurarPainel(ms) {
  ateMostrar = performance.now() + ms;
  clearTimeout(temporizadorPainel);
  temporizadorPainel = setTimeout(() => S && desenharPainel(), ms + 30);
}

/** O jogo de que se fala no ecrã: o meu ou, se não jogar, o primeiro. */
function jogoVisivel() {
  const c = S.campeonato;
  if (S.fase !== 'campeonato' || !c) return null;
  if (c.jogos?.length) {
    const jogo = c.jogos.find((x) => x.lados.some((l) => l.equipa === EU?.equipa)) ?? c.jogos[0];
    return { jogo, equipas: jogo.lados.map((l) => l.equipa) };
  }
  const par = c.calendario?.find((p) => p.includes(EU?.equipa)) ?? c.calendario?.[0];
  return par ? { jogo: null, equipas: par } : null;
}

function desenharJogo() {
  const e = minhaEquipa();
  const j = S.janela;
  let info = `<span class="ronda">Época ${S.epoca}/${S.config.epocas}</span> · `;
  if (S.fase === 'janela') info += `Janela de transferências de ${j.tipo === 'verao' ? 'verão' : 'inverno'} · ${FASES[j.fase]}`;
  else if (S.fase === 'campeonato') info += S.campeonato.competicao === 'taca' ? `Taça · ${S.campeonato.ronda}` : `Campeonato · ${S.campeonato.volta}.ª volta · jornada ${Math.min(S.campeonato.jornada + 1, S.campeonato.jornadas)}`;
  else if (S.fase === 'fimEpoca') info += 'Fim da época';
  else info += 'Fim da partida';
  $('#barra-info').innerHTML = info;

  const visivel = jogoVisivel();
  $('#palco').classList.toggle('em-jogo', Boolean(visivel));
  desenharTabuleiro();
  desenharPainel();
  desenharMarcador(visivel);
  $('#caixa-lance').hidden = !visivel?.jogo;
  $('#registo-jogo').hidden = !visivel?.jogo;
  if (visivel) atualizarAoVivo();
  else {
    desenharTreinadores();
    desenharBarra(null);
  }
  desenharAnfitriao();
  const total = j?.fase === 'tabuleiro' ? CONFIG.tabuleiro.voltas[j.tipo] * CONFIG.tabuleiro.casas.length : 0;
  const vez = j?.fase === 'tabuleiro' && !j.ordem.every((id) => j.andadas[id] >= total) ? j.ordem[j.vez] : null;
  $('#legenda-vez').innerHTML = vez ? `Vez de <strong>${nomeEquipa(vez)}</strong> · Ronda ${j.ronda}` : '';
  if (vez && vez === e?.id && vez !== vezAnterior) tocar('vez');
  vezAnterior = vez;
  if ($('#dialogo-equipa').open) desenharEquipa();
  if ($('#dialogo-plantel').open) desenharPlantel();
  mostrarEmprestados();
  if (fechoAberto()) {
    const chave = `${S.epoca}-${j.tipo}`;
    if (chaveFecho !== chave) {
      chaveFecho = chave;
      fecho = null;
      desenharPlantel();
      $('#dialogo-plantel').show();
    }
  }
  if ($('#dialogo-registo').open) desenharRegisto();
  if ($('#dialogo-classificacoes').open) desenharClassificacoes();
}

function desenharPainel() {
  const el = $('#col-acao');
  depoisDaAnimacao();
  const html = performance.now() < ateMostrar ? '' : painelAcao().trim();
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  el.innerHTML = html;
  el.hidden = !html;
}

/** O painel e a carta em grande só aparecem depois de os dados e o peão pararem. */
function depoisDaAnimacao() {
  if (performance.now() >= ateMostrar) mostrarCarta();
}

/** O 3D carrega só quando é preciso: até lá, e sem WebGL, fica o tabuleiro 2D. */
function desenharTabuleiro() {
  const j = S.janela;
  $('#palco').classList.toggle('sem-3d', semWebgl);
  if (vista3d) {
    const espera = vista3d.atualizar(S, EU);
    if (espera) {
      segurarPainel(espera);
      tocar('dado');
      mostrarSoma(espera);
    }
    tituloDaCasa(espera);
    return;
  }
  iniciar3d();
  const jogos = S.campeonato?.jogos ?? [];
  if (semWebgl && S.fase === 'campeonato' && jogos.length) return desenharJogoSem3d(jogos);
  relvado2d = null;
  $('#col-tabuleiro').innerHTML = tabuleiroHTML({
    posicoes: j?.posicao ?? null,
    equipas: S.equipas,
    vez: j?.fase === 'tabuleiro' ? j.ordem[j.vez] : null,
    centro: centroTabuleiro(),
  });
}

/** Sem WebGL, o jogo aparece num canvas em vez do relvado 3D. */
function desenharJogoSem3d(jogos) {
  if (!relvado2d) {
    $('#col-tabuleiro').innerHTML = '<canvas id="relvado-2d" class="relvado-2d"></canvas>';
    relvado2d = new Relvado($('#relvado-2d'), { aoGolo: () => tocar('golo') });
    const passo = () => {
      if (!relvado2d) return;
      relvado2d.tick(performance.now());
      setTimeout(passo, 66);
    };
    passo();
  }
  const meu = jogos.find((x) => x.lados.some((l) => l.equipa === EU?.equipa)) ?? jogos[0];
  relvado2d.definirJogo(meu, S.equipas, performance.now(), { espelho: meu.lados[1].equipa === EU?.equipa });
}

async function iniciar3d() {
  if (vista3d || semWebgl || aCarregar3d) return;
  aCarregar3d = true;
  try {
    const teste = document.createElement('canvas');
    if (!teste.getContext('webgl2') && !teste.getContext('webgl')) throw new Error('sem WebGL');
    const { Tabuleiro3D, DadosJogo, DURACAO_DADOS } = await import('./tabuleiro3d.js');
    ClasseDados = DadosJogo;
    $('#col-tabuleiro').innerHTML = '<div id="caixa-3d" class="caixa-3d"></div>';
    vista3d = new Tabuleiro3D($('#caixa-3d'), { aoGolo: () => tocar('golo'), zona: $('.centro-tabuleiro') });
    vista3d.duracaoDados = DURACAO_DADOS;
    desenhar();
  } catch (e) {
    console.warn('Sem tabuleiro 3D:', e);
    semWebgl = true;
    desenhar();
  }
}

/** O centro do tabuleiro 2D (só sem WebGL). */
function centroTabuleiro() {
  const l = S.janela?.ultimoLance;
  const dados = l ? `<div class="dados">${l.dados.map(dadoHTML).join('')}</div><p class="nota">${nomeEquipa(l.equipa)}</p>` : '';
  return `<img src="/favicon.svg" alt="" width="44" height="44" class="centro-logo">${dados}`;
}

function painelAcao() {
  if (S.fase !== 'fimEpoca') passoFimEpoca = 1;
  if (S.fase === 'fim') return painelFim();
  if (S.fase === 'fimEpoca') return painelFimEpoca();
  if (S.fase === 'campeonato') return painelCampeonato();
  const e = minhaEquipa();
  if (!e || e.espera) return '<h2 class="painel-titulo">A ver</h2><p>Entraste a meio: jogas a partir da próxima janela.</p>';
  const j = S.janela;
  if (j.fase === 'formacao') return painelFormacao(e);
  if (j.fase === 'draft') return painelDraft(e);
  if (j.fase === 'fecho') return painelFecho(e);
  return painelTabuleiro(e);
}

/** Durante a janela pode-se ficar em saldo negativo, até ao limite. */
const podePagar = (e, valor) => e.dinheiro - valor >= S.saldoMinimo;

function painelFormacao(e) {
  const j = S.janela;
  const falta = Object.values(S.equipas).filter((x) => x.treinador && !x.espera && !j.prontos.includes(x.id)).map((x) => esc(x.nome));
  const botoes = Object.keys(CONFIG.formacoes).map((f) => `<button class="segmento" role="radio" aria-checked="${e.formacao === f && j.prontos.includes(e.id)}" data-acao="formacao" data-formacao="${f}">${f}</button>`).join('');
  const emprestados = e.plantel.map(jogador).filter((x) => x?.emprestadoLesao);
  return `<h2 class="painel-titulo">Formação</h2>
    <p>Escolhe a formação para esta janela de transferências.</p>
    <div class="segmentos">${botoes}</div>
    ${emprestados.map((x) => `<div class="destaque-carta"><div class="carta-clicavel" data-jogador="${x.id}">${cartaHTML(x, { tamanho: 'pequena' })}</div>
      <div class="leilao-info info-esquerda"><p>${esc(x.curto)} estava emprestado e sai quando escolheres a formação. Podes comprá-lo.</p>
      <button class="btn btn-principal" data-acao="comprar_emprestado" data-jogador="${x.id}" ${podePagar(e, x.valor) ? '' : 'disabled'}>Comprar por ${dinheiro(x.valor)}</button></div></div>`).join('')}
    <p class="nota">${falta.length ? `Falta: ${falta.join(', ')}` : ''}</p>`;
}

/** À parte, os jovens que já temos, para comparar com as opções do draft. */
function formacaoDraftHTML(e) {
  const jovens = e.plantel.map(jogador).filter((x) => x?.formacao).sort((a, b) => b.overall - a.overall);
  return `<aside class="draft-formacao">
    <p class="rotulo">A tua formação</p>
    ${jovens.length
      ? `<div class="draft-formacao-cartas">${jovens.map((x) => `<div class="carta-clicavel" data-jogador="${x.id}">${cartaHTML(x, { tamanho: 'pequena' })}</div>`).join('')}</div>`
      : '<p class="nota">Ainda não tens jovens na formação.</p>'}
  </aside>`;
}

function painelDraft(e) {
  const d = S.janela.draft;
  const atual = d.escolhas[d.i];
  const minha = atual.equipa === e.id;
  const tipo = atual.tipo === 'jovem' ? 'jovem promessa' : 'segunda escolha (só se vende à banca)';
  const cartas = d.opcoes.map(({ id, preco }) => {
    const jg = jogador(id);
    const botao = minha ? `<button class="btn btn-principal btn-mini" data-acao="draft" data-jogador="${id}" ${podePagar(e, preco) ? '' : 'disabled'}>Escolher · ${dinheiro(preco)}</button>` : `<span class="nota">${dinheiro(preco)}</span>`;
    return `<div class="opcao"><div class="carta-clicavel" data-jogador="${id}">${cartaHTML(jg, { tamanho: 'pequena' })}</div>${botao}</div>`;
  }).join('');
  return `<h2 class="painel-titulo">Draft</h2>
    <p>${minha ? `<strong>Escolhe</strong> a tua ${tipo}.` : `A escolher: <strong>${nomeEquipa(atual.equipa)}</strong> (${tipo}).`}</p>
    <div class="draft-layout">
      <div class="opcoes">${cartas}</div>
      ${formacaoDraftHTML(e)}
    </div>
    ${minha ? '<button class="btn btn-contorno" data-acao="draft">Passar esta escolha</button>' : ''}
    <p class="nota">Os jovens entram na formação com um potencial escondido.</p>`;
}

function painelLeilao(e) {
  const l = S.janela.leilao;
  const jg = jogador(l.jogador);
  const participo = l.participantes.includes(e.id) && !l.desistiram.includes(e.id);
  const souLider = l.lider === e.id;
  const minimo = l.lider ? Math.round((l.valor + CONFIG.leilao.incrementoMinimo) * 10) / 10 : l.minimo;
  const origem = l.origem === 'mesa' ? 'Leilão da carta' : l.origem === 'divida' ? `Leilão forçado: ${nomeEquipa(l.vendedor)} está em saldo negativo` : `Proposta por um jogador de ${nomeEquipa(l.vendedor)}${l.obrigatorio ? ' · cláusula batida: venda obrigatória' : ''}`;
  const ativos = l.participantes.filter((x) => x !== l.lider && !l.desistiram.includes(x)).map(nomeEquipa);
  let acoes = '';
  if (l.fase === 'decisao') {
    acoes = l.vendedor === e.id
      ? `<p><strong>Decides tu:</strong> vender a ${nomeEquipa(l.lider)} por ${dinheiro(l.valor)}?</p>
         <div class="linha-botoes"><button class="btn btn-principal" data-acao="decidir" data-aceitar="1">Vender</button><button class="btn btn-contorno" data-acao="decidir">Recusar</button></div>`
      : `<p class="nota">${nomeEquipa(l.vendedor)} está a decidir se vende.</p>`;
  } else if (participo && !souLider) {
    const valor = Math.round((lanceProposto != null && lanceProposto >= minimo ? lanceProposto : minimo) * 10) / 10;
    acoes = `<div class="lance-linha"><div class="lance">
        <input id="valor-lance" class="campo" type="number" step="0.5" min="${minimo}" value="${valor}" aria-label="Valor do lance (M€)">
        <button class="btn btn-principal" data-acao="licitar" ${podePagar(e, minimo) ? '' : 'disabled'}>Licitar</button>
      </div>
      <div class="linha-botoes">
        ${[0, 1, 5].map((x) => `<button class="btn btn-mini" data-acao="lance-rapido" data-valor="${Math.round((minimo + x) * 10) / 10}">${dinheiro(minimo + x)}</button>`).join('')}
        <button class="btn btn-contorno btn-mini" data-acao="desistir">${l.origem === 'proposta' ? 'Desistir' : 'Passar'}</button>
      </div></div>`;
  } else if (souLider) acoes = '<p><strong>Tens o lance mais alto.</strong></p>';
  else if (l.origem === 'divida' && l.vendedor === e.id) acoes = `<p class="nota">O jogador é vendido a quem der mais. Se ninguém licitar, vai para a banca por ${dinheiro(jg.valor * CONFIG.valores.precoBase)}.</p>`;
  else acoes = `<p class="nota">${l.desistiram.includes(e.id) ? 'Já passaste.' : 'Não podes licitar neste leilão.'}</p>`;
  return `<h2 class="painel-titulo">${origem}</h2>
    <div class="destaque-carta"><div class="carta-clicavel" data-jogador="${jg.id}">${cartaHTML(jg)}</div>
      <div class="leilao-info">
        <p class="rotulo">Lance atual</p>
        <p class="valor-grande">${l.lider ? dinheiro(l.valor) : '—'}</p>
        <p class="nota">${l.lider ? `de ${nomeEquipa(l.lider)}` : `mínimo ${dinheiro(l.minimo)}`}</p>
        <p class="nota">Valor ${dinheiro(jg.valor)} · cláusula ${dinheiro(jg.clausula)}</p>
        ${ativos.length && l.fase === 'lances' ? `<p class="nota">Ainda a licitar: ${ativos.join(', ')}</p>` : ''}
      </div>
    </div>
    ${acoes}`;
}

function painelTabuleiro(e) {
  const j = S.janela;
  if (j.leilao) return painelLeilao(e);
  let html = '';

  if (j.contestacao) {
    const c = j.contestacao;
    return `${cabecalhoCasa('empresario')}
      <p>${nomeEquipa(c.atacante)} quer comprar <strong>${esc(jogador(c.jogador).curto)}</strong> em exclusivo por ${dinheiro(c.preco)}.</p>
      ${c.vendedor === e.id
        ? '<div class="linha-botoes"><button class="btn btn-principal" data-acao="responder_empresario" data-anular="1">Anular com o meu Agente</button><button class="btn btn-contorno" data-acao="responder_empresario">Deixar vender</button></div>'
        : `<p class="nota">À espera de ${nomeEquipa(c.vendedor)}.</p>`}`;
  }

  const p = j.pendente;
  if (p && (p.tipo === 'mercado' || p.tipo === 'jovens')) {
    const jg = jogador(p.jogador);
    const { preco } = p;
    const sancionado = e.limiteContratacoes === 0;
    html += `${cabecalhoCasa(p.tipo)}
      <div class="destaque-carta"><div class="carta-clicavel" data-jogador="${jg.id}">${cartaHTML(jg)}</div>
        <div class="leilao-info info-esquerda">
          <p class="valor-grande">${dinheiro(preco)}</p>
          <p class="nota">Valor ${dinheiro(jg.valor)}</p>
          <p class="nota">${esc(jg.clube)} · ${jg.idade} anos</p>
          ${p.equipa === e.id
            ? `<div class="linha-botoes"><button class="btn btn-principal" data-acao="comprar" ${!podePagar(e, preco) || sancionado ? 'disabled' : ''}>Comprar</button><button class="btn btn-contorno" data-acao="passar">Passar</button></div>
               <p class="nota">${sancionado ? 'Estás sancionado: já não podes contratar nesta janela.' : 'Se passares, vai a leilão pelo preço original mas não podes participar.'}${e.dinheiro < preco ? ' Se comprares, ficas em saldo negativo e tens de o resolver antes do fim da janela.' : ''}</p>`
            : `<p class="nota">${nomeEquipa(p.equipa)} decide se compra.</p>`}
        </div></div>`;
  } else if (p?.tipo === 'rede') {
    const todas = [...equipa(p.equipa).redes, p.liga];
    html += `${cabecalhoCasa('rede')}
      <p>Nova Rede: <strong>${esc(p.liga)}</strong>. Só podes ter ${CONFIG.cartas.maxRedes}: ${p.equipa === e.id ? 'escolhe a que descartas.' : `${nomeEquipa(p.equipa)} escolhe a que descarta.`}</p>
      ${p.equipa === e.id ? `<div class="linha-botoes">${todas.map((l) => `<button class="btn btn-fantasma btn-mini" data-acao="descartar_rede" data-liga="${esc(l)}">Descartar ${esc(l)}</button>`).join('')}</div>` : ''}`;
  } else if (p?.tipo === 'patrocinio') {
    const contrato = p.genero === 'marca' ? 'Marca' : 'Patrocinador';
    const dono = equipa(p.equipa);
    html += `${cabecalhoCasa('patrocinio')}
      <div class="carta-evento evento-patrocinio">
        ${LOGOS[p.nome] ? `<img class="patrocinio-logo" src="${LOGOS[p.nome]}" alt="${esc(p.nome)}">` : simboloSVG('patrocinio', 76)}
        <div>
          <p class="rotulo">${contrato}</p>
          ${LOGOS[p.nome] ? '' : `<p class="evento-titulo">${esc(p.nome)}</p>`}
          <p>Prémio de assinatura: <strong>${dinheiro(p.premio)}</strong></p>
        </div>
      </div>
      ${p.equipa !== e.id ? `<p class="nota">${nomeEquipa(p.equipa)} decide.</p>` : p.bloqueio
        ? `<p class="nota">${esc(p.bloqueio)}</p><button class="btn btn-contorno" data-acao="patrocinio">Recusar</button>`
        : `<div class="linha-botoes">${p.genero === 'marca'
            ? `<button class="btn btn-principal" data-acao="patrocinio" data-aceitar="1">Trocar ${esc(dono.marca)}</button>`
            : p.substituir.map((i) => `<button class="btn btn-principal btn-mini" data-acao="patrocinio" data-aceitar="1" data-substitui="${i}">Trocar ${esc(dono.patrocinios[i])}</button>`).join('')}
            <button class="btn btn-contorno" data-acao="patrocinio">Recusar</button></div>`}`;
  } else {
  }
  return html + painelTrocas(e);
}

/** O título de um painel com a cor e o símbolo da casa de onde vem. */
function cabecalhoCasa(tipo) {
  return `<h2 class="painel-titulo cabecalho-casa cabecalho-${tipo}">${simboloSVG(tipo, 30)}<span>${esc(CASA[tipo].nome)}</span></h2>`;
}

/** O botão principal e a dica, na barra de baixo. */
function acaoBarra(e) {
  const j = S.janela;
  if (S.fase !== 'janela' || j.fase !== 'tabuleiro' || !e || e.espera || j.leilao || j.pendente || j.contestacao) return '';
  const total = CONFIG.tabuleiro.voltas[j.tipo] * CONFIG.tabuleiro.casas.length;
  const acabei = j.andadas[e.id] >= total;
  const todos = j.ordem.every((id) => j.andadas[id] >= total);
  const minha = j.ordem[j.vez] === e.id && !todos;
  const botoes = [];
  if (minha) botoes.push(!j.lancou && !acabei ? '<button class="btn btn-branco" data-acao="lancar">Lançar dados</button>' : '<button class="btn btn-branco" data-acao="terminar_vez">Terminar a vez</button>');
  const divida = e.dinheiro < 0 ? `<span class="barra-sancao">Saldo negativo: leiloa jogadores do plantel</span>` : '';
  const sancao = e.limiteContratacoes != null ? `<span class="barra-sancao">Sanção: ${e.limiteContratacoes === 0 ? 'não podes contratar' : `só mais ${e.limiteContratacoes} ${e.limiteContratacoes === 1 ? 'contratação' : 'contratações'}`}</span>` : '';
  // Depois de dar a volta e de terminar a última vez, só falta ir para o campeonato.
  if (acabei && !minha) {
    const pronto = j.prontos.includes(e.id);
    const texto = j.tipo === 'verao' ? 'Começar campeonato' : 'Começar a 2.ª volta do campeonato';
    botoes.push(`<button class="btn ${pronto ? 'btn-fantasma' : 'btn-principal'}" data-acao="pronto_fechar" data-pronto="${pronto ? '' : '1'}" ${e.dinheiro < 0 ? 'disabled' : ''}>${pronto ? 'NÃO ESTOU PRONTO' : texto}</button>`);
  }
  const dica = acabei && !minha ? (todos ? '' : 'Deste a volta: à espera dos outros treinadores.') : minha ? 'Na tua vez também podes fazer propostas: clica num jogador no plantel de outra equipa.' : 'Enquanto esperas, podes vender à banca e propor trocas.';
  return `${dica && !divida ? `<p class="nota barra-dica">${dica}</p>` : ''}${divida}${sancao}${botoes.join('')}`;
}

function painelTrocas(e) {
  const trocas = (S.janela.trocas ?? []).filter((t) => t.de === e.id || t.para === e.id);
  if (!trocas.length) return '';
  const nomes = (ids) => ids.map((id) => esc(jogador(id)?.curto ?? '?')).join(', ');
  return `<p class="rotulo">Trocas</p><ul class="feed">${trocas.map((t) => `<li>
    ${t.para === e.id
      ? `${nomeEquipa(t.de)} propõe: dás <strong>${nomes(t.receber)}</strong>, recebes <strong>${nomes(t.dar)}</strong>.
         <div class="linha-botoes"><button class="btn btn-mini btn-principal" data-acao="responder_troca" data-troca="${t.id}" data-aceitar="1">Aceitar</button><button class="btn btn-mini" data-acao="responder_troca" data-troca="${t.id}">Recusar</button></div>`
      : `Propuseste a ${nomeEquipa(t.para)}: ${nomes(t.dar)} por ${nomes(t.receber)}. <button class="btn btn-mini" data-acao="responder_troca" data-troca="${t.id}">Cancelar</button>`}
  </li>`).join('')}</ul>`;
}

/** O fecho faz-se no plantel, com o onze no campo: aqui fica só o que falta fazer. */
function painelFecho(e) {
  const j = S.janela;
  if (j.prontos.includes(e.id)) {
    const falta = Object.values(S.equipas).filter((x) => x.treinador && !x.espera && !j.prontos.includes(x.id)).map((x) => esc(x.nome));
    return `<h2 class="painel-titulo">Fecho da janela</h2><p>Plantel fechado.</p><p class="nota">À espera de: ${falta.join(', ')}</p>`;
  }
  return `<h2 class="painel-titulo">Fecho da janela · ${esc(e.formacao)}</h2>
    <p>Confirma o plantel: fica o onze em campo e, se quiseres, um 12.º jogador da formação.</p>
    <button class="btn btn-principal" data-acao="abrir-plantel">Ver o plantel</button>`;
}

const fechoAberto = () => {
  const e = minhaEquipa();
  return S.janela?.fase === 'fecho' && e && !e.espera && !S.janela.prontos.includes(e.id);
};

/** O 12.º do fecho: o jovem da formação escolhido, ou o sugerido. */
function dozeFecho(banco) {
  const jovens = banco.filter((x) => x.formacao);
  if (fecho?.doze === null) return null;
  if (jovens.some((x) => x.id === fecho?.doze)) return fecho.doze;
  const sugerido = EU.sugestaoFecho?.manter.find((id) => jovens.some((x) => x.id === id));
  return sugerido ?? null;
}

const NOMES_OPORTUNIDADE = { baixa: 'oportunidade baixa', media: 'oportunidade média', alta: 'oportunidade alta', certo: 'golo certo' };

/** O relato: o emblema da equipa e, nos golos e nas lesões, o símbolo. Os lances sem nada ficam de fora. */
function textoEvento(ev) {
  switch (ev.tipo) {
    case 'golo':
      return `<strong>GOLO de ${esc(ev.jogador)}</strong>${ev.origem === 'penalti' ? ', de penálti' : ev.origem === 'bolaParada' ? ', de bola parada' : ''}${ev.assistencia ? `, assistência de ${esc(ev.assistencia)}` : ''}`;
    case 'lance':
      if (ev.oportunidade === 'nada') return null;
      return `${ev.dados[0]}+${ev.dados[1]}${ev.mod ? `${ev.mod > 0 ? '+' : '−'}${Math.abs(ev.mod)}` : ''} = ${ev.total}, ${NOMES_OPORTUNIDADE[ev.oportunidade]}${ev.extra != null ? ` (dado extra: ${ev.extra})` : ''}`;
    case 'leve':
      return esc(ev.texto);
    case 'vermelho':
      return '<strong>Vermelho</strong>: −1 até ao fim';
    case 'lesao':
      return esc(ev.texto);
    case 'medico':
      return `<strong>Departamento médico</strong>: ${esc(ev.texto)}`;
    case 'penalti':
      return `Penálti: dado ${ev.dado}${ev.marcou ? '' : ', falhou'}`;
    case 'bolaParada':
      return `Bola parada perigosa: dado ${ev.dado}${ev.marcou ? '' : ', nada'}`;
    case 'substituicao':
      return `Substituição: entra ${esc(ev.entra)}, sai ${esc(ev.sai)}`;
    default:
      return null;
  }
}

function placarHTML(jogo) {
  const [a, b] = jogo.lados;
  return `<div class="placar-jogo">
    <span class="placar-equipa">${kit(equipa(a.equipa), 26)}<span>${nomeEquipa(a.equipa)}</span></span>
    <span class="placar-golos">${a.golos}–${b.golos}${jogo.penaltis ? `<small class="placar-penaltis">${jogo.penaltis[0]}–${jogo.penaltis[1]} g.p.</small>` : ''}</span>
    <span class="placar-equipa fora"><span>${nomeEquipa(b.equipa)}</span>${kit(equipa(b.equipa), 26)}</span>
  </div>`;
}

/** O relato anda ao ritmo do relvado: só o que já se viu. Os golos contam-se pelo resultado que o relvado mostra. */
const relvadoAtual = () => vista3d?.relvado ?? relvado2d ?? null;

function eventosVistos(jogo) {
  const r = relvadoAtual();
  if (!r?.chave || r.acabou) return jogo.eventos;
  const golos = [0, 0];
  return jogo.eventos.filter((ev) => (ev.tipo === 'golo' ? ++golos[ev.lado] <= r.golos[ev.lado] : ev.minuto <= r.minutoEvento));
}

function relatoHTML(jogo) {
  const icone = (ev) => (ev.tipo === 'golo' ? `<span class="bola-golo">${ICONE_BOLA}</span>` : ev.tipo === 'lesao' ? '<span class="icone-lesao" aria-label="Lesão">✚</span>' : '');
  const relato = [...eventosVistos(jogo)].reverse().map((ev) => ({ ev, texto: textoEvento(ev) })).filter((x) => x.texto).sort((x, y) => y.ev.minuto - x.ev.minuto);
  return `<p class="rotulo">Registo do jogo</p><ol class="feed relato">${relato.map(({ ev, texto }) => `<li class="${ev.tipo === 'golo' ? 'forte' : ''}">${emblemaSVG(equipa(jogo.lados[ev.lado].equipa), 18)}${icone(ev)}<span>${ev.minuto}' ${texto}</span></li>`).join('')}</ol>`;
}

const por = (el, html) => {
  if (el.dataset.html === html) return;
  el.dataset.html = html;
  el.innerHTML = html;
};

/** O resultado fora do estádio: emblemas, nomes, tempo, marcadores de cada equipa e o homem do jogo. */
function desenharMarcador(visivel) {
  const el = $('#marcador-jogo');
  if (!visivel) {
    el.hidden = true;
    return por(el, '');
  }
  el.hidden = false;
  const { jogo, equipas } = visivel;
  const espelho = equipas[1] === EU?.equipa;
  const r = relvadoAtual();
  const vistos = jogo ? eventosVistos(jogo) : [];
  const fim = jogo?.acabou && (!r?.chave || r.acabou);
  const lado = (i) => {
    const e = equipa(equipas[i]);
    const golos = vistos.filter((ev) => ev.tipo === 'golo' && ev.lado === i);
    const marcadores = golos.map((g) => `${esc(g.jogador)} ${g.minuto}'${g.origem === 'penalti' ? ' (P)' : ''}`).join(', ');
    return `<div class="marcador-lado"><div class="marcador-nome">${emblemaSVG(e, 40)}<strong>${esc(e.nome)}</strong></div><small>${marcadores}</small></div>`;
  };
  const conta = (i) => (jogo ? vistos.filter((ev) => ev.tipo === 'golo' && ev.lado === i).length : 0);
  const [a, b] = espelho ? [1, 0] : [0, 1];
  const minuto = !jogo ? '' : fim ? 'Fim' : `${Math.floor(r?.chave ? r.minuto : jogo.periodo * CONFIG.jogo.minutosPorPeriodo)}'`;
  const penaltis = fim && jogo.penaltis ? `<small>${jogo.penaltis[a]}–${jogo.penaltis[b]} g.p.</small>` : '';
  por(el, `${lado(a)}
    <div class="marcador-centro"><span class="marcador-golos">${conta(a)} – ${conta(b)}</span><span class="marcador-tempo">${minuto}</span>${penaltis}</div>
    ${lado(b)}
    ${fim && jogo.homem ? `<p class="marcador-homem">Homem do jogo: <strong>${esc(jogo.homem.nome)}</strong> (${jogo.homem.nota})</p>` : ''}`);
}

/** Os dados da ronda: o que acabou de sair aos dois lados, em 3D ou, sem WebGL, desenhado. */
let dados3d = null;
let chaveDados = null;
function desenharDadosRonda(jogo, eu) {
  const caixa = $('#dados-3d');
  const vistos = eventosVistos(jogo);
  const ultimo = (n) => [...vistos].reverse().find((ev) => ev.tipo === 'lance' && ev.lado === n)?.dados ?? null;
  const [esq, dir] = eu === 1 ? [1, 0] : [0, 1];
  const valores = [ultimo(esq), ultimo(dir)];
  const etiqueta = (i, tu) => {
    const e = equipa(jogo.lados[i].equipa);
    return `${emblemaSVG(e, 20)}<span>${tu ? 'Os teus dados' : esc(e.nome)}</span>`;
  };
  por($('#dados-rotulo-cima'), etiqueta(dir, false));
  por($('#dados-rotulo-baixo'), etiqueta(esq, eu >= 0));
  const chave = JSON.stringify([vistos.filter((ev) => ev.tipo === 'lance').length, valores]);
  // O 3D ainda pode estar a carregar: nunca se desenham os dois.
  if (!ClasseDados && !semWebgl) return;
  if (chave === chaveDados) return;
  chaveDados = chave;
  if (ClasseDados && !dados3d) dados3d = new ClasseDados(caixa);
  if (dados3d) {
    dados3d.mostrar(valores);
    if (valores[0] || valores[1]) tocar('dado');
  } else $('#dados-2d').innerHTML = [valores[1], valores[0]].map((d) => `<div class="dados">${(d ?? []).map(dadoHTML).join('')}</div>`).join('');
}

/** Por baixo da nossa equipa: os dados e o botão de lançar, quando é a nossa vez. */
function acoesRonda(jogo, eu) {
  const e = minhaEquipa();
  const c = S.campeonato;
  if (c.fase === 'resultados') {
    if (!e || e.espera) return '';
    return c.prontos.includes(e.id) ? '<p class="nota">À espera dos outros treinadores.</p>' : '<button class="btn btn-principal" data-acao="continuar">Continuar</button>';
  }
  if (eu < 0 || jogo.acabou) return '<p class="nota">O teu jogo acabou. À espera dos outros.</p>';
  const lado = jogo.lados[eu];
  const r = relvadoAtual();
  const aAnimar = r?.chave && !r.parado();
  const outro = jogo.lados[1 - eu];
  const lesaoDoOutro = (outro.lesionados ?? []).find((l) => l.pendente && lesoesVistas(jogo, 1 - eu).includes(l.nome));
  if (lesaoDoOutro) return `<p class="aviso-lesao">${esc(lesaoDoOutro.nome)} lesionou-se. À espera da decisão de ${nomeEquipa(outro.equipa)}.</p>`;
  if ((lado.lesionados ?? []).some((l) => l.pendente)) return '<p class="aviso-lesao">Decide primeiro o que fazer com o lesionado.</p>';
  if (jogo.lados[jogo.vezLance].equipa !== lado.equipa) return `<p class="nota">Vez de ${nomeEquipa(outro.equipa)} lançar.</p>`;
  return `<button class="btn btn-branco" data-acao="lancar_ronda" ${aAnimar ? 'disabled' : ''}>Lançar dados · ${(jogo.periodo + 1) * CONFIG.jogo.minutosPorPeriodo}'</button>`;
}

/** A lesão aparece em grande a quem tem de decidir: o jogo só continua depois disso. */
let lesaoMostrada = null;
function mostrarLesao(jogo, eu) {
  const d = $('#dialogo-carta');
  const lado = eu >= 0 ? jogo.lados[eu] : null;
  const vistas = lado ? lesoesVistas(jogo, eu) : [];
  const les = lado?.lesionados?.find((l) => l.pendente && vistas.includes(l.nome));
  if (!les) {
    if (lesaoMostrada != null) {
      lesaoMostrada = null;
      if (d.open) d.close();
    }
    return;
  }
  const e = minhaEquipa();
  const sup = lado.suplente != null && !lado.subUsada ? jogador(lado.suplente) : null;
  const chave = JSON.stringify([les.jogador, sup?.id, e.cartas.medico]);
  if (lesaoMostrada === chave) return;
  lesaoMostrada = chave;
  const J = CONFIG.jogo.lesao;
  d.innerHTML = `<div class="carta-sorte carta-sorte-medico">
      <p class="rotulo">Lesão</p>
      ${moedaMedicoSVG(110)}
      <h2 class="carta-sorte-titulo">${esc(les.nome)}</h2>
      <p>${esc(les.texto ?? 'Lesionou-se.')}</p>
      <div class="carta-sorte-botoes">
        ${e.cartas.medico > 0 ? `<button class="btn btn-branco" data-acao="usar_medico" data-jogador="${les.jogador}">Usar ficha de lesão (tens ${e.cartas.medico})</button>` : ''}
        ${sup ? `<button class="btn btn-branco" data-acao="lesao_suplente" data-jogador="${les.jogador}">Entra ${esc(sup.curto)}${textoForaDePosicao(sup, les.posicao)}</button>` : ''}
        <button class="btn btn-fantasma" data-acao="lesao_ficar" data-jogador="${les.jogador}">Fica em campo (−${J.penalizacao})</button>
      </div>
    </div>`;
  if (!d.open) d.showModal();
}

/** Tudo o que acompanha a animação do jogo. */
function atualizarAoVivo() {
  clearTimeout(temporizadorRelato);
  const visivel = S && jogoVisivel();
  if (!visivel) return;
  const r = relvadoAtual();
  // Lê-se antes de desenhar: o desenho seguinte é que apanha o fim da animação.
  const aMexer = visivel.jogo && r?.chave && (!r.parado() || (visivel.jogo.acabou && !r.acabou));
  desenharMarcador(visivel);
  desenharLadosJogo(visivel);
  desenharBarra(visivel);
  desenharPainel();
  if (aMexer) temporizadorRelato = setTimeout(atualizarAoVivo, 350);
}

function tabelaLigaHTML() {
  if (!S.tabela?.length) return '';
  const linhas = S.tabela.map((l, i) => `<tr class="${l.equipa === EU.equipa ? 'eu' : ''}"><td>${i + 1}</td><td class="celula-equipa">${emblemaSVG(equipa(l.equipa), 22)}${nomeEquipa(l.equipa)}</td><td>${l.j}</td><td class="so-largo">${l.v}</td><td class="so-largo">${l.e}</td><td class="so-largo">${l.d}</td><td>${l.gm - l.gs > 0 ? '+' : ''}${l.gm - l.gs}</td><td class="pts">${l.pts}</td></tr>`).join('');
  return `<table class="tabela tabela-liga"><thead><tr><th>#</th><th>Equipa</th><th>J</th><th class="so-largo">V</th><th class="so-largo">E</th><th class="so-largo">D</th><th>DG</th><th>Pts</th></tr></thead><tbody>${linhas}</tbody></table>`;
}

/** Marcadores e assistentes da Taça. */
function tabelaTacaHTML(t) {
  if (!t) return '';
  const lista = (titulo, itens) => (itens.length ? `<p class="rotulo">${titulo} da Taça</p><ul class="palmares">${itens.map((m) => `<li><span>${esc(m.nome)} <small>${nomeEquipa(m.equipa)}</small></span><span class="titulos">${m.valor}</span></li>`).join('')}</ul>` : '');
  return lista('Marcadores', t.tacaMarcadores ?? []) + lista('Assistências', t.tacaAssistentes ?? []);
}

function painelCampeonato() {
  const c = S.campeonato;
  const e = minhaEquipa();
  const titulo = c.competicao === 'taca' ? `<h2 class="painel-titulo">Taça · ${c.ronda}</h2>` : `<h2 class="painel-titulo">Jornada ${Math.min(c.jornada + 1, c.jornadas)} de ${c.jornadas} · ${c.volta}.ª volta</h2>`;
  if (c.fase === 'taticas') {
    const par = c.calendario.find((p) => p.includes(e?.id));
    if (!e || e.espera) return `${titulo}<p class="nota">À espera das táticas.</p>`;
    if (!par) return `${titulo}<p>${c.competicao === 'taca' ? 'Não jogas nesta ronda.' : 'Tens folga nesta jornada.'}</p>`;
    const adv = equipa(par[0] === e.id ? par[1] : par[0]);
    const T = CONFIG.jogo.taticas;
    const botoes = T.map((t, i) => `<button class="segmento" role="radio" aria-checked="${EU.tatica === t}" data-acao="tatica" data-tatica="${t}">${t}<small>vence ${T[(i + 1) % T.length]}</small></button>`).join('');
    const falta = c.calendario.flat().filter((id) => !c.prontos.includes(id)).map(nomeEquipa);
    return `${titulo}
      <div class="adversario">${emblemaSVG(adv, 52)}<div><strong>${esc(adv.nome)}</strong><small>${mister(adv)}</small></div></div>
      <p>Escolhe a tática para este jogo em segredo.</p>
      <div class="segmentos">${botoes}</div>
      <p class="nota">${falta.length ? `Falta: ${falta.join(', ')}` : ''}</p>`;
  }
  if (c.fase === 'jogos') return c.jogos.length ? '' : `${titulo}<p>Tens folga nesta jornada.</p>`;
  // O ecrã final só aparece depois de se ver o fim do jogo no relvado.
  const r = relvadoAtual();
  if (r?.chave && !r.acabou) return '';
  return `${titulo}${c.competicao === 'taca' ? tabelaTacaHTML(S.estatisticasTaca) : tabelaLigaHTML()}`;
}

// --- Fim da época ---

let abaFimEpoca = 'marcadores';
let entradaCampeao = null; // o troféu e o emblema só entram a saltar uma vez por época
let passoFimEpoca = 1; // 1: o campeão; 2: as melhorias do meu plantel
let epocaCelebrada = null;

const TACA_SVG = `<svg class="fim-taca" viewBox="0 0 120 130" aria-hidden="true">
  <defs><linearGradient id="ouro" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".45" stop-color="#f2c14e"/><stop offset="1" stop-color="#a86f12"/></linearGradient></defs>
  <path d="M28 14H10v14c0 19 13 31 28 33M92 14h18v14c0 19-13 31-28 33" fill="none" stroke="url(#ouro)" stroke-width="7" stroke-linecap="round"/>
  <path d="M28 6h64v30c0 25-13 42-32 42S28 61 28 36Z" fill="url(#ouro)"/>
  <path d="M38 12v24c0 14 5 25 13 31" fill="none" stroke="#fff8" stroke-width="4" stroke-linecap="round"/>
  <path d="M53 78h14v18H53Z" fill="url(#ouro)"/>
  <path d="M40 96h40a6 6 0 0 1 6 6v8H34v-8a6 6 0 0 1 6-6Z" fill="url(#ouro)"/>
  <path d="M28 110h64a4 4 0 0 1 4 4v10H24v-10a4 4 0 0 1 4-4Z" fill="#4a2f0e"/>
  <path d="M60 24l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill="#fff6c9"/>
</svg>`;

/** Confétis por cima de tudo, com as cores do campeão e dourado, durante uns segundos. */
function lancarConfetis(cores) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetis';
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  document.body.append(canvas);
  const c = canvas.getContext('2d');
  const paleta = [...cores, '#f2c14e', '#ffffff'];
  const pecas = Array.from({ length: 220 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height,
    w: 6 + Math.random() * 7,
    h: 9 + Math.random() * 9,
    vy: 2.2 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 1.6,
    a: Math.random() * 6.28,
    va: (Math.random() - 0.5) * 0.25,
    cor: paleta[Math.floor(Math.random() * paleta.length)],
  }));
  const inicio = performance.now();
  const passo = (agora) => {
    const t = agora - inicio;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.globalAlpha = t > 5500 ? Math.max(0, 1 - (t - 5500) / 1000) : 1;
    for (const p of pecas) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.a) * 0.7;
      p.a += p.va;
      if (p.y > canvas.height + 20 && t < 4000) p.y = -20;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.a);
      c.scale(1, Math.abs(Math.cos(p.a)) * 0.8 + 0.2);
      c.fillStyle = p.cor;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    }
    if (t < 6500) requestAnimationFrame(passo);
    else canvas.remove();
  };
  requestAnimationFrame(passo);
}

/** Uma vez por ecrã: os confétis e o som, mesmo que o painel se volte a desenhar. */
function celebrar(chave, e) {
  if (epocaCelebrada === chave) return;
  epocaCelebrada = chave;
  lancarConfetis([e.kit.principal, e.kit.secundaria]);
  tocar('golo');
}

/** A equipa da época num campo, em 4-3-3: cada jogador no lugar da sua linha, de preferência na sua posição. */
function campoEquipaEpoca(p) {
  const formacao = '4-3-3';
  const porLinha = (l) => p.equipa.filter((x) => x.linha === l).map((x) => S.jogadores[x.id]).filter(Boolean);
  const livres = { GR: porLinha('GR'), DEF: porLinha('DEF'), MED: porLinha('MED'), AV: porLinha('AV') };
  const posicoes = CONFIG.formacoes[formacao];
  const lugares = posicoes.map((posicaoLugar) => ({ posicao: posicaoLugar, jogador: null }));
  const colocar = (certo) => posicoes.forEach((posicaoLugar, i) => {
    if (lugares[i].jogador != null) return;
    const fila = livres[CONFIG.posicoes.linha[posicaoLugar]];
    const k = certo ? fila.findIndex((x) => x.posicao === posicaoLugar) : 0;
    if (k >= 0 && fila[k]) lugares[i].jogador = fila.splice(k, 1)[0].id;
  });
  colocar(true);
  colocar(false);
  return `<div class="campo-caixa fim-campo">${campoHTML(formacao, lugares, S.jogadores)}</div>`;
}

function listaPremio(titulo, itens) {
  if (!itens?.length) return '';
  const linhas = itens.map((m, i) => `<li><span class="fim-posicao">${i + 1}</span>${emblemaSVG(equipa(m.equipa), 22)}<span class="fim-nome">${esc(m.nome)}<small>${nomeEquipa(m.equipa)}</small></span><span class="titulos">${m.valor}</span></li>`).join('');
  return `<p class="rotulo">${titulo}</p><ul class="palmares fim-lista">${linhas}</ul>`;
}

function listaMomentos(titulo, classe, itens) {
  return `<div class="fim-momentos ${classe}"><p class="rotulo">${titulo}</p>${itens?.length ? `<ul>${itens.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="nota">Nada a assinalar.</p>'}</div>`;
}

function ecraCampeao(f, p, e) {
  const campeao = equipa(p.campeao);
  const m = f.momentos ?? {};
  const meus = e ? m.equipas?.[e.id] : null;
  celebrar(`epoca-${p.epoca}`, campeao);
  if (entradaCampeao?.epoca !== p.epoca) entradaCampeao = { epoca: p.epoca, ate: performance.now() + 1000 };
  const separador = (aba, texto) => `<button class="separador-btn" role="tab" aria-selected="${abaFimEpoca === aba}" data-acao="fim-aba" data-aba="${aba}">${texto}</button>`;
  const lateral = abaFimEpoca === 'equipa'
    ? campoEquipaEpoca(p)
    : `${listaPremio('Melhores marcadores', p.marcadores)}${listaPremio('Assistências', p.assistentes)}${listaPremio('Marcadores da Taça', p.tacaMarcadores)}${listaPremio('Assistências da Taça', p.tacaAssistentes)}`;
  const pronto = e && f.prontos.includes(e.id);
  const semMelhorias = f.ultima || !f.mudancas.some((x) => x.equipa === e?.id);
  const botao = !e || e.espera ? '' : pronto ? '<p class="nota centro">À espera dos outros treinadores.</p>'
    : semMelhorias ? `<button class="btn btn-principal" data-acao="continuar">${f.ultima ? 'Ver o palmarés' : 'Seguir para a próxima época'}</button>`
      : '<button class="btn btn-principal" data-acao="fim-continuar">Continuar</button>';
  return `<div class="fim-epoca${performance.now() < entradaCampeao.ate ? ' fim-entrada' : ''}">
    <header class="fim-topo">
      ${TACA_SVG}
      <div class="fim-campeao">${emblemaSVG(campeao, 132)}</div>
      <div class="fim-titulo">
        <p class="rotulo">Campeão da época ${p.epoca}</p>
        <h2>${esc(campeao.nome)}</h2>
        <p>${mister(campeao)} · ${p.pontos} pontos${p.jogador ? ` · Jogador do ano: <strong>${esc(p.jogador.nome)}</strong>` : ''}${p.taca ? ` · Taça: <strong>${nomeEquipa(p.taca)}</strong>` : ''}</p>
      </div>
    </header>
    <div class="fim-grelha">
      <div class="fim-coluna">
        <section class="fim-cartao"><p class="rotulo">Classificação</p>${tabelaLigaHTML()}</section>
        <section class="fim-cartao">
          <div class="fim-momentos-grelha">
            ${meus ? listaMomentos('Os teus melhores momentos', 'momentos-bons', meus.bons) + listaMomentos('Os teus piores momentos', 'momentos-maus', meus.maus) : ''}
            ${listaMomentos('O melhor da época', 'momentos-bons', m.geral?.bons)}
            ${listaMomentos('O pior da época', 'momentos-maus', m.geral?.maus)}
          </div>
        </section>
      </div>
      <section class="fim-cartao fim-lateral">
        <div class="separadores" role="tablist">${separador('marcadores', 'Marcadores e assistências')}${separador('equipa', 'Equipa da época')}</div>
        ${lateral}
      </section>
    </div>
    <div class="fim-botao">${botao}</div>
  </div>`;
}

/** Depois do campeão, o que mudou no meu plantel. Só ao continuar aqui é que a época acaba. */
function ecraMelhorias(f, p, e) {
  const minhas = f.mudancas.filter((x) => x.equipa === e.id);
  const pronto = f.prontos.includes(e.id);
  const cartas = minhas.map((m) => {
    const jg = jogador(m.jogador);
    const dif = m.depois - m.antes;
    return `<div class="melhoria ${dif > 0 ? 'sobe' : dif < 0 ? 'desce' : ''}">
      ${jg ? `<div class="carta-clicavel" data-jogador="${jg.id}">${cartaHTML(jg, { tamanho: 'pequena' })}</div>` : `<strong>${esc(m.nome)}</strong>`}
      ${m.reformado ? `<p class="melhoria-valor"><strong>Reforma-se aos ${m.reformado} anos</strong></p>` : `<p class="melhoria-valor"><span>${m.antes}</span> → <strong>${m.depois}</strong> <em>${dif > 0 ? '+' : ''}${dif}</em></p>`}
      ${m.promovido ? '<small>Passa ao plantel principal</small>' : ''}
    </div>`;
  }).join('');
  return `<div class="fim-epoca">
    <h2 class="titulo titulo-medio centro">O teu plantel depois da época ${p.epoca}</h2>
    <p class="nota centro">Quem jogou bem cresceu, os anos pesam a quem já tem muitos, e os mais velhos podem reformar-se.</p>
    <div class="melhorias">${cartas}</div>
    <div class="fim-botao">${pronto ? '<p class="nota centro">À espera dos outros treinadores.</p>' : '<button class="btn btn-principal" data-acao="continuar">Seguir para a próxima época</button>'}</div>
  </div>`;
}

function painelFimEpoca() {
  const f = S.fimEpoca;
  const e = minhaEquipa();
  const p = S.premios.at(-1);
  const temMelhorias = e && !f.ultima && f.mudancas.some((x) => x.equipa === e.id);
  if (temMelhorias && (passoFimEpoca === 2 || f.prontos.includes(e.id))) return ecraMelhorias(f, p, e);
  return ecraCampeao(f, p, e);
}

function painelFim() {
  const linhas = S.premios.map((p) => `<li><span>Época ${p.epoca}</span><span>${nomeEquipa(p.campeao)} <span class="titulos">CAMPEÃO</span>${p.taca ? ` · ${nomeEquipa(p.taca)} <span class="titulos">TAÇA</span>` : ''}</span></li>`).join('');
  const ranking = (S.ranking ?? []).map((r, i) => `<tr class="${r.equipa === EU.equipa ? 'eu' : ''}"><td>${i + 1}</td><td class="celula-equipa">${emblemaSVG(equipa(r.equipa), 22)}${nomeEquipa(r.equipa)}</td><td>${r.campeonatos}</td><td>${r.tacas}</td><td>${String(r.titulos).replace('.', ',')}</td><td class="pts">${r.pontos}</td></tr>`).join('');
  const vencedor = S.ranking?.[0] && equipa(S.ranking[0].equipa);
  if (vencedor) celebrar('fim', vencedor);
  return `<div class="fim-epoca fim-entrada">${vencedor ? `<header class="fim-topo">
      ${TACA_SVG}
      <div class="fim-campeao">${emblemaSVG(vencedor, 132)}</div>
      <div class="fim-titulo"><p class="rotulo">Vencedor da partida</p><h2>${esc(vencedor.nome)}</h2><p>${mister(vencedor)} · ${String(S.ranking[0].titulos).replace('.', ',')} títulos</p></div>
    </header>` : ''}
    <table class="tabela tabela-liga"><thead><tr><th>#</th><th>Equipa</th><th>Camp.</th><th>Taças</th><th>Títulos</th><th>Pontos</th></tr></thead><tbody>${ranking}</tbody></table>
    <p class="rotulo">Palmarés</p><ul class="palmares">${linhas}</ul></div>`;
}

// --- À volta do tabuleiro: os treinadores, a barra de baixo e o menu ---

const mister = (e) => {
  const t = e.treinador ? treinador(e.treinador) : null;
  return t ? `Mister ${esc(t.nome)}` : 'Bot';
};

function moedasHTML(e, tamanho = 18) {
  const n = (x, svg) => Array.from({ length: x }, () => svg).join('');
  return n(e.cartas?.empresario ?? 0, moedaEmpresarioSVG(tamanho)) + n(e.cartas?.medico ?? 0, moedaMedicoSVG(tamanho));
}

const MOEDAS_ORCAMENTO = '<svg class="moedas-orcamento" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g fill="#e0b34c" stroke="#7a5716" stroke-width="1"><ellipse cx="12" cy="19" rx="8" ry="3"/><ellipse cx="12" cy="15.500" rx="8" ry="3"/><ellipse cx="12" cy="12" rx="8" ry="3"/><ellipse cx="12" cy="8.500" rx="8" ry="3"/><ellipse cx="12" cy="5" rx="8" ry="3" fill="#fbe39a"/></g></svg>';

function chipEquipa(e, vez) {
  const t = e.treinador ? treinador(e.treinador) : null;
  return `<div class="chip-caixa">
    <button class="chip-equipa${e.id === vez ? ' vez' : ''}${t && !t.ligado ? ' desligado' : ''}" type="button" data-ver-equipa="${e.id}">
      ${emblemaSVG(e, 38)}
      <span class="chip-texto"><small>${mister(e)}</small><strong>${esc(e.nome)}</strong><span class="chip-moedas">${moedasHTML(e)}</span></span>
    </button>
    ${e.bot ? '' : `<span class="chip-orcamento${e.dinheiro < 0 ? ' saldo-negativo' : ''}">${MOEDAS_ORCAMENTO}${dinheiro(e.dinheiro)}</span>`}
  </div>`;
}

/** As outras equipas ficam à volta do tabuleiro: dos dois lados e, se forem ímpares, uma por cima. */
function desenharTreinadores() {
  const j = S.janela;
  const vez = j?.fase === 'tabuleiro' ? j.ordem[j.vez] : null;
  const outras = Object.values(S.equipas).filter((e) => !e.espera && e.id !== EU?.equipa).sort((a, b) => Boolean(a.bot) - Boolean(b.bot));
  const topo = outras.length % 2 ? [outras.pop()] : [];
  por($('#equipas-topo'), topo.map((e) => chipEquipa(e, vez)).join(''));
  por($('#equipas-esq'), outras.filter((_, i) => i % 2 === 0).map((e) => chipEquipa(e, vez)).join(''));
  por($('#equipas-dir'), outras.filter((_, i) => i % 2 === 1).map((e) => chipEquipa(e, vez)).join(''));
}

/** Durante os jogos: os nossos dados à esquerda do campo, os do adversário à direita. */
function desenharLadosJogo({ jogo, equipas }) {
  por($('#equipas-topo'), '');
  const eu = equipas.indexOf(EU?.equipa);
  const [esq, dir] = eu === 1 ? [1, 0] : [0, 1];
  por($('#equipas-esq'), ladoJogoHTML(equipas[esq], jogo?.lados[esq], jogo, esq, esq === eu));
  por($('#equipas-dir'), ladoJogoHTML(equipas[dir], jogo?.lados[dir], jogo, dir));
  $('#caixa-lance').hidden = !jogo;
  $('#registo-jogo').hidden = !jogo;
  if (!jogo) return;
  desenharDadosRonda(jogo, eu);
  por($('#lance-acoes'), acoesRonda(jogo, eu));
  por($('#registo-jogo'), relatoHTML(jogo));
  avisarLesao(jogo, eu);
  mostrarLesao(jogo, eu);
}

/** Avisa os dois treinadores de cada lesão nova, quando ela acontece no relvado. */
let lesoesAvisadas = 0;
function avisarLesao(jogo, eu) {
  if (eu < 0) return;
  const lesoes = eventosVistos(jogo).filter((ev) => ev.tipo === 'lesao' && ev.jogador);
  if (lesoes.length < lesoesAvisadas) lesoesAvisadas = 0;
  for (const ev of lesoes.slice(lesoesAvisadas)) if (ev.lado !== eu) toast(`${ev.jogador} (${nomeEquipa(jogo.lados[ev.lado].equipa)}) lesionou-se. À espera da decisão.`);
  lesoesAvisadas = lesoes.length;
}

const ICONE_BOLA = '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#fff" stroke="#111"/><path d="M10 6l3.800 2.800-1.500 4.400H7.700L6.200 8.800z" fill="#111"/><path d="M10 1v5M1.500 8l4.700.8M18.500 8l-4.700.8M5 17l2.700-3.800M15 17l-2.700-3.800" stroke="#111" stroke-width="1"/></svg>';
const BOLA = `<span class="bola-golo" title="Golo">${ICONE_BOLA}</span>`;

function ladoJogoHTML(id, lado, jogo, i, meu = false) {
  const e = equipa(id);
  const onze = lado?.onze ?? (e.onze ?? []).filter((l) => l.jogador != null).map((l) => ({ ...l, nome: jogador(l.jogador)?.curto }));
  const golos = jogo ? eventosVistos(jogo).filter((ev) => ev.tipo === 'golo' && ev.lado === i) : [];
  const bolas = (nome) => golos.filter((g) => g.jogador === nome).map((g) => (g.origem === 'penalti' ? `<span class="bola-golo" title="Golo de penálti">P${ICONE_BOLA}</span>` : BOLA)).join('');
  const lesao = '<span class="icone-lesao" title="Lesionado" aria-label="Lesionado">✚</span>';
  const linhas = onze.map((l) => `<li class="linha-jog${l.lesionado ? ' linha-lesionado' : ''}" data-jogador="${l.jogador}"><span class="mini-ovr mini-${nivel(l.overall)}">${l.overall}</span><span class="linha-pos">${posicao(l.posicao)}</span><span class="linha-nome">${esc(l.nome ?? '?')}</span>${l.lesionado && (!jogo || lesoesVistas(jogo, i).includes(l.nome)) ? lesao : ''}${bolas(l.nome)}</li>`).join('');
  const idSup = lado ? lado.suplente : e.suplente;
  const sup = idSup != null ? jogador(idSup) : null;
  const tatica = lado ? `${esc(lado.tatica)} (${lado.modificador >= 0 ? '+' : ''}${lado.modificador})` : 'Tática em segredo';
  return `<section class="lado-jogo painel">
    <button class="lado-jogo-topo" type="button" data-ver-equipa="${id}">${emblemaSVG(e, 40)}<span class="chip-texto"><small>${mister(e)}</small><strong>${esc(e.nome)}</strong></span></button>
    <p class="nota">${esc(e.formacao ?? '')} · ${tatica}</p>
    <ol class="lista-jogadores">${linhas}</ol>
    ${sup ? `<p class="nota">Suplente: ${esc(sup.curto)} (${sup.overall})</p>` : ''}
    ${meu && jogo ? substituicaoHTML(lado, jogo) : ''}
  </section>`;
}

/** Por baixo do nosso plantel: quem continua lesionado, o botão de substituição e as fichas de lesão. */
function substituicaoHTML(lado, jogo) {
  if (!lado || jogo.acabou || S.campeonato.fase !== 'jogos') return '';
  const vistas = lesoesVistas(jogo, jogo.lados.indexOf(lado));
  const emCampo = lado.lesionados.filter((l) => vistas.includes(l.nome) && !l.pendente && lado.onze.some((o) => o.jogador === l.jogador));
  const alvo = emCampo[0];
  const nome = (x) => esc(lado.onze.find((l) => l.jogador === x)?.nome);
  const sup = lado.suplente != null && !lado.subUsada ? jogador(lado.suplente) : null;
  let aviso = '';
  if (alvo) {
    const forma = sup ? textoForaDePosicao(sup, alvo.posicao) : '';
    aviso = `<div class="aviso-lesao"><p><strong>${esc(alvo.nome)}</strong> continua lesionado.</p>
      ${sup ? `<button class="btn btn-mini btn-principal" data-acao="lesao_suplente" data-jogador="${alvo.jogador}">Entra ${esc(sup.curto)}${forma}</button>` : ''}
    </div>`;
  }
  let sub = '';
  if (lado.subPedida != null) sub = '<p class="nota">O suplente entra na próxima ronda.</p>';
  else if (lado.podemSair.length) {
    sub = '<button class="btn btn-fantasma btn-mini" data-acao="abrir-substituicao">Substituição</button>';
    if (abrirSub) sub += `<p class="rotulo">Entra ${esc(jogador(lado.suplente)?.curto)}, sai…</p><div class="linha-botoes">${lado.podemSair.map((x) => `<button class="btn btn-mini btn-fantasma" data-acao="substituir" data-sai="${x}">${nome(x)}</button>`).join('')}</div>`;
  }
  const fichas = minhaEquipa()?.cartas.medico ?? 0;
  const moedas = fichas ? `<div class="fichas-lesao" title="Fichas de lesão"><div class="fichas-lista">${Array.from({ length: fichas }, () => `<button class="ficha-lesao" type="button" title="${alvo ? `Usar em ${esc(alvo.nome)}` : 'Sem lesionados'}" data-acao="usar_medico" ${alvo ? `data-jogador="${alvo.jogador}"` : 'disabled'}>${moedaMedicoSVG(30)}</button>`).join('')}</div></div>` : '';
  return aviso + sub + moedas;
}

/** Os lesionados que já se viram no relvado. */
function lesoesVistas(jogo, i) {
  return eventosVistos(jogo).filter((ev) => ev.tipo === 'lesao' && ev.lado === i && ev.jogador).map((ev) => ev.jogador);
}

/** No início da jornada, a carta do jogador que chegou emprestado. */
let chaveEmprestados = null;
function mostrarEmprestados() {
  const c = S.campeonato;
  const lista = minhaEquipa()?.emprestadosNovos ?? [];
  if (S.fase !== 'campeonato' || c.fase !== 'taticas' || !lista.length) return;
  const chave = JSON.stringify([S.epoca, c.volta, c.jornada, c.ronda, lista]);
  if (chave === chaveEmprestados) return;
  chaveEmprestados = chave;
  const d = $('#dialogo-carta');
  d.innerHTML = `<div class="carta-sorte">
      <p class="rotulo">Jogador emprestado</p>
      <div class="emprestados-novos">${lista.map(({ jogador: id }) => `<div class="carta-clicavel" data-jogador="${id}">${cartaHTML(jogador(id), { tamanho: 'grande' })}</div>`).join('')}</div>
      <p>${lista.map((l) => `<strong>${esc(jogador(l.jogador)?.curto)}</strong> fica no lugar de ${esc(l.lesionado)} até à próxima janela.`).join('<br>')}</p>
      <button class="btn btn-branco" data-fechar>Confirmar</button>
    </div>`;
  if (!d.open) d.showModal();
}

/** Quanto deu ou dá cada contrato, em milhões. */
function valorContrato(genero, categoria) {
  if (categoria === 'iniciais' || !categoria) return genero === 'marca' ? CONFIG.inicio.premioMarcaInicial : CONFIG.inicio.premioPatrocinioInicial;
  return CONFIG.patrocinios.premios[genero][categoria];
}

/** Um contrato no rodapé: o logo, ou o nome enquanto não houver logo. O nome e o valor aparecem ao passar o rato. */
let contratoAmpliado = null; // o logo que se clicou para ver melhor
function contratoHTML(nome, genero, categoria) {
  const info = `<span class="barra-contrato-info" role="tooltip">${esc(nome)}<small>${dinheiro(valorContrato(genero, categoria))}</small></span>`;
  return LOGOS[nome]
    ? `<button class="barra-contrato${contratoAmpliado === nome ? ' ampliado' : ''}" type="button" data-contrato="${esc(nome)}"><img class="barra-contrato-logo" src="${LOGOS[nome]}" alt="${esc(nome)}">${info}</button>`
    : `<span class="barra-contrato barra-contrato-texto" tabindex="0"><span>${esc(nome)}</span>${info}</span>`;
}

function ampliarContrato(nome) {
  contratoAmpliado = nome;
  $$('[data-contrato]').forEach((b) => b.classList.toggle('ampliado', b.dataset.contrato === nome));
}

// O logo ampliado volta ao tamanho normal quando o rato sai dele.
document.addEventListener('mouseover', (ev) => {
  if (contratoAmpliado && !ev.target.closest?.('.barra-contrato.ampliado')) ampliarContrato(null);
});

function barraMinhaHTML(e) {
  const contratos = e.marca ? [
    contratoHTML(e.marca, 'marca', e.categorias?.marca),
    ...e.patrocinios.map((p, i) => contratoHTML(p, 'patrocinio', e.categorias?.patrocinios?.[i])),
  ].join('') : '';
  return `<div class="barra-clube">
      ${emblemaSVG(e, 54)}${kit(e, 48)}
      <div class="barra-clube-texto"><strong>${esc(e.nome)}</strong><small>${mister(e)}</small></div>
    </div>
    <div class="barra-contratos"><strong class="barra-orcamento${e.dinheiro < 0 ? ' saldo-negativo' : ''}" title="Nesta época podes gastar até ficares com ${dinheiro(S.saldoMinimo)}">${MOEDAS_ORCAMENTO}${dinheiro(e.dinheiro)}</strong><div class="barra-lista-contratos">${contratos}</div></div>
    <div class="barra-moedas">${moedasHTML(e, 26)}</div>
    <div class="barra-redes">${e.redes.map((r) => `<span class="carta-rede" title="Rede de observação: ${esc(r)}">Rede<small>${esc(r)}</small></span>`).join('')}</div>
    <div class="barra-acao">${acaoBarra(e)}</div>
    <div class="barra-plantel"><span class="barra-formacao">${esc(e.formacao ?? '')}</span><button class="btn btn-fantasma" type="button" data-acao="abrir-plantel">Plantel</button></div>`;
}

/** Na nossa vez, o rodapé brilha com a cor da equipa; e 5 segundos sem terminar a vez põem o botão a piscar. */
let temporizadorPiscar = null;
let botaoAVigiar = null;
function atualizarBrilho(barra, e) {
  const j = S.janela;
  const total = j?.fase === 'tabuleiro' ? CONFIG.tabuleiro.voltas[j.tipo] * CONFIG.tabuleiro.casas.length : 0;
  const minha = e && j?.fase === 'tabuleiro' && j.ordem[j.vez] === e.id && !j.ordem.every((id) => j.andadas[id] >= total);
  barra.classList.toggle('minha-vez', Boolean(minha));
  if (e) barra.style.setProperty('--cor-equipa', e.kit.principal);
  const botao = barra.querySelector('[data-acao=terminar_vez]');
  if (botao === botaoAVigiar) return;
  botaoAVigiar = botao;
  clearTimeout(temporizadorPiscar);
  if (botao) temporizadorPiscar = setTimeout(() => botao.classList.add('a-piscar'), 5000);
}

function desenharBarra(visivel) {
  const e = minhaEquipa();
  const barra = $('#barra-equipa');
  const jogo = visivel?.jogo;
  if (jogo) {
    barra.classList.add('barra-relato');
    barra.classList.toggle('minha-vez', !jogo.acabou && jogo.lados[jogo.vezLance].equipa === e?.id);
    if (e) barra.style.setProperty('--cor-equipa', e.kit.principal);
    const resto = S.campeonato.jogos.filter((x) => x !== jogo);
    const linha = (j) => {
      const [a, b] = j.lados;
      return `<div class="jogo-direto">${emblemaSVG(equipa(a.equipa), 22)}<span>${nomeEquipa(a.equipa)}</span><strong>${a.golos}–${b.golos}</strong><span>${nomeEquipa(b.equipa)}</span>${emblemaSVG(equipa(b.equipa), 22)}<small>${j.acabou ? 'Fim' : `${j.periodo * CONFIG.jogo.minutosPorPeriodo}'`}</small></div>`;
    };
    por(barra, `<p class="rotulo">Jogos a decorrer</p><div class="jogos-direto">${resto.length ? resto.map(linha).join('') : '<span class="nota">Não há outros jogos nesta jornada.</span>'}</div>`);
    return;
  }
  barra.classList.remove('barra-relato');
  por(barra, e && !e.espera ? barraMinhaHTML(e) : '<p class="nota">Estás a ver: jogas a partir da próxima janela.</p>');
  atualizarBrilho(barra, e);
}

/** Os botões do anfitrião, para desbloquear o jogo, ficam no menu. */
function desenharAnfitriao() {
  const el = $('#menu-anfitriao');
  if (!souAnfitriao()) return void (el.innerHTML = '');
  const j = S.janela;
  const c = S.campeonato;
  const b = (acao, texto) => `<button class="btn btn-mini btn-contorno" type="button" data-acao="${acao}">${texto}</button>`;
  let itens = '';
  if (S.fase === 'campeonato' && c.fase === 'jogos') itens = b('forcar_ronda', 'Lançar por quem falta') + b('avancar', 'Acabar os jogos já');
  else if (j?.fase === 'tabuleiro') itens = j.leilao ? b('forcar_leilao', 'Fechar o leilão') : b('forcar_vez', `Passar a vez de ${nomeEquipa(j.ordem[j.vez])}`) + b('forcar_fecho', 'Fechar a janela já');
  else if (S.fase === 'campeonato') itens = b('avancar', c.fase === 'taticas' ? 'Táticas ao acaso para quem falta' : c.fase === 'jogos' ? 'Acabar os jogos já' : 'Seguir já');
  else if (S.fase === 'fimEpoca') itens = b('avancar', 'Seguir já');
  el.innerHTML = itens ? `<p class="rotulo">Anfitrião</p>${itens}` : '';
}

function desenharRegisto() {
  $('#dialogo-registo').innerHTML = `
    <div class="dialogo-cabecalho"><h2 class="titulo titulo-medio">Registo</h2><button class="btn-fechar" data-fechar aria-label="Fechar">×</button></div>
    <div class="dialogo-corpo"><ol class="feed">${[...S.log].reverse().map((l) => `<li class="${l.tipo === 'fase' ? 'forte' : ''}">${esc(l.texto)}</li>`).join('')}</ol></div>`;
}

function desenharClassificacoes() {
  const total = (S.rankingAtual ?? []).map((r, i) => `<tr class="${r.equipa === EU?.equipa ? 'eu' : ''}"><td>${i + 1}</td><td class="celula-equipa">${emblemaSVG(equipa(r.equipa), 22)}${nomeEquipa(r.equipa)}</td><td>${r.campeonatos}</td><td>${r.tacas}</td><td class="pts">${r.pontos}</td></tr>`).join('');
  const atual = tabelaLigaHTML() || '<p class="nota">A classificação começa com o primeiro jogo da época.</p>';
  $('#dialogo-classificacoes').innerHTML = `
    <div class="dialogo-cabecalho"><h2 class="titulo titulo-medio">Classificações</h2><button class="btn-fechar" data-fechar aria-label="Fechar">×</button></div>
    <div class="dialogo-corpo">
      <div class="separadores" role="tablist">
        <button class="separador-btn" role="tab" data-separador="atual" aria-selected="${separador === 'atual'}">Atual temporada</button>
        <button class="separador-btn" role="tab" data-separador="total" aria-selected="${separador === 'total'}">Classificação total</button>
      </div>
      ${separador === 'atual' ? atual : `<table class="tabela tabela-liga"><thead><tr><th>#</th><th>Equipa</th><th>Camp.</th><th>Taças</th><th>Pontos</th></tr></thead><tbody>${total}</tbody></table>`}
    </div>`;
}

/** A carta que acabou de sair aparece em grande a todos, até quem a tirou a confirmar. */
const LIGAS = {
  'Ligas asiáticas': ['LIGAS ASIÁTICAS', null],
  'Ligas sul-americanas': ['LIGAS SUL-AMERICANAS', null],
  'Ligas norte-americanas': ['LIGAS NORTE-AMERICANAS', null],
  'LALIGA EA SPORTS': ['LALIGA', 'es'],
  'LALIGA HYPERMOTION': ['LALIGA 2', 'es'],
  'Premier League': ['PREMIER LEAGUE', 'gb-eng'],
  'EFL Championship': ['CHAMPIONSHIP', 'gb-eng'],
  Bundesliga: ['BUNDESLIGA', 'de'],
  'Bundesliga 2': ['2. BUNDESLIGA', 'de'],
  "Ligue 1 McDonald's": ['LIGUE 1', 'fr'],
  'Ligue 2 BKT': ['LIGUE 2', 'fr'],
  'Serie A Enilive': ['SERIE A', 'it'],
  'Serie BKT': ['SERIE B', 'it'],
  MLS: ['MLS', 'us'],
  'Trendyol Süper Lig': ['SÜPER LIG', 'tr'],
  'Liga Portugal': ['LIGA PORTUGAL', 'pt'],
  'ROSHN Saudi League': ['LIGA SAUDITA', 'sa'],
  '1A Pro League': ['PRO LEAGUE', 'be'],
  'Hellas Liga': ['LIGA GREGA', 'gr'],
  LPF: ['LIGA ARGENTINA', 'ar'],
  Eredivisie: ['EREDIVISIE', 'nl'],
  'Liga BBVA MX': ['LIGA MX', 'mx'],
  'Metropolitan Division': ['LIGA DINAMARQUESA', 'dk'],
  'Scottish Premiership': ['LIGA ESCOCESA', 'gb-sct'],
  'CONMEBOL Libertadores': ['LIBERTADORES', null],
  'CONMEBOL Sudamericana': ['SUDAMERICANA', null],
  Ekstraklasa: ['EKSTRAKLASA', 'pl'],
  'Brack Super League': ['SUPER LEAGUE', 'ch'],
  CSL: ['LIGA CHINESA', 'cn'],
  'K League 1': ['K LEAGUE', 'kr'],
  Allsvenskan: ['ALLSVENSKAN', 'se'],
};

let chaveCarta;
let cartaAberta = false;
let temporizadorSlot = null;
function mostrarCarta() {
  const c = S.janela?.ultimaCarta ?? null;
  const d = $('#dialogo-carta');
  const chave = c ? JSON.stringify([c.tipo, c.titulo, c.equipa, c.detalhe, S.janela.ultimoLance]) : null;
  const primeira = chaveCarta === undefined;
  // Confirmada por quem a tirou, ou já passou a vez: sai de todos os ecrãs.
  if (cartaAberta && (!c || c.confirmada || chave !== chaveCarta)) {
    cartaAberta = false;
    clearTimeout(temporizadorSlot);
    if (d.open) d.close();
  }
  if (chave === chaveCarta) return;
  chaveCarta = chave;
  if (!c || primeira || c.confirmada) return;
  const minha = c.equipa === EU?.equipa;
  const NOMES = { misterio: 'Carta Mistério', empresario: 'Moeda', medico: 'Moeda' };
  const confirmar = minha ? '<button class="btn btn-branco" data-acao="confirmar_carta">Confirmar</button>' : `<p class="nota carta-espera">À espera que ${nomeEquipa(c.equipa)} confirme.</p>`;
  const simbolo = c.tipo === 'empresario' ? moedaEmpresarioSVG(150) : c.tipo === 'medico' ? moedaMedicoSVG(150) : simboloSVG(c.tipo, 120);
  if (c.tipo === 'rede') {
    const [curto, bandeira] = LIGAS[c.liga] ?? [c.liga.toUpperCase(), null];
    d.innerHTML = `<div class="carta-sorte carta-sorte-rede carta-rede-grande">
      <p class="rotulo">Rede de observação · ${nomeEquipa(c.equipa)}</p>
      ${simboloSVG('rede', 110)}
      <div class="rede-painel">
        <p class="rede-desconto">${Math.round(CONFIG.cartas.redeDesconto * 100)}% DESCONTO</p>
        <p class="rede-liga">${esc(curto)}</p>
        ${bandeira ? `<img class="rede-bandeira" src="/bandeiras/${bandeira}.svg" alt="">` : ''}
      </div>
      ${confirmar}
    </div>`;
  } else if (c.tipo === 'investigacao') {
    d.innerHTML = slotMachineHTML(c, confirmar);
    girarSlot(c);
  } else {
    d.innerHTML = `<div class="carta-sorte carta-sorte-${esc(c.tipo)} ${c.bom ? 'sorte-boa' : 'sorte-ma'}">
      <p class="rotulo">${NOMES[c.tipo] ?? ''} · ${nomeEquipa(c.equipa)}</p>
      ${simbolo}
      <h2 class="carta-sorte-titulo">${esc(c.titulo)}</h2>
      <p>${esc(c.texto)}</p>
      ${c.detalhe ? `<p class="evento-detalhe">${esc(c.detalhe)}</p>` : ''}
      ${confirmar}
    </div>`;
  }
  cartaAberta = true;
  if (!d.open) d.showModal();
}

// A Investigação é uma slot machine: gira sozinha, vai abrandando e pára no veredicto, igual para todos.
const SIMBOLOS_SLOT = ['⚖️', '📁', '🚔', '💰', '🕵️', '💼'];

function slotMachineHTML(c, confirmar) {
  return `<div class="carta-sorte carta-sorte-investigacao slot-maquina">
    <p class="rotulo">Investigação · ${nomeEquipa(c.equipa)}</p>
    ${simboloSVG('investigacao', 72)}
    <div class="slot-rolos">${[0, 1, 2].map(() => `<div class="slot-rolo">${SIMBOLOS_SLOT[0]}</div>`).join('')}</div>
    <div class="slot-resultado" hidden>
      <h2 class="carta-sorte-titulo">${c.bom ? 'Processo arquivado' : 'Acusado'}</h2>
      ${c.bom ? `<p>${esc(c.texto)}</p>` : `<p class="slot-acusacao">${esc(c.acusacao ?? c.texto)}</p>
        <p class="rotulo">Sentença</p><p class="slot-sentenca">${esc(c.detalhe ?? '')}</p>`}
      ${confirmar}
    </div>
  </div>`;
}

function girarSlot(c) {
  const rolos = $$('.slot-rolo');
  const fim = c.bom ? '📁' : '⚖️';
  const inicio = performance.now();
  // Cada rolo pára depois do anterior.
  const paragens = [2600, 3700, 4800];
  const passo = () => {
    const t = performance.now() - inicio;
    rolos.forEach((r, i) => {
      if (t >= paragens[i]) {
        r.textContent = fim;
        r.classList.add('parado');
      } else r.textContent = SIMBOLOS_SLOT[Math.floor(Math.random() * SIMBOLOS_SLOT.length)];
    });
    if (t >= paragens[2]) {
      temporizadorSlot = setTimeout(() => {
        const el = $('.slot-resultado');
        if (el) el.hidden = false;
      }, 350);
      return;
    }
    temporizadorSlot = setTimeout(passo, 70 + (t / paragens[2]) ** 2 * 300);
  };
  passo();
}

// --- Notificações do plantel ---

function notificar(j, titulo, classe = '', casa = null) {
  const el = document.createElement('div');
  el.className = `notificacao ${classe}`;
  el.innerHTML = `<div class="notificacao-carta">${cartaHTML(j, { tamanho: 'pequena' })}</div><div>${casa ? `<span class="notificacao-casa">${simboloSVG(casa, 22)}${esc(CASA[casa].nome)}</span>` : ''}<strong>${esc(j.curto)}</strong><p>${esc(titulo)}</p></div>`;
  $('#notificacoes').append(el);
  setTimeout(() => el.remove(), 6000);
}

/** Compara o plantel antes e depois: tudo o que entra ou sai dá uma notificação. */
function notificarPlantel(antes) {
  if (!antes || !EU) return;
  const [a, b] = [antes.equipas[EU.equipa], S.equipas[EU.equipa]];
  if (!a || !b || antes.fase !== 'janela' || S.fase !== 'janela' || antes.janela.tipo !== S.janela.tipo) return;
  // No fecho saem jogadores de uma vez, e isso já está à vista.
  if (antes.janela.fase === 'fecho' || S.janela.fase === 'fecho') return;
  for (const id of b.plantel) {
    if (!a.plantel.includes(id) && !S.jogadores[id]?.emprestado) notificar(S.jogadores[id], 'Jogador adicionado ao plantel', 'notificacao-entrou');
  }
  for (const id of a.plantel) {
    if (b.plantel.includes(id)) continue;
    const j = antes.jogadores[id];
    if (!j || j.emprestado) continue;
    const roubo = S.janela.roubos.find((r) => r.jogador === id && r.de === EU.equipa);
    if (roubo) notificar(j, `Oh não, parece que o ${equipa(roubo.para).nome} roubou-te o ${j.curto} com um Agente.`, 'notificacao-roubo', 'empresario');
    else notificar(j, 'Jogador vendido', 'notificacao-saiu');
  }
}

/** Sempre que calha Mercado ou Jovens Talentos, primeiro o título em grande e só depois a carta. */
let chaveTitulo;
function tituloDaCasa(espera) {
  const p = S.janela?.pendente;
  const eCarta = p && (p.tipo === 'mercado' || p.tipo === 'jovens');
  const chave = eCarta ? JSON.stringify([p.tipo, p.jogador]) : null;
  const primeira = chaveTitulo === undefined;
  if (chave === chaveTitulo) return;
  chaveTitulo = chave;
  if (!chave || primeira) return;
  const DURACAO = 1500;
  segurarPainel(espera + DURACAO);
  setTimeout(() => {
    const el = $('#titulo-casa');
    el.innerHTML = `${simboloSVG(p.tipo, 92)}<span>${esc(CASA[p.tipo].nome)}</span>`;
    el.hidden = false;
    el.className = `titulo-casa titulo-casa-${p.tipo}`;
    setTimeout(() => (el.hidden = true), DURACAO);
  }, espera);
}

/** Quando os dados param, a soma em grande. */
function mostrarSoma(espera) {
  const lance = S.janela?.ultimoLance;
  const paragem = vista3d?.duracaoDados ?? 0;
  if (!lance || !espera) return;
  setTimeout(() => {
    const el = $('#soma-dados');
    el.textContent = lance.dados.reduce((s, x) => s + x, 0);
    el.hidden = false;
    setTimeout(() => (el.hidden = true), Math.max(1200, espera - paragem));
  }, paragem);
}

/** O onze a mostrar: durante o campeonato, o que está a jogar; na janela, a escolha do treinador ou o melhor possível. */
function onzeGuardado(e) {
  const formacao = e.formacao ?? '4-4-2';
  if (S.fase !== 'janela' && e.onze) return { formacao, onze: e.onze };
  return { formacao, onze: onzeEscolhido(e.plantel.map(jogador).filter((x) => x && !x.emprestado), formacao, e.escolhaOnze).onze };
}

// Enquanto um titular está no banco e o lugar dele vazio, as mudanças ficam só aqui. Vão para o servidor quando o lugar
// voltar a estar preenchido; se fechares o plantel antes disso, fica tudo como estava.
let rascunhoOnze = null;

function onzeDe(e) {
  const guardado = onzeGuardado(e);
  if (!rascunhoOnze || e.id !== minhaEquipa()?.id) return guardado;
  const valido = podeMudarOnze() && rascunhoOnze.length === guardado.onze.length && rascunhoOnze.every((id) => id == null || e.plantel.includes(id));
  if (!valido) {
    rascunhoOnze = null;
    return guardado;
  }
  return {
    formacao: guardado.formacao,
    onze: guardado.onze.map((l, i) => {
      const id = rascunhoOnze[i];
      return { posicao: l.posicao, jogador: id, overall: id == null ? null : overallNaPosicao(jogador(id), l.posicao) };
    }),
  };
}

/** Os lugares que o treinador deixou vazios e que antes tinham alguém. */
function lugaresPorPreencher(e, lugares) {
  const { onze } = onzeGuardado(e);
  return onze.filter((l, i) => lugares[i] == null && l.jogador != null);
}

function guardarOnze(lugares) {
  if (lugaresPorPreencher(minhaEquipa(), lugares).length) {
    rascunhoOnze = lugares;
    return;
  }
  rascunhoOnze = null;
  enviar({ t: 'onze', lugares });
}

const TEXTO_EFEITOS = {
  craque: 'Um craque joga no próximo jogo',
  lesao: 'falha o próximo jogo',
  suspenso: 'fica de fora do próximo jogo',
};

function textoEfeito(ef) {
  if (ef.efeito === 'modificador') return `${ef.valor > 0 ? '+' : '−'}${Math.abs(ef.valor)} no modificador do próximo jogo`;
  const nome = ef.jogador != null ? `${jogador(ef.jogador)?.curto ?? '?'} ` : '';
  return nome + TEXTO_EFEITOS[ef.efeito];
}

/** Até 6 numa fila; mais do que isso em 2 ou 3 filas, para o banco não empurrar o campo para fora da janela. */
const colunasBanco = (n) => (n <= 6 ? n : Math.ceil(n / (n <= 14 ? 2 : 3)));

/** Abre a equipa ao lado do nome em que se clicou: a janela cresce a partir daí. */
function abrirEquipa(origem) {
  equipaAberta = origem.dataset.verEquipa;
  desenharEquipa();
  const d = $('#dialogo-equipa');
  const r = origem.getBoundingClientRect();
  const largo = innerWidth > 800;
  const aEsquerda = r.left + r.width / 2 < innerWidth / 2;
  d.style.left = largo ? (aEsquerda ? `${Math.max(8, r.left)}px` : 'auto') : '';
  d.style.right = largo ? (aEsquerda ? 'auto' : `${Math.max(8, innerWidth - r.right)}px`) : '';
  d.style.margin = largo ? '8px 0' : '';
  d.style.transformOrigin = `${aEsquerda ? '0%' : '100%'} ${Math.max(0, r.top + r.height / 2 - 8)}px`;
  d.showModal();
}

/** A janela da equipa: o onze no campo, a tática, a marca e os patrocínios. */
function desenharEquipa() {
  const e = equipa(equipaAberta);
  if (!e) return;
  const { formacao, onze } = onzeDe(e);
  const noOnze = new Set(onze.map((l) => l.jogador));
  const fora = e.plantel.map(jogador).filter((x) => x && !noOnze.has(x.id)).sort((a, b) => b.overall - a.overall);
  const avisos = [
    e.capitalProximaJanela ? `${e.capitalProximaJanela > 0 ? '+' : '−'}${dinheiro(Math.abs(e.capitalProximaJanela))} na próxima janela` : '',
    e.descontoProxima ? `${Math.round(e.descontoProxima * 100)}% de desconto na próxima compra no Mercado` : '',
    e.limiteContratacoes != null ? `Sanção: mais ${e.limiteContratacoes} contratações nesta janela` : '',
    ...e.efeitos.map(textoEfeito),
  ].filter(Boolean);
  $('#dialogo-equipa').innerHTML = `
    <div class="dialogo-cabecalho">
      <div class="equipa-titulo">${emblemaSVG(e, 54)}<div><p class="nota">${mister(e)}</p><h2 class="titulo titulo-medio">${esc(e.nome)}</h2></div></div>
      <button class="btn-fechar" data-fechar aria-label="Fechar">×</button>
    </div>
    <div class="dialogo-corpo">
      <dl class="equipa-contratos">
        <dt>Tática</dt><dd>${formacao}</dd>
        ${e.marca ? `<dt>Marca</dt><dd>${esc(e.marca)}</dd><dt>Patrocínios</dt><dd>${e.patrocinios.map(esc).join(' · ')}</dd>` : ''}
      </dl>
      ${avisos.length ? `<p class="avisos-equipa">${avisos.map(esc).join(' · ')}</p>` : ''}
      <div class="campo-caixa">${campoHTML(formacao, onze, S.jogadores)}</div>
      <div class="banco">
        <p class="rotulo">${S.fase === 'janela' ? 'Fora do onze' : 'Suplente'}${fora.length ? '' : ': ninguém'}</p>
        ${fora.length ? `<div class="fora-onze" style="--colunas:${colunasBanco(fora.length)}">${fora.map((j) => `<div class="lugar-fora" data-jogador="${j.id}">${miniCartaHTML(j)}</div>`).join('')}</div>` : ''}
      </div>
    </div>`;
}

// --- O plantel: quem joga em cada lugar ---

const podeMudarOnze = () => {
  const e = minhaEquipa();
  if (!e || e.espera) return false;
  if (S.fase === 'janela') return !(S.janela.fase === 'fecho' && S.janela.prontos.includes(e.id));
  return S.fase === 'campeonato' && S.campeonato.fase === 'taticas';
};

/** Os lugares para onde o jogador pode ir: todos menos o seu, porque fora de posição só perde overall. */
function lugaresValidos(onze, origem) {
  return new Set(onze.map((_, i) => i).filter((i) => i !== origem.lugar));
}

/** O banco é uma fila vertical: quando não cabem todos, abre outra coluna à esquerda e a janela cresce. */
function ajustarBanco(jogadores, noFecho) {
  const d = $('#dialogo-plantel');
  const altura = innerHeight - 48 - $('#barra-equipa').offsetHeight - 56;
  const linhas = Math.max(1, Math.floor(altura / (noFecho ? 204 : 164)));
  d.style.setProperty('--linhas-banco', linhas);
  d.style.setProperty('--colunas-banco', Math.max(1, Math.ceil(jogadores / linhas)));
}
addEventListener('resize', () => $('#dialogo-plantel').open && desenharPlantel());
$('#dialogo-plantel').addEventListener('close', () => {
  rascunhoOnze = null;
});

function desenharPlantel() {
  const e = minhaEquipa();
  if (!e) return;
  const { formacao, onze } = onzeDe(e);
  const noOnze = new Set(onze.map((l) => l.jogador));
  const banco = e.plantel.map(jogador).filter((x) => x && !noOnze.has(x.id)).sort((a, b) => b.overall - a.overall);
  const edita = podeMudarOnze();
  const noFecho = fechoAberto();
  const doze = noFecho ? dozeFecho(banco) : null;
  const vendidos = banco.filter((x) => x.id !== doze && !x.emprestado);
  const totalBanca = vendidos.reduce((s, x) => s + x.valor * CONFIG.valores.precoBase, 0);
  const vazios = onze.filter((l) => l.jogador == null).map((l) => posicao(l.posicao));
  const porPreencher = lugaresPorPreencher(e, onze.map((l) => l.jogador));
  ajustarBanco(banco.length, noFecho);
  const cartaBanco = (j) => `<div class="banco-jogador">
      <div class="lugar-fora${edita ? ' lugar-editavel' : ''}" ${edita ? `data-banco="${j.id}"` : `data-jogador="${j.id}"`}>${miniCartaHTML(j)}<span class="lugar-pos">${[j.posicao, ...(j.alternativas ?? [])].map(posicao).join(' ')}</span></div>
      ${noFecho && j.formacao ? `<button class="btn btn-mini ${doze === j.id ? 'btn-principal' : 'btn-fantasma'}" type="button" data-acao="fecho-doze" data-jogador="${j.id}">${doze === j.id ? '12.º' : 'Ficar'}</button>` : ''}
      ${noFecho && doze !== j.id ? `<span class="nota banco-banca">banca ${dinheiro(j.valor * CONFIG.valores.precoBase)}</span>` : ''}
    </div>`;
  $('#dialogo-plantel').innerHTML = `
    <button class="btn-minimizar" data-fechar aria-label="Minimizar" title="Minimizar"><span aria-hidden="true">⌄</span></button>
    <div class="plantel-corpo">
      <div class="campo-caixa">${campoHTML(formacao, onze, S.jogadores, { editavel: edita })}</div>
      <div id="plantel-banco-caixa" class="plantel-banco-caixa">
        <p class="rotulo">Banco</p>
        <div class="plantel-banco">${banco.map(cartaBanco).join('')}</div>
      </div>
      ${porPreencher.length ? `<p class="nota plantel-dica plantel-falta">Falta preencher: ${porPreencher.map((l) => posicao(l.posicao)).join(', ')}. Se fechares agora, fica como estava.</p>`
        : edita ? '<p class="nota plantel-dica">Arrasta um jogador para trocar de lugar ou para o banco. Toca para ver a ficha.</p>' : ''}
      ${noFecho ? `<div class="plantel-fecho">
        <p class="nota">${vendidos.length ? `Vão para a banca: ${dinheiro(totalBanca)}.` : 'Não sai ninguém.'}${vazios.length ? ` Emprestados para ${vazios.join(', ')}.` : ''}</p>
        <button class="btn btn-principal" data-acao="fechar" ${porPreencher.length ? 'disabled' : ''}>Confirmar plantel</button>
      </div>` : ''}
    </div>`;
}

// Arrastar: só aparecem como destino os lugares possíveis. Um toque sem arrastar abre a ficha do jogador.
let arrasto = null;
let fimArrasto = 0;

function destinosArrasto(origem) {
  const { onze } = onzeDe(minhaEquipa());
  const lugares = lugaresValidos(onze, origem);
  const bancos = new Set(origem.lugar != null ? $$('#dialogo-plantel [data-banco]').map((el) => Number(el.dataset.banco)) : []);
  return { onze, lugares, bancos };
}

function iniciarArrasto(ev) {
  const a = arrasto;
  a.ativo = true;
  const { onze, lugares, bancos } = destinosArrasto(a.origem);
  a.onze = onze;
  a.lugares = lugares;
  a.bancos = bancos;
  for (const el of $$('#dialogo-plantel [data-lugar]')) el.classList.add(lugares.has(Number(el.dataset.lugar)) ? 'valido' : 'invalido');
  for (const el of $$('#dialogo-plantel [data-banco]')) el.classList.add(bancos.has(Number(el.dataset.banco)) ? 'valido' : 'invalido');
  if (a.origem.lugar != null) $('#plantel-banco-caixa').classList.add('alvo-banco');
  const r = a.el.getBoundingClientRect();
  a.fantasma = a.el.cloneNode(true);
  a.fantasma.classList.remove('invalido', 'valido');
  a.fantasma.classList.add('fantasma-arrasto');
  a.fantasma.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;transform:translate(${ev.clientX - r.width / 2}px,${ev.clientY - r.height / 2}px);pointer-events:none;z-index:9;`;
  a.dx = r.width / 2;
  a.dy = r.height / 2;
  $('#dialogo-plantel').append(a.fantasma);
  a.el.classList.add('arrastado');
}

document.addEventListener('pointerdown', (ev) => {
  const el = ev.target.closest('#dialogo-plantel [data-lugar], #dialogo-plantel [data-banco]');
  if (!el) return;
  ev.preventDefault();
  const origem = el.dataset.lugar != null ? { lugar: Number(el.dataset.lugar) } : { banco: Number(el.dataset.banco) };
  arrasto = { el, origem, x: ev.clientX, y: ev.clientY, ativo: false };
});

document.addEventListener('pointermove', (ev) => {
  if (!arrasto) return;
  if (!arrasto.ativo) {
    if (Math.hypot(ev.clientX - arrasto.x, ev.clientY - arrasto.y) < 7) return;
    const { origem } = arrasto;
    if (origem.lugar != null && onzeDe(minhaEquipa()).onze[origem.lugar].jogador == null) return;
    iniciarArrasto(ev);
  }
  arrasto.fantasma.style.transform = `translate(${ev.clientX - arrasto.dx}px,${ev.clientY - arrasto.dy}px)`;
});

function acabarArrasto(ev, cancelado) {
  const a = arrasto;
  if (!a) return;
  arrasto = null;
  if (!a.ativo) {
    if (cancelado) return;
    const id = a.origem.banco ?? onzeDe(minhaEquipa()).onze[a.origem.lugar].jogador;
    if (id != null) abrirJogador(id);
    return;
  }
  fimArrasto = performance.now();
  a.fantasma.remove();
  const debaixo = cancelado ? null : document.elementFromPoint(ev.clientX, ev.clientY);
  const alvo = debaixo?.closest('#dialogo-plantel [data-lugar], #dialogo-plantel [data-banco]');
  const nova = a.onze.map((l) => l.jogador);
  let mudou = false;
  if (alvo?.dataset.lugar != null && a.lugares.has(Number(alvo.dataset.lugar))) {
    const i = Number(alvo.dataset.lugar);
    if (a.origem.banco != null) nova[i] = a.origem.banco;
    else [nova[i], nova[a.origem.lugar]] = [nova[a.origem.lugar], nova[i]];
    mudou = true;
  } else if (alvo?.dataset.banco != null && a.bancos.has(Number(alvo.dataset.banco))) {
    nova[a.origem.lugar] = Number(alvo.dataset.banco);
    mudou = true;
  } else if (a.origem.lugar != null && debaixo?.closest('#plantel-banco-caixa')) {
    // Para o banco: o lugar fica vazio até alguém o ocupar.
    nova[a.origem.lugar] = null;
    mudou = true;
  }
  if (mudou) guardarOnze(nova);
  desenharPlantel();
}
document.addEventListener('pointerup', (ev) => acabarArrasto(ev, false));
document.addEventListener('pointercancel', (ev) => acabarArrasto(ev, true));

// --- Diálogo de um jogador: propostas, Agente, banca ---

function abrirJogador(id) {
  const jg = jogador(id);
  if (!jg) return;
  const e = minhaEquipa();
  const j = S.janela;
  const meu = jg.equipa === e?.id;
  const dono = jg.equipa ? equipa(jg.equipa) : null;
  const naJanela = S.fase === 'janela' && e && !e.espera;
  const minhaVez = naJanela && j.fase === 'tabuleiro' && j.ordem[j.vez] === e.id && !j.leilao && !j.pendente && !j.contestacao;
  let acoes = '';
  if (naJanela && meu && !jg.emprestado) {
    const emDivida = e.dinheiro < 0 && !jg.soBanca;
    if (emDivida) {
      const livre = j.fase === 'tabuleiro' && !j.leilao && !j.pendente && !j.contestacao;
      acoes += `<button class="btn btn-principal" data-acao="leiloar_divida" data-jogador="${id}" ${livre ? '' : 'disabled'}>Leiloar · a partir de ${dinheiro(jg.valor * CONFIG.transferencias.leilaoDivida)}</button>
        <p class="nota">Estás em saldo negativo: não podes vender à banca. Se ninguém licitar, vai para a banca por ${dinheiro(jg.valor * CONFIG.valores.precoBase)}.${livre ? '' : ' Há uma decisão por resolver: espera um pouco.'}</p>`;
    } else acoes += `<button id="pedir-venda" class="btn btn-fantasma" data-acao="pedir-venda">Vender à banca · ${dinheiro(jg.valor * CONFIG.valores.precoBase)}</button>
      <div id="confirma-venda" class="confirma-venda" hidden>
        <p>Tens a certeza? Este jogador vai ser removido do teu plantel.</p>
        <div class="linha-botoes"><button class="btn btn-principal" data-acao="vender_banca" data-jogador="${id}">Sim, vender</button><button class="btn btn-contorno" data-acao="cancelar-venda">Cancelar</button></div>
      </div>`;
    if (e.cartas.empresario && !jg.inflacionada) acoes += `<button class="btn btn-fantasma" data-acao="inflacionar" data-jogador="${id}">${moedaEmpresarioSVG(20)} Agente: cláusula para ${dinheiro(jg.valor * CONFIG.valores.clausulaInflacionada)}</button>`;
  } else if (naJanela && dono?.treinador && !meu) {
    const compras = j.compras?.[e.id]?.[jg.equipa] ?? 0;
    const limite = CONFIG.transferencias.maxPorTreinador;
    const bloqueio = jg.emprestado ? 'Está emprestado.' : jg.soBanca ? 'Só pode ser vendido à banca.' : jg.compradoRonda === j.ronda ? 'Foi comprado nesta ronda.' : compras >= limite ? `Já compraste ${limite} jogadores a este treinador nesta janela.` : null;
    if (bloqueio) acoes += `<p class="nota">${bloqueio}</p>`;
    else {
      acoes += `<div class="linha-botoes">
          <button class="btn btn-principal" data-acao="mostrar-proposta" ${minhaVez ? '' : 'disabled'}>Proposta de transferência</button>
          <button class="btn btn-fantasma" data-acao="abrir-troca" data-jogador="${id}">Troca</button>
        </div>
        ${minhaVez ? '' : '<p class="nota">A proposta de transferência é só na tua vez, no tabuleiro.</p>'}
        <div id="caixa-proposta" hidden>
          <div class="lance"><input id="valor-proposta" class="campo" type="number" step="0.5" min="0.1" value="${jg.valor}" aria-label="Valor da proposta (M€)">
            <button class="btn btn-principal" data-acao="propor" data-jogador="${id}">Propor</button></div>
          <p class="nota">Abre um leilão. Com ${dinheiro(jg.clausula)} ou mais bates a cláusula e a venda é obrigatória.</p>
        </div>`;
      if (minhaVez && e.cartas.empresario) acoes += `<button class="btn btn-fantasma" data-acao="exclusividade" data-jogador="${id}">${moedaEmpresarioSVG(20)} Agente: comprar em exclusivo por ${dinheiro(jg.clausula)}</button>`;
    }
  }
  $('#dialogo-jogador').innerHTML = `
    <div class="dialogo-cabecalho"><h2 class="titulo titulo-medio">${esc(jg.nome)}</h2><button class="btn-fechar" data-fechar aria-label="Fechar">×</button></div>
    <div class="dialogo-corpo jogador-detalhe">
      ${cartaHTML(jg, { tamanho: 'grande' })}
      <div class="ficha-jogador">
        <dl>
          <dt>Equipa atual</dt><dd>${dono ? esc(dono.nome) : 'Livre'}</dd>
          <dt>Posições</dt><dd>${[jg.posicao, ...(jg.alternativas ?? [])].map(posicao).join(', ')}</dd>
          <dt>Idade</dt><dd>${jg.idade} anos</dd>
        </dl>
        <hr>
        <dl>
          <dt>Nacionalidade</dt><dd>${esc(jg.nacao)}</dd>
          <dt>Liga</dt><dd>${esc(jg.liga)}</dd>
          <dt>Clube real</dt><dd>${esc(jg.clube)}</dd>
        </dl>
        <hr>
        <dl>
          <dt>Valor</dt><dd>${dinheiro(jg.valor)}</dd>
          <dt>Cláusula</dt><dd>${dinheiro(jg.clausula)}${jg.inflacionada ? ' (inflacionada)' : ''}</dd>
        </dl>
      </div>
      <div class="jogador-acoes">${acoes}</div>
      <p id="credito-foto" class="nota credito-foto"></p>
    </div>`;
  $('#dialogo-jogador').showModal();
  if (jg.foto) mostrarCredito(id);
}

// Os créditos das fotos (autor e licença, do Commons) só se carregam quando se abre um jogador.
let creditos = null;
async function mostrarCredito(id) {
  creditos ??= fetch('/dados/creditos-fotos.json').then((r) => r.json()).catch(() => ({}));
  const c = (await creditos)[id];
  const el = $('#credito-foto');
  if (c && el) el.textContent = `Foto: ${c[0] || 'autor desconhecido'} · ${c[1]} · Wikimedia Commons`;
}

/** Proposta de troca: escolhe-se quem damos em troca deste jogador. */
function abrirTroca(pedido) {
  const alvo = jogador(pedido);
  const lista = minhaEquipa().plantel.map(jogador).filter((x) => x && !x.emprestado && !x.soBanca).sort((a, b) => b.overall - a.overall)
    .map((x) => `<button type="button" class="linha-jog linha-troca" data-acao="propor_troca" data-para="${alvo.equipa}" data-dar="${x.id}" data-receber="${pedido}"><span class="mini-ovr mini-${nivel(x.overall)}">${x.overall}</span><span class="linha-pos">${posicao(x.posicao)}</span><span class="linha-nome">${esc(x.curto)}</span><span class="linha-valor">${dinheiro(x.valor)}</span></button>`).join('');
  $('#dialogo-troca').innerHTML = `
    <h2 class="titulo titulo-medio"><span>Troca por</span> <span class="caramelo">${esc(alvo.curto)}</span></h2>
    <p class="nota">Qual dos teus jogadores dás a ${nomeEquipa(alvo.equipa)}? O outro treinador tem de aceitar.</p>
    <div class="lista-jogadores troca-lista">${lista}</div>
    <button class="btn btn-contorno" data-fechar>Cancelar</button>`;
  $('#dialogo-troca').showModal();
}

// --- Eventos ---

async function criarSala() {
  const nome = $('#nome').value.trim();
  if (!nome) return ($('#erro-inicio').textContent = 'Escreve o teu nome.');
  ID.nome = nome;
  const r = await fetch('/api/salas', { method: 'POST', body: JSON.stringify({ token: ID.token }) }).then((x) => x.json()).catch(() => ({ erro: 'Sem ligação.' }));
  if (r.erro) return ($('#erro-inicio').textContent = r.erro);
  history.pushState(null, '', `/sala/${r.codigo}${ID.sufixo}`);
  arrancar();
}

async function entrarSala(ev) {
  ev.preventDefault();
  const nome = $('#nome').value.trim();
  const codigo = $('#codigo').value.trim().toUpperCase();
  if (!nome) return ($('#erro-inicio').textContent = 'Escreve o teu nome.');
  if (!/^[A-Z]{4}$/.test(codigo)) return ($('#erro-inicio').textContent = 'O código tem 4 letras.');
  const info = await fetch(`/api/salas/${codigo}`).then((x) => x.json()).catch(() => ({}));
  if (!info.existe) return ($('#erro-inicio').textContent = 'Essa sala não existe.');
  ID.nome = nome;
  history.pushState(null, '', `/sala/${codigo}${ID.sufixo}`);
  arrancar();
}

function enviarEquipa() {
  enviar({ t: 'equipa', nome: $('#nome-equipa')?.value, kit: { principal: $('#cor-1').value, secundaria: $('#cor-2').value } });
}

const ACOES = {
  'abrir-emblema': () => abrirCriadorEmblema($('#dialogo-emblema'), equipa(treinador(EU.id).equipa), (dados) => enviar({ t: 'emblema', dados })),
  copiar: () => navigator.clipboard.writeText(`${location.origin}/sala/${S.codigo}`).then(() => toast('Link copiado.')),
  pronto: () => enviar({ t: 'pronto', pronto: !treinador(EU.id).pronto }),
  comecar: () => enviar({ t: 'comecar' }),
  formacao: (d) => enviar({ t: 'formacao', formacao: d.formacao }),
  draft: (d) => enviar({ t: 'draft', jogador: d.jogador ? Number(d.jogador) : null }),
  lancar: () => enviar({ t: 'lancar' }),
  terminar_vez: () => enviar({ t: 'terminar_vez' }),
  comprar: () => enviar({ t: 'comprar' }),
  passar: () => enviar({ t: 'passar' }),
  descartar_rede: (d) => enviar({ t: 'descartar_rede', liga: d.liga }),
  licitar: () => {
    lanceProposto = Number($('#valor-lance').value);
    enviar({ t: 'licitar', valor: lanceProposto });
  },
  'lance-rapido': (d) => enviar({ t: 'licitar', valor: Number(d.valor) }),
  desistir: () => enviar({ t: 'desistir' }),
  decidir: (d) => enviar({ t: 'decidir', aceitar: Boolean(d.aceitar) }),
  responder_empresario: (d) => enviar({ t: 'responder_empresario', anular: Boolean(d.anular) }),
  responder_troca: (d) => enviar({ t: 'responder_troca', troca: Number(d.troca), aceitar: Boolean(d.aceitar) }),
  pronto_fechar: (d) => enviar({ t: 'pronto_fechar', pronto: Boolean(d.pronto) }),
  fechar: () => {
    const e = minhaEquipa();
    const { onze } = onzeDe(e);
    const noOnze = new Set(onze.map((l) => l.jogador));
    const doze = dozeFecho(e.plantel.map(jogador).filter((x) => x && !noOnze.has(x.id)));
    enviar({ t: 'fechar', manter: [...noOnze].filter((id) => id != null).concat(doze != null ? [doze] : []) });
    $('#dialogo-plantel').close();
  },
  'fecho-doze': (d) => {
    const id = Number(d.jogador);
    const atual = dozeFecho(minhaEquipa().plantel.map(jogador).filter(Boolean).filter((x) => !onzeDe(minhaEquipa()).onze.some((l) => l.jogador === x.id)));
    fecho = { doze: atual === id ? null : id };
    desenharPlantel();
  },
  confirmar_carta: () => enviar({ t: 'confirmar_carta' }),
  avancar: () => enviar({ t: 'avancar' }),
  forcar_ronda: () => enviar({ t: 'forcar_ronda' }),
  usar_medico: (d) => enviar({ t: 'usar_medico', jogador: Number(d.jogador) }),
  lesao_suplente: (d) => enviar({ t: 'lesao_suplente', jogador: Number(d.jogador) }),
  lesao_ficar: (d) => enviar({ t: 'lesao_ficar', jogador: Number(d.jogador) }),
  lancar_ronda: () => {
    abrirSub = false;
    enviar({ t: 'lancar_ronda' });
  },
  'abrir-substituicao': () => {
    abrirSub = !abrirSub;
    atualizarAoVivo();
  },
  'pedir-venda': () => {
    $('#pedir-venda').hidden = true;
    $('#confirma-venda').hidden = false;
  },
  'cancelar-venda': () => {
    $('#pedir-venda').hidden = false;
    $('#confirma-venda').hidden = true;
  },
  'abrir-classificacoes': () => {
    desenharClassificacoes();
    $('#dialogo-classificacoes').showModal();
  },
  tatica: (d) => enviar({ t: 'tatica', tatica: d.tatica }),
  substituir: (d) => {
    abrirSub = false;
    enviar({ t: 'substituir', sai: Number(d.sai) });
  },
  continuar: () => enviar({ t: 'continuar' }),
  comprar_emprestado: (d) => enviar({ t: 'comprar_emprestado', jogador: Number(d.jogador) }),
  patrocinio: (d) => enviar({ t: 'patrocinio', aceitar: Boolean(d.aceitar), substitui: Number(d.substitui ?? 0) }),
  forcar_vez: () => enviar({ t: 'forcar_vez' }),
  forcar_leilao: () => enviar({ t: 'forcar_leilao' }),
  forcar_fecho: () => confirm('Fechar a janela já? Quem ainda não completou as voltas perde o resto.') && enviar({ t: 'forcar_fecho' }),
  propor: (d) => {
    enviar({ t: 'propor', jogador: Number(d.jogador), valor: Number($('#valor-proposta').value) });
    $('#dialogo-jogador').close();
    $('#dialogo-equipa').close();
  },
  exclusividade: (d) => {
    enviar({ t: 'exclusividade', jogador: Number(d.jogador) });
    $('#dialogo-jogador').close();
  },
  inflacionar: (d) => {
    enviar({ t: 'inflacionar', jogador: Number(d.jogador) });
    $('#dialogo-jogador').close();
  },
  leiloar_divida: (d) => {
    enviar({ t: 'leiloar_divida', jogador: Number(d.jogador) });
    $('#dialogo-jogador').close();
  },
  'fim-aba': (d) => {
    abaFimEpoca = d.aba;
    desenharPainel();
  },
  'fim-continuar': () => {
    passoFimEpoca = 2;
    desenharPainel();
    $('#col-acao').scrollTop = 0;
  },
  vender_banca: (d) => {
    enviar({ t: 'vender_banca', jogador: Number(d.jogador) });
    $('#dialogo-jogador').close();
  },
  'abrir-troca': (d) => abrirTroca(Number(d.jogador)),
  propor_troca: (d) => {
    enviar({ t: 'propor_troca', para: d.para, dar: [Number(d.dar)], receber: [Number(d.receber)] });
    $('#dialogo-troca').close();
    $('#dialogo-jogador').close();
  },
  'mostrar-proposta': () => {
    const caixa = $('#caixa-proposta');
    caixa.hidden = !caixa.hidden;
    if (!caixa.hidden) $('#valor-proposta').select();
  },
  'abrir-plantel': () => {
    const d = $('#dialogo-plantel');
    if (d.open) return d.close();
    rascunhoOnze = null;
    desenharPlantel();
    d.show();
  },
  'abrir-registo': () => {
    desenharRegisto();
    $('#dialogo-registo').showModal();
  },
};

document.addEventListener('click', (ev) => {
  const contrato = ev.target.closest('[data-contrato]');
  if (contrato || contratoAmpliado) ampliarContrato(contrato && contrato.dataset.contrato !== contratoAmpliado ? contrato.dataset.contrato : null);
  if (contrato) return;
  if (ev.target.matches('#dialogo-equipa, #dialogo-jogador')) {
    const r = ev.target.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return ev.target.close();
  }
  const plantel = $('#dialogo-plantel');
  if (plantel.open && performance.now() - fimArrasto > 200 && !ev.target.closest('dialog, [data-acao=abrir-plantel]')) plantel.close();
  const abrir = ev.target.closest('[data-abrir]');
  if (abrir) return $(`#${abrir.dataset.abrir}`).showModal();
  if (ev.target.closest('[data-fechar]')) return ev.target.closest('dialog')?.close();
  const acao = ev.target.closest('[data-acao]');
  if (acao && !acao.disabled) return ACOES[acao.dataset.acao]?.(acao.dataset);
  const cfg = ev.target.closest('[data-config]');
  if (cfg && !cfg.disabled) {
    const v = cfg.dataset.valor;
    return enviar({ t: 'config', [cfg.dataset.config]: /^\d+$/.test(v) ? Number(v) : v });
  }
  const padrao = ev.target.closest('[data-padrao]');
  if (padrao) return enviar({ t: 'equipa', kit: { padrao: padrao.dataset.padrao } });
  const verEquipa = ev.target.closest('[data-ver-equipa]');
  if (verEquipa) return abrirEquipa(verEquipa);
  const sep = ev.target.closest('[data-separador]');
  if (sep) {
    separador = sep.dataset.separador;
    return desenharClassificacoes();
  }
  const menu = $('#menu-jogo');
  if (menu?.open && !ev.target.closest('#menu-jogo')) menu.open = false;
  const linha = ev.target.closest('[data-jogador]');
  if (linha && !ev.target.closest('input, label, button:not([data-jogador])') && S?.fase !== 'lobby') return abrirJogador(Number(linha.dataset.jogador));
});

$('#dialogo-carta').addEventListener('cancel', (ev) => ev.preventDefault());

// Enquanto se escolhe, o equipamento acompanha a cor e o slider o número de bots; só se envia no fim.
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.matches('#cor-1, #cor-2')) {
    const e = minhaEquipa();
    const kitAtual = { ...e.kit, principal: $('#cor-1').value, secundaria: $('#cor-2').value };
    $('.editor-previa').innerHTML = previaEquipaHTML({ ...e, kit: kitAtual });
    $('.padroes').innerHTML = padroesHTML(kitAtual);
  } else if (t.matches('#slider-bots')) {
    $('#valor-bots').textContent = t.value;
    t.style.setProperty('--p', `${(t.value / t.max) * 100}%`);
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.matches('#nome-equipa, #cor-1, #cor-2')) enviarEquipa();
  else if (t.matches('#slider-bots')) enviar({ t: 'config', bots: Number(t.value) });
  else if (t.matches('#volume')) {
    mudarVolume(Number(t.value));
    tocar('dado');
  }
});

// Foto que não carrega: sai e fica a silhueta (o evento de erro das imagens não sobe, por isso apanha-se na captura).
document.addEventListener('error', (ev) => ev.target.matches?.('.foto-jogador') && ev.target.remove(), true);

$('#btn-criar').addEventListener('click', criarSala);
$('#form-entrar').addEventListener('submit', entrarSala);
$('#form-nome').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const nome = $('#nome-link').value.trim();
  if (!nome) return;
  ID.nome = nome;
  ligar();
});
// A altura do rodapé: o plantel fica atrás dele e as notificações por cima.
new ResizeObserver(([r]) => document.documentElement.style.setProperty('--altura-barra', `${Math.ceil(r.target.offsetHeight)}px`)).observe($('#barra-equipa'));
instalarFundos();
$('#volume').value = volume();
$('#btn-sair').addEventListener('click', () => {
  if (!confirm('Sair da sala? A tua equipa fica no jogo e podes voltar pelo mesmo link.')) return;
  ligacao?.fechar();
  history.pushState(null, '', `/${ID.sufixo}`);
  S = null;
  arrancar();
});
window.addEventListener('popstate', () => location.reload());

arrancar();
