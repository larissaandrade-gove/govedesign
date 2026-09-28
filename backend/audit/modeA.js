// Modo A — Vetorial (Fabric.js JSON).
//
// Modo preferencial: todas as checagens usam as propriedades reais dos objetos
// (fontFamily/fontWeight/fontStyle, fill/stroke, geometria, src das imagens,
// paths dos ícones), sem heurística visual.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Point, StaticCanvas } from 'fabric/node';
import { LOGO_DIR } from '../../db/database.js';
import { contrastRatio, deltaE, flatten, nearestPaletteColor, parseColor, round, toHex } from '../lib/color.js';
import { checkFontVariant, variantLabel } from '../lib/fonts.js';
import { collectPaths, explicitIconRef, identifyByPaths, iconExists, isApprovedIcon } from '../lib/icons.js';
import { analyzeQrImage, dataUrlToBuffer, dominantColors, isLight } from '../lib/raster.js';
import { check, marginChecks, r1, resolveMargin, spacingChecks } from './common.js';

const TEXT_TYPES = new Set(['text', 'i-text', 'itext', 'textbox']);
const PLACEHOLDER_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const lower = (t) => String(t ?? '').toLowerCase();
const isText = (raw) => TEXT_TYPES.has(lower(raw.type));
const isImage = (raw) => lower(raw.type) === 'image';
const isGroup = (raw) => ['group', 'activeselection'].includes(lower(raw.type)) && Array.isArray(raw.objects);
const role = (raw) => lower(raw.gove?.role ?? raw.data?.role);

/**
 * @param {object} input
 * @param {object|string} input.json       Canvas Fabric serializado (canvas.toJSON())
 * @param {string} [input.pieceType]       flyer | post | story | slide | banner…
 * @param {object} [input.artboard]        { width, height, left?, top? } — se ausente, é inferido
 * @param {object} input.tokens            loadBrandTokens(db)
 * @param {boolean} [input.renderPreview]
 */
export async function auditVector({ json, pieceType, artboard: artboardIn, tokens, renderPreview = true }) {
  const doc = typeof json === 'string' ? JSON.parse(json) : json;
  if (!doc || !Array.isArray(doc.objects)) {
    throw new Error('JSON inválido: esperado um canvas Fabric.js serializado com a lista "objects".');
  }
  const checks = [];
  const tol = tokens.settings.color_tolerance ?? {};

  // ---------- 1. Carrega no Fabric para obter a geometria real ----------
  const artboard = resolveArtboard(doc, artboardIn);
  const prepared = prepareForFabric(doc);
  const canvas = new StaticCanvas(null, {
    width: artboard?.width ?? 1000,
    height: artboard?.height ?? 1000,
    renderOnAddRemove: false,
  });
  try {
    await canvas.loadFromJSON(prepared.json);
  } catch {
    // Alguma data URL não pôde ser decodificada: troca todas por placeholder.
    await canvas.loadFromJSON(prepareForFabric(doc, { forcePlaceholders: true }).json);
  }
  if (artboard) canvas.viewportTransform = [1, 0, 0, 1, -artboard.left, -artboard.top];

  const nodes = flatten2(doc.objects, canvas.getObjects(), artboard, tokens);

  if (!artboard) {
    checks.push(
      check({
        category: 'geral',
        title: 'Artboard não identificado',
        status: 'manual',
        found: 'O JSON não informa width/height do artboard nem um clipPath/fundo que cubra a peça',
        expected: 'Dimensões do artboard (ex.: 1080 × 1080 para post)',
        suggestion: 'Exporte com canvas.toJSON(["width","height"]) ou envie o tamanho do artboard na auditoria.',
      }),
    );
  }

  // ---------- 2. Tipografia ----------
  checks.push(...typographyChecks(nodes, tokens));

  // ---------- 3. Cores (fill / stroke) e gradientes ----------
  checks.push(...colorChecks(doc, tokens, tol));

  // ---------- 4. Contraste de texto ----------
  const bgResolver = makeBackgroundResolver(nodes, doc);
  checks.push(...contrastChecks(nodes, bgResolver, tokens));

  // ---------- 5. Margens e espaçamento ----------
  const keyNodes = nodes.filter((n) => ['text', 'logo', 'icon', 'qrcode'].includes(n.kind));
  if (artboard) {
    const margin = resolveMargin(tokens, pieceType, artboard);
    checks.push(...marginChecks(keyNodes, artboard, margin));
    checks.push(...spacingChecks(keyNodes, margin));
  }

  // ---------- 6. Logomarca ----------
  checks.push(...(await logoChecks(nodes, bgResolver, tokens, tol)));

  // ---------- 7. Ícones ----------
  checks.push(...iconChecks(nodes, tokens));

  // ---------- 8. QR code ----------
  checks.push(...(await qrChecks(nodes, bgResolver, tokens)));

  // ---------- Preview ----------
  let preview = null;
  if (renderPreview && artboard) {
    try {
      canvas.backgroundColor = doc.background && typeof doc.background === 'string' ? doc.background : canvas.backgroundColor;
      canvas.renderAll();
      preview = dataUrlToBuffer(canvas.toDataURL({ format: 'png' }));
    } catch {
      preview = null;
    }
  }
  canvas.dispose?.();

  return {
    artboard,
    pieceType: pieceType ?? null,
    checks,
    preview,
    objectCount: nodes.length,
    placeholderImages: prepared.replaced,
  };
}

// ======================================================================
// Preparação e geometria
// ======================================================================

