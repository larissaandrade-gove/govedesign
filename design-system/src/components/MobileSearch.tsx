import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowsLeftRight, Books, MagnifyingGlass, Plus, Ticket, X } from '@phosphor-icons/react';
import { INSTRUCOES, teamApps, type Team } from '../data/teams';
import { appHref } from '../lib/router';
import { openNewRequest } from '../lib/useMobile';
import { isOpen, useStatuses } from '../lib/appStatus';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca do celular (lupa da top app bar): apps da equipe, Instruções, Solicitações e troca de equipe. */
export function MobileSearch({ team }: { team: Team | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    const open = () => {
      setQ('');
      dialog.current?.showModal();
      requestAnimationFrame(() => input.current?.focus());
    };
    window.addEventListener('gove:buscar', open);
    return () => window.removeEventListener('gove:buscar', open);
  }, []);

  const apps = useMemo(() => teamApps(team).filter((a) => !a.desktopOnly), [team]);
  const status = useStatuses(apps);
  const items = useMemo(() => {
    const all = [
      ...apps.map((a) => {
        const soon = !isOpen(status[a.id] ?? 'ok');
        return { key: a.id, label: a.name, hint: soon ? `Em breve · ${a.tagline}` : a.tagline, href: soon ? undefined : appHref(a.id), icon: a.icon };
      }),
      { key: 'instrucoes', label: 'Instruções', hint: 'Tudo do design system', href: '#instrucoes', icon: Books },
      ...INSTRUCOES.map((s) => ({ key: s.id, label: s.label, hint: s.summary, href: `#${s.id}`, icon: s.icon })),
      { key: 'solicitacoes', label: 'Solicitações', hint: 'Pedidos ao time de design', href: '#solicitacoes', icon: Ticket },
      { key: 'equipes', label: team ? 'Trocar equipe' : 'Escolher equipe', hint: team?.label ?? '', href: '#equipes', icon: ArrowsLeftRight },
    ];
    const t = norm(q.trim());
    return t ? all.filter((i) => norm(`${i.label} ${i.hint}`).includes(t)) : all;
  }, [q, status, apps, team]);

  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      aria-label="Buscar"
      className="m-0 h-[100dvh] max-h-none w-full max-w-none bg-background p-0 text-text-primary backdrop:bg-[#20133D]/60"
      onClick={(e) => e.target === dialog.current && close()}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-space-1 border-b border-secondary px-space-2 py-space-1" style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}>
          <label className="flex min-h-12 flex-1 items-center gap-space-1 rounded-full bg-secondary/60 px-space-2">
            <MagnifyingGlass className="size-5 shrink-0 text-highlight" aria-hidden />
            <span className="sr-only">Buscar</span>
            <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Apps, cores, prompts…" className="w-full bg-transparent text-body text-text-primary placeholder:text-text-muted focus:outline-none" />
          </label>
          <button type="button" onClick={close} aria-label="Fechar" className="flex size-11 items-center justify-center rounded-md text-text-secondary">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto px-space-2 py-space-2">
          <li>
            <button
              type="button"
              onClick={() => {
                close();
                openNewRequest();
              }}
              className="flex min-h-14 w-full items-center gap-space-2 rounded-md px-space-1 text-left text-body font-semibold text-text-primary hover:bg-secondary/50"
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-accent text-on-accent" aria-hidden>
                <Plus className="size-5" />
              </span>
              Nova solicitação
            </button>
          </li>
          {items.map(({ key, label, hint, href, icon: Icon }) => (
            <li key={key}>
              <a
                href={href}
                onClick={href ? close : undefined}
                aria-disabled={!href || undefined}
                className={`flex min-h-14 items-center gap-space-2 rounded-md px-space-1 text-text-primary no-underline ${href ? 'hover:bg-secondary/50' : 'cursor-default opacity-70'}`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
                  <Icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body font-semibold">{label}</span>
                  {hint && <span className="truncate text-caption text-text-secondary">{hint}</span>}
                </span>
              </a>
            </li>
          ))}
          {!items.length && <li className="px-space-1 py-space-2 text-body text-text-secondary">Nada encontrado.</li>}
        </ul>
      </div>
    </dialog>
  );
}
