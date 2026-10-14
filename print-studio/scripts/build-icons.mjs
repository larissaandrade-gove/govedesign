// Gera shared/icons.js: paths SVG (viewBox 24×24, traço) dos ícones de serviço
// a partir do pacote `lucide`, para o preview (Fabric.js) e o PDF (pdfkit)
// usarem exatamente a mesma geometria.
//   node print-studio/scripts/build-icons.mjs
import { writeFileSync } from 'node:fs';
import { icons } from 'lucide';

const toPascal = (kebab) => kebab.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

function elementToPath([tag, a]) {
  const n = (k) => Number(a[k] ?? 0);
  switch (tag) {
    case 'path':
      return a.d;
    case 'line':
      return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
    case 'polyline':
    case 'polygon': {
      const pts = String(a.points).trim().split(/[\s,]+/).map(Number);
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      return tag === 'polygon' ? `${d}Z` : d;
    }
    case 'circle': {
      const cx = n('cx'), cy = n('cy'), r = n('r');
      return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
    }
    case 'rect': {
      const x = n('x'), y = n('y'), w = n('width'), h = n('height');
      const r = Math.min(Number(a.rx ?? a.ry ?? 0), w / 2, h / 2);
      if (!r) return `M${x} ${y}h${w}v${h}h${-w}Z`;
      return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
    }
    default:
      throw new Error(`Elemento não suportado: ${tag}`);
  }
}

function lucidePaths(name) {
  const node = icons[toPascal(name)];
  if (!node) throw new Error(`Ícone Lucide inexistente: ${name}`);
  return node.map(elementToPath);
}

// Serviços comuns de prefeitura → ícone Lucide
const SERVICES = [
  ['iptu', 'IPTU', 'house'],
  ['alvara', 'Alvará', 'file-badge'],
  ['certidoes', 'Certidões', 'file-check'],
  ['protocolo', 'Protocolo', 'clipboard-list'],
  ['ouvidoria', 'Ouvidoria', 'megaphone'],
  ['agendamento', 'Agendamento', 'calendar-check'],
  ['matricula', 'Matrícula Escolar', 'graduation-cap'],
  ['saude', 'Saúde', 'heart-pulse'],
  ['nota-fiscal', 'Nota Fiscal', 'receipt'],
  ['segunda-via', '2ª Via de Contas', 'file-text'],
];

// Marca d'água do WhatsApp: aproximação em contorno (balão + telefone do Lucide).
// TODO(gove): substituir pelo contorno oficial do ícone do WhatsApp.
const phone = lucidePaths('phone');
const whatsappOutline = {
  paths: lucidePaths('message-circle'),
  inner: { paths: phone, scale: 0.46, offset: [6.5, 6.4] },
};

const out = {
  services: SERVICES.map(([id, label, lucide]) => ({ id, label, lucide, paths: lucidePaths(lucide) })),
  whatsappOutline,
};

writeFileSync(
  new URL('../shared/icons.js', import.meta.url),
  `// Gerado por scripts/build-icons.mjs — não editar à mão.\n// Ícones Lucide (ISC), viewBox 24×24, desenhados em traço de 2.\n` +
    `export const SERVICE_ICONS = ${JSON.stringify(out.services, null, 2)};\n\n` +
    `export const WHATSAPP_OUTLINE = ${JSON.stringify(out.whatsappOutline, null, 2)};\n`,
);
console.log(`${SERVICES.length} ícones de serviço gerados.`);
