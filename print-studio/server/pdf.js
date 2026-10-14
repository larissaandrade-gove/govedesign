// Renderização do PDF com pdfkit — cores sempre em CMYK, Montserrat embutida.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { buildLayout, gradientLine } from '../shared/layout.js';
import { COLORS, FONT_FILES, contrastRatio, mmToPt, ptToMm } from '../shared/tokens.js';
import { logoCmyk, mockupCmyk } from './images.js';

const FONTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fonts');
export const fontPath = (weight) => join(FONTS_DIR, FONT_FILES[weight]);

// Medição de texto com as mesmas .ttf usadas no PDF e no preview.
const measureDoc = new PDFDocument({ autoFirstPage: false });
for (const w of Object.keys(FONT_FILES)) measureDoc.registerFont(w, fontPath(w));
export function measure(text, weight, sizePt) {
  return ptToMm(measureDoc.font(weight).fontSize(sizePt).widthOfString(text));
}

/** Toda cor passa por aqui: só existem cores CMYK no PDF. */
function cmyk(key) {
  const c = COLORS[key];
  if (!c?.cmyk) throw new Error(`Cor sem CMYK definido: ${key}`);
  return c.cmyk;
}

function drawIcon(doc, e) {
  doc.save();
  doc.translate(mmToPt(e.x), mmToPt(e.y)).scale(mmToPt(e.w) / 24);
  doc.lineWidth(e.lineWidth).lineCap('round').lineJoin('round').strokeColor(cmyk(e.stroke)).strokeOpacity(e.opacity ?? 1);
  for (const d of e.paths) doc.path(d).stroke();
  if (e.inner) {
    doc.translate(...e.inner.offset).scale(e.inner.scale);
    doc.lineWidth(e.lineWidth / e.inner.scale);
    for (const d of e.inner.paths) doc.path(d).stroke();
  }
  doc.restore();
}

function drawQr(doc, e) {
  const qr = QRCode.create(e.data, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const cell = mmToPt(e.w) / n;
  const x0 = mmToPt(e.x);
  const y0 = mmToPt(e.y);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      // pequena sobreposição evita fios brancos entre módulos na RIP
      if (qr.modules.get(r, c)) doc.rect(x0 + c * cell, y0 + r * cell, cell + 0.05, cell + 0.05);
    }
  }
  doc.fill(cmyk(e.color));
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

  const images = { total: 0, cmyk: 0 };
  const embedJpeg = async (buf) => {
    const m = await sharp(buf).metadata();
    images.total += 1;
    if (m.space === 'cmyk' && m.channels === 4) images.cmyk += 1;
    return buf;
  };

  for (const b of L.blocks) {
    for (const e of b.elements) {
      const x = mmToPt(e.x);
      const y = mmToPt(e.y);
      const w = mmToPt(e.w);
      const h = mmToPt(e.h);
      switch (e.type) {
        case 'gradient': {
          const [x1, y1, x2, y2] = gradientLine(e).map(mmToPt);
          const g = doc.linearGradient(x1, y1, x2, y2);
          g.stop(0, cmyk(e.from)).stop(1, cmyk(e.to));
          doc.rect(x, y, w, h).fill(g);
          break;
        }
        case 'rect':
          (e.r ? doc.roundedRect(x, y, w, h, mmToPt(e.r)) : doc.rect(x, y, w, h)).fill(cmyk(e.fill));
          break;
        case 'icon':
          drawIcon(doc, e);
          break;
        case 'text':
          doc.font(e.weight).fontSize(e.size).fillColor(cmyk(e.color));
          for (const l of e.lines) doc.text(l.text, mmToPt(l.x), mmToPt(l.baseline), { baseline: 'alphabetic', lineBreak: false });
          break;
        case 'qr':
          drawQr(doc, e);
          break;
        case 'mockup-screen': {
          doc.save();
          doc.roundedRect(x, y, w, h, mmToPt(e.r)).clip();
          if (e.imageId && ctx.files.mockupFile) {
            const jpg = await embedJpeg(await mockupCmyk(ctx.files.mockupFile, e.focus, e.w));
            doc.image(jpg, x, y, { width: w, height: h });
          } else {
            doc.rect(x, y, w, h).fill(cmyk(e.fill));
          }
          doc.restore();
          break;
        }
        case 'logo': {
          const file = ctx.files.logos?.[e.which];
          if (e.missing || !file) break;
          const jpg = await embedJpeg(await logoCmyk(file, e.w));
          doc.image(jpg, x, y, { width: w, height: h });
          break;
        }
        default:
          break;
      }
    }
  }
  doc.end();
  await done;
  const buffer = Buffer.concat(chunks);
  return { buffer, layout: L, report: fileChecks(buffer, L, images) };
}

/** Checagens do arquivo gerado: sangria, fontes, CMYK e contraste do QR. */
function fileChecks(buffer, L, images) {
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
    ? `Cores em CMYK ok — preenchimentos, textos e ${images.total} imagem(ns) em CMYK.`
    : 'Há elementos em RGB no arquivo.');

  const qrRatio = contrastRatio(COLORS.preto.hex, COLORS.branco.hex);
  add(qrRatio >= 7 ? 'ok' : 'error', 'qr-contraste', `Contraste QR ok — módulos K100 sobre branco sólido (${qrRatio.toFixed(1)}:1), correção de erro H.`);
  return out;
}
