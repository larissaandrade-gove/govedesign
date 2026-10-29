/**
 * Cores dos blocos novos (etapa 3), descritas uma vez para a auditoria
 * (contraste >= 4,5:1), a checagem BB e o ajuste automático BB.
 *
 * - "text": cor de texto; `on` = campo do bloco com o fundo próprio dela
 *   (ausente = o fundo do contêiner / da aparência do bloco).
 * - "shape": forma (marcador, borda, linha, botão): >= 3:1 na BB.
 * - "surface" / "deco": fundo próprio ou detalhe decorativo: só paleta.
 *
 * Módulo puro (só tipos), importado por bb.ts e audit.ts sem ciclo.
 */
import { contrastRatio } from "./contrast";
import type { Leaf, NavbarBlock, RdFormBlock } from "./types";

export type ColorRole = "text" | "shape" | "surface" | "deco";

export interface ColorPart {
  key: string;
  role: ColorRole;
  /** Rótulo da parte (mensagens da auditoria). */
  part: string;
  /** Campo com o fundo desta cor de texto (ausente = contêiner). */
  on?: string;
  /** Texto em negrito (contraste de texto grande). */
  bold?: boolean;
}

/** Tipos dos blocos novos. */
export const NEW_BLOCK_TYPES = [
  "badge",
  "list",
  "infolist",
  "tags",
  "stats",
  "timeline",
  "faq",
  "date",
  "person",
  "divider",
  "navbar",
  "footer",
  "carousel",
] as const;
export type NewBlockType = (typeof NEW_BLOCK_TYPES)[number];
export type NewBlock = Extract<Leaf, { type: NewBlockType }>;

export const isNewBlock = (leaf: Leaf): leaf is NewBlock =>
  (NEW_BLOCK_TYPES as readonly string[]).includes(leaf.type);

const navbarParts = (leaf: NavbarBlock): ColorPart[] => {
  const parts: ColorPart[] = [{ key: "linkColor", role: "text", part: " (links)" }];
  if (leaf.ctaLabel.trim()) {
    parts.push({ key: "ctaBgColor", role: "shape", part: " (botão)" });
    parts.push({
      key: "ctaColor",
      role: "text",
      part: " (texto do botão)",
      bold: true,
      ...(leaf.ctaVariant === "filled" ? { on: "ctaBgColor" } : {}),
    });
  }
  return parts;
};

/** Cores de cada bloco novo. */
export function colorParts(leaf: Leaf): ColorPart[] {
  switch (leaf.type) {
    case "badge":
      return [
        { key: "color", role: "text", part: "", bold: true },
        { key: "accentColor", role: "shape", part: " (ponto/borda)" },
      ];
    case "list":
      return [
        { key: "color", role: "text", part: "" },
        { key: "accentColor", role: "shape", part: " (marcadores)" },
        ...(leaf.divider !== "none" ? [{ key: "dividerColor", role: "deco" as const, part: " (divisória)" }] : []),
      ];
    case "infolist":
      return [
        { key: "color", role: "text", part: " (valores)", bold: true },
        { key: "labelColor", role: "text", part: " (rótulos)" },
        { key: "dividerColor", role: "deco", part: " (divisória)" },
      ];
    case "tags":
      return [
        { key: "color", role: "text", part: "" },
        { key: "accentColor", role: "shape", part: " (borda)" },
      ];
    case "stats":
      return [
        { key: "color", role: "text", part: " (números)", bold: true },
        { key: "labelColor", role: "text", part: " (rótulos)", bold: true },
      ];
    case "timeline":
      return [
        { key: "color", role: "text", part: " (horários e títulos)", bold: true },
        { key: "textColor", role: "text", part: " (textos)" },
        { key: "accentColor", role: "shape", part: " (linha e marcadores)" },
        { key: "markerBg", role: "deco", part: " (miolo dos marcadores)" },
      ];
    case "faq":
      return [
        { key: "color", role: "text", part: " (perguntas)", bold: true },
        { key: "textColor", role: "text", part: " (respostas)" },
        { key: "accentColor", role: "shape", part: " (seta)" },
        { key: "dividerColor", role: "deco", part: " (divisória)" },
      ];
    case "date":
      return [
        { key: "bgColor", role: "surface", part: " (fundo do dia)" },
        { key: "boxColor", role: "text", part: " (dia e mês)", on: "bgColor", bold: true },
        { key: "labelColor", role: "text", part: " (dia da semana)", bold: true },
        { key: "color", role: "text", part: " (horário)", bold: true },
      ];
    case "person":
      return [
        { key: "accentColor", role: leaf.photo ? "shape" : "surface", part: " (avatar)" },
        ...(leaf.photo ? [] : [{ key: "avatarColor", role: "text" as const, part: " (iniciais)", on: "accentColor", bold: true }]),
        ...(leaf.role.trim() ? [{ key: "roleColor", role: "text" as const, part: " (função)", bold: true }] : []),
        { key: "color", role: "text", part: " (nome)", bold: true },
        { key: "textColor", role: "text", part: " (textos)" },
      ];
    case "divider":
      return leaf.variant === "space" ? [] : [{ key: "color", role: "deco", part: "" }];
    case "navbar":
      return navbarParts(leaf);
    case "carousel":
      return leaf.kind === "text"
        ? [
            { key: "bgColor", role: "surface", part: " (fundo dos itens)" },
            { key: "color", role: "text", part: " (títulos)", on: "bgColor", bold: true },
            { key: "textColor", role: "text", part: " (textos)", on: "bgColor" },
          ]
        : [];
    case "footer":
      return [
        { key: "color", role: "text", part: "" },
        ...(leaf.links.length ? [{ key: "linkColor", role: "text" as const, part: " (links)" }] : []),
      ];
    default:
      return [];
  }
}

