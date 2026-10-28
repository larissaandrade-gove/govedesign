// Etapa 2 das opções da LP de referência: aparência de qualquer bloco
// (blockStyle), texto, botão e regras por dispositivo, no HTML exportado e na
// folha de regras do canvas.
//
//   node --test lp-builder/scripts/block-style.test.mjs
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
const bs = await jiti.import(path.join(src, "lib/gove/blockStyle.ts"));
const { parseRich } = await jiti.import(path.join(src, "lib/gove/richText.ts"));
const { auditPage } = await jiti.import(path.join(src, "lib/gove/audit.ts"));
const bb = await jiti.import(path.join(src, "lib/gove/bb.ts"));

/** Página com uma seção (sem o "auto" do celular, salvo pedido) e os blocos dados. */
function pageWith(leaves, extra = {}, sectionOver = {}) {
  const row = f.makeRow(1);
  row.columns[0].children = leaves;
  const section = f.makeSection({ children: [row], ...sectionOver });
  if (!sectionOver.box) delete section.box.paddingYMobile;
  return { version: 1, sections: [section], ...extra };
}
/** Botão sem os efeitos-padrão dos botões novos. */
const button = (over = {}) => f.makeButton({ blockStyle: undefined, ...over });
const styleBlock = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];
/** Separa o bloco de movimento da folha (o que tem regras .g-) do resto do CSS. */
function splitMotion(css) {
  const re = /@media \(prefers-reduced-motion: no-preference\)\{\n((?:  [^\n]*\n)*?)\}/g;
  let motion = "";
  const general = css.replace(re, (all, body) => {
    if (!body.includes(".g-")) return all;
    motion += body;
    return "";
  });
  return { general, motion };
}
const tagStyle = (html, tag) => html.match(new RegExp(`<${tag}[^>]* style="([^"]*)"`))[1];

test("texto: tamanho responsivo vira clamp() no export e o valor do modo no canvas", () => {
  const h1 = f.makeText({ tag: "h1", content: "Título", size: 56, sizeMin: 28 });
  const style = tagStyle(exportHtml(pageWith([h1]), "x"), "h1");
  assert.match(style, /font-size:clamp\(28px, 4\.667vw, 56px\)/);
  assert.equal(bs.fluidFontAt(h1, "desktop"), 56);
  assert.equal(bs.fluidFontAt(h1, "tablet"), 38.3);
  assert.equal(bs.fluidFontAt(h1, "mobile"), 28);
  // Sem mínimo (ou mínimo >= máximo): px fixo, como antes.
  assert.equal(bs.fluidFont({ size: 40 }), "40px");
  assert.equal(bs.fluidFont({ size: 40, sizeMin: 40 }), "40px");
});

test("texto: caixa alta, espaçamento entre letras, altura de linha e h4", () => {
  const eyebrow = f.makeText({ tag: "h4", content: "Webinar gratuito", size: 16, uppercase: true, letterSpacing: 0.14, lineHeight: 1.1 });
  const html = exportHtml(pageWith([eyebrow]), "x");
  assert.match(html, /<h4 style="[^"]*">Webinar gratuito<\/h4>/);
  const style = tagStyle(html, "h4");
  assert.match(style, /line-height:1\.1;text-transform:uppercase;letter-spacing:0\.14em/);
  const neg = exportHtml(pageWith([f.makeText({ letterSpacing: -0.04 })]), "x");
  assert.match(neg, /letter-spacing:-0\.04em/);
  // Padrão: 1.4 e nada de caixa alta.
  const plain = tagStyle(exportHtml(pageWith([f.makeText({ content: "a" })]), "x"), "p");
  assert.match(plain, /line-height:1\.4$/);
});

