import { useState } from 'react';
import { ArrowLeft, CaretDown, DownloadSimple, FilePdf, FileZip, SealCheck, Tray, Broom, SpinnerGap, Trash, X } from '@phosphor-icons/react';
import { StatusIcon, type Level } from '@/components/studio/CheckList';
import { layoutShort } from '@/components/studio/LayoutGlyph';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api, type ExportFiles, type PreflightPeca, type QueueItem, type SaveOutcome, type SaveResult } from '@/lib/api';
import { LAYOUTS } from '@/lib/studio';
import { cn } from '@/lib/utils';

type Props = { queue: QueueItem[]; onRemove: (key: string) => void; onClear: () => void };

const layoutName = (id: string) => LAYOUTS.find((l: { id: string }) => l.id === id)?.name ?? id;
const RANK: Record<Level, number> = { ok: 0, warn: 1, error: 2 };

/** Erros de rede do navegador ("Failed to fetch", "Load failed") viram uma mensagem que diz o que fazer. */
function friendlyError(err: unknown) {
  const msg = (err as Error)?.message ?? '';
  if (/failed to fetch|load failed|networkerror/i.test(msg)) return 'Não foi possível gerar os arquivos: uma conexão foi bloqueada. Recarregue a página e tente de novo; se continuar, abra uma solicitação com o print desta mensagem.';
  return msg || 'Não foi possível gerar os arquivos.';
}

/** O que dizer para cada resultado do download (o código exato vai em "Detalhes"). */
const OUTCOME_TEXT: Record<Exclude<SaveOutcome, 'saved'>, string> = {
  declined: 'Download cancelado: a janela do claude.ai foi recusada ou expirou. Clique em “Baixar .zip” para tentar de novo.',
  rate_limited: 'Já há uma janela de download aberta no claude.ai. Confirme ou feche essa janela e clique em “Baixar .zip” de novo.',
  unavailable: 'Os downloads não estão disponíveis nesta visualização. Recarregue a página ou abra o Design System pelo claude.ai no navegador do computador e tente de novo.',
  too_large: 'O .zip ficou grande demais para baixar por aqui. Use “Baixar PDFs separados”.',
  error: 'O navegador não aceitou o arquivo. Use “Baixar PDFs separados”; se falhar, abra uma solicitação com os detalhes abaixo.',
};

