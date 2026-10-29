/**
 * Estilos compartilhados entre o canvas e o HTML exportado.
 *
 * - `boxCss`, `rowCss`, `columnCss`, `containerCss`, `decorLayers`: CSS inline
 *   (kebab-case) de seções, linhas, colunas e camadas decorativas. O export usa
 *   `styleString`; o canvas, `reactStyle`.
 * - `Sheet` + `pageSheet`: UMA folha de regras por página, com classes por
 *   elemento (`g-<id>`), pontos de quebra, :hover, @keyframes etc. O export a
 *   escreve no único `<style>` com @media de verdade (`toExport`); o canvas a
 *   injeta num `<style>` com escopo `.gove-lp[data-device=…]` (`toCanvas`),
 *   aplicando as regras de tablet/celular pelo modo escolhido no editor, já que a
 *   largura do canvas não dispara media queries.
 *
 * Para adicionar regras (etapas seguintes): chame `sheet.add(sheet.node(id) +
 * ":hover", {...})`, `sheet.add(sel, decls, "tablet")`, `sheet.keyframes(nome,
 * corpo)` ou `sheet.shared(chave, sel, decls)` dentro de `pageSheet`; no HTML,
 * use `sheet.classOf(id)` para pôr a classe no elemento. Páginas sem opções
 * novas geram exatamente a folha de antes (só o ponto de quebra do tablet).
 */
import { backgroundCss, normalizeBox, rgba } from "./background";
import { leafRules, sectionRules, shadowCss } from "./blockStyle";
import { headerHeight, headerRules, newBlockRules } from "./blocks";
import { flatLeaves } from "./leaves";
import type {
  BoxProps,
  Column,
  ColumnStyle,
  ContentWidth,
  Glow,
  GlowPosition,
  PageContent,
  PageLayout,
  RowBlock,
  RowMaxWidth,
  SectionBlock,
} from "./types";

/* ------------------------------------------------------------ pontos de quebra */

/** Tablet (≤980px) e celular (≤640px). Substituem a antiga regra única de 768px. */
export const BREAKPOINTS = { tablet: 980, mobile: 640 } as const;

/** Modo de visualização do canvas. */
export type Device = "desktop" | "tablet" | "mobile";
/** Largura do canvas em cada modo (o computador segue a largura do conteúdo). */
export const DEVICE_WIDTH = { tablet: 820, mobile: 390 } as const;

export const CONTENT_WIDTHS: readonly ContentWidth[] = [960, 1120, 1140, 1200, 1280, "full"];
export const DEFAULT_CONTENT_WIDTH = 1120;
/** Margem lateral das seções no tablet (e no celular, se não houver outra). */
export const DEFAULT_GUTTER_MOBILE = 24;
export const GUTTER_STEPS = [0, 16, 18, 24, 32, 40, 48];
export const ROW_MAX_WIDTHS: readonly RowMaxWidth[] = [640, 720, 840, 960, "full"];

/** Largura do canvas no computador (≥ 1120, ou o conteúdo + margens). */
export function desktopCanvasWidth(layout: PageLayout | undefined): number {
  const w = layout?.maxWidth;
  if (w === undefined || w === DEFAULT_CONTENT_WIDTH) return DEFAULT_CONTENT_WIDTH;
  if (w === "full") return 1440;
  return Math.max(DEFAULT_CONTENT_WIDTH, w + 2 * Math.max(layout?.gutter ?? 0, 24));
}

/* -------------------------------------------------------------------- helpers */

export type Decls = Record<string, string | undefined>;

export function styleString(entries: Decls) {
  return Object.entries(entries)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** Decls kebab-case → estilo React (camelCase; prefixos -webkit- → Webkit). */
export function reactStyle(entries: Decls): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(entries)) {
    if (v === undefined || v === "") continue;
    const key = k.startsWith("--")
      ? k
      : k
          .replace(/^-(webkit|moz|ms)-/, (_, p: string) => `${p[0]!.toUpperCase()}${p.slice(1)}-`)
          .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = v;
  }
  return out;
}

/** Número sem zeros sobrando (1.35 → "1.35", 2 → "2"). */
const num = (n: number) => String(Math.round(n * 1000) / 1000);

