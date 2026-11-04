// Fontes e logotipos embutidos no HTML do app (sem servidor). As mesmas bytes das
// fontes alimentam a prévia (FontFace), a medição de texto e o PDF (pdfkit).
import interRegular from '@/assets/fonts/inter-latin-400-normal.woff?inline';
import interSemibold from '@/assets/fonts/inter-latin-600-normal.woff?inline';
import montBold from '@/assets/fonts/Montserrat-Bold.ttf?inline';
import montSemibold from '@/assets/fonts/Montserrat-SemiBold.ttf?inline';
import logoBranco from '../../../brand/logos/gove-logo-branco.webp?inline';
import logoBrancoAmarelo from '../../../brand/logos/gove-logo-branco-amarelo.webp?inline';
import logoCor from '../../../brand/logos/gove-logo-cor.webp?inline';
import logoRoxo from '../../../brand/logos/gove-logo-roxo.webp?inline';
import type { FontBytes } from './pdf.ts';

function decode(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const SOURCES = { 'display-bold': montBold, 'display-semibold': montSemibold, 'body-regular': interRegular, 'body-semibold': interSemibold } as const;

let bytes: FontBytes | null = null;
export function fontBytes(): FontBytes {
  if (!bytes) bytes = Object.fromEntries(Object.entries(SOURCES).map(([k, v]) => [k, decode(v)])) as FontBytes;
  return bytes;
}

/** Registra Montserrat (600, 700) e Inter (400, 600) com as mesmas bytes do PDF. */
export async function loadFonts(): Promise<void> {
  const faces: [string, string, keyof typeof SOURCES][] = [
    ['Montserrat', '700', 'display-bold'],
    ['Montserrat', '600', 'display-semibold'],
    ['Inter', '400', 'body-regular'],
    ['Inter', '600', 'body-semibold'],
  ];
  const b = fontBytes();
  await Promise.all(
    faces.map(async ([family, weight, key]) => {
      try {
        const f = new FontFace(family, b[key].slice().buffer, { weight, style: 'normal' });
        await f.load();
        document.fonts.add(f);
      } catch {
        /* sem FontFace: a prévia usa a reserva (Helvetica, Arial) */
      }
    }),
  );
}

/** Logotipos oficiais (WebP) por arquivo, para a prévia. */
export const LOGO_WEBP: Record<string, string> = {
  'gove-logo-cor.webp': logoCor,
  'gove-logo-branco-amarelo.webp': logoBrancoAmarelo,
  'gove-logo-roxo.webp': logoRoxo,
  'gove-logo-branco.webp': logoBranco,
};

const png = new Map<string, string>();
/** Converte os logotipos para PNG (pdfkit e PowerPoint não leem WebP). */
export async function loadLogoPngs(): Promise<(file: string) => string> {
  for (const [file, src] of Object.entries(LOGO_WEBP)) {
    if (png.has(file)) continue;
    const img = new Image();
    img.src = src;
    await img.decode();
    const w = Math.min(1200, img.naturalWidth);
    const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    png.set(file, canvas.toDataURL('image/png'));
  }
  return (file) => png.get(file) ?? '';
}
