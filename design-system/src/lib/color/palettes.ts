// Paletas institucionais: harmonias, pares de contraste e tema claro/escuro feitos só das cores permitidas.
import { converter, wcagContrast } from 'culori';
import { ATTRIBUTES, TOPICS } from '../../data/colorCompass.ts';
import { TOOL_COLORS, toolColor } from './allowed.ts';
import { deltaE, hexOf, nearestBrand } from './convert.ts';
import type { HarmonyKind, Hex, Theme } from './types.ts';

const toOklch = converter('oklch');
const toHsl = converter('hsl');
const oklch = (hex: Hex) => {
  const c = toOklch(hex)!;
  return { l: c.l, c: c.c, h: c.h ?? 0 };
};
const hueDist = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/**
 * Alvos geométricos da harmonia: rotações no círculo cromático clássico (matiz
 * HSL, mantendo saturação e luminosidade), como no círculo da Bússola. Gera
 * cores livres: a interface usa `brandHarmony`, que troca cada alvo pela cor
 * permitida mais próxima. A primeira cor é sempre a base.
 */
export function harmony(hex: Hex, kind: HarmonyKind): Hex[] {
  const base = toHsl(hex)!;
  const rot = (deg: number[]) => [hex.toLowerCase(), ...deg.map((d) => hexOf({ ...base, h: ((((base.h ?? 0) + d) % 360) + 360) % 360 }))];
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
      return rot([]);
  }
}

/** Croma OKLCH abaixo do qual a cor conta como neutra (Branco, Grafite, Cinza técnico, branco e preto puros). */
const NEUTRAL_CHROMA = 0.04;
/** Base neutra não tem matiz: a harmonia sai do Roxo, a cor da marca. */
export const HARMONY_ANCHOR: Hex = '#3d0099';

/** Neutra (sem matiz útil para harmonias): Branco, Grafite, Cinza técnico, branco e preto puros. */
export const isNeutralColor = (hex: Hex) => oklch(hex).c < NEUTRAL_CHROMA;
const isNeutral = isNeutralColor;
const CHROMATIC = TOOL_COLORS.filter((c) => !isNeutral(c.hex)).map((c) => c.hex);

/**
 * Harmonia só com cores permitidas. A base vira a cor permitida mais próxima;
 * cada alvo geométrico de `harmony` é trocado pela cor cromática permitida de
 * matiz OKLCH mais próximo, sem repetir (empate: a luminosidade mais próxima do
 * alvo; na análoga, as vizinhas da base primeiro). Base neutra: base + a harmonia do Roxo. Monocromática: as cores de
 * matiz vizinho (até 35°) e, se faltar, branco e preto puros (tons e sombras).
 */
export function brandHarmony(hex: Hex, kind: HarmonyKind): Hex[] {
  const base = nearestBrand(hex).hex;
  const neutral = isNeutral(base);
  const used = new Set([base]);
  if (kind === 'monocromatica') {
    const pool = neutral ? TOOL_COLORS.map((c) => c.hex).filter(isNeutral) : CHROMATIC.filter((c) => hueDist(oklch(c).h, oklch(base).h) <= 35);
    const rest = pool.filter((c) => !used.has(c));
    if (rest.length < 2) rest.push(...['#ffffff', '#000000'].filter((c) => !used.has(c) && !rest.includes(c)));
    return [base, ...rest.sort((a, b) => oklch(b).l - oklch(a).l).slice(0, 4)];
  }
  const targets = neutral ? harmony(HARMONY_ANCHOR, kind) : harmony(base, kind).slice(1);
  const out = [base];
  for (const t of targets) {
    const goal = oklch(t);
    const free = CHROMATIC.filter((c) => !used.has(c));
    // Análoga: vizinhas da base (até 100°) antes de cores do outro lado do círculo
    const near = kind === 'analoga' && !neutral ? free.filter((c) => hueDist(oklch(c).h, oklch(base).h) <= 100) : free;
    const pick = (near.length ? near : free)
      .map((c) => ({ c, score: hueDist(oklch(c).h, goal.h) + 30 * Math.abs(oklch(c).l - goal.l) }))
      .sort((a, b) => a.score - b.score)[0]?.c;
    if (!pick) break;
    used.add(pick);
    out.push(pick);
  }
  return out;
}

