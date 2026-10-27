import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Apps embutidos: cada um é um HTML autocontido em src/embedded/<id>.html,
// copiado para dist/apps/ e aberto num iframe pela página do app.
const EMBED_DIR = resolve(__dirname, 'src/embedded');
const embedded = readdirSync(EMBED_DIR)
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.slice(0, -5));

function copyEmbedded(): Plugin {
  return {
    name: 'gove-copy-embedded',
    apply: 'build',
    closeBundle() {
      const out = resolve(__dirname, 'dist/apps');
      mkdirSync(out, { recursive: true });
      for (const id of embedded) {
        copyFileSync(resolve(EMBED_DIR, `${id}.html`), resolve(out, `${id}.html`));
        // Arquivos de apoio do app em src/embedded/<id>/, quando houver
        if (existsSync(resolve(EMBED_DIR, id))) cpSync(resolve(EMBED_DIR, id), resolve(out, id), { recursive: true });
      }
    },
  };
}

// Build em arquivo único (dist/index.html) + dist/apps/*.html: servido pelo
// Express em /design-system/ e publicável como artefato com arquivos de apoio.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile(), copyEmbedded()],
  resolve: { alias: { '@': '/src' } },
  define: { __GOVE_EMBEDDED__: JSON.stringify(embedded) },
  server: { fs: { allow: ['..'] } },
});
