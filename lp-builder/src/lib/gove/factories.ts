import type {
  BadgeBlock,
  BlockStyle,
  BoxProps,
  ButtonBlock,
  CardBlock,
  Column,
  CountdownBlock,
  DateBlock,
  DividerBlock,
  FaqBlock,
  FooterBlock,
  ImageBlock,
  InfoListBlock,
  ListBlock,
  NavLink,
  NavbarBlock,
  PersonBlock,
  Leaf,
  PageContent,
  RdFormBlock,
  RowBlock,
  SectionBlock,
  StatsBlock,
  TagsBlock,
  TextBlock,
  TimelineBlock,
  VideoBlock,
} from "./types";
import { LOREM_300 } from "./lorem";

export const uid = () => Math.random().toString(36).slice(2, 10);


export const defaultBox = (over: Partial<BoxProps> = {}): BoxProps => ({
  fill: "solid",
  bgColor: "#FFFFFF",
  bgImage: "",
  bgSize: "cover",
  bgPosition: "center",
  bgRepeat: false,
  overlay: 0,
  overlayColor: "#20133D",
  gradientFrom: "#20133D",
  gradientVia: "#3D0099",
  gradientTo: "#A278DA",
  gradientAngle: 135,
  borderColor: "#F4F4F4",
  borderWidth: 0,
  radius: 0,
  shadow: "none",
  paddingY: 64,
  paddingX: 24,
  animation: "none",
  ...over,
});

export const makeText = (over: Partial<TextBlock> = {}): TextBlock => ({
  id: uid(),
  type: "text",
  tag: "p",
  content: LOREM_300,
  weight: "regular",
  italic: false,
  size: 16,
  color: "#2F3539",
  align: "left",
  ...over,
});

export const makeButton = (over: Partial<ButtonBlock> = {}): ButtonBlock => ({
  id: uid(),
  type: "button",
  label: "Quero saber mais",
  href: "#",
  variant: "filled",
  bgColor: "#FFC72C",
  color: "#20133D",
  radius: 8,
  weight: "bold",
  italic: false,
  size: 16,
  align: "left",
  animation: "none",
  // Botões novos: levantar com sombra e afundar ao clicar (os antigos ficam como estavam).
  blockStyle: { hover: "liftShadow", press: true, transition: 0.18 },
  ...over,
});

export const makeImage = (over: Partial<ImageBlock> = {}): ImageBlock => ({
  id: uid(),
  type: "image",
  src: "",
  alt: "",
  radius: 8,
  frame: "free",
  align: "center",
  width: 100,
  ...over,
});

export const makeCard = (over: Partial<CardBlock> = {}): CardBlock => ({
  id: uid(),
  type: "card",
  icon: "Check",
  iconColor: "#FFC72C",
  title: "Título curto",
  description: "Descreva em uma frase o benefício deste ponto.",
  align: "left",
  color: "#2F3539",
  bgColor: "#FFFFFF",
  borderColor: "#F4F4F4",
  borderWidth: 1,
  radius: 16,
  shadow: "sm",
  padding: 24,
  size: 16,
  ...over,
});

export const makeRdForm = (over: Partial<RdFormBlock> = {}): RdFormBlock => ({
  id: uid(),
  type: "rdform",
  snippet: "",
  ...over,
});

export const makeVideo = (over: Partial<VideoBlock> = {}): VideoBlock => ({
  id: uid(),
  type: "video",
  url: "",
  title: "Vídeo institucional GOVE",
  aspect: "16 / 9",
  width: 100,
  align: "center",
  radius: 16,
  ...over,
});

export const makeCountdown = (over: Partial<CountdownBlock> = {}): CountdownBlock => ({
  id: uid(),
  type: "countdown",
  target: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  mode: "dhms",
  align: "center",
  color: "#20133D",
  bgColor: "#FFC72C",
  accentColor: "#20133D",
  radius: 16,
  size: 39,
  expiredText: "Inscrições encerradas",
  variant: "filled",
  animation: "none",
  ...over,
});

/* ------------------------------------------------------------- blocos novos */
/* Cores-padrão para fundo claro (as do fundo escuro vêm no cabeçalho e no rodapé). */

