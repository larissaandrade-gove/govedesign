/**
 * Gerador de follow-ups: peças de comunicação interna/relacionamento em 4:3
 * (1440×1080) e 1:1 (1080×1080), com as mesmas travas de marca do gerador de
 * criativos — fundos da biblioteca, textos só na paleta oficial com contraste
 * ≥ 4,5:1 e logomarca oficial escolhida pelo contraste do fundo real.
 *
 * Tipografia: Montserrat nos títulos, Inter no corpo.
 */
import { PALETTE } from "./brand";
import { BG_PRESETS, type BgPreset } from "./renderer";
import {
  contrast,
  drawBrandLogo,
  kindForBox,
  logoBox,
  type LogoLibrary,
  type LogoRender,
  type LogoVariantId,
} from "./logos";

export type FollowupFormat = "4x3" | "1x1";
export type FollowupModel = "product" | "event";
export type FollowupMarker = "check" | "zap" | "arrow" | "dot" | "number";

export const FOLLOWUP_FORMATS: { key: FollowupFormat; label: string; w: number; h: number }[] = [
  { key: "4x3", label: "4:3 (1440x1080)", w: 1440, h: 1080 },
  { key: "1x1", label: "1:1 (1080x1080)", w: 1080, h: 1080 },
];

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
};

export type FollowupCheck = { id: string; label: string; pass: boolean };
export type FollowupResult = { checks: FollowupCheck[]; pass: boolean; logo: LogoRender | null };

const TITLE_FONT = "Montserrat, Archivo, 'Helvetica Neue', Arial, sans-serif";
const BODY_FONT = "Inter, Archivo, 'Helvetica Neue', Arial, sans-serif";
const MIN_CONTRAST = 4.5;
/** Pisos de legibilidade (px no canvas de 1080 de altura). */
const MIN_TITLE = 44;
const MIN_BODY = 28;

/** Fontes usadas no canvas: carregue antes de desenhar. */
export const FOLLOWUP_FONTS = [
  `800 64px Montserrat`,
  `700 64px Montserrat`,
  `400 32px Inter`,
  `500 32px Inter`,
  `600 32px Inter`,
  `700 32px Inter`,
];

export async function loadFollowupFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(FOLLOWUP_FONTS.map((f) => document.fonts.load(f).catch(() => null)));
}

