import { useRef, useState, type KeyboardEvent } from 'react';
import { DownloadSimple, FileCsv, PencilSimple, X } from '@phosphor-icons/react';
import { saveFile } from '@gove/runtime';
import type { CaseData } from '@/data/case.ts';
import { INDICATORS, formatValue, isNum, mainValue, unitAffix, type IndicatorDef, type IndicatorId, type IndicatorValue } from '@/data/indicators.ts';
import { csvTemplate, parseCsv, type CsvResult } from '@/lib/csv.ts';
import { GrafanaNote } from './GrafanaNote.tsx';
import { Button, NumberInput, Note, Toggle } from './ui.tsx';

type Props = { c: CaseData; update: (patch: Partial<CaseData>) => void };
type Source = 'manual' | 'csv' | 'grafana';

export function StepIndicadores({ c, update }: Props) {
  const [source, setSource] = useState<Source>('manual');
  const setValue = (id: IndicatorId, patch: Partial<IndicatorValue>) => update({ values: { ...c.values, [id]: { ...c.values[id], ...patch } } });
  const tabs: { id: Source; label: string; icon: typeof PencilSimple }[] = [
    { id: 'manual', label: 'Manual', icon: PencilSimple },
    { id: 'csv', label: 'CSV', icon: FileCsv },
    { id: 'grafana', label: 'Grafana', icon: DownloadSimple },
  ];
  return (
    <div className="space-y-space-3">
      <div role="tablist" aria-label="Origem dos dados" className="grid grid-cols-3 gap-1 rounded-md bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={source === t.id}
            onClick={() => setSource(t.id)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md text-caption font-semibold transition ${source === t.id ? 'bg-background text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <t.icon className="size-5" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {source === 'csv' && <CsvImport c={c} update={update} onDone={() => setSource('manual')} />}
      {source === 'grafana' && <GrafanaNote />}

      <p className="text-[14px] text-text-secondary">Marque o que entra no case. Indicadores vazios ou desmarcados não aparecem na página nem nos slides.</p>
      <ul className="space-y-space-2">
        {INDICATORS.map((d) => (
          <IndicatorRow key={d.id} def={d} v={c.values[d.id]} notaMax={c.notaMax} onChange={(p) => setValue(d.id, p)} onNotaMax={(n) => update({ notaMax: n })} />
        ))}
      </ul>
    </div>
  );
}

function IndicatorRow({ def, v, notaMax, onChange, onNotaMax }: { def: IndicatorDef; v: IndicatorValue; notaMax: 5 | 10; onChange: (p: Partial<IndicatorValue>) => void; onNotaMax: (n: 5 | 10) => void }) {
  const aff = unitAffix(def.unit);
  const main = mainValue(def, v);
  const id = `ind-${def.id}`;
  return (
    <li className={`card p-space-2 ${v.enabled ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3">
        <h3 id={`${id}-t`} className="min-w-0 flex-1 pt-2.5 font-sans text-[15px] font-semibold leading-snug">
          {def.label}
        </h3>
        <Toggle checked={v.enabled} onChange={(enabled) => onChange({ enabled })} label="Incluir" />
      </div>
      {v.enabled && (
        <div className="mt-2 space-y-2">
          {def.unit === 'lista' ? (
            <ListInput id={id} items={v.items ?? []} placeholder={def.placeholder} onChange={(items) => onChange({ items })} />
          ) : (
            <>
              <div className={`grid gap-2 ${def.comparison ? 'sm:grid-cols-3' : def.unit === 'nota' ? 'sm:grid-cols-[1fr_140px]' : ''}`}>
                <div>
                  <label htmlFor={id} className="mb-1 block text-[13px] text-text-secondary">
                    {def.comparison ? 'Valor no período' : 'Valor'}
                  </label>
                  <NumberInput id={id} label={`${def.label}: valor`} value={v.value} onChange={(value) => onChange({ value })} placeholder={def.placeholder} prefix={aff.prefix} suffix={def.unit === 'nota' ? undefined : aff.suffix} />
                </div>
                {def.comparison && (
                  <>
                    <div>
                      <label htmlFor={`${id}-antes`} className="mb-1 block text-[13px] text-text-secondary">
                        Antes (gráfico)
                      </label>
                      <NumberInput id={`${id}-antes`} label={`${def.label}: antes`} value={v.before} onChange={(before) => onChange({ before })} prefix={aff.prefix} suffix={aff.suffix} />
                    </div>
                    <div>
                      <label htmlFor={`${id}-depois`} className="mb-1 block text-[13px] text-text-secondary">
                        Depois (gráfico)
                      </label>
                      <NumberInput id={`${id}-depois`} label={`${def.label}: depois`} value={v.after} onChange={(after) => onChange({ after })} prefix={aff.prefix} suffix={aff.suffix} />
                    </div>
                  </>
                )}
                {def.unit === 'nota' && (
                  <div>
                    <label htmlFor={`${id}-escala`} className="mb-1 block text-[13px] text-text-secondary">
                      Escala
                    </label>
                    <select id={`${id}-escala`} className="field" value={notaMax} onChange={(e) => onNotaMax(Number(e.target.value) as 5 | 10)}>
                      <option value={5}>de 0 a 5</option>
                      <option value={10}>de 0 a 10</option>
                    </select>
                  </div>
                )}
              </div>
              {isNum(main) && (
                <p className="text-[13px] text-text-secondary" aria-live="polite">
                  Na peça: <strong className="text-text-primary">{formatValue(def, main, def.unit === 'nota' ? notaMax : undefined)}</strong> {def.short}
                </p>
              )}
              {def.unit === 'nota' && isNum(v.value) && v.value > notaMax && <p className="text-[13px] text-error">A nota passa da escala escolhida.</p>}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function ListInput({ id, items, placeholder, onChange }: { id: string; items: string[]; placeholder: string; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft
      .split(/[|;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) onChange([...items, ...parts.filter((p) => !items.includes(p))]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13px] text-text-secondary">
        Digite e tecle Enter para adicionar
      </label>
      <div className="flex gap-2">
        <input id={id} className="field" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} />
        <Button onClick={add} disabled={!draft.trim()}>
          Adicionar
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Itens adicionados">
          {items.map((it) => (
            <li key={it} className="flex min-h-9 max-w-full items-center gap-1 rounded-full bg-secondary pl-3 text-[14px] font-semibold text-text-primary">
              <span className="truncate">{it}</span>
              <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} aria-label={`Remover ${it}`} className="flex size-9 items-center justify-center rounded-full hover:bg-background/60">
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CsvImport({ c, update, onDone }: Props & { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [res, setRes] = useState<CsvResult | null>(null);
  const apply = (r: CsvResult) => {
    setRes(r);
    if (!r.imported) return;
    const values = { ...c.values };
    for (const [id, v] of Object.entries(r.values)) values[id as IndicatorId] = { ...values[id as IndicatorId], ...v };
    update({ values, fonte: 'csv', ...(r.periodo && !c.periodo.inicio ? { periodo: r.periodo } : {}) });
  };
  return (
    <section aria-labelledby="csv-t" className="card space-y-space-2">
      <h3 id="csv-t" className="font-sans text-[16px] font-semibold">
        Importar CSV
      </h3>
      <p className="text-[14px]">
        Uma linha por indicador, com cabeçalho <code className="rounded bg-background px-1">indicador;valor;antes;depois;periodo</code>. Separador ponto e vírgula, vírgula ou tabulação.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-[14px]">
        <li>
          <strong className="text-text-primary">indicador</strong>: o código (ex.: <code>taxa_abertura</code>) ou o nome (ex.: Taxa de abertura).
        </li>
        <li>
          <strong className="text-text-primary">valor</strong>: número como 1.234,5 ou 1234.5; R$ e % são ignorados. Em funcionalidades, itens separados por “|”.
        </li>
        <li>
          <strong className="text-text-primary">antes / depois</strong> (opcionais): para o gráfico. <strong className="text-text-primary">periodo</strong> (opcional): AAAA-MM ou AAAA-MM a AAAA-MM.
        </li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => fileRef.current?.click()}>
          <FileCsv className="size-5" aria-hidden /> Escolher arquivo CSV
        </Button>
        <Button onClick={() => void saveFile('modelo-indicadores-case.csv', new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8' }))}>
          <DownloadSimple className="size-5" aria-hidden /> Baixar modelo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          aria-label="Arquivo CSV de indicadores"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) apply(parseCsv(await f.text()));
          }}
        />
      </div>
      <div aria-live="polite">
        {res && (
          <div className="space-y-2">
            <Note tone={res.errors.length ? 'warn' : 'info'}>
              {res.imported ? `${res.imported} indicador(es) importado(s).` : 'Nenhum indicador importado.'}
              {res.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {res.errors.slice(0, 8).map((er) => (
                    <li key={`${er.line}-${er.message}`}>
                      Linha {er.line}: {er.message}
                    </li>
                  ))}
                </ul>
              )}
            </Note>
            {res.imported > 0 && (
              <Button variant="ghost" onClick={onDone}>
                Revisar os valores importados
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