export const makeBadge = (over: Partial<BadgeBlock> = {}): BadgeBlock => ({
  id: uid(),
  type: "badge",
  text: "Inscrições abertas",
  variant: "pill",
  dot: true,
  color: "#3D0099",
  accentColor: "#3D0099",
  align: "left",
  size: 16,
  ...over,
});

export const makeList = (over: Partial<ListBlock> = {}): ListBlock => ({
  id: uid(),
  type: "list",
  items: ["Primeiro benefício em uma frase", "Segundo benefício, com **destaque**", "Terceiro benefício"],
  marker: "checkCircle",
  gap: 12,
  divider: "none",
  color: "#2F3539",
  accentColor: "#3D0099",
  dividerColor: "#5B6770",
  size: 16,
  ...over,
});

export const makeInfoList = (over: Partial<InfoListBlock> = {}): InfoListBlock => ({
  id: uid(),
  type: "infolist",
  rows: [
    { label: "Data", value: "18 de novembro" },
    { label: "Horário", value: "14h às 17h" },
    { label: "Formato", value: "On-line e gratuito" },
  ],
  color: "#20133D",
  labelColor: "#5B6770",
  dividerColor: "#5B6770",
  size: 16,
  ...over,
});

export const makeTags = (over: Partial<TagsBlock> = {}): TagsBlock => ({
  id: uid(),
  type: "tags",
  items: ["Prefeitos", "Secretários de Finanças", "Procuradores", "Gestores tributários"],
  gap: 12,
  color: "#20133D",
  accentColor: "#3D0099",
  align: "left",
  size: 16,
  ...over,
});

export const makeStats = (over: Partial<StatsBlock> = {}): StatsBlock => ({
  id: uid(),
  type: "stats",
  items: [
    { value: "+500", label: "Municípios" },
    { value: "3h", label: "De conteúdo" },
    { value: "4", label: "Especialistas" },
    { value: "100%", label: "Gratuito" },
  ],
  perRow: 4,
  align: "center",
  color: "#3D0099",
  labelColor: "#5B6770",
  numberSize: 32,
  size: 16,
  ...over,
});

export const makeTimeline = (over: Partial<TimelineBlock> = {}): TimelineBlock => ({
  id: uid(),
  type: "timeline",
  items: [
    { time: "14h00", who: "Abertura", title: "Boas-vindas", text: "Apresentação do encontro e dos objetivos.", subitems: [] },
    {
      time: "14h20",
      who: "Maria Souza",
      title: "Painel principal",
      text: "Os pontos centrais do tema, com exemplos práticos.",
      subitems: ["Primeiro tópico", "Segundo tópico"],
    },
    { time: "16h30", who: "", title: "Perguntas e respostas", text: "Espaço aberto para as dúvidas do público.", subitems: [] },
  ],
  timeWidth: 86,
  color: "#20133D",
  textColor: "#5B6770",
  accentColor: "#3D0099",
  markerBg: "#FFFFFF",
  size: 16,
  ...over,
});

export const makeFaq = (over: Partial<FaqBlock> = {}): FaqBlock => ({
  id: uid(),
  type: "faq",
  items: [
    { q: "O evento é gratuito?", a: "Sim. A inscrição é gratuita e as vagas são limitadas." },
    { q: "Vou receber certificado?", a: "Sim, para quem participar do encontro inteiro." },
    { q: "O encontro fica gravado?", a: "A gravação fica disponível para os inscritos por 30 dias." },
  ],
  single: true,
  firstOpen: true,
  color: "#20133D",
  textColor: "#2F3539",
  accentColor: "#3D0099",
  dividerColor: "#5B6770",
  size: 16,
  blockStyle: { bgColor: "#FFFFFF", radius: 16, borderWidth: 1, borderColor: "#F4F4F4", shadow: "sm" },
  ...over,
});

export const makeDate = (over: Partial<DateBlock> = {}): DateBlock => ({
  id: uid(),
  type: "date",
  day: "18",
  month: "Nov",
  weekday: "Terça-feira",
  time: "14h às 17h",
  bgColor: "#FFC72C",
  boxColor: "#20133D",
  labelColor: "#3D0099",
  color: "#20133D",
  align: "left",
  ...over,
});

