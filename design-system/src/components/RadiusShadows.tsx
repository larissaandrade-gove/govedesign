import { motion } from 'framer-motion';
import { radius, themeShadows } from '../data/tokens.js';
import { useTheme } from '../lib/theme';
import { hoverTransition } from '../lib/motion';
import { Reveal, RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';

const RADIUS_USE: Record<string, string> = { sm: 'Inputs e tags', md: 'Botões e cards pequenos', lg: 'Modais e cards grandes', full: 'Avatares e pílulas' };
const SHADOW_USE: Record<string, string> = {
  sm: 'Elevação sutil: inputs, popovers',
  md: 'Cards em destaque e em hover',
  'glow-purple': 'Neon dos botões primários',
  'glow-yellow': 'Neon do CTA amarelo',
};

export function RadiusShadows() {
  const [theme] = useTheme();
  const shadows = themeShadows[theme] as Record<string, string>;
  return (
    <section id="raio-sombras" className="gutter scroll-mt-[72px] border-t border-secondary/60 py-space-12">
      <SectionHeader id="raio-sombras" title="Raio e sombras" />

      <Reveal>
        <h3 className="mb-space-3 text-h3">Border radius</h3>
      </Reveal>
      <StaggerGrid className="grid grid-cols-2 gap-space-3 md:grid-cols-4">
        {Object.entries(radius).map(([token, value]) => (
          <RevealItem key={token} className="flex flex-col items-start gap-space-2">
            <motion.div
              whileHover={{ scale: 1.02, rotate: -3 }}
              transition={hoverTransition}
              className="size-24 border border-primary/70 bg-gradient-to-br from-secondary to-surface"
              style={{ borderRadius: value }}
              aria-hidden
            />
            <div>
              <p className="font-display text-body font-bold text-text-primary">
                {token} <span className="token tabular-nums">{value}</span>
              </p>
              <p className="text-caption text-text-secondary">{RADIUS_USE[token]}</p>
            </div>
          </RevealItem>
        ))}
      </StaggerGrid>

      <Reveal className="mt-space-8">
        <h3 className="mb-space-3 text-h3">Sombras</h3>
      </Reveal>
      <StaggerGrid className="grid grid-cols-1 gap-space-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(SHADOW_USE).map(([token, use]) => (
          <RevealItem key={token}>
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              transition={hoverTransition}
              className={`flex h-40 flex-col justify-end gap-1 rounded-lg p-space-3 ${
                token === 'glow-yellow' ? 'border border-accent/40 bg-surface' : token === 'glow-purple' ? 'border border-primary/60 bg-surface' : 'bg-surface'
              }`}
              style={{ boxShadow: `var(--shadow-${token})` }}
            >
              <p className="font-display text-body font-bold text-text-primary">shadow-{token}</p>
              <p className="token break-all text-[12px]">{shadows[token]}</p>
              <p className="text-caption text-text-secondary">{use}</p>
            </motion.div>
          </RevealItem>
        ))}
      </StaggerGrid>
    </section>
  );
}
