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
/** Só os campos do contrato original (frame/attempts são conferidos à parte). */
const core = ({ outcome, code, method }) => ({ outcome, code, method });

test('saved: a pessoa aceitou a janela do claude.ai', async () => {
  const seen = [];
  const calls = setupWindow({ capFor: (n) => (n === 'downloads' ? downloadsThat(async (r) => (seen.push(r), { status: 'saved' })) : null) });
  const { saveFile, saveFileDetailed } = await load();
  const blob = new Blob(['zip']);
  const r = await saveFileDetailed('kit.zip', blob);
  assert.deepEqual(core(r), { outcome: 'saved', code: 'saved', method: 'capacidade' });
  assert.equal(r.frame, 'principal');
  assert.deepEqual(r.attempts, ['principal:ok', 'principal:saved']);
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
    assert.deepEqual(core(await saveFileDetailed('kit.zip', new Blob(['x']))), { outcome, code, method: 'capacidade' });
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
  assert.deepEqual(core(await saveFileDetailed('kit.zip', new Blob(['x']))), { outcome: 'saved', code: 'saved', method: 'navegador' });
  assert.equal(calls.anchors, 1);
});

/* ---------------------------------------------- iframe do app + página principal */

/**
 * App num iframe da mesma origem: `top` é a página principal do artefato, com outro
 * "mundo" JavaScript (um `Blob` próprio). `ownClaude`: o claude do iframe (ou nenhum).
 */
function setupFrames({ ownClaude = 'null', topSave, topCap = true } = {}) {
  class TopBlob extends Blob {}
  const calls = { ownUse: 0, topUse: 0, anchors: 0, saves: [] };
  const listeners = new Set();
  const top = { Blob: TopBlob, postMessage: () => {} };
  top.claude = { use: async (name) => (calls.topUse++, topCap && name === 'downloads' ? { save: topSave } : null) };
  const win = {
    Blob,
    location: { origin: 'https://artefato.example' },
    addEventListener: (t, fn) => t === 'message' && listeners.add(fn),
    removeEventListener: (t, fn) => listeners.delete(fn),
  };
  if (ownClaude === 'null') win.claude = { use: async () => (calls.ownUse++, null) };
  win.parent = top;
  win.top = top;
  top.top = top;
  top.parent = top;
  globalThis.window = win;
  globalThis.document = { createElement: () => ({ click: () => calls.anchors++, remove() {} }), body: { appendChild() {} } };
  const dispatch = (data, source = top) => [...listeners].forEach((fn) => fn({ data, source, origin: win.location.origin }));
  return { calls, top, win, TopBlob, dispatch, listeners };
}

for (const ownClaude of ['null', 'ausente']) {
  test(`claude do iframe ${ownClaude === 'null' ? 'devolve null' : 'ausente'}: download pela página principal, com Blob recriado no mundo dela`, async () => {
    let TopBlobRef;
    const f = setupFrames({
      ownClaude,
      topSave: async ({ filename, data }) => {
        if (!(data instanceof TopBlobRef)) throw { code: 'bad_request', message: 'bad/empty/detached data' };
        f.calls.saves.push({ filename, size: data.size, type: data.type, text: await data.text() });
        return { status: 'saved' };
      },
    });
    TopBlobRef = f.TopBlob;
    const { saveFileDetailed } = await load();
    const r = await saveFileDetailed('kit.zip', new Blob(['PK-zip'], { type: 'application/zip' }));
    assert.equal(r.outcome, 'saved');
    assert.equal(r.frame, 'principal');
    assert.deepEqual(f.calls.saves, [{ filename: 'kit.zip', size: 6, type: 'application/zip', text: 'PK-zip' }]);
    assert.equal(f.calls.ownUse, 0); // a página principal atende primeiro
    assert.equal(f.calls.anchors, 0);
  });
}

test('topo sem a capacidade e iframe com ela: usa o claude do iframe (primeiro não-null), e guarda a escolha', async () => {
  const f = setupFrames({ topCap: false, topSave: null });
  const saves = [];
  f.win.claude = { use: async (n) => (f.calls.ownUse++, n === 'downloads' ? { save: async (q) => (saves.push(q), { status: 'saved' }) } : null) };
  const { saveFileDetailed } = await load();
  const blob = new Blob(['x']);
  const r = await saveFileDetailed('a.pdf', blob);
  assert.equal(r.frame, 'próprio');
  assert.deepEqual(r.attempts, ['principal:null', 'próprio:ok', 'próprio:saved']);
  assert.equal(saves[0].data, blob); // mesmo mundo: não recria
  await saveFileDetailed('b.pdf', blob);
  assert.equal(f.calls.topUse, 1);
  assert.equal(f.calls.ownUse, 1);
});

