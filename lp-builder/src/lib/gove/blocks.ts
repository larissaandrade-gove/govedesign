/**
 * Blocos novos (etapa 3): selo, lista, lista de informações, etiquetas,
 * estatísticas, cronograma, FAQ, data, card de pessoa, divisória, cabeçalho
 * com menu e rodapé.
 *
 * Cada bloco vira UMA árvore (`VNode`) montada aqui; o export a escreve como
 * HTML (`vnodeHtml`) e o canvas a converte em elementos React — o mesmo
 * markup e o mesmo CSS inline nos dois. As regras que não cabem inline
 * (hover, @media, @keyframes, <details> aberto) entram na folha da página por
 * `newBlockRules`, chamada em `pageSheet`. Sem JavaScript: o FAQ usa
 * <details>/<summary> e o "um aberto por vez" o atributo `name`.
 *
 * Cores e fontes vêm sempre da identidade ativa: na GOVE, os tons
 * translúcidos derivam das cores escolhidas; na BB, viram contorno sólido ou
 * somem (só cores da paleta, pares aprovados pelo ajuste automático).
 */
import { rgba } from "./background";
import { blockBoxCss, blockMargin } from "./blockStyle";
import { buttonDecls } from "./buttonStyle";
import { parseRich } from "./richText";
import { resolveButtonLink } from "./anchors";
import { goveLogoFor } from "./goveLogo";
import { logoLayout, type PageFonts } from "./bb";
import type { Decls, Sheet } from "./styleRules";
import type { NewBlock } from "./blockColors";
import type {
  ButtonBlock,
  CarouselBlock,
  FaqBlock,
  FooterBlock,
  Leaf,
  NavLink,
  NavbarBlock,
  PageContent,
  RdFormBlock,
  SectionBlock,
  TimelineBlock,
  TimelineItem,
} from "./types";

/* --------------------------------------------------------------------- VNode */

export type VChild = VNode | string;

export interface VNode {
  tag: string;
  attrs?: Record<string, string | boolean | undefined>;
  style?: Decls;
  children?: VChild[];
}

const h = (tag: string, attrs: VNode["attrs"] | null, style: Decls | null, ...children: (VChild | null | false | undefined)[]): VNode => ({
  tag,
  ...(attrs ? { attrs } : {}),
  ...(style ? { style } : {}),
  children: children.filter((c): c is VChild => c !== null && c !== false && c !== undefined && c !== ""),
});

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const VOID = new Set(["img", "br", "hr", "input"]);

const styleText = (decls: Decls) =>
  Object.entries(decls)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

/** VNode → HTML (texto e atributos escapados). */
export function vnodeHtml(node: VChild): string {
  if (typeof node === "string") return esc(node);
  let attrs = "";
  for (const [k, v] of Object.entries(node.attrs ?? {})) {
    if (v === undefined || v === false) continue;
    attrs += v === true ? ` ${k}` : ` ${k}="${esc(v)}"`;
  }
  const style = node.style ? styleText(node.style) : "";
  if (style) attrs += ` style="${esc(style)}"`;
  if (VOID.has(node.tag)) return `<${node.tag}${attrs} />`;
  return `<${node.tag}${attrs}>${(node.children ?? []).map(vnodeHtml).join("")}</${node.tag}>`;
}

/* ------------------------------------------------------------------ contexto */

export interface BlockCtx {
  page: PageContent;
  bb: boolean;
  fonts: PageFonts;
  sheet: Sheet;
  /** Fundo da seção do bloco (escolha do logo GOVE). */
  sectionBg?: string | undefined;
}

const isHex = (c: string | undefined): c is string => !!c && /^#[0-9a-f]{3,8}$/i.test(c);
/** Tom translúcido da cor (só GOVE; na BB, nenhum). */
const tint = (c: string, a: number, bb: boolean) => (bb || !isHex(c) ? undefined : rgba(c, a));
/** Cor translúcida na GOVE; sólida (cor da paleta) na BB. */
const soft = (c: string, a: number, bb: boolean) => (bb || !isHex(c) ? c : rgba(c, a));
/** Borda translúcida na GOVE; sólida na cor da paleta na BB. */
const softBorder = (c: string, a: number, bb: boolean, width = 1) => `${width}px solid ${soft(c, a, bb)}`;
/** Opacidade das divisórias na GOVE (a cor escolhida, suavizada). */
const DIVIDER_ALPHA = 0.3;

const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" } as const;

/** Atributos do elemento externo: classes fixas + a da folha. */
function rootAttrs(ctx: BlockCtx, leaf: Leaf, extra: string[] = [], more: VNode["attrs"] = {}): VNode["attrs"] {
  const cls = [...extra, ctx.sheet.classOf(leaf.id)].filter(Boolean).join(" ");
  return { ...(cls ? { class: cls } : {}), ...more };
}

/** Estilo do elemento externo: margem + aparência do bloco (depois das próprias). */
const rootStyle = (leaf: Leaf, bb: boolean, own: Decls): Decls => ({
  ...own,
  margin: blockMargin(leaf),
  ...blockBoxCss(leaf, bb),
});

