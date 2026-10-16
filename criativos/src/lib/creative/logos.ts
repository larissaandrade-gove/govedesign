/**
 * Logomarcas oficiais da Gove (cópia de brand/logos/, fundo transparente) e a
 * regra de aplicação por contraste de brand/logos.js, portada para TypeScript.
 *
 *   símbolo  (806×1080) → espaços quase quadrados
 *   logotipo (2000×637) → espaços horizontais
 *
 * Regra: TODA cor presente na logomarca precisa de contraste ≥ 4,5:1 com o
 * fundo onde ela é aplicada. A colorida só entra quando roxo E amarelo passam;
 * senão, a monocromática que passar. Sem nenhuma que passe, `ok: false`.
 *
 * Os arquivos são importados pelo Vite: no app viram URLs de asset; no build
 * do artefato (assetsInlineLimit alto) entram embutidos como data URL.
 */
import simboloCor from "@/assets/logos/gove-simbolo-cor.png";
import simboloRoxo from "@/assets/logos/gove-simbolo-roxo.png";
import simboloBranco from "@/assets/logos/gove-simbolo-branco.png";
import logoCor from "@/assets/logos/gove-logo-cor.webp";
import logoRoxo from "@/assets/logos/gove-logo-roxo.webp";
import logoBranco from "@/assets/logos/gove-logo-branco.webp";
import logoBrancoAmarelo from "@/assets/logos/gove-logo-branco-amarelo.webp";

export const LOGO_MIN_CONTRAST = 4.5;

export const LOGO_COLORS = { roxo: "#3E0099", amarelo: "#FEC526", branco: "#FFFFFF" } as const;

export type LogoKind = "simbolo" | "logotipo";
export type LogoVariantId = "cor" | "branco-amarelo" | "roxo" | "branco";

export type LogoVariant = {
  id: LogoVariantId;
  label: string;
  colors: string[];
  urls: Record<LogoKind, string>;
};

export const LOGO_ASPECT: Record<LogoKind, number> = {
  simbolo: 806 / 1080,
  logotipo: 2000 / 637,
};

export const LOGO_VARIANTS: LogoVariant[] = [
  {
    id: "cor",
    label: "Colorida",
    colors: [LOGO_COLORS.roxo, LOGO_COLORS.amarelo],
    urls: { simbolo: simboloCor, logotipo: logoCor },
  },
  {
    // Preferida em fundos escuros. Não há símbolo branco + amarelo: o símbolo usa o branco.
    id: "branco-amarelo",
    label: "Branca + amarelo",
    colors: [LOGO_COLORS.branco, LOGO_COLORS.amarelo],
    urls: { simbolo: simboloBranco, logotipo: logoBrancoAmarelo },
  },
  {
    id: "roxo",
    label: "Roxa",
    colors: [LOGO_COLORS.roxo],
    urls: { simbolo: simboloRoxo, logotipo: logoRoxo },
  },
  {
    id: "branco",
    label: "Branca",
    colors: [LOGO_COLORS.branco],
    urls: { simbolo: simboloBranco, logotipo: logoBranco },
  },
];

export const ALL_LOGO_VARIANTS: LogoVariantId[] = LOGO_VARIANTS.map((v) => v.id);

/* ---------- Contraste (WCAG) ---------- */

