import { useMemo, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { ATTENTION_CONTRAST, ATTENTION_DELTA_E, DEFICIENCIES, TOOL_COLORS, brandHarmony, colorName, simulate, visionAttention, type Attention, type Hex } from '../../lib/color';
import { Choice } from './shared';

const SOURCES = [
  ['marca', 'Cores da paleta'],
  ['harmonia', 'Harmonia da base'],
] as const;

const fmt = (n: number, d = 1) => n.toFixed(d).replace('.', ',');

/** Texto de um ponto de atenção ("fica parecida com Ciano (ΔE 10,3)"). */
const describe = (a: Attention) =>
  a.type === 'confusao'
    ? `fica parecida com ${colorName(a.with)} (ΔE ${fmt(a.deltaE)})`
    : `perde contraste com ${colorName(a.with)} (${fmt(a.before, 2)}:1 → ${fmt(a.after, 2)}:1)`;

/** "×" com traço duplo (preto por baixo, branco por cima): visível sobre qualquer cor, no tema claro e no escuro. */
export function AttentionMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="#000000" strokeWidth={6} strokeLinecap="round" />
      <path d="M6 6l12 12M18 6L6 18" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

/** Como a paleta é vista com cada tipo de daltonismo; "×" nas cores com ponto de atenção. */
export function VisionTool({ base }: { base: Hex }) {
  const [source, setSource] = useState<'marca' | 'harmonia'>('marca');
  const colors = useMemo(() => (source === 'marca' ? TOOL_COLORS.map((c) => c.hex) : brandHarmony(base, 'tetradica')), [source, base]);
  const rows = useMemo(
    () => [
      { id: 'normal', label: 'Visão típica', note: '', seen: colors, marks: colors.map(() => [] as Attention[]) },
      ...DEFICIENCIES.map((d) => ({ ...d, seen: colors.map((c) => simulate(c, d.id)), marks: visionAttention(colors, d.id) })),
    ],
    [colors],
  );
  return (
    <div className="flex flex-col gap-space-2">
      <Choice label="Paleta" value={source} options={SOURCES} onChange={setSource} />
      <p className="flex items-start gap-space-1 text-caption text-text-secondary">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-secondary bg-[#5ac2cd]">
          <AttentionMark className="size-4" />
        </span>
        <span>
          <span className="font-semibold text-text-primary">Ponto de atenção:</span> a cor fica parecida com outra da paleta (ΔE OKLab abaixo de {ATTENTION_DELTA_E}) ou um par de texto e fundo cai abaixo de {fmt(ATTENTION_CONTRAST)}:1. Não use só a cor para diferenciar essas cores.
        </span>
      </p>
      {rows.map((r) => {
        const flagged = r.marks.map((m, i) => ({ hex: colors[i], m })).filter((x) => x.m.length);
        return (
          <section key={r.id} className="flex flex-col gap-1" aria-label={r.label}>
            <div className="flex flex-wrap items-baseline gap-x-space-1">
              <h4 className="font-display text-body font-semibold text-text-primary">{r.label}</h4>
              {r.note && <span className="text-caption text-text-secondary">{r.note}</span>}
            </div>
            <div className="flex overflow-hidden rounded-md border border-secondary">
              {r.seen.map((c, i) => {
                const m = r.marks[i];
                const info = `${colorName(colors[i])} ${colors[i].toUpperCase()} → ${c.toUpperCase()}`;
                return m.length ? (
                  <span key={i} role="img" className="flex min-h-12 min-w-0 flex-1 items-center justify-center" style={{ background: c }} aria-label={`Ponto de atenção — ${colorName(colors[i])} em ${r.label}: ${m.map(describe).join('; ')}`} title={`${info}\nPonto de atenção: ${m.map(describe).join('; ')}`}>
                    <AttentionMark />
                  </span>
                ) : (
                  <span key={i} className="min-h-12 min-w-0 flex-1" style={{ background: c }} title={info} aria-hidden />
                );
              })}
            </div>
            {r.id !== 'normal' &&
              (flagged.length ? (
                <ul className="flex flex-col gap-0.5 text-caption text-text-secondary">
                  {flagged.map((f) => (
                    <li key={f.hex} className="flex items-start gap-1">
                      <WarningCircle className="mt-0.5 size-4 shrink-0 text-error" aria-hidden />
                      <span>
                        <span className="font-semibold text-text-primary">{colorName(f.hex)}</span> {f.m.map(describe).join('; ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-caption text-text-secondary">Sem pontos de atenção.</p>
              ))}
          </section>
        );
      })}
      <p className="text-[11px] text-text-muted">
        Simulação de dicromacia completa (modelo de Machado et al., 2009). Conta só o que a deficiência tira: pares que já são variações tonais na visão típica (Branco e Branco puro; Roxo Profundo com Noite e com Roxo) não recebem o ×.
      </p>
    </div>
  );
}
