// Conector "Pexels Gove" na Cloudflare (integrations/pexels-connector/worker): o Worker roda
// aqui no Node com um fetch de teste. As respostas do Pexels abaixo são DADOS DE TESTE no
// formato da API (a rede deste ambiente não alcança api.pexels.com).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import worker, { handleRequest } from '../integrations/pexels-connector/worker/src/index.js';
import { createPexelsMcpRouter } from '../backend/pexels-mcp.js';

const TOKEN = 'token-de-teste-0123456789abcdef';
const ENV = { PEXELS_API_KEY: 'chave-de-teste', MCP_TOKEN: TOKEN };
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

// Resposta de busca no formato da API do Pexels (dados de teste).
const SEARCH = {
  page: 1,
  per_page: 2,
  total_results: 2,
  next_page: 'https://api.pexels.com/v1/search/?page=2&per_page=2&query=prefeitura',
  photos: [
    { id: 101, width: 4000, height: 3000, url: 'https://www.pexels.com/photo/teste-101/', photographer: 'Fotógrafa Teste', photographer_url: 'https://www.pexels.com/@teste', avg_color: '#7A8B9C', alt: 'Prédio da prefeitura (teste)', src: { original: 'https://images.pexels.com/photos/101/o.jpeg', large2x: 'https://images.pexels.com/photos/101/l2x.jpeg', large: 'https://images.pexels.com/photos/101/l.jpeg', medium: 'https://images.pexels.com/photos/101/m.jpeg', small: 'https://images.pexels.com/photos/101/s.jpeg' } },
    { id: 102, width: 3000, height: 3000, url: 'https://www.pexels.com/photo/teste-102/', photographer: 'Fotógrafo Teste', photographer_url: 'https://www.pexels.com/@teste2', avg_color: null, alt: '', src: { original: 'https://images.pexels.com/photos/102/o.jpeg', large: 'https://images.pexels.com/photos/102/l.jpeg', small: 'https://images.pexels.com/photos/102/s.jpeg' } },
  ],
};

function fakePexels({ search = () => Response.json(SEARCH), image = () => new Response(PNG, { headers: { 'content-type': 'image/png' } }) } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = String(url);
    calls.push({ url: u, auth: init?.headers?.Authorization });
    if (u.startsWith('https://api.pexels.com/v1/search?')) return search(u);
    if (u.startsWith('https://images.pexels.com/')) return image(u);
    throw new Error(`rede bloqueada no teste: ${u}`);
  };
  return { calls, fetchImpl };
}

