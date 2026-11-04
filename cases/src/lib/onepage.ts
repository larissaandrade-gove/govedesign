// One page A4 do case: 210 × 297 mm, cena em mm (fontes em pt).
// Encaixe: tenta níveis de tamanho cada vez menores (sem passar dos pisos de
// legibilidade — nada abaixo de 11 pt, como pede a skill para documentos) e, se
// ainda assim não couber, encurta os textos longos com reticências e avisa.
import { LOGOS, pickLogo } from '../../../brand/logos.js';
import { municipioLabel, type CaseData } from '../data/case.ts';
import { INDICATORS, formatPct, formatPeriodo, formatValue, hasComparison, hasData, mainValue, type IndicatorDef } from '../data/indicators.ts';
import { PALETTE } from '../data/palette.ts';
import { PT_TO, fitText, type ChartItem, type FontKey, type Item, type Measure, type Scene } from './scene.ts';

export const A4 = { w: 210, h: 297, margin: 14 } as const;

/** Cores da one page (todas da paleta institucional). */
export const ONEPAGE_COLORS = {
  page: PALETTE.brancoPuro,
  header: PALETTE.noite,
  headerText: PALETTE.branco,
  eyebrow: PALETTE.amarelo,
  title: PALETTE.noite,
  body: PALETTE.grafite,
  heading: PALETTE.roxo,
  tile: PALETTE.branco,
  kpi: PALETTE.roxo,
  before: PALETTE.lavanda,
  after: PALETTE.roxo,
  track: PALETTE.branco,
  accent: PALETTE.amarelo,
  cta: PALETTE.roxo,
  ctaText: PALETTE.branco,
} as const;

/** Piso de legibilidade (pt). */
export const MIN_PT = 11;

const K = PT_TO.mm;
const C = ONEPAGE_COLORS;
const CW = A4.w - 2 * A4.margin;
const CTA_H = 26;

type Level = { title: [number, number]; resumo: [number, number]; kpi: [number, number]; body: [number, number]; gap: number; lh: number };
const LEVELS: Level[] = [
  { title: [24, 19], resumo: [12.5, 12], kpi: [20, 13], body: [12, 11.5], gap: 7, lh: 1.38 },
  { title: [21, 17], resumo: [12, 11.5], kpi: [18, 13], body: [11.5, 11], gap: 6, lh: 1.32 },
  { title: [19, 16], resumo: [11.5, 11], kpi: [17, 13], body: [11, 11], gap: 5, lh: 1.28 },
  { title: [17, 16], resumo: [11, 11], kpi: [16, 12], body: [11, 11], gap: 4, lh: 1.24 },
];

const KPI_EXCLUDE = new Set(['avaliacao_media', 'avaliacao_positiva']);

/** Indicadores numéricos que viram KPI (até 6). */
export function kpiList(c: CaseData): { def: IndicatorDef; value: string }[] {
  return INDICATORS.filter((d) => d.unit !== 'lista' && !KPI_EXCLUDE.has(d.id) && hasData(d, c.values[d.id]))
    .slice(0, 6)
    .map((d) => ({ def: d, value: formatValue(d, mainValue(d, c.values[d.id])!, c.notaMax) }));
}

/** Primeiro indicador com antes e depois (gráfico de comparação). */
export function comparisonOf(c: CaseData) {
  const def = INDICATORS.find((d) => hasComparison(d, c.values[d.id]));
  if (!def) return null;
  const v = c.values[def.id];
  return { def, before: v.before!, after: v.after! };
}

/** Indicadores em % para as barras horizontais (quando não há antes/depois). */
export function pctBars(c: CaseData) {
  return INDICATORS.filter((d) => d.unit === 'pct' && hasData(d, c.values[d.id])).map((d) => ({ def: d, value: mainValue(d, c.values[d.id])! }));
}

export const funcionalidadesOf = (c: CaseData) => (c.values.funcionalidades?.enabled ? (c.values.funcionalidades.items ?? []).map((s) => s.trim()).filter(Boolean) : []);

