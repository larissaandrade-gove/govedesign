// GOVE — constantes e regras travadas do manual de marca.

export const PALETTE = {
  gold: "#FFC72C",
  purple1: "#3D0099",
  purple2: "#351F65",
  purple3: "#20133D",
  supportDark: "#2F3539",
  supportMid: "#5B6770",
  supportLight: "#F4F4F4",
  white: "#FFFFFF",
  // Secundárias da paleta institucional (Design System GOVE)
  lilac: "#A278DA",
  cyan: "#5AC2CD",
  blue: "#16499F",
} as const;

/** Únicas cores permitidas para fundo/overlay. */
export const BG_COLORS = [PALETTE.purple1, PALETTE.purple2, PALETTE.purple3, PALETTE.blue] as const;

/** Únicas cores permitidas para texto. */
export const TEXT_COLORS = [PALETTE.white, PALETTE.purple3] as const;

export const ALLOWED_COLORS: string[] = [
  PALETTE.gold,
  PALETTE.purple1,
  PALETTE.purple2,
  PALETTE.purple3,
  PALETTE.supportDark,
  PALETTE.supportMid,
  PALETTE.supportLight,
  PALETTE.white,
  PALETTE.lilac,
  PALETTE.cyan,
  PALETTE.blue,
];

/** Pares (texto, fundo) aprovados. */
export const APPROVED_PAIRS: Array<[string, string]> = [
  [PALETTE.white, PALETTE.purple1],
  [PALETTE.white, PALETTE.purple2],
  [PALETTE.white, PALETTE.purple3],
  [PALETTE.purple3, PALETTE.white],
  [PALETTE.purple3, PALETTE.gold],
  [PALETTE.purple3, PALETTE.supportLight],
  [PALETTE.white, PALETTE.blue], // 8,6:1
  [PALETTE.purple3, PALETTE.cyan], // 8,0:1
  [PALETTE.purple3, PALETTE.lilac], // 5,0:1
];

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
export const PADDING = 24;

export const MAX_HEADLINE = 60;
export const MAX_SUBHEAD = 90;

export const ACTION_VERBS = [
  "agende",
  "fale",
  "baixe",
  "solicite",
  "conheça",
  "peça",
  "assista",
  "inscreva",
  "receba",
  "descubra",
];

/** Verbos de ação aceitos a mais no tom de voz BB (imperativo, próximo). */
export const BB_ACTION_VERBS = ["acesse", "simule", "comece", "conte", "faça", "venha", "abra", "cadastre", "participe", "veja"];

export const BANNED_CTA_WORDS = ["compre", "garanta o seu", "aproveite agora", "compre agora"];

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

