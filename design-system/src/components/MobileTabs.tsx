/** Controle segmentado das telas do celular (ex.: Bússola | Logomarca). */
export function MobileTabs({ label, tabs, active }: { label: string; tabs: { id: string; label: string }[]; active: string }) {
  return (
    <nav aria-label={label} className="gutter sticky top-[56px] z-20 bg-background/95 py-space-1 backdrop-blur-md">
      <ul className="flex gap-1 rounded-full bg-secondary/60 p-1">
        {tabs.map((t) => (
          <li key={t.id} className="flex-1">
            <a
              href={`#${t.id}`}
              aria-current={active === t.id ? 'page' : undefined}
              className={`flex min-h-11 items-center justify-center rounded-full px-space-1 text-caption font-semibold no-underline transition-colors ${active === t.id ? 'bg-primary text-on-primary' : 'text-text-primary'}`}
            >
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
