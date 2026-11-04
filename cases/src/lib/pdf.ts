// PDF vetorial da one page com pdfkit (no navegador e nos testes em Node).
// Fontes embutidas (Montserrat e Inter, as mesmas da prévia) e logotipo oficial em PNG.
// Cores em RGB (tela e envio); para gráfica, usar o fluxo CMYK do Kit de Boas-Vindas.
import PDFDocument from 'pdfkit';
import { PT_TO, barGeometry, type FontKey, type Measure, type Scene } from './scene.ts';

export type FontBytes = Record<FontKey, Uint8Array>;
/** Logotipo oficial em data URL PNG, por nome de arquivo (brand/logos). */
export type LogoSource = (file: string) => string;

const FONT_KEYS: FontKey[] = ['display-bold', 'display-semibold', 'body-regular', 'body-semibold'];
const MM = 72 / 25.4;

/* eslint-disable @typescript-eslint/no-explicit-any */
function newDoc(fonts: FontBytes, opts: Record<string, unknown>): any {
  const Doc = PDFDocument as any;
  const doc = new Doc({ font: fonts['body-regular'], ...opts });
  for (const k of FONT_KEYS) doc.registerFont(k, fonts[k]);
  return doc;
}

/** Medição de texto com as mesmas fontes do PDF (largura em pt). */
export function makeMeasure(fonts: FontBytes): Measure {
  const doc = newDoc(fonts, { autoFirstPage: false });
  const cache = new Map<string, number>();
  return (text, font, size) => {
    const key = `${font}|${size}|${text}`;
    let w = cache.get(key);
    if (w == null) {
      w = doc.font(font).fontSize(size).widthOfString(text) as number;
      cache.set(key, w);
    }
    return w;
  };
}

/** Desenha a cena (em mm) numa página do tamanho exato e devolve os bytes do PDF. */
export async function renderPdf(scene: Scene, fonts: FontBytes, logo: LogoSource, info: { title: string }): Promise<Uint8Array> {
  if (scene.unit !== 'mm') throw new Error('renderPdf espera uma cena em mm');
  const doc = newDoc(fonts, {
    size: [scene.w * MM, scene.h * MM],
    margin: 0,
    pdfVersion: '1.4',
    info: { Title: info.title, Creator: 'Gove Gerador de cases', Producer: 'Gove Digital' },
  });
  const chunks: Uint8Array[] = [];
  doc.on('data', (c: Uint8Array) => chunks.push(c));
  const done = new Promise<void>((res) => doc.on('end', () => res()));

  const p = (mm: number) => mm * MM;
  doc.rect(0, 0, p(scene.w), p(scene.h)).fill(scene.background);

  const drawLine = (s: string, font: FontKey, size: number, color: string, x: number, top: number, w: number, lh: number, align: string) => {
    doc.font(font).fontSize(size).fillColor(color);
    const f = doc._font;
    const contentH = ((f.ascender - f.descender) / 1000) * size;
    const y = p(top) + (p(lh) - contentH) / 2;
    const tw = doc.widthOfString(s);
    const x0 = align === 'right' ? p(x + w) - tw : align === 'center' ? p(x) + (p(w) - tw) / 2 : p(x);
    doc.text(s, x0, y, { lineBreak: false });
  };

  for (const it of scene.items) {
    if (it.type === 'rect') {
      if (it.radius) doc.roundedRect(p(it.x), p(it.y), p(it.w), p(it.h), p(it.radius)).fill(it.fill);
      else doc.rect(p(it.x), p(it.y), p(it.w), p(it.h)).fill(it.fill);
    } else if (it.type === 'text') {
      it.lines.forEach((line, i) => drawLine(line, it.font, it.size, it.color, it.x, it.y + i * it.lineHeight, it.w, it.lineHeight, it.align ?? 'left'));
    } else if (it.type === 'image') {
      doc.image(logo(it.file), p(it.x), p(it.y), { width: p(it.w), height: p(it.h) });
    } else if (it.type === 'chart') {
      const g = barGeometry(it, PT_TO.mm);
      for (const b of g.bars) {
        if (b.h > 0) doc.rect(p(b.x), p(b.y), p(b.w), p(b.h)).fill(b.color);
        drawLine(b.label, 'body-semibold', it.labelSize, it.ink, b.x - 10, b.y - g.labelH - 0.5, b.w + 20, g.labelH, 'center');
      }
      doc.rect(p(it.x), p(g.baseline), p(it.w), 0.6).fill(it.ink);
      for (const n of g.names) drawLine(n.text, 'body-regular', it.labelSize, it.ink, n.x - 25, g.baseline + 1, 50, g.labelH, 'center');
    }
  }
  doc.end();
  await done;
  const size = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
