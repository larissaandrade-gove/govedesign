import { createFileRoute, redirect, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  SealCheck,
  Check,
  Circle,
  DownloadSimple,
  ImageSquare,
  ListNumbers,
  Plus,
  ShieldCheck,
  Trash,
  Warning,
  TextT,
  Lightning,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AppHeader, FormatChip, Section } from "@/components/AppChrome";
import { LogoVariantPicker } from "@/components/LogoVariantPicker";
import {
  BBLogoSlot,
  BBSchemePicker,
  IdentitySwitch,
  useBBLogo,
  useIdentity,
} from "@/components/IdentityControls";
import { BB_LOGO_LABEL, bbScheme as findBBScheme, whenFontsReady, type Identity } from "@/lib/creative/bb";
import { PexelsCredit, PexelsPicker } from "@/components/PexelsPicker";
import type { PexelsPhoto } from "@/lib/pexels.functions";
import { getGateStatus } from "@/lib/gate.functions";
import {
  ALL_LOGO_VARIANTS,
  LOGO_VARIANTS,
  explainVariants,
  loadLogoLibrary,
  type LogoLibrary,
  type LogoVariantId,
} from "@/lib/creative/logos";
import { loadImageFromFile } from "@/lib/creative/renderer";
import {
  FOLLOWUP_BGS,
  FOLLOWUP_FORMATS,
  FOLLOWUP_MAX,
  followupSize,
  loadFollowupFonts,
  renderFollowup,
  type EventConfirmation,
  type FollowupFormat,
  type FollowupMarker,
  type FollowupModel,
  type FollowupResult,
  type FollowupSpec,
  type ProductUpdate,
} from "@/lib/creative/followup";

export const Route = createFileRoute("/follow-ups")({
  ssr: false,
  beforeLoad: async () => {
    const { unlocked } = await getGateStatus();
    if (!unlocked) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Follow-ups | Criativos GOVE" },
      {
        name: "description",
        content:
          "Peças de follow-up GOVE em 4:3 e 1:1: atualização de produto e confirmação de evento, com travas de marca e logomarca oficial.",
      },
    ],
  }),
  component: Followups,
});

const MARKERS: { key: FollowupMarker; label: string; icon: PhosphorIcon }[] = [
  { key: "check", label: "Check", icon: Check },
  { key: "zap", label: "Raio", icon: Lightning },
  { key: "arrow", label: "Seta", icon: ArrowRight },
  { key: "number", label: "Números", icon: ListNumbers },
  { key: "dot", label: "Marcador simples", icon: Circle },
];

const DEFAULT_PRODUCT: ProductUpdate = {
  title: "Novidades da plataforma Gove",
  items: [
    "Painel de demandas com filtros por secretaria",
    "Relatórios mensais exportados em PDF",
    "Avisos por WhatsApp para o cidadão",
    "Acesso com conta gov.br",
  ],
  marker: "check",
  version: "v3.2 · outubro 2026",
  cta: "Conheça as novidades",
};

const DEFAULT_EVENT: EventConfirmation = {
  kicker: "Presença confirmada",
  name: "Ana Souza",
  event: "Encontro de Gestores Públicos — Governo Zero Clique",
  date: "2026-11-12",
  time: "19:00",
  photo: null,
};

/** Exemplos no tom de voz BB (curtos, imperativos, "você"/"juntos"). */
const BB_PRODUCT: ProductUpdate = {
  title: "Novidades para você atender melhor",
  items: [
    "Encontre cada demanda por secretaria",
    "Baixe os relatórios do mês em PDF",
    "Avise o cidadão pelo WhatsApp",
    "Entre com a conta gov.br",
  ],
  marker: "check",
  version: "v3.2 · outubro 2026",
  cta: "Conheça as novidades",
};

const BB_EVENT: EventConfirmation = {
  kicker: "Presença confirmada",
  name: "Ana Souza",
  event: "Encontro de Gestores Públicos: juntos por cidades mais simples",
  date: "2026-11-12",
  time: "19:00",
  photo: null,
};

const COPY: Record<Identity, { product: ProductUpdate; event: EventConfirmation }> = {
  gove: { product: DEFAULT_PRODUCT, event: DEFAULT_EVENT },
  bb: { product: BB_PRODUCT, event: BB_EVENT },
};

