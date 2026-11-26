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

test('documento só local excluído não volta no próximo sincronismo', async () => {
  const db = fakeDb({ b: { nome: 'fica' } });
  let deletes = 0;
  const base = db.collection;
  db.collection = (...a) => {
    const c = base(...a);
    const doc = c.doc;
    c.doc = (id) => ({ ...doc(id), async set(data) { if (id === 'local') return new Promise(() => {}); return doc(id).set(data); }, async delete() { deletes++; return doc(id).delete(); } });
    return c;
  };
  const mem = setupWindow(db, {
    'gove:print-studio:municipios': JSON.stringify([{ id: 'local', nome: 'só aqui' }, { id: 'b', nome: 'fica' }]),
    'gove:print-studio:municipios:sincronizados': JSON.stringify(['b']),
  });
  const { collection } = await import(`../artifact-runtime/index.ts?t=${Date.now()}l`);
  const col = collection('print-studio', 'municipios');
  await col.ready;
  assert.deepEqual(col.all().map((d) => d.id).sort(), ['b', 'local']);
  await col.remove('local');
  assert.deepEqual(col.all().map((d) => d.id), ['b']);
  // Outro sincronismo (ex.: alteração de outra pessoa) não devolve o documento
  await db.collection().doc('c').set({ nome: 'novo' });
  assert.deepEqual(col.all().map((d) => d.id).sort(), ['b', 'c']);
  assert.ok(!JSON.parse(mem.get('gove:print-studio:municipios:sincronizados')).includes('local'));
  assert.ok(deletes <= 1);
});

test('documento nunca enviado (modo local) sai sem chamar o banco', async () => {
  setupWindow(null, { 'gove:print-studio:municipios': JSON.stringify([{ id: 'x', nome: 'x' }]) });
  const { collection } = await import(`../artifact-runtime/index.ts?t=${Date.now()}m`);
  const col = collection('print-studio', 'municipios');
  await col.ready;
  await col.remove('x');
  assert.deepEqual(col.all(), []);
});

test('falha ao excluir no banco devolve o item e lança erro claro', async () => {
  for (const [err, msg] of [
    [Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }), 'Sem permissão para excluir neste artefato.'],
    [new Error('network'), 'Não foi possível excluir agora. Tente de novo.'],
  ]) {
    const db = fakeDb({ a: { nome: 'A' }, b: { nome: 'B' }, c: { nome: 'C' } });
    const base = db.collection;
    db.collection = (...a) => {
      const c = base(...a);
      const doc = c.doc;
      c.doc = (id) => ({ ...doc(id), delete: async () => { throw err; } });
      return c;
    };
    setupWindow(db);
    const { collection } = await import(`../artifact-runtime/index.ts?t=${Date.now()}${msg.length}`);
    const col = collection('print-studio', 'municipios');
    await col.ready;
    const seen = [];
    col.subscribe((docs) => seen.push(docs.map((d) => d.id)));
    await assert.rejects(col.remove('b'), { message: msg });
    assert.deepEqual(col.all().map((d) => d.id), ['a', 'b', 'c']);
    assert.deepEqual(seen.at(-1), ['a', 'b', 'c']);
    assert.ok(db.store.has('b'));
  }
});

// O app roda num iframe e a capacidade vem do `claude` da página principal (outro "mundo"
// JavaScript). O db do claude.ai recusa objetos que não são do Object.prototype dele.
import vm from 'node:vm';

