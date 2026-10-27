import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CaretLeft,
  Columns,
  Kanban,
  FileCode,
  Image as ImageIcon,
  SquareHalfBottom,
  SpinnerGap,
  Monitor,
  CursorClick,
  SidebarSimple,
  Rectangle,
  FloppyDisk,
  SlidersHorizontal,
  DeviceMobile,
  Cards,
  Timer,
  TextT,
  UploadSimple,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
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
  moveSibling,
  removeNode,
  setColumnCount,
  siblingInfo,
  updateNode,
} from "@/lib/gove/tree";
import type { Identity, Leaf, PageContent } from "@/lib/gove/types";
import {
  applyScheme,
  bbAudit,
  bbDefaults,
  bbHarmonize,
  containerContexts,
  isBB,
  rowSamples,
  sectionSamples,
  textContext,
  type BBContext,
} from "@/lib/gove/bb";
import { BBMode } from "@/lib/gove/bbMode";
import {
  BBStatus,
  IdentityToggle,
  LogoSettings,
  VoiceTips,
} from "@/components/gove/BBControls";

/** Identidade BB: toda alteração passa pelo ajuste automático (pares aprovados, paleta). */
const finalize = (p: PageContent) => (isBB(p) ? bbHarmonize(p) : p);

/** Fundo efetivo do item selecionado (contêiner do bloco, ou a própria seção/linha). */
function bbContainerFor(page: PageContent, id: string | null): BBContext | undefined {
  if (!id) return undefined;
  for (const section of page.sections) {
    if (section.id === id) return textContext(sectionSamples(section));
    for (const row of section.children) if (row.id === id) return textContext(rowSamples(section, row));
  }
  return containerContexts(page).get(id);
}

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

  function insertLeaf(raw: Leaf) {
    setPage((current) => {
      if (!current) return current;
      const leaf = isBB(current) ? bbDefaults(raw) : raw;
      const columnId = firstColumnId(current, selectedId);
      if (!columnId) return current;
      setSelectedId(leaf.id);
      return finalize(addLeaf(current, columnId, leaf));
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
      return finalize(addRow(current, sectionId, row));
    });
  }

  if (!page) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <SpinnerGap className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </main>
    );
  }

  const bb = isBB(page);
  const code = exportHtml(page, nome);
  const bbIssues = bb ? bbAudit(page) : [];
  // Na identidade BB o contraste é checado pela regra BB (4,5:1 sem exceção, pior caso em fotos).
  const issues = bb ? auditPage(page).filter((i) => i.rule !== "Contraste") : auditPage(page);
  const autoFix = () => {
    setPage((current) => (current ? bbHarmonize(current) : current));
    toast.success("Página ajustada à identidade BB.");
  };
  const setIdentity = (identity: Identity) => {
    if (identity === (page.identity ?? "gove")) return;
    setPage((current) => {
      if (!current) return current;
      if (identity === "bb") return bbHarmonize({ ...current, identity: "bb" });
      return { ...current, identity: "gove" };
    });
    toast.success(
      identity === "bb"
        ? "Identidade Banco do Brasil: cores, fontes e contraste ajustados."
        : "Identidade GOVE: as cores atuais foram mantidas.",
    );
  };
  const pageSettings = (
    <div className="space-y-4 border-b border-border p-6">
      <h2 className="text-[20px] font-bold">Página</h2>
      <IdentityToggle value={page.identity ?? "gove"} onChange={setIdentity} />
      {bb ? (
        <>
          <BBStatus issues={bbIssues} onAutoFix={autoFix} />
          <LogoSettings
            logo={page.bbLogo}
            onChange={(bbLogo) =>
              setPage((current) => {
                if (!current) return current;
                const next = { ...current };
                if (bbLogo) next.bbLogo = bbLogo;
                else delete next.bbLogo;
                return finalize(next);
              })
            }
          />
          <VoiceTips />
        </>
      ) : null}
    </div>
  );
  const at = selectedId ? siblingInfo(page, selectedId) : null;
  const move = (dir: -1 | 1) =>
    setPage((current) => (current && selectedId ? finalize(moveSibling(current, selectedId, dir)) : current));

  const blocks = [
    { label: "Seção", icon: SquareHalfBottom, action: () => setPage((p) => (p ? finalize(addSection(p, makeSection({ children: [makeRow(1)] }))) : p)) },
    { label: "Linha (1 col.)", icon: Rectangle, action: () => insertRow(1) },
    { label: "Linha (2 col.)", icon: Columns, action: () => insertRow(2) },
    { label: "Linha (3 col.)", icon: Kanban, action: () => insertRow(3) },
    { label: "Texto", icon: TextT, action: () => insertLeaf(makeText()) },
    { label: "Botão (CTA)", icon: CursorClick, action: () => insertLeaf(makeButton()) },
    { label: "Imagem", icon: ImageIcon, action: () => insertLeaf(makeImage()) },
    { label: "Card com ícone", icon: Cards, action: () => insertLeaf(makeCard()) },
    { label: "Vídeo (embed)", icon: VideoCamera, action: () => insertLeaf(makeVideo()) },
    { label: "Contagem regressiva", icon: Timer, action: () => insertLeaf(makeCountdown()) },
    { label: "Formulário RD Station", icon: FileCode, action: () => insertLeaf(makeRdForm()) },
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
          <CaretLeft className="!size-6" aria-hidden />
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
            <Monitor weight={!mobile ? "fill" : "regular"} aria-hidden />
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
            <DeviceMobile weight={mobile ? "fill" : "regular"} aria-hidden />
            <span className={`sr-only min-[900px]:not-sr-only`}>Mobile</span>
          </Button>
        </div>
        <span className={`hidden text-xs text-muted-foreground min-[900px]:inline`} aria-live="polite">
          {savedLabel}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1 min-[900px]:gap-2">
          {bb ? (
            <span
              className="hidden rounded-md px-2 py-1 text-xs font-bold min-[600px]:inline"
              style={{ backgroundColor: "#FCFC30", color: "#3333BD" }}
              title="Identidade Banco do Brasil"
            >
              BB
            </span>
          ) : null}
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
            <SidebarSimple mirrored weight={panelOpen ? "fill" : "regular"} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="iconTouch"
            onClick={() => setExportOpen(true)}
            aria-label="Exportar HTML"
            title="Exportar HTML"
          >
            <UploadSimple aria-hidden />
          </Button>
          <Button
            variant="cta"
            size="touch"
            className={`w-11 px-0 min-[900px]:w-auto min-[900px]:px-4`}
            onClick={() => save()}
            aria-label="Salvar"
            title={savedLabel || "Salvar"}
          >
            <FloppyDisk aria-hidden />
            <span className={`sr-only min-[900px]:not-sr-only`}>Salvar</span>
          </Button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          aria-label="Biblioteca de blocos"
          className={`w-16 shrink-0 overflow-y-auto border-r border-border bg-card p-2 min-[900px]:w-56 min-[900px]:p-4`}
        >
          {/* Configurações da página (identidade GOVE/BB, logomarca, cursor). */}
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              if (window.matchMedia("(max-width: 899.98px)").matches) setPanelOpen(true);
            }}
            aria-label="Configurações da página"
            title="Configurações da página"
            className={`mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-left text-sm font-semibold transition-colors hover:bg-secondary min-[900px]:mb-4 min-[900px]:justify-start min-[900px]:px-3`}
          >
            <SlidersHorizontal className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className={`sr-only min-[900px]:not-sr-only`}>Página{bb ? " · BB" : ""}</span>
          </button>
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
                  ? finalize(
                      kind === "row"
                        ? moveRow(current, dragId, targetId, position)
                        : moveLeaf(current, dragId, targetId, position),
                    )
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
          <BBMode.Provider value={bb}>
          <PropertiesPanel
            node={selectedNode}
            background={background}
            pageSettings={pageSettings}
            bbContainer={bb ? bbContainerFor(page, selectedId) : undefined}
            onApplyScheme={
              bb
                ? (scheme) =>
                    setPage((current) =>
                      current && selectedId ? applyScheme(current, selectedId, scheme) : current,
                    )
                : undefined
            }
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
                current && selectedId ? finalize(updateNode(current, selectedId, patch)) : current,
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
            onMoveUp={at && at.index > 0 ? () => move(-1) : undefined}
            onMoveDown={at && at.index < at.count - 1 ? () => move(1) : undefined}
            onColumns={(count) =>
              setPage((current) =>
                current && selectedId ? finalize(setColumnCount(current, selectedId, count)) : current,
              )
            }
          />
          </BBMode.Provider>
        </aside>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        code={code}
        nome={nome}
        issues={issues}
        bbIssues={bb ? bbIssues : undefined}
        onAutoFix={bb ? autoFix : undefined}
      />
    </div>
  );
}