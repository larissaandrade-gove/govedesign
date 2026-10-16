// HTML (e-mail / landing page) → modelo normalizado.
// Precisa de um DOM com estilos computados: no navegador, a página é
// renderizada num iframe sandbox SEM scripts (srcdoc, sem allow-scripts) e
// cada nó de texto visível é lido com getComputedStyle (cor, primeira família
// da pilha font-family, font-size em px). Alvos clicáveis (a, button, input…)
// entram com o bounding box. No Node não há motor de layout: o arquivo é
// recusado com uma mensagem clara (sem chute a partir do CSS bruto).
import { DocInputError, imageColors, isLogoName, pixelColors, svgColors } from '../docModel.js';
import { parseColor, toHex } from '../../lib/color.js';

export const HTML_VIEWPORT = 390; // largura de iPhone (pt do HIG ≈ px CSS)
export const HTML_NODE_MESSAGE =
  'Arquivos HTML são analisados na versão do Revisor dentro do Design System (navegador), que renderiza a página e lê os estilos reais de cada texto e botão. ' +
  'Este servidor não tem motor de layout para isso: abra o Revisor no Design System e envie o HTML lá.';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'svg', 'SVG']);

const firstFamily = (ff) => (ff ?? '').split(',')[0].trim().replace(/^['"]|['"]$/g, '') || null;
const rgbHex = (css) => {
  const c = parseColor(css);
  return c && c.a > 0 ? toHex(c) : null;
};

function describe(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const c = (el.getAttribute('class') ?? '').trim();
  const cls = !id && c ? `.${c.split(/\s+/)[0]}` : '';
  return `${tag}${id}${cls}`;
}

/** Cor de fundo efetiva: primeira cor de fundo opaca subindo pelos ancestrais. */
function backgroundOf(el, win) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    const cs = win.getComputedStyle(e);
    const c = parseColor(cs.backgroundColor);
    if (c && c.a > 0.5) return toHex(c);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // imagem/gradiente: fora da análise
  }
  return '#FFFFFF';
}

/** Remove scripts e redirecionamentos antes de renderizar (o sandbox já os bloquearia). */
function stripScripts(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, meta[http-equiv], iframe, object, embed').forEach((e) => e.remove());
  for (const el of doc.querySelectorAll('*')) {
    for (const a of [...el.attributes]) if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
  }
  return `<!doctype html>${doc.documentElement.outerHTML}`;
}

export async function parseHtml(buffer, { viewportWidth = HTML_VIEWPORT, timeoutMs = 10000 } = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') throw new DocInputError(HTML_NODE_MESSAGE, 422);
  const html = stripScripts(new TextDecoder().decode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)));
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin'); // sem allow-scripts: nenhum script da página roda
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${viewportWidth}px;height:900px;border:0;opacity:0;pointer-events:none;`;
  const loaded = new Promise((resolve) => {
    frame.addEventListener('load', resolve, { once: true });
    setTimeout(resolve, timeoutMs);
  });
  frame.srcdoc = html;
  document.body.appendChild(frame);
  try {
    await loaded;
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc?.body) throw new DocInputError('Não foi possível renderizar o HTML.');
    await doc.fonts?.ready?.catch?.(() => {});
    return { format: 'HTML', texts: readTexts(doc, win), logos: await readLogos(doc, win), targets: readTargets(doc, win), units: { viewportWidth } };
  } finally {
    frame.remove();
  }
}

function readTexts(doc, win) {
  const out = [];
  const walker = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */);
  const range = doc.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue;
    if (!text || !text.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,template,svg,head')) continue;
    if (SKIP_TAGS.has(el.tagName)) continue;
    const cs = win.getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const color = rgbHex(cs.color);
    out.push({
      text: text.trim(),
      font: firstFamily(cs.fontFamily),
      weight: Number(cs.fontWeight) || 400,
      sizePx: parseFloat(cs.fontSize),
      color,
      colorNote: color ? null : 'transparente',
      where: describe(el),
    });
  }
  return out;
}

function readTargets(doc, win) {
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [onclick]';
  const out = [];
  for (const el of doc.querySelectorAll(sel)) {
    const cs = win.getComputedStyle(el);
    if (cs.visibility !== 'visible' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const label = (el.getAttribute('aria-label') || el.textContent || el.value || el.querySelector?.('img')?.alt || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ');
    out.push({ w: r.width, h: r.height, label, where: describe(el) });
  }
  return out;
}

function logoish(el) {
  const own = [el.id, typeof el.className === 'string' ? el.className : el.className?.baseVal, el.getAttribute('alt'), el.getAttribute('src'), el.getAttribute('aria-label'), el.getAttribute('title'), el.querySelector?.('title')?.textContent];
  const parent = el.parentElement;
  const up = parent ? [parent.id, typeof parent.className === 'string' ? parent.className : '', parent.getAttribute('aria-label')] : [];
  return isLogoName(...own, ...up);
}

async function readLogos(doc, win) {
  const out = [];
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  };
  for (const svg of doc.querySelectorAll('svg')) {
    if (!logoish(svg) || svg.parentElement?.closest('svg')) continue;
    const colors = new Set();
    for (const s of svg.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line,text,use')) {
      const cs = win.getComputedStyle(s);
      for (const v of [cs.fill, cs.stroke]) {
        if (!v || v === 'none' || v.startsWith('url(')) continue;
        const hx = rgbHex(v);
        if (hx) colors.add(hx);
      }
    }
    if (!colors.size) svgColors(svg.outerHTML).forEach((c) => colors.add(c));
    out.push({ colors: colors.size ? [...colors] : null, where: describe(svg), source: 'SVG embutido', background: backgroundOf(svg.parentElement, win), backgroundNote: 'fundo do elemento', box: box(svg) });
  }
  for (const img of doc.querySelectorAll('img')) {
    if (!logoish(img)) continue;
    const src = img.getAttribute('src') ?? '';
    let colors = null;
    let note = null;
    if (src.startsWith('data:')) {
      const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(src);
      const bytes = m ? (m[2] ? Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(m[3]))) : null;
      colors = bytes ? await imageColors(bytes) : null;
    } else if (img.complete && img.naturalWidth) {
      try {
        const c = document.createElement('canvas');
        const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const d = ctx.getImageData(0, 0, c.width, c.height);
        colors = pixelColors({ data: d.data, width: d.width, height: d.height, channels: 4 });
      } catch {
        note = 'imagem de outra origem';
      }
    } else note = 'imagem externa não carregada (o arquivo HTML não traz a imagem)';
    out.push({
      colors: colors?.length ? colors : null,
      where: describe(img),
      source: img.getAttribute('alt') || src.split('/').pop()?.slice(0, 60) || 'img',
      note,
      background: backgroundOf(img.parentElement, win),
      backgroundNote: 'fundo do elemento',
      box: box(img),
    });
  }
  return out;
}
