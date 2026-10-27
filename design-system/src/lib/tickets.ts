import { findClaude } from './claude';
import {
  DEFAULT_SCHEDULE,
  DESIGN_INBOX,
  brDateFromIso,
  dueInstant,
  earliestDueDate,
  earliestFeasibleDate,
  effortHours,
  leadHours,
  localIso,
  nameFromEmail,
  normalizeSchedule,
  planWork,
  ticketEmail,
  ticketEvent,
  ticketIcs,
  type Interval,
  type Schedule,
  type Ticket,
} from '../../../shared/tickets.js';

/**
 * Onde a solicitação é registrada:
 * - 'server': servidor do projeto (/api/tickets) — login, agenda do design, RAR,
 *   e-mail e agenda pelo Apps Script.
 * - 'artifact': artefato no claude.ai — quem pede vem da conta do claude.ai; a
 *   agenda do design é consultada (horários livres), e-mail e evento de entrega
 *   saem pelo Gmail e Google Agenda de quem pede; o Apps Script lança o RAR e a
 *   produção a partir do e-mail.
 * - 'local': prévia sem servidor nem artefato — só neste navegador.
 */
export type Mode = 'server' | 'artifact' | 'local';
export type Step = 'ok' | 'pendente' | 'falhou' | 'não configurado';
export type TicketStatus = { rar: Step; email: Step; calendar: Step };
export type StoredTicket = Ticket & { status: TicketStatus; work?: Interval[]; error?: string; requesterId?: string };
export type SubmitResult = { ticket: StoredTicket; notes: string[] };
export type Me = { name: string; email: string } | null;
export type Availability = { earliest: string | null; earliestLead: string; calendar: 'consultada' | 'não consultada'; leadHours: number; effortHours: number };

const claude = findClaude;
const use = async (name: string) => {
  const c = claude();
  if (!c) return null;
  try {
    return await Promise.race([c.use(name), new Promise((r) => setTimeout(() => r(null), 12000))]);
  } catch {
    return null;
  }
};

export async function detectMode(): Promise<Mode> {
  if (claude()) return 'artifact';
  try {
    const r = await fetch('/api/tickets/config', { credentials: 'same-origin' });
    if (r.ok && (r.headers.get('content-type') ?? '').includes('json')) return 'server';
  } catch {
    /* sem servidor */
  }
  return 'local';
}

/** Quem está logado: login do Design System (servidor) ou conta do claude.ai (artefato). */
export async function currentUser(mode: Mode): Promise<Me> {
  if (mode === 'server') {
    try {
      const r = await fetch('/api/tickets/me', { credentials: 'same-origin' });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    }
  }
  if (mode === 'artifact') {
    const user = await use('user');
    if (!user) return null;
    try {
      // Sem o escopo de e-mail no claude.ai, vem só o nome; o e-mail é pedido uma vez e lembrado
      const me = await user.me();
      const email = me?.email ? String(me.email).toLowerCase() : '';
      const name = me?.name || (email ? nameFromEmail(email) : '');
      return name || email ? { name, email } : null;
    } catch {
      return null;
    }
  }
  return null;
}

/* ------------------------------------------------- expediente da responsável */

/** Expediente vigente e se quem vê pode alterá-lo (só a responsável, DESIGN_INBOX). */
export type ScheduleState = { schedule: Schedule; canEdit: boolean; owner: string };
const SCHEDULE_LS = 'gove:expediente';
const SCHEDULE_DOC = 'config/expediente';
/**
 * Pode alterar o expediente no artefato? Com o e-mail da conta, só a
 * responsável; sem ele (o claude.ai não expõe e-mails), quem é Editor do
 * artefato — o mesmo nível que a regra do banco exige para gravar em config/.
 */
async function artifactCanEdit(): Promise<boolean> {
  const [user, me] = await Promise.all([use('user'), currentUser('artifact')]);
  if (me?.email) return me.email === DESIGN_INBOX;
  try {
    return Boolean(await user?.canEdit());
  } catch {
    return false;
  }
}
const valid = (s: unknown): Schedule => normalizeSchedule(s).schedule ?? { ...DEFAULT_SCHEDULE, days: [...DEFAULT_SCHEDULE.days], periods: DEFAULT_SCHEDULE.periods.map((p) => [...p] as [string, string]) };
const readLocalSchedule = () => {
  try {
    const raw = window.localStorage.getItem(SCHEDULE_LS);
    return raw ? valid(JSON.parse(raw)) : valid(null);
  } catch {
    return valid(null);
  }
};

