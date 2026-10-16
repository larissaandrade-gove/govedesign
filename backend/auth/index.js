// Login único do ambiente Gove (Design System + aplicações).
//
// Só entra quem tem e-mail do domínio permitido (padrão: gove.digital).
// Primeiro acesso: e-mail → código de 6 dígitos enviado ao e-mail → a pessoa
// cria a senha. Depois: e-mail + senha. "Esqueci a senha" repete o código.
//
// Configuração (variáveis de ambiente):
//   AUTH_SECRET            segredo da sessão (obrigatório em produção)
//   AUTH_EMAIL_DOMAIN      domínio permitido (padrão gove.digital)
//   AUTH_DISABLED=1        desliga o login (somente desenvolvimento)
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, MAIL_FROM
//     envio do código. Sem SMTP fora de produção, o código aparece no log do
//     servidor; em produção sem SMTP o envio responde 503.
import express from 'express';
import { createHmac, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import nodemailer from 'nodemailer';

const scrypt = promisify(scryptCb);
const COOKIE = 'gove_session';
const SESSION_DAYS = 14;
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;
const SETUP_TTL_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const PASSWORD_MIN = 10;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS auth_users (
  email TEXT PRIMARY KEY,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER
);
CREATE TABLE IF NOT EXISTS auth_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  sent_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);`;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export function normalizeEmail(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

export function emailAllowed(email, domain) {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+$/.test(email) && email.endsWith('@' + domain);
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [alg, saltB64, keyB64] = String(stored ?? '').split('$');
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(key, expected);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function createAuth({ db, secret = process.env.AUTH_SECRET, domain = process.env.AUTH_EMAIL_DOMAIN || 'gove.digital', mailer, disabled = process.env.AUTH_DISABLED === '1' } = {}) {
  const production = process.env.NODE_ENV === 'production';
  if (!secret) {
    if (production) throw new Error('AUTH_SECRET é obrigatório em produção.');
    secret = randomBytes(32).toString('hex'); // sessões valem até o servidor reiniciar
  }
  db.exec(SCHEMA);

  const sign = (payload) => {
    const body = b64url(JSON.stringify(payload));
    const mac = createHmac('sha256', secret).update(body).digest('base64url');
    return `${body}.${mac}`;
  };
  const unsign = (token) => {
    const [body, mac] = String(token ?? '').split('.');
    if (!body || !mac) return null;
    const expected = createHmac('sha256', secret).update(body).digest('base64url');
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      return p.exp && p.exp > Date.now() ? p : null;
    } catch {
      return null;
    }
  };
  const codeHash = (email, code) => createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');

  const transport =
    mailer ??
    (process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === '1',
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        })
      : null);

  async function sendCode(email, code) {
    if (!transport) {
      if (production) throw Object.assign(new Error('Envio de e-mail não configurado no servidor.'), { status: 503 });
      console.log(`[auth] código de acesso para ${email}: ${code} (SMTP não configurado; visível só em desenvolvimento)`);
      return;
    }
    await transport.sendMail({
      from: process.env.MAIL_FROM || `Gove Design System <no-reply@${domain}>`,
      to: email,
      subject: `${code} é o seu código de acesso ao Gove Design System`,
      text: `Seu código de acesso é ${code}.\n\nEle vale por 10 minutos. Se não foi você, ignore este e-mail.`,
      html: `<div style="font-family:Inter,Arial,sans-serif;color:#20133D;max-width:480px">
