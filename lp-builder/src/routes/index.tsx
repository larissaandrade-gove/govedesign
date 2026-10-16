import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, FilePlus2, LogOut, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HERO_PRESETS, pageFromPreset, type HeroPresetId } from "@/lib/gove/presets";
import { createPage, deletePage, listPages, type StoredPage } from "@/lib/gove/storage";
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
import { PresetThumb } from "@/components/gove/PresetThumb";
import { AppBrand } from "@/components/gove/AppBrand";
import { useAuth } from "@/lib/gove/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Projetos — GOVE LP Builder" },
      {
        name: "description",
        content:
          "Monte landing pages GOVE no navegador e exporte o HTML/CSS. Tudo salvo localmente, sem servidor.",
      },
      { property: "og:title", content: "Projetos — GOVE LP Builder" },
      {
        property: "og:description",
        content:
          "Monte landing pages GOVE no navegador e exporte o HTML/CSS. Tudo salvo localmente, sem servidor.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { email, signOut } = useAuth();
  const [pages, setPages] = useState<StoredPage[] | null>(null);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [preset, setPreset] = useState<HeroPresetId>("centered");

  useEffect(() => {
    setPages(listPages());
  }, []);

  function handleCreate() {
    const page = createPage(nome.trim() || "Nova Landing Page", pageFromPreset(preset));
    setOpen(false);
    setNome("");
    navigate({ to: "/editor/$id", params: { id: page.id } });
  }

  function handleRemove(id: string) {
    deletePage(id);
    setPages(listPages());
    toast.success("Landing page excluída deste navegador.");
  }

  return (
    <main className="min-h-screen bg-secondary">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <AppBrand />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
            <Button variant="ghost" size="iconTouch" onClick={signOut} aria-label="Sair" title="Sair">
              <LogOut aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl leading-tight font-bold sm:text-[31px]">Landing pages</h1>
          <Button
            variant="cta"
            size="touch"
            onClick={() => setOpen(true)}
            aria-label="Nova Landing Page"
            title="Nova Landing Page"
          >
            <FilePlus2 aria-hidden />
            <span className="hidden min-[480px]:inline">Nova Landing Page</span>
          </Button>
        </div>

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
                  <h2 className="truncate text-base font-bold" title={page.nome}>
                    {page.nome}
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
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconTouch"
                    aria-label={`Excluir ${page.nome}`}
                    title="Excluir"
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemove(page.id)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nova Landing Page</DialogTitle>
            <DialogDescription>Escolha um preset de Hero.</DialogDescription>
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

          <div className="grid gap-3 sm:grid-cols-2">
            {HERO_PRESETS.map((item) => (
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
                <p className="text-sm text-muted-foreground">{item.descricao}</p>
              </button>
            ))}
          </div>

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
