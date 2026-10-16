import { useState } from 'react';
import { ArrowLeft, Download, FileCheck2, Inbox, ListX, Loader2, Trash2 } from 'lucide-react';
import { StatusIcon, type Level } from '@/components/studio/CheckList';
import { layoutShort } from '@/components/studio/LayoutGlyph';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api, type PreflightPeca, type QueueItem } from '@/lib/api';
import { LAYOUTS } from '@/lib/studio';
import { cn } from '@/lib/utils';

type Props = { queue: QueueItem[]; onRemove: (key: string) => void; onClear: () => void };

const layoutName = (id: string) => LAYOUTS.find((l: { id: string }) => l.id === id)?.name ?? id;
const RANK: Record<Level, number> = { ok: 0, warn: 1, error: 2 };
export function Fila({ queue, onRemove, onClear }: Props) {
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<{ pecas: PreflightPeca[]; ok: boolean } | null>(null);
  const [ack, setAck] = useState(false);
  const [exporting, setExporting] = useState(false);
  const total = queue.reduce((n, q) => n + q.layouts.length, 0);

  async function verify() {
    setChecking(true);
    setAck(false);
    try {
      setReport(await api.preflight(queue));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setChecking(false);
    }
  }

  async function download() {
    setExporting(true);
    try {
      const blob = await api.exportZip(queue);
      const outcome = await api.download(`kit-boas-vindas_${new Date().toISOString().slice(0, 10)}.zip`, blob);
      if (outcome === 'declined') return toast.info('Download cancelado.');
      toast.success(`${total} PDF(s) exportado(s).`);
      setReport(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  // Pior nível de cada categoria entre todas as peças ('warn' = atenção, não bloqueia).
  const worst = (codes: string[], missing: Level = 'error'): Level => {
    let lvl: Level = 'ok';
    for (const p of report?.pecas ?? []) {
      const found = p.checks.filter((c) => codes.includes(c.code));
      const l: Level = !found.length ? missing : found.some((c) => c.level === 'error') ? 'error' : found.some((c) => c.level === 'warn') ? 'warn' : 'ok';
      if (RANK[l] > RANK[lvl]) lvl = l;
    }
    return lvl;
  };
  const summary = report && {
    sangria: worst(['sangria']),
    fontes: worst(['fontes']),
    cmyk: worst(['cmyk']),
    qr: RANK[worst(['qr-min'], 'ok')] > 0 ? 'error' : worst(['qr-contraste']),
    logo: worst(['logo-contraste']),
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <h1 className="sr-only">Fila de exportação</h1>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'peça' : 'peças'} · 1 PDF por peça no .zip
        </p>
        <div className="ml-auto flex gap-2">
          {queue.length > 0 && (
            <Button variant="ghost" size="icon" aria-label="Limpar fila" title="Limpar fila" onClick={onClear} className="hover:bg-destructive/10 hover:text-destructive">
              <ListX />
            </Button>
          )}
          <Button disabled={!queue.length || checking} onClick={verify} className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
            {checking ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <FileCheck2 className="size-5" aria-hidden />}
            {checking ? 'Gerando e verificando…' : `Verificar e exportar ${total} peça(s)`}
          </Button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Inbox className="size-8" aria-hidden />
          <p>Fila vazia. No Editor, use “Adicionar à fila”.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {queue.map((q) => (
            <li key={q.key} className="flex items-center gap-3 rounded-lg border border-border bg-card py-2 pl-4 pr-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{q.municipioNome}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {q.layouts.map((id) => (
                    <span key={id} title={layoutName(id)} className="rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                      <span aria-hidden>{layoutShort(layoutName(id))}</span>
                      <span className="sr-only">{layoutName(id)}</span>
                    </span>
                  ))}
                  <span>
                    {q.options.includeBB ? '· com Banco do Brasil ' : ''}· {q.options.services.length} ícone(s)
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" title="Remover da fila" aria-label={`Remover ${q.municipioNome} da fila`} onClick={() => onRemove(q.key)} className="hover:bg-destructive/10 hover:text-destructive">
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {queue.length > 0 && <p className="mt-3 font-mono text-xs text-muted-foreground">{'{layout}_{municipio}_{ddmmaaaa}.pdf'}</p>}

      <Dialog open={!!report} onOpenChange={(o) => !o && setReport(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Verificação antes do download</DialogTitle>
            <DialogDescription className="sr-only">Os PDFs foram gerados e conferidos. Revise o resumo antes de baixar.</DialogDescription>
          </DialogHeader>
          {summary && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ['Sangria', summary.sangria],
                  ['Fontes embutidas', summary.fontes],
                  ['Cores em CMYK', summary.cmyk],
                  ['Contraste QR', summary.qr],
                  ['Logomarca ≥ 4,5:1', summary.logo],
                ] as [string, Level][]
              ).map(([label, level]) => (
                <div
                  key={label}
                  className={cn(
                    'flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm',
                    level === 'ok' ? 'border-border' : level === 'warn' ? 'border-warning/60 bg-warning/10' : 'border-destructive/60 bg-destructive/10',
                  )}
                >
                  <StatusIcon level={level} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
          <ul className="space-y-2">
            {report?.pecas.map((p) => {
              const issues = p.checks.filter((c) => c.level !== 'ok');
              return (
                <li key={p.arquivo} className="rounded-md border border-border p-3">
                  <p className="flex items-center gap-2 break-all font-mono text-sm text-foreground">
                    <StatusIcon level={p.ok ? 'ok' : 'error'} />
                    {p.arquivo}
                  </p>
                  {issues.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-6">
                      {issues.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <StatusIcon level={c.level} className="mt-0.5" />
                          <span>{c.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {report && !report.ok && (
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md bg-destructive/10 p-3 text-sm">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5 size-5" />
              <span>Há itens não conformes (vermelho). Confirmo que revisei e quero exportar mesmo assim.</span>
            </label>
          )}
          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <Button variant="ghost" size="icon" aria-label="Voltar" title="Voltar" onClick={() => setReport(null)}>
              <ArrowLeft />
            </Button>
            <Button disabled={exporting || (!report?.ok && !ack)} onClick={download} className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
              {exporting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Download className="size-5" aria-hidden />}
              {exporting ? 'Gerando .zip…' : 'Baixar .zip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
