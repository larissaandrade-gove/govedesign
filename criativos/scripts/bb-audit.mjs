#!/usr/bin/env node
/**
 * Audit headless do modo Banco do Brasil (e regressão do modo GOVE).
 *
 *   node scripts/bb-audit.mjs            # completo
 *   node scripts/bb-audit.mjs --quick    # 1 variação de texto
 *   node scripts/bb-audit.mjs --no-gove  # sem a regressão GOVE (HEAD × atual)
 *
 * Empacota scripts/bb-audit/entry.ts com o Vite, serve por HTTP e roda no
 * Chromium (Playwright): renderiza todos os layouts × formatos × esquemas BB ×
 * fundos × logomarca e confere sobreposição, contraste ≥ 4,5:1 de cada texto
 * contra os pixels reais e cores 100% da paleta BB. A regressão GOVE compara,
 * pixel a pixel, o renderer atual com o do último commit (git HEAD).
 * Sai com código 1 se algo falhar.
 */
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "..");
const repo = path.resolve(app, "..");
const out = path.join(app, "node_modules/.cache/bb-audit");
const quick = process.argv.includes("--quick");
const withGove = !process.argv.includes("--no-gove");

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, "old"), { recursive: true });

const lib = (entry, name, file) =>
  build({
    configFile: false,
    logLevel: "warn",
    resolve: { alias: [{ find: /^@\//, replacement: path.join(app, "src") + "/" }] },
    build: {
      outDir: out,
      emptyOutDir: false,
      assetsInlineLimit: 100_000_000,
      lib: { entry, name, formats: ["iife"], fileName: () => file },
    },
  });

await lib(path.join(here, "bb-audit/entry.ts"), "bbAudit", "audit.js");

let hasOld = false;
if (withGove) {
  // Renderer e follow-up do último commit + módulos auxiliares atuais.
  const creative = path.join(app, "src/lib/creative");
  try {
    // Os auxiliares (bb, brand, icons, logos) vêm do app atual por caminho
    // absoluto: assim os imports relativos deles (fontes, logos) continuam valendo.
    for (const f of ["renderer.ts", "followup.ts"]) {
      const src = execFileSync("git", ["show", `HEAD:criativos/src/lib/creative/${f}`], { cwd: repo, encoding: "utf8" });
      writeFileSync(
        path.join(out, "old", f),
        src.replace(/from "\.\/(bb|brand|icons|logos)"/g, (_, m) => `from ${JSON.stringify(path.join(creative, m))}`),
      );
    }
    writeFileSync(
      path.join(out, "old/entry.ts"),
      `import { FORMATS, renderCreative } from "./renderer";\nimport { FOLLOWUP_FORMATS, renderFollowup } from "./followup";\n(window as any).__old = { renderCreative, renderFollowup, FORMATS, FOLLOWUP_FORMATS };\n`,
    );
    await lib(path.join(out, "old/entry.ts"), "oldRenderer", "old.js");
    hasOld = true;
  } catch (e) {
    console.warn("Regressão GOVE indisponível:", e.message);
  }
}

writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><meta charset="utf-8"><body>${hasOld ? '<script src="old.js"></script>' : ""}<script src="audit.js"></script>`,
);

const server = createServer((req, res) => {
  const file = path.join(out, decodeURIComponent((req.url ?? "/").split("?")[0]) === "/" ? "index.html" : req.url.slice(1));
  try {
    const body = readFileSync(file);
    res.writeHead(200, { "content-type": file.endsWith(".js") ? "text/javascript" : "text/html" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require("/opt/node22/lib/node_modules/playwright");
}
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(url);
await page.waitForFunction(() => "__bbAudit" in window);
const result = await page.evaluate(
  (o) => window.__bbAudit({ quick: o.quick, old: window.__old }),
  { quick },
);
await browser.close();
server.close();

const c = result.creative;
const f = result.followups;
const g = result.gove;
const show = (label, list) => {
  console.log(`  ${label}: ${list.length}`);
  for (const l of list.slice(0, 8)) console.log(`    - ${l}`);
};
console.log(`Fontes BB carregadas: ${result.fonts.loaded} (document.fonts.check: ${result.fonts.check})`);
console.log(`Criativos BB: ${c.renders} peças, ${c.textsChecked} textos verificados, ${c.protected} com proteção, contraste mínimo ${c.minContrast}:1`);
show("sobreposições", c.overlapFails);
show("contraste < 4,5", c.contrastFails);
show("fora da paleta", c.paletteFails);
show("reprovadas no manual", c.complianceFails);
console.log(`Follow-ups BB: ${f.renders} peças, ${f.textsChecked} textos verificados, ${f.protected} com proteção, contraste mínimo ${f.minContrast}:1`);
show("sobreposições", f.overlapFails);
show("reprovadas", f.fails);
if (hasOld) {
  console.log(`Regressão GOVE (HEAD × atual): ${g.compared} comparações`);
  show("diferenças de pixel", g.diffs);
}
console.log(`Tempo: ${(result.ms / 1000).toFixed(1)} s`);
writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2));

const failed =
  !result.fonts.loaded ||
  c.overlapFails.length + c.contrastFails.length + c.paletteFails.length + c.complianceFails.length > 0 ||
  f.overlapFails.length + f.fails.length > 0 ||
  g.diffs.length > 0;
process.exit(failed ? 1 : 0);
