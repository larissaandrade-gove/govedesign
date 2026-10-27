// Gera shared/icons.js: paths SVG (viewBox 256×256, preenchidos) dos ícones das peças
// a partir do conjunto oficial Phosphor (@phosphor-icons/core), para o preview e o PDF
// (pdfkit) usarem exatamente a mesma geometria.
//   node print-studio/scripts/build-icons.mjs
// Regras do design system: nas peças, um único peso por peça — os ícones de serviço e a
// marca d'água saem no peso regular; o glifo grande do display (sozinho na peça) no fill.
// Duotone nunca; thin e light nunca em impressos.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// @phosphor-icons/core (dependência da raiz do repositório): um SVG por ícone e peso
const ASSETS = fileURLToPath(new URL('../../node_modules/@phosphor-icons/core/assets', import.meta.url));

function phosphorPaths(name, weight = 'regular') {
  const file = join(ASSETS, weight, weight === 'regular' ? `${name}.svg` : `${name}-${weight}.svg`);
  const svg = readFileSync(file, 'utf8');
  if (/<(circle|rect|line|polyline|polygon|ellipse)\b/.test(svg)) throw new Error(`Ícone ${name}: só paths são suportados`);
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!paths.length) throw new Error(`Ícone Phosphor sem paths: ${name}`);
  return paths;
}

// Serviços comuns de prefeitura → ícone Phosphor
const SERVICES = [
  ['iptu', 'IPTU', 'house'],
  ['alvara', 'Alvará', 'certificate'],
  ['certidoes', 'Certidões', 'seal-check'],
  ['protocolo', 'Protocolo', 'clipboard-text'],
  ['ouvidoria', 'Ouvidoria', 'megaphone'],
  ['agendamento', 'Agendamento', 'calendar-check'],
  ['matricula', 'Matrícula Escolar', 'graduation-cap'],
  ['saude', 'Saúde', 'heartbeat'],
  ['nota-fiscal', 'Nota Fiscal', 'receipt'],
  ['segunda-via', '2ª Via de Contas', 'file-text'],
  // Padrão das referências finais (Kit Itupeva): Saúde, Finanças, Trânsito, Meio Ambiente
  ['financas', 'Finanças', 'currency-dollar'],
  ['transito', 'Trânsito', 'car'],
  ['meio-ambiente', 'Meio Ambiente', 'recycle'],
];

// Ícones de interface da tela do celular (endereço, e-mail, contato)
const UI = { pin: 'map-pin', mail: 'envelope', userPlus: 'user-plus', chevronLeft: 'caret-left', moreVertical: 'dots-three-vertical' };

const out = {
  services: SERVICES.map(([id, label, phosphor]) => ({ id, label, phosphor, paths: phosphorPaths(phosphor) })),
  // Marca d'água do WhatsApp (contorno): logo do WhatsApp do Phosphor, peso regular
  whatsappOutline: { paths: phosphorPaths('whatsapp-logo') },
  // Glifo grande do display: o mesmo desenho no peso fill
  whatsappGlyph: { paths: phosphorPaths('whatsapp-logo', 'fill') },
  ui: Object.fromEntries(Object.entries(UI).map(([k, name]) => [k, phosphorPaths(name)])),
};

writeFileSync(
  new URL('../shared/icons.js', import.meta.url),
  `// Gerado por scripts/build-icons.mjs — não editar à mão.\n// Ícones Phosphor (MIT), viewBox 256×256, preenchidos (peso regular; o glifo do WhatsApp no fill).\n` +
    `export const ICON_VIEWBOX = 256;\n\n` +
    `export const SERVICE_ICONS = ${JSON.stringify(out.services, null, 2)};\n\n` +
    `export const WHATSAPP_OUTLINE = ${JSON.stringify(out.whatsappOutline, null, 2)};\n\n` +
    `export const WHATSAPP_GLYPH = ${JSON.stringify(out.whatsappGlyph, null, 2)};\n\n` +
    `export const UI_ICONS = ${JSON.stringify(out.ui, null, 2)};\n`,
);
console.log(`${SERVICES.length} ícones de serviço gerados.`);
