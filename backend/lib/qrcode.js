// Geração de QR codes compatíveis com a identidade Gove (node-qrcode).
// Regra fixa: módulos escuros sobre fundo BRANCO sólido, com zona de silêncio.
import QRCode from 'qrcode';
import { contrastRatio, deltaE, parseColor, round, toHex } from './color.js';

export function qrRules(tokens) {
  const cfg = tokens.settings.qrcode ?? {};
  return {
    backgroundHex: cfg.backgroundHex ?? '#FFFFFF',
    backgroundMaxDeltaE: cfg.backgroundMaxDeltaE ?? 3,
    quietZoneModules: cfg.quietZoneModules ?? 4,
    minSizePx: cfg.minSizePx ?? 150,
    minModuleContrast: cfg.minModuleContrast ?? 7,
    generate: { dark: '#1A153A', light: '#FFFFFF', errorCorrectionLevel: 'M', margin: 4, width: 600, ...cfg.generate },
  };
}

/**
 * Valida e normaliza as opções pedidas; corrige o que viola a identidade
 * (fundo não branco, pouco contraste, tamanho pequeno) e informa o ajuste.
 */
export function resolveQrOptions(tokens, requested = {}) {
  const rules = qrRules(tokens);
  const adjustments = [];
  const g = rules.generate;
  let dark = requested.dark ?? g.dark;
  let light = requested.light ?? g.light;
  let width = Number(requested.width ?? g.width);
  let margin = Number(requested.margin ?? g.margin);
  const ecl = ['L', 'M', 'Q', 'H'].includes(requested.errorCorrectionLevel) ? requested.errorCorrectionLevel : g.errorCorrectionLevel;

  if (!parseColor(light) || deltaE(light, rules.backgroundHex) > rules.backgroundMaxDeltaE) {
    adjustments.push(`Fundo ${light} substituído por ${rules.backgroundHex}: QR code sempre sobre branco sólido.`);
    light = rules.backgroundHex;
  }
  if (!parseColor(dark) || contrastRatio(dark, light) < rules.minModuleContrast) {
    adjustments.push(`Cor dos módulos ${dark} tem contraste ${round(contrastRatio(dark, light) ?? 0)}:1; usando ${g.dark}.`);
    dark = g.dark;
  }
  if (!Number.isFinite(width) || width < rules.minSizePx) {
    adjustments.push(`Largura ajustada para o mínimo de ${rules.minSizePx} px.`);
    width = rules.minSizePx;
  }
  if (!Number.isFinite(margin) || margin < rules.quietZoneModules) {
    adjustments.push(`Zona de silêncio ajustada para ${rules.quietZoneModules} módulos.`);
    margin = rules.quietZoneModules;
  }
  return {
    options: {
      errorCorrectionLevel: ecl,
      margin,
      width,
      color: { dark: toHex(parseColor(dark)), light: toHex(parseColor(light)) },
    },
    adjustments,
  };
}

export async function generateQr(tokens, text, { format = 'png', ...requested } = {}) {
  if (!text || typeof text !== 'string') throw new Error('Informe o conteúdo do QR code em "text".');
  const { options, adjustments } = resolveQrOptions(tokens, requested);
  const data =
    format === 'svg'
      ? await QRCode.toString(text, { ...options, type: 'svg' })
      : await QRCode.toBuffer(text, { ...options, type: 'png' });
  return { data, format, options, adjustments };
}

/**
 * Objetos Fabric.js prontos para inserir numa peça nova: retângulo branco de
 * base + imagem do QR code marcada com gove.role = "qrcode". Passa na
 * checagem de QR code do Modo A.
 */
export async function qrFabricObjects(tokens, text, { left = 0, top = 0, size, name = 'QR code' } = {}) {
  const rules = qrRules(tokens);
  const side = Math.max(size ?? rules.generate.width, rules.minSizePx);
  const { options } = resolveQrOptions(tokens, { width: side });
  const dataUrl = await QRCode.toDataURL(text, { ...options, type: 'image/png' });
  const common = { originX: 'left', originY: 'top', scaleX: 1, scaleY: 1, angle: 0, opacity: 1 };
  return [
    { ...common, type: 'Rect', name: `${name} — base branca`, gove: { role: 'qrcode-backing' }, left, top, width: side, height: side, fill: rules.backgroundHex, strokeWidth: 0 },
    { ...common, type: 'Image', name, gove: { role: 'qrcode' }, qrData: text, src: dataUrl, left, top, width: side, height: side },
  ];
}