export function avaliacaoOf(c: CaseData) {
  const media = INDICATORS.find((d) => d.id === 'avaliacao_media')!;
  const pos = INDICATORS.find((d) => d.id === 'avaliacao_positiva')!;
  const m = hasData(media, c.values.avaliacao_media) ? mainValue(media, c.values.avaliacao_media) : null;
  const p = hasData(pos, c.values.avaliacao_positiva) ? mainValue(pos, c.values.avaliacao_positiva) : null;
  return m == null && p == null ? null : { media: m, positiva: p };
}

type Ctx = { measure: Measure; items: Item[]; warn: Set<string> };

function text(ctx: Ctx, role: string, s: string, o: { x: number; y: number; w: number; font: FontKey; max: number; min?: number; maxLines: number; lh: number; color: string; align?: 'left' | 'center' | 'right' }) {
  const fit = fitText(s, { font: o.font, max: o.max, min: Math.max(o.min ?? o.max, 0), maxW: o.w, maxLines: o.maxLines, lh: o.lh, measure: ctx.measure, k: K });
  if (fit.truncated) ctx.warn.add(role);
  if (fit.lines.length)
    ctx.items.push({ type: 'text', role, x: o.x, y: o.y, w: o.w, lines: fit.lines, text: s.trim(), font: o.font, size: fit.size, lineHeight: fit.lineHeight, color: o.color, align: o.align ?? 'left' });
  return fit.lines.length * fit.lineHeight;
}

const ROLE_LABEL: Record<string, string> = {
  municipio: 'Nome do município',
  titulo: 'Título',
  resumo: 'Resumo',
  desafio: 'Desafio',
  solucao: 'Solução',
  resultado: 'Resultado',
  destaques: 'Destaques',
  kpi: 'Rótulo de um indicador',
  funcionalidades: 'Funcionalidades',
  cta: 'Chamada final',
  contato: 'Contato',
};

