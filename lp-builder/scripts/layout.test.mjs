// Opções de layout da LP de referência (etapa 1): página, seções/caixas e
// linhas/colunas, no HTML exportado e na folha de regras do canvas.
//
//   node --test lp-builder/scripts/layout.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../src");
const jiti = createJiti(import.meta.url, {
  alias: { "@": src, "./bbFonts": path.join(here, "bb-fonts.stub.ts") },
});

const f = await jiti.import(path.join(src, "lib/gove/factories.ts"));
const { exportHtml } = await jiti.import(path.join(src, "lib/gove/export.ts"));
const sr = await jiti.import(path.join(src, "lib/gove/styleRules.ts"));
const bb = await jiti.import(path.join(src, "lib/gove/bb.ts"));
const { setColumnCount } = await jiti.import(path.join(src, "lib/gove/tree.ts"));

function page(rowOver = {}, boxOver = {}, extra = {}) {
  const row = f.makeRow(2, rowOver);
  row.columns[0].children = [f.makeText({ tag: "h1", content: "Hero" })];
  row.columns[1].children = [f.makeText({ content: "Card" })];
  const section = f.makeSection({ box: f.defaultBox(boxOver), children: [row] });
  // Seções novas ganham o espaçamento "auto" no celular (etapa 2); aqui, só o layout.
  if (!("paddingYMobile" in boxOver)) delete section.box.paddingYMobile;
  return { page: { version: 1, sections: [section], ...extra }, row, section };
}

const styleBlock = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];

