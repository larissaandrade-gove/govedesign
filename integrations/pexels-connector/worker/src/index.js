// Conector "Pexels Gove" na Cloudflare (Workers, plano gratuito): a versão leve do
// conector do servidor da Gove (backend/pexels-mcp.js), com as mesmas ferramentas e
// o mesmo formato de resposta, para os apps do Design System funcionarem sem mudança.
//
// MCP por HTTP (JSON-RPC): initialize, ping, tools/list, tools/call, lotes e
// notificações. Endereço: https://<worker>.workers.dev/mcp/<MCP_TOKEN>; qualquer
// outro endereço responde 404. As imagens voltam em data URI, porque o artefato
// não carrega imagens de outros sites.
//
// Segredos só na Cloudflare (wrangler secret put): PEXELS_API_KEY e MCP_TOKEN.
// A captura de site (capture_site) precisa do navegador do servidor da Gove: aqui
// ela aparece na lista, mas responde com um aviso.
//
// Sem dependências e sem APIs do Node: roda igual no Worker e no Node (testes).

const API = 'https://api.pexels.com/v1';
const IMAGE_HOST = 'images.pexels.com';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_BODY_BYTES = 64 * 1024;
const ORIENTATIONS = ['landscape', 'portrait', 'square'];
const CAPTURE_MESSAGE = 'A captura de site precisa do servidor da Gove. Envie a imagem da tela do celular manualmente.';

