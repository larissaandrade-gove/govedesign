import {
  PALETTE,
  brightnessOfHex,
  contrastTextColor,
  withAlpha,
} from "./brand";
import { drawIconPath } from "./icons";

export type CreativeLayout =
  | "card-bottom"
  | "band-bottom"
  | "top-stack"
  | "centered"
  | "split-left"
  | "split-right"
  | "band-top"
  | "hero-center"
  // Estilos editoriais do Studio (8 diagramações fixas)
  | "mockup-center-top"
  | "mockup-left"
  | "person-bottom"
  | "stat-hero"
  | "quote-split"
  | "before-after"
  | "full-bleed"
  | "proof-badge"
  // Exclusivos para material colaborativo (especialista)
  | "expert-card"
  | "expert-band";

export const EXPERT_LAYOUTS: { key: CreativeLayout; label: string; hint: string }[] = [
  { key: "expert-card", label: "Especialista + card", hint: "Foto circular, nome e cargo + card de texto" },
  { key: "expert-band", label: "Especialista + faixa", hint: "Foto circular, nome e cargo + faixa sólida" },
];

export type ExpertMaterial = {
  enabled: boolean;
  name: string;
  role: string;
  photo: HTMLImageElement | null;
};

export const EMPTY_EXPERT: ExpertMaterial = { enabled: false, name: "", role: "", photo: null };

export function expertReady(e: ExpertMaterial | null | undefined) {
  return !!e && e.enabled && e.name.trim().includes(" ") && !!e.role.trim() && !!e.photo;
}

export function isExpertLayout(l: CreativeLayout) {
  return l === "expert-card" || l === "expert-band";
}

export const LAYOUTS: { key: CreativeLayout; label: string }[] = [
  { key: "card-bottom", label: "Card inferior" },
  { key: "band-bottom", label: "Faixa sólida" },
  { key: "top-stack", label: "Texto no topo" },
  { key: "centered", label: "Centralizado" },
  { key: "split-left", label: "Painel à esquerda" },
  { key: "split-right", label: "Painel à direita" },
  { key: "band-top", label: "Faixa superior" },
  { key: "hero-center", label: "Bloco central" },
];

/** As 8 diagramações fixas do Studio ao vivo. */
export const STUDIO_LAYOUTS: { key: CreativeLayout; label: string; hint: string }[] = [
  { key: "mockup-center-top", label: "Mockup central", hint: "Sistema ao centro + texto no topo" },
  { key: "mockup-left", label: "Mockup à esquerda", hint: "Sistema à esquerda + texto à direita" },
  { key: "person-bottom", label: "Pessoa + base", hint: "Foto de gestor + texto na base" },
  { key: "stat-hero", label: "Número em destaque", hint: "Estatística grande + subtexto" },
  { key: "quote-split", label: "Depoimento", hint: "Aspas à esquerda + apoio à direita" },
  { key: "before-after", label: "Antes / depois", hint: "Dois blocos comparativos" },
  { key: "full-bleed", label: "Institucional", hint: "Texto centralizado, sem foto" },
  { key: "proof-badge", label: "Prova social", hint: "Selo de case + CTA na base" },
];

/** Cada estilo do Studio herda a geometria base já validada pelo manual. */
const LAYOUT_BASE: Partial<Record<CreativeLayout, CreativeLayout>> = {
  "mockup-center-top": "top-stack",
  "mockup-left": "split-right",
  "person-bottom": "card-bottom",
  "stat-hero": "band-bottom",
  "quote-split": "split-left",
  "before-after": "band-bottom",
  "full-bleed": "centered",
  "proof-badge": "card-bottom",
  "expert-card": "card-bottom",
  "expert-band": "band-bottom",
};


export type CreativeFormat =
  | "feed-45"
  | "square-11"
  | "square-1200"
  | "story-916"
  | "linkedin-191";

/** Todos exportados em 72 dpi (1 px = 1 pt na base de 1080). */
export const FORMATS: { key: CreativeFormat; label: string; w: number; h: number }[] = [
  { key: "feed-45", label: "Feed 4:5 (1080x1350)", w: 1080, h: 1350 },
  { key: "square-11", label: "Quadrado 1:1 (1080x1080)", w: 1080, h: 1080 },
  { key: "square-1200", label: "Quadrado HD (1200x1200)", w: 1200, h: 1200 },
  { key: "story-916", label: "Story 9:16 (1080x1920)", w: 1080, h: 1920 },
  { key: "linkedin-191", label: "LinkedIn 1.91:1 (1920x1005)", w: 1920, h: 1005 },
];

/** Biblioteca de fundos da marca (camada independente da diagramação). */
export type BgPreset = {
  key: string;
  label: string;
  colors: [string, string];
  kind: "solid" | "linear" | "diagonal" | "radial";
};

