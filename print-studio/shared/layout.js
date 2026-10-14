// Gove Print Studio — motor de layout dos 4 materiais do Kit de Boas-Vindas.
//
// Módulo puro: recebe os dados da peça e uma função `measure(texto, peso, tamanhoPt) → mm`
// (canvas no navegador, pdfkit no servidor — ambos com a mesma Montserrat .ttf) e devolve
// todos os elementos já posicionados em milímetros, em coordenadas da página do PDF
// (origem no canto superior esquerdo, sangria incluída). Preview e PDF desenham
// exatamente esta lista, por isso o preview é fiel ao arquivo final.
import { SERVICE_ICONS, WHATSAPP_OUTLINE } from './icons.js';
import {
  BLEED_MM,
  COLORS,
  GRADIENT,
  IMAGE_MIN_DPI,
  LINE_HEIGHT_EM,
  QR_MIN_MM,
  QR_QUIET_MM,
  SAFE_MM,
  TYPE,
  contrastRatio,
  minContrastFor,
  pickTextColor,
  ptToMm,
} from './tokens.js';

export const LAYOUTS = [
  { id: 'flyer-a4', slug: 'flyer-a4', name: 'Flyer A4', trim: { w: 210, h: 297 } },
  { id: 'flyer-10x15', slug: 'flyer-10x15', name: 'Flyer 10x15cm', trim: { w: 100, h: 150 } },
  { id: 'adesivo-5x10', slug: 'adesivo-5x10', name: 'Adesivo 5x10cm', trim: { w: 50, h: 100 } },
  { id: 'display-a6', slug: 'display-acrilico-a6', name: 'Display Acrílico A6', trim: { w: 105, h: 148 } },
];

export const DEFAULT_TEXTS = {
  'flyer-a4': {
    h1: 'Serviços da Prefeitura agora também estão no WhatsApp',
    h4a: 'Aponte a câmera do seu celular para o QR code abaixo ou salve o número',
    h4b: "e mande um 'Oi' para receber o menu de serviços!",
  },
  'flyer-10x15': {
    h1: 'Serviços da Prefeitura agora também estão no WhatsApp',
    h4a: 'Aponte a câmera do seu celular para o QR code abaixo ou salve o número',
    h4b: "e mande um 'Oi' para receber o menu de serviços!",
  },
  'adesivo-5x10': { h1: 'Sua Prefeitura mais digital no WhatsApp' },
  'display-a6': {
    h1: 'Os serviços da prefeitura na palma da sua mão',
    h3: 'Escaneie o QR code e acesse tudo pelo WhatsApp',
  },
};

export const TEXT_LABELS = {
  h1: 'Título principal (H1)',
  h3: 'Apoio lateral (H3)',
  h4a: 'Instrução do QR (H4)',
  h4b: 'Chamada após o número (H4)',
};

export const MAX_SERVICES_RECOMMENDED = 6;

/** Linha do gradiente no sentido do CSS (135° = canto superior esquerdo → inferior direito). */
export function gradientLine(e) {
  const a = (e.angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const half = (Math.abs(e.w * dx) + Math.abs(e.h * dy)) / 2;
  return [cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half];
}
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

const lineHeightMm = (sizePt) => ptToMm(sizePt) * LINE_HEIGHT_EM;
const ASCENT_EM = 0.968; // hhea.ascender da Montserrat

function wrap(text, widthMm, weight, sizePt, measure) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && measure(test, weight, sizePt) > widthMm) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Bloco de texto: devolve o elemento (linhas com x/baseline absolutos) e a altura ocupada.
 * `bg` lista as cores sobre as quais o texto fica (para escolher a cor e checar contraste).
 */
