// Downloads do artifact-runtime: `saveFile` só diz "saved" quando a pessoa aceitou
// a janela do claude.ai; dentro do artefato nunca cai num `<a download>` (o iframe
// descarta esse clique em silêncio) e um `null` da capacidade não fica em cache.
import assert from 'node:assert/strict';
import { test } from 'node:test';

let seq = 0;
const load = () => import(`../artifact-runtime/index.ts?d=${Date.now()}-${seq++}`);

/** Janela de teste: `claude.use()` responde com `capFor(name)`; conta cliques em <a>. */
function setupWindow({ claude = true, capFor = () => null } = {}) {
  const calls = { use: 0, anchors: 0 };
  globalThis.window = {};
  if (claude) globalThis.window.claude = { use: async (name) => (calls.use++, capFor(name)) };
  globalThis.window.parent = globalThis.window;
  globalThis.window.top = globalThis.window;
  globalThis.document = {
    createElement: () => ({ click: () => calls.anchors++, remove() {} }),
    body: { appendChild() {} },
  };
  return calls;
}

const downloadsThat = (save) => ({ save });

test('saved: a pessoa aceitou a janela do claude.ai', async () => {
  const seen = [];
  const calls = setupWindow({ capFor: (n) => (n === 'downloads' ? downloadsThat(async (r) => (seen.push(r), { status: 'saved' })) : null) });
  const { saveFile, saveFileDetailed } = await load();
  const blob = new Blob(['zip']);
  assert.deepEqual(await saveFileDetailed('kit.zip', blob), { outcome: 'saved', code: 'saved', method: 'capacidade' });
  assert.equal(await saveFile('kit.zip', blob), 'saved');
  assert.equal(seen[0].filename, 'kit.zip');
  assert.equal(seen[0].data, blob);
  assert.equal(calls.anchors, 0);
});

for (const [code, outcome] of [
  ['declined', 'declined'],
  ['rate_limited', 'rate_limited'],
  ['unavailable', 'unavailable'],
  ['not_granted', 'unavailable'],
  ['codigo_novo', 'unavailable'],
  ['too_large', 'too_large'],
  ['bad_request', 'error'],
]) {
  test(`rejeição ${code} → ${outcome}, sem <a download>`, async () => {
    const calls = setupWindow({ capFor: () => downloadsThat(async () => Promise.reject({ code, message: code })) });
    const { saveFileDetailed } = await load();
    assert.deepEqual(await saveFileDetailed('kit.zip', new Blob(['x'])), { outcome, code, method: 'capacidade' });
    assert.equal(calls.anchors, 0);
  });
}

test('dentro do artefato e sem a capacidade: unavailable, sem tocar em <a>', async () => {
  const calls = setupWindow({ capFor: () => null });
  const { saveFileDetailed, saveOutcomeText } = await load();
  const r = await saveFileDetailed('kit.zip', new Blob(['x']));
  assert.equal(r.outcome, 'unavailable');
  assert.equal(r.code, 'sem_capacidade');
  assert.equal(calls.anchors, 0);
  assert.match(saveOutcomeText('unavailable'), /indisponíveis/);
  assert.equal(saveOutcomeText('saved'), null);
});

test('null da capacidade não fica em cache: o próximo pedido chama use() de novo', async () => {
  let available = false;
  const calls = setupWindow({ capFor: () => (available ? downloadsThat(async () => ({ status: 'saved' })) : null) });
  const { saveFile, capability } = await load();
  assert.equal(await saveFile('kit.zip', new Blob(['x'])), 'unavailable');
  assert.equal(calls.use, 1);
  available = true;
  assert.equal(await saveFile('kit.zip', new Blob(['x'])), 'saved');
  assert.equal(calls.use, 2);
  // Resultado positivo fica guardado
  await capability('downloads');
  assert.equal(calls.use, 2);
});

test('fora do artefato: download comum do navegador', async () => {
  const calls = setupWindow({ claude: false });
  globalThis.URL.createObjectURL ??= () => 'blob:x';
  const { saveFileDetailed } = await load();
  assert.deepEqual(await saveFileDetailed('kit.zip', new Blob(['x'])), { outcome: 'saved', code: 'saved', method: 'navegador' });
  assert.equal(calls.anchors, 1);
});
