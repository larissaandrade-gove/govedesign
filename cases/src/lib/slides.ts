// Apresentação 16:9 em 1920 × 1080 px (13,333 × 7,5 pol no .pptx): cenas em px
// (1 pt = 2 px), as mesmas para a prévia e para o arquivo. Slides sem dados ficam ocultos.
// Regras do "Prompt de apresentações" do Design System: margem de 96 px, título
// 40–48 pt em Montserrat, corpo 18–24 pt em Inter, nada abaixo de 14 pt (12 pt no rodapé),
// logotipo pequeno no rodapé dos slides de conteúdo e número da página em Inter 12 pt Cinza técnico.
import { LOGOS, pickLogo } from '../../../brand/logos.js';
import { municipioLabel, type CaseData } from '../data/case.ts';
import { INDICATORS, formatPct, formatPeriodo, formatValue } from '../data/indicators.ts';
import { PALETTE } from '../data/palette.ts';
import { avaliacaoOf, comparisonOf, funcionalidadesOf, kpiList, pctBars } from './onepage.ts';
import { PT_TO, fitText, type ChartItem, type FontKey, type Item, type Measure, type Scene } from './scene.ts';

export const SLIDE = { w: 1920, h: 1080, wIn: 13.333, hIn: 7.5, margin: 96, pxPerIn: 144 } as const;

/** Cores dos slides (todas da paleta institucional). */
export const SLIDE_COLORS = {
  cover: PALETTE.noite,
  content: PALETTE.branco,
  panel: PALETTE.brancoPuro,
  cta: PALETTE.roxo,
  onDark: PALETTE.branco,
  eyebrowDark: PALETTE.amarelo,
  title: PALETTE.noite,
  body: PALETTE.grafite,
  highlight: PALETTE.roxo,
  pageNumber: PALETTE.cinza,
  accent: PALETTE.amarelo,
  chartBefore: PALETTE.lavanda,
  chartAfter: PALETTE.roxo,
} as const;

export const MIN_SLIDE_PT = 14;

export type SlideKind = 'capa' | 'contexto' | 'desafio' | 'solucao' | 'resultados' | 'grafico' | 'avaliacao' | 'cta';
export const SLIDE_LABELS: Record<SlideKind, string> = {
  capa: 'Capa',
  contexto: 'Contexto do município',
  desafio: 'Desafio',
  solucao: 'Solução e funcionalidades',
  resultados: 'Resultados',
  grafico: 'Gráfico',
  avaliacao: 'Avaliação',
  cta: 'Próximos passos',
};

/** Gráfico nativo do .pptx (editável no PowerPoint). */
export type NativeChart = {
  dir: 'col' | 'bar';
  series: { name: string; labels: string[]; values: number[] }[];
  colors: string[];
  formatCode: string;
  item: ChartItem;
};

export type Slide = { kind: SlideKind; hidden: boolean; scene: Scene; chart?: NativeChart; notes?: string };

const K = PT_TO.px;
const M = SLIDE.margin;
const CW = SLIDE.w - 2 * M;
const C = SLIDE_COLORS;

type Ctx = { measure: Measure; items: Item[]; warn: string[] };

function text(ctx: Ctx, role: string, s: string, o: { x: number; y: number; w: number; font: FontKey; max: number; min?: number; maxLines: number; lh: number; color: string; align?: 'left' | 'center' | 'right' }) {
  if (!s.trim()) return 0;
  const fit = fitText(s, { font: o.font, max: o.max, min: o.min ?? o.max, maxW: o.w, maxLines: o.maxLines, lh: o.lh, measure: ctx.measure, k: K });
  if (fit.truncated) ctx.warn.push(role);
  ctx.items.push({ type: 'text', role, x: o.x, y: o.y, w: o.w, lines: fit.lines, text: fit.truncated ? fit.lines.join(' ') : s.trim(), font: o.font, size: fit.size, lineHeight: fit.lineHeight, color: o.color, align: o.align ?? 'left' });
  return fit.lines.length * fit.lineHeight;
}

function scene(bg: string, ctx: Ctx): Scene {
  return { unit: 'px', w: SLIDE.w, h: SLIDE.h, background: bg, items: ctx.items, warnings: ctx.warn, overflow: ctx.warn.length > 0 };
}

