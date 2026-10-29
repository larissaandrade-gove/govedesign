/**
 * Gerador de follow-ups: peças de comunicação interna/relacionamento em 1:1
 * (1080×1080), 5:4 (1350×1080) e Onepage (1920×1080), com as mesmas travas de marca do gerador de
 * criativos — fundos da biblioteca, textos só na paleta oficial com contraste
 * ≥ 4,5:1 e logomarca oficial escolhida pelo contraste do fundo real.
 *
 * Tipografia: Montserrat nos títulos, Inter no corpo.
 */
import { PALETTE } from "./brand";
import {
  BG_PRESETS,
  findOverlaps,
  withColorRecorder,
  type BgPreset,
  type ColorRecorder,
  type LayoutBox,
} from "./renderer";
import {
  BB_PALETTE,
  BB_PROTECTION,
  BB_TEXT_FONT,
  BB_TITLE_FONT,
  auditBB,
  bbLogoSize,
  bbScheme,
  drawBBLogo,
  pickShapeColor,
  pickTextColor,
  sampleHexes,
  textOn,
  type BBAudit,
  type BBLogoRender,
  type BBTextRecord,
  type Identity,
} from "./bb";
import {
  contrast,
  drawBrandLogo,
  kindForBox,
  logoBox,
  type LogoLibrary,
  type LogoRender,
  type LogoVariantId,
} from "./logos";

export type FollowupFormat = "1x1" | "5x4" | "onepage";
export type FollowupModel = "product" | "event";
export type FollowupMarker = "check" | "zap" | "arrow" | "dot" | "number";

export const FOLLOWUP_FORMATS: { key: FollowupFormat; label: string; w: number; h: number }[] = [
  { key: "1x1", label: "Quadrado 1:1 (1080x1080)", w: 1080, h: 1080 },
  { key: "5x4", label: "Horizontal 5:4 (1350x1080)", w: 1350, h: 1080 },
  { key: "onepage", label: "Onepage (1920x1080)", w: 1920, h: 1080 },
];

/** Formato padrão dos follow-ups (horizontal 5:4). */
export const DEFAULT_FOLLOWUP_FORMAT: FollowupFormat = "5x4";

/** Formatos antigos → o permitido mais próximo (estado salvo não quebra). */
const LEGACY_FOLLOWUP_FORMATS: Record<string, FollowupFormat> = {
  "4x3": "5x4",
  "square-11": "1x1",
  "square-1200": "1x1",
  "landscape-54": "5x4",
  "onepage-169": "onepage",
  "linkedin-191": "onepage",
};

/** Normaliza qualquer chave recebida para um formato de follow-up permitido. */
export function normalizeFollowupFormat(key: string | null | undefined): FollowupFormat {
  if (key && FOLLOWUP_FORMATS.some((f) => f.key === key)) return key as FollowupFormat;
  return (key && LEGACY_FOLLOWUP_FORMATS[key]) || DEFAULT_FOLLOWUP_FORMAT;
}

export const FOLLOWUP_MAX = {
  title: 60,
  item: 90,
  items: 5,
  name: 40,
  event: 90,
  kicker: 32,
  version: 32,
  cta: 36,
};

/** Paleta oficial liberada para texto nas peças de follow-up. */
export const FOLLOWUP_TEXT_COLORS = [
  "#FFC72C",
  "#3D0099",
  "#351F65",
  "#F4F4F4",
  "#2F3539",
  "#A278DA",
  "#5B6770",
  "#20133D",
  "#5AC2CD",
  "#16499F",
  "#FFFFFF",
] as const;

export type ProductUpdate = {
  title: string;
  items: string[];
  marker: FollowupMarker;
  version: string;
  cta: string;
};

export type EventConfirmation = {
  kicker: string;
  name: string;
  event: string;
  /** AAAA-MM-DD (input type=date). */
  date: string;
  /** HH:MM (opcional). */
  time: string;
  photo: HTMLImageElement | null;
};

export type FollowupSpec = {
  model: FollowupModel;
  format: FollowupFormat;
  bgPreset: string;
  product: ProductUpdate;
  event: EventConfirmation;
  logos: LogoLibrary | null;
  logoVariants?: LogoVariantId[] | undefined;
  renderScale?: number | undefined;
  /** Foto de fundo (ex.: Pexels). Recebe sobreposição da cor do fundo escolhido. */
  bgImage?: HTMLImageElement | null | undefined;
  /** Identidade visual: GOVE (padrão) ou Banco do Brasil. */
  identity?: Identity | undefined;
  /** Esquema BB (id de BB_SCHEMES) usado no modo Banco do Brasil. */
  bbScheme?: string | undefined;
  /** Arquivo oficial da logomarca BB (desenhado como enviado). */
  bbLogo?: HTMLImageElement | null | undefined;
};