/** Acompanha o expediente; devolve a função que encerra a escuta. */
export function watchSchedule(mode: Mode, on: (s: ScheduleState) => void): () => void {
  let alive = true;
  let stop = () => {};
  if (mode === 'server') {
    const load = () =>
      fetch('/api/tickets/expediente', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && j && on({ schedule: valid(j.schedule), canEdit: Boolean(j.canEdit), owner: j.owner ?? DESIGN_INBOX }))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    stop = () => clearInterval(t);
  } else if (mode === 'artifact') {
    on({ schedule: valid(null), canEdit: false, owner: DESIGN_INBOX });
    Promise.all([use('db'), artifactCanEdit()]).then(([db, canEdit]) => {
      if (!alive) return;
      if (!db) return on({ schedule: valid(null), canEdit: false, owner: DESIGN_INBOX });
      stop = db.doc(SCHEDULE_DOC).onSnapshot(
        (snap: any) => alive && on({ schedule: valid(snap?.exists === false ? null : snap?.data?.()), canEdit, owner: DESIGN_INBOX }),
        () => on({ schedule: valid(null), canEdit: false, owner: DESIGN_INBOX }),
      );
    });
  } else {
    // Prévia local: edita neste navegador
    const load = () => alive && on({ schedule: readLocalSchedule(), canEdit: true, owner: DESIGN_INBOX });
    load();
    window.addEventListener(SCHEDULE_LS, load);
    stop = () => window.removeEventListener(SCHEDULE_LS, load);
  }
  return () => {
    alive = false;
    stop();
  };
}

/** Salva o expediente (só a responsável). Devolve o expediente salvo. */
export async function saveSchedule(mode: Mode, input: Schedule): Promise<Schedule> {
  const { ok, error, schedule } = normalizeSchedule(input);
  if (!ok || !schedule) throw new Error(error ?? 'Expediente inválido.');
  if (mode === 'server') {
    const r = await fetch('/api/tickets/expediente', { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(schedule) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? 'Não foi possível salvar o expediente.');
    return valid(j.schedule);
  }
  const saved = { ...schedule, updatedAt: new Date().toISOString() } as Schedule;
  if (mode === 'artifact') {
    const [db, user, canEdit] = await Promise.all([use('db'), use('user'), artifactCanEdit()]);
    if (!canEdit) throw new Error('Só a responsável pelas solicitações altera o expediente.');
    if (!db) throw new Error('O banco do Design System não está disponível nesta visualização.');
    if (user) saved.updatedBy = await user.id();
    await db.doc(SCHEDULE_DOC).set(saved);
  } else {
    try {
      window.localStorage.setItem(SCHEDULE_LS, JSON.stringify(saved));
    } catch {
      /* sem armazenamento */
    }
    window.dispatchEvent(new Event(SCHEDULE_LS));
  }
  freeCache = null;
  return saved;
}

/* ------------------------------------------------- agenda do design */

const DAY = 864e5;
let freeCache: { at: number; key: string; free: Interval[] | null } | null = null;

/** Horários livres da agenda da responsável pelo Google Agenda de quem pede (artefato), dentro do expediente. */
async function artifactFree(schedule: Schedule): Promise<Interval[] | null> {
  const key = JSON.stringify([schedule.days, schedule.periods]);
  if (freeCache && freeCache.key === key && Date.now() - freeCache.at < 5 * 60e3) return freeCache.free;
  const mcp = await use('mcp');
  let free: Interval[] | null = null;
  if (mcp) {
    const start = Date.now();
    const end = start + 45 * DAY;
    try {
      const r = await mcp.callTool('Google Calendar', 'suggest_time', {
        attendeeEmails: [DESIGN_INBOX],
        startTime: localIso(start),
        endTime: localIso(end),
        durationMinutes: 30,
        preferences: {
          startHour: schedule.periods[0][0],
          endHour: schedule.periods[schedule.periods.length - 1][1],
          excludeWeekends: !schedule.days.includes(0) && !schedule.days.includes(6),
          pageSize: 100,
        },
      });
      const slots: any[] = (r?.payload as any)?.timeSlots ?? [];
      free = slots
        .map((s) => ({ start: Date.parse(s.startTime ?? s.start?.dateTime), end: Date.parse(s.endTime ?? s.end?.dateTime) }))
        .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start);
      if (!slots.length) free = null; // sem resposta útil: não trata a agenda como cheia
    } catch {
      free = null;
    }
  }
  freeCache = { at: Date.now(), key, free };
  return free;
}

