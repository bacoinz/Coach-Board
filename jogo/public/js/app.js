// Cliente do The Gaffer: ecrãs de início e lobby, e a janela de transferências (tabuleiro 2D, draft, leilões,
// propostas, fecho). O servidor é autoritativo: aqui só se desenha o estado e se enviam intenções.
import { Ligacao } from './ligacao.js';
import { CONFIG } from './comum/config.gen.js';
import { melhorOnze } from './comum/formacao.gen.js';
import { equipamentoSVG, PADROES } from './equipamento.js';
import { cartaHTML, linhaJogador, posicao } from './carta.js';
import { tabuleiroHTML, dadoHTML } from './tabuleiro2d.js';
import { $, $$, esc, dinheiro, toast, identidade } from './util.js';

const ID = identidade();
let ligacao = null;
let S = null; // estado público da sala
let EU = null; // parte privada
let codigoSala = null;
let separador = 'equipas';
let fecho = null; // { manter: Set, jovem } enquanto se escolhe o plantel no fecho
let lanceProposto = null;

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
  const total = S.treinadores.filter((t) => !t.saiu).length + S.config.bots;
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
      <p class="nota">${anf ? 'És o anfitrião.' : 'Só o anfitrião muda a configuração.'} ${total} equipas = ${jornadas} jornadas por época.</p>
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
  else if (S.fase === 'campeonato') info += `Campeonato · ${S.campeonato.volta}.ª volta`;
  else info += 'Fim da partida';
  if (S.mercado) info += ` <small class="barra-fase" title="Faixa principal do baralho do Mercado">Mercado ${S.mercado.faixas.principal.join('–')}</small>`;
  $('#barra-info').innerHTML = info;
  $('#barra-dinheiro').innerHTML = e && !e.espera ? `<strong>${dinheiro(e.dinheiro)}</strong>` : '<small>A ver</small>';

  $('#col-acao').innerHTML = painelAcao();
  $('#col-tabuleiro').innerHTML = tabuleiroHTML({
    posicoes: j?.posicao ?? null,
    equipas: S.equipas,
    vez: j?.fase === 'tabuleiro' ? j.ordem[j.vez] : null,
    centro: centroTabuleiro(),
  });
  desenharLado();
}

function centroTabuleiro() {
  const j = S.janela;
  const l = j?.ultimoLance;
  const dados = l ? `<div class="dados">${dadoHTML(l.dados[0])}${dadoHTML(l.dados[1])}</div><p class="nota">${nomeEquipa(l.equipa)}</p>` : '';
  let vez = '';
  if (j?.fase === 'tabuleiro') vez = `<p class="centro-vez">Vez de <strong>${nomeEquipa(j.ordem[j.vez])}</strong><br><small>Ronda ${j.ronda}</small></p>`;
  return `<img src="/favicon.svg" alt="" width="44" height="44" class="centro-logo">${vez}${dados}`;
}

