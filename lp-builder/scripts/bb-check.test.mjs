// Identidade Banco do Brasil no LP Builder: presets, ajuste automático,
// checagem (4,5:1 sem exceção, só paleta, proteção sobre foto, logomarca) e
// HTML exportado (fontes BB embutidas, só cores da paleta).
//
//   node --test lp-builder/scripts/bb-check.test.mjs
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
  alias: {
    "@": src,
    // As fontes reais entram pelo Vite (?inline); aqui um stub com o mesmo @font-face.
    "./bbFonts": path.join(here, "bb-fonts.stub.ts"),
  },
});

const bb = await jiti.import(path.join(src, "lib/gove/bb.ts"));
const { pageFromPreset } = await jiti.import(path.join(src, "lib/gove/presets.ts"));
const { exportHtml } = await jiti.import(path.join(src, "lib/gove/export.ts"));
const f = await jiti.import(path.join(src, "lib/gove/factories.ts"));

const P = bb.BB_PALETTE;
const PALETTE = new Set(Object.values(P));
const PRESETS = ["centered", "split", "form", "blank"];

/** Página BB com uma seção e os blocos dados. */
function bbPage(leaves, box = {}) {
  const row = f.makeRow(1);
  row.columns[0].children = leaves;
  return {
    version: 1,
    identity: "bb",
    sections: [
      f.makeSection({ box: f.defaultBox({ bgColor: P.branco, ...box }), children: [row] }),
    ],
  };
}

/** Todo texto da página com a pior razão >= 4,5:1 no contexto efetivo. */
function assertTextsPass(page) {
  const ctxs = bb.containerContexts(page);
  for (const section of page.sections)
    for (const row of section.children)
      for (const col of row.columns)
        for (const leaf of col.children) {
          const ctx = bb.leafTextContext(leaf, ctxs.get(leaf.id));
          for (const key of ["color", "accentColor"])
            if (
              leaf.type !== "image" &&
              leaf.type !== "video" &&
              leaf.type !== "rdform" &&
              leaf[key] &&
              (key === "color" || leaf.type === "countdown")
            )
              assert.ok(
                bb.minRatio(leaf[key], ctx) >= 4.5,
                `${leaf.type}.${key} ${leaf[key]} < 4,5:1`,
              );
        }
}

/** Cores hex no HTML exportado (sem os data URIs das fontes). */
function exportedColors(html) {
  const clean = html.replace(/url\(data:[^)]*\)/g, "").replace(/<!--[\s\S]*?-->/g, "");
  return [...new Set((clean.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((c) => c.toUpperCase()))];
}

test("presets BB nascem limpos (só paleta, textos >= 4,5:1)", () => {
  for (const id of PRESETS) {
    const page = pageFromPreset(id, "bb");
    assert.equal(page.identity, "bb");
    assert.deepEqual(bb.bbAudit(page), [], `preset ${id}`);
    assertTextsPass(page);
  }
  // Hero centralizado = esquema "capa": Amarelo institucional + Azul escuro.
  const hero = pageFromPreset("centered", "bb");
  assert.equal(hero.sections[0].box.bgColor, P.amareloInstitucional);
  assert.equal(hero.sections[0].children[0].columns[0].children[0].color, P.azulEscuro);
});

test("presets GOVE continuam iguais (sem identidade BB)", () => {
  const page = pageFromPreset("centered");
  assert.equal(page.identity, undefined);
  assert.equal(page.sections[0].box.fill, "gradient");
  const html = exportHtml(page, "GOVE");
  assert.ok(!html.includes("@font-face"));
  assert.ok(!html.includes('data-identity="bb"'));
});

test("página GOVE convertida para BB fica limpa e o ajuste é idempotente", () => {
  for (const id of PRESETS) {
    const gove = pageFromPreset(id);
    assert.ok(
      bb.bbAudit({ ...gove, identity: "bb" }).length > 0 || id === "blank",
      `GOVE ${id} deveria ter pendências`,
    );
    const fixed = bb.bbHarmonize(gove);
    assert.deepEqual(bb.bbAudit(fixed), [], `GOVE→BB ${id}`);
    assertTextsPass(fixed);
    assert.deepEqual(bb.bbHarmonize(fixed), fixed, `idempotente ${id}`);
  }
});

