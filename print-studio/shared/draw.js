// Gove Print Studio — desenho da lista de elementos do motor de layout.
//
// Um único desenhista para os três destinos (preview em canvas, PDF no servidor e
// PDF no navegador): cada destino só implementa um "pintor" com meia dúzia de
// operações (caminhos SVG, texto, imagem, transformações), sempre em milímetros.
// Assim preview e PDF desenham exatamente a mesma geometria.
//
// Pintor:
//   save() restore() translate(x, y) rotate(graus) scale(sx, sy)
//   fill(d, tinta, { rule: 'nonzero'|'evenodd', opacity })   tinta = chave de cor | gradiente
//   stroke(d, cor, largura, { opacity, cap, join })
//   clip(d)
//   text(texto, x, linhaDeBase, peso, tamanhoPt, cor)
//   image(elemento, x, y, w, h)          (logos e foto do mockup; o pintor resolve o arquivo)
// deps: { qr(data) → { size, get(linha, coluna) } }

const f = (n) => Math.round(n * 10000) / 10000;

/** Retângulo (com cantos arredondados opcionais: número ou [se, sd, id, ie]) como caminho SVG. */
export function rectPath(x, y, w, h, r = 0) {
  const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(0, Math.min(v || 0, w / 2, h / 2)));
  let d = `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}`;
  if (tr) d += `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + w)} ${f(y + tr)}`;
  d += `V${f(y + h - br)}`;
  if (br) d += `A${f(br)} ${f(br)} 0 0 1 ${f(x + w - br)} ${f(y + h)}`;
  d += `H${f(x + bl)}`;
  if (bl) d += `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + h - bl)}`;
  d += `V${f(y + tl)}`;
  if (tl) d += `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}`;
  return `${d}Z`;
}

export function ellipsePath(x, y, w, h) {
  const rx = w / 2;
  const ry = h / 2;
  const cy = y + ry;
  return `M${f(x)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x + w)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(x)} ${f(cy)}Z`;
}

/** Módulos escuros do QR como um caminho (corridas horizontais, leve sobreposição contra fios brancos na RIP). */
export function qrPath(qr, x, y, size) {
  const n = qr.size;
  const cell = size / n;
  const ov = Math.min(0.02, cell * 0.02);
  let d = '';
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.get(r, c)) {
        c++;
        continue;
      }
      const start = c;
      while (c < n && qr.get(r, c)) c++;
      d += `M${f(x + start * cell)} ${f(y + r * cell)}h${f((c - start) * cell + ov)}v${f(cell + ov)}h${f(-((c - start) * cell + ov))}Z`;
    }
  }
  return d;
}

/** Linha (x1,y1,x2,y2) do gradiente linear no sentido do CSS. */
export function gradientLine(e) {
  const a = (e.angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const half = (Math.abs(e.w * dx) + Math.abs(e.h * dy)) / 2;
  return [cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half];
}

/** Tinta de gradiente normalizada (linear ou radial) a partir do elemento. */
export function gradientPaint(e) {
  const stops = e.stops ?? [[0, e.from], [1, e.to]];
  if (e.kind === 'radial') return { kind: 'radial', cx: e.cx, cy: e.cy, r: e.r, stops };
  const [x1, y1, x2, y2] = gradientLine(e);
  return { kind: 'linear', x1, y1, x2, y2, stops };
}

function drawText(p, e) {
  for (const l of e.lines) {
    if (l.runs) for (const r of l.runs) p.text(r.text, l.x + r.dx, l.baseline, r.weight, e.size, r.color ?? e.color);
    else p.text(l.text, l.x, l.baseline, e.weight, e.size, e.color);
  }
}

function drawIcon(p, e) {
  p.save();
  p.translate(e.x, e.y);
  p.scale(e.w / 24, e.h / 24);
  const lw = (e.lineWidth ?? 2) * (e.lineScale ?? 1);
  for (const d of e.paths) p.stroke(d, e.stroke, lw, { opacity: e.opacity ?? 1 });
  if (e.inner) {
    p.translate(...e.inner.offset);
    p.scale(e.inner.scale, e.inner.scale);
    for (const d of e.inner.paths) p.stroke(d, e.stroke, lw / e.inner.scale, { opacity: e.opacity ?? 1 });
  }
  p.restore();
}

function drawGlyph(p, e) {
  p.save();
  p.translate(e.x, e.y);
  p.scale(e.w / 24, e.h / 24);
  p.fill(e.bubble, e.fill, { rule: 'evenodd' });
  if (e.handset) {
    const { paths, scale, offset } = e.handset;
    p.translate(...offset);
    p.scale(scale, scale);
    for (const d of paths) {
      p.fill(d, e.fill);
      p.stroke(d, e.fill, 1.2);
    }
  }
  p.restore();
}

/** Desenha uma lista de elementos (coordenadas em mm). */
export function drawElements(p, elements, deps) {
  for (const e of elements) {
    switch (e.type) {
      case 'gradient':
        p.fill(rectPath(e.x, e.y, e.w, e.h), gradientPaint(e));
        break;
      case 'rect': {
        const d = rectPath(e.x, e.y, e.w, e.h, e.radii ?? e.r ?? 0);
        if (e.fill) p.fill(d, e.fill);
        if (e.stroke) p.stroke(d, e.stroke, e.lineWidth ?? 0.25);
        break;
      }
      case 'circle': {
        const d = ellipsePath(e.x, e.y, e.w, e.h);
        if (e.fill) p.fill(d, e.fill);
        if (e.stroke) p.stroke(d, e.stroke, e.lineWidth ?? 0.25, { opacity: e.opacity ?? 1 });
        break;
      }
      case 'icon':
        drawIcon(p, e);
        break;
      case 'glyph':
        drawGlyph(p, e);
        break;
      case 'text':
        drawText(p, e);
        break;
      case 'qr':
        p.fill(qrPath(deps.qr(e.data), e.x, e.y, e.w), e.color);
        break;
      case 'logo':
        if (!e.missing) p.image(e, e.x, e.y, e.w, e.h);
        break;
      case 'mockup-screen':
        p.save();
        p.clip(rectPath(e.x, e.y, e.w, e.h, e.r ?? 0));
        if (e.imageId) p.image(e, e.x, e.y, e.w, e.h);
        else p.fill(rectPath(e.x, e.y, e.w, e.h), e.fill);
        p.restore();
        break;
      case 'group':
        p.save();
        p.translate(e.x, e.y);
        if (e.rotate) p.rotate(e.rotate);
        if (e.clip) p.clip(rectPath(e.clip.x ?? 0, e.clip.y ?? 0, e.clip.w, e.clip.h, e.clip.r ?? 0));
        drawElements(p, e.children, deps);
        p.restore();
        break;
      default:
        break;
    }
  }
}

/** Percorre todos os elementos, inclusive os de grupos (para pré-carregar imagens). */
export function* walkElements(elements) {
  for (const e of elements) {
    yield e;
    if (e.type === 'group') yield* walkElements(e.children);
  }
}
