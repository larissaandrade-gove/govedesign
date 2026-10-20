// Conector "Pexels Gove" (MCP): token no endereço, busca com miniaturas em data URI e imagem.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createPexelsMcpRouter } from '../backend/pexels-mcp.js';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
function serve(opts) {
  const app = express();
  app.use('/mcp/:token', createPexelsMcpRouter(opts));
  const server = app.listen(0);
  return { base: `http://127.0.0.1:${server.address().port}/mcp`, close: () => server.close() };
}
const rpc = (url, method, params, id = 1) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });

test('conector: token errado some (404); fluxo MCP completo', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization });
    if (String(url).startsWith('https://api.pexels.com')) {
      return new Response(JSON.stringify({ page: 1, total_results: 1, next_page: 'x', photos: [{ id: 7, alt: 'Prefeitura', width: 10, height: 10, photographer: 'Ana', url: 'https://www.pexels.com/photo/7', src: { medium: 'https://images.pexels.com/m.jpg', large2x: 'https://images.pexels.com/l.jpg', original: 'https://images.pexels.com/o.jpg' } }] }), { headers: { 'content-type': 'application/json' } });
    }
    return new Response(PNG, { headers: { 'content-type': 'image/png' } });
  };
  const s = serve({ apiKey: 'chave', token: 'segredo-longo', fetchImpl });
  try {
    assert.equal((await rpc(`${s.base}/errado`, 'tools/list')).status, 404);
    const url = `${s.base}/segredo-longo`;
    const init = await (await rpc(url, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } })).json();
    assert.equal(init.result.serverInfo.name, 'pexels-gove');
    assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) })).status, 202);
    const list = await (await rpc(url, 'tools/list')).json();
    assert.deepEqual(list.result.tools.map((t) => t.name), ['search_photos', 'get_image']);

    const r = await (await rpc(url, 'tools/call', { name: 'search_photos', arguments: { query: 'prefeitura', orientation: 'square' } })).json();
    const data = r.result.structuredContent;
    assert.equal(data.photos[0].photographer, 'Ana');
    assert.match(data.photos[0].src.thumb, /^data:image\/png;base64,/);
    assert.equal(data.photos[0].src.large, 'https://images.pexels.com/l.jpg');
    assert.equal(calls[0].auth, 'chave');
    assert.ok(!JSON.stringify(r).includes('chave'));

    const img = await (await rpc(url, 'tools/call', { name: 'get_image', arguments: { url: 'https://images.pexels.com/l.jpg' } })).json();
    assert.match(img.result.structuredContent.dataUrl, /^data:image\/png;base64,/);
    const bad = await (await rpc(url, 'tools/call', { name: 'get_image', arguments: { url: 'https://evil.example/x.jpg' } })).json();
    assert.equal(bad.result.isError, true);
  } finally {
    s.close();
  }
});
