// Conversões entre espaços de cor e a cor oficial Gove mais próxima.
import { converter, differenceCiede2000, formatHex, parse, toGamut } from 'culori';
import { BRAND_COLORS } from '../../data/colorCompass.ts';
import type { Hex } from './types.ts';

const toRgb = converter('rgb');
const toHsl = converter('hsl');
const toHsv = converter('hsv');
const toLab = converter('lab');
const toOklch = converter('oklch');
const intoSrgb = toGamut('rgb', 'oklch');
const de = differenceCiede2000();

const round = (n: number | undefined, d = 0) => {
  const k = 10 ** d;
  return Math.round((n ?? 0) * k) / k;
};

/**
 * Normaliza um HEX ("#abc", "abc", "#aabbcc", "#aabbccdd"). Devolve a cor em
 * "#rrggbb" e o alpha (0–1) separado, ou null quando não é um HEX válido.
 */
export function normalizeHex(input: string): { hex: Hex; alpha: number } | null {
  const raw = String(input ?? '').trim().replace(/^#/, '').toLowerCase();
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(raw)) return null;
  const full = raw.length <= 4 ? [...raw].map((c) => c + c).join('') : raw;
  return { hex: `#${full.slice(0, 6)}`, alpha: full.length === 8 ? round(parseInt(full.slice(6), 16) / 255, 3) : 1 };
}

/** HEX de qualquer cor do culori, trazida para dentro do sRGB pelo OKLCH. */
export const hexOf = (c: Parameters<typeof intoSrgb>[0]): Hex => formatHex(intoSrgb(c)) ?? '#000000';

/** CMYK ingênuo (sem perfil ICC): só referência — impressos usam o Print Studio. */
function cmyk(r: number, g: number, b: number) {
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const f = (v: number) => round(((1 - v - k) / (1 - k)) * 100);
  return { c: f(r), m: f(g), y: f(b), k: round(k * 100) };
}

/** A cor em todos os espaços, com arredondamento fixo (o que a UI e as exportações mostram). */
export function toSpaces(hex: Hex) {
  const c = parse(hex);
  if (!c) throw new Error(`Cor inválida: ${hex}`);
  const rgb = toRgb(c);
  const hsl = toHsl(c);
  const hsv = toHsv(c);
  const lab = toLab(c);
  const ok = toOklch(c);
  // Cinzas não têm matiz (undefined no culori): fica 0, com croma 0
  return {
    hex: formatHex(c),
    rgb: { r: round(rgb.r * 255), g: round(rgb.g * 255), b: round(rgb.b * 255) },
    hsl: { h: round(hsl.h), s: round((hsl.s ?? 0) * 100), l: round(hsl.l * 100) },
    hsv: { h: round(hsv.h), s: round((hsv.s ?? 0) * 100), v: round(hsv.v * 100) },
    cmyk: cmyk(rgb.r, rgb.g, rgb.b),
    lab: { l: round(lab.l, 2), a: round(lab.a, 2), b: round(lab.b, 2) },
    oklch: { l: round(ok.l, 4), c: round(ok.c, 4), h: ok.c < 1e-4 ? 0 : round(ok.h, 2) },
  };
}

/** Diferença perceptual (ΔE 2000) entre duas cores. */
export const deltaE = (a: Hex, b: Hex) => de(a, b);

/** Cor oficial Gove mais próxima (ΔE 2000); `exact` quando é a própria cor da marca. */
export function nearestBrand(hex: Hex) {
  let best = BRAND_COLORS[0];
  let dist = Infinity;
  for (const c of BRAND_COLORS) {
    const d = de(hex, c.hex);
    if (d < dist) [best, dist] = [c, d];
  }
  return { name: best.name, hex: best.hex.toLowerCase(), deltaE: round(dist, 2), exact: dist < 0.5 };
}
