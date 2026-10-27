/**
 * "Criar link" do artefato: mesma lógica da página do app publicado
 * (src/routes/_authenticated/criar-link.tsx — createShortLink, sanitizeSlug,
 * SlugTakenError), com a interface revisada e cópia compatível com iframe.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, SpinnerGap, Plus } from "@phosphor-icons/react";

import { buildShortUrl, getShortDomainLabel } from "@/lib/short-domain";
import { createShortLink, sanitizeSlug, SlugTakenError, type CreatedLink } from "@/lib/short-links";
import { copyText } from "../components/LinkTools";

export function CreateLinkPage() {
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
    if (await copyText(buildShortUrl(result.slug))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Criar link</h1>

      <div className="surface p-5 sm:p-6">
        {result ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p role="status" className="flex items-center gap-2 text-sm font-semibold text-success">
                  <Check className="size-4" aria-hidden />
                  Link criado com sucesso!
                </p>
                {result.internal_name && (
                  <p className="mt-1 text-base font-medium">{result.internal_name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Criar outro link"
                title="Criar outro link"
                className="icon-btn -mr-2 -mt-2"
              >
                <Plus className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-secondary py-1 pl-4 pr-1">
              <span className="min-w-0 flex-1 break-all py-2 font-mono text-sm font-medium">
                {buildShortUrl(result.slug)}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Link copiado" : "Copiar link"}
                className="btn btn-cta"
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                <span className="hidden min-[480px]:inline">{copied ? "Copiado" : "Copiar"}</span>
              </button>
            </div>

            <p className="break-all text-sm text-muted-foreground">
              <span className="sr-only">Destino: </span>→ {result.final_url}
            </p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <label htmlFor="url" className="field-label">
                URL de destino
              </label>
              <input
                id="url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.gove.digital/evento-refis-agosto"
                className="field"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="slug" className="field-label">
                Slug <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <div className="flex items-center rounded-xl border border-input bg-background focus-within:border-ring">
                <span className="shrink-0 pl-3.5 font-mono text-sm text-muted-foreground">
                  {getShortDomainLabel()}/
                </span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  onBlur={() => setSlug((v) => sanitizeSlug(v))}
                  placeholder="automático"
                  className="min-h-11 w-full min-w-0 rounded-xl bg-transparent pr-3.5 font-mono text-[0.9375rem] outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="internal-name" className="field-label">
                Campanha <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input
                id="internal-name"
                type="text"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
                placeholder="Evento REFIS Agosto"
                className="field"
              />
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {errorMessage}
              </p>
            )}

            <button type="submit" disabled={mutation.isPending} className="btn btn-cta w-full sm:w-auto">
              {mutation.isPending && <SpinnerGap className="size-4 animate-spin" aria-hidden />}
              {mutation.isPending ? "Encurtando…" : "Encurtar link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
