import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, CalendarClock, CalendarPlus, CheckCircle2, Clapperboard, Clock, ExternalLink, Gift, ListChecks, Mail, PenTool, Plus, Printer, Send, Sheet, UserRound, X } from 'lucide-react';
import {
  DESCRIPTION_MIN,
  RAR_URL,
  TICKET_PRIORITIES,
  TICKET_TYPES,
  blockLabel,
  brDateFromIso,
  effortHours,
  leadHours,
  validateTicket,
  type TicketPriority,
  type TicketType,
} from '../../../shared/tickets.js';
import { availability, currentUser, detectMode, icsFor, mailtoFor, submitTicket, watchTickets, type Availability, type Me, type Mode, type Step, type StoredTicket } from '../lib/tickets';
import { downloadText } from '../lib/download';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SectionHeader } from './SectionHeader';

const ICONS: Record<string, typeof Gift> = { redesign: PenTool, video: Clapperboard, impressos: Printer, brindes: Gift };
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

/** Prazos e produção de uma frente, em uma linha. */
function Terms({ type }: { type: TicketType }) {
  return (
    <span className="flex flex-wrap gap-x-space-2 gap-y-1 text-caption font-medium text-highlight">
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3.5" aria-hidden />
        Alta urgência {leadHours(type.id, 'alta')} h · Normal {leadHours(type.id, 'normal')} h úteis
      </span>
      <span className="inline-flex items-center gap-1">
        <CalendarClock className="size-3.5" aria-hidden />
        Produção {effortHours(type.id)} h
      </span>
    </span>
  );
}

