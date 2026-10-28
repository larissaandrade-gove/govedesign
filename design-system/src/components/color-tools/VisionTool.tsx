import { useMemo, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { BRAND_COLORS } from '../../data/colorCompass';
import { DEFICIENCIES, confusable, harmony, simulate, type Hex } from '../../lib/color';
import { Choice } from './shared';

const SOURCES = [
  ['marca', 'Cores oficiais'],
  ['harmonia', 'Harmonia da base'],
] as const;

/** Como a paleta é vista com cada tipo de daltonismo, com alerta de cores que se confundem. */
export function VisionTool({ base }: { base: Hex }) {
  const [source, setSource] = useState<'marca' | 'harmonia'>('marca');
  const colors = useMemo(() => (source === 'marca' ? BRAND_COLORS.map((c) => c.hex.toLowerCase()) : harmony(base, 'tetradica')), [source, base]);
  const rows = [{ id: 'normal', label: 'Visão típica', note: '', seen: colors, pairs: [] as [Hex, Hex][] }, ...DEFICIENCIES.map((d) => ({ ...d, seen: colors.map((c) => simulate(c, d.id)), pairs: confusable(colors, d.id) }))];
  return (
    <div className="flex flex-col gap-space-2">
      <Choice label="Paleta" value={source} options={SOURCES} onChange={setSource} />
      {rows.map((r) => (
        <section key={r.id} className="flex flex-col gap-1" aria-label={r.label}>
          <div className="flex flex-wrap items-baseline gap-x-space-1">
            <h4 className="font-display text-body font-semibold text-text-primary">{r.label}</h4>
            {r.note && <span className="text-caption text-text-secondary">{r.note}</span>}
          </div>
          <div className="flex overflow-hidden rounded-md border border-secondary">
            {r.seen.map((c, i) => (
              <span key={i} className="min-h-12 flex-1" style={{ background: c }} title={`${colors[i].toUpperCase()} → ${c.toUpperCase()}`} />
            ))}
          </div>
          {r.pairs.length > 0 && (
            <p className="flex items-start gap-1 text-caption text-text-secondary">
              <WarningCircle className="mt-0.5 size-4 shrink-0 text-error" aria-hidden />
              {r.pairs.length === 1 ? '1 par de cores fica quase igual' : `${r.pairs.length} pares de cores ficam quase iguais`}: não use só a cor para diferenciar (ex.: {r.pairs[0][0].toUpperCase()} e {r.pairs[0][1].toUpperCase()}).
            </p>
          )}
        </section>
      ))}
      <p className="text-[11px] text-text-muted">Simulação de dicromacia completa (modelo de Machado et al., 2009). Alerta quando duas cores ficam a menos de ΔE 10.</p>
    </div>
  );
}
