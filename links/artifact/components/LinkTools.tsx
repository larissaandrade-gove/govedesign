import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { DownloadSimple, ArrowSquareOut, SpinnerGap, X, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { saveFile } from "@gove/runtime";

import { buildShortUrl } from "../lib/short-domain";
import { testLink, saveOutcomeMessage, type TestResult } from "../lib/link-actions";
import { qrPng, qrSvg } from "../lib/qr";

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

/** Abre o destino e registra um clique de teste (substitui o redirecionamento do servidor). */
export function TestLinkButton({
  onClick,
  pending,
  slug,
}: {
  onClick: () => void;
  pending: boolean;
  slug: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Testar /${slug}`}
      title="Testar link: abre o destino e registra um clique"
      disabled={pending}
      onClick={onClick}
      className="icon-btn"
    >
      {pending ? (
        <SpinnerGap className="size-5 animate-spin" aria-hidden />
      ) : (
        <ArrowSquareOut className="size-5" aria-hidden />
      )}
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
      className={`flex items-center justify-between gap-2 rounded-xl py-1 pl-4 pr-1 text-sm font-medium ${
        tone === "error" ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"
      }`}
    >
      <span className="py-2">{children}</span>
      {onClose && (
        <button
          type="button"
          aria-label="Fechar aviso"
          title="Fechar"
          onClick={onClose}
          className="icon-btn text-current"
        >
          <X className="size-4" aria-hidden />
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
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="size-36 shrink-0 overflow-hidden rounded-xl ring-1 ring-border"
        // SVG gerado localmente a partir do link curto (texto escapado em qrSvg).
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {(["svg", "png"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={busy}
              aria-label={`Baixar ${kind.toUpperCase()}`}
              title={`Baixar QR Code em ${kind.toUpperCase()}`}
              onClick={() => download(kind)}
              className="btn btn-secondary"
            >
              <DownloadSimple className="size-4" aria-hidden />
              {kind.toUpperCase()}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
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
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5 shadow-elegant ring-1 ring-border sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="min-w-0 break-words text-lg font-semibold tracking-tight">{title}</h2>
          <button type="button" aria-label="Fechar" title="Fechar" onClick={onClose} className="icon-btn -mr-2">
            <X className="size-5" aria-hidden />
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

/** Status do link: ponto + texto; em `compact`, o texto some abaixo de 900px (fica sr-only). */
export function StatusBadge({ active, compact = false }: { active: boolean; compact?: boolean }) {
  const label = active ? "Ativo" : "Inativo";
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
        active ? "text-success" : "text-muted-foreground"
      }`}
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${active ? "bg-success" : "border border-muted-foreground"}`}
      />
      <span className={compact ? "sr-only min-[900px]:not-sr-only" : undefined}>{label}</span>
    </span>
  );
}

/** Rótulo de coluna como ícone, com o texto para leitores de tela e tooltip. */
export function IconHeader({ icon: Icon, label }: { icon: PhosphorIcon; label: string }) {
  return (
    <span title={label} className="inline-flex items-center gap-1.5">
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Interruptor “Link ativo” (estilo iOS), com alvo de toque de 44px. */
export function ActiveSwitch({
  checked,
  onChange,
  disabled = false,
  pending = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <span className="text-sm font-medium">Link ativo</span>
      <span className="flex items-center gap-2">
        {pending && <SpinnerGap className="size-4 animate-spin text-muted-foreground" aria-hidden />}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label="Link ativo"
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className="relative inline-flex h-11 w-14 shrink-0 items-center disabled:opacity-60"
        >
          <span
            aria-hidden
            className={`absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 rounded-full transition-colors ${
              checked ? "bg-success" : "bg-muted-foreground"
            }`}
          />
          <span
            aria-hidden
            className={`absolute top-1/2 size-7 -translate-y-1/2 rounded-full bg-white shadow transition-[left] ${
              checked ? "left-[1.625rem]" : "left-0.5"
            }`}
          />
        </button>
      </span>
    </div>
  );
}
