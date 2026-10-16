// Banco de imagens Pexels para os apps do ambiente (criativos, follow-ups,
// landing pages). A chave fica só no servidor (PEXELS_API_KEY no .env, fora do
// git) e nunca vai para o navegador. As imagens passam por este servidor para
// poderem ser desenhadas em canvas sem bloqueio de origem.
import express from 'express';

const API = 'https://api.pexels.com/v1';
const IMAGE_HOSTS = new Set(['images.pexels.com']);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const pick = (p) => ({
  id: p.id,
  alt: p.alt ?? '',
  width: p.width,
  height: p.height,
  avgColor: p.avg_color ?? null,
  photographer: p.photographer ?? '',
  photographerUrl: p.photographer_url ?? '',
  pexelsUrl: p.url ?? '',
  src: {
    thumb: p.src?.medium ?? p.src?.small ?? '',
    large: p.src?.large2x ?? p.src?.large ?? p.src?.original ?? '',
    original: p.src?.original ?? '',
  },
});

export function createPexelsRouter({ apiKey = process.env.PEXELS_API_KEY, fetchImpl = fetch } = {}) {
  const router = express.Router();

  router.get('/status', (_req, res) => res.json({ available: Boolean(apiKey) }));

  // Busca: ?q=termo&page=1&orientation=landscape|portrait|square&per_page=1..40
  router.get('/search', async (req, res) => {
    if (!apiKey) return res.status(503).json({ error: 'Banco de imagens não configurado no servidor (PEXELS_API_KEY).' });
    const q = String(req.query.q ?? '').trim().slice(0, 80);
    if (!q) return res.json({ photos: [], page: 1, total: 0 });
    const params = new URLSearchParams({ query: q, locale: 'pt-BR', per_page: String(Math.min(40, Math.max(1, Number(req.query.per_page) || 24))), page: String(Math.max(1, Number(req.query.page) || 1)) });
    const orientation = String(req.query.orientation ?? '');
    if (['landscape', 'portrait', 'square'].includes(orientation)) params.set('orientation', orientation);
    try {
      const r = await fetchImpl(`${API}/search?${params}`, { headers: { Authorization: apiKey } });
      if (r.status === 429) return res.status(429).json({ error: 'Limite de buscas do Pexels atingido. Tente em alguns minutos.' });
      if (!r.ok) return res.status(502).json({ error: 'O Pexels não respondeu agora. Tente de novo.' });
      const j = await r.json();
      res.json({ photos: (j.photos ?? []).map(pick), page: j.page ?? 1, total: j.total_results ?? 0, next: Boolean(j.next_page) });
    } catch {
      res.status(502).json({ error: 'Sem conexão com o Pexels.' });
    }
  });

  // Imagem: ?u=https://images.pexels.com/... (só o host do Pexels)
  router.get('/image', async (req, res) => {
    let url;
    try {
      url = new URL(String(req.query.u ?? ''));
    } catch {
      return res.status(400).json({ error: 'URL inválida.' });
    }
    if (url.protocol !== 'https:' || !IMAGE_HOSTS.has(url.hostname)) return res.status(400).json({ error: 'Só imagens do Pexels.' });
    try {
      const r = await fetchImpl(url.href);
      if (!r.ok) return res.status(502).end();
      const type = r.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) return res.status(502).end();
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_IMAGE_BYTES) return res.status(413).end();
      res.set({ 'content-type': type, 'cache-control': 'private, max-age=86400' }).send(buf);
    } catch {
      res.status(502).end();
    }
  });

  return router;
}
