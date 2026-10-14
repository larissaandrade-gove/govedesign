import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { brandPalette, colors } from '../data/tokens.js';
import { contrast, hoverTransition } from '../lib/motion';
import { Reveal, RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';

const BG = colors.background.hex;

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    onCopy: async (hex: string) => {
      if (await copy(hex)) {
        setCopied(hex);
        setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1400);
      }
    },
  };
}

export function ColorPalette() {
  const { copied, onCopy } = useCopy();
  return (
    <section id="cores" className="gutter scroll-mt-[72px] py-space-12">
      <SectionHeader id="cores" token="tokens / color" title="Cores">
        Oito tokens de interface. O amarelo é raro e importa: uma ação por tela. Passe o mouse para ver o brilho de cada cor e
        clique para copiar o HEX.
      </SectionHeader>

      <StaggerGrid className="grid grid-cols-1 gap-space-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(colors).map(([token, c]) => {
          const ratio = contrast(c.hex, BG);
          return (
            <RevealItem key={token}>
              <motion.button
                type="button"
                onClick={() => onCopy(c.hex)}
                whileHover={{ y: -6, scale: 1.02, boxShadow: `0 0 28px ${c.hex}${c.hex === BG ? 'CC' : '8C'}` }}
                transition={hoverTransition}
                className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-secondary bg-surface text-left"
                aria-label={`Copiar ${c.hex} (${token})`}
              >
                <span className="relative block h-28 w-full" style={{ background: c.hex }}>
                  <span className="absolute right-space-1 top-space-1 flex items-center gap-1 rounded-sm bg-background/80 px-2 py-1 text-[12px] text-text-secondary">
                    {copied === c.hex ? <Check className="size-3.5 text-accent" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                    {copied === c.hex ? 'Copiado' : 'Copiar'}
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-space-1 p-space-2">
                  <span className="flex items-baseline justify-between gap-space-1">
                    <span className="font-display text-body font-bold text-text-primary">{token}</span>
                    <span className="token tabular-nums">{c.hex}</span>
                  </span>
                  <span className="text-caption text-text-secondary">{c.name}</span>
                  <span className="text-caption leading-snug text-text-secondary/80">{c.usage}</span>
                  <span className="mt-auto pt-space-1 text-[12px] tabular-nums text-text-secondary/80">
                    {c.hex === BG ? 'é o fundo' : `${ratio.toFixed(1)}:1 sobre o background`}
                  </span>
                </span>
              </motion.button>
            </RevealItem>
          );
        })}
      </StaggerGrid>

      <Reveal className="mt-space-8 flex flex-col gap-space-2">
        <h3 className="text-h3">Paleta institucional</h3>
        <p className="max-w-[640px] text-body text-text-secondary">
          Cores do manual de marca, para peças e logotipo. A interface usa os tokens acima; estas entram quando a peça precisa
          reproduzir a marca.
        </p>
      </Reveal>
      <StaggerGrid className="mt-space-3 grid grid-cols-4 gap-space-1 sm:grid-cols-7">
        {brandPalette.map((hex) => (
          <RevealItem key={hex}>
            <motion.button
              type="button"
              onClick={() => onCopy(hex)}
              whileHover={{ scale: 1.05, boxShadow: `0 0 18px ${hex}99` }}
              transition={hoverTransition}
              className="flex w-full flex-col overflow-hidden rounded-md border border-secondary bg-surface"
              aria-label={`Copiar ${hex}`}
            >
              <span className="block aspect-square w-full" style={{ background: hex }} />
              <span className="token px-1 py-space-1 text-center text-[12px] tabular-nums">{copied === hex ? 'Copiado' : hex}</span>
            </motion.button>
          </RevealItem>
        ))}
      </StaggerGrid>
    </section>
  );
}