export type FollowupCheck = { id: string; label: string; pass: boolean };
export type FollowupResult = {
  checks: FollowupCheck[];
  pass: boolean;
  logo: LogoRender | null;
  boxes: LayoutBox[];
  overlaps: [string, string][];
  /** Modo BB: verificação de contraste e paleta. */
  bb?: BBAudit | null;
  bbLogo?: BBLogoRender | null;
};

const GOVE_TITLE_FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";
const GOVE_BODY_FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const MIN_CONTRAST = 4.5;
/** Pisos de legibilidade (px no canvas de 1080 de altura). */
const MIN_TITLE = 44;
const MIN_BODY = 28;

/** Fontes usadas no canvas: carregue antes de desenhar. */
export const FOLLOWUP_FONTS = [
  `600 64px Montserrat`,
  `700 64px Montserrat`,
  `400 32px Inter`,
  `500 32px Inter`,
  `600 32px Inter`,
];

export async function loadFollowupFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(FOLLOWUP_FONTS.map((f) => document.fonts.load(f).catch(() => null)));
}

export function followupSize(key: FollowupFormat | string) {
  const k = normalizeFollowupFormat(key);
  return FOLLOWUP_FORMATS.find((f) => f.key === k)!;
}

/** Fundos da biblioteca usados nos follow-ups (roxo noite, roxo Gove, claro). */
export const FOLLOWUP_BGS: BgPreset[] = BG_PRESETS;

/* ---------- Cores por contraste ---------- */

/** Primeira cor candidata com contraste ≥ 4,5:1 contra TODAS as cores do fundo. */
function pickText(bgs: string[], candidates: string[]) {
  const score = (c: string) => Math.min(...bgs.map((b) => contrast(c, b)));
  const ok = candidates.find((c) => score(c) >= MIN_CONTRAST);
  return ok ?? candidates.reduce((a, b) => (score(b) > score(a) ? b : a));
}

function themeFor(bgs: string[], forceLight?: boolean) {
  const light = forceLight ?? bgs.every((c) => contrast(c, PALETTE.purple1) >= MIN_CONTRAST);
  const title = pickText(bgs, light ? ["#3D0099", "#20133D"] : ["#FFFFFF", "#F4F4F4"]);
  const body = pickText(bgs, light ? ["#2F3539", "#20133D"] : ["#F4F4F4", "#FFFFFF"]);
  const meta = pickText(bgs, light ? ["#5B6770", "#2F3539"] : ["#A278DA", "#F4F4F4"]);
  const accent = light ? "#3D0099" : "#FFC72C";
  const onAccent = light ? "#FFFFFF" : "#20133D";
  return { light, title, body, meta, accent, onAccent, bgs };
}

/* ---------- Desenho ---------- */

