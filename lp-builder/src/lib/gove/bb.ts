/**
 * Identidade Banco do Brasil no LP Builder.
 *
 * Fonte de verdade: brand/bb.js (paleta, pares aprovados, esquemas, fontes,
 * tom de voz e regras da logomarca). Aqui ficam só as regras aplicadas à
 * árvore da landing page: contexto de fundo de cada texto, derivação
 * automática das cores, ajuste automático (harmonize) e a checagem antes de
 * exportar (todo texto >= 4,5:1, só cores da paleta).
 *
 * Módulo puro (sem React, sem import de arquivos de fonte) para rodar também
 * no teste em Node (scripts/bb-check.test.mjs).
 */
import {
  BB_FONTS,
  BB_LOGO_RULES,
  BB_NAMES,
  BB_PALETTE,
  BB_PRETO,
  BB_PROTECTION,
  BB_SCHEMES,
  BB_TEXT_ON,
  BB_VOICE,
  MIN_GRAPHIC,
  MIN_TEXT,
  contrast,
  graphicColors,
  isBBColor,
  mix,
  textOn,
  textOnSamples,
  type BBScheme,
} from "../../../../brand/bb.js";
import { normalizeBox } from "./background";
import { HIGHLIGHT_DEFAULT } from "./blockStyle";
import { parseRich, plainText } from "./richText";
import { CURSOR_PRESETS } from "./cursor";
import { colorOf, colorParts, isNewBlock, rdFieldParts, type ColorPart } from "./blockColors";
import type { AuditIssue } from "./audit";
import type {
  BBLogo,
  BlockStyle,
  BoxProps,
  ButtonBlock,
  CountdownBlock,
  Identity,
  Leaf,
  PageContent,
  RowBlock,
  SectionBlock,
  TextBlock,
} from "./types";

export {
  BB_FONTS,
  BB_LOGO_RULES,
  BB_PALETTE,
  BB_PRETO,
  BB_PROTECTION,
  BB_SCHEMES,
  BB_TEXT_ON,
  BB_VOICE,
  MIN_GRAPHIC,
  MIN_TEXT,
  contrast,
  graphicColors,
  isBBColor,
  textOn,
  textOnSamples,
};
export type { BBScheme };

const P = BB_PALETTE;
const WHITE = "#FFFFFF";
const BLACK = "#000000";

/** As 12 cores da paleta, na ordem do guia. */
export const BB_COLORS: string[] = Object.values(P);
/** Fundos permitidos para seções e linhas (os 6 esquemas aprovados). */
export const BB_SCHEME_BGS: string[] = BB_SCHEMES.map((s) => s.bg);

export const isBB = (page: Pick<PageContent, "identity"> | null | undefined) =>
  page?.identity === "bb";

/** "#abc" | "#AABBCC" | "aabbcc" → "#AABBCC"; null se não for hex. */
export function hex6(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s))
    return (
      "#" +
      s
        .split("")
        .map((c) => c + c)
        .join("")
        .toUpperCase()
    );
  if (/^[0-9a-f]{6}$/i.test(s)) return "#" + s.toUpperCase();
  return null;
}

export const bbName = (hex: string) => BB_NAMES[hex6(hex) ?? ""] ?? hex;
/** 8.9399 → "8,94" (com vírgula, como no guia). */
export const fmtRatio = (r: number) => {
  const v = Math.round(r * 100) / 100;
  // Nunca mostra "4,50" para quem reprova (4,495…): aí trunca.
  return (r < MIN_TEXT && v >= MIN_TEXT ? Math.floor(r * 100) / 100 : v)
    .toFixed(2)
    .replace(".", ",");
};
export const schemeByBg = (bg: string | null | undefined): BBScheme | undefined =>
  BB_SCHEMES.find((s) => s.bg === hex6(bg));

