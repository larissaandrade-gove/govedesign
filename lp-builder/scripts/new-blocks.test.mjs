// Etapa 3 das opções da LP de referência: blocos novos (selo, lista, lista de
// informações, etiquetas, estatísticas, cronograma, FAQ, data, card de pessoa,
// divisória, cabeçalho com menu, rodapé) e o card do formulário RD, no HTML
// exportado, na folha do canvas e nas checagens GOVE e BB.
//
//   node --test lp-builder/scripts/new-blocks.test.mjs
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
const blocks = await jiti.import(path.join(src, "lib/gove/blocks.ts"));
const { registerGoveLogos } = await jiti.import(path.join(src, "lib/gove/goveLogo.ts"));
const { auditPage } = await jiti.import(path.join(src, "lib/gove/audit.ts"));
const tree = await jiti.import(path.join(src, "lib/gove/tree.ts"));
const { adaptColors } = await jiti.import(path.join(src, "lib/gove/blockColors.ts"));
const bb = await jiti.import(path.join(src, "lib/gove/bb.ts"));

const LOGO = "data:image/webp;base64,TE9HTw==";
registerGoveLogos({
  "gove-logo-cor.webp": LOGO,
  "gove-logo-roxo.webp": LOGO,
  "gove-logo-branco.webp": LOGO,
  "gove-logo-branco-amarelo.webp": LOGO,
});

/** Página com uma seção de conteúdo (sem o "auto" do celular) e os blocos dados. */
function pageWith(leaves, extra = {}) {
  const row = f.makeRow(1);
  row.columns[0].children = leaves;
  const section = f.makeSection({ children: [row] });
  delete section.box.paddingYMobile;
  return { version: 1, sections: [section], ...extra };
}

/** Todos os blocos novos, com cabeçalho no topo, formulário em card e rodapé. */
function fullPage(extra = {}) {
  const content = f.makeRow(2);
  content.columns[0].children = [
    f.makeBadge(),
    f.makeList(),
    f.makeInfoList(),
    f.makeTags(),
    f.makeStats(),
    f.makeTimeline(),
  ];
  content.columns[1].children = [
    f.makeFaq(),
    f.makeDate(),
    f.makePerson(),
    f.makeDivider(),
    f.makeDivider({ variant: "space", height: 24 }),
    f.makeRdForm({ snippet: '<div id="rd-form"><input type="text" name="nome"></div>', blockStyle: { ...f.FORM_CARD_STYLE }, fields: f.defaultRdFields() }),
  ];
  const main = f.makeSection({ children: [content] });
  const page = { version: 1, sections: [main], ...extra };
  const links = [{ label: "Programação", target: main.id }, { label: "Inscrição", target: "@form" }];
  const withHeader = tree.addSection(page, f.makeHeaderSection(links));
  return tree.addSection(withHeader, f.makeFooterSection(links));
}

const styleBlock = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];
const VOID = new Set(["img", "br", "hr", "input", "polyline", "path"]);

/** Tags equilibradas no corpo (fora do <style> e dos <script>). */
function assertBalanced(html) {
  const body = html.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<script>[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const [, close, name, self] = m;
    const tag = name.toLowerCase();
    if (self || VOID.has(tag)) continue;
    if (!close) stack.push(tag);
    else assert.equal(stack.pop(), tag, `fecha </${tag}> fora de ordem`);
  }
  assert.deepEqual(stack, [], "toda tag aberta é fechada");
}

test("todos os blocos novos exportam marcação válida e sem JavaScript", () => {
  const page = fullPage();
  const html = exportHtml(page, "x");
  assertBalanced(html);
  assert.ok(!/<script/.test(html), "nenhum <script> (RD Station, sem JS)");
  // Uma marca de cada bloco.
  for (const needle of [
    'class="gove-pulse"',
    "Inscrições abertas",
    "<polyline points=\"20 6 9 17 4 12\">",
    "1px dashed rgba(91,103,112,0.3)",
    'class="gove-tag"',
    'class="gove-stats',
    'class="gove-timeline',
    'class="gove-tl-item"',
    'class="gove-faq',
    ">18</span>",
    ">MS</span>",
    "<hr ",
    'class="gove-navbar',
    'class="gove-nav" aria-label="Menu"',
    'class="gove-cta"',
    'class="gove-footer',
    'class="gove-flinks"',
    '<div id="rd-form">',
  ])
    assert.ok(html.includes(needle), `contém ${needle}`);
  // Links do menu e do rodapé pelas âncoras de anchors.ts.
  const main = page.sections[1];
  assert.ok(html.includes(`<a href="#secao-${main.id}"`));
  // Logo oficial da GOVE (versão pelo fundo Noite) no cabeçalho e no rodapé.
  assert.equal(html.match(/<img src="data:image\/webp;base64,TE9HTw==" alt="GOVE"/g).length, 2);
});

