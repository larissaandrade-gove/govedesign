// Ponte para o módulo compartilhado (mesmo motor de layout usado no PDF) e
// medição de texto com a mesma Montserrat .ttf que o servidor embute no PDF.
import { FONT_FILES, FONT_WEIGHTS, ptToMm } from '../../../shared/tokens.js';

import * as layout from '../../../shared/layout.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const DEFAULT_TEXTS = layout.DEFAULT_TEXTS as Record<string, Record<string, string>>;
export const TEXT_LABELS = layout.TEXT_LABELS as Record<string, string>;
export const { LAYOUTS, MAX_SERVICES_RECOMMENDED, formatPhone, gradientLine, pdfFileName, whatsappLink } = layout;
/** Resultado do motor de layout (elementos em mm + checagens). */
export const buildLayout = layout.buildLayout as (id: string, input: any, m: typeof measure) => any;
export { SERVICE_ICONS, WHATSAPP_OUTLINE } from '../../../shared/icons.js';
export { COLORS, BLEED_MM, QR_MIN_MM } from '../../../shared/tokens.js';

export const FONT_FAMILY = 'Montserrat Print';
type Weight = keyof typeof FONT_WEIGHTS;

let ready: Promise<void> | null = null;

/** Carrega as 4 variações da Montserrat servidas pelo backend (/print-studio/fonts). */
export function loadPrintFonts() {
  ready ??= Promise.all(
    (Object.keys(FONT_FILES) as Weight[]).map(async (w) => {
      const face = new FontFace(FONT_FAMILY, `url(fonts/${FONT_FILES[w]})`, { weight: String(FONT_WEIGHTS[w]) });
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => undefined);
  return ready;
}

const ctx = document.createElement('canvas').getContext('2d')!;

/** Largura do texto em mm (mesmo critério do pdfkit no servidor). */
export function measure(text: string, weight: string, sizePt: number) {
  ctx.font = `${FONT_WEIGHTS[weight as Weight] ?? 400} 100px "${FONT_FAMILY}"`;
  return ptToMm((ctx.measureText(text).width * sizePt) / 100);
}
