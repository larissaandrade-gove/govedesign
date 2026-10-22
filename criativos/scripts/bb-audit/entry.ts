/**
 * Harness do audit headless (scripts/bb-audit.mjs). Roda no Chromium:
 *  - modo BB: todos os layouts × formatos × esquemas × fundos (sólido e fotos
 *    sintéticas) × com/sem logomarca BB → sobreposição, contraste ≥ 4,5:1 de
 *    cada texto contra os pixels reais e paleta (cores efetivamente aplicadas);
 *  - follow-ups BB: 2 modelos × 2 formatos × esquemas × fundos × logo;
 *  - regressão GOVE (opcional): compara pixel a pixel com o renderer do HEAD.
 *
 * A "logomarca BB" usada aqui é um retângulo sintético SÓ para teste de
 * layout (não é a marca); o app usa o arquivo oficial enviado pelo usuário.
 */
import {
  EXPERT_LAYOUTS,
  FORMATS,
  LAYOUTS,
  STUDIO_LAYOUTS,
  BG_PRESETS,
  SCHEMES,
  renderCreative,
  type CreativeSpec,
} from "@/lib/creative/renderer";
import { renderFollowup, type FollowupSpec, FOLLOWUP_FORMATS } from "@/lib/creative/followup";
import { loadLogoLibrary } from "@/lib/creative/logos";
import { validateCreative } from "@/lib/creative/brand";
import { BB_COPY, BB_PALETTE, BB_SCHEMES, bbFontsReady, loadBBFonts } from "@/lib/creative/bb";

type Old = {
  renderCreative?: (c: HTMLCanvasElement, s: CreativeSpec) => unknown;
  renderFollowup?: (c: HTMLCanvasElement, s: FollowupSpec) => unknown;
};

const P = BB_PALETTE;

function canvasImage(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!);
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = c.toDataURL("image/png");
  });
}

/** Fotos sintéticas: movimentada (cores e luminâncias variadas), clara e escura. */
async function photos() {
  const busy = await canvasImage(1200, 1500, (ctx) => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `hsl(${Math.floor(rnd() * 360)}, ${40 + rnd() * 60}%, ${10 + rnd() * 80}%)`;
      ctx.fillRect(rnd() * 1200, rnd() * 1500, 40 + rnd() * 260, 40 + rnd() * 260);
    }
  });
  const light = await canvasImage(1200, 1500, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 1200, 1500);
    g.addColorStop(0, "#f2efe6");
    g.addColorStop(1, "#c9d6df");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1200, 1500);
  });
  const dark = await canvasImage(1200, 1500, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 1500);
    g.addColorStop(0, "#14202b");
    g.addColorStop(1, "#3a2b1f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1200, 1500);
  });
  return { busy, light, dark };
}

/** Logos sintéticas (apenas teste de layout): horizontal e central. */
async function fakeLogos() {
  const horizontal = await canvasImage(640, 160, (ctx) => {
    ctx.fillStyle = P.amareloInstitucional;
    ctx.fillRect(0, 0, 160, 160);
    ctx.fillStyle = P.azulInstitucional;
    ctx.fillRect(180, 40, 460, 80);
  });
  const central = await canvasImage(300, 240, (ctx) => {
    ctx.fillStyle = P.azulInstitucional;
    ctx.fillRect(90, 0, 120, 120);
    ctx.fillStyle = P.azulEscuro;
    ctx.fillRect(0, 160, 300, 80);
  });
  return { horizontal, central };
}

const LONG = {
  headline: "Juntos, a gente simplifica a gestão pública da sua cidade",
  subhead: "Reúna as demandas do cidadão em um só lugar e responda com agilidade, todos os dias.",
};

