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
} as const;

/** Únicas cores permitidas para fundo/overlay. */
export const BG_COLORS = [PALETTE.purple1, PALETTE.purple2, PALETTE.purple3] as const;

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
];

/** Pares (texto, fundo) aprovados. */
export const APPROVED_PAIRS: Array<[string, string]> = [
  [PALETTE.white, PALETTE.purple1],
  [PALETTE.white, PALETTE.purple2],
  [PALETTE.white, PALETTE.purple3],
  [PALETTE.purple3, PALETTE.white],
  [PALETTE.purple3, PALETTE.gold],
  [PALETTE.purple3, PALETTE.supportLight],
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

export const BANNED_CTA_WORDS = ["compre", "garanta o seu", "aproveite agora", "compre agora"];

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
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
}): ComplianceReport {
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
    { id: "logo", label: "Logo = wordmark completo GOVE", pass: spec.logoIsWordmark },
    { id: "palette", label: "Cores dentro da paleta institucional", pass: paletteOk },
    { id: "pair", label: "Par texto/fundo aprovado", pass: pairOk },
    { id: "cta", label: "CTA com verbo de ação (sem linguagem de e-commerce)", pass: verbOk },
    { id: "length", label: "Headline ≤ 60 e subhead ≤ 90 caracteres", pass: lengthOk },
  ];

  return { pass: checks.every((c) => c.pass), checks };
}
