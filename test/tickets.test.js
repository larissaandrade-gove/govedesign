// Solicitações de design: prazos, campos obrigatórios, distribuição na agenda, RAR e despacho.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import Database from 'better-sqlite3';
import {
  TICKET_MARKER,
  TICKET_TYPES,
  addBusinessHours,
  businessHoursBetween,
  dueInstant,
  earliestDueDate,
  earliestFeasibleDate,
  effortHours,
  dueTime,
  freeFromBusy,
  leadHours,
  normalizeSchedule,
  ticketEvent,
  planWork,
  quarterLabel,
  rarRow,
  ticketEmail,
  ticketIcs,
  validateTicket,
} from '../shared/tickets.js';
import { createTicketsRouter } from '../backend/tickets.js';

const SEG_10H = Date.parse('2026-10-19T10:00:00-03:00'); // segunda-feira
const at = (s) => Date.parse(`${s}-03:00`);
const DESC = 'Garrafa térmica com a marca para os palestrantes do Governos do Futuro 2026.';

const base = (over = {}) => ({
  type: 'brindes',
  title: 'Garrafas para o GF26',
  description: DESC,
  pieceType: 'Garrafa',
  format: 'Área de gravação 8×4 cm',
  links: ['https://fornecedor.com.br/garrafa-500ml'],
  details: { quantidade: '200' },
  priority: 'alta',
  dueDate: '2026-10-23',
  requesterName: 'Ana Souza',
  requesterEmail: 'ana.souza@gove.digital',
  ...over,
});

test('prazos: alta urgência a partir de 24 h úteis; vídeo vale o dobro', () => {
  assert.deepEqual(
    TICKET_TYPES.map((t) => t.id),
    ['redesign', 'video', 'impressos', 'brindes'],
  );
  assert.equal(leadHours('redesign', 'alta'), 24);
  assert.equal(leadHours('redesign', 'normal'), 48);
  assert.equal(leadHours('video', 'alta'), 48);
  assert.equal(leadHours('video', 'normal'), 96);
  assert.equal(effortHours('video'), 2 * effortHours('impressos'));
  assert.ok(TICKET_TYPES.every((t) => leadHours(t.id, 'alta') >= 24));
});

test('horas úteis: expediente padrão 8–12 e 13–17, fins de semana e feriados fora', () => {
  assert.equal(new Date(addBusinessHours(SEG_10H, 10)).toISOString(), '2026-10-20T15:00:00.000Z'); // terça 12h
  assert.equal(earliestDueDate(SEG_10H, 24), '2026-10-22'); // 7 + 8 + 8 + 1
  assert.equal(earliestDueDate(Date.parse('2026-10-30T16:00:00-03:00'), 10), '2026-11-04'); // 1 + (02/11 é Finados) 8 + 1
  assert.equal(businessHoursBetween(SEG_10H, at('2026-10-19T18:00:00')), 6);
  assert.equal(quarterLabel(SEG_10H), '4T26');
});

test('obrigatórios: entrega, prioridade, título, descrição (50+), tipo de peça e formato', () => {
  const ok = validateTicket(base(), { now: SEG_10H });
  assert.ok(ok.ok, JSON.stringify(ok.errors));
  assert.match(ok.ticket.id, /^DS-[2-9A-Z]{6}$/);
  assert.equal(ok.ticket.leadHours, 24);
  assert.equal(ok.ticket.effortHours, 8);

  const vazio = validateTicket({ type: 'redesign', requesterEmail: 'ana@gove.digital' }, { now: SEG_10H });
  for (const k of ['title', 'description', 'pieceType', 'format', 'priority', 'dueDate']) assert.ok(vazio.errors[k], k);
  assert.match(validateTicket(base({ description: 'curta demais' }), { now: SEG_10H }).errors.description, /50 caracteres \(faltam 38\)/);
  assert.match(validateTicket(base({ dueDate: '2026-10-21' }), { now: SEG_10H }).errors.dueDate, /24 h úteis.*22\/10\/2026/);
  assert.match(validateTicket(base({ priority: 'normal', dueDate: '2026-10-23' }), { now: SEG_10H }).errors.dueDate, /48 h úteis/);
  assert.match(validateTicket(base({ type: 'video', dueDate: '2026-10-23' }), { now: SEG_10H }).errors.dueDate, /48 h úteis/);
  assert.match(validateTicket(base({ dueDate: '2026-10-24' }), { now: SEG_10H }).errors.dueDate, /dia de expediente/);
  assert.ok(validateTicket(base({ links: [] }), { now: SEG_10H }).errors.links);
  assert.ok(validateTicket(base({ requesterEmail: 'ana@gmail.com' }), { now: SEG_10H }).errors.requesterEmail);
  assert.equal(validateTicket(base({ requesterName: '' }), { now: SEG_10H }).ticket.requesterName, 'Ana Souza'); // nome vem do login
});