/* ---------------------------------------------------------------------- caixa */

export { shadowCss };

export const hasDecor = (box: BoxProps) =>
  !!box.decor && (!!box.decor.grid || !!box.decor.glows?.length);

const clampPct = (v: number | undefined, fallback: number) =>
  Math.min(100, Math.max(0, Number.isFinite(v) ? Number(v) : fallback));

/** Fundo com a opacidade do preenchimento (vidro); cor sólida e degradê. */
function translucentBackground(box: BoxProps): Decls | null {
  const b = normalizeBox(box);
  const op = b.fillOpacity;
  if (op === undefined || op >= 100) return null;
  const a = clampPct(op, 100) / 100;
  const solid = (hex: string) => (/^#[0-9a-f]{3,8}$/i.test(hex) ? rgba(hex, a) : hex);
  const base = backgroundCss(b);
  if (b.fill === "gradient") {
    const stops = [b.gradientFrom, b.gradientVia, b.gradientTo].filter(Boolean).map(solid);
    const overlay =
      b.overlay > 0
        ? `linear-gradient(${rgba(b.overlayColor, b.overlay / 100)}, ${rgba(b.overlayColor, b.overlay / 100)}), `
        : "";
    return {
      "background-color": undefined,
      "background-image": `${overlay}linear-gradient(${b.gradientAngle}deg, ${stops.join(", ")})`,
    };
  }
  if (b.fill === "image" && b.bgImage) return null;
  return {
    ...base,
    "background-color": b.bgColor === "transparent" ? undefined : solid(b.bgColor),
  };
}

function borderCss(box: BoxProps): Decls {
  const sides = box.borderSides ?? "all";
  if (!box.borderWidth || sides === "none") return {};
  const value = `${box.borderWidth}px ${box.borderStyle ?? "solid"} ${box.borderColor}`;
  if (sides === "block") return { "border-top": value, "border-bottom": value };
  if (sides === "left") return { "border-left": value };
  return { border: value };
}

/**
 * CSS inline de uma caixa (seção ou linha). Sem opções novas, gera exatamente
 * o CSS de antes (mesma ordem de propriedades).
 */
export function boxCss(box: BoxProps, bb = false): Decls {
  const blur = Math.min(16, Math.max(0, box.glassBlur ?? 0));
  const decor = hasDecor(box);
  return {
    ...backgroundCss(box),
    ...(translucentBackground(box) ?? {}),
    "border-radius": box.radius ? `${box.radius}px` : undefined,
    ...borderCss(box),
    "box-shadow": shadowCss(box.shadow, bb),
    padding: `${box.paddingY}px ${box.paddingX}px`,
    "min-height":
      box.minHeight === "screen" ? "100vh" : box.minHeight ? `${box.minHeight}px` : undefined,
    "backdrop-filter": blur ? `blur(${blur}px)` : undefined,
    "-webkit-backdrop-filter": blur ? `blur(${blur}px)` : undefined,
    position: decor ? "relative" : undefined,
    overflow: decor ? "hidden" : undefined,
  };
}

/* ------------------------------------------------------ camadas decorativas */

export const GLOW_POSITIONS: { value: GlowPosition; label: string; at: string }[] = [
  { value: "top-left", label: "Canto superior esquerdo", at: "12% -10%" },
  { value: "top-right", label: "Canto superior direito", at: "92% 8%" },
  { value: "bottom-left", label: "Canto inferior esquerdo", at: "8% 100%" },
  { value: "bottom-right", label: "Canto inferior direito", at: "92% 100%" },
  { value: "center", label: "Centro", at: "50% 50%" },
];
export const GLOW_SIZES = [400, 600, 900, 1200];
export const MAX_GLOWS = 2;
export const GRID_SIZE = 56;

const glowLayer = (g: Glow) => {
  const at = GLOW_POSITIONS.find((p) => p.value === g.position)?.at ?? "50% 50%";
  const w = Math.max(100, g.size);
  return `radial-gradient(${w}px ${Math.round(w * 0.55)}px at ${at}, ${rgba(g.color, clampPct(g.intensity, 28) / 100)}, transparent 62%)`;
};

/**
 * Camadas decorativas (atrás do conteúdo): brilhos radiais como fundo de uma
 * camada absoluta e, por cima deles, a grade de 56px com máscara radial.
 */
export function decorLayers(box: BoxProps): { glows: Decls; grid: Decls | null } | null {
  if (!hasDecor(box)) return null;
  const decor = box.decor!;
  const glows = (decor.glows ?? []).slice(0, MAX_GLOWS);
  const line = rgba(decor.gridColor || "#FFFFFF", clampPct(decor.gridOpacity, 5) / 100);
  const mask = "radial-gradient(ellipse at 50% 0%, #000 20%, transparent 78%)";
  return {
    glows: {
      position: "absolute",
      inset: "0",
      "pointer-events": "none",
      "background-image": glows.length ? glows.map(glowLayer).join(", ") : undefined,
    },
    grid: decor.grid
      ? {
          position: "absolute",
          inset: "0",
          "background-image": `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          "background-size": `${GRID_SIZE}px ${GRID_SIZE}px`,
          "-webkit-mask-image": mask,
          "mask-image": mask,
        }
      : null,
  };
}

/** HTML das camadas decorativas (export). */
export function decorHtml(box: BoxProps): string {
  const layers = decorLayers(box);
  if (!layers) return "";
  const grid = layers.grid ? `<div style="${styleString(layers.grid)}"></div>` : "";
  return `<div class="gove-decor" aria-hidden="true" style="${styleString(layers.glows)}">${grid}</div>`;
}

/* ---------------------------------------------------------- seção e conteúdo */

/** Largura máxima do conteúdo de uma seção (px) ou null (ponta a ponta). */
export function contentWidth(page: PageContent, section: SectionBlock): number | null {
  if (section.box.fullBleed) return null;
  const w = page.layout?.maxWidth ?? DEFAULT_CONTENT_WIDTH;
  return w === "full" ? null : w;
}

/** CSS inline do `.gove-container` da seção (sem opções = "max-width:1120px;margin:0 auto;"). */
export function containerCss(page: PageContent, section: SectionBlock): Decls {
  const w = contentWidth(page, section);
  const gutter = page.layout?.gutter;
  return {
    "max-width": w === null ? "none" : `${w}px`,
    margin: "0 auto",
    "padding-left": gutter ? `${gutter}px` : undefined,
    "padding-right": gutter ? `${gutter}px` : undefined,
  };
}

/* ---------------------------------------------------------- linhas e colunas */

export const RATIO_PRESETS: { id: string; label: string; ratios: number[] }[] = [
  { id: "1:1", label: "1:1", ratios: [1, 1] },
  { id: "2:1", label: "2:1", ratios: [2, 1] },
  { id: "1:2", label: "1:2", ratios: [1, 2] },
  { id: "3:2", label: "3:2", ratios: [3, 2] },
  { id: "2:3", label: "2:3", ratios: [2, 3] },
  { id: "1:1:1", label: "1:1:1", ratios: [1, 1, 1] },
  { id: "1:1:1:1", label: "1:1:1:1", ratios: [1, 1, 1, 1] },
];

/** Proporção efetiva de cada coluna (ausente/inválida = 1). */
export function rowRatios(row: RowBlock): number[] {
  return row.columns.map((_, i) => {
    const r = row.ratios?.[i];
    return typeof r === "number" && Number.isFinite(r) && r > 0 ? r : 1;
  });
}

const uniformRatios = (ratios: number[]) => ratios.every((r) => r === ratios[0]);

const ALIGN_ITEMS = {
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  start: "flex-start",
} as const;

/** CSS inline da linha (flex). Sem opções novas = CSS de antes. */
export function rowCss(row: RowBlock, bb = false): Decls {
  const max = row.maxWidth && row.maxWidth !== "full" ? row.maxWidth : null;
  return {
    display: "flex",
    "flex-wrap": "wrap",
    gap:
      row.rowGap !== undefined && row.rowGap !== row.gap
        ? `${row.rowGap}px ${row.gap}px`
        : `${row.gap}px`,
    "align-items": ALIGN_ITEMS[row.alignItems ?? "start"] ?? "flex-start",
    ...boxCss(row.box, bb),
    "max-width": max ? `${max}px` : undefined,
    "margin-left": max && (row.rowAlign ?? "center") === "center" ? "auto" : undefined,
    "margin-right": max ? "auto" : undefined,
  };
}

/** CSS inline de uma coluna (`flex:<fr> 1 0`) + a aparência própria dela, se houver. */
export function columnCss(row: RowBlock, index: number, bb = false): Decls {
  const base: Decls = { flex: `${num(rowRatios(row)[index] ?? 1)} 1 0`, "min-width": "0" };
  const style = row.columns[index]?.style;
  return style ? { ...base, ...columnStyleCss(style, bb) } : base;
}

const solidAt = (hex: string | undefined, op: number) =>
  hex && /^#[0-9a-f]{3,8}$/i.test(hex) && op < 100 ? rgba(hex, Math.max(0, op) / 100) : hex;

/** Aparência da coluna: fundo (sólido/translúcido/degradê), borda, raio, preenchimento, sombra e alinhamento vertical. */
export function columnStyleCss(s: ColumnStyle, bb = false): Decls {
  const op = s.fillOpacity ?? 100;
  // Degradê não existe na identidade BB: fica a primeira cor.
  const gradient = s.fill === "gradient" && !bb && s.gradientFrom && s.gradientTo;
  const valign = s.valign && s.valign !== "start" ? s.valign : null;
  return {
    "background-color": gradient ? undefined : solidAt(s.fill === "gradient" ? s.gradientFrom : s.bgColor, op),
    "background-image": gradient
      ? `linear-gradient(${s.gradientAngle ?? 135}deg, ${solidAt(s.gradientFrom, op)}, ${solidAt(s.gradientTo, op)})`
      : undefined,
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor ?? "#F4F4F4"}` : undefined,
    "border-radius": s.radius ? `${s.radius}px` : undefined,
    padding: s.paddingY || s.paddingX ? `${s.paddingY ?? 0}px ${s.paddingX ?? 0}px` : undefined,
    "box-shadow": shadowCss(s.shadow, bb),
    "align-self": valign ? "stretch" : undefined,
    display: valign ? "grid" : undefined,
    "align-content": valign === "center" ? "center" : valign === "end" ? "end" : undefined,
  };
}

/** No celular, a coluna com preenchimento grande fica com até 24px (vertical) e 20px (lateral). */
export const COLUMN_MOBILE_PADDING = { y: 24, x: 20 } as const;

function columnRules(sheet: Sheet, col: Column) {
  const s = col.style;
  if (!s) return;
  const y = s.paddingY ?? 0;
  const x = s.paddingX ?? 0;
  if (y > COLUMN_MOBILE_PADDING.y || x > COLUMN_MOBILE_PADDING.x)
    sheet.add(
      sheet.node(col.id),
      { padding: `${Math.min(y, COLUMN_MOBILE_PADDING.y)}px ${Math.min(x, COLUMN_MOBILE_PADDING.x)}px !important` },
      "mobile",
    );
}

/* ------------------------------------------------------------------- a folha */

/**
 * Onde a regra vale: sempre, no tablet (≤980, inclui o celular), no celular
 * (≤640), só no computador (≥981), só no tablet (641-980) ou sem "reduzir
 * movimento".
 */
export type RuleAt = "all" | "tablet" | "mobile" | "desktop" | "tabletOnly" | "motion";

interface Rule {
  sel: string;
  decls: Decls;
  /** Só no HTML exportado (ex.: ocultar por dispositivo; o canvas esmaece). */
  exportOnly?: boolean;
}

const MEDIA: Record<Exclude<RuleAt, "all">, string> = {
  tablet: `(max-width:${BREAKPOINTS.tablet}px)`,
  mobile: `(max-width:${BREAKPOINTS.mobile}px)`,
  desktop: `(min-width:${BREAKPOINTS.tablet + 1}px)`,
  tabletOnly: `(min-width:${BREAKPOINTS.mobile + 1}px) and (max-width:${BREAKPOINTS.tablet}px)`,
  motion: "(prefers-reduced-motion: no-preference)",
};

/** Ordem dos grupos no CSS (o celular vence o tablet; movimento por último). */
const MEDIA_ORDER = ["tablet", "mobile", "desktop", "tabletOnly", "motion"] as const;

const declString = (decls: Decls) =>
  Object.entries(decls)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${v};`)
    .join("");

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, "_");

/**
 * Folha de regras da página. Seletores são relativos à raiz `.gove-lp`
 * (ex.: ".g-abc>.gove-col", ".g-abc:hover", "section").
 */
export class Sheet {
  private groups: Record<RuleAt, Rule[]> = {
    all: [],
    tablet: [],
    mobile: [],
    desktop: [],
    tabletOnly: [],
    motion: [],
  };
  private frames = new Map<string, string>();
  private sharedKeys = new Set<string>();
  private classed = new Set<string>();

  /** Seletor da classe do elemento (e marca que ele precisa da classe). */
  node(id: string): string {
    this.classed.add(id);
    return `.g-${safeId(id)}`;
  }

  /** Classe do elemento, se alguma regra usa; senão "". */
  classOf(id: string): string {
    return this.classed.has(id) ? `g-${safeId(id)}` : "";
  }

  add(sel: string, decls: Decls, at: RuleAt = "all", opts: { exportOnly?: boolean } = {}): this {
    if (declString(decls)) this.groups[at].push({ sel, decls, ...(opts.exportOnly ? { exportOnly: true } : {}) });
    return this;
  }

  /** Regra comum a vários elementos: entra uma vez só. */
  shared(key: string, sel: string, decls: Decls, at: RuleAt = "all"): this {
    if (this.sharedKeys.has(key)) return this;
    this.sharedKeys.add(key);
    return this.add(sel, decls, at);
  }

  /** @keyframes com nome global (use o prefixo "gove-"). */
  keyframes(name: string, body: string): this {
    this.frames.set(name, body);
    return this;
  }

  private lines(at: RuleAt, prefix: string, indent: string, canvas = false) {
    return this.groups[at]
      .filter((r) => !(canvas && r.exportOnly))
      .map((r) => `${indent}${prefix} ${r.sel}{${declString(r.decls)}}`);
  }

  private framesCss() {
    return [...this.frames].map(([name, body]) => `@keyframes ${name}{${body}}`);
  }

  /** CSS do export: regras gerais, depois @media do tablet, do celular, por faixa e de movimento. */
  toExport(scope = ".gove-lp"): string {
    const out = this.lines("all", scope, "");
    for (const at of MEDIA_ORDER) {
      if (!this.groups[at].length) continue;
      out.push(`@media ${MEDIA[at]}{\n${this.lines(at, scope, "  ").join("\n")}\n}`);
    }
    return [...out, ...this.framesCss()].join("\n");
  }

  /**
   * CSS do canvas: as regras do tablet/celular entram (sem @media) conforme o
   * modo, com escopo `.gove-lp[data-device="…"]` para não vazar para outros
   * canvas da tela (miniaturas). A ordem e a especificidade relativa são as
   * mesmas do export. Regras só do export (ocultar por dispositivo) ficam de fora.
   */
  toCanvas(device: Device): string {
    const scope = `.gove-lp[data-device="${device}"]`;
    const out = this.lines("all", scope, "", true);
    if (device !== "desktop") out.push(...this.lines("tablet", scope, "", true));
    if (device === "mobile") out.push(...this.lines("mobile", scope, "", true));
    if (device === "desktop") out.push(...this.lines("desktop", scope, "", true));
    if (device === "tablet") out.push(...this.lines("tabletOnly", scope, "", true));
    const motion = this.lines("motion", scope, "  ", true);
    if (motion.length) out.push(`@media ${MEDIA.motion}{\n${motion.join("\n")}\n}`);
    return [...out, ...this.framesCss()].join("\n");
  }
}

/* ------------------------------------------------------------ regras da página */

/**
 * Altura do cabeçalho fixo da página (0 = não há): a rolagem até as âncoras
 * compensa essa altura no modo "auto" (scroll-margin-top das seções).
 */
export function stickyHeaderHeight(page: PageContent): number {
  return headerHeight(page);
}

/** Linha empilhada (tablet/celular): coluna normal ou invertida. */
const stackDir = (row: RowBlock) => (row.stackReverse ? "column-reverse" : "column");

function rowRules(sheet: Sheet, row: RowBlock) {
  const ratios = rowRatios(row);
  const justify = row.justify ?? "start";
  if (justify !== "start") {
    const sel = sheet.node(row.id);
    sheet.add(`${sel}>.gove-col`, { "text-align": justify === "center" ? "center" : "right" });
    sheet.add(`${sel}>.gove-col>*`, {
      "margin-left": "auto !important",
      "margin-right": justify === "center" ? "auto !important" : "0 !important",
    });
  }

  const responsive = row.responsive ?? "stack";
  if (responsive === "stack") {
    if (row.stackReverse && row.columns.length > 1)
      sheet.add(sheet.node(row.id), { "flex-direction": "column-reverse" }, "tablet");
    return;
  }
  if (row.columns.length < 2) return;
  const sel = sheet.node(row.id);
  sheet.add(sel, { "flex-direction": "row" }, "tablet");
  if (responsive === "keep") {
    if (uniformRatios(ratios))
      sheet.add(`${sel}>.gove-col`, { flex: "1 1 0 !important", width: "auto" }, "tablet");
    else {
      // A camada decorativa (se houver) é o primeiro filho da linha.
      const skip = hasDecor(row.box) ? 1 : 0;
      ratios.forEach((r, i) =>
        sheet.add(
          `${sel}>.gove-col:nth-child(${i + 1 + skip})`,
          { flex: `${num(r)} 1 0 !important`, width: "auto" },
          "tablet",
        ),
      );
    }
    return;
  }
  // 2 colunas no tablet, empilha no celular.
  sheet.add(
    `${sel}>.gove-col`,
    { flex: `1 1 calc(50% - ${num(row.gap / 2)}px) !important`, width: "auto" },
    "tablet",
  );
  sheet.add(sel, { "flex-direction": stackDir(row) }, "mobile");
  sheet.add(`${sel}>.gove-col`, { flex: "1 1 100% !important", width: "100%" }, "mobile");
}

/** Monta a folha de regras da página (a mesma no canvas e no export). */
export function pageSheet(page: PageContent): Sheet {
  const sheet = new Sheet();
  const layout = page.layout;

  // Regras de antes (eram @media (max-width:768px)): colunas empilhadas e
  // margem lateral de 24px nas seções, agora no ponto de quebra do tablet.
  sheet.add(".gove-row", { "flex-direction": "column" }, "tablet");
  sheet.add(".gove-col", { flex: "1 1 100% !important", width: "100%" }, "tablet");
  sheet.add(
    "section",
    { "padding-left": "24px !important", "padding-right": "24px !important" },
    "tablet",
  );

  // Layout da página.
  if (layout?.gutter)
    sheet.add(".gove-container", { "padding-left": "0", "padding-right": "0" }, "tablet");
  if (layout?.gutterMobile !== undefined && layout.gutterMobile !== DEFAULT_GUTTER_MOBILE)
    sheet.add(
      "section",
      {
        "padding-left": `${layout.gutterMobile}px !important`,
        "padding-right": `${layout.gutterMobile}px !important`,
      },
      "mobile",
    );
  const offset = layout?.scrollOffset ?? "auto";
  const scroll = offset === "auto" ? stickyHeaderHeight(page) : offset;
  if (scroll > 0) sheet.add("section", { "scroll-margin-top": `${scroll}px` });

  const bb = page.identity === "bb";
  headerRules(sheet, page);
  for (const section of page.sections) {
    sectionRules(sheet, section);
    if (hasDecor(section.box))
      sheet.shared("decor", ".gove-decor~*", { position: "relative", "z-index": "1" });
    for (const row of section.children) {
      if (hasDecor(row.box))
        sheet.shared("decor", ".gove-decor~*", { position: "relative", "z-index": "1" });
      rowRules(sheet, row);
      for (const col of row.columns) {
        columnRules(sheet, col);
        for (const leaf of flatLeaves(col.children)) {
          leafRules(sheet, leaf, bb);
          newBlockRules(sheet, leaf, bb);
        }
      }
    }
  }
  return sheet;
}
