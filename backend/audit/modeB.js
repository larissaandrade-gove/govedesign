// Modo B — Raster (PNG/JPG final, sem dados vetoriais).
//
// Usa sharp para paleta dominante, amostragem de regiões e contraste WCAG.
// LIMITAÇÃO: nenhuma dependência desta stack faz OCR, detecção de texto em
// imagem ou template-matching de logo. Por isso tipografia, logomarca e
// ícones são marcados como "não verificável com confiança neste modo" em vez
// de serem adivinhados. Contraste, margens e QR code só são checados onde as
// coordenadas vierem em metadados (arquivo .regions.json ou chunk PNG
// "gove:regions").
import sharp from 'sharp';
import { contrastRatio, deltaE, nearestPaletteColor, parseColor, round, toHex } from '../lib/color.js';
import { analyzeQrImage, dominantColors, sampleTextRegion } from '../lib/raster.js';
import { check, marginChecks, r1, resolveMargin, spacingChecks } from './common.js';

export const RASTER_LIMITATION =
  'Nenhuma biblioteca desta stack faz OCR, detecção de texto em imagem ou template-matching de logo em imagem rasterizada. ' +
  'Tipografia, presença/validade da logomarca e ícones não são verificáveis com confiança neste modo — revisão manual recomendada.';

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
 * @param {object} [input.regions]    { textRegions:[{x,y,width,height,label,fontSizePx?,bold?}], qrRegions:[…], logoRegions:[…] }
 * @param {string} [input.pieceType]
 * @param {object} input.tokens
 */
