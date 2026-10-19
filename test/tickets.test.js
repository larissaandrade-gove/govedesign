// Solicitações de design: horas úteis, validação, linha do RAR e despacho.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import Database from 'better-sqlite3';
import { TICKET_TYPES, TICKET_MARKER, addBusinessHours, businessHoursBetween, earliestDueDate, quarterLabel, rarRow, ticketEmail, ticketIcs, validateTicket } from '../shared/tickets.js';
import { createTicketsRouter } from '../backend/tickets.js';

const SEG_10H = Date.parse('2026-10-19T10:00:00-03:00'); // segunda-feira

const base = (over = {}) => ({
  type: 'brindes',
  title: 'Garrafas para o GF26',
  description: 'Garrafa térmica com a marca para palestrantes.',
  links: ['https://fornecedor.com.br/garrafa-500ml'],
  details: { quantidade: '200' },
  priority: 'alta',
  dueDate: '2026-10-23',
  requesterName: 'Ana',
  requesterEmail: 'ana@gove.digital',
  ...over,
});

test('todas as frentes pedem no mínimo 10 h úteis', () => {
  assert.deepEqual(
    TICKET_TYPES.map((t) => t.id),
    ['redesign', 'video', 'impressos', 'brindes'],
  );
  assert.ok(TICKET_TYPES.every((t) => t.minHours >= 10));
});

test('horas úteis: expediente 9–12 e 13–18, fins de semana e feriados fora', () => {
  assert.equal(new Date(addBusinessHours(SEG_10H, 10)).toISOString(), '2026-10-20T15:00:00.000Z'); // terça 12h
  assert.equal(earliestDueDate(SEG_10H, 10), '2026-10-20');
  const sex16 = Date.parse('2026-10-30T16:00:00-03:00');
  assert.equal(earliestDueDate(sex16, 10), '2026-11-03'); // 02/11 é Finados
  assert.equal(businessHoursBetween(SEG_10H, Date.parse('2026-10-19T18:00:00-03:00')), 7);
  assert.equal(quarterLabel(SEG_10H), '4T26');
});

test('validação: prazo mínimo, link obrigatório em brindes e e-mail do domínio', () => {
  const ok = validateTicket(base(), { now: SEG_10H });
  assert.ok(ok.ok, JSON.stringify(ok.errors));
  assert.match(ok.ticket.id, /^DS-[2-9A-Z]{6}$/);

  const curto = validateTicket(base({ dueDate: '2026-10-19' }), { now: SEG_10H });
  assert.match(curto.errors.dueDate, /10 h úteis.*20\/10\/2026/);
  assert.match(validateTicket(base({ dueDate: '2026-10-24' }), { now: SEG_10H }).errors.dueDate, /dia útil/);
  assert.ok(validateTicket(base({ links: [] }), { now: SEG_10H }).errors.links);
  assert.ok(validateTicket(base({ type: 'redesign', links: [] }), { now: SEG_10H }).ok);
  assert.ok(validateTicket(base({ requesterEmail: 'ana@gmail.com' }), { now: SEG_10H }).errors.requesterEmail);
  assert.ok(validateTicket(base({ links: ['javascript:alert(1)'] }), { now: SEG_10H }).errors.links);
});

test('linha do RAR segue as colunas da aba "Novo RAR"', () => {
  const { ticket } = validateTicket(base(), { now: SEG_10H, id: 'DS-ABC234' });
  const row = rarRow(ticket);
  assert.equal(row.Trimestre, '4T26');
  assert.equal(row.Data, '19/10/2026');
  assert.equal(row.Frente, 'Brindes e outros materiais');
  assert.equal(row['Atividades previstas'], '[DS-ABC234] Garrafas para o GF26');
  assert.equal(row.Prioridade, true);
  assert.match(row['Resultado / Comentários'], /Prazo: 23\/10\/2026 \(mín\. 10 h úteis\)/);
  assert.match(row['Resultado / Comentários'], /fornecedor\.com\.br/);
});

test('e-mail leva marcador decodificável e o .ics cai no prazo', () => {
  const { ticket } = validateTicket(base(), { now: SEG_10H, id: 'DS-ABC234' });
  const mail = ticketEmail(ticket, { calendar: false });
  assert.match(mail.subject, /^\[Design\] Brindes e outros materiais · .* \(DS-ABC234\)$/);
  const m = mail.text.match(new RegExp(`${TICKET_MARKER}([A-Za-z0-9+/=]+)\\.`));
  const data = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
  assert.equal(data.ticket.id, 'DS-ABC234');
  assert.equal(data.calendar, false);
  assert.equal(data.row.Frente, 'Brindes e outros materiais');
  assert.match(ticketIcs(ticket), /DTSTART:20261023T200000Z/); // 17h de Brasília
});

function serve(opts) {
  const app = express();
  app.use('/api/tickets', createTicketsRouter({ db: new Database(':memory:'), now: () => SEG_10H, webhookUrl: '', webhookToken: '', mailer: null, ...opts }));
  const server = app.listen(0);
  return { base: `http://127.0.0.1:${server.address().port}/api/tickets`, close: () => server.close() };
}
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('rota: recusa pedido inválido com erros por campo', async () => {
  const s = serve();
  try {
    const r = await post(s.base, base({ dueDate: '2026-10-19', title: '' }));
    assert.equal(r.status, 400);
    const j = await r.json();
    assert.ok(j.errors.dueDate && j.errors.title);
  } finally {
    s.close();
  }
});

test('rota: despacha para o Apps Script com token e guarda o status', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ rar: true, email: true, calendar: true, row: 117 }), { headers: { 'content-type': 'application/json' } });
  };
  const s = serve({ webhookUrl: 'https://script.google.com/macros/s/x/exec', webhookToken: 'frase', fetchImpl, sessionEmail: () => 'larissa@gove.digital' });
  try {
    const cfg = await (await fetch(s.base + '/config')).json();
    assert.equal(cfg.types[0].earliest, '2026-10-20');
    assert.deepEqual(cfg.integrations, { rar: true, email: true, calendar: true });

    const r = await post(s.base, base());
    assert.equal(r.status, 201);
    const j = await r.json();
    assert.deepEqual(j.status, { rar: 'ok', email: 'ok', calendar: 'ok' });
    assert.equal(j.ticket.requesterEmail, 'larissa@gove.digital'); // sessão vence o formulário
    assert.equal(calls[0].body.token, 'frase');
    assert.equal(calls[0].body.row.Frente, 'Brindes e outros materiais');
    assert.equal(calls[0].body.event.startTime, '2026-10-23T17:00:00');

    const lista = await (await fetch(s.base)).json();
    assert.equal(lista[0].id, j.ticket.id);
    assert.equal(lista[0].status.rar, 'ok');
  } finally {
    s.close();
  }
});

test('rota: sem Apps Script, envia e-mail com convite pelo SMTP', async () => {
  const sent = [];
  const s = serve({ mailer: { sendMail: async (m) => sent.push(m) }, inbox: 'design@gove.digital' });
  try {
    const j = await (await post(s.base, base())).json();
    assert.deepEqual(j.status, { rar: 'pendente', email: 'ok', calendar: 'ok' });
    assert.equal(sent[0].to, 'design@gove.digital');
    assert.equal(sent[0].cc, 'ana@gove.digital');
    assert.match(sent[0].icalEvent.content, /BEGIN:VEVENT/);
  } finally {
    s.close();
  }
});
