import { useMemo, useState } from 'react';
import { contrastRatio, harmony, shades, themeFrom, type HarmonyKind, type Hex, type ThemeTokens } from '../../lib/color';
import { Choice, ExportMenu, Swatch } from './shared';

const HARMONIES = [
  ['complementar', 'Complementar'],
  ['analoga', 'Análoga'],
  ['triade', 'Tríade'],
  ['tetradica', 'Tetrádica'],
  ['monocromatica', 'Monocromática'],
] as const;

const ratio = (a: Hex, b: Hex) => contrastRatio(a, b).toFixed(1).replace('.', ',');

function ThemePreview({ t, mode }: { t: ThemeTokens; mode: string }) {
  return (
    <div className="flex flex-col gap-space-1 rounded-md border p-space-2" style={{ background: t.surface, borderColor: t.border, color: t.text }}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
        {mode}
      </span>
      <span className="font-display text-body-large font-bold">Título da seção</span>
      <span className="text-caption" style={{ color: t.muted }}>
        Texto de apoio com contraste mínimo de 4,5:1.
      </span>
      <span className="mt-1 inline-flex min-h-9 items-center self-start rounded-md px-space-2 text-caption font-semibold" style={{ background: t.primary, color: t.onPrimary }}>
        Botão principal
      </span>
    </div>
  );
}

/** Harmonias, escala 50–950 e tema claro/escuro a partir da cor base. */
export function PalettesTool({ base, name }: { base: Hex; name: string }) {
  const [kind, setKind] = useState<HarmonyKind>('complementar');
  const colors = useMemo(() => harmony(base, kind), [base, kind]);
  const scale = useMemo(() => shades(base), [base]);
  const theme = useMemo(() => themeFrom(base), [base]);
  return (
    <div className="flex flex-col gap-space-3">
      <section className="flex flex-col gap-space-1" aria-label="Harmonia">
        <h4 className="font-display text-body font-semibold text-text-primary">Harmonia</h4>
        <Choice label="Tipo de harmonia" value={kind} options={HARMONIES} onChange={setKind} />
        <div className="grid grid-cols-2 gap-space-1 sm:grid-cols-5">
          {colors.map((c, i) => (
            <Swatch key={`${c}-${i}`} hex={c} label={i === 0 ? 'Base' : `Cor ${i + 1}`} big />
          ))}
        </div>
        <ExportMenu data={{ name: `${name} ${kind}`, colors }} colors={colors} />
      </section>

      <section className="flex flex-col gap-space-1" aria-label="Escala de tons">
        <h4 className="font-display text-body font-semibold text-text-primary">Escala 50–950</h4>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:grid-cols-11">
          {scale.map((s) => (
            <Swatch key={s.step} hex={s.hex} label={`${s.step} · ${ratio(s.hex, '#ffffff')}:1`} />
          ))}
        </div>
        <p className="text-caption text-text-secondary">Ao lado de cada passo: contraste com texto branco (WCAG 2.1; 4,5:1 para texto comum).</p>
        <ExportMenu data={{ name, shades: scale }} colors={scale.map((s) => s.hex)} />
      </section>

      <section className="flex flex-col gap-space-1" aria-label="Tema">
        <h4 className="font-display text-body font-semibold text-text-primary">Tema claro e escuro</h4>
        <div className="grid gap-space-1 sm:grid-cols-2">
          <ThemePreview t={theme.light} mode="Claro" />
          <ThemePreview t={theme.dark} mode="Escuro" />
        </div>
        <ExportMenu data={{ name: `${name} tema`, theme }} colors={[...Object.values(theme.light), ...Object.values(theme.dark)]} />
      </section>
    </div>
  );
}