<p style="font-size:16px">Seu código de acesso ao Gove Design System:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#3D0099">${code}</p>
<p style="font-size:14px;color:#2F3539">Vale por 10 minutos. Se não foi você, ignore este e-mail.</p></div>`,
    });
  }

  const setSession = (res, email) => {
    const token = sign({ email, exp: Date.now() + SESSION_DAYS * 864e5 });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: production, maxAge: SESSION_DAYS * 864e5, path: '/' });
  };
  const sessionEmail = (req) => unsign(parseCookies(req.headers.cookie)[COOKIE])?.email ?? null;

  const getUser = db.prepare('SELECT * FROM auth_users WHERE email = ?');
  const router = express.Router();
  router.use(express.json({ limit: '10kb' }));

  const fail = (res, status, error) => res.status(status).json({ error });

  // 1) Início: decide entre senha e código
  router.post('/start', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!emailAllowed(email, domain)) return fail(res, 403, `Use seu e-mail @${domain}.`);
    const user = getUser.get(email);
    const forgot = req.body?.forgot === true;
    if (user?.password_hash && !forgot) return res.json({ next: 'password' });
    const now = Date.now();
    const prev = db.prepare('SELECT sent_at FROM auth_codes WHERE email = ?').get(email);
    if (prev && now - prev.sent_at < CODE_RESEND_MS) return res.json({ next: 'code', resendIn: Math.ceil((CODE_RESEND_MS - (now - prev.sent_at)) / 1000) });
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    try {
      await sendCode(email, code);
    } catch (e) {
      return fail(res, e.status || 502, e.status ? e.message : 'Não foi possível enviar o código agora. Tente de novo.');
    }
    db.prepare('INSERT OR REPLACE INTO auth_codes (email, code_hash, expires_at, sent_at, attempts) VALUES (?, ?, ?, ?, 0)').run(email, codeHash(email, code), now + CODE_TTL_MS, now);
    res.json({ next: 'code' });
  });

  // 2) Código → libera a criação de senha
  router.post('/verify', (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code ?? '').replace(/\D/g, '');
    const row = db.prepare('SELECT * FROM auth_codes WHERE email = ?').get(email);
    if (!row || row.expires_at < Date.now()) return fail(res, 400, 'Código expirado. Peça um novo.');
    if (row.attempts >= CODE_MAX_ATTEMPTS) return fail(res, 429, 'Muitas tentativas. Peça um novo código.');
    const a = Buffer.from(codeHash(email, code));
    const b = Buffer.from(row.code_hash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      db.prepare('UPDATE auth_codes SET attempts = attempts + 1 WHERE email = ?').run(email);
      return fail(res, 400, 'Código incorreto.');
    }
    db.prepare('DELETE FROM auth_codes WHERE email = ?').run(email);
    res.json({ setupToken: sign({ setup: email, exp: Date.now() + SETUP_TTL_MS }) });
  });

  // 3) Criação (ou troca) de senha
  router.post('/password', async (req, res) => {
    const email = unsign(req.body?.setupToken)?.setup;
    if (!email) return fail(res, 400, 'Sessão de cadastro expirada. Comece de novo.');
    const password = String(req.body?.password ?? '');
    if (password.length < PASSWORD_MIN) return fail(res, 400, `A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`);
    const hash = await hashPassword(password);
    db.prepare(
      `INSERT INTO auth_users (email, password_hash, last_login) VALUES (?, ?, datetime('now'))
       ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, last_login = excluded.last_login, failed_logins = 0, locked_until = NULL`,
    ).run(email, hash);
    setSession(res, email);
    res.json({ ok: true });
  });

  // Acessos seguintes: e-mail + senha
  router.post('/login', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const user = getUser.get(email);
    if (!emailAllowed(email, domain) || !user?.password_hash) return fail(res, 401, 'E-mail ou senha incorretos.');
    if (user.locked_until && user.locked_until > Date.now()) return fail(res, 429, 'Acesso bloqueado por alguns minutos. Use "Esqueci a senha" ou tente mais tarde.');
    if (!(await verifyPassword(String(req.body?.password ?? ''), user.password_hash))) {
      const fails = user.failed_logins + 1;
      db.prepare('UPDATE auth_users SET failed_logins = ?, locked_until = ? WHERE email = ?').run(fails, fails >= LOGIN_MAX_FAILS ? Date.now() + LOGIN_LOCK_MS : null, email);
      return fail(res, 401, 'E-mail ou senha incorretos.');
    }
    db.prepare("UPDATE auth_users SET failed_logins = 0, locked_until = NULL, last_login = datetime('now') WHERE email = ?").run(email);
    setSession(res, email);
    res.json({ ok: true });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    const email = disabled ? 'dev@' + domain : sessionEmail(req);
    return email ? res.json({ email }) : fail(res, 401, 'Não autenticado.');
  });

  /** Protege tudo, menos a tela de login e as rotas de autenticação. */
  const PUBLIC = [/^\/login(\.html)?$/, /^\/auth\//, /^\/login-assets\//, /^\/favicon\.ico$/];
  function guard(req, res, next) {
    if (disabled || PUBLIC.some((r) => r.test(req.path)) || sessionEmail(req)) return next();
    const wantsHtml = req.method === 'GET' && (req.headers.accept ?? '').includes('text/html');
    if (wantsHtml) return res.redirect(302, `/login?next=${encodeURIComponent(req.originalUrl)}`);
    return fail(res, 401, 'Faça login para continuar.');
  }

  return { router, guard, domain, sessionEmail };
}
