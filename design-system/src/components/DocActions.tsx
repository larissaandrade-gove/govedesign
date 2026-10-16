import { useState } from 'react';
import { Check, Download, Sparkles } from 'lucide-react';
import { aiBlockOf, downloadText } from '../lib/download';

/** Baixar o guia completo (.md) e copiar o bloco de instruções para IA. */
export function DocActions({ doc, filename, primary = false }: { doc: string; filename: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copyAi() {
    try {
      await navigator.clipboard.writeText(aiBlockOf(doc));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* área de transferência indisponível */
    }
  }
  const base = 'inline-flex min-h-11 items-center gap-space-1 rounded-md px-space-2 font-semibold transition-colors';
  return (
    <div className="flex flex-wrap gap-space-1">
      <button
        type="button"
        onClick={() => downloadText(filename, doc)}
        className={primary ? `${base} bg-accent text-on-accent shadow-glow-yellow` : `${base} border border-secondary text-text-primary hover:border-primary`}
      >
        <Download className="size-4" aria-hidden /> Baixar guia (.md)
      </button>
      <button type="button" onClick={copyAi} className={`${base} border border-secondary text-text-primary hover:border-primary`}>
        {copied ? <Check className="size-4 text-highlight" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        {copied ? 'Instruções copiadas' : 'Copiar instruções para IA'}
      </button>
    </div>
  );
}