export const BG_PRESETS: BgPreset[] = [
  { key: "deep", label: "Roxo profundo", colors: [PALETTE.purple3, PALETTE.purple3], kind: "solid" },
  { key: "mid", label: "Roxo médio", colors: [PALETTE.purple2, PALETTE.purple2], kind: "solid" },
  { key: "vivid", label: "Roxo vivo", colors: [PALETTE.purple1, PALETTE.purple1], kind: "solid" },
  { key: "vivid-deep", label: "Degradê vivo → profundo", colors: [PALETTE.purple1, PALETTE.purple3], kind: "diagonal" },
  { key: "deep-mid", label: "Degradê profundo → médio", colors: [PALETTE.purple3, PALETTE.purple2], kind: "linear" },
  { key: "glow", label: "Halo roxo", colors: [PALETTE.purple1, PALETTE.purple3], kind: "radial" },
  { key: "light-top", label: "Degradê branco → cinza (vertical)", colors: [PALETTE.white, PALETTE.supportLight], kind: "linear" },
  { key: "light-diag", label: "Degradê branco → cinza (diagonal)", colors: [PALETTE.white, PALETTE.supportLight], kind: "diagonal" },
  { key: "light-halo", label: "Halo branco", colors: [PALETTE.white, PALETTE.supportLight], kind: "radial" },
];

export function formatSize(key: CreativeFormat | undefined) {
  return FORMATS.find((f) => f.key === key) ?? FORMATS[0]!;
}


export type CreativeSpec = {
  /** Proporção da peça; padrão feed 4:5. */
  format?: CreativeFormat | undefined;
  headline: string;
  subhead: string;
  cta: string;
  badge: string;
  urgency?: string | undefined;
  token?: string | undefined;
  bgColor: string;
  /** Roxo institucional usado no card/faixa de texto (sobrepõe o padrão). */
  cardColor?: string | undefined;
  layout: CreativeLayout;
  icon: string;
  themeIcon?: string | undefined;
  background: HTMLImageElement | null;
  logoPurple: HTMLImageElement | null;
  logoWhite: HTMLImageElement | null;
  /** Em fundos escuros, exibe o wordmark roxo sobre uma placa clara. */
  logoPlate?: boolean | undefined;
  logoPlateColor?: string | undefined;
  /** Classificação manual da foto de fundo (facilita a decisão de contraste). */
  bgTone?: "light" | "dark" | undefined;
  /** Fundo da biblioteca (usado quando não há foto). */
  bgPreset?: string | undefined;
  /** Modo remix: preserva mais da arte original (overlay mais leve). */
  remix?: boolean | undefined;
  /** Esquema cromático: institucional (padrão) ou minimalista com respiro. */
  scheme?: CreativeScheme | undefined;
  /** Escala de rasterização (1 = tamanho real; use <1 para previews leves). */
  renderScale?: number | undefined;
  /** ---- Animação (modo vídeo) ---- */
  /** Zoom Ken Burns aplicado ao fundo (1.0 → 1.08). */
  zoom?: number | undefined;
  /** Opacidade do bloco de texto (fade-in). */
  textAlpha?: number | undefined;
  /** Opacidade do botão de CTA (fade-in). */
  ctaAlpha?: number | undefined;
  /** Margens extras livres de marca (ex.: 250px no topo/base em 9:16). */
  safeTop?: number | undefined;
  safeBottom?: number | undefined;
  /** Material colaborativo: foto circular + nome + cargo (sempre juntos). */
  expert?: ExpertMaterial | null | undefined;
};


export type CreativeScheme = "institucional" | "minimal-light" | "minimal-dark";

export const SCHEMES: { key: CreativeScheme; label: string }[] = [
  { key: "institucional", label: "Institucional (roxo + dourado)" },
  { key: "minimal-light", label: "Minimalista claro (respiro branco, CTA roxo)" },
  { key: "minimal-dark", label: "Minimalista roxo (respiro roxo, CTA branco)" },
];


const FONT = "Archivo, 'Helvetica Neue', Arial, sans-serif";
const BASE_M = 72; // margem de segurança
const BASE_CARD_PAD = 48;

/**
 * Escala tipográfica de mídia paga (referência: canvas 1080px, 1pt ≈ 1,333px).
 * Feed = mínimo 24pt (32px) para o corpo; headline entre 34pt e 47pt;
 * rótulos de apoio (selo, chip, token) nunca abaixo de 21pt (28px).
 */
export const TYPE_SCALE = {
  headlineMax: 62, // ~47pt
  headlineMin: 46, // ~34pt
  subheadMax: 40, // 30pt
  subheadMin: 32, // 24pt — piso de legibilidade no feed
  subheadMaxLines: 4,
  cta: 36, // 27pt
  label: 28, // 21pt — selo, chip de urgência e token regional
  logoFallback: 52,
} as const;


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

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Reduz a fonte até o headline caber no número de linhas permitido e na largura útil. */
function fitHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  let size: number = TYPE_SCALE.headlineMax;
  const min = TYPE_SCALE.headlineMin;
  let lines: string[] = [];
  for (;;) {
    ctx.font = `700 ${size}px ${FONT}`;
    lines = wrap(ctx, text, maxWidth);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    if ((lines.length <= maxLines && widest <= maxWidth) || size <= min) break;
    size = Math.max(min, size - 2);
  }
  return { size, lines };
}

