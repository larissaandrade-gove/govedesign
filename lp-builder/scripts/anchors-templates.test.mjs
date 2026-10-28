// Âncoras de seção (botão "Ir para seção da página") e modelos de landing page.
//
//   node --test lp-builder/scripts/anchors-templates.test.mjs
//
// Usa o jiti (já em node_modules, via eslint) para carregar o TypeScript do app.
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
const a = await jiti.import(path.join(src, "lib/gove/anchors.ts"));
const { exportHtml } = await jiti.import(path.join(src, "lib/gove/export.ts"));
const { auditPage } = await jiti.import(path.join(src, "lib/gove/audit.ts"));
const { pageFromPreset } = await jiti.import(path.join(src, "lib/gove/presets.ts"));
const t = await jiti.import(path.join(src, "lib/gove/templates.ts"));

/** Hero com CTA + seção de texto + seção com formulário RD + rodapé. */
function landing(button = {}) {
  const cta = f.makeButton({ label: "Quero me inscrever", ...button });
  const section = (leaves) => {
    const row = f.makeRow(1);
    row.columns[0].children = leaves;
    return f.makeSection({ children: [row] });
  };
  const hero = section([f.makeText({ tag: "h1", content: "Webinar" }), cta]);
  const about = section([f.makeText({ tag: "h2", content: "Sobre o evento" })]);
  const form = section([f.makeRdForm({ snippet: "<form id='rd'></form>" })]);
  const footer = section([f.makeText({ content: "Gove Digital" })]);
  return { page: { version: 1, sections: [hero, about, form, footer] }, cta, hero, about, form, footer };
}

const hrefOf = (html, label) => html.match(new RegExp(`<a href="([^"]*)"[^>]*>${label}</a>`))?.[1];

test("seções e final da página ganham âncoras estáveis no HTML exportado", () => {
  const { page } = landing();
  const html = exportHtml(page, "Teste");
  for (const s of page.sections) assert.ok(html.includes(`<section id="secao-${s.id}"`), s.id);
  assert.ok(html.includes(`id="${a.END_ANCHOR}"`));
  // Rolagem suave só por CSS, respeitando movimento reduzido.
  assert.match(html, /@media \(prefers-reduced-motion: no-preference\)\{html\{scroll-behavior:smooth;\}\}/);
  // Mesmo HTML duas vezes = mesmas âncoras.
  assert.equal(html, exportHtml(page, "Teste"));
});

test("botão 'Formulário de inscrição' aponta para a seção do formulário (sem JS)", () => {
  const { page, form } = landing({ linkMode: "section", target: a.TARGET_FORM });
  const html = exportHtml(page, "Teste");
  assert.equal(hrefOf(html, "Quero me inscrever"), `#secao-${form.id}`);
  assert.ok(!/<script/.test(html), "âncora não depende de script");
});

test("botão para seção específica e para o final da página", () => {
  const { page, about, cta } = landing({ linkMode: "section", target: "" });
  cta.target = about.id;
  assert.equal(hrefOf(exportHtml(page, "x"), "Quero me inscrever"), `#secao-${about.id}`);
  cta.target = a.TARGET_END;
  assert.equal(hrefOf(exportHtml(page, "x"), "Quero me inscrever"), `#${a.END_ANCHOR}`);
});

test("botões antigos (URL externa) continuam iguais", () => {
  const { page } = landing({ href: "https://gove.digital/inscricao" });
  assert.equal(hrefOf(exportHtml(page, "x"), "Quero me inscrever"), "https://gove.digital/inscricao");
});

test("seção de destino excluída: cai no formulário e gera aviso", () => {
  const { page, about, form, cta } = landing({ linkMode: "section" });
  cta.target = about.id;
  page.sections = page.sections.filter((s) => s.id !== about.id);
  const link = a.resolveButtonLink(page, cta);
  assert.equal(link.missing, true);
  assert.equal(link.href, `#secao-${form.id}`);
  assert.equal(hrefOf(exportHtml(page, "x"), "Quero me inscrever"), `#secao-${form.id}`);
  assert.ok(auditPage(page).some((i) => i.rule === "Link do botão" && i.severity === "warning"));
  // Sem formulário: final da página.
  page.sections = page.sections.filter((s) => s.id !== form.id);
  assert.equal(a.resolveButtonLink(page, cta).href, `#${a.END_ANCHOR}`);
});

