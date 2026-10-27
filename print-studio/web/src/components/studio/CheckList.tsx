// Lista de verificações: ícone de status colorido + rótulo acessível + mensagem.
import { Warning, CaretDown, CheckCircle, XCircle } from '@phosphor-icons/react';
import type { Check } from '@/lib/api';
import { cn } from '@/lib/utils';

export type Level = Check['level'];

const STATUS: Record<Level, { Icon: typeof CheckCircle; label: string; color: string }> = {
  ok: { Icon: CheckCircle, label: 'OK', color: 'text-success' },
  warn: { Icon: Warning, label: 'Atenção', color: 'text-warning' },
  error: { Icon: XCircle, label: 'Erro', color: 'text-destructive' },
};

/** Ícone de status com rótulo para leitores de tela (e tooltip). */
export function StatusIcon({ level, className }: { level: Level; className?: string }) {
  const { Icon, label, color } = STATUS[level];
  return (
    <span className={cn('inline-flex shrink-0', color, className)} title={label}>
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{label}: </span>
    </span>
  );
}

function Item({ c }: { c: Check }) {
  return (
    <li className="flex gap-2 text-sm leading-snug">
      <StatusIcon level={c.level} className="mt-0.5" />
      <span>{c.message}</span>
    </li>
  );
}

/** Problemas sempre visíveis; itens conformes ficam recolhidos (divulgação progressiva). */
export function CheckList({ checks, empty }: { checks: Check[]; empty: string }) {
  const issues = checks.filter((c) => c.level !== 'ok');
  const ok = checks.filter((c) => c.level === 'ok');
  return (
    <div className="space-y-3">
      {issues.length === 0 ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle className="size-4" aria-hidden /> {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.map((c, i) => (
            <Item key={`${c.code}-${i}`} c={c} />
          ))}
        </ul>
      )}
      {ok.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <CheckCircle className="size-4 text-success" aria-hidden />
            <span className="flex-1">{ok.length} {ok.length === 1 ? 'item conforme' : 'itens conformes'}</span>
            <CaretDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="space-y-2 pt-1">
            {ok.map((c, i) => (
              <Item key={`${c.code}-${i}`} c={c} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