function topRealm() {
  const ctx = vm.createContext({});
  vm.runInContext(`
    const PLAIN = 'arguments must be plain JSON data within the store\\'s limits';
    const plain = (v) => v === null || typeof v !== 'object' || (Array.isArray(v) ? v.every(plain) : Object.getPrototypeOf(v) === Object.prototype && Object.values(v).every(plain));
    const check = (...args) => { for (const a of args) if (!plain(a)) throw new Error(PLAIN); };
    const store = new Map();
    const subs = [];
    const calls = [];
    const snap = () => ({ empty: store.size === 0, metadata: {}, docs: [...store].map(([id, data]) => ({ id, data: () => data })) });
    const db = Object.freeze({
      collection: (path) => { check(path); return {
        onSnapshot(fn) { subs.push(fn); Promise.resolve().then(() => fn(snap())); return () => {}; },
        doc: (id) => { check(id); return {
          async set(data) { check(data); store.set(id, data); subs.forEach((f) => f(snap())); },
          async update(data) { check(data); store.set(id, { ...store.get(id), ...data }); subs.forEach((f) => f(snap())); },
          async delete() { store.delete(id); subs.forEach((f) => f(snap())); },
        }; },
        where: (field, op, value) => { check(field, op, value); return { async get() { return snap(); } }; },
      }; },
    });
    const mcp = { async callTool(server, tool, input, options) { check(server, tool, input, options); calls.push(['mcp', tool, input]); return { payload: { ok: true } }; } };
    const downloads = { async save(req) { check(req); calls.push(['save', req.filename]); return { ok: true }; } };
    // Como numa janela do navegador: os construtores ficam visíveis em window.Object etc.
    Object.assign(globalThis, { Object, Array, JSON });
    globalThis.store = store;
    globalThis.calls = calls;
    globalThis.claude = { use: async (name) => ({ db, mcp, downloads })[name] ?? null };
  `, ctx);
  return ctx;
}

function setupIframe(top) {
  const mem = new Map();
  globalThis.window = { localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) } };
  globalThis.window.top = top;
  globalThis.window.parent = top;
}

test('db de outra janela: set/update/where com objetos do iframe são aceitos', async () => {
  const top = topRealm();
  setupIframe(top);
  // Sem a conversão, o db da página principal recusa o objeto deste mundo
  await assert.rejects(Promise.resolve().then(() => vm.runInContext('claude', top).use('db')).then((db) => db.collection('x').doc('a').set({ a: 1 })), /plain JSON data/);
  const rt = await import(`../artifact-runtime/index.ts?t=${Date.now()}realm`);
  const col = rt.collection('print-studio', 'municipios');
  await col.ready;
  assert.equal(col.mode(), 'db');
  await col.set({ id: '1', nome: 'Exemplo', incluir_logo_banco_do_brasil: true, avisos: ['a'], logo: { w: 1 } });
  assert.equal(Object.getPrototypeOf(top.store.get('1')), vm.runInContext('Object.prototype', top));
  assert.deepEqual(JSON.parse(JSON.stringify(top.store.get('1'))), { nome: 'Exemplo', incluir_logo_banco_do_brasil: true, avisos: ['a'], logo: { w: 1 } });
  assert.deepEqual(col.all().map((d) => d.id), ['1']);
  const db = await rt.capability('db');
  await db.collection('apps/print-studio/municipios').doc('1').update({ uf: 'SP', tags: [{ a: 1 }] });
  assert.equal(top.store.get('1').uf, 'SP');
  const snap = await db.collection('apps/print-studio/municipios').where('uf', 'in', ['SP', 'MG']).get();
  assert.equal(snap.docs.length, 1);
  await col.remove('1');
  assert.ok(!top.store.has('1'));
});

test('mcp e downloads de outra janela recebem argumentos do mundo dela', async () => {
  const top = topRealm();
  setupIframe(top);
  const rt = await import(`../artifact-runtime/index.ts?t=${Date.now()}realm2`);
  const mcp = await rt.capability('mcp');
  const r = await mcp.callTool('Gove Grafana', 'query', { ids: [1, 2], filtro: { de: 'x' } }, { cache: false });
  assert.deepEqual({ ...r.payload }, { ok: true });
  const downloads = await rt.capability('downloads');
  await downloads.save({ filename: 'a.pdf', data: 'conteudo' });
  assert.deepEqual(JSON.parse(JSON.stringify(top.calls)), [['mcp', 'query', { ids: [1, 2], filtro: { de: 'x' } }], ['save', 'a.pdf']]);
});