function resolveArtboard(doc, given) {
  const norm = (a) => ({ left: a.left ?? 0, top: a.top ?? 0, width: Number(a.width), height: Number(a.height) });
  if (given?.width && given?.height) return norm(given);
  const fromDoc = doc.gove?.artboard ?? doc.artboard;
  if (fromDoc?.width && fromDoc?.height) return norm(fromDoc);
  if (doc.width && doc.height) return norm({ width: doc.width, height: doc.height });
  const clip = doc.clipPath;
  if (clip?.width && clip?.height) {
    const w = clip.width * (clip.scaleX ?? 1);
    const h = clip.height * (clip.scaleY ?? 1);
    const centered = (clip.originX ?? 'center') === 'center';
    return norm({ left: centered ? clip.left - w / 2 : clip.left, top: centered ? clip.top - h / 2 : clip.top, width: w, height: h });
  }
  const bgObj = doc.objects.find((o) => role(o) === 'background' || role(o) === 'artboard');
  if (bgObj?.width && bgObj?.height) {
    return norm({ left: bgObj.left ?? 0, top: bgObj.top ?? 0, width: bgObj.width * (bgObj.scaleX ?? 1), height: bgObj.height * (bgObj.scaleY ?? 1) });
  }
  return null;
}

/**
 * Cópia do JSON pronta para o Fabric: imagens com src não carregável viram um
 * placeholder do mesmo tamanho (a geometria é preservada) e objetos sem stroke
 * ficam com strokeWidth 0 para o bbox não ganhar 1 px fantasma.
 */
function prepareForFabric(doc, { forcePlaceholders = false } = {}) {
  let replaced = 0;
  const visit = (o) => {
    const c = { ...o };
    if (!c.stroke) c.strokeWidth = 0;
    if (isImage(c) && (forcePlaceholders || !String(c.src ?? '').startsWith('data:'))) {
      c.src = PLACEHOLDER_PNG;
      c.filters = [];
      replaced++;
    }
    if (Array.isArray(c.objects)) c.objects = c.objects.map(visit);
    return c;
  };
  const json = { ...doc, objects: doc.objects.map(visit) };
  delete json.backgroundImage;
  delete json.overlayImage;
  return { json, replaced };
}

function boundsOf(obj, artboard) {
  let rect;
  if (obj._objects?.length && (!obj.width || !obj.height)) {
    const rs = obj._objects.map((c) => c.getBoundingRect());
    const left = Math.min(...rs.map((r) => r.left));
    const top = Math.min(...rs.map((r) => r.top));
    rect = {
      left,
      top,
      width: Math.max(...rs.map((r) => r.left + r.width)) - left,
      height: Math.max(...rs.map((r) => r.top + r.height)) - top,
    };
  } else {
    rect = obj.getBoundingRect();
  }
  const ox = artboard?.left ?? 0;
  const oy = artboard?.top ?? 0;
  return { left: rect.left - ox, top: rect.top - oy, width: rect.width, height: rect.height };
}

/** Lista plana de nós (folhas) na ordem de empilhamento, com classificação. */
function flatten2(rawList, fabList, artboard, tokens, prefix = '', out = []) {
  rawList.forEach((raw, i) => {
    const obj = fabList[i];
    if (!obj) return;
    const id = prefix ? `${prefix}.${i + 1}` : String(i + 1);
    if (raw.visible === false) return;
    const kind = classify(raw, tokens);
    if (isGroup(raw) && kind === 'group') {
      flatten2(raw.objects, obj._objects ?? obj.getObjects?.() ?? [], artboard, tokens, id, out);
      return;
    }
    out.push({
      id,
      order: out.length,
      raw,
      obj,
      kind,
      label: labelOf(raw, id, kind),
      bbox: boundsOf(obj, artboard),
      absBbox: boundsOf(obj, null),
      opacity: raw.opacity ?? 1,
    });
  });
  return out;
}

function classify(raw, tokens) {
  const r = role(raw);
  const name = lower(raw.name ?? raw.id);
  if (r === 'qrcode' || r === 'qr' || raw.qrData) return 'qrcode';
  if ((isImage(raw) || isGroup(raw)) && /^qr\b|\bqr[ -]?code\b/.test(name)) return 'qrcode';
  if (r === 'logo' || (isImage(raw) && (matchOfficialLogo(raw, tokens.logos).logo || /logo|marca/.test(name) || /logo/i.test(srcBase(raw.src))))) return 'logo';
  if (r === 'icon' || explicitIconRef(raw) || svgIconRef(raw)) return 'icon';
  if (r === 'background') return 'shape';
  if (isText(raw)) return 'text';
  if (isImage(raw)) return 'image';
  if (isGroup(raw)) {
    return identifyByPaths(collectPaths(raw)).length ? 'icon' : 'group';
  }
  if (lower(raw.type) === 'path' && identifyByPaths(collectPaths(raw)).length) return 'icon';
  return 'shape';
}

function labelOf(raw, id, kind) {
  const base = raw.name || raw.id || raw.gove?.label;
  if (base) return `${base} (#${id})`;
  if (kind === 'text') {
    const t = String(raw.text ?? '').replace(/\s+/g, ' ').trim();
    return `Texto "${t.length > 28 ? `${t.slice(0, 28)}…` : t}" (#${id})`;
  }
  const names = { logo: 'Logomarca', icon: 'Ícone', qrcode: 'QR code', image: 'Imagem', shape: raw.type ?? 'Objeto' };
  return `${names[kind] ?? raw.type} (#${id})`;
}

