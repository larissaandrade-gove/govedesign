import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugify } from "@/lib/gove/export";
import type { AuditIssue } from "@/lib/gove/audit";

const downloadLabel = "Baixar como .txt";

export function ExportDialog({
  open,
  onOpenChange,
  code,
  nome,
  issues,
  bbIssues,
  onAutoFix,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  nome: string;
  issues: AuditIssue[];
  /** Identidade BB: pendências que bloqueiam a exportação (sem "exportar mesmo assim"). */
  bbIssues?: AuditIssue[] | undefined;
  onAutoFix?: (() => void) | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const [override, setOverride] = useState(false);
  const errors = issues.filter((i) => i.severity === "error");
  const bbBlocked = (bbIssues?.length ?? 0) > 0;
  const blocked = bbBlocked || (errors.length > 0 && !override);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o texto e copie.");
    }
  }

  function download() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `landing-page-${slugify(nome)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Exportar HTML + CSS</DialogTitle>
          <DialogDescription>
            Cole como elemento HTML na plataforma final. O snippet do RD Station é preservado.
          </DialogDescription>
        </DialogHeader>

        {bbIssues ? (
          bbBlocked ? (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                <AlertTriangle className="size-4" aria-hidden />
                Identidade BB: {bbIssues.length} pendência(s) bloqueiam a exportação
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-destructive">
                {bbIssues.map((issue) => (
                  <li key={issue.id}>
                    <strong>{issue.rule}:</strong> {issue.message}
                  </li>
                ))}
              </ul>
              {onAutoFix ? (
                <Button variant="cta" size="touch" className="mt-2" onClick={onAutoFix}>
                  <Wand2 aria-hidden /> Corrigir automaticamente
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-semibold">
              <CheckCircle2 className="size-4 shrink-0 text-[var(--gove-primary)]" aria-hidden />
              Identidade BB aprovada: textos 4,5:1+, só cores da paleta, fontes BB embutidas.
            </p>
          )
        ) : null}

        {errors.length > 0 ? (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <p className="flex items-center gap-2 text-sm font-bold text-destructive">
              <AlertTriangle className="size-4" aria-hidden />
              Check de acessibilidade: {errors.length} pendência(s) antes de exportar
            </p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-destructive">
              {errors.map((issue) => (
                <li key={issue.id}>
                  <strong>{issue.rule}:</strong> {issue.message}
                </li>
              ))}
            </ul>
            <label className="mt-2 flex min-h-11 items-center gap-2 text-xs font-semibold text-destructive">
              <input
                className="size-5"
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
              />
              Estou ciente e quero exportar mesmo assim
            </label>
          </div>
        ) : (
          <details className="rounded-xl bg-secondary text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 font-semibold text-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-[var(--gove-primary)]" aria-hidden />
              Check de acessibilidade aprovado
            </summary>
            <p className="px-3 pb-3 text-muted-foreground">
              Contraste 4.5:1+, alt em todas as imagens, textos com 16px ou mais, formulário RD
              Station presente e nenhum lorem ipsum pendente.
            </p>
          </details>
        )}

        <textarea
          readOnly
          value={code}
          rows={12}
          aria-label="Código HTML gerado"
          className="w-full rounded-md border border-input bg-secondary p-3 font-mono text-xs"
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="iconTouch"
            onClick={download}
            disabled={blocked}
            aria-label={downloadLabel}
            title={downloadLabel}
          >
            <Download aria-hidden />
          </Button>
          <Button variant="cta" size="touch" onClick={copy} disabled={blocked}>
            <Copy aria-hidden /> {copied ? "Copiado!" : "Copiar código"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}