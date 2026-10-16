import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { BRAND_COLORS } from '../data/colorCompass';
import { RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';
import { ColorCompass } from './ColorCompass';

/** Cores institucionais: uso na interface + significado, com cópia do HEX pelo próprio código. */
export function ColorPalette() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1400);
    } catch {
      /* área de transferência indisponível: o código continua selecionável */
    }
  }

  return (
    <section id="cores" className="gutter scroll-mt-[72px] py-space-8">
      <SectionHeader id="cores" title="Cores">
        As 10 cores oficiais. Clique no código para copiar.
      </SectionHeader>

      <StaggerGrid className="grid grid-cols-1 gap-space-2 sm:grid-cols-2 xl:grid-cols-5">
        {BRAND_COLORS.map((c) => (
          <RevealItem key={c.hex}>
            <article className="flex h-full flex-col overflow-hidden rounded-lg border border-secondary bg-background">
              <span className="block h-16 w-full border-b border-secondary" style={{ background: c.hex }} aria-hidden />
              <div className="flex flex-1 flex-col gap-space-1 p-space-2">
                <div className="flex items-start justify-between gap-space-1">
                  <h3 className="font-display text-body font-bold text-text-primary">{c.name}</h3>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">{c.group}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copy(c.hex)}
                  aria-label={`Copiar ${c.hex}`}
                  title="Copiar HEX"
                  className="-mx-1 flex min-h-11 items-center justify-between gap-space-1 rounded-md px-1 text-left transition-colors hover:bg-surface"
                >
                  <span className="flex flex-col">
                    <span className="token text-body tabular-nums text-text-primary">{c.hex}</span>
                    <span className="text-[12px] tabular-nums text-text-secondary">RGB {c.rgb}</span>
                  </span>
                  {copied === c.hex ? <Check className="size-4 shrink-0 text-highlight" aria-hidden /> : <Copy className="size-4 shrink-0 text-text-muted" aria-hidden />}
                  <span className="sr-only" aria-live="polite">{copied === c.hex ? 'Copiado' : ''}</span>
                </button>
                <p className="text-caption text-text-primary">{c.use}</p>
                <p className="text-caption text-text-secondary">{c.meaning}</p>
              </div>
            </article>
          </RevealItem>
        ))}
      </StaggerGrid>

      <ColorCompass />
    </section>
  );
}
