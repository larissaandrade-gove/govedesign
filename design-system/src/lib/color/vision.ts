// Simulação de daltonismo (modelo de Machado et al. 2009, via culori).
import { filterDeficiencyDeuter, filterDeficiencyProt, filterDeficiencyTrit, filterGrayscale, formatHex, parse, type Color } from 'culori';
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