const srcBase = (src) => {
  const s = String(src ?? '');
  if (!s || s.startsWith('data:')) return '';
  try {
    return basename(decodeURI(s.split(/[?#]/)[0]));
  } catch {
    return basename(s.split(/[?#]/)[0]);
  }
};

function svgIconRef(raw) {
  if (!isImage(raw)) return null;
  const m = /(lucide|phosphor)[/\-_]([a-z0-9-]+?)(?:-(bold|fill|duotone|light|thin))?\.svg$/i.exec(String(raw.src ?? '').split(/[?#]/)[0]);
  return m ? { set: m[1].toLowerCase(), name: m[2], weight: m[3] ?? (m[1].toLowerCase() === 'phosphor' ? 'regular' : null) } : null;
}

// ======================================================================
// Tipografia
// ======================================================================

/** Todas as combinações de fonte de um objeto de texto (base + overrides em `styles`). */
function textVariants(raw) {
  const base = { fontFamily: raw.fontFamily, fontWeight: raw.fontWeight, fontStyle: raw.fontStyle };
  const variants = [base];
  const push = (st) => {
    if (!st || !(st.fontFamily || st.fontWeight || st.fontStyle)) return;
    variants.push({
      fontFamily: st.fontFamily ?? base.fontFamily,
      fontWeight: st.fontWeight ?? base.fontWeight,
      fontStyle: st.fontStyle ?? base.fontStyle,
    });
  };
  if (Array.isArray(raw.styles)) raw.styles.forEach((s) => push(s.style));
  else if (raw.styles && typeof raw.styles === 'object') {
    for (const line of Object.values(raw.styles)) for (const st of Object.values(line ?? {})) push(st);
  }
  return variants;
}

function typographyChecks(nodes, tokens) {
  const texts = nodes.filter((n) => n.kind === 'text');
  if (!texts.length) {
    return [check({ category: 'tipografia', title: 'Nenhum objeto de texto encontrado', status: 'skip' })];
  }
  const approved = tokens.fonts;
  const approvedLabel = approved.map((f) => `${f.family} ${variantLabel(f.weight, f.style)}`).join(', ');
  const usage = new Map();
  for (const n of texts) {
    for (const v of textVariants(n.raw)) {
      const res = checkFontVariant(v, approved);
      const key = `${res.family}|${res.weight}|${res.style}`;
      if (!usage.has(key)) usage.set(key, { res, v, objects: new Set() });
      usage.get(key).objects.add(n.label);
    }
  }
  const out = [];
  for (const { res, v, objects } of usage.values()) {
    const family = String(v.fontFamily ?? '').split(',')[0].replace(/['"]/g, '').trim() || '(sem família)';
    const found = `${family} ${variantLabel(res.weight, res.style)} (peso ${res.weight}, ${res.style})`;
    if (res.ok) {
      out.push(check({ category: 'tipografia', title: `Fonte aprovada — ${found}`, status: 'pass', found, expected: approvedLabel, objects: [...objects] }));
      continue;
    }
    let suggestion;
    if (!res.familyApproved) {
      suggestion = `Troque a família "${family}" por Montserrat e use uma das variações aprovadas (${approvedLabel}).`;
    } else {
      const sameStyle = approved.filter((f) => f.style === res.style);
      const pool = sameStyle.length ? sameStyle : approved;
      const nearest = pool.reduce((a, b) => (Math.abs(b.weight - res.weight) < Math.abs(a.weight - res.weight) ? b : a));
      suggestion = `Use Montserrat ${variantLabel(nearest.weight, nearest.style)} (peso ${nearest.weight}) no lugar de ${variantLabel(res.weight, res.style)}.`;
    }
    const refNote =
      res.existsInReference === false
        ? ' Essa variação não existe na Montserrat de referência — o texto seria renderizado com fonte substituta.'
        : '';
    out.push(
      check({
        category: 'tipografia',
        title: `Variação tipográfica não aprovada — ${found}`,
        status: 'fail',
        found,
        expected: approvedLabel,
        suggestion: suggestion + refNote,
        objects: [...objects],
      }),
    );
  }
  return out;
}

// ======================================================================
// Cores e gradientes
// ======================================================================

function* walkRaw(list, prefix = '') {
  for (const [i, raw] of list.entries()) {
    const id = prefix ? `${prefix}.${i + 1}` : String(i + 1);
    if (raw.visible === false) continue;
    yield { raw, id };
    if (Array.isArray(raw.objects)) yield* walkRaw(raw.objects, id);
  }
}

const isGradient = (v) => v && typeof v === 'object' && Array.isArray(v.colorStops);

function colorChecks(doc, tokens, tol) {
  const solid = new Map(); // hex → { color, objects:Set, props:Set }
  const gradients = [];
  const addSolid = (value, label, prop) => {
    const c = parseColor(value);
    if (!c || c.a === 0) return;
    const hex = toHex(c);
    if (!solid.has(hex)) solid.set(hex, { hex, objects: new Set(), props: new Set() });
    solid.get(hex).objects.add(label);
    solid.get(hex).props.add(prop);
  };
  const visitPaint = (value, label, prop, raw) => {
    if (isGradient(value)) gradients.push({ gradient: value, label, prop, raw });
    else addSolid(value, label, prop);
  };

  if (doc.background) visitPaint(doc.background, 'Fundo do canvas', 'background', { width: doc.width, height: doc.height, scaleX: 1, scaleY: 1, angle: 0 });
  for (const { raw, id } of walkRaw(doc.objects)) {
    if (isImage(raw) || isGroup(raw)) continue;
    const label = labelOf(raw, id, isText(raw) ? 'text' : 'shape');
    visitPaint(raw.fill, label, 'fill', raw);
    if (raw.stroke && (raw.strokeWidth ?? 1) > 0) visitPaint(raw.stroke, label, 'stroke', raw);
    if (isText(raw)) {
      const styles = Array.isArray(raw.styles)
        ? raw.styles.map((s) => s.style)
        : Object.values(raw.styles ?? {}).flatMap((l) => Object.values(l ?? {}));
      for (const st of styles) {
        if (st?.fill) visitPaint(st.fill, label, 'fill (trecho)', raw);
        if (st?.stroke) visitPaint(st.stroke, label, 'stroke (trecho)', raw);
      }
    }
  }

  const out = [];
  const palette = tokens.colors;
  for (const { hex, objects, props } of solid.values()) {
    const { match, deltaE: dE, level } = nearestPaletteColor(hex, palette, tol);
    const expected = match ? `${match.hex} (${match.name}) — ΔE2000 ≤ ${tol.deltaEPass ?? 3}` : 'Cor da paleta oficial';
    const found = `${hex} (${[...props].join(', ')}) — ΔE2000 ${round(dE)} de ${match?.hex ?? '—'}`;
    if (level === 'pass') {
      out.push(check({ category: 'cor', title: `Cor da paleta — ${hex} ≈ ${match.name}`, status: 'pass', found, expected, objects: [...objects] }));
    } else {
      out.push(
        check({
          category: 'cor',
          title: level === 'warn' ? `Cor próxima da paleta, mas fora do tom — ${hex}` : `Cor fora da paleta — ${hex}`,
          status: level === 'warn' ? 'warn' : 'fail',
          found,
          expected,
          suggestion: `Substitua ${hex} por ${match.hex} (${match.name}).`,
          objects: [...objects],
        }),
      );
    }
  }

  for (const g of gradients) out.push(gradientCheck(g, tokens, tol));
  return out;
}

/** Ângulo visual do gradiente em graus (0° = esquerda→direita, 90° = cima→baixo). */
export function gradientAngle(gradient, obj) {
  const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = gradient.coords ?? {};
  let dx = x2 - x1;
  let dy = y2 - y1;
  if (gradient.gradientUnits === 'percentage') {
    dx *= obj.width ?? 1;
    dy *= obj.height ?? 1;
  }
  const t = gradient.gradientTransform;
  if (Array.isArray(t) && t.length >= 4) [dx, dy] = [t[0] * dx + t[2] * dy, t[1] * dx + t[3] * dy];
  dx *= (obj.scaleX ?? 1) * (obj.flipX ? -1 : 1);
  dy *= (obj.scaleY ?? 1) * (obj.flipY ? -1 : 1);
  const a = (Math.atan2(dy, dx) * 180) / Math.PI + (obj.angle ?? 0);
  return ((a % 360) + 360) % 360;
}

const angleDiff = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

function gradientCheck({ gradient, label, prop, raw }, tokens, tol) {
  const stops = [...gradient.colorStops]
    .map((s) => ({ offset: Number(s.offset), color: parseColor(s.color), opacity: s.opacity ?? 1 }))
    .sort((a, b) => a.offset - b.offset);
  const isRadial = gradient.type === 'radial';
  const angle = isRadial ? null : gradientAngle(gradient, raw);
  const angleTol = tol.gradientAngleToleranceDeg ?? 5;
  const offTol = tol.gradientOffsetTolerance ?? 0.05;
  const foundStr = `${isRadial ? 'radial' : `linear ${r1(angle)}°`}: ${stops.map((s) => `${s.color ? toHex(s.color) : '?'} @ ${round(s.offset * 100, 0)}%`).join(' → ')}`;

  let best = null;
  for (const g of tokens.gradients) {
    const gs = [...g.stops].sort((a, b) => a.offset - b.offset);
    if (gs.length !== stops.length) continue;
    const maxDE = Math.max(...gs.map((s, i) => deltaE(stops[i].color, s.hex)));
    const maxOff = Math.max(...gs.map((s, i) => Math.abs(stops[i].offset - s.offset)));
    const aDiff = isRadial ? 0 : angleDiff(angle, g.angle ?? 0);
    const score = maxDE / (tol.deltaEPass ?? 3) + aDiff / angleTol + maxOff / offTol;
    if (!best || score < best.score) best = { g, maxDE, maxOff, aDiff, score };
  }
  const expectedStr = (g) => `${g.name}: linear ${g.angle}°: ${[...g.stops].sort((a, b) => a.offset - b.offset).map((s) => `${s.hex} @ ${round(s.offset * 100, 0)}%`).join(' → ')}`;
  const list = tokens.gradients.map(expectedStr).join(' | ') || 'Nenhum gradiente cadastrado';
  const title = `Gradiente (${prop}) — ${label}`;

  if (!best) {
    return check({
      category: 'gradiente',
      title,
      status: 'fail',
      found: foundStr,
      expected: list,
      suggestion: 'Número de stops não corresponde a nenhum gradiente aprovado. Aplique um dos gradientes cadastrados ou troque por cor sólida da paleta.',
      objects: [label],
    });
  }
  const { g, maxDE, maxOff, aDiff } = best;
  const pass = maxDE <= (tol.deltaEPass ?? 3) && aDiff <= angleTol && maxOff <= offTol;
  const warn = maxDE <= (tol.deltaEWarn ?? 6) && aDiff <= angleTol * 2 && maxOff <= offTol * 2;
  const problems = [];
  if (maxDE > (tol.deltaEPass ?? 3)) problems.push(`cores dos stops (ΔE máx ${round(maxDE)})`);
  if (aDiff > angleTol) problems.push(`ângulo (${r1(angle)}° vs ${g.angle}°)`);
  if (maxOff > offTol) problems.push(`posição dos stops (desvio ${round(maxOff * 100, 0)}%)`);
  return check({
    category: 'gradiente',
    title: pass ? `Gradiente aprovado (${g.name}) — ${label}` : title,
    status: pass ? 'pass' : warn ? 'warn' : 'fail',
    found: foundStr,
    expected: expectedStr(g),
    suggestion: pass ? null : `Ajuste ${problems.join(', ')} para reproduzir exatamente o gradiente "${g.name}".`,
    objects: [label],
  });
}

// ======================================================================
// Fundo por trás de um ponto (para contraste, logomarca e QR code)
// ======================================================================

/**
 * Retorna um resolvedor: dado um nó e um ponto (coordenadas absolutas do
 * canvas), devolve o que está pintado imediatamente abaixo dele:
 *   { kind: 'solid', color } | { kind: 'gradient', colors, node } |
 *   { kind: 'image', node } | { kind: 'unknown' }
 */
function makeBackgroundResolver(nodes, doc) {
  const canvasBg = () => {
    if (doc.backgroundImage) return { kind: 'image', node: { label: 'Imagem de fundo do canvas' } };
    if (isGradient(doc.background)) {
      return { kind: 'gradient', colors: doc.background.colorStops.map((s) => parseColor(s.color)).filter(Boolean), node: { label: 'Fundo do canvas' } };
    }
    const c = parseColor(doc.background);
    if (c && c.a > 0) return { kind: 'solid', color: flatten(c), node: { label: 'Fundo do canvas' } };
    return { kind: 'unknown', node: { label: 'Fundo transparente' } };
  };

  const contains = (n, p) => {
    try {
      if (n.obj.width && n.obj.height) return n.obj.containsPoint(p);
    } catch {
      /* cai no bbox */
    }
    const b = n.absBbox;
    return p.x >= b.left && p.x <= b.left + b.width && p.y >= b.top && p.y <= b.top + b.height;
  };

  const resolveBelow = (order, p, depth = 0) => {
    for (let i = order - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.kind === 'text' || n.kind === 'icon') continue;
      if (n.opacity === 0 || !contains(n, p)) continue;
      if (n.kind === 'image' || n.kind === 'logo' || n.kind === 'qrcode' && isImage(n.raw)) return { kind: 'image', node: n };
      const fill = n.raw.fill;
      if (isGradient(fill)) {
        return { kind: 'gradient', colors: fill.colorStops.map((s) => parseColor(s.color)).filter(Boolean), node: n };
      }
      const c = parseColor(fill);
      if (!c || c.a === 0) continue;
      const alpha = c.a * n.opacity;
      if (alpha >= 0.999 || depth > 4) return { kind: 'solid', color: { ...c, a: 1 }, node: n };
      const under = resolveBelow(i, p, depth + 1);
      if (under.kind !== 'solid') return { ...under, partial: true };
      return { kind: 'solid', color: flatten({ ...c, a: alpha }, under.color), node: n };
    }
    return canvasBg();
  };

  return (node, p) => resolveBelow(node.order, p);
}

function samplePoints(b, inset = 0.12) {
  const ix = b.width * inset;
  const iy = b.height * inset;
  return [
    new Point(b.left + b.width / 2, b.top + b.height / 2),
    new Point(b.left + ix, b.top + iy),
    new Point(b.left + b.width - ix, b.top + iy),
    new Point(b.left + ix, b.top + b.height - iy),
    new Point(b.left + b.width - ix, b.top + b.height - iy),
  ];
}

// ======================================================================
// Contraste
// ======================================================================

function contrastChecks(nodes, resolveBg, tokens) {
  const cfg = tokens.settings.contrast ?? { minNormal: 4.5, minLarge: 3, largeTextPx: 24, largeBoldTextPx: 18.66 };
  const out = [];
  for (const n of nodes.filter((x) => x.kind === 'text')) {
    const raw = n.raw;
    const fills = [raw.fill];
    const styles = Array.isArray(raw.styles) ? raw.styles.map((s) => s.style) : Object.values(raw.styles ?? {}).flatMap((l) => Object.values(l ?? {}));
    styles.forEach((s) => s?.fill && fills.push(s.fill));
    const size = (raw.fontSize ?? 40) * Math.abs(raw.scaleY ?? 1);
    const bold = (Number.parseInt(raw.fontWeight, 10) || (lower(raw.fontWeight) === 'bold' ? 700 : 400)) >= 700;
    const large = size >= cfg.largeTextPx || (bold && size >= cfg.largeBoldTextPx);
    const min = large ? cfg.minLarge : cfg.minNormal;

    let worst = null;
    let unknown = null;
    for (const p of samplePoints(n.absBbox)) {
      const bg = resolveBg(n, p);
      if (bg.kind === 'image' || bg.kind === 'unknown') {
        unknown = bg;
        continue;
      }
      const bgColors = bg.kind === 'solid' ? [bg.color] : bg.colors;
      for (const f of fills) {
        if (isGradient(f)) continue;
        const fc = parseColor(f);
        if (!fc) continue;
        for (const bc of bgColors) {
          const fg = flatten({ ...fc, a: fc.a * n.opacity }, bc);
          const ratio = contrastRatio(fg, bc);
          if (!worst || ratio < worst.ratio) worst = { ratio, fg: toHex(fg), bg: toHex(bc), bgKind: bg.kind, bgLabel: bg.node?.label };
        }
      }
    }

    if (!worst) {
      out.push(
        check({
          category: 'contraste',
          title: `Contraste não verificável — ${n.label}`,
          status: 'manual',
          found: unknown?.kind === 'image' ? `Texto sobre imagem (${unknown.node?.label})` : 'Fundo transparente/indefinido',
          expected: `≥ ${min}:1`,
          suggestion: 'Confira o contraste visualmente ou coloque o texto sobre uma área de cor sólida da paleta.',
          objects: [n.label],
          bbox: n.bbox,
        }),
      );
      continue;
    }
    const ok = worst.ratio >= min;
    out.push(
      check({
        category: 'contraste',
        title: `${ok ? 'Contraste adequado' : 'Contraste insuficiente'} — ${n.label}`,
        status: ok ? (unknown ? 'warn' : 'pass') : 'fail',
        found: `${round(worst.ratio)}:1 (${worst.fg} sobre ${worst.bg}${worst.bgKind === 'gradient' ? ', pior stop do gradiente' : ''})${unknown ? ' — parte do texto está sobre imagem' : ''}`,
        expected: `≥ ${min}:1 (${large ? 'texto grande' : 'texto normal'}, ${r1(size)} px)`,
        suggestion: ok
          ? unknown
            ? 'Parte do texto está sobre imagem: confira visualmente.'
            : null
          : `Use uma cor de texto com mais contraste sobre ${worst.bg} — ${bestTextColor(worst.bg, tokens.colors, min)} — ou mude o fundo.`,
        objects: [n.label],
        bbox: n.bbox,
      }),
    );
  }
  return out;
}

/** Cor da paleta com maior contraste sobre o fundo, para sugerir na correção. */
function bestTextColor(bg, palette, min) {
  const ranked = palette
    .map((p) => ({ p, k: contrastRatio(p.hex, bg) }))
    .filter((x) => x.k != null)
    .sort((a, b) => b.k - a.k);
  if (!ranked.length) return 'uma cor da paleta com contraste adequado';
  const ok = ranked.filter((x) => x.k >= min).slice(0, 2);
  const pick = ok.length ? ok : ranked.slice(0, 1);
  return pick.map((x) => `${x.p.name} ${x.p.hex} (${round(x.k)}:1)`).join(' ou ');
}

// ======================================================================
// Logomarca
// ======================================================================

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function matchOfficialLogo(raw, logos) {
  const ref = raw.gove?.assetId ?? raw.assetId ?? raw.data?.assetId ?? null;
  const base = srcBase(raw.src);
  let logo = logos.find((l) => (ref && (l.file === ref || l.name === ref)) || (base && l.file === base));
  let hashMatch = null;
  let hash = null;
  const buf = String(raw.src ?? '').startsWith('data:') ? dataUrlToBuffer(raw.src) : null;
  if (buf) {
    hash = sha256(buf);
    const byHash = logos.find((l) => l.sha256 && l.sha256 === hash);
    if (byHash) {
      logo = byHash;
      hashMatch = true;
    } else if (logo?.sha256) {
      hashMatch = false;
    }
  }
  return { logo: logo ?? null, hashMatch, buffer: buf, hash, base, ref };
}

async function logoChecks(nodes, resolveBg, tokens, tol) {
  const out = [];
  const logos = nodes.filter((n) => n.kind === 'logo');
  const officialList = tokens.logos.map((l) => `${l.file} (fundo ${l.background === 'dark' ? 'escuro' : 'claro'})`).join(', ');
  if (!logos.length) {
    out.push(
      check({
        category: 'logomarca',
        title: 'Nenhuma logomarca encontrada na peça',
        status: 'warn',
        found: 'Nenhum objeto de imagem aponta para os arquivos oficiais nem está marcado como logo',
        expected: officialList,
        suggestion: 'Inclua a logomarca oficial (ou marque o objeto com gove.role = "logo" se ela já estiver na peça).',
      }),
    );
    return out;
  }

  for (const n of logos) {
    const raw = n.raw;
    const m = matchOfficialLogo(raw, tokens.logos);
    const label = n.label;

    // 1. Arquivo oficial?
    if (!m.logo) {
      out.push(
        check({
          category: 'logomarca',
          title: `Logomarca não oficial — ${label}`,
          status: 'fail',
          found: m.base || m.ref || (m.hash ? `imagem embutida (sha256 ${m.hash.slice(0, 12)}…)` : 'origem desconhecida'),
          expected: officialList,
          suggestion: 'Substitua pelo arquivo oficial da logomarca, sem redesenhar ou exportar de novo.',
          objects: [label],
          bbox: n.bbox,
        }),
      );
      continue;
    }
    const logo = m.logo;
    if (m.hashMatch === false) {
      out.push(
        check({
          category: 'logomarca',
          title: `Arquivo da logomarca alterado — ${label}`,
          status: 'fail',
          found: `Conteúdo difere do oficial (sha256 ${m.hash.slice(0, 12)}…)`,
          expected: `${logo.file} (sha256 ${logo.sha256.slice(0, 12)}…)`,
          suggestion: `Reimporte ${logo.file} a partir de db/assets/logos, sem edição.`,
          objects: [label],
          bbox: n.bbox,
        }),
      );
    } else {
      const how = m.hashMatch ? 'conteúdo idêntico (sha256)' : logo.sha256 ? 'referência por nome de arquivo' : 'referência por nome (sha256 oficial ainda não cadastrado)';
      out.push(
        check({
          category: 'logomarca',
          title: `Arquivo oficial da logomarca — ${logo.file}`,
          status: 'pass',
          found: `${m.base || m.ref || 'imagem embutida'} — ${how}`,
          expected: officialList,
          objects: [label],
        }),
      );
    }

    // 2. Cor: filtros, opacidade e cores embutidas
    if (Array.isArray(raw.filters) && raw.filters.length) {
      out.push(
        check({
          category: 'logomarca',
          title: `Logomarca com filtros de cor — ${label}`,
          status: 'fail',
          found: `Filtros: ${raw.filters.map((f) => f.type).join(', ')}`,
          expected: `Cores originais da versão "${logo.name}": ${logo.colors.join(', ')}`,
          suggestion: 'Remova os filtros; para outro fundo, troque pela outra versão oficial em vez de recolorir.',
          objects: [label],
          bbox: n.bbox,
        }),
      );
    }
    if ((raw.opacity ?? 1) < 1) {
      out.push(
        check({
          category: 'logomarca',
          title: `Logomarca com transparência — ${label}`,
          status: 'warn',
          found: `opacity ${raw.opacity}`,
          expected: 'opacity 1',
          suggestion: 'Use a logomarca com opacidade total.',
          objects: [label],
        }),
      );
    }
    if (m.buffer && m.hashMatch !== true && logo.colors?.length) {
      try {
        const clusters = (await dominantColors(m.buffer, { clusters: 6 })).filter((c) => c.share >= 0.03);
        const missing = logo.colors.filter((hex) => !clusters.some((c) => deltaE(c.hex, hex) <= (tol.deltaEWarn ?? 6)));
        const extra = clusters.filter((c) => c.share >= 0.1 && !logo.colors.some((hex) => deltaE(c.hex, hex) <= (tol.deltaEWarn ?? 6)));
        const ok = !missing.length && !extra.length;
        out.push(
          check({
            category: 'logomarca',
            title: `${ok ? 'Cores da logomarca conferem' : 'Cores da logomarca divergentes'} — ${label}`,
            status: ok ? 'pass' : 'fail',
            found: clusters.map((c) => `${c.hex} (${round(c.share * 100, 0)}%)`).join(', '),
            expected: `Versão "${logo.name}": ${logo.colors.join(', ')}`,
            suggestion: ok ? null : `Use o arquivo oficial ${logo.file} sem recolorir.`,
            objects: [label],
            bbox: n.bbox,
          }),
        );
      } catch {
        /* imagem ilegível: já coberto pela checagem de arquivo */
      }
    }

    // 3. Versão correta para o fundo
    const bg = resolveBg(n, new Point(n.absBbox.left + n.absBbox.width / 2, n.absBbox.top + n.absBbox.height / 2));
    if (bg.kind === 'solid') {
      const bgIsLight = isLight(bg.color);
      const wanted = bgIsLight ? 'light' : 'dark';
      const ok = logo.background === wanted;
      const alt = tokens.logos.find((l) => l.background === wanted);
      out.push(
        check({
          category: 'logomarca',
          title: `${ok ? 'Versão da logomarca adequada ao fundo' : 'Versão da logomarca errada para o fundo'} — ${label}`,
          status: ok ? 'pass' : 'fail',
          found: `Versão "${logo.name}" sobre fundo ${bgIsLight ? 'claro' : 'escuro'} (${toHex(bg.color)})`,
          expected: `Fundo ${bgIsLight ? 'claro' : 'escuro'} → ${alt?.file ?? 'versão correspondente'}`,
          suggestion: ok ? null : `Troque por ${alt?.file ?? 'a versão para fundo ' + (bgIsLight ? 'claro' : 'escuro')}.`,
          objects: [label],
          bbox: n.bbox,
        }),
      );
    } else {
      out.push(
        check({
          category: 'logomarca',
          title: `Fundo da logomarca não é sólido — ${label}`,
          status: 'warn',
          found: bg.kind === 'gradient' ? 'Logomarca sobre gradiente' : bg.kind === 'image' ? `Logomarca sobre imagem (${bg.node?.label})` : 'Fundo indefinido',
          expected: 'Fundo sólido compatível com a versão da logomarca',
          suggestion: 'Confira a legibilidade da logomarca visualmente; prefira área sólida.',
          objects: [label],
          bbox: n.bbox,
        }),
      );
    }

    // 4. Distorção / espelhamento
    const sx = Math.abs(raw.scaleX ?? 1);
    const sy = Math.abs(raw.scaleY ?? 1);
    const distortion = Math.abs(sx / sy - 1);
    const problems = [];
    if (distortion > 0.01) problems.push(`proporção alterada (${round(distortion * 100, 1)}%)`);
    if (raw.flipX || raw.flipY) problems.push('espelhada');
    if (raw.skewX || raw.skewY) problems.push('inclinada (skew)');
    if (problems.length) {
      out.push(
        check({
          category: 'logomarca',
          title: `Logomarca deformada — ${label}`,
          status: 'fail',
          found: problems.join(', '),
          expected: 'Escala proporcional, sem espelhar nem inclinar',
          suggestion: 'Redimensione mantendo a proporção (scaleX = scaleY) e remova flip/skew.',
          objects: [label],
          bbox: n.bbox,
        }),
      );
    } else if (raw.angle) {
      out.push(
        check({
          category: 'logomarca',
          title: `Logomarca rotacionada — ${label}`,
          status: 'warn',
          found: `${r1(raw.angle)}°`,
          expected: '0°',
          suggestion: 'Mantenha a logomarca na horizontal.',
          objects: [label],
        }),
      );
    }
  }
  return out;
}

// ======================================================================
// Ícones
// ======================================================================

function iconChecks(nodes, tokens) {
  const out = [];
  const policy = tokens.settings.icon_policy ?? { mode: 'list' };
  const approvedList = tokens.icons.map((i) => `${i.set}:${i.name}${i.weight ? `:${i.weight}` : ''}`).join(', ');
  const icons = nodes.filter((n) => n.kind === 'icon');

  for (const n of icons) {
    const explicit = explicitIconRef(n.raw) ?? svgIconRef(n.raw);
    const identified = identifyByPaths(collectPaths(n.raw));
    const refs = explicit ? [explicit] : identified;
    const via = explicit ? 'referência no objeto' : identified.length ? 'geometria dos paths' : null;

    if (!refs.length) {
      out.push(
        check({
          category: 'icones',
          title: `Ícone fora dos sets aprovados — ${n.label}`,
          status: 'fail',
          found: 'Paths não correspondem a nenhum ícone Lucide ou Phosphor',
          expected: policy.mode === 'set' ? 'Qualquer ícone Lucide ou Phosphor' : approvedList,
          suggestion: 'Substitua por um ícone Lucide ou Phosphor aprovado (exportado sem editar os paths).',
          objects: [n.label],
          bbox: n.bbox,
        }),
      );
      continue;
    }
    const approved = refs.find((r) => isApprovedIcon(r, tokens.icons, policy));
    const ref = approved ?? refs[0];
    const refStr = `${ref.set}:${ref.name}${ref.weight ? `:${ref.weight}` : ''}`;
    const exists = iconExists(ref.set, ref.name);
    if (approved) {
      out.push(check({ category: 'icones', title: `Ícone aprovado — ${refStr}`, status: 'pass', found: `${refStr} (${via})`, expected: approvedList, objects: [n.label] }));
    } else {
      out.push(
        check({
          category: 'icones',
          title: `Ícone não aprovado — ${refStr}`,
          status: 'fail',
          found: `${refStr} (${via})${exists ? '' : ' — nome inexistente no pacote'}`,
          expected: approvedList,
          suggestion: exists
            ? `O ícone pertence ao set ${ref.set}, mas não está na lista aprovada. Troque por um ícone aprovado ou cadastre-o em brand_tokens.`
            : 'Use um nome de ícone que exista no Lucide/Phosphor e esteja aprovado.',
          objects: [n.label],
          bbox: n.bbox,
        }),
      );
    }
  }

  // Paths pequenos e quadrados não identificados: possíveis ícones customizados.
  for (const n of nodes.filter((x) => x.kind === 'shape' && lower(x.raw.type) === 'path')) {
    const { width, height } = n.bbox;
    const ratio = width / Math.max(1, height);
    if (width <= 160 && height <= 160 && ratio > 0.75 && ratio < 1.33) {
      out.push(
        check({
          category: 'icones',
          title: `Possível ícone não identificado — ${n.label}`,
          status: 'warn',
          found: `Path ${r1(width)}×${r1(height)} px sem correspondência nos sets Lucide/Phosphor`,
          expected: 'Ícones apenas dos sets aprovados',
          suggestion: 'Se for um ícone, substitua por um Lucide/Phosphor aprovado; se for forma decorativa, marque com gove.role = "shape".',
          objects: [n.label],
          bbox: n.bbox,
        }),
      );
    }
  }
  if (!icons.length && !out.length) {
    out.push(check({ category: 'icones', title: 'Nenhum ícone encontrado', status: 'skip' }));
  }
  return out;
}

// ======================================================================
// QR code
// ======================================================================

async function qrChecks(nodes, resolveBg, tokens) {
  const cfg = tokens.settings.qrcode ?? {};
  const white = cfg.backgroundHex ?? '#FFFFFF';
  const maxDE = cfg.backgroundMaxDeltaE ?? 3;
  const out = [];
  const qrs = nodes.filter((n) => n.kind === 'qrcode');
  if (!qrs.length) return [check({ category: 'qrcode', title: 'Nenhum QR code na peça', status: 'skip' })];

  for (const n of qrs) {
    const raw = n.raw;
    const b = n.absBbox;
    // Pontos: centro, cantos e meio das bordas (o fundo deve ser branco sólido em todos).
    const pts = [
      ...samplePoints(b, 0.02),
      new Point(b.left + b.width / 2, b.top + 1),
      new Point(b.left + b.width / 2, b.top + b.height - 1),
      new Point(b.left + 1, b.top + b.height / 2),
      new Point(b.left + b.width - 1, b.top + b.height / 2),
    ];
    const bgs = pts.map((p) => resolveBg(n, p));
    const bad = bgs.find((bg) => bg.kind !== 'solid' || deltaE(bg.color, white) > maxDE);

    // Se o QR é imagem com fundo opaco, o "fundo" efetivo é a zona de silêncio da própria imagem.
    let img = null;
    const buf = isImage(raw) && String(raw.src ?? '').startsWith('data:') ? dataUrlToBuffer(raw.src) : null;
    if (buf) {
      try {
        img = await analyzeQrImage(buf);
      } catch {
        img = null;
      }
    }
    const opaqueImage = img && img.transparentBorder < 0.05;

    if (opaqueImage) {
      const whiteQuiet = deltaE(img.quietZoneColor, white) <= maxDE && img.quietZoneUniformity < 3;
      out.push(
        check({
          category: 'qrcode',
          title: `${whiteQuiet ? 'QR code com zona de silêncio branca' : 'Zona de silêncio do QR code não é branca'} — ${n.label}`,
          status: whiteQuiet ? 'pass' : 'fail',
          found: `Borda ${img.quietZoneColor} (variação ΔE ${round(img.quietZoneUniformity)})`,
          expected: `${white} sólido`,
          suggestion: whiteQuiet ? null : 'Regenere o QR code com fundo branco sólido (POST /api/qrcode).',
          objects: [n.label],
          bbox: n.bbox,
        }),
      );
    }
    if (!opaqueImage || bad) {
      const ok = !bad;
      const kindLabel = bad?.kind === 'gradient' ? 'gradiente' : bad?.kind === 'image' ? `imagem (${bad.node?.label})` : bad?.kind === 'unknown' ? 'fundo transparente/indefinido' : bad ? `cor ${toHex(bad.color)}` : '';
      out.push(
        check({
          category: 'qrcode',
          title: `${ok ? 'QR code sobre fundo branco sólido' : 'QR code fora de fundo branco sólido'} — ${n.label}`,
          // Com imagem opaca e zona de silêncio branca, fundo externo irregular só alerta.
          status: ok ? 'pass' : opaqueImage ? 'warn' : 'fail',
          found: ok ? `Fundo ${toHex(bgs[0].color)}` : `QR code sobre ${kindLabel}`,
          expected: `Fundo ${white} sólido (nunca gradiente ou imagem) — regra fixa da identidade Gove`,
          suggestion: ok ? null : 'Coloque o QR code sobre um retângulo branco sólido com margem de 4 módulos ao redor.',
          objects: [n.label],
          bbox: n.bbox,
        }),
      );
    }

    // Contraste dos módulos
    let moduleContrast = img?.moduleContrast ?? null;
    let moduleColor = img?.moduleColor ?? null;
    if (img && !opaqueImage && moduleColor && bgs[0].kind === 'solid') {
      // QR com fundo transparente: módulos contra o fundo efetivo por trás.
      moduleContrast = contrastRatio(moduleColor, bgs[0].color);
    }
    if (moduleContrast == null && isGroup(raw)) {
      const dark = raw.objects.map((o) => parseColor(o.fill)).filter((c) => c && contrastRatio(c, white) > 1.5)[0];
      if (dark) {
        moduleColor = toHex(dark);
        moduleContrast = contrastRatio(dark, bad ? bad.color ?? white : bgs[0].color ?? white);
      }
    }
    if (moduleContrast != null) {
      const ok = moduleContrast >= (cfg.minModuleContrast ?? 7);
      out.push(
        check({
          category: 'qrcode',
          title: `${ok ? 'Contraste dos módulos adequado' : 'Contraste dos módulos baixo'} — ${n.label}`,
          status: ok ? 'pass' : 'fail',
          found: `${round(moduleContrast)}:1 (módulos ${moduleColor})`,
          expected: `≥ ${cfg.minModuleContrast ?? 7}:1`,
          suggestion: ok ? null : `Use módulos escuros (${cfg.generate?.dark ?? '#1A153A'}) sobre branco.`,
          objects: [n.label],
        }),
      );
    }

    // Tamanho mínimo
    const side = Math.min(n.bbox.width, n.bbox.height);
    const minSize = cfg.minSizePx ?? 150;
    out.push(
      check({
        category: 'qrcode',
        title: `${side >= minSize ? 'Tamanho do QR code adequado' : 'QR code pequeno demais'} — ${n.label}`,
        status: side >= minSize ? 'pass' : 'fail',
        found: `${r1(side)} px`,
        expected: `≥ ${minSize} px`,
        suggestion: side >= minSize ? null : `Aumente o QR code para pelo menos ${minSize} px de lado.`,
        objects: [n.label],
        bbox: n.bbox,
      }),
    );
  }
  return out;
}

// Exportado para testes.
export const _internal = { resolveArtboard, textVariants, matchOfficialLogo, svgIconRef };

/** Arquivos oficiais da logomarca e se já estão em db/assets/logos. */
export function officialLogoFiles(tokens) {
  return tokens.logos.map((l) => ({ ...l, path: join(LOGO_DIR, l.file), present: existsSync(join(LOGO_DIR, l.file)) }));
}
