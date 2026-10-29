import { useId, useRef, type KeyboardEvent } from 'react';
import { TOOL_COLORS, colorName, type Hex } from '../../lib/color';

/**
 * Escolha de cor travada na paleta: as 10 cores institucionais e o branco e o
 * preto puros (TOOL_COLORS). Sem HEX livre. Grupo de rádio acessível: setas
 * (e Home/End) mudam a cor; só a cor marcada entra na ordem do Tab.
 * `compact`: só as amostras, para listas (paradas de gradiente).
 */
export function BaseColorPicker({ label = 'Cor base', value, onChange, compact = false }: { label?: string; value: Hex; onChange: (hex: Hex) => void; compact?: boolean }) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(0, TOOL_COLORS.findIndex((c) => c.hex === value.toLowerCase()));
  const move = (e: KeyboardEvent, i: number) => {
    const last = TOOL_COLORS.length - 1;
    const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const k = (next + TOOL_COLORS.length) % TOOL_COLORS.length;
    onChange(TOOL_COLORS[k].hex);
    refs.current[k]?.focus();
  };
  return (
    <div className="flex min-w-0 flex-col gap-space-1">
      <span className="flex flex-wrap items-baseline gap-x-space-1 text-caption text-text-secondary" id={id}>
        {label}
        <span className="font-semibold text-text-primary">
          {colorName(value)} · <span className="font-mono">{value.toUpperCase()}</span>
        </span>
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className={compact ? 'flex flex-wrap gap-1' : 'grid grid-cols-4 gap-1 sm:grid-cols-6 xl:grid-cols-12'}
      >
        {TOOL_COLORS.map((c, i) => {
          const on = i === current && c.hex === value.toLowerCase();
          return (
            <button
              key={c.hex}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${c.name} ${c.hex.toUpperCase()}`}
              title={`${c.name} · ${c.hex.toUpperCase()}${c.pure ? ' · para mais contraste' : ''}`}
              tabIndex={i === current ? 0 : -1}
              onClick={() => onChange(c.hex)}
              onKeyDown={(e) => move(e, i)}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-md border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                compact ? 'size-11 justify-center' : 'min-h-11 px-0.5 py-1'
              } ${on ? 'border-primary bg-secondary/30' : 'border-transparent hover:border-secondary'}`}
            >
              <span className="size-8 shrink-0 rounded-full border border-text-primary/25" style={{ background: c.hex }} aria-hidden />
              {!compact && <span className={`w-full truncate text-center text-[11px] leading-tight ${on ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>{c.name}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
