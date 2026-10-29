import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, FilePlus, SignOut, PencilSimple, Trash, Plus, File as FileIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { pageFromPreset } from "@/lib/gove/presets";
import { createPage, deletePage, listPages, type StoredPage } from "@/lib/gove/storage";
import { ensureSeedTemplates, listTemplates, subscribeTemplates } from "@/lib/gove/storage";
import {
  formatDate,
  isPublished,
  pageFromTemplate,
  templateIdentity,
  type StoredTemplate,
} from "@/lib/gove/templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageThumb } from "@/components/gove/PageThumb";
import { BBTag, TemplatesSection } from "@/components/gove/TemplatesSection";
import { AppBrand } from "@/components/gove/AppBrand";
import { IdentityToggle } from "@/components/gove/BBControls";
import type { Identity } from "@/lib/gove/types";
import { useAuth } from "@/lib/gove/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Projetos — GOVE Landing Pages" },
      {
        name: "description",
        content:
          "Monte landing pages GOVE no navegador e exporte o HTML/CSS. Tudo salvo localmente, sem servidor.",
      },
      { property: "og:title", content: "Projetos — GOVE Landing Pages" },
      {
        property: "og:description",
        content:
          "Monte landing pages GOVE no navegador e exporte o HTML/CSS. Tudo salvo localmente, sem servidor.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { aba?: Tab } =>
    search["aba"] === "modelos" ? { aba: "modelos" } : {},
  component: Dashboard,
});

type Tab = "paginas" | "modelos";
/** Opção "Página em branco" no diálogo de nova landing page. */
const BLANK = "blank";