test("blocos novos: o mesmo markup e a mesma folha no canvas e no export", () => {
  const page = fullPage();
  const sheet = sr.pageSheet(page);
  const ctx = { page, bb: false, fonts: bb.pageFonts("gove"), sheet, sectionBg: "#FFFFFF" };
  const html = exportHtml(page, "x");
  for (const leaf of page.sections[1].children[0].columns.flatMap((c) => c.children))
    if (leaf.type !== "rdform") assert.ok(html.includes(blocks.vnodeHtml(blocks.blockTree(leaf, ctx))), `${leaf.type} igual`);
  // Regras de tablet/celular entram no canvas pelo modo escolhido.
  const timeline = page.sections[1].children[0].columns[0].children[5];
  const sel = `.g-${timeline.id}`;
  assert.ok(sheet.toCanvas("mobile").includes(`${sel}{--tl-w:64px !important;--tl-pad:26px !important;}`));
  assert.ok(!sheet.toCanvas("desktop").includes(`${sel}{--tl-w:64px`));
});

test("texto dos blocos novos é escapado (nunca vira HTML)", () => {
  const evil = '<img src=x onerror="alert(1)">';
  const html = exportHtml(
    pageWith([
      f.makeList({ items: [evil] }),
      f.makeTags({ items: [evil] }),
      f.makeFaq({ items: [{ q: evil, a: evil }] }),
      f.makePerson({ name: evil, photo: 'x" onerror="alert(1)' }),
    ]),
    "x",
  );
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes('" onerror="'));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
});

test("FAQ: <details>/<summary> sem JS, um aberto por vez com name e o primeiro aberto", () => {
  const faq = f.makeFaq();
  const html = exportHtml(pageWith([faq]), "x");
  const group = blocks.faqGroup(faq);
  assert.equal(html.match(new RegExp(`<details name="${group}"`, "g")).length, 3);
  assert.equal(html.match(/<details[^>]* open[ >]/g).length, 1, "só o primeiro aberto");
  assert.match(html, /<details name="[^"]+" open style="">|<details name="[^"]+" open>/);
  assert.equal(html.match(/<summary /g).length, 3);
  const css = styleBlock(html);
  assert.ok(css.includes(".gove-lp .gove-faq>details>summary::-webkit-details-marker{display:none;}"));
  assert.ok(css.includes(".gove-lp .gove-faq>details[open]>summary .gove-chev{transform:rotate(180deg);}"));
  // Livre e todos fechados: sem name e sem open.
  const free = exportHtml(pageWith([f.makeFaq({ single: false, firstOpen: false })]), "x");
  assert.ok(!/<details name=/.test(free));
  assert.ok(!/<details[^>]* open/.test(free));
});

test("selo: ponto pulsante com @keyframes, só sem 'reduzir movimento'", () => {
  const html = exportHtml(pageWith([f.makeBadge({ dot: true })]), "x");
  const css = styleBlock(html);
  assert.ok(css.includes("@keyframes gove-badge-pulse{0%{box-shadow:0 0 0 0 var(--gove-pulse);}"));
  const motion = css.match(/@media \(prefers-reduced-motion: no-preference\)\{\n((?:  [^\n]*\n)*?)\}/g).join("\n");
  assert.ok(motion.includes(".gove-lp .gove-pulse{animation:gove-badge-pulse 2s infinite;}"));
  assert.ok(!css.replace(motion, "").includes("animation:gove-badge-pulse"), "a animação fica só no grupo de movimento");
  assert.ok(html.includes("--gove-pulse:rgba(61,0,153,0.7)"));
  // Sem o ponto: nem keyframes nem classe.
  const plain = exportHtml(pageWith([f.makeBadge({ dot: false, variant: "text" })]), "x");
  assert.ok(!plain.includes("gove-badge-pulse"));
});

