// Build do Revisor de identidade visual como um único HTML autocontido, para
// rodar 100% no navegador dentro do artefato do Design System (iframe srcdoc).
// Reaproveita os módulos do backend; as dependências de Node são trocadas por
// equivalentes de navegador via aliases (ver shims/).
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const shim = (f) => here(`./shims/${f}`);

export default defineConfig({
  root: here('.'),
  base: './',
  logLevel: 'warn',
  resolve: {
    alias: [
      { find: /^fabric\/node$/, replacement: 'fabric' },
      { find: /^sharp$/, replacement: shim('sharp.js') },
      { find: /^archiver$/, replacement: shim('archiver.js') },
      { find: /^lucide$/, replacement: shim('lucide.js') },
      { find: /^@phosphor-icons\/core$/, replacement: shim('phosphor.js') },
      { find: /^qrcode$/, replacement: shim('qrcode.js') },
      { find: /^(?:\.\.\/)+db\/database\.js$/, replacement: shim('database.js') },
      { find: /^(?:node:)?fs$/, replacement: shim('vfs.js') },
      { find: /^(?:node:)?path$/, replacement: shim('path.js') },
      { find: /^(?:node:)?crypto$/, replacement: shim('crypto.js') },
      { find: /^(?:node:)?module$/, replacement: shim('module.js') },
      { find: /^(?:node:)?stream$/, replacement: shim('stream.js') },
      { find: /^(?:node:)?url$/, replacement: shim('url.js') },
    ],
  },
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: here('./dist'),
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 8000,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
  },
});
