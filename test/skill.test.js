// A skill de Apoio de IA (skills/gove-design-system/SKILL.md) é gerada a partir dos guias e dos dados
// do design system. Se este teste falhar, rode: node design-system/scripts/build-skill.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const { buildSkill, SKILL_PATH } = await import('../design-system/scripts/build-skill.mjs');
const { BRAND_COLORS } = await import('../design-system/src/data/colorCompass.ts');
const { PROMPTS } = await import('../design-system/src/data/prompts.ts');

test('SKILL.md está atualizado com os guias e os dados do design system', async () => {
  assert.equal(readFileSync(SKILL_PATH, 'utf8'), await buildSkill());
});

test('a skill tem frontmatter, a paleta inteira e todos os prompts', async () => {
  const s = await buildSkill();
  assert.match(s, /^---\nname: gove-design-system\ndescription: .+\n---\n/);
  for (const c of BRAND_COLORS) assert.ok(s.includes(c.hex), c.name);
  for (const p of PROMPTS) assert.ok(s.includes(`### ${p.title}`), p.title);
  for (const h of ['Diretrizes de design Gove', 'Tipografia Gove', 'Componentes Gove']) assert.ok(s.includes(h), h);
});
