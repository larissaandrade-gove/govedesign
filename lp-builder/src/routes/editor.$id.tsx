import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Columns3,
  FileCode2,
  Image as ImageIcon,
  LayoutPanelTop,
  Loader2,
  Monitor,
  MousePointerClick,
  Save,
  Smartphone,
  SquareStack,
  Timer,
  Type as TypeIcon,
  Upload,
  Video as VideoIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getPage, savePage } from "@/lib/gove/storage";
import { Canvas } from "@/components/gove/Canvas";
import { PropertiesPanel } from "@/components/gove/PropertiesPanel";
import { normalizeCursor } from "@/lib/gove/cursor";
import { ExportDialog } from "@/components/gove/ExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportHtml } from "@/lib/gove/export";
import { auditPage } from "@/lib/gove/audit";
import {
  makeButton,
  makeCard,
  makeCountdown,
  makeImage,
  makeRdForm,
  makeRow,
  makeSection,
  makeText,
  makeVideo,
} from "@/lib/gove/factories";
import {
  addLeaf,
  addRow,
  addSection,
  backgroundBehind,
  findNode,
  firstColumnId,
  moveLeaf,
  moveRow,
  removeNode,
  setColumnCount,
  updateNode,
} from "@/lib/gove/tree";
import type { Leaf, PageContent } from "@/lib/gove/types";