test("estatísticas, cronograma e rodapé: regras de tablet e celular", () => {
  const stats = f.makeStats({ perRow: 4 });
  const timeline = f.makeTimeline({ timeWidth: 120 });
  const footer = f.makeFooter();
  const css = styleBlock(exportHtml(pageWith([stats, timeline, footer]), "x"));
  const tablet = css.match(/@media \(max-width:980px\)\{\n((?:  [^\n]*\n)*?)\}/)[1];
  const mobile = css.match(/@media \(max-width:640px\)\{\n((?:  [^\n]*\n)*?)\}/)[1];
  assert.ok(tablet.includes(`.g-${stats.id}{grid-template-columns:repeat(2, minmax(0, 1fr)) !important;`));
  assert.ok(mobile.includes(`.g-${timeline.id}{--tl-w:64px !important;--tl-pad:26px !important;}`));
  assert.ok(mobile.includes(`.g-${footer.id}{flex-direction:column;text-align:center;justify-content:center !important;}`));
  // 2 por linha no computador: sem regra de tablet.
  const two = f.makeStats({ perRow: 2 });
  assert.ok(!styleBlock(exportHtml(pageWith([two]), "x")).includes(`.g-${two.id}`));
});

test("cabeçalho: seção especial no topo, fixa com desfoque, scroll-margin-top e menu oculto no tablet", () => {
  const page = fullPage();
  const header = page.sections[0];
  assert.equal(header.role, "header");
  const html = exportHtml(page, "x");
  const css = styleBlock(html);
  const height = sr.stickyHeaderHeight(page);
  assert.equal(height, header.box.paddingY * 2 + 48 + 16);
  assert.ok(css.includes(`.gove-lp section{scroll-margin-top:${height}px;}`));
  assert.ok(css.includes(`.gove-lp .g-${header.id}{position:sticky !important;top:0;z-index:50;}`));
  assert.match(html, new RegExp(`<section id="secao-${header.id}" role="banner" class="g-${header.id}" style="[^"]*backdrop-filter:blur\\(12px\\)`));
  const nav = header.children[0].columns[0].children[0];
  const tablet = css.match(/@media \(max-width:980px\)\{\n((?:  [^\n]*\n)*?)\}/)[1];
  assert.ok(tablet.includes(`.g-${nav.id} .gove-nav{display:none !important;}`));
  // Sem "fixo no topo": nem sticky nem compensação.
  const loose = tree.updateNode(page, nav.id, { sticky: false });
  assert.equal(sr.stickyHeaderHeight(loose), 0);
  assert.ok(!styleBlock(exportHtml(loose, "x")).includes("position:sticky"));
  // Compensação manual vence a automática.
  assert.ok(styleBlock(exportHtml({ ...page, layout: { scrollOffset: 40 } }, "x")).includes("scroll-margin-top:40px"));
});

test("cabeçalho: só um por página, sempre o primeiro, e não se move", () => {
  const page = fullPage();
  const header = page.sections[0];
  assert.equal(tree.addSection(page, f.makeHeaderSection()), page, "segundo cabeçalho não entra");
  assert.equal(tree.moveSibling(page, page.sections[1].id, -1).sections[0].id, header.id, "ninguém passa à frente");
  assert.equal(tree.moveSibling(page, header.id, 1).sections[0].id, header.id, "o cabeçalho não desce");
  assert.deepEqual(tree.siblingInfo(page, header.id), { index: 0, count: 1 });
  assert.equal(tree.siblingInfo(page, page.sections[1].id).index, 0);
  const nav = header.children[0].columns[0].children[0];
  assert.equal(tree.moveLeaf(page, nav.id, page.sections[1].children[0].columns[0].children[0].id), page, "o menu fica no cabeçalho");
  // Blocos novos não entram no cabeçalho selecionado.
  assert.notEqual(tree.firstColumnId(page, nav.id), header.children[0].columns[0].id);
});

test("card do formulário: fundo, raio, preenchimento, sombra e CSS dos campos do RD", () => {
  const rd = f.makeRdForm({ snippet: "<div id=rd></div>", blockStyle: { ...f.FORM_CARD_STYLE }, fields: f.defaultRdFields() });
  const html = exportHtml(pageWith([rd]), "x");
  assert.match(html, new RegExp(`<div class="g-${rd.id}" style="margin:0 0 16px;padding:32px 32px;background-color:#FFFFFF;border-radius:24px;box-shadow:0 24px 60px rgba\\(11,32,39,\\.18\\)"><div id=rd></div></div>`));
  const css = styleBlock(html);
  const sel = `.gove-lp .g-${rd.id}`;
  for (const field of ["select", "textarea", "input:not([type=checkbox])"]) {
    assert.ok(css.includes(`${sel} ${field}`), `inclui ${field}`);
  }
  assert.ok(css.includes(`${sel} select{padding:13px 15px !important;border:1.5px solid #5B6770 !important;border-radius:12px !important;`));
  assert.ok(css.includes(`${sel} textarea:focus{outline:none !important;border-color:#3D0099 !important;box-shadow:0 0 0 4px rgba(61,0,153,0.18) !important;}`));
  // Só os campos (sem card): ainda ganha o invólucro com a classe.
  const only = f.makeRdForm({ snippet: "<i></i>", fields: f.defaultRdFields() });
  assert.ok(exportHtml(pageWith([only]), "x").includes(`<div class="g-${only.id}" style="margin:0 0 16px"><i></i></div>`));
});

