// Gerador de cases: app React em arquivo único, embutido no Design System.
//   npm run build  →  dist/index.html  →  design-system/src/embedded/cases.html
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const here = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.resolve(here, '../design-system/src/embedded/cases.html');

/** Copia o HTML final para o Design System (aberto em apps/cases.html). */
function publishToDesignSystem(): Plugin {
  return {
    name: 'gove-cases-publish',
    apply: 'build',
    closeBundle() {
      mkdirSync(path.dirname(TARGET), { recursive: true });
      copyFileSync(path.join(here, 'dist/index.html'), TARGET);
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  // Nenhuma variável de ambiente entra no bundle.
  envDir: path.join(here, 'no-env'),
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true }), publishToDesignSystem()],
  resolve: {
    alias: {
      '@gove/runtime': path.resolve(here, '../artifact-runtime/index.ts'),
      '@': path.resolve(here, 'src'),
    },
  },
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4000,
  },
});
