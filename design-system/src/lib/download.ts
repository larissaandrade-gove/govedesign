import { findClaude } from './claude';
/**
 * Entrega um arquivo ao visitante. Dentro do artefato do claude.ai usa a
 * capacidade de downloads (o visitante confirma); fora dele, download comum.
 */
export async function downloadText(filename: string, text: string, type = 'text/markdown;charset=utf-8'): Promise<boolean> {
  try {
    const c = findClaude();
    const downloads = c ? await c.use('downloads') : null;
    if (downloads) {
      await downloads.save({ filename, data: text });
      return true;
    }
  } catch {
    return false; // recusado pelo visitante ou indisponível
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}

export const aiBlockOf = (md: string) => /```text\n([\s\S]*?)```/.exec(md)?.[1].trim() ?? md;