/** Cores dos campos do RD (borda e foco: formas; fundo: superfície). */
export const rdFieldParts = (leaf: RdFormBlock): ColorPart[] =>
  leaf.fields
    ? [
        { key: "bgColor", role: "surface", part: " (fundo dos campos)" },
        { key: "borderColor", role: "deco", part: " (borda dos campos)" },
        { key: "focusColor", role: "shape", part: " (foco dos campos)" },
      ]
    : [];

/** Valor de uma cor do bloco. */
export const colorOf = (leaf: Leaf, key: string): string =>
  String((leaf as unknown as Record<string, unknown>)[key] ?? "");

/** Tamanho do texto do bloco (px) para a auditoria; null = sem texto próprio. */
export function textSize(leaf: Leaf): number | null {
  if (leaf.type === "divider") return null;
  if (leaf.type === "carousel" && leaf.kind === "image") return null;
  if (leaf.type === "date") return 16;
  return "size" in leaf ? leaf.size : null;
}

/** Alternativas da paleta GOVE quando a cor-padrão não lê sobre o fundo. */
const TEXT_ALTERNATIVES = ["#FFFFFF", "#F4F4F4", "#20133D", "#2F3539"];
const SHAPE_ALTERNATIVES = ["#FFC72C", "#5AC2CD", "#3D0099", "#20133D", "#FFFFFF"];

/**
 * Bloco novo inserido (identidade GOVE): troca as cores-padrão que não leem
 * sobre o fundo de onde ele entra (ex.: seção escura) por cores da paleta que
 * passem (texto 4,5:1, formas 3:1). As escolhas que já passam ficam.
 */
export function adaptColors<T extends Leaf>(leaf: T, background: string): T {
  if (!isNewBlock(leaf)) return leaf;
  const own = leaf.blockStyle?.bgColor && (leaf.blockStyle.fillOpacity ?? 100) >= 100 ? leaf.blockStyle.bgColor : null;
  const bg = own ?? background;
  const next = { ...leaf } as unknown as Record<string, unknown>;
  const ok = (c: string, on: string, min: number) => (contrastRatio(c, on) ?? 21) >= min;
  for (const part of colorParts(leaf)) {
    const on = part.on ? String(next[part.on]) : bg;
    const current = String(next[part.key] ?? "");
    if (part.role === "text" && !ok(current, on, 4.5))
      next[part.key] = TEXT_ALTERNATIVES.find((c) => ok(c, on, 4.5)) ?? current;
    if (part.role === "shape" && !ok(current, on, 3))
      next[part.key] = SHAPE_ALTERNATIVES.find((c) => ok(c, on, 3)) ?? current;
    // Miolo dos marcadores do cronograma: o próprio fundo.
    if (part.key === "markerBg" && /^#[0-9a-f]{6}$/i.test(bg)) next[part.key] = bg;
  }
  return next as unknown as T;
}

/**
 * Cores do estado de hover (troca de cor): pares texto/fundo que precisam
 * de 4,5:1 com o mouse em cima. `bg`: fundo do bloco sem hover.
 */
export function hoverPairs(leaf: Leaf, bg: string): { part: string; color: string; on: string; size: number; bold: boolean }[] {
  const bs = leaf.blockStyle;
  if (!bs || !(bs.hoverBg || bs.hoverText)) return [];
  const on = bs.hoverBg ?? bg;
  const out: { part: string; color: string; on: string; size: number; bold: boolean }[] = [];
  switch (leaf.type) {
    case "card":
      out.push({ part: " (título no hover)", color: bs.hoverText ?? leaf.color, on, size: leaf.size + 4, bold: true });
      if (bs.hoverBg) out.push({ part: " (texto no hover)", color: leaf.color, on, size: leaf.size, bold: false });
      break;
    case "text":
      out.push({ part: " (hover)", color: bs.hoverText ?? leaf.color, on, size: leaf.size, bold: leaf.weight === "bold" });
      break;
    case "button": {
      // Botão preenchido: o fundo do hover substitui o do botão.
      const filled = leaf.variant === "filled" || leaf.variant === "elevated";
      out.push({ part: " (hover)", color: bs.hoverText ?? leaf.color, on: bs.hoverBg ?? (filled ? leaf.bgColor : bg), size: leaf.size, bold: leaf.weight === "bold" });
      break;
    }
    default:
      // Blocos novos: as cores de texto sobre o fundo do hover (as que não têm fundo próprio).
      if (bs.hoverBg && isNewBlock(leaf))
        for (const p of colorParts(leaf))
          if (p.role === "text" && !p.on)
            out.push({ part: `${p.part} (hover)`, color: colorOf(leaf, p.key), on, size: textSize(leaf) ?? 16, bold: !!p.bold });
  }
  return out;
}