function textBlock({ id, role, text, x, y, w, sizePt, weight, align = 'left', bg, measure, color }) {
  const lines = wrap(text, w, weight, sizePt, measure);
  const lh = lineHeightMm(sizePt);
  const picked = color ? { key: color, ratio: Math.min(...bg.map((b) => contrastRatio(COLORS[color].hex, b))) } : pickTextColor(bg);
  const el = {
    type: 'text',
    id,
    role,
    weight,
    size: sizePt,
    color: picked.key,
    contrast: picked.ratio,
    minContrast: minContrastFor(sizePt, weight),
    lines: lines.map((t, i) => {
      const lw = measure(t, weight, sizePt);
      const lx = align === 'center' ? x + (w - lw) / 2 : align === 'right' ? x + w - lw : x;
      return { text: t, x: lx, baseline: y + i * lh + ptToMm(sizePt) * ASCENT_EM, width: lw };
    }),
    x,
    y,
    w,
    h: lines.length * lh,
  };
  return el;
}

const bboxOf = (els) => {
  const xs = els.map((e) => e.x);
  const ys = els.map((e) => e.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    x: left,
    y: top,
    w: Math.max(...els.map((e) => e.x + e.w)) - left,
    h: Math.max(...els.map((e) => e.y + e.h)) - top,
  };
};

const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function block(id, label, elements, opts = {}) {
  return { id, label, elements, movable: opts.movable ?? true, exempt: opts.exempt ?? false, opaque: opts.opaque ?? false, bbox: opts.bbox ?? bboxOf(elements) };
}

function shiftBlock(b, dx, dy) {
  for (const e of b.elements) {
    e.x += dx;
    e.y += dy;
    if (e.lines) for (const l of e.lines) (l.x += dx), (l.baseline += dy);
    if (e.screen) (e.screen.x += dx), (e.screen.y += dy);
  }
  b.bbox = { ...b.bbox, x: b.bbox.x + dx, y: b.bbox.y + dy };
}

const gradientBg = (bg) => [COLORS[GRADIENT.from].hex, COLORS[GRADIENT.to].hex].concat(bg ?? []);

// --------------------------------------------------------------- blocos

function serviceTiles({ services, x, y, w, s, measure }) {
  const list = services.map((id) => SERVICE_ICONS.find((i) => i.id === id)).filter(Boolean);
  if (!list.length) return null;
  const gap = 4 * s;
  // Peças pequenas usam 3 colunas (mais linhas) para os rótulos continuarem legíveis
  const maxCols = s < 0.7 ? 3 : 6;
  const cols = Math.min(maxCols, Math.max(list.length, Math.min(4, maxCols)));
  const tileW = (w - (cols - 1) * gap) / cols;
  const iconMm = Math.min(11 * s, tileW * 0.45);
  // Rótulo: reduz até a palavra mais longa caber no quadro (sem quebrar palavras)
  const words = list.flatMap((svc) => svc.label.split(/\s+/));
  let labelPt = Math.max(TYPE.body.min, TYPE.body.size * 0.8 * s);
  while (labelPt > 4 && Math.max(...words.map((wd) => measure(wd, 'semibold', labelPt))) > tileW - 3 * s) labelPt -= 0.25;
  const els = [];
  let maxH = 0;
  const tiles = list.map((svc, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx = x + col * (tileW + gap);
    const label = textBlock({ id: `servico-${svc.id}`, role: 'label', text: svc.label, x: tx + 1.5 * s, y: 0, w: tileW - 3 * s, sizePt: labelPt, weight: 'semibold', align: 'center', bg: [COLORS.branco.hex], measure });
    maxH = Math.max(maxH, 3 * s + iconMm + 2 * s + label.h + 3 * s);
    return { svc, tx, row, label };
  });
  for (const t of tiles) {
    const ty = y + t.row * (maxH + gap);
    els.push({ type: 'rect', x: t.tx, y: ty, w: tileW, h: maxH, fill: 'branco', r: 2 * s });
    els.push({ type: 'icon', paths: t.svc.paths, x: t.tx + (tileW - iconMm) / 2, y: ty + 3 * s, w: iconMm, h: iconMm, stroke: 'verdeEscuro2', lineWidth: 2, opacity: 1 });
    const dy = ty + 3 * s + iconMm + 2 * s;
    t.label.y = dy;
    t.label.lines.forEach((l) => (l.baseline += dy));
    els.push(t.label);
  }
  return block('servicos', 'Ícones de serviços', els, { opaque: true });
}

