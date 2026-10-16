/**
 * Ajustes aplicados ao código de `src/` SOMENTE no build do artefato (o build
 * do Lovable não passa por aqui). Cada troca é verificada: se o trecho de
 * origem mudar, o build falha e aponta qual ajuste precisa ser revisto.
 */
import type { Plugin } from "vite";

type Patch = { find: string | RegExp; replace: string; label: string };
type FilePatch = { file: string; imports?: string; patches: Patch[] };

const BRIDGE = `import { saveDownload as __saveDownload, downloadCanvasesZip as __downloadCanvasesZip, copyText as __copyText, videoLabel as __videoLabel, pickVideoMime as __pickVideoMime } from "@artifact/bridge";\n`;

/** `const url = createObjectURL(blob) … a.click(); revokeObjectURL(url);` → saveFile(). */
const anchorDownload = (onFail = "return;"): Patch => ({
  label: "download por <a download>",
  find: /const url = URL\.createObjectURL\(blob\);\s*const a = document\.createElement\("a"\);\s*a\.href = url;\s*a\.download = ([^;]+);\s*a\.click\(\);\s*URL\.revokeObjectURL\(url\);/g,
  replace: `if ((await __saveDownload(blob, $1)) !== "saved") { ${onFail} }`,
});

const asyncToBlob: Patch = {
  label: "toBlob assíncrono",
  find: /canvas\.toBlob\(\(blob\) => \{/g,
  replace: "canvas.toBlob(async (blob) => {",
};

const clipboard: Patch = {
  label: "clipboard com fallback",
  find: /await navigator\.clipboard\.writeText\(([^;]+)\);/g,
  replace: "if (!(await __copyText($1))) return;",
};

const PEXELS_NOTE = (cls: string) =>
  `<p className="${cls} text-xs text-muted-foreground">Busca online (Pexels) indisponível nesta versão, que roda sem serviços externos. Envie imagens do dispositivo — elas ficam só neste navegador.</p>`;

/** Campo de busca Pexels (ícone de lupa + Input) nas duas telas. */
const PEXELS_FIELD = /<div className="relative">\s*<Search[\s\S]*?aria-label="Buscar imagens no Pexels"\s*\/>\s*<\/div>/;

const FILES: FilePatch[] = [
  {
    file: "src/routes/index.tsx",
    imports: BRIDGE,
    patches: [
      {
        label: "botão Sair (sem login no artefato)",
        find: /<Button\s+variant="ghost"\s+size="icon"\s+className="size-11 shrink-0"\s+onClick=\{handleSignOut\}[\s\S]*?<\/Button>/,
        replace: "null",
      },
      {
        label: "busca Pexels → aviso de upload",
        find: PEXELS_FIELD,
        replace: PEXELS_NOTE(""),
      },
      {
        label: "baixar todos → .zip",
        find: /const downloadAll = async \(\) => \{[\s\S]*?toast\.success\(`\$\{canvases\.length\} criativos baixados\.`\);\s*\};/,
        replace: "const downloadAll = () => __downloadCanvasesZip(gridRef.current);",
      },
      {
        label: "dica do botão baixar todos",
        find: "criativos em PNG",
        replace: "criativos (.zip de PNGs)",
      },
      {
        label: "rótulo do formato de vídeo",
        find: `hint: "MP4 15s, 3 formatos"`,
        replace: `hint: __videoLabel() + " 15s, 3 formatos"`,
      },
    ],
  },
  {
    file: "src/routes/studio.tsx",
    imports: BRIDGE,
    patches: [
      {
        label: "busca Pexels → aviso de upload",
        find: PEXELS_FIELD,
        replace: PEXELS_NOTE(""),
      },
      asyncToBlob,
      anchorDownload(),
      clipboard,
    ],
  },
  {
    file: "src/routes/follow-ups.tsx",
    imports: BRIDGE,
    patches: [asyncToBlob, anchorDownload()],
  },
  {
    file: "src/components/CreativeCard.tsx",
    imports: BRIDGE,
    patches: [asyncToBlob, anchorDownload(), clipboard],
  },
  {
    file: "src/components/VideoCard.tsx",
    imports: BRIDGE,
    patches: [
      anchorDownload("toast.dismiss(id); return;"),
      {
        label: "toast de sucesso do vídeo",
        find: "exportado em MP4`",
        replace: 'exportado em ${blob.type.includes("mp4") ? "MP4" : "WebM"}`',
      },
      { label: "erro do vídeo", find: `"Não foi possível gerar o MP4."`, replace: `"Não foi possível gerar o vídeo."` },
      { label: "botão do vídeo", find: "MP4 {FORMAT_LABEL[preview]}", replace: "{__videoLabel()} {FORMAT_LABEL[preview]}" },
      { label: "dica 3 formatos", find: `title="Gera os 3 formatos em MP4"`, replace: "title={`Gera os 3 formatos em ${__videoLabel()}`}" },
    ],
  },
  {
    file: "src/lib/creative/video.ts",
    imports: BRIDGE,
    patches: [
      { label: "import ffmpeg", find: /import \{ FFmpeg \} from "@ffmpeg\/ffmpeg";\n/, replace: "" },
      { label: "import ffmpeg util", find: /import \{ fetchFile, toBlobURL \} from "@ffmpeg\/util";\n/, replace: "" },
      { label: "carregador do ffmpeg (CDN)", find: /let ffmpegPromise[\s\S]*?(?=function pickMime)/, replace: "" },
      {
        label: "escolha do formato de gravação",
        find: /function pickMime\(\) \{[\s\S]*?\n\}\n/,
        replace: "function pickMime() {\n  return __pickVideoMime();\n}\n",
      },
      {
        label: "tipo do blob gravado",
        find: `resolve(new Blob(chunks, { type: "video/webm" }));`,
        replace: `resolve(new Blob(chunks, { type: (recorder.mimeType || "video/webm").split(";")[0] }));`,
      },
      {
        label: "conversão MP4 via ffmpeg → saída nativa",
        find: /export async function webmToMp4[\s\S]*?\n\}\n/,
        replace:
          "export async function webmToMp4(video: Blob, _name: string): Promise<Blob> {\n  // Sem ffmpeg no artefato: entrega o que o navegador gravou (MP4 nativo ou WebM).\n  return video;\n}\n",
      },
    ],
  },
];

export function artifactTransforms(root: string): Plugin {
  const norm = (p: string) => p.replace(/\\/g, "/");
  const byPath = new Map(FILES.map((f) => [norm(`${root}/${f.file}`), f]));
  return {
    name: "criativos-artifact-transforms",
    enforce: "pre",
    transform(code, id) {
      const fp = byPath.get(norm(id.split("?")[0]!));
      if (!fp) return null;
      let out = code;
      for (const p of fp.patches) {
        const hit = typeof p.find === "string" ? out.includes(p.find) : new RegExp(p.find.source, p.find.flags.replace("g", "")).test(out);
        if (!hit) this.error(`[artefato] ${fp.file}: trecho não encontrado para "${p.label}". Revise artifact/transforms.ts.`);
        out = typeof p.find === "string" ? out.split(p.find).join(p.replace) : out.replace(p.find, p.replace);
      }
      return { code: (fp.imports ?? "") + out, map: null };
    },
  };
}
