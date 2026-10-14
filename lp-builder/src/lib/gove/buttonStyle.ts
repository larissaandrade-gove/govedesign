import type { ButtonBlock } from "./types";

export const BUTTON_VARIANTS: { value: ButtonBlock["variant"]; label: string }[] = [
  { value: "filled", label: "Preenchido" },
  { value: "elevated", label: "Sólido com sombra difusa" },
  { value: "outline", label: "Transparente com contorno" },
  { value: "glass", label: "Glass morphism" },
  { value: "text", label: "Texto" },
];

export function hexToRgba(hex: string, alpha: number): string {
  const h = (hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6) || "000000", 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Entrada mínima para os estilos de botão (usada por botões e contagem regressiva). */
export interface ButtonStyleInput {
  variant: ButtonBlock["variant"];
  bgColor: string;
}

/** CSS declarations (kebab-case) for a button block, shared by canvas and export. */
export function buttonCss(leaf: ButtonStyleInput): Record<string, string | undefined> {
  const css: Record<string, string | undefined> = {
    padding: leaf.variant === "text" ? "8px 0" : "16px 32px",
  };
  switch (leaf.variant) {
    case "filled":
      css["background-color"] = leaf.bgColor;
      break;
    case "elevated":
      css["background-color"] = leaf.bgColor;
      css["box-shadow"] = `0 12px 28px ${hexToRgba(leaf.bgColor, 0.38)}, 0 4px 10px ${hexToRgba(leaf.bgColor, 0.24)}`;
      break;
    case "outline":
      css["background-color"] = "transparent";
      css["border"] = `2px solid ${leaf.bgColor}`;
      break;
    case "glass":
      css["background-color"] = hexToRgba(leaf.bgColor, 0.18);
      css["border"] = `1px solid ${hexToRgba(leaf.bgColor, 0.45)}`;
      css["backdrop-filter"] = "blur(12px) saturate(140%)";
      css["box-shadow"] = `0 8px 24px ${hexToRgba(leaf.bgColor, 0.22)}`;
      break;
    default:
      break;
  }
  return css;
}

/** React inline style version of buttonCss. */
export function buttonReactStyle(leaf: ButtonStyleInput): React.CSSProperties {
  const css = buttonCss(leaf);
  return {
    padding: css["padding"],
    backgroundColor: css["background-color"],
    border: css["border"],
    boxShadow: css["box-shadow"],
    backdropFilter: css["backdrop-filter"],
    WebkitBackdropFilter: css["backdrop-filter"],
  } as React.CSSProperties;
}
