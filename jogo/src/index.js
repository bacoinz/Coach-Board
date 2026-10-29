// Worker: cria salas, encaminha os WebSockets para o Durable Object de cada sala e serve o frontend.
export { Sala } from './sala.js';

// Código de 4 letras, sem I nem O (confundem-se com 1 e 0).
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function gerarCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('');
}

async function criarSala(request, env) {
  let corpo = {};
  try {
    corpo = await request.json();
  } catch {
    // corpo vazio: sala sem token de anfitrião
  }
  const anfitriaoToken = typeof corpo.token === 'string' && corpo.token.length <= 64 ? corpo.token : null;
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const codigo = gerarCodigo();
    const { ok } = await env.SALAS.getByName(codigo).criar({ codigo, anfitriaoToken });
    if (ok) return json({ codigo });
  }
  return json({ erro: 'Não foi possível criar a sala. Tenta outra vez.' }, 503);
}

/** O index.html com a pré-visualização do Discord (imagem com URL absoluto e o código da sala no título). */
async function pagina(request, env, codigo = null) {
  const html = await env.ASSETS.fetch(new Request(new URL('/', request.url), { headers: request.headers }));
  const imagem = new URL('/og.png', request.url).href;
  let reescrever = new HTMLRewriter().on('meta[property="og:image"]', { element: (el) => el.setAttribute('content', imagem) });
  if (codigo) {
    const titulo = `The Gaffer · Sala ${codigo}`;
    const descricao = `Entra na sala ${codigo}: cria o teu clube, compra e vende no tabuleiro de mercado e ganha a liga.`;
    reescrever = reescrever
      .on('meta[property="og:title"]', { element: (el) => el.setAttribute('content', titulo) })
      .on('meta[property="og:description"]', { element: (el) => el.setAttribute('content', descricao) })
      .on('meta[name="description"]', { element: (el) => el.setAttribute('content', descricao) });
  }
  return reescrever.transform(html);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/salas' && request.method === 'POST') return criarSala(request, env);

    const info = pathname.match(/^\/api\/salas\/([A-Za-z]{4})$/);
    if (info && request.method === 'GET') return json(await env.SALAS.getByName(info[1].toUpperCase()).info());

    const ws = pathname.match(/^\/ws\/([A-Za-z]{4})$/);
    if (ws) {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Esperava um WebSocket.', { status: 426 });
      return env.SALAS.getByName(ws[1].toUpperCase()).fetch(request);
    }

    const sala = pathname.match(/^\/sala\/([A-Za-z]{4})\/?$/);
    if (sala) return pagina(request, env, sala[1].toUpperCase());
    if (pathname === '/' || pathname === '/index.html') return pagina(request, env);

    if (pathname.startsWith('/api/') || pathname.startsWith('/ws/')) return json({ erro: 'Não encontrado.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
