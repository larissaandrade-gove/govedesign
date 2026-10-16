import { Reveal } from './Reveal';
import { SECTIONS } from './Sidebar';

type Props = { id: string; title: string; children?: React.ReactNode };

/** Cabeçalho de seção: ícone da seção, título H2 e, quando ajuda, uma linha de apoio. */
export function SectionHeader({ id, title, children }: Props) {
  const Icon = SECTIONS.find((s) => s.id === id)?.icon;
  return (
    <Reveal className="mb-space-4 flex max-w-[680px] flex-col gap-space-1">
      <h2 className="flex items-center gap-space-2 text-h2">
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
            <Icon className="size-5" />
          </span>
        )}
        {title}
      </h2>
      {children && <p className="text-body text-text-secondary">{children}</p>}
    </Reveal>
  );
}
