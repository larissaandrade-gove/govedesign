import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowClockwise, ArrowLeft, CalendarCheck, CalendarPlus, CheckCircle, Clock, CloudSlash, Envelope, FilmSlate, Gift, ListChecks, PaperPlaneTilt, PenNib, Plus, Printer, Table, UserCircle, WarningCircle, X } from '@phosphor-icons/react';
import {
  DEFAULT_SCHEDULE,
  DESCRIPTION_MIN,
  TICKET_PRIORITIES,
  TICKET_TYPES,
  blockLabel,
  brDateFromIso,
  dueTime,
  earliestDueDate,
  earliestFeasibleDate,
  leadHours,
  strictEmail,
  validateTicket,
  type Schedule,
  type TicketPriority,
  type TicketType,
} from '../../../shared/tickets.js';
import { availability, canRetry, icsFor, mailtoFor, submitTicket, type Availability, type Step, type StoredTicket } from '../lib/tickets';
import { useRequests } from '../lib/requests';
import { downloadText } from '../lib/download';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export const TICKET_ICONS: Record<string, typeof Gift> = { redesign: PenNib, video: FilmSlate, impressos: Printer, brindes: Gift };
const MANUAL_KEY = 'gove:solicitante';

type Form = {
  title: string;
  pieceType: string;
  format: string;
  description: string;
  links: string;
  details: Record<string, string>;
  dueDate: string;
  priority: TicketPriority | '';
  requesterName: string;
  requesterEmail: string;
};
const emptyForm = (): Form => ({ title: '', pieceType: '', format: '', description: '', links: '', details: {}, dueDate: '', priority: '', requesterName: '', requesterEmail: '' });

const field = 'w-full rounded-md border bg-background px-space-2 text-body text-text-primary placeholder:text-text-muted transition-[border-color,box-shadow] duration-200 hover:border-primary/60 focus:border-primary focus:shadow-glow-purple focus:outline-none';

