/**
 * Build do artefato (Design System no claude.ai): um único HTML autocontido,
 * sem SSR e sem servidor. Não altera o build do Lovable (vite.config.ts da raiz).
 *
 *   npm run build:artifact   (ou: bun run build:artifact)
 *
 * Saída: design-system/src/embedded/criativos.html
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { artifactTransforms } from "./transforms";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "..");
const outDir = path.resolve(repoRoot, "design-system/src/embedded");
const outName = "criativos.html";

/** Embute JS e CSS gerados dentro do HTML (o artefato não serve arquivos soltos). */
function inlineEverything(): Plugin {
  return {
    name: "criativos-inline-single-file",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        let doc = html;
        for (const [name, file] of Object.entries(bundle)) {
          if (file.type === "chunk" && file.isEntry) {
            const code = file.code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
            doc = doc.replace(
              new RegExp(`<script[^>]*src="[^"]*${escapeRe(file.fileName)}"[^>]*></script>`),
              () => `<script type="module">${code}</script>`,
            );
            delete bundle[name];
          } else if (file.type === "asset" && file.fileName.endsWith(".css")) {
            const css = String(file.source).replace(/<\/style/gi, "<\\/style");
            doc = doc.replace(
              new RegExp(`<link[^>]*href="[^"]*${escapeRe(file.fileName)}"[^>]*>`),
              () => `<style>${css}</style>`,
            );
            delete bundle[name];
          }
        }
        return doc;
      },
    },
    generateBundle(_opts, bundle) {
      const files = Object.values(bundle);
      const html = files.find((f) => f.fileName.endsWith(".html"));
      const leftovers = files.filter((f) => f !== html);
      if (leftovers.length) this.error(`Arquivos não embutidos: ${leftovers.map((f) => f.fileName).join(", ")}`);
      if (html) html.fileName = outName;
    },
  };
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default defineConfig({
  root: here,
  base: "./",
  publicDir: false,
  plugins: [artifactTransforms(appRoot), react(), tailwindcss(), inlineEverything()],
  resolve: {
    alias: [
      { find: /^@tanstack\/react-start$/, replacement: path.resolve(here, "shims/react-start.ts") },
      { find: /^@\/lib\/gate\.functions$/, replacement: path.resolve(here, "shims/gate.ts") },
      { find: /^@\/lib\/pexels\.functions$/, replacement: path.resolve(here, "shims/pexels.ts") },
      { find: /^@artifact\/bridge$/, replacement: path.resolve(here, "bridge.ts") },
      { find: /^@gove\/runtime$/, replacement: path.resolve(repoRoot, "artifact-runtime/index.ts") },
      { find: /^@\//, replacement: path.resolve(appRoot, "src") + "/" },
    ],
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir,
    emptyOutDir: false,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: path.resolve(here, "index.html"),
      output: { codeSplitting: false },
    },
  },
});
