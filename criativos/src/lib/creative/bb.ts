/**
 * Identidade alternativa "Banco do Brasil" (produto segmentado GOVE + BB).
 *
 * Fonte de verdade: brand/bb.js (paleta, pares aprovados, esquemas, fontes,
 * tom de voz e regras da logomarca). Este módulo só adapta para o canvas:
 * carga das fontes BB (woff2 embutidas), amostragem de pixels sob o texto e a
 * escolha de cores com contraste ≥ 4,5:1 (texto) / ≥ 3:1 (formas).
 *
 * Regras do modo BB:
 *  R1 todo texto ≥ 4,5:1 contra o que está realmente atrás dele (sem exceção
 *     para texto grande). Sobre foto: amostra os pixels sob a caixa do texto e
 *     usa uma cor da paleta que passe contra TODAS as amostras; se nenhuma
 *     passa, proteção de contraste (caixa Azul escuro + texto Branco).
 *  R2 toda cor final (fundos, textos, linhas, ícones, formas) é da paleta de
 *     12 cores; Preto só como texto quando nada passa (hoje, só no Rosa escuro).
 */
import {
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
  norm,
  textOn,
  textOnSamples,
  type BBScheme,
} from "../../../../brand/bb.js";
import titulosMedium from "../../../../brand/fonts/bb/BancoDoBrasilTitulos-Medium.woff2?url";
import titulosBold from "../../../../brand/fonts/bb/BancoDoBrasilTitulos-Bold.woff2?url";
import titulosXBold from "../../../../brand/fonts/bb/BancoDoBrasilTitulos-XBold.woff2?url";
import textosRegular from "../../../../brand/fonts/bb/BancoDoBrasilTextos-Regular.woff2?url";
import textosMedium from "../../../../brand/fonts/bb/BancoDoBrasilTextos-Medium.woff2?url";
import textosBold from "../../../../brand/fonts/bb/BancoDoBrasilTextos-Bold.woff2?url";

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
  contrast as bbContrast,
  graphicColors,
  isBBColor,
  norm as bbNorm,
  textOn,
  textOnSamples,
};
export type { BBScheme };

export type Identity = "gove" | "bb";

export const IDENTITIES: { key: Identity; label: string }[] = [
  { key: "gove", label: "GOVE" },
  { key: "bb", label: "Banco do Brasil" },
];

export const bbScheme = (id: string | undefined): BBScheme =>
  BB_SCHEMES.find((s) => s.id === id) ?? BB_SCHEMES[0]!;

/* ------------------------------------------------------------------ fontes */

export const BB_TITLE_FONT = `'${BB_FONTS.title.family}', ${BB_FONTS.fallback}`;
export const BB_TEXT_FONT = `'${BB_FONTS.text.family}', ${BB_FONTS.fallback}`;

const FONT_FILES: { family: string; weight: number; url: string }[] = [
  { family: BB_FONTS.title.family, weight: 500, url: titulosMedium },
  { family: BB_FONTS.title.family, weight: 700, url: titulosBold },
  { family: BB_FONTS.title.family, weight: 800, url: titulosXBold },
  { family: BB_FONTS.text.family, weight: 400, url: textosRegular },
  { family: BB_FONTS.text.family, weight: 500, url: textosMedium },
  { family: BB_FONTS.text.family, weight: 700, url: textosBold },
];

let fontsPromise: Promise<boolean> | null = null;

/**
 * Registra e carrega as 6 fontes BB (FontFace) antes de desenhar no canvas.
 * Resolve `true` quando todas carregaram. Idempotente.
 */
export function loadBBFonts(): Promise<boolean> {
  if (typeof document === "undefined" || typeof FontFace === "undefined" || !document.fonts)
    return Promise.resolve(false);
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_FILES.map(async (f) => {
        const face = new FontFace(f.family, `url(${f.url}) format("woff2")`, {
          weight: String(f.weight),
          style: "normal",
          display: "block",
        });
        document.fonts.add(face);
        await face.load();
        return true;
      }),
    )
      .then(() => true)
      .catch(() => {
        fontsPromise = null;
        return false;
      });
  }
  return fontsPromise;
}

export function bbFontsReady() {
  if (typeof document === "undefined" || !document.fonts) return false;
  try {
    return (
      document.fonts.check(`700 40px '${BB_FONTS.title.family}'`) &&
      document.fonts.check(`400 40px '${BB_FONTS.text.family}'`)
    );
  } catch {
    return false;
  }
}

/** Espera as fontes da identidade antes de desenhar/exportar. */
export function whenFontsReady(identity: Identity | undefined): Promise<unknown> {
  const ready =
    typeof document !== "undefined" && document.fonts?.ready
      ? document.fonts.ready.catch(() => null)
      : Promise.resolve(null);
  return identity === "bb" ? Promise.all([ready, loadBBFonts()]) : ready;
}

/* -------------------------------------------------------------- amostragem */

