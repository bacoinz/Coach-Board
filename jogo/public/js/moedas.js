// As duas moedas do jogo. Agente: dourada, com a mala de quem faz negócios. Médico: verde, com uma cruz.
let n = 0;

export function moedaEmpresarioSVG(tamanho = null) {
  const id = `ouro-${++n}`;
  const medida = tamanho ? `width="${tamanho}" height="${tamanho}"` : '';
  return `<svg class="moeda" viewBox="0 0 40 40" ${medida} role="img" aria-label="Agente">
  <defs><radialGradient id="${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff0b3"/><stop offset=".55" stop-color="#e0b34c"/><stop offset="1" stop-color="#a87a22"/></radialGradient></defs>
  <circle cx="20" cy="20" r="19" fill="url(#${id})" stroke="#7a5716" stroke-width="1.5"/>
  <circle cx="20" cy="20" r="15.5" fill="none" stroke="#fbe39a" stroke-width="1"/>
  <g fill="#4a2f0e"><path d="M15.500 13.500a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2h-2.200v-1.800h-4.600v1.800h-2.200z"/><rect x="8.500" y="15" width="23" height="15" rx="2.500"/></g>
  <path d="M8.500 21.500h23" stroke="#e0b34c" stroke-width="1.500"/><rect x="17.500" y="19.500" width="5" height="4" rx="1" fill="#fbe39a"/>
</svg>`;
}

export function moedaMedicoSVG(tamanho = null) {
  const medida = tamanho ? `width="${tamanho}" height="${tamanho}"` : '';
  return `<svg class="moeda" viewBox="0 0 40 40" ${medida} role="img" aria-label="Médico">
  <circle cx="20" cy="20" r="19" fill="#16a34a" stroke="#0d6b30" stroke-width="1.5"/>
  <circle cx="20" cy="20" r="15.5" fill="none" stroke="#bbf7d0" stroke-width="1"/>
  <path d="M16.5 9h7v7.500h7.500v7h-7.500v7.500h-7v-7.500h-7.500v-7h7.500z" fill="#fff"/>
</svg>`;
}
