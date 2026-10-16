// Rota do banco de imagens: chave só no servidor, busca normalizada e imagens só do Pexels.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createPexelsRouter } from '../backend/pexels.js';

function serve(opts) {
  const app = express();
  app.use('/api/pexels', createPexelsRouter(opts));
  const server = app.listen(0);
  return { base: `http://127.0.0.1:${server.address().port}/api/pexels`, close: () => server.close() };
}

test('sem chave: indisponível', async () => {
  const s = serve({ apiKey: '' });
  try {
    assert.deepEqual(await (await fetch(s.base + '/status')).json(), { available: false });
    assert.equal((await fetch(s.base + '/search?q=cidade')).status, 503);
  } finally {
    s.close();
  }
});

test('busca envia a chave só para a API e normaliza o resultado', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization });
    return new Response(JSON.stringify({ page: 1, total_results: 1, photos: [{ id: 7, alt: 'Prefeitura', width: 4000, height: 3000, avg_color: '#334455', photographer: 'Ana', url: 'https://www.pexels.com/photo/7', src: { medium: 'https://images.pexels.com/m.jpg', large2x: 'https://images.pexels.com/l.jpg', original: 'https://images.pexels.com/o.jpg' } }] }), { headers: { 'content-type': 'application/json' } });
  };
  const s = serve({ apiKey: 'segredo', fetchImpl });
  try {
    const r = await (await fetch(s.base + '/search?q=prefeitura&orientation=square')).json();
    assert.equal(r.photos[0].src.large, 'https://images.pexels.com/l.jpg');
    assert.equal(r.photos[0].photographer, 'Ana');
    assert.equal(calls[0].auth, 'segredo');
    assert.match(calls[0].url, /orientation=square/);
    assert.ok(!JSON.stringify(r).includes('segredo'));
  } finally {
    s.close();
  }
});

test('imagem: só do host do Pexels', async () => {
  const s = serve({ apiKey: 'k', fetchImpl: async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }) });
  try {
    assert.equal((await fetch(s.base + '/image?u=' + encodeURIComponent('https://evil.example/x.jpg'))).status, 400);
    const ok = await fetch(s.base + '/image?u=' + encodeURIComponent('https://images.pexels.com/photos/1/a.jpg'));
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/jpeg');
  } finally {
    s.close();
  }
});
