// Processamento de imagem (sharp): logos em alta resolução, fotos do mockup e
// conversão para JPEG CMYK antes de entrar no PDF.
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FILES_DIR } from './db.js';

/** Largura mínima recomendada do logo: ~57 mm (maior uso, Flyer A4) a 300 dpi. */
const LOGO_MIN_PX = 700;

export class ImageInputError extends Error {}

/**
 * Valida o logo (PNG/SVG com fundo transparente) e grava o original e a versão
 * de trabalho em alta resolução (PNG). SVG é rasterizado a 2400 px de largura.
 */
export async function storeLogo(buffer, originalName = '') {
  const isSvg = /\.svg$/i.test(originalName) || buffer.subarray(0, 512).toString('utf8').includes('<svg');
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new ImageInputError('Arquivo de logo ilegível. Envie PNG ou SVG.');
  }
  if (!isSvg && meta.format !== 'png') throw new ImageInputError('O logo deve ser PNG ou SVG com fundo transparente.');

  const warnings = [];
  const hires = isSvg
    ? await sharp(buffer, { density: 1200 }).resize({ width: 2400, withoutEnlargement: false }).png().toBuffer()
    : await sharp(buffer).png().toBuffer();
  const h = await sharp(hires).metadata();
  if (!h.hasAlpha) warnings.push('PNG sem transparência: o fundo do arquivo aparecerá na peça.');
  if (!isSvg && h.width < LOGO_MIN_PX) {
    warnings.push(`Logo com ${h.width} px de largura: abaixo de 300 dpi no maior tamanho de uso (mín. ${LOGO_MIN_PX} px).`);
  }
  // Recorta margens transparentes para o logo ocupar o espaço reservado
  const trimmed = await sharp(hires).trim({ threshold: 1 }).png().toBuffer().catch(() => hires);
  const tm = await sharp(trimmed).metadata();

  const id = randomUUID();
  const original = `logo-${id}.${isSvg ? 'svg' : 'png'}`;
  const hiresFile = `logo-${id}-hires.png`;
  writeFileSync(join(FILES_DIR, original), buffer);
  writeFileSync(join(FILES_DIR, hiresFile), trimmed);
  return { original, hires: hiresFile, width: tm.width, height: tm.height, warnings };
}

/** Foto do mockup: qualquer proporção; o recorte 9:16 é feito na exportação (com o foco escolhido). */
export async function storeMockupImage(buffer) {
  let meta;
  try {
    meta = await sharp(buffer).rotate().metadata();
  } catch {
    throw new ImageInputError('Imagem ilegível. Envie JPG, PNG ou WebP.');
  }
  const id = randomUUID();
  const file = `mockup-${id}.png`;
  const normalized = await sharp(buffer).rotate().png().toBuffer();
  writeFileSync(join(FILES_DIR, file), normalized);
  const m = await sharp(normalized).metadata();
  return { id, file, width: m.width, height: m.height, format: meta.format };
}

export const readStored = (file) => readFileSync(join(FILES_DIR, file));

/**
 * Recorte na proporção da tela do celular (padrão 9:16), centrado no foco (0–1), e
 * conversão para JPEG CMYK no tamanho de impressão a 300 dpi (sem ampliar além do original).
 */
export async function mockupCmyk(file, focus, screenWmm, aspect = 9 / 16) {
  const src = readStored(file);
  const { width: W, height: H } = await sharp(src).metadata();
  const cropW = Math.min(W, Math.floor(H * aspect));
  const cropH = Math.floor(cropW / aspect);
  const fx = Math.min(1, Math.max(0, focus?.x ?? 0.5));
  const fy = Math.min(1, Math.max(0, focus?.y ?? 0.5));
  const left = Math.round((W - cropW) * fx);
  const top = Math.round((H - cropH) * fy);
  const targetW = Math.min(cropW, Math.round((screenWmm / 25.4) * 300));
  return sharp(src)
    .extract({ left, top, width: cropW, height: cropH })
    .resize({ width: targetW })
    .toColourspace('cmyk')
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

/**
 * Logo para o PDF: achatado sobre branco (os logos ficam na faixa branca do
 * rodapé) e convertido para JPEG CMYK — assim o PDF não leva nenhum objeto RGB.
 */
export async function logoCmyk(file, widthMm) {
  const targetW = Math.max(200, Math.round((widthMm / 25.4) * 300));
  return sharp(readStored(file))
    .resize({ width: targetW, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .toColourspace('cmyk')
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

// ---------------------------------------------------------------- logomarca Gove oficial

/** Pasta das logomarcas oficiais (brand/logos na raiz do projeto). */
export const BRAND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'brand', 'logos');
const rgbaCache = new Map();

/** Pixels RGBA de um arquivo da logomarca oficial (cache em memória). */
export async function brandRgba(file) {
  if (!rgbaCache.has(file)) {
    rgbaCache.set(file, sharp(readFileSync(join(BRAND_DIR, file))).ensureAlpha().raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => ({ data, width: info.width, height: info.height })));
  }
  return rgbaCache.get(file);
}

/** Pixels RGBA de um logo enviado (versão de trabalho). */
export async function storedRgba(file) {
  const { data, info } = await sharp(readStored(file)).resize({ width: 600, withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
