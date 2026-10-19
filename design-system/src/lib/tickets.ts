import { DESIGN_INBOX, ticketEmail, ticketEvent, ticketIcs, type Ticket } from '../../../shared/tickets.js';

/**
 * Onde a solicitação é registrada:
 * - 'server': servidor do projeto (/api/tickets) — RAR, e-mail e agenda pelo Apps Script.
 * - 'artifact': artefato no claude.ai — pedido no banco compartilhado; e-mail e
 *   agenda pelo Gmail e Google Agenda de quem pede; o Apps Script lança o RAR a partir do e-mail.
 * - 'local': prévia sem servidor nem artefato — só neste navegador, com e-mail e .ics manuais.
 */
export type Mode = 'server' | 'artifact' | 'local';
export type Step = 'ok' | 'pendente' | 'falhou' | 'não configurado';
export type TicketStatus = { rar: Step; email: Step; calendar: Step };
export type StoredTicket = Ticket & { status: TicketStatus; error?: string };
export type SubmitResult = { ticket: StoredTicket; notes: string[] };

type ClaudeLike = { use: (n: string) => Promise<any> };
const claude = (): ClaudeLike | null => (window as unknown as { claude?: ClaudeLike }).claude ?? null;
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
    use('db').then((db) => {
      if (!alive) return;
      if (!db) return on(readLocal());
      stop = db
        .collection('tickets')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .onSnapshot(
          (snap: any) => on(snap.docs.map((d: any) => ({ ...d.data(), id: d.id }))),
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
    const mail = ticketEmail(ticket, { calendar: status.calendar === 'ok' });
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

  const stored: StoredTicket = { ...ticket, status };
  const db = mode === 'artifact' ? await use('db') : null;
  if (db) {
    try {
      await db.collection('tickets').doc(ticket.id).set(JSON.parse(JSON.stringify(stored)));
    } catch {
      notes.push('O pedido não foi salvo na lista compartilhada.');
    }
  }
  writeLocal([stored, ...readLocal().filter((t) => t.id !== ticket.id)]);
  return { ticket: stored, notes };
}

/** Link de e-mail pronto (quando o Gmail não está conectado). */
export function mailtoFor(ticket: Ticket) {
  const m = ticketEmail(ticket, { calendar: false });
  return `mailto:${DESIGN_INBOX}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.text)}`;
}

export const icsFor = ticketIcs;
