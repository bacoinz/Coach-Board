// Marcas e patrocínios: a carta da casa Patrocínio, exclusivos, limites de mudança e prémios de extensão.
import { CONFIG } from '../config.js';
import { comPeso, escolher } from './aleatorio.js';
import { receber, registar, erro, M } from './estado.js';
import { faseMercado } from './cartas.js';
import { somarAjuda } from './misterio.js';
import { MARCAS, PATROCINIOS } from './marcas.js';

const P = CONFIG.patrocinios;
const LISTAS = { marca: MARCAS, patrocinio: PATROCINIOS };
const CATEGORIAS = { baixas: 'baixas', medias: 'medias', grandes: 'grandes', investidas: 'iniciais' };

/** O prémio de assinatura de um contrato. */
export function premio(genero, categoria) {
  if (categoria === 'iniciais') return genero === 'marca' ? CONFIG.inicio.premioMarcaInicial : CONFIG.inicio.premioPatrocinioInicial;
  return P.premios[genero][categoria];
}

const emUso = (sala) => new Set(Object.values(sala.equipas).flatMap((e) => [e.marca, ...(e.patrocinios ?? [])].filter(Boolean)));

/** Nomes livres de uma categoria: cada marca ou patrocinador só está numa equipa de cada vez. */
function livres(sala, genero, categoria) {
  const usados = emUso(sala);
  return LISTAS[genero][CATEGORIAS[categoria]].filter((n) => !usados.has(n));
}

/** Tira a carta da casa Patrocínio: marca ou patrocinador, com a categoria sorteada pela fase da época. */
export function tirarPatrocinio(sala, ctx, equipaId) {
  const fase = P.fases[faseMercado(sala)];
  const genero = ctx.aleatorio() < P.probabilidadeMarca ? 'marca' : 'patrocinio';
  const sorteada = comPeso(ctx.aleatorio, Object.entries(fase));
  // Se a categoria sorteada estiver toda ocupada, usa-se outra da mesma fase e, em último caso, qualquer uma.
  const ordem = [sorteada, ...Object.keys(fase).filter((c) => c !== sorteada), ...Object.keys(CATEGORIAS)];
  const categoria = ordem.find((c) => livres(sala, genero, c).length);
  const e = sala.equipas[equipaId];
  if (!categoria) {
    registar(sala, ctx, `${e.nome} cai em Patrocínio, mas já não há contratos livres.`, { tipo: 'carta' });
    return;
  }
  sala.janela.pendente = {
    tipo: 'patrocinio',
    equipa: equipaId,
    genero,
    categoria,
    nome: escolher(ctx.aleatorio, livres(sala, genero, categoria)),
    premio: premio(genero, categoria),
    ...opcoes(e, genero, categoria),
  };
}

/** O que a equipa pode fazer com a carta: { bloqueio } ou, nos patrocínios, { substituir: [índices] }. */
function opcoes(e, genero, categoria) {
  if (genero === 'marca') {
    return e.mudancas.marca >= P.mudancasMarcaPorEpoca ? { bloqueio: 'Já mudaste de marca nesta época.' } : {};
  }
  if (e.mudancas.patrocinios >= P.mudancasPatrocinioPorJanela) return { bloqueio: 'Já mudaste de patrocínio nesta janela.' };
  // O mesmo lugar não muda duas vezes na mesma época.
  const livres = e.patrocinios.map((_, i) => i).filter((i) => !e.mudancas.trocados[i]);
  if (!livres.length) return { bloqueio: 'Já mudaste os dois patrocinadores nesta época.' };
  // Nunca dois patrocínios de valor alto: uma carta alta só pode entrar para o lugar do alto que já lá está.
  const altos = e.categorias.patrocinios.flatMap((c, i) => (P.altos.includes(c) ? [i] : []));
  const substituir = P.altos.includes(categoria) && altos.length ? livres.filter((i) => altos.includes(i)) : livres;
  if (!substituir.length) return { bloqueio: 'Já tens um patrocinador de valor alto, que mudaste nesta época.' };
  return { substituir };
}

/** Aceita a carta (no patrocínio, diz qual substitui) ou recusa. */
export function decidirPatrocinio(sala, ctx, equipaId, aceitar, substitui = 0) {
  const j = sala.janela;
  const p = j?.pendente;
  if (!p || p.tipo !== 'patrocinio' || p.equipa !== equipaId) return erro('Não há nenhuma carta de patrocínio.');
  const e = sala.equipas[equipaId];
  if (!aceitar) {
    j.pendente = null;
    registar(sala, ctx, `${e.nome} recusa ${p.nome}.`, { tipo: 'carta' });
    return { ok: true };
  }
  if (p.bloqueio) return erro(p.bloqueio);
  if (p.genero === 'marca') {
    e.marca = p.nome;
    e.categorias.marca = p.categoria;
    e.mudancas.marca++;
  } else {
    if (!p.substituir.includes(substitui)) return erro('Não podes substituir esse patrocínio: nunca dois de valor alto.');
    e.patrocinios[substitui] = p.nome;
    e.categorias.patrocinios[substitui] = p.categoria;
    e.mudancas.patrocinios++;
    e.mudancas.trocados[substitui] = true;
  }
  // Uma das marcas ou patrocinadores iniciais que entretanto se tornou grande conta como ajuda na Investigação.
  if (p.categoria === 'investidas') somarAjuda(e, CONFIG.investigacao.ajudaInicialInvestida);
  receber(sala, equipaId, p.premio);
  j.pendente = null;
  registar(sala, ctx, `${e.nome} assina com ${p.nome} e recebe ${M(p.premio)}.`, { tipo: 'carta' });
  return { ok: true };
}

/** Fim de uma janela: quem não mudou de patrocínios recebe o prémio de extensão. */
export function extensaoPatrocinios(sala, ctx) {
  for (const e of Object.values(sala.equipas)) {
    if (!e.treinador || e.espera || !e.mudancas) continue;
    if (e.mudancas.patrocinios === 0) {
      const valor = e.categorias.patrocinios.reduce((s, c) => s + premio('patrocinio', c) * P.extensao, 0);
      receber(sala, e.id, valor);
      registar(sala, ctx, `${e.nome} renova os patrocínios: extensão de ${M(valor)}.`, { tipo: 'carta' });
    }
    e.mudancas.patrocinios = 0;
  }
}

/** Fim de época: quem não mudou de marca recebe o prémio de extensão. */
export function extensaoMarca(sala, ctx) {
  for (const e of Object.values(sala.equipas)) {
    if (!e.treinador || e.espera || !e.mudancas) continue;
    if (e.mudancas.marca === 0) {
      const valor = premio('marca', e.categorias.marca) * P.extensao;
      receber(sala, e.id, valor);
      registar(sala, ctx, `${e.nome} renova com ${e.marca}: extensão de ${M(valor)}.`, { tipo: 'carta' });
    }
    e.mudancas.marca = 0;
    e.mudancas.trocados = [false, false];
  }
}
