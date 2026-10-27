import { useState } from 'react';
import { Check, DownloadSimple, Sparkle } from '@phosphor-icons/react';
import { aiBlockOf, downloadText } from '../lib/download';

/**
 * Baixar o guia (.md) e copiar o bloco de instruções para IA. `topic` diz qual
 * guia é ("de tipografia", "completo"…), para os botões das seções não se repetirem.
 */
export function DocActions({ doc, filename, topic, primary = false }: { doc: string; filename: string; topic: string; primary?: boolean }) {
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
        <DownloadSimple className="size-4" aria-hidden /> Baixar guia {topic} (.md)
      </button>
      <button type="button" onClick={copyAi} className={`${base} border border-secondary text-text-primary hover:border-primary`}>
        {copied ? <Check className="size-4 text-highlight" aria-hidden /> : <Sparkle className="size-4" aria-hidden />}
        {copied ? 'Instruções copiadas' : `Copiar instruções ${topic === 'completo' ? 'do guia completo' : topic} para IA`}
      </button>
    </div>
  );
}
