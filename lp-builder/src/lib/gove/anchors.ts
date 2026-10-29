/**
 * Âncoras de seção: botões que levam o lead para outra parte da página
 * (ex.: o CTA do hero rola até o formulário de inscrição).
 *
 * Cada seção tem um id estável (`secao-<id da seção>`), gerado igual no canvas
 * e no HTML exportado. O botão vira `<a href="#secao-…">` com rolagem suave
 * via CSS — sem JavaScript, então funciona dentro do RD Station.
 */
import type { ButtonBlock, PageContent, SectionBlock } from "./types";
import { plainText } from "./richText";
import { flatLeaves } from "./leaves";
import { googleCalendarUrl } from "./calendar";

/** Destino "Formulário de inscrição": a primeira seção com formulário RD Station. */
export const TARGET_FORM = "@form";
/** Destino "Final da página". */
export const TARGET_END = "@end";
/** Âncora do final da página (marcador vazio depois da última seção). */
export const END_ANCHOR = "fim-da-pagina";

export const sectionAnchor = (section: Pick<SectionBlock, "id">) =>
  `secao-${section.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;

const hasForm = (section: SectionBlock) =>
  section.children.some((row) =>
    row.columns.some((col) => flatLeaves(col.children).some((leaf) => leaf.type === "rdform")),
  );

/** Primeira seção com formulário RD Station (ou null). */
export function formSection(page: PageContent): SectionBlock | null {
  return page.sections.find(hasForm) ?? null;
}

export const pageHasForm = (page: PageContent) => formSection(page) !== null;

/** Nome legível da seção para a lista de destinos (ex.: "3. Formulário de inscrição"). */
export function sectionLabel(page: PageContent, section: SectionBlock): string {
  const index = page.sections.findIndex((s) => s.id === section.id);
  const n = index + 1;
  if (section.role === "header") return `${n}. Cabeçalho`;
  if (hasForm(section)) return `${n}. Formulário de inscrição`;
  let heading = "";
  for (const row of section.children)
    for (const col of row.columns)
      for (const leaf of flatLeaves(col.children))
        if (!heading && leaf.type === "text" && leaf.tag !== "p" && plainText(leaf.content).trim())
          heading = plainText(leaf.content).trim();
  if (heading) return `${n}. ${heading.length > 40 ? `${heading.slice(0, 39)}…` : heading}`;
  if (index === 0) return `${n}. Topo (hero)`;
  if (index === page.sections.length - 1 && page.sections.length > 1) return `${n}. Rodapé`;
  return `${n}. Seção`;
}

export type ButtonLink = {
  href: string;
  /** Seção de destino efetiva (null = final da página ou URL externa). */
  sectionId: string | null;
  /** A seção escolhida não existe mais: o botão caiu no formulário ou no final da página. */
  missing: boolean;
  /** Texto curto do destino efetivo (para o painel). */
  label: string;
};

/** Destino efetivo de um botão. Botões antigos (sem `linkMode`) são URL externa. */
export function resolveButtonLink(
  page: PageContent,
  leaf: Pick<ButtonBlock, "href" | "linkMode" | "target"> & { calendar?: ButtonBlock["calendar"] },
): ButtonLink {
  if (leaf.linkMode === "calendar")
    return { href: googleCalendarUrl(leaf.calendar), sectionId: null, missing: false, label: "Google Agenda" };
  if (leaf.linkMode !== "section")
    return { href: leaf.href || "#", sectionId: null, missing: false, label: leaf.href || "#" };
  const end: ButtonLink = {
    href: `#${END_ANCHOR}`,
    sectionId: null,
    missing: false,
    label: "Final da página",
  };
  const toForm = (missing: boolean): ButtonLink => {
    const form = formSection(page);
    return form
      ? {
          href: `#${sectionAnchor(form)}`,
          sectionId: form.id,
          missing,
          label: sectionLabel(page, form),
        }
      : { ...end, missing };
  };
  const target = leaf.target || TARGET_FORM;
  if (target === TARGET_END) return end;
  if (target === TARGET_FORM) return toForm(false);
  const section = page.sections.find((s) => s.id === target);
  if (section)
    return {
      href: `#${sectionAnchor(section)}`,
      sectionId: section.id,
      missing: false,
      label: sectionLabel(page, section),
    };
  return toForm(true);
}

/** Botões cuja seção de destino foi excluída. */
export function brokenButtonLinks(page: PageContent): { leaf: ButtonBlock; link: ButtonLink }[] {
  const out: { leaf: ButtonBlock; link: ButtonLink }[] = [];
  for (const section of page.sections)
    for (const row of section.children)
      for (const col of row.columns)
        for (const leaf of flatLeaves(col.children))
          if (leaf.type === "button") {
            const link = resolveButtonLink(page, leaf);
            if (link.missing) out.push({ leaf, link });
          }
  return out;
}

/** CSS da rolagem suave (só para quem não pediu movimento reduzido). */
export const SMOOTH_SCROLL_CSS =
  "@media (prefers-reduced-motion: no-preference){html{scroll-behavior:smooth;}}";