function layout(c: CaseData, measure: Measure, L: Level, bodyLines: number, resumoLines: number) {
  const ctx: Ctx = { measure, items: [], warn: new Set() };
  const M = A4.margin;
  const items = ctx.items;
  const periodo = formatPeriodo(c.periodo.inicio, c.periodo.fim);

  /* Cabeçalho (Noite) com município e logotipo pela regra de contraste */
  const HEADER_H = 46;
  items.push({ type: 'rect', x: 0, y: 0, w: A4.w, h: HEADER_H, fill: C.header });
  const logo = pickLogo(C.header, 'logotipo');
  const logoH = 10;
  const logoW = logoH * LOGOS.logotipo.aspect;
  items.push({ type: 'image', x: A4.w - M - logoW, y: 13, w: logoW, h: logoH, file: logo.file });
  let y = 12;
  y += text(ctx, 'eyebrow', 'CASE DE SUCESSO', { x: M, y, w: CW - logoW - 8, font: 'body-semibold', max: 11, maxLines: 1, lh: 1.3, color: C.eyebrow }) + 1.5;
  y += text(ctx, 'municipio', municipioLabel(c) || 'Município', { x: M, y, w: CW - logoW - 8, font: 'display-bold', max: 26, min: 18, maxLines: 1, lh: 1.15, color: C.headerText }) + 1;
  if (periodo) text(ctx, 'periodo', `Resultados de ${periodo}`, { x: M, y, w: CW, font: 'body-regular', max: 12, min: 11, maxLines: 1, lh: 1.3, color: C.headerText });

  y = HEADER_H + 8;
  const t = c.textos;
  if (t.titulo.trim()) y += text(ctx, 'titulo', t.titulo, { x: M, y, w: CW, font: 'display-bold', max: L.title[0], min: L.title[1], maxLines: 2, lh: 1.18, color: C.title }) + 3;
  if (t.resumo.trim()) y += text(ctx, 'resumo', t.resumo, { x: M, y, w: CW, font: 'body-regular', max: L.resumo[0], min: Math.max(MIN_PT, L.resumo[1]), maxLines: resumoLines, lh: L.lh, color: C.body });
  y += L.gap;

  /* KPIs: até 4 numa linha; 5 ou 6 em duas linhas de 3 */
  const kpis = kpiList(c);
  if (kpis.length) {
    const perRow = kpis.length <= 4 ? kpis.length : 3;
    const gap = 4;
    const tw = (CW - gap * (perRow - 1)) / perRow;
    const rows = Math.ceil(kpis.length / perRow);
    for (let r = 0; r < rows; r++) {
      const row = kpis.slice(r * perRow, r * perRow + perRow);
      // Altura comum da linha: maior rótulo
      const pad = 4;
      const fits = row.map((k) => ({
        v: fitText(k.value, { font: 'display-bold', max: L.kpi[0], min: L.kpi[1], maxW: tw - 2 * pad, maxLines: 1, lh: 1.1, measure, k: K }),
        l: fitText(k.def.short, { font: 'body-regular', max: MIN_PT, min: MIN_PT, maxW: tw - 2 * pad, maxLines: 2, lh: 1.25, measure, k: K }),
      }));
      const vSize = Math.min(...fits.map((f) => f.v.size));
      const vH = vSize * 1.1 * K;
      const lH = Math.max(...fits.map((f) => f.l.lines.length * f.l.lineHeight));
      const h = pad + vH + 1.5 + lH + pad;
      row.forEach((k, i) => {
        const x = M + i * (tw + gap);
        items.push({ type: 'rect', x, y, w: tw, h, fill: C.tile, radius: 3 });
        const vf = fitText(k.value, { font: 'display-bold', max: vSize, min: vSize, maxW: tw - 2 * pad, maxLines: 1, lh: 1.1, measure, k: K });
        if (vf.truncated) ctx.warn.add('kpi');
        items.push({ type: 'text', role: 'kpi-valor', x: x + pad, y: y + pad, w: tw - 2 * pad, lines: vf.lines, text: k.value, font: 'display-bold', size: vSize, lineHeight: vH, color: C.kpi });
        const lf = fits[i]!.l;
        if (lf.truncated) ctx.warn.add('kpi');
        items.push({ type: 'text', role: 'kpi', x: x + pad, y: y + pad + vH + 1.5, w: tw - 2 * pad, lines: lf.lines, text: k.def.short, font: 'body-regular', size: lf.size, lineHeight: lf.lineHeight, color: C.body });
      });
      y += h + (r < rows - 1 ? gap : 0);
    }
    y += L.gap;
  }

  /* Desafio → Solução → Resultado (as colunas presentes dividem a largura) */
  const dsr = (
    [
      ['desafio', 'Desafio', t.desafio],
      ['solucao', 'Solução', t.solucao],
      ['resultado', 'Resultado', t.resultado],
    ] as const
  ).filter(([, , s]) => s.trim());
  if (dsr.length) {
    const gap = 6;
    const colW = (CW - gap * (dsr.length - 1)) / dsr.length;
    let maxH = 0;
    dsr.forEach(([role, label, s], i) => {
      const x = M + i * (colW + gap);
      items.push({ type: 'rect', x, y, w: 10, h: 1.2, fill: C.accent });
      let yy = y + 3.5;
      yy += text(ctx, `${role}-titulo`, label, { x, y: yy, w: colW, font: 'display-semibold', max: 13, maxLines: 1, lh: 1.25, color: C.heading }) + 1.2;
      yy += text(ctx, role, s, { x, y: yy, w: colW, font: 'body-regular', max: L.body[0], min: Math.max(MIN_PT, L.body[1]), maxLines: bodyLines, lh: L.lh, color: C.body });
      maxH = Math.max(maxH, yy - y);
    });
    y += maxH + L.gap;
  }

  /* Gráfico | avaliação + funcionalidades */
  const cmp = comparisonOf(c);
  const bars = cmp ? [] : pctBars(c);
  const aval = avaliacaoOf(c);
  const funcs = funcionalidadesOf(c);
  const hasChart = !!cmp || bars.length > 0;
  const hasSide = !!aval || funcs.length > 0;
  if (hasChart || hasSide) {
    const gap = 8;
    const chartW = hasSide ? 86 : CW;
    const sideX = hasChart ? M + chartW + gap : M;
    const sideW = hasChart ? CW - chartW - gap : CW;
    let chartH = 0;
    if (hasChart) {
      let yy = y;
      const title = cmp ? `${cmp.def.label}: antes e depois` : 'Indicadores em percentual';
      yy += text(ctx, 'grafico-titulo', title, { x: M, y: yy, w: chartW, font: 'display-semibold', max: 13, min: MIN_PT, maxLines: 2, lh: 1.25, color: C.heading }) + 2;
      if (cmp) {
        const chart: ChartItem = {
          type: 'chart',
          x: M,
          y: yy,
          w: chartW,
          h: 50,
          categories: [cmp.def.label],
          series: [
            { name: 'Antes', color: C.before, values: [cmp.before], labels: [formatValue(cmp.def, cmp.before, c.notaMax)] },
            { name: 'Depois', color: C.after, values: [cmp.after], labels: [formatValue(cmp.def, cmp.after, c.notaMax)] },
          ],
          ink: C.body,
          labelSize: MIN_PT,
        };
        items.push(chart);
        yy += chart.h;
      } else {
        for (const b of bars.slice(0, 4)) {
          const val = formatPct(b.value);
          const valW = measure(val, 'body-semibold', MIN_PT) * K;
          yy += text(ctx, 'grafico-rotulo', b.def.chartLabel ?? b.def.label, { x: M, y: yy, w: chartW - valW - 3, font: 'body-regular', max: MIN_PT, maxLines: 2, lh: 1.25, color: C.body });
          items.push({ type: 'text', role: 'grafico-valor', x: M + chartW - valW, y: yy - MIN_PT * 1.25 * K, w: valW, lines: [val], text: val, font: 'body-semibold', size: MIN_PT, lineHeight: MIN_PT * 1.25 * K, color: C.kpi, align: 'right' });
          items.push({ type: 'rect', x: M, y: yy + 1, w: chartW, h: 4, fill: C.track, radius: 2 });
          items.push({ type: 'rect', x: M, y: yy + 1, w: Math.max(1, (chartW * Math.min(100, Math.max(0, b.value))) / 100), h: 4, fill: C.after, radius: 2 });
          yy += 9;
        }
      }
      chartH = yy - y;
    }
    let yy = y;
    if (aval) {
      yy += text(ctx, 'avaliacao-titulo', 'Avaliação dos munícipes', { x: sideX, y: yy, w: sideW, font: 'display-semibold', max: 13, maxLines: 1, lh: 1.25, color: C.heading }) + 1.5;
      if (aval.media != null) {
        const nota = formatValue(INDICATORS.find((d) => d.id === 'avaliacao_media')!, aval.media);
        const nW = measure(nota, 'display-bold', 28) * K;
        items.push({ type: 'text', role: 'avaliacao-nota', x: sideX, y: yy, w: nW + 1, lines: [nota], text: nota, font: 'display-bold', size: 28, lineHeight: 28 * 1.1 * K, color: C.title });
        text(ctx, 'avaliacao-escala', `de ${c.notaMax} na avaliação média`, { x: sideX + nW + 3, y: yy + 28 * 1.1 * K - 12 * 1.3 * K - 1.2, w: sideW - nW - 3, font: 'body-regular', max: 12, min: MIN_PT, maxLines: 1, lh: 1.3, color: C.body });
        yy += 28 * 1.1 * K + 1;
      }
      if (aval.positiva != null) yy += text(ctx, 'avaliacao-positiva', `${formatPct(aval.positiva)} de avaliações positivas`, { x: sideX, y: yy, w: sideW, font: 'body-semibold', max: 12, min: MIN_PT, maxLines: 2, lh: 1.3, color: C.body });
      yy += 5;
    }
    if (funcs.length) {
      yy += text(ctx, 'funcionalidades-titulo', 'Funcionalidades usadas', { x: sideX, y: yy, w: sideW, font: 'display-semibold', max: 13, maxLines: 1, lh: 1.25, color: C.heading }) + 2;
      const chipH = 7;
      const padX = 2.5;
      let cx = sideX;
      let row = 0;
      const maxRows = 4;
      let shown = 0;
      for (const f of funcs) {
        const fit = fitText(f, { font: 'body-semibold', max: MIN_PT, min: MIN_PT, maxW: sideW - 2 * padX, maxLines: 1, lh: 1.2, measure, k: K });
        const w = measure(fit.lines[0] ?? '', 'body-semibold', MIN_PT) * K + 2 * padX;
        if (cx > sideX && cx + w > sideX + sideW) {
          row += 1;
          cx = sideX;
        }
        if (row >= maxRows) break;
        if (fit.truncated) ctx.warn.add('funcionalidades');
        const cy = yy + row * (chipH + 2);
        items.push({ type: 'rect', x: cx, y: cy, w, h: chipH, fill: C.tile, radius: 2 });
        items.push({ type: 'text', role: 'funcionalidade', x: cx + padX, y: cy + (chipH - MIN_PT * 1.2 * K) / 2, w: w - 2 * padX, lines: fit.lines, text: f, font: 'body-semibold', size: MIN_PT, lineHeight: MIN_PT * 1.2 * K, color: C.kpi });
        cx += w + 2;
        shown += 1;
      }
      if (shown < funcs.length) ctx.warn.add('funcionalidades');
      yy += (row + 1) * (chipH + 2);
    }
    y += Math.max(chartH, yy - y) + L.gap;
  }

  /* Destaques */
  const dest = t.destaques.map((s) => s.trim()).filter(Boolean);
  for (const d of dest) {
    const x = M + 4;
    const h = text(ctx, 'destaques', d, { x, y, w: CW - 4, font: 'body-semibold', max: 12, min: MIN_PT, maxLines: 2, lh: 1.3, color: C.title });
    items.push({ type: 'rect', x: M, y: y + 0.6, w: 1.2, h: Math.max(3, h - 1.2), fill: C.accent });
    y += h + 2.5;
  }

  /* Chamada final (faixa Roxo) */
  const ctaY = A4.h - CTA_H;
  items.push({ type: 'rect', x: 0, y: ctaY, w: A4.w, h: CTA_H, fill: C.cta });
  let cy = ctaY + 6;
  cy += text(ctx, 'cta', c.contato.cta || 'Leve o Gove para o seu município', { x: M, y: cy, w: CW, font: 'display-bold', max: 16, min: 13, maxLines: 1, lh: 1.2, color: C.ctaText }) + 1.5;
  const contato = [c.contato.nome, c.contato.email, c.contato.site].map((s) => s.trim()).filter(Boolean).join('  ·  ');
  if (contato) text(ctx, 'contato', contato, { x: M, y: cy, w: CW, font: 'body-regular', max: 12, min: MIN_PT, maxLines: 1, lh: 1.3, color: C.ctaText });

  return { items, bottom: y - L.gap, limit: ctaY - 6, warn: ctx.warn };
}

