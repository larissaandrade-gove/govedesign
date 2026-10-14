import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { buildShortUrl, getShortDomainLabel } from "@/lib/short-domain";
import {
  createShortLink,
  sanitizeSlug,
  SlugTakenError,
  type CreatedLink,
} from "@/lib/short-links";

export const Route = createFileRoute("/_authenticated/criar-link")({
  head: () => ({
    meta: [
      { title: "Criar link — Gove Links" },
      {
        name: "description",
        content:
          "Encurte URLs longas com slug personalizado e nome de campanha no Gove Links.",
      },
      { property: "og:title", content: "Criar link — Gove Links" },
      {
        property: "og:description",
        content: "Encurte URLs institucionais da Gove com slug personalizado.",
      },
    ],
  }),
  component: CreateLinkPage,
});

function CreateLinkPage() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [internalName, setInternalName] = useState("");
  const [result, setResult] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: createShortLink,
    onSuccess: async (created) => {
      setResult(created);
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const errorMessage = mutation.error
    ? mutation.error instanceof SlugTakenError
      ? "Este slug já está em uso. Escolha outro."
      : mutation.error.message
    : null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate({ originalUrl: url, slug, internalName });
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildShortUrl(result.slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleReset() {
    setUrl("");
    setSlug("");
    setInternalName("");
    setResult(null);
    setCopied(false);
    mutation.reset();
  }

  return (
    <>
      <header className="animate-entrance mb-10">
        <h1 className="text-xl font-semibold tracking-tight">Criar link</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Encurte uma URL longa e defina um slug personalizado para a campanha.
        </p>
      </header>

      <div
        className="animate-entrance max-w-xl rounded-xl bg-card p-8 ring-1 ring-border"
        style={{ animationDelay: "150ms" }}
      >
        {result ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="label-caps text-accent">Link criado com sucesso!</p>
              {result.internal_name && (
                <p className="text-sm font-medium text-foreground">
                  {result.internal_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <span className="label-caps ml-0.5 block text-muted-foreground">
                Link curto
              </span>
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all font-mono text-sm font-medium text-foreground">
                  {buildShortUrl(result.slug)}
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
              <p className="text-xs text-muted-foreground">
                Destino: <span className="break-all">{result.final_url}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/links"
                className="inline-flex items-center rounded-md border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-secondary"
              >
                Ver meus links
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center rounded-md px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                Criar outro link
              </button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <label htmlFor="url" className="label-caps ml-0.5 block text-muted-foreground">
                URL de destino
              </label>
              <input
                id="url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.gove.digital/evento-refis-agosto"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="slug" className="label-caps ml-0.5 block text-muted-foreground">
                Slug personalizado (opcional)
              </label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {getShortDomainLabel()}/
                </span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  onBlur={() => setSlug((v) => sanitizeSlug(v))}
                  placeholder="refis"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
              <p className="ml-0.5 text-xs text-muted-foreground">
                Se ficar vazio, geramos um slug curto e único automaticamente.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="internal-name"
                className="label-caps ml-0.5 block text-muted-foreground"
              >
                Nome da campanha (opcional)
              </label>
              <input
                id="internal-name"
                type="text"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
                placeholder="Evento REFIS Agosto"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded border border-destructive/20 bg-destructive/5 px-4 py-3"
              >
                <p className="text-xs font-medium text-destructive">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {mutation.isPending ? "Encurtando..." : "Encurtar link"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
