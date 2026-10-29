export type Align = "left" | "center" | "right";
export type Shadow = "none" | "sm" | "md" | "lg";

/** Lados com borda: todos, só em cima e embaixo (border-block), só à esquerda (destaque) ou nenhum. */
export type BorderSides = "all" | "block" | "left" | "none";
export type BorderStyle = "solid" | "dashed";
/** Posição de um brilho radial decorativo. */
export type GlowPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

/** Brilho radial (cor da paleta, translúcida). */
export interface Glow {
  color: string;
  position: GlowPosition;
  /** Largura da elipse em px (a altura é ~55% dela). */
  size: number;
  /** 0-100: opacidade da cor no centro do brilho. */
  intensity: number;
}

/** Camadas decorativas atrás do conteúdo (a caixa ganha overflow oculto). */
export interface BoxDecor {
  /** Grade de linhas de 56px com máscara radial. */
  grid?: boolean;
  gridColor?: string;
  /** 1-20: opacidade das linhas da grade (ausente = 5). */
  gridOpacity?: number;
  /** Até 2 brilhos radiais. */
  glows?: Glow[];
}

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
  /* Opções de layout e aparência (todas opcionais; ausentes = visual de antes). */
  /** Altura mínima: px, ou "screen" (tela inteira, 100vh). Ausente/0 = livre. */
  minHeight?: number | "screen";
  /** Seção: conteúdo de ponta a ponta (sem a largura máxima do conteúdo). */
  fullBleed?: boolean;
  /** Ausente = "all" (borda em volta, como antes). */
  borderSides?: BorderSides;
  /** Ausente = "solid". */
  borderStyle?: BorderStyle;
  /** Vidro: desfoque do que está atrás (0-16px). */
  glassBlur?: number;
  /** Vidro: opacidade do preenchimento (0-100; ausente = 100, opaco). */
  fillOpacity?: number;
  decor?: BoxDecor;
  /** Seção: espaçamento vertical no celular (≤640px): px, ou "auto" = 72% do computador. Ausente = igual ao computador. */
  paddingYMobile?: number | "auto";
}

/** Dispositivos em que o elemento fica oculto (export: @media; canvas: esmaecido com aviso). */
export interface DeviceHide {
  /** Acima de 980px. */
  desktop?: boolean;
  /** De 641 a 980px. */
  tablet?: boolean;
  /** Até 640px. */
  mobile?: boolean;
}

/** Efeito ao passar o mouse. */
export type HoverEffect = "none" | "lift2" | "lift4" | "liftShadow" | "topBar" | "borderHighlight";
/** Duração da transição (s). */
export type TransitionSpeed = 0.18 | 0.2 | 0.3;

/**
 * Aparência de qualquer bloco (opcional; ausente = visual de antes, com 16px
 * de espaço depois). Cores sempre da paleta.
 */