/** Rodapé dos slides de conteúdo: logotipo pela regra de contraste e número da página. */
function footer(ctx: Ctx, bg: string, page: number) {
  const logo = pickLogo(bg, 'logotipo');
  const h = 40;
  const w = h * LOGOS.logotipo.aspect;
  ctx.items.push({ type: 'image', x: SLIDE.w - M - w, y: SLIDE.h - 48 - h, w, h, file: logo.file });
  text(ctx, 'pagina', String(page), { x: M, y: SLIDE.h - 48 - 30, w: 200, font: 'body-regular', max: 12, maxLines: 1, lh: 1.25, color: C.pageNumber });
}

function contentSlide(measure: Measure, title: string, page: number, body: (ctx: Ctx, top: number) => void): Scene {
  const ctx: Ctx = { measure, items: [], warn: [] };
  ctx.items.push({ type: 'rect', x: M, y: M - 8, w: 64, h: 8, fill: C.accent });
  const h = text(ctx, 'titulo', title, { x: M, y: M + 16, w: CW, font: 'display-bold', max: 44, min: 40, maxLines: 1, lh: 1.15, color: C.title });
  body(ctx, M + 16 + h + 40);
  footer(ctx, C.content, page);
  return scene(C.content, ctx);
}

const BODY = { font: 'body-regular' as const, max: 24, min: 18, lh: 1.4 };
const bottomLimit = SLIDE.h - 140;

