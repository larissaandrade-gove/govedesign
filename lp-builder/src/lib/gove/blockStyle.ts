/**
 * Aparência de qualquer bloco (`blockStyle`), ajustes de texto, botão e
 * regras por dispositivo — compartilhado entre o canvas e o HTML exportado.
 *
 * - `blockMargin`, `blockBoxCss`: CSS inline do elemento externo do bloco
 *   (o próprio texto/card, ou o invólucro do botão/imagem/vídeo/contagem/RD).
 * - `leafRules`, `sectionRules`: regras da folha da página (hover, transição,
 *   clique, ocultar por dispositivo, espaçamento da seção no celular, botão em
 *   largura total no celular). Chamadas por `pageSheet` (styleRules.ts).
 *
 * Etapa 3 (blocos novos): todo bloco novo deve ter `blockStyle?: BlockStyle`,
 * pôr `sheet.classOf(id)` no elemento externo, usar `blockMargin` +
 * `blockBoxCss` no estilo inline dele e entrar em `hoverTarget` se o alvo do
 * hover não for o próprio elemento externo.
 *
 * Sem importar valores de styleRules (evita ciclo): só tipos.
 */
import { rgba } from "./background";
import type { Decls, Device, Sheet } from "./styleRules";
import type {
  BlockStyle,
  BorderSides,
  ButtonBlock,
  DeviceHide,
  HoverEffect,
  Leaf,
  SectionBlock,
  Shadow,
  TextBlock,
  TransitionSpeed,
} from "./types";

/* ------------------------------------------------------------------- opções */

export const HOVER_EFFECTS: { value: HoverEffect; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "lift2", label: "Levantar 2px" },
  { value: "lift4", label: "Levantar 4px" },
  { value: "liftShadow", label: "Levantar com sombra" },
  { value: "topBar", label: "Barra superior" },
  { value: "borderHighlight", label: "Destacar a borda" },
];
export const TRANSITION_SPEEDS: readonly TransitionSpeed[] = [0.18, 0.2, 0.3];
export const DEFAULT_TRANSITION: TransitionSpeed = 0.2;
export const LETTER_SPACINGS = [-0.04, -0.03, -0.02, -0.01, 0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14];
export const LINE_HEIGHTS = [1.1, 1.2, 1.4, 1.5, 1.6];
export const DEFAULT_LINE_HEIGHT = 1.4;
export const BLOCK_MAX_WIDTHS = [320, 400, 480, 560, 600, 640, 720, 840, 960];
/** Largura (px) em que o tamanho responsivo chega ao máximo: vw = máximo / 12. */
export const FLUID_FULL_AT = 1200;
/** Largura do canvas em cada modo, para o tamanho responsivo. */
const DEVICE_PX: Record<Device, number> = { desktop: 1440, tablet: 820, mobile: 390 };
/** Seção no celular, modo "auto": 72% do espaçamento vertical do computador. */
export const MOBILE_PADDING_RATIO = 0.72;
/** Destaque ==texto== sem cores escolhidas: Amarelo → Ciano. */
export const HIGHLIGHT_DEFAULT = { from: "#FFC72C", to: "#5AC2CD" };

/** Tamanhos de botão: P (10×20), M (14×26), G (16×32, o de antes). */
export const BUTTON_SIZES: { value: NonNullable<ButtonBlock["btnSize"]>; label: string; padding: string }[] = [
  { value: "sm", label: "P", padding: "10px 20px" },
  { value: "md", label: "M", padding: "14px 26px" },
  { value: "lg", label: "G", padding: "16px 32px" },
];

/* ------------------------------------------------------------------ helpers */

const num = (n: number) => String(Math.round(n * 1000) / 1000);
const px = (n: number) => (n ? `${n}px` : "0");
const isHex = (c: string | undefined): c is string => !!c && /^#[0-9a-f]{3,8}$/i.test(c);

/** Sombra; na identidade BB usa o Azul escuro da paleta (translúcido). */
export function shadowCss(shadow: Shadow | undefined, bb = false): string | undefined {
  const c = bb ? "51,51,189" : "11,32,39";
  if (shadow === "sm") return `0 2px 8px rgba(${c},.08)`;
  if (shadow === "md") return `0 8px 24px rgba(${c},.16)`;
  if (shadow === "lg") return `0 24px 60px rgba(${c},.18)`;
  return undefined;
}

