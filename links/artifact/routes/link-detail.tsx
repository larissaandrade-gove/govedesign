import { Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Download, Loader2, Pencil, X } from "lucide-react";
import { useState } from "react";

import { buildShortUrl } from "@/lib/short-domain";
import { linkClickStatsQuery, linkClicksQuery, linkDetailQuery } from "@/lib/links-queries";
import { isCircularShortUrl, isValidHttpUrl } from "@/lib/short-links";
import { exportClicksCsv, saveOutcomeMessage, updateLink } from "../lib/link-actions";
import {
  Feedback,
  PublicUrlNotice,
  QrPanel,
  TestLinkButton,
  copyText,
  useTestLink,
} from "../components/LinkTools";

function formatDateTime(value: string | null) {
  if (!value) return "Nenhum acesso ainda";
  return new Date(value).toLocaleString("pt-BR");
}

export function LinkDetailPage() {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const queryClient = useQueryClient();
  const link = useQuery(linkDetailQuery(id));
  const stats = useQuery(linkClickStatsQuery(id));
  const clicks = useQuery(linkClicksQuery(id));
  const tester = useTestLink();
  const [copied, setCopied] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["links"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  const updateUrl = useMutation({
    mutationFn: (nextUrl: string) => updateLink(id, { original_url: nextUrl }),
    onSuccess: async () => {
      setEditingUrl(false);
      setUrlError(null);
      await refresh();
    },
    onError: () => setUrlError("Não foi possível atualizar a URL de destino. Tente novamente."),
  });

  const toggle = useMutation({
    mutationFn: (nextActive: boolean) => updateLink(id, { is_active: nextActive }),
    onSuccess: refresh,
  });

  function startEditUrl() {
    if (!link.data) return;
    setUrlDraft(link.data.original_url);
    setUrlError(null);
    setEditingUrl(true);
  }

  function handleSaveUrl() {
    const nextUrl = urlDraft.trim();
    if (!isValidHttpUrl(nextUrl)) {
      setUrlError("Informe uma URL válida iniciando com http:// ou https://");
      return;
    }
    if (isCircularShortUrl(nextUrl)) {
      setUrlError("Não é possível encurtar um link que já é um link curto do Gove Links.");
      return;
    }
    setUrlError(null);
    updateUrl.mutate(nextUrl);
  }

  async function handleCopy() {
    if (!link.data) return;
    if (await copyText(buildShortUrl(link.data.slug))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleExportClicks() {
    if (!row) return;
    setExportError(saveOutcomeMessage(await exportClicksCsv(row.slug, clicks.data ?? [])));
  }

  const row = link.data;

  return (
    <>
      <header className="mb-8">
        <Link
          to="/links"
          className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Meus links
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {row?.internal_name || (row ? `/${row.slug}` : "Detalhes do link")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {link.isPending
            ? "Carregando informações do link."
            : row
              ? "Métricas de acesso e destino configurado."
              : "Link não encontrado."}
        </p>
      </header>

      {row && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="rounded-xl bg-card p-6 ring-1 ring-border">
              <p className="label-caps mb-4 text-muted-foreground">Total de cliques</p>
              <span className="font-mono text-4xl font-light" data-testid="detail-clicks">
                {stats.isPending ? "—" : (stats.data?.count ?? 0)}
              </span>
            </div>
            <div className="rounded-xl bg-card p-6 ring-1 ring-border">
              <p className="label-caps mb-4 text-muted-foreground">Último clique</p>
              <span className="font-mono text-sm">
                {stats.isPending ? "—" : formatDateTime(stats.data?.lastClickAt ?? null)}
              </span>
            </div>
          </div>

          <div className="space-y-5 rounded-xl bg-card p-6 ring-1 ring-border">
            <div className="space-y-1.5">
              <span className="label-caps block text-muted-foreground">Link curto</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all font-mono text-sm font-medium">{buildShortUrl(row.slug)}</span>
                <div className="flex flex-wrap gap-2">
                  <TestLinkButton
                    slug={row.slug}
                    pending={tester.pendingId === row.id}
                    onClick={() => tester.run(row.id)}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "Link copiado!" : "Copiar link"}
                  </button>
                </div>
              </div>
              {tester.message && (
                <div className="pt-2">
                  <Feedback tone={tester.feedback?.result === "opened" ? "info" : "error"} onClose={tester.clear}>
                    {tester.message}
                  </Feedback>
                </div>
              )}
              <div className="pt-2">
                <PublicUrlNotice compact />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="label-caps block text-muted-foreground">Destino</span>
                {!editingUrl && (
                  <button
                    type="button"
                    onClick={startEditUrl}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </button>
                )}
              </div>
              {editingUrl ? (
                <div className="space-y-3">
                  <input
                    type="url"
                    aria-label="Nova URL de destino"
                    value={urlDraft}
                    onChange={(event) => setUrlDraft(event.target.value)}
                    placeholder="https://exemplo.com/pagina"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-primary"
                  />
                  {urlError && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {urlError}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={updateUrl.isPending}
                      onClick={handleSaveUrl}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {updateUrl.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      Salvar destino
                    </button>
                    <button
                      type="button"
                      disabled={updateUrl.isPending}
                      onClick={() => {
                        setEditingUrl(false);
                        setUrlError(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-secondary disabled:opacity-60"
                    >
                      <X className="size-3.5" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="break-all text-sm text-muted-foreground">{row.final_url}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <div>
                <span className="label-caps block text-muted-foreground">Status</span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-widest ${
                    row.is_active ? "text-accent-ink" : "text-muted-foreground"
                  }`}
                >
                  {row.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <button
                type="button"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate(!row.is_active)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {toggle.isPending && <Loader2 className="size-3.5 animate-spin" />}
                {row.is_active ? "Desativar link" : "Ativar link"}
              </button>
            </div>
            {toggle.isError && (
              <p role="alert" className="text-xs font-medium text-destructive">
                Não foi possível atualizar o status do link.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-card p-6 ring-1 ring-border">
            <p className="label-caps mb-4 text-muted-foreground">QR Code</p>
            <QrPanel slug={row.slug} />
          </div>

          <div className="rounded-xl bg-card ring-1 ring-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider">Cliques recentes</h2>
              <button
                type="button"
                disabled={!clicks.data?.length}
                onClick={handleExportClicks}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-secondary disabled:opacity-60"
              >
                <Download className="size-3.5" />
                Exportar CSV
              </button>
            </div>
            {exportError && (
              <div className="px-6 pt-4">
                <Feedback tone="error" onClose={() => setExportError(null)}>
                  {exportError}
                </Feedback>
              </div>
            )}
            {clicks.data && clicks.data.length > 0 ? (
              <ul className="divide-y divide-border/50" data-testid="click-list">
                {clicks.data.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-xs">
                    <span className="font-mono">{formatDateTime(c.clicked_at)}</span>
                    <span className="text-muted-foreground">
                      {c.referer ?? "direto"} · {c.user_agent ?? "navegador desconhecido"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-6 py-6 text-xs text-muted-foreground">
                Nenhum clique registrado ainda. Use “Testar link” para registrar um clique de teste.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
