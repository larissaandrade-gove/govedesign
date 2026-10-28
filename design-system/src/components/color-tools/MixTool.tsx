import { useMemo, useState } from 'react';
import { mix, steps, type Hex, type Space } from '../../lib/color';
import { BaseColorPicker } from './BaseColorPicker';
import { ExportMenu, Field, Swatch } from './shared';

const SPACES: { id: Space; label: string; note: string }[] = [
  { id: 'rgb', label: 'RGB', note: 'linear entre os canais; o meio tende a ficar acinzentado' },
  { id: 'hsl', label: 'HSL', note: 'gira o matiz pelo caminho mais curto; pode clarear demais' },
  { id: 'oklch', label: 'OKLCH', note: 'perceptual; luminosidade e saturação mais uniformes' },
];

/** Mistura de duas cores, comparando a interpolação em RGB, HSL e OKLCH. */
export function MixTool({ base }: { base: Hex }) {
  const [b, setB] = useState<Hex>('#ffc72c');
  const [t, setT] = useState(50);
  const [n, setN] = useState(7);
  const results = useMemo(() => SPACES.map((s) => ({ ...s, mixed: mix(base, b, t / 100, s.id), row: steps(base, b, n, s.id) })), [base, b, t, n]);
  return (
    <div className="flex flex-col gap-space-3">
      <BaseColorPicker label="Segunda cor" value={b} onChange={setB} />
      <div className="grid gap-space-2 sm:grid-cols-2">
        <Field label={`Proporção: ${100 - t}% base · ${t}% segunda`}>
          <input type="range" min={0} max={100} value={t} onChange={(e) => setT(Number(e.target.value))} className="h-11 accent-[var(--gove-primary,#3D0099)]" />
        </Field>
        <Field label={`Passos na faixa: ${n}`}>
          <input type="range" min={3} max={11} value={n} onChange={(e) => setN(Number(e.target.value))} className="h-11 accent-[var(--gove-primary,#3D0099)]" />
        </Field>
      </div>
      {results.map((r) => (
        <section key={r.id} className="flex flex-col gap-space-1" aria-label={`Mistura em ${r.label}`}>
          <div className="flex flex-wrap items-baseline gap-x-space-1">
            <h4 className="font-display text-body font-semibold text-text-primary">{r.label}</h4>
            <span className="text-caption text-text-secondary">{r.note}</span>
          </div>
          <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] items-stretch gap-space-1">
            <Swatch hex={r.mixed} label={`Mistura ${t}%`} big />
            <div className="flex overflow-hidden rounded-md border border-secondary" aria-label={`Faixa em ${r.label}`}>
              {r.row.map((c, i) => (
                <span key={`${c}-${i}`} className="min-h-12 flex-1" style={{ background: c }} title={c.toUpperCase()} />
              ))}
            </div>
          </div>
          <ExportMenu data={{ name: `mistura ${r.label}`, colors: r.row }} colors={r.row} />
        </section>
      ))}
    </div>
  );
}
