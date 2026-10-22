/** QR Code 100% local (qrcode-generator), exportável em SVG e PNG. */
import qrcode from "qrcode-generator";

const MARGIN = 4; // zona de silêncio recomendada, em módulos

function matrix(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return { n, isDark: (r: number, c: number) => qr.isDark(r, c) };
}

/** SVG com fundo branco e módulos pretos (#000000), legível por qualquer leitor. */
export function qrSvg(text: string, title = "QR Code"): string {
  const { n, isDark } = matrix(text);
  const size = n + MARGIN * 2;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isDark(r, c)) d += `M${c + MARGIN} ${r + MARGIN}h1v1h-1z`;
    }
  }
  const esc = title.replace(/[<&>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="${esc}">` +
    `<title>${esc}</title><rect width="${size}" height="${size}" fill="#FFFFFF"/>` +
    `<path d="${d}" fill="#000000"/></svg>`
  );
}

export function qrPng(text: string, pixels = 1024): Promise<Blob | null> {
  const { n, isDark } = matrix(text);
  const size = n + MARGIN * 2;
  const scale = Math.max(1, Math.floor(pixels / size));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isDark(r, c)) ctx.fillRect((c + MARGIN) * scale, (r + MARGIN) * scale, scale, scale);
    }
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
