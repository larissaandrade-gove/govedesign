// Mistura de cores e passos intermediários em RGB, HSL ou OKLCH.
import { interpolate } from 'culori';
import { hexOf } from './convert.ts';
import type { Hex, Space } from './types.ts';

// O culori interpola matizes pelo caminho mais curto (fixupHueShorter) por padrão.
const lerp = (a: Hex, b: Hex, space: Space) => interpolate([a, b], space);

/** Mistura `a` e `b` (t = 0 → a, t = 1 → b) no espaço escolhido. */
export function mix(a: Hex, b: Hex, t: number, space: Space = 'oklch'): Hex {
  const k = Math.min(1, Math.max(0, t));
  if (k === 0) return a.toLowerCase();
  if (k === 1) return b.toLowerCase();
  return hexOf(lerp(a, b, space)(k));
}

/** `n` cores de `a` até `b`, inclusive as pontas. */
export function steps(a: Hex, b: Hex, n: number, space: Space = 'oklch'): Hex[] {
  const count = Math.max(2, Math.round(n));
  return Array.from({ length: count }, (_, i) => mix(a, b, i / (count - 1), space));
}
