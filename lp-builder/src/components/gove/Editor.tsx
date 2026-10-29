import { useNavigate } from "@tanstack/react-router";
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
  DeviceTablet,
  Cards,
  Timer,
  TextT,
  UploadSimple,
  VideoCamera,
  X,
  CloudArrowUp,
  SealCheck,
  ListChecks,
  ListDashes,
  Tag,
  ChartBar,
  Path,
  Question,
  CalendarBlank,
  UserCircle,
  Minus,
  AppWindow,
  Rows,
  BoundingBox,
  Slideshow,
  CalendarPlus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { getPage, getTemplate, publishTemplate, savePage, saveTemplate } from "@/lib/gove/storage";
import { hasUnpublishedChanges, type StoredTemplate } from "@/lib/gove/templates";
import { TARGET_FORM, pageHasForm, sectionLabel } from "@/lib/gove/anchors";
import { adaptColors } from "@/lib/gove/blockColors";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Canvas } from "@/components/gove/Canvas";
import { PageLayoutEditor, PropertiesPanel } from "@/components/gove/PropertiesPanel";
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
  makeBadge,
  makeList,
  makeInfoList,
  makeTags,
  makeStats,
  makeTimeline,
  makeFaq,
  makeDate,
  makePerson,
  makeDivider,
  makeHeaderSection,
  makeFooterSection,
  makeCalendarButton,
  makeCarousel,
  makeContainer,
} from "@/lib/gove/factories";
import { flatLeaves } from "@/lib/gove/leaves";
import {
  addLeaf,
  addRow,
  addSection,
  backgroundBehind,
  columnBackground,
  duplicateNode,
  findColumn,
  findNode,
  insertTargetId,
  moveLeaf,
  moveRow,
  moveSibling,
  removeNode,
  setColumnCount,
  siblingInfo,
  updateColumn,
  updateNode,
} from "@/lib/gove/tree";
import type { Identity, Leaf, NavLink, PageContent } from "@/lib/gove/types";
import type { Device } from "@/lib/gove/styleRules";
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

/** O editor serve a landing pages e a modelos (mesmos blocos; modelos não exportam). */
export type EditorKind = "page" | "template";

/** Modos de visualização do canvas (o tablet aplica as regras de até 980px). */
const DEVICES: { value: Device; label: string; Icon: typeof Monitor }[] = [
  { value: "desktop", label: "Computador", Icon: Monitor },
  { value: "tablet", label: "Tablet", Icon: DeviceTablet },
  { value: "mobile", label: "Celular", Icon: DeviceMobile },
];

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

