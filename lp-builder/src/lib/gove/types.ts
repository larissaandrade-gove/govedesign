export type Align = "left" | "center" | "right";
export type Shadow = "none" | "sm" | "md";

export type BoxFill = "solid" | "gradient" | "image";
export type BgSize = "cover" | "contain" | "auto";
export type BgPosition = "center" | "top" | "bottom" | "left" | "right";
export type BgAnimation = "none" | "pan" | "kenburns" | "reveal" | "shimmer";
export type ButtonAnimation = "none" | "pulse" | "float" | "glow" | "shine";

/** Crédito de foto de banco de imagens (Pexels pede atribuição ao fotógrafo). */
export interface ImageCredit {
  source: "pexels";
  id: number;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
}

export interface BoxProps {
  fill: BoxFill;
  bgColor: string;
  bgImage: string;
  bgSize: BgSize;
  bgPosition: BgPosition;
  bgRepeat: boolean;
  overlay: number; // 0-100 (opacidade da sobreposição)
  overlayColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientVia: string; // vazio = sem parada intermediária
  gradientAngle: number; // graus
  borderColor: string;
  borderWidth: number; // 0-4
  radius: number; // 0 | 8 | 16 | 24
  shadow: Shadow;
  paddingY: number; // múltiplos de 8
  paddingX: number; // múltiplos de 8
  animation?: BgAnimation;
  /** Crédito da imagem de fundo vinda do Pexels (null = imagem própria). */
  bgCredit?: ImageCredit | null;
}

export interface TextStyle {
  weight: "regular" | "bold";
  italic: boolean;
  size: number; // px
  color: string;
  align: Align;
}

export interface TextBlock extends TextStyle {
  id: string;
  type: "text";
  tag: "h1" | "h2" | "h3" | "p";
  content: string;
}

export interface ButtonBlock extends TextStyle {
  id: string;
  type: "button";
  label: string;
  href: string;
  /** Ausente = "url" (link externo em `href`). */
  linkMode?: "url" | "section";
  /** Modo "section": id da seção, "@form" (formulário de inscrição) ou "@end" (final da página). */
  target?: string;
  variant: "filled" | "elevated" | "outline" | "glass" | "text";
  bgColor: string;
  radius: number;
  animation?: ButtonAnimation;
}

export type ImageFrame = "free" | "square" | "circle" | "rounded";

export interface ImageBlock {
  id: string;
  type: "image";
  src: string;
  alt: string;
  radius: number;
  frame?: ImageFrame;
  align: Align;
  width: number; // %
  /** Crédito da foto vinda do Pexels (null = imagem própria). */
  credit?: ImageCredit | null;
}

export interface CardBlock {
  id: string;
  type: "card";
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  align: Align;
  color: string;
  bgColor: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  shadow: Shadow;
  padding: number;
  size: number;
}

export interface RdFormBlock {
  id: string;
  type: "rdform";
  snippet: string;
}

export interface VideoBlock {
  id: string;
  type: "video";
  url: string;
  title: string;
  aspect: string; // ex.: "16 / 9"
  width: number; // %
  align: Align;
  radius: number;
}

export type CountdownMode = "d" | "dh" | "dhm" | "dhms" | "m";

export interface CountdownBlock {
  id: string;
  type: "countdown";
  target: string; // datetime-local / ISO
  mode: CountdownMode;
  align: Align;
  color: string;
  bgColor: string;
  accentColor: string;
  radius: number;
  size: number; // px dos números
  expiredText: string;
  variant?: ButtonBlock["variant"];
  animation?: ButtonAnimation;
}

export type Leaf =
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | CardBlock
  | RdFormBlock
  | VideoBlock
  | CountdownBlock;

export interface Column {
  id: string;
  children: Leaf[];
}

export interface RowBlock {
  id: string;
  type: "row";
  gap: number;
  alignItems?: "start" | "center" | "end" | "stretch";
  box: BoxProps;
  columns: Column[];
}

export interface SectionBlock {
  id: string;
  type: "section";
  box: BoxProps;
  children: RowBlock[];
}

/** Identidade visual da página: GOVE (padrão) ou Banco do Brasil. */
export type Identity = "gove" | "bb";