function painelAcao() {
  if (S.fase === 'fim') return painelFim();
  if (S.fase === 'campeonato') {
    return `<h2 class="painel-titulo">Campeonato</h2>
      <p>A janela fechou. Os jogos do campeonato chegam no passo 4; por agora o anfitrião avança para a janela seguinte.</p>
      ${souAnfitriao() ? '<button class="btn btn-principal" data-acao="avancar">Avançar</button>' : '<p class="nota">À espera do anfitrião.</p>'}`;
  }
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
  return `<h2 class="painel-titulo">Formação</h2>
    <p>Escolhe a formação para esta janela. O onze no fecho tem de encaixar nela.</p>
    <div class="segmentos">${botoes}</div>
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
        <button class="btn btn-contorno btn-mini" data-acao="desistir">Desistir</button>
      </div>`;
  } else if (souLider) acoes = '<p><strong>Tens o lance mais alto.</strong></p>';
  else acoes = '<p class="nota">Não estás neste leilão.</p>';
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
    const preco = p.equipa === e.id ? (EU.precoCarta ?? p.preco) : p.preco;
    html += `<h2 class="painel-titulo">${titulo}</h2>
      <div class="destaque-carta">${cartaHTML(jg)}
        <div class="leilao-info">
          <p class="rotulo">Preço</p><p class="valor-grande">${dinheiro(preco)}</p>
          ${preco < jg.valor ? '<p class="nota">Com o desconto da Rede.</p>' : ''}
          <p class="nota">${esc(jg.clube)} · ${jg.idade} anos</p>
        </div></div>
      ${p.equipa === e.id
        ? `<div class="linha-botoes"><button class="btn btn-principal" data-acao="comprar" ${e.dinheiro < preco ? 'disabled' : ''}>Comprar</button><button class="btn btn-contorno" data-acao="passar">Passar (vai a leilão)</button></div>`
        : `<p class="nota">${nomeEquipa(p.equipa)} decide se compra.</p>`}`;
  } else if (p?.tipo === 'rede') {
    const todas = [...equipa(p.equipa).redes, p.liga];
    html += `<h2 class="painel-titulo">Rede de observação</h2>
      <p>Nova Rede: <strong>${esc(p.liga)}</strong>. Só podes ter ${CONFIG.cartas.maxRedes}: ${p.equipa === e.id ? 'escolhe a que descartas.' : `${nomeEquipa(p.equipa)} escolhe a que descarta.`}</p>
      ${p.equipa === e.id ? `<div class="linha-botoes">${todas.map((l) => `<button class="btn btn-fantasma btn-mini" data-acao="descartar_rede" data-liga="${esc(l)}">Descartar ${esc(l)}</button>`).join('')}</div>` : ''}`;
  } else {
    html += `<h2 class="painel-titulo">${minha ? 'A tua vez' : `Vez de ${nomeEquipa(vez)}`}</h2>`;
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
      <span class="mini-ovr mini-${jg.overall >= 85 ? 'raro' : jg.overall >= 75 ? 'ouro' : jg.overall >= 65 ? 'prata' : 'bronze'}">${jg.overall}</span>
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

function painelFim() {
  const linhas = S.palmares.map((p) => `<li><span>Época ${p.epoca}</span><span>${nomeEquipa(p.campeao)} <span class="titulos">CAMPEÃO</span></span></li>`).join('');
  return `<h2 class="painel-titulo">Fim da partida</h2><ul class="palmares">${linhas}</ul>
    <p class="nota">A classificação a sério chega com o motor dos jogos (passo 4).</p>`;
}

// --- Coluna lateral: equipas e registo ---

function desenharLado() {
  $('#lado-equipas').hidden = separador !== 'equipas';
  $('#lado-registo').hidden = separador !== 'registo';
  for (const b of $$('[data-separador]')) b.setAttribute('aria-selected', String(b.dataset.separador === separador));
  const abertas = new Set($$('#lado-equipas details[open]').map((d) => d.dataset.equipa));
  const ordem = Object.values(S.equipas).filter((e) => !e.espera).sort((a, b) => (b.id === EU.equipa) - (a.id === EU.equipa) || Boolean(a.bot) - Boolean(b.bot));
  $('#lado-equipas').innerHTML = ordem.map((e) => {
    const t = e.treinador ? treinador(e.treinador) : null;
    const lugar = new Map((e.onze ?? []).filter((l) => l.jogador != null).map((l) => [l.jogador, l.posicao]));
    const plantel = e.plantel.map(jogador).filter(Boolean).sort((a, b) => b.overall - a.overall);
    const aberta = abertas.size ? abertas.has(e.id) : e.id === EU.equipa;
    const cartas = e.bot ? 'Bot' : `${dinheiro(e.dinheiro)} · Emp. ${e.cartas.empresario} · Méd. ${e.cartas.medico}`;
    return `<details class="equipa-lado${e.id === EU.equipa ? ' eu' : ''}" data-equipa="${e.id}" ${aberta ? 'open' : ''}>
      <summary>${kit(e, 30)}<span class="quem"><strong>${esc(e.nome)}</strong><small>${t ? esc(t.nome) + (t.ligado ? '' : ' (desligado)') + ' · ' : ''}${cartas}</small></span></summary>
      ${e.redes?.length ? `<p class="nota">Redes: ${e.redes.map(esc).join(', ')}</p>` : ''}
      ${e.marca ? `<p class="nota">${esc(e.marca)} · ${e.patrocinios.map(esc).join(' · ')}</p>` : ''}
      <ul class="lista-jogadores">${plantel.map((jg) => linhaJogador(jg, { onze: lugar.get(jg.id) })).join('')}</ul>
      ${e.treinador && e.id !== EU.equipa && S.fase === 'janela' && !minhaEquipa()?.espera ? `<button class="btn btn-mini btn-contorno" data-acao="abrir-troca" data-equipa="${e.id}">Propor troca</button>` : ''}
    </details>`;
  }).join('');
  $('#lado-registo').innerHTML = [...S.log].reverse().map((l) => `<li class="${l.tipo === 'fase' ? 'forte' : ''}">${esc(l.texto)}</li>`).join('');
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
      <dl class="ficha">
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
    </div>`;
  $('#dialogo-jogador').showModal();
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
