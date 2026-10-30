// Cliente do The Gaffer: ecrãs de início e lobby, e a janela de transferências (tabuleiro 2D, draft, leilões,
// propostas, fecho). O servidor é autoritativo: aqui só se desenha o estado e se enviam intenções.
import { Ligacao } from './ligacao.js';
import { CONFIG } from './comum/config.gen.js';
import { melhorOnze } from './comum/formacao.gen.js';
import { equipamentoSVG, PADROES } from './equipamento.js';
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
let separador = 'equipas';
let fecho = null; // { manter: Set, jovem } enquanto se escolhe o plantel no fecho
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
    S = msg.sala;
    EU = msg.eu;
    desenhar();
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

function desenharLobby() {
  const eu = minhaEquipa();
  const anf = souAnfitriao();
  const editorAberto = $('#editor-equipa')?.contains(document.activeElement);
  const equipas = S.treinadores.filter((t) => !t.saiu).map((t) => {
    const e = equipa(t.equipa);
    return `<li class="linha-equipa${t.id === EU.id ? ' eu' : ''}${t.ligado ? '' : ' desligado'}">${kit(e, 38)}
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
  const html = `
    <section class="cartao ocupa-tudo">
      <div class="lobby-sala">
        <div><p class="rotulo">Sala</p><p class="codigo-grande">${S.codigo}</p></div>
        <button class="btn btn-fantasma" type="button" data-acao="copiar">Copiar link</button>
      </div>
      <p class="nota">Partilha o link no Discord. Quem entrar depois de a partida começar fica a ver até à janela seguinte.</p>
    </section>
    <section class="cartao">
      <p class="rotulo">Treinadores <small>(${S.treinadores.filter((t) => !t.saiu).length}/${CONFIG.sala.maxTreinadores})</small></p>
      <ul class="lista-equipas">${equipas}</ul>
    </section>
    <section class="cartao lobby-config">
      <p class="rotulo">Duração</p>
      <div class="segmentos" role="radiogroup" aria-label="Duração">${CONFIG.sala.epocas.map((n) => seg('epocas', n, `${n} épocas`)).join('')}</div>
      <p class="rotulo">Equipas bot</p>
      <div class="segmentos" role="radiogroup" aria-label="Número de bots">${[0, 1, 2, 3, 4, 5, 6].map((n) => seg('bots', n, String(n))).join('')}</div>
      <div class="segmentos" role="radiogroup" aria-label="Nível dos bots">${seg('nivelBots', 'inferior', 'Inferior', 'overall mais baixo')}${seg('nivelBots', 'equivalente', 'Equivalente', 'como os treinadores')}</div>
      <p class="nota">${anf ? 'És o anfitrião.' : 'Só o anfitrião muda a configuração.'} ${total} equipas = ${jornadas} jornadas por época.${botExtra ? ' Como são ímpares, entra 1 bot para todos jogarem sempre.' : ''}</p>
    </section>
    <section id="editor-equipa" class="cartao ocupa-tudo"></section>
    <section class="cartao ocupa-tudo">
      <button class="btn ${treinador(EU.id).pronto ? 'btn-fantasma' : 'btn-principal'}" type="button" data-acao="pronto">${treinador(EU.id).pronto ? 'Afinal, ainda não' : 'Estou pronto'}</button>
      ${anf ? `<button class="btn btn-principal" type="button" data-acao="comecar" ${S.faltaParaComecar ? 'disabled' : ''}>Começar partida</button>` : ''}
      <p class="nota centro">${esc(S.faltaParaComecar ?? (anf ? 'Todos prontos: podes começar.' : 'À espera do anfitrião.'))}</p>
    </section>`;
  const editor = $('#editor-equipa')?.innerHTML;
  $('#lobby').innerHTML = html;
  if (editorAberto && editor) $('#editor-equipa').innerHTML = editor;
  else desenharEditor(eu);
}

function desenharEditor(e) {
  $('#editor-equipa').innerHTML = `
    <p class="rotulo">A tua equipa</p>
    <div class="editor-equipa">
      <div class="editor-previa">${equipamentoSVG({ ...e.kit, tamanho: 112 })}
        <div class="emblema-vazio" title="O emblema chega no passo 7">Emblema<br>(em breve)</div></div>
      <div class="lobby-config">
        <input id="nome-equipa" class="campo" maxlength="24" value="${esc(e.nome)}" aria-label="Nome da equipa">
        <div class="cores">
          <label class="cor"><input id="cor-1" type="color" value="${e.kit.principal}"> Principal</label>
          <label class="cor"><input id="cor-2" type="color" value="${e.kit.secundaria}"> Secundária</label>
        </div>
        <div class="padroes" role="radiogroup" aria-label="Equipamento">${PADROES.map((p) => `
          <button class="segmento" role="radio" aria-checked="${p.id === e.kit.padrao}" data-padrao="${p.id}" title="${p.nome}">${equipamentoSVG({ ...e.kit, padrao: p.id, tamanho: 34 })}<small>${p.curto}</small></button>`).join('')}</div>
      </div>
    </div>`;
}

// --- Jogo ---

const FASES = { formacao: 'Formação', draft: 'Draft', tabuleiro: 'Tabuleiro', fecho: 'Fecho da janela' };

function desenharJogo() {
  const e = minhaEquipa();
  const j = S.janela;
  let info = `<span class="ronda">Época ${S.epoca}/${S.config.epocas}</span> · `;
  if (S.fase === 'janela') info += `Janela de ${j.tipo === 'verao' ? 'verão' : 'inverno'} · ${FASES[j.fase]}`;
  else if (S.fase === 'campeonato') info += S.campeonato.competicao === 'taca' ? `Taça · ${S.campeonato.ronda}` : `Campeonato · ${S.campeonato.volta}.ª volta · jornada ${Math.min(S.campeonato.jornada + 1, S.campeonato.jornadas)}`;
  else if (S.fase === 'fimEpoca') info += 'Fim da época';
  else info += 'Fim da partida';
  $('#barra-info').innerHTML = info;
  $('#barra-dinheiro').innerHTML = e && !e.espera ? `<strong>${dinheiro(e.dinheiro)}</strong>` : '<small>A ver</small>';

  $('#col-acao').innerHTML = painelAcao();
  desenharTabuleiro();
  desenharLado();
  if ($('#dialogo-equipa').open) desenharEquipa();
}

/** O 3D carrega só quando é preciso: até lá, e sem WebGL, fica o tabuleiro 2D. */
function desenharTabuleiro() {
  const j = S.janela;
  const grelha = $('.jogo-grelha');
  const painelPrimeiro = S.fase === 'fimEpoca' || S.fase === 'fim' || (S.fase === 'janela' && j?.fase !== 'tabuleiro');
  // Quem acabou de confirmar lá em baixo tem de ver o tabuleiro a transformar-se.
  if (grelha.classList.contains('painel-primeiro') && !painelPrimeiro) scrollTo({ top: 0, behavior: 'smooth' });
  grelha.classList.toggle('painel-primeiro', painelPrimeiro);
  const legenda = j?.fase === 'tabuleiro' ? `Vez de <strong>${nomeEquipa(j.ordem[j.vez])}</strong> · Ronda ${j.ronda}` : '';
  if (vista3d) {
    vista3d.atualizar(S, EU);
    $('#legenda-3d').innerHTML = legenda;
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
    relvado2d = new Relvado($('#relvado-2d'));
    const passo = () => {
      if (!relvado2d) return;
      relvado2d.tick(performance.now());
      setTimeout(passo, 66);
    };
    passo();
  }
  relvado2d.definirJogo(jogos.find((x) => x.lados.some((l) => l.equipa === EU?.equipa)) ?? jogos[0], S.equipas, performance.now());
}

async function iniciar3d() {
  if (vista3d || semWebgl || aCarregar3d) return;
  aCarregar3d = true;
  try {
    const teste = document.createElement('canvas');
    if (!teste.getContext('webgl2') && !teste.getContext('webgl')) throw new Error('sem WebGL');
    const { Tabuleiro3D } = await import('./tabuleiro3d.js');
    $('#col-tabuleiro').innerHTML = '<div id="caixa-3d" class="caixa-3d"><p id="legenda-3d" class="legenda-3d"></p></div>';
    vista3d = new Tabuleiro3D($('#caixa-3d'));
    desenharTabuleiro();
  } catch (e) {
    console.warn('Sem tabuleiro 3D:', e);
    semWebgl = true;
    desenhar();
  }
}

function centroTabuleiro() {
  const j = S.janela;
  const l = j?.ultimoLance;
  const dados = l ? `<div class="dados">${l.dados.map(dadoHTML).join('')}</div><p class="nota">${nomeEquipa(l.equipa)}</p>` : '';
  let vez = '';
  if (j?.fase === 'tabuleiro') vez = `<p class="centro-vez">Vez de <strong>${nomeEquipa(j.ordem[j.vez])}</strong><br><small>Ronda ${j.ronda}</small></p>`;
  return `<img src="/favicon.svg" alt="" width="44" height="44" class="centro-logo">${vez}${dados}`;
}

function painelAcao() {
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

function painelFormacao(e) {
  const j = S.janela;
  const falta = Object.values(S.equipas).filter((x) => x.treinador && !x.espera && !j.prontos.includes(x.id)).map((x) => esc(x.nome));
  const botoes = Object.keys(CONFIG.formacoes).map((f) => `<button class="segmento" role="radio" aria-checked="${e.formacao === f && j.prontos.includes(e.id)}" data-acao="formacao" data-formacao="${f}">${f}</button>`).join('');
  const emprestados = e.plantel.map(jogador).filter((x) => x?.emprestadoLesao);
  return `<h2 class="painel-titulo">Formação</h2>
    <p>Escolhe a formação para esta janela. O onze no fecho tem de encaixar nela.</p>
    <div class="segmentos">${botoes}</div>
    ${emprestados.map((x) => `<div class="carta-evento evento-bom"><p>${esc(x.curto)} (${x.overall}) estava emprestado e sai quando escolheres a formação. Podes comprá-lo.</p>
      <button class="btn btn-mini btn-principal" data-acao="comprar_emprestado" data-jogador="${x.id}" ${e.dinheiro < x.valor ? 'disabled' : ''}>Comprar por ${dinheiro(x.valor)}</button></div>`).join('')}
    <p class="nota">${falta.length ? `Falta: ${falta.join(', ')}` : ''}</p>`;
}

function painelDraft(e) {
  const d = S.janela.draft;
  const atual = d.escolhas[d.i];
  const minha = atual.equipa === e.id;
  const tipo = atual.tipo === 'jovem' ? 'jovem promessa' : 'escolha extra (só se vende à banca)';
  const cartas = d.opcoes.map(({ id, preco }) => {
    const jg = jogador(id);
    const botao = minha ? `<button class="btn btn-principal btn-mini" data-acao="draft" data-jogador="${id}" ${e.dinheiro < preco ? 'disabled' : ''}>Escolher · ${dinheiro(preco)}</button>` : `<span class="nota">${dinheiro(preco)}</span>`;
    return `<div class="opcao">${cartaHTML(jg, { tamanho: 'pequena' })}${botao}</div>`;
  }).join('');
  return `<h2 class="painel-titulo">Draft</h2>
    <p>${minha ? `<strong>Escolhe</strong> a tua ${tipo}.` : `A escolher: <strong>${nomeEquipa(atual.equipa)}</strong> (${tipo}).`}</p>
    <div class="opcoes">${cartas}</div>
    ${minha ? '<button class="btn btn-contorno" data-acao="draft">Passar esta escolha</button>' : ''}
    <p class="nota">Escolha ${d.i + 1} de ${d.escolhas.length}. Os jovens entram na formação com um potencial escondido.</p>`;
}

function painelLeilao(e) {
  const l = S.janela.leilao;
  const jg = jogador(l.jogador);
  const participo = l.participantes.includes(e.id) && !l.desistiram.includes(e.id);
  const souLider = l.lider === e.id;
  const minimo = l.lider ? Math.round((l.valor + CONFIG.leilao.incrementoMinimo) * 10) / 10 : l.minimo;
  const origem = l.origem === 'mesa' ? 'Leilão da carta' : `Proposta por um jogador de ${nomeEquipa(l.vendedor)}${l.obrigatorio ? ' · cláusula batida: venda obrigatória' : ''}`;
  const ativos = l.participantes.filter((x) => x !== l.lider && !l.desistiram.includes(x)).map(nomeEquipa);
  let acoes = '';
  if (l.fase === 'decisao') {
    acoes = l.vendedor === e.id
      ? `<p><strong>Decides tu:</strong> vender a ${nomeEquipa(l.lider)} por ${dinheiro(l.valor)}?</p>
         <div class="linha-botoes"><button class="btn btn-principal" data-acao="decidir" data-aceitar="1">Vender</button><button class="btn btn-contorno" data-acao="decidir">Recusar</button></div>`
      : `<p class="nota">${nomeEquipa(l.vendedor)} está a decidir se vende.</p>`;
  } else if (participo && !souLider) {
    const valor = lanceProposto != null && lanceProposto >= minimo ? lanceProposto : minimo;
    acoes = `<div class="lance">
        <input id="valor-lance" class="campo" type="number" step="0.5" min="${minimo}" value="${valor}" aria-label="Valor do lance (M€)">
        <button class="btn btn-principal" data-acao="licitar" ${e.dinheiro < minimo ? 'disabled' : ''}>Licitar</button>
      </div>
      <div class="linha-botoes">
        ${[0, 1, 5].map((x) => `<button class="btn btn-mini" data-acao="lance-rapido" data-valor="${Math.round((minimo + x) * 10) / 10}">${dinheiro(minimo + x)}</button>`).join('')}
        <button class="btn btn-contorno btn-mini" data-acao="desistir">${l.origem === 'mesa' ? 'Passar' : 'Desistir'}</button>
      </div>`;
  } else if (souLider) acoes = '<p><strong>Tens o lance mais alto.</strong></p>';
  else acoes = `<p class="nota">${l.desistiram.includes(e.id) ? 'Já passaste.' : 'Não podes licitar neste leilão.'}</p>`;
  return `<h2 class="painel-titulo">${origem}</h2>
    <div class="destaque-carta">${cartaHTML(jg)}
      <div class="leilao-info">
        <p class="rotulo">Lance atual</p>
        <p class="valor-grande">${l.lider ? dinheiro(l.valor) : '—'}</p>
        <p class="nota">${l.lider ? `de ${nomeEquipa(l.lider)}` : `mínimo ${dinheiro(l.minimo)}`}</p>
        <p class="nota">Valor ${dinheiro(jg.valor)} · cláusula ${dinheiro(jg.clausula)}</p>
        ${ativos.length && l.fase === 'lances' ? `<p class="nota">Ainda a licitar: ${ativos.join(', ')}</p>` : ''}
      </div>
    </div>
    ${acoes}
    ${souAnfitriao() ? '<button class="btn btn-mini btn-contorno" data-acao="forcar_leilao">Fechar leilão (anfitrião)</button>' : ''}`;
}

function painelTabuleiro(e) {
  const j = S.janela;
  if (j.leilao) return painelLeilao(e);
  const vez = j.ordem[j.vez];
  const minha = vez === e.id;
  const total = CONFIG.tabuleiro.voltas[j.tipo] * CONFIG.tabuleiro.casas.length;
  const andadas = j.andadas[e.id];
  const acabei = andadas >= total;
  let html = '';

  if (j.contestacao) {
    const c = j.contestacao;
    html += `<h2 class="painel-titulo">Empresário</h2>
      <p>${nomeEquipa(c.atacante)} quer comprar <strong>${esc(jogador(c.jogador).curto)}</strong> em exclusivo por ${dinheiro(c.preco)}.</p>
      ${c.vendedor === e.id
        ? '<div class="linha-botoes"><button class="btn btn-principal" data-acao="responder_empresario" data-anular="1">Anular com o meu Empresário</button><button class="btn btn-contorno" data-acao="responder_empresario">Deixar vender</button></div>'
        : `<p class="nota">À espera de ${nomeEquipa(c.vendedor)}.</p>`}`;
    return html;
  }

  const p = j.pendente;
  if (p && (p.tipo === 'mercado' || p.tipo === 'jovens')) {
    const jg = jogador(p.jogador);
    const titulo = p.tipo === 'mercado' ? 'Mercado' : 'Jovens Talentos';
    const { preco } = p;
    const sancionado = e.limiteContratacoes === 0;
    html += `<h2 class="painel-titulo">${titulo}</h2>
      ${cartaEvento()}
      <div class="destaque-carta">${cartaHTML(jg)}
        <div class="leilao-info">
          <p class="rotulo">Preço</p><p class="valor-grande">${dinheiro(preco)}</p>
          <p class="nota">Valor ${dinheiro(jg.valor)}. Se passares, vai a leilão a partir daí e já não podes licitar.</p>
          <p class="nota">${esc(jg.clube)} · ${jg.idade} anos</p>
        </div></div>
      ${p.equipa === e.id
        ? `<div class="linha-botoes"><button class="btn btn-principal" data-acao="comprar" ${e.dinheiro < preco || sancionado ? 'disabled' : ''}>Comprar</button><button class="btn btn-contorno" data-acao="passar">Passar</button></div>
           ${sancionado ? '<p class="nota">Estás sancionado: já não podes contratar nesta janela.</p>' : ''}`
        : `<p class="nota">${nomeEquipa(p.equipa)} decide se compra.</p>`}`;
  } else if (p?.tipo === 'rede') {
    const todas = [...equipa(p.equipa).redes, p.liga];
    html += `<h2 class="painel-titulo">Rede de observação</h2>
      <p>Nova Rede: <strong>${esc(p.liga)}</strong>. Só podes ter ${CONFIG.cartas.maxRedes}: ${p.equipa === e.id ? 'escolhe a que descartas.' : `${nomeEquipa(p.equipa)} escolhe a que descarta.`}</p>
      ${p.equipa === e.id ? `<div class="linha-botoes">${todas.map((l) => `<button class="btn btn-fantasma btn-mini" data-acao="descartar_rede" data-liga="${esc(l)}">Descartar ${esc(l)}</button>`).join('')}</div>` : ''}`;
  } else if (p?.tipo === 'patrocinio') {
    const categoria = { baixas: 'baixo', medias: 'médio', grandes: 'alto', investidas: 'inicial que se tornou grande' }[p.categoria];
    const contrato = p.genero === 'marca' ? 'Marca' : 'Patrocinador';
    const dono = equipa(p.equipa);
    html += `<h2 class="painel-titulo">Patrocínio</h2>
      <div class="carta-evento evento-bom">
        <p class="rotulo">${contrato} · valor ${categoria}</p>
        <p class="evento-titulo">${esc(p.nome)}</p>
        <p>Prémio de assinatura: <strong>${dinheiro(p.premio)}</strong></p>
      </div>
      ${p.equipa !== e.id ? `<p class="nota">${nomeEquipa(p.equipa)} decide.</p>` : p.bloqueio
        ? `<p class="nota">${esc(p.bloqueio)}</p><button class="btn btn-contorno" data-acao="patrocinio">Recusar</button>`
        : `<div class="linha-botoes">${p.genero === 'marca'
            ? `<button class="btn btn-principal" data-acao="patrocinio" data-aceitar="1">Trocar ${esc(dono.marca)}</button>`
            : p.substituir.map((i) => `<button class="btn btn-principal btn-mini" data-acao="patrocinio" data-aceitar="1" data-substitui="${i}">Trocar ${esc(dono.patrocinios[i])}</button>`).join('')}
            <button class="btn btn-contorno" data-acao="patrocinio">Recusar</button></div>`}`;
  } else {
    html += `<h2 class="painel-titulo">${minha ? 'A tua vez' : `Vez de ${nomeEquipa(vez)}`}</h2>${cartaEvento()}`;
    if (e.limiteContratacoes != null) html += `<p class="nota">Sanção: ${e.limiteContratacoes === 0 ? 'já não podes contratar' : `só podes fazer mais ${e.limiteContratacoes} ${e.limiteContratacoes === 1 ? 'contratação' : 'contratações'}`} nesta janela.</p>`;
    if (minha) {
      html += `<div class="linha-botoes">
        ${!j.lancou && !acabei ? '<button class="btn btn-principal" data-acao="lancar">Lançar os dados</button>' : ''}
        ${j.lancou || acabei ? '<button class="btn btn-principal" data-acao="terminar_vez">Terminar a vez</button>' : ''}
      </div>
      <p class="nota">Na tua vez podes fazer propostas: clica num jogador de outro treinador.</p>`;
    } else html += `<p class="nota">Enquanto esperas, podes vender à banca e propor trocas.</p>`;
  }

  // Progresso, pronto para fechar
  html += `<div class="progresso"><div class="barra-tempo"><div class="barra-tempo-enchimento" style="width:${Math.min(100, (andadas / total) * 100)}%"></div></div>
    <p class="nota">${acabei ? 'Completaste as voltas.' : `${andadas} de ${total} casas (${CONFIG.tabuleiro.voltas[j.tipo]} ${CONFIG.tabuleiro.voltas[j.tipo] > 1 ? 'voltas' : 'volta'}).`}</p></div>`;
  if (acabei) {
    const pronto = j.prontos.includes(e.id);
    html += `<button class="btn ${pronto ? 'btn-fantasma' : 'btn-principal'}" data-acao="pronto_fechar" data-pronto="${pronto ? '' : '1'}">${pronto ? 'Afinal, não fechar ainda' : 'Pronto para fechar a janela'}</button>`;
  }
  html += painelTrocas(e);
  if (souAnfitriao()) {
    html += `<div class="anfitriao"><p class="rotulo">Anfitrião</p><div class="linha-botoes">
      <button class="btn btn-mini btn-contorno" data-acao="forcar_vez">Passar a vez de ${nomeEquipa(vez)}</button>
      <button class="btn btn-mini btn-contorno" data-acao="forcar_fecho">Fechar a janela já</button></div></div>`;
  }
  return html;
}

/** A carta Mistério ou o resultado da Investigação que acabou de sair. */
function cartaEvento() {
  const c = S.janela.ultimaCarta;
  if (!c) return '';
  const etiqueta = c.tipo === 'misterio' ? 'Carta Mistério' : 'Investigação';
  return `<div class="carta-evento ${c.bom ? 'evento-bom' : 'evento-mau'}">
    <p class="rotulo">${etiqueta} · ${nomeEquipa(c.equipa)}</p>
    <p class="evento-titulo">${esc(c.titulo)}</p>
    <p>${esc(c.texto)}</p>
    ${c.detalhe ? `<p class="evento-detalhe">${esc(c.detalhe)}</p>` : ''}
  </div>`;
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

function painelFecho(e) {
  const j = S.janela;
  if (j.prontos.includes(e.id)) {
    fecho = null;
    const falta = Object.values(S.equipas).filter((x) => x.treinador && !x.espera && !j.prontos.includes(x.id)).map((x) => esc(x.nome));
    return `<h2 class="painel-titulo">Fecho da janela</h2><p>Plantel fechado.</p><p class="nota">À espera de: ${falta.join(', ')}</p>`;
  }
  if (!fecho && EU.sugestaoFecho) fecho = { manter: new Set(EU.sugestaoFecho.manter) };
  const lista = e.plantel.map(jogador).filter((x) => x && !x.emprestado).sort((a, b) => b.overall - a.overall);
  const escolhidos = lista.filter((x) => fecho.manter.has(x.id));
  const { onze, sobram } = melhorOnze(escolhidos, e.formacao);
  const lugar = new Map(onze.filter((l) => l.jogador != null).map((l) => [l.jogador, l.posicao]));
  const vazios = onze.filter((l) => l.jogador == null).map((l) => posicao(l.posicao));
  const linhas = lista.map((jg) => `<li class="linha-jog linha-fecho">
      <input type="checkbox" data-fecho="${jg.id}" ${fecho.manter.has(jg.id) ? 'checked' : ''} aria-label="Manter ${esc(jg.curto)}">
      <span class="mini-ovr mini-${nivel(jg.overall)}">${jg.overall}</span>
      <span class="linha-pos">${posicao(jg.posicao)}</span>
      <span class="linha-nome"><strong>${esc(jg.curto)}</strong>${jg.alternativas?.length ? ` <small>${jg.alternativas.map(posicao).join(' ')}</small>` : ''}</span>
      <span class="linha-tags">${lugar.has(jg.id) ? `<span class="tag tag-onze">${posicao(lugar.get(jg.id))}</span>` : ''}${sobram.includes(jg.id) ? `<span class="tag">${jg.formacao ? '12.º' : 'Não cabe'}</span>` : ''}${jg.formacao ? '<span class="tag">Formação</span>' : ''}</span>
      <span class="linha-valor">${fecho.manter.has(jg.id) ? '' : `banca ${dinheiro(jg.valor * CONFIG.valores.precoBase)}`}</span>
    </li>`).join('');
  return `<h2 class="painel-titulo">Fecho da janela · ${esc(e.formacao)}</h2>
    <p>Fica com o teu onze na formação e, se quiseres, um 12.º jogador da formação. Os outros vão para a banca ao preço base; os lugares vazios recebem um emprestado.</p>
    <p class="nota">No onze: <strong>${lugar.size}/11</strong>${vazios.length ? ` · emprestados para ${vazios.join(', ')}` : ''}${sobram.length ? ` · de fora: ${sobram.map((id) => esc(jogador(id).curto)).join(', ')}` : ''}</p>
    <ul class="lista-jogadores">${linhas}</ul>
    <div class="linha-botoes"><button class="btn btn-principal" data-acao="fechar">Confirmar plantel</button>
    <button class="btn btn-contorno btn-mini" data-acao="fecho-sugestao">Repor a sugestão</button></div>`;
}

const NOMES_OPORTUNIDADE = { baixa: 'oportunidade baixa', media: 'oportunidade média', alta: 'oportunidade alta', certo: 'golo certo' };

/** O relato: os golos, as cartas e as oportunidades; os lances sem nada ficam de fora. */
function textoEvento(ev, jogo) {
  const equipaDe = (i) => nomeEquipa(jogo.lados[i].equipa);
  switch (ev.tipo) {
    case 'golo':
      return `<strong>GOLO de ${esc(ev.jogador)}</strong> (${equipaDe(ev.lado)})${ev.origem === 'penalti' ? ', de penálti' : ev.origem === 'bolaParada' ? ', de bola parada' : ''}${ev.assistencia ? `, assistência de ${esc(ev.assistencia)}` : ''}`;
    case 'lance':
      if (ev.oportunidade === 'nada') return null;
      return `${equipaDe(ev.lado)}: ${ev.dados[0]}+${ev.dados[1]}${ev.mod ? `${ev.mod > 0 ? '+' : '−'}${Math.abs(ev.mod)}` : ''} = ${ev.total}, ${NOMES_OPORTUNIDADE[ev.oportunidade]}${ev.extra != null ? ` (dado extra: ${ev.extra})` : ''}`;
    case 'leve':
      return `${esc(ev.texto)} (${equipaDe(ev.lado)})`;
    case 'vermelho':
      return `<strong>Vermelho</strong> para ${equipaDe(ev.lado)}: −1 até ao fim`;
    case 'lesao':
      return `<strong>Lesão</strong> (${equipaDe(ev.lado)}): ${esc(ev.texto)}`;
    case 'penalti':
      return `Penálti para ${equipaDe(ev.lado)}: dado ${ev.dado}${ev.marcou ? '' : ', falhou'}`;
    case 'bolaParada':
      return `Bola parada perigosa de ${equipaDe(ev.lado)}: dado ${ev.dado}${ev.marcou ? '' : ', nada'}`;
    case 'substituicao':
      return `Substituição em ${equipaDe(ev.lado)}: entra ${esc(ev.entra)}, sai ${esc(ev.sai)}`;
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

function meuJogoHTML(jogo, e) {
  const i = jogo.lados.findIndex((l) => l.equipa === e?.id);
  const ultimos = jogo.lados.map((_, n) => [...jogo.eventos].reverse().find((ev) => ev.tipo === 'lance' && ev.lado === n));
  const relato = [...jogo.eventos].reverse().map((ev) => ({ ev, texto: textoEvento(ev, jogo) })).filter((x) => x.texto).sort((x, y) => y.ev.minuto - x.ev.minuto);
  let sub = '';
  if (i >= 0 && !jogo.acabou) {
    const lado = jogo.lados[i];
    if (lado.subPedida != null) sub = '<p class="nota">O jovem entra no próximo período.</p>';
    else if (lado.podemSair.length) {
      const nome = (id) => esc(lado.onze.find((l) => l.jogador === id)?.nome);
      sub = `<p class="rotulo">Substituição: entra ${esc(jogador(lado.suplente)?.curto)}, sai…</p>
        <div class="linha-botoes">${lado.podemSair.map((id) => `<button class="btn btn-mini btn-fantasma" data-acao="substituir" data-sai="${id}">${nome(id)}</button>`).join('')}</div>`;
    }
  }
  const [a, b] = jogo.lados;
  return `${placarHTML(jogo)}
    <p class="nota centro">${jogo.acabou ? 'Fim do jogo' : `${jogo.periodo * CONFIG.jogo.minutosPorPeriodo} minutos`} · ${esc(a.tatica)} (${a.modificador >= 0 ? '+' : ''}${a.modificador}) vs ${esc(b.tatica)} (${b.modificador >= 0 ? '+' : ''}${b.modificador})</p>
    <div class="dados-jogo">${ultimos.map((u) => (u ? `<div class="dados">${dadoHTML(u.dados[0])}${dadoHTML(u.dados[1])}</div>` : '<div></div>')).join('')}</div>
    ${jogo.homem ? `<p class="nota centro">Homem do jogo: <strong>${esc(jogo.homem.nome)}</strong> (${jogo.homem.nota})</p>` : ''}
    ${sub}
    <ol class="feed relato">${relato.map(({ ev, texto }) => `<li class="${ev.tipo === 'golo' ? 'forte' : ''}">${ev.minuto}' ${texto}</li>`).join('')}</ol>`;
}

function tabelaLigaHTML() {
  if (!S.tabela?.length) return '';
  const linhas = S.tabela.map((l, i) => `<tr class="${l.equipa === EU.equipa ? 'eu' : ''}"><td>${i + 1}</td><td>${nomeEquipa(l.equipa)}</td><td>${l.j}</td><td class="so-largo">${l.v}</td><td class="so-largo">${l.e}</td><td class="so-largo">${l.d}</td><td>${l.gm - l.gs > 0 ? '+' : ''}${l.gm - l.gs}</td><td class="pts">${l.pts}</td></tr>`).join('');
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
  const anfitriao = souAnfitriao() ? `<button class="btn btn-mini btn-contorno" data-acao="avancar">${c.fase === 'taticas' ? 'Táticas ao acaso para quem falta' : c.fase === 'jogos' ? 'Acabar os jogos já' : 'Seguir já'} (anfitrião)</button>` : '';
  if (c.fase === 'taticas') {
    const par = c.calendario.find((p) => p.includes(e?.id));
    if (!e || e.espera) return `${titulo}<p class="nota">À espera das táticas.</p>${tabelaLigaHTML()}`;
    if (!par) return `${titulo}<p>${c.competicao === 'taca' ? 'Não jogas nesta ronda.' : 'Tens folga nesta jornada.'}</p>${anfitriao}${tabelaLigaHTML()}`;
    const adv = equipa(par[0] === e.id ? par[1] : par[0]);
    const T = CONFIG.jogo.taticas;
    const botoes = T.map((t, i) => `<button class="segmento" role="radio" aria-checked="${EU.tatica === t}" data-acao="tatica" data-tatica="${t}">${t}<small>vence ${T[(i + 1) % T.length]}</small></button>`).join('');
    const falta = c.calendario.flat().filter((id) => !c.prontos.includes(id)).map(nomeEquipa);
    return `${titulo}
      <p>Jogas contra <button class="btn btn-mini btn-fantasma" data-ver-equipa="${adv.id}">${esc(adv.nome)}</button>. Escolhe a tática em segredo.</p>
      <div class="segmentos">${botoes}</div>
      <p class="nota">${falta.length ? `Falta: ${falta.join(', ')}` : ''}</p>
      ${anfitriao}${tabelaLigaHTML()}`;
  }
  const meu = c.jogos.find((j) => j.lados.some((l) => l.equipa === e?.id));
  const outros = c.jogos.filter((j) => j !== meu);
  const principal = meu ?? c.jogos[0];
  const resto = meu ? outros : outros.slice(1);
  const continuar = c.fase === 'resultados' && e && !e.espera
    ? (c.prontos.includes(e.id) ? '<p class="nota">À espera dos outros treinadores.</p>' : '<button class="btn btn-principal" data-acao="continuar">Continuar</button>') : '';
  const melhores = S.estatisticas?.marcadores?.length ? `<p class="nota">Marcadores: ${S.estatisticas.marcadores.slice(0, 3).map((m) => `${esc(m.nome)} ${m.golos}`).join(' · ')}</p>` : '';
  return `${titulo}
    ${principal ? meuJogoHTML(principal, e) : '<p>Tens folga nesta jornada.</p>'}
    ${resto.length ? `<p class="rotulo">Outros jogos</p>${resto.map(placarHTML).join('')}` : ''}
    ${continuar}${anfitriao}
    ${c.fase === 'resultados' ? (c.competicao === 'taca' ? tabelaTacaHTML(S.estatisticasTaca) : `${tabelaLigaHTML()}${melhores}`) : ''}`;
}

/** Os prémios de uma época. */
function premiosHTML(p) {
  const lista = (titulo, itens) => (itens.length ? `<p class="rotulo">${titulo}</p><ul class="palmares">${itens.map((m) => `<li><span>${esc(m.nome)} <small>${nomeEquipa(m.equipa)}</small></span><span class="titulos">${m.valor}</span></li>`).join('')}</ul>` : '');
  const LINHAS = { GR: 'GR', DEF: 'Defesas', MED: 'Médios', AV: 'Avançados' };
  const equipaEpoca = Object.entries(LINHAS).map(([l, nome]) => {
    const nomes = p.equipa.filter((x) => x.linha === l).map((x) => esc(x.nome)).join(', ');
    return nomes ? `<li><span>${nome}</span><span>${nomes}</span></li>` : '';
  }).join('');
  return `<div class="carta-evento evento-bom">
      <p class="rotulo">Campeão da época ${p.epoca}</p>
      <p class="evento-titulo">${nomeEquipa(p.campeao)}</p>
      <p>${p.pontos} pontos${p.jogador ? ` · Jogador do ano: <strong>${esc(p.jogador.nome)}</strong>` : ''}${p.taca ? ` · Taça: <strong>${nomeEquipa(p.taca)}</strong>` : ''}</p>
    </div>
    ${lista('Marcadores', p.marcadores)}${lista('Assistências', p.assistentes)}
    ${p.taca ? tabelaTacaHTML(p) : ''}
    ${equipaEpoca ? `<p class="rotulo">Equipa da época</p><ul class="palmares">${equipaEpoca}</ul>` : ''}`;
}

function painelFimEpoca() {
  const f = S.fimEpoca;
  const e = minhaEquipa();
  const p = S.premios.at(-1);
  const minhas = f.mudancas.filter((m) => m.equipa === e?.id);
  const mudancas = minhas.length ? `<p class="rotulo">O teu plantel</p><ul class="palmares">${minhas.map((m) => `<li><span>${esc(m.nome)}${m.promovido ? ' <small>passa ao plantel principal</small>' : ''}</span><span class="titulos">${m.antes} → ${m.depois}</span></li>`).join('')}</ul>` : '';
  const pronto = e && f.prontos.includes(e.id);
  return `<h2 class="painel-titulo">Fim da época ${p.epoca}</h2>
    ${premiosHTML(p)}${tabelaLigaHTML()}${mudancas}
    ${!e || e.espera ? '' : pronto ? '<p class="nota">À espera dos outros treinadores.</p>' : `<button class="btn btn-principal" data-acao="continuar">${f.ultima ? 'Ver o palmarés' : 'Seguir para a próxima época'}</button>`}
    ${souAnfitriao() ? '<button class="btn btn-mini btn-contorno" data-acao="avancar">Seguir já (anfitrião)</button>' : ''}`;
}

function painelFim() {
  const linhas = S.premios.map((p) => `<li><span>Época ${p.epoca}</span><span>${nomeEquipa(p.campeao)} <span class="titulos">CAMPEÃO</span>${p.taca ? ` · ${nomeEquipa(p.taca)} <span class="titulos">TAÇA</span>` : ''}</span></li>`).join('');
  const ranking = (S.ranking ?? []).map((r, i) => `<tr class="${r.equipa === EU.equipa ? 'eu' : ''}"><td>${i + 1}</td><td>${nomeEquipa(r.equipa)}</td><td>${r.campeonatos}</td><td>${r.tacas}</td><td>${String(r.titulos).replace('.', ',')}</td><td class="pts">${r.pontos}</td></tr>`).join('');
  return `<h2 class="painel-titulo">Fim da partida</h2>
    <table class="tabela tabela-liga"><thead><tr><th>#</th><th>Equipa</th><th>Camp.</th><th>Taças</th><th>Títulos</th><th>Pontos</th></tr></thead><tbody>${ranking}</tbody></table>
    <p class="rotulo">Palmarés</p><ul class="palmares">${linhas}</ul>`;
}

// --- Coluna lateral: equipas e registo ---

function desenharLado() {
  $('#lado-equipas').hidden = separador !== 'equipas';
  $('#lado-registo').hidden = separador !== 'registo';
  for (const b of $$('[data-separador]')) b.setAttribute('aria-selected', String(b.dataset.separador === separador));
  const ordem = Object.values(S.equipas).filter((e) => !e.espera).sort((a, b) => (b.id === EU.equipa) - (a.id === EU.equipa) || Boolean(a.bot) - Boolean(b.bot));
  $('#lado-equipas').innerHTML = ordem.map((e) => {
    const t = e.treinador ? treinador(e.treinador) : null;
    const cartas = e.bot ? 'Bot' : `${dinheiro(e.dinheiro)} · Emp. ${e.cartas.empresario} · Méd. ${e.cartas.medico}`;
    return `<button class="equipa-lado${e.id === EU.equipa ? ' eu' : ''}" type="button" data-ver-equipa="${e.id}">
      ${kit(e, 30)}<span class="quem"><strong>${esc(e.nome)}</strong><small>${t ? esc(t.nome) + (t.ligado ? '' : ' (desligado)') + ' · ' : ''}${cartas}</small></span>
    </button>`;
  }).join('');
  $('#lado-registo').innerHTML = [...S.log].reverse().map((l) => `<li class="${l.tipo === 'fase' ? 'forte' : ''}">${esc(l.texto)}</li>`).join('');
}

/** O onze a mostrar: o que ficou do fecho durante o campeonato; na janela, o melhor possível com o plantel atual. */
function onzeDe(e) {
  const formacao = e.formacao ?? '4-4-2';
  if (S.fase !== 'janela' && e.onze) return { formacao, onze: e.onze };
  return { formacao, onze: melhorOnze(e.plantel.map(jogador).filter((x) => x && !x.emprestado), formacao).onze };
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

/** O diálogo da equipa: o onze no campo, com o valor de cada jogador, e quem está fora dele. */
function desenharEquipa() {
  const e = equipa(equipaAberta);
  if (!e) return;
  const t = e.treinador ? treinador(e.treinador) : null;
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
      <div class="equipa-titulo">${kit(e, 40)}<div><h2 class="titulo titulo-medio">${esc(e.nome)}</h2>
        <p class="nota">${t ? esc(t.nome) : 'Bot'} · ${formacao}${e.bot ? '' : ` · ${dinheiro(e.dinheiro)}`}</p></div></div>
      <button class="btn-fechar" data-fechar aria-label="Fechar">×</button>
    </div>
    <div class="dialogo-corpo">
      ${e.bot ? '' : `<p class="nota equipa-info">Empresário ${e.cartas.empresario} · Médico ${e.cartas.medico}${e.redes.length ? ` · Redes: ${e.redes.map(esc).join(', ')}` : ''}${e.marca ? ` · ${esc(e.marca)} · ${e.patrocinios.map(esc).join(' · ')}` : ''}</p>`}
      ${avisos.length ? `<p class="avisos-equipa">${avisos.map(esc).join(' · ')}</p>` : ''}
      <div class="campo-caixa">${campoHTML(formacao, onze, S.jogadores)}</div>
      <div class="banco">
        <p class="rotulo">${S.fase === 'janela' ? 'Fora do onze' : 'Suplente'}${fora.length ? '' : ': ninguém'}</p>
        ${fora.length ? `<div class="fora-onze" style="--colunas:${colunasBanco(fora.length)}">${fora.map((j) => `<div class="lugar-fora" data-jogador="${j.id}">${miniCartaHTML(j)}</div>`).join('')}</div>` : ''}
      </div>
      ${e.treinador && e.id !== EU.equipa && S.fase === 'janela' && !minhaEquipa()?.espera ? `<button class="btn btn-contorno btn-mini" data-acao="abrir-troca" data-equipa="${e.id}">Propor troca</button>` : ''}
    </div>`;
}

// --- Diálogo de um jogador: propostas, Empresário, banca ---

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
    acoes += `<button class="btn btn-fantasma" data-acao="vender_banca" data-jogador="${id}">Vender à banca · ${dinheiro(jg.valor * CONFIG.valores.precoBase)}</button>`;
    if (e.cartas.empresario && !jg.inflacionada) acoes += `<button class="btn btn-fantasma" data-acao="inflacionar" data-jogador="${id}">Empresário: cláusula para ${dinheiro(jg.valor * CONFIG.valores.clausulaInflacionada)}</button>`;
  } else if (naJanela && dono?.treinador && !meu) {
    const bloqueio = jg.emprestado ? 'Está emprestado.' : jg.soBanca ? 'Só pode ser vendido à banca.' : jg.compradoRonda === j.ronda ? 'Foi comprado nesta ronda.' : !minhaVez ? 'Só na tua vez no tabuleiro.' : null;
    if (bloqueio) acoes += `<p class="nota">${bloqueio}</p>`;
    else {
      acoes += `<div class="lance"><input id="valor-proposta" class="campo" type="number" step="0.5" min="0.1" value="${jg.valor}" aria-label="Valor da proposta (M€)">
        <button class="btn btn-principal" data-acao="propor" data-jogador="${id}">Propor</button></div>
        <p class="nota">Abre um leilão. Com ${dinheiro(jg.clausula)} ou mais bates a cláusula e a venda é obrigatória.</p>`;
      if (e.cartas.empresario) acoes += `<button class="btn btn-fantasma" data-acao="exclusividade" data-jogador="${id}">Empresário: comprar em exclusivo por ${dinheiro(jg.valor * CONFIG.valores.clausulaEmpresario)}</button>`;
    }
  }
  $('#dialogo-jogador').innerHTML = `
    <div class="dialogo-cabecalho"><h2 class="titulo titulo-medio">${esc(jg.nome)}</h2><button class="btn-fechar" data-fechar aria-label="Fechar">×</button></div>
    <div class="dialogo-corpo jogador-detalhe">
      ${cartaHTML(jg, { tamanho: 'grande' })}
      <dl class="ficha-jogador">
        <dt>Equipa</dt><dd>${dono ? esc(dono.nome) : 'Livre'}</dd>
        <dt>Idade</dt><dd>${jg.idade} anos</dd>
        <dt>Posições</dt><dd>${[jg.posicao, ...(jg.alternativas ?? [])].map(posicao).join(', ')}</dd>
        <dt>Nação</dt><dd>${esc(jg.nacao)}</dd>
        <dt>Liga</dt><dd>${esc(jg.liga)}</dd>
        <dt>Clube real</dt><dd>${esc(jg.clube)}</dd>
        <dt>Valor</dt><dd>${dinheiro(jg.valor)}</dd>
        <dt>Cláusula</dt><dd>${dinheiro(jg.clausula)}${jg.inflacionada ? ' (inflacionada)' : ''}</dd>
      </dl>
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

function abrirTroca(outraId) {
  const e = minhaEquipa();
  const outra = equipa(outraId);
  const lista = (eq, lado) => eq.plantel.map(jogador).filter((x) => x && !x.emprestado && !x.soBanca).sort((a, b) => b.overall - a.overall)
    .map((x) => `<label class="linha-jog"><input type="checkbox" data-troca-${lado}="${x.id}"> <span class="mini-ovr">${x.overall}</span> <span class="linha-pos">${posicao(x.posicao)}</span> <span class="linha-nome">${esc(x.curto)}</span></label>`).join('');
  $('#dialogo-troca').innerHTML = `
    <h2 class="titulo titulo-medio"><span>Troca com</span> <span class="caramelo">${esc(outra.nome)}</span></h2>
    <div class="troca-colunas"><div><p class="rotulo">Dás</p>${lista(e, 'dar')}</div><div><p class="rotulo">Recebes</p>${lista(outra, 'receber')}</div></div>
    <div class="linha-botoes"><button class="btn btn-principal" data-acao="propor_troca" data-para="${outraId}">Propor troca</button><button class="btn btn-contorno" data-fechar>Cancelar</button></div>`;
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
  fechar: () => enviar({ t: 'fechar', manter: [...fecho.manter] }),
  'fecho-sugestao': () => {
    fecho = null;
    desenhar();
  },
  avancar: () => enviar({ t: 'avancar' }),
  tatica: (d) => enviar({ t: 'tatica', tatica: d.tatica }),
  substituir: (d) => enviar({ t: 'substituir', sai: Number(d.sai) }),
  continuar: () => enviar({ t: 'continuar' }),
  comprar_emprestado: (d) => enviar({ t: 'comprar_emprestado', jogador: Number(d.jogador) }),
  patrocinio: (d) => enviar({ t: 'patrocinio', aceitar: Boolean(d.aceitar), substitui: Number(d.substitui ?? 0) }),
  forcar_vez: () => enviar({ t: 'forcar_vez' }),
  forcar_leilao: () => enviar({ t: 'forcar_leilao' }),
  forcar_fecho: () => confirm('Fechar a janela já? Quem ainda não completou as voltas perde o resto.') && enviar({ t: 'forcar_fecho' }),
  propor: (d) => {
    enviar({ t: 'propor', jogador: Number(d.jogador), valor: Number($('#valor-proposta').value) });
    $('#dialogo-jogador').close();
  },
  exclusividade: (d) => {
    enviar({ t: 'exclusividade', jogador: Number(d.jogador) });
    $('#dialogo-jogador').close();
  },
  inflacionar: (d) => {
    enviar({ t: 'inflacionar', jogador: Number(d.jogador) });
    $('#dialogo-jogador').close();
  },
  vender_banca: (d) => {
    enviar({ t: 'vender_banca', jogador: Number(d.jogador) });
    $('#dialogo-jogador').close();
  },
  'abrir-troca': (d) => abrirTroca(d.equipa),
  propor_troca: (d) => {
    const dar = $$('[data-troca-dar]:checked').map((x) => Number(x.dataset.trocaDar));
    const receber = $$('[data-troca-receber]:checked').map((x) => Number(x.dataset.trocaReceber));
    enviar({ t: 'propor_troca', para: d.para, dar, receber });
    $('#dialogo-troca').close();
  },
};

document.addEventListener('click', (ev) => {
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
  if (verEquipa) {
    equipaAberta = verEquipa.dataset.verEquipa;
    desenharEquipa();
    return $('#dialogo-equipa').showModal();
  }
  const sep = ev.target.closest('[data-separador]');
  if (sep) {
    separador = sep.dataset.separador;
    return desenharLado();
  }
  const linha = ev.target.closest('[data-jogador]');
  if (linha && !ev.target.closest('input, label') && S?.fase !== 'lobby') return abrirJogador(Number(linha.dataset.jogador));
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.matches('[data-fecho]')) {
    const id = Number(t.dataset.fecho);
    if (t.checked) fecho.manter.add(id);
    else fecho.manter.delete(id);
    desenhar();
  } else if (t.matches('#nome-equipa, #cor-1, #cor-2')) enviarEquipa();
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
$('#btn-sair').addEventListener('click', () => {
  if (!confirm('Sair da sala? A tua equipa fica no jogo e podes voltar pelo mesmo link.')) return;
  ligacao?.fechar();
  history.pushState(null, '', `/${ID.sufixo}`);
  S = null;
  arrancar();
});
window.addEventListener('popstate', () => location.reload());

arrancar();