/** Texto com **negrito** e quebras de linha (nunca HTML). */
function rich(content: string, boldWeight: number): VChild[] {
  const out: VChild[] = [];
  parseRich(content).forEach((line, i) => {
    if (i > 0) out.push(h("br", null, null));
    for (const span of line)
      out.push(span.bold ? h("strong", null, { "font-weight": String(boldWeight) }, span.text) : span.text);
  });
  return out;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Check (polyline) em SVG inline. */
const checkSvg = (size: number, stroke: number) =>
  h(
    "svg",
    { xmlns: SVG_NS, width: String(size), height: String(size), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": String(stroke), "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
    null,
    h("polyline", { points: "20 6 9 17 4 12" }, null),
  );

const chevronSvg = () =>
  h(
    "svg",
    { xmlns: SVG_NS, width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "3", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
    null,
    h("polyline", { points: "6 9 12 15 18 9" }, null),
  );

/** Link para seção (cabeçalho e rodapé). */
const linkHref = (page: PageContent, link: NavLink) =>
  resolveButtonLink(page, { href: "#", linkMode: "section", target: link.target }).href;

/* ------------------------------------------------------------------- logo */

/** Logo do cabeçalho/rodapé: GOVE oficial pelo fundo, ou a logomarca BB da página. */
function logoNode(ctx: BlockCtx, height: number): VNode | null {
  if (ctx.bb) {
    const logo = ctx.page.bbLogo;
    if (!logo?.src) return null;
    const { width } = logoLayout(logo);
    return h("img", { src: logo.src, alt: "Banco do Brasil", width: String(width) }, { display: "block", width: `${width}px`, "max-width": "none", height: "auto" });
  }
  const { src, aspect } = goveLogoFor(ctx.sectionBg);
  const width = Math.round(height * aspect);
  if (!src)
    return h("span", null, { "font-family": ctx.fonts.heading, "font-weight": String(ctx.fonts.headingWeight(true)), "font-size": `${Math.round(height * 0.8)}px`, "line-height": "1" }, "gove");
  return h("img", { src, alt: "GOVE", width: String(width), height: String(height) }, { display: "block", height: `${height}px`, width: "auto" });
}

/** Altura do logo (px) para o cálculo do cabeçalho fixo. */
function logoHeight(page: PageContent, leaf: NavbarBlock): number {
  if (!leaf.logo) return 0;
  if (page.identity === "bb") return page.bbLogo?.src ? logoLayout(page.bbLogo).height : 0;
  return leaf.logoHeight;
}

/* ------------------------------------------------------------ cabeçalho */

/** Seção do cabeçalho com menu (a primeira com `role: "header"`). */
export const headerSection = (page: PageContent): SectionBlock | null =>
  page.sections.find((s) => s.role === "header") ?? null;

/** Bloco do menu dentro da seção do cabeçalho. */
export function headerNavbar(page: PageContent): NavbarBlock | null {
  const section = headerSection(page);
  for (const row of section?.children ?? [])
    for (const col of row.columns) for (const leaf of col.children) if (leaf.type === "navbar") return leaf;
  return null;
}

/** O cabeçalho mostra a logomarca BB (a faixa separada da logomarca some). */
export function headerShowsBBLogo(page: PageContent): boolean {
  const nav = headerNavbar(page);
  return page.identity === "bb" && !!nav?.logo && !!page.bbLogo?.src;
}

/** Altura do botão de ação (tamanho M: 14×26) e dos links (área de clique de 44px). */
const CTA_HEIGHT = 48;
const LINK_HEIGHT = 44;

/** Altura estimada do cabeçalho fixo (0 = não há cabeçalho fixo). */
export function headerHeight(page: PageContent): number {
  const section = headerSection(page);
  const nav = headerNavbar(page);
  if (!section || !nav?.sticky) return 0;
  const inner = Math.max(logoHeight(page, nav), nav.ctaLabel.trim() ? CTA_HEIGHT : 0, nav.links.length ? LINK_HEIGHT : 0);
  // Folga de 16px: o título da seção não encosta no cabeçalho.
  return section.box.paddingY * 2 + inner + 16;
}

/** Botão de ação do cabeçalho (os estilos do botão de verdade, tamanho M). */
function ctaButton(leaf: NavbarBlock): ButtonBlock {
  return {
    id: `${leaf.id}-cta`,
    type: "button",
    label: leaf.ctaLabel,
    href: "#",
    linkMode: "section",
    target: leaf.ctaTarget,
    variant: leaf.ctaVariant,
    bgColor: leaf.ctaBgColor,
    color: leaf.ctaColor,
    radius: 999,
    weight: "bold",
    italic: false,
    size: leaf.size,
    align: "left",
    btnSize: "md",
    nowrap: true,
  };
}

const linkStyle = (ctx: BlockCtx, color: string, size: number): Decls => ({
  display: "inline-block",
  padding: "12px 0",
  color,
  "font-size": `${size}px`,
  "line-height": "20px",
  "font-weight": String(ctx.fonts.bodyWeight(true)),
  "text-decoration": ctx.bb ? "underline" : "none",
});

function navbarTree(leaf: NavbarBlock, ctx: BlockCtx): VNode {
  const logo = leaf.logo ? logoNode(ctx, leaf.logoHeight) : null;
  const nav = leaf.links.length
    ? h(
        "nav",
        { class: "gove-nav", "aria-label": "Menu" },
        { display: "flex", "flex-wrap": "wrap", gap: "0 28px" },
        ...leaf.links.map((l) => h("a", { href: linkHref(ctx.page, l) }, linkStyle(ctx, leaf.linkColor, leaf.size), l.label)),
      )
    : null;
  const cta = leaf.ctaLabel.trim()
    ? h("a", { class: "gove-cta", href: resolveButtonLink(ctx.page, ctaButton(leaf)).href }, buttonDecls(ctaButton(leaf), ctx.fonts, ctx.bb), leaf.ctaLabel)
    : null;
  return h(
    "div",
    rootAttrs(ctx, leaf, ["gove-navbar"]),
    rootStyle(leaf, ctx.bb, {
      display: "flex",
      "align-items": "center",
      "justify-content": "space-between",
      gap: "20px",
      "font-family": ctx.fonts.body,
    }),
    h("div", null, { display: "flex", "align-items": "center", "flex-shrink": "0" }, logo),
    h("div", null, { display: "flex", "align-items": "center", gap: "28px", "flex-wrap": "wrap", "justify-content": "flex-end" }, nav, cta),
  );
}

/* --------------------------------------------------------------- rodapé */

function footerTree(leaf: FooterBlock, ctx: BlockCtx): VNode {
  const logo = leaf.logo ? logoNode(ctx, leaf.logoHeight) : null;
  const links = leaf.links.length
    ? h(
        "nav",
        { class: "gove-flinks", "aria-label": "Links do rodapé" },
        { display: "flex", "flex-wrap": "wrap", gap: "0 24px" },
        ...leaf.links.map((l) => h("a", { href: linkHref(ctx.page, l) }, linkStyle(ctx, leaf.linkColor, leaf.size), l.label)),
      )
    : null;
  return h(
    "div",
    rootAttrs(ctx, leaf, ["gove-footer"]),
    rootStyle(leaf, ctx.bb, {
      display: "flex",
      "flex-wrap": "wrap",
      "align-items": "center",
      "justify-content": "space-between",
      gap: "16px 24px",
      color: leaf.color,
      "font-family": ctx.fonts.body,
      "font-size": `${leaf.size}px`,
      "line-height": "1.5",
    }),
    logo,
    leaf.text.trim() ? h("p", null, { margin: "0" }, ...rich(leaf.text, ctx.fonts.bodyWeight(true))) : null,
    links,
  );
}

/* ----------------------------------------------------------- cronograma */

/** Marcador circular do cronograma (na linha). */
const timelineDot = (leaf: TimelineBlock, bb: boolean, pos: Decls, cls?: string): VNode =>
  h("span", { ...(cls ? { class: cls } : {}), "aria-hidden": "true" }, {
    position: "absolute",
    ...pos,
    width: "16px",
    height: "16px",
    "border-radius": "50%",
    background: leaf.markerBg,
    border: `3px solid ${leaf.accentColor}`,
    "box-shadow": tint(leaf.accentColor, 0.12, bb) ? `0 0 0 4px ${tint(leaf.accentColor, 0.12, bb)}` : undefined,
  });

/** Título, responsável, texto e subitens de um item do cronograma. */
function timelineBody(leaf: TimelineBlock, item: TimelineItem, ctx: BlockCtx): (VNode | null)[] {
  const { bb, fonts } = ctx;
  const bold = String(fonts.bodyWeight(true));
  return [
    item.title.trim()
      ? h("h3", null, { margin: "0 0 6px", "font-family": fonts.heading, "font-size": `${leaf.size + 2}px`, "font-weight": String(fonts.headingWeight(true)), color: leaf.color, "line-height": "1.3" }, item.title)
      : null,
    item.who.trim()
      ? h("span", null, { display: "inline-block", "text-transform": "uppercase", "letter-spacing": "0.1em", "font-weight": bold, "margin-bottom": "8px" }, item.who)
      : null,
    item.text.trim() ? h("p", null, { margin: "0" }, ...rich(item.text, fonts.bodyWeight(true))) : null,
    item.subitems.length
      ? h(
          "ul",
          null,
          { margin: "10px 0 0", padding: "0", "list-style": "none", display: "grid", gap: "7px" },
          ...item.subitems.map((sub) =>
            h(
              "li",
              null,
              { position: "relative", "padding-left": "20px" },
              h("span", { "aria-hidden": "true" }, { position: "absolute", left: "0", top: "calc(0.8em - 3.5px)", width: "7px", height: "7px", "border-radius": "50%", background: leaf.accentColor, opacity: bb ? undefined : "0.65" }),
              ...rich(sub, fonts.bodyWeight(true)),
            ),
          ),
        )
      : null,
  ];
}

function timelineTree(leaf: TimelineBlock, ctx: BlockCtx): VNode {
  if (leaf.layout === "horizontal") return timelineHorizontalTree(leaf, ctx);
  const { bb, fonts } = ctx;
  const line = bb || !isHex(leaf.accentColor) ? leaf.accentColor : `linear-gradient(180deg, ${leaf.accentColor}, ${rgba(leaf.accentColor, 0.1)})`;
  const last = leaf.items.length - 1;
  return h(
    "div",
    rootAttrs(ctx, leaf, ["gove-timeline"]),
    rootStyle(leaf, bb, {
      position: "relative",
      "--tl-w": `${leaf.timeWidth}px`,
      "--tl-pad": "38px",
      "font-family": fonts.body,
      "font-size": `${leaf.size}px`,
      "line-height": "1.6",
      color: leaf.textColor,
    }),
    leaf.items.length
      ? h("span", { "aria-hidden": "true" }, { position: "absolute", left: "var(--tl-w)", top: "12px", bottom: "12px", width: "2px", background: line })
      : null,
    ...leaf.items.map((item, i) =>
      h(
        "div",
        { class: "gove-tl-item" },
        { display: "grid", "grid-template-columns": "var(--tl-w) minmax(0, 1fr)", position: "relative", "padding-bottom": i === last ? undefined : "34px" },
        h("div", null, { "font-family": fonts.heading, "font-weight": String(fonts.headingWeight(true)), color: leaf.color, "padding-top": "2px", "letter-spacing": "-0.01em", "overflow-wrap": "anywhere", "padding-right": "8px" }, item.time),
        h(
          "div",
          null,
          { position: "relative", "padding-left": "var(--tl-pad)" },
          timelineDot(leaf, bb, { left: "-7px", top: "6px" }),
          ...timelineBody(leaf, item, ctx),
        ),
      ),
    ),
  );
}

/**
 * Linha do tempo horizontal: passos lado a lado com a linha passando pelos
 * marcadores (computador); no tablet e no celular, empilha na vertical
 * (regras em `newBlockRules`).
 */
function timelineHorizontalTree(leaf: TimelineBlock, ctx: BlockCtx): VNode {
  const { bb, fonts } = ctx;
  const line = bb || !isHex(leaf.accentColor) ? leaf.accentColor : `linear-gradient(90deg, ${leaf.accentColor}, ${rgba(leaf.accentColor, 0.15)})`;
  return h(
    "div",
    rootAttrs(ctx, leaf, ["gove-timeline", "gove-tl-h"]),
    rootStyle(leaf, bb, {
      position: "relative",
      display: "grid",
      "grid-template-columns": `repeat(${Math.max(1, leaf.items.length)}, minmax(0, 1fr))`,
      gap: "28px 24px",
      "font-family": fonts.body,
      "font-size": `${leaf.size}px`,
      "line-height": "1.6",
      color: leaf.textColor,
    }),
    leaf.items.length
      ? h("span", { class: "gove-tl-line", "aria-hidden": "true" }, { position: "absolute", left: "8px", right: "8px", top: "7px", height: "2px", background: line })
      : null,
    ...leaf.items.map((item) =>
      h(
        "div",
        { class: "gove-tl-item" },
        { position: "relative", "padding-top": "34px", "min-width": "0" },
        timelineDot(leaf, bb, { left: "0", top: "0" }, "gove-tl-dot"),
        item.time.trim()
          ? h("div", null, { "font-family": fonts.heading, "font-weight": String(fonts.headingWeight(true)), color: leaf.color, "letter-spacing": "-0.01em", "overflow-wrap": "anywhere", "margin-bottom": "6px" }, item.time)
          : null,
        ...timelineBody(leaf, item, ctx),
      ),
    ),
  );
}

/* -------------------------------------------------------------- carrossel */

/** Segundos de uma volta completa da faixa animada. */
export const carouselDuration = (leaf: Pick<CarouselBlock, "items" | "speed">) =>
  Math.max(4, Math.round(Math.max(1, leaf.items.length) * Math.max(1, leaf.speed)));

/** Largura máxima dos itens no celular (px). */
export const CAROUSEL_MOBILE_WIDTH = 280;

const FADE_MASK = "linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)";

/**
 * Carrossel horizontal só com CSS. Faixa animada: os itens aparecem duas
 * vezes (a cópia é decorativa, `aria-hidden`) e a faixa anda -50% em loop
 * (cada item tem a margem do espaço, então a metade fecha exatamente). Quem
 * pede menos movimento vê uma linha parada com rolagem lateral. Rolagem com
 * encaixe: `scroll-snap` no eixo x. A caixa externa corta o excesso: a página
 * nunca ganha rolagem lateral.
 */
function carouselTree(leaf: CarouselBlock, ctx: BlockCtx): VNode {
  const { bb, fonts } = ctx;
  const marquee = leaf.mode === "marquee";
  const text = leaf.kind === "text";
  const item = (it: CarouselBlock["items"][number], dup: boolean): VNode =>
    h(
      "div",
      { class: dup ? "gove-car-item gove-car-dup" : "gove-car-item", ...(dup ? { "aria-hidden": "true" } : {}) },
      {
        flex: "none",
        width: `${leaf.itemWidth}px`,
        "margin-right": `${leaf.gap}px`,
        "scroll-snap-align": marquee ? undefined : "start",
        "aspect-ratio": leaf.aspect,
        "border-radius": leaf.radius ? `${leaf.radius}px` : undefined,
        overflow: text ? undefined : "hidden",
        ...(text
          ? {
              display: "flex",
              "flex-direction": "column",
              "justify-content": "center",
              gap: "8px",
              padding: "24px",
              background: leaf.bgColor,
              color: leaf.textColor,
            }
          : {}),
      },
      ...(text
        ? [
            it.title.trim()
              ? h("h3", null, { margin: "0", "font-family": fonts.heading, "font-size": `${leaf.size + 4}px`, "font-weight": String(fonts.headingWeight(true)), color: leaf.color, "line-height": "1.3" }, it.title)
              : null,
            it.text.trim() ? h("p", null, { margin: "0", "font-size": `${leaf.size}px`, "line-height": "1.5" }, ...rich(it.text, fonts.bodyWeight(true))) : null,
          ]
        : [
            it.src
              ? h("img", { src: it.src, alt: dup ? "" : it.alt, loading: "lazy" }, { display: "block", width: "100%", height: "100%", "object-fit": "cover", "max-width": "none" })
              : null,
          ]),
    );
  return h(
    "div",
    rootAttrs(ctx, leaf, ["gove-carousel"], { role: "region", "aria-label": "Carrossel" }),
    rootStyle(leaf, bb, {
      position: "relative",
      "overflow-x": "auto",
      "overflow-y": "hidden",
      "scroll-snap-type": marquee ? undefined : "x mandatory",
      "scrollbar-width": "thin",
      "padding-bottom": marquee ? undefined : "8px",
      "-webkit-mask-image": leaf.fade ? FADE_MASK : undefined,
      "mask-image": leaf.fade ? FADE_MASK : undefined,
      "font-family": fonts.body,
    }),
    h(
      "div",
      { class: "gove-car-track" },
      { display: "flex", width: "max-content" },
      ...leaf.items.map((it) => item(it, false)),
      ...(marquee ? leaf.items.map((it) => item(it, true)) : []),
    ),
  );
}

/* --------------------------------------------------------------------- FAQ */

/** Nome do grupo do "um aberto por vez". */
export const faqGroup = (leaf: Pick<FaqBlock, "id">) => `faq-${leaf.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;

function faqTree(leaf: FaqBlock, ctx: BlockCtx): VNode {
  const { bb, fonts } = ctx;
  return h(
    "div",
    rootAttrs(ctx, leaf, ["gove-faq"]),
    rootStyle(leaf, bb, { overflow: "hidden", "font-family": fonts.body, "font-size": `${leaf.size}px`, "line-height": "1.6" }),
    ...leaf.items.map((item, i) =>
      h(
        "details",
        { ...(leaf.single ? { name: faqGroup(leaf) } : {}), ...(leaf.firstOpen && i === 0 ? { open: true } : {}) },
        { "border-top": i > 0 ? `1px solid ${soft(leaf.dividerColor, DIVIDER_ALPHA, bb)}` : undefined },
        h(
          "summary",
          null,
          {
            display: "flex",
            "align-items": "center",
            "justify-content": "space-between",
            gap: "16px",
            padding: "20px 24px",
            cursor: "pointer",
            "list-style": "none",
            color: leaf.color,
            "font-weight": String(fonts.bodyWeight(true)),
          },
          h("span", null, null, item.q),
          h(
            "span",
            { class: "gove-chev", "aria-hidden": "true" },
            {
              flex: "none",
              width: "28px",
              height: "28px",
              "border-radius": "50%",
              display: "inline-flex",
              "align-items": "center",
              "justify-content": "center",
              background: tint(leaf.accentColor, 0.12, bb),
              border: bb ? `1px solid ${leaf.accentColor}` : undefined,
              color: leaf.accentColor,
            },
            chevronSvg(),
          ),
        ),
        h("div", null, { padding: "0 24px 22px", color: leaf.textColor }, ...rich(item.a, fonts.bodyWeight(true))),
      ),
    ),
  );
}

/* ------------------------------------------------------------- os blocos */

/** Iniciais do nome (duas letras: primeira e última palavra). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = words[0]![0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Árvore do bloco novo (elemento externo com a classe da folha, margem e aparência). */
export function blockTree(leaf: NewBlock, ctx: BlockCtx): VNode {
  const { bb, fonts } = ctx;
  const bold = String(fonts.bodyWeight(true));
  switch (leaf.type) {
    case "badge": {
      const pill = leaf.variant === "pill";
      return h(
        "div",
        rootAttrs(ctx, leaf),
        rootStyle(leaf, bb, { "text-align": leaf.align }),
        h(
          "span",
          null,
          {
            display: "inline-flex",
            "align-items": "center",
            gap: "8px",
            padding: pill ? "7px 16px" : undefined,
            "border-radius": pill ? "999px" : undefined,
            background: pill ? tint(leaf.accentColor, 0.16, bb) : undefined,
            border: pill ? softBorder(leaf.accentColor, 0.45, bb) : undefined,
            color: leaf.color,
            "font-family": fonts.body,
            "font-size": `${leaf.size}px`,
            "font-weight": bold,
            "letter-spacing": pill ? "0.06em" : "0.14em",
            "text-transform": "uppercase",
            "line-height": "1.4",
          },
          leaf.dot
            ? h("span", { class: "gove-pulse", "aria-hidden": "true" }, {
                flex: "none",
                width: "8px",
                height: "8px",
                "border-radius": "50%",
                background: leaf.accentColor,
                "--gove-pulse": soft(leaf.accentColor, 0.7, bb),
              })
            : null,
          leaf.text,
        ),
      );
    }
    case "list": {
      const numbered = leaf.marker === "number";
      const last = leaf.items.length - 1;
      const line = leaf.divider === "none" ? undefined : `1px ${leaf.divider === "dashed" ? "dashed" : "solid"} ${soft(leaf.dividerColor, DIVIDER_ALPHA, bb)}`;
      const marker = (i: number): VNode => {
        const box: Decls = { flex: "none", display: "inline-flex", "align-items": "center", "justify-content": "center", "min-width": "20px", height: "1.5em", color: leaf.accentColor };
        switch (leaf.marker) {
          case "checkCircle":
            return h(
              "span",
              { "aria-hidden": "true" },
              box,
              h(
                "span",
                null,
                {
                  display: "inline-flex",
                  "align-items": "center",
                  "justify-content": "center",
                  width: "20px",
                  height: "20px",
                  "border-radius": "50%",
                  background: tint(leaf.accentColor, 0.2, bb),
                  border: softBorder(leaf.accentColor, 0.6, bb),
                },
                checkSvg(11, 4),
              ),
            );
          case "check":
            return h("span", { "aria-hidden": "true" }, box, checkSvg(18, 3));
          case "dot":
            return h("span", { "aria-hidden": "true" }, box, h("span", null, { width: "7px", height: "7px", "border-radius": "50%", background: leaf.accentColor }));
          case "dash":
            return h("span", { "aria-hidden": "true" }, box, h("span", null, { width: "12px", height: "2px", "border-radius": "2px", background: leaf.accentColor }));
          default:
            return h("span", { "aria-hidden": "true" }, { ...box, "justify-content": "flex-start", "font-weight": bold }, `${i + 1}.`);
        }
      };
      return h(
        numbered ? "ol" : "ul",
        rootAttrs(ctx, leaf),
        rootStyle(leaf, bb, {
          padding: "0",
          "list-style": "none",
          display: "grid",
          gap: `${leaf.gap}px`,
          color: leaf.color,
          "font-family": fonts.body,
          "font-size": `${leaf.size}px`,
          "line-height": "1.5",
        }),
        ...leaf.items.map((item, i) =>
          h(
            "li",
            null,
            {
              display: "flex",
              gap: "11px",
              "align-items": "flex-start",
              "padding-bottom": line && i < last ? `${leaf.gap}px` : undefined,
              "border-bottom": line && i < last ? line : undefined,
            },
            marker(i),
            h("span", null, { flex: "1", "min-width": "0" }, ...rich(item, fonts.bodyWeight(true))),
          ),
        ),
      );
    }
    case "infolist": {
      const last = leaf.rows.length - 1;
      return h(
        "ul",
        rootAttrs(ctx, leaf),
        rootStyle(leaf, bb, { padding: "0", "list-style": "none", display: "grid", gap: "14px", "font-family": fonts.body, "font-size": `${leaf.size}px`, "line-height": "1.5" }),
        ...leaf.rows.map((row, i) =>
          h(
            "li",
            null,
            {
              display: "flex",
              "justify-content": "space-between",
              gap: "16px",
              "padding-bottom": i < last ? "14px" : undefined,
              "border-bottom": i < last ? `1px dashed ${soft(leaf.dividerColor, DIVIDER_ALPHA, bb)}` : undefined,
            },
            h("span", null, { color: leaf.labelColor }, row.label),
            h("span", null, { color: leaf.color, "font-weight": bold, "text-align": "right" }, row.value),
          ),
        ),
      );
    }
    case "tags":
      return h(
        "div",
        rootAttrs(ctx, leaf),
        rootStyle(leaf, bb, { display: "flex", "flex-wrap": "wrap", gap: `${leaf.gap}px`, "justify-content": JUSTIFY[leaf.align] }),
        ...leaf.items.map((tag) =>
          h(
            "span",
            { class: "gove-tag" },
            {
              display: "inline-block",
              padding: "10px 20px",
              "border-radius": "999px",
              background: tint(leaf.accentColor, 0.1, bb),
              border: softBorder(leaf.accentColor, 0.35, bb),
              color: leaf.color,
              "font-family": fonts.body,
              "font-size": `${leaf.size}px`,
              "line-height": "1.4",
            },
            tag,
          ),
        ),
      );
    case "stats":
      return h(
        "div",
        rootAttrs(ctx, leaf, ["gove-stats"]),
        rootStyle(leaf, bb, {
          display: "grid",
          "grid-template-columns": `repeat(${leaf.perRow}, minmax(0, 1fr))`,
          gap: "24px",
          "text-align": leaf.align,
          "font-family": fonts.body,
        }),
        ...leaf.items.map((item) =>
          h(
            "div",
            null,
            null,
            h("strong", null, { display: "block", "font-family": fonts.heading, "font-size": `${leaf.numberSize}px`, "font-weight": String(fonts.headingWeight(true)), color: leaf.color, "letter-spacing": "-0.03em", "line-height": "1.2" }, item.value),
            h("span", null, { display: "block", "margin-top": "4px", "font-size": `${leaf.size}px`, color: leaf.labelColor, "text-transform": "uppercase", "letter-spacing": "0.08em", "font-weight": bold, "line-height": "1.4", "overflow-wrap": "anywhere", hyphens: "auto" }, item.label),
          ),
        ),
      );
    case "timeline":
      return timelineTree(leaf, ctx);
    case "carousel":
      return carouselTree(leaf, ctx);
    case "faq":
      return faqTree(leaf, ctx);
    case "date":
      return h(
        "div",
        rootAttrs(ctx, leaf),
        rootStyle(leaf, bb, { display: "flex", "align-items": "center", gap: "18px", "justify-content": JUSTIFY[leaf.align], "font-family": fonts.body }),
        h(
          "div",
          null,
          {
            flex: "none",
            width: "78px",
            height: "82px",
            "border-radius": "16px",
            background: leaf.bgColor,
            color: leaf.boxColor,
            display: "flex",
            "flex-direction": "column",
            "align-items": "center",
            "justify-content": "center",
            "text-align": "center",
            "line-height": "1",
          },
          h("span", null, { display: "block", "font-family": fonts.heading, "font-size": "30px", "font-weight": String(fonts.headingWeight(true)), "letter-spacing": "-0.04em" }, leaf.day),
          h("span", null, { display: "block", "margin-top": "6px", "font-size": "16px", "font-weight": bold, "letter-spacing": "0.14em", "text-transform": "uppercase" }, leaf.month),
        ),
        h(
          "div",
          null,
          { "text-align": "left" },
          leaf.weekday.trim()
            ? h("span", null, { display: "block", "font-size": "16px", "text-transform": "uppercase", "letter-spacing": "0.12em", color: leaf.labelColor, "font-weight": bold, "line-height": "1.4" }, leaf.weekday)
            : null,
          leaf.time.trim()
            ? h("span", null, { display: "block", "font-size": "20px", "font-weight": bold, color: leaf.color, "line-height": "1.4" }, leaf.time)
            : null,
        ),
      );
    case "person": {
      const center = leaf.align === "center";
      const ring = bb ? `0 0 0 3px #FFFFFF, 0 0 0 5px ${leaf.accentColor}` : isHex(leaf.accentColor) ? `0 0 0 6px ${rgba(leaf.accentColor, 0.14)}` : undefined;
      const avatar = h(
        "div",
        null,
        {
          width: "88px",
          height: "88px",
          margin: center ? "0 auto 20px" : leaf.align === "right" ? "0 0 20px auto" : "0 0 20px",
          "border-radius": "50%",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          overflow: "hidden",
          background: leaf.accentColor,
          color: leaf.avatarColor,
          "font-family": fonts.heading,
          "font-size": "26px",
          "font-weight": String(fonts.headingWeight(true)),
          "letter-spacing": "-0.02em",
          "box-shadow": ring,
        },
        leaf.photo
          ? h("img", { src: leaf.photo, alt: leaf.name }, { display: "block", width: "100%", height: "100%", "object-fit": "cover", "max-width": "none" })
          : h("span", { "aria-hidden": "true" }, null, leaf.initials?.trim() || initialsOf(leaf.name)),
      );
      return h(
        "div",
        rootAttrs(ctx, leaf),
        rootStyle(leaf, bb, { "text-align": leaf.align, "font-family": fonts.body, "font-size": `${leaf.size}px`, "line-height": "1.6", color: leaf.textColor }),
        avatar,
        leaf.role.trim()
          ? h(
              "span",
              null,
              {
                display: "inline-block",
                "font-weight": bold,
                "letter-spacing": "0.12em",
                "text-transform": "uppercase",
                color: leaf.roleColor,
                background: tint(leaf.accentColor, 0.12, bb),
                border: bb ? `1px solid ${leaf.accentColor}` : undefined,
                padding: "4px 12px",
                "border-radius": "999px",
                "margin-bottom": "12px",
                "line-height": "1.4",
              },
              leaf.role,
            )
          : null,
        h("h3", null, { margin: "0 0 6px", "font-family": fonts.heading, "font-size": `${leaf.size + 4}px`, "font-weight": String(fonts.headingWeight(true)), color: leaf.color, "line-height": "1.3" }, leaf.name),
        leaf.org.trim() ? h("p", null, { margin: "0 0 14px", "font-weight": bold }, leaf.org) : null,
        leaf.bio.trim() ? h("p", null, { margin: "0" }, ...rich(leaf.bio, fonts.bodyWeight(true))) : null,
      );
    }
    case "divider":
      if (leaf.variant === "space")
        return h("div", rootAttrs(ctx, leaf, [], { "aria-hidden": "true" }), rootStyle(leaf, bb, { height: `${leaf.height}px` }));
      return h(
        "hr",
        rootAttrs(ctx, leaf, [], { "aria-hidden": "true" }),
        rootStyle(leaf, bb, { border: "0", "border-top": `${leaf.thickness}px ${leaf.variant} ${leaf.color}`, height: "0" }),
      );
    case "navbar":
      return navbarTree(leaf, ctx);
    case "footer":
      return footerTree(leaf, ctx);
  }
}

