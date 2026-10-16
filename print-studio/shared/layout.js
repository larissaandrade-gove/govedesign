// Gove Print Studio — motor de layout dos 4 materiais do Kit de Boas-Vindas.
//
// Módulo puro: recebe os dados da peça e uma função `measure(texto, peso, tamanhoPt) → mm`
// (canvas no navegador, pdfkit no servidor — ambos com a mesma Montserrat .ttf) e devolve
// todos os elementos já posicionados em milímetros, em coordenadas da página do PDF
// (origem no canto superior esquerdo, sangria incluída). Preview e PDF desenham
// exatamente esta lista (shared/draw.js), por isso o preview é fiel ao arquivo final.
//
// Geometria e tipografia medidas nas referências finais aprovadas (Kit Itupeva,
// scratch/itupeva/*.pdf): fundo verde em degradê com marca d'água do WhatsApp,
// título branco misturando Bold e Regular, ícones de serviço em círculos, painel
// branco com canto arredondado, faixa verde com o número, QR e logos à direita,
// celular inclinado com a tela gerada para o município.
import { LOGOS, LOGO_MIN_CONTRAST, kindForBox, pickLogo } from '../../brand/logos.js';
import { SERVICE_ICONS, UI_ICONS, WHATSAPP_GLYPH, WHATSAPP_OUTLINE } from './icons.js';
import {
  BACKGROUND,
  BLEED_MM,
  COLORS,
  IMAGE_MIN_DPI,
  LINE_HEIGHT_EM,
  QR_MIN_MM,
  QR_QUIET_MM,
  SAFE_MM,
  TITLE_LEADING_EM,
  TYPE,
  contrastRatio,
  minContrastFor,
  mixHex,
  pickTextColor,
  ptToMm,
} from './tokens.js';

export { gradientLine } from './draw.js';

export const LAYOUTS = [
  { id: 'flyer-a4', slug: 'flyer-a4', name: 'Flyer A4', trim: { w: 210, h: 297 } },
  { id: 'flyer-10x15', slug: 'flyer-10x15', name: 'Flyer 10x15cm', trim: { w: 100, h: 150 } },
  { id: 'adesivo-5x10', slug: 'adesivo-5x10', name: 'Adesivo 5x10cm', trim: { w: 50, h: 100 } },
  { id: 'display-a6', slug: 'display-acrilico-a6', name: 'Display Acrílico A6', trim: { w: 105, h: 148 } },
];

// Textos: quebra de linha = nova linha; **trecho** = negrito (como nas referências).
const FLYER_TEXTS = {
  h1: '**Serviços da Prefeitura**\nagora também estão\n**no Whatsapp**',
  h4a: 'Aponte a câmera do seu celular para\no **QR code** abaixo ou **salve o número**',
  h4b: 'e mande um “Oi”\npara receber o\n**menu de serviços!**',
};
export const DEFAULT_TEXTS = {
  'flyer-a4': { ...FLYER_TEXTS },
  'flyer-10x15': { ...FLYER_TEXTS },
  'adesivo-5x10': { h1: '**Sua prefeitura**\nmais digital\n**no Whatsapp**' },
  'display-a6': {
    h1: 'Os serviços\nda Prefeitura',
    h1b: 'na palma da\nsua mão',
    h3: 'Escaneie o\n**QR CODE**\ne acesse\ntudo pelo\nWhatsapp',
  },
};

export const TEXT_LABELS = {
  h1: 'Título principal (H1)',
  h1b: 'Título — continuação em branco (H1)',
  h3: 'Apoio ao lado do QR (H3)',
  h4a: 'Instrução do QR (H4)',
  h4b: 'Chamada após o número (H4)',
};

/** Textos fixos da tela gerada do celular (o restante vem do cadastro do município). */
export const MOCKUP_TEXTS = {
  h1: 'Serviços da Prefeitura agora também estão no Whatsapp',
  h2: 'Acesse o menu de serviços de forma rápida e prática.',
  card: "Salve o número e mande um 'Oi'",
  h4: 'Ou aponte a câmera para o QR Code:',
  button: 'Adicionar aos contatos',
};

/** Serviços padrão (referências): Saúde, Finanças, Trânsito, Meio Ambiente. */
export const DEFAULT_SERVICES = ['saude', 'financas', 'transito', 'meio-ambiente'];
export const MAX_SERVICES_RECOMMENDED = 6;

export const getLayout = (id) => LAYOUTS.find((l) => l.id === id);

// ------------------------------------------------------------- utilitários

export const onlyDigits = (s) => String(s ?? '').replace(/\D/g, '');

export function formatPhone(ddd, numero) {
  const n = onlyDigits(numero);
  const body = n.length === 9 ? `${n.slice(0, 5)}-${n.slice(5)}` : n.length === 8 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
  return `(${onlyDigits(ddd)}) ${body}`;
}

export const whatsappLink = (ddd, numero) => `https://wa.me/55${onlyDigits(ddd)}${onlyDigits(numero)}`;

export function slugify(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Nome do arquivo: {slug-layout}_{slug-municipio}_{ddmmaaaa}.pdf */
export function pdfFileName(layoutId, municipio, date = new Date()) {
  const d = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
  const mun = slugify([municipio.nome_municipio, municipio.uf].filter(Boolean).join(' '));
  return `${getLayout(layoutId).slug}_${mun}_${d}.pdf`;
}

/** Validação simples de e-mail (cadastro do município). */
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s ?? '').trim());

const ASCENT_EM = 0.968; // hhea.ascender da Montserrat
const DESCENT_EM = LINE_HEIGHT_EM - ASCENT_EM;
const BOLD_OF = { regular: 'bold', semibold: 'bold', bold: 'black', black: 'black' };
const RANK = { regular: 0, semibold: 1, bold: 2, black: 3 };
const mmToPtSize = (mm) => mm / ptToMm(1);

/** "a **b c** d\ne" → linhas forçadas de palavras { text, bold }. */
function parseRich(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => {
      const words = [];
      let bold = false;
      for (const part of line.split('**')) {
        for (const w of part.split(/\s+/).filter(Boolean)) words.push({ text: w, bold });
        bold = !bold;
      }
      return words;
    })
    .filter((l) => l.length);
}

/**
 * Bloco de texto com negrito parcial e quebras forçadas.
 * Devolve o elemento (linhas com x/linha de base absolutos e trechos por peso).
 * `bg`: cores sob o texto (contraste); `onGradient`: o contraste é medido depois,
 * amostrando o degradê sob cada linha. `fit`: reduz o corpo até nenhuma linha
 * forçada precisar quebrar (piso `fit` em pt).
 */
