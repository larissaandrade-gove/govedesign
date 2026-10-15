import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, ShieldCheck, Sparkles, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { PALETTE, validateCreative, type ComplianceReport } from "@/lib/creative/brand";
import { LOGO_OPTIONS, loadLogoLibrary } from "@/lib/creative/logos";
import { ICONS } from "@/lib/creative/icons";
import { buildAltText } from "@/lib/creative/alt";
import { getGateStatus } from "@/lib/gate.functions";
import { ExpertFields } from "@/components/ExpertFields";
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

type Bg =
  | { kind: "preset"; key: string }
  | { kind: "upload"; img: HTMLImageElement; name: string };

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

const EXPORTS: { key: CreativeFormat; label: string }[] = FORMATS.map((f) => ({
  key: f.key,
  label: f.label,
}));

function Studio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [library, setLibrary] = useState<Record<string, HTMLImageElement>>({});
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
      logoPurple: library["purple-gold"] ?? library["purple"] ?? null,
      logoWhite: library["white-gold"] ?? library["white"] ?? null,
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
    expert,
  ]);

  // Prévia ao vivo: qualquer mudança de estado redesenha o canvas imediatamente.
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const result = renderCreative(canvas, spec);
      setReport(
        validateCreative({
          logoIsWordmark: true,
          usedColors: result.usedColors,
          textColor: result.textColor,
          textBackgroundColor: result.textBackgroundColor,
          ctaText: spec.cta,
          headline: spec.headline,
          subhead: spec.subhead,
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

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#2F3539]">
      <Toaster />
      <header className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <h1 className="truncate text-base font-semibold sm:text-lg">
              Studio ao vivo — Criativos GOVE
            </h1>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/">Gerador em lote</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[1fr_380px]">
        {/* Canvas em destaque */}
        <section className="order-1 min-w-0">
          <div className="rounded-xl border border-border bg-background p-3 sm:p-4 lg:sticky lg:top-6">
            <div className="mx-auto max-w-[520px]">
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg border border-border"
                aria-label="Prévia do criativo"
              />
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-full text-xs text-muted-foreground sm:w-auto">Exportar em</span>
                {EXPORTS.map((f) => (
                  <Button
                    key={f.key}
                    size="sm"
                    variant={exportFormat === f.key ? "default" : "outline"}
                    className="text-xs"
                    onClick={() => setExportFormat(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button variant="outline" size="sm" onClick={copyAlt}>
                  Copiar texto alt
                </Button>
                <Button size="sm" onClick={download} disabled={!report?.pass || expertBlocked}>
                  <Download className="mr-2 size-4" aria-hidden="true" />
                  Baixar PNG
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {size.w}×{size.h}px · 72 dpi
            </p>

            {report && (
              <p
                className={`mt-3 flex items-center gap-2 text-xs ${report.pass ? "text-emerald-700" : "text-amber-700"}`}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                {report.pass
                  ? "✅ Conforme com o manual de marca"
                  : report.checks
                      .filter((c) => !c.pass)
                      .map((c) => c.label)
                      .join(" · ")}
              </p>
            )}
          </div>
        </section>

        {/* Controles */}
        <aside className="order-2 space-y-4">
          <div className="rounded-xl border border-border bg-background p-4">
            <Label className="text-sm font-medium">Biblioteca de fundos</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {BG_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.label}
                  aria-label={p.label}
                  onClick={() => setBg({ kind: "preset", key: p.key })}
                  className={`h-14 rounded-md border-2 ${
                    bg.kind === "preset" && bg.key === p.key ? "border-primary" : "border-border"
                  }`}
                  style={{
                    background:
                      p.kind === "solid"
                        ? p.colors[0]
                        : p.kind === "radial"
                          ? `radial-gradient(circle at 50% 35%, ${p.colors[0]}, ${p.colors[1]})`
                          : `linear-gradient(${p.kind === "diagonal" ? "135deg" : "180deg"}, ${p.colors[0]}, ${p.colors[1]})`,
                  }}
                />
              ))}
            </div>

            <div
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
              className={`mt-3 rounded-lg border-2 border-dashed p-4 text-center text-xs ${
                dragging ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Upload className="mx-auto mb-2 size-5 text-muted-foreground" aria-hidden="true" />
              Arraste uma imagem (ou um criativo pronto para remixar) ou
              <label className="ml-1 cursor-pointer font-medium text-primary underline">
                escolha um arquivo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void handleFiles(e.target.files)}
                />
              </label>
            </div>

            <div className="mt-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar imagens (ex: prefeitura, tecnologia, cidade)"
                className="text-xs"
                aria-label="Buscar imagens no Pexels"
              />
              {searching && <p className="mt-2 text-[11px] text-muted-foreground">Buscando…</p>}
              {searchError && <p className="mt-2 text-[11px] text-amber-700">{searchError}</p>}
              {!searching && !searchError && photos?.length === 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Nenhuma imagem encontrada para esse termo. Tente outro termo.
                </p>
              )}
              {photos && photos.length > 0 && (
                <>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {photos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        title={p.alt || `Foto de ${p.photographer}`}
                        onClick={() => void usePexelsPhoto(p)}
                        className="overflow-hidden rounded-md border-2 border-border hover:border-primary"
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
                  <p className="mt-2 text-[11px] text-muted-foreground">
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
              <div className="mt-3 rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-medium">Confirmar este fundo?</p>
                <img
                  src={pending.img.src}
                  alt="Prévia da imagem enviada"
                  className="mb-2 h-28 w-full rounded object-cover"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setBg({ kind: "upload", img: pending.img, name: pending.name });
                      setPending(null);
                    }}
                  >
                    <Check className="mr-1 size-3" aria-hidden="true" />
                    Usar como fundo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setPending(null)}
                  >
                    <X className="mr-1 size-3" aria-hidden="true" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {bg.kind === "upload" && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-border p-2">
                  <img src={bg.img.src} alt="" className="size-12 rounded object-cover" />
                  <span className="line-clamp-1 flex-1 text-xs">{bg.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover imagem"
                    onClick={() => setBg({ kind: "preset", key: "vivid-deep" })}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  {(["dark", "light"] as const).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={tone === t ? "default" : "outline"}
                      className="flex-1 text-xs"
                      onClick={() => setTone(t)}
                    >
                      {t === "dark" ? "Fundo escuro" : "Fundo claro"}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-2">
                  <div>
                    <p className="text-xs font-medium">Modo remix</p>
                    <p className="text-[11px] text-muted-foreground">
                      Preserva mais da arte original sob o card sólido.
                    </p>
                  </div>
                  <Switch checked={remix} onCheckedChange={setRemix} />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <ExpertFields value={expert} onChange={onExpertChange} />
            <Label className="mt-4 block text-sm font-medium">
              {expert.enabled ? "Diagramação exclusiva de especialista" : "Diagramação (8 estilos fixos)"}
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(expert.enabled ? EXPERT_LAYOUTS : STUDIO_LAYOUTS).map((l) => (
                <button
                  key={l.key}
                  type="button"
                  title={l.hint}
                  onClick={() => setLayout(l.key)}
                  className={`rounded-lg border-2 p-1.5 text-left ${
                    layout === l.key ? "border-primary" : "border-border"
                  }`}
                >
                  <LayoutThumb layout={l.key} />
                  <span className="mt-1 block text-[11px] font-medium">{l.label}</span>
                </button>
              ))}
            </div>

            <Label className="mt-4 block text-sm font-medium">Esquema cromático</Label>
            <div className="mt-2 space-y-2">
              {SCHEMES.map((s) => (
                <Button
                  key={s.key}
                  variant={scheme === s.key ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setScheme(s.key)}
                >
                  {s.label}
                </Button>
              ))}
            </div>

            <Label className="mt-4 block text-sm font-medium">Roxo do card/painel</Label>
            <div className="mt-2 flex gap-2">
              {[PALETTE.purple1, PALETTE.purple2, PALETTE.purple3].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Card ${c}`}
                  onClick={() => setCardColor(c)}
                  className={`h-9 flex-1 rounded-md border-2 ${cardColor === c ? "border-primary" : "border-border"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-background p-4">
            <Label className="text-sm font-medium">Textos</Label>
            <Input
              value={headline}
              maxLength={60}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Headline"
            />
            <Input
              value={subhead}
              maxLength={90}
              onChange={(e) => setSubhead(e.target.value)}
              placeholder="Subhead"
            />
            <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="CTA" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Selo" />
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token regional"
              />
            </div>
            <Input
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              placeholder="Gatilho de urgência"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Ícone do CTA</Label>
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  {ICONS.map((i) => (
                    <option key={i.key} value={i.key}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Ícone de urgência</Label>
                <select
                  value={themeIcon}
                  onChange={(e) => setThemeIcon(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  {ICONS.map((i) => (
                    <option key={i.key} value={i.key}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Wordmarks disponíveis: {LOGO_OPTIONS.length} — a variante é escolhida automaticamente
              pelo contraste do fundo.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
