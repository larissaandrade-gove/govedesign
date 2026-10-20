import { BookOpenCheck, Palette, Search } from 'lucide-react';
import { APPS } from '../data/apps';
import { appHref } from '../lib/router';
import { openSearch } from '../lib/useMobile';
import { GoveLogo } from './GoveLogo';

/** Início no celular: topo roxo com busca, atalhos dos apps e das seções. */
export function MobileHome() {
  return (
    <div id="inicio" className="flex flex-col gap-space-3 pb-space-2">
      <div className="relative overflow-hidden rounded-b-[40px] bg-[#3D0099] px-space-2 pb-space-4 pt-space-3 text-white">
        <span aria-hidden className="absolute -left-16 -top-10 size-48 rounded-full border-[24px] border-[#A278DA]/30" />
        <span aria-hidden className="absolute -right-6 bottom-6 size-20 rounded-full bg-[#FFC72C]/85" />
        <span aria-hidden className="absolute right-12 top-10 size-5 rounded-full bg-[#5AC2CD]" />
        <div className="relative flex flex-col gap-space-2">
          <GoveLogo kind="logotipo" height={32} background="#3D0099" className="self-start" />
          <h1 className="font-display text-[28px] font-extrabold leading-tight text-white">Design System</h1>
          <button
            type="button"
            onClick={openSearch}
            className="flex min-h-12 items-center gap-space-1 rounded-full bg-white px-space-2 text-left text-body text-[#5B6770] shadow-md"
          >
            <Search className="size-5 text-[#3D0099]" aria-hidden />
            Buscar apps e guias
          </button>
        </div>
      </div>

      <nav aria-label="Aplicações" className="flex flex-col gap-space-1">
        <h2 className="gutter text-body-large font-semibold">Aplicações</h2>
        <ul className="flex gap-space-2 overflow-x-auto px-space-2 pb-space-1 [scrollbar-width:none]">
          {APPS.map(({ id, name, icon: Icon }) => (
            <li key={id} className="shrink-0">
              <a href={appHref(id)} className="flex w-[76px] flex-col items-center gap-1 text-center text-caption font-medium text-text-primary no-underline">
                <span className="flex size-[60px] items-center justify-center rounded-[20px] bg-secondary text-highlight shadow-sm">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="line-clamp-2 leading-tight">{name.replace(/^(Gerador de|Revisor de) /, '').replace(/^./, (c) => c.toUpperCase())}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="gutter grid grid-cols-2 gap-space-2">
        {[
          { href: '#cores', label: 'Cores e logomarca', icon: Palette },
          { href: '#tipografia', label: 'Guias', icon: BookOpenCheck },
        ].map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className="flex min-h-[88px] flex-col justify-between rounded-lg border border-secondary bg-background p-space-2 text-body font-semibold text-text-primary no-underline shadow-sm">
            <Icon className="size-6 text-highlight" aria-hidden />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