function paintPreset(ctx: CanvasRenderingContext2D, preset: BgPreset, W: number, H: number) {
  const [a, b] = preset.colors;
  if (preset.kind === "solid") {
    ctx.fillStyle = a;
  } else if (preset.kind === "radial") {
    ctx.fillStyle = b;
    ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(
      W * 0.5,
      H * 0.32,
      W * 0.05,
      W * 0.5,
      H * 0.32,
      Math.max(W, H) * 0.85,
    );
    rg.addColorStop(0, a);
    rg.addColorStop(1, b);
    ctx.fillStyle = rg;
  } else {
    const g =
      preset.kind === "diagonal"
        ? ctx.createLinearGradient(0, 0, W, H)
        : ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, W, H);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const GLYPHS: Record<string, string[]> = {
  check: ["M20 6 9 17l-5-5"],
  zap: ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"],
  arrow: ["M5 12h14", "m12 5 7 7-7 7"],
  user: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8"],
  calendar: [
    "M8 2v4",
    "M16 2v4",
    "M3 10h18",
    "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  ],
};

function glyph(
  ctx: CanvasRenderingContext2D,
  key: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
  width = 2.4,
) {
  const paths = GLYPHS[key];
  if (!paths) return;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of paths) ctx.stroke(new Path2D(d));
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Corta em `max` linhas com reticências. */
function clampLines(ctx: CanvasRenderingContext2D, lines: string[], max: number, maxWidth: number) {
  if (lines.length <= max) return { lines, clipped: false };
  const out = lines.slice(0, max);
  let last = out[max - 1]!;
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  out[max - 1] = `${last.trimEnd()}…`;
  return { lines: out, clipped: true };
}

/** Maior fonte (de `max` até `min`) em que o texto cabe em `maxLines`. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  maxWidth: number,
  maxLines: number,
  max: number,
  min: number,
) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines, clipped: false };
  }
  ctx.font = font(min);
  return { size: min, ...clampLines(ctx, wrap(ctx, text, maxWidth), maxLines, maxWidth) };
}

export function formatEventDate(date: string, time: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  let out = "";
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    out = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  } else out = date.trim();
  const t = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (t) out += `${out ? " · " : ""}${Number(t[1])}h${t[2] === "00" ? "" : t[2]}`;
  return out;
}

/* ---------- Foto de fundo com sobreposição ---------- */

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.max(W / iw, H / ih);
  const w = iw * s;
  const h = ih * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

/**
 * Aplica sobreposição (roxo noite ou branco, conforme o fundo escolhido) com a
 * menor opacidade que garante contraste ≥ 4,5:1 dos textos sobre TODOS os
 * pixels amostrados da foto. Retorna as cores extremas resultantes.
 */
function overlayForText(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scale: number,
  light: boolean,
): string[] {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  let data: Uint8ClampedArray | null = null;
  try {
    data = ctx.getImageData(0, 0, cw, ch).data;
  } catch {
    data = null;
  }
  const samples: [number, number, number][] = [];
  if (data) {
    const step = Math.max(1, Math.round(Math.min(cw, ch) / 40));
    for (let y = 0; y < ch; y += step)
      for (let x = 0; x < cw; x += step) {
        const i = (y * cw + x) * 4;
        samples.push([data[i]!, data[i + 1]!, data[i + 2]!]);
      }
  }
  const overlay = light ? [255, 255, 255] : [0x20, 0x13, 0x3d];
  const texts = light ? ["#3D0099", "#2F3539"] : ["#FFFFFF", "#F4F4F4", "#FFC72C"];
  let alpha = 0.95;
  let extremes = [light ? "#FFFFFF" : "#20133D"];
  for (let a = 0.7; a <= 0.951; a += 0.05) {
    const comp = samples.map(
      ([r, g, b]) =>
        [
          a * overlay[0]! + (1 - a) * r,
          a * overlay[1]! + (1 - a) * g,
          a * overlay[2]! + (1 - a) * b,
        ] as const,
    );
    const hexes = comp.map(([r, g, b]) => toHex(r, g, b));
    const ok =
      !hexes.length || texts.every((t) => hexes.every((h) => contrast(t, h) >= MIN_CONTRAST));
    if (ok || a >= 0.95) {
      alpha = a;
      // Pior caso: as cores mais clara e mais escura após a sobreposição.
      const byLum = [...hexes].sort((x, y) => contrast(x, "#000000") - contrast(y, "#000000"));
      extremes = byLum.length ? [byLum[0]!, byLum[byLum.length - 1]!] : extremes;
      break;
    }
  }
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = `rgba(${overlay[0]}, ${overlay[1]}, ${overlay[2]}, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  return extremes;
}

/* ---------- Render com resolvedor de sobreposição ---------- */

/**
 * Escada de ajustes (do mais leve ao mais forte). Prioridade dos elementos:
 *   logo · título/nome · foto (obrigatórios) > itens / evento > data > CTA
 *   > versão/data do produto > chamada (kicker).
 * Produto: título no mínimo → itens em 1 linha → sem versão → sem CTA → itens
 *          finais omitidos. Evento: foto menor → evento em menos linhas → sem
 *          chamada → foto mínima.
 */
const FOLLOWUP_LADDER = [0, 1, 2, 3, 4, 5, 6] as const;

export function renderFollowup(canvas: HTMLCanvasElement, spec: FollowupSpec): FollowupResult {
  const { w, h } = followupSize(spec.format);
  let last: FollowupResult | null = null;
  for (const level of FOLLOWUP_LADDER) {
    last =
      spec.identity === "bb"
        ? withColorRecorder(canvas, (rec) => renderFollowupOnce(canvas, spec, level, rec))
        : renderFollowupOnce(canvas, spec, level);
    if (!last.overlaps.length) break;
  }
  void w;
  void h;
  return last!;
}

function renderFollowupOnce(
  canvas: HTMLCanvasElement,
  spec: FollowupSpec,
  level: number,
  recorder?: ColorRecorder,
): FollowupResult {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D indisponível");
  const { w: W, h: H } = followupSize(spec.format);
  const RS = Math.max(0.1, Math.min(1, spec.renderScale ?? 1));
  canvas.width = Math.round(W * RS);
  canvas.height = Math.round(H * RS);
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const bb = spec.identity === "bb" ? bbScheme(spec.bbScheme) : null;
  const TITLE_FONT = bb ? BB_TITLE_FONT : GOVE_TITLE_FONT;
  const BODY_FONT = bb ? BB_TEXT_FONT : GOVE_BODY_FONT;
  // Pesos: Gove usa Montserrat 700 nos títulos e Inter até 600; BB mantém os seus.
  const TITLE_W = bb ? 800 : 700;
  const BODY_STRONG_W = bb ? 700 : 600;
  const preset = BG_PRESETS.find((p) => p.key === spec.bgPreset) ?? BG_PRESETS[0]!;
  const presetLight = themeFor(preset.colors).light;
  let t = themeFor(preset.colors);
  if (bb) {
    // BB: foto sem véu (nada fora da paleta) ou cor sólida do esquema; cada
    // texto escolhe a cor pelos pixels reais sob ele (R1).
    if (spec.bgImage) drawCoverImage(ctx, spec.bgImage, W, H);
    else {
      ctx.fillStyle = bb.bg;
      ctx.fillRect(0, 0, W, H);
    }
    t = {
      light: true,
      title: bb.title,
      body: bb.text,
      meta: bb.text,
      accent: bb.button,
      onAccent: bb.buttonText,
      bgs: [bb.bg],
    };
  } else if (spec.bgImage) {
    drawCoverImage(ctx, spec.bgImage, W, H);
    const extremes = overlayForText(ctx, W, H, RS, presetLight);
    t = themeFor(extremes, presetLight);
  } else {
    paintPreset(ctx, preset, W, H);
  }

  const M = W > H ? 96 : 88;
  const checks: FollowupCheck[] = [];
  const textPairs: [string, string, string[]][] = [];
  const boxes: LayoutBox[] = [];
  const reg = (id: string, x: number, y: number, w: number, h: number) => {
    if (w > 0 && h > 0) boxes.push({ id, x, y, w, h });
  };
  const ink = (text: string, x: number, y: number) => {
    const m = ctx.measureText(text);
    return {
      x: x - m.actualBoundingBoxLeft,
      y: y - m.actualBoundingBoxAscent,
      w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
      h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    };
  };
  const regUnion = (id: string, list: { x: number; y: number; w: number; h: number }[]) => {
    if (!list.length) return;
    const x0 = Math.min(...list.map((b) => b.x));
    const y0 = Math.min(...list.map((b) => b.y));
    reg(
      id,
      x0,
      y0,
      Math.max(...list.map((b) => b.x + b.w)) - x0,
      Math.max(...list.map((b) => b.y + b.h)) - y0,
    );
  };
  let fitsOk = true;
  let sizesOk = true;
  let omitted = 0;
  let logo: LogoRender | null = null;
  let bbLogo: BBLogoRender | null = null;

  type Box = { x: number; y: number; w: number; h: number };
  const bbTexts: BBTextRecord[] = [];
  const unionOf = (list: Box[]): Box => {
    const x0 = Math.min(...list.map((b) => b.x));
    const y0 = Math.min(...list.map((b) => b.y));
    return {
      x: x0,
      y: y0,
      w: Math.max(...list.map((b) => b.x + b.w)) - x0,
      h: Math.max(...list.map((b) => b.y + b.h)) - y0,
    };
  };
  /** BB (R1): cor do texto pelos pixels sob ele; sem par, proteção Azul escuro + Branco. */
  const bbText = (id: string, list: Box[], preferred?: string, pad = 12): string => {
    const u = unionOf(list);
    const pick = pickTextColor(sampleHexes(ctx, u, RS), preferred);
    if (pick.protect) {
      ctx.save();
      ctx.fillStyle = BB_PROTECTION.bg;
      roundRect(ctx, u.x - pad, u.y - pad, u.w + pad * 2, u.h + pad * 2, pad + 6);
      ctx.fill();
      ctx.restore();
    }
    bbTexts.push({ id, color: pick.color, bgs: pick.bgs, protect: pick.protect });
    return pick.color;
  };
  const bbShape = (b: Box, prefs: string[]) => pickShapeColor(sampleHexes(ctx, b, RS), prefs);
  /** Cor do texto: GOVE usa o tema; BB amostra o fundo real. */
  const textColor = (id: string, list: Box[], gove: string, preferred?: string) =>
    bb ? bbText(id, list, preferred) : gove;

  /** Tamanho da logo aplicada (BB oficial, quando enviada no modo BB; senão GOVE). */
  const logoDims = (h: number) => {
    if (bb && spec.bbLogo) return bbLogoSize(spec.bbLogo, h, W * 0.4);
    const box = logoBox("logotipo", h);
    const kind = kindForBox(box.w, box.h);
    return kind === "logotipo" ? box : logoBox("simbolo", h);
  };

  const drawLogo = (x: number, y: number, h: number) => {
    if (bb && spec.bbLogo) {
      // Logomarca BB como enviada (nunca recolorida); área de proteção = h/2.
      bbLogo = drawBBLogo(ctx, spec.bbLogo, x, y, h, RS, W * 0.4);
      const clear = bbLogo.h / 2;
      reg("logo", x - clear, y - clear, bbLogo.w + clear * 2, bbLogo.h + clear * 2);
      return { w: bbLogo.w, h: bbLogo.h };
    }
    const box = logoBox("logotipo", h);
    const kind = kindForBox(box.w, box.h);
    const b = kind === "logotipo" ? box : logoBox("simbolo", h);
    logo = drawBrandLogo(ctx, spec.logos, {
      x,
      y,
      w: b.w,
      h: b.h,
      kind,
      scale: RS,
      allowed: spec.logoVariants,
      plates: bb ? [BB_PALETTE.azulEscuro, BB_PALETTE.branco] : undefined,
    });
    const pad = logo.plate ? Math.round(b.h * 0.28) : 0;
    reg("logo", x - pad, y - pad, b.w + pad * 2, b.h + pad * 2);
    return b;
  };

  if (spec.model === "product") {
    const p = spec.product;
    const square = W === H;
    const logoH = 60;
    const lb = drawLogo(M, M, logoH);
    const version = level >= 3 ? "" : p.version.trim();
    if (p.version.trim() && !version) omitted++;
    if (version) {
      let vs = MIN_BODY;
      const vw = bb ? 500 : 600;
      ctx.font = `${vw} ${vs}px ${BODY_FONT}`;
      // Versão longa: reduz até caber ao lado do logo (sem passar do piso de leitura).
      const room = W - M * 2 - lb.w - 32 - (bbLogo ? lb.h / 2 : 0);
      while (ctx.measureText(version).width > room && vs > 22) {
        vs -= 1;
        ctx.font = `${vw} ${vs}px ${BODY_FONT}`;
      }
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textColor("Versão/data", [ink(version, W - M, M + logoH / 2)], t.meta, bb?.text);
      ctx.fillText(version, W - M, M + logoH / 2);
      regUnion("versão", [ink(version, W - M, M + logoH / 2)]);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      textPairs.push(["Versão/data", t.meta, t.bgs]);
    }

    const contentW = W - M * 2;
    let y = M + logoH + (square ? 56 : 64);
    const titleMax = level >= 1 ? MIN_TITLE + 8 : square ? 68 : 76;
    const title = fit(
      ctx,
      p.title.trim() || "Novidades",
      (s) => `${TITLE_W} ${s}px ${TITLE_FONT}`,
      contentW,
      2,
      titleMax,
      MIN_TITLE,
    );
    if (title.clipped) fitsOk = false;
    ctx.font = `${TITLE_W} ${title.size}px ${TITLE_FONT}`;
    ctx.fillStyle = bb
      ? bbText(
          "Título",
          title.lines.map((line, i) => ink(line, M, y + i * title.size * 1.12)),
          bb.title,
        )
      : t.title;
    const tInk: { x: number; y: number; w: number; h: number }[] = [];
    for (const line of title.lines) {
      ctx.fillText(line, M, y);
      tInk.push(ink(line, M, y));
      y += title.size * 1.12;
    }
    regUnion("título", tInk);
    textPairs.push(["Título", t.title, t.bgs]);
    y += 20;
    ctx.fillStyle = bb ? bbShape({ x: M, y, w: 96, h: 8 }, [bb.accent, bb.button]) : t.accent;
    roundRect(ctx, M, y, 96, 8, 4);
    ctx.fill();
    reg("faixa", M, y, 96, 8);
    y += 8 + (square ? 40 : 48);

    const cta = level >= 4 ? "" : p.cta.trim();
    if (p.cta.trim() && !cta) omitted++;
    const ctaFont = 32;
    const ctaPadX = 32;
    const ctaH = 76;
    const bottom = H - M - (cta ? ctaH + 36 : 0);

    // Itens: maior fonte que cabe; depois 1 linha por item; por fim omite os finais.
    let items = p.items
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, FOLLOWUP_MAX.items);
    const maxItemLines = level >= 2 ? 1 : 2;
    const iconFor = (s: number) => Math.round(s * 1.45);
    const measure = (list: string[], size: number) => {
      const icon = iconFor(size);
      const textW = contentW - icon - 28;
      ctx.font = `500 ${size}px ${BODY_FONT}`;
      const rows = list.map((it) => {
        const { lines, clipped } = clampLines(ctx, wrap(ctx, it, textW), maxItemLines, textW);
        if (clipped) fitsOk = false;
        return { lines, h: Math.max(icon, size * 1.3) + (lines.length - 1) * size * 1.3 };
      });
      const total =
        rows.reduce((acc, l) => acc + l.h, 0) + Math.max(0, list.length - 1) * size * 0.75;
      return { rows, total };
    };
    let size = square ? 38 : 40;
    let layout = measure(items, size);
    while (layout.total > bottom - y && size > MIN_BODY) {
      size -= 2;
      layout = measure(items, size);
    }
    while (layout.total > bottom - y && items.length > 1 && level >= 5) {
      items = items.slice(0, -1);
      omitted++;
      layout = measure(items, size);
    }
    const icon = iconFor(size);
    items.forEach((_, i) => {
      const l = layout.rows[i]!;
      const lineH = size * 1.3;
      const cy = y + Math.max(icon, lineH) / 2;
      const cx = M + icon / 2;
      const markerBox = { x: M, y: cy - icon / 2, w: icon, h: icon };
      const markerFill = bb ? bbShape(markerBox, [bb.button, bb.accent]) : t.accent;
      if (p.marker === "dot") {
        ctx.fillStyle = markerFill;
        ctx.beginPath();
        ctx.arc(cx, cy, icon * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = markerFill;
        ctx.beginPath();
        ctx.arc(cx, cy, icon / 2, 0, Math.PI * 2);
        ctx.fill();
        // Símbolo sobre o marcador: par aprovado com a cor do marcador.
        const onMarker = bb ? textOn(markerFill, bb.buttonText) : t.onAccent;
        if (p.marker === "number") {
          ctx.font = `700 ${Math.round(icon * 0.5)}px ${TITLE_FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = bb
            ? bbText(`número ${i + 1}`, [ink(String(i + 1), cx, cy + 1)], onMarker)
            : t.onAccent;
          ctx.fillText(String(i + 1), cx, cy + 1);
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
        } else {
          glyph(ctx, p.marker, cx, cy, icon * 0.56, onMarker, 3);
        }
      }
      ctx.font = `500 ${size}px ${BODY_FONT}`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = bb
        ? bbText(
            `Item ${i + 1}`,
            l.lines.map((line, k) => ink(line, M + icon + 28, cy + k * lineH + 1)),
            bb.text,
            8,
          )
        : t.body;
      const rowInk = [{ x: M, y: cy - icon / 2, w: icon, h: icon }];
      l.lines.forEach((line, k) => {
        ctx.fillText(line, M + icon + 28, cy + k * lineH + 1);
        rowInk.push(ink(line, M + icon + 28, cy + k * lineH + 1));
      });
      ctx.textBaseline = "top";
      regUnion(`item ${i + 1}`, rowInk);
      y += l.h + size * 0.75;
    });
    if (items.length) textPairs.push(["Itens", t.body, t.bgs]);
    if (size < MIN_BODY) sizesOk = false;

    if (cta) {
      ctx.font = `${BODY_STRONG_W} ${ctaFont}px ${BODY_FONT}`;
      const tw = ctx.measureText(cta).width;
      const bw = Math.min(contentW, tw + ctaPadX * 2 + 44);
      const by = H - M - ctaH;
      const ctaFill = bb ? bbShape({ x: M, y: by, w: bw, h: ctaH }, [bb.button]) : t.accent;
      ctx.fillStyle = ctaFill;
      roundRect(ctx, M, by, bw, ctaH, ctaH / 2);
      ctx.fill();
      reg("cta", M, by, bw, ctaH);
      ctx.textBaseline = "middle";
      const ctaInk = ink(cta, M + ctaPadX, by + ctaH / 2 + 1);
      const ctaFg = bb
        ? bbText(
            "CTA",
            [
              { ...ctaInk, w: Math.min(ctaInk.w, bw - ctaPadX * 2 - 44) },
              { x: M + bw - ctaPadX - 29, y: by + ctaH / 2 - 15, w: 30, h: 30 },
            ],
            bb.buttonText,
          )
        : t.onAccent;
      ctx.fillStyle = ctaFg;
      ctx.fillText(cta, M + ctaPadX, by + ctaH / 2 + 1, bw - ctaPadX * 2 - 44);
      ctx.textBaseline = "top";
      glyph(ctx, "arrow", M + bw - ctaPadX - 14, by + ctaH / 2, 30, ctaFg, 2.6);
      textPairs.push(["CTA", ctaFg, [ctaFill]]);
    }
  } else {
    const e = spec.event;
    const square = W === H;
    const shrink = level >= 4 ? 0.7 : level >= 1 ? 0.84 : 1;
    const D = Math.round((square ? 360 : 500) * shrink);
    const ring = square ? 12 : 14;
    const name = e.name.trim() || "Nome do colaborador";
    const kicker = level >= 3 ? "" : e.kicker.trim();
    if (e.kicker.trim() && !kicker) omitted++;
    const when = formatEventDate(e.date, e.time);

    const textW = square ? W - M * 2 : W - (M + 20 + D + 88) - M;
    const kickerSize = 28;
    const nameFit = fit(
      ctx,
      name,
      (s) => `${TITLE_W} ${s}px ${TITLE_FONT}`,
      textW,
      square ? 1 : 2,
      square ? 60 : 72,
      MIN_TITLE,
    );
    const eventLines = Math.max(1, (square ? 2 : 3) - (level >= 2 ? 1 : 0));
    const eventFit = fit(
      ctx,
      e.event.trim(),
      (s) => `500 ${s}px ${BODY_FONT}`,
      textW,
      eventLines,
      square ? 34 : 40,
      MIN_BODY,
    );
    if (nameFit.clipped || eventFit.clipped) fitsOk = false;
    const pillH = 64;
    const blockH =
      (kicker ? kickerSize + 20 : 0) +
      nameFit.lines.length * nameFit.size * 1.12 +
      (eventFit.lines.length ? 16 + eventFit.lines.length * eventFit.size * 1.3 : 0) +
      (when ? 32 + pillH : 0);

    let cx: number;
    let cy: number;
    let textX: number;
    let align: CanvasTextAlign;
    let y: number;
    if (square) {
      const logoH = 56;
      const lb = bb ? logoDims(logoH) : logoBox("logotipo", logoH);
      const lh = Math.max(logoH, lb.h);
      const stack = lh + 48 + D + ring * 2 + 36 + blockH;
      const top = Math.max(M - 16, (H - stack) / 2);
      drawLogo((W - lb.w) / 2, top, logoH);
      cx = W / 2;
      cy = top + lh + 48 + ring + D / 2;
      textX = W / 2;
      align = "center";
      y = cy + D / 2 + ring + 36;
    } else {
      const logoH = 60;
      drawLogo(M, M, logoH);
      // Abaixo do logo, centrado na área restante.
      const areaTop = M + logoH + 40;
      const areaH = H - M - areaTop;
      cx = M + 20 + D / 2;
      cy = areaTop + areaH / 2;
      textX = M + 20 + D + 88;
      align = "left";
      y = Math.max(areaTop, areaTop + (areaH - blockH) / 2);
    }

    // Moldura (anel) BB: cor da paleta com ≥ 3:1 contra o fundo ao redor da foto.
    const ringColor = bb
      ? bbShape(
          { x: cx - D / 2 - ring, y: cy - D / 2 - ring, w: D + ring * 2, h: D + ring * 2 },
          [bb.accent, bb.button],
        )
      : t.accent;
    // Moldura circular: foto (recorte central, sem distorção) ou placeholder neutro.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, D / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (e.photo) {
      const img = e.photo;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const side = Math.min(iw, ih);
      ctx.drawImage(
        img,
        (iw - side) / 2,
        (ih - side) / 2,
        side,
        side,
        cx - D / 2,
        cy - D / 2,
        D,
        D,
      );
    } else {
      ctx.fillStyle = bb ? BB_PALETTE.amareloClaro : PALETTE.supportLight;
      ctx.fillRect(cx - D / 2, cy - D / 2, D, D);
      glyph(ctx, "user", cx, cy, D * 0.46, bb ? BB_PALETTE.azulEscuro : PALETTE.supportMid, 1.6);
    }
    ctx.restore();
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = ring;
    ctx.beginPath();
    ctx.arc(cx, cy, D / 2 + ring / 2, 0, Math.PI * 2);
    ctx.stroke();
    reg("foto", cx - D / 2 - ring, cy - D / 2 - ring, D + ring * 2, D + ring * 2);

    ctx.textAlign = align;
    if (kicker) {
      ctx.font = `${BODY_STRONG_W} ${kickerSize}px ${BODY_FONT}`;
      const kc = bb
        ? bbText("Chamada", [ink(kicker.toUpperCase(), textX, y)], bb.accent)
        : t.light
          ? t.title
          : PALETTE.gold;
      ctx.fillStyle = kc;
      ctx.fillText(kicker.toUpperCase(), textX, y, textW);
      regUnion("chamada", [ink(kicker.toUpperCase(), textX, y)]);
      textPairs.push(["Chamada", kc, t.bgs]);
      y += kickerSize + 20;
    }
    ctx.font = `${TITLE_W} ${nameFit.size}px ${TITLE_FONT}`;
    ctx.fillStyle = bb
      ? bbText(
          "Nome",
          nameFit.lines.map((line, i) => ink(line, textX, y + i * nameFit.size * 1.12)),
          bb.title,
        )
      : t.title;
    const nInk: { x: number; y: number; w: number; h: number }[] = [];
    for (const line of nameFit.lines) {
      ctx.fillText(line, textX, y);
      nInk.push(ink(line, textX, y));
      y += nameFit.size * 1.12;
    }
    regUnion("nome", nInk);
    textPairs.push(["Nome", t.title, t.bgs]);
    if (eventFit.lines.length) {
      y += 16;
      ctx.font = `500 ${eventFit.size}px ${BODY_FONT}`;
      ctx.fillStyle = bb
        ? bbText(
            "Evento",
            eventFit.lines.map((line, i) => ink(line, textX, y + i * eventFit.size * 1.3)),
            bb.text,
          )
        : t.body;
      const eInk: { x: number; y: number; w: number; h: number }[] = [];
      for (const line of eventFit.lines) {
        ctx.fillText(line, textX, y);
        eInk.push(ink(line, textX, y));
        y += eventFit.size * 1.3;
      }
      regUnion("evento", eInk);
      textPairs.push(["Evento", t.body, t.bgs]);
    }
    if (when) {
      y += 32;
      ctx.font = `${BODY_STRONG_W} 30px ${BODY_FONT}`;
      const tw = ctx.measureText(when).width;
      const pw = Math.min(textW, tw + 40 + 36 + 16);
      const px = align === "center" ? textX - pw / 2 : textX;
      const pillFill = bb ? bbShape({ x: px, y, w: pw, h: pillH }, [bb.button]) : t.accent;
      ctx.fillStyle = pillFill;
      roundRect(ctx, px, y, pw, pillH, pillH / 2);
      ctx.fill();
      reg("data", px, y, pw, pillH);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const wInk = ink(when, px + 20 + 36 + 16, y + pillH / 2 + 1);
      const pillFg = bb
        ? bbText(
            "Data",
            [
              { ...wInk, w: Math.min(wInk.w, pw - 92) },
              { x: px + 22, y: y + pillH / 2 - 16, w: 32, h: 32 },
            ],
            bb.buttonText,
          )
        : t.onAccent;
      glyph(ctx, "calendar", px + 20 + 18, y + pillH / 2, 32, pillFg, 2.4);
      ctx.fillStyle = pillFg;
      ctx.fillText(when, px + 20 + 36 + 16, y + pillH / 2 + 1, pw - 92);
      ctx.textBaseline = "top";
      textPairs.push(["Data", pillFg, [pillFill]]);
    }
    ctx.textAlign = "left";
    if (nameFit.size < MIN_TITLE || eventFit.size < MIN_BODY) sizesOk = false;
  }

  const overlaps = findOverlaps(boxes, W, H);

  // Checagens de marca
  const bbAudit = bb && recorder ? auditBB(bbTexts, recorder.colors) : null;
  if (bbAudit && recorder!.alphas.some((a) => a < 1)) {
    bbAudit.offPalette.push("opacidade < 100%");
    bbAudit.pass = false;
  }
  if (bbAudit) {
    const badBB = bbAudit.texts.filter((r) => !r.pass);
    const worst = bbAudit.texts.length ? Math.min(...bbAudit.texts.map((r) => r.min)) : 0;
    checks.push({
      id: "contrast",
      label: badBB.length
        ? `Contraste < 4,5:1 em: ${badBB.map((b) => b.id).join(", ")}`
        : `Textos com contraste ≥ 4,5:1 (mín. ${worst.toFixed(2).replace(".", ",")}:1)${bbAudit.fixed ? ` · ${bbAudit.fixed} com proteção` : ""}`,
      pass: !badBB.length,
    });
    checks.push({
      id: "palette",
      label: bbAudit.offPalette.length
        ? `Cores fora da paleta BB: ${bbAudit.offPalette.join(", ")}`
        : "Cores dentro da paleta BB",
      pass: !bbAudit.offPalette.length,
    });
  } else {
  const allowed = FOLLOWUP_TEXT_COLORS.map((c) => c.toUpperCase());
  const bad = textPairs.filter(
    ([, fg, bgs]) => Math.min(...bgs.map((b) => contrast(fg, b))) < MIN_CONTRAST,
  );
  checks.push({
    id: "contrast",
    label: bad.length
      ? `Contraste < 4,5:1 em: ${bad.map((b) => b[0]).join(", ")}`
      : "Textos com contraste ≥ 4,5:1",
    pass: !bad.length,
  });
  checks.push({
    id: "palette",
    label: "Textos na paleta oficial",
    pass: textPairs.every(([, fg]) => allowed.includes(fg.toUpperCase())),
  });
  }
  checks.push({
    id: "overlap",
    label: overlaps.length
      ? `Sem sobreposição de elementos (${overlaps.map(([a, b]) => `${a} × ${b}`).join(", ")})`
      : "Sem sobreposição de elementos",
    pass: !overlaps.length,
  });
  checks.push({
    id: "fit",
    label:
      fitsOk && !omitted
        ? "Textos cabem na peça"
        : omitted
          ? `Texto longo demais: ${omitted} elemento(s) omitido(s) para não sobrepor`
          : "Texto longo demais: foi cortado",
    pass: fitsOk && !omitted,
  });
  checks.push({ id: "size", label: "Tamanhos mínimos de leitura", pass: sizesOk });
  const lg = logo as LogoRender | null;
  const bl = bbLogo as BBLogoRender | null;
  if (bl) {
    checks.push({
      id: "logo",
      label: bl.minWidthOk
        ? "Logomarca BB (arquivo oficial) aplicada sem alterações"
        : "Logomarca BB abaixo da largura mínima digital",
      pass: bl.minWidthOk,
    });
  } else
  checks.push({
    id: "logo",
    label: lg?.drawn
      ? `Logomarca ${bb ? "GOVE" : "oficial"} com contraste ${lg.minContrast.toFixed(1).replace(".", ",")}:1${lg.plate ? " (sobre placa)" : ""}`
      : "Logomarca oficial carregada",
    pass: !!lg?.drawn && lg.ok,
  });
  if (spec.model === "event") {
    checks.push({
      id: "photo",
      label: spec.event.photo ? "Foto do colaborador enviada" : "Envie a foto do colaborador",
      pass: !!spec.event.photo,
    });
  }
  return {
    checks,
    pass: checks.every((c) => c.pass),
    logo: lg,
    boxes,
    overlaps,
    bb: bbAudit,
    bbLogo: bl,
  };
}
