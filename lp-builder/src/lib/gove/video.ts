/** Converte links do YouTube/Vimeo em URL de embed. Outros links passam direto. */
export function embedUrl(raw: string): string {
  const url = (raw || "").trim();
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export const ASPECTS: { value: string; label: string }[] = [
  { value: "16 / 9", label: "16:9 (widescreen)" },
  { value: "4 / 3", label: "4:3" },
  { value: "1 / 1", label: "1:1 (quadrado)" },
  { value: "9 / 16", label: "9:16 (vertical)" },
];
