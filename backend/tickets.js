// Solicitações para a área de design. Cada pedido é validado (prazo mínimo em
// horas úteis por frente), guardado no banco e despachado:
// - com o Apps Script da planilha (TICKETS_WEBHOOK_URL + TICKETS_WEBHOOK_TOKEN):
//   nova linha na aba "Novo RAR", e-mail para a área de design e evento na agenda;
// - sem ele, com SMTP configurado: e-mail com convite de agenda (.ics) anexo.
import express from 'express';
import nodemailer from 'nodemailer';
import { DESIGN_INBOX, TICKET_TYPES, TICKET_PRIORITIES, earliestDueDate, newTicketId, rarRow, ticketEmail, ticketEvent, ticketIcs, validateTicket } from '../shared/tickets.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS design_tickets (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  rar TEXT NOT NULL DEFAULT 'pendente',
  email TEXT NOT NULL DEFAULT 'pendente',
  calendar TEXT NOT NULL DEFAULT 'pendente',
  error TEXT
);`;


function smtpFromEnv() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === '1',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

export function createTicketsRouter({
  db,
  sessionEmail = () => null,
  inbox = process.env.TICKETS_INBOX || DESIGN_INBOX,
  webhookUrl = process.env.TICKETS_WEBHOOK_URL,
  webhookToken = process.env.TICKETS_WEBHOOK_TOKEN,
  domain = process.env.AUTH_EMAIL_DOMAIN || 'gove.digital',
  mailer = smtpFromEnv(),
  fetchImpl = fetch,
  now = () => Date.now(),
} = {}) {
  db.exec(SCHEMA);
  const insert = db.prepare('INSERT INTO design_tickets (id, data, created_at) VALUES (?, ?, ?)');
  const setStatus = db.prepare('UPDATE design_tickets SET rar = ?, email = ?, calendar = ?, error = ? WHERE id = ?');
  const list = db.prepare('SELECT * FROM design_tickets ORDER BY created_at DESC LIMIT ?');
  const exists = db.prepare('SELECT 1 FROM design_tickets WHERE id = ?');

  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));

  router.get('/config', (_req, res) => {
    const t = now();
    res.json({
      types: TICKET_TYPES.map((x) => ({ ...x, earliest: earliestDueDate(t, x.minHours) })),
      priorities: TICKET_PRIORITIES,
      inbox,
      integrations: { rar: Boolean(webhookUrl && webhookToken), email: Boolean(webhookUrl && webhookToken) || Boolean(mailer), calendar: Boolean(webhookUrl && webhookToken) || Boolean(mailer) },
    });
  });

  router.get('/', (req, res) => {
    const rows = list.all(Math.min(200, Number(req.query.limit) || 50));
    res.json(rows.map((r) => ({ ...JSON.parse(r.data), status: { rar: r.rar, email: r.email, calendar: r.calendar }, error: r.error ?? undefined })));
  });

  async function viaWebhook(ticket) {
    const r = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: webhookToken, source: 'server', inbox, ticket, row: rarRow(ticket), email: ticketEmail(ticket), event: ticketEvent(ticket) }),
      redirect: 'follow',
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) throw new Error('A planilha não respondeu. Confira o Apps Script publicado.');
    if (j.error) throw new Error(String(j.error));
    const st = (v) => (v === true ? 'ok' : 'falhou');
    return { rar: st(j.rar), email: st(j.email), calendar: st(j.calendar) };
  }

  async function viaSmtp(ticket) {
    const mail = ticketEmail(ticket);
    await mailer.sendMail({
      from: process.env.MAIL_FROM || `Gove Design System <no-reply@${domain}>`,
      to: inbox,
      cc: ticket.requesterEmail,
      replyTo: ticket.requesterEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      icalEvent: { filename: `${ticket.id}.ics`, method: 'PUBLISH', content: ticketIcs(ticket) },
    });
    return { rar: 'pendente', email: 'ok', calendar: 'ok' };
  }

  router.post('/', async (req, res) => {
    const logged = sessionEmail(req);
    const input = { ...req.body, ...(logged ? { requesterEmail: logged } : {}) };
    const { ok, errors, ticket } = validateTicket(input, { now: now(), domain });
    if (!ok) return res.status(400).json({ error: 'Revise os campos destacados.', errors });
    while (exists.get(ticket.id)) ticket.id = newTicketId();
    insert.run(ticket.id, JSON.stringify(ticket), ticket.createdAt);

    let status = { rar: 'não configurado', email: 'não configurado', calendar: 'não configurado' };
    let error = null;
    try {
      if (webhookUrl && webhookToken) status = await viaWebhook(ticket);
      else if (mailer) status = await viaSmtp(ticket);
    } catch (err) {
      error = err.message || 'Falha ao avisar a área de design.';
      status = { rar: 'falhou', email: 'falhou', calendar: 'falhou' };
    }
    setStatus.run(status.rar, status.email, status.calendar, error, ticket.id);
    res.status(201).json({ ticket, status, error: error ?? undefined });
  });

  return router;
}