function Area({ label, error, hint, className = '', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-space-1">
      <label htmlFor={id} className="text-caption text-text-secondary">
        {label}
      </label>
      <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-m` : undefined} className={`${field} py-space-2 ${error ? 'border-error' : 'border-secondary'} ${className}`} {...rest} />
      {(error || hint) && (
        <p id={`${id}-m`} className={`text-caption ${error ? 'text-error' : 'text-text-secondary'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Campo com sugestões em chips (o valor continua livre). */
function Suggest({ label, value, onChange, options, error, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; error?: string; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-space-1">
      <Input label={label} value={value} onChange={(e) => onChange(e.target.value)} maxLength={80} placeholder={placeholder} error={error} />
      <div className="flex flex-wrap gap-1" role="group" aria-label={`Sugestões de ${label.replace(' *', '').toLowerCase()}`}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={`min-h-9 rounded-full border px-space-2 text-caption font-medium transition-colors ${value === o ? 'border-primary bg-primary text-on-primary' : 'border-secondary text-text-secondary hover:border-primary hover:text-text-primary'}`}
          >
            {o}
          </button>
        ))}
      </div>
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

export function StatusChips({ t }: { t: StoredTicket }) {
  const s = t.status ?? { rar: 'pendente', email: 'pendente', calendar: 'pendente' };
  return (
    <span className="flex flex-wrap gap-1">
      <Chip icon={Table} label="RAR" step={s.rar} />
      <Chip icon={Envelope} label="E-mail" step={s.email} />
      <Chip icon={CalendarPlus} label="Agenda" step={s.calendar} />
      {t.saved === false && (
        <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-error/15 px-2 text-caption font-medium text-error" title="O pedido não foi gravado na lista compartilhada">
          <CloudSlash className="size-3.5" aria-hidden />
          não salvo
        </span>
      )}
    </span>
  );
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/** "qua, 22/10" */
export const shortDate = (iso: string) => `${WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Previsão de entrega: a partir de quando a demanda pode ficar pronta. */
export function Forecast({ date }: { date: string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1 text-caption font-semibold text-highlight">
      <Clock className="size-3.5" aria-hidden />
      {date === undefined ? 'Calculando previsão…' : date ? `Entrega a partir de ${shortDate(date)}` : 'Sem data livre nas próximas semanas'}
    </span>
  );
}

/** Previsão imediata pelo expediente (sem agenda), mostrada enquanto a consulta não volta. */
const quickForecast = (typeId: string, schedule: Schedule) => earliestFeasibleDate({ nowMs: Date.now(), typeId, priority: 'normal', free: null, schedule });

/** Previsão de entrega de cada frente (prioridade normal, para não induzir a urgência). */
export function useForecasts(active: boolean) {
  const { mode, expediente } = useRequests();
  const schedule = expediente?.schedule ?? (DEFAULT_SCHEDULE as Schedule);
  const key = JSON.stringify([schedule.days, schedule.periods]);
  const [forecast, setForecast] = useState<Record<string, string | null>>(() => Object.fromEntries(TICKET_TYPES.map((t) => [t.id, quickForecast(t.id, schedule)])));
  useEffect(() => {
    if (!active) return;
    let alive = true;
    setForecast((f) => ({ ...Object.fromEntries(TICKET_TYPES.map((t) => [t.id, quickForecast(t.id, schedule)])), ...f }));
    if (mode)
      for (const t of TICKET_TYPES)
        availability(mode, t.id, 'normal', schedule)
          .then((a) => alive && setForecast((f) => ({ ...f, [t.id]: a.earliest })))
          .catch(() => {});
    return () => {
      alive = false;
    };
  }, [active, mode, key]);
  return forecast;
}

export function RecentList({ list, onRetry }: { list: StoredTicket[]; onRetry?: (t: StoredTicket) => void }) {
  if (!list.length) return <p className="text-body text-text-secondary">Nenhum pedido ainda.</p>;
  return (
    <ul className="flex flex-col gap-space-1">
      {list.slice(0, 20).map((t) => {
        const Icon = TICKET_ICONS[t.type] ?? Gift;
        return (
          <li key={t.id} className="flex gap-space-2 rounded-md border border-secondary p-space-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
              <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-body font-semibold text-text-primary">{t.title}</span>
              <span className="text-caption text-text-secondary">
                {t.id} · entrega {brDateFromIso(t.dueDate)}
                {t.requesterName ? ` · ${t.requesterName}` : ''}
              </span>
              <StatusChips t={t} />
            </span>
            {onRetry && canRetry(t) && (
              <button type="button" onClick={() => onRetry(t)} className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start rounded-md px-space-1 text-caption font-semibold text-highlight hover:bg-secondary/50">
                <ArrowClockwise className="size-4" aria-hidden />
                Reenviar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const iconBtn = 'flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-secondary/50 hover:text-text-primary';
const supportsModal = () => typeof HTMLDialogElement !== 'undefined' && typeof (HTMLDialogElement.prototype as { showModal?: unknown }).showModal === 'function';

/**
 * Pop-up "Nova solicitação": frentes, formulário, confirmação e pedidos. Fica
 * sempre montado no provedor global, então o rascunho sobrevive a fechar e
 * reabrir, e abre por cima de qualquer página. Navegadores sem `showModal`
 * (Safari antigo) recebem um painel fixo com o mesmo conteúdo.
 */
export function RequestDialog() {
  const { mode, me, expediente, list, isOpen, view, setView, closeRequest, remember, retry } = useRequests();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const sendingRef = useRef(false);
  /** Hora da última troca de tela: um clique logo depois (ex.: duplo clique em Enviar) não fecha pelo fundo. */
  const changedAt = useRef(0);
  const [native] = useState(supportsModal);
  const [type, setType] = useState<TicketType | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avail, setAvail] = useState<Availability | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ ticket: StoredTicket; notes: string[] } | null>(null);
  const [failure, setFailure] = useState('');
  const schedule = expediente?.schedule ?? (DEFAULT_SCHEDULE as Schedule);
  const scheduleKey = JSON.stringify([schedule.days, schedule.periods]);
  const forecast = useForecasts(isOpen && view === 'frentes');

  useEffect(() => {
    changedAt.current = Date.now();
  }, [view, sending]);

  // Abre e fecha o <dialog> conforme o provedor
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (isOpen) {
      opener.current = document.activeElement;
      setFailure('');
      if (native) {
        if (!d.open) d.showModal();
      } else d.setAttribute('open', '');
    } else {
      if (native) {
        if (d.open) d.close();
      } else d.removeAttribute('open');
      (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [isOpen, native]);

  // Sem showModal: Esc fecha o painel
  useEffect(() => {
    if (native || !isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRequest();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [native, isOpen, closeRequest]);

  // Primeira entrega possível (prazo mínimo + agenda do design) para a frente e a prioridade escolhidas
  const priority = form.priority || 'normal';
  useEffect(() => {
    if (!mode || !type) return;
    let alive = true;
    availability(mode, type.id, priority, schedule)
      .then((a) => alive && setAvail(a))
      .catch(() => alive && setAvail(null));
    return () => {
      alive = false;
    };
  }, [mode, type, priority, scheduleKey]);

  const requesterFromProfile = !!me?.email;
  const profileEmailError = requesterFromProfile && !strictEmail(me!.email) ? `Sua conta (${me!.email}) não é @gove.digital. Entre com a conta da Gove para abrir solicitações.` : '';

  const pick = (t: TicketType) => {
    setFailure('');
    setErrors({});
    if (type?.id === t.id) return setView('form'); // voltou para as frentes e escolheu a mesma: o rascunho continua
    let manual = { requesterName: me?.name ?? '', requesterEmail: me?.email ?? '' };
    if (!me?.email) {
      try {
        const saved = JSON.parse(window.localStorage.getItem(MANUAL_KEY) ?? '{}');
        manual = { requesterName: manual.requesterName || saved.requesterName || '', requesterEmail: saved.requesterEmail ?? '' };
      } catch {
        /* sem armazenamento */
      }
    }
    // Troca de frente: mantém o que vale para qualquer frente (título, descrição, links, prioridade)
    setForm((f) => ({ ...emptyForm(), ...manual, title: f.title, description: f.description, links: f.links, priority: f.priority }));
    setAvail(null);
    setType(t);
    setView('form');
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!type || sendingRef.current) return; // trava contra duplo envio
    setFailure('');
    if (profileEmailError) return setErrors({ requesterEmail: profileEmailError });
    const requester = requesterFromProfile ? { name: me!.name, email: me!.email } : { name: form.requesterName, email: form.requesterEmail };
    const { ok, errors: errs, ticket } = validateTicket({ ...form, type: type.id, links: form.links.split(/\s+/), requesterName: requester.name, requesterEmail: requester.email }, { schedule });
    if (!ok || !ticket) {
      setErrors(errs);
      document.getElementById(`sol-${Object.keys(errs)[0]}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (!requesterFromProfile) {
      try {
        window.localStorage.setItem(MANUAL_KEY, JSON.stringify({ requesterName: ticket.requesterName, requesterEmail: ticket.requesterEmail }));
      } catch {
        /* sem armazenamento */
      }
    }
    sendingRef.current = true;
    setSending(true);
    try {
      const r = await submitTicket(mode ?? 'local', ticket);
      setDone(r);
      remember(r.ticket);
      setErrors({});
      // Formulário limpo para o próximo pedido (quem pede continua preenchido)
      setForm({ ...emptyForm(), requesterName: form.requesterName, requesterEmail: form.requesterEmail });
      setType(null);
      setAvail(null);
      setView('feito');
    } catch (err: any) {
      if (err?.fields) setErrors(err.fields);
      setFailure(err?.message ?? 'Não foi possível enviar. Tente de novo.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function resend() {
    if (!done || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      setDone(await retry(done.ticket));
    } catch (err: any) {
      setDone({ ...done, notes: [err?.message ?? 'Não foi possível reenviar.'] });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const err = (k: string) => errors[k] || undefined;
  // Data mínima sempre atual: a consulta, ou o prazo mínimo calculado agora
  const minDate = avail?.earliest ?? avail?.earliestLead ?? (type ? earliestDueDate(Date.now(), leadHours(type.id, priority), schedule) : undefined);
  const descLen = form.description.trim().length;
  const heading = { frentes: 'Nova solicitação', form: type?.label ?? 'Nova solicitação', feito: 'Pedido aberto', pedidos: 'Seus pedidos' }[view];
  const dueHint = !avail
    ? type
      ? `Prazo mínimo: ${leadHours(type.id, priority)} h úteis. Entrega até ${dueTime(schedule)}.`
      : undefined
    : `${avail.earliest ? `Entrega a partir de ${shortDate(avail.earliest)}, até ${dueTime(schedule)}.` : 'Sem data livre nas próximas semanas.'}${avail.note ? ` ${avail.note}` : ''}`;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="sol-dialog-title"
      aria-modal="true"
      onClose={() => isOpen && closeRequest()}
      onCancel={(e) => {
        e.preventDefault();
        closeRequest();
      }}
      className={`m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden bg-background p-0 text-text-primary backdrop:bg-[#20133D]/60 backdrop:backdrop-blur-sm sm:m-auto sm:h-fit sm:max-h-[90dvh] sm:w-[min(880px,calc(100%-32px))] sm:rounded-lg sm:shadow-md ${
        native ? '' : 'fixed inset-0 z-[70] hidden open:block sm:top-[5dvh] sm:border sm:border-secondary'
      }`}
      onClick={(e) => e.target === dialog.current && Date.now() - changedAt.current > 600 && closeRequest()}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <header className="flex shrink-0 items-center gap-space-1 border-b border-secondary px-space-2 py-space-1 sm:px-space-3" style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}>
          {(view === 'form' || view === 'pedidos') && (
            <button type="button" onClick={() => setView('frentes')} aria-label="Voltar para as frentes" title="Frentes" className={iconBtn}>
              <ArrowLeft className="size-5" aria-hidden />
            </button>
          )}
          <h2 id="sol-dialog-title" className="flex-1 truncate font-display text-h3">
            {heading}
          </h2>
          {view !== 'pedidos' && list.length > 0 && (
            <button type="button" onClick={() => setView('pedidos')} aria-label="Seus pedidos" title="Seus pedidos" className={iconBtn}>
              <ListChecks className="size-5" aria-hidden />
            </button>
          )}
          <button type="button" onClick={closeRequest} aria-label="Fechar" title="Fechar" className={iconBtn}>
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-space-2 py-space-3 sm:px-space-3" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
          {view === 'frentes' && (
            <div className="flex flex-col gap-space-2">
              <p className="text-body text-text-secondary">Escolha a frente. A previsão já considera o prazo mínimo e a agenda do time de design.</p>
              {expediente?.fallback && (
                <p className="flex items-center gap-space-1 text-caption text-text-secondary" role="status">
                  <WarningCircle className="size-4 shrink-0" aria-hidden />
                  Prazos estimados com o expediente padrão.
                </p>
              )}
              <ul className="grid gap-space-2 sm:grid-cols-2">
                {TICKET_TYPES.map((t) => {
                  const Icon = TICKET_ICONS[t.id] ?? Gift;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => pick(t)}
                        className={`flex h-full w-full flex-col gap-space-1 rounded-lg border-2 bg-background p-space-2 text-left transition-[border-color,box-shadow] duration-200 hover:border-lilac hover:shadow-card-hover focus-visible:border-primary ${type?.id === t.id ? 'border-primary' : 'border-secondary'}`}
                      >
                        <span className="flex items-center gap-space-2">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
                            <Icon className="size-5" />
                          </span>
                          <span className="text-body-large font-semibold text-text-primary">{t.label}</span>
                        </span>
                        <span className="text-body text-text-secondary">{t.detail}</span>
                        <Forecast date={forecast[t.id]} />
                        {type?.id === t.id && <span className="text-caption font-semibold text-text-secondary">Rascunho em andamento</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {view === 'form' && type && (
            <form onSubmit={send} noValidate className="flex flex-col gap-space-3" aria-busy={sending}>
              <div className="flex flex-col gap-space-1 rounded-md bg-secondary/40 p-space-2" id="sol-requesterEmail">
                <p className="flex items-center gap-space-1 text-caption text-text-secondary">
                  <UserCircle className="size-4 shrink-0" aria-hidden />
                  {me?.email ? (
                    <span className="min-w-0 break-words">
                      <strong className="font-semibold text-text-primary">{me.name}</strong> · {me.email}
                    </span>
                  ) : me?.name ? (
                    <span>
                      <strong className="font-semibold text-text-primary">{me.name}</strong> · informe seu e-mail @gove.digital (fica lembrado)
                    </span>
                  ) : (
                    <span>Sem login identificado: preencha seu nome e e-mail.</span>
                  )}
                </p>
                {requesterFromProfile && (profileEmailError || err('requesterEmail')) && (
                  <p role="alert" className="flex items-center gap-space-1 text-caption text-error">
                    <WarningCircle className="size-4 shrink-0" aria-hidden />
                    {profileEmailError || err('requesterEmail')}
                  </p>
                )}
              </div>
              {!requesterFromProfile && (
                <div className="grid gap-space-2 sm:grid-cols-2">
                  <Input label="Seu nome" autoComplete="name" value={form.requesterName} onChange={(e) => set('requesterName', e.target.value)} readOnly={!!me?.name} />
                  <Input type="email" label="Seu e-mail" autoComplete="email" placeholder="nome@gove.digital" value={form.requesterEmail} onChange={(e) => set('requesterEmail', e.target.value)} error={err('requesterEmail')} />
                </div>
              )}

              <div id="sol-title">
                <Input label="Título *" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} placeholder="Ex.: Kit de boas-vindas Itupeva" error={err('title')} />
              </div>
              <div id="sol-pieceType">
                <Suggest label="Tipo de peça *" value={form.pieceType} onChange={(v) => set('pieceType', v)} options={type.pieceTypes} error={err('pieceType')} placeholder="Ex.: Post, Folder, Reels" />
              </div>
              <div id="sol-format">
                <Suggest label="Formato *" value={form.format} onChange={(v) => set('format', v)} options={type.formats} error={err('format')} placeholder="Ex.: A4, 16:9, story, post 1:1" />
              </div>
              <div id="sol-description">
                <Area label="Descrição *" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} rows={4} placeholder="Objetivo, público e onde será usado." error={err('description')} hint={`${descLen}/${DESCRIPTION_MIN}`} />
              </div>

              <div className="grid gap-space-2 sm:grid-cols-2">
                <fieldset id="sol-priority" className="flex flex-col gap-space-1">
                  <legend className="mb-space-1 text-caption text-text-secondary">Prioridade *</legend>
                  <div className={`grid grid-cols-2 gap-1 rounded-md p-1 ${err('priority') ? 'bg-error/10 ring-1 ring-error' : 'bg-secondary/60'}`}>
                    {TICKET_PRIORITIES.map((p) => (
                      <label
                        key={p.id}
                        className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-sm px-1 text-center transition-colors has-[:focus-visible]:shadow-glow-purple ${form.priority === p.id ? 'bg-background text-text-primary shadow-sm' : 'text-text-secondary'}`}
                      >
                        <input type="radio" name="priority" value={p.id} checked={form.priority === p.id} onChange={() => set('priority', p.id)} className="sr-only" />
                        <span className="text-body font-semibold">{p.label}</span>
                      </label>
                    ))}
                  </div>
                  {err('priority') && <p className="text-caption text-error">{err('priority')}</p>}
                </fieldset>
                <div id="sol-dueDate">
                  <Input type="date" label="Entrega *" min={minDate} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} error={err('dueDate')} hint={dueHint} />
                </div>
              </div>

              <div id="sol-links">
                <Area
                  label={`${type.linkLabel}${type.linkRequired ? ' *' : ''}`}
                  value={form.links}
                  onChange={(e) => set('links', e.target.value)}
                  placeholder="https://… (um por linha)"
                  rows={2}
                  error={err('links')}
                  hint={type.linkRequired ? undefined : 'Opcional.'}
                />
              </div>
              {type.fields.length > 0 && (
                <div className="grid gap-space-2 sm:grid-cols-2">
                  {type.fields.map((f) => (
                    <Input key={f.id} label={f.label} placeholder={f.placeholder} maxLength={200} value={form.details[f.id] ?? ''} onChange={(e) => set('details', { ...form.details, [f.id]: e.target.value })} />
                  ))}
                </div>
              )}

              {failure && (
                <p role="alert" className="flex items-center gap-space-1 text-body text-error">
                  <WarningCircle className="size-5 shrink-0" aria-hidden />
                  {failure}
                </p>
              )}
              <Button type="submit" variant="action" size="lg" disabled={sending || !mode || !!profileEmailError} className="w-full sm:w-auto sm:self-start">
                <PaperPlaneTilt className="size-5" aria-hidden />
                {sending ? 'Enviando…' : 'Enviar solicitação'}
              </Button>
            </form>
          )}

          {view === 'feito' && done && (
            <div role="status" className="flex flex-col gap-space-2">
              <p className="flex items-center gap-space-1 text-body-large font-semibold">
                <CheckCircle className="size-6 shrink-0 text-success" aria-hidden />
                {done.ticket.id} · {done.ticket.title}
              </p>
              <p className="text-body text-text-secondary">
                {done.ticket.typeLabel} · {done.ticket.pieceType} ({done.ticket.format}) · entrega {brDateFromIso(done.ticket.dueDate)}, até {done.ticket.dueTime ?? '18:00'}
              </p>
              <StatusChips t={done.ticket} />
              {!!done.ticket.work?.length && (
                <div className="flex flex-col gap-1 rounded-md bg-secondary/40 p-space-2">
                  <p className="flex items-center gap-1 text-caption font-semibold text-text-primary">
                    <CalendarCheck className="size-4" aria-hidden />
                    Produção na agenda do design ({done.ticket.effortHours} h)
                  </p>
                  <ul className="text-caption text-text-secondary">
                    {done.ticket.work.map((b) => (
                      <li key={b.start}>{blockLabel(b)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {done.notes.map((n) => (
                <p key={n} className="text-caption text-text-secondary">
                  {n}
                </p>
              ))}
              <div className="flex flex-wrap gap-space-1">
                {canRetry(done.ticket) && mode !== 'local' && (
                  <Button type="button" variant="action" onClick={resend} disabled={sending}>
                    <ArrowClockwise className="size-5" aria-hidden />
                    {sending ? 'Reenviando…' : 'Reenviar o que falhou'}
                  </Button>
                )}
                {done.ticket.status.email !== 'ok' && (
                  <a href={mailtoFor(done.ticket)} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-space-1 rounded-md border border-secondary px-space-2 text-body font-semibold text-text-primary no-underline hover:border-primary">
                    <Envelope className="size-5" aria-hidden />
                    Enviar e-mail
                  </a>
                )}
                {done.ticket.status.calendar !== 'ok' && (
                  <button type="button" onClick={() => downloadText(`${done.ticket.id}.ics`, icsFor(done.ticket), 'text/calendar;charset=utf-8')} className="inline-flex min-h-11 items-center gap-space-1 rounded-md border border-secondary px-space-2 text-body font-semibold text-text-primary hover:border-primary">
                    <CalendarPlus className="size-5" aria-hidden />
                    Adicionar à agenda
                  </button>
                )}
                <Button type="button" variant="secondary" onClick={() => setView('frentes')}>
                  <Plus className="size-5" aria-hidden />
                  Nova solicitação
                </Button>
              </div>
            </div>
          )}

          {view === 'pedidos' && (
            <div className="flex flex-col gap-space-2">
              <RecentList list={list} />
              <a href="#solicitacoes" onClick={closeRequest} className="inline-flex min-h-11 items-center gap-1 self-start text-caption font-semibold">
                Ver na página Solicitações
              </a>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