/** Editor de landing page — também usado para editar modelos (`kind="template"`). */
export function Editor({ kind, id }: { kind: EditorKind; id: string }) {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [page, setPage] = useState<PageContent | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  // Abaixo de 900px o painel de propriedades vira uma gaveta (divulgação progressiva).
  const [panelOpen, setPanelOpen] = useState(false);
  const skipAutosave = useRef(true);
  const isTemplate = kind === "template";
  // Modelo: descrição e estado de publicação.
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<StoredTemplate | null>(null);
  const goBack = () =>
    isTemplate ? navigate({ to: "/", search: { aba: "modelos" } }) : navigate({ to: "/" });

  // Carrega do armazenamento local do navegador (sem backend).
  useEffect(() => {
    if (kind !== "template") return;
    const stored = getTemplate(id);
    if (!stored) {
      toast.error("Modelo não encontrado.");
      navigate({ to: "/", search: { aba: "modelos" } });
      return;
    }
    setNome(stored.name);
    setDescription(stored.description ?? "");
    setTemplate(stored);
    setPage(stored.doc);
    setSavedAt(stored.updatedAt);
    skipAutosave.current = true;
  }, [kind, id, navigate]);

  useEffect(() => {
    if (kind !== "page") return;
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
  }, [kind, id, navigate]);

  const save = useCallback(
    (silent = false) => {
      if (!page) return;
      if (isTemplate) {
        saveTemplate(id, { name: nome, description: description.trim(), doc: page });
        setSavedAt(new Date().toISOString());
        if (!silent) toast.success("Modelo salvo. Publique para o time usar esta versão.");
        return;
      }
      savePage(id, { nome, conteudo: page });
      setSavedAt(new Date().toISOString());
      if (!silent) toast.success("Landing page salva neste navegador.");
    },
    [id, nome, page, isTemplate, description],
  );

  /** Modelo: salva e publica o rascunho atual (novas páginas passam a copiar esta versão). */
  const publish = () => {
    if (!page) return;
    save(true);
    const first = template?.status !== "publicado";
    if (!publishTemplate(id)) return;
    setTemplate(getTemplate(id));
    toast.success(
      first
        ? "Modelo publicado: o time já pode criar landing pages a partir dele."
        : "Publicação atualizada: as próximas landing pages usam esta versão. As já criadas não mudam.",
    );
  };

  // Autosave local com debounce de 2s
  useEffect(() => {
    if (!page) return;
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => save(true), 2000);
    return () => clearTimeout(timer);
  }, [page, nome, description, save]);

  const selectedNode = useMemo(
    () => (page && selectedId ? findNode(page, selectedId) : null),
    [page, selectedId],
  );
  // Coluna selecionada (clique no espaço da coluna): fundo, borda e alinhamento próprios.
  const selectedColumn = useMemo(
    () => (page && selectedId && !selectedNode ? findColumn(page, selectedId) : null),
    [page, selectedId, selectedNode],
  );
  const background = useMemo(
    () => (page && selectedId ? backgroundBehind(page, selectedId) : "#FFFFFF"),
    [page, selectedId],
  );

  function insertLeaf(raw: Leaf) {
    setPage((current) => {
      if (!current) return current;
      // Botão novo numa página com formulário: por padrão leva ao formulário de inscrição.
      const linked: Leaf =
        raw.type === "button" && raw.linkMode !== "calendar" && pageHasForm(current)
          ? { ...raw, linkMode: "section", target: TARGET_FORM }
          : raw;
      // Na caixa selecionada (ou na caixa do bloco selecionado), se couber; senão na coluna.
      const columnId = insertTargetId(current, selectedId, linked);
      if (!columnId) return current;
      // Blocos novos (GOVE): cores-padrão que leem sobre o fundo da coluna (ou da caixa) onde entram.
      const leaf = isBB(current) ? bbDefaults(linked) : adaptColors(linked, columnBackground(current, columnId));
      setSelectedId(leaf.id);
      return finalize(addLeaf(current, columnId, leaf));
    });
  }

  /** Links para as seções de conteúdo (sem o topo nem o cabeçalho), até 4. */
  function sectionLinks(current: PageContent): NavLink[] {
    const sections = current.sections.filter((s) => s.role !== "header");
    return sections.slice(1, 5).map((section) => ({
      label: sectionLabel(current, section).replace(/^\d+\.\s*/, ""),
      target: section.id,
    }));
  }

  /** Cabeçalho com menu: só um por página, sempre no topo. */
  function insertHeader() {
    if (!page) return;
    const existing = page.sections.find((s) => s.role === "header");
    if (existing) {
      setSelectedId(existing.id);
      toast.info("A página já tem um cabeçalho (só um por página, sempre no topo).");
      return;
    }
    const section = makeHeaderSection(sectionLinks(page));
    setSelectedId(section.children[0]?.columns[0]?.children[0]?.id ?? section.id);
    setPage((current) => (current ? finalize(addSection(current, section)) : current));
  }

  /** Rodapé: nova seção no fim da página (fundo Noite). */
  function insertFooter() {
    if (!page) return;
    const section = makeFooterSection(sectionLinks(page));
    setSelectedId(section.children[0]?.columns[0]?.children[0]?.id ?? section.id);
    setPage((current) => (current ? finalize(addSection(current, section)) : current));
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
                (col) => col.id === selectedId || flatLeaves(col.children).some((l) => l.id === selectedId),
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
  // Modelo: o rascunho difere do que está publicado?
  const published = template?.status === "publicado";
  const dirty = !!template && published && hasUnpublishedChanges({ ...template, doc: page });
  const status = !template ? null : !published ? "Rascunho" : dirty ? "Alterações não publicadas" : "Publicado";
  const pageSettings = (
    <div className="space-y-4 border-b border-border p-6">
      {isTemplate ? (
        <div className="space-y-3 rounded-xl bg-secondary p-4">
          <p className="text-sm font-bold">Modelo · {status}</p>
          <p className="text-xs text-muted-foreground">
            {published
              ? `Publicado em ${new Date(template?.publishedAt ?? "").toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Novas landing pages copiam a versão publicada; as já criadas não mudam.`
              : "Rascunho: o time só vê este modelo em “Nova Landing Page” depois de publicado."}
          </p>
          <div className="space-y-2">
            <Label htmlFor="descricao-modelo" className="text-xs font-bold tracking-wide uppercase">
              Descrição do modelo
            </Label>
            <Textarea
              id="descricao-modelo"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quando usar este modelo (ex.: captura para webinar)."
            />
          </div>
        </div>
      ) : null}
      <h2 className="text-[20px] font-bold">Página</h2>
      <IdentityToggle value={page.identity ?? "gove"} onChange={setIdentity} />
      <PageLayoutEditor
        layout={page.layout}
        onChange={(layout) =>
          setPage((current) => {
            if (!current) return current;
            const next = { ...current };
            if (layout) next.layout = layout;
            else delete next.layout;
            return next;
          })
        }
      />
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
    { label: "Cabeçalho com menu", icon: AppWindow, action: insertHeader },
    { label: "Selo", icon: SealCheck, action: () => insertLeaf(makeBadge()) },
    { label: "Lista", icon: ListChecks, action: () => insertLeaf(makeList()) },
    { label: "Lista de informações", icon: ListDashes, action: () => insertLeaf(makeInfoList()) },
    { label: "Etiquetas", icon: Tag, action: () => insertLeaf(makeTags()) },
    { label: "Estatísticas", icon: ChartBar, action: () => insertLeaf(makeStats()) },
    { label: "Linha do tempo (cronograma)", icon: Path, action: () => insertLeaf(makeTimeline()) },
    { label: "Perguntas frequentes", icon: Question, action: () => insertLeaf(makeFaq()) },
    { label: "Bloco de data", icon: CalendarBlank, action: () => insertLeaf(makeDate()) },
    { label: "Card de pessoa", icon: UserCircle, action: () => insertLeaf(makePerson()) },
    { label: "Divisória / espaçador", icon: Minus, action: () => insertLeaf(makeDivider()) },
    { label: "Caixa", icon: BoundingBox, action: () => insertLeaf(makeContainer()) },
    { label: "Carrossel", icon: Slideshow, action: () => insertLeaf(makeCarousel()) },
    { label: "Adicionar à agenda", icon: CalendarPlus, action: () => insertLeaf(makeCalendarButton()) },
    { label: "Rodapé", icon: Rows, action: insertFooter },
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
          onClick={goBack}
          aria-label={isTemplate ? "Voltar para Modelos" : "Voltar para Projetos"}
          title={isTemplate ? "Voltar para Modelos" : "Voltar para Projetos"}
        >
          <CaretLeft className="!size-6" aria-hidden />
        </Button>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={isTemplate ? "Nome do modelo" : "Nome do projeto"}
          className="min-h-11 min-w-0 max-w-xs flex-1 rounded-xl font-bold"
        />
        <div className="flex shrink-0 gap-0.5 rounded-xl bg-secondary p-0.5" role="group" aria-label="Visualização">
          {DEVICES.map(({ value, label, Icon }) => (
            <Button
              key={value}
              variant="ghost"
              className={segment(device === value)}
              onClick={() => setDevice(value)}
              aria-pressed={device === value}
              aria-label={label}
              title={label}
            >
              <Icon weight={device === value ? "fill" : "regular"} aria-hidden />
              <span className={`sr-only min-[900px]:not-sr-only`}>{label}</span>
            </Button>
          ))}
        </div>
        <span className={`hidden text-xs text-muted-foreground min-[900px]:inline`} aria-live="polite">
          {savedLabel}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1 min-[900px]:gap-2">
          {status ? (
            <span
              className={`hidden rounded-md px-2 py-1 text-xs font-bold min-[600px]:inline ${
                published && !dirty ? "bg-[#1E7A46]/12 text-[#1E7A46] dark:bg-[#75E0A7]/15 dark:text-[#75E0A7]" : "bg-secondary text-foreground"
              }`}
              title="Situação do modelo"
            >
              {status}
            </span>
          ) : null}
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
          {isTemplate ? (
            <Button
              variant="outline"
              size="touch"
              className="relative w-11 px-0 min-[900px]:w-auto min-[900px]:px-4"
              onClick={publish}
              disabled={published && !dirty}
              aria-label={published ? "Atualizar publicação" : "Publicar modelo"}
              title={published ? (dirty ? "Atualizar publicação" : "Publicado — sem alterações") : "Publicar modelo"}
            >
              <CloudArrowUp aria-hidden />
              <span className="sr-only min-[900px]:not-sr-only">
                {published ? "Atualizar publicação" : "Publicar modelo"}
              </span>
              {dirty || !published ? (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#FFC72C] ring-2 ring-background min-[900px]:hidden"
                />
              ) : null}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="iconTouch"
              onClick={() => setExportOpen(true)}
              aria-label="Exportar HTML"
              title="Exportar HTML"
            >
              <UploadSimple aria-hidden />
            </Button>
          )}
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
            device={device}
            onMove={(dragId, targetId, position, kind) =>
              setPage((current) =>
                current
                  ? finalize(
                      kind === "row"
                        ? moveRow(current, dragId, targetId, position === "inside" ? "after" : position)
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
            column={selectedColumn}
            onColumnChange={(patch) =>
              setPage((current) => (current && selectedId ? finalize(updateColumn(current, selectedId, patch)) : current))
            }
            onSelect={setSelectedId}
            onDuplicate={
              selectedNode
                ? () =>
                    setPage((current) => {
                      if (!current || !selectedId) return current;
                      const { page: next, id: copy } = duplicateNode(current, selectedId);
                      if (copy) {
                        setSelectedId(copy);
                        toast.success("Cópia criada logo abaixo.");
                      }
                      return finalize(next);
                    })
                : undefined
            }
            background={background}
            pageSettings={pageSettings}
            page={page}
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

      {isTemplate ? null : (
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        code={code}
        nome={nome}
        issues={issues}
        bbIssues={bb ? bbIssues : undefined}
        onAutoFix={bb ? autoFix : undefined}
      />
      )}
    </div>
  );
}