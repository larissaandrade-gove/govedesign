// Conector "Gove Grafana" (MCP + OAuth 2.1 com o login do Grafana). O Grafana aqui é um
// servidor HTTP falso, só para os testes; nenhum dado real de município.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDatabase } from '../db/database.js';
import { createApp } from '../backend/server.js';
import { guessMunicipio, loadIndicatorMap, parsePeriod, reduceResponse } from '../backend/grafana/indicators.js';

const { INDICATORS } = await import('../cases/src/data/indicators.ts');

const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const USERS = { ana: { password: 'Senha-da-Ana-123', id: 1 }, bia: { password: 'Senha-da-Bia-456', id: 2 } };
const MAY = Date.parse('2026-05-01T00:00:00-03:00');

/* --------------------------------------------------------- Grafana falso */

function dashboardJson() {
  return {
    uid: 'cases-sao-carlos',
    title: 'Cases - Exemplo do Sul/SP',
    templating: { list: [{ name: 'cidade', current: { value: 'exemplo-do-sul' } }, { name: 'ds', current: { value: 'prom-uid' } }] },
    panels: [
      {
        id: 1,
        type: 'row',
        title: 'Resultados',
        collapsed: true,
        panels: [{ id: 2, type: 'stat', title: 'Atendimentos realizados', datasource: { uid: '${ds}' }, options: { reduceOptions: { calcs: ['sum'] } }, targets: [{ refId: 'A', expr: 'atendimentos{cidade="$cidade"}' }] }],
      },
      { id: 3, type: 'stat', title: 'Taxa de Abertura', datasource: { uid: 'prom-uid' }, fieldConfig: { defaults: { unit: 'percentunit' } }, targets: [{ refId: 'A', expr: 'abertura' }] },
      { id: 4, type: 'table', title: 'Funcionalidades utilizadas', datasource: { uid: 'pg-uid' }, targets: [{ refId: 'A', rawSql: 'funcionalidades' }] },
      { id: 5, type: 'stat', title: 'Avaliação média', datasource: { uid: 'pg-uid' }, options: { reduceOptions: { calcs: ['mean'] } }, targets: [{ refId: 'A', rawSql: 'avaliacao' }] },
      { id: 6, type: 'geomap', title: 'Mapa por bairro', datasource: { uid: 'pg-uid' }, targets: [{ refId: 'A', rawSql: 'mapa' }] },
      { id: 7, type: 'stat', title: 'Painel sem nome padrão', datasource: { uid: 'pg-uid' }, targets: [{ refId: 'A', rawSql: 'ganho' }] },
      { id: 8, type: 'stat', title: 'Arrecadação após disparo', datasource: { uid: 'pg-uid' }, targets: [{ refId: 'A', rawSql: 'quebrado' }] },
      { id: 9, type: 'text', title: 'Notas' },
    ],
  };
}

const frame = (fields) => ({ schema: { fields: fields.map(([name, type]) => ({ name, type })) }, data: { values: fields.map(([, , values]) => values) } });

