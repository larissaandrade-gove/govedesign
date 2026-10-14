import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Layers } from 'lucide-react';
import { Button } from './ui/Button';
import { CityBackdrop } from './CityBackdrop';
import { EASE, fadeUp, stagger } from '../lib/motion';

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Parallax sutil: a cidade anda mais devagar que o conteúdo (fator ~0.8)
  const cityY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const glowY = useTransform(scrollYProgress, [0, 1], ['0%', '35%']);

  return (
    <section ref={ref} id="inicio" className="relative isolate overflow-hidden bg-gradient-to-br from-background from-35% to-primary">
      {/* Cidade à noite com overlay escuro para manter a leitura */}
      <motion.div style={{ y: cityY }} className="absolute inset-x-0 bottom-0 -z-10 h-[85%]">
        <CityBackdrop className="h-full w-full opacity-80" seed={11} />
      </motion.div>
      <motion.div
        style={{ y: glowY }}
        aria-hidden
        className="absolute -right-24 top-10 -z-10 h-72 w-72 rounded-full bg-primary/50 blur-[120px]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/40 md:via-background/55 md:to-background/20" />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="gutter flex max-w-[1080px] flex-col gap-space-3 pb-space-12 pt-[120px] md:pt-space-12"
      >
        <motion.p variants={fadeUp} className="eyebrow flex items-center gap-space-1">
          <Layers className="size-4" aria-hidden /> Gove Design System · v1.0
        </motion.p>
        <motion.h1 variants={fadeUp} className="text-[44px] font-black leading-[1.05] tracking-[-0.02em] sm:text-display">
          Governo Zero Clique,
          <br />
          em <span className="text-accent">tokens</span> e componentes.
        </motion.h1>
        <motion.p variants={fadeUp} className="max-w-[620px] text-body-large text-text-secondary">
          A base visual das interfaces da Gove: cores, tipografia, espaçamento e componentes para produtos que sabem,
          antecipam e agem — para facilitar a vida de quem precisa e de quem serve.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-wrap gap-space-2 pt-space-1">
          <Button variant="action" size="lg" onClick={() => scrollTo('componentes')}>
            Explorar componentes <ArrowRight className="size-5" aria-hidden />
          </Button>
          <Button variant="secondary" size="lg" onClick={() => scrollTo('cores')}>
            Ver tokens de cor
          </Button>
        </motion.div>
        <motion.dl
          variants={fadeUp}
          transition={{ duration: 0.6, ease: EASE }}
          className="mt-space-4 grid max-w-[620px] grid-cols-3 gap-space-2 border-t border-secondary pt-space-3"
        >
          {[
            ['8', 'tokens de cor'],
            ['7', 'níveis tipográficos'],
            ['8px', 'grade de espaçamento'],
          ].map(([n, label]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="order-2 text-caption text-text-secondary">{label}</dt>
              <dd className="order-1 font-display text-h3 font-bold tabular-nums text-text-primary">{n}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}
