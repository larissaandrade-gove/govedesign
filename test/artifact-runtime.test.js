// Coleções do artifact-runtime: cadastros feitos só no navegador (antes de o db
// compartilhado estar disponível) não podem sumir quando o db aparece vazio.
import assert from 'node:assert/strict';
import { test } from 'node:test';

function fakeDb(initial = {}) {
  const store = new Map(Object.entries(initial));
  const subs = [];
  const snap = () => ({ empty: store.size === 0, metadata: {}, docs: [...store].map(([id, data]) => ({ id, data: () => data })) });
  return {
    store,
    collection: () => ({
      onSnapshot(fn) { subs.push(fn); queueMicrotask(() => fn(snap())); },
      doc: (id) => ({
        async set(data) { store.set(id, data); subs.forEach((f) => f(snap())); },
        async delete() { store.delete(id); subs.forEach((f) => f(snap())); },
      }),
    }),
  };
}

function setupWindow(db, ls = {}) {
  const mem = new Map(Object.entries(ls));
  globalThis.window = {
    claude: { use: async (name) => (name === 'db' ? db : null) },
    localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) },
  };
  globalThis.window.parent = globalThis.window;
  globalThis.window.top = globalThis.window;
  return mem;
}

test('cadastro só local sobe para o db vazio em vez de sumir', async () => {
  const db = fakeDb();
  const local = [{ id: 'unai', nome: 'Exemplo A' }, { id: 'itupeva', nome: 'Exemplo B' }];
  const mem = setupWindow(db, { 'gove:print-studio:municipios': JSON.stringify(local) });
  const { collection } = await import(`../artifact-runtime/index.ts?t=${Date.now()}`);
  const col = collection('print-studio', 'municipios');
  await col.ready;
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(col.all().map((d) => d.id).sort(), ['itupeva', 'unai']);
  assert.deepEqual([...db.store.keys()].sort(), ['itupeva', 'unai']);
  assert.equal(JSON.parse(mem.get('gove:print-studio:municipios')).length, 2);
});

test('documento já sincronizado e apagado no db por outra pessoa não volta', async () => {
  const db = fakeDb({ b: { nome: 'fica' } });
  setupWindow(db, {
    'gove:print-studio:municipios': JSON.stringify([{ id: 'a', nome: 'apagado' }, { id: 'b', nome: 'fica' }]),
    'gove:print-studio:municipios:sincronizados': JSON.stringify(['a', 'b']),
  });
  const { collection } = await import(`../artifact-runtime/index.ts?t=${Date.now()}x`);
  const col = collection('print-studio', 'municipios');
  await col.ready;
  assert.deepEqual(col.all().map((d) => d.id), ['b']);
  assert.ok(!db.store.has('a'));
});