test("texto rico: **negrito**, ==destaque== em degradê, quebras de linha e escape", () => {
  const leaf = f.makeText({
    tag: "h1",
    content: '<script>alert("x")</script> Gestão ==mais simples== & **forte**\nsegunda linha ** solto',
    highlightFrom: "#5AC2CD",
    highlightTo: "#A278DA",
  });
  const html = exportHtml(pageWith([leaf]), "x");
  assert.ok(!html.includes("<script>alert"), "nunca injeta HTML do conteúdo");
  assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"));
  assert.ok(html.includes("&amp; <strong style=\"font-weight:700;\">forte</strong>"));
  assert.match(
    html,
    /<span class="gove-hl" style="color:#5AC2CD;background-image:linear-gradient\(90deg, #5AC2CD, #A278DA\);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;[^"]*">mais simples<\/span>/,
  );
  assert.ok(html.includes("<br>segunda linha ** solto"), "marcador sem par fica como texto");
  // Atributo não pode escapar do style.
  const evil = f.makeText({ content: "==x==", highlightFrom: '#fff" onmouseover="alert(1)' });
  assert.ok(!exportHtml(pageWith([evil]), "x").includes('" onmouseover="'));
  // Parser: trechos planos com flags.
  assert.deepEqual(parseRich("a **b ==c== d**"), [
    [
      { text: "a ", bold: false, highlight: false },
      { text: "b ", bold: true, highlight: false },
      { text: "c", bold: true, highlight: true },
      { text: " d", bold: true, highlight: false },
    ],
  ]);
  // Identidade BB: destaque só com a cor sólida (sem degradê).
  const bbHtml = exportHtml(pageWith([f.makeText({ content: "==oi==", highlightFrom: "#3333BD" })], { identity: "bb" }), "x");
  assert.match(bbHtml, /<span class="gove-hl" style="color:#3333BD">oi<\/span>/);
});

