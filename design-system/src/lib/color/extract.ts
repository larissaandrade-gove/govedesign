// Paleta a partir dos pixels de uma imagem (corte por caixas, à moda do median cut; sem dependências).
import { formatHex } from 'culori';
import type { Hex } from './types.ts';

const MAX_SAMPLES = 10_000;

type Box = number[][]; // [r, g, b][]

function range(box: Box, ch: number) {
  let lo = 255;
  let hi = 0;
  for (const p of box) {
    if (p[ch] < lo) lo = p[ch];
    if (p[ch] > hi) hi = p[ch];
  }
  return hi - lo;
}

/**
 * Até `n` cores dominantes de pixels RGBA (ex.: ImageData.data). Ignora pixels
 * quase transparentes e amostra no máximo 10 mil pixels. Ordem: da cor que
 * mais aparece para a que menos aparece.
 */
export function extractPalette(rgba: Uint8ClampedArray | number[], n = 6): Hex[] {
  const total = Math.floor(rgba.length / 4);
  const stride = Math.max(1, Math.ceil(total / MAX_SAMPLES));
  const px: Box = [];
  for (let i = 0; i < total; i += stride) {
    const o = i * 4;
    if (rgba[o + 3] < 128) continue;
    px.push([rgba[o], rgba[o + 1], rgba[o + 2]]);
  }
  if (!px.length) return [];

  // Divide sempre a caixa com maior variação no canal mais espalhado
  const boxes: Box[] = [px];
  while (boxes.length < n) {
    let pick = -1;
    let ch = 0;
    let widest = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        const r = range(b, c);
        if (r > widest) [widest, pick, ch] = [r, i, c];
      }
    });
    if (pick < 0 || widest === 0) break; // só sobraram caixas de uma cor
    // Corta no meio da faixa do canal (não na mediana): grupos de cores
    // distintos ficam inteiros, sem caixas que misturam duas cores na média
    const box = boxes[pick].sort((a, b) => a[ch] - b[ch]);
    const cut = (box[0][ch] + box[box.length - 1][ch]) / 2;
    const mid = Math.min(box.length - 1, Math.max(1, box.findIndex((p) => p[ch] > cut)));
    boxes.splice(pick, 1, box.slice(0, mid), box.slice(mid));
  }

  const colors = boxes
    .filter((b) => b.length)
    .map((b) => {
      const avg = [0, 1, 2].map((c) => b.reduce((s, p) => s + p[c], 0) / b.length / 255);
      return { hex: formatHex({ mode: 'rgb', r: avg[0], g: avg[1], b: avg[2] }), count: b.length };
    })
    .sort((a, b) => b.count - a.count);
  // Caixas diferentes podem dar a mesma média: sem repetir
  return [...new Set(colors.map((c) => c.hex))];
}
