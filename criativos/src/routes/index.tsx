import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Download,
  Film,
  ImageIcon,
  ImagePlus,
  LayoutTemplate,
  LogOut,
  Moon,
  Palette,
  RectangleVertical,
  Search,
  Shapes,
  Sparkles,
  Sun,
  Type,
  UserRound,
  X,
} from "lucide-react";

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
import { AppHeader, FormatChip, Section, SettingRow } from "@/components/AppChrome";
import { BG_COLORS, MAX_HEADLINE, MAX_SUBHEAD, PALETTE } from "@/lib/creative/brand";
import {
  ALL_LOGO_VARIANTS,
  explainVariants,
  loadLogoLibrary,
  luminance,
  type LogoLibrary,
  type LogoVariantId,
} from "@/lib/creative/logos";
import { LogoVariantPicker } from "@/components/LogoVariantPicker";
import { ICONS } from "@/lib/creative/icons";
import { getGateStatus, signOut } from "@/lib/gate.functions";
import { type PexelsPhoto } from "@/lib/pexels.functions";
import { PexelsCredit, PexelsPicker, orientationFor } from "@/components/PexelsPicker";
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
    { img: HTMLImageElement; name: string; tone: "light" | "dark"; credit?: PexelsPhoto }[]
  >([]);
  const [library, setLibrary] = useState<LogoLibrary | null>(null);
  const [enabledPresets, setEnabledPresets] = useState<string[]>(BG_PRESETS.map((p) => p.key));
  // Busca de imagens Pexels (terceira origem de fundo, igual ao Studio).
  const [enabledLogos, setEnabledLogos] = useState<LogoVariantId[]>(ALL_LOGO_VARIANTS);
  const [enabledLayouts, setEnabledLayouts] = useState<CreativeLayout[]>(LAYOUTS.map((l) => l.key));
  const [enabledSchemes, setEnabledSchemes] = useState<CreativeScheme[]>(SCHEMES.map((s) => s.key));
  // Divulgação progressiva: textos abertos; ajustes finos recolhidos.
  const [openSections, setOpenSections] = useState({
    backgrounds: false,
    schemes: false,
    logos: false,
    layouts: false,
    icons: false,
    textVariables: true,
  });
  const toggleSection = (k: keyof typeof openSections) =>
    setOpenSections((p) => ({ ...p, [k]: !p[k] }));

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
          ? expertKeys.includes(s.layout)
            ? s.layout
            : (expertKeys[i % expertKeys.length] ?? "expert-card")
          : expertKeys.includes(s.layout)
            ? (LAYOUTS[i % LAYOUTS.length]?.key ?? "card-bottom")
            : s.layout,
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

  /** Logomarcas oficiais + versões habilitadas; o renderer escolhe pelo contraste do fundo real. */
  const pickLogoSet = useCallback(
    () => ({ logos: library, logoVariants: enabledLogos }),
    [library, enabledLogos],
  );

  /** Fundos atuais (HEX) para avaliar as versões da logo; null = fotos (avaliado por peça). */
  const logoStatuses = useMemo(() => {
    if (useImage) return explainVariants(null);
    const bgs = new Set<string>();
    const presets = BG_PRESETS.filter((p) => enabledPresets.includes(p.key));
    for (const sc of enabledSchemes) {
      if (sc === "minimal-light") bgs.add(PALETTE.white);
      else if (sc === "minimal-dark")
        [PALETTE.purple1, PALETTE.purple2, PALETTE.purple3].forEach((c) => bgs.add(c));
      else presets.forEach((p) => p.colors.forEach((c) => bgs.add(c)));
    }
    return explainVariants([...bgs].map(luminance));
  }, [useImage, enabledPresets, enabledSchemes]);

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
              : {
                  ...s,
                  themeIcon: selectedIcons.length ? (pick(selectedIcons) ?? "clock") : "clock",
                },
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
        layout ??
        pick(enabledLayouts.length ? enabledLayouts : LAYOUTS.map((l) => l.key)) ??
        "card-bottom";
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
      toast.error("Mantenha ao menos uma versão da logomarca com contraste.");
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

  /** Adiciona uma foto do Pexels (já segura para o canvas) aos fundos do lote. */
  const addPexelsPhoto = (img: HTMLImageElement, photo: PexelsPhoto) => {
    const tone: "light" | "dark" = imageBrightness(img, "all") >= 128 ? "light" : "dark";
    setBackgrounds((prev) => [
      ...prev,
      { img, name: photo.alt || `Pexels #${photo.id}`, tone, credit: photo },
    ]);
    toast.success("Imagem adicionada aos fundos.");
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
      toast.success(
        `${loaded.length} imagem(ns) adicionada(s) — confira a classificação de fundo.`,
      );
    } catch {
      toast.error("Não foi possível ler uma das imagens.");
    }
    e.target.value = "";
  };

  const setBackgroundTone = (i: number, tone: "light" | "dark") =>
    setBackgrounds((prev) => prev.map((b, idx) => (idx === i ? { ...b, tone } : b)));

  const toggleLogo = (id: LogoVariantId, on: boolean) =>
    setEnabledLogos((prev) => {
      const usable = prev.filter(
        (v) => v !== id && logoStatuses.find((s) => s.id === v)?.status !== "blocked",
      );
      if (!on && !usable.length) {
        toast.error("Mantenha ao menos uma versão da logomarca com contraste.");
        return prev;
      }
      return toggleIn(prev, id, on);
    });

  const iconThemes = useMemo(() => Array.from(new Set(ICONS.map((i) => i.theme))), []);

  const size = formatSize(format);
  const presetBackground = (p: (typeof BG_PRESETS)[number]) =>
    p.kind === "solid"
      ? p.colors[0]
      : p.kind === "radial"
        ? `radial-gradient(circle at 50% 35%, ${p.colors[0]}, ${p.colors[1]})`
        : `linear-gradient(${p.kind === "diagonal" ? "135deg" : "180deg"}, ${p.colors[0]}, ${p.colors[1]})`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <AppHeader
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            onClick={handleSignOut}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut aria-hidden="true" />
          </Button>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[400px_1fr]">
          <div className="min-w-0 space-y-3">
            <div
              role="group"
              aria-label="Tipo de saída"
              className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
            >
              {(
                [
                  { key: "image", label: "Imagem", hint: "PNG estático", icon: ImageIcon },
                  { key: "video", label: "Vídeo", hint: "MP4 15s, 3 formatos", icon: Film },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    type="button"
                    aria-pressed={mode === m.key}
                    title={m.hint}
                    onClick={() => setMode(m.key)}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      mode === m.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {mode !== "video" && (
              <div role="group" aria-label="Formato da arte" className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
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
            )}

            <ExpertFields value={expert} onChange={setExpert} />

            <Section
              icon={Type}
              title="Textos"
              open={openSections.textVariables}
              onToggle={() => toggleSection("textVariables")}
            >
              <div className="space-y-2">
                <Label htmlFor="headlines" className="flex items-baseline justify-between gap-2">
                  Headlines{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    máx. 60 caracteres
                  </span>
                </Label>
                <Textarea
                  id="headlines"
                  rows={4}
                  value={headlines}
                  onChange={(e) => setHeadlines(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subheads" className="flex items-baseline justify-between gap-2">
                  Subheads{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    máx. 90 caracteres
                  </span>
                </Label>
                <Textarea
                  id="subheads"
                  rows={4}
                  value={subheads}
                  onChange={(e) => setSubheads(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctas" className="flex items-baseline justify-between gap-2">
                  CTAs{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    sempre com verbo de ação
                  </span>
                </Label>
                <Textarea
                  id="ctas"
                  rows={4}
                  value={ctas}
                  onChange={(e) => setCtas(e.target.value)}
                />
              </div>
              <SettingRow htmlFor="use-urgency" label="Gatilhos de urgência">
                <Switch id="use-urgency" checked={useUrgency} onCheckedChange={setUseUrgency} />
              </SettingRow>
              {useUrgency && (
                <Textarea
                  id="urgencies"
                  rows={4}
                  aria-label="Frases de urgência"
                  value={urgencies}
                  onChange={(e) => setUrgencies(e.target.value)}
                />
              )}
              <div className="space-y-2">
                <Label htmlFor="badges">Selos</Label>
                <Textarea
                  id="badges"
                  rows={3}
                  value={badges}
                  onChange={(e) => setBadges(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokens" className="flex items-baseline justify-between gap-2">
                  Tokens regionais{" "}
                  <span className="text-xs font-normal text-muted-foreground">opcional</span>
                </Label>
                <Textarea
                  id="tokens"
                  rows={3}
                  value={tokens}
                  onChange={(e) => setTokens(e.target.value)}
                />
              </div>
            </Section>

            <Section
              icon={ImagePlus}
              title="Fundo"
              summary={
                useImage
                  ? `${backgrounds.length} foto${backgrounds.length === 1 ? "" : "s"}`
                  : `${enabledPresets.length}/${BG_PRESETS.length}`
              }
              open={openSections.backgrounds}
              onToggle={() => toggleSection("backgrounds")}
            >
              <SettingRow htmlFor="use-image" label="Usar fotos de fundo">
                <Switch id="use-image" checked={useImage} onCheckedChange={setUseImage} />
              </SettingRow>

              {useImage ? (
                <>
                  <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm font-medium text-primary transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted">
                    <ImagePlus className="size-5" aria-hidden="true" />
                    Adicionar imagens
                    <input
                      id="bg-file"
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={handleBackgrounds}
                    />
                  </label>
                  {backgrounds.length > 0 && (
                    <ul className="space-y-1">
                      {backgrounds.map((b, i) => (
                        <li
                          key={`${b.name}-${i}`}
                          className="flex items-center gap-1 rounded-lg bg-muted pl-2 text-xs"
                        >
                          <img
                            src={b.img.src}
                            alt=""
                            className="size-8 shrink-0 rounded object-cover"
                          />
                          <span className="min-w-0 flex-1 truncate px-1" title={b.name}>
                            {b.name}
                          </span>
                          {(["light", "dark"] as const).map((t) => {
                            const label = t === "light" ? "Fundo claro" : "Fundo escuro";
                            const Icon = t === "light" ? Sun : Moon;
                            return (
                              <button
                                key={t}
                                type="button"
                                aria-pressed={b.tone === t}
                                aria-label={`${label}: ${b.name}`}
                                title={label}
                                onClick={() => setBackgroundTone(i, t)}
                                className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  b.tone === t
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
                            aria-label={`Remover ${b.name}`}
                            title="Remover"
                            onClick={() => setBackgrounds((p) => p.filter((_, idx) => idx !== i))}
                            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {backgrounds.some((b) => b.credit) && (
                    <div className="space-y-0.5">
                      {backgrounds.map((b, i) =>
                        b.credit ? <PexelsCredit key={`c-${i}`} photo={b.credit} /> : null,
                      )}
                    </div>
                  )}
                  <PexelsPicker
                    orientation={orientationFor(size.w, size.h)}
                    onPick={addPexelsPhoto}
                    label="Buscar imagens no Pexels"
                  />
                </>
              ) : (
                <div role="group" aria-label="Fundos padrão" className="grid grid-cols-3 gap-2">
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
                        className={`h-12 rounded-lg border-2 transition-opacity ${
                          on ? "border-primary ring-2 ring-primary/30" : "border-border opacity-40"
                        }`}
                        style={{ background: presetBackground(p) }}
                      />
                    );
                  })}
                </div>
              )}
            </Section>

            <Section
              icon={Palette}
              title="Cores"
              summary={`${enabledSchemes.length}/${SCHEMES.length}`}
              open={openSections.schemes}
              onToggle={() => toggleSection("schemes")}
            >
              {SCHEMES.map((s) => (
                <SettingRow key={s.key} htmlFor={`scheme-${s.key}`} label={s.label}>
                  <Switch
                    id={`scheme-${s.key}`}
                    checked={enabledSchemes.includes(s.key)}
                    onCheckedChange={(v) => setEnabledSchemes((p) => toggleIn(p, s.key, v))}
                  />
                </SettingRow>
              ))}
            </Section>

            <Section
              icon={BadgeCheck}
              title="Logomarca"
              summary={`${
                enabledLogos.filter(
                  (v) => logoStatuses.find((s) => s.id === v)?.status !== "blocked",
                ).length
              }/${ALL_LOGO_VARIANTS.length}`}
              open={openSections.logos}
              onToggle={() => toggleSection("logos")}
            >
              <LogoVariantPicker
                idPrefix="lote"
                enabled={enabledLogos}
                statuses={logoStatuses}
                onToggle={toggleLogo}
              />
            </Section>

            <Section
              icon={LayoutTemplate}
              title="Diagramações"
              summary={
                expert.enabled ? "Especialista" : `${enabledLayouts.length}/${LAYOUTS.length}`
              }
              open={openSections.layouts}
              onToggle={() => toggleSection("layouts")}
            >
              {expert.enabled && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserRound className="size-4 shrink-0" aria-hidden="true" />
                  Material colaborativo ativo: layouts exclusivos de especialista.
                </p>
              )}
              {(expert.enabled ? [] : LAYOUTS).map((l) => (
                <SettingRow key={l.key} htmlFor={`layout-${l.key}`} label={l.label}>
                  <Switch
                    id={`layout-${l.key}`}
                    checked={enabledLayouts.includes(l.key)}
                    onCheckedChange={(v) => setEnabledLayouts((p) => toggleIn(p, l.key, v))}
                  />
                </SettingRow>
              ))}
            </Section>

            <Section
              icon={Shapes}
              title="Ícones de urgência"
              summary={`${selectedIcons.length}`}
              open={openSections.icons}
              onToggle={() => toggleSection("icons")}
            >
              {iconThemes.map((theme) => (
                <div key={theme} role="group" aria-label={theme} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground capitalize">{theme}</p>
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
                              : "border-border bg-card text-muted-foreground hover:bg-muted"
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
            </Section>

            <Button
              size="lg"
              onClick={generate}
              className="sticky bottom-3 z-10 min-h-12 w-full text-base shadow-lg"
            >
              <Sparkles aria-hidden="true" />
              {mode === "video" ? "Gerar 4 vídeos" : "Gerar 8 versões"}
            </Button>
          </div>

          <div className="min-w-0">
            {specs.length === 0 ? (
              <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-center sm:min-h-80 lg:sticky lg:top-20">
                {mode === "video" ? (
                  <Film className="size-8 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <RectangleVertical className="size-8 text-muted-foreground" aria-hidden="true" />
                )}
                <p className="text-sm text-muted-foreground">
                  {mode === "video"
                    ? "Os 4 vídeos (15s, 3 formatos) aparecem aqui."
                    : `As 8 versões em ${size.w}×${size.h}px aparecem aqui.`}
                </p>
              </div>
            ) : mode === "video" ? (
              <div className="space-y-3">
                <p className="flex min-h-11 items-center text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{specs.length} vídeos</span>
                  &nbsp;· 15s · sem áudio
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {specs.map((spec, i) => (
                    <VideoCard
                      key={i}
                      spec={spec}
                      index={i}
                      onReload={reloadOne}
                      onRecolor={recolorOne}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{specs.length} criativos</span>{" "}
                    · {size.w}×{size.h}px
                  </p>
                  <Button
                    variant="outline"
                    onClick={downloadAll}
                    disabled={expertBlocked}
                    className="min-h-11"
                    title={`Baixar os ${specs.length} criativos em PNG`}
                  >
                    <Download aria-hidden="true" />
                    Baixar todos
                  </Button>
                </div>
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
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