const contrast = (a: Hex, b: Hex) => wcagContrast(a, b);
/** Contraste WCAG 2.1. */
export const contrastRatio = contrast;

export type ContrastLevel = 'AAA' | 'AA' | 'AA grande' | 'falha';
export const contrastLevel = (ratio: number): ContrastLevel => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA grande' : 'falha');

/** A base sobre cada outra cor permitida (e vice-versa), do maior contraste para o menor. */
export function contrastPairs(hex: Hex): { other: Hex; ratio: number; level: ContrastLevel }[] {
  const base = nearestBrand(hex).hex;
  return TOOL_COLORS.filter((c) => c.hex !== base)
    .map((c) => {
      const ratio = contrast(base, c.hex);
      return { other: c.hex, ratio, level: contrastLevel(ratio) };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Pares de cor da marca para texto sobre a cor; branco e preto puros só se nenhum passar. */
const ON_COLOR: Hex[] = ['#f4f4f4', '#20133d', '#ffffff', '#000000'];
const onColor = (bg: Hex) => ON_COLOR.find((c) => contrast(c, bg) >= 4.5) ?? ON_COLOR.reduce((a, b) => (contrast(b, bg) > contrast(a, bg) ? b : a));

/** A cor (ou a cromática permitida mais parecida com ela) com texto ≥ 4,5:1 sobre o fundo. */
function primaryOn(base: Hex, surface: Hex): Hex {
  if (base !== surface && contrast(base, surface) >= 4.5) return base;
  const near = CHROMATIC.filter((c) => c !== surface && contrast(c, surface) >= 4.5).sort((a, b) => deltaE(a, base) - deltaE(b, base));
  return near[0] ?? onColor(surface);
}

/**
 * Tema claro (superfície Branco, texto Noite) e escuro (superfície Noite, texto
 * Branco) só com cores permitidas. A primária é a base quando tem 4,5:1 sobre a
 * superfície; senão, a cor da marca mais parecida que tenha.
 */
export function brandTheme(hex: Hex): Theme {
  const base = nearestBrand(hex).hex;
  const lp = primaryOn(base, '#f4f4f4');
  const dp = primaryOn(base, '#20133d');
  return {
    light: { primary: lp, onPrimary: onColor(lp), surface: '#f4f4f4', text: '#20133d', muted: '#5b6770', border: '#a278da' },
    dark: { primary: dp, onPrimary: onColor(dp), surface: '#20133d', text: '#f4f4f4', muted: '#a278da', border: '#351f65' },
  };
}

export type Combo = { name: string; note: string; colors: { hex: Hex; share?: number }[]; hasBase: boolean };

/**
 * Combinações curadas do estudo de marca: o mix de cada pauta (com as
 * proporções) e os atributos da nova bússola. As que contêm a base vêm primeiro.
 */
export function brandCombos(hex: Hex): Combo[] {
  const base = nearestBrand(hex).hex;
  const list: Combo[] = [
    ...TOPICS.map((t) => ({ name: t.name, note: 'Pauta', colors: t.mix.map((m) => ({ hex: m.hex.toLowerCase(), share: m.share })), hasBase: false })),
    ...ATTRIBUTES.map((a) => ({ name: a.name, note: 'Atributo', colors: a.colors.map((c) => ({ hex: c.toLowerCase() })), hasBase: false })),
  ].map((c) => ({ ...c, hasBase: c.colors.some((x) => x.hex === base) }));
  // Garante que o mix só usa cores permitidas (os dados vêm do estudo)
  for (const c of list) for (const x of c.colors) if (!toolColor(x.hex)) throw new Error(`Cor fora da paleta em ${c.name}: ${x.hex}`);
  return [...list.filter((c) => c.hasBase), ...list.filter((c) => !c.hasBase)];
}
