import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Download,
  Eye,
  Globe,
  Link2,
  Loader2,
  MousePointerClick,
  Pencil,
  Plus,
  Power,
  Trash2,
} from "lucide-react";

import { buildShortUrl } from "@/lib/short-domain";
import { allLinksQuery, clickStatsQuery, type ShortLinkRow } from "@/lib/links-queries";
import { isCircularShortUrl, isValidHttpUrl } from "@/lib/short-links";
import { deleteLink, exportLinksCsv, saveOutcomeMessage, updateLink } from "../lib/link-actions";
import {
  ActiveSwitch,
  Feedback,
  IconHeader,
  Modal,
  StatusBadge,
  TestLinkButton,
  copyText,
  useTestLink,
} from "../components/LinkTools";

function formatDateTime(value: string | null) {
  if (!value) return "Nenhum acesso ainda";
  return new Date(value).toLocaleString("pt-BR");
}

export function LinksPage() {
  const queryClient = useQueryClient();
  const links = useQuery(allLinksQuery);
  const stats = useQuery(clickStatsQuery);
  const rows = links.data ?? [];
  const tester = useTestLink();

  const [viewing, setViewing] = useState<ShortLinkRow | null>(null);
  const [editing, setEditing] = useState<ShortLinkRow | null>(null);
  const [deleting, setDeleting] = useState<ShortLinkRow | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [activeDraft, setActiveDraft] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["links"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["click-stats"] });
  }

  const update = useMutation({
    mutationFn: (payload: {
      id: string;
      original_url: string;
      internal_name: string | null;
      is_active: boolean;
    }) =>
      updateLink(payload.id, {
        original_url: payload.original_url,
        internal_name: payload.internal_name,
        is_active: payload.is_active,
      }),
    onSuccess: async () => {
      setEditing(null);
      setFormError(null);
      await refresh();
    },
    onError: () => setFormError("Não foi possível salvar as alterações. Tente novamente."),
  });

  const remove = useMutation({
    mutationFn: deleteLink,
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
    if (await copyText(buildShortUrl(row.slug))) {
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedId(null);
    }
  }

  async function handleExport() {
    setExportError(null);
    setExportError(saveOutcomeMessage(await exportLinksCsv(rows, stats.data)));
  }

  const th = "px-3 py-2.5 text-left font-normal text-muted-foreground first:pl-5 last:pr-5";
  const td = "px-3 py-3 first:pl-5 last:pr-5";

  return (
    <>
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Meus links
          {rows.length > 0 && (
            <span className="ml-2 align-middle text-base font-medium text-muted-foreground">
              {rows.length}
            </span>
          )}
        </h1>
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={handleExport}
          aria-label="Exportar CSV"
          title="Exportar CSV"
          className="icon-btn"
        >
          <Download className="size-5" aria-hidden />
        </button>
      </header>

      {(tester.message || exportError) && (
        <div className="mb-4 space-y-2">
          {tester.message && (
            <Feedback tone={tester.feedback?.result === "opened" ? "info" : "error"} onClose={tester.clear}>
              {tester.message}
            </Feedback>
          )}
          {exportError && (
            <Feedback tone="error" onClose={() => setExportError(null)}>
              {exportError}
            </Feedback>
          )}
        </div>
      )}

      <div className="surface overflow-hidden">
        {rows.length > 0 ? (
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className={th}>
                  <IconHeader icon={Link2} label="Identificador" />
                </th>
                <th scope="col" className={`${th} hidden w-[34%] min-[900px]:table-cell`}>
                  <IconHeader icon={Globe} label="URL original" />
                </th>
                <th scope="col" className={`${th} w-16`}>
                  <IconHeader icon={MousePointerClick} label="Cliques" />
                </th>
                <th scope="col" className={`${th} hidden w-28 min-[900px]:table-cell`}>
                  <IconHeader icon={CalendarDays} label="Criado em" />
                </th>
                <th scope="col" className={`${th} w-12 min-[900px]:w-24`}>
                  <IconHeader icon={Power} label="Status" />
                </th>
                <th scope="col" className={`${th} w-[10.5rem] min-[480px]:w-[13.5rem]`}>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-secondary/40">
                  <td className={`${td} truncate`}>
                    <Link
                      to="/links/$id"
                      params={{ id: row.id }}
                      className="font-mono font-medium underline-offset-4 hover:underline"
                    >
                      /{row.slug}
                    </Link>
                    {row.internal_name && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {row.internal_name}
                      </span>
                    )}
                  </td>
                  <td className={`${td} hidden truncate text-muted-foreground min-[900px]:table-cell`}>
                    {row.original_url}
                  </td>
                  <td className={`${td} font-mono tabular-nums text-muted-foreground`} data-testid={`clicks-${row.slug}`}>
                    {stats.isPending ? "—" : (stats.data?.get(row.id)?.count ?? 0)}
                  </td>
                  <td className={`${td} hidden font-mono text-xs text-muted-foreground min-[900px]:table-cell`}>
                    {new Date(row.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className={td}>
                    <StatusBadge active={row.is_active} compact />
                  </td>
                  <td className={`${td} py-1`}>
                    <div className="flex items-center justify-end">
                      <TestLinkButton
                        slug={row.slug}
                        pending={tester.pendingId === row.id}
                        onClick={() => tester.run(row.id)}
                      />
                      <button
                        type="button"
                        aria-label={`Visualizar /${row.slug}`}
                        title="Visualizar"
                        onClick={() => setViewing(row)}
                        className="icon-btn hidden min-[480px]:inline-grid"
                      >
                        <Eye className="size-5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Editar /${row.slug}`}
                        title="Editar"
                        onClick={() => startEdit(row)}
                        className="icon-btn"
                      >
                        <Pencil className="size-5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir /${row.slug}`}
                        title="Excluir"
                        onClick={() => setDeleting(row)}
                        className="icon-btn icon-btn-danger"
                      >
                        <Trash2 className="size-5" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {links.isPending
                ? "Carregando links…"
                : links.isError
                  ? "Não foi possível carregar os links agora."
                  : "Nenhum link criado ainda."}
            </p>
            {!links.isPending && !links.isError && (
              <Link to="/criar-link" className="btn btn-cta">
                <Plus className="size-4" aria-hidden />
                Criar link
              </Link>
            )}
          </div>
        )}
      </div>

      {viewing && (
        <Modal title={viewing.internal_name || `/${viewing.slug}`} onClose={() => setViewing(null)}>
          <div className="space-y-5">
            <div className="flex items-center gap-2 rounded-xl bg-secondary py-1 pl-4 pr-1">
              <span className="min-w-0 flex-1 break-all py-2 font-mono text-sm font-medium">
                {buildShortUrl(viewing.slug)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(viewing)}
                aria-label={copiedId === viewing.id ? "Link copiado" : "Copiar link"}
                className="btn btn-cta"
              >
                {copiedId === viewing.id ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                <span className="hidden min-[480px]:inline">
                  {copiedId === viewing.id ? "Copiado" : "Copiar"}
                </span>
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Cliques</dt>
                <dd className="mt-1 font-mono text-2xl font-light tabular-nums">
                  {stats.data?.get(viewing.id)?.count ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Último clique</dt>
                <dd className="mt-1 font-mono text-xs">
                  {formatDateTime(stats.data?.get(viewing.id)?.lastClickAt ?? null)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Destino</dt>
                <dd className="mt-1 break-all">{viewing.final_url}</dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <StatusBadge active={viewing.is_active} />
              <Link
                to="/links/$id"
                params={{ id: viewing.id }}
                aria-label="Ver detalhes e QR Code"
                title="Ver detalhes e QR Code"
                className="btn btn-secondary"
              >
                Detalhes
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Editar /${editing.slug}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-name" className="field-label">
                Nome interno
              </label>
              <input
                id="edit-name"
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Campanha institucional"
                className="field"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-url" className="field-label">
                URL de destino
              </label>
              <input
                id="edit-url"
                type="url"
                value={urlDraft}
                onChange={(event) => setUrlDraft(event.target.value)}
                placeholder="https://exemplo.com/pagina"
                className="field font-mono"
              />
            </div>

            <ActiveSwitch checked={activeDraft} onChange={setActiveDraft} />

            {formError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={update.isPending}
                onClick={() => setEditing(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button type="button" disabled={update.isPending} onClick={handleSave} className="btn btn-cta">
                {update.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Salvar alterações
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Excluir link" onClose={() => setDeleting(null)}>
          <p className="text-sm text-muted-foreground">
            Excluir <span className="font-mono text-foreground">/{deleting.slug}</span>? O histórico
            de cliques também será perdido. Essa ação não pode ser desfeita.
          </p>
          {remove.isError && (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              Não foi possível excluir o link. Tente novamente.
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
              className="btn btn-danger"
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Excluir definitivamente
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
