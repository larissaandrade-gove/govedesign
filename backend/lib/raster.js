// Utilitários de imagem raster (sharp): paleta dominante, amostragem de regiões.
import sharp from 'sharp';
import { contrastRatio, parseColor, rgbToLab, deltaE2000, toHex } from './color.js';

/** Decodifica uma data URL (data:image/png;base64,...) em Buffer. */
export function dataUrlToBuffer(src) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(src ?? '');
  if (!m) return null;
  return m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
}

/** Pixels RGBA crus de uma imagem (opcionalmente reduzida para `size` px no maior lado). */
export async function rawPixels(input, { size, region } = {}) {
  let img = sharp(input).ensureAlpha();
  if (region) img = img.extract(region);
  if (size) img = img.resize(size, size, { fit: 'inside', withoutEnlargement: true });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/**
 * Quantização k-means em L*a*b* (determinística: sementes pelos picos do
 * histograma). Pixels com alpha < 128 são ignorados.
 * @returns [{ hex, rgb, share }] ordenado por participação
 */
export function quantize({ data, channels }, { clusters = 8, iterations = 12 } = {}) {
  const pts = [];
  for (let i = 0; i < data.length; i += channels) {
    if (channels === 4 && data[i + 3] < 128) continue;
    const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
    pts.push({ rgb, lab: rgbToLab(rgb) });
  }
  if (!pts.length) return [];

  // Sementes: cores mais frequentes num histograma de 4 bits por canal, afastadas entre si.
  const hist = new Map();
  for (const p of pts) {
    const key = ((p.rgb.r >> 4) << 8) | ((p.rgb.g >> 4) << 4) | (p.rgb.b >> 4);
    const h = hist.get(key) ?? { n: 0, p };
    h.n += 1;
    hist.set(key, h);
  }
  const seeds = [];
  for (const { p } of [...hist.values()].sort((a, b) => b.n - a.n)) {
    if (seeds.every((s) => deltaE2000(s, p.lab) > 8)) seeds.push({ ...p.lab });
    if (seeds.length >= clusters) break;
  }

  const assign = new Array(pts.length).fill(0);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < pts.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let k = 0; k < seeds.length; k++) {
        const s = seeds[k];
        const d = (pts[i].lab.L - s.L) ** 2 + (pts[i].lab.a - s.a) ** 2 + (pts[i].lab.b - s.b) ** 2;
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      assign[i] = best;
    }
    const acc = seeds.map(() => ({ L: 0, a: 0, b: 0, n: 0 }));
    pts.forEach((p, i) => {
      const a = acc[assign[i]];
      a.L += p.lab.L;
      a.a += p.lab.a;
      a.b += p.lab.b;
      a.n += 1;
    });
    acc.forEach((a, k) => {
      if (a.n) seeds[k] = { L: a.L / a.n, a: a.a / a.n, b: a.b / a.n };
    });
  }

  // Cor representativa de cada cluster = média RGB dos seus pixels.
  const out = seeds.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
  pts.forEach((p, i) => {
    const o = out[assign[i]];
    o.r += p.rgb.r;
    o.g += p.rgb.g;
    o.b += p.rgb.b;
    o.n += 1;
  });
  return out
    .filter((o) => o.n > 0)
    .map((o) => {
      const rgb = { r: o.r / o.n, g: o.g / o.n, b: o.b / o.n };
      return { hex: toHex(rgb), rgb, share: o.n / pts.length };
    })
    .sort((a, b) => b.share - a.share);
}

export async function dominantColors(input, { sampleSize = 96, clusters = 8 } = {}) {
  return quantize(await rawPixels(input, { size: sampleSize }), { clusters });
}

/**
 * Estatística de uma região: cor de fundo (anel da borda da região) e a cor
 * de maior contraste com esse fundo no interior (≈ cor do texto).
 */
