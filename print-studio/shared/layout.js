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
// celular inclinado com a captura de tela enviada.
import { LOGOS, LOGO_MIN_CONTRAST, kindForBox, pickLogo } from '../../brand/logos.js';
import { BB_LOGO_RULES, BB_NAMES, BB_PALETTE, BB_PRETO, BB_SCHEMES, BB_TEXT_ON, MIN_TEXT, contrast as bbContrast, graphicColors, norm as bbNorm, textOn, textOnSamples } from '../../brand/bb.js';
import { SERVICE_ICONS, UI_ICONS, WHATSAPP_GLYPH, WHATSAPP_OUTLINE } from './icons.js';
import {
  BACKGROUND,
  PORTAL_BACKGROUND,
  BB_ASCENT_EM,
  BB_COLOR_KEY,
  BB_FONT_OF,
  BB_LINE_HEIGHT_EM,
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

/**
 * Identidade Banco do Brasil: textos padrão no tom de voz BB (BB_VOICE) —
 * frases curtas, imperativas, humanas e encorajadoras.
 */
const BB_FLYER_TEXTS = {
  h1: '**Fale com a Prefeitura**\npelo **WhatsApp**',
  h4a: 'Aponte a câmera para o\n**QR code** ou **salve o número**',
  h4b: 'Mande um “Oi”\ne **escolha o serviço!**',
};
export const BB_DEFAULT_TEXTS = {
  'flyer-a4': { ...BB_FLYER_TEXTS },
  'flyer-10x15': { ...BB_FLYER_TEXTS },
  'adesivo-5x10': { h1: '**Fale com a**\n**prefeitura**\nno WhatsApp' },
  'display-a6': {
    h1: 'Fale com a\nPrefeitura',
    h1b: 'pelo\nWhatsApp',
    h3: 'Aponte a\ncâmera para o\n**QR code**\ne comece\nagora',
  },
};

/**
 * Modelo Portal Cidadão: mesma diagramação e mesmos campos de texto do kit WhatsApp,
 * com a pauta do Portal Cidadão (textos revisados das referências). O QR e a faixa
 * levam ao site do domicílio eletrônico do município, em vez do WhatsApp (wa.me).
 */
const PORTAL_FLYER_TEXTS = {
  h1: '**Comunicado aos**\nEmpresários, Contadores\n**e Contribuintes:**',
  h2: 'Modernize a gestão tributária\ndo seu negócio! **Já ativou o seu DTE?**',
  h4a: 'Acesse e **regularize sua empresa**\npelo **link oficial:**',
};
export const PORTAL_DEFAULT_TEXTS = {
  'flyer-a4': { ...PORTAL_FLYER_TEXTS },
  'flyer-10x15': { ...PORTAL_FLYER_TEXTS },
  'adesivo-5x10': { h1: '**Sua prefeitura**\nmais digital\n**na palma**\nda sua mão' },
  'display-a6': {
    h1: 'Os serviços\nda Prefeitura',
    h1b: 'na palma da\nsua mão',
    h3: 'Escaneie o\n**QR CODE**\ne acesse\ntudo pelo\n**Portal**\n**Cidadão**',
  },
};

/** Modelos (pauta) das peças: a identidade visual (GOVE ou BB) vale para os dois. */
export const MODELS = [
  { id: 'whatsapp', label: 'WhatsApp', hint: 'QR e faixa com o número do WhatsApp (wa.me)' },
  { id: 'portal', label: 'Portal Cidadão', hint: 'QR e faixa com o site do domicílio eletrônico' },
];
export const isPortalInput = (input) => input?.model === 'portal';

/** Identidades visuais das peças. GOVE é o padrão. */
export const IDENTITIES = [
  { id: 'gove', label: 'GOVE' },
  { id: 'bb', label: 'Banco do Brasil' },
];
export { BB_SCHEMES };
export const isBBInput = (input) => input?.identity === 'bb';
/** Textos padrão do modelo e da identidade (o Portal Cidadão usa o texto revisado nas duas). */
export const defaultTextsFor = (identity, model = 'whatsapp') => (model === 'portal' ? PORTAL_DEFAULT_TEXTS : identity === 'bb' ? BB_DEFAULT_TEXTS : DEFAULT_TEXTS);

export const TEXT_LABELS = {
  h1: 'Título principal (H1)',
  h1b: 'Título — continuação em branco (H1)',
  h2: 'Subtítulo abaixo dos ícones (H2)',
  h3: 'Apoio ao lado do QR (H3)',
  h4a: 'Instrução do QR (H4)',
  h4b: 'Chamada após a faixa do número/site (H4)',
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

/**
 * Site do domicílio eletrônico (cadastro do município, opcional): aceita com ou sem
 * "https://". Devolve a URL completa, '' se vazio, ou null se inválido.
 */
export function normalizeSite(raw) {
  let v = String(raw ?? '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname) || /\s/.test(v)) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Endereço como aparece impresso na faixa: sem "https://" e sem a barra final. */
export const siteLabel = (url) => String(url ?? '').replace(/^https?:\/\//i, '').replace(/\/$/, '');

/** Destino do QR da peça: WhatsApp (wa.me) ou o site do domicílio eletrônico. */
function qrTarget(input) {
  if (!isPortalInput(input)) return whatsappLink(input.municipio?.ddd, input.municipio?.numero_whatsapp);
  return normalizeSite(input.municipio?.url_domicilio) || 'https://www.';
}

export function slugify(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Nome do arquivo: [portal-cidadao_]{slug-layout}_{slug-municipio}_{ddmmaaaa}.pdf */
export function pdfFileName(layoutId, municipio, date = new Date(), model = 'whatsapp') {
  const d = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
  const mun = slugify([municipio.nome_municipio, municipio.uf].filter(Boolean).join(' '));
  return `${model === 'portal' ? 'portal-cidadao_' : ''}${getLayout(layoutId).slug}_${mun}_${d}.pdf`;
}

/** Validação simples de e-mail (cadastro do município). */
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s ?? '').trim());

const ASCENT_EM = 0.968; // hhea.ascender da Montserrat
const DESCENT_EM = LINE_HEIGHT_EM - ASCENT_EM;
const BOLD_OF = { regular: 'bold', semibold: 'bold', bold: 'black', black: 'black' };
const RANK = { regular: 0, semibold: 1, bold: 2, black: 3 };
const mmToPtSize = (mm) => mm / ptToMm(1);

// ------------------------------------------------------------- identidade BB

const bbKey = (hex) => {
  const k = BB_COLOR_KEY[bbNorm(hex)];
  if (!k) throw new Error(`Cor fora da paleta BB: ${hex}`);
  return k;
};

/**
 * Tema da identidade Banco do Brasil: cada papel de cor da peça vira uma chave
 * de COLORS da paleta BB, escolhida pelos pares aprovados (BB_TEXT_ON) para o
 * fundo onde é aplicada. Fundos sólidos (sem degradê nem transparência: toda
 * cor impressa é uma cor da paleta, com o CMYK oficial).
 */
export function bbTheme(schemeId) {
  const s = BB_SCHEMES.find((x) => x.id === schemeId) ?? BB_SCHEMES[0];
  const P = BB_PALETTE;
  const on = (bg, pref) => bbKey(textOn(bg, pref));
  // formas e ícones: ≥ 3:1 com o fundo (prefere a cor do título)
  const graphic = (bg, pref) => bbKey(pref && bbContrast(pref, bg) >= 3 ? pref : graphicColors(bg)[0]);
  const panel = P.branco;
  const bar = bbContrast(s.button, panel) >= 3 ? s.button : P.azulEscuro;
  const header = P.azulInstitucional;
  return {
    bb: true,
    scheme: s,
    bg: bbKey(s.bg),
    bgHex: s.bg,
    title: on(s.bg, s.title),
    text: on(s.bg, s.text),
    accent: on(s.bg, s.accent),
    icon: graphic(s.bg, s.title),
    // painel e faixa dos logos: Branco (fundo permitido para a logomarca BB central/horizontal)
    panel: bbKey(panel),
    panelHex: panel,
    panelText: on(panel, s.text),
    bar: bbKey(bar),
    barHex: bar,
    barText: on(bar, bar === s.button ? s.buttonText : P.amareloInstitucional),
    qrPlate: bbKey(P.branco),
    qr: on(P.branco, P.azulEscuro), // módulos Azul escuro sobre Branco (8,9:1)
    footer: bbKey(P.branco),
    footerHex: P.branco,
    phone: { frame: bbKey(P.azulInstitucional), bezel: bbKey(P.azulEscuro), empty: bbKey(P.amareloClaro) },
    screen: {
      bg: bbKey(P.branco),
      bgHex: P.branco,
      header: bbKey(header),
      headerHex: header,
      headerText: on(header, P.branco),
      chip: bbKey(P.branco),
      title: on(P.branco, P.azulEscuro),
      body: on(P.branco, P.roxoEscuro),
      circle: bbKey(P.azulInstitucional),
      circleIcon: on(P.azulInstitucional, P.branco),
      card: bbKey(P.azulEscuro),
      cardHex: P.azulEscuro,
      cardText: on(P.azulEscuro, P.branco),
      line: bbKey(P.roxoClaro),
      link: on(P.branco, P.azulInstitucional),
      button: bbKey(P.azulEscuro),
      buttonHex: P.azulEscuro,
      buttonText: on(P.azulEscuro, P.amareloInstitucional),
    },
  };
}

/** Tema da peça: null = GOVE (desenho original, sem nenhuma mudança). */
const themeOf = (input) => (isBBInput(input) ? bbTheme(input.bbScheme) : null);

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
  const { id, role, text, x, y, w, align = 'left', measure } = o;
  const bb = !!o.th?.bb;
  // Identidade BB: títulos em "BancoDoBrasil Titulos", demais em "BancoDoBrasil Textos"
  const fam = bb ? BB_FONT_OF[o.family ?? 'text'] : null;
  const weight = bb ? fam[o.weight ?? 'regular'] : o.weight ?? 'regular';
  const boldW = bb ? fam[o.boldWeight ?? BOLD_OF[o.weight ?? 'regular']] : o.boldWeight ?? BOLD_OF[weight];
  const ascEm = bb ? BB_ASCENT_EM : ASCENT_EM;
  const lineEm = bb ? BB_LINE_HEIGHT_EM : LINE_HEIGHT_EM;
  const leading = o.leading ?? lineEm;
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
    return { text: runs.map((r) => r.text).join(' '), x: lx, baseline: y + i * lh + sizeMm * ascEm, width: lw, runs };
  });
  const h = lines.length ? (lines.length - 1) * lh + sizeMm * lineEm : 0;
  // texto "grande" só se todos os trechos forem negrito (regra WCAG adotada no projeto)
  const lightest = bb ? weight : [...weights].sort((a, b) => RANK[a] - RANK[b])[0] ?? weight;
  const el = {
    type: 'text',
    id,
    role,
    weight,
    size,
    color: o.color ?? 'branco',
    // BB: 4,5:1 para todo texto, sem exceção para texto grande
    minContrast: bb ? MIN_TEXT : minContrastFor(size, lightest),
    lines,
    x,
    y,
    w,
    h,
  };
  if (o.illustrative) el.illustrative = true;
  if (bb) el.metrics = { asc: ascEm, line: lineEm };
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

/** Interseção de dois retângulos (null se não se tocam). */
function clipBox(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

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
  const asc = e.metrics?.asc ?? ASCENT_EM;
  const line = e.metrics?.line ?? LINE_HEIGHT_EM;
  return e.lines.map((l) => ({ x: l.x, y: l.baseline - s * asc, w: l.width, h: s * line }));
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

// ------------------------------------------------- logos na identidade BB

/** Versão da logomarca BB enviada, pela proporção do arquivo (símbolo, central ou horizontal). */
export function bbLogoKind(asset) {
  const a = asset?.width && asset?.height ? asset.width / asset.height : 1.5;
  return a < 1.25 ? 'simbolo' : a < 2.4 ? 'central' : 'horizontal';
}

/**
 * Tamanho da logomarca BB: nunca abaixo do mínimo de impressão da versão
 * (10 mm símbolo, 25 mm central, 40 mm horizontal — largura), limitado a `maxW`.
 * Área de proteção: metade da altura da logomarca em todos os lados.
 */
function bbLogoSize(asset, prefH, maxW) {
  const kind = bbLogoKind(asset);
  const aspect = asset?.width && asset?.height ? asset.width / asset.height : 1.5;
  const minW = BB_LOGO_RULES.minPrintMm[kind];
  const w = Math.min(maxW, Math.max(minW, prefH * aspect));
  const h = w / aspect;
  // +0,2 mm de folga sobre a área de proteção (arredondamentos)
  return { kind, aspect, minW, w, h, clear: h * BB_LOGO_RULES.clearSpace, sep: h * BB_LOGO_RULES.clearSpace + 0.2 };
}

function bbLogoElement(asset, slot, bgHex, size) {
  const el = logoElement('bb', asset, slot, bgHex, 'right');
  return { ...el, bbKind: size.kind, minW: size.minW, clear: size.clear };
}

/**
 * Logos em linha na identidade BB (adesivo e display), ancorados embaixo em `bottom`:
 * parceiros (prefeitura, Gove) e a logomarca BB à direita — ou abaixo, centralizada,
 * quando a largura não comporta a BB no tamanho mínimo com a área de proteção.
 */
function logosRowBB({ x, bottom, w, ph, gap, assets, rel, bgHex }) {
  const size = bbLogoSize(assets?.bb, ph * rel.bb, w);
  const partners = ['prefeitura', 'gove'];
  let hs = partners.map((k) => ph * rel[k]);
  let ws = partners.map((k, i) => naturalWidth(k, assets?.[k], hs[i]));
  const partnersW = () => ws.reduce((a, b) => a + b, 0) + gap;
  const inline = partnersW() + Math.max(gap, size.sep) + size.w <= w;
  const els = [];
  let top;
  if (inline) {
    const H = Math.max(ph, size.h);
    top = bottom - H;
    let cx = x + (w - (partnersW() + Math.max(gap, size.sep) + size.w)) / 2;
    partners.forEach((k, i) => {
      els.push(logoElement(k, assets?.[k], { x: cx, y: top + (H - hs[i]) / 2, w: ws[i], h: hs[i] }, bgHex));
      cx += ws[i] + gap;
    });
    cx += Math.max(gap, size.sep) - gap;
    els.push(bbLogoElement(assets?.bb, { x: cx, y: top + (H - size.h) / 2, w: size.w, h: size.h }, bgHex, size));
  } else {
    if (partnersW() > w) {
      const k = (w - gap) / (partnersW() - gap);
      ws = ws.map((v) => v * k);
      hs = hs.map((v) => v * k);
    }
    const rowH = Math.max(...hs);
    const H = rowH + Math.max(gap, size.sep) + size.h;
    top = bottom - H;
    let cx = x + (w - partnersW()) / 2;
    partners.forEach((k, i) => {
      els.push(logoElement(k, assets?.[k], { x: cx, y: top + (rowH - hs[i]) / 2, w: ws[i], h: hs[i] }, bgHex));
      cx += ws[i] + gap;
    });
    els.push(bbLogoElement(assets?.bb, { x: x + (w - size.w) / 2, y: bottom - size.h, w: size.w, h: size.h }, bgHex, size));
  }
  return block('logos', 'Logos', els, { bbox: { x, y: top, w, h: bottom - top } });
}

/**
 * Parceiros nos flyers BB: empilhados (prefeitura sobre Gove) quando a coluna é
 * larga; numa linha só quando é estreita (10x15), para sobrar altura para a BB.
 */
function partnersBB({ assets, heights, gap, w }) {
  if (w >= 40) return { stacked: true, h: heights.prefeitura + gap + heights.gove };
  const rh = heights.gove;
  const hs = [rh, rh * 0.8];
  const ws = [naturalWidth('prefeitura', assets?.prefeitura, hs[0]), naturalWidth('gove', assets?.gove, hs[1])];
  const k = Math.min(1, (w - gap) / (ws[0] + ws[1]));
  return { stacked: false, h: rh * k, hs: hs.map((v) => v * k), ws: ws.map((v) => v * k) };
}

/** Logos à direita nos flyers BB: parceiros e, abaixo (fora da área de proteção), a logomarca BB. */
function logosColumnBB({ x, y, w, h, gap, assets, heights, bgHex, maxW }) {
  const size = bbLogoSize(assets?.bb, heights.bb, Math.max(w, maxW));
  const sep = Math.max(gap, size.sep);
  const pt = partnersBB({ assets, heights, gap, w });
  const els = [];
  let py = y;
  if (pt.stacked) {
    let hp = heights.prefeitura;
    let hg = heights.gove;
    const room = h - size.h - sep - gap;
    if (hp + hg > room) {
      const k = Math.max(0.35, room / (hp + hg));
      hp *= k;
      hg *= k;
    }
    els.push(logoElement('prefeitura', assets?.prefeitura, { x, y, w, h: hp }, bgHex, 'right'));
    els.push(logoElement('gove', assets?.gove, { x, y: y + hp + gap, w, h: hg }, bgHex, 'right'));
    py = y + hp + gap + hg;
  } else {
    let cx = x + w - (pt.ws[0] + gap + pt.ws[1]);
    ['prefeitura', 'gove'].forEach((k, i) => {
      els.push(logoElement(k, assets?.[k], { x: cx, y: y + (pt.h - pt.hs[i]) / 2, w: pt.ws[i], h: pt.hs[i] }, bgHex));
      cx += pt.ws[i] + gap;
    });
    py = y + pt.h;
  }
  const by = py + sep;
  els.push(bbLogoElement(assets?.bb, { x: x + w - size.w, y: by, w: size.w, h: size.h }, bgHex, size));
  const left = Math.min(x, x + w - size.w);
  return block('logos', 'Logos', els, { bbox: { x: left, y, w: x + w - left, h: by + size.h - y } });
}

/** Altura total da coluna de logos BB (para reservar espaço abaixo do QR). */
function logosColumnBBNeed({ assets, heights, gap, w, maxW }) {
  const size = bbLogoSize(assets?.bb, heights.bb, Math.max(w, maxW));
  return partnersBB({ assets, heights, gap, w }).h + Math.max(gap, size.sep) + size.h;
}

// ------------------------------------------------------------- blocos

function serviceCircles({ services, right, left, y, d, gap, s, color = 'branco' }) {
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
    els.push({ type: 'circle', x: cx, y, w: D, h: D, stroke: color, lineWidth: 0.55 * s });
    const ic = D * 0.56;
    els.push({ type: 'icon', paths: svc.paths, x: cx + (D - ic) / 2, y: y + (D - ic) / 2, w: ic, h: ic, fill: color, opacity: 1 });
  });
  return block('servicos', 'Ícones de serviços', els);
}

function qrPlate({ x, y, qrMm, data, id = 'qr', label = 'QR code', r = 0, th = null }) {
  const plate = qrMm + 2 * QR_QUIET_MM;
  return block(id, label, [
    { type: 'rect', x, y, w: plate, h: plate, fill: 'branco', r }, // QR sempre sobre branco #FFFFFF
    { type: 'qr', x: x + QR_QUIET_MM, y: y + QR_QUIET_MM, w: qrMm, h: qrMm, data, color: 'qrPreto' },
  ], { opaque: true });
}

/**
 * Celular (moldura realista) com a captura enviada, inclinado.
 * (ox, oy) = canto superior esquerdo do aparelho antes da rotação; W = largura.
 */
function phoneMockup({ ox, oy, W, angle, input, measure, minBottom = 0, th = null }) {
  const aro = th ? th.phone.frame : 'cinzaAro';
  const corpo = th ? th.phone.bezel : 'pretoRico';
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
  const children = [
    // botões laterais (contorno sutil, sem sombra — CMYK sólido)
    { type: 'rect', x: -W * 0.012, y: H * 0.2, w: W * 0.02, h: H * 0.06, fill: aro, r: W * 0.006 },
    { type: 'rect', x: -W * 0.012, y: H * 0.28, w: W * 0.02, h: H * 0.06, fill: aro, r: W * 0.006 },
    { type: 'rect', x: W - W * 0.008, y: H * 0.24, w: W * 0.02, h: H * 0.09, fill: aro, r: W * 0.006 },
    { type: 'rect', x: 0, y: 0, w: W, h: H, fill: aro, r: rOuter },
    { type: 'rect', x: rim, y: rim, w: W - 2 * rim, h: H - 2 * rim, fill: corpo, r: rOuter - rim },
  ];
  {
    // Tela do celular: sempre a captura enviada (sem imagem, sai vazia e a verificação avisa)
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
      fill: th ? th.phone.empty : 'cinzaTela',
    });
  }
  // ilha dinâmica
  children.push({ type: 'rect', x: (W - sw * 0.3) / 2, y: bezel + sw * 0.03, w: sw * 0.3, h: sw * 0.085, fill: corpo, r: sw * 0.0425 });

  const a = (angle * Math.PI) / 180;
  const rot = ([x, y]) => [ox + x * Math.cos(a) - y * Math.sin(a), oy + x * Math.sin(a) + y * Math.cos(a)];
  const shape = [[0, 0], [W, 0], [W, H], [0, H]].map(rot);
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const bbox = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  const group = { type: 'group', x: ox, y: oy, rotate: angle, children, w: W, h: H, mockupMode: 'upload' };
  return block('mockup', 'Mockup do celular', [group], { opaque: true, bleedOk: true, shape, bbox });
}

