import { findClaude } from './claude.ts';
import {
  DEFAULT_SCHEDULE,
  DESIGN_INBOX,
  brDateFromIso,
  dueInstant,
  earliestDueDate,
  earliestFeasibleDate,
  effortHours,
  freeFromSlots,
  leadHours,
  localIso,
  nameFromEmail,
  newTicketId,
  normalizeSchedule,
  planWork,
  TIME_ZONE,
  ticketEmail,
  ticketEvent,
  ticketIcs,
  ticketShortEmail,
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
export type StoredTicket = Ticket & {
  status: TicketStatus;
  work?: Interval[];
  error?: string;
  requesterId?: string;
  /** false: o pedido não foi gravado na lista compartilhada (fica só neste navegador). */
  saved?: boolean;
  /** Passos que falharam sem resposta (tempo esgotado): no reenvio, confere antes de refazer. */
  uncertain?: ('email' | 'calendar')[];
};
export type SubmitResult = { ticket: StoredTicket; notes: string[] };
export type Me = { name: string; email: string } | null;
export type Availability = {
  earliest: string | null;
  earliestLead: string;
  calendar: 'consultada' | 'não consultada';
  leadHours: number;
  effortHours: number;
  /** Aviso quando a consulta falhou e a previsão saiu só do expediente. */
  note?: string;
};

/** Limite de cada chamada de conector (Gmail, Google Agenda). */
export const CONNECTOR_TIMEOUT_MS = 20_000;

const claude = findClaude;
const use = async (name: string): Promise<any> => {
  const c = claude();
  if (!c) return null;
  try {
    return await Promise.race([c.use(name), new Promise((r) => setTimeout(() => r(null), 12000))]);
  } catch {
    return null;
  }
};

/** Chamada de conector com limite de tempo; o tempo esgotado rejeita com `code: 'timeout'`. */
async function callTool(mcp: any, server: string, tool: string, input: Record<string, unknown>, ms = CONNECTOR_TIMEOUT_MS): Promise<any> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`${server} não respondeu em ${Math.round(ms / 1000)} s.`), { code: 'timeout' })), ms);
  });
  try {
    return await Promise.race([mcp.callTool(server, tool, input), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

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

/** Quem está logado: login do Design System (servidor) ou conta do claude.ai (artefato, com o e-mail do perfil quando o claude.ai o expõe). */
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
      const email = me?.email ? String(me.email).trim().toLowerCase() : '';
      const name = me?.name || (email ? nameFromEmail(email) : '');
      return name || email ? { name, email } : null;
    } catch {
      return null;
    }
  }
  return null;
}

/* ------------------------------------------------- expediente da responsável */

/**
 * Expediente vigente e se quem vê pode alterá-lo (só a responsável,
 * DESIGN_INBOX). `owner` só vem para ela; `fallback` diz que a leitura falhou
 * e os prazos saem do expediente padrão.
 */
export type ScheduleState = { schedule: Schedule; canEdit: boolean; owner?: string; fallback?: boolean };
const SCHEDULE_LS = 'gove:expediente';
const SCHEDULE_DOC = 'config/expediente';
/**
 * Pode alterar o expediente no artefato? Só a responsável, reconhecida pelo
 * e-mail do perfil. Sem e-mail no perfil, ninguém altera por aqui.
 */
