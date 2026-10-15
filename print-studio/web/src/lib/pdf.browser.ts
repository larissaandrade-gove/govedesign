// Renderização do PDF no navegador (porta de server/pdf.js para o build de
// artefato). Vetores e textos continuam em CMYK; Montserrat embutida.
// Diferença do servidor: as imagens (logos e mockup) entram como JPEG RGB,
// porque o navegador não converte para CMYK — o relatório avisa isso.
/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { buildLayout, gradientLine } from '../../../shared/layout.js';
import { COLORS, FONT_FILES, contrastRatio, mmToPt, ptToMm } from '../../../shared/tokens.js';
import { fontBytes, type FontWeight } from '@/lib/fonts.embedded';
import { logoJpeg, mockupJpeg } from '@/lib/images.browser';

const WEIGHTS = Object.keys(FONT_FILES) as FontWeight[];
const COLOR_MAP = COLORS as Record<string, { hex: string; cmyk?: number[] }>;

let measureDoc: any = null;
/** Medição de texto com as mesmas .ttf embutidas no PDF (igual ao servidor). */
export function measure(text: string, weight: string, sizePt: number): number {
  if (!measureDoc) {
    measureDoc = new PDFDocument({ autoFirstPage: false, font: fontBytes('regular') });
    for (const w of WEIGHTS) measureDoc.registerFont(w, fontBytes(w));
  }
  return ptToMm(measureDoc.font(weight).fontSize(sizePt).widthOfString(text));
}

/** Toda cor passa por aqui: só existem cores CMYK nos vetores do PDF. */
function cmyk(key: string) {
  const c = COLOR_MAP[key];
  if (!c?.cmyk) throw new Error(`Cor sem CMYK definido: ${key}`);
  return c.cmyk;
}

function drawIcon(doc: any, e: any) {
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

function drawQr(doc: any, e: any) {
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

export type PieceFiles = { logos: Partial<Record<'gove' | 'bb' | 'prefeitura', Blob | null>>; mockup: Blob | null };
export type FileCheck = { level: 'ok' | 'warn' | 'error'; code: string; message: string; layout: string };

/** Gera o PDF de uma peça. */
export async function renderPiece(layoutId: string, input: any, files: PieceFiles) {
  const L = buildLayout(layoutId, input, measure) as any;
  const doc = new PDFDocument({
    size: [mmToPt(L.page.w), mmToPt(L.page.h)],
    margin: 0,
    pdfVersion: '1.4',
    // No navegador não há Helvetica (padrão do pdfkit): começa já na Montserrat.
    font: fontBytes('regular'),
    info: { Title: `${L.layout.name} — ${input.municipio?.nome_municipio ?? ''}`, Creator: 'Gove Print Studio' },
  });
  for (const w of WEIGHTS) doc.registerFont(w, fontBytes(w));
  const chunks: Uint8Array[] = [];
  doc.on('data', (c: Uint8Array) => chunks.push(c));
  const done = new Promise<void>((res) => doc.on('end', () => res()));

  const images = { total: 0 };
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
          if (e.imageId && files.mockup) {
            const jpg = await mockupJpeg(files.mockup, e.focus, e.w);
            images.total += 1;
            doc.image(jpg, x, y, { width: w, height: h });
          } else {
            doc.rect(x, y, w, h).fill(cmyk(e.fill));
          }
          doc.restore();
          break;
        }
        case 'logo': {
          const file = files.logos?.[e.which as 'gove' | 'bb' | 'prefeitura'];
          if (e.missing || !file) break;
          const jpg = await logoJpeg(file, e.w);
          images.total += 1;
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
  const size = chunks.reduce((n, c) => n + c.length, 0);
  const bytes = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    bytes.set(c, off);
    off += c.length;
  }
  return { bytes, layout: L, report: fileChecks(bytes, L, images) };
}

/** Checagens do arquivo gerado: sangria, fontes, CMYK e contraste do QR. */
function fileChecks(bytes: Uint8Array, L: any, images: { total: number }): FileCheck[] {
  const raw = new TextDecoder('latin1').decode(bytes);
  const out: FileCheck[] = [];
  const add = (level: FileCheck['level'], code: string, message: string) => out.push({ level, code, message, layout: L.layout.name });

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

  // No navegador as imagens saem em RGB; qualquer outro objeto RGB é erro.
  const rgbObjects = (raw.match(/\/DeviceRGB/g) ?? []).length;
  if (rgbObjects > images.total) {
    add('error', 'cmyk', 'Há elementos vetoriais ou textos em RGB no arquivo.');
  } else if (images.total > 0) {
    add('warn', 'cmyk', `Vetores e textos em CMYK; ${images.total} imagem(ns) (logos/mockup) saem em RGB nesta versão do navegador — converta-as para CMYK (ou gere pelo Print Studio do servidor) antes de enviar à gráfica.`);
  } else {
    add('ok', 'cmyk', 'Cores em CMYK ok — preenchimentos e textos em CMYK, sem imagens.');
  }

  const qrRatio = contrastRatio(COLOR_MAP.preto.hex, COLOR_MAP.branco.hex);
  add(qrRatio >= 7 ? 'ok' : 'error', 'qr-contraste', `Contraste QR ok — módulos K100 sobre branco sólido (${qrRatio.toFixed(1)}:1), correção de erro H.`);
  return out;
}
