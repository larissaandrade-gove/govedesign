import { useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Info, WarningCircle } from '@phosphor-icons/react';
import { parseNumberBR } from '@/data/indicators.ts';

type Variant = 'accent' | 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  // Amarelo: uma única ação principal por tela
  accent: 'bg-accent text-on-accent hover:shadow-glow-yellow',
  primary: 'bg-primary text-on-primary hover:shadow-glow-purple',
  secondary: 'border border-text-muted/50 bg-background text-text-primary hover:border-lilac',
  ghost: 'text-link hover:bg-secondary/60',
  danger: 'border border-error text-error hover:bg-error/10',
};

export function Button({ variant = 'secondary', className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-caption font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, id, counter }: { label: string; hint?: ReactNode; children: ReactNode; id: string; counter?: { n: number; max: number } }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {counter && (
          <span className={`text-[12px] ${counter.n > counter.max ? 'font-semibold text-error' : 'text-text-secondary'}`} aria-live="polite">
            {counter.n}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-1 text-[13px] text-text-secondary">{hint}</p>}
    </div>
  );
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  const Icon = tone === 'warn' ? WarningCircle : Info;
  return (
    <div role={tone === 'warn' ? 'alert' : 'note'} className={`flex gap-2 rounded-md border p-3 text-[14px] ${tone === 'warn' ? 'border-error/60 bg-error/5 text-text-primary' : 'border-secondary bg-surface text-text-secondary'}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${tone === 'warn' ? 'text-error' : 'text-link'}`} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Interruptor acessível (checkbox nativo). */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-caption font-semibold text-text-primary">
      <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden className="relative h-6 w-10 rounded-full bg-text-muted/50 transition peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-highlight">
        <span className={`absolute top-1 size-4 rounded-full shadow-sm transition-all ${checked ? 'left-5 bg-on-primary' : 'left-1 bg-background'}`} />
      </span>
      {label}
    </label>
  );
}

/** Campo numérico em pt-BR: aceita "1.234,5"; mostra prefixo/sufixo da unidade. */
export function NumberInput({
  id,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  label,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (n: number | null) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  label: string;
}) {
  const fmt = (n: number | null | undefined) => (n == null ? '' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
  const [raw, setRaw] = useState(fmt(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setRaw(fmt(value));
  }, [value, focus]);
  const invalid = raw.trim() !== '' && parseNumberBR(raw) == null;
  return (
    <div>
      <div className={`flex items-center rounded-md border bg-background focus-within:border-primary ${invalid ? 'border-error' : 'border-text-muted/50'}`}>
        {prefix && <span className="pl-3 text-caption text-text-secondary" aria-hidden>{prefix}</span>}
        <input
          id={id}
          aria-label={label}
          aria-invalid={invalid || undefined}
          inputMode="decimal"
          className="h-12 w-full min-w-0 bg-transparent px-3 text-body text-text-primary placeholder:text-text-muted focus:outline-none"
          value={raw}
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => {
            setRaw(e.target.value);
            const n = parseNumberBR(e.target.value);
            if (e.target.value.trim() === '') onChange(null);
            else if (n != null) onChange(n);
          }}
        />
        {suffix && <span className="pr-3 text-caption text-text-secondary" aria-hidden>{suffix}</span>}
      </div>
      {invalid && <p className="mt-1 text-[13px] text-error">Número inválido. Use, por exemplo, 1.234,5.</p>}
    </div>
  );
}
