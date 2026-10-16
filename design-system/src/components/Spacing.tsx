import { motion } from 'framer-motion';
import { spacing } from '../data/tokens.js';
import { fadeUp, inView, stagger } from '../lib/motion';
import { SectionHeader } from './SectionHeader';

const USAGE: Record<string, string> = {
  'space-1': 'Ícone e texto, micro ajustes',
  'space-2': 'Padding de botões, gaps pequenos',
  'space-3': 'Padding de cards, gaps médios',
  'space-4': 'Separação de blocos',
  'space-6': 'Margem de seções',
  'space-8': 'Grandes separações',
  'space-12': 'Hero, respiro máximo',
};

export function Spacing() {
  const entries = Object.entries(spacing);
  return (
    <section id="espacamento" className="gutter scroll-mt-[72px] border-t border-secondary/60 py-space-12">
      <SectionHeader id="espacamento" title="Espaçamento">
        Múltiplos de 8px.
      </SectionHeader>

      <motion.div variants={stagger} {...inView} className="flex flex-wrap items-end gap-space-2 rounded-lg border border-secondary bg-surface/60 p-space-3 md:p-space-4">
        {entries.map(([token, value], i) => (
          <motion.div key={token} variants={fadeUp} className="flex flex-col items-center gap-space-1">
            <div
              className={`rounded-sm ${i % 2 ? 'bg-secondary' : 'bg-primary shadow-glow-purple'}`}
              style={{ width: value, height: value }}
              aria-hidden
            />
            <span className="token tabular-nums">{value}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.ul variants={stagger} {...inView} className="mt-space-4 flex flex-col">
        {entries.map(([token, value], i) => (
          <motion.li key={token} variants={fadeUp} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-space-2 border-b border-secondary/60 py-space-2 sm:grid-cols-[120px_64px_minmax(0,1fr)_minmax(0,220px)]">
            <span className="font-display text-body font-bold text-text-primary">{token}</span>
            <span className="token tabular-nums">{value}</span>
            <span className="col-span-2 h-3 sm:col-span-1" aria-hidden>
              <span className={`block h-full rounded-full ${i % 2 ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${(parseInt(value) / 96) * 100}%` }} />
            </span>
            <span className="col-span-2 text-caption text-text-secondary sm:col-span-1">{USAGE[token]}</span>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