export interface BlockStyle {
  /** Espaço antes (px; ausente = 0). */
  marginTop?: number;
  /** Espaço depois (px; ausente = 16). */
  marginBottom?: number;
  /** Largura máxima (px); a posição segue o alinhamento do bloco. */
  maxWidth?: number;
  /** Preenchimento interno (px). */
  paddingY?: number;
  paddingX?: number;
  radius?: number;
  /** Fundo (cor da paleta; necessário para o vidro). */
  bgColor?: string;
  /** Opacidade do fundo, 0-100 (ausente = 100). */
  fillOpacity?: number;
  /** Vidro: desfoque do que está atrás (0-16px). */
  glassBlur?: number;
  borderWidth?: number;
  borderColor?: string;
  /** Ausente = "all". */
  borderSides?: BorderSides;
  borderStyle?: BorderStyle;
  shadow?: Shadow;
  /** Opacidade do bloco, 10-100 (ausente = 100). */
  opacity?: number;
  /** Ausente = "none". */
  hover?: HoverEffect;
  /** Cor da barra superior / da borda no hover (paleta). */
  hoverColor?: string;
  /** Ausente = 0.2. */
  transition?: TransitionSpeed;
  /** Afunda 1px ao clicar. */
  press?: boolean;
  hide?: DeviceHide;
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
  tag: "h1" | "h2" | "h3" | "h4" | "p";
  /** Texto com marcação simples: **negrito**, ==destaque== e quebras de linha. */
  content: string;
  blockStyle?: BlockStyle;
  /* Ajustes tipográficos (opcionais; ausentes = visual de antes). */
  uppercase?: boolean;
  /** Espaçamento entre letras (em), de -0.04 a 0.14. */
  letterSpacing?: number;
  /** Altura de linha (ausente = 1.4). */
  lineHeight?: number;
  /** Tamanho responsivo: mínimo no celular (px); `size` é o máximo. Export: clamp(). */
  sizeMin?: number;
  /** Cores do destaque ==texto== (degradê da paleta; ausentes = Amarelo → Ciano). */
  highlightFrom?: string;
  highlightTo?: string;
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
  variant: "filled" | "elevated" | "outline" | "glass" | "text" | "ghost";
  bgColor: string;
  radius: number;
  animation?: ButtonAnimation;
  blockStyle?: BlockStyle;
  /** Tamanho: P (10×20), M (14×26), G (16×32). Ausente = "lg". */
  btnSize?: ButtonSize;
  /** Largura total: sempre ou só no celular. Ausente = nunca. */
  fullWidth?: "always" | "mobile";
  /** Ícone da biblioteca (chave de iconCatalog). */
  icon?: string;
  /** Ausente = "left". */
  iconPos?: "left" | "right";
  /** Sem quebra de linha no rótulo. */
  nowrap?: boolean;
}

export type ButtonSize = "sm" | "md" | "lg";

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
  blockStyle?: BlockStyle;
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
  blockStyle?: BlockStyle;
}

/** Estilo dos campos do RD dentro do card do formulário. */
export interface RdFieldStyle {
  radius: number;
  borderColor: string;
  /** Borda e anel de foco. */
  focusColor: string;
  bgColor: string;
}

export interface RdFormBlock {
  id: string;
  type: "rdform";
  snippet: string;
  /** Card do formulário: fundo, raio, preenchimento e sombra ficam em `blockStyle`. */
  blockStyle?: BlockStyle;
  /** CSS dos campos do RD (preenchimento 13×15, borda de 1,5px, anel de foco). */
  fields?: RdFieldStyle;
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
  blockStyle?: BlockStyle;
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
  blockStyle?: BlockStyle;
}

/* ------------------------------------------------------------- blocos novos */
/*
 * Cores sempre da paleta da identidade ativa (seletores só de paleta). Os
 * tons translúcidos (fundo da pílula, anel, trilha) derivam dessas cores na
 * identidade GOVE; na BB viram contorno sólido ou somem (só cores da paleta).
 */

/** Selo (badge/eyebrow): texto curto em caixa alta, pílula ou só texto. */
export interface BadgeBlock {
  id: string;
  type: "badge";
  text: string;
  variant: "pill" | "text";
  /** Ponto pulsante (@keyframes; parado para quem pede menos movimento). */
  dot?: boolean;
  color: string;
  /** Ponto, borda e fundo translúcido da pílula. */
  accentColor: string;
  align: Align;
  size: number;
  blockStyle?: BlockStyle;
}

export type ListMarker = "checkCircle" | "check" | "dot" | "dash" | "number";
export type ListDivider = "none" | "line" | "dashed";

/** Lista com marcadores. */
export interface ListBlock {
  id: string;
  type: "list";
  /** Itens (aceitam **negrito**). */
  items: string[];
  marker: ListMarker;
  /** Espaço entre itens (px). */
  gap: number;
  divider: ListDivider;
  color: string;
  accentColor: string;
  dividerColor: string;
  size: number;
  blockStyle?: BlockStyle;
}

