import { useEffect, useState } from 'react';
import { Clock, PencilSimple, Plus, Trash, WarningCircle } from '@phosphor-icons/react';
import { dailyHours, dueTime, nameFromEmail, normalizeSchedule, scheduleLabel, type Schedule } from '../../../shared/tickets.js';
import { saveSchedule, type Mode, type ScheduleState } from '../lib/tickets';
import { Button } from './ui/Button';

const DAYS = [
  [1, 'Seg'],
  [2, 'Ter'],
  [3, 'Qua'],
  [4, 'Qui'],
  [5, 'Sex'],
  [6, 'Sáb'],
  [0, 'Dom'],
] as const;

const time = 'min-h-11 w-full rounded-md border border-secondary bg-background px-space-2 text-body text-text-primary focus:border-primary focus:shadow-glow-purple focus:outline-none';
const updated = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }) : null);

/**
 * Horário de trabalho da responsável pelas solicitações. Todos veem o
 * expediente que define os prazos; só ela o altera, e os pedidos seguintes
 * passam a usá-lo (cada pedido guarda o expediente em que foi feito).
 */
export function ExpedienteCard({ mode, state }: { mode: Mode | null; state: ScheduleState | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Schedule | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (!editing && state) setDraft({ days: [...state.schedule.days], periods: state.schedule.periods.map((p) => [...p] as [string, string]) });
  }, [state, editing]);

  if (!state || !draft) return null;
  const s = state.schedule;
  const preview = normalizeSchedule(draft);

  const toggleDay = (d: number) => setDraft({ ...draft, days: draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d] });
  const setPeriod = (i: number, j: 0 | 1, v: string) => setDraft({ ...draft, periods: draft.periods.map((p, k) => (k === i ? ((j === 0 ? [v, p[1]] : [p[0], v]) as [string, string]) : p)) });

  async function save() {
    if (!mode || !preview.ok) return setError(preview.error ?? '');
    setSaving(true);
    setError('');
    try {
      await saveSchedule(mode, draft as Schedule);
      setEditing(false);
      setSaved('Expediente salvo. As próximas solicitações já seguem este horário.');
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-space-2 flex flex-col gap-space-2 rounded-lg border border-secondary p-space-3">
      <div className="flex flex-wrap items-start justify-between gap-space-2">
        <div className="flex min-w-0 gap-space-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
            <Clock className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-display text-body-large font-semibold">Horário de trabalho</h3>
            <p className="text-body text-text-primary">
              {scheduleLabel(s)} · entregas até {dueTime(s)}
            </p>
            <p className="text-caption text-text-secondary">
              Os prazos das solicitações seguem o expediente de {nameFromEmail(state.owner)}, responsável pela execução.
              {updated(s.updatedAt) ? ` Atualizado em ${updated(s.updatedAt)}.` : ''}
            </p>
          </div>
        </div>
        {state.canEdit && !editing && (
          <Button type="button" variant="secondary" onClick={() => (setEditing(true), setSaved(''), setError(''))}>
            <PencilSimple className="size-5" aria-hidden />
            Editar
          </Button>
        )}
      </div>

      {saved && !editing && (
        <p role="status" className="text-caption text-success">
          {saved}
        </p>
      )}

      {editing && (
        <form
          className="flex flex-col gap-space-2 border-t border-secondary pt-space-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <fieldset className="flex flex-col gap-space-1">
            <legend className="mb-space-1 text-caption text-text-secondary">Dias de trabalho</legend>
            <div className="flex flex-wrap gap-1">
              {DAYS.map(([d, label]) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={draft.days.includes(d)}
                  onClick={() => toggleDay(d)}
                  className={`min-h-11 min-w-12 rounded-full border px-space-2 text-caption font-semibold transition-colors ${draft.days.includes(d) ? 'border-primary bg-primary text-on-primary' : 'border-secondary text-text-secondary hover:border-primary hover:text-text-primary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-space-1">
            <legend className="mb-space-1 text-caption text-text-secondary">Períodos (feriados nacionais ficam de fora)</legend>
            {draft.periods.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-space-1">
                <input type="time" step={1800} aria-label={`Início do período ${i + 1}`} value={p[0]} onChange={(e) => setPeriod(i, 0, e.target.value)} className={time} />
                <span className="text-caption text-text-secondary">às</span>
                <input type="time" step={1800} aria-label={`Fim do período ${i + 1}`} value={p[1]} onChange={(e) => setPeriod(i, 1, e.target.value)} className={time} />
                <button
                  type="button"
                  aria-label={`Remover período ${i + 1}`}
                  title="Remover período"
                  disabled={draft.periods.length < 2}
                  onClick={() => setDraft({ ...draft, periods: draft.periods.filter((_, k) => k !== i) })}
                  className="flex size-11 items-center justify-center rounded-md text-text-secondary hover:bg-secondary/50 hover:text-text-primary disabled:opacity-40"
                >
                  <Trash className="size-5" aria-hidden />
                </button>
              </div>
            ))}
            {draft.periods.length < 4 && (
              <button type="button" onClick={() => setDraft({ ...draft, periods: [...draft.periods, ['14:00', '15:00']] })} className="inline-flex min-h-11 items-center gap-1 self-start text-caption font-semibold text-highlight">
                <Plus className="size-4" aria-hidden />
                Adicionar período
              </button>
            )}
          </fieldset>

          <p className="text-caption text-text-secondary">
            {preview.ok && preview.schedule ? `${dailyHours(preview.schedule)} h por dia · entregas até ${dueTime(preview.schedule)}` : ''}
          </p>
          {(error || (!preview.ok && preview.error)) && (
            <p role="alert" className="flex items-center gap-space-1 text-caption text-error">
              <WarningCircle className="size-4 shrink-0" aria-hidden />
              {error || preview.error}
            </p>
          )}
          <div className="flex flex-wrap gap-space-1">
            <Button type="submit" variant="action" disabled={saving || !preview.ok}>
              {saving ? 'Salvando…' : 'Salvar expediente'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => (setEditing(false), setError(''))}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
