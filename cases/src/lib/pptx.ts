// .pptx editável (pptxgenjs, MIT): 16:9 em 13,333 × 7,5 pol (1920 × 1080 px a 144 px/pol).
// Caixas de texto editáveis com as fontes da marca pelo nome — Montserrat (títulos) e
// Inter (corpo). O .pptx não embute fontes: sem elas instaladas, o PowerPoint troca pela
// fonte padrão (a skill pede reserva Helvetica, depois Arial). Gráfico nativo e editável.
import PptxGenJS from 'pptxgenjs';
import { SLIDE, type Slide } from './slides.ts';
import type { FontKey, Scene } from './scene.ts';

/** Fonte pelo nome no PowerPoint (pesos estáticos como famílias próprias). */
export const PPTX_FONTS: Record<FontKey, { face: string; bold: boolean }> = {
  'display-bold': { face: 'Montserrat', bold: true },
  'display-semibold': { face: 'Montserrat SemiBold', bold: false },
  'body-regular': { face: 'Inter', bold: false },
  'body-semibold': { face: 'Inter SemiBold', bold: false },
};

const inch = (px: number) => px / SLIDE.pxPerIn;
const hex = (c: string) => c.replace('#', '').toUpperCase();

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Retângulos, textos e logotipos da cena (o gráfico entra como gráfico nativo). */
function paint(pptx: any, s: any, scene: Scene, logo: (file: string) => string) {
  s.background = { color: hex(scene.background) };
  for (const it of scene.items) {
    if (it.type === 'rect') {
      s.addShape(it.radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
        x: inch(it.x),
        y: inch(it.y),
        w: inch(it.w),
        h: inch(it.h),
        fill: { color: hex(it.fill) },
        line: { type: 'none' },
        ...(it.radius ? { rectRadius: inch(it.radius) } : {}),
      });
    } else if (it.type === 'text') {
      const f = PPTX_FONTS[it.font];
      const h = it.lines.length * it.lineHeight;
      s.addText(it.text, {
        x: inch(it.x),
        y: inch(it.y),
        // Pequena folga: a métrica do PowerPoint difere um pouco da medição do app
        w: inch(Math.min(it.w * 1.04 + 4, SLIDE.w - it.x)),
        h: inch(h + 6),
        margin: 0,
        fontFace: f.face,
        bold: f.bold,
        fontSize: it.size,
        color: hex(it.color),
        align: it.align ?? 'left',
        valign: 'top',
        lineSpacing: it.lineHeight / 2,
        fit: 'none',
        wrap: true,
        paraSpaceBefore: 0,
        paraSpaceAfter: 0,
      });
    } else if (it.type === 'image') {
      s.addImage({ data: logo(it.file).replace(/^data:/, ''), x: inch(it.x), y: inch(it.y), w: inch(it.w), h: inch(it.h), altText: 'Gove' });
    }
  }
}

export type PptxInfo = { title: string; subject?: string };

/** Gera o .pptx dos slides visíveis. */
export async function renderPptx(slides: Slide[], logo: (file: string) => string, info: PptxInfo): Promise<Uint8Array> {
  const Pptx = PptxGenJS as any;
  const pptx = new Pptx();
  pptx.layout = 'LAYOUT_WIDE'; // 13,333 × 7,5 pol
  pptx.author = 'Gove Digital';
  pptx.company = 'Gove Digital';
  pptx.title = info.title;
  if (info.subject) pptx.subject = info.subject;
  pptx.theme = { headFontFace: 'Montserrat', bodyFontFace: 'Inter' };
  for (const sl of slides) {
    if (sl.hidden) continue;
    const s = pptx.addSlide();
    paint(pptx, s, sl.scene, logo);
    if (sl.chart) {
      const ch = sl.chart;
      const it = ch.item;
      s.addChart(pptx.ChartType.bar, ch.series, {
        x: inch(it.x),
        y: inch(it.y),
        w: inch(it.w),
        h: inch(it.h),
        barDir: ch.dir,
        barGrouping: 'clustered',
        barGapWidthPct: 60,
        chartColors: ch.colors.map(hex),
        showValue: true,
        dataLabelPosition: 'outEnd',
        dataLabelFormatCode: ch.formatCode,
        dataLabelColor: hex(it.ink),
        dataLabelFontFace: 'Inter',
        dataLabelFontSize: it.labelSize,
        catAxisLabelColor: hex(it.ink),
        catAxisLabelFontFace: 'Inter',
        catAxisLabelFontSize: 18,
        catAxisLineShow: true,
        catAxisLineColor: hex(it.ink),
        valAxisHidden: true,
        valGridLine: { style: 'none' },
        showLegend: ch.series.length > 1,
        legendPos: 'b',
        legendFontFace: 'Inter',
        legendFontSize: 18,
        legendColor: hex(it.ink),
      });
    }
  }
  const out = await pptx.write({ outputType: 'uint8array' });
  return out as Uint8Array;
}