test("armadilha: Azul institucional sobre Amarelo institucional (4,44) é reprovado e corrigido", () => {
  const page = bbPage(
    [
      f.makeText({
        tag: "h1",
        content: "Título",
        color: P.azulInstitucional,
        size: 40,
        weight: "bold",
      }),
    ],
    {
      bgColor: P.amareloInstitucional,
    },
  );
  const issues = bb.bbAudit(page);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /4,4\d:1/);
  const fixed = bb.bbHarmonize(page);
  assert.equal(fixed.sections[0].children[0].columns[0].children[0].color, P.azulEscuro);
  assert.deepEqual(bb.bbAudit(fixed), []);
});

test("cores fora da paleta são listadas e ajustadas", () => {
  const page = bbPage(
    [
      f.makeText({ content: "Oi", color: "#2F3539" }),
      f.makeButton({ bgColor: "#FFC72C", color: "#20133D" }),
      f.makeCard({
        bgColor: "#F4F4F4",
        color: "#2F3539",
        iconColor: "#FFC72C",
        borderColor: "#F4F4F4",
      }),
    ],
    { bgColor: "#3D0099" },
  );
  const rules = bb.bbAudit(page).map((i) => i.rule);
  assert.ok(rules.includes("Paleta BB"));
  const fixed = bb.bbHarmonize(page);
  assert.deepEqual(bb.bbAudit(fixed), []);
  assert.ok(bb.BB_SCHEME_BGS.includes(fixed.sections[0].box.bgColor));
  assertTextsPass(fixed);
});

test("Amarelo institucional nunca vira texto ou linha fina sobre Branco", () => {
  const page = bbPage([
    f.makeText({ content: "Oi", color: P.amareloInstitucional }),
    f.makeCard({
      bgColor: P.branco,
      color: P.azulEscuro,
      iconColor: P.amareloInstitucional,
      borderWidth: 1,
      borderColor: P.amareloInstitucional,
    }),
  ]);
  const msgs = bb
    .bbAudit(page)
    .map((i) => i.message)
    .join("\n");
  assert.match(msgs, /Texto “Oi”: 1,\d\d:1/);
  assert.match(msgs, /ícone/);
  assert.match(msgs, /borda/);
  assert.deepEqual(bb.bbAudit(bb.bbHarmonize(page)), []);
});

test("Preto só como texto sobre Rosa escuro", () => {
  const ok = bbPage([
    f.makeCard({
      bgColor: P.rosaEscuro,
      color: bb.BB_PRETO,
      iconColor: P.azulEscuro,
      borderWidth: 0,
    }),
  ]);
  assert.deepEqual(bb.bbAudit(ok), []);
  const bad = bbPage([f.makeText({ content: "Oi", color: bb.BB_PRETO })]);
  assert.match(bb.bbAudit(bad)[0].message, /fora da paleta|Preto/);
  assert.equal(
    bb.bbHarmonize(ok).sections[0].children[0].columns[0].children[0].color,
    bb.BB_PRETO,
  );
});

