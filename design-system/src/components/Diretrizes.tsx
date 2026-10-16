import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy, Download, Sparkles } from 'lucide-react';
import guide from '../../../docs/diretrizes-gove.md?raw';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';

/** Negrito e código em linha. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith('**') ? (
      <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>
    ) : part.startsWith('`') ? (
      <code key={i} className="token rounded-sm bg-surface px-1">{part.slice(1, -1)}</code>
    ) : (
      part
    ),
  );
}

/** Markdown enxuto do documento de diretrizes (títulos, listas, tabelas e blocos de código). */
function render(md: string) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;
      out.push(<pre key={i} className="overflow-x-auto whitespace-pre-wrap rounded-md border border-secondary bg-surface p-space-2 text-[13px] leading-relaxed text-text-primary"><code>{body.join('\n')}</code></pre>);
      continue;
    }
    const h = /^(#{1,3}) (.*)/.exec(l);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? 'hidden' : level === 2 ? 'mt-space-4 font-display text-h3 font-bold text-text-primary' : 'mt-space-2 font-display text-body-large font-bold text-text-primary';
      out.push(level === 2 ? <h3 key={i} className={cls}>{h[2]}</h3> : <h4 key={i} className={cls}>{h[2]}</h4>);
      i++;
      continue;
    }
    if (l.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split('|').map((c) => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={i} className="overflow-x-auto rounded-md border border-secondary">
          <table className="w-full border-collapse text-caption">
            <thead><tr className="bg-surface text-left text-text-primary">{head.map((c, k) => <th key={k} scope="col" className="px-space-2 py-space-1 font-semibold">{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, k) => <tr key={k} className="border-t border-secondary">{r.map((c, j) => <td key={j} className="px-space-2 py-space-1 align-top">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^- /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
      out.push(
        <ul key={i} className="flex flex-col gap-1 pl-space-3">
          {items.map((t, k) => {
            const box = /^\[ \] (.*)/.exec(t);
            return box ? (
              <li key={k} className="-ml-space-3 flex list-none items-start gap-space-1"><span className="mt-[5px] size-4 shrink-0 rounded-sm border-2 border-text-muted" aria-hidden />{inline(box[1])}</li>
            ) : (
              <li key={k} className="list-disc">{inline(t)}</li>
            );
          })}
        </ul>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||- |```)/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={i}>{inline(para.join(' '))}</p>);
  }
  return out;
}

const aiBlock = () => /```text\n([\s\S]*?)```/.exec(guide)?.[1].trim() ?? guide;

export function Diretrizes() {
  const body = useMemo(() => render(guide), []);
  const [copied, setCopied] = useState<'ai' | 'all' | null>(null);

  async function copy(kind: 'ai' | 'all') {
    try {
      await navigator.clipboard.writeText(kind === 'ai' ? aiBlock() : guide);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* área de transferência indisponível */
    }
  }

  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([guide], { type: 'text/markdown;charset=utf-8' }));
    a.download = 'diretrizes-gove.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  const btn = 'inline-flex min-h-11 items-center gap-space-1 rounded-md px-space-2 font-semibold transition-colors';
  return (
    <section id="diretrizes" className="gutter scroll-mt-[72px] border-t border-secondary/60 py-space-8">
      <SectionHeader id="diretrizes" title="Diretrizes">
        Base para qualquer criação da Gove — por pessoas ou por IA: apresentações, mídia, impressos, e-mails e páginas.
      </SectionHeader>
      <Reveal className="mb-space-3 flex flex-wrap gap-space-1">
        <button type="button" onClick={() => copy('ai')} className={`${btn} bg-accent text-on-accent shadow-glow-yellow`}>
          {copied === 'ai' ? <Check className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {copied === 'ai' ? 'Instruções copiadas' : 'Copiar instruções para IA'}
        </button>
        <button type="button" onClick={() => copy('all')} className={`${btn} border border-secondary text-text-primary hover:border-primary`}>
          {copied === 'all' ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied === 'all' ? 'Copiado' : 'Copiar documento'}
        </button>
        <button type="button" onClick={download} aria-label="Baixar diretrizes-gove.md" title="Baixar .md" className={`${btn} border border-secondary text-text-primary hover:border-primary`}>
          <Download className="size-4" aria-hidden /> <span className="hidden sm:inline">Baixar .md</span>
        </button>
      </Reveal>
      <div className="flex max-w-[860px] flex-col gap-space-2 text-body text-text-secondary">{body}</div>
    </section>
  );
}
