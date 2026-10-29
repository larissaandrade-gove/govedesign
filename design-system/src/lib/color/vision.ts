// Simulação de daltonismo (modelo de Machado et al. 2009, via culori).
import { converter, filterDeficiencyDeuter, filterDeficiencyProt, filterDeficiencyTrit, filterGrayscale, formatHex, parse, wcagContrast, type Color } from 'culori';
import { deltaE } from './convert.ts';
import type { Deficiency, Hex } from './types.ts';

const FILTERS: Record<Deficiency, (c: Color) => Color> = {
  protanopia: filterDeficiencyProt(1),
  deuteranopia: filterDeficiencyDeuter(1),
  tritanopia: filterDeficiencyTrit(1),
  acromatopsia: filterGrayscale(1),
};

export const DEFICIENCIES: { id: Deficiency; label: string; note: string }[] = [
  { id: 'protanopia', label: 'Protanopia', note: 'sem vermelho' },
  { id: 'deuteranopia', label: 'Deuteranopia', note: 'sem verde' },
  { id: 'tritanopia', label: 'Tritanopia', note: 'sem azul' },
  { id: 'acromatopsia', label: 'Acromatopsia', note: 'sem cor' },
];

/** Como a cor é vista com a deficiência. */
export function simulate(hex: Hex, kind: Deficiency): Hex {
  const c = parse(hex);
  return c ? (formatHex(FILTERS[kind](c)) ?? hex) : hex;
}

/** Pares de cores da paleta que ficam quase iguais (ΔE 2000 < `limit`) para a deficiência. */
export function confusable(colors: Hex[], kind: Deficiency, limit = 10): [Hex, Hex][] {
  const seen = colors.map((c) => simulate(c, kind));
  const pairs: [Hex, Hex][] = [];
  for (let i = 0; i < colors.length; i++)
    for (let j = i + 1; j < colors.length; j++) if (colors[i] !== colors[j] && deltaE(seen[i], seen[j]) < limit) pairs.push([colors[i], colors[j]]);
  return pairs;
}

const toOklab = converter('oklab');

/** Distância euclidiana no OKLab, ×100 (0 = iguais; branco × preto = 100). */
export function deltaEOk(a: Hex, b: Hex): number {
  const x = toOklab(a)!;
  const y = toOklab(b)!;
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b) * 100;
}

/**
 * Limite de "cores parecidas demais" no OKLab (×100). Abaixo de 11, duas cores
 * da paleta deixam de se distinguir de relance (o JND do OKLab fica perto de 2;
 * cores que precisam significar coisas diferentes pedem uma folga bem maior).
 * Na visão típica, só variações tonais intencionais ficam abaixo dele (Branco ×
 * Branco puro, Noite × Roxo Profundo, Roxo × Roxo Profundo).
 */
export const ATTENTION_DELTA_E = 11;
/** Contraste mínimo de texto comum (WCAG 2.1 AA). */
export const ATTENTION_CONTRAST = 4.5;

export type Attention =
  | { type: 'confusao'; with: Hex; deltaE: number }
  | { type: 'contraste'; with: Hex; before: number; after: number };

/**
 * Pontos de atenção de cada cor com a deficiência (mesma ordem de `colors`):
 * - confusão: na simulação, a cor fica a menos de ATTENTION_DELTA_E de outra
 *   da lista, e na visão típica não ficava (só conta o que a deficiência tira;
 *   pares já próximos são variações tonais da marca);
 * - contraste: o par texto/fundo tinha ≥ 4,5:1 e cai abaixo disso na simulação.
 */
export function visionAttention(colors: Hex[], kind: Deficiency, limit = ATTENTION_DELTA_E): Attention[][] {
  const list = colors.map((c) => c.toLowerCase());
  const seen = list.map((c) => simulate(c, kind));
  const out: Attention[][] = list.map(() => []);
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      if (list[i] === list[j]) continue;
      const d = deltaEOk(seen[i], seen[j]);
      if (d < limit && deltaEOk(list[i], list[j]) >= limit) {
        out[i].push({ type: 'confusao', with: list[j], deltaE: d });
        out[j].push({ type: 'confusao', with: list[i], deltaE: d });
      }
      const before = wcagContrast(list[i], list[j]);
      const after = wcagContrast(seen[i], seen[j]);
      if (before >= ATTENTION_CONTRAST && after < ATTENTION_CONTRAST) {
        out[i].push({ type: 'contraste', with: list[j], before, after });
        out[j].push({ type: 'contraste', with: list[i], before, after });
      }
    }
  return out;
}
