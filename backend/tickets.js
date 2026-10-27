// Solicitações para a área de design. Cada pedido sai em nome de quem está
// logado, é validado (prazo mínimo em horas úteis por frente e prioridade) e
// tem a produção distribuída por igual nos horários livres da agenda do design
// (reuniões e outras produções ficam de fora). Depois é guardado e despachado:
// - com o Apps Script da planilha (TICKETS_WEBHOOK_URL + TICKETS_WEBHOOK_TOKEN):
//   linha nova na aba "Novo RAR", e-mail, evento de entrega e blocos de produção;
// - sem ele, com SMTP: e-mail com convite (.ics); o Apps Script lança o resto ao ler o e-mail.
// Os prazos seguem o expediente da responsável (`inbox`), que só ela altera
// (GET/PUT /expediente); cada pedido guarda o expediente em que foi feito.
import express from 'express';
import nodemailer from 'nodemailer';
import {
  DEFAULT_SCHEDULE,
  DESIGN_INBOX,
  TICKET_PRIORITIES,
  TICKET_TYPES,
  brDateFromIso,
  dueInstant,
  earliestDueDate,
  earliestFeasibleDate,
  effortHours,
  freeFromBusy,
  leadHours,
  nameFromEmail,
  newTicketId,
  normalizeSchedule,
  planWork,
  rarRow,
  ticketEmail,
  ticketEvent,
  ticketIcs,
  validateTicket,
  workEvent,
} from '../shared/tickets.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS design_tickets (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  rar TEXT NOT NULL DEFAULT 'pendente',
  email TEXT NOT NULL DEFAULT 'pendente',
  calendar TEXT NOT NULL DEFAULT 'pendente',
  error TEXT
);
CREATE TABLE IF NOT EXISTS design_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`;

const DAY = 864e5;
const HORIZON_DAYS = 90; // janela consultada na agenda do design

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
  const script = Boolean(webhookUrl && webhookToken);
  const getSetting = db.prepare('SELECT value FROM design_settings WHERE key = ?');
  const putSetting = db.prepare('INSERT INTO design_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  /** Expediente vigente da responsável (o padrão enquanto ela não salvar outro). */
  const schedule = () => {
    const row = getSetting.get('expediente');
    return (row && normalizeSchedule(JSON.parse(row.value)).schedule) || DEFAULT_SCHEDULE;
  };

  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));

  async function callScript(body) {
    const r = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: webhookToken, inbox, ...body }),
      redirect: 'follow',
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) throw new Error('A planilha não respondeu. Confira o Apps Script publicado.');
    if (j.error) throw new Error(String(j.error));
    return j;
  }

  /** Intervalos livres da agenda do design (null = agenda não consultada). */
  async function designFree(startMs, endMs) {
    if (!script) return null;
    try {
      const j = await callScript({ action: 'ocupado', start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() });
      const busy = (j.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) })).filter((b) => b.end > b.start);
      return freeFromBusy(startMs, endMs, busy);
    } catch {
      return null;
    }
  }

  const requester = (req) => {
    const email = sessionEmail(req);
    return email ? { email, name: nameFromEmail(email) } : null;
  };

  router.get('/me', (req, res) => {
    const me = requester(req);
    return me ? res.json(me) : res.status(401).json({ error: 'Faça login para abrir solicitações.' });
  });

  router.get('/config', (_req, res) => {
    res.json({ types: TICKET_TYPES, priorities: TICKET_PRIORITIES, inbox, integrations: { rar: script, email: script || Boolean(mailer), calendar: script || Boolean(mailer) } });
  });

  router.get('/expediente', (req, res) => {
    res.json({ schedule: schedule(), owner: inbox, canEdit: sessionEmail(req) === inbox });
  });

  router.put('/expediente', (req, res) => {
    const email = sessionEmail(req);
    if (!email) return res.status(401).json({ error: 'Faça login para alterar o expediente.' });
    if (email !== inbox) return res.status(403).json({ error: 'Só a responsável pelas solicitações altera o expediente.' });
    const { ok, error, schedule: s } = normalizeSchedule(req.body);
    if (!ok) return res.status(400).json({ error });
    const saved = { ...s, updatedAt: new Date(now()).toISOString(), updatedBy: email };
    putSetting.run('expediente', JSON.stringify(saved));
    res.json({ schedule: saved });
  });

  // Primeira entrega possível: prazo mínimo + espaço livre na agenda do design
  router.get('/availability', async (req, res) => {
    const type = String(req.query.type ?? '');
    const priority = String(req.query.priority ?? '');
    if (!TICKET_TYPES.some((t) => t.id === type) || !TICKET_PRIORITIES.some((p) => p.id === priority)) return res.status(400).json({ error: 'Frente ou prioridade inválida.' });
    const t = now();
    const sc = schedule();
    const free = await designFree(t, t + HORIZON_DAYS * DAY);
    res.json({
      leadHours: leadHours(type, priority),
      effortHours: effortHours(type),
      earliestLead: earliestDueDate(t, leadHours(type, priority), sc),
      earliest: earliestFeasibleDate({ nowMs: t, typeId: type, priority, free, schedule: sc }),
      calendar: free ? 'consultada' : 'não consultada',
    });
  });

  router.get('/', (req, res) => {
    const rows = list.all(Math.min(200, Number(req.query.limit) || 50));
    res.json(rows.map((r) => ({ ...JSON.parse(r.data), status: { rar: r.rar, email: r.email, calendar: r.calendar }, error: r.error ?? undefined })));
  });

  router.post('/', async (req, res) => {
    const me = requester(req);
    if (!me) return res.status(401).json({ error: 'Faça login para abrir solicitações.' });
    const t0 = now();
    const sc = schedule();
    const { ok, errors, ticket } = validateTicket({ ...req.body, requesterEmail: me.email, requesterName: me.name }, { now: t0, domain, schedule: sc });
    if (!ok) return res.status(400).json({ error: 'Revise os campos destacados.', errors });

    const due = dueInstant(ticket.dueDate, sc);
    const free = await designFree(t0, due);
    const plan = planWork({ nowMs: t0, dueMs: due, hours: ticket.effortHours, free, schedule: sc });
    if (plan.missingHours > 0) {
      const first = earliestFeasibleDate({ nowMs: t0, typeId: ticket.type, priority: ticket.priority, free: await designFree(t0, t0 + HORIZON_DAYS * DAY), schedule: sc });
      const msg = `A agenda do design não tem ${ticket.effortHours} h livres até ${brDateFromIso(ticket.dueDate)}.${first ? ` Primeira data com espaço: ${brDateFromIso(first)}.` : ''}`;
      return res.status(400).json({ error: 'Revise os campos destacados.', errors: { dueDate: msg } });
    }
    const blocks = plan.blocks;

    while (exists.get(ticket.id)) ticket.id = newTicketId();
    const record = { ...ticket, work: blocks, calendarChecked: Boolean(free) };
    insert.run(ticket.id, JSON.stringify(record), ticket.createdAt);

    let status = { rar: 'não configurado', email: 'não configurado', calendar: 'não configurado' };
    let error = null;
    try {
      if (script) {
        const j = await callScript({
          source: 'server',
          ticket,
          row: rarRow(ticket, blocks),
          email: ticketEmail(ticket, { blocks }),
          event: ticketEvent(ticket),
          work: blocks.map((b, i) => workEvent(ticket, b, i, blocks.length)),
        });
        const st = (v) => (v === true ? 'ok' : 'falhou');
        status = { rar: st(j.rar), email: st(j.email), calendar: st(j.calendar) };
        if (j.warnings?.length) error = j.warnings.join(' · ');
      } else if (mailer) {
        const mail = ticketEmail(ticket, { blocks, calendar: false });
        await mailer.sendMail({
          from: process.env.MAIL_FROM || `Gove Design System <no-reply@${domain}>`,
          to: inbox,
          cc: ticket.requesterEmail,
          replyTo: ticket.requesterEmail,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          icalEvent: { filename: `${ticket.id}.ics`, method: 'REQUEST', content: ticketIcs(ticket) },
        });
        status = { rar: 'pendente', email: 'ok', calendar: 'pendente' };
      }
    } catch (err) {
      error = err.message || 'Falha ao avisar a área de design.';
      status = { rar: 'falhou', email: 'falhou', calendar: 'falhou' };
    }
    setStatus.run(status.rar, status.email, status.calendar, error, ticket.id);
    res.status(201).json({ ticket: record, status, error: error ?? undefined });
  });

  return router;
}
