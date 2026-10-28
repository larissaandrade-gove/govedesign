// Gera src/lib/gove/iconPaths.ts: paths SVG (viewBox 256×256, preenchidos, peso regular)
// de cada ícone dos cards, para o HTML exportado sair com o mesmo desenho do editor.
//   cd lp-builder && npm run icons
// O mapeamento chave → ícone Phosphor vem de src/lib/gove/iconCatalog.ts (fonte única,
// também usada por components/gove/icons.ts). Os SVGs são os oficiais de
// @phosphor-icons/core (dependência da raiz do repositório), como no Print Studio.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(here, "../../node_modules/@phosphor-icons/core/assets/regular");
const OUT = path.resolve(here, "../src/lib/gove/iconPaths.ts");

const jiti = createJiti(import.meta.url);
const { ICON_CATALOG } = await jiti.import(path.resolve(here, "../src/lib/gove/iconCatalog.ts"));

function phosphorPaths(name) {
  const svg = readFileSync(path.join(ASSETS, `${name}.svg`), "utf8");
  if (/<(circle|rect|line|polyline|polygon|ellipse)\b/.test(svg))
    throw new Error(`Ícone ${name}: só paths são suportados`);
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!paths.length) throw new Error(`Ícone Phosphor sem paths: ${name}`);
  return paths;
}

const entries = Object.entries(ICON_CATALOG).map(([key, { phosphor }]) => [
  key,
  phosphorPaths(phosphor),
]);

writeFileSync(
  OUT,
  `// Gerado por scripts/build-icons.mjs (npm run icons) — não editar à mão.\n` +
    `// Ícones Phosphor (MIT), peso regular, viewBox 256×256, preenchidos com a cor do ícone.\n` +
    `export const ICON_VIEWBOX = 256;\n\n` +
    `export const ICON_PATHS: Record<string, readonly string[]> = {\n` +
    entries.map(([key, paths]) => `  ${key}: ${JSON.stringify(paths)},`).join("\n") +
    `\n};\n`,
);
console.log(`${entries.length} ícones gerados em ${path.relative(process.cwd(), OUT)}.`);
