// Os bots não jogam o tabuleiro: em cada janela trocam os piores jogadores por outros, sem custos, para ficarem sempre
// um pouco atrás dos treinadores. Assim continuam a dar luta sem ganharem títulos (ver também CONFIG.bots.modificador).
import { CONFIG } from '../config.js';
import { escolher } from './aleatorio.js';
import { jogador, transferir, equipasTreinadores } from './estado.js';
import { livresQue } from './cartas.js';

const media = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);

/** O overall médio dos onzes dos treinadores. */
function nivelTreinadores(sala) {
  return media(equipasTreinadores(sala).flatMap((e) => (e.onze ?? []).filter((l) => l.overall != null).map((l) => l.overall)));
}

export function ajustarBots(sala, ctx) {
  const nivel = nivelTreinadores(sala);
  if (!nivel) return;
  const alvo = Math.round(nivel - CONFIG.bots.distancia[sala.config.nivelBots]);
  for (const e of Object.values(sala.equipas)) {
    if (!e.bot) continue;
    for (let i = 0; i < CONFIG.bots.trocasPorJanela; i++) {
      const js = e.plantel.map((id) => jogador(sala, ctx, id)).filter((j) => !j.emprestado).sort((a, b) => a.overall - b.overall);
      if (media(js.map((j) => j.overall)) >= alvo) break;
      const pior = js[0];
      const novo = escolher(ctx.aleatorio, livresQue(sala, ctx, { posicao: pior.posicao, overall: [alvo, alvo + 2], idade: [18, 30] }));
      if (novo == null) break;
      transferir(sala, pior.id, null);
      transferir(sala, novo, e.id);
    }
  }
}
