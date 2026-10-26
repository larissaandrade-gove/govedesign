// Rotas do Gove Print Studio, montadas em /print-studio no servidor Express do projeto.
import express from 'express';
import multer from 'multer';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';
import { BB_SCHEMES, LAYOUTS, bbBlockingChecks, buildLayout, isEmail, normalizeSite, onlyDigits, pdfFileName } from '../shared/layout.js';
import { FONT_FILES } from '../shared/tokens.js';
import {
  deleteMunicipio, getImagem, getLogosFixos, getMunicipio, listMunicipios, openPrintDb,
  saveImagem, saveMunicipio, setLogoFixo, setMunicipioIdentidade, setMunicipioLogo,
} from './db.js';
import { BRAND_DIR, ImageInputError, readStored, storeLogo, storeMockupImage } from './images.js';
import { fontPath, measure, renderPiece } from './pdf.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(ROOT, 'web', 'bundle.html');

class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function validateMunicipio(body) {
  const nome = String(body.nome_municipio ?? '').trim();
  const ddd = onlyDigits(body.ddd);
  const numero = onlyDigits(body.numero_whatsapp);
  const uf = String(body.uf ?? '').trim().toUpperCase();
  if (!nome) throw new InputError('Informe o nome do município.');
  if (ddd.length !== 2) throw new InputError('DDD deve ter 2 dígitos.');
  if (numero.length < 8 || numero.length > 9) throw new InputError('Número de WhatsApp deve ter 8 ou 9 dígitos.');
  if (uf && !/^[A-Z]{2}$/.test(uf)) throw new InputError('UF deve ter 2 letras.');
  const endereco = String(body.endereco ?? '').trim().slice(0, 200);
  const email = String(body.email ?? '').trim().slice(0, 120);
  if (email && !isEmail(email)) throw new InputError('E-mail inválido.');
  // Site do domicílio eletrônico (opcional): QR e faixa das peças do Portal Cidadão
  const site = normalizeSite(String(body.url_domicilio ?? '').slice(0, 300));
  if (site === null) throw new InputError('Site do domicílio eletrônico inválido. Ex.: www.municipio.sp.gov.br');
  const bb = body.incluir_logo_banco_do_brasil;
  return { nome_municipio: nome, uf, ddd, numero_whatsapp: numero, incluir_logo_banco_do_brasil: bb === true || bb === 'true' || bb === '1' || bb === 'on', endereco, email, url_domicilio: site };
}

/** Monta a entrada do motor de layout e os arquivos de uma peça. */
function pieceContext(db, item, layoutId) {
  const municipio = getMunicipio(db, Number(item.municipioId));
  if (!municipio) throw new InputError(`Município ${item.municipioId} não encontrado.`, 404);
  const fixos = getLogosFixos(db);
  const opts = item.options ?? {};
  const img = opts.mockup?.imageId ? getImagem(db, opts.mockup.imageId) : null;
  const mode = 'upload'; // só captura enviada (tela gerada removida)
  const identity = (opts.identity ?? municipio.identidade) === 'bb' ? 'bb' : 'gove';
  // Identidade BB: logomarca do Banco do Brasil obrigatória
  const includeBB = identity === 'bb' || (opts.includeBB ?? municipio.incluir_logo_banco_do_brasil);
  const dims = (w, h) => (w && h ? { width: w, height: h } : null);
  return {
    municipio,
    input: {
      municipio,
      model: opts.model === 'portal' ? 'portal' : 'whatsapp',
      identity,
      bbScheme: opts.bbScheme ?? municipio.bb_esquema ?? 'capa',
      includeBB,
      services: opts.services ?? [],
      texts: opts.texts?.[layoutId] ?? {},
      overrides: opts.overrides?.[layoutId] ?? {},
      mockup: { mode, ...(img ? { imageId: img.id, width: img.largura, height: img.altura, focus: opts.mockup.focus } : {}) },
      assets: {
        // Sem upload em "Logos fixos", vale a logomarca oficial (brand/logos)
        gove: fixos.gove ? dims(fixos.gove.largura, fixos.gove.altura) : { official: true },
        bb: fixos.bb ? dims(fixos.bb.largura, fixos.bb.altura) : null,
        prefeitura: dims(municipio.logo_largura, municipio.logo_altura),
      },
    },
    files: {
      logos: { gove: fixos.gove?.hires, bb: fixos.bb?.hires, prefeitura: municipio.logo_hires },
      mockupFile: img?.arquivo ?? null,
    },
  };
}

