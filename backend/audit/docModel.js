// Modelo normalizado dos modos Documento (PPTX, PDF, DOCX) e HTML, e o
// verificador comum que transforma o modelo em itens do relatório.
//
//   model = {
//     format: 'PPTX' | 'PDF' | 'DOCX' | 'HTML',
//     texts:   [{ text, font, weight?, sizePt?, sizePx?, color, colorNote?, where }],
//     logos:   [{ colors: ['#RRGGBB'…] | null, where, source, note?, background?: '#RRGGBB', backgroundNote?, box?: {w,h} }],
//     targets: [{ w, h, label, where }]   // só HTML
//     units:   { pages?, slides? }
//   }
//
// Foco da análise: cor da logomarca, cor do texto, família tipográfica e
// tamanhos mínimos (HIG). Gradientes e imagens/fotos são ignorados de
// propósito: os parsers não os colocam no modelo.
import sharp from 'sharp';
import { LOGO_MIN_CONTRAST, contrast, kindForBox, pickLogo } from '../../brand/logos.js';
import { SETTINGS } from '../../db/seed.js';
import { deltaE, nearestPaletteColor, parseColor, rgbToLab, deltaE2000, round, toHex } from '../lib/color.js';
import { quantize } from '../lib/raster.js';
import { child, findAll, parseXml } from '../lib/xml.js';
import { check } from './common.js';

export const MANUAL = 'Não verificável com confiança — revisão manual recomendada';

/** Erro de entrada dos parsers (vira AuditInputError no auditService). */
export class DocInputError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

const DEFAULTS = Object.fromEntries(SETTINGS.map((s) => [s.name, s.value]));
/** Configuração efetiva (tokens do banco, com os valores do seed como fallback). */
export function docSettings(tokens) {
  const s = tokens.settings ?? {};
  const hig = { ...DEFAULTS.hig, ...(s.hig ?? {}) };
  const typography = { ...DEFAULTS.typography, ...(s.typography ?? {}) };
  const textPalette = { ...DEFAULTS.text_palette, ...(s.text_palette ?? {}) };
  const tol = s.color_tolerance ?? DEFAULTS.color_tolerance;
  const brand = tokens.colors.filter((c) => c.role === 'brand-purple' || c.role === 'brand-yellow');
  const logoColors = [...brand, { name: 'branco', hex: '#FFFFFF' }];
  return { hig, typography, textPalette, tol, logoColors };
}

// ---------------------------------------------------------------- utilidades

export const isLogoName = (...parts) => parts.some((p) => p && /logo|gove/i.test(String(p)));

const STYLE_WORDS = /(?:[-_ ,]|(?<=[a-z]))(thin|hairline|extralight|ultralight|light|regular|book|normal|medium|semibold|demibold|bold|extrabold|ultrabold|black|heavy|italic|oblique|it|mt|ps|variable|vf)\b.*$/i;

/**
 * Família "limpa" a partir do nome real da fonte: remove o prefixo de subset
 * do PDF (ABCDEF+), aspas, o sufixo de estilo (-Bold, ,Italic, SemiBold…).
 */
