// Tipografia: normalização de família/peso/estilo e variações de referência da
// Montserrat a partir do pacote @fontsource/montserrat.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const FONTSOURCE_DIR = dirname(require.resolve('@fontsource/montserrat/LICENSE'));

const WEIGHT_NAMES = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/** "'Montserrat', Helvetica, sans-serif" → "montserrat" */
export function normalizeFamily(family) {
  if (!family) return '';
  return String(family).split(',')[0].trim().replace(/^['"]|['"]$/g, '').trim().toLowerCase();
}

export function normalizeWeight(weight) {
  if (weight == null || weight === '') return 400;
  if (typeof weight === 'number') return weight;
  const w = String(weight).trim().toLowerCase();
  if (w === 'normal') return 400;
  if (w === 'bold') return 700;
  if (w === 'lighter') return 300;
  if (w === 'bolder') return 800;
  const n = Number.parseInt(w, 10);
  return Number.isFinite(n) ? n : 400;
}

export function normalizeStyle(style) {
  const s = String(style ?? 'normal').trim().toLowerCase();
  return s === 'italic' || s === 'oblique' ? 'italic' : 'normal';
}

/** 700/italic → "Bold Italic"; 400/italic → "Italic" */
export function variantLabel(weight, style) {
  const w = WEIGHT_NAMES[weight] ?? String(weight);
  if (style === 'italic') return weight === 400 ? 'Italic' : `${w} Italic`;
  return w;
}

let _variants;
/**
 * Variações que existem de fato na fonte de referência (@fontsource/montserrat).
 * Retorna um Set com chaves "peso-estilo", ex.: "700-normal", "400-italic".
 */
export function referenceVariants() {
  if (_variants) return _variants;
  _variants = new Set();
  for (const f of readdirSync(FONTSOURCE_DIR)) {
    const m = /^(\d{3})(-italic)?\.css$/.exec(f);
    if (m) _variants.add(`${m[1]}-${m[2] ? 'italic' : 'normal'}`);
  }
  return _variants;
}

/** Caminho do .woff2 (subset latin) de uma variação, para embutir no relatório HTML. */
export function montserratWoff2(weight, style = 'normal') {
  const path = join(FONTSOURCE_DIR, 'files', `montserrat-latin-${weight}-${style}.woff2`);
  return existsSync(path) ? path : null;
}

/** @font-face com as variações aprovadas embutidas em base64 (relatório offline). */
export function embeddedFontFaces(variants) {
  return variants
    .map(({ weight, style }) => {
      const path = montserratWoff2(weight, style);
      if (!path) return '';
      const b64 = readFileSync(path).toString('base64');
      return `@font-face{font-family:'Montserrat';font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
    })
    .join('\n');
}

/**
 * Compara uma combinação família/peso/estilo com as variações aprovadas.
 * @returns { ok, approvedMatch, existsInReference, label }
 */
export function checkFontVariant({ fontFamily, fontWeight, fontStyle }, approvedFonts) {
  const family = normalizeFamily(fontFamily);
  const weight = normalizeWeight(fontWeight);
  const style = normalizeStyle(fontStyle);
  const approvedMatch = approvedFonts.find(
    (f) => normalizeFamily(f.family) === family && f.weight === weight && f.style === style,
  );
  const familyApproved = approvedFonts.some((f) => normalizeFamily(f.family) === family);
  const existsInReference = family === 'montserrat' ? referenceVariants().has(`${weight}-${style}`) : null;
  return {
    ok: Boolean(approvedMatch),
    familyApproved,
    approvedMatch: approvedMatch ?? null,
    existsInReference,
    family,
    weight,
    style,
    label: `${fontFamily ?? '(sem família)'} ${variantLabel(weight, style)}`,
  };
}
