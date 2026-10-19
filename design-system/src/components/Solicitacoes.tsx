import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CalendarPlus, CheckCircle2, Clapperboard, Clock, ExternalLink, Gift, Mail, PenTool, Printer, Send, Sheet } from 'lucide-react';
import {
  RAR_URL,
  TICKET_PRIORITIES,
  TICKET_TYPES,
  brDateFromIso,
  businessHoursBetween,
  dueInstant,
  earliestDueDate,
  typeById,
  validateTicket,
  type Ticket,
  type TicketPriority,
} from '../../../shared/tickets.js';
import { detectMode, icsFor, mailtoFor, submitTicket, watchTickets, type Mode, type Step, type StoredTicket } from '../lib/tickets';
import { downloadText } from '../lib/download';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SectionHeader } from './SectionHeader';

const ICONS: Record<string, typeof Gift> = { redesign: PenTool, video: Clapperboard, impressos: Printer, brindes: Gift };
const ME_KEY = 'gove:solicitante';

type Form = { type: string; title: string; description: string; links: string; details: Record<string, string>; dueDate: string; priority: TicketPriority; requesterName: string; requesterEmail: string };

const emptyForm = (): Form => {
  let me = { requesterName: '', requesterEmail: '' };
  try {
    me = { ...me, ...JSON.parse(window.localStorage.getItem(ME_KEY) ?? '{}') };
  } catch {
    /* sem armazenamento */
  }
  return { type: '', title: '', description: '', links: '', details: {}, dueDate: '', priority: 'normal', ...me };
};

const field = 'w-full rounded-md border bg-background px-space-2 text-body text-text-primary placeholder:text-text-muted transition-[border-color,box-shadow] duration-200 hover:border-primary/60 focus:border-primary focus:shadow-glow-purple focus:outline-none';

