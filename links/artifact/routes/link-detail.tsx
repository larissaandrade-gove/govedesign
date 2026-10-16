import { Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, Copy, Download, Loader2, Pencil, QrCode } from "lucide-react";
import { useState } from "react";

import { buildShortUrl } from "@/lib/short-domain";
import { linkClickStatsQuery, linkClicksQuery, linkDetailQuery } from "@/lib/links-queries";
import { isCircularShortUrl, isValidHttpUrl } from "@/lib/short-links";
import { exportClicksCsv, saveOutcomeMessage, updateLink } from "../lib/link-actions";
import {
  ActiveSwitch,
  Feedback,
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
  const [showQr, setShowQr] = useState(false);

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
      <header className="mb-6 flex items-center gap-2">
        <Link
          to="/links"
          aria-label="Voltar para Meus links"
          title="Voltar para Meus links"
          className="icon-btn -ml-3"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight sm:text-3xl">
          {row?.internal_name || (row ? `/${row.slug}` : link.isPending ? "Carregando…" : "Link não encontrado")}
        </h1>
      </header>

      {row && (
        <div className="space-y-4">
          <section className="surface space-y-3 p-5" aria-label="Link curto">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 break-all font-mono text-base font-medium">
                {buildShortUrl(row.slug)}
              </span>
              <div className="flex items-center gap-1">
                <TestLinkButton
                  slug={row.slug}
                  pending={tester.pendingId === row.id}
                  onClick={() => tester.run(row.id)}
                />
                <button
                  type="button"
                  aria-label={showQr ? "Ocultar QR Code" : "Mostrar QR Code"}
                  title="QR Code"
                  aria-expanded={showQr}
                  aria-controls="qr-panel"
                  onClick={() => setShowQr((v) => !v)}
                  className={`icon-btn ${showQr ? "bg-secondary text-foreground" : ""}`}
                >
                  <QrCode className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={copied ? "Link copiado" : "Copiar link"}
                  className="btn btn-cta ml-1"
                >
                  {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  <span className="hidden min-[480px]:inline">{copied ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>
            {tester.message && (
              <Feedback tone={tester.feedback?.result === "opened" ? "info" : "error"} onClose={tester.clear}>
                {tester.message}
              </Feedback>
            )}
            {showQr && (
              <div id="qr-panel" className="border-t border-border pt-4">
                <QrPanel slug={row.slug} />
              </div>
            )}
          </section>

          <dl className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="surface flex flex-col-reverse justify-end p-5">
              <dt className="mt-2 text-sm font-medium text-muted-foreground">Cliques</dt>
              <dd className="font-mono text-4xl font-light tabular-nums" data-testid="detail-clicks">
                {stats.isPending ? "—" : (stats.data?.count ?? 0)}
              </dd>
            </div>
            <div className="surface flex flex-col-reverse justify-between p-5">
              <dt className="mt-2 text-sm font-medium text-muted-foreground">Último clique</dt>
              <dd className="font-mono text-sm">
                {stats.isPending ? "—" : formatDateTime(stats.data?.lastClickAt ?? null)}
              </dd>
            </div>
          </dl>

          <section className="surface divide-y divide-border px-5" aria-label="Configuração">
            <div className="py-3">
              <div className="flex items-center justify-between gap-3">
                <span id="dest-label" className="text-sm font-medium">
                  Destino
                </span>
                {!editingUrl && (
                  <button
                    type="button"
                    onClick={startEditUrl}
                    aria-label="Editar destino"
                    title="Editar destino"
                    className="icon-btn -mr-3"
                  >
                    <Pencil className="size-5" aria-hidden />
                  </button>
                )}
              </div>
              {editingUrl ? (
                <div className="space-y-3 pb-2 pt-1">
                  <input
                    type="url"
                    aria-label="Nova URL de destino"
                    value={urlDraft}
                    onChange={(event) => setUrlDraft(event.target.value)}
                    placeholder="https://exemplo.com/pagina"
                    className="field font-mono"
                  />
                  {urlError && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {urlError}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={updateUrl.isPending}
                      onClick={() => {
                        setEditingUrl(false);
                        setUrlError(null);
                      }}
                      className="btn btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={updateUrl.isPending}
                      onClick={handleSaveUrl}
                      className="btn btn-cta"
                    >
                      {updateUrl.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                      Salvar destino
                    </button>
                  </div>
                </div>
              ) : (
                <p className="break-all pb-1 text-sm text-muted-foreground">
                  {row.final_url}
                </p>
              )}
            </div>

            <div className="py-1">
              <ActiveSwitch
                checked={row.is_active}
                disabled={toggle.isPending}
                pending={toggle.isPending}
                onChange={(next) => toggle.mutate(next)}
              />
              {toggle.isError && (
                <p role="alert" className="pb-3 text-sm font-medium text-destructive">
                  Não foi possível atualizar o status do link.
                </p>
              )}
            </div>
          </section>

          <section className="surface" aria-labelledby="clicks-title">
            <div className="flex items-center justify-between gap-3 border-b border-border py-2 pl-5 pr-2">
              <h2 id="clicks-title" className="text-base font-semibold">
                Cliques recentes
              </h2>
              <button
                type="button"
                disabled={!clicks.data?.length}
                onClick={handleExportClicks}
                aria-label="Exportar CSV"
                title="Exportar CSV"
                className="icon-btn"
              >
                <Download className="size-5" aria-hidden />
              </button>
            </div>
            {exportError && (
              <div className="px-5 pt-4">
                <Feedback tone="error" onClose={() => setExportError(null)}>
                  {exportError}
                </Feedback>
              </div>
            )}
            {clicks.data && clicks.data.length > 0 ? (
              <ul className="divide-y divide-border" data-testid="click-list">
                {clicks.data.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <span className="font-mono text-xs">{formatDateTime(c.clicked_at)}</span>
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {c.referer ?? "direto"} · {c.user_agent ?? "navegador desconhecido"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum clique registrado ainda.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
