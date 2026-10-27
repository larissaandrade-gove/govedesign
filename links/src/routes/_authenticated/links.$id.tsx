import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, SpinnerGap, PencilSimple, X } from "@phosphor-icons/react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { buildShortUrl } from "@/lib/short-domain";
import { linkClickStatsQuery, linkDetailQuery } from "@/lib/links-queries";
import { buildFinalUrl, isCircularShortUrl, isValidHttpUrl } from "@/lib/short-links";

export const Route = createFileRoute("/_authenticated/links/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do link — Gove Links" },
      {
        name: "description",
        content: "Cliques totais e último acesso de um link curto da Gove.",
      },
      { property: "og:title", content: "Detalhes do link — Gove Links" },
      {
        property: "og:description",
        content: "Métricas básicas de um link curto institucional da Gove.",
      },
    ],
  }),
  component: LinkDetailPage,
});

function formatDateTime(value: string | null) {
  if (!value) return "Nenhum acesso ainda";
  return new Date(value).toLocaleString("pt-BR");
}

function LinkDetailPage() {
  const { id } = useParams({ from: "/_authenticated/links/$id" });
  const queryClient = useQueryClient();
  const link = useQuery(linkDetailQuery(id));
  const stats = useQuery(linkClickStatsQuery(id));
  const [copied, setCopied] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const updateUrl = useMutation({
    mutationFn: async (nextUrl: string) => {
      const { error } = await supabase
        .from("short_links")
        .update({ original_url: nextUrl, final_url: buildFinalUrl(nextUrl) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setEditingUrl(false);
      setUrlError(null);
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: () => {
      setUrlError("Não foi possível atualizar a URL de destino. Tente novamente.");
    },
  });

  function startEditUrl() {
    if (!link.data) return;
    setUrlDraft(link.data.original_url);
    setUrlError(null);
    setEditingUrl(true);
  }

  function cancelEditUrl() {
    setEditingUrl(false);
    setUrlError(null);
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

  const toggle = useMutation({
    mutationFn: async (nextActive: boolean) => {
      const { error } = await supabase
        .from("short_links")
        .update({ is_active: nextActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  async function handleCopy() {
    if (!link.data) return;
    try {
      await navigator.clipboard.writeText(buildShortUrl(link.data.slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const row = link.data;

  return (
    <>
      <header className="animate-entrance mb-10">
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="animate-entrance rounded-xl bg-card p-6 ring-1 ring-border">
              <p className="label-caps mb-4 text-muted-foreground">Total de cliques</p>
              <span className="font-mono text-4xl font-light">
                {stats.isPending ? "—" : stats.data?.count ?? 0}
              </span>
            </div>
            <div
              className="animate-entrance rounded-xl bg-card p-6 ring-1 ring-border"
              style={{ animationDelay: "80ms" }}
            >
              <p className="label-caps mb-4 text-muted-foreground">Último clique</p>
              <span className="font-mono text-sm">
                {stats.isPending ? "—" : formatDateTime(stats.data?.lastClickAt ?? null)}
              </span>
            </div>
          </div>

          <div
            className="animate-entrance space-y-5 rounded-xl bg-card p-6 ring-1 ring-border"
            style={{ animationDelay: "150ms" }}
          >
            <div className="space-y-1.5">
              <span className="label-caps block text-muted-foreground">Link curto</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all font-mono text-sm font-medium">
                  {buildShortUrl(row.slug)}
                </span>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="label-caps block text-muted-foreground">Destino</span>
                {!editingUrl && (
                  <button
                    type="button"
                    onClick={startEditUrl}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <PencilSimple className="size-3.5" />
                    Editar
                  </button>
                )}
              </div>
              {editingUrl ? (
                <div className="space-y-3">
                  <input
                    type="url"
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
                      {updateUrl.isPending && <SpinnerGap className="size-3.5 animate-spin" />}
                      Salvar destino
                    </button>
                    <button
                      type="button"
                      disabled={updateUrl.isPending}
                      onClick={cancelEditUrl}
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
                    row.is_active ? "text-accent" : "text-muted-foreground"
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
                {toggle.isPending && <SpinnerGap className="size-3.5 animate-spin" />}
                {row.is_active ? "Desativar link" : "Ativar link"}
              </button>
            </div>
            {toggle.isError && (
              <p role="alert" className="text-xs font-medium text-destructive">
                Não foi possível atualizar o status do link.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