function Dashboard() {
  const navigate = useNavigate();
  const { email, signOut } = useAuth();
  const [pages, setPages] = useState<StoredPage[] | null>(null);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [choice, setChoice] = useState<string>(BLANK);
  const [identity, setIdentity] = useState<Identity>("gove");
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.aba === "modelos" ? "modelos" : "paginas");
  const [templates, setTemplates] = useState<StoredTemplate[] | null>(null);
  const [createModelOpen, setCreateModelOpen] = useState(false);

  // Modelos: compartilhados (no artefato, entre todo o time) e atualizados ao vivo.
  useEffect(() => {
    ensureSeedTemplates();
    setTemplates(listTemplates());
    return subscribeTemplates(() => setTemplates(listTemplates()));
  }, []);

  // Só modelos publicados (snapshot) da identidade escolhida.
  const published = (templates ?? []).filter((t) => isPublished(t) && templateIdentity(t) === identity);
  const pickIdentity = (value: Identity) => {
    setIdentity(value);
    const first = (templates ?? []).find((t) => isPublished(t) && templateIdentity(t) === value);
    setChoice(first?.id ?? BLANK);
  };
  const openNewPage = () => {
    pickIdentity(identity);
    setOpen(true);
  };

  useEffect(() => {
    setPages(listPages());
  }, []);

  function handleCreate() {
    const template = choice === BLANK ? null : published.find((t) => t.id === choice);
    // Cópia do snapshot publicado: mudar o modelo depois não altera esta página.
    const conteudo = template ? pageFromTemplate(template) : pageFromPreset("blank", identity);
    const page = createPage(nome.trim() || "Nova Landing Page", conteudo);
    setOpen(false);
    setNome("");
    setIdentity("gove");
    navigate({ to: "/editor/$id", params: { id: page.id } });
  }

  function handleRemove(id: string) {
    deletePage(id);
    setPages(listPages());
    toast.success("Landing page excluída deste navegador.");
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <AppBrand />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
            <Button variant="ghost" size="iconTouch" onClick={signOut} aria-label="Sair" title="Sair">
              <SignOut aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl leading-tight font-bold text-title sm:text-[31px]">
            {tab === "modelos" ? "Modelos" : "Landing pages"}
          </h1>
          {tab === "modelos" ? (
            <Button
              variant="cta"
              size="touch"
              className="px-3 min-[480px]:px-4"
              onClick={() => setCreateModelOpen(true)}
              aria-label="Criar novo modelo"
              title="Criar novo modelo"
            >
              <Plus aria-hidden />
              <span>Criar novo modelo</span>
            </Button>
          ) : (
            <Button
              variant="cta"
              size="touch"
              className="px-3 min-[480px]:px-4"
              onClick={openNewPage}
              aria-label="Nova Landing Page"
              title="Nova Landing Page"
            >
              <FilePlus aria-hidden />
              <span>Nova Landing Page</span>
            </Button>
          )}
        </div>

        <div role="tablist" aria-label="Seções" className="mb-6 inline-flex gap-0.5 rounded-xl bg-secondary p-0.5">
          {(
            [
              ["paginas", "Landing pages"],
              ["modelos", "Modelos"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`aba-${id}`}
              aria-selected={tab === id}
              aria-controls={`painel-${id}`}
              onClick={() => setTab(id)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors ${
                tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {id === "modelos" && templates ? (
                <span className="ml-1.5 text-xs text-muted-foreground">{templates.length}</span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "modelos" ? (
          <div role="tabpanel" id="painel-modelos" aria-labelledby="aba-modelos">
            <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
              Modelos publicados aparecem para todo o time em “Nova Landing Page”. Edite e publique de novo quando
              quiser: as landing pages já criadas não mudam.
            </p>
            <TemplatesSection
              templates={templates}
              pages={pages ?? []}
              createOpen={createModelOpen}
              onCreateOpenChange={setCreateModelOpen}
            />
          </div>
        ) : (
        <div role="tabpanel" id="painel-paginas" aria-labelledby="aba-paginas">

        {pages === null ? (
          <p className="text-muted-foreground">Carregando projetos locais…</p>
        ) : !pages.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">Nenhuma landing page ainda.</p>
          </div>
        ) : (
          <ul className="grid gap-4 min-[600px]:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <li
                key={page.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card py-3 pr-2 pl-5 shadow-sm"
              >
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-base font-bold" title={page.nome}>
                    <span className="truncate">{page.nome}</span>
                    {page.conteudo?.identity === "bb" ? (
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: "#FCFC30", color: "#3333BD" }}
                        title="Identidade Banco do Brasil"
                      >
                        BB
                      </span>
                    ) : null}
                  </h2>
                  <p
                    className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"
                    title="Atualizada em"
                  >
                    <Clock className="size-3.5 shrink-0" aria-hidden />
                    <span className="sr-only">Atualizada em </span>
                    {new Date(page.atualizado_em).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="iconTouch"
                    aria-label={`Editar ${page.nome}`}
                    title="Editar"
                    onClick={() => navigate({ to: "/editor/$id", params: { id: page.id } })}
                  >
                    <PencilSimple aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconTouch"
                    aria-label={`Excluir ${page.nome}`}
                    title="Excluir"
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemove(page.id)}
                  >
                    <Trash aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Landing Page</DialogTitle>
            <DialogDescription>Escolha um modelo publicado pelo time ou comece em branco.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do projeto</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Captura — Webinar de Gestão Pública"
              className="min-h-11"
            />
          </div>

          <IdentityToggle value={identity} onChange={pickIdentity} />

          <div role="radiogroup" aria-label="Modelo" className="grid gap-3 sm:grid-cols-2">
            {published.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                onClick={() => setChoice(t.id)}
                aria-checked={choice === t.id}
                className="rounded-2xl border-2 p-3 text-left transition-colors"
                style={{
                  borderColor: choice === t.id ? "var(--gove-primary)" : "var(--color-border)",
                }}
              >
                <PageThumb page={t.publishedDoc ?? t.doc} />
                <p className="mt-2 flex items-center gap-2 font-bold">
                  <span className="truncate">{t.name}</span>
                  {identity === "bb" ? <BBTag /> : null}
                </p>
                {t.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">Atualizado em {formatDate(t.publishedAt)}</p>
              </button>
            ))}
            <button
              type="button"
              role="radio"
              onClick={() => setChoice(BLANK)}
              aria-checked={choice === BLANK}
              className="rounded-2xl border-2 p-3 text-left transition-colors"
              style={{ borderColor: choice === BLANK ? "var(--gove-primary)" : "var(--color-border)" }}
            >
              <span
                className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-secondary"
                aria-hidden
              >
                <FileIcon className="size-8 text-muted-foreground" />
              </span>
              <p className="mt-2 font-bold">Página em branco</p>
              <p className="text-sm text-muted-foreground">Uma seção vazia para montar do zero.</p>
            </button>
          </div>
          {templates !== null && !published.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhum modelo publicado para esta identidade.{" "}
              <button
                type="button"
                className="font-semibold text-foreground underline underline-offset-2"
                onClick={() => {
                  setOpen(false);
                  setTab("modelos");
                }}
              >
                Ver modelos
              </button>
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="touch" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="cta" size="touch" onClick={handleCreate}>
              Criar landing page
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
