import { findClaude } from './claude';
/**
 * Entrega um arquivo ao visitante. Dentro do artefato do claude.ai usa a
 * capacidade de downloads (o visitante confirma); fora dele, download comum.
 * Dentro do artefato nunca usa `<a download>`: o iframe do claude.ai descarta
 * esse clique em silêncio. Devolve `true` só quando o arquivo foi entregue.
 */
export async function downloadText(filename: string, text: string, type = 'text/markdown;charset=utf-8'): Promise<boolean> {
  const c = findClaude();
  if (c) {
    try {
      const downloads = await c.use('downloads');
      if (!downloads) return false; // capacidade indisponível nesta visualização
      await downloads.save({ filename, data: text });
      return true;
    } catch {
      return false; // recusado pelo visitante ou indisponível
    }
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
