import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AppWindow, ArrowLeft, BookOpenText, House, List, MagnifyingGlass, Palette, Plus, SealCheck, SquaresFour, TextAa, Ticket, type Icon as IconType,
} from '@phosphor-icons/react';
import { groupOf, openNewRequest, openSearch } from '../lib/useMobile';
import { EASE } from '../lib/motion';
import { APPS } from '../data/apps';
import { appHref, type View } from '../lib/router';
import { ThemeToggle } from './ThemeToggle';
import { GoveLogo } from './GoveLogo';
import { LogoutButton } from './LogoutButton';
import { SoonBadge } from './SoonBadge';
import { isOpen, useStatuses } from '../lib/appStatus';

/**
 * Navegação no padrão Material Design 3:
 * - computador: navigation drawer (aberta) que recolhe para navigation rail, com o FAB "Nova solicitação";
 * - celular: top app bar (título, voltar e busca), navigation bar com 4 destinos e FAB no Início.
 * Item ativo: indicador em pílula (secondary) e ícone no peso fill — o regular é o padrão.
 */
export const SECTIONS: { id: string; label: string; icon: IconType }[] = [
  { id: 'inicio', label: 'Início', icon: House },
  { id: 'aplicacoes', label: 'Aplicações', icon: AppWindow },
  { id: 'solicitacoes', label: 'Solicitações', icon: Ticket },
  { id: 'cores', label: 'Cores', icon: Palette },
  { id: 'logomarca', label: 'Logomarca', icon: SealCheck },
  { id: 'tipografia', label: 'Tipografia', icon: TextAa },
  { id: 'componentes', label: 'Componentes', icon: SquaresFour },
  { id: 'diretrizes', label: 'Diretrizes', icon: BookOpenText },
];
const PRIMARY = SECTIONS.slice(0, 3);
const BRAND = SECTIONS.slice(3);

/** Destinos da navigation rail (computador recolhido) e da navigation bar (celular, sem Solicitações). */
const DESTINATIONS = [
  { id: 'inicio', label: 'Início', icon: House, href: '#inicio' },
  { id: 'aplicacoes', label: 'Apps', icon: AppWindow, href: '#aplicacoes' },
  { id: 'solicitacoes', label: 'Pedidos', icon: Ticket, href: '#solicitacoes', railOnly: true },
  { id: 'cores', label: 'Cores', icon: Palette, href: '#cores' },
  { id: 'guias', label: 'Guias', icon: BookOpenText, href: '#tipografia' },
];

/** Título da top app bar em cada destino do celular. */
const TITLES: Record<string, string> = { aplicacoes: 'Aplicações', cores: 'Cores', guias: 'Guias' };

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
    // No fim da página a última seção (curta) não chega à faixa do observer
    const onScroll = () => {
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) setActive(SECTIONS[SECTIONS.length - 1].id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [view.kind]);
  return view.kind === 'app' ? `app-${view.appId}` : active;
}

/** Destino da rail para a seção ativa (no computador, Solicitações tem destino próprio). */
const railGroup = (active: string) => (active.startsWith('app-') ? 'aplicacoes' : active === 'solicitacoes' ? 'solicitacoes' : groupOf(active));

/** Drawer aberta ou rail; lembrada neste navegador. */
export function useRail(): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(RAIL_KEY) !== 'closed';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    document.documentElement.style.setProperty('--rail', open ? '264px' : '88px');
    try {
      window.localStorage.setItem(RAIL_KEY, open ? 'open' : 'closed');
    } catch {
      /* sem armazenamento */
    }
  }, [open]);
  return [open, () => setOpen((o) => !o)];
}

