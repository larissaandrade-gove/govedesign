/**
 * Aba "Modelos": o time cria, edita, publica e mantém os modelos de onde
 * nascem as novas landing pages.
 */
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Clock,
  CloudArrowUp,
  CloudSlash,
  Copy,
  DotsThreeVertical,
  FilePlus,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createPage,
  createTemplate,
  deleteTemplate,
  publishTemplate,
  unpublishTemplate,
  type StoredPage,
} from "@/lib/gove/storage";
import {
  SEED_PRESETS,
  formatDate,
  hasUnpublishedChanges,
  isPublished,
  pageFromTemplate,
  templateIdentity,
  type StoredTemplate,
} from "@/lib/gove/templates";
import { pageFromPreset, type HeroPresetId } from "@/lib/gove/presets";
import type { Identity, PageContent } from "@/lib/gove/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IdentityToggle } from "./BBControls";
import { PresetThumb } from "./PresetThumb";
import { PageThumb } from "./PageThumb";

export function BBTag() {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: "#FCFC30", color: "#3333BD" }}
      title="Identidade Banco do Brasil"
    >
      BB
    </span>
  );
}

export function StatusBadge({ template }: { template: StoredTemplate }) {
  const published = isPublished(template);
  const dirty = hasUnpublishedChanges(template);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
          published ? "bg-[#1E7A46]/12 text-[#1E7A46] dark:bg-[#75E0A7]/15 dark:text-[#75E0A7]" : "bg-secondary text-foreground"
        }`}
      >
        {published ? "Publicado" : "Rascunho"}
      </span>
      {dirty ? (
        <span className="rounded-md bg-accent/25 px-2 py-0.5 text-xs font-bold text-[#20133D] dark:text-[#F4F4F4]">
          Alterações não publicadas
        </span>
      ) : null}
    </span>
  );
}

type Source = "blank" | "layout" | "page";

export function TemplatesSection({
  templates,
  pages,
  createOpen,
  onCreateOpenChange,
}: {
  templates: StoredTemplate[] | null;
  pages: StoredPage[];
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<StoredTemplate | null>(null);

  const edit = (t: StoredTemplate) => navigate({ to: "/modelo/$id", params: { id: t.id } });

  function publish(t: StoredTemplate) {
    if (!publishTemplate(t.id)) return;
    toast.success(
      isPublished(t)
        ? "Publicação atualizada: as próximas landing pages usam esta versão."
        : "Modelo publicado: já aparece em “Nova Landing Page”.",
    );
  }

  function duplicate(t: StoredTemplate) {
    const copy = createTemplate({
      name: `${t.name} (cópia)`,
      description: t.description ?? "",
      doc: t.doc,
    });
    toast.success("Modelo duplicado como rascunho.");
    navigate({ to: "/modelo/$id", params: { id: copy.id } });
  }

  function startPage(t: StoredTemplate) {
    const page = createPage(t.name, pageFromTemplate(t));
    navigate({ to: "/editor/$id", params: { id: page.id } });
  }

  return (
    <>
      {templates === null ? (
        <p className="text-muted-foreground">Carregando modelos…</p>
      ) : !templates.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            Nenhum modelo ainda. Crie o primeiro para o time usar.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 min-[600px]:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const published = isPublished(t);
            const dirty = hasUnpublishedChanges(t);
            return (
              <li
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <button
                  type="button"
                  className="block w-full cursor-pointer rounded-lg text-left"
                  onClick={() => edit(t)}
                  aria-label={`Editar modelo ${t.name}`}
                >
                  <PageThumb page={t.doc} />
                </button>
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-base font-bold" title={t.name}>
                    <span className="truncate">{t.name}</span>
                    {templateIdentity(t) === "bb" ? <BBTag /> : null}
                  </h2>
                  {t.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    <StatusBadge template={t} />
                  </div>
                  <p
                    className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"
                    title="Atualizado em"
                  >
                    <Clock className="size-3.5 shrink-0" aria-hidden />
                    <span className="sr-only">Atualizado em </span>
                    {formatDate(t.updatedAt)}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-1">
                  {!published || dirty ? (
                    <Button
                      variant="outline"
                      size="touch"
                      className="px-3"
                      onClick={() => publish(t)}
                    >
                      <CloudArrowUp aria-hidden />
                      {published ? "Atualizar publicação" : "Publicar"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="touch"
                      className="px-3"
                      onClick={() => startPage(t)}
                    >
                      <FilePlus aria-hidden />
                      Usar modelo
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="iconTouch"
                    className="ml-auto"
                    aria-label={`Editar ${t.name}`}
                    title="Editar"
                    onClick={() => edit(t)}
                  >
                    <PencilSimple aria-hidden />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="iconTouch"
                        aria-label={`Mais ações de ${t.name}`}
                        title="Mais ações"
                      >
                        <DotsThreeVertical aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {published && dirty ? (
                        <DropdownMenuItem className="min-h-11" onSelect={() => startPage(t)}>
                          <FilePlus aria-hidden /> Usar versão publicada
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem className="min-h-11" onSelect={() => duplicate(t)}>
                        <Copy aria-hidden /> Duplicar
                      </DropdownMenuItem>
                      {published ? (
                        <DropdownMenuItem
                          className="min-h-11"
                          onSelect={() => {
                            unpublishTemplate(t.id);
                            toast.success("Modelo despublicado: voltou a ser rascunho.");
                          }}
                        >
                          <CloudSlash aria-hidden /> Despublicar
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="min-h-11 text-destructive focus:text-destructive"
                        onSelect={() => setToDelete(t)}
                      >
                        <Trash aria-hidden /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o modelo “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Ele some para todo o time e não aparece mais em “Nova Landing Page”. As landing pages
              já criadas a partir dele continuam como estão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!toDelete) return;
                deleteTemplate(toDelete.id);
                toast.success("Modelo excluído.");
                setToDelete(null);
              }}
            >
              Excluir modelo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateTemplateDialog open={createOpen} onOpenChange={onCreateOpenChange} pages={pages} />
    </>
  );
}

function CreateTemplateDialog({
  open,
  onOpenChange,
  pages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: StoredPage[];
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<Source>("blank");
  const [identity, setIdentity] = useState<Identity>("gove");
  const [preset, setPreset] = useState<HeroPresetId>("centered");
  const [pageId, setPageId] = useState("");

  const sources: [Source, string, string][] = [
    ["blank", "Em branco", "Uma seção vazia para montar do zero."],
    ["layout", "Layout base", "Um dos layouts de hero do LP Builder."],
    ["page", "Landing page existente", "Copia uma landing page já criada."],
  ];
  const selectedPage = pages.find((p) => p.id === pageId) ?? pages[0];

  function reset() {
    setName("");
    setDescription("");
    setSource("blank");
    setIdentity("gove");
    setPreset("centered");
    setPageId("");
  }

  function handleCreate() {
    let doc: PageContent;
    if (source === "page") {
      if (!selectedPage) {
        toast.error("Crie uma landing page antes de usá-la como ponto de partida.");
        return;
      }
      doc = selectedPage.conteudo;
    } else {
      doc = pageFromPreset(source === "layout" ? preset : "blank", identity);
    }
    const fallback =
      source === "page" && selectedPage ? `Modelo — ${selectedPage.nome}` : "Novo modelo";
    const t = createTemplate({
      name: name.trim() || fallback,
      description: description.trim(),
      doc,
    });
    onOpenChange(false);
    reset();
    navigate({ to: "/modelo/$id", params: { id: t.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar novo modelo</DialogTitle>
          <DialogDescription>
            O modelo começa como rascunho. Publique quando estiver pronto para o time usar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="nome-modelo">Nome do modelo</Label>
          <Input
            id="nome-modelo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Captura — Webinar"
            className="min-h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descricao-novo-modelo">Descrição (opcional)</Label>
          <Textarea
            id="descricao-novo-modelo"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Quando o time deve usar este modelo."
          />
        </div>

        <div className="space-y-2">
          <Label>Ponto de partida</Label>
          <div
            role="radiogroup"
            aria-label="Ponto de partida"
            className="grid gap-2 sm:grid-cols-3"
          >
            {sources.map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={source === id}
                onClick={() => setSource(id)}
                className="min-h-11 rounded-xl border-2 px-3 py-2 text-left transition-colors"
                style={{
                  borderColor: source === id ? "var(--gove-primary)" : "var(--color-border)",
                  backgroundColor: source === id ? "var(--color-secondary)" : undefined,
                }}
              >
                <span className="block text-sm font-bold">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        {source !== "page" ? <IdentityToggle value={identity} onChange={setIdentity} /> : null}

        {source === "layout" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {SEED_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreset(item.id)}
                aria-pressed={preset === item.id}
                className="rounded-2xl border-2 p-3 text-left transition-colors"
                style={{
                  borderColor: preset === item.id ? "var(--gove-primary)" : "var(--color-border)",
                }}
              >
                <PresetThumb id={item.id} />
                <p className="mt-2 font-bold">{item.nome}</p>
              </button>
            ))}
          </div>
        ) : null}

        {source === "page" ? (
          pages.length ? (
            <div className="space-y-2">
              <Label htmlFor="pagina-origem">Landing page</Label>
              <select
                id="pagina-origem"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedPage?.id ?? ""}
                onChange={(e) => setPageId(e.target.value)}
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                    {p.conteudo?.identity === "bb" ? " (BB)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                O modelo é uma cópia: mudar o modelo não altera a landing page, e vice-versa.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
              Ainda não há landing pages para copiar.
            </p>
          )
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="touch" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="cta"
            size="touch"
            onClick={handleCreate}
            disabled={source === "page" && !pages.length}
          >
            Criar e editar modelo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