type Ready = ExportFiles & { zipName: string; geradoEm: string };
type LastSave = SaveResult & { arquivo: string; mensagem: string; horario: string };

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const hora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Fila({ queue, onRemove, onClear }: Props) {
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<{ pecas: PreflightPeca[]; ok: boolean } | null>(null);
  const [ack, setAck] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Arquivos já gerados ficam guardados aqui: baixar de novo não gera tudo outra vez.
  const [ready, setReady] = useState<Ready | null>(null);
  const [saving, setSaving] = useState<null | 'zip' | 'pdfs'>(null);
  const [last, setLast] = useState<LastSave | null>(null);
  const total = queue.reduce((n, q) => n + q.layouts.length, 0);


  async function verify() {
    setChecking(true);
    setAck(false);
    try {
      setReport(await api.preflight(queue));
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setChecking(false);
    }
  }

  /** Um download, com o aviso da janela do claude.ai antes e o resultado real depois. */
  async function saveOne(arquivo: string, blob: Blob): Promise<SaveResult> {
    if (api.insideArtifact()) toast.info('Confirme o download na janela do claude.ai.', { id: 'confirmar-download' });
    let r: SaveResult;
    try {
      r = await api.download(arquivo, blob);
    } catch (err) {
      r = { outcome: 'error', code: (err as Error)?.message || 'erro', method: api.insideArtifact() ? 'capacidade' : 'navegador' };
    }
    toast.dismiss('confirmar-download');
    setLast({ ...r, arquivo, mensagem: r.outcome === 'saved' ? `${arquivo} entregue ao navegador.` : OUTCOME_TEXT[r.outcome], horario: hora() });
    return r;
  }

  async function saveZip(files: Ready) {
    setSaving('zip');
    try {
      const r = await saveOne(files.zipName, files.zip);
      if (r.outcome === 'saved') toast.success(`${files.files.length} PDF(s) exportado(s).`);
      else if (r.outcome === 'declined') toast.info(OUTCOME_TEXT.declined);
      else toast.error(OUTCOME_TEXT[r.outcome]);
    } finally {
      setSaving(null);
    }
  }

  /** PDFs um a um: espera e tenta de novo em `rate_limited`; para na primeira recusa. */
  async function savePdfs(files: Ready) {
    setSaving('pdfs');
    let ok = 0;
    let stop: SaveResult | null = null;
    try {
      for (const f of files.files) {
        let r = await saveOne(f.name, f.blob);
        for (let i = 1; r.outcome === 'rate_limited' && i <= 4; i++) {
          await wait(1500 * i);
          r = await saveOne(f.name, f.blob);
        }
        if (r.outcome !== 'saved') {
          stop = r;
          break;
        }
        ok++;
      }
      if (!stop) toast.success(`${ok} PDF(s) baixado(s) separadamente.`);
      else toast.error(`${ok} de ${files.files.length} PDF(s) baixado(s). ${OUTCOME_TEXT[stop.outcome as Exclude<SaveOutcome, 'saved'>]}`);
    } finally {
      setSaving(null);
    }
  }

  async function download() {
    setExporting(true);
    try {
      const out = await api.exportZip(queue);
      const files: Ready = { ...out, zipName: `kit-boas-vindas_${new Date().toISOString().slice(0, 10)}.zip`, geradoEm: hora() };
      setReady(files);
      setLast(null);
      setReport(null);
      setExporting(false);
      await saveZip(files);
    } catch (err) {
      toast.error(friendlyError(err));
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
              <Broom />
            </Button>
          )}
          <Button disabled={!queue.length || checking} onClick={verify} className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
            {checking ? <SpinnerGap className="size-5 animate-spin" aria-hidden /> : <SealCheck className="size-5" aria-hidden />}
            {checking ? 'Gerando e verificando…' : `Verificar e exportar ${total} peça(s)`}
          </Button>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Tray className="size-8" aria-hidden />
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
                    {q.options.model === 'portal' ? '· Portal Cidadão ' : ''}
                    {q.options.identity === 'bb' ? '· identidade Banco do Brasil ' : q.options.includeBB ? '· com Banco do Brasil ' : ''}· {q.options.services.length} ícone(s)
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" title="Remover da fila" aria-label={`Remover ${q.municipioNome} da fila`} onClick={() => onRemove(q.key)} className="hover:bg-destructive/10 hover:text-destructive">
                <Trash />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {queue.length > 0 && <p className="mt-3 font-mono text-xs text-muted-foreground">{'[portal-cidadao_]{layout}_{municipio}_{ddmmaaaa}.pdf'}</p>}

      {ready && (
        <section aria-labelledby="arquivos-prontos" className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <FileZip className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 id="arquivos-prontos" className="font-semibold text-foreground">
                Arquivos prontos
              </h2>
              <p className="break-all text-sm text-muted-foreground">
                {ready.zipName} · {kb(ready.zip.size)} · {ready.files.length} PDF(s) · gerado às {ready.geradoEm}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Descartar arquivos prontos" title="Descartar" disabled={!!saving} onClick={() => (setReady(null), setLast(null))}>
              <X />
            </Button>
          </div>
          <p className="mt-3 text-sm text-foreground">
            {api.insideArtifact()
              ? 'Cada download abre uma janela do claude.ai: clique em aceitar. Se a janela não aparecer ou for fechada, baixe de novo por aqui, sem gerar tudo outra vez.'
              : 'Se o arquivo não aparecer nos downloads, baixe de novo por aqui, sem gerar tudo outra vez.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={!!saving} onClick={() => saveZip(ready)} className="min-h-11 bg-accent font-semibold text-accent-foreground hover:bg-accent/90">
              {saving === 'zip' ? <SpinnerGap className="size-5 animate-spin" aria-hidden /> : <DownloadSimple className="size-5" aria-hidden />}
              {saving === 'zip' ? 'Aguardando confirmação…' : 'Baixar .zip'}
            </Button>
            <Button variant="outline" disabled={!!saving} onClick={() => savePdfs(ready)} className="min-h-11 font-semibold">
              {saving === 'pdfs' ? <SpinnerGap className="size-5 animate-spin" aria-hidden /> : <FilePdf className="size-5" aria-hidden />}
              {saving === 'pdfs' ? 'Baixando PDFs…' : 'Baixar PDFs separados'}
            </Button>
          </div>
          <div aria-live="polite" role="status">
            {last && (
              <p className={cn('mt-3 rounded-md px-3 py-2 text-sm', last.outcome === 'saved' ? 'bg-secondary text-secondary-foreground' : last.outcome === 'declined' || last.outcome === 'rate_limited' ? 'bg-warning/10 text-foreground' : 'bg-destructive/10 text-foreground')}>
                {last.mensagem}
              </p>
            )}
          </div>
          {last && (
            <Collapsible className="mt-2">
              <CollapsibleTrigger className="group inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <CaretDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                Detalhes
              </CollapsibleTrigger>
              <CollapsibleContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-secondary/50 p-3 font-mono text-xs text-foreground">
                  <dt className="text-muted-foreground">código</dt>
                  <dd className="break-all">{last.code}</dd>
                  <dt className="text-muted-foreground">resultado</dt>
                  <dd>{last.outcome}</dd>
                  <dt className="text-muted-foreground">forma</dt>
                  <dd>{last.method}</dd>
                  <dt className="text-muted-foreground">arquivo</dt>
                  <dd className="break-all">{last.arquivo}</dd>
                  <dt className="text-muted-foreground">horário</dt>
                  <dd>{last.horario}</dd>
                </dl>
              </CollapsibleContent>
            </Collapsible>
          )}
        </section>
      )}

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
              {exporting ? <SpinnerGap className="size-5 animate-spin" aria-hidden /> : <DownloadSimple className="size-5" aria-hidden />}
              {exporting ? 'Gerando .zip…' : 'Baixar .zip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