export async function sampleTextRegion(input, region) {
  const px = await rawPixels(input, { region });
  const { data, width, height, channels } = px;
  const ring = Math.max(1, Math.round(Math.min(width, height) * 0.08));
  const border = [];
  const inner = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
      if (x < ring || y < ring || x >= width - ring || y >= height - ring) border.push(rgb);
      else inner.push(rgb);
    }
  }
  const avg = (arr) => {
    const s = arr.reduce((a, c) => ({ r: a.r + c.r, g: a.g + c.g, b: a.b + c.b }), { r: 0, g: 0, b: 0 });
    return { r: s.r / arr.length, g: s.g / arr.length, b: s.b / arr.length };
  };
  const background = avg(border);
  // Texto: os 10% de pixels internos mais contrastantes com o fundo.
  const scored = (inner.length ? inner : border)
    .map((c) => ({ c, k: contrastRatio(c, background) }))
    .sort((a, b) => b.k - a.k);
  const top = scored.slice(0, Math.max(1, Math.round(scored.length * 0.1))).map((s) => s.c);
  const foreground = avg(top);
  return {
    background: toHex(background),
    foreground: toHex(foreground),
    contrast: contrastRatio(foreground, background),
    borderUniformity: uniformity(border),
  };
}

/** Desvio médio (ΔE2000) em relação à média — quão sólida é uma área. */
export function uniformity(pixels) {
  if (!pixels.length) return 0;
  const m = pixels.reduce((a, c) => ({ r: a.r + c.r, g: a.g + c.g, b: a.b + c.b }), { r: 0, g: 0, b: 0 });
  const mean = rgbToLab({ r: m.r / pixels.length, g: m.g / pixels.length, b: m.b / pixels.length });
  const step = Math.max(1, Math.floor(pixels.length / 2000));
  let sum = 0;
  let n = 0;
  for (let i = 0; i < pixels.length; i += step) {
    sum += deltaE2000(rgbToLab(pixels[i]), mean);
    n++;
  }
  return sum / n;
}

/**
 * Analisa a zona de silêncio (borda) e os módulos de um QR code rasterizado.
 * `quietRatio` é a espessura da borda analisada em fração do lado.
 */
export async function analyzeQrImage(input, region, { quietRatio = 0.06 } = {}) {
  const { data, width, height, channels } = await rawPixels(input, region ? { region } : {});
  const ring = Math.max(1, Math.round(Math.min(width, height) * quietRatio));
  const border = [];
  const all = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const alpha = channels === 4 ? data[i + 3] / 255 : 1;
      const rgb = { r: data[i], g: data[i + 1], b: data[i + 2], a: alpha };
      all.push(rgb);
      if (x < ring || y < ring || x >= width - ring || y >= height - ring) border.push(rgb);
    }
  }
  const transparentBorder = border.filter((p) => p.a < 0.95).length / border.length;
  const mean = (arr) => {
    const s = arr.reduce((a, c) => ({ r: a.r + c.r, g: a.g + c.g, b: a.b + c.b }), { r: 0, g: 0, b: 0 });
    return arr.length ? { r: s.r / arr.length, g: s.g / arr.length, b: s.b / arr.length } : null;
  };
  const opaqueBorder = border.filter((p) => p.a >= 0.95);
  const light = mean(opaqueBorder);
  // Módulos escuros: pixels opacos bem mais escuros que a zona de silêncio
  // (ou, se a imagem tem fundo transparente, todos os pixels opacos).
  const darkPixels = all.filter((p) => p.a > 0.5 && (!light || transparentBorder > 0.5 || contrastRatio(p, light) > 2));
  const darkColor = mean(darkPixels);
  return {
    width,
    height,
    quietZoneColor: light ? toHex(light) : null,
    quietZoneUniformity: uniformity(opaqueBorder),
    transparentBorder,
    moduleColor: darkColor ? toHex(darkColor) : null,
    moduleContrast: darkColor && light && transparentBorder <= 0.5 ? contrastRatio(darkColor, light) : null,
  };
}

export const isLight = (color) => {
  const c = parseColor(color);
  if (!c) return null;
  return rgbToLab(c).L >= 60;
};