/** Brilho percebido (0-255). */
export function brightnessOfHex(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Regra de contraste: <128 → branco; >=128 → #20133D (nunca preto puro). */
export function contrastTextColor(brightness: number): string {
  return brightness < 128 ? PALETTE.white : PALETTE.purple3;
}

export type ComplianceReport = {
  pass: boolean;
  checks: { id: string; label: string; pass: boolean }[];
};

export function validateCreative(spec: {
  logoIsWordmark: boolean;
  usedColors: string[];
  textColor: string;
  textBackgroundColor: string;
  ctaText: string;
  headline: string;
  subhead: string;
  /** Resultado da regra de contraste da logomarca (renderer). */
  logo?:
    { ok: boolean; minContrast: number; drawn: boolean; plate: string | null } | null | undefined;
  /** Pares de elementos que ainda se cruzam após o resolvedor de layout. */
  overlaps?: [string, string][] | undefined;
  /** Identidade Banco do Brasil: verificação de contraste/paleta do renderer. */
  identity?: "gove" | "bb" | undefined;
  bb?:
    | {
        texts: { id: string; min: number; pass: boolean }[];
        offPalette: string[];
        fixed: number;
        pass: boolean;
      }
    | null
    | undefined;
  bbLogo?: { drawn: boolean; minWidthOk: boolean; version: string } | null | undefined;
}): ComplianceReport {
  if (spec.identity === "bb") return validateBB(spec);
  const norm = (c: string) => c.toUpperCase();
  const paletteOk = spec.usedColors.every((c) => ALLOWED_COLORS.map(norm).includes(norm(c)));
  const pairOk = APPROVED_PAIRS.some(
    ([t, b]) => norm(t) === norm(spec.textColor) && norm(b) === norm(spec.textBackgroundColor),
  );
  const ctaLower = spec.ctaText.toLowerCase();
  const verbOk =
    ACTION_VERBS.some((v) => ctaLower.startsWith(v)) &&
    !BANNED_CTA_WORDS.some((w) => ctaLower.includes(w));
  const lengthOk = spec.headline.length <= MAX_HEADLINE && spec.subhead.length <= MAX_SUBHEAD;

  const checks = [
    {
      id: "logo",
      label: spec.logo?.drawn
        ? `Logomarca oficial com contraste ${spec.logo.minContrast.toFixed(1).replace(".", ",")}:1${spec.logo.plate ? " (sobre placa)" : ""} — mínimo 4,5:1`
        : "Logomarca oficial carregada",
      pass: spec.logoIsWordmark && !!spec.logo?.drawn && spec.logo.ok,
    },
    {
      id: "overlap",
      label: spec.overlaps?.length
        ? `Sem sobreposição de elementos (${spec.overlaps.map(([a, b]) => `${a} × ${b}`).join(", ")})`
        : "Sem sobreposição de elementos",
      pass: !spec.overlaps?.length,
    },
    { id: "palette", label: "Cores dentro da paleta institucional", pass: paletteOk },
    { id: "pair", label: "Par texto/fundo aprovado", pass: pairOk },
    { id: "cta", label: "CTA com verbo de ação (sem linguagem de e-commerce)", pass: verbOk },
    { id: "length", label: "Headline ≤ 60 e subhead ≤ 90 caracteres", pass: lengthOk },
  ];

  return { pass: checks.every((c) => c.pass), checks };
}

/** Checagens do modo Banco do Brasil (paleta BB, contraste ≥ 4,5:1 por texto, logomarca). */
function validateBB(spec: Parameters<typeof validateCreative>[0]): ComplianceReport {
  const audit = spec.bb;
  const failing = audit?.texts.filter((t) => !t.pass) ?? [];
  const ctaLower = spec.ctaText.toLowerCase();
  const verbOk =
    [...ACTION_VERBS, ...BB_ACTION_VERBS].some((v) => ctaLower.startsWith(v)) &&
    !BANNED_CTA_WORDS.some((w) => ctaLower.includes(w));
  const lengthOk = spec.headline.length <= MAX_HEADLINE && spec.subhead.length <= MAX_SUBHEAD;
  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const worst = audit?.texts.length ? Math.min(...audit.texts.map((t) => t.min)) : null;
  const bbLogo = spec.bbLogo;
  const checks = [
    {
      id: "logo",
      label: bbLogo?.drawn
        ? bbLogo.minWidthOk
          ? "Logomarca BB (arquivo oficial) aplicada sem alterações"
          : "Logomarca BB abaixo da largura mínima digital"
        : spec.logo?.drawn
          ? `Logomarca GOVE com contraste ${spec.logo.minContrast.toFixed(1).replace(".", ",")}:1 (envie a logomarca BB para usá-la)`
          : "Logomarca carregada",
      pass: bbLogo?.drawn ? bbLogo.minWidthOk : spec.logoIsWordmark && !!spec.logo?.drawn && spec.logo.ok,
    },
    {
      id: "overlap",
      label: spec.overlaps?.length
        ? `Sem sobreposição de elementos (${spec.overlaps.map(([a, b]) => `${a} × ${b}`).join(", ")})`
        : "Sem sobreposição de elementos",
      pass: !spec.overlaps?.length,
    },
    {
      id: "palette",
      label: audit?.offPalette.length
        ? `Cores fora da paleta BB: ${audit.offPalette.join(", ")}`
        : "Cores dentro da paleta BB",
      pass: !!audit && !audit.offPalette.length,
    },
    {
      id: "contrast",
      label: failing.length
        ? `Contraste < 4,5:1 em: ${failing.map((t) => t.id).join(", ")}`
        : `Textos com contraste ≥ 4,5:1${worst != null ? ` (mín. ${fmt(worst)}:1)` : ""}${audit?.fixed ? ` · ${audit.fixed} com proteção` : ""}`,
      pass: !!audit && !failing.length,
    },
    { id: "cta", label: "CTA com verbo de ação (sem linguagem de e-commerce)", pass: verbOk },
    { id: "length", label: "Headline ≤ 60 e subhead ≤ 90 caracteres", pass: lengthOk },
  ];
  return { pass: checks.every((c) => c.pass), checks };
}
