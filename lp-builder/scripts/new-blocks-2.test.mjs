// Etapa 3b: hover com realce lateral e troca de cor, fundo por coluna, Caixa
// (blocos dentro de blocos), linha do tempo horizontal, carrossel só com CSS
// e "Adicionar à agenda" (Google Agenda) — export, folha, auditorias GOVE/BB
// e helpers da árvore.
//
//   node --test lp-builder/scripts/new-blocks-2.test.mjs
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
const { auditPage } = await jiti.import(path.join(src, "lib/gove/audit.ts"));
const tree = await jiti.import(path.join(src, "lib/gove/tree.ts"));
const bb = await jiti.import(path.join(src, "lib/gove/bb.ts"));
const cal = await jiti.import(path.join(src, "lib/gove/calendar.ts"));

/** Página com uma seção (sem o "auto" do celular) e os blocos dados. */
function pageWith(leaves, { cols = 1, extra = {} } = {}) {
  const row = f.makeRow(cols);
  row.columns[0].children = leaves;
  const section = f.makeSection({ children: [row] });
  delete section.box.paddingYMobile;
  return { version: 1, sections: [section], ...extra };
}

const styleBlock = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];
const media = (css, q) => {
  // O bloco da folha (com quebra de linha), não a rolagem suave de uma linha só.
  const at = css.indexOf(`@media ${q}{\n`);
  return at === -1 ? "" : css.slice(at, css.indexOf("\n}", at));
};
const MOTION = "(prefers-reduced-motion: no-preference)";
const MOBILE = "(max-width:640px)";
const TABLET = "(max-width:980px)";

/** Tags equilibradas no corpo (fora do <style> e dos <script>). */
function assertBalanced(html) {
  const VOID = new Set(["img", "br", "hr", "input", "polyline", "path"]);
  const body = html.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/<script>[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const [, close, name, self] = m;
    const tag = name.toLowerCase();
    if (self || VOID.has(tag)) continue;
    if (!close) stack.push(tag);
    else assert.equal(stack.pop(), tag, `fecha </${tag}> fora de ordem`);
  }
  assert.deepEqual(stack, []);
}

/* ------------------------------------------------------- adicionar à agenda */

test("agenda: link do Google Agenda codificado, datas locais e fuso", () => {
  const ev = {
    title: "Webinar: Gestão & Inovação 2026",
    date: "2026-11-05",
    start: "19:00",
    duration: 90,
    details: "Link: https://exemplo.com/sala?id=1&x=2\nAté lá!",
    location: "Auditório São José",
    tz: "America/Sao_Paulo",
  };
  const url = cal.googleCalendarUrl(ev);
  assert.equal(
    url,
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=Webinar%3A%20Gest%C3%A3o%20%26%20Inova%C3%A7%C3%A3o%202026" +
      "&dates=20261105T190000/20261105T203000" +
      "&ctz=America/Sao_Paulo" +
      "&details=Link%3A%20https%3A%2F%2Fexemplo.com%2Fsala%3Fid%3D1%26x%3D2%0AAt%C3%A9%20l%C3%A1!" +
      "&location=Audit%C3%B3rio%20S%C3%A3o%20Jos%C3%A9",
  );
  // Cada parâmetro volta igual ao decodificar.
  const params = new URL(url).searchParams;
  assert.equal(params.get("text"), ev.title);
  assert.equal(params.get("details"), ev.details);
  assert.equal(params.get("location"), ev.location);
  assert.equal(params.get("ctz"), "America/Sao_Paulo");
});

test("agenda: passa da meia-noite pela duração; término; sem local e descrição", () => {
  const base = { title: "Virada", date: "2026-12-31", start: "23:30", duration: 60, details: "", location: "" };
  assert.match(cal.googleCalendarUrl(base), /dates=20261231T233000\/20270101T003000&ctz=America\/Sao_Paulo$/);
  const byEnd = { ...base, duration: undefined, start: "09:00", end: "10:15", tz: "America/Manaus" };
  assert.match(cal.googleCalendarUrl(byEnd), /dates=20261231T090000\/20261231T101500&ctz=America\/Manaus$/);
  assert.ok(!cal.googleCalendarUrl(base).includes("details="));
});