function qrPlate({ x, y, qrMm, data, id = 'qr', label = 'QR code' }) {
  const plate = qrMm + 2 * QR_QUIET_MM;
  return block(id, label, [
    { type: 'rect', x, y, w: plate, h: plate, fill: 'branco', r: 1.5 },
    { type: 'qr', x: x + QR_QUIET_MM, y: y + QR_QUIET_MM, w: qrMm, h: qrMm, data, color: 'preto' },
  ], { opaque: true });
}

function logosRow({ x, y, w, h, gap, assets, includeBB }) {
  const which = ['gove', 'prefeitura', ...(includeBB ? ['bb'] : [])];
  const slotW = (w - (which.length - 1) * gap) / which.length;
  const els = which.map((k, i) => {
    const sx = x + i * (slotW + gap);
    const a = assets?.[k];
    if (!a?.width || !a?.height) return { type: 'logo', which: k, missing: true, x: sx, y, w: slotW, h };
    const ratio = a.width / a.height;
    let lw = slotW;
    let lh = lw / ratio;
    if (lh > h) (lh = h), (lw = h * ratio);
    return { type: 'logo', which: k, x: sx + (slotW - lw) / 2, y: y + (h - lh) / 2, w: lw, h: lh, dpi: a.width / (lw / 25.4) };
  });
  return block('logos', 'Logos', els, { bbox: { x, y, w, h } });
}

function mockupBlock({ x, y, w, s, mockup }) {
  const sideIn = 3 * s;
  const topIn = 7 * s;
  const screenW = w - 2 * sideIn;
  const screenH = (screenW * 16) / 9;
  const h = screenH + 2 * topIn;
  const screen = { x: x + sideIn, y: y + topIn, w: screenW, h: screenH, r: 3 * s };
  const els = [
    { type: 'rect', x, y, w, h, fill: 'pretoRico', r: 8 * s },
    {
      type: 'mockup-screen',
      x: screen.x,
      y: screen.y,
      w: screenW,
      h: screenH,
      r: screen.r,
      imageId: mockup?.imageId ?? null,
      focus: mockup?.focus ?? { x: 0.5, y: 0.5 },
      dpi: mockup?.width ? Math.min(mockup.width, (mockup.height * 9) / 16) / (screenW / 25.4) : null,
      fill: 'cinzaTela',
    },
  ];
  return block('mockup', 'Mockup do celular', els, { opaque: true });
}

function watermark({ pageW, footerTop, protectedBoxes, maxMm }) {
  for (let size = maxMm; size >= 14; size -= 2) {
    const box = { x: pageW - size * 0.78, y: footerTop - size * 0.82, w: size, h: size };
    if (!protectedBoxes.some((p) => intersects(p, box))) {
      return block('marca-dagua', "Ícone do WhatsApp (fundo)", [
        { type: 'icon', paths: WHATSAPP_OUTLINE.paths, inner: WHATSAPP_OUTLINE.inner, x: box.x, y: box.y, w: size, h: size, stroke: 'branco', lineWidth: 1.4, opacity: 0.25, decorative: true },
      ], { movable: false, exempt: true });
    }
  }
  return null;
}

// --------------------------------------------------------------- layouts