/** Primeira entrega possível para a frente e a prioridade, com a agenda do design quando dá para consultar. */
export async function availability(mode: Mode, typeId: string, priority: string, schedule: Schedule): Promise<Availability> {
  if (mode === 'server') {
    const r = await fetch(`/api/tickets/availability?type=${encodeURIComponent(typeId)}&priority=${encodeURIComponent(priority)}`, { credentials: 'same-origin' });
    if (r.ok) return r.json();
  }
  const now = Date.now();
  const free = mode === 'artifact' ? await artifactFree(schedule) : null;
  return {
    leadHours: leadHours(typeId, priority),
    effortHours: effortHours(typeId),
    earliestLead: earliestDueDate(now, leadHours(typeId, priority), schedule),
    earliest: earliestFeasibleDate({ nowMs: now, typeId, priority, free, schedule }),
    calendar: free ? 'consultada' : 'não consultada',
  };
}

/* ---------------------------------------------------------- lista */

const LS = 'gove:tickets';
const readLocal = (): StoredTicket[] => {
  try {
    return JSON.parse(window.localStorage.getItem(LS) ?? '[]');
  } catch {
    return [];
  }
};
const writeLocal = (list: StoredTicket[]) => {
  try {
    window.localStorage.setItem(LS, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* sem armazenamento */
  }
};

/** Acompanha os pedidos recentes; devolve a função que encerra a escuta. */
export function watchTickets(mode: Mode, on: (list: StoredTicket[]) => void): () => void {
  let stop = () => {};
  let alive = true;
  if (mode === 'server') {
    const load = () =>
      fetch('/api/tickets?limit=30', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : []))
        .then((l) => alive && on(l))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    stop = () => clearInterval(t);
  } else if (mode === 'artifact') {
    Promise.all([use('db'), use('user')]).then(([db, user]) => {
      if (!alive) return;
      if (!db) return on(readLocal());
      stop = db
        .collection('tickets')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .onSnapshot(
          async (snap: any) => {
            const docs: StoredTicket[] = snap.docs.map((d: any) => ({ ...d.data(), id: d.id }));
            // Nomes vêm do perfil de quem pediu (o banco guarda só o id)
            const ids = [...new Set(docs.map((d) => d.requesterId).filter(Boolean))] as string[];
            const ps = user && ids.length ? await user.profiles(ids).catch(() => ({})) : {};
            if (alive) on(docs.map((d) => ({ ...d, requesterName: (d.requesterId && ps[d.requesterId]?.name) || d.requesterName || '' })));
          },
          () => on(readLocal()),
        );
    });
  } else on(readLocal());
  return () => {
    alive = false;
    stop();
  };
}

/* --------------------------------------------------------- envio */

/** Mensagem curta por código de erro do conector (sem juntar tudo num aviso genérico). */
function connectorNote(server: string, e: any): string {
  switch (e?.code) {
    case 'server_not_connected':
      return `${server} não está conectado: adicione em claude.ai → Configurações → Conectores.`;
    case 'needs_reauth':
      return `Reconecte o ${server} em claude.ai → Configurações → Conectores.`;
    case 'approval_required':
    case 'not_in_manifest':
      return `Sem permissão para usar o ${server} nesta página.`;
    case 'blocked_by_policy':
      return `O ${server} está bloqueado pela política da organização.`;
    case 'selection_required':
      return `Escolha qual conta do ${server} usar e tente de novo.`;
    case 'server_unavailable':
    case 'upstream_error':
      return `O ${server} não confirmou o envio. Confira antes de repetir.`;
    default:
      return `${server}: ${e?.message ?? 'não foi possível concluir.'}`;
  }
}

