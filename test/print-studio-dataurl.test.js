// Kit de Boas-Vindas no artefato: o logo oficial (URL data:) é decodificado sem fetch(),
// porque a CSP do claude.ai bloqueia fetch de data: com "Failed to fetch".
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../print-studio/web/src/lib/pdf.browser.ts', import.meta.url), 'utf8');
// Extrai só o helper (o resto do arquivo depende do Vite e do navegador).
const fn = src.slice(src.indexOf('export function dataUrlToBlob'), src.indexOf('async function brandLogoBlob'));
const dataUrlToBlob = new Function(`${fn.replace('export function', 'function').replace(/: string|: Blob/g, '')}; return dataUrlToBlob;`)();

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('dataUrlToBlob devolve os bytes e o tipo do PNG embutido', async () => {
  const blob = dataUrlToBlob(`data:image/png;base64,${PNG}`);
  assert.equal(blob.type, 'image/png');
  assert.deepEqual(Buffer.from(await blob.arrayBuffer()), Buffer.from(PNG, 'base64'));
});

test('dataUrlToBlob aceita WebP e texto sem base64', async () => {
  assert.equal(dataUrlToBlob('data:image/webp;base64,UklGRg==').type, 'image/webp');
  assert.equal(await dataUrlToBlob('data:text/plain,ol%C3%A1').text(), 'olá');
});

test('o logo embutido não passa por fetch()', () => {
  const body = src.slice(src.indexOf('async function brandLogoBlob'), src.indexOf('const stencils'));
  assert.match(body, /startsWith\('data:'\)\) return dataUrlToBlob/);
  assert.ok(!/fetch\(brandLogoUrl/.test(src));
});
