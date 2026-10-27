/** Tabs primárias (Material Design 3) das telas do celular, ex.: Bússola | Logomarca. Fixas logo abaixo da top app bar. */
export function MobileTabs({ label, tabs, active }: { label: string; tabs: { id: string; label: string }[]; active: string }) {
  return (
    <nav aria-label={label} className="sticky top-16 z-20 border-b border-secondary bg-background/95 backdrop-blur-md">
      <ul className="flex">
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <li key={t.id} className="flex-1">
              <a
                href={`#${t.id}`}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-12 items-center justify-center px-space-1 text-caption font-semibold no-underline transition-colors hover:bg-secondary/30 ${on ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                {t.label}
                {on && <span className="absolute inset-x-space-2 bottom-0 h-[3px] rounded-t-full bg-highlight" aria-hidden />}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