const fieldError = (fields: Record<string, string>) => Object.assign(new Error('Revise os campos destacados.'), { fields });

export async function submitTicket(mode: Mode, ticket: Ticket): Promise<SubmitResult> {
  if (mode === 'server') {
    const r = await fetch('/api/tickets', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ticket),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error ?? 'Não foi possível enviar.'), { fields: j.errors });
    return { ticket: { ...j.ticket, status: j.status, error: j.error }, notes: j.error ? [j.error] : [] };
  }

  // Produção distribuída nos horários livres da agenda do design, no expediente em que o pedido foi feito
  const now = Date.now();
  const schedule = valid(ticket.schedule);
  const free = mode === 'artifact' ? await artifactFree(schedule) : null;
  const plan = planWork({ nowMs: now, dueMs: dueInstant(ticket.dueDate, schedule), hours: ticket.effortHours, free, schedule });
  if (plan.missingHours > 0) {
    const first = earliestFeasibleDate({ nowMs: now, typeId: ticket.type, priority: ticket.priority, free, schedule });
    throw fieldError({ dueDate: `A agenda do design não tem ${ticket.effortHours} h livres até ${brDateFromIso(ticket.dueDate)}.${first ? ` Primeira data com espaço: ${brDateFromIso(first)}.` : ''}` });
  }
  const blocks = plan.blocks;

  const notes: string[] = [];
  const status: TicketStatus = { rar: 'pendente', email: 'pendente', calendar: 'pendente' };
  const mcp = mode === 'artifact' ? await use('mcp') : null;

  if (mcp) {
    const ev = ticketEvent(ticket);
    try {
      await mcp.callTool('Google Calendar', 'create_event', {
        summary: ev.summary,
        description: ev.description,
        startTime: ev.startTime,
        endTime: ev.endTime,
        timeZone: ev.timeZone,
        attendees: [{ email: DESIGN_INBOX }],
        overrideReminders: ev.reminders,
      });
      status.calendar = 'ok';
    } catch (e) {
      status.calendar = 'falhou';
      notes.push(connectorNote('Google Agenda', e));
    }
    const mail = ticketEmail(ticket, { calendar: status.calendar === 'ok', blocks });
    try {
      await mcp.callTool('Gmail', 'send_message', { to: [DESIGN_INBOX], subject: mail.subject, body: mail.text, htmlBody: mail.html });
      status.email = 'ok';
    } catch (e) {
      status.email = 'falhou';
      notes.push(connectorNote('Gmail', e));
    }
  } else {
    status.email = status.calendar = 'não configurado';
  }
  if (mode === 'artifact' && !free) notes.push('A agenda do design não pôde ser consultada; a produção foi distribuída no expediente da responsável.');

  const stored: StoredTicket = { ...ticket, status, work: blocks };
  const [db, user] = mode === 'artifact' ? await Promise.all([use('db'), use('user')]) : [null, null];
  if (db) {
    try {
      // No banco compartilhado vai o id de quem pediu, não o nome nem o e-mail
      const requesterId = user ? await user.id() : undefined;
      const { requesterName: _n, requesterEmail: _e, ...rest } = stored;
      await db.collection('tickets').doc(ticket.id).set(JSON.parse(JSON.stringify({ ...rest, requesterId })));
    } catch {
      notes.push('O pedido não foi salvo na lista compartilhada.');
    }
  }
  writeLocal([stored, ...readLocal().filter((t) => t.id !== ticket.id)]);
  return { ticket: stored, notes };
}

/** Link de e-mail pronto (quando o Gmail não está conectado). */
export function mailtoFor(ticket: StoredTicket) {
  const m = ticketEmail(ticket, { calendar: false, blocks: ticket.work ?? [] });
  return `mailto:${DESIGN_INBOX}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.text)}`;
}

export const icsFor = ticketIcs;
