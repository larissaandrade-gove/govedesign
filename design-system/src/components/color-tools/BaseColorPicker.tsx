import { useEffect, useState } from 'react';
import { BRAND_COLORS } from '../../data/colorCompass';
import { nearestBrand, normalizeHex, type Hex } from '../../lib/color';

/** Cor base: uma das 10 cores oficiais ou qualquer HEX (com aviso de fora da paleta). */
export function BaseColorPicker({ label = 'Cor base', value, onChange }: { label?: string; value: Hex; onChange: (hex: Hex) => void }) {
  const [text, setText] = useState(value.toUpperCase());
  useEffect(() => setText(value.toUpperCase()), [value]);
  const near = nearestBrand(value);
  return (
    <fieldset className="flex min-w-0 flex-col gap-space-1">
      <legend className="mb-space-1 text-caption text-text-secondary">{label}</legend>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label}: cores oficiais`}>
        {BRAND_COLORS.map((c) => {
          const on = c.hex.toLowerCase() === value;
          return (
            <button
              key={c.hex}
              type="button"
              aria-pressed={on}
              aria-label={c.name}
              title={c.name}
              onClick={() => onChange(c.hex.toLowerCase())}
              className={`flex size-11 items-center justify-center rounded-full border-2 transition-colors ${on ? 'border-primary' : 'border-transparent hover:border-secondary'}`}
            >
              <span className="size-8 rounded-full border border-text-primary/25" style={{ background: c.hex }} />
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-space-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toLowerCase())} aria-label={`${label}: seletor`} className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-secondary bg-background p-1" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = normalizeHex(e.target.value);
            if (n) onChange(n.hex);
          }}
          aria-label={`${label}: HEX`}
          spellCheck={false}
          className="h-11 w-28 rounded-md border border-secondary bg-background px-space-1 font-mono text-body uppercase text-text-primary focus:border-primary focus:outline-none"
        />
        <span className={`min-w-0 truncate text-caption ${near.exact ? 'text-highlight' : 'text-text-secondary'}`}>{near.exact ? `${near.name} · cor oficial` : `Fora da paleta · mais próxima: ${near.name}`}</span>
      </div>
    </fieldset>
  );
}
