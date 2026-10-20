// Conector "Pexels Gove" para o claude.ai (MCP por HTTP). Os artefatos no
// claude.ai não alcançam sites externos; eles chamam este conector, cadastrado
// na organização. A chave do Pexels fica só aqui (PEXELS_API_KEY) e o endereço
// leva um token secreto: https://<servidor>/mcp/<PEXELS_MCP_TOKEN>. As imagens
// voltam em data URI, porque o artefato não carrega imagens de outros sites.
import express from 'express';
import { timingSafeEqual } from 'node:crypto';

const API = 'https://api.pexels.com/v1';
const IMAGE_HOST = 'images.pexels.com';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ORIENTATIONS = ['landscape', 'portrait', 'square'];

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
];

const sameToken = (a, b) => {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

export function createPexelsMcpRouter({ apiKey = process.env.PEXELS_API_KEY, token = process.env.PEXELS_MCP_TOKEN, fetchImpl = fetch } = {}) {
  const router = express.Router({ mergeParams: true });
  router.use(express.json({ limit: '64kb' }));

  async function toDataUrl(url, width) {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.hostname !== IMAGE_HOST) throw new Error('Só imagens de images.pexels.com.');
    if (width) {
      u.searchParams.set('auto', 'compress');
      u.searchParams.set('cs', 'tinysrgb');
      u.searchParams.set('w', String(width));
    }
    const r = await fetchImpl(u.toString());
    if (!r.ok) throw new Error('O Pexels não entregou a imagem.');
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) throw new Error('Imagem grande demais.');
    const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
    return `data:${type};base64,${buf.toString('base64')}`;
  }

  async function searchPhotos(args) {
    const q = String(args.query ?? '').trim().slice(0, 80);
    if (!q) return { photos: [], page: 1, total: 0, next: false };
    const params = new URLSearchParams({ query: q, locale: 'pt-BR', per_page: String(Math.min(30, Math.max(1, Number(args.per_page) || 12))), page: String(Math.max(1, Number(args.page) || 1)) });
    if (ORIENTATIONS.includes(args.orientation)) params.set('orientation', args.orientation);
    const r = await fetchImpl(`${API}/search?${params}`, { headers: { Authorization: apiKey } });
    if (r.status === 429) throw new Error('Limite de buscas do Pexels atingido. Tente em alguns minutos.');
    if (!r.ok) throw new Error('O Pexels não respondeu agora.');
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

  const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
  const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  const toolResult = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
  const toolError = (message) => ({ content: [{ type: 'text', text: message }], isError: true });

  async function handle(msg) {
    const { id, method, params = {} } = msg ?? {};
    if (method === 'initialize') {
      return ok(id, {
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'pexels-gove', title: 'Pexels Gove', version: '1.0.0' },
        instructions: 'Banco de imagens Pexels para os apps do Gove Design System.',
      });
    }
    if (typeof method === 'string' && method.startsWith('notifications/')) return null;
    if (method === 'ping') return ok(id, {});
    if (method === 'tools/list') return ok(id, { tools: TOOLS });
    if (method === 'tools/call') {
      const args = params.arguments ?? {};
      try {
        if (params.name === 'search_photos') return ok(id, toolResult(await searchPhotos(args)));
        if (params.name === 'get_image') return ok(id, toolResult({ dataUrl: await toDataUrl(String(args.url ?? ''), Math.min(2400, Math.max(200, Number(args.width) || 1600))) }));
        return fail(id, -32602, `Ferramenta desconhecida: ${params.name}`);
      } catch (err) {
        return ok(id, toolError(err.message || 'Falha no Pexels.'));
      }
    }
    return fail(id, -32601, `Método não suportado: ${method}`);
  }

  router.all('/', async (req, res) => {
    if (!apiKey || !token || !sameToken(req.params.token, token)) return res.status(404).end();
    if (req.method !== 'POST') return res.status(405).set('Allow', 'POST').end();
    const body = req.body;
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map(handle))).filter(Boolean);
      return out.length ? res.json(out) : res.status(202).end();
    }
    const out = await handle(body);
    return out ? res.json(out) : res.status(202).end();
  });

  return router;
}