function fakeGrafana() {
  const sessions = new Map(); // cookie → login
  const rotatable = new Set();
  const seen = []; // { path, login, cookie }
  const queries = [];
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : null;
    const url = new URL(req.url, 'http://x');
    const cookie = /grafana_session=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
    const login = cookie ? sessions.get(cookie) : undefined;
    seen.push({ path: url.pathname, login, cookie });
    const send = (status, data, headers = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers });
      res.end(JSON.stringify(data));
    };
    const newSession = (who) => {
      const c = randomBytes(16).toString('hex');
      sessions.set(c, who);
      return c;
    };
    if (url.pathname === '/login' && req.method === 'POST') {
      const u = USERS[body?.user];
      if (!u || u.password !== body?.password) return send(401, { message: 'Invalid username or password' });
      return send(200, { message: 'Logged in' }, { 'set-cookie': `grafana_session=${newSession(body.user)}; Path=/; HttpOnly; SameSite=Lax` });
    }
    if (url.pathname === '/api/user/auth-tokens/rotate' && req.method === 'POST') {
      if (!cookie || !rotatable.has(cookie)) return send(401, { message: 'Unauthorized' });
      const who = sessions.get(cookie) ?? rotatable.who?.get(cookie);
      rotatable.delete(cookie);
      return send(200, {}, { 'set-cookie': `grafana_session=${newSession(who)}; Path=/; HttpOnly` });
    }
    if (!login) return send(401, { message: 'Unauthorized', messageId: 'session.token.rotate' });
    if (url.pathname === '/api/user') return send(200, { id: USERS[login].id, login, email: `${login}@exemplo.test` });
    if (url.pathname === '/api/search') {
      assert.equal(url.searchParams.get('type'), 'dash-db');
      const hits = [
        { uid: 'cases-sao-carlos', title: 'Cases - Exemplo do Sul/SP', type: 'dash-db', folderTitle: 'Cases', url: '/d/cases-sao-carlos/exemplo', tags: ['cases'] },
        { uid: 'cases-restrito', title: 'Cidade Restrita - MG', type: 'dash-db', folderTitle: 'Cases', url: '/d/cases-restrito/restrita', tags: ['cases'] },
        { uid: 'pasta', title: 'Cases', type: 'dash-folder' },
      ].filter((h) => login === 'ana' || h.uid !== 'cases-restrito');
      const qy = url.searchParams.get('query');
      return send(200, hits.filter((h) => !qy || h.title.toLowerCase().includes(qy.toLowerCase())));
    }
    const m = /^\/api\/dashboards\/uid\/(.+)$/.exec(url.pathname);
    if (m) {
      if (m[1] === 'cases-restrito') return login === 'ana' ? send(200, { dashboard: { ...dashboardJson(), uid: 'cases-restrito', title: 'Cidade Restrita - MG' }, meta: { folderTitle: 'Cases' } }) : send(403, { message: 'Access denied' });
      if (m[1] === 'lento') return setTimeout(() => send(200, {}), 600);
      if (m[1] !== 'cases-sao-carlos') return send(404, { message: 'Dashboard not found' });
      return send(200, { dashboard: dashboardJson(), meta: { folderTitle: 'Cases' } });
    }
    if (url.pathname === '/api/ds/query') {
      queries.push({ login, body });
      const prev = Number(body.from) < MAY;
      const results = {};
      for (const q of body.queries) {
        const key = q.expr ?? q.rawSql;
        if (key === 'quebrado') results[q.refId] = { error: 'syntax error', status: 400 };
        else if (key.startsWith('atendimentos')) results[q.refId] = { frames: [frame([['time', 'time', [1, 2, 3]], ['Value', 'number', prev ? [50, 50, 100] : [100, 200, 300]]])] };
        else if (key === 'abertura') results[q.refId] = { frames: [frame([['time', 'time', [1, 2]], ['Value', 'number', [0.4, 0.4512]]])] };
        else if (key === 'funcionalidades') results[q.refId] = { frames: [frame([['funcionalidade', 'string', ['Agendamento', 'Segunda via', 'Agendamento']], ['usos', 'number', [10, 4, 2]]])] };
        else if (key === 'avaliacao') results[q.refId] = { frames: [frame([['nota', 'number', [4, 5, 4.5]]])] };
        else if (key === 'ganho') results[q.refId] = { frames: [frame([['valor', 'number', [1234567.891]]])] };
        else results[q.refId] = { frames: [] };
      }
      return send(Object.values(results).some((r) => r.error) ? 207 : 200, { results });
    }
    return send(404, { message: 'not found' });
  });
  server.listen(0);
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    sessions,
    seen,
    queries,
    /** Simula o Grafana derrubando todas as sessões de alguém. */
    expire: (who) => {
      for (const [c, l] of sessions) if (l === who) sessions.delete(c);
    },
    /** Simula a renovação obrigatória do Grafana 10+: o cookie atual passa a exigir rotate. */
    needRotate: (who) => {
      rotatable.who = new Map();
      for (const [c, l] of sessions)
        if (l === who) {
          sessions.delete(c);
          rotatable.add(c);
          rotatable.who.set(c, l);
        }
    },
    close: () => server.close(),
  };
}

/* ------------------------------------------------------------ servidor Gove */

function captureLogs() {
  const lines = [];
  const orig = {};
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) {
    orig[k] = console[k];
    console[k] = (...a) => lines.push(a.map(String).join(' '));
  }
  return { lines, restore: () => Object.assign(console, orig) };
}