// Igual a backend/pexels-mcp.js (os apps e o claude.ai leem esta lista).
const TOOLS = [
  {
    name: 'search_photos',
    title: 'Buscar fotos no Pexels',
    description: 'Busca fotos no banco de imagens Pexels (pt-BR). Devolve miniaturas em data URI e os créditos do fotógrafo.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca' },
        page: { type: 'integer', minimum: 1 },
        per_page: { type: 'integer', minimum: 1, maximum: 30 },
        orientation: { type: 'string', enum: ORIENTATIONS },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'get_image',
    title: 'Baixar foto do Pexels',
    description: 'Devolve uma foto do Pexels (images.pexels.com) em data URI, com até 1600 px de largura.',
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'URL da foto em images.pexels.com' }, width: { type: 'integer', minimum: 200, maximum: 2400 } },
      required: ['url'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: 'capture_site',
    title: 'Capturar site no celular',
    description: 'Abre um site público num celular (390×844, densidade 3) e devolve a captura da tela em JPEG (data URI, 1170×2532 px).',
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Endereço do site (com ou sem https://)' } },
      required: ['url'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
];

const encoder = new TextEncoder();

/** Comparação em tempo constante (o tempo não revela quantos caracteres do token batem). */
function sameToken(a, b) {
  const x = encoder.encode(String(a ?? ''));
  const y = encoder.encode(String(b ?? ''));
  let diff = x.length ^ y.length;
  for (let i = 0; i < y.length; i++) diff |= (x[i] ?? 0) ^ y[i];
  return diff === 0 && y.length > 0;
}

/** base64 sem Buffer: btoa sobre blocos do Uint8Array (evita estourar a pilha). */
function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const empty = (status, headers) => new Response(null, { status, headers });

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const toolResult = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
const toolError = (message) => ({ content: [{ type: 'text', text: message }], isError: true });

function createMcp({ apiKey, fetchImpl }) {
  async function toDataUrl(url, width) {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== IMAGE_HOST) throw new Error('Só imagens de images.pexels.com.');
    if (width) {
      // A CDN do Pexels redimensiona e comprime: a resposta fica leve.
      u.searchParams.set('auto', 'compress');
      u.searchParams.set('cs', 'tinysrgb');
      u.searchParams.set('w', String(width));
    }
    const r = await fetchImpl(u.toString()).catch(() => null);
    if (!r?.ok) throw new Error('O Pexels não entregou a imagem.');
    if (Number(r.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new Error('Imagem grande demais.');
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error('Imagem grande demais.');
    const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
    return `data:${type};base64,${toBase64(bytes)}`;
  }

  async function searchPhotos(args) {
    if (!apiKey) throw new Error('Busca no Pexels não configurada no servidor.');
    const q = String(args.query ?? '').trim().slice(0, 80);
    if (!q) return { photos: [], page: 1, total: 0, next: false };
    const params = new URLSearchParams({ query: q, locale: 'pt-BR', per_page: String(Math.min(30, Math.max(1, Number(args.per_page) || 12))), page: String(Math.max(1, Number(args.page) || 1)) });
    if (ORIENTATIONS.includes(args.orientation)) params.set('orientation', args.orientation);
    const r = await fetchImpl(`${API}/search?${params}`, { headers: { Authorization: apiKey } }).catch(() => null);
    if (r?.status === 429) throw new Error('Limite de buscas do Pexels atingido. Tente em alguns minutos.');
    if (!r?.ok) throw new Error('O Pexels não respondeu agora.');
    const j = await r.json();
    const photos = await Promise.all(
      (j.photos ?? []).map(async (p) => ({
        id: p.id,
        alt: p.alt ?? '',
        width: p.width,
        height: p.height,
        avgColor: p.avg_color ?? null,
        photographer: p.photographer ?? '',
        photographerUrl: p.photographer_url ?? '',
        pexelsUrl: p.url ?? '',
        src: {
          thumb: await toDataUrl(p.src?.medium ?? p.src?.small, 360).catch(() => ''),
          large: p.src?.large2x ?? p.src?.large ?? p.src?.original ?? '',
          original: p.src?.original ?? '',
        },
      })),
    );
    return { photos, page: j.page ?? 1, total: j.total_results ?? 0, next: Boolean(j.next_page) };
  }

  return async function handle(msg) {
    const { id, method, params = {} } = msg ?? {};
    if (method === 'initialize') {
      return ok(id, {
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'pexels-gove', title: 'Pexels Gove', version: '1.0.0' },
        instructions: 'Banco de imagens Pexels para os apps do Gove Design System. A captura de sites precisa do servidor da Gove.',
      });
    }
    if (typeof method === 'string' && method.startsWith('notifications/')) return null;
    if (method === 'ping') return ok(id, {});
    if (method === 'tools/list') return ok(id, { tools: TOOLS });
    if (method === 'tools/call') {
      const args = params.arguments ?? {};
      try {
        if (params.name === 'search_photos') return ok(id, toolResult(await searchPhotos(args)));
        if (params.name === 'capture_site') return ok(id, toolError(CAPTURE_MESSAGE));
        if (params.name === 'get_image') return ok(id, toolResult({ dataUrl: await toDataUrl(String(args.url ?? ''), Math.min(2400, Math.max(200, Number(args.width) || 1600))) }));
        return fail(id, -32602, `Ferramenta desconhecida: ${params.name}`);
      } catch (err) {
        return ok(id, toolError(err.message || 'Falha no Pexels.'));
      }
    }
    return fail(id, -32601, `Método não suportado: ${method}`);
  };
}

/** Atende uma requisição. `fetchImpl` troca o fetch nos testes (o Pexels real não é chamado). */
export async function handleRequest(request, env = {}, fetchImpl = (...a) => fetch(...a)) {
  const m = /^\/mcp\/([^/]+)\/?$/.exec(new URL(request.url).pathname);
  let token = null;
  try {
    token = m ? decodeURIComponent(m[1]) : null;
  } catch {
    token = null;
  }
  if (!env.MCP_TOKEN || token === null || !sameToken(token, env.MCP_TOKEN)) return empty(404);
  if (request.method !== 'POST') return empty(405, { Allow: 'POST' });

  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return empty(413);
  const text = await request.text();
  if (encoder.encode(text).length > MAX_BODY_BYTES) return empty(413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json(fail(null, -32700, 'JSON inválido.'), 400);
  }

  const handle = createMcp({ apiKey: env.PEXELS_API_KEY, fetchImpl });
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? json(out) : empty(202);
  }
  const out = await handle(body);
  return out ? json(out) : empty(202);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
