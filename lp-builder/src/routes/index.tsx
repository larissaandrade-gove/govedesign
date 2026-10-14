import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FilePlus2, LayoutTemplate, LogOut, Pencil, Trash2 } from "lucide-react";
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: "var(--gove-primary)" }}
            >
              <LayoutTemplate className="size-5" color="#FFFFFF" aria-hidden />
            </span>
            <span className="text-[20px] font-bold">GOVE LP Builder</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="size-4" aria-hidden /> Sair
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[31px] leading-tight font-bold">Landing pages</h1>
            <p className="mt-2 text-muted-foreground">
              Monte visualmente, exporte o HTML e cole na plataforma final. Os projetos ficam
              guardados no histórico local do seu navegador — nada é enviado para servidores.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <FilePlus2 className="size-4" aria-hidden /> Nova Landing Page
          </Button>
        </div>

        {pages === null ? (
          <p className="text-muted-foreground">Carregando projetos locais…</p>
        ) : !pages.length ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma landing page ainda. Crie a primeira com um preset de Hero.
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <li
                key={page.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <div>
                  <h2 className="text-[20px] font-bold break-words">{page.nome}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Atualizada em {new Date(page.atualizado_em).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="mt-6 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate({ to: "/editor/$id", params: { id: page.id } })}
                  >
                    <Pencil className="size-4" aria-hidden /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Excluir ${page.nome}`}
                    onClick={() => handleRemove(page.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
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
            <DialogDescription>
              Escolha um preset de Hero como ponto de partida. Tudo pode ser editado depois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do projeto</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Captura — Webinar de Gestão Pública"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {HERO_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreset(item.id)}
                aria-pressed={preset === item.id}
                className="rounded-xl border-2 p-4 text-left transition-colors"
                style={{
                  borderColor: preset === item.id ? "var(--gove-primary)" : "var(--color-border)",
                }}
              >
                <PresetThumb id={item.id} />
                <p className="mt-3 font-bold">{item.nome}</p>
                <p className="text-sm text-muted-foreground">{item.descricao}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Criar landing page</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
