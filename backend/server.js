// Servidor HTTP do revisor de identidade visual (Express).
import express from 'express';
import multer from 'multer';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteToken, getAudit, listAudits, listTokens, loadBrandTokens, openDatabase, upsertToken } from '../db/database.js';
import { officialLogoFiles } from './audit/modeA.js';
import { generateQr, qrFabricObjects } from './lib/qrcode.js';
import { writeZip } from './report/package.js';
import { AuditInputError, runAudit, storedEntries } from './services/auditService.js';
import { createPrintStudioRouter } from '../print-studio/server/router.js';
import { createAuth } from './auth/index.js';
import { networkGate, parseNetworks } from './auth/network.js';
import { createPexelsRouter } from './pexels.js';
import { createTicketsRouter } from './tickets.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORIES = new Set(['color', 'gradient', 'font', 'icon', 'logo', 'margin', 'setting']);

export function createApp({ db = openDatabase(), authOptions = {}, pexelsOptions = {}, ticketsOptions = {}, allowedNetworks, storageDir: storageDirIn = process.env.GOVE_STORAGE_DIR || join(ROOT, 'storage', 'audits') } = {}) {
  const storageDir = resolve(storageDirIn);
  const app = express();
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : process.env.TRUST_PROXY);

  // Só pela VPN Gove (ALLOWED_NETWORKS = faixas da VPN); depois, login @gove.digital
  app.use(networkGate(parseNetworks(allowedNetworks ?? process.env.ALLOWED_NETWORKS)));

  // Login único do ambiente: tudo abaixo exige sessão (e-mail @gove.digital)
  const auth = createAuth({ db, ...authOptions });
  app.use('/auth', auth.router);
  app.get('/login', (_req, res) => res.sendFile(join(ROOT, 'frontend', 'login.html')));
  app.use('/login-assets', express.static(join(ROOT, 'brand', 'logos')));
  app.use(auth.guard);

  // Banco de imagens Pexels (chave só no servidor)
  app.use('/api/pexels', createPexelsRouter(pexelsOptions));
  // Solicitações para a área de design (RAR, e-mail e agenda)
  app.use('/api/tickets', createTicketsRouter({ db, sessionEmail: auth.currentEmail, ...ticketsOptions }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024 } });

  app.use(express.json({ limit: '20mb' }));
  app.use(express.static(join(ROOT, 'frontend')));

  // Design System (documentação e UI Kit): build estático de arquivo único
  app.get('/design-system', (req, res, next) => (req.originalUrl.split('?')[0].endsWith('/') ? next() : res.redirect(301, '/design-system/')));
  app.get('/design-system/', (_req, res) => {
    const file = join(ROOT, 'design-system', 'dist', 'index.html');
    return existsSync(file) ? res.sendFile(file) : res.status(503).type('text').send('Design system não compilado. Rode: npm run ds:build');
  });
  // Apps embutidos no design system (HTML autocontidos abertos em iframe)
  app.use('/design-system/apps', express.static(join(ROOT, 'design-system', 'dist', 'apps')));

  // Gove Print Studio (Kit de Boas-Vindas): interface e API em /print-studio/
  app.get('/print-studio', (req, res, next) => (req.originalUrl.split('?')[0].endsWith('/') ? next() : res.redirect(301, '/print-studio/')));
  app.use('/print-studio', createPrintStudioRouter());

  // Botões da tela inicial: cada app roda em servidor próprio; o destino vem do ambiente.
  const APP_URLS = {
    '/criativos': ['CRIATIVOS_URL', 'http://localhost:5173/'],
    '/links': ['LINKS_URL', 'http://localhost:5174/'],
    '/lp': ['LP_URL', 'http://localhost:5175/'],
  };
  for (const [path, [envName, fallback]] of Object.entries(APP_URLS)) {
    app.get(path, (_req, res) => res.redirect(302, process.env[envName] || fallback));
  }

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // ---------- Tokens de marca ----------
  app.get('/api/tokens', (req, res) => res.json(listTokens(db, req.query.category)));
  app.get('/api/tokens/resolved', (_req, res) => {
    const tokens = loadBrandTokens(db);
    res.json({ ...tokens, logoFiles: officialLogoFiles(tokens) });
  });
  app.put('/api/tokens/:category/:name', (req, res) => {
    const { category, name } = req.params;
    if (!CATEGORIES.has(category)) return res.status(400).json({ error: `Categoria inválida: ${category}` });
    if (req.body?.value === undefined) return res.status(400).json({ error: 'Envie { "value": ... } no corpo.' });
    res.json(upsertToken(db, { category, name, value: req.body.value, notes: req.body.notes ?? null, placeholder: Boolean(req.body.placeholder) }));
  });
  app.delete('/api/tokens/:category/:name', (req, res) => {
    const ok = deleteToken(db, req.params.category, req.params.name);
    res.status(ok ? 204 : 404).end();
  });

  // ---------- Auditorias ----------
  app.post(
    '/api/audits',
    upload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'regions', maxCount: 1 },
    ]),
    async (req, res, next) => {
      try {
        const f = req.files?.file?.[0];
        if (!f) return res.status(400).json({ error: 'Envie a peça no campo "file".' });
        let regions;
        const regionsRaw = req.files?.regions?.[0]?.buffer?.toString('utf8') ?? req.body.regions;
        if (regionsRaw) {
          try {
            regions = JSON.parse(regionsRaw);
          } catch {
            return res.status(400).json({ error: 'Metadados de regiões não são um JSON válido.' });
          }
        }
        const w = Number(req.body.artboardWidth);
        const h = Number(req.body.artboardHeight);
        const { id, report } = await runAudit({
          db,
          file: { name: f.originalname, buffer: f.buffer, mimetype: f.mimetype },
          regions,
          pieceType: req.body.pieceType || undefined,
          artboard: w > 0 && h > 0 ? { width: w, height: h } : undefined,
          storageDir,
        });
        res.status(201).json({
          id,
          report,
          links: {
            html: `/api/audits/${id}/relatorio.html`,
            preview: `/api/audits/${id}/preview.png`,
            zip: `/api/audits/${id}/zip`,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get('/api/audits', (req, res) => res.json(listAudits(db, { limit: Math.min(200, Number(req.query.limit) || 50) })));
  app.get('/api/audits/:id', (req, res) => {
    const a = getAudit(db, Number(req.params.id));
    return a ? res.json(a) : res.status(404).json({ error: 'Auditoria não encontrada.' });
  });
  app.get('/api/audits/:id/relatorio.html', (req, res) => {
    const p = join(storageDir, String(Number(req.params.id)), 'relatorio.html');
    if (!existsSync(p)) return res.status(404).send('Relatório não encontrado.');
    // O HTML referencia a imagem por caminho relativo (igual ao ZIP).
    const html = readFileSync(p, 'utf8').replace('src="preview-anotado.png"', `src="/api/audits/${Number(req.params.id)}/preview.png"`);
    res.type('html').send(html);
  });
  app.get('/api/audits/:id/preview.png', (req, res) => {
    const p = join(storageDir, String(Number(req.params.id)), 'preview-anotado.png');
    return existsSync(p) ? res.sendFile(p) : res.status(404).end();
  });
  app.get('/api/audits/:id/zip', async (req, res, next) => {
    const id = Number(req.params.id);
    const stored = storedEntries(storageDir, id);
    if (!stored) return res.status(404).json({ error: 'Artefatos da auditoria não encontrados.' });
    const base = stored.report.file.name.replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '-');
    res.attachment(`revisao-identidade-${id}-${base}.zip`);
    try {
      await writeZip(stored.entries, res);
    } catch (err) {
      next(err);
    }
  });

  // ---------- QR code ----------
  app.post('/api/qrcode', async (req, res, next) => {
    try {
      const tokens = loadBrandTokens(db);
      const { text, format = 'png', ...opts } = req.body ?? {};
      if (format === 'fabric') {
        return res.json({ objects: await qrFabricObjects(tokens, text, opts) });
      }
      const qr = await generateQr(tokens, text, { format, ...opts });
      if (qr.adjustments.length) res.set('X-Gove-QR-Adjustments', encodeURIComponent(qr.adjustments.join(' | ')));
      res.type(format === 'svg' ? 'image/svg+xml' : 'image/png').send(qr.data);
    } catch (err) {
      next(err);
    }
  });

  // ---------- Erros ----------
  app.use((err, _req, res, _next) => {
    const status = err instanceof AuditInputError ? err.status : err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Erro interno ao processar a peça.' : err.message });
  });

  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3040;
  createApp().listen(port, () => console.log(`Revisor de identidade Gove em http://localhost:${port}`));
}
