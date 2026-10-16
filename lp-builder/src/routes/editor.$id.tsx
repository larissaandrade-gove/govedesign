import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Columns2,
  Columns3,
  FileCode2,
  Image as ImageIcon,
  LayoutPanelTop,
  Loader2,
  Monitor,
  MousePointerClick,
  PanelRight,
  RectangleHorizontal,
  Save,
  Smartphone,
  SquareStack,
  Timer,
  Type as TypeIcon,
  Upload,
  Video as VideoIcon,
  X,
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
  // Abaixo de 900px o painel de propriedades vira uma gaveta (divulgação progressiva).
  const [panelOpen, setPanelOpen] = useState(false);
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
    { label: "Linha (1 col.)", icon: RectangleHorizontal, action: () => insertRow(1) },
    { label: "Linha (2 col.)", icon: Columns2, action: () => insertRow(2) },
    { label: "Linha (3 col.)", icon: Columns3, action: () => insertRow(3) },
    { label: "Texto", icon: TypeIcon, action: () => insertLeaf(makeText()) },
    { label: "Botão (CTA)", icon: MousePointerClick, action: () => insertLeaf(makeButton()) },
    { label: "Imagem", icon: ImageIcon, action: () => insertLeaf(makeImage()) },
    { label: "Card com ícone", icon: SquareStack, action: () => insertLeaf(makeCard()) },
    { label: "Vídeo (embed)", icon: VideoIcon, action: () => insertLeaf(makeVideo()) },
    { label: "Contagem regressiva", icon: Timer, action: () => insertLeaf(makeCountdown()) },
    { label: "Formulário RD Station", icon: FileCode2, action: () => insertLeaf(makeRdForm()) },
  ];

  const savedLabel = savedAt
    ? `Salvo localmente às ${new Date(savedAt).toLocaleTimeString("pt-BR")}`
    : "";
  const segment = (active: boolean) =>
    `min-h-11 min-w-11 rounded-lg px-2.5 min-[900px]:px-3 ${
      active ? "bg-card text-foreground shadow-sm hover:bg-card" : "text-muted-foreground"
    }`;

  return (
    <div className="flex h-screen flex-col bg-secondary">
      <header className="flex items-center gap-2 border-b border-border bg-card px-2 py-2 min-[900px]:gap-3 min-[900px]:px-4">
        <Button
          variant="ghost"
          size="iconTouch"
          onClick={() => navigate({ to: "/" })}
          aria-label="Voltar para Projetos"
          title="Voltar para Projetos"
        >
          <ChevronLeft className="!size-6" aria-hidden />
        </Button>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label="Nome do projeto"
          className="min-h-11 min-w-0 max-w-xs flex-1 rounded-xl font-bold"
        />
        <div className="flex shrink-0 gap-0.5 rounded-xl bg-secondary p-0.5" role="group" aria-label="Visualização">
          <Button
            variant="ghost"
            className={segment(!mobile)}
            onClick={() => setMobile(false)}
            aria-pressed={!mobile}
            aria-label="Desktop"
            title="Desktop"
          >
            <Monitor aria-hidden />
            <span className={`sr-only min-[900px]:not-sr-only`}>Desktop</span>
          </Button>
          <Button
            variant="ghost"
            className={segment(mobile)}
            onClick={() => setMobile(true)}
            aria-pressed={mobile}
            aria-label="Mobile"
            title="Mobile"
          >
            <Smartphone aria-hidden />
            <span className={`sr-only min-[900px]:not-sr-only`}>Mobile</span>
          </Button>
        </div>
        <span className={`hidden text-xs text-muted-foreground min-[900px]:inline`} aria-live="polite">
          {savedLabel}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1 min-[900px]:gap-2">
          <Button
            variant="ghost"
            size="iconTouch"
            className={`min-[900px]:hidden`}
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-controls="painel-propriedades"
            aria-label="Propriedades"
            title="Propriedades"
          >
            <PanelRight aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="iconTouch"
            onClick={() => setExportOpen(true)}
            aria-label="Exportar HTML"
            title="Exportar HTML"
          >
            <Upload aria-hidden />
          </Button>
          <Button
            variant="cta"
            size="touch"
            className={`w-11 px-0 min-[900px]:w-auto min-[900px]:px-4`}
            onClick={() => save()}
            aria-label="Salvar"
            title={savedLabel || "Salvar"}
          >
            <Save aria-hidden />
            <span className={`sr-only min-[900px]:not-sr-only`}>Salvar</span>
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          aria-label="Biblioteca de blocos"
          className={`w-16 shrink-0 overflow-y-auto border-r border-border bg-card p-2 min-[900px]:w-56 min-[900px]:p-4`}
        >
          <h2 className={`sr-only min-[900px]:not-sr-only min-[900px]:mb-3 min-[900px]:block text-xs font-bold tracking-wide uppercase text-muted-foreground`}>
            Biblioteca de blocos
          </h2>
          <ul className="space-y-1.5">
            {blocks.map((block) => (
              <li key={block.label}>
                <button
                  type="button"
                  onClick={block.action}
                  aria-label={block.label}
                  title={block.label}
                  className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-left text-sm transition-colors hover:bg-secondary min-[900px]:justify-start min-[900px]:px-3`}
                >
                  <block.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className={`sr-only min-[900px]:not-sr-only`}>{block.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-3 min-[900px]:p-8">
          <Canvas
            page={page}
            selectedId={selectedId}
            onSelect={(nodeId) => {
              setSelectedId(nodeId);
              if (nodeId && window.matchMedia("(max-width: 899.98px)").matches) setPanelOpen(true);
            }}
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

        {panelOpen ? (
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setPanelOpen(false)}
            className={`absolute inset-0 z-20 bg-black/30 min-[900px]:hidden`}
          />
        ) : null}
        <aside
          id="painel-propriedades"
          aria-label="Propriedades"
          className={`${panelOpen ? "flex" : "hidden"} absolute inset-y-0 right-0 z-30 w-[min(20rem,100%)] flex-col overflow-y-auto border-l border-border bg-card shadow-xl min-[900px]:static min-[900px]:flex min-[900px]:w-80 min-[900px]:shrink-0 min-[900px]:shadow-none`}
        >
          <div className={`sticky top-0 z-10 flex justify-end bg-card p-1 min-[900px]:hidden`}>
            <Button
              variant="ghost"
              size="iconTouch"
              onClick={() => setPanelOpen(false)}
              aria-label="Fechar propriedades"
              title="Fechar"
            >
              <X aria-hidden />
            </Button>
          </div>
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