export const blockStyleOf = (leaf: { blockStyle?: BlockStyle | undefined }): BlockStyle => leaf.blockStyle ?? {};

/** Bordas por lado (as mesmas da caixa). */
export function sidedBorder(width: number | undefined, color: string | undefined, sides: BorderSides | undefined, style: string | undefined): Decls {
  if (!width || sides === "none") return {};
  const value = `${width}px ${style ?? "solid"} ${color ?? "#F4F4F4"}`;
  if (sides === "block") return { "border-top": value, "border-bottom": value };
  if (sides === "left") return { "border-left": value };
  return { border: value };
}

/** Alinhamento do bloco (para posicionar a largura máxima). */
const leafAlign = (leaf: Leaf): "left" | "center" | "right" =>
  "align" in leaf && leaf.align ? leaf.align : "left";

/**
 * Margem do elemento externo. Sem opções = "0 0 16px" (o de antes). Com
 * largura máxima, as laterais seguem o alinhamento do bloco.
 */
export function blockMargin(leaf: Leaf): string {
  const bs = blockStyleOf(leaf);
  const top = px(bs.marginTop ?? 0);
  const bottom = px(bs.marginBottom ?? 16);
  if (!bs.maxWidth) return `${top} 0 ${bottom}`;
  const align = leafAlign(leaf);
  if (align === "center") return `${top} auto ${bottom}`;
  if (align === "right") return `${top} 0 ${bottom} auto`;
  return `${top} 0 ${bottom}`;
}

/** Fundo do bloco com a opacidade do preenchimento. */
export function blockFill(color: string | undefined, opacity: number | undefined): string | undefined {
  if (!color) return undefined;
  const op = opacity ?? 100;
  if (op >= 100 || !isHex(color)) return color;
  return rgba(color, Math.max(0, op) / 100);
}

/**
 * CSS inline da aparência do bloco (sem a margem). `own`: o elemento já tem
 * fundo/borda/raio/sombra/preenchimento próprios (card) — só entram vidro,
 * lados/estilo da borda, opacidade e largura máxima.
 */
export function blockBoxCss(leaf: Leaf, bb = false): Decls {
  const bs = blockStyleOf(leaf);
  const blur = Math.min(16, Math.max(0, bs.glassBlur ?? 0));
  const own = leaf.type === "card";
  const padding =
    !own && (bs.paddingY !== undefined || bs.paddingX !== undefined)
      ? `${px(bs.paddingY ?? 0)} ${px(bs.paddingX ?? 0)}`
      : undefined;
  return defined({
    "max-width": bs.maxWidth ? `${bs.maxWidth}px` : undefined,
    padding,
    "background-color": own ? undefined : blockFill(bs.bgColor, bs.fillOpacity),
    ...(own ? {} : sidedBorder(bs.borderWidth, bs.borderColor, bs.borderSides, bs.borderStyle)),
    "border-radius": !own && bs.radius ? `${bs.radius}px` : undefined,
    "box-shadow": own ? undefined : shadowCss(bs.shadow, bb),
    "backdrop-filter": blur ? `blur(${blur}px)` : undefined,
    "-webkit-backdrop-filter": blur ? `blur(${blur}px)` : undefined,
    opacity: bs.opacity !== undefined && bs.opacity < 100 ? num(Math.max(10, bs.opacity) / 100) : undefined,
  });
}

/** Só as declarações com valor (para espalhar sem apagar as de antes). */
function defined(decls: Decls): Decls {
  const out: Decls = {};
  for (const [k, v] of Object.entries(decls)) if (v !== undefined && v !== "") out[k] = v;
  return out;
}

/** Bloco tem alguma aparência que pede invólucro (ex.: formulário RD)? */
export const hasBlockStyle = (leaf: Leaf) => !!leaf.blockStyle && Object.keys(leaf.blockStyle).length > 0;

/* -------------------------------------------------------------------- texto */

/** Tamanho responsivo: clamp(min, vw, max) no export. */
export function fluidFont(leaf: Pick<TextBlock, "size" | "sizeMin">): string {
  const max = leaf.size;
  const min = leaf.sizeMin;
  if (!min || min >= max) return `${max}px`;
  return `clamp(${min}px, ${num((max / FLUID_FULL_AT) * 100)}vw, ${max}px)`;
}

