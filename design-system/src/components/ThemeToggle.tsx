import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../lib/theme';

/** Alterna entre o tema claro (padrão) e o escuro. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-pressed={dark}
      aria-label={dark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      className={`inline-flex items-center justify-center gap-space-1 text-caption font-semibold text-text-primary transition-[border-color,box-shadow,background-color] duration-200 ${
        compact ? 'size-12 rounded-full hover:bg-secondary/50' : 'h-11 w-full rounded-md border border-secondary px-space-2 hover:border-primary hover:shadow-glow-purple'
      }`}
    >
      {dark ? <Sun className={compact ? 'size-6' : 'size-4'} aria-hidden /> : <Moon className={compact ? 'size-6' : 'size-4'} aria-hidden />}
      {!compact && (dark ? 'Tema claro' : 'Tema escuro')}
    </button>
  );
}