const hex2 = (v: number) => Math.round(v).toString(16).padStart(2, "0");
export const rgbHex = (r: number, g: number, b: number) =>
  `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();

/**
 * Cores (HEX) do que já está pintado sob uma caixa (coordenadas lógicas; `scale`
 * = escala de rasterização). Amostra em grade e devolve o conjunto sem repetição.
 */
export function sampleHexes(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  scale = 1,
  grid = 16,
): string[] {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const px = Math.max(0, Math.min(cw - 1, Math.floor(box.x * scale)));
  const py = Math.max(0, Math.min(ch - 1, Math.floor(box.y * scale)));
  const pw = Math.max(1, Math.min(cw - px, Math.ceil(box.w * scale)));
  const ph = Math.max(1, Math.min(ch - py, Math.ceil(box.h * scale)));
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(px, py, pw, ph).data;
  } catch {
    return [];
  }
  const sx = Math.max(1, Math.floor(pw / grid));
  const sy = Math.max(1, Math.floor(ph / grid));
  const seen = new Set<string>();
  for (let y = 0; y < ph; y += sy)
    for (let x = 0; x < pw; x += sx) {
      const i = (y * pw + x) * 4;
      seen.add(rgbHex(data[i]!, data[i + 1]!, data[i + 2]!));
    }
  // Garante as bordas da caixa.
  for (const [x, y] of [
    [pw - 1, 0],
    [0, ph - 1],
    [pw - 1, ph - 1],
  ] as const) {
    const i = (y * pw + x) * 4;
    seen.add(rgbHex(data[i]!, data[i + 1]!, data[i + 2]!));
  }
  return [...seen];
}

const minContrast = (fg: string, bgs: string[]) =>
  bgs.length ? Math.min(...bgs.map((b) => contrast(fg, b))) : Infinity;

export type TextPick = { color: string; protect: boolean; min: number; bgs: string[] };

/**
 * Cor de texto para o que está atrás (amostras). Fundo de uma cor só: par
 * aprovado (textOn). Fundo variável: cor da paleta que passa contra todas as
 * amostras; nenhuma passa → proteção (caixa Azul escuro + Branco).
 */
export function pickTextColor(samples: string[], preferred?: string): TextPick {
  const bgs = samples.length ? samples : [BB_PALETTE.branco];
  if (bgs.length === 1) {
    const c = textOn(bgs[0]!, preferred);
    const min = minContrast(c, bgs);
    if (min >= MIN_TEXT) return { color: c, protect: false, min, bgs };
  } else {
    const c = textOnSamples(bgs, preferred);
    if (c) return { color: c, protect: false, min: minContrast(c, bgs), bgs };
  }
  return {
    color: BB_PROTECTION.text,
    protect: true,
    min: contrast(BB_PROTECTION.text, BB_PROTECTION.bg),
    bgs: [BB_PROTECTION.bg],
  };
}

/** Cor de forma (botão, chip, selo, linha) com ≥ 3:1 contra todas as amostras. */
export function pickShapeColor(samples: string[], prefs: string[]): string {
  const bgs = samples.length ? samples : [BB_PALETTE.branco];
  const pool = [...prefs, BB_PALETTE.azulEscuro, BB_PALETTE.branco, BB_PALETTE.amareloInstitucional];
  return (
    pool.find((c) => minContrast(c, bgs) >= MIN_GRAPHIC) ??
    pool.reduce((a, b) => (minContrast(b, bgs) > minContrast(a, bgs) ? b : a))
  );
}

/** Cor permitida no modo BB (12 da paleta; Preto só como texto). */
export const bbAllowed = (hex: string, asText = false) =>
  isBBColor(hex) || (asText && norm(hex) === BB_PRETO);

/* ------------------------------------------------------------- verificação */

export type BBTextRecord = { id: string; color: string; bgs: string[]; protect: boolean };
export type BBAudit = {
  /** Textos verificados e o pior contraste de cada um. */
  texts: { id: string; color: string; min: number; protect: boolean; pass: boolean }[];
  /** Cores usadas fora da paleta (deve ficar vazio). */
  offPalette: string[];
  /** Quantos textos precisaram de correção automática (proteção). */
  fixed: number;
  pass: boolean;
};

export function auditBB(texts: BBTextRecord[], fills: string[]): BBAudit {
  const rows = texts.map((t) => {
    const min = minContrast(t.color, t.bgs);
    const paletteOk = bbAllowed(t.color, true);
    return { id: t.id, color: t.color, min, protect: t.protect, pass: min >= MIN_TEXT && paletteOk };
  });
  const offPalette = [...new Set(fills.map(norm))].filter((c) => !isBBColor(c));
  for (const t of texts) if (!bbAllowed(t.color, true)) offPalette.push(norm(t.color));
  return {
    texts: rows,
    offPalette: [...new Set(offPalette)],
    fixed: texts.filter((t) => t.protect).length,
    pass: rows.every((r) => r.pass) && !offPalette.length,
  };
}

/* ---------------------------------------------------------------- logomarca */

export type BBLogoVersion = "horizontal" | "central" | "simbolo";

/** Versão pela proporção do arquivo oficial enviado. */
export function bbLogoVersion(img: { width: number; height: number; naturalWidth?: number; naturalHeight?: number }): BBLogoVersion {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const ar = h ? w / h : 1;
  if (ar >= 2) return "horizontal";
  if (ar >= 1.15) return "central";
  return "simbolo";
}

export const BB_LOGO_LABEL: Record<BBLogoVersion, string> = {
  horizontal: "Horizontal",
  central: "Central",
  simbolo: "Símbolo",
};

export const BB_LOGO_WARNING = "Use a logomarca BB sobre Amarelo, Azul institucional ou Branco";

export type BBLogoRender = {
  drawn: boolean;
  version: BBLogoVersion;
  w: number;
  h: number;
  /** Fundo sob a logo é Amarelo, Azul institucional ou Branco (Central/Horizontal). */
  bgOk: boolean;
  minWidthOk: boolean;
};

/**
 * Desenha a logomarca BB como enviada (sem recolorir, sem distorcer), com
 * altura `h` (ampliada até a largura mínima digital da versão). Amostra o
 * fundo antes para avisar quando ele não é um dos três permitidos.
 */
export function drawBBLogo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  h: number,
  scale = 1,
  maxW = Infinity,
): BBLogoRender {
  const version = bbLogoVersion(img);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const ar = ih ? iw / ih : 1;
  const minW = BB_LOGO_RULES.minDigitalPx[version] ?? 25;
  let hh = Math.max(h, minW / ar);
  let w = hh * ar;
  if (w > maxW) {
    w = maxW;
    hh = w / ar;
  }
  const samples = sampleHexes(ctx, { x, y, w, h: hh }, scale, 10);
  const allowed = BB_LOGO_RULES.centralHorizontalBackgrounds.map(norm);
  const bgOk = version === "simbolo" || (samples.length > 0 && samples.every((s) => allowed.includes(norm(s))));
  ctx.drawImage(img, x, y, w, hh);
  return { drawn: true, version, w, h: hh, bgOk, minWidthOk: w >= minW - 0.5 };
}

/** Caixa da logo BB (sem desenhar) — mesma regra de tamanho de drawBBLogo. */
export function bbLogoSize(img: HTMLImageElement, h: number, maxW = Infinity) {
  const version = bbLogoVersion(img);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const ar = ih ? iw / ih : 1;
  const minW = BB_LOGO_RULES.minDigitalPx[version] ?? 25;
  let hh = Math.max(h, minW / ar);
  let w = hh * ar;
  if (w > maxW) {
    w = maxW;
    hh = w / ar;
  }
  return { w, h: hh, version };
}

/* ------------------------------------------------------------ preferências */

const IDENTITY_KEY = "gove-criativos:identidade";
const LOGO_KEY = "gove-criativos:logomarca-bb";
const EVENT = "gove-criativos:identidade";

export function readIdentity(): Identity {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(IDENTITY_KEY) : null;
    return v === "bb" ? "bb" : "gove";
  } catch {
    return "gove";
  }
}

export function writeIdentity(v: Identity) {
  try {
    localStorage.setItem(IDENTITY_KEY, v);
  } catch {
    /* armazenamento indisponível: vale só nesta sessão */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
}

export const IDENTITY_EVENT = EVENT;

/** Logo BB em memória (compartilhada entre as telas) + cópia no localStorage. */
let logoCache: { img: HTMLImageElement; name: string; src: string } | null = null;
let logoLoaded = false;

export function readStoredBBLogoSrc(): { src: string; name: string } | null {
  try {
    const raw = localStorage.getItem(LOGO_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { src?: string; name?: string };
    return v.src ? { src: v.src, name: v.name ?? "logomarca-bb" } : null;
  } catch {
    return null;
  }
}

export function storeBBLogo(src: string | null, name = "") {
  try {
    if (src) localStorage.setItem(LOGO_KEY, JSON.stringify({ src, name }));
    else localStorage.removeItem(LOGO_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getBBLogoCache() {
  return { cache: logoCache, loaded: logoLoaded };
}

export function setBBLogoCache(v: { img: HTMLImageElement; name: string; src: string } | null) {
  logoCache = v;
  logoLoaded = true;
}

export function imageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar a logomarca BB"));
    img.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------- tom de voz BB */

/** Textos de exemplo no tom de voz BB (curtos, imperativos, humanos, "você"/"juntos"). */
export const BB_COPY = {
  headlines:
    "Sua prefeitura mais perto de cada cidadão\nJuntos, a gente simplifica a gestão pública\nAtenda mais rápido, sem papelada\nMais tempo para cuidar da sua cidade",
  subheads:
    "Reúna as demandas do cidadão em um só lugar e responda com agilidade.\nDados claros para você decidir melhor, todos os dias.\nVeja como outras prefeituras já fazem mais com menos esforço.",
  ctas: "Agende uma conversa\nFale com a gente\nConheça a solução\nSolicite uma demonstração",
  badges: "Novo\nCase de sucesso\nWebinar ao vivo\nInscrições abertas",
  tokens: "Divinópolis/MG\nSalvador/BA\nGoiânia/GO\nCampinas/SP",
  urgencies: "Vagas limitadas\nInscrições até sexta\nTurma de novembro aberta\nComece ainda este mês",
};
