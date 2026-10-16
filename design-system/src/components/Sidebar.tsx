import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppWindow, Blocks, Box, Home, PanelLeft, Palette, Ruler, Type } from 'lucide-react';
import { EASE } from '../lib/motion';
import { APPS } from '../data/apps';
import { appHref, type View } from '../lib/router';
import { ThemeToggle } from './ThemeToggle';

export const SECTIONS = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'aplicacoes', label: 'Aplicações', icon: AppWindow },
  { id: 'cores', label: 'Cores', icon: Palette },
  { id: 'tipografia', label: 'Tipografia', icon: Type },
  { id: 'espacamento', label: 'Espaçamento', icon: Ruler },
  { id: 'raio-sombras', label: 'Raio e sombras', icon: Box },
  { id: 'componentes', label: 'Componentes', icon: Blocks },
];

/** Abas do celular (padrão de barra de abas): poucas, com ícone e nome curto. */
const TABS = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'aplicacoes', label: 'Apps', icon: AppWindow },
  { id: 'cores', label: 'Tokens', icon: Palette, also: ['tipografia', 'espacamento', 'raio-sombras'] },
  { id: 'componentes', label: 'Componentes', icon: Blocks },
];

const RAIL_KEY = 'gove-rail';

/** Seção visível no momento (scrollspy com Intersection Observer). */
function useActiveSection(view: View) {
  const [active, setActive] = useState('inicio');
  useEffect(() => {
    if (view.kind === 'app') return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [view.kind]);
  return view.kind === 'app' ? `app-${view.appId}` : active;
}

/** Barra lateral recolhida ou aberta; lembrada neste navegador. */
export function useRail(): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(RAIL_KEY) !== 'closed';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    document.documentElement.style.setProperty('--rail', open ? '248px' : '76px');
    try {
      window.localStorage.setItem(RAIL_KEY, open ? 'open' : 'closed');
    } catch {
      /* sem armazenamento */
    }
  }, [open]);
  return [open, () => setOpen((o) => !o)];
}

function Mark() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary shadow-glow-purple" aria-hidden>
      <span className="size-3 rounded-full border-2 border-accent border-l-transparent" />
    </span>
  );
}

/** Item de navegação: ícone sempre; nome visível com a barra aberta, senão dica e rótulo acessível. */
function NavItem({ href, label, icon: Icon, on, open, small = false }: { href: string; label: string; icon: typeof Home; on: boolean; open: boolean; small?: boolean }) {
  return (
    <a
      href={href}
      aria-current={on ? 'page' : undefined}
      aria-label={open ? undefined : label}
      title={open ? undefined : label}
      className={`group relative flex min-h-11 items-center gap-space-2 rounded-md no-underline transition-colors duration-200 ${open ? 'px-space-2' : 'justify-center px-0'} ${
        small ? 'text-caption' : 'text-body'
      } ${on ? 'bg-secondary/70 text-text-primary' : 'text-text-secondary hover:bg-secondary/40 hover:text-text-primary'}`}
    >
      {on && <motion.span layoutId="nav-active" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" transition={{ duration: 0.3, ease: EASE }} />}
      <Icon className={`${small ? 'size-[18px]' : 'size-5'} shrink-0 ${on ? 'text-highlight' : ''}`} aria-hidden />
      {open && <span className="truncate">{label}</span>}
    </a>
  );
}

export function Sidebar({ view }: { view: View }) {
  const active = useActiveSection(view);
  const [open, toggle] = useRail();
  const tabActive = TABS.find((t) => t.id === active || t.also?.includes(active) || (t.id === 'aplicacoes' && active.startsWith('app-')))?.id;

  return (
    <>
      {/* Computador: barra lateral que recolhe para só ícones */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden flex-col gap-space-2 overflow-y-auto border-r border-secondary/70 bg-background/90 px-space-1 py-space-2 backdrop-blur-md transition-[width] duration-300 ease-entry lg:flex"
        style={{ width: 'var(--rail, 248px)' }}
        aria-label="Navegação"
      >
        <div className={`flex items-center gap-space-1 pb-space-2 ${open ? 'justify-between pl-space-1' : 'flex-col'}`}>
          <a href="#inicio" className="flex items-center gap-space-1 no-underline" aria-label="Gove Design System — início">
            <Mark />
            {open && <span className="font-display text-body font-black text-text-primary">gove</span>}
          </a>
          <button
            type="button"
            onClick={toggle}
            aria-label={open ? 'Recolher barra lateral' : 'Expandir barra lateral'}
            title={open ? 'Recolher barra lateral' : 'Expandir barra lateral'}
            aria-expanded={open}
            className="flex size-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-secondary/50 hover:text-text-primary"
          >
            <PanelLeft className="size-5" aria-hidden />
          </button>
        </div>
        <nav aria-label="Seções do design system">
          <ul className="flex flex-col gap-1">
            {SECTIONS.map(({ id, label, icon }) => (
              <li key={id}>
                <NavItem href={`#${id}`} label={label} icon={icon} on={active === id} open={open} />
                {id === 'aplicacoes' && (
                  <ul className={`mt-1 flex flex-col gap-0.5 ${open ? 'ml-[22px] border-l border-secondary pl-space-1' : 'my-1 border-y border-secondary py-1'}`} aria-label="Aplicações">
                    {APPS.map((app) => (
                      <li key={app.id}>
                        <NavItem href={appHref(app.id)} label={app.name} icon={app.icon} on={active === `app-${app.id}`} open={open} small />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <ThemeToggle compact={!open} />
        </div>
      </aside>

      {/* Celular: barra superior enxuta + barra de abas */}
      <header
        className="gutter fixed inset-x-0 top-0 z-30 flex h-[56px] items-center justify-between border-b border-secondary/70 bg-background/90 backdrop-blur-md lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <a href="#inicio" className="flex items-center gap-space-1 no-underline" aria-label="Gove Design System — início">
          <Mark />
          <span className="font-display text-body font-black text-text-primary">gove</span>
        </a>
        <ThemeToggle compact />
      </header>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-secondary/70 bg-background/95 px-space-1 pt-1 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const on = tabActive === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={on ? 'page' : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium no-underline transition-colors ${on ? 'text-highlight' : 'text-text-secondary'}`}
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
