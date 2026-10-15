// Processamento de imagem no navegador (substitui o sharp do modo servidor).
// Sem conversão de cor: o navegador só gera JPEG RGB — o relatório de
// verificação avisa que as imagens precisam ser convertidas para CMYK.

/** Largura mínima recomendada do logo: ~57 mm (maior uso, Flyer A4) a 300 dpi. */
const LOGO_MIN_PX = 700;
const SVG_RASTER_W = 2400;

export class ImageInputError extends Error {}

type Drawable = CanvasImageSource & { width: number; height: number };

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  return { c, ctx };
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageInputError('Imagem ilegível.'));
    img.src = url;
  });
}

/** Decodifica PNG/JPEG/WebP (orientação EXIF aplicada pelo navegador). */
export async function decode(blob: Blob): Promise<Drawable> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImg(url);
      return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** SVG rasterizado a 2400 px de largura (mesma regra do servidor). */
async function rasterizeSvg(text: string): Promise<HTMLCanvasElement> {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') throw new ImageInputError('SVG inválido.');
  const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  let w = parseFloat(svg.getAttribute('width') ?? '') || vb[2] || 300;
  let h = parseFloat(svg.getAttribute('height') ?? '') || vb[3] || 150;
  if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  h = (h / w) * SVG_RASTER_W;
  w = SVG_RASTER_W;
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImg(url);
    const { c, ctx } = canvas(w, h);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao codificar a imagem.'))), type, quality));
}

export type StoredLogo = { blob: Blob; width: number; height: number; warnings: string[] };

/**
 * Valida o logo (PNG/SVG com fundo transparente), rasteriza SVG e recorta as
 * margens transparentes — como `storeLogo` do servidor. Devolve um PNG.
 */
export async function prepareLogo(file: File): Promise<StoredLogo> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const text = isPng ? '' : await file.slice(0, 2 * 1024 * 1024).text();
  const isSvg = !isPng && (/\.svg$/i.test(file.name) || text.includes('<svg'));
  if (!isPng && !isSvg) throw new ImageInputError('O logo deve ser PNG ou SVG com fundo transparente.');

  let src: CanvasImageSource & { width: number; height: number };
  try {
    src = isSvg ? await rasterizeSvg(await file.text()) : await decode(file);
  } catch {
    throw new ImageInputError('Arquivo de logo ilegível. Envie PNG ou SVG.');
  }
  const warnings: string[] = [];
  const { c, ctx } = canvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  const { data, width: W, height: H } = ctx.getImageData(0, 0, c.width, c.height);

  let transparent = false;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * 4 + 3];
      if (a < 255) transparent = true;
      if (a > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new ImageInputError('O logo está totalmente transparente.');
  if (!transparent) warnings.push('PNG sem transparência: o fundo do arquivo aparecerá na peça.');
  if (!isSvg && W < LOGO_MIN_PX) warnings.push(`Logo com ${W} px de largura: abaixo de 300 dpi no maior tamanho de uso (mín. ${LOGO_MIN_PX} px).`);

  const tw = x1 - x0 + 1;
  const th = y1 - y0 + 1;
  const out = canvas(tw, th);
  out.ctx.drawImage(c, x0, y0, tw, th, 0, 0, tw, th);
  return { blob: await toBlob(out.c, 'image/png'), width: tw, height: th, warnings };
}

/** Dimensões de uma foto (PNG/JPEG/WebP). */
export async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  let img: Drawable;
  try {
    img = await decode(blob);
  } catch {
    throw new ImageInputError('Imagem ilegível. Envie JPG, PNG ou WebP.');
  }
  const r = { width: img.width, height: img.height };
  if ('close' in img && typeof img.close === 'function') img.close();
  return r;
}

const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/**
 * Recorte 9:16 centrado no foco (0–1) e JPEG no tamanho de impressão a 300 dpi
 * (sem ampliar além do original). RGB — ver aviso no relatório.
 */
export async function mockupJpeg(blob: Blob, focus: { x: number; y: number } | undefined, screenWmm: number): Promise<Uint8Array> {
  const src = await decode(blob);
  const W = src.width;
  const H = src.height;
  const cropW = Math.min(W, Math.floor((H * 9) / 16));
  const cropH = Math.floor((cropW * 16) / 9);
  const fx = Math.min(1, Math.max(0, focus?.x ?? 0.5));
  const fy = Math.min(1, Math.max(0, focus?.y ?? 0.5));
  const left = Math.round((W - cropW) * fx);
  const top = Math.round((H - cropH) * fy);
  const targetW = Math.min(cropW, Math.round((screenWmm / 25.4) * 300));
  const targetH = Math.round((targetW * cropH) / cropW);
  const { c, ctx } = canvas(targetW, targetH);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, left, top, cropW, cropH, 0, 0, c.width, c.height);
  return bytes(await toBlob(c, 'image/jpeg', 0.95));
}

/** Logo para o PDF: achatado sobre branco (faixa branca do rodapé) em JPEG. */
export async function logoJpeg(blob: Blob, widthMm: number): Promise<Uint8Array> {
  const src = await decode(blob);
  const targetW = Math.min(src.width, Math.max(200, Math.round((widthMm / 25.4) * 300)));
  const targetH = Math.round((targetW * src.height) / src.width);
  const { c, ctx } = canvas(targetW, targetH);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return bytes(await toBlob(c, 'image/jpeg', 1));
}
