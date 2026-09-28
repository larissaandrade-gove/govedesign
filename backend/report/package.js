// Empacota relatório + preview anotado em ZIP (archiver).
import { PassThrough } from 'node:stream';
import { ZipArchive } from 'archiver';

/**
 * Monta as entradas do pacote de uma auditoria.
 * @returns [{ name, data }]
 */
export function auditEntries({ report, html, preview, original }) {
  const entries = [
    { name: 'relatorio.json', data: JSON.stringify(report, null, 2) },
    { name: 'relatorio.html', data: html },
  ];
  if (preview) entries.push({ name: 'preview-anotado.png', data: preview });
  if (original) entries.push({ name: `original/${original.name}`, data: original.data });
  return entries;
}

/** Escreve o ZIP num stream (ex.: resposta HTTP). Resolve quando terminar. */
export function writeZip(entries, output) {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code !== 'ENOENT') reject(err);
    });
    output.on('close', resolve);
    output.on('finish', resolve);
    archive.pipe(output);
    for (const e of entries) archive.append(e.data, { name: e.name });
    archive.finalize().catch(reject);
  });
}

/** Gera o ZIP em memória. */
export async function zipToBuffer(entries) {
  const out = new PassThrough();
  const chunks = [];
  out.on('data', (c) => chunks.push(c));
  await writeZip(entries, out);
  return Buffer.concat(chunks);
}
