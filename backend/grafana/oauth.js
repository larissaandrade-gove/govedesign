// OAuth 2.1 do conector "Gove Grafana" (autorização MCP dos conectores personalizados do claude.ai).
//
// - Metadados: /.well-known/oauth-protected-resource[/mcp/grafana] e /.well-known/oauth-authorization-server.
// - Registro dinâmico de cliente público (/oauth/register), só com redirect_uri da lista
//   GRAFANA_CONNECTOR_REDIRECTS (comparação exata).
// - /oauth/authorize: tela de login Gove com o usuário e a senha do Grafana (CSRF, limite de tentativas).
// - /oauth/token: authorization_code com PKCE S256 obrigatório e refresh_token com rotação.
//
// Guardamos só: o cookie de sessão do Grafana da pessoa, criptografado com AES-256-GCM (chave
// derivada de GRAFANA_CONNECTOR_SECRET), e os tokens do claude.ai como hash SHA-256.
// A senha passa direto para o Grafana e nunca é guardada nem registrada em log.
import express from 'express';
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GrafanaError } from './client.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const ACCESS_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TTL_MS = 7 * 864e5; // renovação deslizante; o Grafana derruba sessões paradas há 7 dias (padrão)
export const GRANT_MAX_MS = 30 * 864e5; // vida máxima da sessão do Grafana (login_maximum_lifetime_duration padrão)
const CODE_TTL_MS = 5 * 60 * 1000;
const FORM_TTL_MS = 20 * 60 * 1000;
const LOGIN_MAX_FAILS = 5;
const LOGIN_IP_MAX_FAILS = 20;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_MAX_PER_HOUR = 30;
const SCOPE = 'grafana:read';
const CSRF_COOKIE = 'gove_grafana_csrf';
export const MCP_PATH = '/mcp/grafana';
export const INVALID_LOGIN = 'Usuário ou senha inválidos.';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS grafana_oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT,
  redirect_uris TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS grafana_oauth_grants (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  grafana_login TEXT NOT NULL,
  session_enc TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS grafana_oauth_codes (
  code_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS grafana_oauth_tokens (
  token_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_grafana_tokens_grant ON grafana_oauth_tokens (grant_id);
CREATE TABLE IF NOT EXISTS grafana_login_attempts (
  key_hash TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  locked_until INTEGER
);
CREATE TABLE IF NOT EXISTS grafana_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  grafana_login TEXT,
  tool TEXT NOT NULL,
  dashboard_uid TEXT,
  outcome TEXT NOT NULL
);`;

const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
const token = (bytes = 32) => randomBytes(bytes).toString('base64url');
const sameText = (a, b) => {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clientIp = (req) => String(req.ip ?? req.socket?.remoteAddress ?? '').replace(/^::ffff:/, '');

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export const parseRedirects = (raw) =>
  String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Arquivos públicos da tela de login (logo e fontes), servidos sem VPN. */
const ASSETS = {
  'gove-logo-roxo.webp': ['brand/logos/gove-logo-roxo.webp', 'image/webp'],
  'gove-logo-branco.webp': ['brand/logos/gove-logo-branco.webp', 'image/webp'],
  'gove-simbolo-roxo.png': ['brand/logos/gove-simbolo-roxo.png', 'image/png'],
  'montserrat-700.woff2': ['node_modules/@fontsource/montserrat/files/montserrat-latin-700-normal.woff2', 'font/woff2'],
  'montserrat-800.woff2': ['node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff2', 'font/woff2'],
  'inter-400.woff': ['cases/src/assets/fonts/inter-latin-400-normal.woff', 'font/woff'],
  'inter-600.woff': ['cases/src/assets/fonts/inter-latin-600-normal.woff', 'font/woff'],
};

/**
 * @param {object} o
 * @param {import('better-sqlite3').Database} o.db
 * @param {string} o.secret          GRAFANA_CONNECTOR_SECRET
 * @param {string} o.publicBaseUrl   PUBLIC_BASE_URL (emissor e base dos endereços)
 * @param {string[]} o.redirects     redirect_uri aceitos (comparação exata)
 * @param {ReturnType<import('./client.js').createGrafanaClient>} o.grafana
 */
export function createOAuth({ db, secret, publicBaseUrl, redirects, grafana, audit, log = console, now = Date.now }) {
  db.exec(SCHEMA);
  const base = publicBaseUrl.replace(/\/+$/, '');
  const resource = base + MCP_PATH;
  const resourceMetadataUrl = `${base}/.well-known/oauth-protected-resource${MCP_PATH}`;
  const secure = base.startsWith('https://');
  const allowed = new Set(redirects);
  const formOrigins = [...new Set(redirects.map((u) => URL.canParse(u) && new URL(u).origin).filter(Boolean))];

  const key = (info) => Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), Buffer.from('gove-grafana-connector'), Buffer.from(info), 32));
  const encKey = key('grafana-session-v1');
  const macKey = key('authorize-form-v1');

  function encrypt(plain, aad) {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', encKey, iv);
    c.setAAD(Buffer.from(aad));
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.');
  }
  function decrypt(blob, aad) {
    const [v, iv, tag, ct] = String(blob ?? '').split('.');
    if (v !== 'v1') return null;
    try {
      const d = createDecipheriv('aes-256-gcm', encKey, Buffer.from(iv, 'base64url'));
      d.setAAD(Buffer.from(aad));
      d.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
    } catch {
      return null;
    }
  }

  const sign = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${createHmac('sha256', macKey).update(body).digest('base64url')}`;
  };
  const unsign = (signed) => {
    const [body, mac] = String(signed ?? '').split('.');
    if (!body || !mac || !sameText(mac, createHmac('sha256', macKey).update(body).digest('base64url'))) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      return p.exp > now() ? p : null;
    } catch {
      return null;
    }
  };

  /* ------------------------------------------------------------ armazenamento */

  const q = {
    client: db.prepare('SELECT * FROM grafana_oauth_clients WHERE client_id = ?'),
    addClient: db.prepare('INSERT INTO grafana_oauth_clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)'),
    countClients: db.prepare('SELECT COUNT(*) AS n FROM grafana_oauth_clients WHERE created_at > ?'),
    grant: db.prepare('SELECT * FROM grafana_oauth_grants WHERE id = ?'),
    addGrant: db.prepare('INSERT INTO grafana_oauth_grants (id, client_id, grafana_login, session_enc, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)'),
    setSession: db.prepare('UPDATE grafana_oauth_grants SET session_enc = ? WHERE id = ?'),
    delGrant: db.prepare('DELETE FROM grafana_oauth_grants WHERE id = ?'),
    delGrantTokens: db.prepare('DELETE FROM grafana_oauth_tokens WHERE grant_id = ?'),
    delGrantCodes: db.prepare('DELETE FROM grafana_oauth_codes WHERE grant_id = ?'),
    addCode: db.prepare('INSERT INTO grafana_oauth_codes (code_hash, grant_id, client_id, redirect_uri, code_challenge, expires_at) VALUES (?, ?, ?, ?, ?, ?)'),
    takeCode: db.prepare('DELETE FROM grafana_oauth_codes WHERE code_hash = ? RETURNING *'),
    addToken: db.prepare('INSERT INTO grafana_oauth_tokens (token_hash, grant_id, kind, expires_at) VALUES (?, ?, ?, ?)'),
    token: db.prepare('SELECT * FROM grafana_oauth_tokens WHERE token_hash = ? AND kind = ?'),
    useToken: db.prepare('UPDATE grafana_oauth_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL'),
    delAccess: db.prepare("DELETE FROM grafana_oauth_tokens WHERE grant_id = ? AND kind = 'access'"),
    attempt: db.prepare('SELECT * FROM grafana_login_attempts WHERE key_hash = ?'),
    putAttempt: db.prepare('INSERT OR REPLACE INTO grafana_login_attempts (key_hash, fails, window_start, locked_until) VALUES (?, ?, ?, ?)'),
    delAttempt: db.prepare('DELETE FROM grafana_login_attempts WHERE key_hash = ?'),
  };

  const revokeGrant = db.transaction((id) => {
    q.delGrantTokens.run(id);
    q.delGrantCodes.run(id);
    q.delGrant.run(id);
  });

  let lastCleanup = 0;
  function cleanup() {
    const t = now();
    if (t - lastCleanup < 60_000) return;
    lastCleanup = t;
    db.prepare('DELETE FROM grafana_oauth_codes WHERE expires_at < ?').run(t);
    db.prepare('DELETE FROM grafana_oauth_tokens WHERE expires_at < ?').run(t);
    db.prepare('DELETE FROM grafana_oauth_tokens WHERE grant_id IN (SELECT id FROM grafana_oauth_grants WHERE expires_at < ?)').run(t);
    db.prepare('DELETE FROM grafana_oauth_grants WHERE expires_at < ?').run(t);
    // Login feito, mas o código nunca trocado por token: some junto com o código
    db.prepare(
      'DELETE FROM grafana_oauth_grants WHERE created_at < ? AND id NOT IN (SELECT grant_id FROM grafana_oauth_tokens) AND id NOT IN (SELECT grant_id FROM grafana_oauth_codes)',
    ).run(t - CODE_TTL_MS);
    db.prepare('DELETE FROM grafana_login_attempts WHERE window_start < ? AND (locked_until IS NULL OR locked_until < ?)').run(t - LOGIN_WINDOW_MS, t);
  }

  function issueTokens(grant) {
    const t = now();
    const access = token();
    const refresh = token();
    db.transaction(() => {
      q.addToken.run(sha256(access), grant.id, 'access', t + ACCESS_TTL_MS);
      q.addToken.run(sha256(refresh), grant.id, 'refresh', Math.min(grant.expires_at, t + REFRESH_TTL_MS));
    })();
    return { access_token: access, token_type: 'Bearer', expires_in: Math.floor(ACCESS_TTL_MS / 1000), refresh_token: refresh, scope: SCOPE };
  }

  /* -------------------------------------------------------- limite de login */

  function loginBlocked(keys) {
    const t = now();
    return keys.some(([k]) => {
      const row = q.attempt.get(k);
      return row?.locked_until && row.locked_until > t;
    });
  }
  function loginFailed(keys) {
    const t = now();
    for (const [k, max] of keys) {
      const row = q.attempt.get(k);
      const fresh = !row || t - row.window_start > LOGIN_WINDOW_MS;
      const fails = fresh ? 1 : row.fails + 1;
      q.putAttempt.run(k, fails, fresh ? t : row.window_start, fails >= max ? t + LOGIN_WINDOW_MS : null);
    }
  }

  /* ------------------------------------------------------------------ páginas */

  function page(res, status, body, { csrfCookie } = {}) {
    if (csrfCookie) res.cookie(CSRF_COOKIE, csrfCookie, { httpOnly: true, sameSite: 'strict', secure, path: '/oauth', maxAge: FORM_TTL_MS });
    res
      .status(status)
      .set({
        'Content-Security-Policy': `default-src 'none'; img-src 'self'; font-src 'self'; style-src 'unsafe-inline'; form-action 'self' ${formOrigins.join(' ')}; frame-ancestors 'none'; base-uri 'none'`,
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .type('html')
      .send(body);
  }

  function loginForm({ request, csrf, user = '', error = '', clientName }) {
    return renderLoginPage({ request, csrf, user, error, clientName });
  }

  const errorPage = (res, status, title, text) => page(res, status, renderMessagePage(title, text));

  const redirectWith = (res, redirectUri, params) => {
    const u = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, v);
    res.set('Cache-Control', 'no-store').redirect(303, u.toString());
  };

  /* ---------------------------------------------------------------- rotas */

  const router = express.Router();
  const cors = (_req, res, next) => {
    res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    next();
  };
  const preflight = (req, res, next) => (req.method === 'OPTIONS' ? res.status(204).end() : next());

  const protectedResource = (_req, res) =>
    res.json({ resource, authorization_servers: [base], bearer_methods_supported: ['header'], scopes_supported: [SCOPE], resource_name: 'Gove Grafana' });
  const authServer = (_req, res) =>
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      registration_endpoint: `${base}/oauth/register`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: [SCOPE],
      authorization_response_iss_parameter_supported: true,
      service_documentation: `${base}${MCP_PATH}`,
    });
  router.use('/.well-known', cors, preflight);
  router.get('/.well-known/oauth-protected-resource', protectedResource);
  router.get(`/.well-known/oauth-protected-resource${MCP_PATH}`, protectedResource);
  router.get('/.well-known/oauth-authorization-server', authServer);
  router.get('/.well-known/oauth-authorization-server/*rest', authServer);

  router.get('/oauth/assets/:file', (req, res) => {
    const a = ASSETS[req.params.file];
    if (!a) return res.status(404).end();
    try {
      res.set('Cache-Control', 'public, max-age=86400').type(a[1]).send(readFileSync(join(ROOT, a[0])));
    } catch {
      res.status(404).end();
    }
  });

  const oauthError = (res, status, error, description) => res.status(status).set('Cache-Control', 'no-store').json({ error, error_description: description });

  // Registro dinâmico (RFC 7591): só clientes públicos, só redirect_uri da lista
  const registrations = [];
  router.post('/oauth/register', cors, express.json({ limit: '16kb' }), (req, res) => {
    const t = now();
    while (registrations.length && registrations[0] < t - 36e5) registrations.shift();
    if (registrations.length >= REGISTER_MAX_PER_HOUR * 10 || q.countClients.get(t - 36e5).n >= REGISTER_MAX_PER_HOUR * 10) return oauthError(res, 429, 'temporarily_unavailable', 'Muitos registros. Tente mais tarde.');
    const body = req.body ?? {};
    const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
    if (!uris.length || !uris.every((u) => allowed.has(u))) return oauthError(res, 400, 'invalid_redirect_uri', 'redirect_uri não permitido para este conector.');
    const grants = body.grant_types ?? ['authorization_code', 'refresh_token'];
    if (!Array.isArray(grants) || grants.some((g) => !['authorization_code', 'refresh_token'].includes(g))) return oauthError(res, 400, 'invalid_client_metadata', 'grant_types não suportado.');
    if (body.response_types && (!Array.isArray(body.response_types) || body.response_types.some((r) => r !== 'code'))) return oauthError(res, 400, 'invalid_client_metadata', 'response_types não suportado.');
    registrations.push(t);
    const clientId = `gg_${token(18)}`;
    const name = String(body.client_name ?? 'Claude').slice(0, 80);
    q.addClient.run(clientId, name, JSON.stringify(uris), t);
    res
      .status(201)
      .set('Cache-Control', 'no-store')
      .json({
        client_id: clientId,
        client_id_issued_at: Math.floor(t / 1000),
        client_name: name,
        redirect_uris: uris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        scope: SCOPE,
      });
  });

  /** Confere o pedido de autorização. Devolve { ok, params } ou { error, redirect? }. */
  function checkAuthorize(p) {
    const client = p.client_id ? q.client.get(String(p.client_id)) : null;
    const redirectUri = String(p.redirect_uri ?? '');
    if (!client) return { page: ['Conector não reconhecido', 'Este pedido de conexão não veio de um cliente registrado. Volte ao claude.ai e conecte o Gove Grafana de novo.'] };
    const uris = JSON.parse(client.redirect_uris);
    if (!uris.includes(redirectUri) || !allowed.has(redirectUri)) return { page: ['Endereço de retorno não permitido', 'O endereço de retorno deste pedido não está na lista do conector.'] };
    const back = (error, description) => ({ redirect: { redirectUri, error, error_description: description, state: p.state, iss: base } });
    if (p.response_type !== 'code') return back('unsupported_response_type', 'Só response_type=code.');
    if (!p.code_challenge || p.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(String(p.code_challenge))) return back('invalid_request', 'PKCE S256 obrigatório.');
    if (p.resource && String(p.resource).replace(/\/$/, '') !== resource) return back('invalid_target', 'resource diferente deste conector.');
    return { ok: true, client, params: { client_id: client.client_id, redirect_uri: redirectUri, code_challenge: String(p.code_challenge), state: p.state == null ? '' : String(p.state).slice(0, 1024) } };
  }

  router.get('/oauth/authorize', (req, res) => {
    cleanup();
    const r = checkAuthorize(req.query);
    if (r.page) return errorPage(res, 400, ...r.page);
    if (r.redirect) return redirectWith(res, r.redirect.redirectUri, { error: r.redirect.error, error_description: r.redirect.error_description, state: r.redirect.state, iss: r.redirect.iss });
    const csrf = token(24);
    const request = sign({ ...r.params, csrf: sha256(csrf), exp: now() + FORM_TTL_MS });
    page(res, 200, loginForm({ request, csrf, clientName: r.client.client_name }), { csrfCookie: csrf });
  });

  router.post('/oauth/authorize', express.urlencoded({ extended: false, limit: '16kb' }), async (req, res) => {
    const b = req.body ?? {};
    const cookieCsrf = parseCookies(req.headers.cookie)[CSRF_COOKIE];
    const signed = unsign(b.request);
    if (!signed) return errorPage(res, 400, 'Pedido expirado', 'O tempo para entrar acabou. Volte ao claude.ai e conecte o Gove Grafana de novo.');
    if (!b.csrf || !cookieCsrf || !sameText(b.csrf, cookieCsrf) || !sameText(sha256(b.csrf), signed.csrf)) {
      return errorPage(res, 403, 'Formulário inválido', 'Não foi possível confirmar este formulário. Volte ao claude.ai e conecte o Gove Grafana de novo.');
    }
    const client = q.client.get(signed.client_id);
    if (!client || !allowed.has(signed.redirect_uri)) return errorPage(res, 400, 'Conector não reconhecido', 'Volte ao claude.ai e conecte o Gove Grafana de novo.');

    if (b.action === 'cancel') return redirectWith(res, signed.redirect_uri, { error: 'access_denied', state: signed.state, iss: base });

    const user = String(b.username ?? '').trim().slice(0, 200);
    const password = String(b.password ?? '');
    const again = (status, error) => {
      const csrf = token(24);
      const request = sign({ ...signed, csrf: sha256(csrf), exp: now() + FORM_TTL_MS });
      return page(res, status, loginForm({ request, csrf, user, error, clientName: client.client_name }), { csrfCookie: csrf });
    };
    if (!user || !password) return again(400, 'Preencha o usuário e a senha do Grafana.');

    const ip = clientIp(req);
    const keys = [
      [sha256(`user|${ip}|${user.toLowerCase()}`), LOGIN_MAX_FAILS],
      [sha256(`ip|${ip}`), LOGIN_IP_MAX_FAILS],
    ];
    if (loginBlocked(keys)) return again(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.');

    let session;
    try {
      session = await grafana.login(user, password);
    } catch (err) {
      if (err instanceof GrafanaError && (err.kind === 'invalid_credentials' || err.kind === 'unauthorized')) {
        loginFailed(keys);
        return again(401, INVALID_LOGIN);
      }
      log.warn?.(`[grafana-connector] login indisponível: ${err instanceof GrafanaError ? `${err.kind} ${err.status}` : 'erro inesperado'}`);
      return again(503, 'O Grafana não respondeu agora. Tente de novo em alguns minutos.');
    }
    q.delAttempt.run(keys[0][0]); // zera só o par IP + usuário; o limite por IP segue valendo

    const t = now();
    const grantId = token(18);
    const code = token();
    db.transaction(() => {
      q.addGrant.run(grantId, client.client_id, session.login, encrypt(session.cookie, grantId), t, t + GRANT_MAX_MS);
      q.addCode.run(sha256(code), grantId, client.client_id, signed.redirect_uri, signed.code_challenge, t + CODE_TTL_MS);
    })();
    audit({ login: session.login, tool: 'oauth_login', outcome: 'ok' });
    res.clearCookie(CSRF_COOKIE, { path: '/oauth' });
    return redirectWith(res, signed.redirect_uri, { code, state: signed.state, iss: base });
  });

  router.options('/oauth/token', cors, preflight);
  router.post('/oauth/token', cors, express.urlencoded({ extended: false, limit: '16kb' }), express.json({ limit: '16kb' }), (req, res) => {
    cleanup();
    const b = req.body ?? {};
    if (b.client_secret) return oauthError(res, 401, 'invalid_client', 'Cliente público: não envie client_secret.');
    if (b.resource && String(b.resource).replace(/\/$/, '') !== resource) return oauthError(res, 400, 'invalid_target', 'resource diferente deste conector.');

    if (b.grant_type === 'authorization_code') {
      const row = b.code ? q.takeCode.get(sha256(b.code)) : null; // uso único: apagado na leitura
      if (!row || row.expires_at < now()) return oauthError(res, 400, 'invalid_grant', 'Código inválido ou expirado.');
      const fail = (desc) => {
        revokeGrant(row.grant_id);
        return oauthError(res, 400, 'invalid_grant', desc);
      };
      if (b.client_id !== row.client_id) return fail('client_id não confere.');
      if (b.redirect_uri !== row.redirect_uri) return fail('redirect_uri não confere.');
      const verifier = String(b.code_verifier ?? '');
      if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return fail('code_verifier inválido.');
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      if (!sameText(challenge, row.code_challenge)) return fail('PKCE não confere.');
      const grant = q.grant.get(row.grant_id);
      if (!grant) return oauthError(res, 400, 'invalid_grant', 'Autorização expirada.');
      return res.set('Cache-Control', 'no-store').json(issueTokens(grant));
    }

    if (b.grant_type === 'refresh_token') {
      const h = sha256(b.refresh_token ?? '');
      const row = b.refresh_token ? q.token.get(h, 'refresh') : null;
      if (!row) return oauthError(res, 400, 'invalid_grant', 'refresh_token inválido.');
      const grant = q.grant.get(row.grant_id);
      if (!grant || grant.client_id !== b.client_id) return oauthError(res, 400, 'invalid_grant', 'refresh_token inválido.');
      // Reuso de um refresh_token já trocado: alguém copiou o token. Derruba a autorização inteira.
      if (row.used_at || q.useToken.run(now(), h).changes !== 1) {
        revokeGrant(grant.id);
        return oauthError(res, 400, 'invalid_grant', 'refresh_token já usado.');
      }
      if (row.expires_at < now() || grant.expires_at < now()) {
        revokeGrant(grant.id);
        return oauthError(res, 400, 'invalid_grant', 'Sessão expirada. Entre de novo.');
      }
      q.delAccess.run(grant.id);
      return res.set('Cache-Control', 'no-store').json(issueTokens(grant));
    }
    return oauthError(res, 400, 'unsupported_grant_type', 'Use authorization_code ou refresh_token.');
  });

  /* --------------------------------------------------------- recurso (MCP) */

  /** Pessoa do token Bearer: { grantId, login, cookie, saveCookie, revoke } ou null. */
  function authenticate(req) {
    const m = /^Bearer\s+([A-Za-z0-9._~+/-]+=*)$/i.exec(req.headers.authorization ?? '');
    if (!m) return null;
    const row = q.token.get(sha256(m[1]), 'access');
    if (!row || row.expires_at < now()) return null;
    const grant = q.grant.get(row.grant_id);
    if (!grant || grant.expires_at < now()) return null;
    const cookie = decrypt(grant.session_enc, grant.id);
    if (!cookie) return null;
    return {
      grantId: grant.id,
      login: grant.grafana_login,
      cookie,
      saveCookie: (next) => q.setSession.run(encrypt(next, grant.id), grant.id),
      revoke: () => revokeGrant(grant.id),
    };
  }

  /** 401 com WWW-Authenticate: o claude.ai abre o login de novo. */
  function unauthorized(res, { invalid = false, description } = {}) {
    const parts = [`Bearer resource_metadata="${resourceMetadataUrl}"`];
    if (invalid) parts.push('error="invalid_token"', `error_description="${(description ?? 'Token inválido ou expirado').replace(/"/g, "'")}"`);
    return res
      .status(401)
      .set({ 'WWW-Authenticate': parts.join(', '), 'Cache-Control': 'no-store' })
      .json({ error: invalid ? 'invalid_token' : 'unauthorized', error_description: description ?? 'Entre com seu usuário do Grafana.' });
  }

  return { router, authenticate, unauthorized, resource, resourceMetadataUrl };
}

