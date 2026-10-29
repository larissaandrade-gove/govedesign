// Cores permitidas nas ferramentas da Bússola: as 10 institucionais + branco e preto puros.
import { BRAND_COLORS } from '../../data/colorCompass.ts';
import type { Hex } from './types.ts';

export type ToolColor = { name: string; hex: Hex; /** Branco ou preto puro: só para compor peças com mais contraste. */ pure: boolean };

/**
 * As 12 cores que as ferramentas aceitam: a paleta institucional (BRAND_COLORS)
 * e o branco e o preto puros. Nenhuma ferramenta recebe HEX livre: tudo o que
 * se escolhe sai desta lista. O branco e o preto puros ficam fora de
 * BRAND_COLORS porque ela também desenha o círculo da Bússola.
 */
export const TOOL_COLORS: ToolColor[] = [
  ...BRAND_COLORS.map((c) => ({ name: c.name, hex: c.hex.toLowerCase(), pure: false })),
  { name: 'Branco puro', hex: '#ffffff', pure: true },
  { name: 'Preto puro', hex: '#000000', pure: true },
];

/** A cor permitida com este HEX (qualquer caixa), ou undefined. */
export const toolColor = (hex: Hex) => TOOL_COLORS.find((c) => c.hex === String(hex).toLowerCase());
export const isAllowed = (hex: Hex) => !!toolColor(hex);
/** Nome da cor permitida, ou o próprio HEX em maiúsculas. */
export const colorName = (hex: Hex) => toolColor(hex)?.name ?? String(hex).toUpperCase();