const post = (body, path = `/mcp/${TOKEN}`) => new Request(`https://pexels-gove.exemplo.workers.dev${path}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const rpc = (method, params, id = 1) => ({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) });
const call = (name, args, id = 1) => rpc('tools/call', { name, arguments: args }, id);

async function viaWorker(body, fetchImpl, env = ENV) {
  const r = await handleRequest(post(body), env, fetchImpl);
  return r.status === 200 ? r.json() : r;
}

/** Mesmo pedido no servidor completo da Gove (backend/pexels-mcp.js), para comparar. */
async function viaBackend(body, fetchImpl) {
  const app = express();
  app.use('/mcp/:token', createPexelsMcpRouter({ apiKey: ENV.PEXELS_API_KEY, token: TOKEN, fetchImpl }));
  const server = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/mcp/${TOKEN}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return r.json();
  } finally {
    server.close();
  }
}

test('worker: mesmas ferramentas e mesmo formato do servidor da Gove (search_photos, get_image)', async () => {
  for (const body of [
    rpc('tools/list'),
    call('search_photos', { query: 'prefeitura', per_page: 2, orientation: 'square' }),
    call('get_image', { url: 'https://images.pexels.com/photos/101/l2x.jpeg' }),
    call('get_image', { url: 'https://images.pexels.com/photos/101/l2x.jpeg', width: 9999 }),
    call('get_image', { url: 'https://evil.example/x.jpg' }),
    call('search_photos', { query: '   ' }),
    call('nada', {}),
    rpc('ping'),
    rpc('resources/list'),
  ]) {
    const a = fakePexels();
    const b = fakePexels();
    assert.deepEqual(await viaWorker(body, a.fetchImpl), await viaBackend(body, b.fetchImpl), JSON.stringify(body));
    assert.deepEqual(a.calls, b.calls, `mesmas chamadas ao Pexels: ${JSON.stringify(body)}`);
  }

  const { calls, fetchImpl } = fakePexels();
  const r = await viaWorker(call('search_photos', { query: 'prefeitura', orientation: 'square' }), fetchImpl);
  const data = r.result.structuredContent;
  assert.deepEqual(JSON.parse(r.result.content[0].text), data);
  assert.equal(data.photos.length, 2);
  assert.deepEqual({ ...data, photos: undefined }, { photos: undefined, page: 1, total: 2, next: true });
  assert.equal(data.photos[0].photographer, 'Fotógrafa Teste');
  assert.equal(data.photos[0].avgColor, '#7A8B9C');
  assert.equal(data.photos[1].avgColor, null);
  assert.equal(data.photos[0].src.thumb, `data:image/png;base64,${PNG.toString('base64')}`);
  assert.equal(data.photos[0].src.large, 'https://images.pexels.com/photos/101/l2x.jpeg');
  assert.equal(data.photos[1].src.large, 'https://images.pexels.com/photos/102/l.jpeg');
  const search = new URL(calls[0].url);
  assert.equal(calls[0].auth, 'chave-de-teste');
  assert.deepEqual(Object.fromEntries(search.searchParams), { query: 'prefeitura', locale: 'pt-BR', per_page: '12', page: '1', orientation: 'square' });
  assert.equal(new URL(calls[1].url).searchParams.get('w'), '360', 'miniatura redimensionada pela CDN do Pexels');
  assert.equal(new URL(calls[2].url).pathname, '/photos/102/s.jpeg', 'sem medium, usa small');
  assert.ok(!JSON.stringify(r).includes('chave-de-teste'), 'a chave não volta na resposta');

  const img = await viaWorker(call('get_image', { url: 'https://images.pexels.com/photos/101/l2x.jpeg' }), fetchImpl);
  assert.match(img.result.structuredContent.dataUrl, /^data:image\/png;base64,/);
  const u = new URL(calls.at(-1).url);
  assert.deepEqual([u.searchParams.get('w'), u.searchParams.get('auto'), u.searchParams.get('cs')], ['1600', 'compress', 'tinysrgb']);
});

test('worker: initialize, ping, notificações (202) e lote JSON-RPC', async () => {
  const { fetchImpl } = fakePexels();
  const init = await viaWorker(rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } }), fetchImpl);
  assert.equal(init.result.serverInfo.name, 'pexels-gove');
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.deepEqual(init.result.capabilities, { tools: { listChanged: false } });

  const note = await handleRequest(post({ jsonrpc: '2.0', method: 'notifications/initialized' }), ENV, fetchImpl);
  assert.equal(note.status, 202);
  assert.equal(await note.text(), '');

  const batch = await viaWorker([rpc('initialize', {}, 1), { jsonrpc: '2.0', method: 'notifications/initialized' }, rpc('tools/list', null, 2), call('search_photos', { query: 'escola' }, 3)], fetchImpl);
  assert.deepEqual(batch.map((m) => m.id), [1, 2, 3]);
  assert.deepEqual(batch[1].result.tools.map((t) => t.name), ['search_photos', 'get_image', 'capture_site']);
  assert.equal(batch[2].result.structuredContent.photos.length, 2);

  assert.equal((await handleRequest(post([{ jsonrpc: '2.0', method: 'notifications/cancelled' }]), ENV, fetchImpl)).status, 202);
  assert.equal((await handleRequest(post([]), ENV, fetchImpl)).status, 202);

  const bad = await handleRequest(post('{nao e json'), ENV, fetchImpl);
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error.code, -32700);
  assert.equal((await viaWorker(rpc('resources/list'), fetchImpl)).error.code, -32601);
  assert.equal((await viaWorker(call('nada', {}), fetchImpl)).error.code, -32602);
});

test('worker: token errado, sem token configurado ou outro caminho → 404; GET → 405', async () => {
  const { calls, fetchImpl } = fakePexels();
  for (const path of [`/mcp/${TOKEN}x`, `/mcp/${TOKEN.slice(0, -1)}`, '/mcp/', '/mcp', '/', `/mcp/${TOKEN}/extra`, `/outro/${TOKEN}`, '/mcp/%E0%A4%A']) {
    const r = await handleRequest(post(rpc('tools/list'), path), ENV, fetchImpl);
    assert.equal(r.status, 404, path);
    assert.equal(await r.text(), '', path);
  }
  assert.equal((await handleRequest(post(rpc('tools/list')), { PEXELS_API_KEY: 'x' }, fetchImpl)).status, 404, 'sem MCP_TOKEN, nada responde');
  assert.equal((await handleRequest(post(rpc('tools/list')), { PEXELS_API_KEY: 'x', MCP_TOKEN: '' }, fetchImpl)).status, 404);
  assert.equal((await handleRequest(post(rpc('tools/list'), `/mcp/${TOKEN}/`), ENV, fetchImpl)).status, 200, 'barra no fim aceita');

  const get = await handleRequest(new Request(`https://x.workers.dev/mcp/${TOKEN}`), ENV, fetchImpl);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal((await handleRequest(new Request(`https://x.workers.dev/mcp/errado`), ENV, fetchImpl)).status, 404, 'token antes do método');
  assert.equal(calls.length, 0);

  const big = await handleRequest(post(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { x: 'a'.repeat(70 * 1024) } })), ENV, fetchImpl);
  assert.equal(big.status, 413);
});

