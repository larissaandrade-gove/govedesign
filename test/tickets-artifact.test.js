// Solicitações no artefato do claude.ai: conectores (Google Agenda, Gmail), banco
// compartilhado e perfil, com um runtime de teste. Confere a ordem das chamadas,
// os convidados do evento, o reenvio só do passo que falhou, o limite de tempo e
// o código que não sobrescreve um pedido existente.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DESIGN_INBOX, TICKET_MARKER, earliestFeasibleDate, validateTicket } from '../shared/tickets.js';

const DESC = 'Garrafa térmica com a marca para os palestrantes do Governos do Futuro 2026.';

/** Data de entrega folgada a partir de agora (o envio recalcula a produção com o relógio real). */
function freshTicket(over = {}) {
  const first = earliestFeasibleDate({ nowMs: Date.now(), typeId: 'brindes', priority: 'normal', free: null });
  let d = Date.parse(`${first}T12:00:00Z`) + 14 * 864e5;
  const iso = () => new Date(d).toISOString().slice(0, 10);
  while ([0, 6].includes(new Date(d).getUTCDay())) d += 864e5;
  const r = validateTicket(
    {
      type: 'brindes',
      title: 'Garrafas para o GF26',
      description: DESC,
      pieceType: 'Garrafa',
      format: 'Área de gravação 8×4 cm',
      links: ['https://fornecedor.com.br/garrafa-500ml'],
      priority: 'normal',
      dueDate: iso(),
      requesterName: 'Ana Souza',
      requesterEmail: 'ana.souza@gove.digital',
      ...over,
    },
    { id: 'DS-TESTE2' },
  );
  assert.ok(r.ok, JSON.stringify(r.errors));
  return r.ticket;
}

function fakeDb(initial = {}, { failSet = false } = {}) {
  const store = new Map(Object.entries(initial));
  const log = [];
  const subs = [];
  const snapAll = () => ({ docs: [...store].filter(([k]) => k.startsWith('tickets/')).map(([k, v]) => ({ id: k.slice(8), data: () => v })) });
  const doc = (path) => ({
    async get() {
      log.push(['get', path]);
      return { id: path.split('/').pop(), exists: store.has(path), data: () => store.get(path) };
    },
    async set(data) {
      log.push(['set', path]);
      if (failSet) throw Object.assign(new Error('negado'), { code: 'permission_denied' });
      store.set(path, data);
      subs.forEach((f) => f(snapAll()));
    },
    onSnapshot(fn) {
      queueMicrotask(() => fn({ exists: store.has(path), data: () => store.get(path) }));
      return () => {};
    },
  });
  return {
    store,
    log,
    doc,
    collection: (name) => {
      const q = {
        orderBy: () => q,
        limit: () => q,
        doc: (id) => doc(`${name}/${id}`),
        onSnapshot(fn) {
          subs.push(fn);
          queueMicrotask(() => fn(snapAll()));
          return () => {};
        },
      };
      return q;
    },
  };
}

/** Conector de teste: cada ferramenta responde pelo `handlers[tool]` (padrão: ok). */
function fakeMcp(handlers = {}) {
  const calls = [];
  return {
    calls,
    async callTool(server, tool, input) {
      calls.push({ server, tool, input });
      const h = handlers[tool];
      if (h) return h(input);
      return { payload: {} };
    },
  };
}

function setup({ mcp = fakeMcp(), db = fakeDb(), email = 'ana.souza@gove.digital', userId = 'u-ana' } = {}) {
  const mem = new Map();
  const user = {
    me: async () => ({ id: userId, name: 'Ana Souza', email }),
    id: async () => userId,
    profiles: async () => ({}),
    canEdit: async () => true,
  };
  globalThis.window = {
    claude: { use: async (name) => ({ mcp, db, user })[name] ?? null },
    localStorage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
  };
  globalThis.window.parent = globalThis.window;
  globalThis.window.top = globalThis.window;
  return { mcp, db, mem };
}

let n = 0;
const load = () => import(`../design-system/src/lib/tickets.ts?t=${Date.now()}-${n++}`);
const marker = (text) => JSON.parse(Buffer.from(text.match(new RegExp(`${TICKET_MARKER}([A-Za-z0-9+/=]+)\\.`))[1], 'base64').toString('utf8'));

