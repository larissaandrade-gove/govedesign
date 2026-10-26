// Build do servidor: um único HTML (bundle.html) servido pelo Express em /print-studio/,
// com o cliente HTTP da API (`@/lib/api`) e as fontes em /print-studio/fonts/.
//   pnpm run bundle  →  print-studio/web/bundle.html
import { copyFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const OUT_DIR = path.resolve(import.meta.dirname, 'dist/server');

function copyBundle(): Plugin {
  return {
    name: 'gove-server-bundle',
    apply: 'build',
    closeBundle() {
      copyFileSync(path.join(OUT_DIR, 'index.html'), path.resolve(import.meta.dirname, 'bundle.html'));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true }), copyBundle()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  build: { outDir: OUT_DIR, emptyOutDir: true, target: 'es2022', reportCompressedSize: false, chunkSizeWarningLimit: 4000 },
});