async function artifactCanEdit(): Promise<boolean> {
  const me = await currentUser('artifact');
  return me?.email === DESIGN_INBOX;
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

/** Acompanha o expediente; só avisa quando ele muda (nada de piscar a cada consulta). Devolve a função que encerra a escuta. */
export function watchSchedule(mode: Mode, on: (s: ScheduleState) => void): () => void {
  let alive = true;
  let stop = () => {};
  let last = '';
  const emit = (s: ScheduleState) => {
    if (!alive) return;
    const key = JSON.stringify(s);
    if (key === last) return;
    last = key;
    on(s);
  };
  const fallback = (canEdit = false) => emit({ schedule: valid(null), canEdit, fallback: true });
  if (mode === 'server') {
    const load = () =>
      fetch('/api/tickets/expediente', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j) => emit({ schedule: valid(j.schedule), canEdit: Boolean(j.canEdit), ...(j.owner ? { owner: String(j.owner) } : {}) }))
        .catch(() => {
          if (!last) fallback();
        });
    load();
    const t = setInterval(load, 60_000);
    stop = () => clearInterval(t);
  } else if (mode === 'artifact') {
    Promise.all([use('db'), artifactCanEdit()]).then(([db, canEdit]) => {
      if (!alive) return;
      if (!db) return fallback();
      const owner = canEdit ? { owner: DESIGN_INBOX } : {};
      try {
        stop = db.doc(SCHEDULE_DOC).onSnapshot(
          (snap: any) => emit({ schedule: valid(snap?.exists === false ? null : snap?.data?.()), canEdit, ...owner }),
          () => fallback(),
        );
      } catch {
        fallback();
      }
    });
  } else {
    // Prévia local: edita neste navegador
    const load = () => emit({ schedule: readLocalSchedule(), canEdit: true, owner: DESIGN_INBOX });
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
  const { updatedAt: _a, updatedBy: _b, ...plain } = schedule;
  if (mode === 'artifact') {
    const [db, canEdit] = await Promise.all([use('db'), artifactCanEdit()]);
    if (!canEdit) throw new Error('Só a responsável pelas solicitações altera o expediente.');
    if (!db) throw new Error('O banco do Design System não está disponível nesta visualização.');
    // O documento é lido por quem abre a página: só dias e períodos, sem quem nem quando
    await db.doc(SCHEDULE_DOC).set(plain);
    freeCache = null;
    return plain as Schedule;
  }
  const saved = { ...plain, updatedAt: new Date().toISOString() } as Schedule;
  try {
    window.localStorage.setItem(SCHEDULE_LS, JSON.stringify(saved));
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event(SCHEDULE_LS));
  freeCache = null;
  return saved;
}

/* ------------------------------------------------- agenda do design */

const DAY = 864e5;
const SLOT_PAGE = 100;
let freeCache: { at: number; key: string; free: Interval[] | null } | null = null;

/**
 * Horários livres da agenda da responsável pelo Google Agenda de quem pede
 * (artefato), lidos em horário de Brasília. Resposta vazia não é "agenda toda
 * livre": a janela consultada vale como ocupada; resposta truncada cobre só
 * até o último horário recebido e, depois dele, vale o expediente.
 * `null` = agenda não consultada.
 */
async function artifactFree(schedule: Schedule): Promise<Interval[] | null> {
  const key = JSON.stringify([schedule.days, schedule.periods]);
  if (freeCache && freeCache.key === key && Date.now() - freeCache.at < 5 * 60e3) return freeCache.free;
  const mcp = await use('mcp');
  let free: Interval[] | null = null;
  if (mcp) {
    const start = Date.now();
    const end = start + 45 * DAY;
    try {
      const r = await callTool(mcp, 'Google Calendar', 'suggest_time', {
        attendeeEmails: [DESIGN_INBOX],
        startTime: localIso(start),
        endTime: localIso(end),
        timeZone: TIME_ZONE,
        durationMinutes: 30,
        preferences: {
          startHour: schedule.periods[0][0],
          endHour: schedule.periods[schedule.periods.length - 1][1],
          excludeWeekends: !schedule.days.includes(0) && !schedule.days.includes(6),
          pageSize: SLOT_PAGE,
        },
      });
      free = freeFromSlots(r?.payload ?? r, { startMs: start, endMs: end, pageSize: SLOT_PAGE });
    } catch {
      free = null;
    }
  }
  freeCache = { at: Date.now(), key, free };
  return free;
}

const localAvailability = (typeId: string, priority: string, schedule: Schedule, free: Interval[] | null, note?: string): Availability => {
  const now = Date.now();
  return {
    leadHours: leadHours(typeId, priority),
    effortHours: effortHours(typeId),
    earliestLead: earliestDueDate(now, leadHours(typeId, priority), schedule),
    earliest: earliestFeasibleDate({ nowMs: now, typeId, priority, free, schedule }),
    calendar: free ? 'consultada' : 'não consultada',
    ...(note ? { note } : {}),
  };
};

/** Primeira entrega possível para a frente e a prioridade, com a agenda do design quando dá para consultar. Nunca rejeita: falhas viram `note`. */
export async function availability(mode: Mode, typeId: string, priority: string, schedule: Schedule): Promise<Availability> {
  if (mode === 'server') {
    try {
      const r = await fetch(`/api/tickets/availability?type=${encodeURIComponent(typeId)}&priority=${encodeURIComponent(priority)}`, { credentials: 'same-origin' });
      if (r.ok) return await r.json();
    } catch {
      /* cai no cálculo local */
    }
    return localAvailability(typeId, priority, schedule, null, 'Não foi possível consultar a agenda do design; previsão pelo expediente.');
  }
  if (mode === 'artifact') {
    const free = await artifactFree(schedule).catch(() => null);
    return localAvailability(typeId, priority, schedule, free, free ? undefined : 'A agenda do design não pôde ser consultada; previsão pelo expediente.');
  }
  return localAvailability(typeId, priority, schedule, null);
}

/* ---------------------------------------------------------- lista */

const LS = 'gove:tickets';
const readLocal = (): StoredTicket[] => {
  try {
    const v = JSON.parse(window.localStorage.getItem(LS) ?? '[]');
    return Array.isArray(v) ? v : [];
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

/**
 * Acompanha os pedidos: cada pessoa vê os seus; a responsável vê todos. Os
 * pedidos que não chegaram ao banco continuam na lista (`saved: false`).
 * Devolve a função que encerra a escuta.
 */
export function watchTickets(mode: Mode, on: (list: StoredTicket[]) => void): () => void {
  let stop = () => {};
  let alive = true;
  let last = '';
  const emit = (l: StoredTicket[]) => {
    if (!alive) return;
    const key = JSON.stringify(l);
    if (key === last) return;
    last = key;
    on(l);
  };
  if (mode === 'server') {
    const load = () =>
      fetch('/api/tickets?limit=30', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((l) => Array.isArray(l) && emit(l))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    stop = () => clearInterval(t);
  } else if (mode === 'artifact') {
    Promise.all([use('db'), use('user'), artifactCanEdit()]).then(async ([db, user, all]) => {
      if (!alive) return;
      if (!db) return emit(readLocal());
      const myId: string | undefined = user ? await user.id().catch(() => undefined) : undefined;
      try {
        stop = db
          .collection('tickets')
          .orderBy('createdAt', 'desc')
          .limit(100)
          .onSnapshot(
            async (snap: any) => {
              const docs: StoredTicket[] = snap.docs.map((d: any) => ({ ...d.data(), id: d.id })).filter((d: StoredTicket) => all || (myId && d.requesterId === myId));
              // Nomes vêm do perfil de quem pediu (o banco guarda só o id)
              const ids = [...new Set(docs.map((d) => d.requesterId).filter(Boolean))] as string[];
              const ps = user && ids.length ? await user.profiles(ids).catch(() => ({})) : {};
              const named = docs.map((d) => ({ ...d, requesterName: (d.requesterId && ps[d.requesterId]?.name) || d.requesterName || '' }));
              const unsaved = readLocal().filter((t) => t.saved === false && !named.some((d) => d.id === t.id));
              emit([...unsaved, ...named].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 30));
            },
            () => emit(readLocal()),
          );
      } catch {
        emit(readLocal());
      }
    });
  } else emit(readLocal());
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
    case 'not_granted':
      return `Sem permissão para usar o ${server} nesta página.`;
    case 'blocked_by_policy':
      return `O ${server} está bloqueado pela política da organização.`;
    case 'selection_required':
      return `Escolha qual conta do ${server} usar e tente de novo.`;
    case 'timeout':
      return `O ${server} não respondeu em ${CONNECTOR_TIMEOUT_MS / 1000} s. Use "Reenviar": antes de refazer, a página confere se ele já foi concluído.`;
    case 'server_unavailable':
    case 'upstream_error':
      return `O ${server} não confirmou o envio. Use "Reenviar": antes de refazer, a página confere se ele já foi concluído.`;
    default:
      return `${server}: ${e?.message ?? 'não foi possível concluir.'}`;
  }
}
/** Falha sem certeza de que nada foi feito (o conector pode ter concluído). */
const isUncertain = (e: any) => ['timeout', 'server_unavailable', 'upstream_error'].includes(e?.code) || !e?.code;

const fieldError = (fields: Record<string, string>) => Object.assign(new Error('Revise os campos destacados.'), { fields });

/** Convidados do evento de entrega: só quem pediu e a responsável (sem repetir). */
export const eventAttendees = (requesterEmail: string) => [...new Set([requesterEmail.toLowerCase(), DESIGN_INBOX])].map((email) => ({ email }));

/** O pedido já existe? (texto de busca do conector contém o código) */
async function alreadyThere(mcp: any, server: string, tool: string, input: Record<string, unknown>, id: string, ms: number): Promise<boolean | null> {
  try {
    const r = await callTool(mcp, server, tool, input, ms);
    return JSON.stringify(r?.payload ?? r ?? '').includes(id);
  } catch {
    return null; // não deu para conferir
  }
}

export type SubmitOptions = {
  /** Reenvio: o pedido já registrado, com o status de cada passo; refaz só o que falhou. */
  previous?: StoredTicket;
  /** Limite de cada chamada de conector (padrão: 20 s). */
  timeoutMs?: number;
};

/**
 * Envia (ou reenvia, com `previous`) a solicitação. No reenvio o código é o
 * mesmo e só os passos que falharam são refeitos, sem duplicar evento nem e-mail.
 */
export async function submitTicket(mode: Mode, input: Ticket, opts: SubmitOptions = {}): Promise<SubmitResult> {
  const { previous, timeoutMs = CONNECTOR_TIMEOUT_MS } = opts;
  if (mode === 'server') {
    const url = previous ? `/api/tickets/${encodeURIComponent(previous.id)}/reenviar` : '/api/tickets';
    const r = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(previous ? {} : input),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error ?? 'Não foi possível enviar.'), { fields: j.errors });
    const notes = [...(j.error ? [j.error] : []), ...(Array.isArray(j.notes) ? j.notes : [])];
    const ticket: StoredTicket = { ...j.ticket, status: j.status, error: j.error };
    writeLocal([ticket, ...readLocal().filter((t) => t.id !== ticket.id)]);
    return { ticket, notes };
  }

  const ticket: Ticket = { ...input };
  const notes: string[] = [];
  const [mcp, db, user] = mode === 'artifact' ? await Promise.all([use('mcp'), use('db'), use('user')]) : [null, null, null];
  const docs = db ? db.collection('tickets') : null;

  // Código novo não sobrescreve um pedido existente: confere antes de usar
  if (!previous && docs) {
    for (let i = 0; i < 5; i++) {
      const snap = await docs
        .doc(ticket.id)
        .get()
        .catch(() => null);
      if (!snap?.exists) break;
      ticket.id = newTicketId();
    }
  }

  // Produção distribuída nos horários livres da agenda do design, no expediente em que o pedido foi feito
  let blocks = previous?.work;
  let free: Interval[] | null = null;
  if (!blocks) {
    const now = Date.now();
    const schedule = valid(ticket.schedule);
    free = mode === 'artifact' ? await artifactFree(schedule) : null;
    const plan = planWork({ nowMs: now, dueMs: dueInstant(ticket.dueDate, schedule), hours: ticket.effortHours, free, schedule });
    if (plan.missingHours > 0) {
      const first = earliestFeasibleDate({ nowMs: now, typeId: ticket.type, priority: ticket.priority, free, schedule });
      throw fieldError({ dueDate: `A agenda do design não tem ${ticket.effortHours} h livres até ${brDateFromIso(ticket.dueDate)}.${first ? ` Primeira data com espaço: ${brDateFromIso(first)}.` : ''}` });
    }
    blocks = plan.blocks;
    if (mode === 'artifact' && !free) notes.push('A agenda do design não pôde ser consultada; a produção foi distribuída no expediente da responsável.');
  }

  const prev = previous?.status;
  const status: TicketStatus = prev ? { ...prev } : { rar: 'pendente', email: 'pendente', calendar: 'pendente' };
  const uncertain = new Set(previous?.uncertain ?? []);
  const redo = (k: 'email' | 'calendar') => !prev || prev[k] !== 'ok';

  if (mcp) {
    if (redo('calendar')) {
      // Falha sem resposta na vez anterior: confere se o evento já existe antes de criar outro
      const found = uncertain.has('calendar') ? await alreadyThere(mcp, 'Google Calendar', 'search_events', { query: ticket.id }, ticket.id, timeoutMs) : false;
      if (found) {
        status.calendar = 'ok';
        uncertain.delete('calendar');
      } else if (found === null) {
        notes.push('Não foi possível conferir se o evento de entrega já está na agenda. Confira antes de reenviar.');
      } else {
        const ev = ticketEvent(ticket);
        try {
          await callTool(
            mcp,
            'Google Calendar',
            'create_event',
            {
              summary: ev.summary,
              description: ev.description,
              startTime: ev.startTime,
              endTime: ev.endTime,
              timeZone: ev.timeZone,
              attendees: eventAttendees(ticket.requesterEmail),
              guestPermissions: { guestsCanInviteOthers: false, guestsCanModify: false, guestsCanSeeGuests: true },
              visibility: 'private',
              notificationLevel: 'ALL',
              overrideReminders: ev.reminders,
            },
            timeoutMs,
          );
          status.calendar = 'ok';
          uncertain.delete('calendar');
        } catch (e) {
          status.calendar = 'falhou';
          if (isUncertain(e)) uncertain.add('calendar');
          else uncertain.delete('calendar');
          notes.push(connectorNote('Google Agenda', e));
        }
      }
    }
    if (redo('email')) {
      const found = uncertain.has('email') ? await alreadyThere(mcp, 'Gmail', 'search_threads', { query: `in:sent "${ticket.id}"`, pageSize: 5 }, ticket.id, timeoutMs) : false;
      if (found) {
        status.email = 'ok';
        uncertain.delete('email');
      } else if (found === null) {
        notes.push('Não foi possível conferir se o e-mail já saiu. Confira na pasta Enviados antes de reenviar.');
      } else {
        // O marcador diz ao Apps Script se o evento de entrega já foi criado
        const mail = ticketEmail(ticket, { calendar: status.calendar === 'ok', blocks });
        try {
          await callTool(mcp, 'Gmail', 'send_message', { to: [DESIGN_INBOX], subject: mail.subject, body: mail.text, htmlBody: mail.html }, timeoutMs);
          status.email = 'ok';
          uncertain.delete('email');
        } catch (e) {
          status.email = 'falhou';
          if (isUncertain(e)) uncertain.add('email');
          else uncertain.delete('email');
          notes.push(connectorNote('Gmail', e));
        }
      }
    }
    // O RAR é lançado pelo Apps Script ao ler o e-mail: fica pendente até lá
    if (status.rar !== 'ok') status.rar = 'pendente';
  } else {
    status.rar = status.email = status.calendar = 'não configurado';
    notes.push(
      mode === 'artifact'
        ? 'Gmail e Google Agenda não estão disponíveis nesta visualização: o pedido não foi enviado à área de design. Use "Enviar e-mail" e "Adicionar à agenda" abaixo.'
        : 'Prévia local: o pedido ficou só neste navegador e não foi enviado à área de design. Use "Enviar e-mail" e "Adicionar à agenda" abaixo.',
    );
  }

  const { uncertain: _u, saved: _sv, error: _er, ...plain } = ticket as StoredTicket;
  const stored: StoredTicket = { ...plain, status, work: blocks };
  if (uncertain.size) stored.uncertain = [...uncertain];
  if (docs) {
    try {
      // No banco compartilhado vai o id de quem pediu, não o nome nem o e-mail
      const requesterId = user ? await user.id() : undefined;
      const { requesterName: _n, requesterEmail: _e, saved: _s, ...rest } = stored;
      await docs.doc(ticket.id).set(JSON.parse(JSON.stringify({ ...rest, requesterId })));
      stored.requesterId = requesterId;
      stored.saved = true;
    } catch {
      stored.saved = false;
      notes.push('O pedido não foi salvo na lista compartilhada; ele continua aqui neste navegador.');
    }
  } else if (mode === 'artifact') {
    stored.saved = false;
  }
  writeLocal([stored, ...readLocal().filter((t) => t.id !== ticket.id && t.id !== input.id)]);
  return { ticket: stored, notes };
}

/** Algum passo pode ser reenviado? */
export const canRetry = (t: StoredTicket | null | undefined) => Boolean(t && (t.status?.email === 'falhou' || t.status?.calendar === 'falhou' || t.status?.rar === 'falhou'));

/** Link de e-mail pronto (quando o Gmail não está conectado): texto curto com o código, sem o marcador. */
export function mailtoFor(ticket: StoredTicket) {
  const m = ticketShortEmail(ticket);
  return `mailto:${DESIGN_INBOX}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.text)}`;
}

export const icsFor = (t: Ticket) => ticketIcs(t);
