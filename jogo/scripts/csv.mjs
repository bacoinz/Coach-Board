// CSV com aspas (RFC 4180): devolve os registos como objetos, com os nomes do cabeçalho.
export function lerRegistos(texto) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo.replace(/\r$/, ''));
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  if (campo || linha.length) linhas.push([...linha, campo]);
  const [cabecalho, ...resto] = linhas;
  return resto.filter((l) => l.length === cabecalho.length).map((l) => Object.fromEntries(cabecalho.map((k, i) => [k, l[i]])));
}
