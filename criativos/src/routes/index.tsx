import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Sparkles, Upload, ShieldCheck, X, Download, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { CreativeCard } from "@/components/CreativeCard";
import { VideoCard } from "@/components/VideoCard";
import { ExpertFields } from "@/components/ExpertFields";
import { BG_COLORS, MAX_HEADLINE, MAX_SUBHEAD, PALETTE } from "@/lib/creative/brand";
import { LOGO_OPTIONS, loadLogoLibrary } from "@/lib/creative/logos";
import { ICONS } from "@/lib/creative/icons";
import { getGateStatus, signOut } from "@/lib/gate.functions";
import { searchPexels, type PexelsPhoto } from "@/lib/pexels.functions";
import {
  BG_PRESETS,
  FORMATS,
  LAYOUTS,
  SCHEMES,
  formatSize,
  imageBrightness,
  loadImageFromFile,
  loadImageFromUrl,
  type CreativeFormat,
  type CreativeLayout,
  type CreativeScheme,
  type CreativeSpec,
  EXPERT_LAYOUTS,
  EMPTY_EXPERT,
  expertReady,
  type ExpertMaterial,
} from "@/lib/creative/renderer";



export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { unlocked } = await getGateStatus();
    if (!unlocked) throw redirect({ to: "/login" });
  },

  head: () => ({
    meta: [
      { title: "Gerador de Criativos GOVE | Mídia paga B2G" },
      {
        name: "description",
        content:
          "Gere 8 criativos 1080x1350 para captação de leads no setor público, com layouts variados, gatilhos de urgência e as regras do manual de marca GOVE aplicadas automaticamente.",
      },
      { property: "og:title", content: "Gerador de Criativos GOVE | Mídia paga B2G" },
      {
        property: "og:description",
        content:
          "Criativos institucionais govtech em 1080x1350 com contraste, paleta e wordmark validados automaticamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULTS = {
  headlines:
    "Sua equipe ainda perde horas com atendimento manual?\nO governo que age antes de você pedir\nCidades que reduziram 40% do atendimento\nGestão pública com resposta em tempo real",
  subheads:
    "Centralize demandas do cidadão em um só painel e responda mais rápido.\nInteligência de dados para decisões da sua secretaria.\nCases reais de prefeituras no Governo Zero Clique.",
  ctas: "Agende uma demonstração\nFale com um especialista\nBaixe o material\nSolicite uma reunião",
  badges: "Case de sucesso\nNovo\nWebinar ao vivo\nInscrições abertas\nGoverno Zero Clique",
  tokens: "Divinópolis/MG\nSalvador/BA\nGoiânia/GO\nCampinas/SP",
  urgencies:
    "Vagas limitadas\nÚltimos dias de inscrição\nAgenda de setembro fechando\nApenas 10 prefeituras por turma\nDiagnóstico gratuito até sexta",
};

function lines(v: string) {
  return v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function pick<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Índice sorteado dentro de um pool de texto (null quando o pool está vazio). */
function randIdx(arr: string[]): number | null {
  return arr.length ? Math.floor(Math.random() * arr.length) : null;
}

/** Lê o valor atual do pool pelo índice guardado, tolerando pools que encolheram. */
function at(arr: string[], i: number | null | undefined): string | undefined {
  if (i == null || !arr.length) return undefined;
  return arr[i % arr.length];
}

type TextIdx = {
  headline: number | null;
  subhead: number | null;
  cta: number | null;
  badge: number | null;
  urgency: number | null;
  token: number | null;
};

/** Spec de render + rastreio de qual linha de cada variável foi usada. */
type Spec = CreativeSpec & { textIdx: TextIdx };


function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = a[i] as T;
    a[i] = a[j] as T;
    a[j] = ai;
  }
  return a;
}

function CollapsibleSection({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-medium">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}


function Index() {

  const router = useRouter();
  const doSignOut = useServerFn(signOut);
  const handleSignOut = useCallback(async () => {
    await doSignOut();
    await router.navigate({ to: "/login", replace: true });
  }, [doSignOut, router]);

  const [headlines, setHeadlines] = useState(DEFAULTS.headlines);
  const [subheads, setSubheads] = useState(DEFAULTS.subheads);
  const [ctas, setCtas] = useState(DEFAULTS.ctas);
  const [badges, setBadges] = useState(DEFAULTS.badges);
  const [tokens, setTokens] = useState(DEFAULTS.tokens);
  const [urgencies, setUrgencies] = useState(DEFAULTS.urgencies);
  const [useUrgency, setUseUrgency] = useState(true);
  const [useImage, setUseImage] = useState(false);
  const [backgrounds, setBackgrounds] = useState<
    { img: HTMLImageElement; name: string; tone: "light" | "dark" }[]
  >([]);
  const [library, setLibrary] = useState<Record<string, HTMLImageElement>>({});
  const [enabledPresets, setEnabledPresets] = useState<string[]>(BG_PRESETS.map((p) => p.key));
  // Busca de imagens Pexels (terceira origem de fundo, igual ao Studio).
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<PexelsPhoto[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [enabledLogos, setEnabledLogos] = useState<string[]>(LOGO_OPTIONS.map((o) => o.id));
  const [enabledLayouts, setEnabledLayouts] = useState<CreativeLayout[]>(LAYOUTS.map((l) => l.key));
  const [enabledSchemes, setEnabledSchemes] = useState<CreativeScheme[]>(SCHEMES.map((s) => s.key));
  const [openSections, setOpenSections] = useState({
    backgrounds: true,
    presets: true,
    schemes: true,
    logos: true,
    layouts: true,
    icons: true,
    textVariables: true,
  });



  const [selectedIcons, setSelectedIcons] = useState<string[]>([
    "clock",
    "calendar",
    "chart",
    "users",
  ]);
  const [format, setFormat] = useState<CreativeFormat>("feed-45");
  const [mode, setMode] = useState<"image" | "video">("image");
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [expert, setExpert] = useState<ExpertMaterial>(EMPTY_EXPERT);
  const expertKeys = useMemo(() => EXPERT_LAYOUTS.map((l) => l.key), []);
  const expertBlocked = expert.enabled && !expertReady(expert);
  // Material colaborativo ao vivo: aplica/retira layouts exclusivos e dados do especialista.
  useEffect(() => {
    setSpecs((prev) =>
      prev.map((s, i) => ({
        ...s,
        expert: expert.enabled ? expert : null,
        layout: expert.enabled
          ? expertKeys.includes(s.layout) ? s.layout : (expertKeys[i % expertKeys.length] ?? "expert-card")
          : expertKeys.includes(s.layout) ? (LAYOUTS[i % LAYOUTS.length]?.key ?? "card-bottom") : s.layout,
      })),
    );
  }, [expert, expertKeys]);


  // Troca de formato re-renderiza as peças já geradas mantendo textos e cores.
  useEffect(() => {
    setSpecs((prev) => (prev.length ? prev.map((s) => ({ ...s, format })) : prev));
  }, [format]);


  useEffect(() => {
    let active = true;
    loadLogoLibrary()
      .then((imgs) => {
        if (active) setLibrary(imgs);
      })
      .catch(() => toast.error("Não foi possível carregar a biblioteca de logos."));
    return () => {
      active = false;
    };
  }, []);

  const toggleIn = <T,>(list: T[], v: T, on: boolean) =>
    on ? Array.from(new Set([...list, v])) : list.filter((x) => x !== v);

  const pools = useMemo(
    () => ({
      headlines: lines(headlines),
      subheads: lines(subheads),
      ctas: lines(ctas),
      badges: lines(badges),
      tokens: lines(tokens),
      urgencies: lines(urgencies),
    }),
    [headlines, subheads, ctas, badges, tokens, urgencies],
  );

  const pickLogoOption = useCallback(
    (variant: "light" | "dark") => {
      const opts = LOGO_OPTIONS.filter(
        (o) => o.variant === variant && enabledLogos.includes(o.id) && library[o.id],
      );
      return pick(opts) ?? null;
    },
    [enabledLogos, library],
  );

  /** Sorteia logos + placa respeitando a trava: wordmark dourado nunca sobre dourado. */
  const pickLogoSet = useCallback(() => {
    const purpleOpt = pickLogoOption("light");
    const whiteOpt = pickLogoOption("dark");
    const purpleImg = purpleOpt ? (library[purpleOpt.id] ?? null) : null;
    const whiteImg = whiteOpt ? (library[whiteOpt.id] ?? null) : null;
    // Placa clara só faz sentido quando existe wordmark roxo disponível.
    const plate = Boolean(purpleImg) && Math.random() < 0.45;
    const goldPlate = plate && !(purpleOpt?.hasGold ?? true) && Math.random() < 0.3;
    return {
      logoPurple: purpleImg,
      logoWhite: whiteImg,
      logoPlate: plate,
      logoPlateColor: goldPlate ? PALETTE.gold : PALETTE.white,
    };
  }, [pickLogoOption, library]);

  /* ---------- Sincronização ao vivo: ajustes do painel se aplicam às peças já geradas ---------- */

  // Diagramações: peça com layout desativado migra para um layout ativo.
  useEffect(() => {
    if (!enabledLayouts.length || expert.enabled) return;
    setSpecs((prev) =>
      prev.length
        ? prev.map((s) =>
            enabledLayouts.includes(s.layout)
              ? s
              : { ...s, layout: pick(enabledLayouts) ?? s.layout },
          )
        : prev,
    );
  }, [enabledLayouts, expert.enabled]);

  // Esquemas de cor / imagens de fundo.
  useEffect(() => {
    const hasBg = useImage && backgrounds.length > 0;
    setSpecs((prev) => {
      if (!prev.length) return prev;
      // Sem fotos, os esquemas ativos são redistribuídos entre as peças para refletir
      // a seleção imediatamente (e garantir variedade).
      const activeSchemes = enabledSchemes.length ? enabledSchemes : SCHEMES.map((s) => s.key);
      const rotation = shuffle([...activeSchemes, ...activeSchemes, ...activeSchemes]);
      return prev.map((s, i) => {
        if (hasBg) {
          const current = backgrounds.find((b) => b.img === s.background);
          const bg = current ?? pick(backgrounds);
          return {
            ...s,
            scheme: "institucional" as const,
            background: bg?.img ?? null,
            bgTone: bg?.tone,
          };
        }
        const presets = enabledPresets.length ? enabledPresets : BG_PRESETS.map((p) => p.key);
        return {
          ...s,
          scheme: rotation[i % rotation.length] ?? "institucional",
          background: null,
          bgTone: undefined,
          bgPreset:
            s.bgPreset && presets.includes(s.bgPreset) ? s.bgPreset : presets[i % presets.length],
        };
      });
    });
  }, [useImage, backgrounds, enabledSchemes, enabledPresets]);


  // Wordmarks habilitados / biblioteca carregada.
  useEffect(() => {
    setSpecs((prev) => (prev.length ? prev.map((s) => ({ ...s, ...pickLogoSet() })) : prev));
  }, [enabledLogos, library, pickLogoSet]);

  // Ícones temáticos selecionados.
  useEffect(() => {
    setSpecs((prev) =>
      prev.length
        ? prev.map((s) =>
            s.themeIcon && selectedIcons.includes(s.themeIcon)
              ? s
              : { ...s, themeIcon: selectedIcons.length ? (pick(selectedIcons) ?? "clock") : "clock" },
          )
        : prev,
    );
  }, [selectedIcons]);

  // Variáveis de texto: cada peça guarda o índice da linha usada, então editar
  // a linha correspondente atualiza o criativo na hora.
  useEffect(() => {
    setSpecs((prev) =>
      prev.length
        ? prev.map((s) => {
            const idx = s.textIdx;
            const urgencyIdx = useUrgency ? idx.urgency : null;
            return {
              ...s,
              textIdx: { ...idx, urgency: urgencyIdx },
              headline: (at(pools.headlines, idx.headline) ?? s.headline).slice(0, MAX_HEADLINE),
              subhead: (at(pools.subheads, idx.subhead) ?? s.subhead).slice(0, MAX_SUBHEAD),
              cta: at(pools.ctas, idx.cta) ?? s.cta,
              badge: at(pools.badges, idx.badge) ?? "",
              token: at(pools.tokens, idx.token),
              urgency: at(pools.urgencies, urgencyIdx),
            };
          })
        : prev,
    );
  }, [pools, useUrgency]);



  const buildSpec = useCallback(
    (layout?: CreativeLayout): Spec => {
      const textIdx: TextIdx = {
        headline: randIdx(pools.headlines),
        subhead: randIdx(pools.subheads),
        cta: randIdx(pools.ctas),
        badge: randIdx(pools.badges),
        urgency:
          useUrgency && pools.urgencies.length && Math.random() < 0.75
            ? randIdx(pools.urgencies)
            : null,
        token: pools.tokens.length && Math.random() < 0.6 ? randIdx(pools.tokens) : null,
      };
      const cta = at(pools.ctas, textIdx.cta) ?? "Agende uma demonstração";
      const chosenLayout =
        layout ?? pick(enabledLayouts.length ? enabledLayouts : LAYOUTS.map((l) => l.key)) ?? "card-bottom";
      const iconKey = /baix|download|material|pdf/i.test(cta)
        ? "download"
        : /fale|converse|contato/i.test(cta)
          ? "message"
          : "arrow";
      // Com imagens enviadas, todas as peças usam foto de fundo (esquema institucional).
      const hasBg = useImage && backgrounds.length > 0;
      const scheme = hasBg
        ? "institucional"
        : (pick(enabledSchemes.length ? enabledSchemes : SCHEMES.map((s) => s.key)) ??
          "institucional");
      const bg = hasBg ? pick(backgrounds) : undefined;
      return {
        textIdx,
        headline: (at(pools.headlines, textIdx.headline) ?? "").slice(0, MAX_HEADLINE),
        subhead: (at(pools.subheads, textIdx.subhead) ?? "").slice(0, MAX_SUBHEAD),
        cta,
        badge: at(pools.badges, textIdx.badge) ?? "",
        urgency: at(pools.urgencies, textIdx.urgency),
        token: at(pools.tokens, textIdx.token),
        bgColor: pick([...BG_COLORS]) ?? BG_COLORS[2],
        cardColor: pick([...BG_COLORS]) ?? BG_COLORS[2],
        layout: chosenLayout,
        scheme,
        icon: iconKey,
        themeIcon: selectedIcons.length ? pick(selectedIcons) : "clock",
        format,
        background: bg?.img ?? null,
        bgTone: bg?.tone,
        bgPreset: hasBg
          ? undefined
          : pick(enabledPresets.length ? enabledPresets : BG_PRESETS.map((p) => p.key)),
        ...pickLogoSet(),
        expert: expert.enabled ? expert : null,
      };

    },
    [
      pools,
      format,
      enabledLayouts,
      enabledSchemes,
      selectedIcons,
      useUrgency,
      useImage,
      backgrounds,
      enabledPresets,
      pickLogoSet,
      expert,
    ],
  );

  const generate = () => {
    if (!pools.headlines.length || !pools.subheads.length || !pools.ctas.length) {
      toast.error("Preencha headlines, subheads e CTAs.");
      return;
    }
    if (useImage && !backgrounds.length) {
      toast.error("Envie ao menos uma imagem de fundo ou desative a opção.");
      return;
    }
    if (!enabledLayouts.length) {
      toast.error("Selecione ao menos uma diagramação.");
      return;
    }
    if (!enabledSchemes.length) {
      toast.error("Selecione ao menos um esquema de cores.");
      return;
    }
    if (!enabledLogos.length) {
      toast.error("É obrigatório manter ao menos um wordmark selecionado.");
      return;
    }
    // Distribui as diagramações para garantir variedade entre as 8 peças.
    // No modo vídeo geramos menos peças: cada uma exporta 3 formatos em MP4.
    const count = mode === "video" ? 4 : 8;
    if (expertBlocked) {
      toast.error("Preencha nome e sobrenome, cargo e foto do especialista.");
      return;
    }
    const pool = expert.enabled ? expertKeys : enabledLayouts;
    const rotation = shuffle(Array.from({ length: count }, (_, i) => pool[i % pool.length]!));
    const list = Array.from({ length: count }, (_, i) => buildSpec(rotation[i % rotation.length]));

    setSpecs(list);
  };

  const reloadOne = (i: number) =>
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? buildSpec(s.layout) : s)));

  /** Sorteia apenas a paleta (fundos, cards, placa e logo), mantendo os textos. */
  const recolorOne = (i: number) =>
    setSpecs((prev) =>
      prev.map((s, idx) => {
        if (idx !== i) return s;
        // Com imagens ativas, mantém a foto (apenas troca a foto sorteada) e o esquema institucional.
        const hasBg = useImage && backgrounds.length > 0;
        const newBg = hasBg ? pick(backgrounds) : undefined;
        return {
          ...s,
          bgColor: pick([...BG_COLORS]) ?? BG_COLORS[2],
          cardColor: pick([...BG_COLORS]) ?? BG_COLORS[2],
          scheme: hasBg
            ? ("institucional" as const)
            : (pick(enabledSchemes.length ? enabledSchemes : SCHEMES.map((x) => x.key)) ??
              "institucional"),
          background: newBg?.img ?? s.background,
          bgTone: newBg?.tone ?? s.bgTone,
          bgPreset: hasBg
            ? undefined
            : pick(enabledPresets.length ? enabledPresets : BG_PRESETS.map((p) => p.key)),
          ...pickLogoSet(),
        };
      }),
    );

  const gridRef = useRef<HTMLDivElement>(null);

  /** Baixa todos os criativos renderizados, um PNG por peça. */
  const downloadAll = async () => {
    if (expertBlocked) {
      toast.error("Preencha nome e sobrenome, cargo e foto do especialista.");
      return;
    }
    const canvases = Array.from(gridRef.current?.querySelectorAll("canvas") ?? []);
    if (!canvases.length) {
      toast.error("Gere os criativos antes de baixar.");
      return;
    }
    for (const [i, canvas] of canvases.entries()) {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gove-criativo-${i + 1}-${canvas.width}x${canvas.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
      await new Promise((res) => setTimeout(res, 250));
    }
    toast.success(`${canvases.length} criativos baixados.`);
  };



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

  /** Adiciona uma foto do Pexels ao conjunto de imagens de fundo do lote. */
  const addPexelsPhoto = async (photo: PexelsPhoto) => {
    try {
      const img = await loadImageFromUrl(photo.large2x);
      const tone: "light" | "dark" = imageBrightness(img, "all") >= 128 ? "light" : "dark";
      setBackgrounds((prev) => [
        ...prev,
        { img, name: photo.alt || `Pexels #${photo.id}`, tone },
      ]);
      toast.success("Imagem adicionada aos fundos.");
    } catch {
      toast.error("Não foi possível carregar essa imagem.");
    }
  };

  const handleBackgrounds = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    try {
      const loaded = await Promise.all(
        files.map(async (f) => {
          const img = await loadImageFromFile(f);
          const tone: "light" | "dark" = imageBrightness(img, "all") >= 128 ? "light" : "dark";
          return { img, name: f.name, tone };
        }),
      );
      setBackgrounds((prev) => [...prev, ...loaded]);
      toast.success(`${loaded.length} imagem(ns) adicionada(s) — confira a classificação de fundo.`);
    } catch {
      toast.error("Não foi possível ler uma das imagens.");
    }
    e.target.value = "";
  };

  const setBackgroundTone = (i: number, tone: "light" | "dark") =>
    setBackgrounds((prev) => prev.map((b, idx) => (idx === i ? { ...b, tone } : b)));

  const toggleLogo = (id: string, on: boolean) =>
    setEnabledLogos((prev) => {
      if (!on && prev.length === 1 && prev.includes(id)) {
        toast.error("É obrigatório manter ao menos um wordmark selecionado.");
        return prev;
      }
      return toggleIn(prev, id, on);
    });


  const iconThemes = useMemo(
    () => Array.from(new Set(ICONS.map((i) => i.theme))),
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Governo Zero Clique
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Gerador de criativos de mídia paga — GOVE
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Peças em {formatSize(format).w}x{formatSize(format).h} px (72 dpi) para captação de
              leads B2G, com diagramações alternadas, gatilhos de urgência e travas de marca
              aplicadas automaticamente.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <Button asChild variant="default" size="lg" className="min-w-0 flex-1 gap-2 lg:flex-none">
              <Link to="/studio">
                <Sparkles className="size-4" aria-hidden="true" />
                Abrir Studio ao vivo
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="min-h-11" onClick={handleSignOut}>
              Sair
            </Button>
          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[400px_1fr]">
          <div className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5">

            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Tipo de saída</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "image", label: "Imagem", hint: "PNG estático" },
                  { key: "video", label: "Vídeo", hint: "MP4 15s, 3 formatos" },
                ] as const).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    aria-pressed={mode === m.key}
                    onClick={() => setMode(m.key)}
                    className={`rounded-md border p-2 text-left text-xs transition-colors ${
                      mode === m.key
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="block text-sm">{m.label}</span>
                    {m.hint}
                  </button>
                ))}
              </div>
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Base visual
            </h2>


            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <Label htmlFor="use-image" className="text-sm">
                Usar imagens de fundo
              </Label>
              <Switch id="use-image" checked={useImage} onCheckedChange={setUseImage} />
            </div>

            {useImage && (
              <CollapsibleSection
                title="Imagens de fundo"
                subtitle="Várias imagens — crop automático 4:5, alternadas entre as peças."
                open={openSections.backgrounds}
                onToggle={() => setOpenSections((p) => ({ ...p, backgrounds: !p.backgrounds }))}
              >

                <div className="space-y-2">
                  <Label htmlFor="bg-file">Adicionar imagens</Label>
                  <Input
                    id="bg-file"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleBackgrounds}
                  />
                  {backgrounds.length > 0 && (
                    <ul className="space-y-2 pt-1">
                      {backgrounds.map((b, i) => (
                        <li
                          key={`${b.name}-${i}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs"
                        >
                          <span className="max-w-28 truncate">{b.name}</span>
                          <div className="flex items-center gap-1">
                            {(["light", "dark"] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                aria-pressed={b.tone === t}
                                onClick={() => setBackgroundTone(i, t)}
                                className={`rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${
                                  b.tone === t
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:bg-secondary"
                                }`}
                              >
                                {t === "light" ? "Fundo claro" : "Fundo escuro"}
                              </button>
                            ))}
                            <button
                              type="button"
                              aria-label={`Remover ${b.name}`}
                              onClick={() => setBackgrounds((p) => p.filter((_, idx) => idx !== i))}
                              className="p-1 text-muted-foreground"
                            >
                              <X className="size-3" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  <Label htmlFor="pexels-query">Buscar imagens (Pexels)</Label>
                  <Input
                    id="pexels-query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar imagens (ex: prefeitura, tecnologia, cidade)"
                    aria-label="Buscar imagens no Pexels"
                  />
                  {searching && <p className="text-[11px] text-muted-foreground">Buscando…</p>}
                  {searchError && <p className="text-[11px] text-amber-700">{searchError}</p>}
                  {!searching && !searchError && photos?.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Nenhuma imagem encontrada para esse termo. Tente outro termo.
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
                            onClick={() => void addPexelsPhoto(p)}
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
                      <p className="text-[11px] text-muted-foreground">
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
              </CollapsibleSection>
            )}

            {!useImage && (
              <CollapsibleSection
                title="Fundos padrão"
                subtitle="Sólidos e degradês institucionais alternados entre as peças."
                open={openSections.presets}
                onToggle={() => setOpenSections((p) => ({ ...p, presets: !p.presets }))}
              >
                <div className="grid grid-cols-3 gap-2">
                  {BG_PRESETS.map((p) => {
                    const on = enabledPresets.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        title={p.label}
                        aria-label={p.label}
                        aria-pressed={on}
                        onClick={() =>
                          setEnabledPresets((prev) =>
                            prev.includes(p.key)
                              ? prev.length > 1
                                ? prev.filter((k) => k !== p.key)
                                : prev
                              : [...prev, p.key],
                          )
                        }
                        className={`h-14 rounded-md border-2 transition-opacity ${
                          on ? "border-primary" : "border-border opacity-40"
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
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}


            <div
              className={`space-y-2 rounded-lg border border-border p-3 ${mode === "video" ? "hidden" : ""}`}
            >
              <p className="text-sm font-medium">Formato da arte</p>
              <p className="text-xs text-muted-foreground">
                Exportação em PNG a 72 dpi (1 px = 1 pt).
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFormat(f.key)}
                    aria-pressed={format === f.key}
                    className={`rounded-md border p-2 text-left text-xs transition-colors ${
                      format === f.key
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <CollapsibleSection
              title="Esquemas de cor"
              subtitle="O minimalista usa branco ou roxo como cor de respiro, com o CTA na cor oposta (sem dourado)."
              open={openSections.schemes}
              onToggle={() => setOpenSections((p) => ({ ...p, schemes: !p.schemes }))}
            >

              {SCHEMES.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`scheme-${s.key}`} className="text-xs font-normal">
                    {s.label}
                  </Label>
                  <Switch
                    id={`scheme-${s.key}`}
                    checked={enabledSchemes.includes(s.key)}
                    onCheckedChange={(v) => setEnabledSchemes((p) => toggleIn(p, s.key, v))}
                  />
                </div>
              ))}
            </CollapsibleSection>


            <CollapsibleSection
              title="Logos wordmark GOVE"
              subtitle="Ao menos um wordmark deve permanecer ativo. Versões com sorriso dourado nunca são aplicadas sobre fundo ou placa dourada."
              open={openSections.logos}
              onToggle={() => setOpenSections((p) => ({ ...p, logos: !p.logos }))}
            >

              {LOGO_OPTIONS.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`logo-${o.id}`} className="text-xs font-normal">
                    {o.label}
                    <span className="ml-1 text-muted-foreground">
                      ({o.variant === "light" ? "fundos claros" : "fundos escuros"})
                    </span>
                  </Label>
                  <Switch
                    id={`logo-${o.id}`}
                    checked={enabledLogos.includes(o.id)}
                    onCheckedChange={(v) => toggleLogo(o.id, v)}
                  />
                </div>
              ))}
            </CollapsibleSection>



            <CollapsibleSection
              title="Diagramações"
              subtitle="As 8 peças são distribuídas entre as disposições selecionadas."
              open={openSections.layouts}
              onToggle={() => setOpenSections((p) => ({ ...p, layouts: !p.layouts }))}
            >

              <ExpertFields value={expert} onChange={setExpert} />
              {expert.enabled && (
                <p className="text-xs text-muted-foreground">
                  Material colaborativo ativo: as peças usam os layouts exclusivos de especialista.
                </p>
              )}
              {(expert.enabled ? [] : LAYOUTS).map((l) => (
                <div key={l.key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`layout-${l.key}`} className="text-xs font-normal">
                    {l.label}
                  </Label>
                  <Switch
                    id={`layout-${l.key}`}
                    checked={enabledLayouts.includes(l.key)}
                    onCheckedChange={(v) => setEnabledLayouts((p) => toggleIn(p, l.key, v))}
                  />
                </div>
              ))}
            </CollapsibleSection>


            <CollapsibleSection
              title="Repositório de ícones"
              subtitle="Selecione os ícones temáticos que podem aparecer nos gatilhos de urgência."
              open={openSections.icons}
              onToggle={() => setOpenSections((p) => ({ ...p, icons: !p.icons }))}
            >

              {iconThemes.map((theme) => (
                <div key={theme} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {theme}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.filter((i) => i.theme === theme).map((i) => {
                      const active = selectedIcons.includes(i.key);
                      return (
                        <button
                          key={i.key}
                          type="button"
                          title={i.label}
                          aria-pressed={active}
                          onClick={() =>
                            setSelectedIcons((p) => toggleIn(p, i.key, !p.includes(i.key)))
                          }
                          className={`inline-flex size-11 items-center justify-center rounded-lg border transition-colors ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-5"
                            aria-hidden="true"
                          >
                            {i.paths.map((d, idx) => (
                              <path key={idx} d={d} />
                            ))}
                          </svg>
                          <span className="sr-only">{i.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CollapsibleSection>



            <CollapsibleSection
              title="Variáveis de texto"
              subtitle="Headlines, subheads, CTAs, selos e tokens."
              open={openSections.textVariables}
              onToggle={() => setOpenSections((p) => ({ ...p, textVariables: !p.textVariables }))}
            >
              <div className="space-y-2">
                <Label htmlFor="headlines">Headlines (máx. 60 caracteres)</Label>
                <Textarea
                  id="headlines"
                  rows={4}
                  value={headlines}
                  onChange={(e) => setHeadlines(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subheads">Subheads (máx. 90 caracteres)</Label>
                <Textarea
                  id="subheads"
                  rows={4}
                  value={subheads}
                  onChange={(e) => setSubheads(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctas">CTAs (sempre com verbo de ação)</Label>
                <Textarea id="ctas" rows={4} value={ctas} onChange={(e) => setCtas(e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <Label htmlFor="use-urgency" className="text-sm">
                  Gatilhos de urgência
                </Label>
                <Switch id="use-urgency" checked={useUrgency} onCheckedChange={setUseUrgency} />
              </div>
              {useUrgency && (
                <div className="space-y-2">
                  <Label htmlFor="urgencies">Frases de urgência (chip dourado com ícone)</Label>
                  <Textarea
                    id="urgencies"
                    rows={4}
                    value={urgencies}
                    onChange={(e) => setUrgencies(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="badges">Selos institucionais</Label>
                <Textarea
                  id="badges"
                  rows={3}
                  value={badges}
                  onChange={(e) => setBadges(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokens">Tokens regionais (opcional)</Label>
                <Textarea
                  id="tokens"
                  rows={3}
                  value={tokens}
                  onChange={(e) => setTokens(e.target.value)}
                />
              </div>
            </CollapsibleSection>

            <Button
              onClick={generate}
              className="sticky bottom-3 z-10 min-h-12 w-full shadow-lg lg:static lg:shadow-none"
            >
              <Sparkles aria-hidden="true" />
              {mode === "video" ? "Gerar 4 vídeos" : "Gerar 8 versões"}
            </Button>
          </div>

          <div className="min-w-0">
            {specs.length === 0 ? (
              <div className="flex h-full min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-center sm:min-h-80 sm:p-10">

                <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  {mode === "video"
                    ? "Configure os textos ao lado e gere as peças em vídeo (15s, Ken Burns, MP4 em 3 formatos)."
                    : "Configure os textos ao lado e gere as 8 variações no formato selecionado."}
                </p>
              </div>
            ) : mode === "video" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {specs.map((spec, i) => (
                  <VideoCard key={i} spec={spec} index={i} onReload={reloadOne} onRecolor={recolorOne} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {specs.map((spec, i) => (
                    <CreativeCard
                      key={i}
                      spec={spec}
                      index={i}
                      onReload={reloadOne}
                      onRecolor={recolorOne}
                    />
                  ))}
                </div>
                <Button onClick={downloadAll} disabled={expertBlocked} className="min-h-11 w-full">
                  <Download aria-hidden="true" />
                  Baixar todos os {specs.length} criativos (PNG)
                </Button>
              </div>
            )}


          </div>
        </section>
      </main>
    </div>
  );
}