function Area({ label, error, hint, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-space-1">
      <label htmlFor={id} className="text-caption text-text-secondary">
        {label}
      </label>
      <textarea id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-m` : undefined} className={`${field} min-h-[120px] py-space-2 ${error ? 'border-error' : 'border-secondary'}`} {...rest} />
      {(error || hint) && (
        <p id={`${id}-m`} className={`text-caption ${error ? 'text-error' : 'text-text-secondary'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

const STEP_STYLE: Record<Step, string> = {
  ok: 'bg-success/15 text-success',
  pendente: 'bg-secondary text-text-secondary',
  falhou: 'bg-error/15 text-error',
  'não configurado': 'bg-secondary text-text-muted',
};

function Chip({ icon: Icon, label, step }: { icon: typeof Gift; label: string; step: Step }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-caption font-medium ${STEP_STYLE[step]}`} title={`${label}: ${step}`}>
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{label}:</span>
      {step === 'ok' ? label : `${label} · ${step}`}
    </span>
  );
}

function StatusChips({ t }: { t: StoredTicket }) {
  const s = t.status ?? { rar: 'pendente', email: 'pendente', calendar: 'pendente' };
  return (
    <span className="flex flex-wrap gap-1">
      <Chip icon={Sheet} label="RAR" step={s.rar} />
      <Chip icon={Mail} label="E-mail" step={s.email} />
      <Chip icon={CalendarPlus} label="Agenda" step={s.calendar} />
    </span>
  );
}

/** Solicitações para a área de design: frente, prazo mínimo em horas úteis, RAR, e-mail e agenda. */
export function Solicitacoes() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ ticket: StoredTicket; notes: string[] } | null>(null);
  const [failure, setFailure] = useState('');
  const [list, setList] = useState<StoredTicket[]>([]);

  useEffect(() => {
    detectMode().then(setMode);
  }, []);
  useEffect(() => (mode ? watchTickets(mode, setList) : undefined), [mode]);

  const type = typeById(form.type);
  const minHours = type?.minHours ?? 10;
  const earliest = useMemo(() => earliestDueDate(Date.now(), minHours), [minHours, done]);
  const hours = form.dueDate ? Math.floor(businessHoursBetween(Date.now(), dueInstant(form.dueDate))) : null;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setFailure('');
    const { ok, errors: errs, ticket } = validateTicket({ ...form, links: form.links.split(/\s+/) });
    if (!ok || !ticket) {
      setErrors(errs);
      document.getElementById(`sol-${Object.keys(errs)[0]}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    try {
      window.localStorage.setItem(ME_KEY, JSON.stringify({ requesterName: ticket.requesterName, requesterEmail: ticket.requesterEmail }));
    } catch {
      /* sem armazenamento */
    }
    setSending(true);
    try {
      const r = await submitTicket(mode ?? 'local', ticket);
      setDone(r);
      setList((l) => [r.ticket, ...l.filter((t) => t.id !== r.ticket.id)]);
      setForm((f) => ({ ...emptyForm(), requesterName: f.requesterName, requesterEmail: f.requesterEmail }));
      setErrors({});
    } catch (err: any) {
      if (err?.fields) setErrors(err.fields);
      setFailure(err?.message ?? 'Não foi possível enviar. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  const err = (k: string) => errors[k] || undefined;

  return (
    <section id="solicitacoes" className="gutter scroll-mt-[72px] py-space-8">
      <SectionHeader id="solicitacoes" title="Solicitações">
        Peça à área de design. Toda frente precisa de no mínimo {minHours} h úteis (seg. a sex., 9h–18h).
      </SectionHeader>

      <div className="grid gap-space-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={send} noValidate className="flex flex-col gap-space-4">
          <fieldset id="sol-type" className="flex flex-col gap-space-2">
            <legend className="mb-space-2 text-body-large font-semibold">Frente</legend>
            <div className="grid gap-space-2 sm:grid-cols-2">
              {TICKET_TYPES.map((t) => {
                const Icon = ICONS[t.id] ?? Gift;
                const on = form.type === t.id;
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer gap-space-2 rounded-lg border-2 bg-background p-space-2 transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:shadow-glow-purple ${on ? 'border-primary shadow-md' : 'border-secondary hover:border-lilac'}`}
                  >
                    <input type="radio" name="type" value={t.id} checked={on} onChange={() => set('type', t.id)} className="sr-only" />
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-md ${on ? 'bg-primary text-on-primary' : 'bg-secondary text-highlight'}`} aria-hidden>
                      <Icon className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-body font-semibold text-text-primary">{t.label}</span>
                      <span className="text-caption text-text-secondary">{t.summary}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-caption font-medium text-highlight">
                        <Clock className="size-3.5" aria-hidden />
                        mín. {t.minHours} h úteis
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {err('type') && <p className="text-caption text-error">{err('type')}</p>}
          </fieldset>

          {type && (
            <>
              <div id="sol-title">
                <Input label="Título" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} placeholder="Ex.: Kit de boas-vindas Itupeva" error={err('title')} />
              </div>
              <div id="sol-description">
                <Area label="O que precisa" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} placeholder="Objetivo, público, onde será usado, referências." error={err('description')} />
              </div>
              {type.fields.length > 0 && (
                <div className="grid gap-space-2 sm:grid-cols-2">
                  {type.fields.map((f) => (
                    <Input key={f.id} label={f.label} placeholder={f.placeholder} maxLength={200} value={form.details[f.id] ?? ''} onChange={(e) => set('details', { ...form.details, [f.id]: e.target.value })} />
                  ))}
                </div>
              )}
              <div id="sol-links">
                <Area
                  label={`${type.linkLabel}${type.linkRequired ? '' : ' (opcional)'}`}
                  value={form.links}
                  onChange={(e) => set('links', e.target.value)}
                  placeholder="https://… (um por linha)"
                  rows={3}
                  className={`${field} min-h-[88px] py-space-2 ${err('links') ? 'border-error' : 'border-secondary'}`}
                  error={err('links')}
                  hint={type.linkRequired ? 'Obrigatório: o design consulta as especificações de cada item.' : undefined}
                />
              </div>

              <div className="grid gap-space-2 sm:grid-cols-2">
                <div id="sol-dueDate">
                  <Input
                    type="date"
                    label="Entrega"
                    min={earliest}
                    value={form.dueDate}
                    onChange={(e) => set('dueDate', e.target.value)}
                    error={err('dueDate')}
                    hint={(hours !== null ? `${hours} h úteis até ${brDateFromIso(form.dueDate)}, 18h` : `Primeira data possível: ${brDateFromIso(earliest)}`)}
                  />
                </div>
                <fieldset className="flex flex-col gap-space-1">
                  <legend className="mb-space-1 text-caption text-text-secondary">Prioridade</legend>
                  <div className="grid h-12 grid-cols-2 gap-1 rounded-md bg-secondary/60 p-1">
                    {TICKET_PRIORITIES.map((p) => (
                      <label key={p.id} className={`flex cursor-pointer items-center justify-center rounded-sm text-body font-medium transition-colors has-[:focus-visible]:shadow-glow-purple ${form.priority === p.id ? 'bg-background text-text-primary shadow-sm' : 'text-text-secondary'}`}>
                        <input type="radio" name="priority" value={p.id} checked={form.priority === p.id} onChange={() => set('priority', p.id)} className="sr-only" />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="grid gap-space-2 sm:grid-cols-2">
                <div id="sol-requesterName">
                  <Input label="Seu nome" autoComplete="name" value={form.requesterName} onChange={(e) => set('requesterName', e.target.value)} error={err('requesterName')} />
                </div>
                <div id="sol-requesterEmail">
                  <Input type="email" label="Seu e-mail" autoComplete="email" placeholder="nome@gove.digital" value={form.requesterEmail} onChange={(e) => set('requesterEmail', e.target.value)} error={err('requesterEmail')} />
                </div>
              </div>

              {failure && (
                <p role="alert" className="flex items-center gap-space-1 text-body text-error">
                  <AlertCircle className="size-5 shrink-0" aria-hidden />
                  {failure}
                </p>
              )}
              <Button type="submit" variant="action" size="lg" disabled={sending || !mode} className="self-start">
                <Send className="size-5" aria-hidden />
                {sending ? 'Enviando…' : 'Enviar solicitação'}
              </Button>
            </>
          )}

          {done && (
            <div role="status" className="flex flex-col gap-space-2 rounded-lg border border-secondary bg-secondary/30 p-space-3">
              <p className="flex items-center gap-space-1 text-body-large font-semibold">
                <CheckCircle2 className="size-6 text-success" aria-hidden />
                Pedido {done.ticket.id} aberto
              </p>
              <p className="text-body text-text-secondary">
                {done.ticket.typeLabel} · entrega {brDateFromIso(done.ticket.dueDate)}, 18h
              </p>
              <StatusChips t={done.ticket} />
              {done.notes.map((n) => (
                <p key={n} className="text-caption text-text-secondary">
                  {n}
                </p>
              ))}
              {(done.ticket.status.email !== 'ok' || done.ticket.status.calendar !== 'ok') && (
                <div className="flex flex-wrap gap-space-1">
                  {done.ticket.status.email !== 'ok' && (
                    <a href={mailtoFor(done.ticket as Ticket)} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-space-1 rounded-md border border-secondary px-space-2 text-body font-semibold text-text-primary no-underline hover:border-primary">
                      <Mail className="size-5" aria-hidden />
                      Enviar e-mail
                    </a>
                  )}
                  {done.ticket.status.calendar !== 'ok' && (
                    <button type="button" onClick={() => downloadText(`${done.ticket.id}.ics`, icsFor(done.ticket as Ticket), 'text/calendar;charset=utf-8')} className="inline-flex min-h-11 items-center gap-space-1 rounded-md border border-secondary px-space-2 text-body font-semibold text-text-primary hover:border-primary">
                      <CalendarPlus className="size-5" aria-hidden />
                      Adicionar à agenda
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </form>

        <aside aria-labelledby="sol-recentes" className="flex flex-col gap-space-2">
          <div className="flex items-center justify-between gap-space-1">
            <h3 id="sol-recentes" className="text-body-large font-semibold">
              Pedidos recentes
            </h3>
            <a href={RAR_URL} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1 text-caption font-semibold" title="Abrir a planilha RAR">
              RAR
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </div>
          {list.length === 0 ? (
            <p className="text-body text-text-secondary">Nenhum pedido ainda.</p>
          ) : (
            <ul className="flex flex-col gap-space-1">
              {list.slice(0, 12).map((t) => {
                const Icon = ICONS[t.type] ?? Gift;
                return (
                  <li key={t.id} className="flex gap-space-2 rounded-md border border-secondary p-space-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
                      <Icon className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-body font-semibold text-text-primary">{t.title}</span>
                      <span className="text-caption text-text-secondary">
                        {t.id} · {brDateFromIso(t.dueDate)}
                        {t.priority === 'alta' ? ' · alta' : ''}
                      </span>
                      <StatusChips t={t} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
