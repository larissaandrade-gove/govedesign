import { Moon, Sun } from 'lucide-react';
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
      className={`inline-flex items-center justify-center gap-space-1 rounded-md border border-secondary text-caption font-semibold text-text-primary transition-[border-color,box-shadow] duration-200 hover:border-primary hover:shadow-glow-purple ${
        compact ? 'size-11' : 'h-11 w-full px-space-2'
      }`}
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      {!compact && (dark ? 'Tema claro' : 'Tema escuro')}
    </button>
  );
}
