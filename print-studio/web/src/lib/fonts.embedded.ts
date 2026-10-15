// Montserrat embutida no build de artefato (sem servidor): versões reduzidas ao
// alfabeto latino (scripts/subset-fonts.sh). As mesmas bytes alimentam o preview
// (FontFace) e o PDF (pdfkit), então a medição de texto é idêntica.
import black from '@/assets/fonts/Montserrat-Black.ttf?inline';
import bold from '@/assets/fonts/Montserrat-Bold.ttf?inline';
import regular from '@/assets/fonts/Montserrat-Regular.ttf?inline';
import semibold from '@/assets/fonts/Montserrat-SemiBold.ttf?inline';

export type FontWeight = 'regular' | 'semibold' | 'bold' | 'black';

const DATA: Record<FontWeight, string> = { regular, semibold, bold, black };
const cache = new Map<FontWeight, ArrayBuffer>();

function decode(dataUrl: string): ArrayBuffer {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Bytes da .ttf (cópia nova a cada chamada: FontFace pode transferir o buffer). */
export function fontBytes(weight: FontWeight): ArrayBuffer {
  if (!cache.has(weight)) cache.set(weight, decode(DATA[weight]));
  return cache.get(weight)!.slice(0);
}

export function fontSource(weight: FontWeight): string | ArrayBuffer {
  return fontBytes(weight);
}