async function withConnector(fn, opts = {}) {
  const grafana = fakeGrafana();
  const dir = mkdtempSync(join(tmpdir(), 'gove-grafana-'));
  const db = openDatabase(join(dir, 'db.sqlite'));
  const map = JSON.parse(readFileSync(new URL('../backend/grafana/indicators.json', import.meta.url), 'utf8'));
  map.overrides = { 'cases-sao-carlos': { 7: 'ganho_financeiro' } };
  const logs = captureLogs();
  const app = createApp({
    db,
    storageDir: join(dir, 'audits'),
    allowedNetworks: '10.99.0.0/16', // VPN: o teste vem de 127.0.0.1, então só as rotas públicas respondem
    authOptions: { secret: 'teste', disabled: false },
    grafanaOptions: { grafanaUrl: grafana.url, secret: SECRET, publicBaseUrl: 'https://design.exemplo.test', indicatorMap: loadIndicatorMap(map), timeoutMs: 400, ...opts },
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn({ base, grafana, db, logs: logs.lines });
  } finally {
    logs.restore();
    server.close();
    grafana.close();
  }
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const pkce = () => {
  const verifier = b64url(randomBytes(48));
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
};
const hidden = (html, name) => new RegExp(`name="${name}" value="([^"]*)"`).exec(html)?.[1]?.replace(/&amp;/g, '&');
const cookieOf = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
const form = (base, path, fields, cookie) =>
  fetch(base + path, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}) }, body: new URLSearchParams(fields) });
const postJson = (base, path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

async function register(base) {
  const r = await postJson(base, '/oauth/register', { client_name: 'Claude', redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] });
  assert.equal(r.status, 201);
  return (await r.json()).client_id;
}

async function openLogin(base, clientId, challenge, extra = {}) {
  const qs = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: 'S256', state: 'estado-123', scope: 'grafana:read', resource: 'https://design.exemplo.test/mcp/grafana', ...extra });
  const r = await fetch(`${base}/oauth/authorize?${qs}`, { redirect: 'manual' });
  return { res: r, html: await r.text(), cookie: cookieOf(r) };
}

async function login(base, clientId, user, password, p = pkce()) {
  const page = await openLogin(base, clientId, p.challenge);
  assert.equal(page.res.status, 200);
  const r = await form(base, '/oauth/authorize', { request: hidden(page.html, 'request'), csrf: hidden(page.html, 'csrf'), username: user, password, action: 'login' }, page.cookie);
  return { res: r, pkce: p, page };
}

async function connect(base, user = 'ana') {
  const clientId = await register(base);
  const { res, pkce: p } = await login(base, clientId, user, USERS[user].password);
  assert.equal(res.status, 303);
  const loc = new URL(res.headers.get('location'));
  assert.equal(loc.origin + loc.pathname, REDIRECT);
  assert.equal(loc.searchParams.get('state'), 'estado-123');
  assert.equal(loc.searchParams.get('iss'), 'https://design.exemplo.test');
  const t = await form(base, '/oauth/token', { grant_type: 'authorization_code', code: loc.searchParams.get('code'), redirect_uri: REDIRECT, client_id: clientId, code_verifier: p.verifier });
  assert.equal(t.status, 200);
  return { clientId, tokens: await t.json(), code: loc.searchParams.get('code'), verifier: p.verifier };
}

const rpc = (base, token, method, params, id = 1) =>
  fetch(`${base}/mcp/grafana`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });
const call = async (base, token, name, args) => (await (await rpc(base, token, 'tools/call', { name, arguments: args })).json()).result;

/* ------------------------------------------------------------------- testes */

