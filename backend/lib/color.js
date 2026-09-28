// Conversão de cor, Delta-E (CIEDE2000 em L*a*b*) e contraste WCAG.
// É a base de todas as checagens de cor do revisor.
import { Color } from 'fabric/node';

/**
 * Converte qualquer cor CSS aceita pelo Fabric (hex, rgb[a], hsl[a], nomes)
 * em { r, g, b, a } (0–255, alpha 0–1). Retorna null para valores vazios,
 * "transparent" ou não reconhecidos.
 */
export function parseColor(input) {
  if (input == null) return null;
  if (typeof input === 'object' && 'r' in input) return { a: 1, ...input };
  const str = String(input).trim();
  if (!str || str === 'none' || str === 'transparent') return null;
  const [r, g, b, a] = new Color(str).getSource();
  // O Fabric devolve preto opaco para valores que não reconhece.
  if (r === 0 && g === 0 && b === 0 && a === 1 && !isExplicitBlack(str)) return null;
  return { r, g, b, a };
}

function isExplicitBlack(str) {
  const s = str.toLowerCase().replace(/\s+/g, '');
  return (
    s === 'black' ||
    /^#0{3}(f|ff)?$/.test(s) ||
    /^#0{6}(ff)?$/.test(s) ||
    /^rgba?\(0,0,0(,(1|1\.0+|100%))?\)$/.test(s) ||
    /^hsla?\(\d+(deg)?,\d+%?,0%?(,(1|1\.0+|100%))?\)$/.test(s)
  );
}

export function toHex({ r, g, b }) {
  const h = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

/** Compõe uma cor com alpha sobre um fundo opaco. */
export function flatten(color, over = { r: 255, g: 255, b: 255 }) {
  const a = color.a ?? 1;
  return {
    r: color.r * a + over.r * (1 - a),
    g: color.g * a + over.g * (1 - a),
    b: color.b * a + over.b * (1 - a),
    a: 1,
  };
}

// ---------- sRGB → XYZ (D65) → L*a*b* ----------

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab({ r, g, b }) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // Matriz sRGB → XYZ (D65), normalizada pelo branco de referência
  const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** CIEDE2000 (Sharma, Wu & Dalal, 2005). Entradas em L*a*b*. */
export function deltaE2000(lab1, lab2) {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hp = (a, b) => {
    if (a === 0 && b === 0) return 0;
    const h = deg(Math.atan2(b, a));
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(a1p, b1);
  const h2p = hp(a2p, b2);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
    else hbarp = (h1p + h2p - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63));
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  );
}

/** ΔE2000 entre duas cores em qualquer formato aceito por parseColor. */
export function deltaE(c1, c2) {
  const a = parseColor(c1);
  const b = parseColor(c2);
  if (!a || !b) return Infinity;
  return deltaE2000(rgbToLab(a), rgbToLab(b));
}

/**
 * Encontra a cor da paleta mais próxima.
 * @param palette [{ name, hex, ... }]
 * @returns { match, deltaE, level: 'pass' | 'warn' | 'fail' }
 */
export function nearestPaletteColor(color, palette, { deltaEPass = 3, deltaEWarn = 6 } = {}) {
  const c = parseColor(color);
  if (!c || palette.length === 0) return { match: null, deltaE: Infinity, level: 'fail' };
  const lab = rgbToLab(c);
  let best = null;
  let bestDE = Infinity;
  for (const p of palette) {
    const pc = parseColor(p.hex);
    if (!pc) continue;
    const d = deltaE2000(lab, rgbToLab(pc));
    if (d < bestDE) {
      bestDE = d;
      best = p;
    }
  }
  const level = bestDE <= deltaEPass ? 'pass' : bestDE <= deltaEWarn ? 'warn' : 'fail';
  return { match: best, deltaE: bestDE, level };
}

// ---------- WCAG ----------

/** Luminância relativa WCAG 2.x. */
export function relativeLuminance(color) {
  const c = parseColor(color);
  if (!c) return null;
  return 0.2126 * srgbToLinear(c.r) + 0.7152 * srgbToLinear(c.g) + 0.0722 * srgbToLinear(c.b);
}

/** Razão de contraste WCAG entre duas cores opacas (1–21). */
export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (l1 == null || l2 == null) return null;
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export const round = (n, d = 2) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : n);