test('worker: erros do Pexels viram mensagens da ferramenta', async () => {
  const limit = fakePexels({ search: () => new Response('{}', { status: 429 }) });
  const r429 = (await viaWorker(call('search_photos', { query: 'praça' }), limit.fetchImpl)).result;
  assert.deepEqual(r429, { content: [{ type: 'text', text: 'Limite de buscas do Pexels atingido. Tente em alguns minutos.' }], isError: true });

  const down = fakePexels({ search: () => new Response('erro', { status: 500 }) });
  assert.equal((await viaWorker(call('search_photos', { query: 'praça' }), down.fetchImpl)).result.content[0].text, 'O Pexels não respondeu agora.');

  const offline = fakePexels({ search: () => Promise.reject(new TypeError('fetch failed')), image: () => Promise.reject(new TypeError('fetch failed')) });
  assert.equal((await viaWorker(call('search_photos', { query: 'praça' }), offline.fetchImpl)).result.content[0].text, 'O Pexels não respondeu agora.');
  assert.equal((await viaWorker(call('get_image', { url: 'https://images.pexels.com/photos/1/x.jpeg' }), offline.fetchImpl)).result.content[0].text, 'O Pexels não entregou a imagem.');

  const noKey = await viaWorker(call('search_photos', { query: 'praça' }), fakePexels().fetchImpl, { MCP_TOKEN: TOKEN });
  assert.equal(noKey.result.content[0].text, 'Busca no Pexels não configurada no servidor.');

  const brokenThumb = fakePexels({ image: () => new Response('x', { status: 404 }) });
  const s = (await viaWorker(call('search_photos', { query: 'praça' }), brokenThumb.fetchImpl)).result.structuredContent;
  assert.equal(s.photos[0].src.thumb, '', 'miniatura que falha fica vazia, a busca continua');
  assert.equal((await viaWorker(call('get_image', { url: 'https://images.pexels.com/photos/1/x.jpeg' }), brokenThumb.fetchImpl)).result.content[0].text, 'O Pexels não entregou a imagem.');
});

test('worker: get_image só aceita https://images.pexels.com e respeita o limite de 6 MB', async () => {
  const { calls, fetchImpl } = fakePexels();
  for (const url of ['https://evil.example/x.jpg', 'http://images.pexels.com/photos/1/x.jpeg', 'https://images.pexels.com.evil.example/x.jpg', 'https://www.pexels.com/photo/1/', 'nao-e-url', '']) {
    const r = (await viaWorker(call('get_image', { url }), fetchImpl)).result;
    assert.equal(r.isError, true, url);
  }
  assert.equal((await viaWorker(call('get_image', { url: 'https://evil.example/x.jpg' }), fetchImpl)).result.content[0].text, 'Só imagens de images.pexels.com.');
  assert.equal(calls.length, 0, 'nenhuma imagem de fora foi buscada');

  const huge = new Uint8Array(6 * 1024 * 1024 + 1);
  const big = fakePexels({ image: () => new Response(huge, { headers: { 'content-type': 'image/jpeg' } }) });
  assert.equal((await viaWorker(call('get_image', { url: 'https://images.pexels.com/photos/1/x.jpeg' }), big.fetchImpl)).result.content[0].text, 'Imagem grande demais.');
  const declared = fakePexels({ image: () => new Response(PNG, { headers: { 'content-type': 'image/png', 'content-length': String(7 * 1024 * 1024) } }) });
  assert.equal((await viaWorker(call('get_image', { url: 'https://images.pexels.com/photos/1/x.jpeg' }), declared.fetchImpl)).result.content[0].text, 'Imagem grande demais.');

  // base64 sem Buffer, em blocos: confere com o Buffer do Node num arquivo grande
  const bytes = new Uint8Array(1024 * 1024 + 7).map((_, i) => (i * 31 + (i >> 8)) & 255);
  const ok = fakePexels({ image: () => new Response(bytes, { headers: { 'content-type': 'image/jpeg; charset=binary' } }) });
  const d = (await viaWorker(call('get_image', { url: 'https://images.pexels.com/photos/1/x.jpeg', width: 2400 }), ok.fetchImpl)).result.structuredContent.dataUrl;
  assert.equal(d, `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`);
  assert.equal(new URL(ok.calls[0].url).searchParams.get('w'), '2400');
});

test('worker: capture_site aparece na lista e avisa que precisa do servidor da Gove', async () => {
  const { calls, fetchImpl } = fakePexels();
  const r = (await viaWorker(call('capture_site', { url: 'www.saocarlos.sp.gov.br' }), fetchImpl)).result;
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /^A captura de site precisa do servidor da Gove\./);
  assert.match(r.content[0].text, /manualmente/);
  assert.equal(calls.length, 0);
});

test('worker: export default { fetch } usa o fetch global', async () => {
  const { calls, fetchImpl } = fakePexels();
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    const r = await worker.fetch(post(call('search_photos', { query: 'saúde' })), ENV);
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /^application\/json/);
    assert.equal((await r.json()).result.structuredContent.total, 2);
    assert.equal(calls[0].auth, 'chave-de-teste');
  } finally {
    globalThis.fetch = original;
  }
});