function rgb(hex: string) {
  const h = hex6(hex) ?? BLACK;
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
/** Cor da lista mais próxima (distância RGB ponderada). */
export function nearest(hex: string, list: string[]): string {
  const [r, g, b] = rgb(hex);
  let best = list[0]!;
  let bestD = Infinity;
  for (const c of list) {
    const [r2, g2, b2] = rgb(c);
    const d = 2 * (r - r2) ** 2 + 4 * (g - g2) ** 2 + 3 * (b - b2) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
const uniq = (list: string[]) => [...new Set(list)];

/* ------------------------------------------------------------------ fontes */

export interface PageFonts {
  heading: string;
  body: string;
  headingWeight: (bold: boolean) => number;
  bodyWeight: (bold: boolean) => number;
}

const MONTSERRAT = "Montserrat, Arial, sans-serif";
const GOVE_FONTS: PageFonts = {
  heading: MONTSERRAT,
  body: MONTSERRAT,
  headingWeight: (bold) => (bold ? 700 : 400),
  bodyWeight: (bold) => (bold ? 700 : 400),
};
/** Aspas simples: o valor vai dentro de style="…" no HTML exportado. */
const BB_PAGE_FONTS: PageFonts = {
  heading: `'${BB_FONTS.title.family}', ${BB_FONTS.fallback}, sans-serif`,
  body: `'${BB_FONTS.text.family}', ${BB_FONTS.fallback}, sans-serif`,
  // Títulos BB: 500/700/800 (sem 400). Textos BB: 400/500/700.
  headingWeight: (bold) => (bold ? 700 : 500),
  bodyWeight: (bold) => (bold ? 700 : 400),
};
export const pageFonts = (identity: Identity | undefined): PageFonts =>
  identity === "bb" ? BB_PAGE_FONTS : GOVE_FONTS;

/** Arquivos .woff2 por família/peso (brand/fonts/bb/<arquivo>.woff2). */
export const BB_FONT_FILES: { family: string; weight: number; file: string }[] = [
  ...Object.entries(BB_FONTS.title.weights).map(([w, file]) => ({
    family: BB_FONTS.title.family,
    weight: Number(w),
    file,
  })),
  ...Object.entries(BB_FONTS.text.weights).map(([w, file]) => ({
    family: BB_FONTS.text.family,
    weight: Number(w),
    file,
  })),
];

/** @font-face das fontes BB a partir de um mapa arquivo → URL (data URI no export). */
export function fontFaceCss(urls: Record<string, string>): string {
  return BB_FONT_FILES.filter((f) => urls[f.file])
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";src:url(${urls[f.file]}) format("woff2");font-weight:${f.weight};font-style:normal;font-display:swap;}`,
    )
    .join("\n");
}

/* --------------------------------------------------------- contexto de fundo */

/**
 * Amostras de cor do fundo efetivo de uma caixa: sólido = 1 cor; degradê = as
 * paradas; foto = pior caso (preto e branco). A sobreposição é misturada.
 */
export function boxSamples(raw: BoxProps, under: string[]): string[] {
  const b = normalizeBox(raw);
  let base: string[];
  if (b.fill === "image" && b.bgImage) base = [BLACK, WHITE];
  else if (b.fill === "gradient")
    base = [b.gradientFrom, b.gradientVia, b.gradientTo].map(hex6).filter((c): c is string => !!c);
  else {
    const c = hex6(b.bgColor);
    // Vidro: preenchimento translúcido mistura com o fundo de baixo.
    const op = b.fillOpacity ?? 100;
    base = c ? (op < 100 ? under.map((u) => mix(c, u, Math.max(0, op) / 100)) : [c]) : under;
  }
  const overlay = hex6(b.overlayColor);
  if (b.overlay > 0 && overlay)
    base = base.map((s) => mix(overlay, s, Math.min(1, b.overlay / 100)));
  // Brilhos decorativos: pior caso no centro de cada brilho.
  for (const glow of b.decor?.glows ?? []) {
    const g = hex6(glow.color);
    if (g && glow.intensity > 0) base = [...base, ...base.map((s) => mix(g, s, Math.min(1, glow.intensity / 100)))];
  }
  return uniq(base.length ? base : under);
}

export const sectionSamples = (section: SectionBlock) => boxSamples(section.box, [WHITE]);
export const rowSamples = (section: SectionBlock, row: RowBlock) =>
  boxSamples(row.box, sectionSamples(section));

export interface BBContext {
  /** Cores contra as quais o texto precisa passar 4,5:1. */
  samples: string[];
  /** Um único fundo da paleta (pares aprovados de BB_TEXT_ON). */
  solid: boolean;
  /** Texto vai numa caixa de proteção Azul escuro + Branco (foto sem contraste garantido). */
  protected: boolean;
}

/** Contexto do texto sobre um fundo. Foto/degradê sem cor que passe → proteção. */
export function textContext(samples: string[]): BBContext {
  if (samples.length === 1 && isBBColor(samples[0]!))
    return { samples, solid: true, protected: false };
  if (textOnSamples(samples)) return { samples, solid: false, protected: false };
  return { samples: [BB_PROTECTION.bg], solid: true, protected: true };
}

/** Cores de texto permitidas no contexto (preferidas primeiro). */
export function allowedText(ctx: BBContext): string[] {
  if (ctx.solid) {
    const list = BB_TEXT_ON[ctx.samples[0]!];
    if (list) return list;
  }
  return BB_COLORS.filter((c) => ctx.samples.every((s) => contrast(c, s) >= MIN_TEXT)).sort(
    (x, y) => minRatio(y, ctx) - minRatio(x, ctx),
  );
}

/** Pior razão de contraste do texto no contexto. */
export function minRatio(color: string, ctx: BBContext): number {
  const c = hex6(color);
  if (!c) return 1;
  return Math.min(...ctx.samples.map((s) => contrast(c, s)));
}

/** Cor do texto: mantém a atual se aprovada; senão a preferida do esquema; senão textOn. */
export function deriveText(
  ctx: BBContext,
  current: string | undefined,
  prefs: string[] = [],
): string {
  const allowed = allowedText(ctx);
  const cur = hex6(current);
  if (cur && allowed.includes(cur)) return cur;
  const pref = prefs.find((p) => allowed.includes(p));
  if (ctx.solid) return textOn(ctx.samples[0]!, pref);
  return textOnSamples(ctx.samples, pref) ?? BB_PROTECTION.text;
}

/** Fundo de uma linha/seção quando é um único sólido da paleta (para preferências de esquema). */
const solidBg = (ctx: BBContext) => (ctx.solid && !ctx.protected ? ctx.samples[0] : undefined);

const isFilled = (variant: ButtonBlock["variant"] | undefined) =>
  !variant || variant === "filled" || variant === "elevated";

/** Fundo próprio (blockStyle) do bloco sobre o contêiner: amostras, ou null. */
function ownFill(leaf: Leaf, container: BBContext): string[] | null {
  const bs = leaf.blockStyle;
  const c = hex6(bs?.bgColor);
  if (!c || leaf.type === "card") return null;
  const op = bs?.fillOpacity ?? 100;
  return op < 100 ? uniq(container.samples.map((u) => mix(c, u, Math.max(0, op) / 100))) : [c];
}

/** Contexto do texto de um bloco dentro de um contêiner (seção/linha). */
export function leafTextContext(leaf: Leaf, container: BBContext): BBContext {
  if (leaf.type === "card") {
    const bg = hex6(leaf.bgColor) ?? WHITE;
    const op = leaf.blockStyle?.fillOpacity ?? 100;
    return textContext(op < 100 ? uniq(container.samples.map((u) => mix(bg, u, Math.max(0, op) / 100))) : [bg]);
  }
  if ((leaf.type === "button" || leaf.type === "countdown") && isFilled(leaf.variant))
    return textContext([hex6(leaf.bgColor) ?? WHITE]);
  const own = ownFill(leaf, container);
  return own ? textContext(own) : container;
}

/** O bloco ganha a caixa de proteção (texto solto sobre foto)? */
export function needsProtection(leaf: Leaf, container: BBContext): boolean {
  if (!container.protected) return false;
  // Fundo próprio opaco (aparência do bloco): o texto já tem contraste garantido.
  if (hex6(leaf.blockStyle?.bgColor) && (leaf.blockStyle?.fillOpacity ?? 100) >= 100) return false;
  if (leaf.type === "text") return true;
  if (leaf.type === "button" || leaf.type === "countdown") return !isFilled(leaf.variant);
  return false;
}

/** Contexto do contêiner de cada bloco (por id). */
export function containerContexts(page: PageContent): Map<string, BBContext> {
  const map = new Map<string, BBContext>();
  for (const section of page.sections)
    for (const row of section.children) {
      const ctx = textContext(rowSamples(section, row));
      for (const col of row.columns) for (const leaf of col.children) map.set(leaf.id, ctx);
    }
  return map;
}

/* --------------------------------------------------------------- esquemas */

/** Aplica um esquema BB a uma seção/linha e recolore os blocos dentro dela. */
export function applyScheme(page: PageContent, id: string, scheme: BBScheme | null): PageContent {
  const recolor = (leaf: Leaf): Leaf => {
    if (!scheme) return leaf;
    switch (leaf.type) {
      case "text":
        return { ...leaf, color: leaf.tag === "p" ? scheme.text : scheme.title };
      case "button":
        return isFilled(leaf.variant)
          ? { ...leaf, bgColor: scheme.button, color: scheme.buttonText }
          : { ...leaf, bgColor: scheme.button, color: scheme.title };
      case "countdown":
        return isFilled(leaf.variant)
          ? {
              ...leaf,
              bgColor: scheme.button,
              color: scheme.buttonText,
              accentColor: scheme.buttonText,
            }
          : { ...leaf, bgColor: scheme.button, color: scheme.title, accentColor: scheme.text };
      default:
        return leaf;
    }
  };
  const recolorRow = (row: RowBlock): RowBlock => ({
    ...row,
    columns: row.columns.map((c) => ({ ...c, children: c.children.map(recolor) })),
  });
  const next: PageContent = {
    ...page,
    sections: page.sections.map((section) => {
      if (section.id === id) {
        if (!scheme) return section;
        return {
          ...section,
          box: {
            ...normalizeBox(section.box),
            fill: section.box.fill === "image" ? "image" : "solid",
            bgColor: scheme.bg,
          },
          // Linhas transparentes herdam o esquema da seção.
          children: section.children.map((row) =>
            hex6(row.box.bgColor) || (row.box.fill === "image" && row.box.bgImage)
              ? row
              : recolorRow(row),
          ),
        };
      }
      return {
        ...section,
        children: section.children.map((row) => {
          if (row.id !== id) return row;
          const box = normalizeBox(row.box);
          if (!scheme) return { ...row, box: { ...box, fill: "solid", bgColor: "transparent" } };
          return recolorRow({
            ...row,
            box: { ...box, fill: box.fill === "image" ? "image" : "solid", bgColor: scheme.bg },
          });
        }),
      };
    }),
  };
  return bbHarmonize(next);
}

/* ------------------------------------------------------------ ajuste automático */

const snapPalette = (c: string | undefined) => {
  const h = hex6(c);
  if (h && isBBColor(h)) return h;
  return nearest(h ?? WHITE, BB_COLORS);
};

function harmonizeBox(raw: BoxProps, allowTransparent: boolean): BoxProps {
  const box = normalizeBox(raw);
  const next: BoxProps = { ...box };
  if (next.fill === "gradient") {
    next.fill = "solid";
    next.bgColor = nearest(hex6(box.gradientFrom) ?? WHITE, BB_SCHEME_BGS);
  }
  const bg = hex6(next.bgColor);
  if (!bg) {
    if (!allowTransparent) next.bgColor = WHITE;
  } else if (!BB_SCHEME_BGS.includes(bg)) next.bgColor = nearest(bg, BB_SCHEME_BGS);
  else next.bgColor = bg;
  next.overlayColor = snapPalette(box.overlayColor);
  next.gradientFrom = snapPalette(box.gradientFrom);
  next.gradientTo = snapPalette(box.gradientTo);
  next.gradientVia = box.gradientVia ? snapPalette(box.gradientVia) : "";
  next.borderColor = snapPalette(box.borderColor);
  if (box.decor) {
    next.decor = {
      ...box.decor,
      ...(box.decor.gridColor ? { gridColor: snapPalette(box.decor.gridColor) } : {}),
      ...(box.decor.glows ? { glows: box.decor.glows.map((g) => ({ ...g, color: snapPalette(g.color) })) } : {}),
    };
  }
  if (next.borderWidth > 0) {
    // Borda só com >= 3:1 (Amarelo sobre Branco nunca em linha fina).
    const inner = hex6(next.bgColor) ?? WHITE;
    if (contrast(next.borderColor, inner) < MIN_GRAPHIC)
      next.borderColor = graphicColors(inner)[0] ?? P.azulEscuro;
  }
  return next;
}

/** Cor de forma (botão, borda, ícone) com >= 3:1 sobre o fundo. */
function graphicOn(current: string, bg: string, prefs: string[]): string {
  const ok = graphicColors(bg);
  if (ok.includes(current)) return current;
  return prefs.find((p) => ok.includes(p)) ?? ok[0] ?? P.azulEscuro;
}

/** Cores da aparência do bloco só da paleta. */
function harmonizeBlockStyle(bs: BlockStyle): BlockStyle {
  const next: BlockStyle = { ...bs };
  if (bs.bgColor) next.bgColor = snapPalette(bs.bgColor);
  if (bs.borderColor) next.borderColor = snapPalette(bs.borderColor);
  if (bs.hoverColor) next.hoverColor = snapPalette(bs.hoverColor);
  return next;
}

/** Destaque ==texto==: cor sólida legível e diferente da cor do texto. */
function harmonizeHighlight(leaf: TextBlock, ctx: BBContext): TextBlock {
  const marked = parseRich(leaf.content).some((line) => line.some((s) => s.highlight));
  if (!marked && !leaf.highlightFrom) return leaf;
  const allowed = allowedText(ctx);
  const cur = hex6(leaf.highlightFrom);
  const from =
    cur && allowed.includes(cur) ? cur : (allowed.find((c) => c !== hex6(leaf.color)) ?? allowed[0] ?? leaf.color);
  return { ...leaf, highlightFrom: from, highlightTo: from };
}

function harmonizeLeaf(raw: Leaf, container: BBContext): Leaf {
  const leaf: Leaf = raw.blockStyle ? { ...raw, blockStyle: harmonizeBlockStyle(raw.blockStyle) } : raw;
  const bg = solidBg(container);
  const scheme = schemeByBg(bg);
  switch (leaf.type) {
    case "text": {
      const role = leaf.tag === "p" ? scheme?.text : scheme?.title;
      const ctx = leafTextContext(leaf, container);
      const own = ctx !== container;
      const next = { ...leaf, color: deriveText(ctx, leaf.color, role && !own ? [role] : []) };
      return harmonizeHighlight(next, ctx);
    }
    case "button": {
      const variant = leaf.variant === "glass" ? "filled" : leaf.variant === "ghost" ? "outline" : leaf.variant;
      let fill = hex6(leaf.bgColor);
      if (!fill || !isBBColor(fill)) fill = scheme?.button ?? snapPalette(leaf.bgColor);
      if (bg && (isFilled(variant) || variant === "outline"))
        fill = graphicOn(fill, bg, scheme ? [scheme.button] : []);
      const next: ButtonBlock = { ...leaf, variant, bgColor: fill };
      const ctx = leafTextContext(next, container);
      const prefs = isFilled(variant)
        ? scheme && scheme.button === fill
          ? [scheme.buttonText]
          : []
        : scheme
          ? [scheme.title]
          : [];
      return { ...next, color: deriveText(ctx, leaf.color, prefs) };
    }
    case "countdown": {
      const variant =
        leaf.variant === "glass" ? "filled" : leaf.variant === "ghost" ? "outline" : (leaf.variant ?? "filled");
      let fill = hex6(leaf.bgColor);
      if (!fill || !isBBColor(fill)) fill = scheme?.button ?? snapPalette(leaf.bgColor);
      if (bg && (isFilled(variant) || variant === "outline"))
        fill = graphicOn(fill, bg, scheme ? [scheme.button] : []);
      const next: CountdownBlock = { ...leaf, variant, bgColor: fill };
      const ctx = leafTextContext(next, container);
      const prefs = isFilled(variant) && scheme?.button === fill ? [scheme.buttonText] : [];
      return {
        ...next,
        color: deriveText(ctx, leaf.color, prefs),
        accentColor: deriveText(ctx, leaf.accentColor, prefs),
      };
    }
    case "card": {
      const cardBg = snapPalette(leaf.bgColor);
      const ctx = leafTextContext({ ...leaf, bgColor: cardBg }, container);
      const cs = schemeByBg(cardBg);
      let borderColor = snapPalette(leaf.borderColor);
      if (leaf.borderWidth > 0) {
        const outer = bg ?? cardBg;
        if (Math.max(contrast(borderColor, cardBg), contrast(borderColor, outer)) < MIN_GRAPHIC)
          borderColor = graphicColors(cardBg)[0] ?? P.azulEscuro;
      }
      return {
        ...leaf,
        bgColor: cardBg,
        color: deriveText(ctx, leaf.color, cs ? [cs.text] : []),
        iconColor: graphicOn(snapPalette(leaf.iconColor), cardBg, cs ? [cs.accent, cs.title] : []),
        borderColor,
      };
    }
    case "rdform":
      return leaf.fields ? { ...leaf, fields: harmonizeParts(leaf.fields, rdFieldParts(leaf), container, "bgColor") } : leaf;
    default:
      return isNewBlock(leaf) ? harmonizeParts(leaf, colorParts(leaf), leafTextContext(leaf, container)) : leaf;
  }
}

/**
 * Blocos novos: superfícies e detalhes na paleta, formas com >= 3:1 sobre o
 * fundo e textos com par aprovado (sobre o fundo próprio da parte, se houver).
 * `shapeOn`: campo do fundo das formas (ex.: campos do RD); ausente = o contexto.
 */
function harmonizeParts<T extends object>(obj: T, parts: ColorPart[], ctx: BBContext, shapeOn?: string): T {
  const next = { ...obj } as Record<string, unknown>;
  const get = (key: string) => String(next[key] ?? "");
  for (const p of parts) if (p.role === "surface" || p.role === "deco") next[p.key] = snapPalette(get(p.key));
  const bg = shapeOn ? hex6(get(shapeOn)) ?? undefined : solidBg(ctx);
  for (const p of parts)
    if (p.role === "shape") next[p.key] = bg ? graphicOn(snapPalette(get(p.key)), bg, []) : snapPalette(get(p.key));
  for (const p of parts)
    if (p.role === "text") {
      const on = p.on ? hex6(get(p.on)) : null;
      next[p.key] = deriveText(on ? textContext([on]) : ctx, get(p.key));
    }
  return next as T;
}

/** Seção do cabeçalho com a logomarca BB (a faixa separada some). */
function headerWithLogo(page: PageContent): SectionBlock | null {
  if (!page.bbLogo?.src) return null;
  const section = page.sections.find((s) => s.role === "header");
  const nav = section?.children.flatMap((r) => r.columns.flatMap((c) => c.children)).find((l) => l.type === "navbar");
  return section && nav?.type === "navbar" && nav.logo ? section : null;
}

/** Cabeçalho com a logomarca: fundo opaco em Amarelo institucional, Azul institucional ou Branco. */
function harmonizeHeaderBox(box: BoxProps): BoxProps {
  const allowed = BB_LOGO_RULES.centralHorizontalBackgrounds;
  const bg = hex6(box.bgColor);
  const next: BoxProps = { ...box, bgColor: bg && allowed.includes(bg) ? bg : nearest(bg ?? WHITE, allowed) };
  delete next.fillOpacity;
  return next;
}

export function harmonizeLogo(logo: BBLogo): BBLogo {
  const allowed = BB_LOGO_RULES.centralHorizontalBackgrounds;
  const bg = hex6(logo.bg);
  const min = BB_LOGO_RULES.minDigitalPx[logo.version] ?? 70;
  return {
    ...logo,
    bg: bg && allowed.includes(bg) ? bg : P.amareloInstitucional,
    width: Math.max(min, Math.round(logo.width || min)),
  };
}

/**
 * Ajuste automático à identidade BB: fundos nos esquemas, cores na paleta,
 * textos com par aprovado (>= 4,5:1) e formas com >= 3:1. Mantém as escolhas
 * que já passam. Idempotente.
 */
export function bbHarmonize(page: PageContent): PageContent {
  const logoHeader = headerWithLogo(page);
  const sections = page.sections.map((section) => {
    const box = harmonizeBox(section.box, false);
    const s: SectionBlock = { ...section, box: section === logoHeader ? harmonizeHeaderBox(box) : box };
    s.children = section.children.map((row) => {
      const r: RowBlock = { ...row, box: harmonizeBox(row.box, true) };
      const ctx = textContext(rowSamples(s, r));
      r.columns = row.columns.map((col) => ({
        ...col,
        children: col.children.map((leaf) => harmonizeLeaf(leaf, ctx)),
      }));
      return r;
    });
    return s;
  });
  const next: PageContent = { ...page, identity: "bb", sections };
  if (page.bbLogo) next.bbLogo = harmonizeLogo(page.bbLogo);
  if (usesGoveCursor(page)) next.cursor = { ...page.cursor!, mode: "default" };
  return next;
}

/** Cursores prontos da GOVE (amarelo/roxo GOVE): fora da paleta BB. */
const usesGoveCursor = (page: PageContent) =>
  !!page.cursor &&
  page.cursor.mode !== "default" &&
  CURSOR_PRESETS.some((c) => c.url === page.cursor!.url);

/* ---------------------------------------------------------------- checagem */

const clip = (s: string, n = 32) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t || "(vazio)";
};

function leafLabel(leaf: Leaf): string {
  switch (leaf.type) {
    case "text":
      return `Texto “${clip(plainText(leaf.content))}”`;
    case "button":
      return `Botão “${clip(leaf.label, 24)}”`;
    case "card":
      return `Card “${clip(leaf.title, 24)}”`;
    case "countdown":
      return "Contagem regressiva";
    case "badge":
      return `Selo “${clip(leaf.text, 24)}”`;
    case "list":
      return "Lista";
    case "infolist":
      return "Lista de informações";
    case "tags":
      return "Etiquetas";
    case "stats":
      return "Estatísticas";
    case "timeline":
      return "Cronograma";
    case "faq":
      return "FAQ";
    case "date":
      return "Bloco de data";
    case "person":
      return `Card de pessoa “${clip(leaf.name, 24)}”`;
    case "divider":
      return "Divisória";
    case "navbar":
      return "Cabeçalho com menu";
    case "footer":
      return "Rodapé";
    case "rdform":
      return "Formulário RD Station";
    default:
      return "Bloco";
  }
}

const bgLabel = (ctx: BBContext) =>
  ctx.protected
    ? "caixa de proteção Azul escuro"
    : ctx.samples.length === 1
      ? bbName(ctx.samples[0]!)
      : "fundo com foto/degradê (pior caso)";

/**
 * Checagem da identidade BB antes de exportar: todo texto >= 4,5:1 contra o
 * fundo efetivo (pior caso em foto/degradê), só cores da paleta (Preto só como
 * texto sobre Rosa escuro), formas >= 3:1, regras da logomarca.
 */
export function bbAudit(page: PageContent): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const add = (id: string, rule: string, message: string, nodeId?: string) =>
    issues.push({ id, rule, message, severity: "error", ...(nodeId ? { nodeId } : {}) });
  const offPalette = (c: string | undefined) => {
    const h = hex6(c);
    return !h || !isBBColor(h);
  };

  const checkBox = (box: BoxProps, where: string, id: string, allowTransparent: boolean) => {
    const b = normalizeBox(box);
    if (b.fill === "gradient")
      add(
        `grad-${id}`,
        "Paleta BB",
        `${where}: degradê não faz parte da identidade BB. Use um esquema.`,
        id,
      );
    const bg = hex6(b.bgColor);
    if (!bg && !allowTransparent)
      add(`bg-${id}`, "Paleta BB", `${where}: fundo transparente — escolha um esquema BB.`, id);
    if (bg && b.fill !== "gradient" && !BB_SCHEME_BGS.includes(bg))
      add(`bg-${id}`, "Paleta BB", `${where}: fundo ${bg} fora dos esquemas BB.`, id);
    if (b.overlay > 0 && offPalette(b.overlayColor))
      add(`ov-${id}`, "Paleta BB", `${where}: sobreposição ${b.overlayColor} fora da paleta.`, id);
    const decorColors = [
      ...(b.decor?.grid && b.decor.gridColor ? [b.decor.gridColor] : []),
      ...(b.decor?.glows ?? []).map((g) => g.color),
    ];
    for (const c of decorColors)
      if (offPalette(c)) add(`dc-${id}-${c}`, "Paleta BB", `${where}: decoração ${c} fora da paleta.`, id);
    if (b.borderWidth > 0) {
      if (offPalette(b.borderColor))
        add(`bd-${id}`, "Paleta BB", `${where}: borda ${b.borderColor} fora da paleta.`, id);
      else if (bg && contrast(b.borderColor, bg) < MIN_GRAPHIC)
        add(
          `bdc-${id}`,
          "Contraste BB",
          `${where}: borda com ${fmtRatio(contrast(b.borderColor, bg))}:1 — formas pedem 3:1.`,
          id,
        );
    }
  };

  const checkText = (leaf: Leaf, part: string, color: string, ctx: BBContext) => {
    const h = hex6(color);
    const label = `${leafLabel(leaf)}${part}`;
    if (!h || (!isBBColor(h) && !(h === BB_PRETO && allowedText(ctx).includes(BB_PRETO)))) {
      add(
        `pal-${leaf.id}${part}`,
        "Paleta BB",
        `${label}: cor ${color} fora da paleta BB.`,
        leaf.id,
      );
      return;
    }
    const r = minRatio(h, ctx);
    if (r < MIN_TEXT)
      add(
        `ctr-${leaf.id}${part}`,
        "Contraste BB",
        `${label}: ${fmtRatio(r)}:1 sobre ${bgLabel(ctx)} — mínimo 4,5:1.`,
        leaf.id,
      );
    else if (h === BB_PRETO && !allowedText(ctx).includes(BB_PRETO))
      add(
        `preto-${leaf.id}${part}`,
        "Paleta BB",
        `${label}: Preto só é permitido sobre Rosa escuro.`,
        leaf.id,
      );
  };

  const checkShape = (leaf: Leaf, part: string, color: string, bg: string | undefined) => {
    if (offPalette(color)) {
      add(
        `pal-${leaf.id}${part}`,
        "Paleta BB",
        `${leafLabel(leaf)}${part}: cor ${color} fora da paleta BB.`,
        leaf.id,
      );
      return;
    }
    if (bg && contrast(color, bg) < MIN_GRAPHIC)
      add(
        `shp-${leaf.id}${part}`,
        "Contraste BB",
        `${leafLabel(leaf)}${part}: ${fmtRatio(contrast(color, bg))}:1 sobre ${bbName(bg)} — formas pedem 3:1.`,
        leaf.id,
      );
  };

  page.sections.forEach((section, si) => {
    checkBox(section.box, `Seção ${si + 1}`, section.id, false);
    section.children.forEach((row, ri) => {
      checkBox(row.box, `Seção ${si + 1}, linha ${ri + 1}`, row.id, true);
      const container = textContext(rowSamples(section, row));
      const bg = solidBg(container);
      for (const col of row.columns)
        for (const leaf of col.children) {
          const ctx = leafTextContext(leaf, container);
          const bs = leaf.blockStyle;
          if (bs) {
            const parts: [string, string | undefined][] = [
              ["fundo", bs.bgColor],
              ["borda", bs.borderWidth ? bs.borderColor : undefined],
              ["destaque do hover", bs.hover && bs.hover !== "none" ? bs.hoverColor : undefined],
            ];
            for (const [part, color] of parts)
              if (color && offPalette(color))
                add(`pal-${leaf.id}-bs-${part}`, "Paleta BB", `${leafLabel(leaf)}: ${part} ${color} fora da paleta.`, leaf.id);
          }
          if ((leaf.type === "button" || leaf.type === "countdown") && leaf.variant === "ghost")
            add(
              `ghost-${leaf.id}`,
              "Paleta BB",
              `${leafLabel(leaf)}: estilo fantasma gera borda translúcida, fora da paleta. Use contorno.`,
              leaf.id,
            );
          switch (leaf.type) {
            case "text":
              checkText(leaf, "", leaf.color, ctx);
              if (parseRich(leaf.content).some((line) => line.some((s) => s.highlight)))
                checkText(leaf, " (destaque)", leaf.highlightFrom || HIGHLIGHT_DEFAULT.from, ctx);
              break;
            case "button":
              if (leaf.variant === "glass")
                add(
                  `glass-${leaf.id}`,
                  "Paleta BB",
                  `${leafLabel(leaf)}: estilo vidro gera cores fora da paleta.`,
                  leaf.id,
                );
              checkText(leaf, "", leaf.color, ctx);
              if (leaf.variant !== "text" && leaf.variant !== "glass" && leaf.variant !== "ghost")
                checkShape(leaf, " (fundo/borda)", leaf.bgColor, bg);
              break;
            case "countdown":
              if (leaf.variant === "glass")
                add(
                  `glass-${leaf.id}`,
                  "Paleta BB",
                  `${leafLabel(leaf)}: estilo vidro gera cores fora da paleta.`,
                  leaf.id,
                );
              checkText(leaf, " (números)", leaf.color, ctx);
              checkText(leaf, " (rótulos)", leaf.accentColor, ctx);
              if (leaf.variant !== "text" && leaf.variant !== "glass" && leaf.variant !== "ghost")
                checkShape(leaf, " (fundo/borda)", leaf.bgColor, bg);
              break;
            case "card": {
              if (offPalette(leaf.bgColor))
                add(
                  `pal-${leaf.id}-bg`,
                  "Paleta BB",
                  `${leafLabel(leaf)}: fundo ${leaf.bgColor} fora da paleta.`,
                  leaf.id,
                );
              else {
                checkText(leaf, "", leaf.color, ctx);
                checkShape(leaf, " (ícone)", leaf.iconColor, hex6(leaf.bgColor) ?? undefined);
              }
              if (leaf.borderWidth > 0) {
                if (offPalette(leaf.borderColor))
                  add(
                    `pal-${leaf.id}-bd`,
                    "Paleta BB",
                    `${leafLabel(leaf)}: borda ${leaf.borderColor} fora da paleta.`,
                    leaf.id,
                  );
                else {
                  const cardBg = hex6(leaf.bgColor) ?? WHITE;
                  const best = Math.max(
                    contrast(leaf.borderColor, cardBg),
                    contrast(leaf.borderColor, bg ?? cardBg),
                  );
                  if (best < MIN_GRAPHIC)
                    add(
                      `bdc-${leaf.id}`,
                      "Contraste BB",
                      `${leafLabel(leaf)}: borda com ${fmtRatio(best)}:1 — linhas pedem 3:1.`,
                      leaf.id,
                    );
                }
              }
              break;
            }
            case "rdform":
              for (const p of rdFieldParts(leaf)) {
                const color = String((leaf.fields as unknown as Record<string, unknown>)[p.key] ?? "");
                if (offPalette(color)) add(`pal-${leaf.id}-${p.key}`, "Paleta BB", `${leafLabel(leaf)}${p.part}: cor ${color} fora da paleta.`, leaf.id);
              }
              break;
            default:
              if (!isNewBlock(leaf)) break;
              for (const p of colorParts(leaf)) {
                const color = colorOf(leaf, p.key);
                const on = p.on ? hex6(colorOf(leaf, p.on)) : null;
                if (p.role === "text") checkText(leaf, p.part, color, on ? textContext([on]) : ctx);
                else if (p.role === "shape") checkShape(leaf, p.part, color, solidBg(ctx));
                else if (offPalette(color))
                  add(`pal-${leaf.id}-${p.key}`, "Paleta BB", `${leafLabel(leaf)}${p.part}: cor ${color} fora da paleta.`, leaf.id);
              }
              break;
          }
        }
    });
  });

  const logoHeader = headerWithLogo(page);
  if (logoHeader) {
    const bg = hex6(logoHeader.box.bgColor);
    if (!bg || !BB_LOGO_RULES.centralHorizontalBackgrounds.includes(bg) || (logoHeader.box.fillOpacity ?? 100) < 100)
      add(
        "logo-header-bg",
        "Logomarca BB",
        "Cabeçalho com a logomarca: fundo opaco em Amarelo institucional, Azul institucional ou Branco.",
        logoHeader.id,
      );
  }

  if (usesGoveCursor(page))
    add("cursor", "Paleta BB", "Cursor pronto da GOVE usa cores fora da paleta BB.");

  if (page.bbLogo?.src) {
    const logo = page.bbLogo;
    const bg = hex6(logo.bg);
    if (!bg || !BB_LOGO_RULES.centralHorizontalBackgrounds.includes(bg))
      add(
        "logo-bg",
        "Logomarca BB",
        "Logomarca só sobre Amarelo institucional, Azul institucional ou Branco.",
      );
    const min = BB_LOGO_RULES.minDigitalPx[logo.version] ?? 70;
    if (logo.width < min)
      add(
        "logo-min",
        "Logomarca BB",
        `Logomarca com ${logo.width}px — mínimo ${min}px para a versão ${LOGO_VERSIONS.find((v) => v.value === logo.version)?.label ?? logo.version}.`,
      );
  }

  return issues;
}

