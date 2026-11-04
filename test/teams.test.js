// Equipes do Design System (design-system/src/data/teams.ts) e prompts de Instruções (data/prompts.ts).
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

// apps.ts importa imagens (Vite) e lê o endereço do Gove Links definido no build
const hooks = `export async function load(url, ctx, next) {
  if (/\\.(webp|png|jpe?g|svg)$/.test(url) || url.includes('?raw')) return { format: 'module', source: 'export default ""', shortCircuit: true };
  return next(url, ctx);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));
globalThis.__GOVE_LINKS_URL__ = '';

const { APPS } = await import('../design-system/src/data/apps.ts');
const { TEAMS, INSTRUCOES, teamApps } = await import('../design-system/src/data/teams.ts');
const { PROMPTS, contrastPairs } = await import('../design-system/src/data/prompts.ts');
const { brandPalette, fonts, spacing } = await import('../design-system/src/data/tokens.js');
const { LOGO_COLORS } = await import('../brand/logos.js');

test('todo app de uma equipe existe em APPS, sem repetição', () => {
  const ids = new Set(APPS.map((a) => a.id));
  for (const t of TEAMS) {
    for (const id of t.apps) assert.ok(ids.has(id), `${t.id}: ${id}`);
    assert.equal(new Set(t.apps).size, t.apps.length, t.id);
    assert.equal(teamApps(t).length, t.apps.length);
  }
});

test('todo app pertence a alguma equipe; Marketing tem todos, com o Gove Links primeiro', () => {
  for (const a of APPS) assert.ok(TEAMS.some((t) => t.apps.includes(a.id)), a.id);
  const mkt = TEAMS.find((t) => t.id === 'marketing');
  assert.equal(mkt.apps[0], 'links');
  assert.deepEqual([...mkt.apps].sort(), APPS.map((a) => a.id).sort());
});

test('equipes pedidas, com ids únicos e apps certos', () => {
  assert.equal(new Set(TEAMS.map((t) => t.id)).size, TEAMS.length);
  const by = Object.fromEntries(TEAMS.map((t) => [t.id, t]));
  assert.deepEqual(by['sucesso-operacoes'].apps, ['print-studio']);
  assert.deepEqual(by.produto.apps, ['atualizacoes']);
  assert.deepEqual(by.vendas.apps, ['cases', 'studio-cards', 'criativos', 'eventos']);
  assert.deepEqual(by['apoio-ia'].instrucoes, INSTRUCOES.map((s) => s.id));
});

test('Kit de Boas-Vindas mantém o id; partes do Gerador abrem o Criativos na tela certa', () => {
  assert.equal(APPS.find((a) => a.id === 'print-studio').name, 'Kit de Boas-Vindas');
  assert.ok(!APPS.some((a) => /Print Studio/.test(a.name + a.summary + a.tagline)));
  const hash = (id) => APPS.find((a) => a.id === id).embed;
  assert.deepEqual(hash('criativos'), { file: 'criativos', hash: '#midia-paga' });
  assert.deepEqual(hash('studio-cards'), { file: 'criativos', hash: '#studio' });
  assert.deepEqual(hash('atualizacoes'), { file: 'criativos', hash: '#atualizacoes' });
  assert.deepEqual(hash('eventos'), { file: 'criativos', hash: '#eventos' });
});

test('os prompts trazem a paleta, as fontes, a grade e a regra da logomarca atuais', () => {
  assert.ok(PROMPTS.length >= 3);
  for (const p of PROMPTS) {
    const text = p.build();
    assert.ok(text.includes(fonts.display[0]) && text.includes(fonts.sans[0]), `${p.id}: fontes`);
    assert.ok(!text.includes('[object'), p.id);
    assert.ok(!/\n,/.test(text), `${p.id}: blocos mal unidos`);
  }
  const midias = PROMPTS.find((p) => p.id === 'midias').build();
  for (const hex of brandPalette) assert.ok(midias.includes(hex), `mídias: ${hex}`);
  assert.ok(midias.includes(LOGO_COLORS.roxo) && midias.includes(LOGO_COLORS.amarelo));
  const comp = PROMPTS.find((p) => p.id === 'componentes').build();
  assert.ok(comp.includes(Object.values(spacing).map((v) => parseInt(v, 10)).join(', ')));
  for (const hex of brandPalette) assert.ok(comp.includes(hex), `componentes: ${hex}`);
  const slides = PROMPTS.find((p) => p.id === 'apresentacoes').build();
  assert.ok(slides.includes(`margem de ${parseInt(spacing['space-12'], 10)} px`));
});

test('pares de contraste: texto pequeno ≥ 4,5:1 e nunca em cor de apoio', () => {
  const pairs = contrastPairs();
  const noite = pairs.find((p) => p.bg.name === 'Noite');
  assert.ok(noite.small.some((c) => c.name === 'Amarelo'));
  assert.ok(pairs.every((p) => p.small.every((c) => c.name !== 'Lavanda' && c.name !== 'Cinza técnico')));
});
