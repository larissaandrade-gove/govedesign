import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Check,
  Download,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Moon,
  Palette,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  TriangleAlert,
  Type,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { PALETTE, validateCreative, type ComplianceReport } from "@/lib/creative/brand";
import {
  ALL_LOGO_VARIANTS,
  LOGO_VARIANTS,
  explainVariants,
  loadLogoLibrary,
  type LogoLibrary,
  type LogoRender,
  type LogoVariantId,
} from "@/lib/creative/logos";
import { LogoVariantPicker } from "@/components/LogoVariantPicker";
import { ICONS } from "@/lib/creative/icons";
import { buildAltText } from "@/lib/creative/alt";
import { getGateStatus } from "@/lib/gate.functions";
import { ExpertFields } from "@/components/ExpertFields";
import { AppHeader, FormatChip, Section } from "@/components/AppChrome";
import { searchPexels, type PexelsPhoto } from "@/lib/pexels.functions";
import {
  BG_PRESETS,
  STUDIO_LAYOUTS,
  EXPERT_LAYOUTS,
  EMPTY_EXPERT,
  expertReady,
  isExpertLayout,
  type ExpertMaterial,
  FORMATS,
  SCHEMES,
  formatSize,
  loadImageFromFile,
  loadImageFromUrl,
  renderCreative,
  type CreativeFormat,
  type CreativeLayout,
  type CreativeScheme,
  type CreativeSpec,
} from "@/lib/creative/renderer";