function flyer(layout, input, measure, s) {
  const T = { ...DEFAULT_TEXTS[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const th = layout.trim.h;
  const m = Math.max(12 * s, SAFE_MM + 0.5);
  const W = tw - 2 * m;
  const sz = (role) => Math.max(TYPE[role].min, TYPE[role].size * s);
  const blocks = [];

  const h1 = textBlock({ id: 'h1', role: 'h1', text: T.h1, x: m, y: m + 2 * s, w: W, sizePt: sz('h1'), weight: TYPE.h1.weight, bg: gradientBg(), measure });
  blocks.push(block('h1', 'Título (H1)', [h1]));
  let cursor = h1.y + h1.h + 6 * s;

  const tiles = serviceTiles({ services: input.services ?? [], x: m, y: cursor, w: W, s, measure });
  if (tiles) {
    blocks.push(tiles);
    cursor = tiles.bbox.y + tiles.bbox.h + 6 * s;
  }

  const footerTop = th - 45 * s;
  const contentBottom = footerTop - 8 * s;
  const mockW = 70 * s;
  const colGap = 10 * s;
  const boxX = m + mockW + colGap;
  const boxW = tw - m - boxX;
  const pad = 6 * s;

  // Box CTA (branco sólido): H4, número, H4, QR
  const h4a = textBlock({ id: 'h4a', role: 'h4', text: T.h4a, x: boxX + pad, y: cursor + pad, w: boxW - 2 * pad, sizePt: sz('h4'), weight: TYPE.h4.weight, bg: [COLORS.branco.hex], measure });
  const numPt = sz('number');
  const numBoxH = lineHeightMm(numPt) + 5 * s;
  const numY = h4a.y + h4a.h + 4 * s;
  const numText = textBlock({ id: 'numero', role: 'number', text: formatPhone(input.municipio?.ddd, input.municipio?.numero_whatsapp), x: boxX + pad, y: numY + (numBoxH - lineHeightMm(numPt)) / 2, w: boxW - 2 * pad, sizePt: numPt, weight: TYPE.number.weight, align: 'center', bg: [COLORS.verdeEscuro2.hex], measure });
  const h4b = textBlock({ id: 'h4b', role: 'h4', text: T.h4b, x: boxX + pad, y: numY + numBoxH + 4 * s, w: boxW - 2 * pad, sizePt: sz('h4'), weight: TYPE.h4.weight, bg: [COLORS.branco.hex], measure });
  const qrTop = h4b.y + h4b.h + 4 * s;
  const qrMm = Math.max(QR_MIN_MM, Math.min(60 * s, boxW - 2 * pad - 2 * QR_QUIET_MM, contentBottom - qrTop - pad - QR_QUIET_MM * 2));
  const qrX = boxX + (boxW - qrMm) / 2;
  const boxH = qrTop + QR_QUIET_MM + qrMm + QR_QUIET_MM + pad - cursor;
  const link = whatsappLink(input.municipio?.ddd, input.municipio?.numero_whatsapp);
  blocks.push(
    block('cta', 'Box do WhatsApp (número + QR)', [
      { type: 'rect', x: boxX, y: cursor, w: boxW, h: boxH, fill: 'branco', r: 3 * s },
      h4a,
      { type: 'rect', x: boxX + pad, y: numY, w: boxW - 2 * pad, h: numBoxH, fill: 'verdeEscuro2', r: 2 * s },
      numText,
      h4b,
      { type: 'qr', x: qrX, y: qrTop + QR_QUIET_MM, w: qrMm, h: qrMm, data: link, color: 'preto' },
    ], { opaque: true }),
  );

  // Mockup à esquerda, alinhado ao topo do box (encolhe se faltar altura)
  const mock = mockupBlock({ x: m, y: cursor, w: mockW, s, mockup: input.mockup });
  if (mock.bbox.y + mock.bbox.h > contentBottom) {
    const k = (contentBottom - cursor) / mock.bbox.h;
    const small = mockupBlock({ x: m + (mockW - mockW * k) / 2, y: cursor, w: mockW * k, s: s * k, mockup: input.mockup });
    blocks.push(small);
  } else blocks.push(mock);

  return { blocks, footerTop, logos: { x: m, y: footerTop + 9 * s, w: W, h: 24 * s, gap: 8 * s }, watermarkMax: 70 * s };
}

function adesivo(layout, input, measure) {
  const T = { ...DEFAULT_TEXTS[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const m = 6;
  const blocks = [];
  const h1 = textBlock({ id: 'h1', role: 'h1', text: T.h1, x: m, y: m + 1, w: tw - 2 * m, sizePt: 12, weight: 'black', align: 'center', bg: gradientBg(), measure });
  blocks.push(block('h1', 'Título (H1)', [h1]));
  const qrMm = 26;
  const plate = qrMm + 2 * QR_QUIET_MM;
  blocks.push(qrPlate({ x: (tw - plate) / 2, y: h1.y + h1.h + 4, qrMm, data: whatsappLink(input.municipio?.ddd, input.municipio?.numero_whatsapp) }));
  return { blocks, footerTop: 70, logos: { x: m, y: 74, w: tw - 2 * m, h: 15, gap: 2.5 }, watermarkMax: 34 };
}

function displayA6(layout, input, measure) {
  const T = { ...DEFAULT_TEXTS[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const m = 8;
  const W = tw - 2 * m;
  const blocks = [];
  const h1 = textBlock({ id: 'h1', role: 'h1', text: T.h1, x: m, y: m + 1, w: W, sizePt: 20, weight: 'black', bg: gradientBg(), measure });
  blocks.push(block('h1', 'Título (H1)', [h1]));
  const top = h1.y + h1.h + 8;
  const qrMm = 32;
  const plate = qrMm + 2 * QR_QUIET_MM;
  const qr = qrPlate({ x: tw - m - plate, y: top, qrMm, data: whatsappLink(input.municipio?.ddd, input.municipio?.numero_whatsapp) });
  const colW = W - plate - 6;
  const h3probe = textBlock({ id: 'h3', role: 'h3', text: T.h3, x: m, y: 0, w: colW, sizePt: 13.5, weight: 'bold', bg: gradientBg(), measure });
  const h3 = textBlock({ id: 'h3', role: 'h3', text: T.h3, x: m, y: top + (plate - h3probe.h) / 2, w: colW, sizePt: 13.5, weight: 'bold', bg: gradientBg(), measure });
  blocks.push(block('h3', 'Apoio lateral (H3)', [h3]), qr);
  return { blocks, footerTop: 100, logos: { x: m, y: 106, w: W, h: 22, gap: 6 }, watermarkMax: 44 };
}

// ---------------------------------------------------------------- API

/**
 * @param {string} layoutId
 * @param {object} input  { municipio, includeBB, services:[ids], texts:{}, mockup:{imageId,width,height,focus}, assets:{gove,prefeitura,bb:{width,height}}, overrides:{blockId:{dx,dy}} }
 * @param {(text:string, weight:string, sizePt:number) => number} measure  largura em mm
 */
export function buildLayout(layoutId, input, measure) {
  const layout = getLayout(layoutId);
  if (!layout) throw new Error(`Layout desconhecido: ${layoutId}`);
  const { w: tw, h: th } = layout.trim;
  const pageW = tw + 2 * BLEED_MM;
  const pageH = th + 2 * BLEED_MM;

  let spec;
  if (layoutId === 'flyer-a4') spec = flyer(layout, input, measure, 1);
  else if (layoutId === 'flyer-10x15') spec = flyer(layout, input, measure, tw / 210);
  else if (layoutId === 'adesivo-5x10') spec = adesivo(layout, input, measure);
  else spec = displayA6(layout, input, measure);

  const L = spec.logos;
  const blocks = [
    ...spec.blocks,
    block('rodape', 'Faixa branca dos logos', [{ type: 'rect', x: -BLEED_MM, y: spec.footerTop, w: tw + 2 * BLEED_MM, h: th - spec.footerTop + BLEED_MM, fill: 'branco' }], { movable: false, exempt: true, opaque: true }),
    logosRow({ x: L.x, y: L.y, w: L.w, h: L.h, gap: L.gap, assets: input.assets, includeBB: input.includeBB }),
  ];

  // Trim → página (soma a sangria) e aplica os deslocamentos manuais do editor
  for (const b of blocks) {
    shiftBlock(b, BLEED_MM, BLEED_MM);
    const o = input.overrides?.[b.id];
    if (b.movable && o && (o.dx || o.dy)) shiftBlock(b, Number(o.dx) || 0, Number(o.dy) || 0);
  }

  const footerTopPage = spec.footerTop + BLEED_MM;
  const protectedBoxes = blocks.filter((b) => !b.exempt && !b.opaque).map((b) => b.bbox);
  const wm = watermark({ pageW, footerTop: footerTopPage, protectedBoxes, maxMm: spec.watermarkMax });

  const background = block('fundo', 'Fundo em gradiente', [
    { type: 'gradient', x: 0, y: 0, w: pageW, h: pageH, from: GRADIENT.from, to: GRADIENT.to, angle: GRADIENT.angle },
  ], { movable: false, exempt: true });

  // Ordem de pintura: fundo → marca d'água → conteúdo → rodapé → logos
  const ordered = [background, ...(wm ? [wm] : []), ...blocks];
  const result = {
    layout,
    page: { w: pageW, h: pageH },
    trim: { x: BLEED_MM, y: BLEED_MM, w: tw, h: th },
    safe: { x: BLEED_MM + SAFE_MM, y: BLEED_MM + SAFE_MM, w: tw - 2 * SAFE_MM, h: th - 2 * SAFE_MM },
    blocks: ordered,
  };
  result.checks = checkLayout(result, input);
  return result;
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
  for (const b of content) {
    const bb = b.bbox;
    if (bb.x < s.x - 0.01 || bb.y < s.y - 0.01 || bb.x + bb.w > s.x + s.w + 0.01 || bb.y + bb.h > s.y + s.h + 0.01) {
      add('error', 'seguranca', `${b.label} está fora da área de segurança (5 mm da linha de corte).`, b.id);
    }
  }
  for (let i = 0; i < content.length; i++) {
    for (let j = i + 1; j < content.length; j++) {
      if (intersects(content[i].bbox, content[j].bbox)) {
        add('error', 'sobreposicao', `${content[i].label} e ${content[j].label} estão sobrepostos.`, content[j].id);
      }
    }
  }

  for (const b of r.blocks) {
    for (const e of b.elements) {
      if (e.type === 'text' && e.lines.length && e.contrast < e.minContrast) {
        add('error', 'contraste', `Contraste de ${e.contrast.toFixed(2)}:1 em "${e.lines[0].text}…" — mínimo ${e.minContrast}:1.`, b.id);
      }
      if (e.type === 'text' && e.role === 'label' && e.size < TYPE.body.min && !out.some((c) => c.code === 'rotulos')) {
        add('warn', 'rotulos', `Rótulos dos ícones com ${e.size.toFixed(1)} pt para caber no quadro — abaixo de ${TYPE.body.min} pt; considere menos ícones.`, b.id);
      }
      if (e.type === 'qr' && e.w < QR_MIN_MM - 0.01) add('error', 'qr-min', `QR code com ${e.w.toFixed(1)} mm — mínimo ${QR_MIN_MM} mm.`, b.id);
      if (e.type === 'logo' && e.missing) {
        const label = { gove: 'Logo da Gove', prefeitura: 'Logo da prefeitura', bb: 'Logo do Banco do Brasil' }[e.which];
        add('error', `logo-${e.which}`, `${label} não cadastrado.`, b.id);
      }
      if (e.type === 'logo' && !e.missing && e.dpi < IMAGE_MIN_DPI) {
        add('warn', `logo-dpi-${e.which}`, `Logo (${e.which}) com ${Math.round(e.dpi)} dpi no tamanho de impressão — mínimo ${IMAGE_MIN_DPI}.`, b.id);
      }
      if (e.type === 'mockup-screen') {
        if (!e.imageId) add('warn', 'mockup', 'Imagem do mockup não enviada: a tela do celular sai vazia.', b.id);
        else if (e.dpi != null && e.dpi < IMAGE_MIN_DPI) add('warn', 'mockup-dpi', `Imagem do mockup com ${Math.round(e.dpi)} dpi no tamanho de impressão — mínimo ${IMAGE_MIN_DPI}.`, b.id);
      }
    }
  }
  if ((input.services?.length ?? 0) > MAX_SERVICES_RECOMMENDED && r.layout.id.startsWith('flyer')) {
    add('warn', 'servicos', `${input.services.length} ícones de serviço — o recomendado é até ${MAX_SERVICES_RECOMMENDED} por peça.`);
  }
  return out.map((c) => ({ ...c, layout: name }));
}
