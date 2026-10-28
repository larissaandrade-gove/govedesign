import { useState, type ReactNode } from 'react';
import { Check, Copy, DownloadSimple, WarningCircle } from '@phosphor-icons/react';
import { nearestBrand, paletteSvg, toCssVars, toJson, toTailwind, type Exportable, type Hex } from '../../lib/color';
import { downloadText } from '../../lib/download';

export const pill = (on: boolean) =>
  `min-h-11 rounded-full border px-space-2 text-caption font-semibold transition-colors ${
    on ? 'border-primary bg-primary text-on-primary' : 'border-secondary bg-background text-text-primary hover:border-primary'
  }`;

/** Grupo de pílulas de escolha única. */
export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-space-1" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={pill(value === id)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Amostra: clique copia o HEX; marca "fora da paleta" e mostra a cor oficial mais próxima. */
export function Swatch({ hex, label, big = false }: { hex: Hex; label?: ReactNode; big?: boolean }) {
  const [done, setDone] = useState(false);
  const near = nearestBrand(hex);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copy(hex.toUpperCase())) {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        }
      }}
      title={near.exact ? `${near.name} (cor oficial) — copiar` : `Fora da paleta: mais próxima é ${near.name} (ΔE ${near.deltaE.toLocaleString('pt-BR')}) — copiar`}
      className="flex min-w-0 flex-col overflow-hidden rounded-md border border-secondary bg-background text-left transition-colors hover:border-primary"
    >
      <span className={`block w-full border-b border-text-primary/10 ${big ? 'h-20' : 'h-12'}`} style={{ background: hex }} aria-hidden />
      <span className="flex flex-col gap-0.5 px-2 py-1.5">
        {label && <span className="truncate text-[11px] font-semibold text-text-secondary">{label}</span>}
        <span className="flex items-center gap-1 font-mono text-[12px] text-text-primary">
          {hex.toUpperCase()}
          {done ? <Check className="size-3.5 text-highlight" aria-label="Copiado" /> : <Copy className="size-3 text-text-muted" aria-hidden />}
        </span>
        <span className={`flex items-center gap-1 truncate text-[11px] ${near.exact ? 'text-highlight' : 'text-text-secondary'}`}>
          {near.exact ? <Check className="size-3 shrink-0" aria-hidden /> : <WarningCircle className="size-3 shrink-0" aria-hidden />}
          {near.exact ? near.name : `≈ ${near.name}`}
        </span>
      </span>
    </button>
  );
}

const FORMATS = [
  ['css', 'CSS', 'css', 'text/css'],
  ['json', 'JSON', 'json', 'application/json'],
  ['tailwind', 'Tailwind', 'js', 'text/javascript'],
  ['svg', 'SVG', 'svg', 'image/svg+xml'],
] as const;

/** Copiar ou baixar a paleta em CSS (variáveis), JSON, Tailwind e SVG. */
export function ExportMenu({ data, colors }: { data: Exportable; colors: Hex[] }) {
  const [copied, setCopied] = useState('');
  const text = (f: (typeof FORMATS)[number][0]) => (f === 'css' ? toCssVars(data) : f === 'json' ? toJson(data) : f === 'tailwind' ? toTailwind(data) : paletteSvg(colors));
  const name = data.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  const btn = 'inline-flex min-h-11 items-center gap-1 rounded-md border border-secondary px-space-2 text-caption font-semibold text-text-primary hover:border-primary';
  return (
    <div className="flex flex-wrap items-center gap-space-1" aria-label="Exportar">
      <span className="text-caption text-text-secondary">Exportar</span>
      {FORMATS.map(([f, label, ext, type]) => (
        <span key={f} className="inline-flex">
          <button
            type="button"
            className={`${btn} rounded-r-none`}
            onClick={async () => {
              if (await copy(text(f))) {
                setCopied(f);
                setTimeout(() => setCopied(''), 1200);
              }
            }}
          >
            {copied === f ? <Check className="size-4 text-highlight" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {label}
          </button>
          <button type="button" className={`${btn} -ml-px rounded-l-none px-2`} aria-label={`Baixar ${label}`} title={`Baixar ${label}`} onClick={() => downloadText(`${name}.${ext}`, text(f), `${type};charset=utf-8`)}>
            <DownloadSimple className="size-4" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-caption text-text-secondary">
      {label}
      {children}
    </label>
  );
}
