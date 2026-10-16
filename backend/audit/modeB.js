// Modo B — Imagem (PNG/JPG final, sem dados vetoriais).
//
// Foco: cor da logomarca (e contraste dela com o fundo), cor do texto e
// contraste — onde as coordenadas vierem em metadados (arquivo .regions.json
// ou chunk PNG "gove:regions"). Gradientes e fotos não são analisados.
// LIMITAÇÃO: nenhuma dependência desta stack faz OCR ou detecção de objetos em
// imagem. Por isso tipografia e tamanho de texto são marcados como "não
// verificável com confiança neste modo" em vez de serem adivinhados.
import sharp from 'sharp';
import { contrastRatio, parseColor, round, toHex } from '../lib/color.js';
import { rawPixels, sampleTextRegion } from '../lib/raster.js';
import { check, r1 } from './common.js';
import { docSettings, pixelColors, verifyLogos, verifyTextColors } from './docModel.js';

export const RASTER_LIMITATION =
  'Nenhuma biblioteca desta stack faz OCR, detecção de texto em imagem ou template-matching de logo em imagem rasterizada. ' +
  'Tipografia e tamanho de texto não são verificáveis com confiança neste modo — revisão manual recomendada.';

const MANUAL = 'Não verificável com confiança neste modo — revisão manual recomendada';

/**
 * Lê as regiões do chunk de texto PNG "gove:regions", se existir.
 * Formato igual ao do arquivo .regions.json.
 */
export async function regionsFromImage(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    const c = (meta.comments ?? []).find((x) => x.keyword === 'gove:regions');
    return c ? JSON.parse(c.text) : null;
  } catch {
    return null;
  }
}

function normRegion(r, fallbackLabel, kind) {
  const x = Math.round(r.x ?? r.left ?? 0);
  const y = Math.round(r.y ?? r.top ?? 0);
  const width = Math.round(r.width ?? r.w ?? 0);
  const height = Math.round(r.height ?? r.h ?? 0);
  return { ...r, kind, label: r.label ?? fallbackLabel, x, y, width, height, bbox: { left: x, top: y, width, height } };
}

function clampRegion(r, W, H) {
  const left = Math.max(0, Math.min(W - 1, r.x));
  const top = Math.max(0, Math.min(H - 1, r.y));
  const width = Math.max(1, Math.min(W - left, r.width - (left - r.x)));
  const height = Math.max(1, Math.min(H - top, r.height - (top - r.y)));
  return { left, top, width, height };
}

/**
 * @param {object} input
 * @param {Buffer} input.buffer       PNG/JPG
 * @param {object} [input.regions]    { textRegions:[{x,y,width,height,label,fontSizePx?,bold?}], logoRegions:[…] }
 * @param {string} [input.pieceType]
 * @param {object} input.tokens
 */
