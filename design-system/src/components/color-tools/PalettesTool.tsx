import { useMemo, useState } from 'react';
import { brandCombos, brandHarmony, brandTheme, colorName, contrastPairs, contrastRatio, isNeutralColor, type HarmonyKind, type Hex, type ThemeTokens } from '../../lib/color';
import { Choice, ExportMenu, Swatch } from './shared';

const HARMONIES = [
  ['complementar', 'Complementar'],
  ['analoga', 'Análoga'],
  ['triade', 'Tríade'],
  ['tetradica', 'Tetrádica'],
  ['monocromatica', 'Monocromática'],
] as const;

const fmt = (n: number) => n.toFixed(1).replace('.', ',');

function ThemePreview({ t, mode }: { t: ThemeTokens; mode: string }) {
  return (
    <div className="flex flex-col gap-space-1 rounded-md border p-space-2" style={{ background: t.surface, borderColor: t.border, color: t.text }}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
        {mode}
      </span>
      <span className="font-display text-body-large font-bold">Título da seção</span>
      <span className="text-caption" style={{ color: t.muted }}>
        Texto de apoio · {colorName(t.muted)} sobre {colorName(t.surface)}.
      </span>
      <span className="mt-1 inline-flex min-h-9 items-center self-start rounded-md px-space-2 text-caption font-semibold" style={{ background: t.primary, color: t.onPrimary }}>
        Botão principal
      </span>
    </div>
  );
}

/** Proporção do mix numa faixa; sem proporção, partes iguais. */
function ComboBar({ colors }: { colors: { hex: Hex; share?: number }[] }) {
  return (
    <div className="flex h-10 overflow-hidden rounded-md border border-secondary">
      {colors.map((c) => (
        <span key={c.hex} className="flex min-w-0 items-end px-1 pb-0.5" style={{ background: c.hex, flex: c.share ?? 1 }} title={`${colorName(c.hex)} ${c.hex.toUpperCase()}${c.share ? ` · ${c.share}%` : ''}`}>
          {c.share && (
            <span className="truncate text-[10px] font-semibold" style={{ color: contrastRatio(c.hex, '#20133d') >= contrastRatio(c.hex, '#f4f4f4') ? '#20133d' : '#f4f4f4' }}>
              {c.share}%
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Paletas feitas só das cores permitidas: harmonias, combinações do estudo, pares de contraste e tema. */
export function PalettesTool({ base, name }: { base: Hex; name: string }) {
  const [kind, setKind] = useState<HarmonyKind>('complementar');
  const colors = useMemo(() => brandHarmony(base, kind), [base, kind]);
  const combos = useMemo(() => brandCombos(base), [base]);
  const pairs = useMemo(() => contrastPairs(base), [base]);
  const theme = useMemo(() => brandTheme(base), [base]);
  const neutral = isNeutralColor(base);
  return (
    <div className="flex flex-col gap-space-3">
      <section className="flex flex-col gap-space-1" aria-label="Harmonia">
        <h4 className="font-display text-body font-semibold text-text-primary">Harmonia institucional</h4>
        <Choice label="Tipo de harmonia" value={kind} options={HARMONIES} onChange={setKind} />
        <div className="grid grid-cols-2 gap-space-1 sm:grid-cols-5">
          {colors.map((c, i) => (
            <Swatch key={c} hex={c} label={i === 0 ? 'Base' : `Cor ${i + 1}`} big />
          ))}
        </div>
        <p className="text-caption text-text-secondary">
          {kind === 'monocromatica'
            ? 'Cores da paleta no mesmo matiz da base (ou branco e preto puros), da mais clara à mais escura.'
            : neutral
              ? 'Base neutra não tem matiz: a harmonia parte do Roxo, cor da marca, e cada posição do círculo vira a cor da paleta mais próxima.'
              : 'Cada posição do círculo cromático vira a cor da paleta de matiz mais próximo, sem repetir.'}
        </p>
        <ExportMenu data={{ name: `${name} ${kind}`, colors }} colors={colors} />
      </section>

      <section className="flex flex-col gap-space-1" aria-label="Combinações da marca">
        <h4 className="font-display text-body font-semibold text-text-primary">Combinações da marca</h4>
        <p className="text-caption text-text-secondary">Mix das pautas (com as proporções) e atributos da nova bússola. Os que usam {name} vêm primeiro.</p>
        <ul className="grid gap-space-1 sm:grid-cols-2">
          {combos.map((c) => (
            <li key={`${c.note}-${c.name}`} className={`flex min-w-0 flex-col gap-1 rounded-md border p-space-1 ${c.hasBase ? 'border-primary' : 'border-secondary'}`}>
              <span className="flex min-w-0 items-baseline gap-1 text-caption">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{c.note}</span>
                <span className="truncate font-semibold text-text-primary" title={c.name}>
                  {c.name}
                </span>
              </span>
              <ComboBar colors={c.colors} />
              <span className="truncate text-[11px] text-text-secondary">{c.colors.map((x) => colorName(x.hex)).join(' · ')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-space-1" aria-label="Pares de contraste">
        <h4 className="font-display text-body font-semibold text-text-primary">Pares de contraste</h4>
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          {pairs.map((p) => (
            <li key={p.other} className="flex min-w-0 items-center gap-space-1 rounded-md border border-secondary p-1">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-text-primary/10 font-display text-body font-bold" style={{ background: p.other, color: base }} aria-hidden>
                Aa
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-caption font-semibold text-text-primary">{colorName(p.other)}</span>
                <span className={`text-[11px] ${p.level === 'falha' ? 'text-text-muted' : 'text-text-secondary'}`}>
                  {fmt(p.ratio)}:1 · {p.level}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-caption text-text-secondary">{name} como texto sobre cada cor da paleta (o contraste é o mesmo invertendo texto e fundo). WCAG 2.1: AA a partir de 4,5:1; AA grande (títulos) a partir de 3:1.</p>
      </section>

      <section className="flex flex-col gap-space-1" aria-label="Tema">
        <h4 className="font-display text-body font-semibold text-text-primary">Tema claro e escuro</h4>
        <div className="grid gap-space-1 sm:grid-cols-2">
          <ThemePreview t={theme.light} mode="Claro" />
          <ThemePreview t={theme.dark} mode="Escuro" />
        </div>
        <p className="text-caption text-text-secondary">
          Primária: {name} quando tem 4,5:1 sobre a superfície; senão, a cor da paleta mais parecida que tenha (claro: {colorName(theme.light.primary)}; escuro: {colorName(theme.dark.primary)}).
        </p>
        <ExportMenu data={{ name: `${name} tema`, theme }} colors={[...new Set([...Object.values(theme.light), ...Object.values(theme.dark)])]} />
      </section>
    </div>
  );
}
