// Regrava a linha de base do HTML exportado (fixtures/export-baseline.json).
// Só rode quando uma mudança no export for INTENCIONAL e estiver documentada
// em export-baseline.test.mjs.
//
//   node lp-builder/scripts/export-baseline.mjs
import fs from "node:fs";
import path from "node:path";
import { BASELINE_FILE, buildFixturePages, jiti } from "./export-fixtures.mjs";

const src = path.resolve(path.dirname(BASELINE_FILE), "../../src");
const { exportHtml } = await jiti.import(path.join(src, "lib/gove/export.ts"));

const pages = await buildFixturePages();
const fixtures = pages.map(({ name, page }) => ({ name, page, html: exportHtml(page, name) }));
fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(fixtures, null, 1)}\n`);
console.log(`${fixtures.length} páginas → ${path.relative(process.cwd(), BASELINE_FILE)}`);