test('produção distribuída por igual nos dias livres, sem cruzar reuniões', () => {
  const due = dueInstant('2026-10-23');
  const hrs = (bs) => bs.reduce((s, b) => s + (b.end - b.start) / 36e5, 0);
  const sem = planWork({ nowMs: SEG_10H, dueMs: due, hours: 8 });
  assert.equal(sem.missingHours, 0);
  assert.equal(hrs(sem.blocks), 8);
  const porDia = new Map();
  for (const b of sem.blocks) {
    const d = new Date(b.start - 3 * 36e5).toISOString().slice(0, 10);
    porDia.set(d, (porDia.get(d) ?? 0) + (b.end - b.start) / 36e5);
  }
  assert.equal(porDia.size, 5); // seg a sex
  assert.ok(Math.max(...porDia.values()) - Math.min(...porDia.values()) <= 0.5);

  // Terça inteira em reunião e quarta 9h–11h: nada de produção nesses horários
  const busy = [
    { start: at('2026-10-20T09:00:00'), end: at('2026-10-20T18:00:00') },
    { start: at('2026-10-21T09:00:00'), end: at('2026-10-21T11:00:00') },
  ];
  const free = freeFromBusy(SEG_10H, due, busy);
  const com = planWork({ nowMs: SEG_10H, dueMs: due, hours: 8, free });
  assert.equal(com.missingHours, 0);
  for (const b of com.blocks) for (const m of busy) assert.ok(b.end <= m.start || b.start >= m.end, 'bloco sobre reunião');

  // Agenda cheia até quinta: a primeira data viável passa para depois
  const cheia = freeFromBusy(SEG_10H, SEG_10H + 90 * 864e5, [{ start: SEG_10H, end: at('2026-10-23T18:00:00') }]);
  assert.equal(earliestFeasibleDate({ nowMs: SEG_10H, typeId: 'redesign', priority: 'alta', free: null }), '2026-10-22');
  assert.equal(earliestFeasibleDate({ nowMs: SEG_10H, typeId: 'redesign', priority: 'alta', free: cheia }), '2026-10-26');
});

test('linha do RAR, e-mail com solicitante e marcador, .ics no prazo', () => {
  const { ticket } = validateTicket(base(), { now: SEG_10H, id: 'DS-ABC234' });
  const blocks = planWork({ nowMs: SEG_10H, dueMs: dueInstant(ticket.dueDate), hours: 8 }).blocks;
  const row = rarRow(ticket, blocks);
  assert.equal(row.Trimestre, '4T26');
  assert.equal(row.Frente, 'Brindes e outros materiais');
  assert.equal(row['Atividades previstas'], '[DS-ABC234] Garrafas para o GF26 — Garrafa (Área de gravação 8×4 cm)');
  assert.equal(row.Prioridade, true);
  assert.match(row['Resultado / Comentários'], /Alta \(mín\. 24 h úteis\)/);
  assert.match(row['Resultado / Comentários'], /Produção: 8 h — seg 19\/10/);
  assert.match(row['Comentários gerais'], /Ana Souza \(ana\.souza@gove\.digital\)/);

  const mail = ticketEmail(ticket, { calendar: false, blocks });
  assert.match(mail.text, /Solicitante: Ana Souza · ana\.souza@gove\.digital/);
  const m = mail.text.match(new RegExp(`${TICKET_MARKER}([A-Za-z0-9+/=]+)\\.`));
  const data = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
  assert.equal(data.ticket.id, 'DS-ABC234');
  assert.equal(data.calendar, false);
  assert.equal(data.work.length, blocks.length);
  assert.match(data.work[0].summary, /^Produção 1\/\d: Garrafas para o GF26 \[DS-ABC234\]$/);
  assert.match(ticketIcs(ticket), /DTSTART:20261023T190000Z/); // 16h de Brasília (última hora do expediente)
  assert.match(mail.text, /Entrega: 23\/10\/2026, até 17h/);
  assert.match(ticketIcs(ticket), /ORGANIZER:mailto:larissa\.andrade@gove\.digital/);
  assert.match(ticketIcs(ticket), /ATTENDEE;CN=Ana Souza:mailto:ana\.souza@gove\.digital/);
});

