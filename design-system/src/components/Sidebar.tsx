import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Blocks, Box, Home, Menu, Palette, Ruler, Type, X } from 'lucide-react';
import { EASE } from '../lib/motion';

export const SECTIONS = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'cores', label: 'Cores', icon: Palette },
  { id: 'tipografia', label: 'Tipografia', icon: Type },
  { id: 'espacamento', label: 'Espaçamento', icon: Ruler },
  { id: 'raio-sombras', label: 'Raio e sombras', icon: Box },
  { id: 'componentes', label: 'Componentes', icon: Blocks },
];

/** Seção visível no momento (scrollspy com Intersection Observer). */
function useActiveSection() {
  const [active, setActive] = useState('inicio');
  useEffect(() => {
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
  }, []);
  return active;
}

function Brand() {
  return (
    <a href="#inicio" className="flex items-center gap-space-1 no-underline">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary shadow-glow-purple" aria-hidden>
        <span className="size-3 rounded-full border-2 border-accent border-l-transparent" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-body font-black text-text-primary">gove</span>
        <span className="text-[12px] text-text-secondary">design system</span>
      </span>
    </a>
  );
}

function NavList({ active, onNavigate }: { active: string; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const on = active === id;
        return (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={onNavigate}
              aria-current={on ? 'true' : undefined}
              className={`group relative flex items-center gap-space-2 rounded-md px-space-2 py-[10px] text-body no-underline transition-colors duration-200 ${
                on ? 'bg-secondary/70 text-text-primary' : 'text-text-secondary hover:bg-secondary/40 hover:text-text-primary'
              }`}
            >
              {on && <motion.span layoutId="nav-active" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent shadow-glow-yellow" transition={{ duration: 0.3, ease: EASE }} />}
              <Icon className={`size-[18px] ${on ? 'text-accent' : ''}`} aria-hidden />
              {label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar() {
  const active = useActiveSection();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col justify-between border-r border-secondary/70 bg-background/85 px-space-2 py-space-3 backdrop-blur-md lg:flex">
        <div className="flex flex-col gap-space-4">
          <div className="px-space-1">
            <Brand />
          </div>
          <nav aria-label="Seções do design system">
            <NavList active={active} />
          </nav>
        </div>
        <p className="px-space-1 text-caption text-text-secondary">
          <span className="block font-display font-bold text-text-primary">Governo Zero Clique</span>
          Tokens v1.0
        </p>
      </aside>

      {/* Mobile: barra superior + gaveta */}
      <header
        className="gutter fixed inset-x-0 top-0 z-30 flex h-[64px] items-center justify-between border-b border-secondary/70 bg-background/85 backdrop-blur-md lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir navegação"
          aria-expanded={open}
          className="flex size-11 items-center justify-center rounded-md border border-secondary text-text-primary"
        >
          <Menu className="size-5" />
        </button>
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.nav
              aria-label="Seções do design system"
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col gap-space-4 border-r border-secondary bg-background px-space-2 py-space-3 lg:hidden"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)', paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))' }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div className="flex items-center justify-between px-space-1">
                <Brand />
                <button type="button" onClick={() => setOpen(false)} aria-label="Fechar navegação" className="flex size-11 items-center justify-center rounded-md text-text-primary">
                  <X className="size-5" />
                </button>
              </div>
              <NavList active={active} onNavigate={() => setOpen(false)} />
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