// --------------------------------------------------------------- layouts

/** Flyers A4 e 10x15: medidas do A4 de referência × s (geometria) e × ts (tipos). */
function flyer(layout, input, measure, s, ts, nts, theme = null) {
  const portal = isPortalInput(input);
  const T = { ...defaultTextsFor(theme ? 'bb' : 'gove', input.model)[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const th = layout.trim.h;
  const minX = SAFE_MM + 0.5;
  const R1 = Math.min(tw - 14.6 * s, tw - minX); // título e ícones
  const R2 = Math.min(tw - 11.6 * s, tw - minX); // conteúdo do painel
  const blocks = [];

  const onBg = theme ? { color: theme.title, bg: [theme.bgHex], th: theme, family: 'title' } : { color: 'branco', onGradient: true };
  const h1 = textBlock({ id: 'h1', role: 'h1', text: T.h1, x: minX, y: Math.max(minX, 12.2 * s), w: R1 - minX, sizePt: 44 * ts, weight: 'regular', boldWeight: 'bold', align: 'right', leading: TITLE_LEADING_EM, ...onBg, fit: 44 * ts * 0.6, measure });
  blocks.push(block('h1', 'Título (H1)', [h1]));
  let cursor = textBottom(h1);

  const circles = serviceCircles({ services: input.services ?? [], right: R1, left: minX, y: cursor + 4.9 * s, d: 15.2 * s, gap: 10.1 * s, s, ...(theme ? { color: theme.icon } : {}) });
  if (circles) {
    blocks.push(circles);
    cursor = circles.bbox.y + circles.bbox.h;
  }

  // Subtítulo (H2) abaixo dos ícones — no Portal Cidadão; vazio, não entra
  if (T.h2?.trim()) {
    const h2 = textBlock({ id: 'h2', role: 'h2', text: T.h2, x: minX, y: cursor + 5.2 * s, w: R1 - minX, sizePt: 27 * ts, weight: 'regular', boldWeight: 'bold', align: 'right', leading: TITLE_LEADING_EM, ...onBg, fit: TYPE.h3.min, measure });
    blocks.push(block('h2', 'Subtítulo (H2)', [h2]));
    cursor = textBottom(h2);
  }

  // Painel branco: canto superior esquerdo arredondado, vai até a sangria (direita e base)
  const panelX = 26.2 * s;
  const panelTop = Math.max(91.9 * s, cursor + 8.5 * s);
  const panel = block('painel', 'Painel branco', [
    { type: 'rect', x: panelX, y: panelTop, w: tw + BLEED_MM - panelX, h: th + BLEED_MM - panelTop, fill: theme ? theme.panel : 'branco', radii: [26 * s, 0, 0, 0] },
  ], { movable: false, exempt: true, opaque: true });

  const onPanel = theme ? { color: theme.panelText, bg: [theme.panelHex], th: theme } : { color: 'preto', bg: [COLORS.branco.hex] };
  const h4a = textBlock({ id: 'h4a', role: 'h4', text: T.h4a, x: panelX + 10 * s, y: panelTop + 5.1 * s, w: R2 - panelX - 10 * s, sizePt: 24.8 * ts, weight: 'regular', align: 'right', leading: 0.96, ...onPanel, fit: TYPE.h4.min, measure });

  // Faixa com o número (WhatsApp, verde) ou com o site (Portal Cidadão, índigo):
  // arredondada à esquerda, vai até a sangria
  const barY = textBottom(h4a) + 4 * s;
  const lineEm = theme ? BB_LINE_HEIGHT_EM : LINE_HEIGHT_EM;
  const barWeight = theme ? BB_FONT_OF.title.bold : 'bold';
  const barLabel = portal ? siteLabel(normalizeSite(input.municipio?.url_domicilio)) || 'www.' : formatPhone(input.municipio?.ddd, input.municipio?.numero_whatsapp);
  let numPt = 39 * nts;
  if (portal) {
    // Endereços longos: o corpo diminui até caber entre o painel e a margem (piso legível)
    const maxW = R2 - (panelX + 8 * s) - 21.6 * s * 0.7;
    const w0 = measure(barLabel, barWeight, numPt);
    if (w0 > maxW) numPt = Math.max(TYPE.h4.min * nts * 1.6, (numPt * maxW) / w0);
  }
  const barH = Math.max(21.6 * s, ptToMm(39 * nts) * lineEm + 4 * s);
  const numW = measure(barLabel, barWeight, numPt);
  const barX = Math.max(panelX + 4 * s, Math.min(82 * s, R2 - numW - barH * 0.7));
  const barFill = theme ? theme.bar : portal ? 'portalFaixa' : 'folhaFaixa';
  const onBar = theme ? { color: theme.barText, bg: [theme.barHex], th: theme, family: 'title' } : { color: 'branco', bg: [COLORS[barFill].hex] };
  const num = textBlock({ id: 'numero', role: 'number', text: barLabel, x: barX, y: barY + (barH - ptToMm(numPt) * lineEm) / 2, w: R2 - barX, sizePt: numPt, weight: 'bold', align: 'right', ...onBar, measure });
  const numero = block('numero', portal ? 'Faixa do site' : 'Faixa do número', [
    { type: 'rect', x: barX, y: barY, w: tw + BLEED_MM - barX, h: barH, fill: barFill, radii: [barH / 2, 0, 0, barH / 2] },
    num,
  ], { movable: false, opaque: true, bleedOk: true });

  // QR e logos à direita, até o limite inferior
  const bottom = th - 16.8 * s;
  const logoH = { prefeitura: 24 * s, gove: 14 * s, bb: 14 * s };
  // BB: a logomarca BB entra sempre, abaixo dos parceiros, no tamanho mínimo de impressão
  const bbCol = theme ? { assets: input.assets, heights: logoH, gap: 4 * s, w: 58 * s, maxW: Math.min(R2 - minX, 42) } : null;
  const logosNeed = theme ? logosColumnBBNeed(bbCol) : logoH.prefeitura + logoH.gove + (input.includeBB ? logoH.bb + 4 * s : 0) + 4 * s;

  const h4bOpts = { id: 'h4b', role: 'h4', text: T.h4b, x: R2 - 88 * s, y: barY + barH + 6.2 * s, w: 88 * s, sizePt: 24.8 * ts, weight: 'regular', align: 'right', leading: 0.96, ...onPanel, fit: TYPE.h4.min, measure };
  // A chamada após a faixa é opcional (o Portal Cidadão não usa): sem ela, o QR sobe
  let h4b = T.h4b?.trim() ? textBlock(h4bOpts) : null;
  // Sem altura para o QR mínimo + logos (ex.: chamada de 3 linhas no 10x15 BB): o H4b diminui (piso legível)
  const spare = h4b ? th - SAFE_MM - 0.5 - (textBottom(h4b) + 4.2 * s + QR_MIN_MM + 2 * QR_QUIET_MM + 3.6 * s + logosNeed) : 0;
  if (h4b && spare < 0 && h4b.h > 0) {
    const size = Math.max(TYPE.h4.min, (h4b.size * (h4b.h + spare)) / h4b.h);
    h4b = textBlock({ ...h4bOpts, sizePt: size, fit: Math.min(size, TYPE.h4.min) });
  }
  const qrTop = h4b ? textBottom(h4b) + 4.2 * s : barY + barH + 6.2 * s;
  const qrMm = Math.max(QR_MIN_MM, Math.min(47.4 * s, bottom - qrTop - 2 * QR_QUIET_MM - 3.6 * s - logosNeed));
  const plate = qrMm + 2 * QR_QUIET_MM;
  const qr = qrPlate({ x: R2 - plate, y: qrTop, qrMm, data: qrTarget(input), th: theme });
  const logosTop = qrTop + plate + 3.6 * s;
  const logos = theme
    ? logosColumnBB({ ...bbCol, x: R2 - 58 * s, y: logosTop, h: Math.max(10, bottom - logosTop), bgHex: theme.panelHex })
    : logosColumn({ x: R2 - 58 * s, y: logosTop, w: 58 * s, h: Math.max(10, bottom - logosTop), gap: 4 * s, assets: input.assets, includeBB: input.includeBB, heights: logoH });

  // Celular inclinado à esquerda, encostado na faixa do número
  const W = 82 * s;
  const angle = -14;
  const a = (angle * Math.PI) / 180;
  const tr = [86.3 * s, barY + barH + 1.5 * s];
  const ox = tr[0] - W * Math.cos(a);
  const oy = tr[1] - W * Math.sin(a);
  const mock = phoneMockup({ ox, oy, W, angle, input, measure, minBottom: th + BLEED_MM + 3, th: theme });
  if (theme) {
    // BB: o celular (decorativo) recua para a esquerda até sair da área de proteção da logomarca BB
    const bbEl = logos.elements.find((e) => e.which === 'bb');
    const c = bbEl.clear;
    const zone = clipBox({ x: bbEl.x - c, y: bbEl.y - c, w: bbEl.w + 2 * c, h: bbEl.h + 2 * c }, { x: 0, y: 0, w: tw, h: th });
    for (let i = 0; i < 40 && zone && polysIntersect(mock.shape, rectPoly(zone)); i++) shiftBlock(mock, -0.25, 0);
  }

  blocks.push(panel, block('h4a', portal ? 'Chamada do link (H4)' : 'Instrução do QR (H4)', [h4a]), numero);
  if (h4b) blocks.push(block('h4b', portal ? 'Chamada após o site (H4)' : 'Chamada após o número (H4)', [h4b]));
  blocks.push(qr, mock, logos);
  // Marca d'água do WhatsApp só no modelo WhatsApp
  return { blocks, watermark: portal ? null : { max: 100 * s, min: 40 * s, top: minX, bottom: panelTop + 10 * s }, panelTop };
}

function adesivo(layout, input, measure, theme = null) {
  const T = { ...defaultTextsFor(theme ? 'bb' : 'gove', input.model)[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const th = layout.trim.h;
  const m = SAFE_MM + 0.5;
  const blocks = [];
  const onBg = theme ? { color: theme.title, bg: [theme.bgHex], th: theme, family: 'title' } : { color: 'branco', onGradient: true };
  const h1 = textBlock({ id: 'h1', role: 'h1', text: T.h1, x: m, y: 5.9, w: tw - 2 * m, sizePt: 17.5, weight: 'regular', boldWeight: 'bold', align: 'center', leading: TITLE_LEADING_EM, ...onBg, fit: 11, measure });
  blocks.push(block('h1', 'Título (H1)', [h1]));
  if (theme) {
    // BB: logos ancorados embaixo (logomarca BB no mínimo de impressão + área de proteção);
    // a faixa branca sobe o quanto for preciso e o QR ocupa o espaço que sobra (mín. 20 mm).
    const logos = logosRowBB({ x: m, bottom: th - m, w: tw - 2 * m, ph: 9, gap: 3, assets: input.assets, rel: { prefeitura: 1, gove: 0.62, bb: 1 }, bgHex: theme.footerHex });
    const footerTop = Math.min(76.4, logos.bbox.y - 3);
    const qrY = Math.max(textBottom(h1) + 4, Math.min(31.2, footerTop - 3 - 35));
    const plate = Math.min(35, Math.max(QR_MIN_MM + 2 * QR_QUIET_MM, footerTop - 3 - qrY));
    blocks.push(qrPlate({ x: (tw - plate) / 2, y: qrY, qrMm: plate - 2 * QR_QUIET_MM, data: qrTarget(input), th: theme }));
    blocks.push(block('rodape', 'Faixa branca dos logos', [{ type: 'rect', x: -BLEED_MM, y: footerTop, w: tw + 2 * BLEED_MM, h: th - footerTop + BLEED_MM, fill: theme.footer }], { movable: false, exempt: true, opaque: true }));
    blocks.push(logos);
    return { blocks, watermark: null };
  }
  const plate = 35;
  const qrMm = plate - 2 * QR_QUIET_MM;
  blocks.push(qrPlate({ x: (tw - plate) / 2, y: Math.max(31.2, textBottom(h1) + 4), qrMm, data: qrTarget(input) }));
  const footerTop = 76.4;
  blocks.push(block('rodape', 'Faixa branca dos logos', [{ type: 'rect', x: -BLEED_MM, y: footerTop, w: tw + 2 * BLEED_MM, h: th - footerTop + BLEED_MM, fill: 'branco' }], { movable: false, exempt: true, opaque: true }));
  blocks.push(logosRow({ x: m, y: 80, w: tw - 2 * m, h: 14.6, gap: 3.8, assets: input.assets, includeBB: input.includeBB, rel: { prefeitura: 1, gove: 0.56, bb: 0.6 } }));
  return { blocks, watermark: null };
}

function displayA6(layout, input, measure, theme = null) {
  const portal = isPortalInput(input);
  const T = { ...defaultTextsFor(theme ? 'bb' : 'gove', input.model)[layout.id], ...input.texts };
  const tw = layout.trim.w;
  const th = layout.trim.h;
  const m = SAFE_MM + 0.5;
  const blocks = [];

  // Ícone grande do WhatsApp (decorativo, sai pela sangria à esquerda) — só no modelo WhatsApp
  if (!portal) {
    blocks.push(block('icone-whatsapp', 'Ícone do WhatsApp', [
      { type: 'glyph', ...WHATSAPP_GLYPH, x: -10.5, y: 10.5, w: 43, h: 43, fill: theme ? theme.icon : 'branco' },
    ], { movable: false, exempt: true }));
  }

  // Portal Cidadão: título centralizado na largura toda (sem o ícone), negrito + regular em branco
  const hx = portal ? m : 37.8;
  const hw = portal ? tw - 2 * m : tw - m - hx;
  // BB: título em duas cores aprovadas para o fundo (título + destaque)
  const c1 = theme ? { color: theme.title, bg: [theme.bgHex], th: theme, family: 'title' } : { color: portal ? 'branco' : 'preto' };
  const c2 = theme ? { color: theme.accent, bg: [theme.bgHex], th: theme, family: 'title' } : { color: 'branco' };
  const opts = { x: hx, w: hw, sizePt: 26.3, weight: 'bold', leading: 1.0, ...(portal ? { align: 'center' } : {}), ...(theme ? {} : { onGradient: true }), fit: 14, measure };
  const w2 = portal ? { weight: 'regular', boldWeight: 'bold' } : {};
  const probe1 = textBlock({ ...opts, id: 'h1', role: 'h1', text: T.h1, y: 10.9, ...c1 });
  const probe2 = textBlock({ ...opts, ...w2, id: 'h1b', role: 'h1', text: T.h1b, y: 0, ...c2 });
  const size = Math.min(probe1.size, probe2.size);
  const h1 = textBlock({ ...opts, sizePt: size, fit: 0, id: 'h1', role: 'h1', text: T.h1, y: 10.9, ...c1 });
  const h1b = textBlock({ ...opts, ...w2, sizePt: size, fit: 0, id: 'h1b', role: 'h1', text: T.h1b, y: 10.9 + h1.lines.length * ptToMm(size) * 1.0, ...c2 });
  blocks.push(block('h1', 'Título (H1)', [h1, h1b]));

  // BB: logos ancorados embaixo; a faixa branca sobe se a logomarca BB pedir mais espaço
  const logosBB = theme
    ? logosRowBB({ x: 14, bottom: th - m, w: tw - 28, ph: 13.1, gap: 10, assets: input.assets, rel: { prefeitura: 1, gove: 0.68, bb: 0.75 }, bgHex: theme.footerHex })
    : null;
  const footerTop = theme ? Math.min(127.35, logosBB.bbox.y - 2.55) : 127.35;
  const plate = theme ? Math.min(38.5, Math.max(QR_MIN_MM + 2 * QR_QUIET_MM, footerTop - 3 - Math.max(65.1, textBottom(h1b) + 6))) : 38.5;
  const qrMm = plate - 2 * QR_QUIET_MM;
  const qrY = Math.max(65.1, textBottom(h1b) + 6);
  const qr = qrPlate({ x: theme ? 53.1 + (38.5 - plate) / 2 : 53.1, y: qrY, qrMm, data: qrTarget(input), th: theme });
  const c3 = theme ? { color: theme.text, bg: [theme.bgHex], th: theme } : { color: 'branco', onGradient: true };
  const probe = textBlock({ id: 'h3', role: 'h3', text: T.h3, x: m, y: 0, w: 47.4 - m, sizePt: 17.1, weight: 'regular', boldWeight: 'bold', align: 'right', leading: 0.965, ...c3, fit: 10, measure });
  const h3 = textBlock({ id: 'h3', role: 'h3', text: T.h3, x: m, y: qrY + (plate - probe.h) / 2, w: 47.4 - m, sizePt: probe.size, weight: 'regular', boldWeight: 'bold', align: 'right', leading: 0.965, ...c3, measure });
  blocks.push(block('h3', 'Apoio ao lado do QR (H3)', [h3]), qr);

  blocks.push(block('rodape', 'Faixa branca dos logos', [{ type: 'rect', x: -BLEED_MM, y: footerTop, w: tw + 2 * BLEED_MM, h: th - footerTop + BLEED_MM, fill: theme ? theme.footer : 'branco' }], { movable: false, exempt: true, opaque: true }));
  blocks.push(logosBB ?? logosRow({ x: 14, y: 129.9, w: tw - 28, h: 13.1, gap: 10, assets: input.assets, includeBB: input.includeBB, rel: { prefeitura: 1, gove: 0.68, bb: 0.75 } }));
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
          { type: 'icon', paths: WHATSAPP_OUTLINE.paths, ...box, fill: 'branco', opacity: 0.2, decorative: true },
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
 *   mockup:{ mode:'upload', imageId, width, height, focus },
 *   assets:{ gove:{official:true}|{width,height}|null, prefeitura, bb } }
 * @param {(text:string, weight:string, sizePt:number) => number} measure  largura em mm
 */
export function buildLayout(layoutId, input, measure) {
  const layout = getLayout(layoutId);
  if (!layout) throw new Error(`Layout desconhecido: ${layoutId}`);
  const { w: tw, h: th } = layout.trim;
  const pageW = tw + 2 * BLEED_MM;
  const pageH = th + 2 * BLEED_MM;

  const theme = themeOf(input);
  // Identidade BB: a logomarca do Banco do Brasil é obrigatória
  if (theme) input = { ...input, includeBB: true };
  let spec;
  if (layoutId === 'flyer-a4') spec = flyer(layout, input, measure, 1, 1, 1, theme);
  else if (layoutId === 'flyer-10x15') spec = flyer(layout, input, measure, tw / 210, 0.504, 0.56, theme);
  else if (layoutId === 'adesivo-5x10') spec = adesivo(layout, input, measure, theme);
  else spec = displayA6(layout, input, measure, theme);

  const blocks = spec.blocks;
  // Trim → página (soma a sangria) e aplica os deslocamentos manuais do editor
  for (const b of blocks) {
    shiftBlock(b, BLEED_MM, BLEED_MM);
    const o = input.overrides?.[b.id];
    if (b.movable && o && (o.dx || o.dy)) shiftBlock(b, Number(o.dx) || 0, Number(o.dy) || 0);
  }

  const diag = Math.hypot(tw, th);
  // Fundo GOVE: degradê verde (WhatsApp) ou índigo (Portal Cidadão)
  const BG = isPortalInput(input) ? PORTAL_BACKGROUND : BACKGROUND;
  const bg = { cx: BLEED_MM + BG.cx * tw, cy: BLEED_MM + BG.cy * th, r: BG.r * diag, stops: BG.stops };
  const background = theme
    ? block('fundo', 'Fundo', [{ type: 'rect', x: 0, y: 0, w: pageW, h: pageH, fill: theme.bg }], { movable: false, exempt: true })
    : block('fundo', 'Fundo em degradê', [
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

  // Marca d'água (branco translúcido) só na GOVE: na BB toda cor impressa é uma cor sólida da paleta
  const wm = spec.watermark && !theme ? placeWatermark(spec.watermark, blocks) : null;
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
  result.model = isPortalInput(input) ? 'portal' : 'whatsapp';
  if (theme) {
    result.identity = 'bb';
    result.bbScheme = theme.scheme.id;
    result.bbFixes = bbAutoFix(result);
  }
  result.checks = checkLayout(result, input);
  return result;
}

// ------------------------------------------- identidade BB: auditoria de cor

const BB_HEXES = new Set(Object.values(BB_PALETTE));
const UNKNOWN = 'imagem';

function inRoundRect(e, px, py) {
  if (px < e.x || px > e.x + e.w || py < e.y || py > e.y + e.h) return false;
  const r = e.radii ?? e.r ?? 0;
  const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(0, Math.min(v || 0, e.w / 2, e.h / 2)));
  const corner = (cx, cy, rr, inX, inY) => !(inX && inY) || Math.hypot(px - cx, py - cy) <= rr;
  return (
    corner(e.x + tl, e.y + tl, tl, px < e.x + tl, py < e.y + tl) &&
    corner(e.x + e.w - tr, e.y + tr, tr, px > e.x + e.w - tr, py < e.y + tr) &&
    corner(e.x + e.w - br, e.y + e.h - br, br, px > e.x + e.w - br, py > e.y + e.h - br) &&
    corner(e.x + bl, e.y + e.h - bl, bl, px < e.x + bl, py > e.y + e.h - bl)
  );
}
const inBox = (e, px, py) => px >= e.x && px <= e.x + e.w && py >= e.y && py <= e.y + e.h;
function inPoly(P, px, py) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i];
    const [xj, yj] = P[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function groupPoly(g) {
  const a = ((g.rotate ?? 0) * Math.PI) / 180;
  return [[0, 0], [g.w, 0], [g.w, g.h], [0, g.h]].map(([x, y]) => [g.x + x * Math.cos(a) - y * Math.sin(a), g.y + x * Math.sin(a) + y * Math.cos(a)]);
}

/**
 * Cores realmente atrás de um ponto: percorre o que já foi pintado de cima para
 * baixo até a primeira forma opaca. Ícones, QR e contornos entram como possíveis
 * cores sob o texto; imagens (logos, fotos) viram "imagem" (sem como garantir 4,5:1).
 */
function backdropAt(painted, px, py) {
  const out = new Set();
  for (let i = painted.length - 1; i >= 0; i--) {
    const e = painted[i];
    if (e.type === 'rect' && inRoundRect(e, px, py)) {
      if (e.fill) {
        out.add(COLORS[e.fill].hex);
        return [...out];
      }
      if (e.stroke) out.add(COLORS[e.stroke].hex);
    } else if (e.type === 'circle' && inBox(e, px, py)) {
      const inside = ((px - e.x - e.w / 2) / (e.w / 2)) ** 2 + ((py - e.y - e.h / 2) / (e.h / 2)) ** 2 <= 1;
      if (inside && e.fill) {
        out.add(COLORS[e.fill].hex);
        return [...out];
      }
      if (e.stroke) out.add(COLORS[e.stroke].hex);
    } else if (e.type === 'gradient' && inBox(e, px, py)) {
      out.add(UNKNOWN);
      return [...out];
    } else if ((e.type === 'icon' || e.type === 'glyph') && inBox(e, px, py)) {
      out.add(COLORS[e.stroke ?? e.fill].hex);
    } else if (e.type === 'qr' && inBox(e, px, py)) {
      out.add(COLORS[e.color].hex);
    } else if ((e.type === 'logo' && !e.missing) || e.type === 'mockup-screen') {
      if (inBox(e, px, py)) out.add(UNKNOWN);
    } else if (e.type === 'group' && inPoly(groupPoly(e), px, py)) {
      out.add(UNKNOWN);
      return [...out];
    }
  }
  return [...out];
}

function textSamples(e) {
  return lineBoxes(e).flatMap((r) => {
    const ix = Math.min(0.2, r.w / 4);
    const iy = Math.min(0.2, r.h / 4);
    return [[r.x + ix, r.y + iy], [r.x + r.w - ix, r.y + iy], [r.x + ix, r.y + r.h - iy], [r.x + r.w - ix, r.y + r.h - iy], [r.x + r.w / 2, r.y + r.h / 2]];
  });
}

/**
 * Identidade BB — confere cada texto contra o que está de fato atrás dele (inclusive
 * depois dos ajustes manuais de posição) e corrige sozinho: troca a cor pela
 * aprovada que passa 4,5:1 contra todas as amostras (textOnSamples; Preto só sobre
 * Rosa escuro) ou, sem nenhuma, aplica a proteção de contraste (caixa Azul escuro,
 * texto Branco). Devolve a lista de correções aplicadas.
 */
function bbAutoFix(r) {
  const fixes = [];
  const audit = (elements, painted, blockId) => {
    for (let i = 0; i < elements.length; i++) {
      const e = elements[i];
      if (e.type === 'group') {
        audit(e.children, [], blockId);
      } else if (e.type === 'text' && e.lines.length) {
        const backs = [...new Set(textSamples(e).flatMap(([x, y]) => backdropAt(painted, x, y)))];
        e.bbBackdrop = backs;
        if (backs.includes(UNKNOWN) || !backs.length) {
          e.contrast = 0;
        } else {
          const ratio = (hex) => Math.min(...backs.map((b) => bbContrast(hex, b)));
          const cur = COLORS[e.color].hex;
          if (ratio(cur) < MIN_TEXT || (cur === BB_PRETO && backs.some((b) => b !== BB_PALETTE.rosaEscuro))) {
            let next = textOnSamples(backs, BB_TEXT_ON[backs[0]]?.[0]);
            if (!next && backs.every((b) => b === BB_PALETTE.rosaEscuro)) next = BB_PRETO;
            if (next) {
              fixes.push({ blockId, id: e.id, from: BB_NAMES[cur] ?? cur, to: BB_NAMES[next], reason: 'contraste' });
              e.color = bbKey(next);
            } else {
              // Proteção de contraste: caixa Azul escuro atrás do texto, texto Branco
              const boxes = lineBoxes(e);
              const pad = Math.max(0.8, ptToMm(e.size) * 0.25);
              const bx = Math.min(...boxes.map((b) => b.x)) - pad;
              const by = Math.min(...boxes.map((b) => b.y)) - pad;
              const rect = { type: 'rect', x: bx, y: by, w: Math.max(...boxes.map((b) => b.x + b.w)) + pad - bx, h: Math.max(...boxes.map((b) => b.y + b.h)) + pad - by, fill: bbKey(BB_PALETTE.azulEscuro), r: pad, protection: true };
              elements.splice(i, 0, rect);
              painted.push(rect);
              i += 1;
              fixes.push({ blockId, id: e.id, from: BB_NAMES[cur] ?? cur, to: 'Branco sobre caixa Azul escuro', reason: 'protecao' });
              e.color = bbKey(BB_PALETTE.branco);
              e.bbBackdrop = [BB_PALETTE.azulEscuro];
            }
          }
          e.contrast = Math.min(...e.bbBackdrop.map((b) => bbContrast(COLORS[e.color].hex, b)));
        }
      }
      painted.push(e);
    }
  };
  const painted = [];
  for (const b of r.blocks) audit(b.elements, painted, b.id);
  return fixes;
}

/** Todas as cores pintadas na peça (fill, stroke, texto, QR, degradê), com o elemento. Logos (imagens) ficam de fora. */
function paintedColors(r) {
  const out = [];
  const walk = (els, blockId) => {
    for (const e of els) {
      if (e.type === 'group') walk(e.children, blockId);
      if (e.type === 'logo') continue;
      for (const k of ['fill', 'stroke', 'color']) if (typeof e[k] === 'string') out.push({ key: e[k], e, blockId, prop: k });
      if (e.stops) for (const [, k] of e.stops) out.push({ key: k, e, blockId, prop: 'stops' });
    }
  };
  for (const b of r.blocks) walk(b.elements, b.id);
  return out;
}

function allTexts(r) {
  const out = [];
  const walk = (els, blockId) => els.forEach((e) => (e.type === 'group' ? walk(e.children, blockId) : e.type === 'text' && out.push({ e, blockId })));
  r.blocks.forEach((b) => walk(b.elements, b.id));
  return out;
}

/**
 * Erros da identidade BB que bloqueiam a fila e a exportação (sem "exportar mesmo
 * assim"): cor fora da paleta, texto abaixo de 4,5:1 e fonte fora da tipografia BB.
 */
export const BB_BLOCKING = ['bb-paleta', 'bb-contraste', 'bb-fonte'];
export const bbBlockingChecks = (checks) => (checks ?? []).filter((c) => c.level === 'error' && BB_BLOCKING.includes(c.code));

/** Checagens da identidade BB: paleta, contraste de todo texto, fontes e regras da logomarca BB. */
export function bbChecks(r) {
  const out = [];
  const add = (level, code, message, blockId = null) => out.push({ level, code, message, blockId });
  const bad = new Map();
  for (const { key, e, blockId } of paintedColors(r)) {
    const hex = COLORS[key]?.hex;
    const okPreto = hex === BB_PRETO && e.type === 'text' && (e.bbBackdrop ?? []).every((b) => b === BB_PALETTE.rosaEscuro);
    const okQr = e.type === 'qr' && key === 'qrPreto'; // regra GOVE: QR sempre preto sobre branco
    if (!hex || (!BB_HEXES.has(hex) && !okPreto && !okQr)) bad.set(key, blockId);
  }
  for (const [key, blockId] of bad) add('error', 'bb-paleta', `Cor fora da paleta Banco do Brasil: ${COLORS[key]?.name ?? key}.`, blockId);
  if (!bad.size) add('ok', 'bb-paleta', 'Paleta BB ok — todas as cores impressas são da paleta oficial (CMYK do guia).');

  let worst = Infinity;
  let fails = 0;
  for (const { e, blockId } of allTexts(r)) {
    if (!e.lines.length) continue;
    if ((e.bbBackdrop ?? []).includes(UNKNOWN)) {
      fails += 1;
      add('error', 'bb-contraste', `"${e.lines[0].text}…" está sobre uma imagem — afaste o texto da imagem.`, blockId);
      continue;
    }
    worst = Math.min(worst, e.contrast ?? 0);
    if ((e.contrast ?? 0) < MIN_TEXT) {
      fails += 1;
      add('error', 'bb-contraste', `Contraste de ${(e.contrast ?? 0).toFixed(2)}:1 em "${e.lines[0].text}…" — a identidade BB pede 4,5:1 em todo texto.`, blockId);
    }
    if (!String(e.weight).startsWith('bb') || e.lines.some((l) => l.runs?.some((run) => !String(run.weight).startsWith('bb')))) {
      add('error', 'bb-fonte', `"${e.lines[0].text}…" fora da tipografia BB (BancoDoBrasil Titulos/Textos).`, blockId);
    }
  }
  if (!fails && worst < Infinity) add('ok', 'bb-contraste', `Contraste BB ok — todo texto ≥ 4,5:1 com o fundo real (mín. ${worst.toFixed(2)}:1).`);
  for (const f of r.bbFixes ?? []) {
    add('warn', 'bb-ajuste', f.reason === 'protecao' ? `Texto "${f.id}" sem cor da paleta com 4,5:1 sobre o fundo: aplicada a proteção (Branco sobre caixa Azul escuro).` : `Cor do texto "${f.id}" ajustada de ${f.from} para ${f.to} para manter 4,5:1.`, f.blockId);
  }

  // Logomarca BB
  for (const e of logoElements(r).filter((x) => x.which === 'bb')) {
    if (e.missing) {
      add('error', 'logo-bb', 'Identidade Banco do Brasil: a logomarca BB é obrigatória — envie-a em "Logos fixos".', 'logos');
      continue;
    }
    const nome = { simbolo: 'símbolo', central: 'central', horizontal: 'horizontal' }[e.bbKind];
    if (e.w < e.minW - 0.05) add('error', 'bb-logo-min', `Logomarca BB (${nome}) com ${e.w.toFixed(1)} mm — mínimo de impressão ${e.minW} mm. ${e.bbKind === 'horizontal' ? 'Use a versão central (mín. 25 mm) neste formato.' : 'Aumente o espaço dos logos.'}`, 'logos');
    if (e.bbKind !== 'simbolo' && !BB_LOGO_RULES.centralHorizontalBackgrounds.includes(bbNorm(e.bg ?? '#FFFFFF'))) {
      add('warn', 'bb-logo-fundo', `Logomarca BB ${nome} sobre ${BB_NAMES[bbNorm(e.bg)] ?? e.bg}: o manual só permite Amarelo institucional, Azul institucional ou Branco.`, 'logos');
    }
    const c = e.clear;
    // a área de proteção vale dentro do formato final (o que passa da linha de corte é refilado)
    const zone = clipBox({ x: e.x - c, y: e.y - c, w: e.w + 2 * c, h: e.h + 2 * c }, r.trim);
    const invaders = [];
    for (const b of r.blocks) {
      if (b.exempt) continue;
      for (const o of b.elements) {
        // retângulo da mesma cor do fundo do logo (ex.: placa branca do QR no painel branco) não aparece
        if (o === e || o.protection || (o.type === 'rect' && o.fill && !o.stroke && COLORS[o.fill].hex === bbNorm(e.bg ?? ''))) continue;
        const hit = o.type === 'group' ? polysIntersect(groupPoly(o), rectPoly(zone)) : boxesIntersect(o.type === 'text' ? bboxOf(lineBoxes(o)) : o, zone);
        if (hit) invaders.push(o.type === 'logo' ? `logo ${o.which}` : o.type === 'text' ? `texto "${o.lines[0]?.text ?? ''}"` : b.label);
      }
    }
    if (invaders.length) add('error', 'bb-logo-protecao', `Área de proteção da logomarca BB (metade da altura em volta) invadida por: ${[...new Set(invaders)].join(', ')}.${e.bbKind === 'horizontal' ? ' Neste formato, prefira a versão central da logomarca BB.' : ''}`, 'logos');
  }
  return out;
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

  if (isPortalInput(input)) {
    // Portal Cidadão: o QR e a faixa levam ao site do domicílio eletrônico (cadastro do município)
    const site = normalizeSite(m.url_domicilio);
    if (site === '') add('error', 'site', 'Portal Cidadão: cadastre o site do domicílio eletrônico do município (Municípios › Editar).', 'numero');
    else if (site === null) add('error', 'site', 'Site do domicílio eletrônico inválido — confira o endereço no cadastro do município.', 'numero');
    else add('ok', 'site', `QR code e faixa apontam para ${siteLabel(site)}.`);
  } else {
    if (onlyDigits(m.ddd).length !== 2) add('error', 'ddd', 'DDD inválido: use 2 dígitos.');
    const n = onlyDigits(m.numero_whatsapp).length;
    if (n < 8 || n > 9) add('error', 'numero', 'Número de WhatsApp inválido: use 8 ou 9 dígitos.');
  }

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
      if (r.identity !== 'bb' && e.type === 'text' && e.lines.length && e.contrast != null && e.contrast < e.minContrast) {
        add('error', 'contraste', `Contraste de ${e.contrast.toFixed(2)}:1 em "${e.lines[0].text}…" — mínimo ${e.minContrast}:1.`, b.id);
      }
      if (e.type === 'qr' && e.w < QR_MIN_MM - 0.01) add('error', 'qr-min', `QR code com ${e.w.toFixed(1)} mm — mínimo ${QR_MIN_MM} mm.`, b.id);
      if (e.type === 'logo' && e.missing && !(e.which === 'bb' && r.identity === 'bb')) {
        const label = { gove: 'Logo da Gove', prefeitura: 'Logo da prefeitura', bb: 'Logo do Banco do Brasil' }[e.which];
        add('error', `logo-${e.which}`, `${label} não cadastrado.`, b.id);
      }
      if (e.type === 'logo' && !e.missing && e.dpi < IMAGE_MIN_DPI) {
        add('warn', `logo-dpi-${e.which}`, `Logo (${e.which}) com ${Math.round(e.dpi)} dpi no tamanho de impressão — mínimo ${IMAGE_MIN_DPI}.`, b.id);
      }
      if (e.type === 'group' && e.mockupMode === 'upload') {
        const scr = e.children.find((c) => c.type === 'mockup-screen');
        if (!scr?.imageId) add('warn', 'mockup', isPortalInput(input) ? 'Capture o site do domicílio eletrônico (ou envie a captura): sem ela, a tela do celular sai vazia.' : 'Envie a captura da tela do celular: sem ela, a tela sai vazia.', b.id);
        else if (scr.dpi != null && scr.dpi < IMAGE_MIN_DPI) add('warn', 'mockup-dpi', `Imagem do mockup com ${Math.round(scr.dpi)} dpi no tamanho de impressão — mínimo ${IMAGE_MIN_DPI}.`, b.id);
      }
    }
  }
  const lc = logoContrastCheck(r);
  if (lc && lc.level !== 'ok') add(lc.level, lc.code, lc.message, 'logos');
  if (r.identity === 'bb') out.push(...bbChecks(r));
  if ((input.services?.length ?? 0) > MAX_SERVICES_RECOMMENDED && r.layout.id.startsWith('flyer')) {
    add('warn', 'servicos', `${input.services.length} ícones de serviço — o recomendado é até ${MAX_SERVICES_RECOMMENDED} por peça.`);
  }
  return out.map((c) => ({ ...c, layout: name }));
}
