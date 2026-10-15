import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Download, ExternalLink, Info, Loader2, X } from "lucide-react";
import { saveFile } from "@gove/runtime";

import { buildShortUrl, getShortDomainLabel } from "../lib/short-domain";
import { testLink, saveOutcomeMessage, type TestResult } from "../lib/link-actions";
import { qrPng, qrSvg } from "../lib/qr";

/** Aviso fixo: o link curto só redireciona no servidor publicado. */
export function PublicUrlNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-lg border border-notice-border bg-notice px-4 py-3 text-xs leading-relaxed text-foreground"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>
        <strong className="font-semibold">Versão artefato.</strong> O link curto (
        <span className="font-mono">{getShortDomainLabel()}/…</span>) só redireciona
        publicamente no servidor publicado do Gove Links.
        {!compact &&
          " Aqui, use “Testar link” para abrir o destino e registrar um clique de teste (origem “artefato”)."}
      </p>
    </div>
  );
}

const testMessages: Record<TestResult, string> = {
  opened: "Clique de teste registrado. O destino foi aberto em uma nova aba.",
  inactive:
    "Link inativo: no servidor o visitante veria “Este link não está disponível”. Nenhum clique foi registrado.",
  missing: "Link não encontrado.",
};

export function useTestLink() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; result: TestResult } | null>(null);

  async function run(id: string) {
    setPendingId(id);
    try {
      const result = await testLink(id);
      setFeedback({ id, result });
      await queryClient.invalidateQueries({ queryKey: ["click-stats"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch {
      setFeedback(null);
    } finally {
      setPendingId(null);
    }
  }

  return {
    run,
    pendingId,
    feedback,
    message: feedback ? testMessages[feedback.result] : null,
    clear: () => setFeedback(null),
  };
}

export function TestLinkButton({
  onClick,
  pending,
  variant = "solid",
  slug,
}: {
  onClick: () => void;
  pending: boolean;
  variant?: "solid" | "icon";
  slug: string;
}) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={`Testar /${slug}`}
        title="Testar link (abre o destino e registra um clique)"
        disabled={pending}
        onClick={onClick}
        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
      Testar link
    </button>
  );
}

export function Feedback({
  tone = "info",
  children,
  onClose,
}: {
  tone?: "info" | "error";
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-xs font-medium ${
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-secondary text-foreground"
      }`}
    >
      <span>{children}</span>
      {onClose && (
        <button type="button" aria-label="Fechar aviso" onClick={onClose} className="shrink-0 opacity-70 hover:opacity-100">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** QR Code do link curto, gerado localmente; exporta SVG/PNG via saveFile(). */
export function QrPanel({ slug }: { slug: string }) {
  const shortUrl = buildShortUrl(slug);
  const svg = useMemo(() => qrSvg(shortUrl, `QR Code de ${shortUrl}`), [shortUrl]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function download(kind: "svg" | "png") {
    setBusy(true);
    setError(null);
    try {
      const data =
        kind === "svg" ? new Blob([svg], { type: "image/svg+xml" }) : await qrPng(shortUrl);
      if (!data) throw new Error("png");
      setError(saveOutcomeMessage(await saveFile(`gove-links-${slug}-qr.${kind}`, data)));
    } catch {
      setError("Não foi possível gerar o arquivo do QR Code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        className="size-36 shrink-0 overflow-hidden rounded-lg ring-1 ring-border"
        // SVG gerado localmente a partir do link curto (texto escapado em qrSvg).
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          QR Code do link curto, gerado neste navegador. Ele aponta para{" "}
          <span className="break-all font-mono">{shortUrl}</span> e funciona quando o servidor
          publicado estiver no ar.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["svg", "png"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={busy}
              onClick={() => download(kind)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-secondary disabled:opacity-60"
            >
              <Download className="size-3.5" />
              Baixar {kind.toUpperCase()}
            </button>
          ))}
        </div>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-6 shadow-elegant ring-1 ring-border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Copia texto; no iframe do artefato a API de área de transferência pode estar bloqueada. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
