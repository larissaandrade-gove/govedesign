// Harmonias, escala de tons 50–950 e tema claro/escuro a partir de uma cor base.
import { converter, wcagContrast } from 'culori';
import { hexOf } from './convert.ts';
import type { HarmonyKind, Hex, Shade, Theme } from './types.ts';

const toOklch = converter('oklch');
const oklch = (hex: Hex) => {
  const c = toOklch(hex)!;
  return { l: c.l, c: c.c, h: c.h ?? 0 };
};
const at = (l: number, c: number, h: number): Hex => hexOf({ mode: 'oklch', l, c, h: ((h % 360) + 360) % 360 });

const toHsl = converter('hsl');

/**
 * Harmonia a partir da cor base. As rotações seguem o círculo cromático
 * clássico (matiz HSL, mantendo saturação e luminosidade), como no círculo da
 * Bússola; a monocromática varia só a luminosidade no OKLCH, que preserva o
 * matiz percebido. A primeira cor é sempre a base.
 */
export function harmony(hex: Hex, kind: HarmonyKind): Hex[] {
  const { l, c, h } = oklch(hex);
  const base = toHsl(hex)!;
  const rot = (deg: number[]) => [hex.toLowerCase(), ...deg.map((d) => hexOf({ ...base, h: (((base.h ?? 0) + d) % 360 + 360) % 360 }))];
  switch (kind) {
    case 'complementar':
      return rot([180]);
    case 'analoga':
      return rot([-30, 30]);
    case 'triade':
      return rot([120, 240]);
    case 'tetradica':
      return rot([90, 180, 270]);
    case 'monocromatica':
      return [hex.toLowerCase(), ...[-0.24, -0.12, 0.12, 0.24].map((d) => at(Math.min(0.97, Math.max(0.15, l + d)), c, h))];
  }
}

export const SHADE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
/** Luminosidade OKLCH de cada passo (referência: escalas do Tailwind v4). */
const LIGHTNESS = [0.97, 0.93, 0.87, 0.79, 0.7, 0.62, 0.53, 0.45, 0.38, 0.3, 0.22];
/** O croma diminui nas pontas para os tons claros e escuros não estourarem o gamut. */
const CHROMA = [0.15, 0.3, 0.55, 0.8, 0.95, 1, 0.95, 0.85, 0.75, 0.62, 0.5];

/**
 * Escala 50–950 (estilo Tailwind) mantendo o matiz da base. O passo mais
 * próximo da luminosidade da base recebe a própria base.
 */
export function shades(hex: Hex): Shade[] {
  const { l, c, h } = oklch(hex);
  const nearest = LIGHTNESS.reduce((best, v, i) => (Math.abs(v - l) < Math.abs(LIGHTNESS[best] - l) ? i : best), 0);
  return SHADE_STEPS.map((step, i) => ({ step, hex: i === nearest ? hex.toLowerCase() : at(LIGHTNESS[i], c * CHROMA[i], h) }));
}

const contrast = (a: Hex, b: Hex) => wcagContrast(a, b);
/** Texto (branco ou quase preto) com mais contraste sobre a cor. */
const onColor = (bg: Hex) => (contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111');

/** Tokens de tema claro e escuro tirados da escala (texto ≥ 4,5:1 sobre a superfície). */
export function themeFrom(hex: Hex): Theme {
  const s = Object.fromEntries(shades(hex).map((x) => [x.step, x.hex])) as Record<number, Hex>;
  const pick = (bg: Hex, steps: number[]) => steps.map((k) => s[k]).find((c) => contrast(c, bg) >= 4.5) ?? onColor(bg);
  const lightPrimary = pick('#ffffff', [600, 700, 800, 900]);
  const darkPrimary = pick(s[950], [400, 300, 200, 100]);
  return {
    light: { primary: lightPrimary, onPrimary: onColor(lightPrimary), surface: s[50], text: pick(s[50], [950, 900]), muted: pick(s[50], [700, 800, 900]), border: s[200] },
    dark: { primary: darkPrimary, onPrimary: onColor(darkPrimary), surface: s[950], text: pick(s[950], [50, 100]), muted: pick(s[950], [300, 200, 100]), border: s[800] },
  };
}

/** Contraste WCAG 2.1 (para rotular a escala). */
export const contrastRatio = contrast;