/** Monta a one page; mede com as fontes do PDF. */
export function buildOnePage(c: CaseData, measure: Measure): Scene {
  let res = layout(c, measure, LEVELS[0]!, 14, 4);
  for (const L of LEVELS.slice(1)) {
    if (res.bottom <= res.limit) break;
    res = layout(c, measure, L, 14, 4);
  }
  // Ainda não coube no menor nível: encurta o resumo e os blocos de texto, com aviso
  const last = LEVELS[LEVELS.length - 1]!;
  let bodyLines = 14;
  let resumoLines = 4;
  while (res.bottom > res.limit && bodyLines > 3) {
    bodyLines -= 1;
    if (bodyLines < 8 && resumoLines > 2) resumoLines -= 1;
    res = layout(c, measure, last, bodyLines, resumoLines);
  }
  const warnings = [...res.warn].filter((r) => ROLE_LABEL[r]).map((r) => `${ROLE_LABEL[r]}: texto longo demais, encurtado na página.`);
  const overflow = res.bottom > res.limit;
  if (overflow) warnings.unshift('O conteúdo não cabe na página A4. Desmarque indicadores ou encurte os textos.');
  return { unit: 'mm', w: A4.w, h: A4.h, background: C.page, items: res.items, warnings, overflow: overflow || res.warn.size > 0 };
}
