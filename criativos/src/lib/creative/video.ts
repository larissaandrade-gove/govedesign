import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

import { formatSize, renderCreative, type CreativeFormat, type CreativeSpec } from "./renderer";

/** Duração fixa das peças em vídeo (sem áudio). */
export const VIDEO_DURATION = 15;
export const VIDEO_FPS = 30;

/** Os 3 formatos gerados por vez no modo vídeo. */
export const VIDEO_FORMATS: CreativeFormat[] = ["feed-45", "story-916", "square-11"];

/** Margem livre de elementos de marca no 9:16 (interface do Instagram/TikTok). */
const STORY_SAFE = 250;
const BASE_MARGIN = 72;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Estado de animação da peça no instante t (segundos). */
export function animationSpec(
  spec: CreativeSpec,
  format: CreativeFormat,
  t: number,
): CreativeSpec {
  const p = clamp01(t / VIDEO_DURATION);
  const story = format === "story-916";
  const safe = Math.max(0, STORY_SAFE - BASE_MARGIN);
  return {
    ...spec,
    format,
    zoom: 1 + 0.08 * p, // Ken Burns: 1.0 → 1.08 em 15s
    textAlpha: clamp01((t - 1) / 0.6), // headline/subhead entram em ~1s e ficam fixos
    ctaAlpha: clamp01((t - 2) / 0.6), // CTA entra em ~2s e fica fixo
    safeTop: story ? safe : 0,
    safeBottom: story ? safe : 0,
  };
}

export function drawVideoFrame(
  canvas: HTMLCanvasElement,
  spec: CreativeSpec,
  format: CreativeFormat,
  t: number,
  renderScale = 1,
) {
  return renderCreative(canvas, { ...animationSpec(spec, format, t), renderScale });
}

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((e) => {
      ffmpegPromise = null;
      throw e;
    });
  }
  return ffmpegPromise;
}

function pickMime() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
}

/** Grava a animação Ken Burns em .webm usando captureStream + MediaRecorder. */
export function recordWebm(
  spec: CreativeSpec,
  format: CreativeFormat,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const size = formatSize(format);
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    drawVideoFrame(canvas, spec, format, 0);

    const stream = canvas.captureStream(VIDEO_FPS);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 8_000_000 });
    } catch (e) {
      reject(e instanceof Error ? e : new Error("MediaRecorder indisponível"));
      return;
    }
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error("Falha ao gravar o vídeo"));
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: "video/webm" }));
    };

    const start = performance.now();
    recorder.start();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      drawVideoFrame(canvas, spec, format, Math.min(t, VIDEO_DURATION));
      onProgress?.(clamp01(t / VIDEO_DURATION));
      if (t >= VIDEO_DURATION) {
        recorder.stop();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Converte o .webm gravado em .mp4 (H.264) — exigência de Meta/TikTok/Google Ads. */
export async function webmToMp4(webm: Blob, name: string): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const input = `${name}.webm`;
  const output = `${name}.mp4`;
  await ffmpeg.writeFile(input, await fetchFile(webm));
  await ffmpeg.exec([
    "-i",
    input,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(VIDEO_FPS),
    "-movflags",
    "+faststart",
    "-an",
    output,
  ]);
  const data = (await ffmpeg.readFile(output)) as Uint8Array;
  await ffmpeg.deleteFile(input).catch(() => {});
  await ffmpeg.deleteFile(output).catch(() => {});
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return new Blob([buffer], { type: "video/mp4" });
}

export async function renderMp4(
  spec: CreativeSpec,
  format: CreativeFormat,
  name: string,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const webm = await recordWebm(spec, format, onProgress);
  return webmToMp4(webm, name);
}