/* --------------------------------------------------------------- logomarca */

export const LOGO_VERSIONS: { value: BBLogo["version"]; label: string }[] = [
  { value: "horizontal", label: "Horizontal" },
  { value: "central", label: "Central" },
  { value: "simbolo", label: "Símbolo" },
];

export const defaultLogo = (): BBLogo => ({
  src: "",
  version: "horizontal",
  width: BB_LOGO_RULES.minDigitalPx["horizontal"] ?? 140,
  aspect: 4,
  bg: P.amareloInstitucional,
  align: "center",
});

/** Área de proteção x/2 (x = altura da logomarca) em todos os lados. */
export function logoLayout(logo: BBLogo) {
  const width = Math.max(BB_LOGO_RULES.minDigitalPx[logo.version] ?? 70, logo.width);
  const height = Math.round(width / (logo.aspect > 0 ? logo.aspect : 1));
  const clear = Math.ceil(height * BB_LOGO_RULES.clearSpace);
  return { width, height, clear };
}

/* ------------------------------------------------------- textos-modelo (voz BB) */

/** Textos-modelo no tom de voz BB: simples, relevante, humano e encorajador. */
export const BB_COPY = {
  heroTitle: "Seu próximo passo começa aqui",
  heroText: "Juntos, a gente simplifica a gestão do seu município. Veja como em poucos minutos.",
  splitTitle: "Gestão pública mais simples, para você e para a cidade",
  splitText: "Conheça o caminho que já ajuda municípios a planejar melhor.",
  formTitle: "Baixe o material gratuito",
  formText: "Preencha o formulário e receba o guia completo. É rápido e sem custo.",
  paragraph: "Conte aqui, em frases curtas, o que muda para a pessoa que lê.",
  button: "Quero conhecer",
  cardTitle: "Simples assim",
  cardText: "Explique em uma frase o que a pessoa ganha.",
  expired: "As inscrições terminaram. Fique de olho nas próximas!",
  videoTitle: "Vídeo institucional",
};

/** Valores-padrão de um bloco novo numa página BB (textos-modelo na voz BB). */
export function bbDefaults(leaf: Leaf): Leaf {
  switch (leaf.type) {
    case "text":
      return { ...leaf, content: leaf.tag === "p" ? BB_COPY.paragraph : leaf.content };
    case "button":
      return { ...leaf, label: BB_COPY.button };
    case "card":
      return {
        ...leaf,
        title: BB_COPY.cardTitle,
        description: BB_COPY.cardText,
        bgColor: P.amareloClaro,
        color: P.azulEscuro,
        iconColor: P.azulEscuro,
        borderWidth: 0,
      };
    case "countdown":
      return { ...leaf, expiredText: BB_COPY.expired };
    case "video":
      return { ...leaf, title: BB_COPY.videoTitle };
    default:
      return leaf;
  }
}