test("rótulos das seções para o seletor", () => {
  const { page, form, about, footer } = landing();
  assert.equal(a.sectionLabel(page, form), "3. Formulário de inscrição");
  assert.equal(a.sectionLabel(page, about), "2. Sobre o evento");
  assert.equal(a.sectionLabel(page, footer), "4. Rodapé");
});

test("CTA dos layouts de hero leva ao formulário por padrão", () => {
  for (const identity of ["gove", "bb"])
    for (const id of ["centered", "split"]) {
      const page = pageFromPreset(id, identity);
      const button = page.sections[0].children[0].columns[0].children.find((l) => l.type === "button");
      assert.equal(button.linkMode, "section", `${id}/${identity}`);
      assert.equal(button.target, a.TARGET_FORM);
    }
});

test("modelos iniciais: layouts antigos publicados, nas duas identidades", () => {
  const seeds = t.seedTemplates("2026-01-01T00:00:00.000Z");
  assert.equal(seeds.length, 6);
  for (const s of seeds) {
    assert.equal(s.status, "publicado");
    assert.ok(t.isPublished(s));
    assert.equal(t.hasUnpublishedChanges(s), false);
  }
  assert.deepEqual(new Set(seeds.map(t.templateIdentity)), new Set(["gove", "bb"]));
  assert.equal(new Set(seeds.map((s) => s.id)).size, 6);
});

test("página criada do modelo é cópia independente do snapshot publicado", () => {
  const [seed] = t.seedTemplates();
  const page = t.pageFromTemplate(seed);
  assert.deepEqual(page, seed.publishedDoc);
  page.sections[0].box.bgColor = "#000000";
  assert.notEqual(seed.publishedDoc.sections[0].box.bgColor, "#000000");
  // Editar o rascunho marca "alterações não publicadas" e não muda o que as páginas novas copiam.
  const draft = { ...seed, doc: t.cloneDoc(seed.doc) };
  draft.doc.sections[0].box.paddingY = 8;
  assert.equal(t.hasUnpublishedChanges(draft), true);
  assert.deepEqual(t.pageFromTemplate(draft), seed.publishedDoc);
});

// ── Paleta oficial e ícones no export ──
const { BRAND_SWATCHES, GRADIENT_PRESETS } = await jiti.import(path.join(src, "lib/gove/types.ts"));
const { ICON_PATHS } = await jiti.import(path.join(src, "lib/gove/iconPaths.ts"));
const { ICON_CATALOG } = await jiti.import(path.join(src, "lib/gove/iconCatalog.ts"));

test("paleta Gove: exatamente as 11 cores oficiais, com nome", () => {
  assert.deepEqual(
    BRAND_SWATCHES.map((s) => s.hex),
    ["#F4F4F4", "#20133D", "#FFC72C", "#3D0099", "#351F65", "#2F3539", "#5B6770", "#5AC2CD", "#A278DA", "#16499F", "#FFFFFF"],
  );
  for (const s of BRAND_SWATCHES) assert.ok(s.nome.length > 0, s.hex);
  const ids = GRADIENT_PRESETS.map((g) => `${g.from}>${g.to}`);
  assert.ok(ids.includes("#5AC2CD>#16499F") && ids.includes("#A278DA>#3D0099"));
});

/** Página com um card de ícone. */
function cardPage(icon) {
  const row = f.makeRow(1);
  row.columns[0].children = [f.makeCard({ icon, iconColor: "#3D0099" })];
  return { version: 1, sections: [f.makeSection({ children: [row] })] };
}

test("card exporta o ícone escolhido (Ouvidoria = megafone), não o Check", () => {
  const html = exportHtml(cardPage("Ouvidoria"), "x");
  for (const d of ICON_PATHS.Ouvidoria) assert.ok(html.includes(`d="${d}"`));
  for (const d of ICON_PATHS.Check) assert.ok(!html.includes(`d="${d}"`));
  assert.ok(html.includes('fill="#3D0099"'));
  // Chave legada continua com o próprio desenho; chave desconhecida cai no Check.
  assert.ok(exportHtml(cardPage("BarChart3"), "x").includes(`d="${ICON_PATHS.BarChart3[0]}"`));
  assert.ok(exportHtml(cardPage("NaoExiste"), "x").includes(`d="${ICON_PATHS.Check[0]}"`));
});

test("iconPaths.ts está em dia com o catálogo (rode npm run icons)", () => {
  assert.deepEqual(Object.keys(ICON_PATHS).sort(), Object.keys(ICON_CATALOG).sort());
  assert.equal(ICON_CATALOG.Ouvidoria.phosphor, "megaphone");
});
