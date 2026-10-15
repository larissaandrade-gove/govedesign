// `sharp` → equivalente em canvas, cobrindo só a parte da API usada por
// backend/lib/raster.js, backend/audit/modeB.js e backend/report/preview.js:
//   sharp(buf | raw).ensureAlpha().extract().resize(w,h,{fit:'inside',withoutEnlargement}).raw()|.png()
//   .composite([{ input: svg }]).toBuffer({ resolveWithObject }) / .metadata()
// Decodificação: createImageBitmap sem conversão de perfil de cor nem
// pré-multiplicação (como o libvips, que ignora o ICC por padrão).
// Redução: média por área com alpha pré-multiplicado (o sharp usa lanczos3, então
// as cores dominantes do Modo B podem variar em ±1–2 níveis por canal).
import { Buffer } from 'buffer';
import { inflateSync, strFromU8 } from 'fflate';

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const isPng = (b) => b && b.length > 8 && PNG_SIG.every((v, i) => b[i] === v);
const isSvg = (b) => {
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart();
  return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
};
function mimeOf(b) {
  if (isPng(b)) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp';
  if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
  if (isSvg(b)) return 'image/svg+xml';
  return 'application/octet-stream';
}
const FORMAT = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

function canvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });

/** Lê os chunks de texto de um PNG (tEXt, zTXt, iTXt) → [{ keyword, text }]. */
export function pngTextChunks(b) {
  const out = [];
  if (!isPng(b)) return out;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const latin1 = (u) => String.fromCharCode(...u);
  let o = 8;
  while (o + 12 <= b.length) {
    const len = dv.getUint32(o);
    const type = latin1(b.subarray(o + 4, o + 8));
    const data = b.subarray(o + 8, o + 8 + len);
    try {
      if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
        const z = data.indexOf(0);
        const keyword = latin1(data.subarray(0, z));
        let text;
        if (type === 'tEXt') text = new TextDecoder('latin1').decode(data.subarray(z + 1));
        else if (type === 'zTXt') text = new TextDecoder('latin1').decode(inflateSync(data.subarray(z + 2).subarray(2)));
        else {
          const compressed = data[z + 1] === 1;
          let p = z + 3;
          p = data.indexOf(0, p) + 1; // language tag
          p = data.indexOf(0, p) + 1; // translated keyword
          const body = data.subarray(p);
          text = compressed ? strFromU8(inflateSync(body.subarray(2))) : strFromU8(body);
        }
        out.push({ keyword, text });
      }
    } catch {
      /* chunk corrompido: ignora */
    }
    if (type === 'IEND') break;
    o += 12 + len;
  }
  return out;
}

async function loadSvg(bytes) {
  const url = `data:image/svg+xml;base64,${Buffer.from(bytes).toString('base64')}`;
  const img = new Image();
  img.decoding = 'sync';
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('SVG inválido'));
    img.src = url;
  });
  return img;
}

