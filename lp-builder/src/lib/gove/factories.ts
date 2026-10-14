import type {
  BoxProps,
  ButtonBlock,
  CardBlock,
  Column,
  CountdownBlock,
  ImageBlock,
  Leaf,
  PageContent,
  RdFormBlock,
  RowBlock,
  SectionBlock,
  TextBlock,
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
  gradientTo: "#9741FC",
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

export const makeSection = (over: Partial<SectionBlock> = {}): SectionBlock => ({
  id: uid(),
  type: "section",
  box: defaultBox(),
  children: [],
  ...over,
});

export const emptyPage = (): PageContent => ({
  version: 1,
  sections: [makeSection({ children: [makeRow(1)] })],
});