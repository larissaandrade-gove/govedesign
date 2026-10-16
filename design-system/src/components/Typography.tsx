import { Printer } from 'lucide-react';
import { typeScale } from '../data/tokens.js';
import { Reveal, RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';

type Level = keyof typeof typeScale;

const SAMPLES: Record<Level, string> = {
  display: 'Zero Clique',
  h1: 'O governo que sabe',
  h2: 'Antecipa e age',
  h3: 'Infraestrutura para a gestão pública',
  'body-large': 'O governo não deveria esperar o cidadão pedir. Deveria saber, antecipar e agir.',
  body: 'Que se adapta às suas necessidades, e não exige que o cidadão se adapte à burocracia de sempre.',
  caption: 'Atualizado há 2 minutos · Cadastro Central',
};

const CLASS: Record<Level, string> = {
  display: 'text-[40px] leading-[1.05] font-black sm:text-display',
  h1: 'text-[36px] leading-[1.1] font-extrabold sm:text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
  'body-large': 'text-body-large',
  body: 'text-body',
  caption: 'text-caption',
};

function Row({ level, family }: { level: Level; family: 'display' | 'sans' }) {
  const [size, meta] = typeScale[level] as [string, { lineHeight: string; fontWeight: string }];
  return (
    <RevealItem className="flex flex-col gap-space-1 border-b border-secondary/70 py-space-3 last:border-b-0">
      <p className="token flex flex-wrap gap-x-space-2 text-text-secondary/90">
        <span className="text-highlight">{level}</span>
        <span className="tabular-nums">{size} / {meta.lineHeight}</span>
        <span>peso {meta.fontWeight}</span>
      </p>
      <p className={`${family === 'display' ? 'font-display text-text-primary' : 'font-sans text-text-secondary'} ${CLASS[level]} min-w-0 break-words`}>
        {SAMPLES[level]}
      </p>
    </RevealItem>
  );
}

export function Typography() {
  return (
    <section id="tipografia" className="gutter scroll-mt-[72px] border-t border-secondary/60 py-space-12">
      <SectionHeader id="tipografia" title="Tipografia">
        Montserrat nos títulos, Inter no corpo e na interface.
      </SectionHeader>

      <div className="grid grid-cols-1 gap-space-4 lg:grid-cols-2">
        <StaggerGrid className="min-w-0 rounded-lg border border-secondary bg-surface/60 p-space-3 md:p-space-4">
          <p className="mb-space-1 font-display text-h3 font-black text-text-primary">Montserrat</p>
          <p className="text-caption text-text-secondary">Títulos · Bold 700 / ExtraBold 800 / Black 900</p>
          {(['display', 'h1', 'h2', 'h3'] as Level[]).map((l) => (
            <Row key={l} level={l} family="display" />
          ))}
        </StaggerGrid>
        <StaggerGrid className="min-w-0 rounded-lg border border-secondary bg-surface/60 p-space-3 md:p-space-4">
          <p className="mb-space-1 font-sans text-h3 font-medium text-text-primary">Inter</p>
          <p className="text-caption text-text-secondary">Corpo e UI · Regular 400 / Medium 500</p>
          {(['body-large', 'body', 'caption'] as Level[]).map((l) => (
            <Row key={l} level={l} family="sans" />
          ))}
          <RevealItem className="pt-space-3">
            <p className="font-sans text-[56px] font-medium leading-none text-text-primary/90" aria-hidden>
              Aa Bb 0123
            </p>
          </RevealItem>
        </StaggerGrid>
      </div>

      <Reveal className="mt-space-4 flex max-w-[760px] gap-space-2 rounded-lg border border-secondary bg-background p-space-3">
        <Printer className="mt-1 size-5 shrink-0 text-highlight" aria-hidden />
        <div className="flex flex-col gap-space-1">
          <p className="font-display text-body-large font-bold text-text-primary">Fallback impresso: Helvetica</p>
          <p className="token">Montserrat, Helvetica, Arial</p>
        </div>
      </Reveal>
    </section>
  );
}