function textBlock(o) {
  const { id, role, text, x, y, w, weight = 'regular', align = 'left', measure } = o;
  const leading = o.leading ?? LINE_HEIGHT_EM;
  const boldW = o.boldWeight ?? BOLD_OF[weight];
  const forced = parseRich(text);
  const layoutAt = (sizePt) => {
    const lines = [];
    const space = measure(' ', weight, sizePt);
    for (const words of forced) {
      let cur = [];
      let curW = 0;
      for (const wd of words) {
        const ww = measure(wd.text, wd.bold ? boldW : weight, sizePt);
        const next = cur.length ? curW + space + ww : ww;
        if (cur.length && next > w) {
          lines.push(cur);
          cur = [{ ...wd, ww }];
          curW = ww;
        } else {
          cur.push({ ...wd, ww });
          curW = next;
        }
      }
      if (cur.length) lines.push(cur);
    }
    return { lines, space };
  };
  let size = o.sizePt;
  let L = layoutAt(size);
  if (o.fit) {
    const tooWide = (l) => l.lines.length > forced.length || l.lines.some((ws) => ws.reduce((n, wd) => n + wd.ww, 0) + (ws.length - 1) * l.space > w + 0.01);
    while (size > o.fit && tooWide(L)) {
      size = Math.max(o.fit, size - 0.25);
      L = layoutAt(size);
    }
  }
  const sizeMm = ptToMm(size);
  const lh = sizeMm * leading;
  const weights = new Set();
  const lines = L.lines.map((ws, i) => {
    const runs = [];
    for (const wd of ws) {
      const wt = wd.bold ? boldW : weight;
      weights.add(wt);
      const last = runs[runs.length - 1];
      if (last && last.weight === wt) last.text += ` ${wd.text}`;
      else runs.push({ text: wd.text, weight: wt, dx: 0 });
    }
    // posição de cada trecho (o espaço entre trechos vem do peso base)
    let cx = 0;
    for (const [k, r] of runs.entries()) {
      if (k > 0) cx += L.space;
      r.dx = cx;
      cx += measure(r.text, r.weight, size);
    }
    const lw = cx;
    const lx = align === 'center' ? x + (w - lw) / 2 : align === 'right' ? x + w - lw : x;
    return { text: runs.map((r) => r.text).join(' '), x: lx, baseline: y + i * lh + sizeMm * ASCENT_EM, width: lw, runs };
  });
  const h = lines.length ? (lines.length - 1) * lh + sizeMm * LINE_HEIGHT_EM : 0;
  // texto "grande" só se todos os trechos forem negrito (regra WCAG adotada no projeto)
  const lightest = [...weights].sort((a, b) => RANK[a] - RANK[b])[0] ?? weight;
  const el = {
    type: 'text',
    id,
    role,
    weight,
    size,
    color: o.color ?? 'branco',
    minContrast: minContrastFor(size, lightest),
    lines,
    x,
    y,
    w,
    h,
  };
  if (o.illustrative) el.illustrative = true;
  if (o.onGradient) {
    el.onGradient = true;
    el.fixedColor = !!o.color;
  } else if (o.bg) {
    const picked = o.color ? { key: o.color, ratio: Math.min(...o.bg.map((b) => contrastRatio(COLORS[o.color].hex, b))) } : pickTextColor(o.bg);
    el.color = picked.key;
    el.contrast = picked.ratio;
  }
  return el;
}

const textBottom = (t) => t.y + t.h;

// ------------------------------------------------------------- geometria

const bboxOf = (els) => {
  const xs = els.map((e) => e.x);
  const ys = els.map((e) => e.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { x: left, y: top, w: Math.max(...els.map((e) => e.x + e.w)) - left, h: Math.max(...els.map((e) => e.y + e.h)) - top };
};

const rectPoly = (b) => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];

function polysIntersect(A, B) {
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i];
      const [x2, y2] = P[(i + 1) % P.length];
      const nx = y2 - y1;
      const ny = x1 - x2;
      const proj = (Q) => Q.map(([x, y]) => x * nx + y * ny);
      const a = proj(A);
      const b = proj(B);
      if (Math.max(...a) <= Math.min(...b) || Math.max(...b) <= Math.min(...a)) return false;
    }
  }
  return true;
}

const boxesIntersect = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function blocksIntersect(a, b) {
  if (!boxesIntersect(a.bbox, b.bbox)) return false;
  if (!a.shape && !b.shape) return true;
  return polysIntersect(a.shape ?? rectPoly(a.bbox), b.shape ?? rectPoly(b.bbox));
}

function block(id, label, elements, opts = {}) {
  return {
    id,
    label,
    elements,
    movable: opts.movable ?? true,
    exempt: opts.exempt ?? false,
    opaque: opts.opaque ?? false,
    bleedOk: opts.bleedOk ?? false,
    shape: opts.shape ?? null,
    bbox: opts.bbox ?? bboxOf(elements),
  };
}

function shiftBlock(b, dx, dy) {
  for (const e of b.elements) {
    e.x += dx;
    e.y += dy;
    if (e.lines) for (const l of e.lines) (l.x += dx), (l.baseline += dy);
    if (e.type === 'gradient' && e.kind === 'radial') (e.cx += dx), (e.cy += dy);
  }
  if (b.shape) b.shape = b.shape.map(([x, y]) => [x + dx, y + dy]);
  b.bbox = { ...b.bbox, x: b.bbox.x + dx, y: b.bbox.y + dy };
}

/** Cor do degradê de fundo num ponto da página (para medir contraste). */
function sampleBackground(bg, x, y) {
  const t = Math.min(1, Math.max(0, Math.hypot(x - bg.cx, y - bg.cy) / bg.r));
  const stops = bg.stops;
  for (let i = 1; i < stops.length; i++) {
    const [o1, k1] = stops[i - 1];
    const [o2, k2] = stops[i];
    if (t <= o2) return mixHex(COLORS[k1].hex, COLORS[k2].hex, (t - o1) / (o2 - o1 || 1));
  }
  return COLORS[stops[stops.length - 1][1]].hex;
}

function lineBoxes(e) {
  const s = ptToMm(e.size);
  return e.lines.map((l) => ({ x: l.x, y: l.baseline - s * ASCENT_EM, w: l.width, h: s * LINE_HEIGHT_EM }));
}