export function buildSlides(c: CaseData, measure: Measure): Slide[] {
  const t = c.textos;
  const periodo = formatPeriodo(c.periodo.inicio, c.periodo.fim);
  const kpis = kpiList(c);
  const cmp = comparisonOf(c);
  const bars = pctBars(c);
  const aval = avaliacaoOf(c);
  const funcs = funcionalidadesOf(c);
  const dest = t.destaques.map((s) => s.trim()).filter(Boolean);
  const nome = municipioLabel(c) || 'Município';

  const plan: { kind: SlideKind; show: boolean }[] = [
    { kind: 'capa', show: true },
    { kind: 'contexto', show: !!(c.contexto.trim() || t.resumo.trim()) },
    { kind: 'desafio', show: !!t.desafio.trim() },
    { kind: 'solucao', show: !!(t.solucao.trim() || funcs.length) },
    { kind: 'resultados', show: kpis.length > 0 || !!t.resultado.trim() },
    { kind: 'grafico', show: !!cmp || bars.length > 0 },
    { kind: 'avaliacao', show: !!aval || dest.length > 0 },
    { kind: 'cta', show: true },
  ];
  let page = 0;
  return plan.map(({ kind, show }) => {
    if (show) page += 1;
    const n = page;
    const make = (): Omit<Slide, 'kind' | 'hidden'> => {
      switch (kind) {
        case 'capa': {
          const ctx: Ctx = { measure, items: [], warn: [] };
          let y = 300;
          y += text(ctx, 'eyebrow', 'CASE DE SUCESSO', { x: M, y, w: CW, font: 'body-semibold', max: 20, maxLines: 1, lh: 1.3, color: C.eyebrowDark }) + 24;
          y += text(ctx, 'municipio', nome, { x: M, y, w: CW, font: 'display-bold', max: 48, min: 40, maxLines: 2, lh: 1.12, color: C.onDark }) + 28;
          y += text(ctx, 'subtitulo', t.titulo, { x: M, y, w: CW * 0.8, font: 'body-regular', max: 28, min: 24, maxLines: 3, lh: 1.3, color: C.onDark }) + 20;
          if (periodo) text(ctx, 'periodo', `Resultados de ${periodo}`, { x: M, y, w: CW, font: 'body-regular', max: 20, maxLines: 1, lh: 1.3, color: C.onDark });
          const logo = pickLogo(C.cover, 'logotipo');
          const lh = 64;
          ctx.items.push({ type: 'image', x: M, y: SLIDE.h - M - lh, w: lh * LOGOS.logotipo.aspect, h: lh, file: logo.file });
          return { scene: scene(C.cover, ctx) };
        }
        case 'contexto':
          return {
            scene: contentSlide(measure, 'Contexto do município', n, (ctx, top) => {
              let y = top;
              if (t.resumo.trim()) y += text(ctx, 'resumo', t.resumo, { x: M, y, w: CW * 0.85, font: 'body-semibold', max: 28, min: 24, maxLines: 4, lh: 1.35, color: C.title }) + 32;
              text(ctx, 'contexto', c.contexto, { x: M, y, w: CW * 0.85, ...BODY, maxLines: Math.floor((bottomLimit - y) / (18 * BODY.lh * K)), color: C.body });
            }),
          };
        case 'desafio':
          return {
            scene: contentSlide(measure, 'Desafio', n, (ctx, top) => {
              text(ctx, 'desafio', t.desafio, { x: M, y: top, w: CW * 0.8, font: 'body-regular', max: 32, min: 20, maxLines: 7, lh: 1.4, color: C.body });
            }),
          };
        case 'solucao':
          return {
            scene: contentSlide(measure, 'Solução e funcionalidades', n, (ctx, top) => {
              const colW = funcs.length && t.solucao.trim() ? (CW - 64) / 2 : CW;
              if (t.solucao.trim()) text(ctx, 'solucao', t.solucao, { x: M, y: top, w: colW, ...BODY, max: 28, maxLines: 9, color: C.body });
              if (funcs.length) {
                const x = t.solucao.trim() ? M + colW + 64 : M;
                const shown = funcs.slice(0, 8);
                const panelH = 48 + 30 * 1.3 * K + 16 + shown.length * 22 * 1.35 * K + 40;
                ctx.items.push({ type: 'rect', x, y: top, w: colW, h: Math.min(panelH, bottomLimit - top), fill: C.panel, radius: 16 });
                let y = top + 40;
                y += text(ctx, 'funcionalidades-titulo', 'Funcionalidades usadas', { x: x + 40, y, w: colW - 80, font: 'display-semibold', max: 28, maxLines: 1, lh: 1.3, color: C.highlight }) + 16;
                for (const f of shown) {
                  ctx.items.push({ type: 'rect', x: x + 40, y: y + 16, w: 12, h: 12, fill: C.accent, radius: 6 });
                  y += text(ctx, 'funcionalidade', f, { x: x + 68, y, w: colW - 108, font: 'body-regular', max: 22, min: 18, maxLines: 1, lh: 1.35, color: C.body });
                }
                if (funcs.length > shown.length) ctx.warn.push('funcionalidades');
              }
            }),
          };
        case 'resultados':
          return {
            scene: contentSlide(measure, 'Resultados', n, (ctx, top) => {
              let y = top;
              if (t.resultado.trim()) y += text(ctx, 'resultado', t.resultado, { x: M, y, w: CW * 0.85, ...BODY, max: 24, maxLines: kpis.length ? 3 : 8, color: C.body }) + 40;
              if (!kpis.length) return;
              const perRow = kpis.length <= 4 ? kpis.length : 3;
              const rows = Math.ceil(kpis.length / perRow);
              const gap = 32;
              const tw = (CW - gap * (perRow - 1)) / perRow;
              const th = Math.min(260, (bottomLimit - y - gap * (rows - 1)) / rows);
              kpis.forEach((k, i) => {
                const x = M + (i % perRow) * (tw + gap);
                const ty = y + Math.floor(i / perRow) * (th + gap);
                ctx.items.push({ type: 'rect', x, y: ty, w: tw, h: th, fill: C.panel, radius: 16 });
                const vh = text(ctx, 'kpi-valor', k.value, { x: x + 32, y: ty + 28, w: tw - 64, font: 'display-bold', max: rows > 1 ? 44 : 54, min: 28, maxLines: 1, lh: 1.1, color: C.highlight });
                text(ctx, 'kpi', k.def.short, { x: x + 32, y: ty + 28 + vh + 8, w: tw - 64, font: 'body-regular', max: 20, min: 16, maxLines: 2, lh: 1.3, color: C.body });
              });
            }),
          };
        case 'grafico': {
          const top = M + 16 + 44 * 1.15 * K + 40;
          const box = { x: M, y: top, w: CW, h: bottomLimit - top };
          let chart: NativeChart;
          if (cmp) {
            const item: ChartItem = {
              type: 'chart',
              ...box,
              categories: [cmp.def.label],
              series: [
                { name: 'Antes', color: C.chartBefore, values: [cmp.before], labels: [formatValue(cmp.def, cmp.before, c.notaMax)] },
                { name: 'Depois', color: C.chartAfter, values: [cmp.after], labels: [formatValue(cmp.def, cmp.after, c.notaMax)] },
              ],
              ink: C.body,
              labelSize: 20,
            };
            chart = {
              dir: 'col',
              series: [
                { name: 'Antes', labels: [cmp.def.label], values: [cmp.before] },
                { name: 'Depois', labels: [cmp.def.label], values: [cmp.after] },
              ],
              colors: [C.chartBefore, C.chartAfter],
              formatCode: cmp.def.unit === 'brl' ? '"R$" #,##0' : cmp.def.unit === 'pct' ? '0.0"%"' : '#,##0',
              item,
            };
          } else {
            const list = bars.slice(0, 5);
            const item: ChartItem = {
              type: 'chart',
              ...box,
              categories: list.map((b) => b.def.chartLabel ?? b.def.label),
              series: [{ name: 'Percentual', color: C.chartAfter, values: list.map((b) => b.value), labels: list.map((b) => formatPct(b.value)) }],
              ink: C.body,
              labelSize: 20,
            };
            chart = {
              dir: 'col',
              series: [{ name: 'Percentual', labels: item.categories, values: item.series[0]!.values }],
              colors: [C.chartAfter],
              formatCode: '0.0"%"',
              item,
            };
          }
          const title = cmp ? `${cmp.def.label}: antes e depois` : 'Indicadores em percentual';
          const sc = contentSlide(measure, title, n, () => undefined);
          sc.items.push(chart.item);
          return { scene: sc, chart };
        }
        case 'avaliacao':
          return {
            scene: contentSlide(measure, aval ? 'Avaliação dos munícipes' : 'Destaques', n, (ctx, top) => {
              const colW = aval && dest.length ? (CW - 64) / 2 : CW;
              if (aval) {
                let y = top;
                if (aval.media != null) {
                  const nota = formatValue(INDICATORS.find((d) => d.id === 'avaliacao_media')!, aval.media);
                  y += text(ctx, 'avaliacao-nota', nota, { x: M, y, w: colW, font: 'display-bold', max: 96, maxLines: 1, lh: 1.1, color: C.highlight }) + 8;
                  y += text(ctx, 'avaliacao-escala', `de ${c.notaMax} na avaliação média`, { x: M, y, w: colW, font: 'body-regular', max: 24, maxLines: 1, lh: 1.3, color: C.body }) + 40;
                }
                if (aval.positiva != null) {
                  y += text(ctx, 'avaliacao-positiva', formatPct(aval.positiva), { x: M, y, w: colW, font: 'display-bold', max: 72, maxLines: 1, lh: 1.1, color: C.highlight }) + 8;
                  text(ctx, 'avaliacao-positiva-rotulo', 'de avaliações positivas', { x: M, y, w: colW, font: 'body-regular', max: 24, maxLines: 1, lh: 1.3, color: C.body });
                }
              }
              if (dest.length) {
                const x = aval ? M + colW + 64 : M;
                let y = top;
                for (const d of dest) {
                  const h = text(ctx, 'destaques', d, { x: x + 32, y, w: colW - 32, font: 'body-semibold', max: 28, min: 20, maxLines: 3, lh: 1.3, color: C.title });
                  ctx.items.push({ type: 'rect', x, y: y + 6, w: 8, h: Math.max(24, h - 12), fill: C.accent });
                  y += h + 40;
                }
              }
            }),
          };
        case 'cta': {
          const ctx: Ctx = { measure, items: [], warn: [] };
          let y = 330;
          y += text(ctx, 'eyebrow', 'PRÓXIMOS PASSOS', { x: M, y, w: CW, font: 'body-semibold', max: 20, maxLines: 1, lh: 1.3, color: C.eyebrowDark }) + 24;
          y += text(ctx, 'cta', c.contato.cta || 'Leve o Gove para o seu município', { x: M, y, w: CW * 0.85, font: 'display-bold', max: 48, min: 40, maxLines: 2, lh: 1.15, color: C.onDark }) + 40;
          for (const s of [c.contato.nome, c.contato.email, c.contato.site].map((v) => v.trim()).filter(Boolean)) y += text(ctx, 'contato', s, { x: M, y, w: CW, font: 'body-regular', max: 24, min: 20, maxLines: 1, lh: 1.4, color: C.onDark });
          const logo = pickLogo(C.cta, 'logotipo');
          const lh = 64;
          ctx.items.push({ type: 'image', x: M, y: SLIDE.h - M - lh, w: lh * LOGOS.logotipo.aspect, h: lh, file: logo.file });
          return { scene: scene(C.cta, ctx) };
        }
      }
    };
    return { kind, hidden: !show, ...make() };
  });
}

/** Avisos dos slides visíveis. */
export function slideWarnings(slides: Slide[]): string[] {
  return slides
    .filter((s) => !s.hidden && s.scene.warnings.length)
    .map((s) => `${SLIDE_LABELS[s.kind]}: texto longo demais, encurtado no slide.`);
}
