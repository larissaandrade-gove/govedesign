// Regressão do HTML exportado: páginas e modelos salvos ANTES das opções de
// layout da LP de referência continuam exportando o mesmo HTML.
//
//   node --test lp-builder/scripts/export-baseline.test.mjs
//
// A linha de base (fixtures/export-baseline.json) guarda o documento de cada
// página e o HTML que o export gerava. O teste exporta o documento salvo.
//
// Diferenças INTENCIONAIS (e só elas) são normalizadas na linha de base antes
// da comparação; qualquer outra diferença falha o teste:
//   1. Pontos de quebra: a regra única `@media (max-width:768px)` virou o ponto
//      de quebra do tablet, `@media (max-width:980px)` (mesmas regras: colunas
//      empilhadas e 24px de margem lateral nas seções; faixa da logomarca BB com
//      16px). Entre 769 e 980px as colunas agora empilham, como na LP de
//      referência. O celular (640px) só recebe regras de opções novas.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { BASELINE_FILE, jiti } from "./export-fixtures.mjs";

const src = path.resolve(path.dirname(BASELINE_FILE), "../../src");
const { exportHtml } = await jiti.import(path.join(src, "lib/gove/export.ts"));
const fixtures = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));

/** Aplica as diferenças intencionais documentadas acima ao HTML antigo. */
const INTENTIONAL = [[/@media \(max-width:768px\)/g, "@media (max-width:980px)"]];
const normalize = (html) => INTENTIONAL.reduce((out, [find, repl]) => out.replace(find, repl), html);

test("linha de base cobre os modelos iniciais GOVE e BB", () => {
  const names = fixtures.map((f) => f.name);
  for (const id of ["centered", "split", "form"])
    for (const identity of ["gove", "bb"]) assert.ok(names.includes(`modelo-base-${id}-${identity}`), `${id}-${identity}`);
  assert.ok(fixtures.length >= 11);
});

for (const { name, page, html } of fixtures)
  test(`export igual à linha de base: ${name}`, () => {
    const now = exportHtml(structuredClone(page), name);
    assert.equal(now, normalize(html));
  });
