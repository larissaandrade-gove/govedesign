import { useMemo, useState } from 'react';
import { CaretDown, Check, Copy, DownloadSimple } from '@phosphor-icons/react';
import { PROMPTS, type PromptDef } from '../data/prompts';
import { downloadText } from '../lib/download';
import { copy } from './color-tools/shared';
import { Reveal, RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';

const btn = 'inline-flex min-h-11 items-center gap-space-1 rounded-md px-space-2 font-semibold transition-colors';

function PromptCard({ prompt }: { prompt: PromptDef }) {
  const text = useMemo(() => prompt.build(), [prompt]);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const previewId = `prompt-${prompt.id}-texto`;
  return (
    <article className="flex h-full flex-col gap-space-2 rounded-lg border border-secondary bg-background p-space-3 shadow-sm" aria-labelledby={`prompt-${prompt.id}`}>
      <h3 id={`prompt-${prompt.id}`} className="font-display text-body-large font-bold text-text-primary">
        {prompt.title}
      </h3>
      <p className="text-body text-text-secondary">{prompt.description}</p>
      <ul className="flex flex-wrap gap-1" aria-label="Inclui">
        {prompt.covers.map((c) => (
          <li key={c} className="rounded-full bg-surface px-3 py-1 text-caption text-text-secondary">
            {c}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-space-1 pt-space-1">
        <button
          type="button"
          onClick={async () => {
            if (await copy(text)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }
          }}
          className={`${btn} bg-primary text-on-primary shadow-glow-purple hover:shadow-glow-purple-strong`}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? 'Prompt copiado' : 'Copiar prompt'}
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={previewId} className={`${btn} border border-secondary text-text-primary hover:border-primary`}>
          <CaretDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          {open ? 'Ocultar' : 'Ver prompt'}
        </button>
        <button
          type="button"
          onClick={() => downloadText(`prompt-${prompt.id}-gove.md`, text)}
          aria-label={`Baixar ${prompt.title.toLowerCase()} (.md)`}
          title="Baixar (.md)"
          className={`${btn} border border-secondary text-text-primary hover:border-primary`}
        >
          <DownloadSimple className="size-4" aria-hidden /> .md
        </button>
      </div>
      <span role="status" className="sr-only">
        {copied ? `${prompt.title} copiado` : ''}
      </span>
      {open && (
        <pre id={previewId} tabIndex={0} className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface p-space-2 font-mono text-[12px] leading-5 text-text-secondary">
          {text}
        </pre>
      )}
    </article>
  );
}

/** Prompts prontos para copiar, gerados dos parâmetros atuais do design system (data/prompts.ts). */
export function Prompts() {
  return (
    <section id="prompts" className="gutter scroll-mt-[72px] py-space-8">
      <SectionHeader id="prompts" title="Prompts">
        Copie e cole no início da conversa com a IA. Cores, fontes, espaçamentos e regras da logo vêm dos parâmetros atuais do design system.
      </SectionHeader>
      <StaggerGrid className="grid grid-cols-1 items-start gap-space-3 md:grid-cols-2">
        {PROMPTS.map((p) => (
          <RevealItem key={p.id}>
            <PromptCard prompt={p} />
          </RevealItem>
        ))}
      </StaggerGrid>
      <Reveal className="mt-space-3">
        <p className="text-caption text-text-secondary">
          Precisa do guia inteiro? Baixe em <a href="#diretrizes" className="font-semibold text-link">Diretrizes</a>.
        </p>
      </Reveal>
    </section>
  );
}
