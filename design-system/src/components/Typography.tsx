import guide from '../../../docs/tipografia-gove.md?raw';
import { typeScale } from '../data/tokens.js';
import { DocActions } from './DocActions';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';

const LABEL: Record<string, string> = { display: 'Display', h1: 'H1', h2: 'H2', h3: 'H3', 'body-large': 'Corpo grande', body: 'Corpo', caption: 'Legenda' };

export function Typography() {
  return (
    <section id="tipografia" className="gutter scroll-mt-[72px] border-t border-secondary/60 py-space-8">
      <SectionHeader id="tipografia" title="Tipografia">
        Montserrat nos títulos, Inter no corpo. Mínimo de 11 pt/px.
      </SectionHeader>
      <Reveal className="flex flex-col gap-space-3">
        <div className="grid grid-cols-1 gap-space-2 md:grid-cols-2">
          <div className="flex items-end justify-between gap-space-2 rounded-lg border border-secondary bg-surface p-space-3">
            <div>
              <p className="font-display text-h3 font-bold text-text-primary">Montserrat</p>
              <p className="text-caption text-text-secondary">Títulos · 600 / 700</p>
            </div>
            <span className="font-display text-[56px] font-bold leading-none text-text-primary" aria-hidden>Aa</span>
          </div>
          <div className="flex items-end justify-between gap-space-2 rounded-lg border border-secondary bg-surface p-space-3">
            <div>
              <p className="font-sans text-h3 font-semibold text-text-primary">Inter</p>
              <p className="text-caption text-text-secondary">Corpo e interface · 400 / 500 / 600</p>
            </div>
            <span className="font-sans text-[56px] font-medium leading-none text-text-primary" aria-hidden>Aa</span>
          </div>
        </div>
        <ul className="flex flex-wrap items-baseline gap-x-space-3 gap-y-space-1" aria-label="Escala">
          {Object.entries(typeScale).map(([k, v]) => (
            <li key={k} className="flex items-baseline gap-1">
              <span className={`${k.startsWith('h') || k === 'display' ? 'font-display font-bold' : 'font-sans'} text-body-large text-text-primary`}>{LABEL[k]}</span>
              <span className="token tabular-nums">{(v as [string])[0]}</span>
            </li>
          ))}
        </ul>
        <DocActions doc={guide} filename="tipografia-gove.md" />
      </Reveal>
    </section>
  );
}
