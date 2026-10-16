// Pintor pdfkit (servidor e navegador): desenha a lista de elementos em mm,
// só com cores CMYK. Logos oficiais da Gove entram como máscaras de imagem 1 bit
// (/ImageMask) pintadas com a cor CMYK da marca — sem RGB e sem transparência.
import { drawElements, walkElements } from './draw.js';
import { COLORS, MM_TO_PT, contrastRatio, luminance, ptToMm } from './tokens.js';

/** Toda cor passa por aqui: só existem cores CMYK no PDF. */
export function cmyk(key) {
  const c = COLORS[key];
  if (!c?.cmyk) throw new Error(`Cor sem CMYK definido: ${key}`);
  return c.cmyk;
}

/** Chaves de cor de cada versão da logomarca oficial. */
export const LOGO_VARIANT_COLORS = { cor: ['roxoGove', 'amareloGove'], roxo: ['roxoGove'], branco: ['branco'] };

/**
 * Separa um logo RGBA em máscaras de 1 bit, uma por cor da marca (pixel opaco →
 * cor da marca mais próxima). Linhas empacotadas MSB primeiro, como o PDF espera.
 */
export function buildStencils(rgba, w, h, keys) {
  const rgb = keys.map((k) => {
    const x = COLORS[k].hex.slice(1);
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
  });
  const stride = Math.ceil(w / 8);
  const layers = keys.map((key) => ({ key, w, h, bits: new Uint8Array(stride * h) }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 128) continue;
      let best = 0;
      if (keys.length > 1) {
        let bd = Infinity;
        rgb.forEach((c, k) => {
          const d = (rgba[i] - c[0]) ** 2 + (rgba[i + 1] - c[1]) ** 2 + (rgba[i + 2] - c[2]) ** 2;
          if (d < bd) (bd = d), (best = k);
        });
      }
      layers[best].bits[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return layers;
}

/** Contraste de um logo enviado (RGBA) com o fundo: 10º percentil dos pixels opacos. */
export function pixelContrast(rgba, bgHex) {
  const vals = [];
  const step = Math.max(1, Math.floor(rgba.length / 4 / 40000));
  for (let p = 0; p < rgba.length / 4; p += step) {
    const i = p * 4;
    if (rgba[i + 3] < 200) continue;
    const hex = `#${[rgba[i], rgba[i + 1], rgba[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    vals.push(contrastRatio(hex, bgHex));
  }
  if (!vals.length) return null;
  vals.sort((a, b) => a - b);
  return vals[Math.floor(vals.length * 0.1)];
}

export { luminance };

/** Elementos de imagem da peça (logos e foto do mockup), inclusive dentro de grupos. */
export function imageElements(L) {
  const out = [];
  for (const b of L.blocks) for (const e of walkElements(b.elements)) if ((e.type === 'logo' && !e.missing) || (e.type === 'mockup-screen' && e.imageId)) out.push(e);
  return out;
}

/**
 * Desenha a peça no documento pdfkit.
 * @param prepared Map(elemento → { jpeg: bytes } | { masks: [{ key, w, h, bits }] })
 * @param deps { qr(data) }
 */
export function paintPdf(doc, L, prepared, deps) {
  const masks = new Map();
  let n = 0;
  const painter = {
    save: () => doc.save(),
    restore: () => doc.restore(),
    translate: (x, y) => doc.translate(x, y),
    rotate: (deg) => doc.rotate(deg, { origin: [0, 0] }),
    scale: (sx, sy) => doc.scale(sx, sy),
    fill(d, paint, o = {}) {
      doc.save();
      if (o.opacity != null && o.opacity < 1) doc.fillOpacity(o.opacity);
      let color;
      if (typeof paint === 'string') color = cmyk(paint);
      else if (paint.kind === 'radial') {
        color = doc.radialGradient(paint.cx, paint.cy, 0, paint.cx, paint.cy, paint.r);
        for (const [o2, k] of paint.stops) color.stop(o2, cmyk(k));
      } else {
        color = doc.linearGradient(paint.x1, paint.y1, paint.x2, paint.y2);
        for (const [o2, k] of paint.stops) color.stop(o2, cmyk(k));
      }
      doc.path(d).fill(color, o.rule === 'evenodd' ? 'even-odd' : 'non-zero');
      doc.restore();
    },
    stroke(d, key, width, o = {}) {
      doc.save();
      doc.lineWidth(width).lineCap('round').lineJoin('round').strokeColor(cmyk(key));
      if (o.opacity != null && o.opacity < 1) doc.strokeOpacity(o.opacity);
      doc.path(d).stroke();
      doc.restore();
    },
    clip: (d) => doc.path(d).clip(),
    text(str, x, y, weight, sizePt, key) {
      doc.font(weight).fontSize(ptToMm(sizePt)).fillColor(cmyk(key));
      doc.text(str, x, y, { baseline: 'alphabetic', lineBreak: false });
    },
    image(e, x, y, w, h) {
      const img = prepared.get(e);
      if (!img) return;
      if (img.jpeg) {
        doc.image(img.jpeg, x, y, { width: w, height: h });
        return;
      }
      for (const layer of img.masks) {
        let m = masks.get(layer);
        if (!m) {
          const ref = doc.ref({ Type: 'XObject', Subtype: 'Image', ImageMask: true, Width: layer.w, Height: layer.h, BitsPerComponent: 1, Decode: [1, 0] });
          ref.end(layer.bits);
          m = { ref, name: `GoveM${++n}` };
          masks.set(layer, m);
        }
        doc.page.xobjects[m.name] = m.ref;
        doc.save();
        doc.fillColor(cmyk(layer.key));
        doc.transform(w, 0, 0, -h, x, y + h);
        doc.addContent(`/${m.name} Do`);
        doc.restore();
      }
    },
  };
  doc.save();
  doc.scale(MM_TO_PT);
  for (const b of L.blocks) drawElements(painter, b.elements, deps);
  doc.restore();
}
