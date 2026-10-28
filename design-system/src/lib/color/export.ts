// Exportações: variáveis CSS, JSON, trecho de configuração do Tailwind e SVG de amostras.
import type { Hex, Shade, Theme } from './types.ts';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'cor';

export type Exportable = { name: string; shades?: Shade[]; colors?: Hex[]; theme?: Theme };

/** Pares nome → cor achatados (escala, lista ou tema). */
function entries({ name, shades, colors, theme }: Exportable): [string, Hex][] {
  const n = slug(name);
  if (shades) return shades.map((s) => [`${n}-${s.step}`, s.hex]);
  if (theme)
    return (['light', 'dark'] as const).flatMap((mode) => Object.entries(theme[mode]).map(([k, v]) => [`${n}-${mode}-${slug(k.replace(/[A-Z]/g, (c) => `-${c}`))}`, v] as [string, Hex]));
  return (colors ?? []).map((c, i) => [`${n}-${i + 1}`, c]);
}

export function toCssVars(x: Exportable): string {
  return `:root {\n${entries(x)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n')}\n}\n`;
}

export function toJson(x: Exportable): string {
  const n = slug(x.name);
  if (x.shades) return JSON.stringify({ [n]: Object.fromEntries(x.shades.map((s) => [s.step, s.hex])) }, null, 2);
  if (x.theme) return JSON.stringify({ [n]: x.theme }, null, 2);
  return JSON.stringify({ [n]: x.colors ?? [] }, null, 2);
}

/** Trecho para `theme.extend.colors` do tailwind.config. */
export function toTailwind(x: Exportable): string {
  const n = slug(x.name);
  const body = x.shades
    ? x.shades.map((s) => `        ${s.step}: '${s.hex}',`).join('\n')
    : entries(x)
        .map(([k, v]) => `        '${k.slice(n.length + 1)}': '${v}',`)
        .join('\n');
  return `// tailwind.config.js\nexport default {\n  theme: {\n    extend: {\n      colors: {\n        '${n}': {\n${body.replace(/^ {8}/gm, '          ')}\n        },\n      },\n    },\n  },\n};\n`;
}

/** Amostras lado a lado com o HEX embaixo. */
export function paletteSvg(colors: Hex[], w = 120, h = 140): string {
  const cells = colors
    .map((c, i) => `<g transform="translate(${i * w} 0)"><rect width="${w}" height="${h - 28}" fill="${c}"/><text x="${w / 2}" y="${h - 9}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="13" fill="#20133D">${c.toUpperCase()}</text></g>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${colors.length * w}" height="${h}" viewBox="0 0 ${colors.length * w} ${h}"><rect width="100%" height="100%" fill="#FFFFFF"/>${cells}</svg>`;
}