// ------------------------------------------------------------- logos

/** Proporção e versão do logo Gove oficial para um espaço e um fundo (regra de brand/logos.js). */
function goveOfficial(slotW, slotH, bgHex) {
  const kind = kindForBox(slotW, slotH);
  const pick = pickLogo(bgHex, kind);
  return { kind, pick, aspect: LOGOS[kind].aspect, px: kind === 'logotipo' ? [2000, 637] : [806, 1080] };
}

/**
 * Elemento de logo encaixado num espaço (x, y, w, h). `bgHex`: cor do fundo atrás do logo.
 * Logo Gove oficial: versão escolhida pela regra de contraste (cor/roxo/branco).
 */
function logoElement(which, asset, slot, bgHex, align = 'center') {
  if (!asset) return { type: 'logo', which, missing: true, ...slot, bg: bgHex };
  let aspect;
  let pxW;
  const extra = {};
  if (which === 'gove' && asset.official) {
    const o = goveOfficial(slot.w, slot.h, bgHex);
    aspect = o.aspect;
    pxW = o.px[0];
    Object.assign(extra, { official: true, kind: o.kind, variant: o.pick.variant, file: o.pick.file, logoContrast: o.pick.minContrast, logoOk: o.pick.ok });
  } else {
    if (!asset.width || !asset.height) return { type: 'logo', which, missing: true, ...slot, bg: bgHex };
    aspect = asset.width / asset.height;
    pxW = asset.width;
  }
  let lw = slot.w;
  let lh = lw / aspect;
  if (lh > slot.h) (lh = slot.h), (lw = slot.h * aspect);
  const lx = align === 'right' ? slot.x + slot.w - lw : align === 'left' ? slot.x : slot.x + (slot.w - lw) / 2;
  return { type: 'logo', which, x: lx, y: slot.y + (slot.h - lh) / 2, w: lw, h: lh, dpi: pxW / (lw / 25.4), bg: bgHex, ...extra };
}

const naturalWidth = (which, asset, h) => {
  if (!asset) return h * 2;
  if (which === 'gove' && asset.official) return h * LOGOS.logotipo.aspect;
  return asset.width && asset.height ? (h * asset.width) / asset.height : h * 2;
};

/** Logos em linha (centralizados) — adesivo e display. Alturas relativas por logo. */
function logosRow({ x, y, w, h, gap, assets, includeBB, rel = { prefeitura: 1, gove: 0.62, bb: 0.7 } }) {
  const which = ['prefeitura', 'gove', ...(includeBB ? ['bb'] : [])];
  let hs = which.map((k) => h * rel[k]);
  let ws = which.map((k, i) => Math.min(naturalWidth(k, assets?.[k], hs[i]), w));
  const total = ws.reduce((a, b) => a + b, 0) + gap * (which.length - 1);
  if (total > w) {
    const k = (w - gap * (which.length - 1)) / (total - gap * (which.length - 1));
    ws = ws.map((v) => v * k);
    hs = hs.map((v) => v * k);
  }
  let cx = x + (w - (ws.reduce((a, b) => a + b, 0) + gap * (which.length - 1))) / 2;
  const els = which.map((k, i) => {
    const slot = { x: cx, y: y + (h - hs[i]) / 2, w: ws[i], h: hs[i] };
    cx += ws[i] + gap;
    return logoElement(k, assets?.[k], slot, COLORS.branco.hex);
  });
  return block('logos', 'Logos', els, { bbox: { x, y, w, h } });
}

/** Logos empilhados e alinhados à direita — flyers (prefeitura em cima, Gove embaixo). */
function logosColumn({ x, y, w, h, gap, assets, includeBB, heights }) {
  const which = ['prefeitura', 'gove', ...(includeBB ? ['bb'] : [])];
  let hs = which.map((k) => heights[k]);
  const need = hs.reduce((a, b) => a + b, 0) + gap * (which.length - 1);
  const k = need > h ? (h - gap * (which.length - 1)) / (need - gap * (which.length - 1)) : 1;
  hs = hs.map((v) => v * k);
  let cy = y;
  const els = which.map((key, i) => {
    const slot = { x, y: cy, w, h: hs[i] };
    cy += hs[i] + gap;
    return logoElement(key, assets?.[key], slot, COLORS.branco.hex, 'right');
  });
  const used = cy - gap - y;
  return block('logos', 'Logos', els, { bbox: { x, y, w, h: used } });
}

// ------------------------------------------------------------- blocos

function serviceCircles({ services, right, left, y, d, gap, s }) {
  const list = services.map((id) => SERVICE_ICONS.find((i) => i.id === id)).filter(Boolean);
  if (!list.length) return null;
  const n = list.length;
  const avail = right - left;
  const k = Math.min(1, avail / (n * d + (n - 1) * gap));
  const D = d * k;
  const G = gap * k;
  const els = [];
  list.forEach((svc, i) => {
    const cx = right - (n - i) * D - (n - 1 - i) * G;
    els.push({ type: 'circle', x: cx, y, w: D, h: D, stroke: 'branco', lineWidth: 0.55 * s });
    const ic = D * 0.56;
    els.push({ type: 'icon', paths: svc.paths, x: cx + (D - ic) / 2, y: y + (D - ic) / 2, w: ic, h: ic, stroke: 'branco', lineWidth: 1.6, opacity: 1 });
  });
  return block('servicos', 'Ícones de serviços', els);
}

function qrPlate({ x, y, qrMm, data, id = 'qr', label = 'QR code', r = 0 }) {
  const plate = qrMm + 2 * QR_QUIET_MM;
  return block(id, label, [
    { type: 'rect', x, y, w: plate, h: plate, fill: 'branco', r },
    { type: 'qr', x: x + QR_QUIET_MM, y: y + QR_QUIET_MM, w: qrMm, h: qrMm, data, color: 'preto' },
  ], { opaque: true });
}

