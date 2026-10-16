import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';

/** Aparece só quando o design system roda no servidor do projeto, com login ativo. */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!window.location.pathname.startsWith('/design-system')) return;
    fetch('/auth/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.email && setEmail(d.email))
      .catch(() => {});
  }, []);
  if (!email) return null;
  async function logout() {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    window.location.assign('/login');
  }
  const label = `Sair (${email})`;
  return (
    <button
      type="button"
      onClick={logout}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center gap-space-1 rounded-md text-caption font-semibold text-text-secondary transition-colors hover:bg-secondary/50 hover:text-text-primary ${compact ? 'size-11' : 'h-11 w-full px-space-2'}`}
    >
      <LogOut className="size-4" aria-hidden />
      {!compact && 'Sair'}
    </button>
  );
}
