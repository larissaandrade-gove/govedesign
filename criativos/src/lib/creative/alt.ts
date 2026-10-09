import { PALETTE } from "./brand";
import { LAYOUTS, type CreativeSpec } from "./renderer";

const COLOR_NAMES: Record<string, string> = {
  [PALETTE.purple1.toUpperCase()]: "roxo vibrante",
  [PALETTE.purple2.toUpperCase()]: "roxo médio",
  [PALETTE.purple3.toUpperCase()]: "roxo escuro",
  [PALETTE.white.toUpperCase()]: "branco",
  [PALETTE.gold.toUpperCase()]: "dourado",
};

const LAYOUT_NAMES: Record<string, string> = {
  "card-bottom": "com card de texto na parte inferior",
  "band-bottom": "com faixa de texto na base",
  "top-stack": "com o texto no topo",
  centered: "com o texto centralizado",
};

function colorName(hex?: string) {
  return (hex && COLOR_NAMES[hex.toUpperCase()]) ?? "roxo institucional";
}

/** Texto alternativo descritivo (acessibilidade) para publicação em redes sociais. */
export function buildAltText(spec: CreativeSpec): string {
  const layoutLabel =
    LAYOUT_NAMES[spec.layout] ?? LAYOUTS.find((l) => l.key === spec.layout)?.label ?? "";

  const scheme = spec.scheme ?? "institucional";
  const base = spec.background
    ? "fotografia de fundo com sobreposição roxa"
    : scheme === "minimal-light"
      ? "fundo branco minimalista"
      : `fundo ${colorName(spec.bgColor)}`;

  const parts: string[] = [
    `Peça gráfica da GOVE em formato retrato, ${base}, ${layoutLabel}`.trim(),
    "Logotipo GOVE (wordmark) no canto superior esquerdo",
  ];

  if (spec.badge) parts.push(`selo "${spec.badge}" no canto superior direito`);
  if (spec.urgency) parts.push(`etiqueta de destaque "${spec.urgency}"`);
  if (spec.expert?.enabled && spec.expert.name)
    parts.push(`foto circular do especialista ${spec.expert.name}${spec.expert.role ? `, ${spec.expert.role}` : ""}, com nome e cargo ao lado`);
  if (spec.headline) parts.push(`título: "${spec.headline}"`);
  if (spec.subhead) parts.push(`subtítulo: "${spec.subhead}"`);
  if (spec.token) parts.push(`identificação regional "${spec.token}"`);
  if (spec.cta) parts.push(`botão de chamada para ação "${spec.cta}"`);

  return `${parts.join("; ")}.`;
}