test("pontos de quebra: tablet 980 e celular 640, sem a regra antiga de 768", () => {
  const { page: p } = page({}, {}, { layout: { gutterMobile: 18 } });
  const css = styleBlock(exportHtml(p, "x"));
  assert.ok(!css.includes("768px"));
  assert.match(css, /@media \(max-width:980px\)\{\n  \.gove-lp \.gove-row\{flex-direction:column;\}/);
  assert.match(css, /@media \(max-width:640px\)\{\n  \.gove-lp section\{padding-left:18px !important;padding-right:18px !important;\}\n\}/);
  // O tablet vem antes do celular (o celular vence na cascata).
  assert.ok(css.indexOf("max-width:980px") < css.indexOf("max-width:640px"));
});

test("largura do conteúdo, margem do computador e ponta a ponta", () => {
  const { page: p, section } = page({}, {}, { layout: { maxWidth: 1140, gutter: 24 } });
  let html = exportHtml(p, "x");
  assert.ok(html.includes('class="gove-container" style="max-width:1140px;margin:0 auto;padding-left:24px;padding-right:24px;"'));
  assert.match(styleBlock(html), /\.gove-lp \.gove-container\{padding-left:0;padding-right:0;\}/);
  section.box.fullBleed = true;
  html = exportHtml(p, "x");
  assert.ok(html.includes('class="gove-container" style="max-width:none;'));
  p.layout = { maxWidth: "full" };
  section.box.fullBleed = undefined;
  assert.ok(exportHtml(p, "x").includes('style="max-width:none;margin:0 auto;"'));
});

test("rolagem até as âncoras: compensação fixa e automática (sem cabeçalho fixo = nada)", () => {
  const { page: p } = page({}, {}, { layout: { scrollOffset: 90 } });
  assert.match(styleBlock(exportHtml(p, "x")), /\.gove-lp section\{scroll-margin-top:90px;\}/);
  p.layout = {};
  assert.ok(!exportHtml(p, "x").includes("scroll-margin-top"));
});

test("seção: altura mínima, bordas por lado, sombra grande e vidro", () => {
  const { page: p, section } = page({}, {
    minHeight: "screen",
    borderWidth: 4,
    borderColor: "#FFC72C",
    borderSides: "left",
    borderStyle: "dashed",
    shadow: "lg",
    glassBlur: 14,
    fillOpacity: 6,
    bgColor: "#FFFFFF",
  });
  const html = exportHtml(p, "x");
  const style = html.match(/<section [^>]*style="([^"]*)"/)[1];
  assert.match(style, /background-color:rgba\(255,255,255,0\.06\)/);
  assert.match(style, /border-left:4px dashed #FFC72C/);
  assert.ok(!/(^|;)border:/.test(style));
  assert.match(style, /box-shadow:0 24px 60px rgba\(11,32,39,\.18\)/);
  assert.match(style, /min-height:100vh/);
  assert.match(style, /backdrop-filter:blur\(14px\);-webkit-backdrop-filter:blur\(14px\)/);
  section.box.borderSides = "block";
  assert.match(exportHtml(p, "x"), /border-top:4px dashed #FFC72C;border-bottom:4px dashed #FFC72C/);
  section.box.borderSides = "none";
  assert.ok(!/border-(top|left)|;border:/.test(exportHtml(p, "x").match(/<section [^>]*style="([^"]*)"/)[1]));
});

test("decoração: grade de 56px com máscara e até 2 brilhos da paleta, sem vazar", () => {
  const glows = [
    { color: "#5AC2CD", position: "top-left", size: 900, intensity: 28 },
    { color: "#A278DA", position: "top-right", size: 700, intensity: 28 },
    { color: "#FFC72C", position: "center", size: 400, intensity: 50 },
  ];
  const { page: p } = page({}, { fill: "gradient", decor: { grid: true, glows } });
  const html = exportHtml(p, "x");
  assert.match(html, /<section [^>]*style="[^"]*position:relative;overflow:hidden"/);
  assert.match(html, /<div class="gove-decor" aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;background-image:radial-gradient\(900px 495px at 12% -10%, rgba\(90,194,205,0\.28\), transparent 62%\), radial-gradient\(700px 385px at 92% 8%/);
  assert.equal((html.match(/radial-gradient\(\d+px/g) ?? []).length, 2, "no máximo 2 brilhos");
  assert.match(html, /background-size:56px 56px;-webkit-mask-image:radial-gradient\(ellipse at 50% 0%, #000 20%, transparent 78%\)/);
  assert.match(styleBlock(html), /\.gove-lp \.gove-decor~\*\{position:relative;z-index:1;\}/);
});

test("linha: proporção 1.35/0.9, espaços separados, largura máxima e alinhamento", () => {
  const { page: p, row } = page({ ratios: [1.35, 0.9], gap: 56, rowGap: 40, maxWidth: 720, rowAlign: "center", justify: "center" });
  const html = exportHtml(p, "x");
  assert.ok(html.includes('<div class="gove-col" style="flex:1.35 1 0;min-width:0;">'));
  assert.ok(html.includes('<div class="gove-col" style="flex:0.9 1 0;min-width:0;">'));
  assert.match(html, /class="gove-row  g-[a-z0-9]+" style="display:flex;flex-wrap:wrap;gap:40px 56px;/);
  assert.match(html, /max-width:720px;margin-left:auto;margin-right:auto/);
  const css = styleBlock(html);
  assert.ok(css.includes(`.gove-lp .g-${row.id}>.gove-col{text-align:center;}`));
  assert.ok(css.includes(`.gove-lp .g-${row.id}>.gove-col>*{margin-left:auto !important;margin-right:auto !important;}`));
});

test("linha no tablet/celular: empilhar invertido, 2 no tablet, manter", () => {
  const { page: p, row } = page({ stackReverse: true });
  let css = styleBlock(exportHtml(p, "x"));
  assert.match(css, new RegExp(`@media \\(max-width:980px\\)\\{[^}]*\\}[\\s\\S]*\\.gove-lp \\.g-${row.id}\\{flex-direction:column-reverse;\\}`));

  row.responsive = "tablet2";
  row.columns.push(f.makeColumn());
  css = styleBlock(exportHtml(p, "x"));
  const [tablet, mobile] = css.split("@media (max-width:640px)");
  assert.ok(tablet.includes(`.gove-lp .g-${row.id}{flex-direction:row;}`));
  assert.ok(tablet.includes(`.gove-lp .g-${row.id}>.gove-col{flex:1 1 calc(50% - 12px) !important;width:auto;}`));
  assert.ok(mobile.includes(`.gove-lp .g-${row.id}{flex-direction:column-reverse;}`));

  row.responsive = "keep";
  row.ratios = [2, 1, 1];
  css = styleBlock(exportHtml(p, "x"));
  assert.ok(css.includes(`.gove-lp .g-${row.id}>.gove-col:nth-child(1){flex:2 1 0 !important;width:auto;}`));
  assert.ok(!css.includes("max-width:640px"));
});

test("canvas: mesma folha, regras do tablet/celular pelo modo, com escopo", () => {
  const { page: p, row } = page({ responsive: "tablet2" }, {}, { layout: { gutterMobile: 18 } });
  const sheet = sr.pageSheet(p);
  const desktop = sheet.toCanvas("desktop");
  const tablet = sheet.toCanvas("tablet");
  const mobile = sheet.toCanvas("mobile");
  assert.ok(!desktop.includes("flex-direction"));
  assert.ok(!desktop.includes("@media (max-width"));
  assert.ok(tablet.includes('.gove-lp[data-device="tablet"] .gove-row{flex-direction:column;}'));
  assert.ok(tablet.includes(`.gove-lp[data-device="tablet"] .g-${row.id}{flex-direction:row;}`));
  assert.ok(!tablet.includes("18px"));
  assert.ok(mobile.includes('.gove-lp[data-device="mobile"] section{padding-left:18px !important;'));
  // A ordem é a do export: regra do celular depois da do tablet.
  assert.ok(mobile.indexOf(`.g-${row.id}{flex-direction:row;}`) < mobile.indexOf(`.g-${row.id}{flex-direction:column;}`));
  // Gancho para as próximas etapas: :hover, @keyframes e "movimento".
  const s = new sr.Sheet();
  s.add(`${s.node("abc")}:hover`, { transform: "translateY(-2px)" }).keyframes("gove-pulse", "70%{opacity:.5}").add(".x", { transition: "transform .2s" }, "motion");
  assert.equal(s.classOf("abc"), "g-abc");
  assert.match(s.toExport(), /\.gove-lp \.g-abc:hover\{transform:translateY\(-2px\);\}/);
  assert.match(s.toExport(), /@media \(prefers-reduced-motion: no-preference\)\{\n  \.gove-lp \.x\{transition:transform \.2s;\}\n\}/);
  assert.match(s.toCanvas("mobile"), /@keyframes gove-pulse\{70%\{opacity:\.5\}\}/);
});

test("mudar a quantidade de colunas volta a proporção para colunas iguais", () => {
  const { page: p, row } = page({ ratios: [2, 1] });
  const next = setColumnCount(p, row.id, 3);
  assert.equal(next.sections[0].children[0].ratios, undefined);
  assert.deepEqual(setColumnCount(p, row.id, 2).sections[0].children[0].ratios, [2, 1]);
});

test("BB: decoração e vidro só com a paleta, e o fundo translúcido entra na checagem", () => {
  const P = bb.BB_PALETTE;
  const { page: p, section } = page({}, {
    bgColor: P.azulEscuro,
    fillOpacity: 50,
    decor: { grid: true, gridColor: "#123456", glows: [{ color: "#5AC2CD", position: "center", size: 600, intensity: 40 }] },
  }, { identity: "bb" });
  const issues = bb.bbAudit(p);
  const fixed = bb.bbHarmonize(p);
  const d = fixed.sections[0].box.decor;
  const palette = new Set(Object.values(P));
  assert.ok(palette.has(d.gridColor) && palette.has(d.glows[0].color));
  // Translúcido sobre branco: as amostras não são mais só o Azul escuro.
  const samples = bb.boxSamples(section.box, ["#FFFFFF"]);
  assert.ok(samples.length > 1 && !samples.includes(P.azulEscuro));
  assert.ok(issues.some((i) => /decoração #123456 fora da paleta/.test(JSON.stringify(i))));
  assert.ok(!bb.bbAudit(fixed).some((i) => /decoração/.test(JSON.stringify(i))));
});
