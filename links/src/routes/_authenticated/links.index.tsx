import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Eye, SpinnerGap, PencilSimple, Trash, X } from "@phosphor-icons/react";

import { supabase } from "@/integrations/supabase/client";
import { buildShortUrl } from "@/lib/short-domain";
import {
  allLinksQuery,
  clickStatsQuery,
  type ShortLinkRow,
} from "@/lib/links-queries";
import { buildFinalUrl, isCircularShortUrl, isValidHttpUrl } from "@/lib/short-links";

export const Route = createFileRoute("/_authenticated/links/")({
  head: () => ({
    meta: [
      { title: "Meus links — Gove Links" },
      {
        name: "description",
        content:
          "Lista e gestão dos links curtos criados pela equipe de marketing da Gove.",
      },
      { property: "og:title", content: "Meus links — Gove Links" },
      {
        property: "og:description",
        content: "Gerencie os links curtos institucionais da Gove.",
      },
    ],
  }),
  component: LinksPage,
});

const columns = [
  "Identificador",
  "URL Original",
  "Cliques",
  "Criado em",
  "Status",
  "Ações",
];

function formatDateTime(value: string | null) {
  if (!value) return "Nenhum acesso ainda";
  return new Date(value).toLocaleString("pt-BR");
}

function LinksPage() {
  const queryClient = useQueryClient();
  const links = useQuery(allLinksQuery);
  const stats = useQuery(clickStatsQuery);
  const rows = links.data ?? [];

  const [viewing, setViewing] = useState<ShortLinkRow | null>(null);
  const [editing, setEditing] = useState<ShortLinkRow | null>(null);
  const [deleting, setDeleting] = useState<ShortLinkRow | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [activeDraft, setActiveDraft] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["links"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  const update = useMutation({
    mutationFn: async (payload: {
      id: string;
      original_url: string;
      internal_name: string | null;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from("short_links")
        .update({
          original_url: payload.original_url,
          final_url: buildFinalUrl(payload.original_url),
          internal_name: payload.internal_name,
          is_active: payload.is_active,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setEditing(null);
      setFormError(null);
      await refresh();
    },
    onError: () => setFormError("Não foi possível salvar as alterações. Tente novamente."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("short_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleting(null);
      await refresh();
    },
  });

  function startEdit(row: ShortLinkRow) {
    setEditing(row);
    setNameDraft(row.internal_name ?? "");
    setUrlDraft(row.original_url);
    setActiveDraft(row.is_active);
    setFormError(null);
  }

  function handleSave() {
    if (!editing) return;
    const nextUrl = urlDraft.trim();
    if (!isValidHttpUrl(nextUrl)) {
      setFormError("Informe uma URL válida iniciando com http:// ou https://");
      return;
    }
    if (isCircularShortUrl(nextUrl)) {
      setFormError("Não é possível encurtar um link que já é um link curto do Gove Links.");
      return;
    }
    setFormError(null);
    update.mutate({
      id: editing.id,
      original_url: nextUrl,
      internal_name: nameDraft.trim() || null,
      is_active: activeDraft,
    });
  }

  async function handleCopy(row: ShortLinkRow) {
    try {
      await navigator.clipboard.writeText(buildShortUrl(row.slug));
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <>
      <header className="animate-entrance mb-10">
        <h1 className="text-xl font-semibold tracking-tight">Meus links</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos os links curtos criados pela equipe aparecerão nesta listagem.
        </p>
      </header>

      <div
        className="animate-entrance overflow-x-auto rounded-xl bg-card ring-1 ring-border"
        style={{ animationDelay: "150ms" }}
      >
        {rows.length > 0 ? (
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {columns.map((col, i) => (
                  <th
                    key={col}
                    scope="col"
                    className={`label-caps px-6 py-3 text-[10px] font-bold text-muted-foreground/60 ${
                      i === columns.length - 1 ? "text-right" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-secondary/40">
                  <td className="px-6 py-4 font-mono text-xs font-medium">
                    /{row.slug}
                    {row.internal_name && (
                      <span className="mt-0.5 block font-sans text-[11px] text-muted-foreground">
                        {row.internal_name}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[260px] truncate px-6 py-4 text-xs text-muted-foreground">
                    {row.original_url}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {stats.isPending ? "—" : (stats.data?.get(row.id)?.count ?? 0)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        row.is_active ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      {row.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Visualizar /${row.slug}`}
                        title="Visualizar"
                        onClick={() => setViewing(row)}
                        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Editar /${row.slug}`}
                        title="Editar"
                        onClick={() => startEdit(row)}
                        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <PencilSimple className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir /${row.slug}`}
                        title="Excluir"
                        onClick={() => setDeleting(row)}
                        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex h-80 flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-dashed border-border">
              <div className="size-2 rounded-full bg-border" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {links.isPending ? "Carregando links" : "Nenhum link cadastrado"}
            </h3>
            <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-muted-foreground">
              {links.isError
                ? "Não foi possível carregar os links agora."
                : "Crie seu primeiro link curto na página “Criar link”."}
            </p>
          </div>
        )}
      </div>

      {viewing && (
        <Modal title={viewing.internal_name || `/${viewing.slug}`} onClose={() => setViewing(null)}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="label-caps mb-2 text-muted-foreground">Cliques</p>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {stats.data?.get(viewing.id)?.count ?? 0}
                </span>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="label-caps mb-2 text-muted-foreground">Último clique</p>
                <span className="font-mono text-xs">
                  {formatDateTime(stats.data?.get(viewing.id)?.lastClickAt ?? null)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="label-caps block text-muted-foreground">Link curto</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all font-mono text-sm font-medium">
                  {buildShortUrl(viewing.slug)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(viewing)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {copiedId === viewing.id ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copiedId === viewing.id ? "Link copiado!" : "Copiar link"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="label-caps block text-muted-foreground">Destino</span>
              <p className="break-all text-sm text-muted-foreground">{viewing.final_url}</p>
            </div>

            <div className="space-y-1.5">
              <span className="label-caps block text-muted-foreground">Status</span>
              <span
                className={`text-[11px] font-bold uppercase tracking-widest ${
                  viewing.is_active ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {viewing.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Editar /${editing.slug}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-name" className="label-caps block text-muted-foreground">
                Nome interno
              </label>
              <input
                id="edit-name"
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Campanha institucional"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-url" className="label-caps block text-muted-foreground">
                URL de destino
              </label>
              <input
                id="edit-url"
                type="url"
                value={urlDraft}
                onChange={(event) => setUrlDraft(event.target.value)}
                placeholder="https://exemplo.com/pagina"
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <span className="label-caps block text-muted-foreground">Status</span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-widest ${
                    activeDraft ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {activeDraft ? "Ativo" : "Inativo"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveDraft((v) => !v)}
                className="rounded-md border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-secondary"
              >
                {activeDraft ? "Desativar link" : "Ativar link"}
              </button>
            </div>

            {formError && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={update.isPending}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {update.isPending && <SpinnerGap className="size-3.5 animate-spin" />}
                Salvar alterações
              </button>
              <button
                type="button"
                disabled={update.isPending}
                onClick={() => setEditing(null)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-secondary disabled:opacity-60"
              >
                <X className="size-3.5" />
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Excluir link" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <span className="font-mono">/{deleting.slug}</span>?
            Essa ação não pode ser desfeita e o histórico de cliques será perdido.
          </p>
          {remove.isError && (
            <p role="alert" className="mt-3 text-xs font-medium text-destructive">
              Não foi possível excluir o link. Tente novamente.
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {remove.isPending && <SpinnerGap className="size-3.5 animate-spin" />}
              Excluir definitivamente
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-secondary disabled:opacity-60"
            >
              <X className="size-3.5" />
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="animate-entrance max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-6 shadow-elegant ring-1 ring-border"
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
