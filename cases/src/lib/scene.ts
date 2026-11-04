// Cena: lista de elementos posicionados (retângulos, textos já quebrados em linhas,
// imagens, gráficos) que alimenta a prévia em HTML, o PDF (pdfkit) e o .pptx.
// A quebra de linha usa a medição das mesmas fontes embutidas no PDF, então a
// prévia, o PDF e o aviso de "não coube" concordam.

export type FontKey = 'display-bold' | 'display-semibold' | 'body-regular' | 'body-semibold';

/** Largura do texto em pt, no tamanho `size` (pt). */
export type Measure = (text: string, font: FontKey, size: number) => number;

export type Align = 'left' | 'center' | 'right';

export type RectItem = { type: 'rect'; x: number; y: number; w: number; h: number; fill: string; radius?: number };
export type TextItem = {
  type: 'text';
  x: number;
  y: number;
  w: number;
  /** Linhas já quebradas (a prévia e o PDF desenham exatamente estas). */
  lines: string[];
  /** Texto original (o .pptx leva o parágrafo inteiro, editável). */
  text: string;
  font: FontKey;
  /** Tamanho em pt. */
  size: number;
  /** Altura de linha na unidade da cena. */
  lineHeight: number;
  color: string;
  align?: Align;
  /** Identifica o bloco (avisos e testes). */
  role?: string;
};
export type ImageItem = { type: 'image'; x: number; y: number; w: number; h: number; file: string };
export type ChartItem = {
  type: 'chart';
  x: number;
  y: number;
  w: number;
  h: number;
  categories: string[];
  series: { name: string; color: string; values: number[]; labels: string[] }[];
  /** Cor dos rótulos e eixos. */
  ink: string;
  /** Tamanho (pt) dos rótulos. */
  labelSize: number;
};
export type Item = RectItem | TextItem | ImageItem | ChartItem;

export type Scene = {
  unit: 'mm' | 'px';
  w: number;
  h: number;
  background: string;
  items: Item[];
  /** Avisos de conteúdo (não coube, foi encurtado…). */
  warnings: string[];
  overflow: boolean;
};

/** Conversão de pt para a unidade da cena. */
export const PT_TO = { mm: 25.4 / 72, px: 2 } as const;

/** Quebra um texto em linhas que cabem em `maxW` (unidade da cena). */
export function wrap(text: string, font: FontKey, size: number, maxW: number, measure: Measure, k: number): string[] {
  const width = (s: string) => measure(s, font, size) * k;
  const lines: string[] = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      if (lines.length) lines.push('');
      continue;
    }
    let cur = '';
    for (let w of words) {
      // Palavra maior que a linha: quebra por caracteres
      if (width(w) > maxW) {
        if (cur) lines.push(cur);
        cur = '';
        while (w.length > 1 && width(w) > maxW) {
          let cut = w.length - 1;
          while (cut > 1 && width(w.slice(0, cut)) > maxW) cut--;
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
      }
      const next = cur ? `${cur} ${w}` : w;
      if (width(next) <= maxW || !cur) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export type Fit = { size: number; lines: string[]; lineHeight: number; truncated: boolean };

/**
 * Maior tamanho (de `max` a `min`, em passos de 0,5 pt) em que o texto cabe em
 * `maxLines` linhas de `maxW`. Abaixo do piso de legibilidade (`min`) não diminui:
 * corta com reticências e marca `truncated`.
 */
export function fitText(
  text: string,
  o: { font: FontKey; max: number; min: number; maxW: number; maxLines: number; lh: number; measure: Measure; k: number },
): Fit {
  const t = text.trim();
  for (let size = o.max; size >= o.min - 1e-9; size -= 0.5) {
    const lines = t ? wrap(t, o.font, size, o.maxW, o.measure, o.k) : [];
    if (lines.length <= o.maxLines) return { size, lines, lineHeight: size * o.lh * o.k, truncated: false };
  }
  const size = o.min;
  const all = wrap(t, o.font, size, o.maxW, o.measure, o.k);
  const lines = all.slice(0, Math.max(0, o.maxLines));
  if (lines.length) lines[lines.length - 1] = ellipsize(lines[lines.length - 1]!, o.font, size, o.maxW, o.measure, o.k);
  return { size, lines, lineHeight: size * o.lh * o.k, truncated: true };
}

function ellipsize(line: string, font: FontKey, size: number, maxW: number, measure: Measure, k: number): string {
  let s = line.replace(/[\s.,;:]+$/, '');
  while (s && measure(s + '…', font, size) * k > maxW) s = s.slice(0, -1).replace(/\s+$/, '');
  return s + '…';
}

/** Retângulos das barras de um gráfico (PDF e prévia desenham iguais). */
export function barGeometry(c: ChartItem, k: number) {
  const labelH = c.labelSize * 1.3 * k;
  const top = c.y + labelH + 1 * k;
  const bottom = c.y + c.h - labelH - 2 * k;
  const plotH = Math.max(1, bottom - top);
  const max = Math.max(0, ...c.series.flatMap((s) => s.values));
  const nCat = c.categories.length;
  const nSer = c.series.length;
  const groupW = c.w / Math.max(1, nCat);
  const barW = Math.min((groupW * 0.7) / Math.max(1, nSer), groupW * 0.45);
  const bars: { x: number; y: number; w: number; h: number; color: string; label: string; name: string }[] = [];
  const names: { x: number; text: string }[] = [];
  c.categories.forEach((cat, ci) => {
    const gx = c.x + ci * groupW + (groupW - barW * nSer) / 2;
    c.series.forEach((s, si) => {
      const v = s.values[ci] ?? 0;
      const h = max > 0 ? (Math.max(0, v) / max) * plotH : 0;
      const x = gx + si * barW;
      bars.push({ x, y: bottom - h, w: barW * 0.86, h, color: s.color, label: s.labels[ci] ?? '', name: s.name });
      // Uma categoria só: cada barra leva o nome da série embaixo (Antes / Depois)
      if (nCat === 1) names.push({ x: x + (barW * 0.86) / 2, text: s.name });
    });
    if (nCat > 1) names.push({ x: c.x + ci * groupW + groupW / 2, text: cat });
  });
  return { bars, names, baseline: bottom, labelH, groupW };
}