test('outras capacidades (db) também usam o primeiro candidato que responde', async () => {
  const f = setupFrames({ topCap: false, topSave: null });
  const db = { tag: 'db-do-topo' };
  f.top.claude.use = async (n) => (n === 'db' ? db : null);
  const { capability } = await load();
  // Vem embrulhado (argumentos recriados no mundo da página principal), mas é o db do topo
  assert.equal((await capability('db')).tag, 'db-do-topo');
  assert.equal(await capability('assets'), null);
});

test('assets.upload recebe o Blob recriado no mundo da página principal', async () => {
  const f = setupFrames({ topCap: false, topSave: null });
  let got = null;
  f.top.claude.use = async (n) => (n === 'assets' ? { upload: async (b) => ((got = b), { id: 'a1', url: '/_blob/a1' }) } : null);
  const { putFile } = await load();
  const r = await putFile(new Blob(['png'], { type: 'image/png' }));
  assert.deepEqual(r, { id: 'asset:a1', url: '/_blob/a1' });
  assert.ok(got instanceof f.TopBlob);
  assert.equal(got.type, 'image/png');
});

test('nenhum claude atende downloads: ponte com o Design System (ack + resultado)', async () => {
  const f = setupFrames({ topCap: false, topSave: null });
  const posted = [];
  f.top.postMessage = (msg, origin, transfer) => {
    posted.push({ msg, origin, transfer });
    setTimeout(() => {
      f.dispatch({ type: 'gove:download:ack', id: msg.id });
      f.dispatch({ type: 'gove:download:result', id: 'outro', outcome: 'error', code: 'x' }); // de outro pedido: ignorado
      f.dispatch({ type: 'gove:download:result', id: msg.id, outcome: 'saved', code: 'saved', method: 'ponte' }, {}); // outra janela: ignorado
      f.dispatch({ type: 'gove:download:result', id: msg.id, outcome: 'saved', code: 'saved', method: 'ponte' });
    }, 5);
  };
  const { saveFileDetailed } = await load();
  const r = await saveFileDetailed('kit.zip', new Blob(['PK'], { type: 'application/zip' }));
  assert.equal(r.outcome, 'saved');
  assert.equal(r.frame, 'ponte');
  assert.deepEqual(r.attempts, ['principal:null', 'próprio:null', 'ponte:saved']);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].origin, 'https://artefato.example');
  assert.equal(posted[0].msg.type, 'gove:download');
  assert.equal(posted[0].msg.filename, 'kit.zip');
  assert.equal(posted[0].msg.mime, 'application/zip');
  assert.equal(posted[0].transfer[0], posted[0].msg.buffer);
  assert.equal(f.listeners.size, 0); // ouvinte removido
});

test('ponte responde recusa: devolve o resultado dela, sem falso sucesso', async () => {
  const f = setupFrames({ topCap: false, topSave: null });
  f.top.postMessage = (msg) => setTimeout(() => {
    f.dispatch({ type: 'gove:download:ack', id: msg.id });
    f.dispatch({ type: 'gove:download:result', id: msg.id, outcome: 'declined', code: 'declined', method: 'ponte' });
  }, 1);
  const { saveFileDetailed } = await load();
  const r = await saveFileDetailed('kit.zip', new Blob(['PK']));
  assert.equal(r.outcome, 'declined');
  assert.equal(r.frame, 'ponte');
});

test('nada funciona (sem capacidade e sem ouvinte da ponte): unavailable, sem <a download>', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = setupFrames({ topCap: false, topSave: null });
  const { saveFileDetailed, BRIDGE_ACK_MS } = await load();
  const p = saveFileDetailed('kit.zip', new Blob(['PK']));
  // espera a busca da capacidade e o envio pela ponte, então esgota o prazo do ack
  for (let i = 0; i < 50 && f.listeners.size === 0; i++) await new Promise((r) => setImmediate(r));
  assert.equal(f.listeners.size, 1);
  t.mock.timers.tick(BRIDGE_ACK_MS);
  const r = await p;
  assert.equal(r.outcome, 'unavailable');
  assert.equal(r.code, 'ponte_sem_resposta');
  assert.equal(f.calls.anchors, 0);
});