/** Lista de informações: rótulo à esquerda e valor à direita (event-list). */
export interface InfoListBlock {
  id: string;
  type: "infolist";
  rows: { label: string; value: string }[];
  /** Cor dos valores. */
  color: string;
  labelColor: string;
  dividerColor: string;
  size: number;
  blockStyle?: BlockStyle;
}

/** Etiquetas (pílulas com quebra automática). */
export interface TagsBlock {
  id: string;
  type: "tags";
  items: string[];
  /** Espaço entre etiquetas (px). */
  gap: number;
  /** Efeito ao passar o mouse (ausente = ligado). */
  hover?: boolean;
  color: string;
  accentColor: string;
  align: Align;
  size: number;
  blockStyle?: BlockStyle;
}

/** Estatísticas: número + rótulo. */
export interface StatsBlock {
  id: string;
  type: "stats";
  items: { value: string; label: string }[];
  /** Por linha no computador (no tablet e no celular, 2). */
  perRow: 2 | 3 | 4;
  align: Align;
  /** Cor dos números. */
  color: string;
  labelColor: string;
  /** Tamanho dos números (px). */
  numberSize: number;
  /** Tamanho dos rótulos (px). */
  size: number;
  blockStyle?: BlockStyle;
}

export interface TimelineItem {
  time: string;
  /** Responsável (opcional). */
  who: string;
  title: string;
  text: string;
  subitems: string[];
}

/** Cronograma (timeline). */
export interface TimelineBlock {
  id: string;
  type: "timeline";
  items: TimelineItem[];
  /** Largura da coluna de horário (px; no celular, até 64). */
  timeWidth: number;
  /** Cor do horário e dos títulos. */
  color: string;
  textColor: string;
  /** Linha e marcadores. */
  accentColor: string;
  /** Miolo dos marcadores (normalmente o fundo da seção). */
  markerBg: string;
  size: number;
  blockStyle?: BlockStyle;
}

/** FAQ / acordeão com <details>/<summary> (sem JS). */
export interface FaqBlock {
  id: string;
  type: "faq";
  items: { q: string; a: string }[];
  /** Um aberto por vez (atributo `name` do <details>; onde não há suporte, livre). */
  single: boolean;
  firstOpen: boolean;
  /** Cor das perguntas. */
  color: string;
  textColor: string;
  /** Seta e fundo do hover. */
  accentColor: string;
  dividerColor: string;
  size: number;
  blockStyle?: BlockStyle;
}

/** Bloco de data: dia e mês em destaque, dia da semana e horário. */
export interface DateBlock {
  id: string;
  type: "date";
  day: string;
  month: string;
  weekday: string;
  time: string;
  /** Fundo e texto da caixa do dia. */
  bgColor: string;
  boxColor: string;
  labelColor: string;
  /** Cor do horário. */
  color: string;
  align: Align;
  blockStyle?: BlockStyle;
}

/** Card de pessoa (palestrante). */
export interface PersonBlock {
  id: string;
  type: "person";
  name: string;
  role: string;
  org: string;
  bio: string;
  /** Foto (URL/data URL); vazia = iniciais. */
  photo: string;
  /** Iniciais (vazias = do nome). */
  initials?: string;
  /** Avatar e anel. */
  accentColor: string;
  /** Iniciais sobre o avatar. */
  avatarColor: string;
  /** Texto da pílula da função. */
  roleColor: string;
  /** Nome. */
  color: string;
  textColor: string;
  align: Align;
  size: number;
  blockStyle?: BlockStyle;
}

/** Divisória (linha sólida/tracejada) ou só espaço. */
export interface DividerBlock {
  id: string;
  type: "divider";
  variant: "solid" | "dashed" | "space";
  color: string;
  thickness: number;
  /** Altura do espaço (px; variante "space"). */
  height: number;
  blockStyle?: BlockStyle;
}

/** Link para uma seção (destino como o do botão: id, "@form" ou "@end"). */
export interface NavLink {
  label: string;
  target: string;
}

