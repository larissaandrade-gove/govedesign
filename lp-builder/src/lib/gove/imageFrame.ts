import type { ImageBlock, ImageFrame } from "./types";

/** Estilos da moldura da imagem, compartilhados entre canvas e exportação. */
export function imageFrameCss(leaf: ImageBlock): {
  radius: string;
  aspectRatio?: string;
  objectFit?: "cover" | "contain";
} {
  const frame: ImageFrame = leaf.frame ?? "free";
  switch (frame) {
    case "circle":
      return { radius: "9999px", aspectRatio: "1 / 1", objectFit: "cover" };
    case "square":
      return { radius: `${leaf.radius}px`, aspectRatio: "1 / 1", objectFit: "cover" };
    case "rounded":
      return { radius: `${leaf.radius || 16}px` };
    default:
      return { radius: `${leaf.radius}px` };
  }
}
