// Origem das .ttf da Montserrat no modo servidor: o backend serve /print-studio/fonts.
// (No build de artefato, o alias troca este módulo por fonts.embedded.ts.)
import { FONT_FILES } from '../../../shared/tokens.js';

export type FontWeight = keyof typeof FONT_FILES;

/** Fonte para `new FontFace(...)`: URL relativa ou bytes da .ttf. */
export function fontSource(weight: FontWeight): string | ArrayBuffer {
  return `url(fonts/${FONT_FILES[weight]})`;
}
