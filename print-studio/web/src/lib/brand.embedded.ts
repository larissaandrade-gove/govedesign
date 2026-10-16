// Logomarca oficial da Gove embutida no build de artefato (sem servidor).
import logoBranco from '../../../../brand/logos/gove-logo-branco.webp?inline';
import logoCor from '../../../../brand/logos/gove-logo-cor.webp?inline';
import logoRoxo from '../../../../brand/logos/gove-logo-roxo.webp?inline';
import simboloBranco from '../../../../brand/logos/gove-simbolo-branco.png?inline';
import simboloCor from '../../../../brand/logos/gove-simbolo-cor.png?inline';
import simboloRoxo from '../../../../brand/logos/gove-simbolo-roxo.png?inline';

const FILES: Record<string, string> = {
  'gove-logo-branco.webp': logoBranco,
  'gove-logo-cor.webp': logoCor,
  'gove-logo-roxo.webp': logoRoxo,
  'gove-simbolo-branco.png': simboloBranco,
  'gove-simbolo-cor.png': simboloCor,
  'gove-simbolo-roxo.png': simboloRoxo,
};

/** URL (data:) de um arquivo da logomarca oficial. */
export const brandLogoUrl = (file: string) => FILES[file] ?? '';