/** Decodifica para RGBA não pré-multiplicado. */
async function decode(input, rawInfo) {
  if (rawInfo) {
    const { width, height, channels } = rawInfo;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < width * height; i++, j += channels) {
      data[i * 4] = input[j];
      data[i * 4 + 1] = input[j + (channels > 2 ? 1 : 0)];
      data[i * 4 + 2] = input[j + (channels > 2 ? 2 : 0)];
      data[i * 4 + 3] = channels === 4 ? input[j + 3] : channels === 2 ? input[j + 1] : 255;
    }
    return { data, width, height };
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const mime = mimeOf(bytes);
  let src;
  if (mime === 'image/svg+xml') src = await loadSvg(bytes);
  else {
    try {
      src = await createImageBitmap(new Blob([bytes], { type: mime }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    } catch {
      throw new Error('Input buffer contains unsupported image format');
    }
  }
  const width = src.width;
  const height = src.height;
  const c = canvas(width, height);
  const ctx = ctx2d(c);
  ctx.drawImage(src, 0, 0);
  src.close?.();
  return { data: ctx.getImageData(0, 0, width, height).data, width, height };
}

function extract(img, { left, top, width, height }) {
  if (left < 0 || top < 0 || left + width > img.width || top + height > img.height || width < 1 || height < 1) {
    throw new Error('extract_area: bad extract area');
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const s = ((top + y) * img.width + left) * 4;
    data.set(img.data.subarray(s, s + width * 4), y * width * 4);
  }
  return { data, width, height };
}

/** Redução por média de área (alpha pré-multiplicado), dimensões como o sharp (fit inside). */
function resize(img, w, h, opts = {}) {
  const fit = opts.fit ?? 'cover';
  let tw = w ?? img.width;
  let th = h ?? img.height;
  if (fit === 'inside') {
    const xf = img.width / (w ?? img.width);
    const yf = img.height / (h ?? img.height);
    if (xf > yf) th = Math.max(1, Math.round(img.height / xf));
    else tw = Math.max(1, Math.round(img.width / yf));
  }
  if (opts.withoutEnlargement && (tw >= img.width || th >= img.height)) return img;
  if (tw === img.width && th === img.height) return img;
  const sx = img.width / tw;
  const sy = img.height / th;
  const out = new Uint8ClampedArray(tw * th * 4);
  const src = img.data;
  for (let ty = 0; ty < th; ty++) {
    const y0 = ty * sy;
    const y1 = y0 + sy;
    for (let tx = 0; tx < tw; tx++) {
      const x0 = tx * sx;
      const x1 = x0 + sx;
      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      for (let y = Math.floor(y0); y < Math.min(img.height, Math.ceil(y1)); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < Math.min(img.width, Math.ceil(x1)); x++) {
          const wgt = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
          const i = (y * img.width + x) * 4;
          const al = src[i + 3] / 255;
          r += src[i] * al * wgt;
          g += src[i + 1] * al * wgt;
          b += src[i + 2] * al * wgt;
          a += al * wgt;
          wsum += wgt;
        }
      }
      const o = (ty * tw + tx) * 4;
      out[o] = a ? r / a : 0;
      out[o + 1] = a ? g / a : 0;
      out[o + 2] = a ? b / a : 0;
      out[o + 3] = wsum ? (a / wsum) * 255 : 0;
    }
  }
  return { data: out, width: tw, height: th };
}

function toCanvas(img) {
  const c = canvas(img.width, img.height);
  ctx2d(c).putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

async function encodePng(c) {
  const blob = c.convertToBlob ? await c.convertToBlob({ type: 'image/png' }) : await new Promise((r) => c.toBlob(r, 'image/png'));
  return Buffer.from(await blob.arrayBuffer());
}

class Pipeline {
  constructor(input, opts) {
    this.input = input;
    this.rawInfo = opts?.raw ?? null;
    this.ops = [];
    this.format = null;
  }
  ensureAlpha() {
    return this;
  }
  extract(region) {
    this.ops.push(['extract', region]);
    return this;
  }
  resize(w, h, opts) {
    if (typeof w === 'object' && w) this.ops.push(['resize', w.width, w.height, w]);
    else this.ops.push(['resize', w, h, opts]);
    return this;
  }
  composite(layers) {
    this.ops.push(['composite', layers]);
    return this;
  }
  raw() {
    this.format = 'raw';
    return this;
  }
  png() {
    this.format = 'png';
    return this;
  }
  async metadata() {
    const bytes = this.rawInfo ? null : new Uint8Array(this.input);
    if (bytes && isPng(bytes)) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const comments = pngTextChunks(bytes);
      return { format: 'png', width: dv.getUint32(16), height: dv.getUint32(20), channels: 4, ...(comments.length ? { comments } : {}) };
    }
    const img = await decode(this.input, this.rawInfo);
    return { format: bytes ? FORMAT[mimeOf(bytes)] : 'raw', width: img.width, height: img.height, channels: 4 };
  }
  async toBuffer(opts = {}) {
    let img = await decode(this.input, this.rawInfo);
    let c = null;
    for (const [op, a, b, o] of this.ops) {
      if (c) {
        img = { data: ctx2d(c).getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height };
        c = null;
      }
      if (op === 'extract') img = extract(img, a);
      else if (op === 'resize') img = resize(img, a, b, o);
      else if (op === 'composite') {
        c = toCanvas(img);
        const ctx = ctx2d(c);
        for (const layer of a) {
          const bytes = new Uint8Array(layer.input);
          const src = mimeOf(bytes) === 'image/svg+xml' ? await loadSvg(bytes) : await createImageBitmap(new Blob([bytes]));
          ctx.drawImage(src, layer.left ?? 0, layer.top ?? 0);
        }
      }
    }
    if (this.format === 'raw') {
      if (c) img = { data: ctx2d(c).getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height };
      const data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
      const info = { width: img.width, height: img.height, channels: 4, size: data.length, format: 'raw' };
      return opts.resolveWithObject ? { data, info } : data;
    }
    const png = await encodePng(c ?? toCanvas(img));
    const w = c ? c.width : img.width;
    const h = c ? c.height : img.height;
    return opts.resolveWithObject ? { data: png, info: { width: w, height: h, channels: 4, size: png.length, format: 'png' } } : png;
  }
}

export default function sharp(input, opts) {
  return new Pipeline(input, opts);
}