/** Tocar no destino que já está ativo volta ao topo (comportamento MD3). */
function reselect(on: boolean) {
  return (e: React.MouseEvent) => {
    if (!on) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

/** Item da navigation drawer: pílula de 56px; o ativo ganha o indicador e o ícone fill. */
function DrawerItem({ href, label, icon: Icon, on, small = false, soon = false }: { href: string; label: string; icon: IconType; on: boolean; small?: boolean; soon?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  // Telas baixas: a lista rola; o item ativo fica sempre à vista (sem mexer na página)
  useEffect(() => {
    const el = ref.current;
    const nav = el?.closest('nav');
    if (!on || !el || !nav) return;
    const a = el.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    if (a.bottom > n.bottom) nav.scrollBy({ top: a.bottom - n.bottom + 8, behavior: 'smooth' });
    else if (a.top < n.top) nav.scrollBy({ top: a.top - n.top - 8, behavior: 'smooth' });
  }, [on]);
  return (
    <a
      ref={ref}
      href={soon ? undefined : href}
      aria-current={on ? 'page' : undefined}
      aria-disabled={soon || undefined}
      className={`relative flex items-center gap-space-2 rounded-full px-space-2 no-underline transition-colors duration-200 ${small ? 'min-h-11 text-caption' : 'min-h-14 text-body'} ${
        on ? 'font-semibold text-text-primary' : soon ? 'cursor-default text-text-secondary' : 'text-text-secondary hover:bg-secondary/40 hover:text-text-primary'
      }`}
    >
      {on && <motion.span layoutId="drawer-indicator" className="absolute inset-0 rounded-full bg-secondary" transition={{ duration: 0.3, ease: EASE }} aria-hidden />}
      <Icon weight={on ? 'fill' : 'regular'} className={`relative shrink-0 ${small ? 'size-[18px]' : 'size-6'}`} aria-hidden />
      <span className="relative truncate">{label}</span>
      {soon && (
        <span className="relative ml-auto">
          <SoonBadge small />
        </span>
      )}
    </a>
  );
}

/** Destino da navigation rail / navigation bar: ícone dentro do indicador e rótulo embaixo. */
function Destination({ href, label, icon: Icon, on, wide = false }: { href: string; label: string; icon: IconType; on: boolean; wide?: boolean }) {
  return (
    <a
      href={href}
      aria-current={on ? 'page' : undefined}
      onClick={reselect(on)}
      className={`group flex min-h-14 flex-col items-center justify-center gap-1 text-[12px] font-medium leading-4 no-underline ${on ? 'text-text-primary' : 'text-text-secondary'}`}
    >
      <span className={`relative flex h-8 items-center justify-center rounded-full ${wide ? 'w-16' : 'w-14'}`}>
        {on ? (
          <motion.span layoutId={wide ? 'bar-indicator' : 'rail-indicator'} className="absolute inset-0 rounded-full bg-secondary" transition={{ duration: 0.3, ease: EASE }} aria-hidden />
        ) : (
          <span className="absolute inset-0 rounded-full transition-colors group-hover:bg-secondary/40" aria-hidden />
        )}
        <Icon weight={on ? 'fill' : 'regular'} className="relative size-6" aria-hidden />
      </span>
      <span className={on ? 'font-semibold' : undefined}>{label}</span>
    </a>
  );
}

/** FAB "Nova solicitação": a ação principal do Design System (accent, um por tela). */
function Fab({ extended }: { extended: boolean }) {
  return (
    <button
      type="button"
      onClick={openNewRequest}
      aria-label={extended ? undefined : 'Nova solicitação'}
      title={extended ? undefined : 'Nova solicitação'}
      className={`flex h-14 shrink-0 items-center justify-center gap-space-1 rounded-lg bg-accent font-semibold text-on-accent shadow-glow-yellow transition-[box-shadow,transform] duration-200 hover:scale-[1.02] hover:shadow-glow-yellow-strong ${
        extended ? 'px-space-2 text-body' : 'w-14'
      }`}
    >
      <Plus className="size-6" aria-hidden />
      {extended && 'Nova solicitação'}
    </button>
  );
}

const iconButton = 'flex size-12 shrink-0 items-center justify-center rounded-full text-text-primary no-underline transition-colors hover:bg-secondary/50';

export function Sidebar({ view }: { view: View }) {
  const status = useStatuses(APPS);
  const active = useActiveSection(view);
  const [open, toggle] = useRail();
  const appView = view.kind === 'app';
  const group = appView ? 'aplicacoes' : groupOf(view.section);
  const app = appView ? APPS.find((a) => a.id === view.appId) : null;
  const title = app ? app.name : TITLES[group];

  return (
    <>
      {/* Computador: navigation drawer que recolhe para navigation rail */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden flex-col gap-space-2 overflow-hidden border-r border-secondary/70 bg-background/90 py-space-2 backdrop-blur-md transition-[width] duration-300 ease-entry lg:flex"
        style={{ width: 'var(--rail, 264px)' }}
        aria-label="Navegação"
      >
        <div className={`flex shrink-0 items-center gap-space-1 ${open ? 'justify-between pl-space-3 pr-space-1' : 'flex-col'}`}>
          {open && (
            <a href="#inicio" className="flex items-center no-underline" aria-label="Gove Design System — início">
              <GoveLogo kind="logotipo" height={26} />
            </a>
          )}
          <button type="button" onClick={toggle} aria-label={open ? 'Recolher menu' : 'Abrir menu'} title={open ? 'Recolher menu' : 'Abrir menu'} aria-expanded={open} className={iconButton}>
            <List className="size-6" aria-hidden />
          </button>
        </div>
        <div className={`flex shrink-0 ${open ? 'px-space-2' : 'justify-center'}`}>
          <Fab extended={open} />
        </div>

        {open ? (
          <nav aria-label="Seções do design system" className="min-h-0 flex-1 overflow-y-auto px-space-1">
            <ul className="flex flex-col">
              {PRIMARY.map(({ id, label, icon }) => (
                <li key={id}>
                  <DrawerItem href={`#${id}`} label={label} icon={icon} on={active === id} />
                </li>
              ))}
            </ul>
            <hr className="mx-space-2 my-space-1 border-secondary" />
            <p className="px-space-2 pb-1 pt-space-1 text-caption font-semibold text-text-secondary" id="nav-apps">Apps</p>
            <ul className="flex flex-col" aria-labelledby="nav-apps">
              {APPS.map((a) => (
                <li key={a.id}>
                  <DrawerItem href={appHref(a.id)} label={a.name} icon={a.icon} on={active === `app-${a.id}`} small soon={!isOpen(status[a.id] ?? 'ok')} />
                </li>
              ))}
            </ul>
            <hr className="mx-space-2 my-space-1 border-secondary" />
            <p className="px-space-2 pb-1 pt-space-1 text-caption font-semibold text-text-secondary" id="nav-marca">Marca</p>
            <ul className="flex flex-col" aria-labelledby="nav-marca">
              {BRAND.map(({ id, label, icon }) => (
                <li key={id}>
                  <DrawerItem href={`#${id}`} label={label} icon={icon} on={active === id} />
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <nav aria-label="Destinos" className="flex min-h-0 flex-1 flex-col gap-space-1 overflow-y-auto pt-space-1">
            {DESTINATIONS.map((d) => (
              <Destination key={d.id} href={d.href} label={d.label} icon={d.icon} on={railGroup(active) === d.id} />
            ))}
          </nav>
        )}

        <div className={`flex shrink-0 flex-col gap-space-1 border-t border-secondary/70 pt-space-2 ${open ? 'px-space-2' : 'items-center'}`}>
          <ThemeToggle compact={!open} />
          <LogoutButton compact={!open} />
        </div>
      </aside>

      {/* Celular: top app bar */}
      <header
        className="fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-1 border-b border-secondary/70 bg-background/95 px-1 backdrop-blur-md lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: 'max(4px, env(safe-area-inset-left, 0px))', paddingRight: 'max(4px, env(safe-area-inset-right, 0px))' }}
      >
        {appView ? (
          <a href="#aplicacoes" aria-label="Voltar para Aplicações" title="Voltar" className={iconButton}>
            <ArrowLeft className="size-6" aria-hidden />
          </a>
        ) : null}
        {title ? (
          <h1 className={`min-w-0 flex-1 truncate font-display text-[22px] font-semibold leading-7 text-text-primary ${appView ? '' : 'pl-space-1'}`}>{title}</h1>
        ) : (
          <a href="#inicio" className="flex min-h-12 flex-1 items-center pl-space-1 no-underline" aria-label="Gove Design System — início">
            <GoveLogo kind="logotipo" height={24} />
          </a>
        )}
        {/* No Início a busca é a search bar do topo da tela */}
        {!appView && group !== 'inicio' && (
          <button type="button" onClick={openSearch} aria-label="Buscar" title="Buscar" className={iconButton}>
            <MagnifyingGlass className="size-6" aria-hidden />
          </button>
        )}
        {/* Ações da página do app (Sobre, Recarregar), trazidas por AppPage */}
        {appView && <div id="appbar-actions" className="contents" />}
        <ThemeToggle compact />
        {!appView && <LogoutButton compact />}
      </header>

      {/* Celular: navigation bar (fora das telas de app, que usam o voltar da top app bar) */}
      {!appView && (
        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-30 grid h-20 grid-cols-4 items-center border-t border-secondary/70 bg-background/95 backdrop-blur-md lg:hidden"
          style={{ height: 'calc(80px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {DESTINATIONS.filter((d) => !d.railOnly).map((d) => (
            <Destination key={d.id} href={d.href} label={d.label} icon={d.icon} on={group === d.id} wide />
          ))}
        </nav>
      )}
      {/* FAB do Início no celular: 16px acima da navigation bar */}
      {!appView && group === 'inicio' && (
        <div className="fixed right-space-2 z-30 lg:hidden" style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
          <Fab extended />
        </div>
      )}
    </>
  );
}
