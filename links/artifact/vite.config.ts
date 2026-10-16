/**
 * Build "artefato" do Gove Links: um único HTML autocontido, sem backend,
 * para rodar dentro do artefato do Design System (iframe `srcdoc`).
 *
 * Não interfere no build Lovable (links/vite.config.ts). Os módulos de dados
 * baseados em Supabase são trocados por implementações sobre as coleções do
 * artifact-runtime (`collection('links', ...)`) via alias.
 *
 *   bun run build:artifact   (ou: npx vite build --config artifact/vite.config.ts)
 *
 * Saída: design-system/src/embedded/links.html
 * Domínio curto exibido: GOVE_LINKS_SHORT_DOMAIN (padrão go.gove.digital).
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { goveLogos } from "./brand-logos";

const here = path.dirname(fileURLToPath(import.meta.url));
const linksRoot = path.resolve(here, "..");
const repoRoot = path.resolve(linksRoot, "..");
const src = path.resolve(linksRoot, "src");
const outDir = path.resolve(repoRoot, "design-system/src/embedded");

const shortDomain = (process.env["GOVE_LINKS_SHORT_DOMAIN"] ?? "go.gove.digital").trim();

export default defineConfig({
  root: here,
  base: "./",
  // Nunca carrega links/.env (credenciais locais): envDir aponta para esta pasta,
  // e o prefixo abaixo não corresponde a nenhuma variável usada no app.
  envDir: here,
  envPrefix: "GOVE_ARTIFACT_PUBLIC_",
  publicDir: false,
  define: {
    __GOVE_SHORT_DOMAIN__: JSON.stringify(shortDomain),
  },
  plugins: [goveLogos(repoRoot), react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: [
      { find: /^@\/lib\/short-links$/, replacement: path.resolve(here, "lib/short-links.ts") },
      { find: /^@\/lib\/links-queries$/, replacement: path.resolve(here, "lib/links-queries.ts") },
      { find: /^@\/lib\/short-domain$/, replacement: path.resolve(here, "lib/short-domain.ts") },
      {
        find: /^@\/integrations\/supabase\/client$/,
        replacement: path.resolve(here, "lib/supabase-stub.ts"),
      },
      { find: /^@gove\/runtime$/, replacement: path.resolve(repoRoot, "artifact-runtime/index.ts") },
      { find: /^@artifact\//, replacement: here + "/" },
      { find: /^@\//, replacement: src + "/" },
    ],
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  build: {
    outDir,
    emptyOutDir: false,
    target: "es2020",
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: path.resolve(here, "links.html") },
  },
});