export const Route = createFileRoute("/studio")({
  ssr: false,
  beforeLoad: async () => {
    const { unlocked } = await getGateStatus();
    if (!unlocked) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Studio ao vivo | Criativos GOVE" },
      {
        name: "description",
        content:
          "Editor ao vivo de criativos GOVE: biblioteca de fundos institucionais, 8 diagramações fixas, remix de artes prontas e download PNG em Feed 4:5, Quadrado, Story 9:16 ou LinkedIn 1.91:1.",
      },
      { property: "og:title", content: "Studio ao vivo | Criativos GOVE" },
      {
        property: "og:description",
        content:
          "Edite fundo, diagramação e textos com prévia instantânea no canvas e exporte nos formatos de mídia paga GOVE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

type Bg = { kind: "preset"; key: string } | { kind: "upload"; img: HTMLImageElement; name: string };

/** Miniatura esquemática de cada diagramação (apenas ilustrativa). */
function LayoutThumb({ layout }: { layout: CreativeLayout }) {
  const bar = (cls: string) => <span className={`block rounded-[2px] ${cls}`} />;
  const gold = "bg-[#FFC72C]";
  const ink = "bg-white/85";
  const soft = "bg-white/35";
  return (
    <span className="flex h-14 w-full flex-col justify-between overflow-hidden rounded-md bg-[#3D0099] p-1.5">
      {layout === "mockup-center-top" && (
        <>
          <span className="space-y-0.5">
            {bar(`h-1 w-3/4 ${ink}`)}
            {bar(`h-0.5 w-1/2 ${soft}`)}
          </span>
          <span className="mx-auto h-5 w-2/3 rounded-[3px] bg-white/80" />
          {bar(`h-1.5 w-1/2 ${gold}`)}
        </>
      )}
      {layout === "mockup-left" && (
        <span className="flex h-full gap-1">
          <span className="h-full w-1/2 rounded-[3px] bg-white/80" />
          <span className="flex w-1/2 flex-col justify-center gap-0.5">
            {bar(`h-1 w-full ${ink}`)}
            {bar(`h-0.5 w-2/3 ${soft}`)}
            {bar(`mt-1 h-1.5 w-3/4 ${gold}`)}
          </span>
        </span>
      )}
      {layout === "person-bottom" && (
        <>
          <span className="h-4 w-full rounded-[3px] bg-white/25" />
          <span className="space-y-0.5 rounded-[3px] bg-[#20133D] p-1">
            {bar(`h-1 w-3/4 ${ink}`)}
            {bar(`h-0.5 w-1/2 ${soft}`)}
          </span>
          {bar(`h-1.5 w-1/2 ${gold}`)}
        </>
      )}
      {layout === "stat-hero" && (
        <>
          <span className={`mx-auto text-[18px] font-bold leading-none text-[#FFC72C]`}>92%</span>
          <span className="space-y-0.5">
            {bar(`h-1 w-3/4 ${ink}`)}
            {bar(`h-0.5 w-1/2 ${soft}`)}
          </span>
          {bar(`h-1.5 w-1/2 ${gold}`)}
        </>
      )}
      {layout === "quote-split" && (
        <span className="flex h-full gap-1">
          <span className="flex w-1/2 flex-col justify-center gap-0.5 rounded-[3px] bg-[#20133D] p-1">
            <span className="text-[12px] leading-none text-[#FFC72C]">“</span>
            {bar(`h-1 w-full ${ink}`)}
            {bar(`h-1.5 w-3/4 ${gold}`)}
          </span>
          <span className="flex w-1/2 flex-col justify-center gap-0.5">
            {bar(`h-0.5 w-full ${soft}`)}
            {bar(`h-0.5 w-2/3 ${soft}`)}
          </span>
        </span>
      )}
      {layout === "before-after" && (
        <>
          <span className="flex gap-1">
            <span className="h-6 w-1/2 rounded-[3px] bg-white/25" />
            <span className="h-6 w-1/2 rounded-[3px] bg-white/80" />
          </span>
          {bar(`h-1 w-3/4 ${ink}`)}
          {bar(`h-1.5 w-1/2 ${gold}`)}
        </>
      )}
      {layout === "full-bleed" && (
        <span className="flex h-full flex-col items-center justify-center gap-0.5">
          {bar(`h-1 w-3/4 ${ink}`)}
          {bar(`h-1 w-2/3 ${ink}`)}
          {bar(`h-0.5 w-1/2 ${soft}`)}
          {bar(`mt-1 h-1.5 w-1/2 ${gold}`)}
        </span>
      )}
      {isExpertLayout(layout) && (
        <>
          <span className="flex items-center gap-1">
            <span className="size-4 shrink-0 rounded-full bg-white/85" />
            <span className="flex-1 space-y-0.5">
              {bar(`h-0.5 w-3/4 ${ink}`)}
              {bar(`h-0.5 w-1/2 ${soft}`)}
            </span>
          </span>
          <span
            className={`space-y-0.5 p-1 ${layout === "expert-band" ? "-mx-1.5 bg-[#20133D]" : "rounded-[3px] bg-[#20133D]"}`}
          >
            {bar(`h-1 w-3/4 ${ink}`)}
            {bar(`h-0.5 w-1/2 ${soft}`)}
          </span>
          {bar(`h-1.5 w-1/2 ${gold}`)}
        </>
      )}
      {layout === "proof-badge" && (
        <>
          <span className="mx-auto h-3 w-2/3 rounded-full bg-[#FFC72C]" />
          <span className="space-y-0.5">
            {bar(`h-1 w-3/4 ${ink}`)}
            {bar(`h-0.5 w-1/2 ${soft}`)}
          </span>
          {bar(`h-1.5 w-1/2 ${gold}`)}
        </>
      )}
    </span>
  );
}

const EXPORTS: { key: CreativeFormat; label: string; w: number; h: number }[] = FORMATS.map(
  (f) => ({
    key: f.key,
    label: f.label,
    w: f.w,
    h: f.h,
  }),
);

function Studio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [library, setLibrary] = useState<LogoLibrary | null>(null);
  const [logoVariants, setLogoVariants] = useState<LogoVariantId[]>(ALL_LOGO_VARIANTS);
  const [logoResult, setLogoResult] = useState<LogoRender | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<{ img: HTMLImageElement; name: string } | null>(null);

  // Busca Pexels (terceira origem de fundo)
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<PexelsPhoto[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [exportFormat, setExportFormat] = useState<CreativeFormat>("square-11");
  const [layout, setLayout] = useState<CreativeLayout>("mockup-center-top");
  const [scheme, setScheme] = useState<CreativeScheme>("institucional");
  const [bg, setBg] = useState<Bg>({ kind: "preset", key: "vivid-deep" });
  const [tone, setTone] = useState<"light" | "dark">("dark");
  const [remix, setRemix] = useState(false);
  // Divulgação progressiva: textos e diagramação abertos; fundo e cores recolhidos.
  const [open, setOpen] = useState({
    texts: true,
    layout: true,
    background: false,
    logo: false,
    colors: false,
  });

  const [headline, setHeadline] = useState("O governo que age antes de você pedir");
  const [subhead, setSubhead] = useState(
    "Centralize demandas do cidadão em um só painel e responda mais rápido.",
  );
  const [cta, setCta] = useState("Agende uma demonstração");
  const [badge, setBadge] = useState("Case Divinópolis");
  const [token, setToken] = useState("Divinópolis/MG");
  const [urgency, setUrgency] = useState("Vagas limitadas");
  const [icon, setIcon] = useState("arrow");
  const [themeIcon, setThemeIcon] = useState("clock");
  const [cardColor, setCardColor] = useState<string>(PALETTE.purple3);
  const [expert, setExpert] = useState<ExpertMaterial>(EMPTY_EXPERT);
  const onExpertChange = (e: ExpertMaterial) => {
    setExpert(e);
    if (e.enabled && !isExpertLayout(layout)) setLayout("expert-card");
    if (!e.enabled && isExpertLayout(layout)) setLayout("mockup-center-top");
  };
  const expertBlocked = expert.enabled && !expertReady(expert);

  useEffect(() => {
    let alive = true;
    loadLogoLibrary()
      .then((lib) => {
        if (alive) setLibrary(lib);
      })
      .catch(() => {
        if (alive) toast.error("Não foi possível carregar os wordmarks.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const spec: CreativeSpec = useMemo(() => {
    const preset = bg.kind === "preset" ? BG_PRESETS.find((p) => p.key === bg.key) : undefined;
    return {
      format: exportFormat,
      layout,
      scheme,
      headline,
      subhead,
      cta,
      badge,
      token: token || undefined,
      urgency: urgency || undefined,
      icon,
      themeIcon,
      bgColor: preset?.colors[1] ?? PALETTE.purple3,
      bgPreset: preset?.key,
      cardColor,
      background: bg.kind === "upload" ? bg.img : null,
      bgTone: bg.kind === "upload" ? tone : undefined,
      remix: bg.kind === "upload" ? remix : undefined,
      logos: library,
      logoVariants,
      expert: expert.enabled ? expert : null,
    };
  }, [
    bg,
    exportFormat,
    layout,
    scheme,
    headline,
    subhead,
    cta,
    badge,
    token,
    urgency,
    icon,
    themeIcon,
    cardColor,
    tone,
    remix,
    library,
    logoVariants,
    expert,
  ]);

  // Prévia ao vivo: qualquer mudança de estado redesenha o canvas imediatamente.
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const result = renderCreative(canvas, spec);
      setLogoResult(result.logo);
      setReport(
        validateCreative({
          logoIsWordmark: true,
          usedColors: result.usedColors,
          textColor: result.textColor,
          textBackgroundColor: result.textBackgroundColor,
          ctaText: spec.cta,
          headline: spec.headline,
          subhead: spec.subhead,
          logo: result.logo,
        }),
      );
    };
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(draw).catch(draw);
    } else {
      draw();
    }
  }, [spec]);

  const handleFiles = useCallback(async (files: FileList | File[] | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const img = await loadImageFromFile(file);
      setPending({ img, name: file.name });
    } catch {
      toast.error("Falha ao carregar a imagem.");
    }
  }, []);

  // Debounce de 500ms na busca Pexels.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setPhotos(null);
      setSearchError(null);
      setSearching(false);
      return;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      searchPexels({ data: { query: term } })
        .then((res) => {
          if (!alive) return;
          setPhotos(res.photos);
          setSearchError(null);
        })
        .catch(() => {
          if (!alive) return;
          setPhotos(null);
          setSearchError(
            "Busca de imagens indisponível no momento. Use um upload ou os fundos pré-definidos.",
          );
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  const usePexelsPhoto = async (photo: PexelsPhoto) => {
    try {
      const img = await loadImageFromUrl(photo.large2x);
      setBg({ kind: "upload", img, name: photo.alt || `Pexels #${photo.id}` });
      setTone("dark");
    } catch {
      toast.error("Não foi possível carregar essa imagem.");
    }
  };

  const download = () => {
    if (expertBlocked) {
      toast.error("Preencha nome e sobrenome, cargo e foto do especialista.");
      return;
    }
    if (!report?.pass) {
      toast.error("Ajuste os pontos do manual de marca antes de exportar.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gove-studio-${canvas.width}x${canvas.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PNG exportado em alta resolução.");
    }, "image/png");
  };

  const copyAlt = async () => {
    await navigator.clipboard.writeText(buildAltText(spec));
    toast.success("Texto alternativo copiado.");
  };

  const size = formatSize(exportFormat);
  const failing =
    report && !report.pass
      ? report.checks
          .filter((c) => !c.pass)
          .map((c) => c.label)
          .join(" · ")
      : "";
  const logoStatuses = useMemo(() => explainVariants(logoResult?.bgLums ?? null), [logoResult]);
  const toggleSection = (k: keyof typeof open) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <AppHeader />

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[1fr_380px]">
        {/* Canvas em destaque */}
        <section aria-label="Prévia" className="order-1 min-w-0">
          <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4 lg:sticky lg:top-20">
            <div className="mx-auto max-w-[520px]">
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg border border-border"
                aria-label="Prévia do criativo"
              />
            </div>
            <div
              role="group"
              aria-label="Formato de exportação"
              className="flex flex-wrap justify-center gap-2"
            >
              {EXPORTS.map((f) => (
                <FormatChip
                  key={f.key}
                  format={f.key}
                  label={f.label}
                  w={f.w}
                  h={f.h}
                  active={exportFormat === f.key}
                  onSelect={() => setExportFormat(f.key)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 text-xs tabular-nums text-muted-foreground">
                {size.w}×{size.h}px · 72 dpi
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                onClick={copyAlt}
                aria-label="Copiar texto alternativo"
                title="Copiar texto alternativo (alt)"
              >
                <Type aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                className="min-h-11 px-5"
                onClick={download}
                disabled={!report?.pass || expertBlocked}
              >
                <Download aria-hidden="true" />
                Baixar PNG
              </Button>
            </div>

            {report && (
              <p
                role="status"
                className={`flex items-center gap-2 text-xs ${report.pass ? "text-emerald-700" : "text-amber-700"}`}
              >
                {report.pass ? (
                  <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                )}
                {report.pass ? "Conforme com o manual de marca" : failing}
              </p>
            )}
          </div>
        </section>

        {/* Controles */}
        <aside aria-label="Ajustes" className="order-2 space-y-3">
          <Section
            icon={Type}
            title="Textos"
            open={open.texts}
            onToggle={() => toggleSection("texts")}
          >
            <div className="relative">
              <Input
                value={headline}
                maxLength={60}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Headline"
                aria-label="Headline (máx. 60 caracteres)"
                className="h-11 pr-14"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
                {headline.length}/60
              </span>
            </div>
            <div className="relative">
              <Input
                value={subhead}
                maxLength={90}
                onChange={(e) => setSubhead(e.target.value)}
                placeholder="Subhead"
                aria-label="Subhead (máx. 90 caracteres)"
                className="h-11 pr-14"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
                {subhead.length}/90
              </span>
            </div>
            <Input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="CTA"
              aria-label="CTA"
              className="h-11"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Selo"
                aria-label="Selo"
                className="h-11"
              />
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token regional"
                aria-label="Token regional"
                className="h-11"
              />
            </div>
            <Input
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              placeholder="Gatilho de urgência"
              aria-label="Gatilho de urgência"
              className="h-11"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="studio-cta-icon" className="text-xs">
                  Ícone do CTA
                </Label>
                <select
                  id="studio-cta-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="mt-1 h-11 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground"
                >
                  {ICONS.map((i) => (
                    <option key={i.key} value={i.key}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="studio-urgency-icon" className="text-xs">
                  Ícone de urgência
                </Label>
                <select
                  id="studio-urgency-icon"
                  value={themeIcon}
                  onChange={(e) => setThemeIcon(e.target.value)}
                  className="mt-1 h-11 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground"
                >
                  {ICONS.map((i) => (
                    <option key={i.key} value={i.key}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          <ExpertFields value={expert} onChange={onExpertChange} />

          <Section
            icon={LayoutTemplate}
            title="Diagramação"
            summary={
              (expert.enabled ? EXPERT_LAYOUTS : STUDIO_LAYOUTS).find((l) => l.key === layout)
                ?.label
            }
            open={open.layout}
            onToggle={() => toggleSection("layout")}
          >
            <div role="radiogroup" aria-label="Diagramação" className="grid grid-cols-4 gap-2">
              {(expert.enabled ? EXPERT_LAYOUTS : STUDIO_LAYOUTS).map((l) => (
                <button
                  key={l.key}
                  type="button"
                  role="radio"
                  aria-checked={layout === l.key}
                  title={`${l.label} — ${l.hint}`}
                  onClick={() => setLayout(l.key)}
                  className={`rounded-lg border-2 p-1 ${
                    layout === l.key ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                >
                  <LayoutThumb layout={l.key} />
                  <span className="sr-only">{l.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section
            icon={ImagePlus}
            title="Fundo"
            summary={
              bg.kind === "upload"
                ? "Imagem"
                : BG_PRESETS.find((p) => bg.kind === "preset" && p.key === bg.key)?.label
            }
            open={open.background}
            onToggle={() => toggleSection("background")}
          >
            <div
              role="radiogroup"
              aria-label="Biblioteca de fundos"
              className="grid grid-cols-4 gap-2"
            >
              {BG_PRESETS.map((p) => {
                const active = bg.kind === "preset" && bg.key === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={p.label}
                    aria-label={p.label}
                    onClick={() => setBg({ kind: "preset", key: p.key })}
                    className={`h-11 rounded-lg border-2 ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                    style={{
                      background:
                        p.kind === "solid"
                          ? p.colors[0]
                          : p.kind === "radial"
                            ? `radial-gradient(circle at 50% 35%, ${p.colors[0]}, ${p.colors[1]})`
                            : `linear-gradient(${p.kind === "diagonal" ? "135deg" : "180deg"}, ${p.colors[0]}, ${p.colors[1]})`,
                    }}
                  />
                );
              })}
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void handleFiles(e.dataTransfer.files);
              }}
              title="Arraste uma imagem ou um criativo pronto para remixar"
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-sm font-medium text-primary transition-colors focus-within:ring-2 focus-within:ring-ring ${
                dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              }`}
            >
              <Upload className="size-5 shrink-0" aria-hidden="true" />
              Enviar ou arrastar imagem
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </label>

            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar no Pexels (ex: prefeitura, cidade)"
                  className="h-11 pl-9"
                  aria-label="Buscar imagens no Pexels"
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground">Buscando…</p>}
              {searchError && <p className="text-xs text-amber-700">{searchError}</p>}
              {!searching && !searchError && photos?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma imagem encontrada. Tente outro termo.
                </p>
              )}
              {photos && photos.length > 0 && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        title={p.alt || `Foto de ${p.photographer}`}
                        onClick={() => void usePexelsPhoto(p)}
                        className="overflow-hidden rounded-lg border-2 border-border hover:border-primary"
                      >
                        <img
                          src={p.medium}
                          alt={p.alt || `Foto de ${p.photographer}`}
                          className="h-14 w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fotos via{" "}
                    <a
                      href="https://www.pexels.com"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Pexels
                    </a>
                  </p>
                </>
              )}
            </div>

            {pending && (
              <div className="space-y-2 rounded-lg border border-border p-2">
                <img
                  src={pending.img.src}
                  alt="Prévia da imagem enviada"
                  className="h-28 w-full rounded object-cover"
                />
                <div className="flex gap-2">
                  <Button
                    className="min-h-11 flex-1"
                    onClick={() => {
                      setBg({ kind: "upload", img: pending.img, name: pending.name });
                      setPending(null);
                    }}
                  >
                    <Check aria-hidden="true" />
                    Usar como fundo
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Cancelar"
                    title="Cancelar"
                    onClick={() => setPending(null)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}

            {bg.kind === "upload" && (
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                <img src={bg.img.src} alt="" className="size-10 shrink-0 rounded object-cover" />
                <span className="line-clamp-1 min-w-0 flex-1 px-1 text-xs" title={bg.name}>
                  {bg.name}
                </span>
                {(["dark", "light"] as const).map((t) => {
                  const label = t === "dark" ? "Fundo escuro" : "Fundo claro";
                  const Icon = t === "dark" ? Moon : Sun;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tone === t}
                      aria-label={label}
                      title={label}
                      onClick={() => setTone(t)}
                      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        tone === t
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-card hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={remix}
                  aria-label="Modo remix"
                  title="Modo remix: preserva mais da arte original sob o card sólido"
                  onClick={() => setRemix((v) => !v)}
                  className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    remix
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <Layers className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Remover imagem"
                  title="Remover imagem"
                  onClick={() => setBg({ kind: "preset", key: "vivid-deep" })}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </Section>

          <Section
            icon={BadgeCheck}
            title="Logomarca"
            summary={LOGO_VARIANTS.find((v) => v.id === logoResult?.variant)?.label}
            open={open.logo}
            onToggle={() => toggleSection("logo")}
          >
            <LogoVariantPicker
              idPrefix="studio"
              enabled={logoVariants}
              statuses={logoStatuses}
              chosen={logoResult?.drawn ? logoResult.variant : undefined}
              onToggle={(id, on) =>
                setLogoVariants((prev) => {
                  const next = on
                    ? Array.from(new Set([...prev, id]))
                    : prev.filter((v) => v !== id);
                  const usable = next.filter(
                    (v) => logoStatuses.find((s) => s.id === v)?.status !== "blocked",
                  );
                  if (!usable.length) {
                    toast.error("Mantenha ao menos uma versão da logomarca com contraste.");
                    return prev;
                  }
                  return next;
                })
              }
            />
            {logoResult?.plate && (
              <p className="text-xs text-amber-700">
                Nenhuma versão passa sobre este fundo: a logo vai sobre uma placa sólida.
              </p>
            )}
          </Section>

          <Section
            icon={Palette}
            title="Cores"
            open={open.colors}
            onToggle={() => toggleSection("colors")}
          >
            <div role="radiogroup" aria-label="Esquema cromático" className="space-y-1">
              {SCHEMES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={scheme === s.key}
                  onClick={() => setScheme(s.key)}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors ${
                    scheme === s.key
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex-1">{s.label}</span>
                  {scheme === s.key && <Check className="size-4 shrink-0" aria-hidden="true" />}
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label="Roxo do card/painel" className="flex gap-2">
              {[PALETTE.purple1, PALETTE.purple2, PALETTE.purple3].map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={cardColor === c}
                  aria-label={`Card ${c}`}
                  title={`Roxo do card ${c}`}
                  onClick={() => setCardColor(c)}
                  className={`h-11 flex-1 rounded-lg border-2 ${cardColor === c ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Section>
        </aside>
      </main>
    </div>
  );
}