export async function run(opts: { old?: Old; quick?: boolean } = {}) {
  const t0 = performance.now();
  const fontsOk = await loadBBFonts();
  const library = await loadLogoLibrary();
  const ph = await photos();
  const logos = await fakeLogos();
  const expertPhoto = ph.dark;
  const canvas = document.createElement("canvas");

  const layouts = [...LAYOUTS, ...STUDIO_LAYOUTS, ...EXPERT_LAYOUTS].map((l) => l.key);
  const backgrounds: [string, HTMLImageElement | null][] = [
    ["sólido", null],
    ["foto movimentada", ph.busy],
    ["foto clara", ph.light],
    ["foto escura", ph.dark],
  ];
  const logoCases: [string, HTMLImageElement | null][] = [
    ["sem logo BB", null],
    ["logo BB horizontal", logos.horizontal],
    ["logo BB central", logos.central],
  ];
  const texts = [
    {
      headline: BB_COPY.headlines.split("\n")[1]!,
      subhead: BB_COPY.subheads.split("\n")[0]!,
      cta: "Agende uma conversa",
      badge: "Case de sucesso",
      urgency: "Inscrições até sexta",
      token: "Divinópolis/MG",
    },
    { ...LONG, cta: "Solicite uma demonstração", badge: "Webinar ao vivo", urgency: "Vagas limitadas", token: "Campinas/SP" },
  ];

  const creative = {
    renders: 0,
    overlapFails: [] as string[],
    contrastFails: [] as string[],
    paletteFails: [] as string[],
    complianceFails: [] as string[],
    textsChecked: 0,
    protected: 0,
    minContrast: Infinity,
  };
  for (const layout of layouts)
    for (const f of FORMATS)
      for (const sc of BB_SCHEMES)
        for (const [bgName, bg] of backgrounds)
          for (const [logoName, bbLogo] of logoCases)
            for (const [ti, tx] of texts.entries()) {
              if (opts.quick && ti > 0) continue;
              const spec: CreativeSpec = {
                ...tx,
                format: f.key,
                bgColor: "#20133D",
                layout,
                icon: "arrow",
                themeIcon: "clock",
                background: bg,
                logos: library,
                identity: "bb",
                bbScheme: sc.id,
                bbLogo,
                expert: layout.startsWith("expert")
                  ? { enabled: true, name: "Ana Souza", role: "Secretária de Gestão", photo: expertPhoto }
                  : null,
              };
              const r = renderCreative(canvas, spec);
              creative.renders++;
              const tag = `${layout} · ${f.key} · ${sc.id} · ${bgName} · ${logoName} · texto ${ti + 1}`;
              if (r.overlaps.length)
                creative.overlapFails.push(`${tag}: ${r.overlaps.map((o) => o.join("×")).join(", ")}`);
              const a = r.bb!;
              creative.textsChecked += a.texts.length;
              creative.protected += a.fixed;
              for (const t of a.texts) {
                creative.minContrast = Math.min(creative.minContrast, t.min);
                if (!t.pass) creative.contrastFails.push(`${tag}: ${t.id} ${t.color} ${t.min.toFixed(2)}`);
              }
              if (a.offPalette.length) creative.paletteFails.push(`${tag}: ${a.offPalette.join(", ")}`);
              const rep = validateCreative({
                logoIsWordmark: true,
                usedColors: r.usedColors,
                textColor: r.textColor,
                textBackgroundColor: r.textBackgroundColor,
                ctaText: spec.cta,
                headline: spec.headline,
                subhead: spec.subhead,
                logo: r.logo,
                overlaps: r.overlaps,
                identity: "bb",
                bb: r.bb,
                bbLogo: r.bbLogo,
              });
              if (!rep.pass)
                creative.complianceFails.push(
                  `${tag}: ${rep.checks.filter((c) => !c.pass).map((c) => c.label).join(" | ")}`,
                );
            }

  // Follow-ups BB
  const follow = {
    renders: 0,
    fails: [] as string[],
    overlapFails: [] as string[],
    textsChecked: 0,
    protected: 0,
    minContrast: Infinity,
  };
  const markers = ["check", "zap", "arrow", "dot", "number"] as const;
  for (const model of ["product", "event"] as const)
    for (const f of FOLLOWUP_FORMATS)
      for (const sc of BB_SCHEMES)
        for (const [bgName, bg] of backgrounds)
          for (const [logoName, bbLogo] of logoCases)
            for (const marker of model === "product" ? markers : (["check"] as const))
              for (const withPhoto of model === "event" ? [true, false] : [true]) {
                const spec: FollowupSpec = {
                  model,
                  format: f.key,
                  bgPreset: "deep",
                  product: {
                    title: "Novidades para você atender melhor",
                    items: [
                      "Encontre cada demanda por secretaria",
                      "Baixe os relatórios do mês em PDF",
                      "Avise o cidadão pelo WhatsApp",
                      "Entre com a conta gov.br",
                    ],
                    marker,
                    version: "v3.2 · outubro 2026",
                    cta: "Conheça as novidades",
                  },
                  event: {
                    kicker: "Presença confirmada",
                    name: "Ana Souza",
                    event: "Encontro de Gestores Públicos: juntos por cidades mais simples",
                    date: "2026-11-12",
                    time: "19:00",
                    photo: withPhoto ? ph.light : null,
                  },
                  logos: library,
                  bgImage: bg,
                  identity: "bb",
                  bbScheme: sc.id,
                  bbLogo,
                };
                const r = renderFollowup(canvas, spec);
                follow.renders++;
                const tag = `${model} · ${f.key} · ${sc.id} · ${bgName} · ${logoName} · ${marker}${withPhoto ? "" : " · sem foto"}`;
                const a = r.bb!;
                follow.textsChecked += a.texts.length;
                follow.protected += a.fixed;
                for (const t of a.texts) follow.minContrast = Math.min(follow.minContrast, t.min);
                if (r.overlaps.length) follow.overlapFails.push(`${tag}: ${r.overlaps.map((o) => o.join("×")).join(", ")}`);
                const failing = r.checks.filter(
                  (c) => !c.pass && c.id !== "photo" && c.id !== "fit",
                );
                if (failing.length) follow.fails.push(`${tag}: ${failing.map((c) => c.label).join(" | ")}`);
              }

  // Regressão GOVE: mesmo spec no renderer do HEAD e no atual → pixels idênticos.
  const gove = { compared: 0, diffs: [] as string[] };
  if (opts.old?.renderCreative) {
    const a = document.createElement("canvas");
    const b = document.createElement("canvas");
    const same = () => {
      const da = a.getContext("2d")!.getImageData(0, 0, a.width, a.height).data;
      const db = b.getContext("2d")!.getImageData(0, 0, b.width, b.height).data;
      if (da.length !== db.length) return false;
      for (let i = 0; i < da.length; i++) if (da[i] !== db[i]) return false;
      return true;
    };
    for (const layout of layouts)
      for (const f of FORMATS)
        for (const sc of SCHEMES)
          for (const [bgName, bg] of [["sem foto", null], ["foto", ph.busy]] as const) {
            const preset = BG_PRESETS[(gove.compared * 7) % BG_PRESETS.length]!.key;
            const spec: CreativeSpec = {
              ...texts[0]!,
              format: f.key,
              bgColor: "#3D0099",
              cardColor: "#20133D",
              layout,
              scheme: sc.key,
              icon: "arrow",
              themeIcon: "clock",
              background: bg,
              bgPreset: preset,
              logos: library,
              expert: layout.startsWith("expert")
                ? { enabled: true, name: "Ana Souza", role: "Secretária de Gestão", photo: expertPhoto }
                : null,
            };
            opts.old.renderCreative(a, spec);
            renderCreative(b, spec);
            gove.compared++;
            if (!same()) gove.diffs.push(`${layout} · ${f.key} · ${sc.key} · ${bgName}`);
          }
    if (opts.old.renderFollowup)
      for (const model of ["product", "event"] as const)
        for (const f of FOLLOWUP_FORMATS)
          for (const p of BG_PRESETS)
            for (const bg of [null, ph.busy]) {
              const spec: FollowupSpec = {
                model,
                format: f.key,
                bgPreset: p.key,
                product: {
                  title: "Novidades da plataforma Gove",
                  items: ["Painel de demandas", "Relatórios mensais em PDF", "Avisos por WhatsApp"],
                  marker: "number",
                  version: "v3.2",
                  cta: "Conheça as novidades",
                },
                event: {
                  kicker: "Presença confirmada",
                  name: "Ana Souza",
                  event: "Encontro de Gestores Públicos",
                  date: "2026-11-12",
                  time: "19:00",
                  photo: ph.light,
                },
                logos: library,
                bgImage: bg,
              };
              opts.old.renderFollowup(a, spec);
              renderFollowup(b, spec);
              gove.compared++;
              if (!same()) gove.diffs.push(`followup ${model} · ${f.key} · ${p.key} · ${bg ? "foto" : "sem foto"}`);
            }
  }

  return {
    ms: Math.round(performance.now() - t0),
    fonts: { loaded: fontsOk, check: bbFontsReady() },
    creative: { ...creative, minContrast: +creative.minContrast.toFixed(2) },
    followups: { ...follow, minContrast: +follow.minContrast.toFixed(2) },
    gove,
  };
}

(window as unknown as { __bbAudit: typeof run }).__bbAudit = run;