function fitSubhead(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  let size: number = TYPE_SCALE.subheadMax;
  const min = TYPE_SCALE.subheadMin;
  let lines: string[] = [];
  for (;;) {
    ctx.font = `400 ${size}px ${FONT}`;
    lines = wrap(ctx, text, maxWidth);
    if (lines.length <= TYPE_SCALE.subheadMaxLines || size <= min) break;
    size = Math.max(min, size - 2);
  }
  return { size, lines };
}

/** Brilho médio de uma faixa da imagem (zona onde o texto será aplicado). */
export function imageBrightness(img: HTMLImageElement, zone: "top" | "bottom" | "all" = "bottom") {
  const c = document.createElement("canvas");
  c.width = 40;
  c.height = 50;
  const ctx = c.getContext("2d");
  if (!ctx) return 0;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  try {
    const y = zone === "bottom" ? Math.floor(c.height / 2) : 0;
    const h = zone === "all" ? c.height : Math.ceil(c.height / 2);
    const { data } = ctx.getImageData(0, y, c.width, h);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
      n++;
    }
    return n ? sum / n : 0;
  } catch {
    return 0;
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
  zoom = 1,
) {
  const scale = Math.max(cw / img.width, ch / img.height) * zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}


export type RenderResult = {
  textColor: string;
  textBackgroundColor: string;
  usedColors: string[];
  brightness: number;
};