/** Tamanho no canvas: o valor do clamp na largura do modo escolhido. */
export function fluidFontAt(leaf: Pick<TextBlock, "size" | "sizeMin">, device: Device): number {
  const max = leaf.size;
  const min = leaf.sizeMin;
  if (!min || min >= max) return max;
  const v = (max / FLUID_FULL_AT) * DEVICE_PX[device];
  return Math.round(Math.min(max, Math.max(min, v)) * 10) / 10;
}

/** Ajustes tipográficos novos (caixa alta, espaçamento entre letras). */
export function textExtrasCss(leaf: TextBlock): Decls {
  return {
    "text-transform": leaf.uppercase ? "uppercase" : undefined,
    "letter-spacing": leaf.letterSpacing ? `${num(leaf.letterSpacing)}em` : undefined,
  };
}

/** Cores do destaque ==texto==. */
export function highlightColors(leaf: TextBlock) {
  return {
    from: leaf.highlightFrom || HIGHLIGHT_DEFAULT.from,
    to: leaf.highlightTo || HIGHLIGHT_DEFAULT.to,
  };
}

/**
 * CSS do trecho destacado: degradê recortado no texto; onde o recorte não
 * existe, fica a cor sólida (`color`). Na identidade BB, só a cor sólida.
 */
export function highlightCss(leaf: TextBlock, bb = false): Decls {
  const { from, to } = highlightColors(leaf);
  if (bb) return { color: from };
  return {
    color: from,
    "background-image": `linear-gradient(90deg, ${from}, ${to})`,
    "-webkit-background-clip": "text",
    "background-clip": "text",
    "-webkit-text-fill-color": "transparent",
    "-webkit-box-decoration-break": "clone",
    "box-decoration-break": "clone",
  };
}

/* ------------------------------------------------------------- dispositivos */

const DEVICE_LABEL: Record<Device, string> = { desktop: "computador", tablet: "tablet", mobile: "celular" };

/** O elemento está oculto neste modo do canvas? */
export const hiddenOn = (hide: DeviceHide | undefined, device: Device) => !!hide?.[device];

/** Aviso do canvas: "Oculto no celular" etc. */
export function hiddenLabel(hide: DeviceHide | undefined): string | null {
  const list = (["desktop", "tablet", "mobile"] as const).filter((d) => hide?.[d]).map((d) => DEVICE_LABEL[d]);
  if (!list.length) return null;
  return `Oculto no ${list.join(" e no ")}`;
}

function hideRules(sheet: Sheet, sel: string, hide: DeviceHide | undefined) {
  if (!hide) return;
  const none = { display: "none !important" };
  if (hide.desktop) sheet.add(sel, none, "desktop", { exportOnly: true });
  if (hide.tablet) sheet.add(sel, none, "tabletOnly", { exportOnly: true });
  if (hide.mobile) sheet.add(sel, none, "mobile", { exportOnly: true });
}

/** Espaçamento vertical da seção no celular (px) ou null (igual ao computador). */
export function mobilePaddingY(box: { paddingY: number; paddingYMobile?: number | "auto" | undefined }): number | null {
  const v = box.paddingYMobile;
  if (v === undefined) return null;
  if (v === "auto") return Math.round((box.paddingY * MOBILE_PADDING_RATIO) / 2) * 2;
  return v;
}

/** Regras da seção: espaçamento no celular e ocultar por dispositivo. */
export function sectionRules(sheet: Sheet, section: SectionBlock) {
  const y = mobilePaddingY(section.box);
  if (y !== null && y !== section.box.paddingY)
    sheet.add(
      sheet.node(section.id),
      { "padding-top": `${y}px !important`, "padding-bottom": `${y}px !important` },
      "mobile",
    );
  if (section.hide && Object.values(section.hide).some(Boolean)) hideRules(sheet, sheet.node(section.id), section.hide);
}

/* -------------------------------------------------------------------- hover */

/** Seletor do alvo do hover/clique: o próprio bloco, ou o botão dentro do invólucro. */
export const hoverTarget = (leaf: Leaf, sel: string) => (leaf.type === "button" ? `${sel}>*` : sel);

