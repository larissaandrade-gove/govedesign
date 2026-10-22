/**
 * Ponte entre o código do app (src/) e o runtime compartilhado do artefato.
 * As transformações em `transforms.ts` trocam os downloads, a área de
 * transferência e a gravação de vídeo do app por estas funções.
 */
import { toast } from "sonner";
import { saveFile, type SaveOutcome } from "@gove/runtime";

/* --------------------------------------------------------------- downloads */

const extOfType = (type: string) => (type.includes("mp4") ? "mp4" : type.includes("webm") ? "webm" : null);

/** Salva um arquivo pelo `saveFile()` do runtime, avisando o resultado. */
export async function saveDownload(blob: Blob, filename: string): Promise<SaveOutcome> {
  let name = filename;
  // O vídeo sai no formato que o navegador grava (MP4 nativo ou WebM).
  const videoExt = blob.type.startsWith("video/") ? extOfType(blob.type) : null;
  if (videoExt) name = name.replace(/\.(mp4|webm)$/i, "") + "." + videoExt;
  const outcome = await saveFile(name, blob);
  if (outcome === "declined") toast("Download cancelado.");
  else if (outcome === "error")
    toast.error("Não foi possível salvar o arquivo. Verifique se os downloads estão liberados para esta página.");
  return outcome;
}

/** Junta todas as peças renderizadas (canvas) num único .zip de PNGs. */
export async function downloadCanvasesZip(root: HTMLElement | null) {
  const all = Array.from(root?.querySelectorAll("canvas") ?? []);
  if (!all.length) {
    toast.error("Gere os criativos antes de baixar.");
    return;
  }
  // Peças bloqueadas pela verificação de marca (modo BB) não são exportadas.
  const canvases = all.filter((c) => c.dataset["exportBlocked"] !== "true");
  if (canvases.length < all.length)
    toast(`${all.length - canvases.length} peça(s) fora do manual ficaram de fora.`);
  if (!canvases.length) return;
  const id = toast.loading("Preparando o arquivo .zip…");
  const files: { name: string; data: Uint8Array }[] = [];
  for (const [i, canvas] of canvases.entries()) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) continue;
    files.push({
      name: `gove-criativo-${i + 1}-${canvas.width}x${canvas.height}.png`,
      data: new Uint8Array(await blob.arrayBuffer()),
    });
  }
  toast.dismiss(id);
  const outcome = await saveDownload(zipStore(files), "gove-criativos.zip");
  if (outcome === "saved") toast.success(`${files.length} criativos salvos em gove-criativos.zip.`);
}

/* --------------------------------------------------------------- zip (store) */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** .zip sem compressão (PNG já é comprimido) — sem dependências externas. */
export function zipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(local.buffer, name, f.data as BlobPart);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, dosTime, true);
    cen.setUint16(14, dosDate, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, f.data.length, true);
    cen.setUint32(24, f.data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    const entry = new Uint8Array(46 + name.length);
    entry.set(new Uint8Array(cen.buffer), 0);
    entry.set(name, 46);
    central.push(entry);
    offset += 30 + name.length + f.data.length;
  }
  const cenSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...(central as BlobPart[]), end.buffer], { type: "application/zip" });
}

/* ----------------------------------------------------------------- clipboard */

/** Copia texto; usa execCommand quando a API de clipboard é bloqueada no iframe. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* sem permissão no iframe: tenta o caminho antigo */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) toast.error("O navegador bloqueou a cópia. Texto alternativo:\n" + text);
  return ok;
}

/* --------------------------------------------------------------------- vídeo */

const MP4_TYPES = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4"];
const WEBM_TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

const supported = (m: string) => {
  try {
    return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m);
  } catch {
    return false;
  }
};

/**
 * Formato de gravação: MP4 (H.264) quando o navegador grava MP4 nativamente;
 * senão WebM. Não há conversão via ffmpeg no artefato (o core vinha de CDN).
 */
export function pickVideoMime(): string {
  return MP4_TYPES.find(supported) ?? WEBM_TYPES.find(supported) ?? "video/webm";
}

/** Rótulo honesto do formato de vídeo que este navegador vai entregar. */
export function videoLabel(): "MP4" | "WebM" {
  return pickVideoMime().startsWith("video/mp4") ? "MP4" : "WebM";
}
