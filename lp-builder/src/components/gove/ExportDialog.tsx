import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download } from "lucide-react";
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

export function ExportDialog({
  open,
  onOpenChange,
  code,
  nome,
  issues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  nome: string;
  issues: AuditIssue[];
}) {
  const [copied, setCopied] = useState(false);
  const [override, setOverride] = useState(false);
  const errors = issues.filter((i) => i.severity === "error");
  const blocked = errors.length > 0 && !override;

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
            Cole este bloco como elemento HTML na outra plataforma. O snippet do RD Station foi
            preservado sem alterações.
          </DialogDescription>
        </DialogHeader>

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
            <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-destructive">
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
              />
              Estou ciente e quero exportar mesmo assim
            </label>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-md bg-secondary p-3 text-sm font-semibold text-foreground">
            <CheckCircle2 className="size-4 text-[var(--gove-primary)]" aria-hidden />
            Check de acessibilidade aprovado: contraste 4.5:1+, alt em todas as imagens, textos com
            16px ou mais, formulário RD Station presente e nenhum lorem ipsum pendente.
          </p>
        )}

        <textarea
          readOnly
          value={code}
          rows={16}
          aria-label="Código HTML gerado"
          className="w-full rounded-md border border-input bg-secondary p-3 font-mono text-xs"
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={download} disabled={blocked}>
            <Download className="size-4" aria-hidden /> Baixar como .txt
          </Button>
          <Button onClick={copy} disabled={blocked}>
            <Copy className="size-4" aria-hidden /> {copied ? "Copiado!" : "Copiar código"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}