/** O bloco tem borda própria (o destaque troca a cor dela)? */
function hasBorder(leaf: Leaf): boolean {
  const bs = blockStyleOf(leaf);
  if (leaf.type === "card") return leaf.borderWidth > 0 && bs.borderSides !== "none";
  if (leaf.type === "button") return leaf.variant === "outline" || leaf.variant === "glass" || leaf.variant === "ghost";
  return !!bs.borderWidth && bs.borderSides !== "none";
}

/** Sombra do "levantar com sombra": do botão, na cor dele; nos outros, a grande. */
function liftShadow(leaf: Leaf, bb: boolean): string {
  if (!bb && leaf.type === "button" && leaf.variant !== "text" && leaf.variant !== "ghost" && isHex(leaf.bgColor))
    return `0 14px 32px ${rgba(leaf.bgColor, 0.4)}`;
  return shadowCss("lg", bb)!;
}

/** Cor do destaque (barra/borda): a escolhida, ou a do botão / Amarelo. */
export function hoverColor(leaf: Leaf): string {
  const bs = blockStyleOf(leaf);
  if (bs.hoverColor) return bs.hoverColor;
  if (leaf.type === "button" && isHex(leaf.bgColor)) return leaf.bgColor;
  return "#FFC72C";
}

/**
 * Regras do bloco: hover, transição, clique, ocultar por dispositivo e
 * botão em largura total no celular. Movimentos (transform e transition) ficam
 * no grupo "motion": quem pede menos movimento vê só a troca de sombra/cor.
 */
export function leafRules(sheet: Sheet, leaf: Leaf, bb = false) {
  const bs = blockStyleOf(leaf);
  const hover = bs.hover ?? "none";
  const ghost = leaf.type === "button" && leaf.variant === "ghost";
  const fullMobile = leaf.type === "button" && leaf.fullWidth === "mobile";
  const hide = bs.hide && Object.values(bs.hide).some(Boolean);
  if (hover === "none" && !bs.press && !ghost && !fullMobile && !hide) return;

  const sel = sheet.node(leaf.id);
  const target = hoverTarget(leaf, sel);
  const speed = bs.transition ?? DEFAULT_TRANSITION;

  if (ghost) {
    // Fantasma: fundo translúcido e borda mais forte no hover (cor do texto).
    const c = isHex(leaf.color) ? leaf.color : "#FFFFFF";
    sheet.add(`${target}:hover`, {
      "background-color": `${rgba(c, 0.1)} !important`,
      "border-color": `${rgba(c, 0.7)} !important`,
    });
  }

  const lift: Partial<Record<HoverEffect, number>> = { lift2: -2, lift4: -4, liftShadow: -2, topBar: -4 };
  if (hover === "liftShadow" || hover === "topBar")
    sheet.add(`${target}:hover`, { "box-shadow": `${liftShadow(leaf, bb)} !important` });
  if (hover === "borderHighlight") {
    const color = hoverColor(leaf);
    sheet.add(
      `${target}:hover`,
      hasBorder(leaf) ? { "border-color": `${color} !important` } : { "box-shadow": `0 0 0 2px ${color} !important` },
    );
  }
  if (hover === "topBar") {
    sheet.add(target, { position: "relative", overflow: "hidden" });
    sheet.add(`${target}::before`, {
      content: '""',
      position: "absolute",
      top: "0",
      left: "0",
      right: "0",
      height: "3px",
      background: hoverColor(leaf),
      transform: "scaleX(0)",
      "transform-origin": "left",
      "pointer-events": "none",
    });
    sheet.add(`${target}:hover::before`, { transform: "scaleX(1)" });
  }

  if (hover !== "none" || bs.press || ghost) {
    const t = `${num(speed)}s ease`;
    sheet.add(
      target,
      { transition: `transform ${t}, box-shadow ${t}, border-color ${t}, background-color ${t}` },
      "motion",
    );
  }
  if (hover === "topBar") sheet.add(`${target}::before`, { transition: `transform ${num(Math.max(speed, 0.3))}s ease` }, "motion");
  const dy = lift[hover];
  if (dy) sheet.add(`${target}:hover`, { transform: `translateY(${dy}px)` }, "motion");
  // Clique depois do hover: na mesma especificidade, vence.
  if (bs.press) sheet.add(`${target}:active`, { transform: "translateY(1px)" }, "motion");

  if (fullMobile)
    sheet.add(`${sel}>*`, { display: "flex !important", width: "100%", "justify-content": "center" }, "mobile");

  if (hide) hideRules(sheet, sel, bs.hide);
}