export const makePerson = (over: Partial<PersonBlock> = {}): PersonBlock => ({
  id: uid(),
  type: "person",
  name: "Maria Souza",
  role: "Palestrante",
  org: "Secretaria de Finanças",
  bio: "Especialista em gestão pública, com 15 anos de experiência em municípios.",
  photo: "",
  accentColor: "#3D0099",
  avatarColor: "#FFFFFF",
  roleColor: "#3D0099",
  color: "#20133D",
  textColor: "#5B6770",
  align: "center",
  size: 16,
  blockStyle: {
    bgColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F4F4F4",
    radius: 16,
    paddingY: 32,
    paddingX: 24,
    hover: "liftShadow",
  },
  ...over,
});

export const makeDivider = (over: Partial<DividerBlock> = {}): DividerBlock => ({
  id: uid(),
  type: "divider",
  variant: "solid",
  color: "#5B6770",
  thickness: 1,
  height: 32,
  ...over,
});

export const makeNavbar = (over: Partial<NavbarBlock> = {}): NavbarBlock => ({
  id: uid(),
  type: "navbar",
  logo: true,
  logoHeight: 32,
  links: [],
  linkColor: "#FFFFFF",
  ctaLabel: "Inscreva-se",
  ctaTarget: "@form",
  ctaVariant: "filled",
  ctaBgColor: "#FFC72C",
  ctaColor: "#20133D",
  sticky: true,
  size: 16,
  blockStyle: { marginBottom: 0 },
  ...over,
});

export const makeFooter = (over: Partial<FooterBlock> = {}): FooterBlock => ({
  id: uid(),
  type: "footer",
  logo: true,
  logoHeight: 28,
  text: "© GOVE. Todos os direitos reservados.",
  links: [],
  color: "#F4F4F4",
  linkColor: "#FFFFFF",
  size: 16,
  blockStyle: { marginBottom: 0 },
  ...over,
});

/** Card do formulário: fundo, raio, preenchimento e sombra (na aparência do bloco). */
export const FORM_CARD_STYLE: BlockStyle = { bgColor: "#FFFFFF", radius: 24, paddingY: 32, paddingX: 32, shadow: "lg" };

/** Campos do RD dentro do card (preenchimento 13×15, borda de 1,5px, anel de foco). */
export const defaultRdFields = () => ({ radius: 12, borderColor: "#5B6770", focusColor: "#3D0099", bgColor: "#FFFFFF" });

export const makeColumn = (children: Leaf[] = []): Column => ({ id: uid(), children });

export const makeRow = (cols = 1, over: Partial<RowBlock> = {}): RowBlock => ({
  id: uid(),
  type: "row",
  gap: 24,
  alignItems: "start",
  box: defaultBox({ bgColor: "transparent", paddingY: 0, paddingX: 0 }),
  columns: Array.from({ length: cols }, () => makeColumn()),
  ...over,
});

/** Seções novas: no celular, 72% do espaçamento vertical do computador ("auto"). */
export const makeSection = (over: Partial<SectionBlock> = {}): SectionBlock => {
  const section: SectionBlock = { id: uid(), type: "section", box: defaultBox(), children: [], ...over };
  if (section.box.paddingYMobile === undefined) section.box = { ...section.box, paddingYMobile: "auto" };
  return section;
};

export const emptyPage = (): PageContent => ({
  version: 1,
  sections: [makeSection({ children: [makeRow(1)] })],
});
/** Seção especial do cabeçalho com menu: fixa no topo, fundo Noite com vidro. */
export function makeHeaderSection(links: NavLink[] = [], over: Partial<NavbarBlock> = {}): SectionBlock {
  const row = makeRow(1);
  row.columns[0]!.children = [makeNavbar({ links, ...over })];
  return {
    id: uid(),
    type: "section",
    role: "header",
    box: defaultBox({ bgColor: "#20133D", fillOpacity: 92, glassBlur: 12, paddingY: 12, paddingX: 24 }),
    children: [row],
  };
}

/** Seção de rodapé (fundo Noite) com o bloco de rodapé. */
export function makeFooterSection(links: NavLink[] = []): SectionBlock {
  const row = makeRow(1);
  row.columns[0]!.children = [makeFooter({ links })];
  return makeSection({ box: defaultBox({ bgColor: "#20133D", paddingY: 40 }), children: [row] });
}