/* ------------------------------------------------------------------ HTML */

const STYLE = `
@font-face { font-family: 'Montserrat'; font-weight: 700; font-display: swap; src: url(assets/montserrat-700.woff2) format('woff2'); }
@font-face { font-family: 'Montserrat'; font-weight: 800; font-display: swap; src: url(assets/montserrat-800.woff2) format('woff2'); }
@font-face { font-family: 'Inter'; font-weight: 400; font-display: swap; src: url(assets/inter-400.woff) format('woff'); }
@font-face { font-family: 'Inter'; font-weight: 600; font-display: swap; src: url(assets/inter-600.woff) format('woff'); }
:root { --bg:#FFFFFF; --surface:#F4F4F4; --line:#E3D8F3; --strong:#20133D; --body:#2F3539; --muted:#5B6770; --primary:#3D0099; --link:#3D0099; --accent:#FFC72C; --on-accent:#20133D; --err:#B42318; --err-bg:#FEF3F2; color-scheme: light; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#20133D; --surface:#2F3539; --line:#351F65; --strong:#FFFFFF; --body:#F4F4F4; --muted:#A9B1B8; --link:#A278DA; --err:#FF8A80; --err-bg:rgba(255,138,128,.08); color-scheme: dark; }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; background: var(--surface); color: var(--body); font: 16px/1.5 Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
main { width: 100%; max-width: 420px; background: var(--bg); border: 1px solid var(--line); border-radius: 16px; padding: 32px 24px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 8px 24px rgba(32,19,61,.08); }
.logo { height: 36px; width: auto; align-self: flex-start; }
.logo-dark { display: none; }
@media (prefers-color-scheme: dark) { .logo-light { display: none; } .logo-dark { display: block; } }
.eyebrow { margin: 0; font: 700 13px/1.4 Montserrat, Inter, system-ui, sans-serif; letter-spacing: .04em; text-transform: uppercase; color: var(--link); }
h1 { margin: 4px 0 0; font: 800 24px/1.2 Montserrat, Inter, system-ui, sans-serif; color: var(--strong); }
p { margin: 0; }
.hint { font-size: 15px; color: var(--body); }
form { display: flex; flex-direction: column; gap: 16px; }
label { display: flex; flex-direction: column; gap: 6px; font-weight: 600; font-size: 14px; color: var(--strong); }
input { height: 48px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--muted); background: var(--bg); color: var(--strong); font: 17px Inter, system-ui, sans-serif; width: 100%; }
input:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.primary { min-height: 48px; border: 0; border-radius: 8px; background: var(--accent); color: var(--on-accent); font: 600 16px Inter, system-ui, sans-serif; cursor: pointer; }
.ghost { min-height: 44px; border: 0; background: none; color: var(--link); font: 600 15px Inter, system-ui, sans-serif; cursor: pointer; padding: 0 4px; align-self: center; }
.error { display: flex; gap: 8px; align-items: flex-start; color: var(--err); background: var(--err-bg); border: 1px solid currentColor; border-radius: 8px; padding: 10px 12px; font-size: 14px; font-weight: 600; }
.foot { font-size: 13px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 16px; }
.foot strong { color: var(--body); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
`;