test('artefato: ordem das chamadas e convidados só de quem pediu e da responsável', async () => {
  const { mcp, db } = setup();
  const { submitTicket } = await load();
  const { ticket, notes } = await submitTicket('artifact', freshTicket());

  assert.deepEqual(
    mcp.calls.map((c) => c.tool),
    ['suggest_time', 'create_event', 'send_message'],
  );
  assert.deepEqual(db.log, [
    ['get', 'tickets/DS-TESTE2'],
    ['set', 'tickets/DS-TESTE2'],
  ]);
  const st = mcp.calls[0].input;
  assert.equal(st.timeZone, 'America/Sao_Paulo');
  assert.deepEqual(st.attendeeEmails, [DESIGN_INBOX]);

  const ev = mcp.calls[1].input;
  assert.deepEqual(
    ev.attendees.map((a) => a.email),
    ['ana.souza@gove.digital', DESIGN_INBOX],
  );
  assert.deepEqual(ev.guestPermissions, { guestsCanInviteOthers: false, guestsCanModify: false, guestsCanSeeGuests: true });
  assert.equal(ev.visibility, 'private');
  assert.equal(ev.notificationLevel, 'ALL');
  assert.equal(ev.timeZone, 'America/Sao_Paulo');
  assert.ok(ev.overrideReminders.length >= 2);

  const mail = mcp.calls[2].input;
  assert.deepEqual(mail.to, [DESIGN_INBOX]);
  assert.equal(marker(mail.body).calendar, true); // o Apps Script não cria um segundo evento

  assert.deepEqual(ticket.status, { rar: 'pendente', email: 'ok', calendar: 'ok' });
  assert.equal(ticket.saved, true);
  // No banco vai o id de quem pediu, não nome nem e-mail
  const saved = db.store.get('tickets/DS-TESTE2');
  assert.equal(saved.requesterId, 'u-ana');
  assert.equal('requesterEmail' in saved, false);
  // Sem a lista de horários, a agenda não conta como consultada
  assert.match(notes.join(' '), /não pôde ser consultada/);
});

test('artefato: responsável pedindo para si não é convidada duas vezes', async () => {
  const { mcp } = setup({ email: DESIGN_INBOX });
  const { submitTicket } = await load();
  await submitTicket('artifact', freshTicket({ requesterEmail: DESIGN_INBOX, requesterName: 'Larissa Andrade' }));
  const ev = mcp.calls.find((c) => c.tool === 'create_event').input;
  assert.deepEqual(
    ev.attendees.map((a) => a.email),
    [DESIGN_INBOX],
  );
});

test('artefato: falha parcial é reenviada com o mesmo código, só no passo que falhou', async () => {
  let gmailOff = true;
  const mcp = fakeMcp({
    send_message: () => {
      if (gmailOff) throw Object.assign(new Error('não conectado'), { code: 'server_not_connected' });
      return { payload: { id: 'm1' } };
    },
  });
  const { db } = setup({ mcp });
  const { submitTicket, canRetry } = await load();
  const first = await submitTicket('artifact', freshTicket());
  assert.deepEqual(first.ticket.status, { rar: 'pendente', email: 'falhou', calendar: 'ok' });
  assert.match(first.notes.join(' '), /Gmail não está conectado/);
  assert.ok(canRetry(first.ticket));

  gmailOff = false;
  mcp.calls.length = 0;
  db.log.length = 0;
  const again = await submitTicket('artifact', first.ticket, { previous: first.ticket });
  assert.deepEqual(
    mcp.calls.map((c) => c.tool),
    ['send_message'],
  ); // nada de evento novo nem nova consulta
  assert.equal(again.ticket.id, first.ticket.id);
  assert.deepEqual(again.ticket.status, { rar: 'pendente', email: 'ok', calendar: 'ok' });
  assert.deepEqual(db.log, [['set', `tickets/${first.ticket.id}`]]); // atualiza o próprio pedido, sem conferir/gerar código novo
  assert.equal(marker(mcp.calls[0].input.body).calendar, true);
});

test('artefato: limite de tempo por chamada; no reenvio confere antes de recriar', async () => {
  let created = 0;
  const mcp = fakeMcp({
    create_event: () => {
      created++;
      return new Promise(() => {}); // nunca responde
    },
    search_events: () => ({ payload: { events: [{ summary: 'Entrega design: Garrafas para o GF26 (DS-TESTE2)' }] } }),
  });
  setup({ mcp });
  const { submitTicket } = await load();
  const t0 = Date.now();
  const first = await submitTicket('artifact', freshTicket(), { timeoutMs: 50 });
  assert.ok(Date.now() - t0 < 2000);
  assert.equal(first.ticket.status.calendar, 'falhou');
  assert.deepEqual(first.ticket.uncertain, ['calendar']);
  assert.match(first.notes.join(' '), /não respondeu/);
  assert.equal(first.ticket.status.email, 'ok');

  mcp.calls.length = 0;
  const again = await submitTicket('artifact', first.ticket, { previous: first.ticket, timeoutMs: 50 });
  assert.deepEqual(
    mcp.calls.map((c) => c.tool),
    ['search_events'],
  ); // o evento já existia: não cria outro, e o e-mail já tinha saído
  assert.equal(created, 1);
  assert.equal(again.ticket.status.calendar, 'ok');
  assert.equal(again.ticket.uncertain, undefined);
});

test('artefato: o padrão do limite de tempo é 20 s', async () => {
  const { CONNECTOR_TIMEOUT_MS } = await load();
  assert.equal(CONNECTOR_TIMEOUT_MS, 20_000);
});