/* ------------------------------------------------------- regras da folha */

/** Regras dos blocos novos e do card do formulário (hover, @media, @keyframes). */
export function newBlockRules(sheet: Sheet, leaf: Leaf, bb: boolean) {
  switch (leaf.type) {
    case "badge":
      if (!leaf.dot) return;
      sheet.node(leaf.id);
      // Ponto pulsante: a cor vem da variável do próprio ponto; parado com "menos movimento".
      sheet.keyframes("gove-badge-pulse", "0%{box-shadow:0 0 0 0 var(--gove-pulse);}70%{box-shadow:0 0 0 10px transparent;}100%{box-shadow:0 0 0 0 transparent;}");
      sheet.shared("pulse", ".gove-pulse", { animation: "gove-badge-pulse 2s infinite" }, "motion");
      return;
    case "tags": {
      if (leaf.hover === false) return;
      const tag = `${sheet.node(leaf.id)} .gove-tag`;
      if (!bb && isHex(leaf.accentColor))
        // !important: o fundo e a borda da etiqueta estão inline.
        sheet.add(`${tag}:hover`, { "background-color": `${rgba(leaf.accentColor, 0.2)} !important`, "border-color": `${rgba(leaf.accentColor, 0.7)} !important` });
      sheet.add(tag, { transition: "background-color .18s ease, border-color .18s ease, transform .18s ease" }, "motion");
      sheet.add(`${tag}:hover`, { transform: "translateY(-2px)" }, "motion");
      return;
    }
    case "stats":
      if (leaf.perRow > 2)
        sheet.add(sheet.node(leaf.id), { "grid-template-columns": "repeat(2, minmax(0, 1fr)) !important", gap: "28px 24px !important" }, "tablet");
      return;
    case "timeline": {
      const sel = sheet.node(leaf.id);
      if (leaf.layout === "horizontal") {
        // Tablet e celular: empilha na vertical, com a linha à esquerda.
        const vertical = bb || !isHex(leaf.accentColor) ? leaf.accentColor : `linear-gradient(180deg, ${leaf.accentColor}, ${rgba(leaf.accentColor, 0.1)})`;
        sheet.add(sel, { "grid-template-columns": "minmax(0, 1fr) !important" }, "tablet");
        sheet.add(`${sel}>.gove-tl-line`, { left: "7px !important", right: "auto !important", top: "8px !important", bottom: "8px !important", width: "2px !important", height: "auto !important", background: `${vertical} !important` }, "tablet");
        sheet.add(`${sel}>.gove-tl-item`, { "padding-top": "0 !important", "padding-left": "38px !important" }, "tablet");
        sheet.add(`${sel}>.gove-tl-item>.gove-tl-dot`, { top: "4px !important" }, "tablet");
        return;
      }
      // Versão compacta no celular: coluna de horário de até 64px e recuo menor.
      sheet.add(sel, { "--tl-w": `${Math.min(leaf.timeWidth, 64)}px !important`, "--tl-pad": "26px !important" }, "mobile");
      return;
    }
    case "carousel": {
      const sel = sheet.node(leaf.id);
      if (leaf.itemWidth > CAROUSEL_MOBILE_WIDTH)
        sheet.add(`${sel} .gove-car-item`, { width: `${CAROUSEL_MOBILE_WIDTH}px !important` }, "mobile");
      if (leaf.mode !== "marquee") return;
      // Sem movimento: só a primeira volta, parada, com rolagem lateral.
      sheet.add(`${sel} .gove-car-dup`, { display: "none !important" });
      sheet.keyframes("gove-marquee", "from{transform:translateX(0);}to{transform:translateX(-50%);}");
      sheet.add(`${sel}`, { "overflow-x": "hidden !important" }, "motion");
      sheet.add(`${sel} .gove-car-dup`, { display: `${leaf.kind === "text" ? "flex" : "block"} !important` }, "motion");
      sheet.add(
        `${sel} .gove-car-track`,
        { animation: `gove-marquee ${carouselDuration(leaf)}s linear infinite${leaf.direction === "right" ? " reverse" : ""}` },
        "motion",
      );
      if (leaf.pauseOnHover) {
        sheet.add(`${sel}:hover .gove-car-track`, { "animation-play-state": "paused" }, "motion");
        sheet.add(`${sel}:focus-within .gove-car-track`, { "animation-play-state": "paused" }, "motion");
      }
      return;
    }
    case "container":
      // Caixa: o último bloco de dentro não soma o espaço de 16px ao preenchimento.
      sheet.shared("box-last", ".gove-box>:last-child", { "margin-bottom": "0 !important" });
      return;
    case "faq": {
      const sel = sheet.node(leaf.id);
      sheet.shared("faq-marker", ".gove-faq>details>summary::-webkit-details-marker", { display: "none" });
      sheet.shared("faq-open", ".gove-faq>details[open]>summary .gove-chev", { transform: "rotate(180deg)" });
      sheet.shared("faq-motion", ".gove-faq .gove-chev", { transition: "transform .25s ease" }, "motion");
      sheet.shared("faq-focus", ".gove-faq>details>summary:focus-visible", { outline: "2px solid currentColor", "outline-offset": "-4px" });
      if (!bb && isHex(leaf.accentColor)) {
        sheet.add(`${sel}>details>summary:hover`, { "background-color": rgba(leaf.accentColor, 0.06) });
        sheet.add(`${sel}>details>summary`, { transition: "background-color .18s ease" }, "motion");
      }
      return;
    }
    case "navbar": {
      const sel = sheet.node(leaf.id);
      // Menu escondido no tablet e no celular (fica o logo e o botão).
      sheet.add(`${sel} .gove-nav`, { display: "none !important" }, "tablet");
      sheet.add(`${sel} .gove-nav a:hover`, { "text-decoration": "underline" });
      sheet.add(`${sel} .gove-cta`, { transition: "transform .18s ease, box-shadow .18s ease" }, "motion");
      sheet.add(`${sel} .gove-cta:hover`, { transform: "translateY(-2px)" }, "motion");
      sheet.add(`${sel} .gove-cta:active`, { transform: "translateY(1px)" }, "motion");
      return;
    }
    case "footer": {
      const sel = sheet.node(leaf.id);
      sheet.add(`${sel} .gove-flinks a:hover`, { "text-decoration": "underline" });
      sheet.add(sel, { "flex-direction": "column", "text-align": "center", "justify-content": "center !important" }, "mobile");
      sheet.add(`${sel} .gove-flinks`, { "justify-content": "center" }, "mobile");
      return;
    }
    case "rdform":
      if (leaf.fields) rdFieldRules(sheet, leaf, bb);
      return;
    default:
      return;
  }
}