/** Tela gerada do celular (coordenadas locais da tela: 0..sw × 0..sh). */
function generatedScreen({ sw, sh, input, measure }) {
  const u = sw / 100;
  const pt = (mm) => mmToPtSize(mm);
  const m = input.municipio ?? {};
  const els = [{ type: 'rect', x: 0, y: 0, w: sw, h: sh, fill: 'branco' }];
  const T = (o) => textBlock({ measure, illustrative: true, ...o });

  // Cabeçalho verde com hora, logo da prefeitura (num selo branco) e logo da Gove
  const headH = 26 * u;
  els.push({ type: 'rect', x: 0, y: 0, w: sw, h: headH, fill: 'whatsapp' });
  els.push(T({ id: 'm-hora', role: 'mockup', text: '9:41', x: 7 * u, y: 2.6 * u, w: 20 * u, sizePt: pt(3.4 * u), weight: 'semibold', color: 'branco' }));
  const chipH = 12 * u;
  const chipY = 10.5 * u;
  els.push({ type: 'rect', x: 5 * u, y: chipY, w: 30 * u, h: chipH, fill: 'branco', r: 2.6 * u });
  const pref = logoElement('prefeitura', input.assets?.prefeitura, { x: 6.5 * u, y: chipY + 1.3 * u, w: 27 * u, h: chipH - 2.6 * u }, COLORS.branco.hex);
  els.push({ ...pref, illustrative: true });
  const gove = input.assets?.gove;
  if (gove && !gove.official) {
    els.push({ type: 'rect', x: 65 * u, y: chipY, w: 30 * u, h: chipH, fill: 'branco', r: 2.6 * u });
    els.push({ ...logoElement('gove', gove, { x: 66.5 * u, y: chipY + 1.3 * u, w: 27 * u, h: chipH - 2.6 * u }, COLORS.branco.hex), illustrative: true });
  } else {
    els.push({ ...logoElement('gove', gove, { x: 65 * u, y: chipY + 2.2 * u, w: 30 * u, h: chipH - 4.4 * u }, COLORS.whatsapp.hex, 'right'), illustrative: true });
  }

  // Corpo
  let y = headH + 7 * u;
  const h1 = T({ id: 'm-h1', role: 'mockup', text: MOCKUP_TEXTS.h1, x: 7 * u, y, w: 86 * u, sizePt: pt(6.2 * u), weight: 'bold', align: 'center', leading: 1.12, color: 'grafite' });
  els.push(h1);
  y = textBottom(h1) + 3 * u;
  const h2 = T({ id: 'm-h2', role: 'mockup', text: MOCKUP_TEXTS.h2, x: 10 * u, y, w: 80 * u, sizePt: pt(3.9 * u), weight: 'regular', align: 'center', leading: 1.25, color: 'cinzaTexto' });
  els.push(h2);
  y = textBottom(h2) + 6 * u;

  const chosen = (input.services?.length ? input.services : DEFAULT_SERVICES).slice(0, 4);
  const icons = chosen.map((id) => SERVICE_ICONS.find((i) => i.id === id)).filter(Boolean);
  const D = 15 * u;
  const G = 6.5 * u;
  let ix = (sw - (icons.length * D + (icons.length - 1) * G)) / 2;
  for (const svc of icons) {
    els.push({ type: 'circle', x: ix, y, w: D, h: D, fill: 'whatsapp' });
    const ic = D * 0.56;
    els.push({ type: 'icon', paths: svc.paths, x: ix + (D - ic) / 2, y: y + (D - ic) / 2, w: ic, h: ic, stroke: 'branco', lineWidth: 2, opacity: 1 });
    ix += D + G;
  }
  y += D + 7 * u;

  // Card verde com o número
  const cardH = 25 * u;
  els.push({ type: 'rect', x: 6 * u, y, w: 88 * u, h: cardH, fill: 'verdeEscuro1', r: 4 * u });
  const gl = 13 * u;
  els.push({ type: 'glyph', ...WHATSAPP_GLYPH, x: 11 * u, y: y + (cardH - gl) / 2, w: gl, h: gl, fill: 'branco' });
  const num = T({ id: 'm-num', role: 'mockup', text: formatPhone(m.ddd, m.numero_whatsapp), x: 29 * u, y: y + 5 * u, w: 62 * u, sizePt: pt(6.8 * u), weight: 'bold', color: 'branco', fit: 3 });
  els.push(num);
  els.push(T({ id: 'm-card', role: 'mockup', text: MOCKUP_TEXTS.card, x: 29 * u, y: textBottom(num) + 1.4 * u, w: 62 * u, sizePt: pt(3.5 * u), weight: 'regular', color: 'branco', fit: 2 }));
  y += cardH + 6 * u;

  const h4 = T({ id: 'm-h4', role: 'mockup', text: MOCKUP_TEXTS.h4, x: 6 * u, y, w: 88 * u, sizePt: pt(4 * u), weight: 'semibold', align: 'center', color: 'grafite', fit: 2 });
  els.push(h4);
  y = textBottom(h4) + 3.5 * u;

  // Rodapé ancorado embaixo: botão, e acima endereço e e-mail (linhas vazias somem)
  const btnH = 11.5 * u;
  const btnY = sh - 8 * u - btnH;
  const foot = [];
  let fy = btnY - 5 * u;
  const lines = [
    m.email ? { icon: UI_ICONS.mail, text: String(m.email).trim() } : null,
    m.endereco ? { icon: UI_ICONS.pin, text: String(m.endereco).trim() } : null,
  ].filter(Boolean);
  for (const ln of lines) {
    const t = T({ id: 'm-foot', role: 'mockup', text: ln.text, x: 14 * u, y: 0, w: 80 * u, sizePt: pt(3.1 * u), weight: 'regular', color: 'cinzaTexto', leading: 1.3 });
    fy -= t.h;
    const dy = fy;
    t.y += dy;
    t.lines.forEach((l) => (l.baseline += dy));
    const icS = 3.6 * u;
    foot.push({ type: 'icon', paths: ln.icon, x: 8.5 * u, y: dy + 0.2 * u, w: icS, h: icS, stroke: 'cinzaTexto', lineWidth: 2, opacity: 1 }, t);
    fy -= 2.2 * u;
  }
  const footTop = lines.length ? fy - 1.5 * u : btnY - 4 * u;
  if (lines.length) foot.push({ type: 'rect', x: 6 * u, y: footTop, w: 88 * u, h: Math.max(0.12, 0.25 * u), fill: 'cinzaClaro' });

  // Card do QR (ilustrativo) com a URL em azul
  const url = whatsappLink(m.ddd, m.numero_whatsapp).replace(/^https:\/\//, '');
  const urlPt = pt(3 * u);
  const urlH = ptToMm(urlPt) * LINE_HEIGHT_EM;
  const pad = 5 * u;
  const q = Math.max(16 * u, Math.min(40 * u, footTop - 4 * u - y - 2 * pad - 2.5 * u - urlH));
  const cw = Math.max(q + 2 * pad, 56 * u);
  const cx = (sw - cw) / 2;
  const ch = pad + q + 2.5 * u + urlH + pad * 0.8;
  els.push({ type: 'rect', x: cx, y, w: cw, h: ch, fill: 'branco', stroke: 'cinzaClaro', lineWidth: 0.35 * u, r: 3 * u });
  els.push({ type: 'qr', x: (sw - q) / 2, y: y + pad, w: q, h: q, data: whatsappLink(m.ddd, m.numero_whatsapp), color: 'preto', illustrative: true });
  els.push(T({ id: 'm-url', role: 'mockup', text: url, x: cx + 2 * u, y: y + pad + q + 2.5 * u, w: cw - 4 * u, sizePt: urlPt, weight: 'regular', align: 'center', color: 'azulLink', fit: 1.5 }));

  els.push(...foot);
  els.push({ type: 'rect', x: 6 * u, y: btnY, w: 88 * u, h: btnH, fill: 'verdeEscuro2', r: btnH / 2 });
  const bPt = pt(4.2 * u);
  const label = MOCKUP_TEXTS.button;
  const lw = measure(label, 'semibold', bPt);
  const icS = 4.6 * u;
  const bx = (sw - (icS + 2 * u + lw)) / 2;
  els.push({ type: 'icon', paths: UI_ICONS.userPlus, x: bx, y: btnY + (btnH - icS) / 2, w: icS, h: icS, stroke: 'branco', lineWidth: 2, opacity: 1 });
  els.push(T({ id: 'm-btn', role: 'mockup', text: label, x: bx + icS + 2 * u, y: btnY + (btnH - ptToMm(bPt) * LINE_HEIGHT_EM) / 2, w: lw + 1, sizePt: bPt, weight: 'semibold', color: 'branco' }));
  return els;
}

/**
 * Celular (moldura realista) com a tela gerada ou a captura enviada, inclinado.
 * (ox, oy) = canto superior esquerdo do aparelho antes da rotação; W = largura.
 */
function phoneMockup({ ox, oy, W, angle, input, measure, minBottom = 0 }) {
  // Proporção de um celular atual (~9:18,5); nos flyers o aparelho sai pela base da
  // página (como nas referências), então alonga se preciso para cobrir a sangria.
  const ang = (angle * Math.PI) / 180;
  const H = Math.max(W * 2.06, (minBottom - oy - Math.min(0, W * Math.sin(ang))) / Math.cos(ang));
  const rOuter = W * 0.16;
  const rim = W * 0.012;
  const bezel = W * 0.04;
  const sw = W - 2 * bezel;
  const sh = H - 2 * bezel;
  const rScreen = rOuter - bezel;
  const upload = input.mockup?.mode === 'upload' || (input.mockup?.imageId && input.mockup?.mode !== 'generated');
  const children = [
    // botões laterais (contorno sutil, sem sombra — CMYK sólido)
    { type: 'rect', x: -W * 0.012, y: H * 0.2, w: W * 0.02, h: H * 0.06, fill: 'cinzaAro', r: W * 0.006 },
    { type: 'rect', x: -W * 0.012, y: H * 0.28, w: W * 0.02, h: H * 0.06, fill: 'cinzaAro', r: W * 0.006 },
    { type: 'rect', x: W - W * 0.008, y: H * 0.24, w: W * 0.02, h: H * 0.09, fill: 'cinzaAro', r: W * 0.006 },
    { type: 'rect', x: 0, y: 0, w: W, h: H, fill: 'cinzaAro', r: rOuter },
    { type: 'rect', x: rim, y: rim, w: W - 2 * rim, h: H - 2 * rim, fill: 'pretoRico', r: rOuter - rim },
  ];
  if (upload) {
    const m = input.mockup;
    children.push({
      type: 'mockup-screen',
      x: bezel,
      y: bezel,
      w: sw,
      h: sh,
      r: rScreen,
      imageId: m?.imageId ?? null,
      focus: m?.focus ?? { x: 0.5, y: 0.5 },
      dpi: m?.width ? Math.min(m.width, (m.height * sw) / sh) / (sw / 25.4) : null,
      fill: 'cinzaTela',
    });
  } else {
    children.push({ type: 'group', x: bezel, y: bezel, rotate: 0, clip: { w: sw, h: sh, r: rScreen }, children: generatedScreen({ sw, sh, input, measure }), w: sw, h: sh });
  }
  // ilha dinâmica
  children.push({ type: 'rect', x: (W - sw * 0.3) / 2, y: bezel + sw * 0.03, w: sw * 0.3, h: sw * 0.085, fill: 'pretoRico', r: sw * 0.0425 });

  const a = (angle * Math.PI) / 180;
  const rot = ([x, y]) => [ox + x * Math.cos(a) - y * Math.sin(a), oy + x * Math.sin(a) + y * Math.cos(a)];
  const shape = [[0, 0], [W, 0], [W, H], [0, H]].map(rot);
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const bbox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  const group = { type: 'group', x: ox, y: oy, rotate: angle, children, w: W, h: H, mockupMode: upload ? 'upload' : 'generated' };
  return block('mockup', 'Mockup do celular', [group], { opaque: true, bleedOk: true, shape, bbox });
}

// --------------------------------------------------------------- layouts

/** Flyers A4 e 10x15: medidas do A4 de referência × s (geometria) e × ts (tipos). */
function flyer(layout, input, measure, s, ts, nts) {
  const T = { ...DEFAULT_TEXTS[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const th = layout.trim.h;
  const minX = SAFE_MM + 0.5;
  const R1 = Math.min(tw - 14.6 * s, tw - minX); // título e ícones
  const R2 = Math.min(tw - 11.6 * s, tw - minX); // conteúdo do painel
  const blocks = [];

  const h1 = textBlock({ id: 'h1', role: 'h1', text: T.h1, x: minX, y: Math.max(minX, 12.2 * s), w: R1 - minX, sizePt: 44 * ts, weight: 'regular', boldWeight: 'bold', align: 'right', leading: TITLE_LEADING_EM, color: 'branco', onGradient: true, fit: 44 * ts * 0.6, measure });
  blocks.push(block('h1', 'Título (H1)', [h1]));
  let cursor = textBottom(h1);

  const circles = serviceCircles({ services: input.services ?? [], right: R1, left: minX, y: cursor + 4.9 * s, d: 15.2 * s, gap: 10.1 * s, s });
  if (circles) {
    blocks.push(circles);
    cursor = circles.bbox.y + circles.bbox.h;
  }

  // Painel branco: canto superior esquerdo arredondado, vai até a sangria (direita e base)
  const panelX = 26.2 * s;
  const panelTop = Math.max(91.9 * s, cursor + 8.5 * s);
  const panel = block('painel', 'Painel branco', [
    { type: 'rect', x: panelX, y: panelTop, w: tw + BLEED_MM - panelX, h: th + BLEED_MM - panelTop, fill: 'branco', radii: [26 * s, 0, 0, 0] },
  ], { movable: false, exempt: true, opaque: true });

  const h4a = textBlock({ id: 'h4a', role: 'h4', text: T.h4a, x: panelX + 10 * s, y: panelTop + 5.1 * s, w: R2 - panelX - 10 * s, sizePt: 24.8 * ts, weight: 'regular', align: 'right', leading: 0.96, color: 'preto', bg: [COLORS.branco.hex], fit: TYPE.h4.min, measure });

  // Faixa verde com o número (arredondada à esquerda, vai até a sangria)
  const barY = textBottom(h4a) + 4 * s;
  const numPt = 39 * nts;
  const phone = formatPhone(input.municipio?.ddd, input.municipio?.numero_whatsapp);
  const barH = Math.max(21.6 * s, ptToMm(numPt) * LINE_HEIGHT_EM + 4 * s);
  const numW = measure(phone, 'bold', numPt);
  const barX = Math.min(82 * s, R2 - numW - barH * 0.7);
  const num = textBlock({ id: 'numero', role: 'number', text: phone, x: barX, y: barY + (barH - ptToMm(numPt) * LINE_HEIGHT_EM) / 2, w: R2 - barX, sizePt: numPt, weight: 'bold', align: 'right', color: 'branco', bg: [COLORS.folhaFaixa.hex], measure });
  const numero = block('numero', 'Faixa do número', [
    { type: 'rect', x: barX, y: barY, w: tw + BLEED_MM - barX, h: barH, fill: 'folhaFaixa', radii: [barH / 2, 0, 0, barH / 2] },
    num,
  ], { movable: false, opaque: true, bleedOk: true });

  const h4b = textBlock({ id: 'h4b', role: 'h4', text: T.h4b, x: R2 - 88 * s, y: barY + barH + 6.2 * s, w: 88 * s, sizePt: 24.8 * ts, weight: 'regular', align: 'right', leading: 0.96, color: 'preto', bg: [COLORS.branco.hex], fit: TYPE.h4.min, measure });

  // QR e logos à direita, até o limite inferior
  const qrTop = textBottom(h4b) + 4.2 * s;
  const bottom = th - 16.8 * s;
  const logoH = { prefeitura: 24 * s, gove: 14 * s, bb: 14 * s };
  const logosNeed = logoH.prefeitura + logoH.gove + (input.includeBB ? logoH.bb + 4 * s : 0) + 4 * s;
  const qrMm = Math.max(QR_MIN_MM, Math.min(47.4 * s, bottom - qrTop - 2 * QR_QUIET_MM - 3.6 * s - logosNeed));
  const plate = qrMm + 2 * QR_QUIET_MM;
  const qr = qrPlate({ x: R2 - plate, y: qrTop, qrMm, data: whatsappLink(input.municipio?.ddd, input.municipio?.numero_whatsapp) });
  const logosTop = qrTop + plate + 3.6 * s;
  const logos = logosColumn({ x: R2 - 58 * s, y: logosTop, w: 58 * s, h: Math.max(10, bottom - logosTop), gap: 4 * s, assets: input.assets, includeBB: input.includeBB, heights: logoH });

  // Celular inclinado à esquerda, encostado na faixa do número
  const W = 82 * s;
  const angle = -14;
  const a = (angle * Math.PI) / 180;
  const tr = [86.3 * s, barY + barH + 1.5 * s];
  const ox = tr[0] - W * Math.cos(a);
  const oy = tr[1] - W * Math.sin(a);
  const mock = phoneMockup({ ox, oy, W, angle, input, measure, minBottom: th + BLEED_MM + 3 });

  blocks.push(panel, block('h4a', 'Instrução do QR (H4)', [h4a]), numero, block('h4b', 'Chamada após o número (H4)', [h4b]), qr, mock, logos);
  return { blocks, watermark: { max: 100 * s, min: 40 * s, top: minX, bottom: panelTop + 10 * s }, panelTop };
}

function adesivo(layout, input, measure) {
  const T = { ...DEFAULT_TEXTS[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const th = layout.trim.h;
  const m = SAFE_MM + 0.5;
  const blocks = [];
  const h1 = textBlock({ id: 'h1', role: 'h1', text: T.h1, x: m, y: 5.9, w: tw - 2 * m, sizePt: 17.5, weight: 'regular', boldWeight: 'bold', align: 'center', leading: TITLE_LEADING_EM, color: 'branco', onGradient: true, fit: 11, measure });
  blocks.push(block('h1', 'Título (H1)', [h1]));
  const plate = 35;
  const qrMm = plate - 2 * QR_QUIET_MM;
  blocks.push(qrPlate({ x: (tw - plate) / 2, y: Math.max(31.2, textBottom(h1) + 4), qrMm, data: whatsappLink(input.municipio?.ddd, input.municipio?.numero_whatsapp) }));
  const footerTop = 76.4;
  blocks.push(block('rodape', 'Faixa branca dos logos', [{ type: 'rect', x: -BLEED_MM, y: footerTop, w: tw + 2 * BLEED_MM, h: th - footerTop + BLEED_MM, fill: 'branco' }], { movable: false, exempt: true, opaque: true }));
  blocks.push(logosRow({ x: m, y: 80, w: tw - 2 * m, h: 14.6, gap: 3.8, assets: input.assets, includeBB: input.includeBB, rel: { prefeitura: 1, gove: 0.56, bb: 0.6 } }));
  return { blocks, watermark: null };
}

function displayA6(layout, input, measure) {
  const T = { ...DEFAULT_TEXTS[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const th = layout.trim.h;
  const m = SAFE_MM + 0.5;
  const blocks = [];

  // Ícone grande do WhatsApp (decorativo, sai pela sangria à esquerda)
  blocks.push(block('icone-whatsapp', 'Ícone do WhatsApp', [
    { type: 'glyph', ...WHATSAPP_GLYPH, x: -10.5, y: 10.5, w: 43, h: 43, fill: 'branco' },
  ], { movable: false, exempt: true }));

  const hx = 37.8;
  const hw = tw - m - hx;
  const opts = { x: hx, w: hw, sizePt: 26.3, weight: 'bold', leading: 1.0, onGradient: true, fit: 14, measure };
  const probe1 = textBlock({ ...opts, id: 'h1', role: 'h1', text: T.h1, y: 10.9, color: 'preto' });
  const probe2 = textBlock({ ...opts, id: 'h1b', role: 'h1', text: T.h1b, y: 0, color: 'branco' });
  const size = Math.min(probe1.size, probe2.size);
  const h1 = textBlock({ ...opts, sizePt: size, fit: 0, id: 'h1', role: 'h1', text: T.h1, y: 10.9, color: 'preto' });
  const h1b = textBlock({ ...opts, sizePt: size, fit: 0, id: 'h1b', role: 'h1', text: T.h1b, y: 10.9 + h1.lines.length * ptToMm(size) * 1.0, color: 'branco' });
  blocks.push(block('h1', 'Título (H1)', [h1, h1b]));

  const plate = 38.5;
  const qrMm = plate - 2 * QR_QUIET_MM;
  const qrY = Math.max(65.1, textBottom(h1b) + 6);
  const qr = qrPlate({ x: 53.1, y: qrY, qrMm, data: whatsappLink(input.municipio?.ddd, input.municipio?.numero_whatsapp) });
  const probe = textBlock({ id: 'h3', role: 'h3', text: T.h3, x: m, y: 0, w: 47.4 - m, sizePt: 17.1, weight: 'regular', boldWeight: 'bold', align: 'right', leading: 0.965, color: 'branco', onGradient: true, fit: 10, measure });
  const h3 = textBlock({ id: 'h3', role: 'h3', text: T.h3, x: m, y: qrY + (plate - probe.h) / 2, w: 47.4 - m, sizePt: probe.size, weight: 'regular', boldWeight: 'bold', align: 'right', leading: 0.965, color: 'branco', onGradient: true, measure });
  blocks.push(block('h3', 'Apoio ao lado do QR (H3)', [h3]), qr);

  const footerTop = 127.35;
  blocks.push(block('rodape', 'Faixa branca dos logos', [{ type: 'rect', x: -BLEED_MM, y: footerTop, w: tw + 2 * BLEED_MM, h: th - footerTop + BLEED_MM, fill: 'branco' }], { movable: false, exempt: true, opaque: true }));
  blocks.push(logosRow({ x: 14, y: 129.9, w: tw - 28, h: 13.1, gap: 10, assets: input.assets, includeBB: input.includeBB, rel: { prefeitura: 1, gove: 0.68, bb: 0.75 } }));
  return { blocks, watermark: null };
}

/** Marca d'água (contorno do WhatsApp, branco em baixa opacidade) à esquerda, sem cruzar textos. */
function placeWatermark(spec, blocks) {
  const avoid = [];
  for (const b of blocks) {
    if (b.exempt || b.opaque) continue;
    for (const e of b.elements) {
      if (e.type === 'text') avoid.push(...lineBoxes(e).map((r) => ({ x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 })));
      else avoid.push(e);
    }
  }
  const { max, min, top, bottom } = spec;
  for (let size = max; size >= min; size -= 4) {
    for (let y = top + BLEED_MM; y + size * 0.45 <= bottom + BLEED_MM; y += 3) {
      const box = { x: BLEED_MM - size * 0.22, y, w: size, h: size };
      if (!avoid.some((p) => boxesIntersect(p, box))) {
        return block('marca-dagua', "Ícone do WhatsApp (fundo)", [
          { type: 'icon', paths: WHATSAPP_OUTLINE.paths, inner: WHATSAPP_OUTLINE.inner, ...box, stroke: 'branco', lineWidth: Math.max(0.6, 24 * (1.1 / size)), opacity: 0.2, decorative: true },
        ], { movable: false, exempt: true });
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- API

/**
 * @param {string} layoutId
 * @param {object} input  { municipio, includeBB, services:[ids], texts:{}, overrides:{blockId:{dx,dy}},
 *   mockup:{ mode:'generated'|'upload', imageId, width, height, focus },
 *   assets:{ gove:{official:true}|{width,height}|null, prefeitura, bb } }
 * @param {(text:string, weight:string, sizePt:number) => number} measure  largura em mm
 */
export function buildLayout(layoutId, input, measure) {
  const layout = getLayout(layoutId);
  if (!layout) throw new Error(`Layout desconhecido: ${layoutId}`);
  const { w: tw, h: th } = layout.trim;
  const pageW = tw + 2 * BLEED_MM;
  const pageH = th + 2 * BLEED_MM;

  let spec;
  if (layoutId === 'flyer-a4') spec = flyer(layout, input, measure, 1, 1, 1);
  else if (layoutId === 'flyer-10x15') spec = flyer(layout, input, measure, tw / 210, 0.504, 0.56);
  else if (layoutId === 'adesivo-5x10') spec = adesivo(layout, input, measure);
  else spec = displayA6(layout, input, measure);

  const blocks = spec.blocks;
  // Trim → página (soma a sangria) e aplica os deslocamentos manuais do editor
  for (const b of blocks) {
    shiftBlock(b, BLEED_MM, BLEED_MM);
    const o = input.overrides?.[b.id];
    if (b.movable && o && (o.dx || o.dy)) shiftBlock(b, Number(o.dx) || 0, Number(o.dy) || 0);
  }

  const diag = Math.hypot(tw, th);
  const bg = { cx: BLEED_MM + BACKGROUND.cx * tw, cy: BLEED_MM + BACKGROUND.cy * th, r: BACKGROUND.r * diag, stops: BACKGROUND.stops };
  const background = block('fundo', 'Fundo em degradê', [
    { type: 'gradient', kind: 'radial', x: 0, y: 0, w: pageW, h: pageH, cx: bg.cx, cy: bg.cy, r: bg.r, stops: bg.stops },
  ], { movable: false, exempt: true });

  // Contraste dos textos sobre o degradê: amostra cantos e meio de cada linha
  for (const b of blocks) {
    for (const e of b.elements) {
      if (e.type !== 'text' || !e.onGradient) continue;
      const samples = lineBoxes(e).flatMap((r) => [
        [r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h], [r.x + r.w / 2, r.y + r.h / 2],
      ].map(([x, y]) => sampleBackground(bg, x, y)));
      if (!samples.length) continue;
      const picked = e.fixedColor ? { key: e.color, ratio: Math.min(...samples.map((h) => contrastRatio(COLORS[e.color].hex, h))) } : pickTextColor(samples);
      e.color = picked.key;
      e.contrast = picked.ratio;
    }
  }

  const wm = spec.watermark ? placeWatermark(spec.watermark, blocks) : null;
  // Ordem de pintura: fundo → marca d'água → conteúdo (na ordem do layout)
  const ordered = [background, ...(wm ? [wm] : []), ...blocks];
  const result = {
    layout,
    page: { w: pageW, h: pageH },
    trim: { x: BLEED_MM, y: BLEED_MM, w: tw, h: th },
    safe: { x: BLEED_MM + SAFE_MM, y: BLEED_MM + SAFE_MM, w: tw - 2 * SAFE_MM, h: th - 2 * SAFE_MM },
    background: bg,
    blocks: ordered,
  };
  result.checks = checkLayout(result, input);
  return result;
}

/** Todos os elementos de logo (inclusive os da tela do celular). */
export function logoElements(r) {
  const out = [];
  const walk = (els) => {
    for (const e of els) {
      if (e.type === 'logo') out.push(e);
      if (e.type === 'group') walk(e.children);
    }
  };
  for (const b of r.blocks) walk(b.elements);
  return out;
}

/** Contraste da logomarca Gove (versões oficiais) em todas as posições da peça. */
export function logoContrastCheck(r) {
  const gove = logoElements(r).filter((e) => e.which === 'gove' && !e.missing);
  const official = gove.filter((e) => e.official);
  if (!official.length) return null;
  const worst = official.reduce((a, b) => (b.logoContrast < a.logoContrast ? b : a));
  const ok = worst.logoContrast >= LOGO_MIN_CONTRAST;
  return {
    level: ok ? 'ok' : 'error',
    code: 'logo-contraste',
    message: ok
      ? `Contraste da logomarca ok — Gove ${[...new Set(official.map((e) => e.variant))].join('/')} ≥ ${LOGO_MIN_CONTRAST}:1 em todas as posições (mín. ${worst.logoContrast.toFixed(1)}:1).`
      : `Contraste da logomarca Gove de ${worst.logoContrast.toFixed(1)}:1 — mínimo ${LOGO_MIN_CONTRAST}:1; mude o fundo atrás do logo.`,
  };
}

/** Checagens de produção da peça (as do arquivo PDF ficam no servidor). */
export function checkLayout(r, input) {
  const out = [];
  const add = (level, code, message, blockId = null) => out.push({ level, code, message, blockId });
  const m = input.municipio ?? {};
  const name = r.layout.name;

  if (onlyDigits(m.ddd).length !== 2) add('error', 'ddd', 'DDD inválido: use 2 dígitos.');
  const n = onlyDigits(m.numero_whatsapp).length;
  if (n < 8 || n > 9) add('error', 'numero', 'Número de WhatsApp inválido: use 8 ou 9 dígitos.');

  const content = r.blocks.filter((b) => !b.exempt);
  const s = r.safe;
  const outside = (bb) => bb.x < s.x - 0.01 || bb.y < s.y - 0.01 || bb.x + bb.w > s.x + s.w + 0.01 || bb.y + bb.h > s.y + s.h + 0.01;
  for (const b of content) {
    // Blocos que sangram de propósito (faixa do número, celular): só o conteúdo legível precisa ficar na área de segurança
    const boxes = b.bleedOk ? b.elements.filter((e) => e.type === 'text' || e.type === 'qr' || e.type === 'logo') : [b.bbox];
    if (boxes.some(outside)) add('error', 'seguranca', `${b.label} está fora da área de segurança (5 mm da linha de corte).`, b.id);
  }
  for (let i = 0; i < content.length; i++) {
    for (let j = i + 1; j < content.length; j++) {
      if (blocksIntersect(content[i], content[j])) {
        add('error', 'sobreposicao', `${content[i].label} e ${content[j].label} estão sobrepostos.`, content[j].id);
      }
    }
  }

  for (const b of r.blocks) {
    for (const e of b.elements) {
      if (e.type === 'text' && e.lines.length && e.contrast != null && e.contrast < e.minContrast) {
        add('error', 'contraste', `Contraste de ${e.contrast.toFixed(2)}:1 em "${e.lines[0].text}…" — mínimo ${e.minContrast}:1.`, b.id);
      }
      if (e.type === 'qr' && e.w < QR_MIN_MM - 0.01) add('error', 'qr-min', `QR code com ${e.w.toFixed(1)} mm — mínimo ${QR_MIN_MM} mm.`, b.id);
      if (e.type === 'logo' && e.missing) {
        const label = { gove: 'Logo da Gove', prefeitura: 'Logo da prefeitura', bb: 'Logo do Banco do Brasil' }[e.which];
        add('error', `logo-${e.which}`, `${label} não cadastrado.`, b.id);
      }
      if (e.type === 'logo' && !e.missing && e.dpi < IMAGE_MIN_DPI) {
        add('warn', `logo-dpi-${e.which}`, `Logo (${e.which}) com ${Math.round(e.dpi)} dpi no tamanho de impressão — mínimo ${IMAGE_MIN_DPI}.`, b.id);
      }
      if (e.type === 'group' && e.mockupMode === 'upload') {
        const scr = e.children.find((c) => c.type === 'mockup-screen');
        if (!scr?.imageId) add('warn', 'mockup', 'Captura própria selecionada, mas nenhuma imagem enviada: a tela do celular sai vazia.', b.id);
        else if (scr.dpi != null && scr.dpi < IMAGE_MIN_DPI) add('warn', 'mockup-dpi', `Imagem do mockup com ${Math.round(scr.dpi)} dpi no tamanho de impressão — mínimo ${IMAGE_MIN_DPI}.`, b.id);
      }
    }
  }
  const lc = logoContrastCheck(r);
  if (lc && lc.level !== 'ok') add(lc.level, lc.code, lc.message, 'logos');
  if ((input.services?.length ?? 0) > MAX_SERVICES_RECOMMENDED && r.layout.id.startsWith('flyer')) {
    add('warn', 'servicos', `${input.services.length} ícones de serviço — o recomendado é até ${MAX_SERVICES_RECOMMENDED} por peça.`);
  }
  return out.map((c) => ({ ...c, layout: name }));
}
