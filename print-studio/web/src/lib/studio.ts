// Ponte para o módulo compartilhado (mesmo motor de layout usado no PDF) e
// medição de texto com a mesma Montserrat .ttf que o servidor embute no PDF.
import { FONT_FAMILIES, FONT_FILES, FONT_WEIGHTS, ptToMm } from '../../../shared/tokens.js';
import { fontSource } from '@/lib/fonts';

import * as layout from '../../../shared/layout.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const DEFAULT_TEXTS = layout.DEFAULT_TEXTS as Record<string, Record<string, string>>;
export const TEXT_LABELS = layout.TEXT_LABELS as Record<string, string>;
export const DEFAULT_SERVICES = layout.DEFAULT_SERVICES as string[];
export const BB_DEFAULT_TEXTS = layout.BB_DEFAULT_TEXTS as Record<string, Record<string, string>>;
export const { LAYOUTS, MAX_SERVICES_RECOMMENDED, formatPhone, gradientLine, pdfFileName, whatsappLink, IDENTITIES, BB_SCHEMES, bbBlockingChecks } = layout;
export type Identity = 'gove' | 'bb';
/** Textos padrão da identidade escolhida (BB: tom de voz BB). */
export const defaultTextsFor = (identity: Identity) => (identity === 'bb' ? BB_DEFAULT_TEXTS : DEFAULT_TEXTS);
/** Resultado do motor de layout (elementos em mm + checagens). */
export const buildLayout = layout.buildLayout as (id: string, input: any, m: typeof measure) => any;
export { SERVICE_ICONS, WHATSAPP_OUTLINE } from '../../../shared/icons.js';
export { COLORS, BLEED_MM, QR_MIN_MM } from '../../../shared/tokens.js';

export const FONT_FAMILY = 'Montserrat Print';
type Weight = keyof typeof FONT_WEIGHTS;

let ready: Promise<void> | null = null;

/** Fonte CSS de uma variação do layout (Montserrat ou BancoDoBrasil Titulos/Textos) a `px`. */
export function fontCss(weight: string, px: number) {
  const w = (FONT_WEIGHTS as Record<string, number>)[weight] ?? 400;
  const family = (FONT_FAMILIES as Record<string, string>)[weight] ?? FONT_FAMILY;
  return `${w} ${px}px "${family}"`;
}

/** Carrega as variações da Montserrat e das fontes BB (servidas pelo backend ou embutidas no artefato). */
export function loadPrintFonts() {
  ready ??= Promise.all(
    (Object.keys(FONT_FILES) as Weight[]).map(async (w) => {
      const face = new FontFace(FONT_FAMILIES[w], fontSource(w), { weight: String(FONT_WEIGHTS[w]) });
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => undefined);
  return ready;
}

const ctx = document.createElement('canvas').getContext('2d')!;

/** Largura do texto em mm (mesmo critério do pdfkit no servidor). */
export function measure(text: string, weight: string, sizePt: number) {
  ctx.font = fontCss(weight, 100);
  return ptToMm((ctx.measureText(text).width * sizePt) / 100);
}
