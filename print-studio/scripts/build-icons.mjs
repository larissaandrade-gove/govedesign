// Gera shared/icons.js: paths SVG (viewBox 256×256, preenchidos) dos ícones das peças
// a partir do conjunto oficial Phosphor (@phosphor-icons/core), para o preview e o PDF
// (pdfkit) usarem exatamente a mesma geometria.
//   node print-studio/scripts/build-icons.mjs
// Regras do design system: nas peças, um único peso por peça — os ícones de serviço e a
// marca d'água saem no peso regular; o glifo grande do display (sozinho na peça) no fill.
// Duotone nunca; thin e light nunca em impressos.
// O logo do WhatsApp (marca d'água e glifo do display) é o glifo oficial — balão
// com o fone — de assets/whatsapp-logo.svg (Simple Icons, CC0), reescalado para 256.
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

/**
 * Reescala um path SVG (viewBox `from`) para o viewBox 256, inclusive arcos,
 * com a mesma margem interna dos ícones Phosphor (24 de 256) para manter o
 * tamanho aparente nas peças.
 */
const PAD = 24;
function scalePath(d, from) {
  const k = (256 - 2 * PAD) / from;
  const out = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)/g;
  let cmd = '';
  let i = 0; // posição do número dentro dos parâmetros do comando
  const fmt = (n) => String(Math.round(n * 1000) / 1000);
  let m;
  const src = d.replace(/([aA])([^a-zA-Z]*)/g, (_, c, args) => {
    // Arcos: as bandeiras podem vir coladas ("01-5.03"); separa em números
    const nums = [];
    const t = args.match(/-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
    let j = 0;
    for (let tok of t) {
      while (tok.length) {
        if (j % 7 === 3 || j % 7 === 4) {
          nums.push(tok[0]);
          tok = tok.slice(1);
        } else {
          nums.push(tok);
          tok = '';
        }
        j++;
      }
    }
    return `${c}${nums.join(' ')} `;
  });
  while ((m = re.exec(src))) {
    if (m[1]) {
      cmd = m[1];
      i = 0;
      out.push(cmd);
      continue;
    }
    const n = Number(m[2]);
    const arc = cmd === 'a' || cmd === 'A';
    const keep = arc && [2, 3, 4].includes(i % 7); // rotação e bandeiras não escalam
    // Coordenadas absolutas (comandos maiúsculos) ganham a margem
    const abs = cmd !== cmd.toLowerCase() && (!arc || [5, 6].includes(i % 7));
    out.push(keep ? m[2] : fmt(n * k + (abs ? PAD : 0)));
    i++;
  }
  return out.join(' ').replace(/ ([MmLlHhVvCcSsQqTtAaZz]) /g, '$1').replace(/^ /, '');
}

function whatsappPaths() {
  const svg = readFileSync(fileURLToPath(new URL('../assets/whatsapp-logo.svg', import.meta.url)), 'utf8');
  const vb = Number(/viewBox="0 0 (\d+(?:\.\d+)?) /.exec(svg)[1]);
  return [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => scalePath(m[1], vb));
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
  // Marca d'água (translúcida) e glifo grande do display: o logo oficial do WhatsApp
  whatsappOutline: { paths: whatsappPaths() },
  whatsappGlyph: { paths: whatsappPaths() },
  ui: Object.fromEntries(Object.entries(UI).map(([k, name]) => [k, phosphorPaths(name)])),
};

writeFileSync(
  new URL('../shared/icons.js', import.meta.url),
  `// Gerado por scripts/build-icons.mjs — não editar à mão.\n// Ícones Phosphor (MIT), viewBox 256×256, preenchidos (peso regular). WhatsApp: logo oficial (Simple Icons, CC0).\n` +
    `export const ICON_VIEWBOX = 256;\n\n` +
    `export const SERVICE_ICONS = ${JSON.stringify(out.services, null, 2)};\n\n` +
    `export const WHATSAPP_OUTLINE = ${JSON.stringify(out.whatsappOutline, null, 2)};\n\n` +
    `export const WHATSAPP_GLYPH = ${JSON.stringify(out.whatsappGlyph, null, 2)};\n\n` +
    `export const UI_ICONS = ${JSON.stringify(out.ui, null, 2)};\n`,
);
console.log(`${SERVICES.length} ícones de serviço gerados.`);