export function followupSize(key: FollowupFormat) {
  return FOLLOWUP_FORMATS.find((f) => f.key === key) ?? FOLLOWUP_FORMATS[0]!;
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

function themeFor(preset: BgPreset) {
  const bgs = preset.colors;
  const light = bgs.every((c) => contrast(c, PALETTE.purple1) >= MIN_CONTRAST);
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

export function renderFollowup(canvas: HTMLCanvasElement, spec: FollowupSpec): FollowupResult {
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

  const preset = BG_PRESETS.find((p) => p.key === spec.bgPreset) ?? BG_PRESETS[0]!;
  const t = themeFor(preset);
  paintPreset(ctx, preset, W, H);

  const M = spec.format === "4x3" ? 96 : 88;
  const checks: FollowupCheck[] = [];
  const textPairs: [string, string, string[]][] = [];
  let fitsOk = true;
  let sizesOk = true;
  let logo: LogoRender | null = null;

  const drawLogo = (x: number, y: number, h: number, maxW?: number) => {
    const box = logoBox("logotipo", h, maxW);
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
    });
    return b;
  };

  if (spec.model === "product") {
    const p = spec.product;
    const square = spec.format === "1x1";
    // Topo: logo à esquerda, versão/data à direita.
    const logoH = 60;
    drawLogo(M, M, logoH);
    if (p.version.trim()) {
      ctx.font = `600 ${MIN_BODY}px ${BODY_FONT}`;
      ctx.fillStyle = t.meta;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(p.version.trim(), W - M, M + logoH / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      textPairs.push(["Versão/data", t.meta, t.bgs]);
    }

    const contentW = W - M * 2;
    let y = M + logoH + (square ? 56 : 64);
    // Título
    const title = fit(
      ctx,
      p.title.trim() || "Novidades",
      (s) => `800 ${s}px ${TITLE_FONT}`,
      contentW,
      2,
      square ? 68 : 76,
      MIN_TITLE,
    );
    if (title.clipped) fitsOk = false;
    ctx.fillStyle = t.title;
    ctx.font = `800 ${title.size}px ${TITLE_FONT}`;
    for (const line of title.lines) {
      ctx.fillText(line, M, y);
      y += title.size * 1.12;
    }
    textPairs.push(["Título", t.title, t.bgs]);
    // Faixa de acento sob o título
    y += 20;
    ctx.fillStyle = t.accent;
    roundRect(ctx, M, y, 96, 8, 4);
    ctx.fill();
    y += 8 + (square ? 40 : 48);

    // CTA (opcional) reserva a base
    const cta = p.cta.trim();
    const ctaFont = 32;
    const ctaPadX = 32;
    const ctaH = 76;
    const bottom = H - M - (cta ? ctaH + 36 : 0);

    // Itens: maior fonte que cabe no espaço disponível
    const items = p.items
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, FOLLOWUP_MAX.items);
    let size = square ? 38 : 40;
    let layout: { lines: string[]; h: number }[] = [];
    const iconFor = (s: number) => Math.round(s * 1.45);
    for (; size >= MIN_BODY; size -= 2) {
      const icon = iconFor(size);
      const textW = contentW - icon - 28;
      ctx.font = `500 ${size}px ${BODY_FONT}`;
      layout = items.map((it) => {
        const { lines } = clampLines(ctx, wrap(ctx, it, textW), 2, textW);
        return { lines, h: Math.max(icon, size * 1.3) + (lines.length - 1) * size * 1.3 };
      });
      const total =
        layout.reduce((acc, l) => acc + l.h, 0) + Math.max(0, items.length - 1) * size * 0.75;
      if (total <= bottom - y) break;
    }
    if (size < MIN_BODY) {
      size = MIN_BODY;
      fitsOk = false;
    }
    const icon = iconFor(size);
    ctx.font = `500 ${size}px ${BODY_FONT}`;
    items.forEach((_, i) => {
      const l = layout[i]!;
      const lineH = size * 1.3;
      const cy = y + Math.max(icon, lineH) / 2;
      const cx = M + icon / 2;
      if (p.marker === "dot") {
        ctx.fillStyle = t.accent;
        ctx.beginPath();
        ctx.arc(cx, cy, icon * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = t.accent;
        ctx.beginPath();
        ctx.arc(cx, cy, icon / 2, 0, Math.PI * 2);
        ctx.fill();
        if (p.marker === "number") {
          ctx.fillStyle = t.onAccent;
          ctx.font = `700 ${Math.round(icon * 0.5)}px ${TITLE_FONT}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(i + 1), cx, cy + 1);
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.font = `500 ${size}px ${BODY_FONT}`;
        } else {
          glyph(ctx, p.marker, cx, cy, icon * 0.56, t.onAccent, 3);
        }
      }
      ctx.fillStyle = t.body;
      ctx.textBaseline = "middle";
      l.lines.forEach((line, k) => ctx.fillText(line, M + icon + 28, cy + k * lineH + 1));
      ctx.textBaseline = "top";
      y += l.h + size * 0.75;
    });
    if (items.length) textPairs.push(["Itens", t.body, t.bgs]);
    if (size < MIN_BODY) sizesOk = false;

    if (cta) {
      ctx.font = `700 ${ctaFont}px ${BODY_FONT}`;
      const tw = ctx.measureText(cta).width;
      const bw = Math.min(contentW, tw + ctaPadX * 2 + 44);
      const by = H - M - ctaH;
      ctx.fillStyle = t.accent;
      roundRect(ctx, M, by, bw, ctaH, ctaH / 2);
      ctx.fill();
      ctx.fillStyle = t.onAccent;
      ctx.textBaseline = "middle";
      ctx.fillText(cta, M + ctaPadX, by + ctaH / 2 + 1, bw - ctaPadX * 2 - 44);
      ctx.textBaseline = "top";
      glyph(ctx, "arrow", M + bw - ctaPadX - 14, by + ctaH / 2, 30, t.onAccent, 2.6);
      textPairs.push(["CTA", t.onAccent, [t.accent]]);
    }
  } else {
    const e = spec.event;
    const square = spec.format === "1x1";
    const D = square ? 360 : 500;
    const ring = square ? 12 : 14;
    const name = e.name.trim() || "Nome do colaborador";
    const kicker = e.kicker.trim();
    const when = formatEventDate(e.date, e.time);

    // Medidas do bloco de texto (antes do posicionamento, para centralizar a pilha)
    const textW = square ? W - M * 2 : W - (M + 20 + D + 88) - M;
    const kickerSize = 28;
    const nameFit = fit(
      ctx,
      name,
      (s) => `800 ${s}px ${TITLE_FONT}`,
      textW,
      square ? 1 : 2,
      square ? 60 : 72,
      MIN_TITLE,
    );
    const eventFit = fit(
      ctx,
      e.event.trim(),
      (s) => `500 ${s}px ${BODY_FONT}`,
      textW,
      square ? 2 : 3,
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
      const lb = logoBox("logotipo", logoH);
      const stack = logoH + 48 + D + ring * 2 + 36 + blockH;
      const top = Math.max(M - 16, (H - stack) / 2);
      drawLogo((W - lb.w) / 2, top, logoH);
      cx = W / 2;
      cy = top + logoH + 48 + ring + D / 2;
      textX = W / 2;
      align = "center";
      y = cy + D / 2 + ring + 36;
      if (y + blockH > H - M + 24) fitsOk = false;
    } else {
      drawLogo(M, M, 60);
      cx = M + 20 + D / 2;
      cy = H / 2 + 30;
      textX = M + 20 + D + 88;
      align = "left";
      y = cy - blockH / 2;
    }

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
      ctx.fillStyle = PALETTE.supportLight;
      ctx.fillRect(cx - D / 2, cy - D / 2, D, D);
      glyph(ctx, "user", cx, cy, D * 0.46, PALETTE.supportMid, 1.6);
    }
    ctx.restore();
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = ring;
    ctx.beginPath();
    ctx.arc(cx, cy, D / 2 + ring / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = align;
    if (kicker) {
      ctx.font = `700 ${kickerSize}px ${BODY_FONT}`;
      ctx.fillStyle = t.light ? t.title : PALETTE.gold;
      ctx.fillText(kicker.toUpperCase(), textX, y);
      textPairs.push(["Chamada", t.light ? t.title : PALETTE.gold, t.bgs]);
      y += kickerSize + 20;
    }
    ctx.font = `800 ${nameFit.size}px ${TITLE_FONT}`;
    ctx.fillStyle = t.title;
    for (const line of nameFit.lines) {
      ctx.fillText(line, textX, y);
      y += nameFit.size * 1.12;
    }
    textPairs.push(["Nome", t.title, t.bgs]);
    if (eventFit.lines.length) {
      y += 16;
      ctx.font = `500 ${eventFit.size}px ${BODY_FONT}`;
      ctx.fillStyle = t.body;
      for (const line of eventFit.lines) {
        ctx.fillText(line, textX, y);
        y += eventFit.size * 1.3;
      }
      textPairs.push(["Evento", t.body, t.bgs]);
    }
    if (when) {
      y += 32;
      ctx.font = `700 30px ${BODY_FONT}`;
      const tw = ctx.measureText(when).width;
      const pw = Math.min(textW, tw + 40 + 36 + 16);
      const px = align === "center" ? textX - pw / 2 : textX;
      ctx.fillStyle = t.accent;
      roundRect(ctx, px, y, pw, pillH, pillH / 2);
      ctx.fill();
      glyph(ctx, "calendar", px + 20 + 18, y + pillH / 2, 32, t.onAccent, 2.4);
      ctx.fillStyle = t.onAccent;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(when, px + 20 + 36 + 16, y + pillH / 2 + 1, pw - 92);
      ctx.textBaseline = "top";
      textPairs.push(["Data", t.onAccent, [t.accent]]);
    }
    ctx.textAlign = "left";
    if (nameFit.size < MIN_TITLE || eventFit.size < MIN_BODY) sizesOk = false;
  }

  // Checagens de marca
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
  checks.push({
    id: "fit",
    label: fitsOk ? "Textos cabem na peça" : "Texto longo demais: foi cortado",
    pass: fitsOk,
  });
  checks.push({ id: "size", label: "Tamanhos mínimos de leitura", pass: sizesOk });
  const lg = logo as LogoRender | null;
  checks.push({
    id: "logo",
    label: lg?.drawn
      ? `Logomarca oficial com contraste ${lg.minContrast.toFixed(1).replace(".", ",")}:1${lg.plate ? " (sobre placa)" : ""}`
      : "Logomarca oficial carregada",
    pass: !!lg?.drawn && lg.ok,
  });
  if (spec.model === "event") {
    checks.push({ id: "photo", label: "Foto do colaborador enviada", pass: !!spec.event.photo });
  }
  return { checks, pass: checks.every((c) => c.pass), logo: lg };
}