function serve(opts) {
  const app = express();
  app.use('/api/tickets', createTicketsRouter({ db: new Database(':memory:'), now: () => SEG_10H, webhookUrl: '', webhookToken: '', mailer: null, sessionEmail: () => 'larissa.andrade@gove.digital', ...opts }));
  const server = app.listen(0);
  return { base: `http://127.0.0.1:${server.address().port}/api/tickets`, close: () => server.close() };
}
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('rota: solicitante vem do login; sem login, recusa', async () => {
  const s = serve();
  const anon = serve({ sessionEmail: () => null });
  try {
    assert.deepEqual(await (await fetch(s.base + '/me')).json(), { email: 'larissa.andrade@gove.digital', name: 'Larissa Andrade' });
    assert.equal((await post(anon.base, base())).status, 401);
    const r = await post(s.base, base({ dueDate: '2026-10-19', title: '' }));
    assert.equal(r.status, 400);
    const j = await r.json();
    assert.ok(j.errors.dueDate && j.errors.title);
  } finally {
    s.close();
    anon.close();
  }
});

test('rota: consulta a agenda do design, distribui a produção e despacha ao Apps Script', async () => {
  const calls = [];
  const busy = [{ start: '2026-10-20T11:00:00.000Z', end: '2026-10-20T20:00:00.000Z' }]; // terça 8h–17h
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const out = body.action === 'ocupado' ? { busy } : { rar: true, email: true, calendar: true, row: 117 };
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
  };
  const s = serve({ webhookUrl: 'https://script.google.com/macros/s/x/exec', webhookToken: 'frase', fetchImpl });
  try {
    const av = await (await fetch(s.base + '/availability?type=redesign&priority=alta')).json();
    assert.equal(av.calendar, 'consultada');
    assert.equal(av.earliestLead, '2026-10-22');
    assert.equal(av.earliest, '2026-10-22');

    const r = await post(s.base, base({ requesterEmail: 'outra@gove.digital' }));
    assert.equal(r.status, 201);
    const j = await r.json();
    assert.deepEqual(j.status, { rar: 'ok', email: 'ok', calendar: 'ok' });
    assert.equal(j.ticket.requesterEmail, 'larissa.andrade@gove.digital'); // o login vence o formulário
    const sent = calls.find((c) => c.source === 'server');
    assert.equal(sent.token, 'frase');
    assert.ok(sent.work.length >= 4);
    assert.ok(sent.work.every((w) => !w.startTime.startsWith('2026-10-20')), 'nada na terça ocupada');
    assert.equal(sent.event.startTime, '2026-10-23T16:00:00');
    assert.equal(sent.event.endTime, '2026-10-23T17:00:00');
    assert.match(sent.email.text, /Solicitante: Larissa Andrade/);

    const lista = await (await fetch(s.base)).json();
    assert.equal(lista[0].id, j.ticket.id);
    assert.equal(lista[0].status.rar, 'ok');
  } finally {
    s.close();
  }
});

test('rota: agenda sem espaço até o prazo recusa e sugere a primeira data livre', async () => {
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    const out = body.action === 'ocupado' ? { busy: [{ start: '2026-10-19T12:00:00.000Z', end: '2026-10-23T21:00:00.000Z' }] } : { rar: true, email: true, calendar: true };
    return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
  };
  const s = serve({ webhookUrl: 'https://x/exec', webhookToken: 't', fetchImpl });
  try {
    const r = await post(s.base, base());
    assert.equal(r.status, 400);
    assert.match((await r.json()).errors.dueDate, /não tem 8 h livres até 23\/10\/2026\. Primeira data com espaço: 26\/10\/2026/);
  } finally {
    s.close();
  }
});

