import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build em arquivo único (dist/index.html): servido pelo Express em /design-system/
// e publicável como página estática.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { '@': '/src' } },
});
