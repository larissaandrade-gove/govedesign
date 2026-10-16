// Renderização do PDF com pdfkit — cores sempre em CMYK, Montserrat embutida.
// O desenho em si é compartilhado com o preview e o PDF do navegador (shared/draw.js).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { buildLayout, logoContrastCheck } from '../shared/layout.js';
import { LOGO_VARIANT_COLORS, buildStencils, imageElements, paintPdf, pixelContrast } from '../shared/pdfpaint.js';
import { COLORS, FONT_FILES, contrastRatio, mmToPt, ptToMm } from '../shared/tokens.js';
import { brandRgba, logoCmyk, mockupCmyk, storedRgba } from './images.js';

const FONTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fonts');
export const fontPath = (weight) => join(FONTS_DIR, FONT_FILES[weight]);

// Medição de texto com as mesmas .ttf usadas no PDF e no preview.
const measureDoc = new PDFDocument({ autoFirstPage: false });
for (const w of Object.keys(FONT_FILES)) measureDoc.registerFont(w, fontPath(w));
export function measure(text, weight, sizePt) {
  return ptToMm(measureDoc.font(weight).fontSize(sizePt).widthOfString(text));
}

export const qrModules = (data) => QRCode.create(data, { errorCorrectionLevel: 'H' }).modules;

const stencilCache = new Map();
async function officialStencils(e) {
  const key = `${e.file}:${e.variant}`;
  if (!stencilCache.has(key)) {
    const { data, width, height } = await brandRgba(e.file);
    stencilCache.set(key, buildStencils(data, width, height, LOGO_VARIANT_COLORS[e.variant]));
  }
  return stencilCache.get(key);
}

/**
 * Gera o PDF de uma peça.
 * @param ctx { input, files: { logos: {gove,bb,prefeitura: hiresFile}, mockupFile } }
 * @returns { buffer, layout, report }
 */
export async function renderPiece(layoutId, ctx) {
  const L = buildLayout(layoutId, ctx.input, measure);
  const doc = new PDFDocument({
    size: [mmToPt(L.page.w), mmToPt(L.page.h)],
    margin: 0,
    pdfVersion: '1.4',
    info: { Title: `${L.layout.name} — ${ctx.input.municipio?.nome_municipio ?? ''}`, Creator: 'Gove Print Studio' },
  });
  for (const w of Object.keys(FONT_FILES)) doc.registerFont(w, fontPath(w));
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((res) => doc.on('end', res));

  // Pré-carrega as imagens (o desenho é síncrono)
  const images = { total: 0, cmyk: 0, masks: 0 };
  const logoContrasts = [];
  const prepared = new Map();
  for (const e of imageElements(L)) {
    if (e.type === 'mockup-screen') {
      if (!ctx.files.mockupFile) continue;
      const jpg = await mockupCmyk(ctx.files.mockupFile, e.focus, e.w, e.w / e.h);
      const m = await sharp(jpg).metadata();
      images.total += 1;
      if (m.space === 'cmyk' && m.channels === 4) images.cmyk += 1;
      prepared.set(e, { jpeg: jpg });
    } else if (e.official) {
      prepared.set(e, { masks: await officialStencils(e) });
      images.masks += 1;
    } else {
      const file = ctx.files.logos?.[e.which];
      if (!file) continue;
      const jpg = await logoCmyk(file, e.w);
      const m = await sharp(jpg).metadata();
      images.total += 1;
      if (m.space === 'cmyk' && m.channels === 4) images.cmyk += 1;
      prepared.set(e, { jpeg: jpg });
      if (e.which === 'gove') {
        const px = await storedRgba(file);
        const c = pixelContrast(px.data, e.bg ?? '#FFFFFF');
        if (c != null) logoContrasts.push(c);
      }
    }
  }
  paintPdf(doc, L, prepared, { qr: qrModules });
  doc.end();
  await done;
  const buffer = Buffer.concat(chunks);
  return { buffer, layout: L, report: fileChecks(buffer, L, images, logoContrasts) };
}

/** Checagens do arquivo gerado: sangria, fontes, CMYK, contraste do QR e da logomarca. */
function fileChecks(buffer, L, images, uploadedLogoContrasts) {
  const raw = buffer.toString('latin1');
  const out = [];
  const add = (level, code, message) => out.push({ level, code, message, layout: L.layout.name });

  const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(raw);
  const wMm = box ? ptToMm(Number(box[1])) : 0;
  const hMm = box ? ptToMm(Number(box[2])) : 0;
  const okSize = Math.abs(wMm - L.page.w) < 0.1 && Math.abs(hMm - L.page.h) < 0.1;
  add(okSize ? 'ok' : 'error', 'sangria', okSize
    ? `Sangria ok — ${L.page.w.toFixed(0)} × ${L.page.h.toFixed(0)} mm (corte ${L.trim.w} × ${L.trim.h} mm + 5 mm).`
    : `Tamanho do PDF (${wMm.toFixed(1)} × ${hMm.toFixed(1)} mm) diferente do esperado.`);

  const fonts = (raw.match(/\/FontFile2/g) ?? []).length;
  const fontRefs = (raw.match(/\/Type \/Font\b/g) ?? []).length;
  add(fonts > 0 && fonts * 2 >= fontRefs ? 'ok' : 'error', 'fontes', fonts > 0 ? `Fontes embutidas ok — ${fonts} variação(ões) da Montserrat.` : 'Nenhuma fonte embutida encontrada.');

  const rgb = raw.includes('/DeviceRGB');
  const imgsOk = images.cmyk === images.total;
  add(!rgb && imgsOk ? 'ok' : 'error', 'cmyk', !rgb && imgsOk
    ? `Cores em CMYK ok — preenchimentos, textos e ${images.total} imagem(ns) em CMYK${images.masks ? `; logomarca Gove em ${images.masks} máscara(s) com cor CMYK da marca` : ''}.`
    : 'Há elementos em RGB no arquivo.');

  const qrRatio = contrastRatio(COLORS.preto.hex, COLORS.branco.hex);
  add(qrRatio >= 7 ? 'ok' : 'error', 'qr-contraste', `Contraste QR ok — módulos K100 sobre branco sólido (${qrRatio.toFixed(1)}:1), correção de erro H.`);
  out.push({ ...logoCheck(L, uploadedLogoContrasts), layout: L.layout.name });
  return out;
}

/** "Contraste da logomarca ≥ 4,5:1": versões oficiais pela regra da marca; logo enviado, pelos pixels. */
export function logoCheck(L, uploaded) {
  const official = logoContrastCheck(L);
  if (uploaded.length) {
    const min = Math.min(...uploaded);
    if (min < 4.5) return { level: 'error', code: 'logo-contraste', message: `Contraste da logomarca Gove enviada de ${min.toFixed(1)}:1 com o fundo — mínimo 4,5:1.` };
    if (!official || official.level === 'ok') return { level: 'ok', code: 'logo-contraste', message: `Contraste da logomarca ok — logo Gove enviado ≥ 4,5:1 (mín. ${min.toFixed(1)}:1).` };
  }
  return official ?? { level: 'warn', code: 'logo-contraste', message: 'Logomarca Gove ausente: contraste não verificado.' };
}