test('rota: sem Apps Script, envia e-mail com convite pelo SMTP', async () => {
  const sent = [];
  const s = serve({ mailer: { sendMail: async (m) => sent.push(m) }, inbox: 'design@gove.digital' });
  try {
    const j = await (await post(s.base, base())).json();
    assert.deepEqual(j.status, { rar: 'pendente', email: 'ok', calendar: 'pendente' });
    assert.equal(sent[0].to, 'design@gove.digital');
    assert.equal(sent[0].cc, 'larissa.andrade@gove.digital');
    assert.match(sent[0].icalEvent.content, /BEGIN:VEVENT/);
  } finally {
    s.close();
  }
});

// Expediente da responsável: 7h–11h e 12h–16h, de segunda a sábado
const CEDO = { days: [1, 2, 3, 4, 5, 6], periods: [['07:00', '11:00'], ['12:00', '16:00']] };

test('expediente: valida, muda horas úteis, entrega e evento; pedido guarda o seu', () => {
  assert.equal(normalizeSchedule({ days: [1], periods: [['08:00', '12:00'], ['11:00', '14:00']] }).error, 'Os períodos não podem se sobrepor.');
  assert.match(normalizeSchedule({ days: [], periods: [['08:00', '12:00']] }).error, /ao menos um dia/);
  assert.match(normalizeSchedule({ days: [1], periods: [['8h', '12:00']] }).error, /HH:MM/);
  assert.equal(dueTime(CEDO), '16:00');
  assert.equal(businessHoursBetween(SEG_10H, at('2026-10-19T18:00:00'), CEDO), 5); // 10–11 e 12–16
  assert.equal(earliestDueDate(at('2026-10-23T15:00:00'), 10, CEDO), '2026-10-26'); // sex 1 + sáb 8 + seg 1
  assert.equal(dueInstant('2026-10-23', CEDO), at('2026-10-23T16:00:00'));

  const { ticket } = validateTicket(base({ dueDate: '2026-10-24' }), { now: SEG_10H, schedule: CEDO }); // sábado vale
  assert.ok(ticket);
  assert.equal(ticket.dueTime, '16:00');
  assert.deepEqual(ticket.schedule, { days: CEDO.days, periods: CEDO.periods });
  const ev = ticketEvent(ticket);
  assert.equal(ev.startTime, '2026-10-24T15:00:00');
  assert.equal(ev.endTime, '2026-10-24T16:00:00');
  assert.match(ticketEmail(ticket).text, /Entrega: 24\/10\/2026, até 16h/);
  // Pedido antigo (sem dueTime) continua com a entrega às 18h
  const { dueTime: _d, schedule: _s, ...antigo } = ticket;
  assert.equal(ticketEvent(antigo).endTime, '2026-10-24T18:00:00');
});

test('rota: só a responsável altera o expediente; pedidos seguintes usam o novo', async () => {
  const outra = serve({ sessionEmail: () => 'ana.souza@gove.digital' });
  const dona = serve();
  try {
    const put = (b, body) => fetch(b + '/expediente', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await put(outra.base, CEDO)).status, 403);
    const inicial = await (await fetch(dona.base + '/expediente')).json();
    assert.equal(inicial.canEdit, true);
    assert.deepEqual(inicial.schedule.periods, [['08:00', '12:00'], ['13:00', '17:00']]);
    assert.equal((await put(dona.base, { days: [1], periods: [['09:00', '08:00']] })).status, 400);
    const r = await put(dona.base, CEDO);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).schedule.updatedBy, 'larissa.andrade@gove.digital');

    const av = await (await fetch(dona.base + '/availability?type=redesign&priority=alta')).json();
    assert.equal(av.earliestLead, '2026-10-22'); // 5 + 8 + 8 + 3
    const j = await (await post(dona.base, base({ dueDate: '2026-10-24' }))).json();
    assert.equal(j.ticket.dueTime, '16:00');
  } finally {
    outra.close();
    dona.close();
  }
});