test("agenda: validação (término antes do início, data inexistente, título vazio)", () => {
  const ok = { title: "X", date: "2026-11-05", start: "10:00", end: "11:00", details: "", location: "" };
  assert.deepEqual(cal.calendarIssues(ok), []);
  assert.ok(cal.calendarIssues({ ...ok, end: "09:00" }).some((m) => m.includes("depois do início")));
  assert.ok(cal.calendarIssues({ ...ok, end: "10:00" }).length);
  assert.ok(cal.calendarIssues({ ...ok, date: "2026-02-31" }).some((m) => m.includes("data")));
  assert.ok(cal.calendarIssues({ ...ok, title: "  " }).some((m) => m.includes("título")));
  assert.ok(cal.calendarIssues({ ...ok, start: "25:00" }).length);
  assert.equal(cal.googleCalendarUrl({ ...ok, end: "09:00" }), "#");
});

test("agenda: botão exporta o link com nova aba, ícone de calendário e auditoria", () => {
  const btn = f.makeCalendarButton({ calendar: { title: "Aula", date: "2026-11-05", start: "08:00", duration: 45, details: "", location: "Sala 2" } });
  const html = exportHtml(pageWith([btn]), "x");
  assert.ok(
    html.includes(
      '<a href="https://calendar.google.com/calendar/render?action=TEMPLATE&amp;text=Aula&amp;dates=20261105T080000/20261105T084500&amp;ctz=America/Sao_Paulo&amp;location=Sala%202" target="_blank" rel="noopener"',
    ),
  );
  assert.ok(/<svg[^>]*aria-hidden="true"><path d="M208,32H184V24/.test(html), "ícone de calendário");
  assert.ok(!/<script/.test(html));
  // Evento incompleto: erro na auditoria.
  const bad = f.makeCalendarButton({ calendar: { title: "Aula", date: "2026-11-05", start: "10:00", end: "09:00", details: "", location: "" } });
  assert.ok(auditPage(pageWith([bad])).some((i) => i.rule === "Adicionar à agenda" && i.message.includes("depois do início")));
});

/* -------------------------------------------------------------- carrossel */

test("carrossel faixa animada: @keyframes, cópia decorativa, pausa e menos movimento", () => {
  const car = f.makeCarousel({ direction: "right" });
  const html = exportHtml(pageWith([car]), "x");
  assertBalanced(html);
  assert.ok(!/<script/.test(html));
  const css = styleBlock(html);
  const sel = `.gove-lp .g-${car.id}`;
  assert.ok(css.includes("@keyframes gove-marquee{from{transform:translateX(0);}to{transform:translateX(-50%);}}"));
  // Sem "menos movimento": a cópia aparece e a faixa anda; com, tudo parado e rolável.
  assert.ok(css.includes(`${sel} .gove-car-dup{display:none !important;}`));
  const motion = media(css, MOTION);
  assert.ok(motion.includes(`${sel}{overflow-x:hidden !important;}`));
  assert.ok(motion.includes(`${sel} .gove-car-dup{display:flex !important;}`));
  assert.ok(motion.includes(`${sel} .gove-car-track{animation:gove-marquee 24s linear infinite reverse;}`), "4 itens × 6s, para a direita");
  assert.ok(motion.includes(`${sel}:hover .gove-car-track{animation-play-state:paused;}`));
  assert.ok(!css.replace(motion, "").includes("animation:gove-marquee"), "a animação só existe no grupo de movimento");
  // A caixa externa corta/rola (nada vaza para a página); a cópia não é lida.
  assert.ok(html.includes("overflow-x:auto;overflow-y:hidden"));
  assert.equal((html.match(/class="gove-car-item gove-car-dup" aria-hidden="true"/g) ?? []).length, 4);
  assert.equal((html.match(/class="gove-car-item"/g) ?? []).length, 4);
  // Metade exata: cada item leva a margem do espaço (sem `gap` no flex).
  assert.ok(html.includes("width:320px;margin-right:24px"));
  assert.ok(html.includes("mask-image:linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)"));
  // Celular: itens com até 280px.
  assert.ok(media(css, MOBILE).includes(`${sel} .gove-car-item{width:280px !important;}`));
});

test("carrossel manual: scroll-snap, sem cópia nem animação; imagens com alt obrigatório", () => {
  const car = f.makeCarousel({
    mode: "swipe",
    kind: "image",
    aspect: "1 / 1",
    fade: false,
    itemWidth: 240,
    items: [
      { title: "", text: "", src: "https://exemplo.com/a.jpg", alt: "Praça central" },
      { title: "", text: "", src: "https://exemplo.com/b.jpg", alt: "" },
    ],
  });
  const page = pageWith([car]);
  const html = exportHtml(page, "x");
  assert.ok(html.includes("scroll-snap-type:x mandatory"));
  assert.ok(html.includes("scroll-snap-align:start"));
  assert.ok(html.includes("aspect-ratio:1 / 1"));
  assert.ok(html.includes('<img src="https://exemplo.com/a.jpg" alt="Praça central" loading="lazy"'));
  assert.ok(!html.includes("gove-car-dup"));
  assert.ok(!styleBlock(html).includes("gove-marquee"));
  assert.ok(!html.includes("mask-image"));
  const alt = auditPage(page).filter((i) => i.rule === "Texto alternativo");
  assert.equal(alt.length, 1);
  assert.ok(alt[0].message.includes("imagem 2"));
});

test("carrossel de texto: contraste dos cards na auditoria e no ajuste BB", () => {
  const car = f.makeCarousel({ bgColor: "#FFC72C", color: "#FFFFFF" });
  assert.ok(auditPage(pageWith([car])).some((i) => i.rule === "Contraste" && i.message.includes("(títulos)")));
  const fixed = bb.bbHarmonize(pageWith([car], { extra: { identity: "bb" } }));
  assert.deepEqual(bb.bbAudit(fixed), []);
});

/* ----------------------------------------------------------------- caixa */

test("caixa: exporta os blocos de dentro (vídeo, imagem, botão) com aparência e hover", () => {
  const video = f.makeVideo({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
  const image = f.makeImage({ src: "https://exemplo.com/foto.jpg", alt: "Equipe" });
  const button = f.makeButton({ label: "Inscreva-se", blockStyle: { hover: "lift2" } });
  const box = f.makeContainer({ children: [video, image, button], blockStyle: { bgColor: "#20133D", radius: 24, paddingY: 32, paddingX: 32, hover: "leftBar" } });
  const html = exportHtml(pageWith([box]), "x");
  assertBalanced(html);
  const open = html.indexOf(`class="gove-box g-${box.id}"`);
  assert.ok(open > 0, "caixa com a classe da folha");
  const inside = html.slice(open);
  for (const needle of ["<iframe src=\"https://www.youtube.com/embed/dQw4w9WgXcQ\"", 'alt="Equipe"', "Inscreva-se"])
    assert.ok(inside.includes(needle), needle);
  assert.ok(html.includes("background-color:#20133D;border-radius:24px"));
  const css = styleBlock(html);
  // Hover da caixa e dos blocos de dentro; o último bloco não soma 16px ao preenchimento.
  assert.ok(css.includes(`.gove-lp .g-${box.id}::before{`));
  assert.ok(media(css, MOTION).includes(`.g-${button.id}>*:hover{transform:translateY(-2px);}`));
  assert.ok(css.includes(".gove-lp .gove-box>:last-child{margin-bottom:0 !important;}"));
});

test("caixa: os blocos de dentro leem sobre o fundo dela (auditoria GOVE e BB)", () => {
  const white = f.makeText({ content: "Texto claro", color: "#FFFFFF" });
  const dark = f.makeContainer({ children: [white], blockStyle: { bgColor: "#20133D" } });
  assert.equal(tree.backgroundBehind(pageWith([dark]), white.id), "#20133D");
  assert.ok(!auditPage(pageWith([dark])).some((i) => i.nodeId === white.id && i.rule === "Contraste"));
  const light = f.makeContainer({ children: [{ ...white, id: "w2" }], blockStyle: { bgColor: "#FFFFFF" } });
  assert.ok(auditPage(pageWith([light])).some((i) => i.nodeId === "w2" && i.rule === "Contraste"));
  // BB: o ajuste automático desce na caixa e acerta o texto sobre o fundo dela.
  const page = bb.bbHarmonize(pageWith([light], { extra: { identity: "bb" } }));
  const inner = page.sections[0].children[0].columns[0].children[0].children[0];
  assert.notEqual(inner.color, "#FFFFFF");
  assert.deepEqual(bb.bbAudit(page), []);
  assert.ok(bb.containerContexts(page).has("w2"));
});

test("caixa: inserir, mover para dentro/fora, duplicar e remover", () => {
  const box = f.makeContainer({ children: [] });
  const text = f.makeText({ content: "Fora" });
  let page = pageWith([box, text]);
  const colId = page.sections[0].children[0].columns[0].id;
  // Biblioteca: com a caixa selecionada, o bloco entra nela; cabeçalho/caixa não.
  assert.equal(tree.insertTargetId(page, box.id, { type: "image" }), box.id);
  assert.equal(tree.insertTargetId(page, box.id, { type: "container" }), colId);
  page = tree.addLeaf(page, box.id, f.makeImage({ id: "img1" }));
  assert.equal(page.sections[0].children[0].columns[0].children[0].children[0].id, "img1");
  assert.equal(tree.insertTargetId(page, "img1", { type: "button" }), box.id);
  // Arrastar para o meio da caixa.
  page = tree.moveLeaf(page, text.id, box.id, "inside");
  const inner = () => page.sections[0].children[0].columns[0].children[0].children.map((l) => l.id);
  assert.deepEqual(inner(), ["img1", text.id]);
  // Reordenar dentro dela e subir/descer pelo painel.
  page = tree.moveLeaf(page, text.id, "img1", "before");
  assert.deepEqual(inner(), [text.id, "img1"]);
  page = tree.moveSibling(page, text.id, 1);
  assert.deepEqual(inner(), ["img1", text.id]);
  assert.deepEqual(tree.siblingInfo(page, text.id), { index: 1, count: 2 });
  // Uma caixa não entra em outra.
  const other = f.makeContainer({ id: "box2", children: [] });
  page = tree.addLeaf(page, colId, other);
  assert.equal(tree.moveLeaf(page, "box2", box.id, "inside"), page);
  assert.equal(tree.moveLeaf(page, "box2", "img1", "after"), page);
  // Duplicar copia os blocos de dentro com ids novos.
  const { page: dup, id } = tree.duplicateNode(page, box.id);
  const copy = tree.findNode(dup, id);
  assert.equal(copy.type, "container");
  assert.equal(copy.children.length, 2);
  assert.ok(copy.children.every((c) => c.id !== "img1" && c.id !== text.id));
  // Tirar da caixa (antes dela) e remover um bloco de dentro.
  page = tree.moveLeaf(page, "img1", box.id, "before");
  assert.equal(page.sections[0].children[0].columns[0].children[0].id, "img1");
  page = tree.removeNode(page, text.id);
  assert.equal(tree.findNode(page, text.id), null);
  assert.ok(tree.updateNode(page, box.id, { align: "center" }).sections[0].children[0].columns[0].children[1].align === "center");
});

/* --------------------------------------------------------- fundo por coluna */

test("coluna: fundo, borda, raio, preenchimento, sombra e alinhamento vertical", () => {
  const page = pageWith([f.makeText({ content: "Oi" })], { cols: 2 });
  const col = page.sections[0].children[0].columns[1];
  col.style = { bgColor: "#3D0099", fillOpacity: 80, borderWidth: 1, borderColor: "#A278DA", radius: 16, paddingY: 40, paddingX: 32, shadow: "md", valign: "center" };
  const html = exportHtml(page, "x");
  assert.ok(
    html.includes(
      `<div class="gove-col g-${col.id}" style="flex:1 1 0;min-width:0;background-color:rgba(61,0,153,0.8);border:1px solid #A278DA;border-radius:16px;padding:40px 32px;box-shadow:0 8px 24px rgba(11,32,39,.16);align-self:stretch;display:grid;align-content:center;">`,
    ),
  );
  // A outra coluna fica como antes.
  assert.ok(html.includes('<div class="gove-col" style="flex:1 1 0;min-width:0;">'));
  // Celular: preenchimento de até 24 × 20.
  assert.ok(media(styleBlock(html), MOBILE).includes(`.g-${col.id}{padding:24px 20px !important;}`));
  // Degradê (GOVE) e o fundo atrás dos blocos (contraste).
  col.style = { fill: "gradient", gradientFrom: "#20133D", gradientTo: "#3D0099", gradientAngle: 180 };
  assert.ok(exportHtml(page, "x").includes("background-image:linear-gradient(180deg, #20133D, #3D0099)"));
  const text = f.makeText({ content: "Claro", color: "#FFFFFF" });
  col.children = [text];
  assert.equal(tree.backgroundBehind(page, text.id), "#20133D");
  assert.ok(!auditPage(page).some((i) => i.nodeId === text.id && i.rule === "Contraste"));
  assert.equal(tree.columnBackground(page, col.id), "#20133D");
  // updateColumn: `undefined` tira a aparência.
  const cleared = tree.updateColumn(page, col.id, { style: undefined });
  assert.ok(!("style" in tree.findColumn(cleared, col.id).col));
});

test("coluna na identidade BB: sem degradê, fundo de esquema e texto aprovado", () => {
  const page = pageWith([f.makeText({ content: "Oi" })], { cols: 2, extra: { identity: "bb" } });
  const col = page.sections[0].children[0].columns[0];
  col.style = { fill: "gradient", gradientFrom: "#3D0099", gradientTo: "#A278DA", paddingY: 24, paddingX: 24 };
  assert.ok(bb.bbAudit(page).some((i) => i.message.includes("degradê")));
  const fixed = bb.bbHarmonize(page);
  const s = fixed.sections[0].children[0].columns[0].style;
  assert.equal(s.fill, undefined);
  assert.ok(bb.BB_SCHEME_BGS.includes(s.bgColor));
  assert.deepEqual(bb.bbAudit(fixed), []);
});

/* ------------------------------------------------------------------ hover */

test("hover: realce lateral esquerdo (barra vertical) e combinação levantar + barra", () => {
  const card = f.makeCard({ blockStyle: { hover: "leftBar", hoverColor: "#3D0099" } });
  const css = styleBlock(exportHtml(pageWith([card]), "x"));
  const sel = `.gove-lp .g-${card.id}`;
  assert.ok(css.includes(`${sel}{position:relative;overflow:hidden;}`));
  assert.ok(
    css.includes(
      `${sel}::before{content:"";position:absolute;top:0;left:0;bottom:0;width:4px;background:#3D0099;transform:scaleY(0);transform-origin:top;pointer-events:none;}`,
    ),
  );
  assert.ok(css.includes(`${sel}:hover::before{transform:scaleY(1);}`));
  const motion = media(css, MOTION);
  assert.ok(motion.includes(`.g-${card.id}:hover{transform:translateY(-4px);}`));
  assert.ok(motion.includes(`.g-${card.id}::before{transition:transform 0.3s ease;}`));
  // Levantar 2px + barra superior (barra somada).
  const combo = f.makeCard({ blockStyle: { hover: "lift2", hoverBar: "top" } });
  const css2 = styleBlock(exportHtml(pageWith([combo]), "x"));
  assert.ok(css2.includes(`.g-${combo.id}::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:#FFC72C;transform:scaleX(0);`));
  assert.ok(media(css2, MOTION).includes(`.g-${combo.id}:hover{transform:translateY(-2px);}`));
  // A barra superior de antes continua igual.
  const top = f.makeCard({ blockStyle: { hover: "topBar" } });
  const css3 = styleBlock(exportHtml(pageWith([top]), "x"));
  assert.ok(css3.includes(`.g-${top.id}::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:#FFC72C;transform:scaleX(0);transform-origin:left;pointer-events:none;}`));
});

test("hover: troca de cor (fundo, borda, título, ícone) com transição e foco", () => {
  const card = f.makeCard({ blockStyle: { hoverBg: "#20133D", hoverBorder: "#FFC72C", hoverText: "#FFFFFF", hoverIcon: "#FFC72C" }, color: "#F4F4F4" });
  const css = styleBlock(exportHtml(pageWith([card]), "x"));
  const sel = `.gove-lp .g-${card.id}`;
  assert.ok(css.includes(`${sel}:hover{background-color:#20133D !important;border-color:#FFC72C !important;}`));
  assert.ok(css.includes(`${sel}:focus-within{background-color:#20133D !important;`));
  assert.ok(css.includes(`${sel}:hover h3{color:#FFFFFF !important;}`));
  assert.ok(css.includes(`${sel}:hover svg{fill:#FFC72C !important;color:#FFC72C !important;}`));
  const motion = media(css, MOTION);
  assert.ok(motion.includes(`.g-${card.id}{transition:transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;}`));
  assert.ok(motion.includes(`.g-${card.id} svg{transition:fill 0.2s ease, color 0.2s ease;}`));
  // Cor fora do grupo de movimento: quem pede menos movimento ainda vê a troca.
  assert.ok(!motion.includes("#20133D !important"));
});

test("hover: contraste no estado de hover (auditoria GOVE e BB)", () => {
  // Título Branco sobre fundo Amarelo no hover: falha.
  const bad = f.makeCard({ blockStyle: { hoverBg: "#FFC72C", hoverText: "#FFFFFF" } });
  assert.ok(auditPage(pageWith([bad])).some((i) => i.rule === "Contraste" && i.message.includes("título no hover")));
  const good = f.makeCard({ blockStyle: { hoverBg: "#F4F4F4", hoverText: "#3D0099" } });
  assert.ok(!auditPage(pageWith([good])).some((i) => i.rule === "Contraste"));
  // Texto com fundo escuro no hover e a cor de sempre (escura): falha.
  const text = f.makeText({ content: "Oi", blockStyle: { hoverBg: "#20133D" } });
  assert.ok(auditPage(pageWith([text])).some((i) => i.rule === "Contraste" && i.message.includes("(hover)")));
  // BB: o ajuste automático deixa o hover dentro da paleta e legível.
  const page = bb.bbHarmonize(pageWith([{ ...text, id: "t2" }, { ...bad, id: "c2" }], { extra: { identity: "bb" } }));
  assert.deepEqual(bb.bbAudit(page), []);
});

/* --------------------------------------------------------- linha do tempo */

test("linha do tempo horizontal: passos lado a lado e empilhados no tablet/celular", () => {
  const tl = f.makeTimeline({ layout: "horizontal" });
  const html = exportHtml(pageWith([tl]), "x");
  assertBalanced(html);
  assert.ok(html.includes(`class="gove-timeline gove-tl-h g-${tl.id}"`));
  assert.ok(html.includes("grid-template-columns:repeat(3, minmax(0, 1fr))"));
  assert.ok(html.includes('class="gove-tl-line" aria-hidden="true"'));
  const tablet = media(styleBlock(html), TABLET);
  const sel = `.g-${tl.id}`;
  assert.ok(tablet.includes(`${sel}{grid-template-columns:minmax(0, 1fr) !important;}`));
  assert.ok(tablet.includes(`${sel}>.gove-tl-line{left:7px !important;right:auto !important;`));
  assert.ok(tablet.includes(`${sel}>.gove-tl-item{padding-top:0 !important;padding-left:38px !important;}`));
  // A vertical (padrão) continua como antes.
  const v = f.makeTimeline();
  assert.ok(!exportHtml(pageWith([v]), "x").includes("gove-tl-h"));
});

test("página com tudo junto: export válido, sem JS e sem erro BB depois do ajuste", () => {
  const box = f.makeContainer();
  const page = pageWith([box, f.makeCarousel(), f.makeTimeline({ layout: "horizontal" }), f.makeCalendarButton(), f.makeCard({ blockStyle: { hover: "leftBar", hoverBg: "#F4F4F4" } })], { cols: 2 });
  page.sections[0].children[0].columns[1].style = { bgColor: "#F4F4F4", radius: 16, paddingY: 24, paddingX: 24 };
  page.sections[0].children[0].columns[1].children = [f.makeRdForm({ snippet: "<div id=\"rd\"></div>" })];
  const html = exportHtml(page, "x");
  assertBalanced(html);
  assert.ok(!/<script/.test(html));
  const issues = auditPage(page).filter((i) => i.severity === "error");
  assert.deepEqual(issues.map((i) => i.message), []);
  const bbPage = bb.bbHarmonize({ ...page, identity: "bb" });
  assert.deepEqual(bb.bbAudit(bbPage).map((i) => i.message), []);
  assertBalanced(exportHtml(bbPage, "x"));
});