test('artefato: código existente no banco não é sobrescrito', async () => {
  const outro = { title: 'Pedido de outra pessoa', requesterId: 'u-bia' };
  const db = fakeDb({ 'tickets/DS-TESTE2': outro });
  const { mcp } = setup({ db });
  const { submitTicket } = await load();
  const { ticket } = await submitTicket('artifact', freshTicket());
  assert.notEqual(ticket.id, 'DS-TESTE2');
  assert.equal(db.store.get('tickets/DS-TESTE2'), outro);
  assert.ok(db.store.has(`tickets/${ticket.id}`));
  // O código novo é o que vai no evento e no e-mail
  assert.match(mcp.calls.find((c) => c.tool === 'create_event').input.summary, new RegExp(ticket.id));
  assert.match(mcp.calls.find((c) => c.tool === 'send_message').input.subject, new RegExp(ticket.id));
});

test('artefato: pedido não gravado no banco fica na lista com "não salvo"; cada pessoa vê só os seus', async () => {
  const db = fakeDb({ 'tickets/DS-BIA234': { title: 'Da Bia', requesterId: 'u-bia', createdAt: '2026-11-01T10:00:00.000Z', dueDate: '2026-11-20' } }, { failSet: true });
  setup({ db });
  const { submitTicket, watchTickets } = await load();
  const r = await submitTicket('artifact', freshTicket());
  assert.equal(r.ticket.saved, false);
  assert.match(r.notes.join(' '), /não foi salvo/);
  const list = await new Promise((resolve) => watchTickets('artifact', resolve));
  assert.deepEqual(
    list.map((t) => [t.id, t.saved]),
    [['DS-TESTE2', false]],
  ); // o da Bia não aparece para a Ana
});

test('artefato: a responsável vê todos os pedidos', async () => {
  const db = fakeDb({
    'tickets/DS-BIA234': { title: 'Da Bia', requesterId: 'u-bia', createdAt: '2026-11-01T10:00:00.000Z' },
    'tickets/DS-ANA234': { title: 'Da Ana', requesterId: 'u-ana', createdAt: '2026-11-02T10:00:00.000Z' },
  });
  setup({ db, email: DESIGN_INBOX, userId: 'u-lari' });
  const { watchTickets } = await load();
  const list = await new Promise((resolve) => watchTickets('artifact', resolve));
  assert.deepEqual(
    list.map((t) => t.id),
    ['DS-ANA234', 'DS-BIA234'],
  );
});

test('artefato: expediente só editável pela responsável; sem e-mail no perfil, ninguém edita', async () => {
  for (const [email, canEdit] of [
    [DESIGN_INBOX, true],
    ['ana.souza@gove.digital', false],
    ['', false],
  ]) {
    setup({ email });
    const { watchSchedule } = await load();
    const s = await new Promise((resolve) => {
      const stop = watchSchedule('artifact', (v) => {
        stop?.();
        resolve(v);
      });
    });
    assert.equal(s.canEdit, canEdit, email);
    assert.equal('owner' in s, canEdit, email);
  }
});

test('artefato: salvar o expediente não grava quem nem quando', async () => {
  const db = fakeDb();
  setup({ db, email: DESIGN_INBOX });
  const { saveSchedule } = await load();
  await saveSchedule('artifact', { days: [1, 2, 3], periods: [['09:00', '12:00']], updatedBy: 'x', updatedAt: 'y' });
  assert.deepEqual(db.store.get('config/expediente'), { days: [1, 2, 3], periods: [['09:00', '12:00']] });
  setup({ email: 'ana.souza@gove.digital' });
  const other = await load();
  await assert.rejects(other.saveSchedule('artifact', { days: [1], periods: [['09:00', '12:00']] }), /Só a responsável/);
});

test('artefato sem conectores: "não configurado" com o motivo; mailto curto com o código', async () => {
  const { db } = setup({ mcp: null });
  globalThis.window.claude.use = async (name) => (name === 'db' ? db : null);
  const { submitTicket, mailtoFor } = await load();
  const { ticket, notes } = await submitTicket('artifact', freshTicket());
  assert.deepEqual(ticket.status, { rar: 'não configurado', email: 'não configurado', calendar: 'não configurado' });
  assert.match(notes.join(' '), /Gmail e Google Agenda não estão disponíveis/);
  const link = mailtoFor(ticket);
  assert.ok(!link.includes(encodeURIComponent(TICKET_MARKER)));
  assert.ok(decodeURIComponent(link).includes('Código: DS-TESTE2'));
  assert.ok(link.length < 2000, String(link.length));
});

test('suggest_time truncado ou vazio não libera a agenda inteira', async () => {
  const mcp = fakeMcp({ suggest_time: () => ({ payload: { timeSlots: [] } }) });
  setup({ mcp });
  const { availability } = await load();
  const a = await availability('artifact', 'redesign', 'normal', { days: [1, 2, 3, 4, 5], periods: [['08:00', '12:00'], ['13:00', '17:00']] });
  assert.equal(a.calendar, 'consultada');
  // Agenda cheia nos 45 dias consultados: a primeira entrega fica depois da janela
  assert.ok(a.earliest > new Date(Date.now() + 44 * 864e5).toISOString().slice(0, 10), a.earliest);
});