test("auditoria GOVE: contraste e tamanho dos textos dos blocos novos", () => {
  const ok = auditPage(fullPage()).filter((i) => i.rule === "Contraste" || i.rule === "Tamanho de texto" || i.rule === "Área de clique");
  assert.deepEqual(ok, [], "padrões passam");
  const badge = f.makeBadge({ color: "#F4F4F4" });
  const date = f.makeDate({ boxColor: "#F4F4F4", bgColor: "#FFC72C" });
  const stats = f.makeStats({ size: 12 });
  const issues = auditPage(pageWith([badge, date, stats]));
  assert.ok(issues.some((i) => i.nodeId === badge.id && i.rule === "Contraste"));
  assert.ok(issues.some((i) => i.nodeId === date.id && i.rule === "Contraste" && i.message.includes("(dia e mês)")));
  assert.ok(issues.some((i) => i.nodeId === stats.id && i.rule === "Tamanho de texto"));
  // Foto sem nome: a foto fica sem texto alternativo.
  const person = f.makePerson({ name: "", photo: "https://x/y.jpg" });
  assert.ok(auditPage(pageWith([person])).some((i) => i.nodeId === person.id && i.rule === "Texto alternativo"));
});

test("BB: página com todos os blocos novos passa na checagem depois do ajuste automático", () => {
  const logo = { ...bb.defaultLogo(), src: "data:image/png;base64,QkI=" };
  const page = fullPage({ identity: "bb", bbLogo: logo });
  const before = bb.bbAudit(page);
  assert.ok(before.length > 0, "cores GOVE são apontadas na BB");
  assert.ok(before.some((i) => i.message.startsWith("Selo")));
  assert.ok(before.some((i) => i.id === "logo-header-bg"), "logo do cabeçalho pede fundo aprovado");
  const fixed = bb.bbHarmonize(page);
  assert.deepEqual(bb.bbAudit(fixed), []);
  assert.deepEqual(bb.bbHarmonize(fixed), fixed, "idempotente");
  const html = exportHtml(fixed, "x");
  // Sem tons translúcidos dos blocos novos na BB; logomarca BB no cabeçalho (sem a faixa separada).
  const body = html.replace(/<style>[\s\S]*?<\/style>/, "");
  const header = body.match(/<section [^>]*role="banner"[\s\S]*?<\/section>/)[0];
  assert.ok(header.includes('alt="Banco do Brasil"'));
  assert.ok(!body.includes('class="bb-logo"'));
  const content = body.match(/<section [^>]*>(?![\s\S]*role="banner")[\s\S]*$/)[0];
  assert.ok(!/rgba\(/.test(content.replace(/box-shadow:[^;"]*/g, "")), "sem cores translúcidas fora das sombras");
  // Fontes BB nos blocos novos.
  assert.ok(content.includes("BancoDoBrasil"));
});

test("bloco novo inserido em fundo escuro (GOVE) ganha cores da paleta que leem", () => {
  const badge = adaptColors(f.makeBadge(), "#20133D");
  assert.equal(badge.color, "#FFFFFF");
  assert.equal(badge.accentColor, "#FFC72C");
  // Fundo claro: as cores-padrão ficam; card com fundo próprio usa o próprio fundo.
  assert.deepEqual(adaptColors(f.makeBadge({ id: "x" }), "#FFFFFF"), f.makeBadge({ id: "x" }));
  const faq = adaptColors(f.makeFaq(), "#20133D");
  assert.equal(faq.color, "#20133D");
  const timeline = adaptColors(f.makeTimeline(), "#3D0099");
  assert.equal(timeline.markerBg, "#3D0099");
  const section = f.makeSection({ box: f.defaultBox({ fill: "gradient", gradientVia: "#3D0099" }), children: [f.makeRow(1)] });
  assert.equal(tree.columnBackground({ version: 1, sections: [section] }, section.children[0].columns[0].id), "#3D0099");
});