function Followups() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [identity, setIdentity] = useIdentity();
  const isBB = identity === "bb";
  const { logo: bbLogo, upload: uploadBBLogo, clear: clearBBLogo } = useBBLogo();
  const [bbSchemeId, setBBSchemeId] = useState("capa");
  // Modelo vem da aba superior: Eventos (?modelo=evento) ou Atualizações
  const search = useSearch({ strict: false }) as { modelo?: string };
  const model: FollowupModel = search.modelo === "evento" ? "event" : "product";
  const [format, setFormat] = useState<FollowupFormat>("4x3");
  const [bgPreset, setBgPreset] = useState("deep");
  const [bgImage, setBgImage] = useState<{
    img: HTMLImageElement;
    credit: PexelsPhoto | null;
  } | null>(null);
  const [photoCredit, setPhotoCredit] = useState<PexelsPhoto | null>(null);
  const [product, setProduct] = useState<ProductUpdate>(() => COPY[identity].product);
  const [event, setEvent] = useState<EventConfirmation>(() => COPY[identity].event);
  /** Troca a identidade e os textos de exemplo que ainda não foram editados. */
  const changeIdentity = (next: Identity) => {
    if (next === identity) return;
    const from = COPY[identity];
    const to = COPY[next];
    setProduct((p) => ({
      ...p,
      title: p.title === from.product.title ? to.product.title : p.title,
      items:
        JSON.stringify(p.items) === JSON.stringify(from.product.items) ? to.product.items : p.items,
    }));
    setEvent((e) => ({ ...e, event: e.event === from.event.event ? to.event.event : e.event }));
    setIdentity(next);
  };
  const [library, setLibrary] = useState<LogoLibrary | null>(null);
  const [logoVariants, setLogoVariants] = useState<LogoVariantId[]>(ALL_LOGO_VARIANTS);
  const [result, setResult] = useState<FollowupResult | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [open, setOpen] = useState({ content: true, background: true, logo: false });
  const toggleSection = (k: keyof typeof open) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    let alive = true;
    loadLogoLibrary()
      .then((lib) => alive && setLibrary(lib))
      .catch(() => alive && toast.error("Não foi possível carregar a logomarca."));
    loadFollowupFonts().finally(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const spec: FollowupSpec = useMemo(
    () => ({
      model,
      format,
      bgPreset,
      product,
      event,
      logos: library,
      logoVariants,
      bgImage: bgImage?.img ?? null,
      identity,
      bbScheme: bbSchemeId,
      bbLogo: bbLogo?.img ?? null,
    }),
    [
      model,
      format,
      bgPreset,
      product,
      event,
      library,
      logoVariants,
      bgImage,
      identity,
      bbSchemeId,
      bbLogo,
    ],
  );

  useEffect(() => {
    let alive = true;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!alive || !canvas) return;
      setResult(renderFollowup(canvas, spec));
    };
    // BB: fontes BB embutidas carregadas antes de desenhar/exportar.
    if (spec.identity === "bb") void whenFontsReady("bb").then(draw, draw);
    else draw();
    return () => {
      alive = false;
    };
  }, [spec, fontsReady]);

  const logoStatuses = useMemo(() => explainVariants(result?.logo?.bgLums ?? null), [result]);
  const size = followupSize(format);
  const failing = result?.checks.filter((c) => !c.pass) ?? [];
  const blocking = failing.filter((c) => c.id !== "fit");

  const download = () => {
    if (blocking.length) {
      toast.error(blocking.map((c) => c.label).join(" · "));
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gove-followup-${model === "product" ? "produto" : "evento"}-${canvas.width}x${canvas.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PNG exportado.");
    }, "image/png");
  };

  const setItem = (i: number, v: string) =>
    setProduct((p) => ({ ...p, items: p.items.map((it, k) => (k === i ? v : it)) }));

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const photo = await loadImageFromFile(file);
      setEvent((e) => ({ ...e, photo }));
    } catch {
      toast.error("Não foi possível carregar a foto.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <AppHeader />

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Prévia" className="order-1 min-w-0">
          <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4 lg:sticky lg:top-20">
            <div className="mx-auto max-w-[640px]">
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg border border-border"
                aria-label="Prévia do follow-up"
              />
            </div>
            <div role="group" aria-label="Formato" className="flex flex-wrap justify-center gap-2">
              {FOLLOWUP_FORMATS.map((f) => (
                <FormatChip
                  key={f.key}
                  format={f.key}
                  label={f.label}
                  w={f.w}
                  h={f.h}
                  active={format === f.key}
                  onSelect={() => setFormat(f.key)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 text-xs tabular-nums text-muted-foreground">
                {size.w}×{size.h}px · 72 dpi
              </p>
              <Button
                size="lg"
                className="min-h-11 px-5"
                onClick={download}
                disabled={!result || blocking.length > 0}
              >
                <DownloadSimple aria-hidden="true" />
                Baixar PNG
              </Button>
            </div>
            {result && (
              <p
                role="status"
                className={`flex items-center gap-2 text-xs ${failing.length ? "text-amber-700" : "text-emerald-700"}`}
              >
                {failing.length ? (
                  <Warning className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                )}
                {failing.length
                  ? failing.map((c) => c.label).join(" · ")
                  : "Conforme com o manual de marca"}
              </p>
            )}
          </div>
        </section>

        <aside aria-label="Ajustes" className="order-2 space-y-3">
          <IdentitySwitch value={identity} onChange={changeIdentity} />
          <Section
            icon={TextT}
            title="Conteúdo"
            open={open.content}
            onToggle={() => toggleSection("content")}
          >
            {model === "product" ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="fu-title" className="flex items-baseline justify-between gap-2">
                    Título
                    <span className="text-xs font-normal tabular-nums text-muted-foreground">
                      {product.title.length}/{FOLLOWUP_MAX.title}
                    </span>
                  </Label>
                  <Input
                    id="fu-title"
                    className="h-11"
                    maxLength={FOLLOWUP_MAX.title}
                    value={product.title}
                    onChange={(e) => setProduct((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <fieldset className="space-y-2">
                  <legend className="flex w-full items-baseline justify-between text-sm font-medium">
                    Novidades
                    <span className="text-xs font-normal text-muted-foreground">
                      até {FOLLOWUP_MAX.items} itens
                    </span>
                  </legend>
                  {product.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Input
                        className="h-11"
                        aria-label={`Item ${i + 1}`}
                        maxLength={FOLLOWUP_MAX.item}
                        value={it}
                        onChange={(e) => setItem(i, e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 shrink-0"
                        aria-label={`Remover item ${i + 1}`}
                        title="Remover item"
                        disabled={product.items.length <= 1}
                        onClick={() =>
                          setProduct((p) => ({ ...p, items: p.items.filter((_, k) => k !== i) }))
                        }
                      >
                        <Trash aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  {product.items.length < FOLLOWUP_MAX.items && (
                    <Button
                      variant="outline"
                      className="min-h-11 w-full"
                      onClick={() => setProduct((p) => ({ ...p, items: [...p.items, ""] }))}
                    >
                      <Plus aria-hidden="true" />
                      Adicionar item
                    </Button>
                  )}
                </fieldset>
                <div
                  role="radiogroup"
                  aria-label="Marcador dos itens"
                  className="flex flex-wrap gap-2"
                >
                  {MARKERS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        role="radio"
                        aria-checked={product.marker === m.key}
                        aria-label={m.label}
                        title={m.label}
                        onClick={() => setProduct((p) => ({ ...p, marker: m.key }))}
                        className={`inline-flex size-11 items-center justify-center rounded-lg border transition-colors ${
                          product.marker === m.key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon
                          className="size-5"
                          weight={product.marker === m.key ? "fill" : "regular"}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    className="h-11"
                    aria-label="Versão ou data (opcional)"
                    placeholder="Versão/data (opcional)"
                    maxLength={FOLLOWUP_MAX.version}
                    value={product.version}
                    onChange={(e) => setProduct((p) => ({ ...p, version: e.target.value }))}
                  />
                  <Input
                    className="h-11"
                    aria-label="CTA (opcional)"
                    placeholder="CTA (opcional)"
                    maxLength={FOLLOWUP_MAX.cta}
                    value={product.cta}
                    onChange={(e) => setProduct((p) => ({ ...p, cta: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm font-medium text-primary transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted">
                    <ImageSquare className="size-5" aria-hidden="true" />
                    {event.photo ? "Trocar foto" : "Foto do colaborador"}
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Foto do colaborador"
                      className="sr-only"
                      onChange={(e) => void onPhoto(e.target.files?.[0])}
                    />
                  </label>
                  {event.photo && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label="Remover foto"
                      title="Remover foto"
                      onClick={() => {
                        setEvent((e) => ({ ...e, photo: null }));
                        setPhotoCredit(null);
                      }}
                    >
                      <Trash aria-hidden="true" />
                    </Button>
                  )}
                </div>
                {photoCredit && event.photo && <PexelsCredit photo={photoCredit} />}
                <PexelsPicker
                  orientation="square"
                  label="Buscar foto do colaborador no Pexels"
                  placeholder="Ou busque uma foto no Pexels"
                  onPick={(img, photo) => {
                    setEvent((e) => ({ ...e, photo: img }));
                    setPhotoCredit(photo);
                  }}
                />
                <div className="space-y-1">
                  <Label htmlFor="fu-name">Nome do colaborador</Label>
                  <Input
                    id="fu-name"
                    className="h-11"
                    maxLength={FOLLOWUP_MAX.name}
                    value={event.name}
                    onChange={(e) => setEvent((v) => ({ ...v, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fu-event">Evento</Label>
                  <Input
                    id="fu-event"
                    className="h-11"
                    maxLength={FOLLOWUP_MAX.event}
                    value={event.event}
                    onChange={(e) => setEvent((v) => ({ ...v, event: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="fu-date">Data</Label>
                    <Input
                      id="fu-date"
                      type="date"
                      className="h-11"
                      value={event.date}
                      onChange={(e) => setEvent((v) => ({ ...v, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fu-time" className="flex items-baseline gap-1">
                      Hora{" "}
                      <span className="text-xs font-normal text-muted-foreground">opcional</span>
                    </Label>
                    <Input
                      id="fu-time"
                      type="time"
                      className="h-11 w-32"
                      value={event.time}
                      onChange={(e) => setEvent((v) => ({ ...v, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fu-kicker">Chamada</Label>
                  <Input
                    id="fu-kicker"
                    className="h-11"
                    maxLength={FOLLOWUP_MAX.kicker}
                    value={event.kicker}
                    onChange={(e) => setEvent((v) => ({ ...v, kicker: e.target.value }))}
                  />
                </div>
              </>
            )}
          </Section>

          <Section
            icon={ImageSquare}
            title="Fundo"
            summary={
              isBB ? findBBScheme(bbSchemeId).label : FOLLOWUP_BGS.find((p) => p.key === bgPreset)?.label
            }
            open={open.background}
            onToggle={() => toggleSection("background")}
          >
            {isBB && <BBSchemePicker value={bbSchemeId} onChange={setBBSchemeId} />}
            <div
              role="radiogroup"
              aria-label="Fundo"
              className={`grid grid-cols-3 gap-2 ${isBB ? "hidden" : ""}`}
            >
              {FOLLOWUP_BGS.map((p) => {
                const active = bgPreset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={p.label}
                    title={p.label}
                    onClick={() => setBgPreset(p.key)}
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
            <p className="text-xs text-muted-foreground">
              {isBB
                ? bgImage
                  ? "Foto sem véu: cada texto usa a cor da paleta que passa 4,5:1 sobre ela, ou uma caixa Azul escuro."
                  : "Opcional: foto de fundo. Cada texto é conferido contra a foto (4,5:1)."
                : bgImage
                  ? "Foto de fundo com sobreposição na cor acima (contraste ≥ 4,5:1 garantido)."
                  : "Opcional: foto de fundo, coberta pela cor acima para manter o contraste."}
            </p>
            <div className="flex items-center gap-2">
              <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm font-medium text-primary transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted">
                <ImageSquare className="size-5" aria-hidden="true" />
                {bgImage ? "Trocar foto de fundo" : "Foto de fundo"}
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Foto de fundo"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setBgImage({ img: await loadImageFromFile(f), credit: null });
                    } catch {
                      toast.error("Não foi possível carregar a imagem.");
                    }
                  }}
                />
              </label>
              {bgImage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label="Remover foto de fundo"
                  title="Remover foto de fundo"
                  onClick={() => setBgImage(null)}
                >
                  <Trash aria-hidden="true" />
                </Button>
              )}
            </div>
            {bgImage?.credit && <PexelsCredit photo={bgImage.credit} />}
            <PexelsPicker
              orientation={format === "4x3" ? "landscape" : "square"}
              label="Buscar foto de fundo no Pexels"
              onPick={(img, photo) => setBgImage({ img, credit: photo })}
            />
          </Section>

          <Section
            icon={SealCheck}
            title="Logomarca"
            summary={
              isBB && result?.bbLogo
                ? `BB ${BB_LOGO_LABEL[result.bbLogo.version]}`
                : LOGO_VARIANTS.find((v) => v.id === result?.logo?.variant)?.label
            }
            open={open.logo}
            onToggle={() => toggleSection("logo")}
          >
            {isBB && (
              <BBLogoSlot
                logo={bbLogo}
                onUpload={(f) => void uploadBBLogo(f)}
                onClear={clearBBLogo}
                warn={!!result?.bbLogo && !result.bbLogo.bgOk}
              />
            )}
            {!(isBB && bbLogo) && (
            <LogoVariantPicker
              idPrefix="followup"
              enabled={logoVariants}
              statuses={logoStatuses}
              chosen={result?.logo?.drawn ? result.logo.variant : undefined}
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
            )}
          </Section>
        </aside>
      </main>
    </div>
  );
}
