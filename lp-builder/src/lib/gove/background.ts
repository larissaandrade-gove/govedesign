import type { BoxProps } from "./types";

/** Normaliza caixas antigas (salvas antes das opções de preenchimento). */
export function normalizeBox(box: BoxProps): BoxProps {
  return {
    fill: box.fill ?? (box.bgImage ? "image" : "solid"),
    bgColor: box.bgColor ?? "#FFFFFF",
    bgImage: box.bgImage ?? "",
    bgSize: box.bgSize ?? "cover",
    bgPosition: box.bgPosition ?? "center",
    bgRepeat: box.bgRepeat ?? false,
    overlay: box.overlay ?? 0,
    overlayColor: box.overlayColor ?? "#20133D",
    gradientFrom: box.gradientFrom ?? "#20133D",
    gradientVia: box.gradientVia ?? "#3D0099",
    gradientTo: box.gradientTo ?? "#9741FC",
    gradientAngle: box.gradientAngle ?? 135,
    borderColor: box.borderColor,
    borderWidth: box.borderWidth,
    radius: box.radius,
    shadow: box.shadow,
    paddingY: box.paddingY,
    paddingX: box.paddingX,
    animation: box.animation ?? "none",
    bgCredit: box.bgCredit ?? null,
  };
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.round(alpha * 1000) / 1000})`;
}

export function gradientCss(box: BoxProps) {
  const b = normalizeBox(box);
  const stops = [b.gradientFrom, b.gradientVia, b.gradientTo].filter(Boolean);
  return `linear-gradient(${b.gradientAngle}deg, ${stops.join(", ")})`;
}

/** CSS de background compartilhado entre canvas e exportação (kebab-case). */
export function backgroundCss(box: BoxProps): Record<string, string | undefined> {
  const b = normalizeBox(box);
  const overlayLayer =
    b.overlay > 0
      ? `linear-gradient(${rgba(b.overlayColor, b.overlay / 100)}, ${rgba(b.overlayColor, b.overlay / 100)})`
      : null;

  if (b.fill === "gradient") {
    const layers = [overlayLayer, gradientCss(b)].filter(Boolean).join(", ");
    return { "background-color": b.bgColor, "background-image": layers };
  }

  if (b.fill === "image" && b.bgImage) {
    const layers = [overlayLayer, `url('${b.bgImage}')`].filter(Boolean).join(", ");
    return {
      "background-color": b.bgColor,
      "background-image": layers,
      "background-size": b.bgSize,
      "background-position": b.bgPosition,
      "background-repeat": b.bgRepeat ? "repeat" : "no-repeat",
    };
  }

  return {
    "background-color": b.bgColor === "transparent" ? undefined : b.bgColor,
    "background-image": overlayLayer ?? undefined,
  };
}

const CAMEL: Record<string, string> = {
  "background-color": "backgroundColor",
  "background-image": "backgroundImage",
  "background-size": "backgroundSize",
  "background-position": "backgroundPosition",
  "background-repeat": "backgroundRepeat",
};

export function backgroundStyle(box: BoxProps): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(backgroundCss(box)).map(([k, v]) => [CAMEL[k] ?? k, v]),
  );
}
