// Copia o HTML único gerado pelo Vite para o Design System.
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'dist', 'index.html');
const DEST = join(HERE, '..', '..', '..', 'design-system', 'src', 'embedded', 'revisor.html');
mkdirSync(dirname(DEST), { recursive: true });
copyFileSync(SRC, DEST);
console.log(`revisor.html → ${relative(process.cwd(), DEST)} (${(statSync(DEST).size / 1024 / 1024).toFixed(2)} MB)`);
