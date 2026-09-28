// Preview anotado: desenha os bboxes das checagens sobre a imagem da peça (sharp + SVG).
import sharp from 'sharp';

const COLORS = { fail: '#FF4D5E', warn: '#FFC72C', manual: '#FFC72C', pass: '#3DDC97' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * @param {Buffer} base        PNG da peça (render do Fabric ou raster original)
 * @param {object[]} checks    checagens do relatório (com `number` e `bbox`)
 * @param {object} artboard    { width, height } — coordenadas dos bboxes
 */
export async function annotatePreview(base, checks, artboard) {
  const img = sharp(base);
  const meta = await img.metadata();
  const sx = meta.width / artboard.width;
  const sy = meta.height / artboard.height;
  const stroke = Math.max(2, Math.round(Math.min(meta.width, meta.height) / 300));
  const fontSize = Math.max(14, Math.round(Math.min(meta.width, meta.height) / 45));

  // Só anota o que precisa de atenção; itens conformes poluiriam a imagem.
  // Checagens com o mesmo bbox viram um único destaque com todos os números.
  const groups = new Map();
  for (const c of checks) {
    if (!c.bbox || c.status === 'pass' || c.status === 'skip') continue;
    const key = [c.bbox.left, c.bbox.top, c.bbox.width, c.bbox.height].map((v) => Math.round(v)).join(',');
    if (!groups.has(key)) groups.set(key, { bbox: c.bbox, numbers: [], status: c.status });
    const g = groups.get(key);
    g.numbers.push(c.number);
    if (c.status === 'fail') g.status = 'fail';
  }
  const shapes = [...groups.values()]
    .map((g) => {
      const color = COLORS[g.status] ?? COLORS.warn;
      const label = g.numbers.join(', ');
      const x = g.bbox.left * sx;
      const y = g.bbox.top * sy;
      const w = Math.max(1, g.bbox.width * sx);
      const h = Math.max(1, g.bbox.height * sy);
      const tagW = fontSize * (label.length * 0.62 + 0.9);
      const ty = y - fontSize * 1.3 < 0 ? y : y - fontSize * 1.3;
      return `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${g.status === 'fail' ? 'none' : `${stroke * 4} ${stroke * 2}`}"/>
        <rect x="${x}" y="${ty}" width="${tagW}" height="${fontSize * 1.3}" rx="${fontSize * 0.25}" fill="${color}"/>
        <text x="${x + tagW / 2}" y="${ty + fontSize * 0.98}" font-family="Montserrat, Helvetica, Arial, sans-serif" font-weight="700" font-size="${fontSize}" text-anchor="middle" fill="#1A153A">${esc(label)}</text>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${shapes}</svg>`;
  return img.composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer();
}
