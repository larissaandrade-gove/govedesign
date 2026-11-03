import { Ticket } from '@phosphor-icons/react';
import { INSTRUCOES } from '../data/teams';
import { Reveal } from './Reveal';

type Props = { id: string; title: string; children?: React.ReactNode; level?: 1 | 2 };

const ICONS = { ...Object.fromEntries(INSTRUCOES.map((s) => [s.id, s.icon])), solicitacoes: Ticket };

/** Cabeçalho de seção: ícone da seção, título (H2, ou H1 quando é a página) e, quando ajuda, uma linha de apoio. */
export function SectionHeader({ id, title, children, level = 2 }: Props) {
  const Icon = ICONS[id as keyof typeof ICONS];
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <Reveal className="mb-space-4 flex max-w-[680px] flex-col gap-space-1">
      <H className="section-title flex items-center gap-space-2 text-h2">
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
            <Icon className="size-5" />
          </span>
        )}
        {title}
      </H>
      {children && <p className="text-body text-text-secondary">{children}</p>}
    </Reveal>
  );
}
