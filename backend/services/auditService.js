// Orquestra uma auditoria: detecta o modo, roda as checagens, monta o
// relatório, grava o histórico e salva os artefatos para download.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { loadBrandTokens, recordAudit } from '../../db/database.js';
import { auditVector } from '../audit/modeA.js';
import { auditRaster } from '../audit/modeB.js';
import { DocInputError } from '../audit/docModel.js';
import { auditDocument, docFormatOf } from '../audit/modeDoc.js';
import { buildReport } from '../report/build.js';
import { renderReportHtml } from '../report/html.js';
import { auditEntries } from '../report/package.js';
import { annotatePreview } from '../report/preview.js';

const RASTER_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const RASTER_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const DOC_TYPES = {
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/pdf': '.pdf',
  'text/html': '.html',
};
/** Extensões aceitas (para o campo de envio). */
export const ACCEPTED_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.pptx', '.pdf', '.docx', '.html', '.htm', '.json'];

/** Extensão efetiva do arquivo (pelo nome, ou pelo tipo MIME). */
export function docExt({ name = '', mimetype = '' }) {
  const ext = extname(name).toLowerCase();
  if (docFormatOf(ext)) return ext;
  return DOC_TYPES[mimetype] ?? null;
}

export class AuditInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function detectMode({ name = '', mimetype = '' }) {
  const ext = extname(name).toLowerCase();
  if (ext === '.json' || mimetype === 'application/json') return 'A';
  if (RASTER_EXT.has(ext) || RASTER_TYPES.has(mimetype)) return 'B';
  const d = docExt({ name, mimetype });
  return d ? docFormatOf(d).mode : null;
}

const safeName = (n) => String(n).replace(/[^\w.\-À-ÿ ]+/g, '_').slice(0, 120) || 'peca';

/**
 * @param {object} p
 * @param {import('better-sqlite3').Database} p.db
 * @param {{ name:string, buffer:Buffer, mimetype?:string }} p.file
 * @param {object} [p.regions]    metadados de regiões (Modo B)
 * @param {string} [p.pieceType]
 * @param {object} [p.artboard]   { width, height } (Modo A, opcional)
 * @param {string} [p.storageDir] onde salvar os artefatos
 */
export async function runAudit({ db, file, regions, pieceType, artboard, storageDir }) {
  const mode = detectMode(file);
  if (!mode) {
    throw new AuditInputError('Formato não suportado. Envie PNG/JPG, PowerPoint (.pptx), PDF, Word (.docx), HTML ou Fabric.js JSON.', 415);
  }
  const tokens = loadBrandTokens(db);
  const sha256 = createHash('sha256').update(file.buffer).digest('hex');

  let result;
  if (mode === 'A') {
    let json;
    try {
      json = JSON.parse(file.buffer.toString('utf8'));
    } catch {
      throw new AuditInputError('O arquivo .json não é um JSON válido.');
    }
    if (!Array.isArray(json?.objects)) {
      throw new AuditInputError('JSON sem a lista "objects": exporte a peça com canvas.toJSON() do Fabric.js.');
    }
    result = await auditVector({ json, pieceType: pieceType || json.gove?.pieceType, artboard, tokens });
  } else if (mode === 'B') {
    result = await auditRaster({ buffer: file.buffer, regions, pieceType, tokens });
  } else {
    try {
      result = await auditDocument({ ext: docExt(file), buffer: file.buffer, tokens });
    } catch (err) {
      if (err instanceof DocInputError) throw new AuditInputError(err.message, err.status);
      throw err;
    }
  }

  const report = buildReport({
    mode,
    file: { name: file.name, sha256, size: file.buffer.length, type: file.mimetype ?? null },
    pieceType: result.pieceType,
    artboard: result.artboard,
    checks: result.checks,
    tokens,
    extra: { regionSource: result.regionSource, palette: result.palette, placeholderImages: result.placeholderImages, ...(result.extra ?? {}) },
  });

  let preview = null;
  if (result.preview && result.artboard) {
    try {
      preview = await annotatePreview(result.preview, report.checks, result.artboard);
    } catch {
      preview = result.preview;
    }
  }

  const id = recordAudit(db, report);
  report.auditId = id;
  db.prepare('UPDATE audit_history SET report = ? WHERE id = ?').run(JSON.stringify(report), id);
  const html = renderReportHtml(report, { previewSrc: preview ? 'preview-anotado.png' : null });

  if (storageDir) {
    const dir = join(storageDir, String(id));
    mkdirSync(dir, { recursive: true });
    for (const e of auditEntries({ report, html, preview, original: { name: safeName(file.name), data: file.buffer } })) {
      const p = join(dir, e.name);
      mkdirSync(join(p, '..'), { recursive: true });
      writeFileSync(p, e.data);
    }
  }
  return { id, report, html, preview };
}

/** Recarrega do disco os artefatos de uma auditoria para empacotar. */
export function storedEntries(storageDir, id) {
  const dir = join(storageDir, String(id));
  if (!existsSync(join(dir, 'relatorio.json'))) return null;
  const report = JSON.parse(readFileSync(join(dir, 'relatorio.json'), 'utf8'));
  const html = readFileSync(join(dir, 'relatorio.html'), 'utf8');
  const previewPath = join(dir, 'preview-anotado.png');
  const preview = existsSync(previewPath) ? readFileSync(previewPath) : null;
  return { report, entries: auditEntries({ report, html, preview }) };
}
