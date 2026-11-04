import type { CaseData } from '@/data/case.ts';
import { formatPeriodo } from '@/data/indicators.ts';
import { Field, Note } from './ui.tsx';

export function StepPeriodo({ c, update }: { c: CaseData; update: (patch: Partial<CaseData>) => void }) {
  const { inicio, fim } = c.periodo;
  const invalid = inicio && fim && inicio > fim;
  const label = formatPeriodo(inicio, fim);
  return (
    <div className="space-y-space-3">
      <div className="grid gap-space-2 sm:grid-cols-2">
        <Field id="inicio" label="Início">
          <input id="inicio" type="month" className="field" value={inicio} onChange={(e) => update({ periodo: { ...c.periodo, inicio: e.target.value } })} />
        </Field>
        <Field id="fim" label="Fim">
          <input id="fim" type="month" className="field" value={fim} min={inicio || undefined} onChange={(e) => update({ periodo: { ...c.periodo, fim: e.target.value } })} />
        </Field>
      </div>
      {invalid ? <Note tone="warn">O fim do período vem antes do início.</Note> : label && <p className="text-[14px] text-text-secondary">Na peça: “Resultados de {label}”.</p>}
      <Field
        id="contexto"
        label="Contexto do município (opcional)"
        hint="Vai para o slide de contexto e para o Claude. Números digitados aqui contam como dados do case."
        counter={{ n: c.contexto.length, max: 600 }}
      >
        <textarea
          id="contexto"
          rows={4}
          className="field py-3"
          value={c.contexto}
          placeholder="ex.: porte do município, ponto de partida, prioridades da gestão"
          onChange={(e) => update({ contexto: e.target.value })}
        />
      </Field>
    </div>
  );
}
