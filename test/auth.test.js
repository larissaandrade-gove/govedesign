// Login do ambiente: domínio, código por e-mail, criação de senha e sessão.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../db/database.js';
import { createApp } from '../backend/server.js';

async function withServer(fn) {
  const sent = [];
  const mailer = { sendMail: async (m) => sent.push(m) };
  const dir = mkdtempSync(join(tmpdir(), 'gove-auth-'));
  const app = createApp({ db: openDatabase(join(dir, 'db.sqlite')), storageDir: join(dir, 'audits'), authOptions: { secret: 'teste', mailer, disabled: false } });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn({ base, sent });
  } finally {
    server.close();
  }
}

const post = (base, path, body, cookie) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body), redirect: 'manual' });

test('bloqueia sem login e só aceita @gove.digital', async () => {
  await withServer(async ({ base }) => {
    const page = await fetch(base + '/design-system/', { headers: { accept: 'text/html' }, redirect: 'manual' });
    assert.equal(page.status, 302);
    assert.match(page.headers.get('location'), /^\/login\?next=/);
    assert.equal((await fetch(base + '/api/tokens', { redirect: 'manual' })).status, 401);
    assert.equal((await post(base, '/auth/start', { email: 'alguem@gmail.com' })).status, 403);
    assert.equal((await fetch(base + '/login')).status, 200);
  });
});

test('primeiro acesso por código, depois e-mail + senha', async () => {
  await withServer(async ({ base, sent }) => {
    const email = 'Pessoa@Gove.Digital';
    const r1 = await (await post(base, '/auth/start', { email })).json();
    assert.equal(r1.next, 'code');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'pessoa@gove.digital');
    const code = sent[0].text.match(/\d{6}/)[0];
    assert.equal((await post(base, '/auth/verify', { email, code: '000000' === code ? '111111' : '000000' })).status, 400);
    const { setupToken } = await (await post(base, '/auth/verify', { email, code })).json();
    assert.equal((await post(base, '/auth/password', { setupToken, password: 'curta' })).status, 400);
    const set = await post(base, '/auth/password', { setupToken, password: 'senha-forte-123' });
    assert.equal(set.status, 200);
    const cookie = set.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(base + '/auth/me', { headers: { cookie } })).status, 200);

    // Segundo acesso: pede senha, sem novo código
    const r2 = await (await post(base, '/auth/start', { email })).json();
    assert.equal(r2.next, 'password');
    assert.equal(sent.length, 1);
    assert.equal((await post(base, '/auth/login', { email, password: 'errada-errada' })).status, 401);
    const ok = await post(base, '/auth/login', { email, password: 'senha-forte-123' });
    assert.equal(ok.status, 200);
    const cookie2 = ok.headers.get('set-cookie').split(';')[0];
    assert.notEqual((await fetch(base + '/design-system/', { headers: { cookie: cookie2, accept: 'text/html' }, redirect: 'manual' })).status, 302);
  });
});

test('só pela VPN: fora das redes liberadas, 403 antes do login', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gove-vpn-'));
  const make = (allowedNetworks) => createApp({ db: openDatabase(join(dir, `${allowedNetworks.length}.sqlite`)), storageDir: join(dir, 'audits'), allowedNetworks, authOptions: { secret: 'teste', mailer: { sendMail: async () => {} }, disabled: false } });
  for (const [nets, status] of [['10.8.0.0/16', 403], ['10.8.0.0/16, 127.0.0.1', 200]]) {
    const server = make(nets).listen(0);
    try {
      const r = await fetch(`http://127.0.0.1:${server.address().port}/login`, { headers: { accept: 'text/html' } });
      assert.equal(r.status, status);
      if (status === 403) assert.match(await r.text(), /Conecte-se à VPN Gove/);
    } finally {
      server.close();
    }
  }
});
