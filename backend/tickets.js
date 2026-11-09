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
  const listMine = db.prepare("SELECT * FROM design_tickets WHERE lower(json_extract(data, '$.requesterEmail')) = ? ORDER BY created_at DESC LIMIT ?");
  const getOne = db.prepare('SELECT * FROM design_tickets WHERE id = ?');
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
    // Erro com resultado parcial (ex.: RAR lançado, e-mail não): devolve o que foi feito
    if (j.error && !['rar', 'email', 'calendar'].some((k) => k in j)) throw new Error(String(j.error));
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

  // Só a responsável vê de quem é o expediente e quando mudou; os demais recebem
  // apenas dias e períodos, o necessário para calcular os prazos no navegador.
  router.get('/expediente', (req, res) => {
    const sc = schedule();
    if (sessionEmail(req) === inbox) return res.json({ schedule: sc, owner: inbox, canEdit: true });
    res.json({ schedule: { days: [...sc.days], periods: sc.periods.map((p) => [...p]) }, canEdit: false });
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

  const view = (r) => ({ ...JSON.parse(r.data), status: { rar: r.rar, email: r.email, calendar: r.calendar }, error: r.error ?? undefined });

  // Cada pessoa vê só os próprios pedidos; a responsável vê todos
  router.get('/', (req, res) => {
    const email = sessionEmail(req);
    if (!email) return res.status(401).json({ error: 'Faça login para ver as solicitações.' });
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const rows = email === inbox ? list.all(limit) : listMine.all(String(email).toLowerCase(), limit);
    res.json(rows.map(view));
  });

  /**
   * Despacha os passos pedidos (`steps`) e devolve o status de cada um. Uma
   * exceção marca só o passo em que aconteceu; o que já deu certo fica 'ok'.
   */
  async function dispatch(ticket, blocks, steps, prev) {
    const status = { ...prev };
    const errors = [];
    const notes = [];
    const want = (k) => steps.includes(k);
    if (script) {
      try {
        const j = await callScript({
          source: 'server',
          steps,
          ticket,
          row: rarRow(ticket, blocks),
          email: ticketEmail(ticket, { blocks }),
          event: ticketEvent(ticket),
          work: blocks.map((b, i) => workEvent(ticket, b, i, blocks.length)),
        });
        for (const k of ['rar', 'email', 'calendar']) if (want(k)) status[k] = j[k] === true ? 'ok' : 'falhou';
        if (j.warnings?.length) errors.push(...j.warnings);
        if (j.error) errors.push(String(j.error));
        return { status, error: errors.join(' · ') || null, notes };
      } catch (err) {
        errors.push(err.message || 'O Apps Script não respondeu.');
        // Sem resposta do Apps Script: o RAR fica como falhou; o aviso ainda pode sair por SMTP
        if (want('rar')) status.rar = 'falhou';
        if (!mailer) {
          for (const k of ['email', 'calendar']) if (want(k)) status[k] = 'falhou';
          return { status, error: errors.join(' · '), notes };
        }
      }
    }
    if (mailer && (want('email') || want('calendar'))) {
      try {
        // O convite segue no e-mail; o marcador diz ao gatilho que o evento já existe
        const mail = ticketEmail(ticket, { blocks, calendar: true });
        await mailer.sendMail({
          from: process.env.MAIL_FROM || `Gove Design System <no-reply@${domain}>`,
          to: inbox,
          cc: ticket.requesterEmail,
          replyTo: ticket.requesterEmail,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          icalEvent: { filename: `${ticket.id}.ics`, method: 'REQUEST', content: ticketIcs(ticket, { organizer: inbox }) },
        });
        status.email = 'ok';
        status.calendar = 'ok';
        if (status.rar !== 'ok') status.rar = 'pendente'; // o gatilho do Apps Script lança ao ler o e-mail
      } catch (err) {
        errors.push(err.message || 'Falha ao enviar o e-mail.');
        if (want('email')) status.email = 'falhou';
        if (want('calendar')) status.calendar = 'falhou';
      }
    } else if (!script) {
      notes.push('O servidor não tem o Apps Script nem o SMTP configurados: o pedido ficou salvo, mas a área de design não foi avisada. Envie o e-mail e o convite pelos botões abaixo.');
    }
    return { status, error: errors.join(' · ') || null, notes };
  }

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

    const initial = script || mailer ? { rar: 'pendente', email: 'pendente', calendar: 'pendente' } : { rar: 'não configurado', email: 'não configurado', calendar: 'não configurado' };
    let out;
    try {
      out = await dispatch(ticket, blocks, ['rar', 'email', 'calendar'], initial);
    } catch (err) {
      out = { status: initial, error: err.message || 'Falha ao avisar a área de design.', notes: [] };
    }
    setStatus.run(out.status.rar, out.status.email, out.status.calendar, out.error, ticket.id);
    res.status(201).json({ ticket: record, status: out.status, error: out.error ?? undefined, notes: out.notes });
  });

  // Reenvio com o mesmo código: refaz só os passos que falharam (sem duplicar e-mail nem evento)
  router.post('/:id/reenviar', async (req, res) => {
    const me = requester(req);
    if (!me) return res.status(401).json({ error: 'Faça login para reenviar.' });
    const row = getOne.get(String(req.params.id));
    if (!row) return res.status(404).json({ error: 'Pedido não encontrado.' });
    const record = JSON.parse(row.data);
    if (record.requesterEmail !== me.email && me.email !== inbox) return res.status(403).json({ error: 'Só quem pediu reenvia o pedido.' });
    const prev = { rar: row.rar, email: row.email, calendar: row.calendar };
    const steps = Object.keys(prev).filter((k) => prev[k] === 'falhou');
    if (!steps.length) return res.json({ ticket: record, status: prev, notes: ['Nada a reenviar: os passos já foram concluídos.'] });
    const { work = [], calendarChecked: _c, ...ticket } = record;
    let out;
    try {
      out = await dispatch(ticket, work, steps, prev);
    } catch (err) {
      out = { status: prev, error: err.message || 'Falha ao reenviar.', notes: [] };
    }
    setStatus.run(out.status.rar, out.status.email, out.status.calendar, out.error, ticket.id);
    res.json({ ticket: record, status: out.status, error: out.error ?? undefined, notes: out.notes });
  });

  return router;
}