function pieces(db, items) {
  if (!Array.isArray(items) || !items.length) throw new InputError('A fila de exportação está vazia.');
  const list = [];
  for (const item of items) {
    for (const layoutId of item.layouts ?? []) {
      if (!LAYOUTS.some((l) => l.id === layoutId)) throw new InputError(`Layout desconhecido: ${layoutId}`);
      list.push({ layoutId, ...pieceContext(db, item, layoutId) });
    }
  }
  if (!list.length) throw new InputError('Selecione ao menos um layout.');
  return list;
}

export function createPrintStudioRouter({ db = openPrintDb() } = {}) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  router.get('/', (_req, res) => {
    if (!existsSync(BUNDLE)) {
      return res.status(503).type('text').send('Interface do Print Studio não compilada. Rode: npm run print:build');
    }
    res.sendFile(BUNDLE);
  });
  router.get('/fonts/:file', (req, res) => {
    const weight = Object.keys(FONT_FILES).find((k) => FONT_FILES[k] === req.params.file);
    return weight ? res.sendFile(fontPath(weight), { maxAge: '30d' }) : res.status(404).end();
  });

  // ---------- Municípios ----------
  router.get('/api/municipios', (req, res) => res.json(listMunicipios(db, String(req.query.q ?? ''))));
  router.get('/api/municipios/:id', (req, res) => {
    const m = getMunicipio(db, Number(req.params.id));
    return m ? res.json(m) : res.status(404).json({ error: 'Município não encontrado.' });
  });
  const saveHandler = async (req, res, next) => {
    try {
      const id = req.params.id ? Number(req.params.id) : null;
      if (id && !getMunicipio(db, id)) throw new InputError('Município não encontrado.', 404);
      let m = saveMunicipio(db, validateMunicipio(req.body), id);
      if (req.file) m = setMunicipioLogo(db, m.id, await storeLogo(req.file.buffer, req.file.originalname));
      res.status(id ? 200 : 201).json(m);
    } catch (err) {
      next(err);
    }
  };
  router.post('/api/municipios', upload.single('logo'), saveHandler);
  router.put('/api/municipios/:id', upload.single('logo'), saveHandler);
  // Identidade visual do município (persistida a cada troca no Editor)
  router.put('/api/municipios/:id/identidade', express.json(), (req, res) => {
    const id = Number(req.params.id);
    if (!getMunicipio(db, id)) return res.status(404).json({ error: 'Município não encontrado.' });
    const identidade = req.body?.identidade === 'bb' ? 'bb' : 'gove';
    const esquema = BB_SCHEMES.some((s) => s.id === req.body?.bb_esquema) ? req.body.bb_esquema : 'capa';
    res.json(setMunicipioIdentidade(db, id, identidade, esquema));
  });
  router.delete('/api/municipios/:id', (req, res) => res.status(deleteMunicipio(db, Number(req.params.id)) ? 204 : 404).end());
  router.get('/api/municipios/:id/logo', (req, res) => {
    const m = getMunicipio(db, Number(req.params.id));
    if (!m?.logo_hires) return res.status(404).end();
    res.type('png').send(readStored(m.logo_hires));
  });

  // ---------- Logos fixos (Gove e Banco do Brasil) ----------
  router.get('/api/logos-fixos', (_req, res) => {
    const f = getLogosFixos(db);
    const view = (k) => (f[k] ? { width: f[k].largura, height: f[k].altura, avisos: f[k].avisos, atualizado: f[k].data_atualizacao } : null);
    res.json({ gove: view('gove') ?? { official: true, width: 2000, height: 637, avisos: [], atualizado: '' }, bb: view('bb') });
  });
  router.put('/api/logos-fixos/:chave', upload.single('logo'), async (req, res, next) => {
    try {
      const { chave } = req.params;
      if (!['gove', 'bb'].includes(chave)) throw new InputError('Logo fixo inválido.', 404);
      if (!req.file) throw new InputError('Envie o arquivo no campo "logo".');
      const logo = await storeLogo(req.file.buffer, req.file.originalname);
      setLogoFixo(db, chave, logo);
      res.json({ width: logo.width, height: logo.height, avisos: logo.warnings });
    } catch (err) {
      next(err);
    }
  });
  // Logomarca oficial da Gove (versões cor/roxo/branco), usada no preview
  router.get('/marca/:file', (req, res) => {
    if (!/^gove-(logo|simbolo)-(cor|roxo|branco)\.(webp|png)$/.test(req.params.file)) return res.status(404).end();
    res.sendFile(join(BRAND_DIR, req.params.file), { maxAge: '1d' });
  });
  router.get('/api/logos-fixos/:chave/imagem', (req, res) => {
    const f = getLogosFixos(db)[req.params.chave];
    return f ? res.type('png').send(readStored(f.hires)) : res.status(404).end();
  });

  // ---------- Imagens do mockup ----------
  router.post('/api/imagens', upload.single('imagem'), async (req, res, next) => {
    try {
      if (!req.file) throw new InputError('Envie a imagem no campo "imagem".');
      const img = await storeMockupImage(req.file.buffer);
      res.status(201).json(saveImagem(db, img));
    } catch (err) {
      next(err);
    }
  });
  router.get('/api/imagens/:id', (req, res) => {
    const img = getImagem(db, req.params.id);
    return img ? res.type('png').send(readStored(img.arquivo)) : res.status(404).end();
  });

  // ---------- Verificação e exportação ----------
  router.post('/api/preflight', async (req, res, next) => {
    try {
      const results = [];
      for (const p of pieces(db, req.body?.items)) {
        const { report, layout } = await renderPiece(p.layoutId, p);
        const checks = [...layout.checks, ...report];
        results.push({
          arquivo: pdfFileName(p.layoutId, p.municipio, new Date(), p.input.model),
          municipio: p.municipio.nome_municipio,
          layout: layout.layout.name,
          checks,
          ok: !checks.some((c) => c.level === 'error'),
        });
      }
      res.json({ pecas: results, ok: results.every((r) => r.ok) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/export', async (req, res, next) => {
    try {
      const list = pieces(db, req.body?.items);
      // Identidade BB: paleta, contraste 4,5:1 e tipografia são regra — sem exportar mesmo assim
      for (const p of list) {
        if (p.input.identity !== 'bb') continue;
        const blocking = bbBlockingChecks(buildLayout(p.layoutId, p.input, measure).checks);
        if (blocking.length) throw new InputError(`Identidade Banco do Brasil — ${p.municipio.nome_municipio}: ${blocking.map((c) => c.message).join(' ')}`);
      }
      const zip = new ZipArchive({ zlib: { level: 6 } });
      const stamp = new Date().toISOString().slice(0, 10);
      res.attachment(`kit-boas-vindas_${stamp}.zip`);
      zip.pipe(res);
      const used = new Set();
      for (const p of list) {
        const { buffer } = await renderPiece(p.layoutId, p);
        let name = pdfFileName(p.layoutId, p.municipio, new Date(), p.input.model);
        for (let i = 2; used.has(name); i++) name = name.replace(/(_\d+)?\.pdf$/, `_${i}.pdf`);
        used.add(name);
        zip.append(buffer, { name });
      }
      await zip.finalize();
    } catch (err) {
      next(err);
    }
  });

  router.use((err, _req, res, _next) => {
    const status = err instanceof InputError ? err.status : err instanceof ImageInputError ? 400 : err.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
    if (status >= 500) console.error(err);
    if (res.headersSent) return res.end();
    res.status(status).json({ error: status >= 500 ? 'Erro interno ao gerar as peças.' : err.message });
  });
  return router;
}
