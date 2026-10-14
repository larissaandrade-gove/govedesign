import { useState } from 'react';
import { AlertTriangle, CircleCheck, Download, FileCheck2, OctagonX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api, type PreflightPeca, type QueueItem } from '@/lib/api';
import { LAYOUTS } from '@/lib/studio';

type Props = { queue: QueueItem[]; onRemove: (key: string) => void; onClear: () => void };

const layoutName = (id: string) => LAYOUTS.find((l: { id: string }) => l.id === id)?.name ?? id;
const ICON = {
  ok: <CircleCheck className="size-4 shrink-0 text-emerald-300" aria-hidden />,
  warn: <AlertTriangle className="size-4 shrink-0 text-accent" aria-hidden />,
  error: <OctagonX className="size-4 shrink-0 text-destructive" aria-hidden />,
};

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kit-boas-vindas_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${total} PDF(s) exportado(s).`);
      setReport(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const summary = report && {
    sangria: report.pecas.every((p) => p.checks.find((c) => c.code === 'sangria')?.level === 'ok'),
    fontes: report.pecas.every((p) => p.checks.find((c) => c.code === 'fontes')?.level === 'ok'),
    cmyk: report.pecas.every((p) => p.checks.find((c) => c.code === 'cmyk')?.level === 'ok'),
    qr: report.pecas.every((p) => p.checks.find((c) => c.code === 'qr-contraste')?.level === 'ok' && !p.checks.some((c) => c.code === 'qr-min')),
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fila de exportação</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cada peça vira um PDF separado dentro do .zip: {'{layout}_{municipio}_{ddmmaaaa}.pdf'}.</p>
        </div>
        <div className="flex gap-2">
          {queue.length > 0 && <Button variant="ghost" onClick={onClear}>Limpar fila</Button>}
          <Button disabled={!queue.length || checking} onClick={verify} className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
            <FileCheck2 className="mr-2 size-4" /> {checking ? 'Gerando e verificando…' : `Verificar e exportar ${total} peça(s)`}
          </Button>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          A fila está vazia. Monte as peças no Editor e use "Adicionar à fila de exportação".
        </p>
      ) : (
        <ul className="space-y-2">
          {queue.map((q) => (
            <li key={q.key} className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{q.municipioNome}</p>
                <p className="text-sm text-muted-foreground">
                  {q.layouts.map(layoutName).join(' · ')}
                  {q.options.includeBB ? ' · com Banco do Brasil' : ''} · {q.options.services.length} ícone(s)
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label={`Remover ${q.municipioNome} da fila`} onClick={() => onRemove(q.key)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!report} onOpenChange={(o) => !o && setReport(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verificação antes do download</DialogTitle>
            <DialogDescription>Os PDFs foram gerados e conferidos. Revise o resumo antes de baixar.</DialogDescription>
          </DialogHeader>
          {summary && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Sangria', summary.sangria],
                ['Fontes embutidas', summary.fontes],
                ['Cores em CMYK', summary.cmyk],
                ['Contraste QR', summary.qr],
              ].map(([label, ok]) => (
                <div key={label as string} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  {ok ? ICON.ok : ICON.error}
                  <span>{label as string} {ok ? 'ok' : '— ALERTA'}</span>
                </div>
              ))}
            </div>
          )}
          <ul className="space-y-3">
            {report?.pecas.map((p) => {
              const issues = p.checks.filter((c) => c.level !== 'ok');
              return (
                <li key={p.arquivo} className="rounded-md border border-border p-3">
                  <p className="flex items-center gap-2 font-mono text-sm text-white">{p.ok ? ICON.ok : ICON.error}{p.arquivo}</p>
                  {issues.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {issues.map((c, i) => (
                        <li key={i} className="flex gap-2 text-sm">{ICON[c.level]}<span>{c.message}</span></li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {report && !report.ok && (
            <label className="flex items-start gap-3 rounded-md bg-destructive/15 p-3 text-sm">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
              <span>Há itens não conformes (vermelho). Confirmo que revisei e quero exportar mesmo assim.</span>
            </label>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReport(null)}>Voltar</Button>
            <Button disabled={exporting || (!report?.ok && !ack)} onClick={download} className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
              <Download className="mr-2 size-4" /> {exporting ? 'Gerando .zip…' : 'Baixar .zip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
