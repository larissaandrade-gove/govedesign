/**
 * Build do LP Builder como UM arquivo HTML autocontido, para rodar dentro do
 * artefato do Design System (iframe srcdoc, sem backend).
 *
 *   npm run build:artifact   →   design-system/src/embedded/lp.html
 *
 * Não altera o build Lovable: reaproveita src/ e troca, só aqui, alguns
 * módulos (armazenamento, login, raiz) e alguns trechos de texto/ações.
 */
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { goveLogos } from "./brand-logos";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "..");
const src = path.join(app, "src");
const outDir = path.resolve(app, "../design-system/src/embedded");

/** Módulos do app trocados por versões do artefato. */
const swaps: Record<string, string> = {
  [path.join(src, "lib/gove/storage.ts")]: path.join(here, "storage.ts"),
  [path.join(src, "lib/gove/auth.tsx")]: path.join(here, "auth.tsx"),
  [path.join(src, "routes/__root.tsx")]: path.join(here, "root.tsx"),
  [path.join(src, "components/gove/AppBrand.tsx")]: path.join(here, "AppBrand.tsx"),
  // Banco de imagens: rota /api/pexels do servidor do Design System (a chave fica lá).
  [path.join(src, "lib/gove/pexelsClient.ts")]: path.join(here, "pexelsClient.ts"),
};

/** Ajustes pontuais no código do app (falham o build se o trecho mudar). */
type Patch = [find: string | RegExp, replace: string];
const patches: Record<string, Patch[]> = {
  "routes/index.tsx": [
    [
      'import { createPage, deletePage, listPages, type StoredPage } from "@/lib/gove/storage";',
      'import { createPage, deletePage, listPages, subscribePages, type StoredPage } from "@/lib/gove/storage";',
    ],
    [
      /useEffect\(\(\) => \{\s*setPages\(listPages\(\)\);\s*\}, \[\]\);/,
      "useEffect(() => {\n    setPages(listPages());\n    return subscribePages(() => setPages(listPages()));\n  }, []);",
    ],
    // Sem login no artefato: some o botão "Sair" (ícone).
    [/<Button[^>]*onClick=\{signOut\}[\s\S]*?<\/Button>/, ""],
    ["Landing page excluída deste navegador.", "Landing page excluída."],
    ["Carregando projetos locais…", "Carregando projetos…"],
  ],
  "routes/editor.$id.tsx": [
    ["Landing page não encontrada neste navegador.", "Landing page não encontrada."],
    ["Landing page salva neste navegador.", "Landing page salva."],
    ["`Salvo localmente às ${", "`Salvo às ${"],
  ],
  "components/gove/ExportDialog.tsx": [
    [/^/, 'import { copyText, downloadCode } from "@artifact/exportActions";\n'],
    [
      "await navigator.clipboard.writeText(code);",
      'if (!(await copyText(code))) throw new Error("copy");',
    ],
    [/function download\(\) \{[\s\S]*?\n  \}\n/, "function download() {\n    void downloadCode(nome, code);\n  }\n"],
    ["Baixar como .txt", "Baixar .html"],
  ],
};

function artifactSwaps(): Plugin {
  return {
    name: "lp-artifact-swaps",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || source.startsWith("\0")) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      const target = swaps[resolved.id.split("?")[0]!];
      return target ?? null;
    },
    transform(code, id) {
      const file = id.split("?")[0]!;
      if (!file.startsWith(src + path.sep)) return null;
      const rel = path.relative(src, file).split(path.sep).join("/");
      const list = patches[rel];
      if (!list) return null;
      let out = code;
      for (const [find, replace] of list) {
        const hit = typeof find === "string" ? out.includes(find) : find.test(out);
        if (!hit) this.error(`[lp-artifact] trecho não encontrado em ${rel}: ${String(find)}`);
        out = out.replace(find, replace);
      }
      return { code: out, map: null };
    },
  };
}

export default defineConfig({
  root: here,
  base: "./",
  publicDir: false,
  // Nunca lê lp-builder/.env: nenhuma variável VITE_* entra no bundle.
  envDir: path.join(here, "no-env"),
  envPrefix: "LP_ARTIFACT_PUBLIC_",
  define: {
    "import.meta.env.VITE_LP_EMAIL": '""',
    "import.meta.env.VITE_LP_PASSWORD": '""',
  },
  resolve: {
    alias: {
      "@gove/runtime": path.resolve(app, "../artifact-runtime/index.ts"),
      "@artifact": here,
      "@": src,
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  plugins: [goveLogos(path.resolve(app, "..")), artifactSwaps(), react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir,
    emptyOutDir: false,
    target: "es2022",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: { input: path.join(here, "lp.html") },
  },
});