export async function auditRaster({ buffer, regions: regionsIn, pieceType, tokens }) {
  const meta = await sharp(buffer).metadata();
  const W = meta.width;
  const H = meta.height;
  const artboard = { left: 0, top: 0, width: W, height: H };
  const regions = regionsIn ?? (await regionsFromImage(buffer)) ?? {};
  const regionSource = regionsIn ? 'arquivo de metadados' : regions.textRegions || regions.qrRegions ? 'chunk PNG gove:regions' : null;
  pieceType = pieceType ?? regions.pieceType ?? null;

  const textRegions = (regions.textRegions ?? []).map((r, i) => normRegion(r, `Região de texto ${i + 1}`, 'text'));
  const qrRegions = (regions.qrRegions ?? []).map((r, i) => normRegion(r, `QR code ${i + 1}`, 'qrcode'));
  const logoRegions = (regions.logoRegions ?? []).map((r, i) => normRegion(r, `Logomarca ${i + 1}`, 'logo'));

  const checks = [];
  const tol = tokens.settings.color_tolerance ?? {};
  const rcfg = tokens.settings.raster ?? {};

  // ---------- Itens não verificáveis neste modo ----------
  checks.push(
    check({
      category: 'tipografia',
      title: 'Tipografia (família, peso e estilo)',
      status: 'manual',
      found: MANUAL,
      expected: tokens.fonts.map((f) => `${f.family} ${f.weight}${f.style === 'italic' ? ' itálico' : ''}`).join(', '),
      suggestion: 'Confira visualmente se todos os textos usam Montserrat nas variações aprovadas, ou reenvie a peça como Fabric.js JSON (Modo A) para checagem exata.',
    }),
    check({
      category: 'logomarca',
      title: 'Presença e validade da logomarca',
      status: 'manual',
      found: logoRegions.length ? `${MANUAL}. Região informada nos metadados: apenas margens e fundo foram avaliados.` : MANUAL,
      expected: tokens.logos.map((l) => l.file).join(', '),
      suggestion: 'Confirme visualmente se a logomarca é um dos arquivos oficiais, na versão de cor certa para o fundo e sem distorção.',
    }),
    check({
      category: 'icones',
      title: 'Ícones dos sets aprovados (Lucide / Phosphor)',
      status: 'manual',
      found: MANUAL,
      expected: tokens.icons.map((i) => `${i.set}:${i.name}`).join(', '),
      suggestion: 'Confira visualmente os ícones ou use o Modo A, que identifica os paths exatos.',
    }),
    check({
      category: 'gradiente',
      title: 'Gradientes aprovados (stops e ângulo)',
      status: 'manual',
      found: MANUAL,
      expected: tokens.gradients.map((g) => g.name).join(', '),
      suggestion: 'Confira os gradientes visualmente ou use o Modo A.',
    }),
  );

  // ---------- Paleta dominante ----------
  const clusters = await dominantColors(buffer, { sampleSize: rcfg.sampleSize ?? 96, clusters: rcfg.clusters ?? 8 });
  const relevant = clusters.filter((c) => c.share >= (rcfg.minShare ?? 0.02));
  let offShare = 0;
  for (const c of relevant) {
    const { match, deltaE: dE, level } = nearestPaletteColor(c.hex, tokens.colors, tol);
    const pct = `${round(c.share * 100, 1)}% da peça`;
    if (level === 'pass') {
      checks.push(check({ category: 'cor', title: `Cor dominante na paleta — ${c.hex} ≈ ${match.name}`, status: 'pass', found: `${c.hex} (${pct}) — ΔE2000 ${round(dE)}`, expected: `${match.hex} (${match.name})` }));
      continue;
    }
    offShare += c.share;
    const fail = c.share >= (rcfg.offPaletteFailShare ?? 0.2) || (level === 'fail' && c.share >= (rcfg.offPaletteWarnShare ?? 0.05));
    checks.push(
      check({
        category: 'cor',
        title: `${level === 'warn' ? 'Cor dominante próxima, mas fora do tom' : 'Cor dominante fora da paleta'} — ${c.hex}`,
        status: fail ? 'fail' : 'warn',
        found: `${c.hex} (${pct}) — ΔE2000 ${round(dE)} de ${match?.hex}`,
        expected: `${match?.hex} (${match?.name}) — ΔE2000 ≤ ${tol.deltaEPass ?? 3}`,
        suggestion: fail
          ? `Substitua ${c.hex} por ${match?.hex} (${match?.name}).`
          : `Pode ser foto, sombra ou antialiasing; se for cor aplicada, troque por ${match?.hex} (${match?.name}).`,
      }),
    );
  }
  checks.push(
    check({
      category: 'cor',
      title: 'Participação de cores fora da paleta',
      status: offShare >= (rcfg.offPaletteFailShare ?? 0.2) ? 'fail' : offShare >= (rcfg.offPaletteWarnShare ?? 0.05) ? 'warn' : 'pass',
      found: `${round(offShare * 100, 1)}% da área em cores fora da paleta (quantização em ${relevant.length} cores dominantes)`,
      expected: `< ${round((rcfg.offPaletteWarnShare ?? 0.05) * 100, 0)}%`,
      details: 'Heurística: fotos e ilustrações elevam esta taxa naturalmente.',
    }),
  );

  // ---------- Contraste (só com região de texto conhecida) ----------
  const contrastCfg = tokens.settings.contrast ?? { minNormal: 4.5, minLarge: 3, largeTextPx: 24, largeBoldTextPx: 18.66 };
  if (!textRegions.length) {
    checks.push(
      check({
        category: 'contraste',
        title: 'Contraste de texto (WCAG)',
        status: 'manual',
        found: 'Coordenadas das regiões de texto não foram fornecidas — checagem pulada',
        expected: `≥ ${contrastCfg.minNormal}:1 (normal) / ≥ ${contrastCfg.minLarge}:1 (grande)`,
        suggestion: 'Envie um .regions.json com textRegions (x, y, width, height) ou use o Modo A.',
      }),
    );
  }
  for (const r of textRegions) {
    const region = clampRegion(r, W, H);
    const s = await sampleTextRegion(buffer, region);
    const fg = r.textColor ? parseColor(r.textColor) : null;
    const bg = r.backgroundColor ? parseColor(r.backgroundColor) : null;
    const fgHex = fg ? toHex(fg) : s.foreground;
    const bgHex = bg ? toHex(bg) : s.background;
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

  // ---------- Margens / espaçamento (a partir das regiões conhecidas) ----------
  const keyNodes = [...textRegions, ...logoRegions, ...qrRegions];
  const margin = resolveMargin(tokens, pieceType, artboard);
  if (keyNodes.length) {
    checks.push(...marginChecks(keyNodes, artboard, margin, { modeNote: 'Calculado a partir das regiões informadas nos metadados.' }));
    checks.push(...spacingChecks(keyNodes, margin));
  } else {
    checks.push(
      check({
        category: 'margens',
        title: 'Margens mínimas',
        status: 'manual',
        found: 'Sem regiões de elementos-chave nos metadados — não é possível medir margens em imagem sem detecção de objetos',
        expected: margin ? `≥ ${r1(margin.minMargin)} px` : 'Margem do tipo de peça',
        suggestion: 'Envie as regiões (textRegions, logoRegions, qrRegions) ou use o Modo A.',
      }),
    );
  }

  // ---------- QR code ----------
  const qrCfg = tokens.settings.qrcode ?? {};
  const white = qrCfg.backgroundHex ?? '#FFFFFF';
  if (!qrRegions.length) {
    checks.push(
      check({
        category: 'qrcode',
        title: 'QR code',
        status: 'manual',
        found: 'Nenhuma região de QR code nos metadados — sem detecção automática nesta stack',
        expected: `QR code sobre ${white} sólido, nunca sobre gradiente ou imagem`,
        suggestion: 'Se a peça tiver QR code, informe qrRegions nos metadados ou confira visualmente.',
      }),
    );
  }
  for (const r of qrRegions) {
    const region = clampRegion(r, W, H);
    const q = await analyzeQrImage(buffer, region);
    const whiteOk = q.quietZoneColor && deltaE(q.quietZoneColor, white) <= (qrCfg.backgroundMaxDeltaE ?? 3) && q.quietZoneUniformity < 3;
    checks.push(
      check({
        category: 'qrcode',
        title: `${whiteOk ? 'QR code sobre fundo branco sólido' : 'QR code fora de fundo branco sólido'} — ${r.label}`,
        status: whiteOk ? 'pass' : 'fail',
        found: `Zona de silêncio ${q.quietZoneColor ?? '—'} (variação ΔE ${round(q.quietZoneUniformity)})`,
        expected: `${white} sólido (nunca gradiente ou imagem) — regra fixa da identidade Gove`,
        suggestion: whiteOk ? null : 'Coloque o QR code sobre um retângulo branco sólido com margem de 4 módulos, ou regenere via POST /api/qrcode.',
        objects: [r.label],
        bbox: r.bbox,
      }),
    );
    if (q.moduleContrast != null) {
      const ok = q.moduleContrast >= (qrCfg.minModuleContrast ?? 7);
      checks.push(
        check({
          category: 'qrcode',
          title: `${ok ? 'Contraste dos módulos adequado' : 'Contraste dos módulos baixo'} — ${r.label}`,
          status: ok ? 'pass' : 'fail',
          found: `${round(q.moduleContrast)}:1 (módulos ${q.moduleColor})`,
          expected: `≥ ${qrCfg.minModuleContrast ?? 7}:1`,
          suggestion: ok ? null : `Use módulos ${qrCfg.generate?.dark ?? '#1A153A'} sobre branco.`,
          objects: [r.label],
        }),
      );
    }
    const side = Math.min(r.width, r.height);
    const minSize = qrCfg.minSizePx ?? 150;
    checks.push(
      check({
        category: 'qrcode',
        title: `${side >= minSize ? 'Tamanho do QR code adequado' : 'QR code pequeno demais'} — ${r.label}`,
        status: side >= minSize ? 'pass' : 'fail',
        found: `${side} px`,
        expected: `≥ ${minSize} px`,
        suggestion: side >= minSize ? null : `Aumente o QR code para pelo menos ${minSize} px.`,
        objects: [r.label],
        bbox: r.bbox,
      }),
    );
  }

  return {
    artboard,
    pieceType,
    checks,
    preview: await sharp(buffer).png().toBuffer(),
    regionSource,
    palette: clusters.map((c) => ({ hex: c.hex, share: round(c.share, 4) })),
  };
}
