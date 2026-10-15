// Build de artefato: um único HTML autocontido, sem backend, para rodar dentro
// do artefato do Gove Design System (iframe srcdoc). Troca o cliente HTTP
// (`@/lib/api`) e a origem das fontes (`@/lib/fonts`) por versões locais.
//   pnpm run bundle:artifact  →  design-system/src/embedded/print-studio.html
import { copyFileSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const OUT_DIR = path.resolve(import.meta.dirname, 'dist/artifact');
const TARGET = path.resolve(import.meta.dirname, '../../design-system/src/embedded/print-studio.html');

/**
 * O fontkit (usado pelo pdfkit) traz as tabelas de shaping das escritas
 * indianas e do Universal Shaping Engine. As peças só usam Montserrat latina,
 * então essas tabelas viram máquinas de estado mínimas (válidas e sem uso):
 * o HTML fica menor e sem ~50 KB de dados mortos.
 */
function trimFontkitShapers(): Plugin {
  const MIN_MACHINE = '{"stateTable":[[0]],"accepting":[false],"tags":[[]]}';
  const MIN_USE = '{"categories":[],"decompositions":{},"stateTable":[[0]],"accepting":[false],"tags":[[]]}';
  return {
    name: 'gove-trim-fontkit-shapers',
    enforce: 'pre',
    transform(code, id) {
      if (!/fontkit[\\/]dist[\\/]/.test(id) || !code.includes('Ra_To_Become_Reph')) return null;
      let n = 0;
      const out = code.replace(/(\$[0-9a-f]+\$exports = )JSON\.parse\("(\{\\"(stateTable|categories\\":\[\\"O\\",\\"IND)[\s\S]*?)"\);/g, (_m, lhs, _body, kind) => {
        n += 1;
        return `${lhs}${kind === 'stateTable' ? MIN_MACHINE : MIN_USE};`;
      });
      if (n !== 2) this.error(`fontkit: esperava 2 tabelas de shaping, encontrei ${n}`);
      return { code: out, map: null };
    },
  };
}

/** Copia o HTML final para o Design System. */
function publishToDesignSystem(): Plugin {
  return {
    name: 'gove-publish-artifact',
    apply: 'build',
    closeBundle() {
      const built = path.join(OUT_DIR, 'artifact.html');
      const out = path.join(OUT_DIR, 'print-studio.html');
      renameSync(built, out);
      mkdirSync(path.dirname(TARGET), { recursive: true });
      copyFileSync(out, TARGET);
    },
  };
}

export default defineConfig({
  plugins: [trimFontkitShapers(), react(), viteSingleFile({ removeViteModuleLoader: true }), publishToDesignSystem()],
  resolve: {
    alias: [
      { find: /^@\/lib\/api$/, replacement: path.resolve(import.meta.dirname, './src/lib/api.local.ts') },
      { find: /^@\/lib\/fonts$/, replacement: path.resolve(import.meta.dirname, './src/lib/fonts.embedded.ts') },
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
    ],
  },
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    target: 'es2022',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: path.resolve(import.meta.dirname, 'artifact.html') },
  },
});