/** Logomarca BB (arquivo oficial enviado pelo usuário; nunca recolorida). */
export interface BBLogo {
  src: string;
  version: "horizontal" | "central" | "simbolo";
  /** Largura em px (mínimos: horizontal 140, central 70, símbolo 25). */
  width: number;
  /** Largura / altura do arquivo (para a área de proteção x/2). */
  aspect: number;
  /** Fundo da faixa: Amarelo institucional, Azul institucional ou Branco. */
  bg: string;
  align: "left" | "center";
}

export interface PageContent {
  version: 1;
  sections: SectionBlock[];
  cursor?: PageCursor;
  /** Ausente = "gove". */
  identity?: Identity;
  bbLogo?: BBLogo;
}

/** Cursor personalizado da página (ícone estático via CSS ou GIF/imagem que segue o mouse). */
export interface PageCursor {
  mode: "default" | "image" | "follower";
  url: string;
  size: number;
  hotspot: "topleft" | "center";
  hideNative: boolean;
}

export type AnyNode = SectionBlock | RowBlock | Leaf;

export interface LandingPageRow {
  id: string;
  nome: string;
  conteudo: PageContent;
  autor: string;
  autor_email: string | null;
  criado_em: string;
  atualizado_em: string;
}

/** Escala tipográfica pré-selecionada (T1 é o maior). */
export const TYPE_PRESETS: { label: string; size: number }[] = [
  { label: "T1", size: 40 },
  { label: "T2", size: 30 },
  { label: "T3", size: 25 },
  { label: "T4", size: 20 },
  { label: "T5", size: 16 },
];
export const TYPE_SCALE = TYPE_PRESETS.map((preset) => preset.size);
export const SPACING_STEPS = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128];
/** Arredondamento livre de 0 a 100px. */
export const RADIUS_MIN = 0;
export const RADIUS_MAX = 100;
export const RADIUS_STEPS = [0, 8, 16, 24, 32, 48, 64, 80, 100];

export interface BrandSwatch {
  hex: string;
  nome: string;
}

/** Paleta oficial Gove (manual de marca) + Branco puro, na ordem do seletor. */
export const BRAND_SWATCHES: readonly BrandSwatch[] = [
  { hex: "#F4F4F4", nome: "Branco" },
  { hex: "#20133D", nome: "Noite" },
  { hex: "#FFC72C", nome: "Amarelo" },
  { hex: "#3D0099", nome: "Roxo" },
  { hex: "#351F65", nome: "Roxo Profundo" },
  { hex: "#2F3539", nome: "Grafite" },
  { hex: "#5B6770", nome: "Cinza técnico" },
  { hex: "#5AC2CD", nome: "Ciano" },
  { hex: "#A278DA", nome: "Lavanda" },
  { hex: "#16499F", nome: "Azul confiança" },
  { hex: "#FFFFFF", nome: "Branco puro" },
];

export interface GradientPreset {
  id: string;
  nome: string;
  from: string;
  via: string;
  to: string;
  angle: number;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "gove", nome: "Degradê GOVE", from: "#20133D", via: "#3D0099", to: "#A278DA", angle: 135 },
  { id: "gove-vertical", nome: "GOVE vertical", from: "#3D0099", via: "", to: "#A278DA", angle: 180 },
  { id: "roxo-profundo", nome: "Roxo profundo", from: "#20133D", via: "", to: "#351F65", angle: 135 },
  { id: "amarelo-gove", nome: "Amarelo GOVE", from: "#FFC72C", via: "", to: "#F4F4F4", angle: 135 },
  { id: "grafite", nome: "Grafite", from: "#2F3539", via: "", to: "#5B6770", angle: 135 },
  { id: "claro", nome: "Claro suave", from: "#FFFFFF", via: "", to: "#F4F4F4", angle: 180 },
  { id: "ciano-azul", nome: "Ciano → Azul confiança", from: "#5AC2CD", via: "", to: "#16499F", angle: 135 },
  { id: "lavanda-roxo", nome: "Lavanda → Roxo", from: "#A278DA", via: "", to: "#3D0099", angle: 135 },
];