export function renderCreative(canvas: HTMLCanvasElement, spec: CreativeSpec): RenderResult {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");
  const size = formatSize(spec.format);
  const CANVAS_W = size.w;
  const CANVAS_H = size.h;
  const wide = CANVAS_W / CANVAS_H > 1.4;
  const M = BASE_M;
  const SAFE_TOP = spec.safeTop ?? 0;
  const SAFE_BOTTOM = spec.safeBottom ?? 0;
  const TOP_M = M + SAFE_TOP;
  const textAlpha = spec.textAlpha ?? 1;
  const ctaAlpha = spec.ctaAlpha ?? 1;

  const CARD_PAD = BASE_CARD_PAD;
  // Em peças largas o bloco de texto é limitado para não gerar linhas quilométricas.
  const CONTENT_W = wide ? Math.round(CANVAS_W * 0.62) : CANVAS_W - M * 2;
  const RS = Math.max(0.1, Math.min(1, spec.renderScale ?? 1));
  canvas.width = Math.round(CANVAS_W * RS);
  canvas.height = Math.round(CANVAS_H * RS);
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  const scheme: CreativeScheme = spec.scheme ?? "institucional";
  const minimal = scheme !== "institucional";
  const style = spec.layout;
  const layout = LAYOUT_BASE[style] ?? style;
  // "Institucional" é 100% tipográfico: ignora qualquer foto de fundo.
  const isPhoto = !minimal && !!spec.background && style !== "full-bleed";
  const textAtTop = layout === "top-stack";

  const minimalBg =
    scheme === "minimal-light"
      ? PALETTE.white
      : [PALETTE.purple1, PALETTE.purple2, PALETTE.purple3].find(
          (p) => p.toUpperCase() === spec.bgColor.toUpperCase(),
        ) ?? PALETTE.purple1;
  // Minimalista: o CTA usa a cor oposta ao respiro.
  const accentColor =
    scheme === "minimal-light" ? PALETTE.purple1 : scheme === "minimal-dark" ? PALETTE.white : PALETTE.gold;
  const accentTextColor = scheme === "minimal-light" ? PALETTE.white : PALETTE.purple3;

  // 0. Fundo
  if (isPhoto && spec.background) {
    drawCover(ctx, spec.background, CANVAS_W, CANVAS_H, spec.zoom ?? 1);
  } else if (minimal) {
    // Respiro sólido, sem degradê nem texturas.
    ctx.fillStyle = minimalBg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else if (spec.bgPreset && BG_PRESETS.some((p) => p.key === spec.bgPreset)) {
    // Fundo da biblioteca da marca.
    const preset = BG_PRESETS.find((p) => p.key === spec.bgPreset)!;
    const [a, b] = preset.colors;
    if (preset.kind === "solid") {
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else if (preset.kind === "radial") {
      ctx.fillStyle = b;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      const rg = ctx.createRadialGradient(
        CANVAS_W * 0.5,
        CANVAS_H * 0.32,
        CANVAS_W * 0.05,
        CANVAS_W * 0.5,
        CANVAS_H * 0.32,
        CANVAS_W * 0.85,
      );
      rg.addColorStop(0, withAlpha(a, 0.95));
      rg.addColorStop(1, withAlpha(a, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
      const g =
        preset.kind === "diagonal"
          ? ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
          : ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  } else {
    // Fundo sólido em degradê entre dois roxos institucionais + bloco diagonal roxo.
    const others = [PALETTE.purple1, PALETTE.purple2, PALETTE.purple3].filter(
      (c) => c.toUpperCase() !== spec.bgColor.toUpperCase(),
    );
    const deep =
      brightnessOfHex(spec.bgColor) > brightnessOfHex(others[0] ?? PALETTE.purple3)
        ? (others[0] ?? PALETTE.purple3)
        : (others[1] ?? PALETTE.purple1);
    const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    g.addColorStop(0, spec.bgColor);
    g.addColorStop(1, deep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = deep;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H * 0.42);
    ctx.lineTo(CANVAS_W, CANVAS_H * 0.24);
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.lineTo(0, CANVAS_H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const isSplit = layout === "split-left" || layout === "split-right";
  const isBandTop = layout === "band-top";
  const isHero = layout === "hero-center";

  // 1. Overlay institucional
  if (isPhoto && !isSplit) {
    const dim = spec.remix ? 0.55 : 1;
    if (textAtTop || isBandTop) {
      const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.6);
      g.addColorStop(0, withAlpha(PALETTE.purple3, 0.85 * dim));
      g.addColorStop(1, withAlpha(PALETTE.purple3, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H * 0.6);
      const gb = ctx.createLinearGradient(0, CANVAS_H * 0.7, 0, CANVAS_H);
      gb.addColorStop(0, withAlpha(PALETTE.purple3, 0));
      gb.addColorStop(1, withAlpha(PALETTE.purple3, 0.75 * dim));
      ctx.fillStyle = gb;
      ctx.fillRect(0, CANVAS_H * 0.7, CANVAS_W, CANVAS_H * 0.3);
    } else if (layout === "centered") {
      ctx.fillStyle = withAlpha(PALETTE.purple3, 0.72 * dim);
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
      const g = ctx.createLinearGradient(0, CANVAS_H * 0.35, 0, CANVAS_H);
      g.addColorStop(0, withAlpha(PALETTE.purple3, 0));
      g.addColorStop(1, withAlpha(PALETTE.purple3, 0.8 * dim));
      ctx.fillStyle = g;
      ctx.fillRect(0, CANVAS_H * 0.35, CANVAS_W, CANVAS_H * 0.65);
    }
  }


  const toneBrightness = spec.bgTone === "dark" ? 50 : spec.bgTone === "light" ? 210 : null;
  const activePreset = spec.bgPreset ? BG_PRESETS.find((p) => p.key === spec.bgPreset) : undefined;
  const presetBrightness = activePreset
    ? (brightnessOfHex(activePreset.colors[0]) + brightnessOfHex(activePreset.colors[1])) / 2
    : null;
  const rawBrightness = minimal
    ? brightnessOfHex(minimalBg)
    : isPhoto && spec.background
      ? (toneBrightness ?? imageBrightness(spec.background, textAtTop ? "top" : "bottom"))
      : (presetBrightness ?? brightnessOfHex(spec.bgColor));
  // Overlays escurecem o fundo: para foto o texto sempre trabalha sobre base escura.
  const brightness = isPhoto ? Math.min(rawBrightness, 110) : rawBrightness;

  const textColor = contrastTextColor(brightness);
  // Card/faixa: institucional usa roxo; minimalista claro usa respiro #F4F4F4;
  // minimalista roxo usa um roxo mais profundo que o fundo. A disposição
  // (card, faixa, painel) é idêntica nos três esquemas — muda só a cor.
  const purples = [PALETTE.purple1, PALETTE.purple2, PALETTE.purple3];
  const requested = spec.cardColor?.toUpperCase();
  const candidate = purples.find((p) => p.toUpperCase() === requested);
  const cardColor = minimal
    ? scheme === "minimal-light"
      ? PALETTE.supportLight
      : minimalBg.toUpperCase() === PALETTE.purple3.toUpperCase()
        ? PALETTE.purple2
        : PALETTE.purple3
    : isPhoto
      ? (candidate ?? PALETTE.purple3)
      : (candidate && candidate.toUpperCase() !== spec.bgColor.toUpperCase()
          ? candidate
          : (purples.find((p) => p.toUpperCase() !== spec.bgColor.toUpperCase()) ?? PALETTE.purple3));



  // 2. Medidas do bloco de texto
  const centered = layout === "centered";
  const align: CanvasTextAlign = centered ? "center" : "left";
  const panelW = isSplit ? Math.round(CANVAS_W * (wide ? 0.5 : 0.62)) : 0;
  const boxW = isSplit ? panelW - CARD_PAD * 2 - M / 2 : CONTENT_W;
  const hasCard = layout === "card-bottom";
  const textW =
    isSplit || isHero
      ? boxW - (isHero ? CARD_PAD * 2 : 0)
      : hasCard || layout === "band-bottom"
        ? boxW - CARD_PAD * 2
        : boxW;


  const headline = fitHeadline(ctx, spec.headline, textW, centered || isSplit || isHero ? 3 : 2);
  const headLH = headline.size * 1.12;
  const sub = fitSubhead(ctx, spec.subhead, textW);
  const subLH = sub.size * 1.35;

  const urgencyH = spec.urgency ? 58 : 0;
  const urgencyGap = spec.urgency ? 24 : 0;
  const tokenH = spec.token ? 40 : 0;

  const textH =
    urgencyH + urgencyGap + headline.lines.length * headLH + 20 + sub.lines.length * subLH + tokenH;

  // 3. CTA (medidas) — padding idêntico nas quatro extremidades
  ctx.font = `700 ${TYPE_SCALE.cta}px ${FONT}`;
  const ctaLabelW = ctx.measureText(spec.cta).width;
  const ctaIcon = 36;
  const CTA_PAD = 34;
  const ctaContentW = ctaLabelW + 22 + ctaIcon;
  const ctaH = ctaIcon + CTA_PAD * 2;
  const ctaW = Math.min(isSplit || isHero ? textW : CONTENT_W, ctaContentW + CTA_PAD * 2);


  // 4. Posicionamento por layout
  let ctaY = CANVAS_H - M - SAFE_BOTTOM - ctaH;
  let blockX = M;
  let blockTop: number;
  let textX = M;
  /** Topo do card/faixa de texto — limita a área livre das diagramações editoriais. */
  let panelTop = CANVAS_H - SAFE_BOTTOM;

  if (layout === "top-stack" || isBandTop) {
    blockTop = Math.max(TOP_M + 120, SAFE_TOP + CANVAS_H * 0.17);
  } else if (layout === "centered") {
    blockTop = SAFE_TOP + (CANVAS_H - SAFE_TOP - SAFE_BOTTOM - textH) / 2 - 40;
  } else if (isSplit || isHero) {
    blockTop = SAFE_TOP + (CANVAS_H - SAFE_TOP - SAFE_BOTTOM - (textH + 56 + ctaH)) / 2;
  } else {
    blockTop = ctaY - 56 - textH - (layout === "card-bottom" ? CARD_PAD * 2 : 0) + (layout === "card-bottom" ? CARD_PAD : 0);
  }

  ctx.globalAlpha = textAlpha;
  if (isSplit) {
    // Painel sólido lateral: foto/fundo respira do outro lado.
    const panelX = layout === "split-left" ? 0 : CANVAS_W - panelW;
    ctx.fillStyle = cardColor;
    ctx.fillRect(panelX, 0, panelW, CANVAS_H);
    textX = panelX + (layout === "split-left" ? M : CARD_PAD + M / 2);
    blockX = textX;
    blockTop = Math.max(blockTop, TOP_M + 220);
    ctaY = blockTop + textH + 56;
  } else if (isHero) {
    const cardH = textH + 56 + ctaH + CARD_PAD * 2;
    const cardTop = SAFE_TOP + (CANVAS_H - SAFE_TOP - SAFE_BOTTOM - cardH) / 2 + 40;
    ctx.fillStyle = cardColor;
    roundRect(ctx, M, cardTop, CONTENT_W, cardH, 40);
    ctx.fill();
    blockTop = cardTop + CARD_PAD;
    textX = M + CARD_PAD;
    blockX = textX;
    ctaY = blockTop + textH + 56;
    panelTop = cardTop;
  } else if (isBandTop) {
    const bandBottom = blockTop + textH + CARD_PAD;
    ctx.fillStyle = cardColor;
    ctx.fillRect(0, 0, CANVAS_W, bandBottom);
    textX = M;
    blockX = textX;
  } else if (layout === "card-bottom") {
    const cardTop = ctaY - 56 - (textH + CARD_PAD * 2);
    ctx.fillStyle = cardColor;
    roundRect(ctx, M, cardTop, CONTENT_W, textH + CARD_PAD * 2, 32);
    ctx.fill();
    blockTop = cardTop + CARD_PAD;
    textX = M + CARD_PAD;
    blockX = textX;
    panelTop = cardTop;
  } else if (layout === "band-bottom") {
    const bandTop = ctaY - 56 - textH - CARD_PAD;
    ctx.fillStyle = cardColor;
    ctx.fillRect(0, bandTop, CANVAS_W, CANVAS_H - bandTop);
    blockTop = bandTop + CARD_PAD;
    textX = M;
    blockX = textX;
    panelTop = bandTop;
  } else if (centered) {
    textX = CANVAS_W / 2;
    panelTop = blockTop;
  }

  // 4b. Módulos editoriais das diagramações do Studio (área livre acima do texto).
  {
    const freeTop = layout === "top-stack" ? blockTop + textH + 56 : TOP_M + 130;
    const freeBottom = layout === "top-stack" ? ctaY - 48 : panelTop - 32;
    const freeH = freeBottom - freeTop;
    const accent = minimal ? accentColor : PALETTE.gold;
    const inkOnBg = contrastTextColor(brightness);

    if ((style === "mockup-center-top" || style === "mockup-left") && freeH > 130) {
      const areaX = M;
      const areaW = style === "mockup-left" ? CANVAS_W - panelW - M * 2 : CONTENT_W;
      const mw = Math.min(areaW, freeH * 1.5);
      const mh = Math.min(freeH, mw * 0.66);
      const mx = style === "mockup-left" ? areaX + (areaW - mw) / 2 : (CANVAS_W - mw) / 2;
      const my = style === "mockup-left" ? SAFE_TOP + (CANVAS_H - SAFE_TOP - SAFE_BOTTOM - mh) / 2 : freeTop + (freeH - mh) / 2;
      const bar = mh * 0.14; // altura da barra de título
      ctx.save();
      roundRect(ctx, mx, my, mw, mh, 24);
      ctx.clip();
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = PALETTE.supportLight;
      ctx.fillRect(mx, my, mw, bar);
      [0, 1, 2].forEach((i) => {
        ctx.fillStyle = i === 0 ? accent : PALETTE.supportMid;
        ctx.beginPath();
        ctx.arc(mx + bar * 0.6 + i * bar * 0.55, my + bar / 2, bar * 0.16, 0, Math.PI * 2);
        ctx.fill();
      });
      const pad = mh * 0.08;
      const bodyY = my + bar + pad;
      const bodyH = mh - bar - pad * 2;
      ctx.fillStyle = withAlpha(PALETTE.purple1, 0.18);
      roundRect(ctx, mx + pad, bodyY, mw * 0.26, bodyH, 14);
      ctx.fill();
      const colX = mx + pad + mw * 0.26 + pad;
      const colW = mw - (colX - mx) - pad;
      ctx.fillStyle = withAlpha(PALETTE.purple2, 0.9);
      roundRect(ctx, colX, bodyY, colW * 0.6, bodyH * 0.11, bodyH * 0.055);
      ctx.fill();
      ctx.fillStyle = accent;
      roundRect(ctx, colX, bodyY + bodyH * 0.2, colW * 0.34, bodyH * 0.26, 12);
      ctx.fill();
      ctx.fillStyle = PALETTE.supportLight;
      for (let i = 0; i < 3; i++) {
        roundRect(
          ctx,
          colX,
          bodyY + bodyH * (0.56 + i * 0.15),
          colW * (i === 2 ? 0.55 : 0.85),
          bodyH * 0.08,
          9,
        );
        ctx.fill();
      }

      ctx.restore();
    }

    if (style === "stat-hero" && freeH > 140) {
      const match = spec.headline.match(/[\d][\d.,]*\s*(%|x|mil|mi)?/i);
      const stat = (match?.[0] ?? (spec.badge || "100%")).trim().toUpperCase();
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let statSize = Math.min(freeH * 0.85, 300);
      ctx.font = `700 ${statSize}px ${FONT}`;
      while (ctx.measureText(stat).width > CONTENT_W && statSize > 90) {
        statSize -= 8;
        ctx.font = `700 ${statSize}px ${FONT}`;
      }
      ctx.fillStyle = accent;
      ctx.fillText(stat, CANVAS_W / 2, freeTop + freeH / 2);
      ctx.restore();
    }

    if (style === "before-after" && freeH > 120) {
      const gap = 28;
      const bw = (CONTENT_W - gap) / 2;
      const bh = Math.min(freeH, bw * 1.1);
      const by = freeTop + (freeH - bh) / 2;
      const head = Math.min(56, bh * 0.24);
      const blocks: Array<[string, string]> = [
        ["ANTES", PALETTE.supportMid],
        ["DEPOIS", accent],
      ];
      blocks.forEach(([label, color], i) => {
        const bx = M + i * (bw + gap);
        ctx.save();
        roundRect(ctx, bx, by, bw, bh, 28);
        ctx.clip();
        ctx.fillStyle = i === 0 ? withAlpha(PALETTE.purple3, 0.75) : PALETTE.white;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = color;
        ctx.fillRect(bx, by, bw, head);
        ctx.fillStyle = i === 0 ? PALETTE.white : PALETTE.purple3;
        ctx.font = `700 ${Math.min(TYPE_SCALE.label, head * 0.55)}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, bx + bw / 2, by + head / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        const rows = 3;
        const rowH = (bh - head) / (rows + 1.5);
        for (let l = 0; l < rows; l++) {
          ctx.fillStyle = i === 0 ? withAlpha(PALETTE.white, 0.35) : withAlpha(PALETTE.purple2, 0.25);
          roundRect(
            ctx,
            bx + 28,
            by + head + rowH * (0.6 + l),
            (bw - 56) * (l === rows - 1 ? 0.5 : 0.9),
            Math.min(18, rowH * 0.4),
            9,
          );
          ctx.fill();
        }
        ctx.restore();
      });

    }

    if (style === "proof-badge" && freeH > 120 && spec.badge) {
      ctx.save();
      const label = spec.badge.toUpperCase();
      let ps = Math.min(72, freeH * 0.35);
      ctx.font = `700 ${ps}px ${FONT}`;
      while (ctx.measureText(label).width + 120 > CONTENT_W && ps > 30) {
        ps -= 4;
        ctx.font = `700 ${ps}px ${FONT}`;
      }
      const pw = ctx.measureText(label).width + 120;
      const ph = ps + 56;
      const px = (CANVAS_W - pw) / 2;
      const py = freeTop + (freeH - ph) / 2;
      ctx.fillStyle = accent;
      roundRect(ctx, px, py, pw, ph, ph / 2);
      ctx.fill();
      ctx.fillStyle = minimal ? accentTextColor : PALETTE.purple3;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, CANVAS_W / 2, py + ph / 2 + 1);
      ctx.restore();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
    }

    if (style === "quote-split") {
      ctx.save();
      ctx.fillStyle = accent;
      ctx.font = `700 190px Georgia, ${FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("“", textX, Math.max(TOP_M + 70, blockTop - 190));
      ctx.restore();
    }

    if (style === "full-bleed") {
      ctx.save();
      ctx.strokeStyle = withAlpha(inkOnBg, 0.35);
      ctx.lineWidth = 4;
      const lw = 120;
      ctx.beginPath();
      ctx.moveTo((CANVAS_W - lw) / 2, Math.max(TOP_M + 140, blockTop - 70));
      ctx.lineTo((CANVAS_W + lw) / 2, Math.max(TOP_M + 140, blockTop - 70));
      ctx.stroke();
      ctx.restore();
    }
  }


  const onCard =
    isSplit || isHero || isBandTop || layout === "card-bottom" || layout === "band-bottom";
  const panelBg = cardColor;
  const bodyColor = onCard
    ? contrastTextColor(brightnessOfHex(panelBg))
    : minimal
      ? contrastTextColor(brightnessOfHex(minimalBg))
      : textColor;
  const textBgColor = onCard ? panelBg : minimal ? minimalBg : isPhoto ? PALETTE.purple3 : spec.bgColor;



  // 5. Texto
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  let y = blockTop;

  if (spec.urgency) {
    const chipFont = `700 ${TYPE_SCALE.label}px ${FONT}`;
    ctx.font = chipFont;
    const label = spec.urgency.toUpperCase();
    const iconKey = spec.themeIcon ?? "clock";
    const chipW = ctx.measureText(label).width + 40 + 32 + 14;
    const chipX = centered ? CANVAS_W / 2 - chipW / 2 : textX;
    ctx.fillStyle = minimal ? accentColor : PALETTE.gold;
    roundRect(ctx, chipX, y, chipW, urgencyH, urgencyH / 2);
    ctx.fill();
    const chipFg = minimal ? accentTextColor : PALETTE.purple3;
    drawIconPath(ctx, iconKey, chipX + 20 + 14, y + urgencyH / 2, 28, chipFg);
    ctx.fillStyle = chipFg;

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, chipX + 20 + 28 + 14, y + urgencyH / 2 + 1);
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    y += urgencyH + urgencyGap;
  }

  ctx.fillStyle = bodyColor;
  ctx.font = `700 ${headline.size}px ${FONT}`;
  for (const line of headline.lines) {
    ctx.fillText(line, textX, y);
    y += headLH;
  }
  y += 20;
  ctx.font = `400 ${sub.size}px ${FONT}`;
  ctx.globalAlpha = 0.92 * textAlpha;
  for (const line of sub.lines) {
    ctx.fillText(line, textX, y);
    y += subLH;
  }
  ctx.globalAlpha = textAlpha;

  if (spec.token) {
    ctx.font = `700 ${TYPE_SCALE.label}px ${FONT}`;
    ctx.globalAlpha = 0.8 * textAlpha;
    ctx.fillText(spec.token.toUpperCase(), textX, y + 10);
  }
  ctx.globalAlpha = 1;

  // 6. Botão de CTA — dourado no institucional; roxo/branco nos esquemas minimalistas
  ctx.globalAlpha = ctaAlpha;
  const ctaX = centered ? (CANVAS_W - ctaW) / 2 : blockX;
  ctx.fillStyle = accentColor;
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);

  ctx.fill();
  ctx.font = `700 ${TYPE_SCALE.cta}px ${FONT}`;
  const groupW = ctaContentW;
  const startX = ctaX + (ctaW - groupW) / 2;

  ctx.fillStyle = accentTextColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.cta, startX, ctaY + ctaH / 2 + 1);
  drawIconPath(
    ctx,
    spec.icon,
    startX + ctaLabelW + 22 + ctaIcon / 2,
    ctaY + ctaH / 2,
    ctaIcon,
    accentTextColor,
  );
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.globalAlpha = 1;


  // 7. Logo (wordmark) — sempre no topo, com área de proteção
  const logoOverPanel = layout === "split-left" || isBandTop;
  const topBrightness = logoOverPanel
    ? brightnessOfHex(panelBg)
    : minimal
      ? brightnessOfHex(minimalBg)
      : isPhoto && spec.background
        ? textAtTop || centered
          ? 60
          : (toneBrightness ?? imageBrightness(spec.background, "top"))
        : (presetBrightness ?? brightnessOfHex(spec.bgColor));
  const headerColor = contrastTextColor(topBrightness);

  const darkTop = topBrightness < 128;
  // Regra de marca: o wordmark nunca pode ficar sem contraste.
  // Em fundo escuro usa-se a versão branca; se só houver a roxa, ela vai sobre placa clara.
  // Em fundo claro usa-se a versão roxa; se só houver a branca, ela vai sobre placa roxa.
  const preferred = darkTop ? spec.logoWhite : spec.logoPurple;
  const fallback = darkTop ? spec.logoPurple : spec.logoWhite;
  const needsPlate = !preferred && !!fallback;
  const usePlate = needsPlate || Boolean(darkTop && spec.logoPlate && spec.logoPurple);
  const logo = usePlate ? (darkTop ? spec.logoPurple : spec.logoWhite) : preferred;
  const plateColor = darkTop ? (spec.logoPlateColor ?? PALETTE.white) : PALETTE.purple3;
  const logoH = 58;
  if (logo) {
    const logoW = logoH * (logo.width / logo.height);
    if (usePlate) {
      const padX = 22;
      const padY = 16;
      ctx.fillStyle = plateColor;
      roundRect(ctx, M - padX, TOP_M - padY, logoW + padX * 2, logoH + padY * 2, 16);
      ctx.fill();
    }
    ctx.drawImage(logo, M, TOP_M, logoW, logoH);
  } else {
    ctx.fillStyle = headerColor;
    ctx.font = `700 ${TYPE_SCALE.logoFallback}px ${FONT}`;
    ctx.fillText("GOVE", M, TOP_M);
  }


  // 8. Selo institucional no canto superior direito
  if (spec.badge) {
    ctx.font = `700 ${TYPE_SCALE.label}px ${FONT}`;
    const bw = ctx.measureText(spec.badge.toUpperCase()).width + 44;
    const bh = 52;
    const bx = CANVAS_W - M - bw;
    const by = TOP_M + (logoH - bh) / 2;

    const badgeBg = topBrightness < 128 ? PALETTE.white : PALETTE.purple3;
    const badgeFg = topBrightness < 128 ? PALETTE.purple3 : PALETTE.white;
    ctx.fillStyle = badgeBg;
    roundRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = badgeFg;
    ctx.textBaseline = "middle";
    ctx.fillText(spec.badge.toUpperCase(), bx + 22, by + bh / 2 + 1);
    ctx.textBaseline = "top";
  }

  if (isExpertLayout(style) && spec.expert && expertReady(spec.expert)) {
    const ex = spec.expert;
    const D = wide ? 170 : 190;
    const bx = M;
    const by = TOP_M + (wide ? 130 : 150);
    const plateDark = scheme !== "minimal-light";
    const plateBg = plateDark ? PALETTE.purple3 : PALETTE.supportLight;
    const nameColor = plateDark ? PALETTE.white : PALETTE.purple3;
    const roleColor = plateDark ? PALETTE.gold : PALETTE.purple1;
    const maxTextW = Math.min(CANVAS_W - M * 2 - D - 72, 560);
    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.textBaseline = "top";
    const fitFont = (txt: string, weight: number, start: number, min: number) => {
      let f = start;
      ctx.font = `${weight} ${f}px ${FONT}`;
      while (f > min && ctx.measureText(txt).width > maxTextW) {
        f -= 1;
        ctx.font = `${weight} ${f}px ${FONT}`;
      }
      return f;
    };
    const nf = fitFont(ex.name.trim(), 800, 40, 26);
    ctx.font = `800 ${nf}px ${FONT}`;
    const nameW = Math.min(maxTextW, ctx.measureText(ex.name.trim()).width);
    const rf = fitFont(ex.role.trim(), 600, 28, 20);
    ctx.font = `600 ${rf}px ${FONT}`;
    const roleW = Math.min(maxTextW, ctx.measureText(ex.role.trim()).width);
    const pad = 16;
    const plateW = D + pad * 2 + 28 + Math.max(nameW, roleW) + 36;
    const plateH = D + pad * 2;
    ctx.fillStyle = plateBg;
    roundRect(ctx, bx, by, plateW, plateH, plateH / 2);
    ctx.fill();
    // Foto em moldura circular 1:1 (recorte central, sem distorção)
    const cx = bx + pad + D / 2;
    const cy = by + pad + D / 2;
    const img = ex.photo!;
    const side = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const sx = ((img.naturalWidth || img.width) - side) / 2;
    const sy = ((img.naturalHeight || img.height) - side) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, D / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, side, side, cx - D / 2, cy - D / 2, D, D);
    ctx.restore();
    ctx.strokeStyle = scheme === "institucional" ? PALETTE.gold : nameColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, D / 2, 0, Math.PI * 2);
    ctx.stroke();
    // Nome ao lado, cargo logo abaixo do nome
    const tx = bx + pad + D + 28;
    const blockH = nf * 1.15 + 8 + rf * 1.2;
    const ty = cy - blockH / 2;
    ctx.fillStyle = nameColor;
    ctx.font = `800 ${nf}px ${FONT}`;
    ctx.fillText(ex.name.trim(), tx, ty, maxTextW);
    ctx.fillStyle = roleColor;
    ctx.font = `600 ${rf}px ${FONT}`;
    ctx.fillText(ex.role.trim(), tx, ty + nf * 1.15 + 8, maxTextW);
    ctx.restore();
  }

  const usedColors = [
    minimal ? minimalBg : spec.bgColor,
    accentColor,
    accentTextColor,
    bodyColor,
    textBgColor,
  ];


  return { textColor: bodyColor, textBackgroundColor: textBgColor, usedColors, brightness };
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}

/** Carrega uma imagem remota com CORS liberado (mantém o canvas exportável). */
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}
