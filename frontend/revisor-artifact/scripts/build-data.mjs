// Gera os dados embutidos do build do revisor para o artefato (sem rede, sem fs):
//  - índice de ícones Lucide + Phosphor (todos os pesos) com os `d` originais,
//    comprimido (deflate + base64) — as assinaturas são calculadas no navegador
//    pelo mesmo backend/lib/icons.js, sob demanda;
//  - lista de variações do @fontsource/montserrat e os .woff2 (subset latin)
//    usados pelo relatório HTML e pela medição de texto do Fabric.
//   node frontend/revisor-artifact/scripts/build-data.mjs
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, strToU8 } from 'fflate';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const OUT = join(HERE, '..', '.generated');
// Resolve a partir da raiz do repositório (mesmas versões do backend).
const require = createRequire(join(ROOT, 'package.json'));

const load = async (id) => {
  const m = await import(require.resolve(id));
  return m.icons ?? m.default?.icons;
};
const lucideIcons = await load('lucide');
const phosphorMeta = await load('@phosphor-icons/core');
const PH = dirname(dirname(require.resolve('@phosphor-icons/core/assets/regular/acorn.svg')));
const FONTS = dirname(require.resolve('@fontsource/montserrat/LICENSE'));

const lucide = {};
for (const [pascal, node] of Object.entries(lucideIcons)) {
  lucide[pascal] = node.filter(([tag]) => tag === 'path').map(([, a]) => a.d);
}
const phosphor = {};
for (const weight of readdirSync(PH).sort()) {
  phosphor[weight] = readdirSync(join(PH, weight))
    .sort()
    .map((file) => {
      const svg = readFileSync(join(PH, weight, file), 'utf8');
      return [file, [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])];
    });
}
const iconData = { lucide, phosphorNames: phosphorMeta.map((i) => i.name), phosphor };
const packed = Buffer.from(deflateSync(strToU8(JSON.stringify(iconData)), { level: 9 })).toString('base64');

const fontCss = readdirSync(FONTS).filter((f) => /^\d{3}(-italic)?\.css$/.test(f));
// Variações aprovadas (400, 700, 400 itálico, 900) + 600 (relatório HTML) e
// 700 itálico (override comum em styles). Outras variações caem no fallback
// sintético do navegador ao medir texto.
const WOFF = ['400-normal', '400-italic', '600-normal', '700-normal', '700-italic', '900-normal'];
const woff2 = Object.fromEntries(
  WOFF.map((v) => [`files/montserrat-latin-${v}.woff2`, readFileSync(join(FONTS, 'files', `montserrat-latin-${v}.woff2`)).toString('base64')]),
);

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'data.js'),
  `// Gerado por scripts/build-data.mjs — não editar.\n` +
    `export const ICONS_DEFLATE_B64 = ${JSON.stringify(packed)};\n` +
    `export const FONTSOURCE_FILES = ${JSON.stringify(fontCss)};\n` +
    `export const FONTSOURCE_WOFF2_B64 = ${JSON.stringify(woff2)};\n`,
);
console.log(
  `ícones: ${Object.keys(lucide).length} lucide, ${Object.values(phosphor).reduce((n, l) => n + l.length, 0)} phosphor — ${(packed.length / 1024).toFixed(0)} KiB (base64)`,
);
