// Gradientes em CSS (linear, radial, cônico), mesh com fallback e texto com gradiente.
import { steps } from './mix.ts';
import type { GradientSpec, GradientStop, Hex, MeshPoint } from './types.ts';

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/**
 * Paradas do CSS. Fora do RGB, cada trecho ganha paradas intermediárias
 * calculadas no espaço escolhido: o navegador interpola em sRGB, e assim o
 * resultado acompanha o HSL/OKLCH em qualquer navegador.
 */
function cssStops(stops: GradientStop[], space: GradientSpec['space']): string {
  const sorted = [...stops].sort((a, b) => a.at - b.at);
  if (space === 'rgb' || sorted.length < 2) return sorted.map((s) => `${s.hex} ${pct(s.at)}`).join(', ');
  const out: string[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const [a, b] = [sorted[i], sorted[i + 1]];
    const mid = steps(a.hex, b.hex, 6, space);
    mid.forEach((hex, k) => {
      if (i > 0 && k === 0) return; // a ponta já entrou no trecho anterior
      out.push(`${hex} ${pct(a.at + ((b.at - a.at) * k) / (mid.length - 1))}`);
    });
  }
  return out.join(', ');
}

/** `background` de um gradiente linear, radial ou cônico. */
export function toCss(spec: GradientSpec): string {
  const list = cssStops(spec.stops, spec.space);
  if (spec.kind === 'radial') return `radial-gradient(circle at center, ${list})`;
  if (spec.kind === 'conico') return `conic-gradient(from ${Math.round(spec.angle)}deg at 50% 50%, ${list})`;
  return `linear-gradient(${Math.round(spec.angle)}deg, ${list})`;
}

/**
 * Mesh gradient aproximado: manchas radiais empilhadas sobre uma cor de base
 * (a primeira). Sem suporte a gradientes, o navegador mostra a cor de base.
 */
export function meshCss(points: MeshPoint[]): { background: string; backgroundColor: Hex } {
  const [base, ...spots] = points;
  return {
    backgroundColor: base?.hex ?? '#000000',
    background: spots.map((p) => `radial-gradient(circle at ${pct(p.x)} ${pct(p.y)}, ${p.hex} 0%, ${p.hex}00 ${pct(p.r)})`).join(', ') || 'none',
  };
}

/** O mesmo mesh em SVG (manchas com desfoque), para baixar ou usar onde o CSS não chega. */
export function meshSvg(points: MeshPoint[], w = 1200, h = 800): string {
  const [base, ...spots] = points;
  const size = Math.max(w, h);
  const defs = spots
    .map((p, i) => `<radialGradient id="m${i}"><stop offset="0" stop-color="${p.hex}"/><stop offset="1" stop-color="${p.hex}" stop-opacity="0"/></radialGradient>`)
    .join('');
  const circles = spots
    .map((p, i) => `<circle cx="${Math.round((p.x / 100) * w)}" cy="${Math.round((p.y / 100) * h)}" r="${Math.round((p.r / 100) * size)}" fill="url(#m${i})"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}<filter id="blur"><feGaussianBlur stdDeviation="${Math.round(size / 40)}"/></filter></defs><rect width="100%" height="100%" fill="${base?.hex ?? '#000000'}"/><g filter="url(#blur)">${circles}</g></svg>`;
}

/** CSS de texto com gradiente; `color` é o fallback onde background-clip: text não existe. */
export function textGradientCss(spec: GradientSpec): string {
  return [
    `color: ${spec.stops[0]?.hex ?? '#000000'};`,
    `background: ${toCss(spec)};`,
    '-webkit-background-clip: text;',
    'background-clip: text;',
    '-webkit-text-fill-color: transparent;',
  ].join('\n');
}
