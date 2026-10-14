import {
  defaultBox,
  makeButton,
  makeColumn,
  makeImage,
  makeRdForm,
  makeRow,
  makeSection,
  makeText,
} from "./factories";
import type { PageContent, SectionBlock } from "./types";

export type HeroPresetId = "blank" | "centered" | "split" | "form";

function heroCentered(): SectionBlock {
  const row = makeRow(1);
  row.columns = [
    makeColumn([
      makeText({ tag: "h1", content: "Sua proposta de valor em uma frase", size: 39, weight: "bold", align: "center", color: "#FFFFFF" }),
      makeText({ content: "Explique em uma linha o que o lead ganha nesta página.", size: 20, align: "center", color: "#F4F4F4" }),
      makeButton({ align: "center" }),
    ]),
  ];
  return makeSection({
    box: defaultBox({ fill: "gradient", bgColor: "#3D0099", paddingY: 96 }),
    children: [row],
  });
}

function heroSplit(): SectionBlock {
  const row = makeRow(2);
  row.columns = [
    makeColumn([
      makeText({ tag: "h1", content: "Título do hero dividido", size: 31, weight: "bold" }),
      makeText({ content: "Subtítulo com o principal benefício da oferta.", size: 20, color: "#5B6770" }),
      makeButton({}),
    ]),
    makeColumn([makeImage({ alt: "" })]),
  ];
  return makeSection({ box: defaultBox({ paddingY: 80 }), children: [row] });
}

function heroForm(): SectionBlock {
  const row = makeRow(2);
  row.columns = [
    makeColumn([
      makeText({ tag: "h1", content: "Baixe o material gratuito", size: 31, weight: "bold", color: "#FFFFFF" }),
      makeText({ content: "Liste de 2 a 3 motivos para o lead preencher o formulário.", size: 20, color: "#F4F4F4" }),
    ]),
    makeColumn([makeRdForm()]),
  ];
  return makeSection({ box: defaultBox({ fill: "gradient", bgColor: "#3D0099", paddingY: 80 }), children: [row] });
}

export const HERO_PRESETS: { id: HeroPresetId; nome: string; descricao: string }[] = [
  { id: "centered", nome: "Hero Centralizado", descricao: "Título, subtítulo e CTA centralizados sobre fundo sólido ou imagem." },
  { id: "split", nome: "Hero Dividido (Split)", descricao: "Texto e CTA à esquerda, imagem à direita, 50/50, empilha no mobile." },
  { id: "form", nome: "Hero com Formulário Lateral", descricao: "Proposta de valor à esquerda e formulário RD Station à direita." },
  { id: "blank", nome: "Começar em branco", descricao: "Uma seção vazia para montar do zero." },
];

export function pageFromPreset(preset: HeroPresetId): PageContent {
  if (preset === "centered") return { version: 1, sections: [heroCentered()] };
  if (preset === "split") return { version: 1, sections: [heroSplit()] };
  if (preset === "form") return { version: 1, sections: [heroForm()] };
  return { version: 1, sections: [makeSection({ children: [makeRow(1)] })] };
}