test("texto sobre foto: caixa de proteção Azul escuro + Branco, ou sobreposição forte", () => {
  const photo = { fill: "image", bgImage: "https://example.com/foto.jpg", overlay: 0 };
  const page = bb.bbHarmonize(
    bbPage([f.makeText({ tag: "h1", content: "Título", color: P.azulEscuro })], photo),
  );
  const ctx = bb.containerContexts(page).values().next().value;
  assert.equal(ctx.protected, true);
  const text = page.sections[0].children[0].columns[0].children[0];
  assert.equal(text.color, P.branco);
  assert.deepEqual(bb.bbAudit(page), []);
  const html = exportHtml(page, "foto");
  assert.match(html, /class="bb-protecao" style="background-color:#3333BD/);

  // Sobreposição Azul escuro 90%: o pior caso passa com Branco, sem caixa.
  const strong = bb.bbHarmonize(
    bbPage([f.makeText({ content: "Oi" })], { ...photo, overlay: 90, overlayColor: P.azulEscuro }),
  );
  const ctx2 = bb.containerContexts(strong).values().next().value;
  assert.equal(ctx2.protected, false);
  assert.ok(bb.minRatio(strong.sections[0].children[0].columns[0].children[0].color, ctx2) >= 4.5);
  assert.ok(!exportHtml(strong, "x").includes('class="bb-protecao"'));
});

test("esquemas: aplicar recolore títulos, textos e botões", () => {
  const page = bbPage([
    f.makeText({ tag: "h2", content: "T" }),
    f.makeText({ content: "P" }),
    f.makeButton({}),
    f.makeCountdown({}),
  ]);
  for (const scheme of bb.BB_SCHEMES) {
    const next = bb.applyScheme(page, page.sections[0].id, scheme);
    const [h, p, b, c] = next.sections[0].children[0].columns[0].children;
    assert.equal(next.sections[0].box.bgColor, scheme.bg);
    assert.equal(h.color, scheme.title);
    assert.equal(p.color, scheme.text);
    assert.equal(b.bgColor, scheme.button);
    assert.equal(b.color, scheme.buttonText);
    assert.equal(c.color, scheme.buttonText);
    assert.deepEqual(bb.bbAudit(next), [], scheme.id);
  }
});

test("estilo vidro e degradê saem na identidade BB", () => {
  const page = bbPage([f.makeButton({ variant: "glass" })], { fill: "gradient" });
  const rules = bb
    .bbAudit(page)
    .map((i) => i.message)
    .join("\n");
  assert.match(rules, /degradê/);
  assert.match(rules, /vidro/);
  const fixed = bb.bbHarmonize(page);
  assert.equal(fixed.sections[0].box.fill, "solid");
  assert.equal(fixed.sections[0].children[0].columns[0].children[0].variant, "filled");
});

test("logomarca: fundos permitidos e tamanho mínimo", () => {
  const page = {
    ...pageFromPreset("centered", "bb"),
    bbLogo: {
      ...bb.defaultLogo(),
      src: "data:image/png;base64,AA==",
      width: 100,
      bg: P.azulEscuro,
    },
  };
  const msgs = bb
    .bbAudit(page)
    .map((i) => i.message)
    .join("\n");
  assert.match(msgs, /Amarelo institucional, Azul institucional ou Branco/);
  assert.match(msgs, /mínimo 140px/);
  const fixed = bb.bbHarmonize(page);
  assert.deepEqual(bb.bbAudit(fixed), []);
  assert.equal(fixed.bbLogo.width, 140);
  const html = exportHtml(fixed, "logo");
  assert.match(html, /<header class="bb-logo" style="background-color:#FCFC30;padding:18px 24px/);
  assert.match(html, /alt="Banco do Brasil"/);
});

test("HTML exportado BB: fontes BB embutidas, títulos em BB Títulos, só cores da paleta", () => {
  const page = pageFromPreset("centered", "bb");
  const col = page.sections[0].children[0].columns[0];
  col.children.push(
    f.makeCard({}),
    f.makeCountdown({}),
    f.makeButton({ variant: "text", label: "Saiba mais" }),
  );
  const fixed = bb.bbHarmonize(page);
  assert.deepEqual(bb.bbAudit(fixed), []);
  const html = exportHtml(fixed, "BB");
  assert.equal(
    (html.match(/@font-face\{font-family:"BancoDoBrasil (Titulos|Textos)"/g) ?? []).length,
    6,
  );
  assert.match(html, /<h1 style="[^"]*font-family:'BancoDoBrasil Titulos'/);
  assert.match(html, /<p style="[^"]*font-family:'BancoDoBrasil Textos'/);
  assert.match(html, /\.gove-lp\[data-identity="bb"\]\{font-family:'BancoDoBrasil Textos'/);
  assert.match(html, /data-num-font=/);
  assert.match(html, /class="bb-link"/); // link visitado em Roxo escuro (fundo claro)
  assert.ok(!/Alfabeto/i.test(html));
  const off = exportedColors(html).filter((c) => !PALETTE.has(c));
  assert.deepEqual(off, [], `cores fora da paleta: ${off.join(", ")}`);
});