test("aparência do bloco: espaços, largura máxima pelo alinhamento, caixa e opacidade", () => {
  const text = f.makeText({
    align: "center",
    blockStyle: {
      marginTop: 8,
      marginBottom: 24,
      maxWidth: 640,
      paddingY: 16,
      paddingX: 24,
      bgColor: "#FFFFFF",
      fillOpacity: 10,
      glassBlur: 12,
      borderWidth: 4,
      borderColor: "#FFC72C",
      borderSides: "left",
      radius: 16,
      shadow: "md",
      opacity: 80,
    },
  });
  const style = tagStyle(exportHtml(pageWith([text]), "x"), "p");
  assert.match(style, /^margin:8px auto 24px;/);
  assert.match(style, /max-width:640px;padding:16px 24px;background-color:rgba\(255,255,255,0\.1\);border-left:4px solid #FFC72C;border-radius:16px;box-shadow:0 8px 24px rgba\(11,32,39,\.16\);backdrop-filter:blur\(12px\);-webkit-backdrop-filter:blur\(12px\);opacity:0\.8/);
  const right = f.makeText({ align: "right", blockStyle: { maxWidth: 480 } });
  assert.match(tagStyle(exportHtml(pageWith([right]), "x"), "p"), /^margin:0 0 16px auto;/);
  // Card: vidro e lados da borda no próprio card; o resto do card fica igual.
  const card = f.makeCard({ blockStyle: { borderSides: "block", borderStyle: "dashed", fillOpacity: 50 } });
  const cardHtml = exportHtml(pageWith([card]), "x");
  assert.match(cardHtml, /background-color:rgba\(255,255,255,0\.5\);color:#2F3539;border-top:1px dashed #F4F4F4;border-bottom:1px dashed #F4F4F4;border-radius:16px/);
  // Formulário RD: sem aparência, o snippet sai puro; com aparência, num invólucro.
  const rd = f.makeRdForm({ snippet: "<div id=rd></div>" });
  assert.ok(exportHtml(pageWith([rd]), "x").includes('<div class="gove-col" style="flex:1 1 0;min-width:0;"><div id=rd></div></div>'));
  rd.blockStyle = { maxWidth: 480 };
  assert.ok(exportHtml(pageWith([rd]), "x").includes('<div style="margin:0 0 16px;max-width:480px"><div id=rd></div></div>'));
});

test("botão: tamanhos P/M/G, largura total, ícone, fantasma e sem quebra", () => {
  const a = (leaf, extra) => exportHtml(pageWith([leaf], extra), "x").match(/<a [^>]*style="([^"]*)">([\s\S]*?)<\/a>/);
  assert.match(a(button())[1], /padding:16px 32px/);
  assert.match(a(button({ btnSize: "md" }))[1], /padding:14px 26px/);
  assert.match(a(button({ btnSize: "sm" }))[1], /padding:10px 20px/);
  assert.match(a(button({ fullWidth: "always" }))[1], /^display:flex;[\s\S]*justify-content:center;width:100%/);
  const icon = a(button({ icon: "ArrowRight", iconPos: "right", nowrap: true }));
  assert.match(icon[1], /^display:inline-flex;[\s\S]*align-items:center;gap:8px;white-space:nowrap/);
  assert.match(icon[2], /^<span>Quero saber mais<\/span><svg [^>]*width="1\.15em" height="1\.15em" viewBox="0 0 256 256" fill="currentColor"[^>]*><path d="M/);
  assert.match(a(button({ icon: "ArrowRight" }))[2], /^<svg [\s\S]*<\/svg><span>Quero saber mais<\/span>$/);
  const ghost = a(button({ variant: "ghost", color: "#FFFFFF" }))[1];
  assert.match(ghost, /background-color:transparent;border:2px solid rgba\(255, 255, 255, 0\.35\)/);
  // Largura total só no celular: regra no @media do celular.
  const leaf = button({ fullWidth: "mobile" });
  const css = styleBlock(exportHtml(pageWith([leaf]), "x"));
  const mobile = css.split("@media (max-width:640px)")[1];
  assert.ok(mobile.includes(`.gove-lp .g-${leaf.id}>*{display:flex !important;width:100%;justify-content:center;}`));
});

test("efeitos: hover com transição, clique e menos movimento", () => {
  const card = f.makeCard({ blockStyle: { hover: "topBar", hoverColor: "#5AC2CD", transition: 0.3 } });
  const btn = f.makeButton(); // botões novos: levantar com sombra + afundar
  const html = exportHtml(pageWith([card, btn]), "x");
  assert.match(html, new RegExp(`<div class="g-${card.id}" style="background-color:#FFFFFF`));
  assert.match(html, new RegExp(`<div class="g-${btn.id}" style="text-align:left;margin:0 0 16px"><a `));
  const css = styleBlock(html);
  const { general, motion } = splitMotion(css);
  const c = `.gove-lp .g-${card.id}`;
  assert.ok(general.includes(`${c}:hover{box-shadow:0 24px 60px rgba(11,32,39,.18) !important;}`));
  assert.ok(general.includes(`${c}{position:relative;overflow:hidden;}`));
  assert.ok(general.includes(`${c}::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:#5AC2CD;transform:scaleX(0);transform-origin:left;pointer-events:none;}`));
  assert.ok(general.includes(`${c}:hover::before{transform:scaleX(1);}`));
  assert.ok(!/\.g-[^{]*\{[^}]*translateY/.test(general), "deslocamento só sem 'reduzir movimento'");
  assert.ok(motion.includes(`${c}{transition:transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;}`));
  assert.ok(motion.includes(`${c}:hover{transform:translateY(-4px);}`));
  const b = `.gove-lp .g-${btn.id}>*`;
  assert.ok(general.includes(`${b}:hover{box-shadow:0 14px 32px rgba(255,199,44,0.4) !important;}`));
  assert.ok(motion.includes(`${b}{transition:transform 0.18s ease,`));
  assert.ok(motion.indexOf(`${b}:hover{transform:translateY(-2px);}`) < motion.indexOf(`${b}:active{transform:translateY(1px);}`));
  // Destacar a borda: troca a cor da borda (card com borda) ou anel (sem borda).
  const t = f.makeText({ blockStyle: { hover: "borderHighlight", hoverColor: "#3D0099" } });
  assert.ok(styleBlock(exportHtml(pageWith([t]), "x")).includes(`.g-${t.id}:hover{box-shadow:0 0 0 2px #3D0099 !important;}`));
  // Canvas: a mesma folha, com o hover e o @media de movimento.
  const canvas = sr.pageSheet(pageWith([card])).toCanvas("desktop");
  assert.ok(canvas.includes(`.gove-lp[data-device="desktop"] .g-${card.id}:hover::before{transform:scaleX(1);}`));
  assert.match(canvas, /@media \(prefers-reduced-motion: no-preference\)\{\n  \.gove-lp\[data-device="desktop"\] \.g-/);
  // Bloco sem efeitos: sem classe e sem regra.
  const old = f.makeText({ content: "a" });
  assert.match(exportHtml(pageWith([old]), "x"), /<p style="margin:0 0 16px;/);
});

test("ocultar por dispositivo: @media no export, fora da folha do canvas", () => {
  const leaf = f.makeText({ blockStyle: { hide: { mobile: true } } });
  const desk = f.makeText({ blockStyle: { hide: { desktop: true, tablet: true } } });
  const p = pageWith([leaf, desk], {}, {});
  p.sections[0].hide = { mobile: true };
  const css = styleBlock(exportHtml(p, "x"));
  const sec = p.sections[0].id;
  assert.match(css, new RegExp(`@media \\(max-width:640px\\)\\{\\n  \\.gove-lp \\.g-${sec}\\{display:none !important;\\}\\n  \\.gove-lp \\.g-${leaf.id}\\{display:none !important;\\}`));
  assert.match(css, new RegExp(`@media \\(min-width:981px\\)\\{\\n  \\.gove-lp \\.g-${desk.id}\\{display:none !important;\\}\\n\\}`));
  assert.match(css, new RegExp(`@media \\(min-width:641px\\) and \\(max-width:980px\\)\\{\\n  \\.gove-lp \\.g-${desk.id}\\{display:none !important;\\}\\n\\}`));
  assert.ok(exportHtml(p, "x").includes(`<section id="secao-${sec}" class="g-${sec}"`) || exportHtml(p, "x").includes(`class="g-${sec}"`));
  const sheet = sr.pageSheet(p);
  for (const d of ["desktop", "tablet", "mobile"]) assert.ok(!sheet.toCanvas(d).includes("display:none"), d);
  assert.equal(bs.hiddenLabel({ desktop: true, mobile: true }), "Oculto no computador e no celular");
  assert.ok(bs.hiddenOn({ mobile: true }, "mobile") && !bs.hiddenOn({ mobile: true }, "tablet"));
});

test("seção no celular: 72% automático (88 → 64), manual, e nada nas seções antigas", () => {
  const p = pageWith([f.makeText()], {}, { box: f.defaultBox({ paddingY: 88, paddingYMobile: "auto" }) });
  const id = p.sections[0].id;
  const mobile = styleBlock(exportHtml(p, "x")).split("@media (max-width:640px)")[1];
  assert.ok(mobile.includes(`.gove-lp .g-${id}{padding-top:64px !important;padding-bottom:64px !important;}`));
  p.sections[0].box.paddingYMobile = 40;
  assert.ok(styleBlock(exportHtml(p, "x")).includes(`.g-${id}{padding-top:40px !important;`));
  // Seções novas (fábrica) já vêm com "auto"; antigas (sem o campo) não mudam.
  assert.equal(f.makeSection().box.paddingYMobile, "auto");
  delete p.sections[0].box.paddingYMobile;
  assert.ok(!exportHtml(p, "x").includes("padding-top"));
  // Canvas no modo celular aplica a mesma regra.
  p.sections[0].box.paddingYMobile = "auto";
  assert.ok(sr.pageSheet(p).toCanvas("mobile").includes(`.gove-lp[data-device="mobile"] .g-${id}{padding-top:64px !important;`));
  assert.ok(!sr.pageSheet(p).toCanvas("tablet").includes("padding-top"));
});

test("auditoria: tamanho mínimo no celular, contraste do destaque e área de clique", () => {
  const p = pageWith([
    f.makeText({ content: "Título ==destaque==", size: 40, sizeMin: 14, highlightFrom: "#FFC72C", highlightTo: "#F4F4F4" }),
    f.makeButton({ btnSize: "sm", label: "Pequeno" }),
    f.makeText({ content: "Fundo próprio", color: "#FFFFFF", blockStyle: { bgColor: "#20133D" } }),
  ]);
  const issues = auditPage(p);
  const [t1, b1, t2] = p.sections[0].children[0].columns[0].children;
  assert.ok(issues.some((i) => i.nodeId === t1.id && /14px no celular/.test(i.message)));
  assert.ok(issues.some((i) => i.nodeId === t1.id && /Destaque em degradê/.test(i.message)));
  assert.ok(issues.some((i) => i.nodeId === b1.id && i.rule === "Área de clique" && i.severity === "warning"));
  // Texto branco sobre o fundo próprio Noite: contraste ok.
  assert.ok(!issues.some((i) => i.nodeId === t2.id && i.rule === "Contraste"));
});

test("BB: aparência e destaque só com a paleta; fantasma vira contorno", () => {
  const P = bb.BB_PALETTE;
  const p = pageWith(
    [
      f.makeText({ content: "Olá ==mundo==", color: P.azulEscuro, highlightFrom: "#5AC2CD", blockStyle: { bgColor: "#123456", hover: "topBar", hoverColor: "#5AC2CD" } }),
      f.makeButton({ variant: "ghost", bgColor: P.amareloInstitucional, color: P.azulEscuro }),
    ],
    { identity: "bb" },
  );
  const issues = bb.bbAudit(p);
  const text = JSON.stringify(issues);
  assert.match(text, /fundo #123456 fora da paleta/);
  assert.match(text, /destaque do hover #5AC2CD fora da paleta/);
  assert.match(text, /estilo fantasma/);
  const fixed = bb.bbHarmonize(p);
  const [t, b] = fixed.sections[0].children[0].columns[0].children;
  const palette = new Set(Object.values(P));
  assert.ok(palette.has(t.blockStyle.bgColor) && palette.has(t.blockStyle.hoverColor));
  assert.ok(palette.has(t.highlightFrom) && t.highlightFrom === t.highlightTo);
  assert.notEqual(t.highlightFrom, t.color);
  assert.equal(b.variant, "outline");
  assert.deepEqual(bb.bbAudit(fixed), []);
});