export function cleanFamily(name) {
  if (!name) return null;
  let f = String(name).trim().split(',')[0].trim().replace(/^['"]|['"]$/g, '').replace(/^[A-Z]{6}\+/, '');
  f = f.replace(/-.*$/, '');
  f = f.replace(STYLE_WORDS, '').trim();
  return f || String(name).trim();
}

/** Classifica a família: approved | fallback | other. */
export function classifyFamily(font, typography) {
  const fam = cleanFamily(font);
  const key = (s) => String(s ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  const k = key(fam);
  const approved = typography.approved.find((a) => k === key(a.family) || k.startsWith(key(a.family)) && /^(variable|display|tight|v\d*)?$/.test(k.slice(key(a.family).length)));
  if (approved) return { family: approved.family, level: 'approved', role: approved.role };
  const fb = typography.fallback.find((f) => k === key(f) || k.startsWith(key(f)));
  if (fb) return { family: fb, level: 'fallback' };
  return { family: fam ?? 'desconhecida', level: 'other' };
}

const snippet = (t, n = 40) => {
  const s = String(t).replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const examples = (items, n = 3) =>
  items
    .slice(0, n)
    .map((t) => `${t.where}: “${snippet(t.text)}”`)
    .join(' · ') + (items.length > n ? ` · +${items.length - n}` : '');

// ------------------------------------------------------- cores da logomarca

/** Cores de um SVG (fill/stroke em atributos, style e <style>). Gradientes ignorados. */
export function svgColors(svg) {
  const src = typeof svg === 'string' ? svg : new TextDecoder().decode(svg);
  const found = new Map();
  const add = (v) => {
    if (!v) return;
    v = v.trim();
    if (/^(none|transparent|inherit|currentcolor)$/i.test(v) || v.startsWith('url(')) return;
    const c = parseColor(v);
    if (!c || c.a === 0) return;
    const hex = toHex(c);
    found.set(hex, (found.get(hex) ?? 0) + 1);
  };
  const root = parseXml(src);
  const shapes = findAll(root, '*:path').concat(['rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line', 'text'].flatMap((n) => findAll(root, `*:${n}`)));
  for (const el of findAll(root, '*:svg').concat(findAll(root, '*:g'), shapes)) {
    add(el.attrs.fill);
    add(el.attrs.stroke);
    for (const m of (el.attrs.style ?? '').matchAll(/(?:fill|stroke)\s*:\s*([^;]+)/gi)) add(m[1]);
  }
  for (const st of findAll(root, '*:style')) {
    const css = st.children.filter((c) => typeof c === 'string').join('');
    for (const m of css.matchAll(/(?:fill|stroke)\s*:\s*([^;}]+)/gi)) add(m[1]);
  }
  // Formas sem fill herdado nem explícito são pretas no SVG.
  const anyFill = shapes.some((s) => s.attrs.fill || /fill\s*:/.test(s.attrs.style ?? ''));
  const rootFill = findAll(root, '*:svg')[0]?.attrs.fill || findAll(root, '*:g').some((g) => g.attrs.fill);
  if (shapes.length && !anyFill && !rootFill && !findAll(root, '*:style').length) add('#000000');
  return [...found.keys()];
}

/**
 * Cores dominantes de pixels RGBA, ignorando transparência e o fundo (cor
 * uniforme da borda da imagem).
 */
export function pixelColors({ data, width, height, channels = 4 }, { minShare = 0.04 } = {}) {
  // Pixels semitransparentes (bordas com antialiasing) não entram na conta.
  const px = (x, y) => {
    const i = (y * width + x) * channels;
    return channels === 4 && data[i + 3] < 240 ? null : { r: data[i], g: data[i + 1], b: data[i + 2] };
  };
  // Fundo: cor da borda, se a borda for majoritariamente uniforme e opaca.
  const border = [];
  for (let x = 0; x < width; x++) border.push(px(x, 0), px(x, height - 1));
  for (let y = 0; y < height; y++) border.push(px(0, y), px(width - 1, y));
  const opaque = border.filter(Boolean);
  let bgLab = null;
  if (opaque.length > border.length * 0.8) {
    const ref = opaque[Math.floor(opaque.length / 2)];
    const lab = rgbToLab(ref);
    const similar = opaque.filter((c) => deltaE2000(rgbToLab(c), lab) < 6).length;
    if (similar > opaque.length * 0.8) bgLab = lab;
  }
  const kept = [];
  for (let i = 0; i < data.length; i += channels) {
    if (channels === 4 && data[i + 3] < 240) continue;
    const c = { r: data[i], g: data[i + 1], b: data[i + 2] };
    if (bgLab && deltaE2000(rgbToLab(c), bgLab) < 6) continue;
    kept.push(c.r, c.g, c.b);
  }
  if (!kept.length && bgLab) {
    // A "borda" era a própria logomarca (recorte justo): usa todos os pixels opacos.
    for (let i = 0; i < data.length; i += channels) if (channels !== 4 || data[i + 3] >= 240) kept.push(data[i], data[i + 1], data[i + 2]);
  }
  if (!kept.length) return [];
  return quantize({ data: kept, channels: 3 }, { clusters: 4 })
    .filter((c) => c.share >= minShare)
    .map((c) => c.hex);
}

const isSvgBytes = (b) => {
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart();
  return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
};

/** Cores de um arquivo de imagem (SVG → atributos; raster → pixels). null se não der. */
export async function imageColors(bytes) {
  if (!bytes?.length) return null;
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try {
    if (isSvgBytes(b)) {
      const cs = svgColors(b);
      return cs.length ? cs : null;
    }
    const { data, info } = await sharp(Buffer.from(b))
      .ensureAlpha()
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cs = pixelColors({ data, width: info.width, height: info.height, channels: info.channels });
    return cs.length ? cs : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------- verificador

/**
 * Gera os itens do relatório a partir do modelo normalizado.
 * @param {object} model
 * @param {object} tokens  loadBrandTokens()
 */
export function verifyDocModel(model, tokens) {
  const cfg = docSettings(tokens);
  const html = model.format === 'HTML';
  const unit = html ? 'px' : 'pt';
  const texts = model.texts.filter((t) => t.text && t.text.trim());
  const checks = [];

  // ---------- 1. Logomarca (cor) ----------
  checks.push(...logoColorChecks(model.logos, cfg));

  // ---------- 2. Cor do texto ----------
  checks.push(...textColorChecks(texts, cfg));

  // ---------- 3. Tipografia ----------
  checks.push(...typographyChecks(texts, cfg));

  // ---------- 4. Tamanhos mínimos (HIG) ----------
  checks.push(...sizeChecks(texts, cfg, { html, unit }));
  if (html) checks.push(...targetChecks(model.targets ?? [], cfg));

  return checks;
}

/** Itens de cor + contraste da logomarca (reaproveitado pelo modo Imagem). */
export const verifyLogos = (logos, tokens, opts) => logoColorChecks(logos, docSettings(tokens), opts);
/** Itens de cor do texto (reaproveitado pelo modo Imagem). */
export const verifyTextColors = (texts, tokens) => textColorChecks(texts, docSettings(tokens));

function logoColorChecks(logos, cfg, { emptyNote } = {}) {
  const expected = cfg.logoColors.map((c) => `${c.hex} (${c.name})`).join(', ');
  if (!logos.length) {
    return [
      check({
        category: 'logomarca',
        title: 'Cor da logomarca',
        status: 'manual',
        found: `${emptyNote ?? 'Nenhuma logomarca identificada (imagem/SVG com “logo” ou “gove” no nome, alt ou descrição)'} — ${MANUAL.toLowerCase()}`,
        expected,
        suggestion: 'Se a peça tem logomarca, nomeie a imagem como “Logo Gove” (nome/alt/descrição) para a checagem automática, ou confira a cor visualmente.',
      }),
    ];
  }
  const out = [];
  for (const logo of logos) {
    const label = `${logo.where}${logo.source ? ` (${logo.source})` : ''}`;
    if (!logo.colors?.length) {
      out.push(
        check({
          category: 'logomarca',
          title: `Cor da logomarca — ${logo.where}`,
          status: 'manual',
          found: `Logomarca encontrada, mas as cores não puderam ser lidas${logo.note ? ` (${logo.note})` : ''} — ${MANUAL.toLowerCase()}`,
          expected,
          suggestion: 'Confira visualmente se a logomarca usa só as cores oficiais.',
          objects: [label],
        }),
      );
      continue;
    }
    const rows = logo.colors.map((hex) => ({ hex, ...nearestPaletteColor(hex, cfg.logoColors, cfg.tol) }));
    const bad = rows.filter((r) => r.level === 'fail');
    const near = rows.filter((r) => r.level === 'warn');
    const status = bad.length ? 'fail' : near.length ? 'warn' : 'pass';
    out.push(
      check({
        category: 'logomarca',
        title: `${status === 'pass' ? 'Cores da logomarca oficiais' : status === 'warn' ? 'Cor da logomarca fora do tom' : 'Cor da logomarca fora do padrão'} — ${logo.where}`,
        status,
        found: rows.map((r) => `${r.hex}${r.level === 'pass' ? '' : ` (ΔE2000 ${round(r.deltaE)} de ${r.match?.hex})`}`).join(', '),
        expected,
        suggestion:
          status === 'pass'
            ? null
            : `Use o arquivo oficial da logomarca; ${[...bad, ...near].map((r) => `${r.hex} → ${r.match?.hex} (${r.match?.name})`).join(', ')}.`,
        objects: [label],
      }),
    );
    out.push(logoContrastCheck(logo, label));
  }
  return out;
}

/**
 * Regra de aplicação (brand/logos.js): toda cor da logomarca precisa de
 * contraste ≥ 4,5:1 com o fundo; diz qual versão usar naquele fundo.
 */
export function logoContrastCheck(logo, label = logo.where) {
  const kind = logo.box?.w && logo.box?.h ? kindForBox(logo.box.w, logo.box.h) : 'logotipo';
  const kindLabel = kind === 'simbolo' ? 'símbolo' : 'logotipo';
  if (!logo.background) {
    return check({
      category: 'logomarca',
      title: `Contraste da logomarca com o fundo — ${logo.where}`,
      status: 'manual',
      found: `Fundo atrás da logomarca não identificado${logo.backgroundNote ? ` (${logo.backgroundNote})` : ''} — ${MANUAL.toLowerCase()}`,
      expected: `Cada cor da logomarca com contraste ≥ ${LOGO_MIN_CONTRAST}:1 sobre o fundo`,
      suggestion: 'Confira o fundo: roxo sobre fundos claros, branco sobre fundos escuros; a colorida só quando roxo e amarelo passam.',
      objects: [label],
    });
  }
  const bg = logo.background.toUpperCase();
  const rows = logo.colors.map((c) => ({ c, ratio: contrast(c, bg) }));
  const min = Math.min(...rows.map((r) => r.ratio));
  const ok = min >= LOGO_MIN_CONTRAST;
  const pick = pickLogo(bg, kind);
  return check({
    category: 'logomarca',
    title: `${ok ? 'Contraste da logomarca adequado' : 'Contraste da logomarca insuficiente'} — ${logo.where}`,
    status: ok ? 'pass' : 'fail',
    found: `${rows.map((r) => `${r.c} ${round(r.ratio, 1)}:1`).join(', ')} sobre ${bg}${logo.backgroundNote ? ` (${logo.backgroundNote})` : ''}`,
    expected: `≥ ${LOGO_MIN_CONTRAST}:1 para cada cor — neste fundo: ${kindLabel} versão “${pick.variant}” (${pick.file})${pick.ok ? '' : ', mas nenhuma versão atinge o mínimo'}`,
    suggestion: ok
      ? null
      : pick.ok
        ? `Troque pela versão “${pick.variant}” (${pick.file}), que tem ${round(pick.minContrast, 1)}:1 sobre ${bg}.`
        : `Nenhuma versão atinge ${LOGO_MIN_CONTRAST}:1 sobre ${bg} (melhor: “${pick.variant}”, ${round(pick.minContrast, 1)}:1): mude o fundo atrás da logomarca.`,
    objects: [label],
  });
}

function textColorChecks(texts, cfg) {
  const withColor = texts.filter((t) => t.color);
  if (!withColor.length) {
    return [
      check({
        category: 'cor',
        title: 'Cor do texto',
        status: 'manual',
        found: texts.length ? `Cor dos textos não pôde ser lida — ${MANUAL.toLowerCase()}` : `Nenhum texto encontrado — ${MANUAL.toLowerCase()}`,
        expected: 'Cores da paleta oficial',
      }),
    ];
  }
  const palette = cfg.textPalette.colors;
  const forbidden = new Set(cfg.textPalette.forbidden.map((h) => h.toUpperCase()));
  const groups = new Map();
  for (const t of withColor) {
    const hex = t.color.toUpperCase();
    if (!groups.has(hex)) groups.set(hex, []);
    groups.get(hex).push(t);
  }
  const out = [];
  const ok = [];
  const paletteStr = palette.map((c) => c.hex).join(', ');
  for (const [hex, items] of groups) {
    const note = items.find((t) => t.colorNote)?.colorNote;
    const { match, deltaE: dE, level } = nearestPaletteColor(hex, palette, cfg.tol);
    if (forbidden.has(hex)) {
      out.push(
        check({
          category: 'cor',
          title: `Texto em preto puro — ${hex}`,
          status: 'fail',
          found: `${hex}${note ? ` (${note})` : ''} em ${items.length} trecho(s) — ${examples(items)}`,
          expected: `Nunca preto puro; use ${palette.find((c) => c.name === 'noite')?.hex ?? '#20133D'} (noite) ou ${palette.find((c) => c.name === 'grafite')?.hex ?? '#2F3539'} (grafite)`,
          suggestion: 'Troque o preto pelo noite (#20133D) em títulos ou grafite (#2F3539) em corpo de texto.',
          objects: items.slice(0, 5).map((t) => t.where),
        }),
      );
      continue;
    }
    if (level === 'pass') {
      ok.push({ hex, match, n: items.length });
      continue;
    }
    out.push(
      check({
        category: 'cor',
        title: `${level === 'warn' ? 'Cor de texto próxima, mas fora do tom' : 'Cor de texto fora da paleta'} — ${hex}`,
        status: level === 'warn' ? 'warn' : 'fail',
        found: `${hex}${note ? ` (${note})` : ''} — ΔE2000 ${round(dE)} de ${match?.hex} — em ${items.length} trecho(s): ${examples(items)}`,
        expected: `Paleta oficial (${paletteStr}) — ΔE2000 ≤ ${cfg.tol.deltaEPass ?? 3}`,
        suggestion: `Troque ${hex} por ${match?.hex} (${match?.name}).`,
        objects: items.slice(0, 5).map((t) => t.where),
      }),
    );
  }
  if (ok.length) {
    out.push(
      check({
        category: 'cor',
        title: `Cores de texto na paleta (${ok.length})`,
        status: 'pass',
        found: ok.map((o) => `${o.hex} ≈ ${o.match.name} (${o.n} trecho(s))`).join(', '),
        expected: `Paleta oficial — ΔE2000 ≤ ${cfg.tol.deltaEPass ?? 3}`,
      }),
    );
  }
  return out;
}

function typographyChecks(texts, cfg) {
  const approvedStr = cfg.typography.approved.map((a) => `${a.family} (${a.role})`).join(' e ');
  const withFont = texts.filter((t) => t.font);
  if (!withFont.length) {
    return [
      check({
        category: 'tipografia',
        title: 'Família tipográfica',
        status: 'manual',
        found: texts.length ? `Fonte dos textos não pôde ser lida — ${MANUAL.toLowerCase()}` : `Nenhum texto encontrado — ${MANUAL.toLowerCase()}`,
        expected: approvedStr,
      }),
    ];
  }
  const groups = new Map();
  for (const t of withFont) {
    const c = classifyFamily(t.font, cfg.typography);
    if (!groups.has(c.family)) groups.set(c.family, { ...c, items: [], raw: new Set() });
    const g = groups.get(c.family);
    g.items.push(t);
    g.raw.add(String(t.font).replace(/^[A-Z]{6}\+/, ''));
  }
  const out = [];
  for (const g of groups.values()) {
    const raw = [...g.raw].slice(0, 4).join(', ');
    if (g.level === 'approved') {
      out.push(
        check({
          category: 'tipografia',
          title: `Fonte aprovada — ${g.family}`,
          status: 'pass',
          found: `${raw} em ${g.items.length} trecho(s)`,
          expected: approvedStr,
        }),
      );
    } else {
      const fb = g.level === 'fallback';
      out.push(
        check({
          category: 'tipografia',
          title: `${fb ? 'Fonte de fallback' : 'Fonte fora do design system'} — ${g.family}`,
          status: fb ? 'warn' : 'fail',
          found: `${raw} em ${g.items.length} trecho(s) — ${examples(g.items)}`,
          expected: approvedStr + (fb ? `; ${cfg.typography.fallback.join('/')} só como fallback de impresso` : ''),
          suggestion: fb
            ? `Use Montserrat nos títulos e Inter no corpo; ${g.family} só é aceitável quando a fonte oficial não puder ser embutida.`
            : `Troque ${g.family} por Montserrat (títulos) ou Inter (corpo).`,
          objects: g.items.slice(0, 5).map((t) => t.where),
        }),
      );
    }
  }
  return out;
}

function sizeChecks(texts, cfg, { html, unit }) {
  const sizeOf = (t) => (html ? t.sizePx : t.sizePt);
  const sized = texts.filter((t) => Number.isFinite(sizeOf(t)));
  const min = html ? cfg.hig.minTextPx : cfg.hig.minTextPt;
  if (!sized.length) {
    return [
      check({
        category: 'tamanhos',
        title: 'Tamanho mínimo de texto (HIG)',
        status: 'manual',
        found: `Tamanho dos textos não pôde ser lido — ${MANUAL.toLowerCase()}`,
        expected: `≥ ${min} ${unit}`,
      }),
    ];
  }
  const out = [];
  const bySize = (list) => {
    const m = new Map();
    for (const t of list) {
      const s = round(sizeOf(t), 1);
      if (!m.has(s)) m.set(s, []);
      m.get(s).push(t);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  };
  const small = sized.filter((t) => sizeOf(t) < min - 0.05);
  for (const [s, items] of bySize(small)) {
    out.push(
      check({
        category: 'tamanhos',
        title: `Texto abaixo do mínimo — ${s} ${unit}`,
        status: 'fail',
        found: `${s} ${unit} em ${items.length} trecho(s) — ${examples(items)}`,
        expected: `≥ ${min} ${unit} (menor estilo de texto do HIG)`,
        suggestion: `Aumente para pelo menos ${min} ${unit}.`,
        objects: items.slice(0, 5).map((t) => t.where),
      }),
    );
  }
  if (html) {
    const body = cfg.hig.bodyTextPx;
    const under = sized.filter((t) => sizeOf(t) >= min - 0.05 && sizeOf(t) < body - 0.05);
    for (const [s, items] of bySize(under)) {
      out.push(
        check({
          category: 'tamanhos',
          title: `Texto de corpo abaixo de ${body} px — ${s} px`,
          status: 'warn',
          found: `${s} px em ${items.length} trecho(s) — ${examples(items)}`,
          expected: `Corpo ≥ ${body} px (tamanho padrão de corpo do HIG); legendas e notas a partir de ${min} px`,
          suggestion: `Se for corpo de texto, use ${body} px; se for legenda/nota, pode manter.`,
          objects: items.slice(0, 5).map((t) => t.where),
        }),
      );
    }
  }
  if (!small.length) {
    const smallest = Math.min(...sized.map(sizeOf));
    out.push(
      check({
        category: 'tamanhos',
        title: `Textos acima do mínimo (${sized.length} trecho(s))`,
        status: 'pass',
        found: `Menor tamanho: ${round(smallest, 1)} ${unit}`,
        expected: `≥ ${min} ${unit}`,
      }),
    );
  }
  return out;
}

function targetChecks(targets, cfg) {
  const min = cfg.hig.minTouchTargetPx;
  if (!targets.length) return [];
  const small = targets.filter((t) => t.w < min - 0.5 || t.h < min - 0.5);
  const out = [];
  const LIMIT = 10;
  for (const t of small.slice(0, LIMIT)) {
    out.push(
      check({
        category: 'tamanhos',
        title: `Alvo de toque pequeno — “${snippet(t.label, 32)}”`,
        status: 'fail',
        found: `${round(t.w, 0)} × ${round(t.h, 0)} px (${t.where})`,
        expected: `≥ ${min} × ${min} px (alvo mínimo do HIG)`,
        suggestion: `Aumente a área clicável (padding ou min-height/min-width: ${min}px).`,
        objects: [t.where],
      }),
    );
  }
  if (small.length > LIMIT) {
    const rest = small.slice(LIMIT);
    out.push(
      check({
        category: 'tamanhos',
        title: `Outros ${rest.length} alvos de toque abaixo de ${min} × ${min} px`,
        status: 'fail',
        found: rest.slice(0, 6).map((t) => `“${snippet(t.label, 24)}” ${round(t.w, 0)}×${round(t.h, 0)}`).join(' · '),
        expected: `≥ ${min} × ${min} px`,
        suggestion: `Aumente a área clicável para pelo menos ${min} × ${min} px.`,
      }),
    );
  }
  if (!small.length) {
    out.push(
      check({
        category: 'tamanhos',
        title: `Alvos de toque adequados (${targets.length})`,
        status: 'pass',
        found: `Menor alvo: ${round(Math.min(...targets.map((t) => Math.min(t.w, t.h))), 0)} px`,
        expected: `≥ ${min} × ${min} px`,
      }),
    );
  }
  return out;
}

// Reexportado para os parsers.
export { child, deltaE };