export async function auditRaster({ buffer, regions: regionsIn, pieceType, tokens }) {
  const meta = await sharp(buffer).metadata();
  const W = meta.width;
  const H = meta.height;
  const artboard = { left: 0, top: 0, width: W, height: H };
  const regions = regionsIn ?? (await regionsFromImage(buffer)) ?? {};
  const regionSource = regionsIn ? 'arquivo de metadados' : regions.textRegions || regions.logoRegions ? 'chunk PNG gove:regions' : null;
  pieceType = pieceType ?? regions.pieceType ?? null;

  const textRegions = (regions.textRegions ?? []).map((r, i) => normRegion(r, `Região de texto ${i + 1}`, 'text'));
  const logoRegions = (regions.logoRegions ?? []).map((r, i) => normRegion(r, `Logomarca ${i + 1}`, 'logo'));
  const cfg = docSettings(tokens);
  const checks = [];

  // ---------- Itens não verificáveis neste modo ----------
  checks.push(
    check({
      category: 'tipografia',
      title: 'Família tipográfica',
      status: 'manual',
      found: MANUAL,
      expected: cfg.typography.approved.map((a) => `${a.family} (${a.role})`).join(' e '),
      suggestion: 'Confira visualmente se os títulos usam Montserrat e o corpo Inter, ou envie o arquivo-fonte (PPTX, PDF, DOCX, HTML ou Fabric JSON) para checagem exata.',
    }),
    check({
      category: 'tamanhos',
      title: 'Tamanho mínimo de texto (HIG)',
      status: 'manual',
      found: MANUAL,
      expected: `≥ ${cfg.hig.minTextPt} pt`,
      suggestion: 'Confira no arquivo-fonte se nenhum texto ficou abaixo do mínimo.',
    }),
  );

  // ---------- Logomarca: cor e contraste com o fundo ----------
  const logos = [];
  for (const r of logoRegions) {
    const region = clampRegion(r, W, H);
    const px = await rawPixels(buffer, { region, size: 256 });
    // Fundo: anel logo fora da região (a região costuma ser justa à logomarca).
    const pad = Math.max(4, Math.round(Math.min(region.width, region.height) * 0.1));
    const outer = clampRegion({ x: region.left - pad, y: region.top - pad, width: region.width + 2 * pad, height: region.height + 2 * pad }, W, H);
    const ring = await sampleTextRegion(buffer, outer);
    logos.push({
      colors: pixelColors(px),
      where: r.label,
      source: 'região informada nos metadados',
      background: ring.background,
      backgroundNote: 'cor ao redor da região',
      box: { w: r.width, h: r.height },
    });
  }
  for (const c of verifyLogos(logos, tokens, { emptyNote: 'Sem região de logomarca nos metadados (não há detecção automática de logo em imagem)' })) {
    const lr = logoRegions.find((r) => c.objects?.some((o) => String(o).startsWith(r.label)));
    if (lr) c.bbox = lr.bbox;
    checks.push(c);
  }

  // ---------- Texto: cor e contraste (só com região de texto conhecida) ----------
  const contrastCfg = tokens.settings.contrast ?? { minNormal: 4.5, minLarge: 3, largeTextPx: 24, largeBoldTextPx: 18.66 };
  if (!textRegions.length) {
    checks.push(
      check({
        category: 'cor',
        title: 'Cor do texto',
        status: 'manual',
        found: 'Coordenadas das regiões de texto não foram fornecidas — checagem pulada',
        expected: 'Cores da paleta oficial, nunca preto puro',
        suggestion: 'Envie um .regions.json com textRegions (x, y, width, height) ou o arquivo-fonte da peça.',
      }),
      check({
        category: 'contraste',
        title: 'Contraste de texto (WCAG)',
        status: 'manual',
        found: 'Coordenadas das regiões de texto não foram fornecidas — checagem pulada',
        expected: `≥ ${contrastCfg.minNormal}:1 (normal) / ≥ ${contrastCfg.minLarge}:1 (grande)`,
        suggestion: 'Envie um .regions.json com textRegions (x, y, width, height) ou o arquivo-fonte da peça.',
      }),
    );
  }
  const sampledTexts = [];
  for (const r of textRegions) {
    const region = clampRegion(r, W, H);
    const s = await sampleTextRegion(buffer, region);
    const fg = r.textColor ? parseColor(r.textColor) : null;
    const bg = r.backgroundColor ? parseColor(r.backgroundColor) : null;
    const fgHex = fg ? toHex(fg) : s.foreground;
    const bgHex = bg ? toHex(bg) : s.background;
    sampledTexts.push({ text: r.label, color: fgHex, colorNote: fg ? null : 'amostrada por pixel', where: r.label });
    const ratio = contrastRatio(fgHex, bgHex);
    // Tamanho: fontSizePx dos metadados ou, na falta, ~70% da altura da região.
    const size = r.fontSizePx ?? r.height * 0.7;
    const large = size >= contrastCfg.largeTextPx || (r.bold && size >= contrastCfg.largeBoldTextPx);
    const min = large ? contrastCfg.minLarge : contrastCfg.minNormal;
    const ok = ratio >= min;
    const bgSolid = s.borderUniformity < 6;
    checks.push(
      check({
        category: 'contraste',
        title: `${ok ? 'Contraste adequado' : 'Contraste insuficiente'} — ${r.label}`,
        status: ok ? (bgSolid ? 'pass' : 'warn') : 'fail',
        found: `${round(ratio)}:1 (${fgHex} sobre ${bgHex}; cores amostradas por pixel${bgSolid ? '' : ', fundo não uniforme'})`,
        expected: `≥ ${min}:1 (${large ? 'texto grande' : 'texto normal'}, ~${r1(size)} px)`,
        suggestion: ok ? (bgSolid ? null : 'Fundo irregular atrás do texto: confira visualmente.') : `Aumente o contraste entre ${fgHex} e ${bgHex} usando cores da paleta.`,
        objects: [r.label],
        bbox: r.bbox,
      }),
    );
  }
  if (sampledTexts.length) checks.push(...verifyTextColors(sampledTexts, tokens));

  return {
    artboard,
    pieceType,
    checks,
    preview: await sharp(buffer).png().toBuffer(),
    regionSource,
  };
}