/** Campos do RD dentro do card: preenchimento 13×15, raio, borda de 1,5px e anel de foco. */
function rdFieldRules(sheet: Sheet, leaf: RdFormBlock, bb: boolean) {
  const f = leaf.fields!;
  const sel = sheet.node(leaf.id);
  // Uma regra por seletor: a folha põe o escopo (.gove-lp) no começo de cada uma.
  const fields = ["input:not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]):not([type=hidden])", "select", "textarea"];
  const ring = bb || !isHex(f.focusColor) ? `0 0 0 3px ${f.focusColor}` : `0 0 0 4px ${rgba(f.focusColor, 0.18)}`;
  for (const field of fields)
    sheet.add(`${sel} ${field}`, {
      padding: "13px 15px !important",
      border: `1.5px solid ${f.borderColor} !important`,
      "border-radius": `${f.radius}px !important`,
      "background-color": `${f.bgColor} !important`,
      "font-family": "inherit",
      "font-size": "16px",
      width: "100%",
    });
  for (const field of fields)
    sheet.add(`${sel} ${field}:focus`, { outline: "none !important", "border-color": `${f.focusColor} !important`, "box-shadow": `${ring} !important` });
  for (const field of fields)
    sheet.add(`${sel} ${field}`, { transition: "border-color .18s ease, box-shadow .18s ease" }, "motion");
}

/** Regras da seção do cabeçalho: fixa no topo com desfoque (o vidro vem da caixa da seção). */
export function headerRules(sheet: Sheet, page: PageContent) {
  const section = headerSection(page);
  const nav = headerNavbar(page);
  if (!section || !nav?.sticky) return;
  sheet.add(sheet.node(section.id), { position: "sticky !important", top: "0", "z-index": "50" });
}