function RecentList({ list }: { list: StoredTicket[] }) {
  if (!list.length) return <p className="text-body text-text-secondary">Nenhum pedido ainda.</p>;
  return (
    <ul className="flex flex-col gap-space-1">
      {list.slice(0, 20).map((t) => {
        const Icon = ICONS[t.type] ?? Gift;
        return (
          <li key={t.id} className="flex gap-space-2 rounded-md border border-secondary p-space-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
              <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-body font-semibold text-text-primary">{t.title}</span>
              <span className="text-caption text-text-secondary">
                {t.id} · entrega {brDateFromIso(t.dueDate)}
                {t.priority === 'alta' ? ' · alta urgência' : ''}
                {t.requesterName ? ` · ${t.requesterName}` : ''}
              </span>
              <StatusChips t={t} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

type View = 'frentes' | 'form' | 'feito' | 'pedidos';
const iconBtn = 'flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-secondary/50 hover:text-text-primary';

/** Solicitações para a área de design: na página, só o título e o botão; o pedido abre em pop-up. */
export function Solicitacoes() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [view, setView] = useState<View>('frentes');
  const [type, setType] = useState<TicketType | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avail, setAvail] = useState<Availability | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ ticket: StoredTicket; notes: string[] } | null>(null);
  const [failure, setFailure] = useState('');
  const [list, setList] = useState<StoredTicket[]>([]);

  useEffect(() => {
    detectMode().then(async (m) => {
      setMode(m);
      setMe(await currentUser(m));
    });
  }, []);
  useEffect(() => (mode ? watchTickets(mode, setList) : undefined), [mode]);

  // Primeira entrega possível (prazo mínimo + agenda do design) ao escolher frente e prioridade
  useEffect(() => {
    setAvail(null);
    if (!mode || !type || !form.priority) return;
    let alive = true;
    availability(mode, type.id, form.priority).then((a) => alive && setAvail(a));
    return () => {
      alive = false;
    };
  }, [mode, type, form.priority]);

  const open = (v: View) => {
    setView(v);
    setFailure('');
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  const pick = (t: TicketType) => {
    let manual = { requesterName: me?.name ?? '', requesterEmail: me?.email ?? '' };
    if (!me?.email) {
      try {
        const saved = JSON.parse(window.localStorage.getItem(MANUAL_KEY) ?? '{}');
        manual = { requesterName: manual.requesterName || saved.requesterName || '', requesterEmail: saved.requesterEmail ?? '' };
      } catch {
        /* sem armazenamento */
      }
    }
    setType(t);
    setForm({ ...emptyForm(), ...manual });
    setErrors({});
    setFailure('');
    setView('form');
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return;
    setFailure('');
    const requester = me?.email ? me : { name: form.requesterName, email: form.requesterEmail };
    const { ok, errors: errs, ticket } = validateTicket({ ...form, type: type.id, links: form.links.split(/\s+/), requesterName: requester.name, requesterEmail: requester.email });
    if (!ok || !ticket) {
      setErrors(errs);
      document.getElementById(`sol-${Object.keys(errs)[0]}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (!me?.email) {
      try {
        window.localStorage.setItem(MANUAL_KEY, JSON.stringify({ requesterName: ticket.requesterName, requesterEmail: ticket.requesterEmail }));
      } catch {
        /* sem armazenamento */
      }
    }
    setSending(true);
    try {
      const r = await submitTicket(mode ?? 'local', ticket);
      setDone(r);
      setList((l) => [r.ticket, ...l.filter((t) => t.id !== r.ticket.id)]);
      setErrors({});
      setView('feito');
    } catch (err: any) {
      if (err?.fields) setErrors(err.fields);
      setFailure(err?.message ?? 'Não foi possível enviar. Tente de novo.');
    } finally {
      setSending(false);
    }
  }

  const err = (k: string) => errors[k] || undefined;
  const minDate = avail?.earliest ?? avail?.earliestLead;
  const descLen = form.description.trim().length;
  const heading = { frentes: 'Nova solicitação', form: type?.label ?? 'Nova solicitação', feito: 'Pedido aberto', pedidos: 'Pedidos recentes' }[view];

  return (
    <section id="solicitacoes" className="gutter scroll-mt-[72px] py-space-8">
      <div className="flex flex-col gap-space-2 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader id="solicitacoes" title="Solicitações" />
        <Button type="button" variant="action" onClick={() => open('frentes')} className="self-start sm:mb-space-4">
          <Plus className="size-5" aria-hidden />
          Abrir nova solicitação
        </Button>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="sol-dialog-title"
        className="m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden bg-background p-0 text-text-primary backdrop:bg-[#20133D]/60 backdrop:backdrop-blur-sm sm:m-auto sm:h-fit sm:max-h-[90dvh] sm:w-[min(880px,calc(100%-32px))] sm:rounded-lg sm:shadow-md"
        onClick={(e) => e.target === dialog.current && close()}
      >
        <div className="flex h-full max-h-[inherit] flex-col">
          <header className="flex shrink-0 items-center gap-space-1 border-b border-secondary px-space-2 py-space-1 sm:px-space-3" style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}>
            {view === 'form' && (
              <button type="button" onClick={() => setView('frentes')} aria-label="Voltar para as frentes" title="Frentes" className={iconBtn}>
                <ArrowLeft className="size-5" aria-hidden />
              </button>
            )}
            <h2 id="sol-dialog-title" className="flex-1 truncate font-display text-h3">
              {heading}
            </h2>
            {view !== 'pedidos' && list.length > 0 && (
              <button type="button" onClick={() => setView('pedidos')} aria-label="Pedidos recentes" title="Pedidos recentes" className={iconBtn}>
                <ListChecks className="size-5" aria-hidden />
              </button>
            )}
            <button type="button" onClick={close} aria-label="Fechar" title="Fechar" className={iconBtn}>
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-space-2 py-space-3 sm:px-space-3" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
            {view === 'frentes' && (
              <div className="flex flex-col gap-space-2">
                <p className="text-body text-text-secondary">Prazos em horas úteis (seg. a sex., 9h–18h). A produção é distribuída por igual na agenda do design, sem cruzar reuniões.</p>
                <ul className="grid gap-space-2 sm:grid-cols-2">
                  {TICKET_TYPES.map((t) => {
                    const Icon = ICONS[t.id] ?? Gift;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => pick(t)}
                          className="flex h-full w-full flex-col gap-space-1 rounded-lg border-2 border-secondary bg-background p-space-2 text-left transition-[border-color,box-shadow] duration-200 hover:border-lilac hover:shadow-card-hover focus-visible:border-primary"
                        >
                          <span className="flex items-center gap-space-2">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
                              <Icon className="size-5" />
                            </span>
                            <span className="text-body-large font-semibold text-text-primary">{t.label}</span>
                          </span>
                          <span className="text-body text-text-secondary">{t.detail}</span>
                          <span className="text-caption text-text-secondary">Ex.: {t.pieceTypes.slice(0, 4).join(', ')}</span>
                          <Terms type={t} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {view === 'form' && type && (
              <form onSubmit={send} noValidate className="flex flex-col gap-space-3">
                <div className="flex flex-col gap-space-1 rounded-md bg-secondary/40 p-space-2">
                  <p className="flex items-center gap-space-1 text-caption text-text-secondary" id="sol-requesterEmail">
                    <UserRound className="size-4 shrink-0" aria-hidden />
                    {me?.email ? (
                      <span>
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
                  <Terms type={type} />
                </div>
                {!me?.email && (
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
                  <Area
                    label="Descrição *"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Objetivo, público, onde será usado, referências."
                    error={err('description')}
                    hint={`${descLen} de no mínimo ${DESCRIPTION_MIN} caracteres`}
                  />
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
                          <span className="text-caption">mín. {leadHours(type.id, p.id)} h úteis</span>
                        </label>
                      ))}
                    </div>
                    {err('priority') && <p className="text-caption text-error">{err('priority')}</p>}
                  </fieldset>
                  <div id="sol-dueDate">
                    <Input
                      type="date"
                      label="Entrega *"
                      min={minDate}
                      value={form.dueDate}
                      onChange={(e) => set('dueDate', e.target.value)}
                      disabled={!form.priority}
                      error={err('dueDate')}
                      hint={
                        !form.priority
                          ? 'Escolha a prioridade para ver a primeira data.'
                          : !avail
                            ? 'Consultando a agenda do design…'
                            : avail.earliest
                              ? `Primeira data: ${brDateFromIso(avail.earliest)} · agenda do design ${avail.calendar}`
                              : 'Agenda do design sem espaço nos próximos dias: fale com o time.'
                      }
                    />
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
                    hint={type.linkRequired ? 'O design consulta as especificações de cada item.' : 'Opcional.'}
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
                    <AlertCircle className="size-5 shrink-0" aria-hidden />
                    {failure}
                  </p>
                )}
                <Button type="submit" variant="action" size="lg" disabled={sending || !mode} className="w-full sm:w-auto sm:self-start">
                  <Send className="size-5" aria-hidden />
                  {sending ? 'Enviando…' : 'Enviar solicitação'}
                </Button>
              </form>
            )}

            {view === 'feito' && done && (
              <div role="status" className="flex flex-col gap-space-2">
                <p className="flex items-center gap-space-1 text-body-large font-semibold">
                  <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden />
                  {done.ticket.id} · {done.ticket.title}
                </p>
                <p className="text-body text-text-secondary">
                  {done.ticket.typeLabel} · {done.ticket.pieceType} ({done.ticket.format}) · entrega {brDateFromIso(done.ticket.dueDate)}, 18h
                </p>
                <StatusChips t={done.ticket} />
                {!!done.ticket.work?.length && (
                  <div className="flex flex-col gap-1 rounded-md bg-secondary/40 p-space-2">
                    <p className="flex items-center gap-1 text-caption font-semibold text-text-primary">
                      <CalendarClock className="size-4" aria-hidden />
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
                  {done.ticket.status.email !== 'ok' && (
                    <a href={mailtoFor(done.ticket)} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-space-1 rounded-md border border-secondary px-space-2 text-body font-semibold text-text-primary no-underline hover:border-primary">
                      <Mail className="size-5" aria-hidden />
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
                <a href={RAR_URL} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1 self-start text-caption font-semibold">
                  Planilha RAR
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </section>
  );
}