/** Cabeçalho com menu: vive na seção especial do topo (`role: "header"`). */
export interface NavbarBlock {
  id: string;
  type: "navbar";
  /** Logo oficial (GOVE de brand/logos; BB: a logomarca da página). */
  logo: boolean;
  /** Altura do logo GOVE (px). */
  logoHeight: number;
  links: NavLink[];
  linkColor: string;
  /** Botão de ação (rótulo vazio = sem botão). */
  ctaLabel: string;
  ctaTarget: string;
  ctaVariant: "filled" | "outline";
  ctaBgColor: string;
  ctaColor: string;
  /** Fixo no topo (a seção fica sticky; o fundo de vidro vem da seção). */
  sticky: boolean;
  size: number;
  blockStyle?: BlockStyle;
}

/** Rodapé: logo, texto e links para as seções. */
export interface FooterBlock {
  id: string;
  type: "footer";
  logo: boolean;
  logoHeight: number;
  text: string;
  links: NavLink[];
  color: string;
  linkColor: string;
  size: number;
  blockStyle?: BlockStyle;
}

export type Leaf =
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | CardBlock
  | RdFormBlock
  | VideoBlock
  | CountdownBlock
  | BadgeBlock
  | ListBlock
  | InfoListBlock
  | TagsBlock
  | StatsBlock
  | TimelineBlock
  | FaqBlock
  | DateBlock
  | PersonBlock
  | DividerBlock
  | NavbarBlock
  | FooterBlock;

export interface Column {
  id: string;
  children: Leaf[];
}

/** Linha no tablet e no celular: empilha tudo, 2 colunas no tablet (empilha no celular) ou mantém. */
export type RowResponsive = "stack" | "tablet2" | "keep";
/** Largura máxima da linha (px) ou "full". */
export type RowMaxWidth = 640 | 720 | 840 | 960 | "full";

export interface RowBlock {
  id: string;
  type: "row";
  /** Espaço horizontal entre colunas (px). */
  gap: number;
  alignItems?: "start" | "center" | "end" | "stretch";
  box: BoxProps;
  columns: Column[];
  /* Opções de layout (opcionais; ausentes = colunas iguais, como antes). */
  /** Proporção das colunas em fr (ex.: [1.35, 0.9]); um valor por coluna. */
  ratios?: number[];
  /** Espaço vertical entre colunas empilhadas/quebradas (ausente = `gap`). */
  rowGap?: number;
  /** Alinhamento horizontal do conteúdo das colunas. Ausente = "start". */
  justify?: "start" | "center" | "end";
  /** Largura máxima da linha. Ausente = "full". */
  maxWidth?: RowMaxWidth;
  /** Alinhamento da linha com largura máxima. Ausente = "center". */
  rowAlign?: "left" | "center";
  /** Ausente = "stack". */
  responsive?: RowResponsive;
  /** Ordem invertida quando as colunas empilham. */
  stackReverse?: boolean;
}

export interface SectionBlock {
  id: string;
  type: "section";
  box: BoxProps;
  children: RowBlock[];
  /** Ocultar a seção em algum dispositivo. */
  hide?: DeviceHide;
  /** Seção especial: "header" = cabeçalho com menu (só uma, sempre a primeira). */
  role?: "header";
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

/** Largura máxima do conteúdo das seções. */
export type ContentWidth = 960 | 1120 | 1140 | 1200 | 1280 | "full";

/** Layout da página (opcional; ausente = 1120px e margens de antes). */
export interface PageLayout {
  /** Ausente = 1120. */
  maxWidth?: ContentWidth;
  /** Margem lateral do conteúdo no computador (px; ausente = 0, só o padding da seção). */
  gutter?: number;
  /** Margem lateral das seções no celular, até 640px (ausente = 24, como no tablet). */
  gutterMobile?: number;
  /** Compensação da rolagem até as âncoras (scroll-margin-top, px). Ausente = "auto". */
  scrollOffset?: number | "auto";
}

export interface PageContent {
  version: 1;
  layout?: PageLayout;
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
