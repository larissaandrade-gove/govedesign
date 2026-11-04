// Paleta institucional Gove (skill gove-design-system). As peças exportadas
// (PDF e .pptx) usam só estas cores — nunca preto puro (#000000).
export const PALETTE = {
  branco: '#F4F4F4',
  brancoPuro: '#FFFFFF',
  noite: '#20133D',
  amarelo: '#FFC72C',
  roxo: '#3D0099',
  roxoProfundo: '#351F65',
  grafite: '#2F3539',
  cinza: '#5B6770',
  ciano: '#5AC2CD',
  lavanda: '#A278DA',
  azul: '#16499F',
} as const;

export type PaletteKey = keyof typeof PALETTE;
export type PaletteHex = (typeof PALETTE)[PaletteKey];

export const PALETTE_HEX: readonly string[] = Object.values(PALETTE);

/** Contraste WCAG entre duas cores HEX. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}