function channel(v: number) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminanceRgb(r: number, g: number, b: number) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function luminance(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return luminanceRgb((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

export function contrastLum(l1: number, l2: number) {
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

export function contrast(a: string, b: string) {
  return contrastLum(luminance(a), luminance(b));
}

/* ---------- Escolha da versão ---------- */

export type LogoPick = {
  kind: LogoKind;
  variant: LogoVariantId;
  aspect: number;
  minContrast: number;
  ok: boolean;
};

/** Pior contraste de uma versão contra um conjunto de luminâncias de fundo. */
export function variantMinContrast(variant: LogoVariant, bgLums: number[]) {
  let min = Infinity;
  for (const c of variant.colors) {
    const lc = luminance(c);
    for (const lb of bgLums) min = Math.min(min, contrastLum(lc, lb));
  }
  return min;
}

/**
 * Escolhe a versão da logomarca para um fundo (ou para o pior caso de vários
 * fundos — cada versão é avaliada contra a cor de fundo de menor contraste).
 * `allowed` restringe às versões habilitadas pelo usuário.
 */
export function pickLogo(
  background: string | string[],
  kind: LogoKind = "logotipo",
  {
    preferColor = true,
    allowed,
  }: { preferColor?: boolean; allowed?: LogoVariantId[] | undefined } = {},
): LogoPick {
  const bgs = Array.isArray(background) ? background : [background];
  return pickLogoLum(bgs.map(luminance), kind, { preferColor, allowed });
}

export function pickLogoLum(
  bgLums: number[],
  kind: LogoKind,
  {
    preferColor = true,
    allowed,
  }: { preferColor?: boolean; allowed?: LogoVariantId[] | undefined } = {},
): LogoPick {
  const base = preferColor ? LOGO_VARIANTS : [...LOGO_VARIANTS.slice(1), LOGO_VARIANTS[0]!];
  const pool = allowed?.length ? base.filter((v) => allowed.includes(v.id)) : base;
  const order = pool.length ? pool : base;
  const scored = order.map((v) => ({ v, min: variantMinContrast(v, bgLums) }));
  const pass = scored.find((s) => s.min >= LOGO_MIN_CONTRAST);
  const best = pass ?? scored.reduce((a, b) => (b.min > a.min ? b : a));
  return { kind, variant: best.v.id, aspect: LOGO_ASPECT[kind], minContrast: best.min, ok: !!pass };
}

/** Símbolo para espaços quadrados (ícone, avatar); logotipo para faixas horizontais. */
export const kindForBox = (w: number, h: number): LogoKind =>
  w / h < 1.6 ? "simbolo" : "logotipo";

/** Avalia cada versão contra fundos HEX (para os seletores da interface). */
export function evaluateVariants(backgrounds: string[]) {
  const lums = backgrounds.map(luminance);
  return LOGO_VARIANTS.map((v) => {
    const min = lums.length ? variantMinContrast(v, lums) : Infinity;
    return { id: v.id, minContrast: min, ok: min >= LOGO_MIN_CONTRAST };
  });
}

/* ---------- Amostragem do fundo real no canvas ---------- */

/**
 * Luminâncias do fundo já pintado na região onde a logo vai cair (coordenadas
 * lógicas; `scale` = escala de rasterização do canvas). Amostra em grade.
 */
export function sampleBackgroundLums(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale = 1,
): number[] {
  const px = Math.max(0, Math.floor(x * scale));
  const py = Math.max(0, Math.floor(y * scale));
  const pw = Math.max(1, Math.min(ctx.canvas.width - px, Math.ceil(w * scale)));
  const ph = Math.max(1, Math.min(ctx.canvas.height - py, Math.ceil(h * scale)));
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(px, py, pw, ph).data;
  } catch {
    return [];
  }
  const step = Math.max(1, Math.round(Math.min(pw, ph) / 12));
  // Agrupa por luminância (2 casas) para manter o conjunto pequeno.
  const seen = new Set<number>();
  for (let yy = 0; yy < ph; yy += step) {
    for (let xx = 0; xx < pw; xx += step) {
      const i = (yy * pw + xx) * 4;
      seen.add(Math.round(luminanceRgb(data[i]!, data[i + 1]!, data[i + 2]!) * 200) / 200);
    }
  }
  return [...seen];
}

/* ---------- Biblioteca de imagens ---------- */

export type LogoLibrary = Partial<Record<`${LogoKind}-${LogoVariantId}`, HTMLImageElement>>;

export const logoKey = (kind: LogoKind, variant: LogoVariantId) => `${kind}-${variant}` as const;

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar logo: ${url}`));
    img.src = url;
  });
}

export async function loadLogoLibrary(): Promise<LogoLibrary> {
  const jobs = LOGO_VARIANTS.flatMap((v) =>
    (["simbolo", "logotipo"] as const).map(
      async (k) => [logoKey(k, v.id), await loadImageFromUrl(v.urls[k])] as const,
    ),
  );
  return Object.fromEntries(await Promise.all(jobs)) as LogoLibrary;
}

/** Desenha a logo sem distorcer: encaixa na altura pedida (ou na largura máxima). */
export function logoBox(kind: LogoKind, height: number, maxWidth = Infinity) {
  const aspect = LOGO_ASPECT[kind];
  let h = height;
  let w = h * aspect;
  if (w > maxWidth) {
    w = maxWidth;
    h = w / aspect;
  }
  return { w, h };
}

/**
 * Aplica a regra completa num canvas: amostra o fundo sob a caixa da logo,
 * escolhe a versão; se nenhuma passar, pinta uma placa sólida discreta
 * (roxo noite ou branco, a que permitir uma versão habilitada) e desenha.
 */
export function drawBrandLogo(
  ctx: CanvasRenderingContext2D,
  library: LogoLibrary | null | undefined,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    kind: LogoKind;
    scale?: number;
    allowed?: LogoVariantId[] | undefined;
    alpha?: number;
  },
): LogoRender {
  const { x, y, w, h, kind, scale = 1, allowed } = opts;
  const lums = sampleBackgroundLums(ctx, x, y, w, h, scale);
  let pick = pickLogoLum(lums.length ? lums : [luminance("#FFFFFF")], kind, { allowed });
  let plate: string | null = null;
  if (!pick.ok) {
    // Placa discreta: testa as duas bases da marca e fica com a que fizer passar.
    const plates = ["#20133D", "#FFFFFF"].map((c) => ({
      c,
      p: pickLogoLum([luminance(c)], kind, { allowed }),
    }));
    const good =
      plates.find((p) => p.p.ok) ??
      plates.reduce((a, b) => (b.p.minContrast > a.p.minContrast ? b : a));
    plate = good.c;
    pick = good.p;
  }
  const img = library?.[logoKey(kind, pick.variant)];
  if (img) {
    ctx.save();
    ctx.globalAlpha = opts.alpha ?? 1;
    if (plate) {
      const pad = Math.round(h * 0.28);
      const r = Math.round(h * 0.3);
      ctx.fillStyle = plate;
      ctx.beginPath();
      const bx = x - pad;
      const by = y - pad;
      const bw = w + pad * 2;
      const bh = h + pad * 2;
      ctx.moveTo(bx + r, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
      ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
      ctx.arcTo(bx, by + bh, bx, by, r);
      ctx.arcTo(bx, by, bx + bw, by, r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }
  return { ...pick, plate, drawn: !!img, bgLums: lums };
}

export type LogoRender = LogoPick & { plate: string | null; drawn: boolean; bgLums: number[] };

export type VariantStatus = {
  id: LogoVariantId;
  status: "ok" | "partial" | "blocked";
  note: string;
};

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

/**
 * Explica, para a interface, se cada versão pode ser usada nos fundos atuais
 * (luminâncias). `null` = fundos variáveis (fotos), avaliados peça a peça.
 */
export function explainVariants(bgLums: number[] | null): VariantStatus[] {
  return LOGO_VARIANTS.map((v) => {
    if (!bgLums || !bgLums.length) return { id: v.id, status: "ok", note: "Avaliada em cada peça" };
    const per = bgLums.map((l) => ({ l, min: variantMinContrast(v, [l]) }));
    const passing = per.filter((p) => p.min >= LOGO_MIN_CONTRAST);
    if (!passing.length) {
      const best = Math.max(...per.map((p) => p.min));
      const why = v.id === "cor" ? "roxo e amarelo não passam juntos" : `máx. ${fmt(best)}:1`;
      return { id: v.id, status: "blocked", note: `Bloqueada: ${why} (mín. 4,5:1)` };
    }
    if (passing.length === per.length) {
      const min = Math.min(...per.map((p) => p.min));
      return { id: v.id, status: "ok", note: `Contraste ${fmt(min)}:1` };
    }
    const dark = passing.every((p) => p.l < 0.18);
    return {
      id: v.id,
      status: "partial",
      note: dark ? "Só em fundos escuros" : "Só em fundos claros",
    };
  });
}