test('Gove Grafana: metadados OAuth públicos e 401 com WWW-Authenticate; resto do servidor segue só pela VPN', async () => {
  await withConnector(async ({ base }) => {
    const prm = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp/grafana`)).json();
    assert.equal(prm.resource, 'https://design.exemplo.test/mcp/grafana');
    assert.deepEqual(prm.authorization_servers, ['https://design.exemplo.test']);
    assert.deepEqual(await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json(), prm);
    const as = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
    assert.equal(as.issuer, 'https://design.exemplo.test');
    assert.equal(as.token_endpoint, 'https://design.exemplo.test/oauth/token');
    assert.deepEqual(as.code_challenge_methods_supported, ['S256']);
    assert.deepEqual(as.token_endpoint_auth_methods_supported, ['none']);

    const r = await rpc(base, null, 'initialize', { protocolVersion: '2025-06-18' });
    assert.equal(r.status, 401);
    assert.equal(r.headers.get('www-authenticate'), 'Bearer resource_metadata="https://design.exemplo.test/.well-known/oauth-protected-resource/mcp/grafana"');
    const bad = await rpc(base, 'token-inventado', 'tools/list');
    assert.equal(bad.status, 401);
    assert.match(bad.headers.get('www-authenticate'), /error="invalid_token"/);

    // Fora da VPN, o resto continua bloqueado (e o Pexels também segue no próprio endereço)
    assert.equal((await fetch(`${base}/api/health`)).status, 403);
    assert.equal((await fetch(`${base}/login`)).status, 403);
    assert.equal((await fetch(`${base}/oauth/assets/gove-logo-roxo.webp`)).status, 200);
    assert.equal((await fetch(`${base}/oauth/assets/..%2F..%2F.env`)).status, 404);
  });
});

test('Gove Grafana: fluxo OAuth completo com PKCE, MCP com a sessão da pessoa e rotação do refresh_token', async () => {
  await withConnector(async ({ base, grafana, db, logs }) => {
    const { clientId, tokens, code, verifier } = await connect(base, 'ana');
    assert.equal(tokens.token_type, 'Bearer');
    assert.ok(tokens.expires_in > 3000 && tokens.expires_in <= 3600);
    assert.ok(tokens.refresh_token);

    // Código de uso único
    const again = await form(base, '/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier });
    assert.equal(again.status, 400);

    const init = await (await rpc(base, tokens.access_token, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } })).json();
    assert.equal(init.result.serverInfo.name, 'gove-grafana');
    const list = await (await rpc(base, tokens.access_token, 'tools/list')).json();
    assert.deepEqual(list.result.tools.map((t) => t.name), ['list_case_dashboards', 'describe_dashboard', 'get_case_indicators']);
    assert.ok(list.result.tools.every((t) => t.annotations.readOnlyHint));

    const dash = (await call(base, tokens.access_token, 'list_case_dashboards', {})).structuredContent;
    assert.deepEqual(
      dash.dashboards.map((d) => [d.uid, d.municipio, d.uf]),
      [
        ['cases-restrito', 'Cidade Restrita', 'MG'],
        ['cases-sao-carlos', 'Exemplo do Sul', 'SP'],
      ],
    );
    assert.equal(dash.dashboards[1].url, `${grafana.url}/d/cases-sao-carlos/exemplo`);
    assert.equal(grafana.seen.find((s) => s.path === '/api/search').login, 'ana');

    // Refresh com rotação: o antigo deixa de valer; reusar derruba a autorização inteira
    const r1 = await form(base, '/oauth/token', { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId });
    assert.equal(r1.status, 200);
    const t2 = await r1.json();
    assert.notEqual(t2.refresh_token, tokens.refresh_token);
    assert.equal((await rpc(base, tokens.access_token, 'tools/list')).status, 401, 'access token antigo revogado na renovação');
    assert.equal((await rpc(base, t2.access_token, 'tools/list')).status, 200);
    const reuse = await form(base, '/oauth/token', { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId });
    assert.equal(reuse.status, 400);
    assert.equal((await rpc(base, t2.access_token, 'tools/list')).status, 401, 'reuso do refresh antigo revoga tudo');

    // Nada de senha, cookie do Grafana ou token em claro no banco
    const cookies = [...grafana.sessions.keys()];
    const dump = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map(({ name }) => JSON.stringify(db.prepare(`SELECT * FROM "${name}"`).all()))
      .join('\n');
    assert.ok(!dump.includes(USERS.ana.password), 'senha no banco');
    for (const c of cookies) assert.ok(!dump.includes(c), 'cookie do Grafana em claro no banco');
    for (const t of [tokens.access_token, tokens.refresh_token, t2.access_token, t2.refresh_token]) assert.ok(!dump.includes(t), 'token em claro no banco');
    const audit = db.prepare('SELECT grafana_login, tool, dashboard_uid, outcome FROM grafana_audit ORDER BY id').all();
    assert.deepEqual(audit.map((a) => [a.grafana_login, a.tool, a.outcome]), [
      ['ana', 'oauth_login', 'ok'],
      ['ana', 'list_case_dashboards', 'ok'],
    ]);
    assert.deepEqual(Object.keys(audit[0]).sort(), ['dashboard_uid', 'grafana_login', 'outcome', 'tool']);
    const joined = logs.join('\n');
    assert.ok(!joined.includes(USERS.ana.password));
    for (const c of cookies) assert.ok(!joined.includes(c));
  });
});

test('Gove Grafana: senha errada, usuário inexistente, CSRF, redirect_uri e PKCE', async () => {
  await withConnector(async ({ base, db, logs }) => {
    const clientId = await register(base);

    // Mesma mensagem para senha errada e usuário que não existe (sem enumeração)
    const wrong = await login(base, clientId, 'ana', 'senha-errada');
    const ghost = await login(base, clientId, 'ninguem', 'qualquer-coisa');
    for (const r of [wrong, ghost]) {
      assert.equal(r.res.status, 401);
      const html = await r.res.text();
      assert.match(html, /Usuário ou senha inválidos\./);
      assert.ok(!html.includes('senha-errada') && !html.includes('qualquer-coisa'), 'senha não volta para a página');
    }
    assert.match(wrong.page.html, /Entre com seu usuário do Grafana/);
    assert.match(wrong.page.html, /autocomplete="current-password"/);

    // CSRF: sem o campo, ou sem o cookie, não entra
    const p = pkce();
    const page = await openLogin(base, clientId, p.challenge);
    const fields = { request: hidden(page.html, 'request'), username: 'ana', password: USERS.ana.password };
    assert.equal((await form(base, '/oauth/authorize', fields, page.cookie)).status, 403);
    assert.equal((await form(base, '/oauth/authorize', { ...fields, csrf: hidden(page.html, 'csrf') })).status, 403);
    assert.equal((await form(base, '/oauth/authorize', { ...fields, csrf: 'x'.repeat(32) }, page.cookie)).status, 403);

    // redirect_uri fora da lista: nem registro, nem autorização
    const reg = await postJson(base, '/oauth/register', { redirect_uris: ['https://evil.example/callback'] });
    assert.equal(reg.status, 400);
    assert.equal((await reg.json()).error, 'invalid_redirect_uri');
    const evil = await openLogin(base, clientId, p.challenge, { redirect_uri: 'https://evil.example/callback' });
    assert.equal(evil.res.status, 400);
    assert.equal(evil.res.headers.get('location'), null);
    // PKCE obrigatório (S256)
    const plain = await openLogin(base, clientId, p.challenge, { code_challenge_method: 'plain' });
    assert.equal(plain.res.status, 303);
    assert.equal(new URL(plain.res.headers.get('location')).searchParams.get('error'), 'invalid_request');

    // PKCE diferente: código recusado (e queimado)
    const ok = await login(base, clientId, 'ana', USERS.ana.password);
    const code = new URL(ok.res.headers.get('location')).searchParams.get('code');
    const t = await form(base, '/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: pkce().verifier });
    assert.equal(t.status, 400);
    assert.equal((await t.json()).error, 'invalid_grant');
    const t2 = await form(base, '/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: ok.pkce.verifier });
    assert.equal(t2.status, 400);

    // Limite de tentativas por IP + usuário
    let last;
    for (let i = 0; i < 6; i++) last = await login(base, clientId, 'bia', 'errada-' + i);
    assert.equal(last.res.status, 429);
    assert.match(await last.res.text(), /Muitas tentativas/);

    const dump = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map(({ name }) => JSON.stringify(db.prepare(`SELECT * FROM "${name}"`).all()))
      .join('\n');
    for (const s of [USERS.ana.password, 'senha-errada', 'qualquer-coisa', 'errada-0', 'ninguem']) assert.ok(!dump.includes(s), `"${s}" no banco`);
    assert.ok(!logs.join('\n').includes('senha-errada'));
  });
});

test('Gove Grafana: indicadores do case mapeados para os ids de cases/src/data/indicators.ts', async () => {
  await withConnector(async ({ base, grafana }) => {
    const { tokens } = await connect(base, 'ana');
    const d = (await call(base, tokens.access_token, 'describe_dashboard', { dashboard_uid: 'cases-sao-carlos' })).structuredContent;
    assert.deepEqual(
      d.panels.map((p) => [p.id, p.indicator]),
      [
        [2, 'atendimentos'],
        [3, 'taxa_abertura'],
        [4, 'funcionalidades'],
        [5, 'avaliacao_media'],
        [6, null],
        [7, 'ganho_financeiro'],
        [8, 'arrecadacao_pos_disparo'],
        [9, null],
      ],
    );

    const r = await call(base, tokens.access_token, 'get_case_indicators', { dashboard_uid: 'cases-sao-carlos', from: '2026-05', to: '2026-06' });
    assert.equal(r.isError, undefined);
    const out = r.structuredContent;
    assert.equal(out.municipio, 'Exemplo do Sul');
    assert.equal(out.uf, 'SP');
    assert.equal(out.period.from, '2026-05-01T03:00:00.000Z');
    assert.equal(out.period.to, '2026-07-01T02:59:59.999Z');
    const byId = Object.fromEntries(out.indicators.map((i) => [i.id, i]));
    assert.deepEqual(byId.atendimentos, { id: 'atendimentos', unit: 'numero', panel_title: 'Atendimentos realizados', panel_id: 2, value: 600, before: 200, after: 600 });
    assert.equal(byId.taxa_abertura.value, 45.12);
    assert.deepEqual(byId.funcionalidades.items, ['Agendamento', 'Segunda via']);
    assert.equal(byId.avaliacao_media.value, 4.5);
    assert.equal(byId.ganho_financeiro.value, 1234567.891);
    assert.deepEqual(out.unmapped_panels, [{ id: 6, title: 'Mapa por bairro', type: 'geomap' }]);
    assert.deepEqual(out.failed_panels.map((f) => f.indicator), ['arrecadacao_pos_disparo']);

    // Ids e unidades batem com o app
    const app = new Map(INDICATORS.map((i) => [i.id, i.unit]));
    for (const i of out.indicators) assert.equal(app.get(i.id), i.unit, i.id);
    const map = JSON.parse(readFileSync(new URL('../backend/grafana/indicators.json', import.meta.url), 'utf8'));
    assert.deepEqual(Object.keys(map.indicators).sort(), [...app.keys()].sort());
    for (const [id, def] of Object.entries(map.indicators)) assert.equal(def.unit, app.get(id), id);

    // As consultas levam as variáveis do dashboard, a fonte de dados e o período
    const q = grafana.queries.find((x) => x.body.queries[0].expr?.startsWith('atendimentos'));
    assert.equal(q.login, 'ana');
    assert.equal(q.body.queries[0].expr, 'atendimentos{cidade="exemplo-do-sul"}');
    assert.deepEqual(q.body.queries[0].datasource, { uid: 'prom-uid' });
    assert.equal(q.body.from, String(Date.parse('2026-05-01T00:00:00-03:00')));
    // Nada linha a linha na resposta: só números reduzidos e nomes de funcionalidades
    assert.ok(!JSON.stringify(out).includes('"values"'));
    assert.ok(!JSON.stringify(out).includes('frames'));

    const bad = await call(base, tokens.access_token, 'get_case_indicators', { dashboard_uid: 'cases-sao-carlos', from: '2026-07', to: '2026-01' });
    assert.equal(bad.isError, true);
    assert.equal(bad.structuredContent.error.code, 'invalid_argument');
  });
});

test('Gove Grafana: permissão do Grafana por pessoa, 404, tempo esgotado e sessão expirada', async () => {
  await withConnector(async ({ base, grafana, db }) => {
    const ana = await connect(base, 'ana');
    const bia = await connect(base, 'bia');
    // Cada pessoa com o próprio cookie
    const biaList = (await call(base, bia.tokens.access_token, 'list_case_dashboards', { query: 'cidade' })).structuredContent;
    assert.equal(biaList.total, 0);
    const anaList = (await call(base, ana.tokens.access_token, 'list_case_dashboards', { query: 'cidade' })).structuredContent;
    assert.equal(anaList.total, 1);
    const searches = grafana.seen.filter((s) => s.path === '/api/search');
    assert.deepEqual(searches.map((s) => s.login), ['bia', 'ana']);
    assert.notEqual(searches[0].cookie, searches[1].cookie);

    const forbidden = await call(base, bia.tokens.access_token, 'get_case_indicators', { dashboard_uid: 'cases-restrito', from: '2026-05', to: '2026-05' });
    assert.equal(forbidden.isError, true);
    assert.equal(forbidden.structuredContent.error.code, 'forbidden');
    assert.equal(forbidden.content[0].text, 'Sem permissão no Grafana para este dashboard.');
    const missing = await call(base, bia.tokens.access_token, 'describe_dashboard', { dashboard_uid: 'nao-existe' });
    assert.equal(missing.structuredContent.error.code, 'not_found');
    const slow = await call(base, bia.tokens.access_token, 'describe_dashboard', { dashboard_uid: 'lento' });
    assert.equal(slow.structuredContent.error.code, 'timeout');
    assert.match(slow.content[0].text, /demorou demais/);

    // Grafana 10+: sessão pede renovação; o conector renova sozinho e guarda o cookie novo
    grafana.needRotate('ana');
    assert.equal((await call(base, ana.tokens.access_token, 'list_case_dashboards', {})).isError, undefined);
    assert.equal((await call(base, ana.tokens.access_token, 'list_case_dashboards', {})).isError, undefined);

    // Sessão do Grafana derrubada: 401 com WWW-Authenticate para o claude.ai pedir o login de novo
    grafana.expire('bia');
    const r = await rpc(base, bia.tokens.access_token, 'tools/call', { name: 'list_case_dashboards', arguments: {} });
    assert.equal(r.status, 401);
    assert.match(r.headers.get('www-authenticate'), /^Bearer resource_metadata="https:\/\/design\.exemplo\.test\/\.well-known\/oauth-protected-resource\/mcp\/grafana", error="invalid_token"/);
    const refresh = await form(base, '/oauth/token', { grant_type: 'refresh_token', refresh_token: bia.tokens.refresh_token, client_id: bia.clientId });
    assert.equal(refresh.status, 400, 'autorização revogada: o refresh também cai');

    const outcomes = db.prepare("SELECT grafana_login, tool, dashboard_uid, outcome FROM grafana_audit WHERE grafana_login = 'bia' AND tool != 'oauth_login' ORDER BY id").all();
    assert.deepEqual(
      outcomes.map((o) => [o.tool, o.dashboard_uid, o.outcome]),
      [
        ['list_case_dashboards', null, 'ok'],
        ['get_case_indicators', 'cases-restrito', 'forbidden'],
        ['describe_dashboard', 'nao-existe', 'not_found'],
        ['describe_dashboard', 'lento', 'timeout'],
        ['list_case_dashboards', null, 'session_expired'],
      ],
    );
  });
});

test('Gove Grafana: sem configuração responde 503 e o servidor sobe', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gove-grafana-off-'));
  const app = createApp({ db: openDatabase(join(dir, 'db.sqlite')), storageDir: join(dir, 'a'), grafanaOptions: { grafanaUrl: '', secret: '', publicBaseUrl: '' }, authOptions: { secret: 't', disabled: false } });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const p of ['/mcp/grafana', '/oauth/authorize', '/.well-known/oauth-authorization-server', '/.well-known/oauth-protected-resource/mcp/grafana']) {
      const r = await fetch(base + p, { method: p === '/mcp/grafana' ? 'POST' : 'GET' });
      assert.equal(r.status, 503, p);
      assert.match((await r.json()).error, /GRAFANA_URL, GRAFANA_CONNECTOR_SECRET, PUBLIC_BASE_URL/);
    }
    assert.equal((await fetch(`${base}/login`)).status, 200);
  } finally {
    server.close();
  }
});

test('Gove Grafana: município pelo título, período e redução', () => {
  assert.deepEqual(guessMunicipio('Cases - Exemplo do Sul/SP'), { nome: 'Exemplo do Sul', uf: 'SP' });
  assert.deepEqual(guessMunicipio('Prefeitura de Vila Exemplo (RJ)'), { nome: 'Vila Exemplo', uf: 'RJ' });
  assert.deepEqual(guessMunicipio('Campo Exemplo'), { nome: 'Campo Exemplo' });
  const p = parsePeriod('2026-01', '2026-03');
  assert.equal(new Date(p.fromMs).toISOString(), '2026-01-01T03:00:00.000Z');
  assert.equal(new Date(p.toMs).toISOString(), '2026-04-01T02:59:59.999Z');
  assert.throws(() => parsePeriod('ontem', 'hoje'), RangeError);
  const resp = { results: { A: { frames: [frame([['a', 'number', [1, 2, 3]]]), frame([['b', 'number', [10, 20]]])] } } };
  assert.equal(reduceResponse(resp, { reduce: 'last' }).value, 23);
  assert.equal(reduceResponse(resp, { reduce: 'sum' }).value, 36);
  assert.equal(reduceResponse(resp, { reduce: 'mean' }).value, 8.5);
  assert.equal(reduceResponse({ results: {} }, { reduce: 'sum' }).value, null);
});
