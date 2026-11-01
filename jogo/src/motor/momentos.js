// Os melhores e os piores momentos de uma época, para o ecrã do campeão: goleadas, compras ruinosas, roubos, lesões,
// cartas e condenações. Cada momento tem um peso: quanto mais marcante, mais depressa aparece. Não usa o gerador de
// números aleatórios, para não mexer no desenrolar da partida.
import { CONFIG } from '../config.js';

const C = CONFIG.momentos;

/** Como se fala de uma equipa: pelo treinador ou, se for um bot, pelo nome do clube. */
export function quem(sala, id) {
  const e = sala.equipas[id];
  const t = e?.treinador && sala.treinadores.find((x) => x.id === e.treinador);
  const nome = t ? `mister ${t.nome}` : e?.nome ?? '?';
  return { o: `o ${nome}`, do: `do ${nome}`, ao: `ao ${nome}` };
}

const maiuscula = (t) => t[0].toUpperCase() + t.slice(1);

/** Variações do mesmo tipo de momento, sem sorteio: alterna pela quantidade de momentos que já há. */
const variar = (sala, frases) => frases[(sala.momentos?.length ?? 0) % frases.length];

export function registarMomento(sala, { equipa, tom, peso, texto, grupo = null }) {
  sala.momentos ??= [];
  sala.momentos.push({ equipa, tom, peso, texto: maiuscula(texto), grupo });
}

/** O que há de memorável num jogo acabado: a goleada e os hat-tricks. */
export function momentosDoJogo(sala, ctx, jogo) {
  const [a, b] = jogo.lados;
  const [vencedor, vencido] = a.golos >= b.golos ? [a, b] : [b, a];
  const diferenca = vencedor.golos - vencido.golos;
  if (diferenca >= C.goleada) {
    const [v, p] = [quem(sala, vencedor.equipa), quem(sala, vencido.equipa)];
    const r = `${vencedor.golos}-${vencido.golos}`;
    const grupo = `jogo-${sala.momentos?.length ?? 0}`;
    const peso = diferenca * 3 + vencedor.golos;
    registarMomento(sala, { equipa: vencido.equipa, tom: 'mau', peso, grupo, texto: variar(sala, [
      `${p.o} levou uma tareia ${v.do} por ${r}, ouch.`,
      `${p.o} foi passear ao campo ${v.do} e voltou com ${r} na bagagem.`,
      `${r} para ${v.o}. ${maiuscula(p.o)} não quer falar sobre isto.`,
    ]) });
    registarMomento(sala, { equipa: vencedor.equipa, tom: 'bom', peso, grupo, texto: `${v.o} deu uma lição ${p.ao}: ${r}.` });
  }
  for (const lado of jogo.lados) {
    for (const [id, golos] of Object.entries(lado.marcadores)) {
      if (golos < C.hatTrick) continue;
      registarMomento(sala, { equipa: lado.equipa, tom: 'bom', peso: golos * 3, texto: `${ctx.base.get(Number(id))?.curto} marcou ${golos} golos num só jogo pela equipa ${quem(sala, lado.equipa).do}.` });
    }
  }
}

/** Uma compra paga muito acima do valor, ou muito abaixo. */
export function momentoCompra(sala, equipa, jogadorCurto, preco, valor) {
  const q = quem(sala, equipa);
  if (preco >= valor * C.compraCara && preco - valor >= C.compraCaraMinimo) {
    registarMomento(sala, { equipa, tom: 'mau', peso: (preco - valor) / 2 + preco / 10, texto: `${q.o} pagou ${preco.toFixed(1).replace('.', ',')} M€ por ${jogadorCurto}, que vale ${valor.toFixed(1).replace('.', ',')} M€. Alguém lhe tire o livro de cheques.` });
  } else if (preco <= valor * C.pechincha) {
    registarMomento(sala, { equipa, tom: 'bom', peso: (valor - preco) / 2, texto: `${q.o} levou ${jogadorCurto} por ${preco.toFixed(1).replace('.', ',')} M€, quando vale ${valor.toFixed(1).replace('.', ',')} M€. Pechincha.` });
  }
}

/** Os melhores momentos primeiro; um momento só aparece uma vez na mesma lista. */
const melhores = (lista, n = C.porLista) => [...lista].sort((a, b) => b.peso - a.peso).slice(0, n).map(({ texto }) => texto);

/** O resumo para o ecrã de fim de época: de cada treinador e da época toda. */
export function resumoMomentos(sala) {
  const todos = sala.momentos ?? [];
  const maus = todos.filter((m) => m.tom === 'mau');
  // A goleada da época aparece nos piores: nos melhores da época vai outra coisa.
  const grupos = new Set(maus.sort((a, b) => b.peso - a.peso).slice(0, C.porLista).map((m) => m.grupo).filter(Boolean));
  const equipas = {};
  for (const e of Object.values(sala.equipas)) {
    if (e.bot || e.espera) continue;
    const meus = todos.filter((m) => m.equipa === e.id);
    equipas[e.id] = { bons: melhores(meus.filter((m) => m.tom === 'bom')), maus: melhores(meus.filter((m) => m.tom === 'mau')) };
  }
  return { geral: { bons: melhores(todos.filter((m) => m.tom === 'bom' && !grupos.has(m.grupo))), maus: melhores(maus) }, equipas };
}
