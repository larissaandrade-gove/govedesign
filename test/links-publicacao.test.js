// Gove Links: o Design System só libera o app quando o endereço publicado responde em /saude.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const { checkPublished } = await import('../design-system/src/lib/appStatus.ts');

const json = (body, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('publicação do Gove Links: /saude decide a liberação', async () => {
  assert.equal(await checkPublished('https://ok.example', json({ ok: true, app: 'gove-links' })), true);
  assert.equal(await checkPublished('https://outro.example', json({ ok: true, app: 'outro-app' })), false);
  assert.equal(await checkPublished('https://erro.example', json({}, 500)), false);
  assert.equal(
    await checkPublished('https://fora.example', async () => {
      throw new TypeError('Failed to fetch');
    }),
    false,
  );
});

test('publicação do Gove Links: começa "Em breve" (sem endereço configurado)', () => {
  const cfg = JSON.parse(readFileSync(new URL('../links/publicacao.json', import.meta.url), 'utf8'));
  assert.equal(cfg.url, '');
});
