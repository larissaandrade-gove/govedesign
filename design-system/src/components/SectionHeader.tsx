import { Reveal } from './Reveal';

type Props = { id: string; token: string; title: string; children?: React.ReactNode };

/** Cabeçalho de seção: caminho do token, título H2 e descrição. */
export function SectionHeader({ token, title, children }: Props) {
  return (
    <Reveal className="mb-space-6 flex max-w-[680px] flex-col gap-space-2">
      <p className="eyebrow">{token}</p>
      <h2 className="text-h2 md:text-h1">{title}</h2>
      {children && <p className="text-body-large text-text-secondary">{children}</p>}
    </Reveal>
  );
}