const shell = (title, inner) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} — Gove</title>
<link rel="icon" href="assets/gove-simbolo-roxo.png">
<style>${STYLE}</style>
</head>
<body>
<main>
  <img class="logo logo-light" src="assets/gove-logo-roxo.webp" alt="Gove" width="113" height="36">
  <img class="logo logo-dark" src="assets/gove-logo-branco.webp" alt="Gove" width="113" height="36">
${inner}
</main>
</body>
</html>`;

export function renderLoginPage({ request, csrf, user = '', error = '', clientName = 'Claude' }) {
  const client = /claude/i.test(clientName) ? 'O Claude' : `O app “${esc(clientName)}”`;
  return shell(
    'Entre com seu usuário do Grafana',
    `  <div>
    <p class="eyebrow">Conector Gove Grafana</p>
    <h1>Entre com seu usuário do Grafana</h1>
  </div>
  <p class="hint">Use o mesmo usuário e a mesma senha do Grafana da Gove. ${client} vai ver só os dashboards que você já vê no Grafana.</p>
  ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
  <form method="post" action="authorize">
    <input type="hidden" name="request" value="${esc(request)}">
    <input type="hidden" name="csrf" value="${esc(csrf)}">
    <label for="username">Usuário do Grafana
      <input id="username" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(user)}" ${user && error ? '' : 'autofocus'}>
    </label>
    <label for="password">Senha
      <input id="password" name="password" type="password" autocomplete="current-password" required ${user && error ? 'autofocus' : ''}>
    </label>
    <button class="primary" type="submit" name="action" value="login">Entrar e conectar</button>
    <button class="ghost" type="submit" name="action" value="cancel" formnovalidate>Cancelar</button>
  </form>
  <p class="foot"><strong>Sua senha não fica guardada.</strong> Ela vai direto para o Grafana; o conector guarda só a sessão, criptografada, e registra quem consultou qual dashboard, sem os valores.</p>`,
  );
}

export function renderMessagePage(title, text) {
  return shell(title, `  <h1>${esc(title)}</h1>\n  <p class="hint">${esc(text)}</p>`);
}