export const Route = createFileRoute("/editor/$id")({
  head: () => ({
    meta: [
      { title: "Editor — GOVE LP Builder" },
      {
        name: "description",
        content: "Monte a landing page com seções, blocos e presets do design system GOVE.",
      },
      { property: "og:title", content: "Editor — GOVE LP Builder" },
      {
        property: "og:description",
        content: "Monte a landing page com seções, blocos e presets do design system GOVE.",
      },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [page, setPage] = useState<PageContent | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const skipAutosave = useRef(true);

  // Carrega do armazenamento local do navegador (sem backend).
  useEffect(() => {
    const stored = getPage(id);
    if (!stored) {
      toast.error("Landing page não encontrada neste navegador.");
      navigate({ to: "/" });
      return;
    }
    setNome(stored.nome);
    setPage(stored.conteudo);
    setSavedAt(stored.atualizado_em);
    skipAutosave.current = true;
  }, [id, navigate]);

  const save = useCallback(
    (silent = false) => {
      if (!page) return;
      savePage(id, { nome, conteudo: page });
      setSavedAt(new Date().toISOString());
      if (!silent) toast.success("Landing page salva neste navegador.");
    },
    [id, nome, page],
  );

  // Autosave local com debounce de 2s
  useEffect(() => {
    if (!page) return;
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => save(true), 2000);
    return () => clearTimeout(timer);
  }, [page, nome, save]);

  const selectedNode = useMemo(
    () => (page && selectedId ? findNode(page, selectedId) : null),
    [page, selectedId],
  );
  const background = useMemo(
    () => (page && selectedId ? backgroundBehind(page, selectedId) : "#FFFFFF"),
    [page, selectedId],
  );

  function insertLeaf(leaf: Leaf) {
    setPage((current) => {
      if (!current) return current;
      const columnId = firstColumnId(current, selectedId);
      if (!columnId) return current;
      setSelectedId(leaf.id);
      return addLeaf(current, columnId, leaf);
    });
  }

  function insertRow(cols: number) {
    setPage((current) => {
      if (!current) return current;
      const sectionId =
        current.sections.find((section) =>
          section.id === selectedId ||
          section.children.some(
            (row) =>
              row.id === selectedId ||
              row.columns.some(
                (col) => col.id === selectedId || col.children.some((l) => l.id === selectedId),
              ),
          ),
        )?.id ?? current.sections[current.sections.length - 1]?.id;
      if (!sectionId) return current;
      const row = makeRow(cols);
      setSelectedId(row.id);
      return addRow(current, sectionId, row);
    });
  }

  if (!page) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </main>
    );
  }

  const code = exportHtml(page, nome);

  const blocks = [
    { label: "Seção", icon: LayoutPanelTop, action: () => setPage((p) => (p ? addSection(p, makeSection({ children: [makeRow(1)] })) : p)) },
    { label: "Linha (1 col.)", icon: Columns3, action: () => insertRow(1) },
    { label: "Linha (2 col.)", icon: Columns3, action: () => insertRow(2) },
    { label: "Linha (3 col.)", icon: Columns3, action: () => insertRow(3) },
    { label: "Texto", icon: TypeIcon, action: () => insertLeaf(makeText()) },
    { label: "Botão (CTA)", icon: MousePointerClick, action: () => insertLeaf(makeButton()) },
    { label: "Imagem", icon: ImageIcon, action: () => insertLeaf(makeImage()) },
    { label: "Card com ícone", icon: SquareStack, action: () => insertLeaf(makeCard()) },
    { label: "Vídeo (embed)", icon: VideoIcon, action: () => insertLeaf(makeVideo()) },
    { label: "Contagem regressiva", icon: Timer, action: () => insertLeaf(makeCountdown()) },
    { label: "Formulário RD Station", icon: FileCode2, action: () => insertLeaf(makeRdForm()) },
  ];

  return (
    <div className="flex h-screen flex-col bg-secondary">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-6 py-3">
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="size-4" aria-hidden /> Projetos
        </Button>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label="Nome do projeto"
          className="max-w-xs font-bold"
        />
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <Button
            size="sm"
            variant={mobile ? "ghost" : "default"}
            onClick={() => setMobile(false)}
            aria-pressed={!mobile}
          >
            <Monitor className="size-4" aria-hidden /> Desktop
          </Button>
          <Button
            size="sm"
            variant={mobile ? "default" : "ghost"}
            onClick={() => setMobile(true)}
            aria-pressed={mobile}
          >
            <Smartphone className="size-4" aria-hidden /> Mobile
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {savedAt ? `Salvo localmente às ${new Date(savedAt).toLocaleTimeString("pt-BR")}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
            <Upload className="size-4" aria-hidden /> Exportar
          </Button>
          <Button size="sm" onClick={() => save()}>
            <Save className="size-4" aria-hidden /> Salvar
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-border bg-card p-4">
          <h2 className="mb-3 text-xs font-bold tracking-wide uppercase text-muted-foreground">
            Biblioteca de blocos
          </h2>
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li key={block.label}>
                <button
                  type="button"
                  onClick={block.action}
                  className="flex w-full min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <block.icon className="size-4 shrink-0" aria-hidden />
                  {block.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-8">
          <Canvas
            page={page}
            selectedId={selectedId}
            onSelect={setSelectedId}
            mobile={mobile}
            onMove={(dragId, targetId, position, kind) =>
              setPage((current) =>
                current
                  ? kind === "row"
                    ? moveRow(current, dragId, targetId, position)
                    : moveLeaf(current, dragId, targetId, position)
                  : current,
              )
            }
          />
        </main>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-card">
          <PropertiesPanel
            node={selectedNode}
            background={background}
            cursor={page.cursor}
            onCursorChange={(patch) =>
              setPage((current) =>
                current
                  ? { ...current, cursor: { ...normalizeCursor(current.cursor), ...patch } }
                  : current,
              )
            }
            onChange={(patch) =>
              setPage((current) =>
                current && selectedId ? updateNode(current, selectedId, patch) : current,
              )
            }
            onDelete={() =>
              setPage((current) => {
                if (!current || !selectedId) return current;
                const next = removeNode(current, selectedId);
                setSelectedId(null);
                return next;
              })
            }
            onColumns={(count) =>
              setPage((current) =>
                current && selectedId ? setColumnCount(current, selectedId, count) : current,
              )
            }
          />
        </aside>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        code={code}
        nome={nome}
        issues={auditPage(page)}
      />
    </div>
  );
}