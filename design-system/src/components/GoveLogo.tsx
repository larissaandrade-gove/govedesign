import { pickLogo } from '../../../brand/logos.js';
import { themes } from '../data/tokens.js';
import { useTheme } from '../lib/theme';
import simboloCor from '../../../brand/logos/gove-simbolo-cor.png';
import simboloRoxo from '../../../brand/logos/gove-simbolo-roxo.png';
import simboloBranco from '../../../brand/logos/gove-simbolo-branco.png';
import logoCor from '../../../brand/logos/gove-logo-cor.webp';
import logoRoxo from '../../../brand/logos/gove-logo-roxo.webp';
import logoBranco from '../../../brand/logos/gove-logo-branco.webp';
import logoBrancoAmarelo from '../../../brand/logos/gove-logo-branco-amarelo.webp';

const FILES: Record<string, string> = {
  'gove-simbolo-cor.png': simboloCor,
  'gove-simbolo-roxo.png': simboloRoxo,
  'gove-simbolo-branco.png': simboloBranco,
  'gove-logo-cor.webp': logoCor,
  'gove-logo-roxo.webp': logoRoxo,
  'gove-logo-branco.webp': logoBranco,
  'gove-logo-branco-amarelo.webp': logoBrancoAmarelo,
};

export const logoSrc = (file: string) => FILES[file];

/**
 * Logomarca oficial: símbolo para espaços 1:1, logotipo para faixas horizontais.
 * A versão sai da regra de contraste (todas as cores ≥ 4,5:1 com o fundo);
 * sem `background`, usa o fundo do tema atual.
 */
export function GoveLogo({ kind = 'logotipo', height, background, className = '' }: { kind?: 'simbolo' | 'logotipo'; height: number; background?: string; className?: string }) {
  const [theme] = useTheme();
  const bg = background ?? themes[theme].background;
  const pick = pickLogo(bg, kind);
  return (
    <img
      src={FILES[pick.file]}
      alt="Gove"
      height={height}
      width={Math.round(height * pick.aspect)}
      className={`block shrink-0 ${className}`}
      style={{ height, width: 'auto' }}
    />
  );
}
